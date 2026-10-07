"use strict";
// Deterministic 5-Component ATS Scoring Engine for Node.js / TypeScript
// Guarantees 100% logic alignment with Python FastAPI implementation
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractTechKeywords = extractTechKeywords;
exports.parseJDSections = parseJDSections;
exports.extractExperienceAndEducationReqs = extractExperienceAndEducationReqs;
exports.checkResumeCompleteness = checkResumeCompleteness;
exports.computeTfidfCosineSim = computeTfidfCosineSim;
exports.calculateDeterministicATSScore = calculateDeterministicATSScore;
const GENERIC_WORDS = new Set([
    "developer", "engineer", "software", "experience", "team", "work", "role",
    "building", "candidate", "responsibilities", "qualifications", "position",
    "company", "working", "knowledge", "ability", "strong", "skills", "years",
    "looking", "project", "projects", "management", "opportunity", "solutions",
    "environment", "system", "systems", "applications", "application", "support",
    "development", "requirements", "degree", "field", "related", "duty", "duties",
    "perform", "performing", "plus", "bonus", "must", "have", "preferred", "required",
    "seeking", "professional", "hands-on", "proven", "track", "record", "good",
    "excellent", "communication", "design", "create", "implement", "maintain"
]);
const ENGLISH_STOP_WORDS = new Set([
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't",
    "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can't",
    "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during",
    "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't", "have", "haven't", "having",
    "he", "he'd", "he'll", "he's", "her", "here", "here's", "hers", "herself", "him", "himself", "his", "how",
    "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's", "its", "itself",
    "let's", "me", "more", "most", "mustn't", "my", "myself", "no", "nor", "not", "of", "off", "on", "once",
    "only", "or", "other", "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "shan't", "she",
    "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such", "than", "that", "that's", "the",
    "their", "theirs", "them", "themselves", "then", "there", "there's", "these", "they", "they'd", "they'll",
    "they're", "they've", "this", "those", "through", "to", "too", "under", "until", "up", "very", "was", "wasn't",
    "we", "we'd", "we'll", "we're", "we've", "were", "weren't", "what", "what's", "when", "when's", "where",
    "where's", "which", "while", "who", "who's", "whom", "why", "why's", "with", "won't", "would", "wouldn't",
    "you", "you'd", "you'll", "you're", "you've", "your", "yours", "yourself", "yourselves"
]);
const SYNONYM_MAP = {
    "react": "React", "react.js": "React", "reactjs": "React",
    "node": "Node.js", "node.js": "Node.js", "nodejs": "Node.js",
    "express": "Express.js", "express.js": "Express.js", "expressjs": "Express.js",
    "vue": "Vue.js", "vue.js": "Vue.js", "vuejs": "Vue.js",
    "next": "Next.js", "next.js": "Next.js", "nextjs": "Next.js",
    "postgres": "PostgreSQL", "postgresql": "PostgreSQL",
    "mongo": "MongoDB", "mongodb": "MongoDB",
    "k8s": "Kubernetes", "kubernetes": "Kubernetes",
    "aws": "AWS", "amazon web services": "AWS",
    "gcp": "GCP", "google cloud platform": "GCP",
    "azure": "Azure", "microsoft azure": "Azure",
    "ci/cd": "CI/CD", "cicd": "CI/CD", "continuous integration": "CI/CD",
    "rest": "REST API", "rest api": "REST API", "restful api": "REST API",
    "graphql": "GraphQL",
    "js": "JavaScript", "javascript": "JavaScript",
    "ts": "TypeScript", "typescript": "TypeScript",
    "py": "Python", "python": "Python",
    "go": "Go", "golang": "Go",
    "java": "Java",
    "c#": "C#", "csharp": "C#",
    "c++": "C++", "cpp": "C++",
    "html": "HTML", "html5": "HTML",
    "css": "CSS", "css3": "CSS",
    "tailwind": "Tailwind CSS", "tailwind css": "Tailwind CSS",
    "bootstrap": "Bootstrap",
    "docker": "Docker",
    "git": "Git", "github": "Git", "gitlab": "Git",
    "sql": "SQL", "mysql": "MySQL", "redis": "Redis",
    "scikit-learn": "Scikit-Learn", "sklearn": "Scikit-Learn",
    "tensorflow": "TensorFlow", "pytorch": "PyTorch",
    "pandas": "Pandas", "numpy": "NumPy",
    "jira": "Jira", "agile": "Agile", "scrum": "Scrum",
    "jest": "Jest", "cypress": "Cypress", "webpack": "Webpack", "vite": "Vite"
};
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function extractTechKeywords(text) {
    if (!text)
        return [];
    const textLower = text.toLowerCase();
    const found = new Map();
    for (const [alias, canonical] of Object.entries(SYNONYM_MAP)) {
        const pattern = new RegExp(`(?<![a-zA-Z0-9_])${escapeRegex(alias)}(?![a-zA-Z0-9_])`, 'i');
        if (pattern.test(textLower)) {
            if (alias === 'js') {
                if (/(?<![a-zA-Z0-9_.])js(?![a-zA-Z0-9_])/i.test(textLower)) {
                    found.set(canonical, canonical);
                }
            }
            else if (alias === 'java') {
                if (/\bjava\b/i.test(textLower) && !/\bjavascript\b/i.test(textLower)) {
                    found.set(canonical, canonical);
                }
            }
            else if (alias === 'c') {
                if (/\bc\b/i.test(textLower) && !/\b(c\+\+|c#|cpp|csharp)\b/i.test(textLower)) {
                    found.set(canonical, canonical);
                }
            }
            else if (alias === 'go') {
                if (/\b(go|golang)\b/i.test(textLower)) {
                    found.set(canonical, canonical);
                }
            }
            else {
                found.set(canonical, canonical);
            }
        }
    }
    return Array.from(found.keys()).sort();
}
function parseJDSections(jobDescription) {
    const lines = jobDescription.split('\n');
    const reqLines = [];
    const prefLines = [];
    const generalLines = [];
    let currentMode = 'general';
    for (const line of lines) {
        const lLower = line.toLowerCase().trim();
        if (["required skills", "requirements", "qualifications", "must have", "what you need", "basic qualifications", "who you are"].some(h => lLower.includes(h))) {
            currentMode = 'req';
            continue;
        }
        else if (["preferred skills", "preferred qualifications", "nice to have", "pluses", "desirable", "bonus points", "additional skills"].some(h => lLower.includes(h))) {
            currentMode = 'pref';
            continue;
        }
        if (currentMode === 'req')
            reqLines.push(line);
        else if (currentMode === 'pref')
            prefLines.push(line);
        else
            generalLines.push(line);
    }
    let reqSkills = extractTechKeywords(reqLines.join('\n'));
    let prefSkills = extractTechKeywords(prefLines.join('\n'));
    const allJdSkills = extractTechKeywords(jobDescription);
    if (reqSkills.length === 0 && prefSkills.length === 0) {
        reqSkills = allJdSkills;
        prefSkills = [];
    }
    else if (reqSkills.length > 0 && prefSkills.length === 0) {
        prefSkills = allJdSkills.filter(s => !reqSkills.includes(s));
    }
    return { reqSkills, prefSkills, allJdSkills };
}
function extractExperienceAndEducationReqs(jobDescription, resumeText, parsedResume) {
    const jdLower = jobDescription.toLowerCase();
    const resLower = (resumeText || '').toLowerCase();
    const expMatch = jdLower.match(/(\d+)\+?\s*years?(?:\s*of)?\s*(?:experience|work|exp)/i);
    const requiredYears = expMatch ? parseInt(expMatch[1], 10) : null;
    let detectedYears = null;
    if (parsedResume && parsedResume.experience && Array.isArray(parsedResume.experience)) {
        const yearsFound = [];
        for (const exp of parsedResume.experience) {
            const dur = String(exp.duration || '');
            const matches = dur.match(/\b(20\d{2}|19\d{2})\b/g);
            if (matches && matches.length >= 2) {
                const y1 = parseInt(matches[0], 10);
                const y2 = parseInt(matches[1], 10);
                yearsFound.push(Math.abs(y2 - y1));
            }
            else if (matches && matches.length === 1 && /present|current|now/i.test(dur)) {
                const y1 = parseInt(matches[0], 10);
                yearsFound.push(Math.max(0, 2026 - y1));
            }
        }
        if (yearsFound.length > 0) {
            detectedYears = yearsFound.reduce((a, b) => a + b, 0);
        }
    }
    else {
        const matches = resLower.match(/\b(20\d{2}|19\d{2})\b/g);
        if (matches && matches.length >= 2) {
            const years = matches.map(m => parseInt(m, 10));
            detectedYears = Math.max(...years) - Math.min(...years);
        }
    }
    let expScore = 7.5;
    let expStatus = "No specific experience duration required";
    if (requiredYears !== null) {
        if (detectedYears !== null) {
            if (detectedYears >= requiredYears) {
                expScore = 7.5;
                expStatus = `Matched (${detectedYears} years detected vs ${requiredYears}+ years required)`;
            }
            else {
                expScore = Math.round((detectedYears / requiredYears) * 7.5 * 100) / 100;
                expStatus = `Partial match (${detectedYears} years detected vs ${requiredYears}+ years required)`;
            }
        }
        else {
            expScore = 0.0;
            expStatus = `Insufficient Information (${requiredYears}+ years required, but verifiable work dates were not detected in resume)`;
        }
    }
    let reqDegree = null;
    if (/phd|doctorate/i.test(jdLower))
        reqDegree = "PhD";
    else if (/master|m\.s\.|mtech|mba/i.test(jdLower))
        reqDegree = "Master's";
    else if (/bachelor|b\.s\.|btech|b\.a\.|degree/i.test(jdLower))
        reqDegree = "Bachelor's";
    let eduScore = 7.5;
    let eduStatus = "No specific degree level required";
    if (reqDegree) {
        let resEduText = "";
        if (parsedResume && parsedResume.education && Array.isArray(parsedResume.education)) {
            resEduText = parsedResume.education.map((e) => JSON.stringify(e)).join(' ').toLowerCase();
        }
        else {
            resEduText = resLower;
        }
        let hasDegree = false;
        if (reqDegree === "PhD" && /phd|doctorate/i.test(resEduText))
            hasDegree = true;
        else if (reqDegree === "Master's" && /master|m\.s\.|mtech|mba|phd|doctorate/i.test(resEduText))
            hasDegree = true;
        else if (reqDegree === "Bachelor's" && /bachelor|b\.s\.|btech|b\.a\.|degree|master|m\.s\.|phd/i.test(resEduText))
            hasDegree = true;
        if (hasDegree) {
            eduScore = 7.5;
            eduStatus = `Matched (${reqDegree} degree or equivalent detected)`;
        }
        else {
            eduScore = 0.0;
            eduStatus = `Not Detected (${reqDegree} degree required by job description but not found in resume)`;
        }
    }
    return {
        expScore,
        eduScore,
        totalExpEduScore: Math.round((expScore + eduScore) * 100) / 100,
        experienceStatus: expStatus,
        educationStatus: eduStatus
    };
}
function checkResumeCompleteness(resumeText, parsedResume) {
    const resLower = (resumeText || '').toLowerCase();
    const detectedSections = [];
    const missingCore = [];
    if ((parsedResume && parsedResume.skills && parsedResume.skills.length > 0) || ["skills", "technical skills", "technologies"].some(h => resLower.includes(h))) {
        detectedSections.push("Skills");
    }
    else {
        missingCore.push("Skills");
    }
    if ((parsedResume && parsedResume.experience && parsedResume.experience.length > 0) || ["experience", "employment", "work history", "professional experience"].some(h => resLower.includes(h))) {
        detectedSections.push("Experience");
    }
    else {
        missingCore.push("Experience");
    }
    if ((parsedResume && parsedResume.education && parsedResume.education.length > 0) || ["education", "academic", "qualifications", "degree"].some(h => resLower.includes(h))) {
        detectedSections.push("Education");
    }
    else {
        missingCore.push("Education");
    }
    if ((parsedResume && parsedResume.projects && parsedResume.projects.length > 0) || resLower.includes("projects")) {
        detectedSections.push("Projects");
    }
    if ((parsedResume && parsedResume.certifications && parsedResume.certifications.length > 0) || resLower.includes("certifications")) {
        detectedSections.push("Certifications");
    }
    if ((parsedResume && parsedResume.summary && parsedResume.summary.length > 0) || resLower.includes("summary")) {
        detectedSections.push("Summary");
    }
    const coreCount = 3 - missingCore.length;
    const score = Math.round((coreCount / 3.0) * 15.0 * 100) / 100;
    return {
        score,
        maxScore: 15.0,
        detectedSections,
        missingCoreSections: missingCore,
        details: `${coreCount}/3 core sections detected (Skills, Experience, Education)`
    };
}
function extractNgrams(text) {
    const tokens = (text.toLowerCase().match(/\b[a-zA-Z0-9_.#-]+\b/g) || [])
        .filter(t => t.length > 1 && !GENERIC_WORDS.has(t) && !ENGLISH_STOP_WORDS.has(t));
    const ngrams = [...tokens];
    for (let i = 0; i < tokens.length - 1; i++) {
        ngrams.push(`${tokens[i]} ${tokens[i + 1]}`);
    }
    return ngrams;
}
function computeTfidfCosineSim(text1, text2) {
    const ngrams1 = extractNgrams(text1);
    const ngrams2 = extractNgrams(text2);
    if (ngrams1.length === 0 || ngrams2.length === 0)
        return 0.0;
    const tf1 = {};
    const tf2 = {};
    ngrams1.forEach(t => tf1[t] = (tf1[t] || 0) + 1);
    ngrams2.forEach(t => tf2[t] = (tf2[t] || 0) + 1);
    const vocab = new Set([...Object.keys(tf1), ...Object.keys(tf2)]);
    let dotProduct = 0;
    let norm1Sq = 0;
    let norm2Sq = 0;
    vocab.forEach(t => {
        const count1 = tf1[t] || 0;
        const count2 = tf2[t] || 0;
        let df = 0;
        if (count1 > 0)
            df++;
        if (count2 > 0)
            df++;
        const idf = Math.log(3.0 / (1.0 + df)) + 1.0;
        const v1 = count1 * idf;
        const v2 = count2 * idf;
        dotProduct += v1 * v2;
        norm1Sq += v1 * v1;
        norm2Sq += v2 * v2;
    });
    if (norm1Sq === 0 || norm2Sq === 0)
        return 0.0;
    const sim = dotProduct / (Math.sqrt(norm1Sq) * Math.sqrt(norm2Sq));
    return Math.round(sim * 10000) / 10000;
}
function calculateDeterministicATSScore(resumeText, jobDescription, parsedResume) {
    if (!resumeText || !resumeText.trim()) {
        return { error: "Resume text is empty or unreadable.", ats_score: 0.0 };
    }
    if (!jobDescription || !jobDescription.trim()) {
        return { error: "Job description text is required.", ats_score: 0.0 };
    }
    const words = resumeText.match(/\b[a-zA-Z0-9_-]+\b/g) || [];
    if (words.length < 15) {
        return { error: `Resume contains insufficient text (only ${words.length} words detected). Please upload a text-based resume.`, ats_score: 0.0 };
    }
    const { reqSkills, prefSkills, allJdSkills } = parseJDSections(jobDescription);
    const resumeSkillsSet = new Set(extractTechKeywords(resumeText));
    if (parsedResume && parsedResume.skills && Array.isArray(parsedResume.skills)) {
        extractTechKeywords(parsedResume.skills.join(' ')).forEach(s => resumeSkillsSet.add(s));
    }
    const resumeSkills = Array.from(resumeSkillsSet);
    // 1. Required Skills (35%)
    const matchedReq = reqSkills.filter(s => resumeSkills.includes(s)).sort();
    const missingReq = reqSkills.filter(s => !resumeSkills.includes(s)).sort();
    const reqScore = reqSkills.length > 0 ? Math.round((matchedReq.length / reqSkills.length) * 35.0 * 100) / 100 : 35.0;
    // 2. Preferred Skills (15%)
    const matchedPref = prefSkills.filter(s => resumeSkills.includes(s)).sort();
    const missingPref = prefSkills.filter(s => !resumeSkills.includes(s)).sort();
    const prefScore = prefSkills.length > 0 ? Math.round((matchedPref.length / prefSkills.length) * 15.0 * 100) / 100 : 15.0;
    // 3. Keywords & Overlap (20%)
    const matchedKw = allJdSkills.filter(s => resumeSkills.includes(s)).sort();
    const missingKw = allJdSkills.filter(s => !resumeSkills.includes(s)).sort();
    const keywordRatio = matchedKw.length / Math.max(1, allJdSkills.length);
    const cosineSim = computeTfidfCosineSim(resumeText, jobDescription);
    const kwScore = Math.round(((0.5 * keywordRatio) + (0.5 * cosineSim)) * 20.0 * 100) / 100;
    // 4. Experience & Education (15%)
    const expEduRes = extractExperienceAndEducationReqs(jobDescription, resumeText, parsedResume);
    // 5. Structure & Completeness (15%)
    const structRes = checkResumeCompleteness(resumeText, parsedResume);
    // Total
    let finalScore = Math.round((reqScore + prefScore + kwScore + expEduRes.totalExpEduScore + structRes.score) * 10) / 10;
    finalScore = Math.max(0.0, Math.min(100.0, finalScore));
    const suggestions = [];
    const potentialIssues = [];
    if (missingReq.length > 0) {
        suggestions.push(`Required skills missing from resume: ${missingReq.slice(0, 4).join(', ')}. If you genuinely possess experience with these, ensure they are explicitly listed.`);
    }
    if (missingPref.length > 0) {
        suggestions.push(`Preferred skills missing: ${missingPref.slice(0, 3).join(', ')}. Mentioning these (if applicable) can strengthen your application.`);
    }
    if (expEduRes.experienceStatus.includes("Insufficient Information")) {
        potentialIssues.push("Verifiable work experience dates were not detected in the resume.");
        suggestions.push("Ensure your work experience entries include clear start and end dates (e.g., '2021 - 2023').");
    }
    if (expEduRes.educationStatus.includes("Not Detected")) {
        potentialIssues.push("Target degree level was not detected in the resume education section.");
        suggestions.push("Verify that your degree title (e.g. Bachelor's, Master's) is clearly listed in your Education section.");
    }
    if (structRes.missingCoreSections.length > 0) {
        potentialIssues.push(`Core resume sections missing: ${structRes.missingCoreSections.join(', ')}.`);
    }
    return {
        ats_score: finalScore,
        scoring_formula: {
            required_skills_weight: "35%",
            preferred_skills_weight: "15%",
            keywords_weight: "20%",
            exp_edu_weight: "15%",
            structure_weight: "15%"
        },
        breakdown: {
            required_skills: {
                score: reqScore,
                max_score: 35.0,
                matched_count: matchedReq.length,
                total_count: reqSkills.length,
                matched: matchedReq,
                missing: missingReq,
                details: reqSkills.length > 0 ? `${matchedReq.length}/${reqSkills.length} required skills matched` : "No specific required skills section found in JD"
            },
            preferred_skills: {
                score: prefScore,
                max_score: 15.0,
                matched_count: matchedPref.length,
                total_count: prefSkills.length,
                matched: matchedPref,
                missing: missingPref,
                details: prefSkills.length > 0 ? `${matchedPref.length}/${prefSkills.length} preferred skills matched` : "No preferred skills explicitly listed"
            },
            keywords: {
                score: kwScore,
                max_score: 20.0,
                matched_count: matchedKw.length,
                total_count: allJdSkills.length,
                matched: matchedKw,
                missing: missingKw,
                details: `${matchedKw.length}/${allJdSkills.length} domain tech keywords matched (${Math.round(keywordRatio * 1000) / 10}%)`
            },
            experience_and_education: {
                score: expEduRes.totalExpEduScore,
                max_score: 15.0,
                experience_status: expEduRes.experienceStatus,
                education_status: expEduRes.educationStatus,
                details: "Evaluated experience dates and degree requirements"
            },
            resume_structure: {
                score: structRes.score,
                max_score: 15.0,
                detected_sections: structRes.detectedSections,
                missing_core_sections: structRes.missingCoreSections,
                details: structRes.details
            }
        },
        matched_keywords: matchedKw,
        missing_keywords: missingKw,
        detected_sections: structRes.detectedSections,
        potential_issues: potentialIssues,
        suggestions
    };
}
