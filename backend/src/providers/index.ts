import FormData from 'form-data';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

const USE_MOCK_SERVICES = process.env.USE_MOCK_SERVICES !== 'false';
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const SMTP_HOST = process.env.SMTP_HOST;

// 1. Job Provider Interface & Implementation
export interface JobProvider {
  isConfigured: boolean;
  searchJobs(query: string, location?: string): Promise<any[]>;
}

export class UnconfiguredJobProvider implements JobProvider {
  isConfigured = false;
  async searchJobs(query: string, location?: string): Promise<any[]> {
    // Honest unconfigured state: Live Job Search API is not connected yet
    return [];
  }
}

// 2. Email Finder Provider
export interface EmailFinderProvider {
  isConfigured: boolean;
  findRecruiter(companyName: string): Promise<any>;
}

export class UnconfiguredEmailFinderProvider implements EmailFinderProvider {
  isConfigured = false;
  async findRecruiter(companyName: string): Promise<any> {
    return null;
  }
}

// 3. Email Provider Abstraction (Real SMTP or Honest Draft Mode)
import { EmailProvider, createEmailProvider } from './email_provider';
export { EmailProvider, EmailSendResult } from './email_provider';

// 4. AI Provider (FastAPI Bridge)
import { calculateDeterministicATSScore } from '../ats_engine';
import { analyzeResumeContentTS, optimizeResumeContentTS } from '../resume_analyzer_ts';
import { generateFactGroundedOutreach, OutreachGenerateInput, OutreachGenerateResult } from '../outreach_generator';

export interface AIProvider {
  parseResume(filePath: string): Promise<any>;
  calculateATSScore(resumeText: string, jobDescription: string, parsedResume?: any): Promise<any>;
  analyzeResume(resumeData: any, rawText?: string, targetJobDescription?: string): Promise<any>;
  optimizeResume(resumeData: any, targetJobDescription: string, targetJobTitle: string): Promise<any>;
  generateEmail(input: OutreachGenerateInput): Promise<OutreachGenerateResult>;
}

export class RealOrMockAIProvider implements AIProvider {
  async parseResume(filePath: string): Promise<any> {
    try {
      const form = new FormData();
      form.append('file', fs.createReadStream(filePath));
      const response = await axios.post(`${AI_SERVICE_URL}/parse-resume`, form, {
        headers: form.getHeaders(),
        timeout: 10000
      });
      return response.data;
    } catch (err: any) {
      console.warn('[AI PROVIDER] FastAPI /parse-resume failed, using basic text fallback:', err.message);
      return {
        filename: path.basename(filePath),
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

  async calculateATSScore(resumeText: string, jobDescription: string, parsedResume?: any): Promise<any> {
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/ats-score`, {
        resume_text: resumeText,
        job_description: jobDescription,
        parsed_resume: parsedResume
      }, { timeout: 5000 });
      return response.data;
    } catch (err: any) {
      console.warn('[AI PROVIDER] FastAPI offline or error. Using deterministic TS calculation fallback.');
      return calculateDeterministicATSScore(resumeText, jobDescription, parsedResume);
    }
  }

  async analyzeResume(resumeData: any, rawText?: string, targetJobDescription?: string): Promise<any> {
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/analyze-resume`, {
        resume_data: resumeData,
        raw_text: rawText || "",
        target_job_description: targetJobDescription || ""
      }, { timeout: 5000 });
      return response.data;
    } catch (err: any) {
      console.warn('[AI PROVIDER] FastAPI /analyze-resume offline or error. Using TS calculation fallback.');
      return analyzeResumeContentTS(resumeData, rawText, targetJobDescription);
    }
  }

  async optimizeResume(resumeData: any, targetJobDescription: string, targetJobTitle: string): Promise<any> {
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/optimize-resume`, {
        resume_data: resumeData,
        target_job_description: targetJobDescription,
        target_job_title: targetJobTitle
      }, { timeout: 5000 });
      return response.data;
    } catch (err) {
      console.warn('[AI PROVIDER] FastAPI offline. Local JS optimization fallback.');
      return optimizeResumeContentTS(resumeData, targetJobDescription, targetJobTitle);
    }
  }

  async generateEmail(input: OutreachGenerateInput): Promise<OutreachGenerateResult> {
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

      const response = await axios.post(`${AI_SERVICE_URL}/generate-email`, {
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
    } catch (err) {
      // Deterministic TypeScript fact-grounded generator fallback
      return generateFactGroundedOutreach(input);
    }
  }
}

// 5. Provider Export Registry
export const providers = {
  job: new UnconfiguredJobProvider(),
  emailFinder: new UnconfiguredEmailFinderProvider(),
  emailSender: createEmailProvider(),
  ai: new RealOrMockAIProvider()
};
