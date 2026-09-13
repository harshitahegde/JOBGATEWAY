"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.providers = exports.RealOrMockAIProvider = exports.MockEmailSenderProvider = exports.MockEmailFinderProvider = exports.MockJobProvider = void 0;
const form_data_1 = __importDefault(require("form-data"));
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const USE_MOCK_SERVICES = process.env.USE_MOCK_SERVICES !== 'false';
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const SMTP_HOST = process.env.SMTP_HOST;
class MockJobProvider {
    constructor() {
        this.isDemoMode = true;
    }
    async searchJobs(query, location) {
        return [
            {
                id: 1,
                title: "Full Stack Developer (Node.js & React)",
                company: "TechCorp Solutions",
                location: location || "San Francisco, CA (Remote)",
                type: "Full-Time",
                experienceLevel: "Mid-Level",
                salaryRange: "$110,000 - $135,000",
                description: "Looking for a passionate Full Stack Developer to build modern web applications using React, Node.js, TypeScript, and MySQL.",
                requirements: ["React", "Node.js", "TypeScript", "MySQL", "REST API", "Git"],
                applicationUrl: "https://careers.techcorp.com/jobs/full-stack-dev",
                source: "Demo Mode Sample Listing",
                isDemo: true
            },
            {
                id: 2,
                title: "Frontend Engineer (React / Next.js)",
                company: "Innovate AI",
                location: location || "New York, NY (Hybrid)",
                type: "Full-Time",
                experienceLevel: "Entry-Level",
                salaryRange: "$85,000 - $105,000",
                description: "Join our dynamic frontend team building modern AI-driven user interfaces with Next.js, Tailwind CSS, and REST APIs.",
                requirements: ["JavaScript", "TypeScript", "React", "Next.js", "Tailwind CSS"],
                applicationUrl: "https://innovate.ai/careers/frontend-eng",
                source: "Demo Mode Sample Listing",
                isDemo: true
            },
            {
                id: 3,
                title: "Backend Software Engineer (Node.js & Python)",
                company: "DataPulse Inc.",
                location: location || "Austin, TX (Remote)",
                type: "Full-Time",
                experienceLevel: "Senior",
                salaryRange: "$140,000 - $170,000",
                description: "Architect scalable microservices, manage databases, and build AI service integrations with Python and FastAPI.",
                requirements: ["Node.js", "Python", "FastAPI", "Express.js", "MySQL", "Docker"],
                applicationUrl: "https://datapulse.io/jobs/backend-engineer",
                source: "Demo Mode Sample Listing",
                isDemo: true
            }
        ];
    }
}
exports.MockJobProvider = MockJobProvider;
class MockEmailFinderProvider {
    constructor() {
        this.isDemoMode = true;
    }
    async findRecruiter(companyName) {
        return {
            companyName,
            name: "Sarah Jenkins",
            title: "Senior Technical Recruiter",
            email: `recruiter@${companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
            linkedinUrl: "https://linkedin.com/in/recruiter-demo",
            verified: false,
            isDemo: true
        };
    }
}
exports.MockEmailFinderProvider = MockEmailFinderProvider;
class MockEmailSenderProvider {
    constructor() {
        this.isMockMode = true;
    }
    async sendEmail(to, subject, body) {
        console.log(`[MOCK EMAIL SENDER] Demo outreach recorded for: ${to} | Subject: ${subject}`);
        return {
            success: true,
            isMock: true,
            messageId: `demo_record_${Date.now()}`,
            statusMessage: "Demo email created successfully. No email was actually sent."
        };
    }
}
exports.MockEmailSenderProvider = MockEmailSenderProvider;
class RealOrMockAIProvider {
    async parseResume(filePath) {
        try {
            const form = new form_data_1.default();
            form.append('file', fs_1.default.createReadStream(filePath));
            const response = await axios_1.default.post(`${AI_SERVICE_URL}/parse-resume`, form, {
                headers: form.getHeaders(),
                timeout: 10000
            });
            return response.data;
        }
        catch (err) {
            console.warn('[AI PROVIDER] FastAPI /parse-resume failed, using basic text fallback:', err.message);
            return {
                filename: path_1.default.basename(filePath),
                raw_text: "",
                parsed_data: {
                    personal_info: { full_name: "Candidate", email: "", phone: "", location: "", linkedin_url: "", github_url: "" },
                    summary: "",
                    skills: [],
                    education: [],
                    experience: [],
                    projects: [],
                    certifications: [],
                    achievements: [],
                    raw_text: ""
                }
            };
        }
    }
    async calculateATSScore(resumeText, jobDescription) {
        try {
            const response = await axios_1.default.post(`${AI_SERVICE_URL}/ats-score`, {
                resume_text: resumeText,
                job_description: jobDescription
            }, { timeout: 5000 });
            return response.data;
        }
        catch (err) {
            console.warn('[AI PROVIDER] FastAPI offline. Local ATS computation fallback.');
            const resumeLower = (resumeText || "").toLowerCase();
            const jobLower = (jobDescription || "").toLowerCase();
            const skills = ["JavaScript", "TypeScript", "React", "Node.js", "Express", "Python", "SQL", "MySQL", "Docker", "AWS", "Git", "REST API", "Tailwind CSS"];
            const matched = skills.filter(s => resumeLower.includes(s.toLowerCase()) && jobLower.includes(s.toLowerCase()));
            const missing = skills.filter(s => !resumeLower.includes(s.toLowerCase()) && jobLower.includes(s.toLowerCase()));
            const score = Math.round((matched.length / Math.max(1, matched.length + missing.length)) * 100);
            return {
                ats_score: score,
                matched_keywords: matched,
                missing_keywords: missing,
                suggestions: [
                    "Only add missing skills if you possess hands-on project experience with them.",
                    "Ensure your professional summary highlights your primary tech stack clearly."
                ]
            };
        }
    }
    async optimizeResume(resumeData, targetJobDescription, targetJobTitle) {
        try {
            const response = await axios_1.default.post(`${AI_SERVICE_URL}/optimize-resume`, {
                resume_data: resumeData,
                target_job_description: targetJobDescription,
                target_job_title: targetJobTitle
            }, { timeout: 5000 });
            return response.data;
        }
        catch (err) {
            console.warn('[AI PROVIDER] FastAPI offline. Local JS optimization fallback.');
            return {
                original_content: resumeData,
                optimized_content: {
                    ...resumeData,
                    target_job_title: targetJobTitle,
                    summary: `Targeted ${targetJobTitle} professional. ${resumeData.summary || ''}`
                },
                matched_skills: resumeData.skills || [],
                missing_keywords: [],
                optimization_notes: [
                    "Optimized summary for keyword alignment.",
                    "Preserved actual candidate facts."
                ]
            };
        }
    }
    async generateEmail(candidateName, candidateTitle, topSkills, recruiterName, companyName, jobTitle, videoUrl) {
        try {
            const response = await axios_1.default.post(`${AI_SERVICE_URL}/generate-email`, {
                candidate_name: candidateName,
                candidate_title: candidateTitle,
                top_skills: topSkills,
                recruiter_name: recruiterName,
                company_name: companyName,
                job_title: jobTitle,
                video_intro_url: videoUrl
            }, { timeout: 5000 });
            return response.data;
        }
        catch (err) {
            return {
                recipient_name: recruiterName || "Hiring Manager",
                company_name: companyName,
                job_title: jobTitle,
                subject: `Application / Expression of Interest: ${jobTitle} - ${candidateName}`,
                body: `Dear ${recruiterName || 'Hiring Manager'},\n\nI hope this email finds you well. I am writing to express my interest in the ${jobTitle} position at ${companyName}.\n\nAs a ${candidateTitle || 'Software Professional'} with experience in ${topSkills.join(', ') || 'software development'}, I am sharing my resume for your review.${videoUrl ? `\n\nYou can also watch my short video self-introduction here: ${videoUrl}` : ''}\n\nBest regards,\n${candidateName}`,
                attachments: ["resume.pdf"],
                has_video_link: Boolean(videoUrl)
            };
        }
    }
}
exports.RealOrMockAIProvider = RealOrMockAIProvider;
// 5. Provider Export Registry
exports.providers = {
    job: new MockJobProvider(),
    emailFinder: new MockEmailFinderProvider(),
    emailSender: new MockEmailSenderProvider(),
    ai: new RealOrMockAIProvider()
};
