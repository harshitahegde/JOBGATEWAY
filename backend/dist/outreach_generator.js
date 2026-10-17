"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractVerifiableResumeFacts = extractVerifiableResumeFacts;
exports.findRelevantMatch = findRelevantMatch;
exports.generateFactGroundedOutreach = generateFactGroundedOutreach;
/**
 * Normalizes verifiable facts from user's structured resume data.
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
    if (Array.isArray(facts?.skills)) {
        for (const s of facts.skills) {
            if (typeof s === 'string' && s.trim()) {
                result.allSkills.push(s.trim());
            }
        }
    }
    if (Array.isArray(facts?.education)) {
        for (const edu of facts.education) {
            const deg = edu.degree?.trim();
            const inst = edu.institution?.trim();
            if (deg && inst)
                result.educationItems.push(`${deg} from ${inst}`);
            else if (deg || inst)
                result.educationItems.push(deg || inst || '');
        }
    }
    if (Array.isArray(facts?.experience)) {
        for (const exp of facts.experience) {
            const title = exp.title?.trim();
            const comp = exp.company?.trim();
            if (title && comp)
                result.experienceItems.push(`${title} at ${comp}`);
            else if (title || comp)
                result.experienceItems.push(title || comp || '');
        }
    }
    if (Array.isArray(facts?.projects)) {
        for (const proj of facts.projects) {
            if (proj.name?.trim())
                result.projectItems.push(proj.name.trim());
        }
    }
    return result;
}
/**
 * Checks for at most ONE relevant, truthful skill or domain match between
 * the job description and the candidate's verified resume facts.
 * Never invents skills or claims.
 */
function findRelevantMatch(jobDescription, verifiedSkills = [], experienceItems = []) {
    if (!jobDescription || !jobDescription.trim())
        return null;
    const lowerJD = jobDescription.toLowerCase();
    // 1. Check verified skills with word-boundary matching
    for (const skill of verifiedSkills) {
        if (!skill || skill.trim().length < 2)
            continue;
        const clean = skill.trim();
        const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escaped}\\b`, 'i');
        if (regex.test(lowerJD)) {
            return clean;
        }
    }
    // 2. Check key domains from experience titles
    const ignoredWords = new Set(['from', 'with', 'senior', 'junior', 'lead', 'associate', 'developer', 'engineer', 'manager', 'specialist', 'analyst', 'intern']);
    for (const exp of experienceItems) {
        if (!exp || exp.trim().length < 3)
            continue;
        const words = exp.split(/[\s,/-]+/).filter(w => w.length > 3 && !ignoredWords.has(w.toLowerCase()));
        for (const w of words) {
            const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`\\b${escaped}\\b`, 'i');
            if (regex.test(lowerJD)) {
                return w;
            }
        }
    }
    return null;
}
/**
 * Generates a contextual, professional, editable recruiter outreach email draft.
 *
 * Personalization rules (in priority order):
 * 1. Company: If supplied, mention the correct company naturally.
 * 2. Target role: If supplied, adapt the subject and opening to that role.
 * 3. Job description: If supplied, identify at most one relevant, truthful reason for interest.
 *    Use resume facts only if they genuinely support that reason. If no supported match, do not hallucinate.
 * 4. Recruiter details: Use supplied recruiter's name when available; otherwise use appropriate greeting.
 * 5. Candidate details: Use actual candidate name and verified information only.
 *
 * Strict safety guarantees:
 * - Never dump random skill lists or stuff skills into emails.
 * - Never invent recruiter names, companies, roles, metrics, or candidate experience.
 * - Gracefully omit missing fields without "undefined" or malformed placeholders.
 * - Include video pitch link strictly when explicitly provided.
 */
function generateFactGroundedOutreach(input) {
    const type = input.type || 'recruiter_outreach';
    const tone = input.tone || 'professional';
    const verified = extractVerifiableResumeFacts(input.resumeFacts);
    const rawCandidateName = (input.candidateName || verified.fullName || '').trim();
    // Do not insert the literal string "Candidate" if name is missing
    const candidateName = rawCandidateName.toLowerCase() === 'candidate' ? '' : rawCandidateName;
    const recruiterName = (input.recruiterName || '').trim();
    const recipientEmail = (input.recruiterEmail || '').trim();
    const companyName = (input.companyName || '').trim();
    const jobTitle = (input.jobTitle || '').trim();
    const jobDescription = (input.jobDescription || '').trim();
    const videoIntroUrl = (input.videoIntroUrl || '').trim();
    // 1. Determine Greeting: Never invent a name
    let greeting;
    const isGenericRecruiterName = !recruiterName || ['recruiter', 'hiring team', 'hiring manager', 'team'].includes(recruiterName.toLowerCase());
    if (!isGenericRecruiterName) {
        greeting = `Dear ${recruiterName},`;
    }
    else if (companyName) {
        greeting = `Dear ${companyName} Hiring Team,`;
    }
    else {
        greeting = 'Dear Hiring Team,';
    }
    // 2. Build Contextual Subject Line
    let subject;
    if (type === 'follow_up') {
        if (jobTitle && companyName) {
            subject = `Following Up: ${jobTitle} Application at ${companyName}`;
        }
        else if (jobTitle) {
            subject = `Following Up: ${jobTitle} Application`;
        }
        else if (companyName) {
            subject = `Following Up: Application with ${companyName}`;
        }
        else {
            subject = 'Following Up: Application Inquiry';
        }
    }
    else {
        if (jobTitle && companyName) {
            subject = `Interest in ${jobTitle} Opportunities at ${companyName}`;
        }
        else if (jobTitle) {
            subject = `Interest in ${jobTitle} Opportunities`;
        }
        else if (companyName) {
            subject = `Inquiry: Career Opportunities at ${companyName}`;
        }
        else {
            subject = 'Inquiry: Career Opportunities';
        }
    }
    // 3. Body Construction
    const paragraphs = [];
    // Opening line
    if (type === 'follow_up') {
        paragraphs.push('I hope you are having a productive week.');
    }
    else {
        paragraphs.push('I hope you are doing well.');
    }
    // Purpose / Expression of Interest (adapts to company and role)
    if (type === 'follow_up') {
        if (jobTitle && companyName) {
            paragraphs.push(`I am following up on my application for the ${jobTitle} role at ${companyName} and would appreciate any updates on the hiring timeline.`);
        }
        else if (jobTitle) {
            paragraphs.push(`I am following up on my application for the ${jobTitle} role and would appreciate any updates on the hiring timeline.`);
        }
        else if (companyName) {
            paragraphs.push(`I am following up on my application with ${companyName} and would appreciate any updates on the hiring timeline.`);
        }
        else {
            paragraphs.push('I am following up on my application submitted previously and would appreciate any updates on the hiring timeline.');
        }
    }
    else if (type === 'referral_request') {
        const contact = input.referralContactName?.trim();
        if (contact && jobTitle && companyName) {
            paragraphs.push(`${contact} suggested I reach out to you regarding ${jobTitle} opportunities at ${companyName}.`);
        }
        else if (contact && companyName) {
            paragraphs.push(`${contact} suggested I reach out to you regarding career opportunities at ${companyName}.`);
        }
        else if (contact) {
            paragraphs.push(`${contact} suggested I reach out to you to explore potential opportunities with your team.`);
        }
        else if (jobTitle && companyName) {
            paragraphs.push(`I am reaching out to explore potential ${jobTitle} opportunities at ${companyName}.`);
        }
        else if (companyName) {
            paragraphs.push(`I am reaching out to explore potential career opportunities at ${companyName}.`);
        }
        else {
            paragraphs.push('I am reaching out to explore potential opportunities where my background might align with your team.');
        }
    }
    else {
        // recruiter_outreach / job_application
        if (jobTitle && companyName) {
            paragraphs.push(`I am writing to express my interest in ${jobTitle} opportunities at ${companyName}.`);
        }
        else if (jobTitle) {
            paragraphs.push(`I am writing to express my interest in ${jobTitle} opportunities.`);
        }
        else if (companyName) {
            paragraphs.push(`I am writing to express my interest in suitable opportunities at ${companyName}.`);
        }
        else {
            paragraphs.push('I am reaching out to express my interest in opportunities where my background might align with your team\'s needs.');
        }
    }
    // 4. Job Description & Contextual Grounding (at most ONE relevant reason)
    let matchedPoint = null;
    if (type !== 'follow_up') {
        if (jobDescription) {
            matchedPoint = findRelevantMatch(jobDescription, verified.allSkills, verified.experienceItems);
            if (matchedPoint) {
                // Job description with relevant resume evidence
                paragraphs.push(`Given my background in ${matchedPoint}, I was particularly drawn to your team's focus and would welcome the opportunity to discuss how my experience aligns with the role.`);
            }
            else {
                // Job description with NO supported matching experience: truthful, no hallucinations
                paragraphs.push('Having reviewed the position requirements, I would welcome the opportunity to discuss how my background and problem-solving focus could support your team\'s goals.');
            }
        }
        else {
            // No job description supplied: clean standard inquiry
            paragraphs.push('I would welcome the opportunity to discuss any suitable openings.');
        }
        // Resume attachment statement
        paragraphs.push('I have attached my resume for your consideration.');
    }
    // 5. Video pitch introduction (ONLY when explicitly provided)
    if (videoIntroUrl) {
        paragraphs.push(`I have also included a brief video introduction: ${videoIntroUrl}`);
    }
    // 6. Closing Call to Action
    paragraphs.push('Thank you for your time and consideration. I look forward to hearing from you.');
    // 7. Professional Sign-off
    const signOff = candidateName ? `Best regards,\n${candidateName}` : 'Best regards,';
    const fullBody = `${greeting}\n\n${paragraphs.join('\n\n')}\n\n${signOff}`;
    return {
        type,
        tone,
        recipientName: recruiterName,
        recipientEmail,
        companyName,
        jobTitle,
        subject,
        body: fullBody,
        groundedSkills: matchedPoint ? [matchedPoint] : [],
        status: 'DRAFT',
        hasVideoIntro: Boolean(videoIntroUrl),
        factsTraceable: {
            skillsUsed: matchedPoint ? [matchedPoint] : [],
            educationUsed: verified.educationItems.slice(0, 1),
            experienceUsed: verified.experienceItems.slice(0, 1),
            projectsUsed: verified.projectItems.slice(0, 1)
        }
    };
}
