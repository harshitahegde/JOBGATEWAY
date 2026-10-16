"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.providers = exports.RealOrMockAIProvider = exports.UnconfiguredEmailFinderProvider = exports.UnconfiguredJobProvider = void 0;
const form_data_1 = __importDefault(require("form-data"));
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importDefault(require("fs"));
const USE_MOCK_SERVICES = process.env.USE_MOCK_SERVICES !== 'false';
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const SMTP_HOST = process.env.SMTP_HOST;
class UnconfiguredJobProvider {
    constructor() {
        this.isConfigured = false;
    }
    async searchJobs(query, location) {
        // Honest unconfigured state: Live Job Search API is not connected yet
        return [];
    }
}
exports.UnconfiguredJobProvider = UnconfiguredJobProvider;
class UnconfiguredEmailFinderProvider {
    constructor() {
        this.isConfigured = false;
    }
    async findRecruiter(companyName) {
        return null;
    }
}
exports.UnconfiguredEmailFinderProvider = UnconfiguredEmailFinderProvider;
// 3. Email Provider Abstraction (Real SMTP or Honest Draft Mode)
const email_provider_1 = require("./email_provider");
// 4. AI Provider (FastAPI Bridge)
const ats_engine_1 = require("../ats_engine");
const resume_analyzer_ts_1 = require("../resume_analyzer_ts");
const outreach_generator_1 = require("../outreach_generator");
const resume_parser_ts_1 = require("../resume_parser_ts");
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
            if (err.response && (err.response.status === 400 || err.response.status === 422)) {
                return {
                    error: 'NO_EXTRACTABLE_TEXT',
                    message: err.response.data?.detail || 'This document appears to be a scanned image or contains no selectable text. JobGateway currently requires text-based PDF or DOCX files (optical character recognition / OCR for scanned images is not yet supported). Please upload a text-selectable PDF or DOCX version, or paste your resume text.'
                };
            }
            console.warn('[AI PROVIDER] FastAPI /parse-resume offline or network error, executing local TypeScript parser:', err.message);
            return (0, resume_parser_ts_1.parseResumeFileTS)(filePath);
        }
    }
    async calculateATSScore(resumeText, jobDescription, parsedResume) {
        try {
            const response = await axios_1.default.post(`${AI_SERVICE_URL}/ats-score`, {
                resume_text: resumeText,
                job_description: jobDescription,
                parsed_resume: parsedResume
            }, { timeout: 5000 });
            return response.data;
        }
        catch (err) {
            console.warn('[AI PROVIDER] FastAPI offline or error. Using deterministic TS calculation fallback.');
            return (0, ats_engine_1.calculateDeterministicATSScore)(resumeText, jobDescription, parsedResume);
        }
    }
    async analyzeResume(resumeData, rawText, targetJobDescription) {
        try {
            const response = await axios_1.default.post(`${AI_SERVICE_URL}/analyze-resume`, {
                resume_data: resumeData,
                raw_text: rawText || "",
                target_job_description: targetJobDescription || ""
            }, { timeout: 5000 });
            return response.data;
        }
        catch (err) {
            console.warn('[AI PROVIDER] FastAPI /analyze-resume offline or error. Using TS calculation fallback.');
            return (0, resume_analyzer_ts_1.analyzeResumeContentTS)(resumeData, rawText, targetJobDescription);
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
            return (0, resume_analyzer_ts_1.optimizeResumeContentTS)(resumeData, targetJobDescription, targetJobTitle);
        }
    }
    async generateEmail(input) {
        try {
            const verifiedEducation = input.resumeFacts?.education && input.resumeFacts.education.length > 0
                ? (input.resumeFacts.education[0].degree || input.resumeFacts.education[0].institution || "")
                : "";
            const verifiedExperience = input.resumeFacts?.experience && input.resumeFacts.experience.length > 0
                ? (input.resumeFacts.experience[0].title || "")
                : "";
            const verifiedProject = input.resumeFacts?.projects && input.resumeFacts.projects.length > 0
                ? (input.resumeFacts.projects[0].name || "")
                : "";
            const response = await axios_1.default.post(`${AI_SERVICE_URL}/generate-email`, {
                candidate_name: input.candidateName,
                top_skills: input.resumeFacts?.skills || [],
                recruiter_name: input.recruiterName || "",
                recruiter_email: input.recruiterEmail || "",
                company_name: input.companyName || "",
                job_title: input.jobTitle || "",
                outreach_type: input.type || "recruiter_outreach",
                tone: input.tone || "professional",
                job_description: input.jobDescription || "",
                video_intro_url: input.videoIntroUrl || "",
                primary_education: verifiedEducation,
                primary_experience: verifiedExperience,
                primary_project: verifiedProject
            }, { timeout: 5000 });
            const res = response.data;
            return {
                type: res.type || input.type || 'recruiter_outreach',
                tone: res.tone || input.tone || 'professional',
                recipientName: res.recipient_name || input.recruiterName || '',
                recipientEmail: res.recipient_email || input.recruiterEmail || '',
                companyName: res.company_name || input.companyName || '',
                jobTitle: res.job_title || input.jobTitle || '',
                subject: res.subject,
                body: res.body,
                groundedSkills: res.grounded_skills || [],
                status: 'DRAFT',
                hasVideoIntro: Boolean(res.has_video_intro),
                factsTraceable: {
                    skillsUsed: res.grounded_skills || [],
                    educationUsed: verifiedEducation ? [verifiedEducation] : [],
                    experienceUsed: verifiedExperience ? [verifiedExperience] : [],
                    projectsUsed: verifiedProject ? [verifiedProject] : []
                }
            };
        }
        catch (err) {
            // Deterministic TypeScript fact-grounded generator fallback
            return (0, outreach_generator_1.generateFactGroundedOutreach)(input);
        }
    }
}
exports.RealOrMockAIProvider = RealOrMockAIProvider;
// 5. Provider Export Registry
exports.providers = {
    job: new UnconfiguredJobProvider(),
    emailFinder: new UnconfiguredEmailFinderProvider(),
    emailSender: (0, email_provider_1.createEmailProvider)(),
    ai: new RealOrMockAIProvider()
};
