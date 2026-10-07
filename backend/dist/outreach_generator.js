"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractVerifiableResumeFacts = extractVerifiableResumeFacts;
exports.generateFactGroundedOutreach = generateFactGroundedOutreach;
const ats_engine_1 = require("./ats_engine");
/**
 * Normalizes and extracts verifiable facts from user's structured or raw resume data.
 * Does not fabricate missing items.
 */
function extractVerifiableResumeFacts(facts) {
    const result = {
        fullName: (facts?.fullName || '').trim(),
        allSkills: [],
        educationItems: [],
        experienceItems: [],
        projectItems: []
    };
    const skillsSet = new Set();
    // 1. Direct skills array
    if (Array.isArray(facts?.skills)) {
        for (const s of facts.skills) {
            if (typeof s === 'string' && s.trim()) {
                const extracted = (0, ats_engine_1.extractTechKeywords)(s);
                if (extracted.length > 0) {
                    extracted.forEach(k => skillsSet.add(k));
                }
                else {
                    skillsSet.add(s.trim());
                }
            }
        }
    }
    // 2. From raw text or summary
    if (facts?.rawText) {
        (0, ats_engine_1.extractTechKeywords)(facts.rawText).forEach(k => skillsSet.add(k));
    }
    if (facts?.summary) {
        (0, ats_engine_1.extractTechKeywords)(facts.summary).forEach(k => skillsSet.add(k));
    }
    // 3. From projects
    if (Array.isArray(facts?.projects)) {
        for (const p of facts.projects) {
            const pName = p.name?.trim();
            const pDesc = p.description?.trim();
            if (pName) {
                result.projectItems.push(pDesc ? `${pName} (${pDesc.slice(0, 100)})` : pName);
            }
            if (pDesc) {
                (0, ats_engine_1.extractTechKeywords)(pDesc).forEach(k => skillsSet.add(k));
            }
            if (Array.isArray(p.technologies)) {
                p.technologies.forEach(t => {
                    if (typeof t === 'string' && t.trim())
                        skillsSet.add(t.trim());
                });
            }
        }
    }
    // 4. From experience
    if (Array.isArray(facts?.experience)) {
        for (const exp of facts.experience) {
            const expTitle = exp.title?.trim();
            const expCompany = exp.company?.trim();
            if (expTitle) {
                result.experienceItems.push(expCompany ? `${expTitle} at ${expCompany}` : expTitle);
            }
            if (exp.description) {
                (0, ats_engine_1.extractTechKeywords)(exp.description).forEach(k => skillsSet.add(k));
            }
        }
    }
    // 5. From education
    if (Array.isArray(facts?.education)) {
        for (const edu of facts.education) {
            const deg = edu.degree?.trim();
            const inst = edu.institution?.trim();
            if (deg) {
                result.educationItems.push(inst ? `${deg} from ${inst}` : deg);
            }
            else if (inst) {
                result.educationItems.push(inst);
            }
        }
    }
    result.allSkills = Array.from(skillsSet);
    return result;
}
/**
 * Pure, deterministic fact-grounded outreach message generator.
 * Rule: Never fabricate candidate skills, job history, metrics, or credentials.
 * Only skills that exist in the resume are referenced.
 */
function generateFactGroundedOutreach(input) {
    const type = input.type || 'recruiter_outreach';
    const tone = input.tone || 'professional';
    const verified = extractVerifiableResumeFacts(input.resumeFacts);
    const candidateName = (input.candidateName || verified.fullName || 'Candidate').trim();
    // Recruiter & Target Details: Do NOT fabricate
    const recruiterName = input.recruiterName?.trim() || '';
    const recipientEmail = input.recruiterEmail?.trim() || '';
    const companyName = input.companyName?.trim() || '';
    const jobTitle = input.jobTitle?.trim() || '';
    // Determine Greeting: If recruiterName is missing, do not invent one
    const greeting = recruiterName ? `Dear ${recruiterName}` : 'Dear Hiring Team';
    // Job Description Grounding: intersect verified resume skills with JD skills
    let groundedSkills = [];
    if (input.jobDescription && input.jobDescription.trim()) {
        const jdLower = input.jobDescription.toLowerCase();
        const { allJdSkills } = (0, ats_engine_1.parseJDSections)(input.jobDescription);
        const jdSkillsLower = new Set(allJdSkills.map(s => s.toLowerCase()));
        groundedSkills = verified.allSkills.filter(skill => {
            const sLower = skill.toLowerCase().trim();
            if (jdSkillsLower.has(sLower))
                return true;
            const escaped = sLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const pattern = new RegExp(`(?<![a-zA-Z0-9_])${escaped}(?![a-zA-Z0-9_])`, 'i');
            return pattern.test(jdLower);
        });
    }
    // Fallback to top verified resume skills only if JD intersection is empty
    if (groundedSkills.length === 0 && verified.allSkills.length > 0) {
        groundedSkills = verified.allSkills.slice(0, 4);
    }
    // Education & Experience grounded mentions
    const primaryEducation = verified.educationItems.length > 0 ? verified.educationItems[0] : '';
    const primaryExperience = verified.experienceItems.length > 0 ? verified.experienceItems[0] : '';
    const primaryProject = verified.projectItems.length > 0 ? verified.projectItems[0] : '';
    // Build subject line based on role and company
    let subject = '';
    const roleContext = jobTitle && companyName
        ? `${jobTitle} at ${companyName}`
        : jobTitle || (companyName ? `Opportunity at ${companyName}` : 'Expression of Interest');
    switch (type) {
        case 'job_application':
            subject = `Job Application: ${roleContext} - ${candidateName}`;
            break;
        case 'referral_request':
            subject = `Inquiry regarding ${roleContext} - ${candidateName}`;
            break;
        case 'follow_up':
            subject = `Following Up: Application for ${roleContext} - ${candidateName}`;
            break;
        case 'recruiter_outreach':
        default:
            subject = `Inquiry / Expression of Interest: ${roleContext} - ${candidateName}`;
            break;
    }
    // Construct grounded body
    const bodyParagraphs = [];
    // Paragraph 1: Purpose of message
    if (type === 'job_application') {
        if (companyName && jobTitle) {
            bodyParagraphs.push(`I am writing to express my interest in the ${jobTitle} role at ${companyName}.`);
        }
        else if (jobTitle) {
            bodyParagraphs.push(`I am writing to express my interest in the ${jobTitle} position.`);
        }
        else if (companyName) {
            bodyParagraphs.push(`I am writing to express my interest in engineering opportunities at ${companyName}.`);
        }
        else {
            bodyParagraphs.push(`I am reaching out regarding current engineering opportunities with your team.`);
        }
    }
    else if (type === 'referral_request') {
        const contact = input.referralContactName?.trim();
        if (contact) {
            bodyParagraphs.push(`I hope you are doing well. ${contact} suggested I connect with you regarding engineering opportunities at ${companyName || 'your company'}.`);
        }
        else {
            bodyParagraphs.push(`I hope this note finds you well. I noticed your work at ${companyName || 'your company'} and wanted to connect regarding engineering opportunities.`);
        }
    }
    else if (type === 'follow_up') {
        bodyParagraphs.push(`I hope you are having a productive week. I am following up on my application for the ${jobTitle ? `${jobTitle} role` : 'open position'}${companyName ? ` at ${companyName}` : ''}.`);
    }
    else {
        // recruiter_outreach
        if (companyName && jobTitle) {
            bodyParagraphs.push(`I am reaching out to introduce myself and express interest in the ${jobTitle} opening at ${companyName}.`);
        }
        else if (companyName) {
            bodyParagraphs.push(`I am reaching out to introduce myself and inquire about software engineering opportunities at ${companyName}.`);
        }
        else {
            bodyParagraphs.push(`I am reaching out to introduce myself and inquire about potential technical roles with your team.`);
        }
    }
    // Paragraph 2: Grounded facts (Strictly from verified resume data)
    const factStatements = [];
    if (primaryEducation) {
        factStatements.push(`My background includes ${primaryEducation}`);
    }
    if (primaryExperience) {
        factStatements.push(`experience as ${primaryExperience}`);
    }
    if (groundedSkills.length > 0) {
        const skillsListStr = groundedSkills.slice(0, 4).join(', ');
        if (factStatements.length > 0) {
            bodyParagraphs.push(`${factStatements.join(', with ')}. My practical technical background includes hands-on work with ${skillsListStr}.`);
        }
        else {
            bodyParagraphs.push(`My practical technical background includes hands-on work with ${skillsListStr}.`);
        }
    }
    else if (factStatements.length > 0) {
        bodyParagraphs.push(`${factStatements.join(', with ')}.`);
    }
    if (primaryProject) {
        bodyParagraphs.push(`Recently, I developed ${primaryProject}, applying these technologies to build reliable functionality.`);
    }
    // Tone adjustments (strictly professional phrasing without injecting unverified metrics)
    if (tone === 'concise') {
        // Keep brief
    }
    else if (tone === 'enthusiastic') {
        if (companyName) {
            bodyParagraphs.push(`I closely follow ${companyName}'s engineering culture and would value the chance to contribute thoughtfully to your team's upcoming initiatives.`);
        }
    }
    else if (tone === 'confident') {
        bodyParagraphs.push(`I am confident that my technical foundation and problem-solving focus align well with your team's technical standards.`);
    }
    // Optional video intro
    if (input.videoIntroUrl && input.videoIntroUrl.trim()) {
        bodyParagraphs.push(`To give a quick introduction, I have recorded a brief self-introduction video which you can view here: ${input.videoIntroUrl.trim()}`);
    }
    // Closing Call to Action
    if (type === 'follow_up') {
        bodyParagraphs.push(`I would welcome the opportunity to provide any additional details that might be helpful. Thank you for your continued time and consideration.`);
    }
    else {
        bodyParagraphs.push(`I have attached my resume for your review. If your schedule allows, I would welcome a brief introductory conversation to learn more about your team's priorities.`);
    }
    const fullBody = `${greeting},\n\n${bodyParagraphs.join('\n\n')}\n\nSincerely,\n${candidateName}`;
    return {
        type,
        tone,
        recipientName: recruiterName,
        recipientEmail,
        companyName,
        jobTitle,
        subject,
        body: fullBody,
        groundedSkills,
        status: 'DRAFT',
        hasVideoIntro: Boolean(input.videoIntroUrl?.trim()),
        factsTraceable: {
            skillsUsed: groundedSkills,
            educationUsed: primaryEducation ? [primaryEducation] : [],
            experienceUsed: primaryExperience ? [primaryExperience] : [],
            projectsUsed: primaryProject ? [primaryProject] : []
        }
    };
}
