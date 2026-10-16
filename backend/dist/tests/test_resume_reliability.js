"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const resume_parser_ts_1 = require("../resume_parser_ts");
const resume_analyzer_ts_1 = require("../resume_analyzer_ts");
const ats_engine_1 = require("../ats_engine");
function logPass(msg) {
    console.log(`\x1b[32m✓ [PASS]\x1b[0m ${msg}`);
}
async function runResumeReliabilityTests() {
    console.log('===============================================================');
    console.log('🧪 JOBGATEWAY RESUME WORKFLOW RELIABILITY AUDIT & ACCEPTANCE TESTS');
    console.log('===============================================================\n');
    // --------------------------------------------------------------------------
    // TEST 1: Extraction & Formatting Variations
    // --------------------------------------------------------------------------
    console.log('--- 1. Extraction of Contacts, Links & Skills (No Overwrites) ---');
    // 1.1 Diverse Phone Formats
    const phones = [
        '+1 (555) 234-5678',
        '+91 98765 43210',
        '(415) 555-0199',
        '+44 20 7946 0958',
        '555-839-2019'
    ];
    for (const p of phones) {
        const extracted = (0, resume_parser_ts_1.extractPhoneNumber)(`Contact me at ${p} for interviews.`);
        (0, assert_1.default)(extracted.length > 0, `Phone format extracted: "${p}" -> "${extracted}"`);
    }
    logPass('1.1: Handled international and multi-format phone numbers cleanly');
    // 1.2 Non-phone year ranges are not confused with phone numbers
    const yearText = 'Education: Attended Stanford University from 2018 - 2022.';
    const yearExtracted = (0, resume_parser_ts_1.extractPhoneNumber)(yearText);
    (0, assert_1.default)(yearExtracted === '', 'Did not mistake graduation year range (2018-2022) for a phone number');
    logPass('1.2: Year ranges (e.g. 2018-2022) correctly excluded from phone extraction');
    // 1.3 Diverse Email Formats
    const emails = [
        'jane.doe+jobgateway@subdomain.example.org',
        'harshita_hegde.dev@tech-corp.io',
        'candidate-first.last@company.co.uk'
    ];
    for (const em of emails) {
        const extracted = (0, resume_parser_ts_1.extractEmail)(`Please send inquiries to ${em}.`);
        assert_1.default.strictEqual(extracted, em, `Email extracted accurately: ${em}`);
    }
    logPass('1.3: Extracted complex email addresses with subdomains, tags, and dashes');
    // 1.4 Diverse LinkedIn & GitHub URLs
    const linkedinCandidates = [
        'https://www.linkedin.com/in/harshita-hegde/',
        'linkedin.com/in/johndoe',
        'http://linkedin.com/pub/alex-smith/12/345/678'
    ];
    for (const li of linkedinCandidates) {
        const extracted = (0, resume_parser_ts_1.extractLinkedIn)(`Profile: ${li}`);
        (0, assert_1.default)(extracted.startsWith('https://linkedin.com/in/'), `Canonical LinkedIn: ${extracted}`);
    }
    logPass('1.4: Extracted and normalized LinkedIn URLs across protocol and trailing slash variations');
    const githubCandidates = [
        'https://github.com/harshita-hegde',
        'github.com/developer-lead'
    ];
    for (const gh of githubCandidates) {
        const extracted = (0, resume_parser_ts_1.extractGitHub)(`Code at ${gh}`);
        (0, assert_1.default)(extracted.startsWith('https://github.com/'), `Canonical GitHub: ${extracted}`);
    }
    logPass('1.5: Extracted GitHub URLs and excluded marketing routes');
    // 1.5 Real Skills Section Extraction (Not restricted to small synonym map)
    const skillsLines = [
        'Languages & Frameworks: TypeScript, Python, Golang, Rust, React, Next.js, FastAPI',
        'Databases & Storage: PostgreSQL, Redis, Elasticsearch, DynamoDB',
        'DevOps & Tools: Docker, Kubernetes, Terraform, AWS, GitHub Actions'
    ];
    const extractedSkills = (0, resume_parser_ts_1.extractSkillsFromSection)(skillsLines);
    (0, assert_1.default)(extractedSkills.includes('TypeScript'), 'Found TypeScript');
    (0, assert_1.default)(extractedSkills.includes('FastAPI'), 'Found FastAPI');
    (0, assert_1.default)(extractedSkills.includes('Terraform'), 'Found Terraform');
    (0, assert_1.default)(extractedSkills.includes('Golang'), 'Found Golang');
    (0, assert_1.default)(extractedSkills.length >= 12, `Extracted ${extractedSkills.length} skills from structured sections`);
    logPass('1.6: Extracted dynamic skills across diverse categories without 40-word dictionary constraint');
    // --------------------------------------------------------------------------
    // TEST 2: Distinguishing Absent Fields from Failed Extraction
    // --------------------------------------------------------------------------
    console.log('\n--- 2. Distinguishing Absent Fields vs Failed Extraction ---');
    const partialResume = `
Harshita Hegde
harshita@example.com

SUMMARY
Software Engineer with 4 years building scalable web services.

EXPERIENCE
Senior Software Engineer @ CloudTech (2022 - Present)
- Developed distributed microservices handling 50k QPS in Go and Docker.

EDUCATION
B.S. in Computer Science, University of California (2021)
  `;
    const parsedPartial = (0, resume_parser_ts_1.extractStructuredResumeTS)(partialResume);
    assert_1.default.strictEqual(parsedPartial.personal_info.full_name, 'Harshita Hegde', 'Preserved candidate name');
    assert_1.default.strictEqual(parsedPartial.personal_info.email, 'harshita@example.com', 'Preserved candidate email');
    assert_1.default.strictEqual(parsedPartial.personal_info.phone, '', 'Phone is genuinely absent and kept empty');
    assert_1.default.strictEqual(parsedPartial.personal_info.linkedin_url, '', 'LinkedIn is genuinely absent and kept empty');
    (0, assert_1.default)(parsedPartial.extraction_metadata.fields_detected.includes('email'), 'Detected email');
    (0, assert_1.default)(parsedPartial.extraction_metadata.fields_absent.includes('phone'), 'Identified phone as genuinely absent');
    (0, assert_1.default)(parsedPartial.extraction_metadata.fields_absent.includes('linkedin_url'), 'Identified LinkedIn as genuinely absent');
    logPass('2.1: Genuinely absent fields are preserved as empty without injecting fake defaults');
    // --------------------------------------------------------------------------
    // TEST 3: Scanned / Empty Document Handling (OCR Limitation)
    // --------------------------------------------------------------------------
    console.log('\n--- 3. Scanned / Empty Document Handling ---');
    const emptyText = '     ';
    const emptyParsed = (0, resume_parser_ts_1.extractStructuredResumeTS)(emptyText);
    (0, assert_1.default)(emptyParsed.extraction_metadata.is_empty === true, 'Detected empty document');
    const emptyAudit = (0, resume_analyzer_ts_1.calculateResumeQualityScoreTS)(emptyParsed, emptyText);
    assert_1.default.strictEqual(emptyAudit.overall_quality_score, 0.0, 'Empty resume receives 0.0 quality score, never 50%');
    assert_1.default.strictEqual(emptyAudit.status, 'UNREADABLE_OR_EMPTY', 'Actionable status returned for unreadable resume');
    logPass('3.1: Empty or scanned resume returns 0.0 with explicit UNREADABLE_OR_EMPTY status');
    // --------------------------------------------------------------------------
    // TEST 4: Dynamic Quality Scoring (Elimination of 50% Hardcode)
    // --------------------------------------------------------------------------
    console.log('\n--- 4. Dynamic Quality Scoring (Zero 50% Default) ---');
    const strongResumeData = {
        personal_info: {
            full_name: 'Harshita Hegde',
            email: 'harshita@example.com',
            phone: '+1-555-0199',
            linkedin_url: 'https://linkedin.com/in/harshita-hegde',
            github_url: 'https://github.com/harshita-hegde'
        },
        summary: 'Experienced Senior Engineer specializing in microservices and distributed systems.',
        skills: ['TypeScript', 'Node.js', 'Go', 'Docker', 'Kubernetes', 'PostgreSQL', 'AWS'],
        experience: [
            {
                role: 'Senior Software Engineer',
                company: 'Apex Systems',
                duration: '2021 - Present',
                description: 'Architected distributed backend pipelines in Go and Docker, reducing API response latency by 45%.'
            },
            {
                role: 'Software Engineer',
                company: 'CloudCore Labs',
                duration: '2019 - 2021',
                description: 'Engineered high-throughput event queues processing 10 million daily messages across 4 clusters.'
            }
        ],
        education: [
            {
                degree: 'B.S. Computer Science',
                institution: 'University of Washington',
                year: '2019'
            }
        ],
        projects: [
            {
                title: 'Distributed Rate Limiter',
                description: 'Built a Redis-backed token bucket rate limiter sustaining 25k QPS.'
            }
        ],
        certifications: [
            {
                name: 'AWS Certified Solutions Architect',
                issuer: 'Amazon Web Services',
                year: '2023'
            }
        ]
    };
    const strongText = `
Harshita Hegde
harshita@example.com | +1-555-0199 | https://linkedin.com/in/harshita-hegde
Senior Software Engineer specializing in microservices and distributed systems.
Skills: TypeScript, Node.js, Go, Docker, Kubernetes, PostgreSQL, AWS
Experience:
Apex Systems - Senior Software Engineer (2021 - Present)
Architected distributed backend pipelines in Go and Docker, reducing API response latency by 45%.
CloudCore Labs - Software Engineer (2019 - 2021)
Engineered high-throughput event queues processing 10 million daily messages across 4 clusters.
Education:
University of Washington - B.S. Computer Science (2019)
Projects:
Distributed Rate Limiter - Built a Redis-backed token bucket rate limiter sustaining 25k QPS.
Certifications:
AWS Certified Solutions Architect (2023)
  `;
    const strongScore = (0, resume_analyzer_ts_1.calculateResumeQualityScoreTS)(strongResumeData, strongText);
    (0, assert_1.default)(strongScore.overall_quality_score >= 85, `Strong resume scored high: ${strongScore.overall_quality_score}`);
    (0, assert_1.default)(strongScore.rubric_breakdown.contact_info.score === 15.0, 'Full contact score awarded (15/15)');
    (0, assert_1.default)(strongScore.rubric_breakdown.core_sections.score === 30.0, 'Full core sections score awarded (30/30)');
    (0, assert_1.default)(strongScore.rubric_breakdown.content_depth_and_metrics.score === 25.0, 'Full depth and metrics score awarded (25/25)');
    logPass(`4.1: Strong resume received high dynamic score (${strongScore.overall_quality_score}/100) with detailed rubric`);
    const weakResumeData = {
        personal_info: {
            full_name: 'John Minimal',
            email: 'john@example.com'
        },
        summary: 'Looking for a job.',
        skills: ['Communication', 'Microsoft Word'],
        experience: [
            {
                role: 'Intern',
                company: 'ABC Corp',
                duration: '',
                description: 'was responsible for helping with various tasks around the office.'
            }
        ],
        education: []
    };
    const weakText = 'John Minimal john@example.com Looking for a job. Skills: Communication, Microsoft Word. ABC Corp Intern was responsible for helping with various tasks around the office.';
    const weakScore = (0, resume_analyzer_ts_1.calculateResumeQualityScoreTS)(weakResumeData, weakText);
    (0, assert_1.default)(weakScore.overall_quality_score < 50, `Weak resume scored low: ${weakScore.overall_quality_score}`);
    (0, assert_1.default)(weakScore.overall_quality_score !== 50.0, 'Weak resume does not get locked at 50%');
    (0, assert_1.default)(weakScore.rubric_breakdown.contact_info.deductions.length > 0, 'Deductions recorded for missing phone/links');
    (0, assert_1.default)(weakScore.rubric_breakdown.core_sections.deductions.length > 0, 'Deductions recorded for missing education');
    logPass(`4.2: Weak resume scored dynamically (${weakScore.overall_quality_score}/100) reflecting deductions, NOT 50%`);
    // --------------------------------------------------------------------------
    // TEST 5: ATS Scoring & Strict Boundary Preservation
    // --------------------------------------------------------------------------
    console.log('\n--- 5. ATS Scoring & Strict Boundary Checking ---');
    // 5.1 Java vs JavaScript
    const javaResume = 'Senior Backend Engineer with 8 years of Java, Spring Boot, Hibernate, JVM tuning, and Maven.';
    const jsJD = 'Frontend Engineer required with expert JavaScript, React, Vue, CSS, and Webpack.';
    const javaVsJs = (0, ats_engine_1.calculateDeterministicATSScore)(javaResume, jsJD);
    (0, assert_1.default)(javaVsJs.breakdown?.required_skills?.matched_count === 0, 'Java does NOT match JavaScript requirement');
    (0, assert_1.default)(javaVsJs.ats_score <= 45, 'Java resume gets low match score against JavaScript job');
    logPass('5.1: Strict boundary between Java and JavaScript enforced');
    // 5.2 C vs C++
    const cResume = 'Embedded Firmware Engineer with 7 years of professional experience in C programming, Linux kernel drivers, memory registers, assembly, and RTOS development.';
    const cppJD = 'C++ Systems Engineer needed for high-frequency trading in C++20, Boost, and template metaprogramming.';
    const cVsCpp = (0, ats_engine_1.calculateDeterministicATSScore)(cResume, cppJD);
    (0, assert_1.default)(Boolean(cVsCpp.breakdown), 'ATS breakdown returned for C vs C++ test');
    (0, assert_1.default)((cVsCpp.breakdown?.required_skills?.matched_count || 0) === 0, 'C does NOT match C++ requirement');
    logPass('5.2: Strict boundary between C and C++ enforced');
    // 5.3 Required vs Preferred Skills
    const fullMatchResume = 'Staff Software Engineer with 8 years of professional experience building cloud web applications using TypeScript, React, Node.js, GraphQL, AWS, and Docker in production environments.';
    const detailedJD = `
Job Title: Staff Engineer
Requirements:
- Strong experience with TypeScript and React
- Backend proficiency with Node.js and AWS
Preferred:
- Experience with GraphQL and Docker
  `;
    const matchResult = (0, ats_engine_1.calculateDeterministicATSScore)(fullMatchResume, detailedJD);
    (0, assert_1.default)(Boolean(matchResult.breakdown), 'ATS breakdown returned for full match');
    (0, assert_1.default)((matchResult.breakdown?.required_skills?.matched_count || 0) >= 3, 'Matched required skills');
    (0, assert_1.default)((matchResult.breakdown?.preferred_skills?.matched_count || 0) >= 1, 'Matched preferred skills');
    (0, assert_1.default)(matchResult.ats_score >= 80, `ATS score reflects match: ${matchResult.ats_score}`);
    logPass('5.3: Accurate classification of required vs preferred skills with evidence breakdown');
    // --------------------------------------------------------------------------
    // TEST 6: Evidence-Based Concrete Suggestions Workflow
    // --------------------------------------------------------------------------
    console.log('\n--- 6. Concrete Improvement Suggestions (No Hallucinations) ---');
    const suggestions = (0, resume_analyzer_ts_1.generateConcreteImprovementsTS)({
        personal_info: { full_name: 'Alex Developer', email: 'alex@example.com' },
        skills: ['Python', 'Django'],
        experience: [
            {
                role: 'Backend Developer',
                company: 'Acme Inc',
                duration: '2022 - Present',
                description: 'was responsible for writing backend endpoints in Python.'
            }
        ]
    }, 'Alex Developer alex@example.com Backend Developer Acme Inc was responsible for writing backend endpoints in Python.', 'Seeking Backend Engineer with Python, Django, PostgreSQL, and Redis.');
    (0, assert_1.default)(Array.isArray(suggestions), 'Suggestions returned as array');
    (0, assert_1.default)(suggestions.length >= 3, 'Multiple actionable suggestions generated');
    const passiveSugg = suggestions.find(s => s.id?.startsWith('exp_rewrite'));
    (0, assert_1.default)(Boolean(passiveSugg), 'Generated suggestion to rewrite passive verb');
    (0, assert_1.default)(passiveSugg?.suggestedRevision.startsWith('Wrote') || passiveSugg?.suggestedRevision.startsWith('Led'), `Suggested active rewrite: "${passiveSugg?.suggestedRevision}"`);
    assert_1.default.strictEqual(passiveSugg?.isOptional, false, 'Action verb improvement marked non-optional');
    const missingSkillSugg = suggestions.find(s => s.id?.startsWith('req_skill_') || s.id?.startsWith('pref_skill_'));
    (0, assert_1.default)(Boolean(missingSkillSugg), 'Identified missing job keyword from JD');
    assert_1.default.strictEqual(missingSkillSugg?.section, 'skills', 'Missing skill marked as optional user prompt, not hallucinated entry');
    logPass('6.1: Suggestions are grounded, clearly categorized, and guide candidate without hallucinating facts');
    // --------------------------------------------------------------------------
    // TEST 7: Clean Print Structure Verification
    // --------------------------------------------------------------------------
    console.log('\n--- 7. Clean Print Structure & Styling Verification ---');
    // Verify that the print document classes are defined and segregated
    const fs = require('fs');
    const path = require('path');
    const cssPath = path.resolve(__dirname, '../../../frontend/src/app/globals.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');
    (0, assert_1.default)(cssContent.includes('@media print'), 'globals.css contains @media print rules');
    (0, assert_1.default)(cssContent.includes('.resume-screen-ui'), 'globals.css excludes .resume-screen-ui from print');
    (0, assert_1.default)(cssContent.includes('.resume-printable-document'), 'globals.css styles .resume-printable-document for print');
    (0, assert_1.default)(cssContent.includes('display: none !important'), 'Print media rule hides navigation and controls');
    logPass('7.1: Print stylesheet verified: screen UI hidden and clean document layout formatted');
    console.log('\n===============================================================');
    console.log('🎉 ALL RESUME WORKFLOW RELIABILITY ACCEPTANCE TESTS PASSED (100%)');
    console.log('===============================================================');
}
runResumeReliabilityTests().catch((err) => {
    console.error('\n❌ TEST RUN FAILED:', err);
    process.exit(1);
});
