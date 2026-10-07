"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const providers_1 = require("../providers");
const application_routes_1 = require("./application.routes");
const router = (0, express_1.Router)();
// GET /api/dashboard
// Returns complete, 100% honest and factual summary of authenticated user's activity
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        // Parallel fetch of real user data scoped strictly to userId
        const [profile, resumes, resumeVersions, analyses, applications, statusHistories, outreachEmails, userSkills] = await Promise.all([
            db_1.prisma.profile.findUnique({ where: { userId } }),
            db_1.prisma.resume.findMany({
                where: { userId },
                orderBy: { updatedAt: 'desc' }
            }),
            db_1.prisma.resumeVersion.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' }
            }),
            db_1.prisma.resumeAnalysis.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' }
            }),
            db_1.prisma.application.findMany({
                where: { userId },
                orderBy: { updatedAt: 'desc' },
                include: { job: true }
            }),
            db_1.prisma.applicationStatusHistory.findMany({
                where: {
                    application: { userId }
                },
                orderBy: { changedAt: 'desc' },
                include: {
                    application: {
                        select: { id: true, companyName: true, jobTitle: true }
                    }
                },
                take: 15
            }),
            db_1.prisma.outreachEmail.findMany({
                where: { userId },
                orderBy: { updatedAt: 'desc' }
            }),
            db_1.prisma.userSkill.findMany({ where: { userId } })
        ]);
        // 1. Profile / Resume Overview
        const hasResume = resumes.length > 0;
        const latestResume = hasResume ? resumes[0] : null;
        const latestVersion = resumeVersions.length > 0 ? resumeVersions[0] : null;
        // Deterministic Profile Completeness Check based on actual filled fields
        let profileFilledCount = 0;
        const profileTotalChecks = 7;
        if (profile?.fullName && profile.fullName.trim() && profile.fullName !== 'Developer Candidate')
            profileFilledCount++;
        if (profile?.location && profile.location.trim())
            profileFilledCount++;
        if (profile?.bio && profile.bio.trim())
            profileFilledCount++;
        if (profile?.phone && profile.phone.trim())
            profileFilledCount++;
        if (profile?.linkedinUrl || profile?.githubUrl || profile?.portfolioUrl)
            profileFilledCount++;
        if (userSkills.length > 0)
            profileFilledCount++;
        if (hasResume)
            profileFilledCount++;
        const profileCompletenessPct = Math.round((profileFilledCount / profileTotalChecks) * 100);
        const profileResumeOverview = {
            hasResume,
            totalResumes: resumes.length,
            latestResumeTitle: latestResume ? latestResume.title : null,
            latestResumeOriginalFilename: latestResume ? latestResume.originalFilename : null,
            latestResumeUpdatedAt: latestResume ? latestResume.updatedAt : null,
            latestVersionName: latestVersion ? latestVersion.versionName : null,
            profileName: profile?.fullName || null,
            profileCompletenessPercentage: profileCompletenessPct,
            userSkillsCount: userSkills.length
        };
        // 2. Application Overview (100% synced with Application Tracker canonical statuses)
        const applicationSummary = {
            total: applications.length,
            saved: 0,
            applied: 0,
            assessment: 0,
            interview: 0,
            offer: 0,
            rejected: 0,
            withdrawn: 0
        };
        applications.forEach(app => {
            const norm = (0, application_routes_1.normalizeStatus)(app.status);
            if (norm === 'SAVED')
                applicationSummary.saved++;
            else if (norm === 'APPLIED')
                applicationSummary.applied++;
            else if (norm === 'ASSESSMENT')
                applicationSummary.assessment++;
            else if (norm === 'INTERVIEW')
                applicationSummary.interview++;
            else if (norm === 'OFFER')
                applicationSummary.offer++;
            else if (norm === 'REJECTED')
                applicationSummary.rejected++;
            else if (norm === 'WITHDRAWN')
                applicationSummary.withdrawn++;
            else
                applicationSummary.saved++;
        });
        // 3. ATS Overview (Strictly real database records; NO fake score if count is 0)
        const atsOverview = {
            totalAnalyses: analyses.length,
            latestScore: analyses.length > 0 ? analyses[0].atsScore : null,
            avgScore: analyses.length > 0
                ? Math.round(analyses.reduce((acc, curr) => acc + curr.atsScore, 0) / analyses.length)
                : null,
            recentAnalyses: analyses.slice(0, 3).map(a => ({
                id: a.id,
                atsScore: a.atsScore,
                jobTitle: a.jobTitle,
                company: a.company,
                createdAt: a.createdAt
            }))
        };
        // 4. Outreach Overview (Strictly honest; only count provider confirmed sends as SENT)
        const outreachSummary = {
            total: outreachEmails.length,
            draft: 0,
            readyToSend: 0,
            sending: 0,
            sent: 0,
            failed: 0,
            isProviderConfigured: providers_1.providers.emailSender.isConfigured(),
            providerType: providers_1.providers.emailSender.providerType
        };
        outreachEmails.forEach(mail => {
            const st = (mail.status || '').toUpperCase();
            if (st === 'SENT')
                outreachSummary.sent++;
            else if (st === 'READY_TO_SEND')
                outreachSummary.readyToSend++;
            else if (st === 'SENDING')
                outreachSummary.sending++;
            else if (st === 'FAILED')
                outreachSummary.failed++;
            else
                outreachSummary.draft++;
        });
        // 5. Recent Activity Timeline (Synthesized strictly from actual stored events)
        const activities = [];
        // Add resume uploads
        resumes.forEach(r => {
            activities.push({
                id: `resume-${r.id}`,
                type: 'RESUME_UPLOAD',
                title: `Resume Uploaded`,
                description: `Uploaded "${r.originalFilename}" (${r.title})`,
                timestamp: r.createdAt
            });
        });
        // Add ATS analyses
        analyses.forEach(a => {
            activities.push({
                id: `ats-${a.id}`,
                type: 'ATS_ANALYSIS',
                title: `ATS Match Analyzed`,
                description: `Analyzed match for ${a.jobTitle} at ${a.company} (Score: ${a.atsScore}%)`,
                timestamp: a.createdAt,
                meta: { atsScore: a.atsScore }
            });
        });
        // Add application status changes
        statusHistories.forEach(sh => {
            if (sh.previousStatus) {
                activities.push({
                    id: `app-hist-${sh.id}`,
                    type: 'APPLICATION_STATUS_CHANGE',
                    title: `Application Status: ${sh.newStatus}`,
                    description: `${sh.application.jobTitle} @ ${sh.application.companyName} transitioned from ${sh.previousStatus} to ${sh.newStatus}`,
                    timestamp: sh.changedAt
                });
            }
            else {
                activities.push({
                    id: `app-create-${sh.id}`,
                    type: 'APPLICATION_CREATED',
                    title: `Application Tracked`,
                    description: `Tracked application for ${sh.application.jobTitle} at ${sh.application.companyName}`,
                    timestamp: sh.changedAt
                });
            }
        });
        // Add outreach events
        outreachEmails.forEach(o => {
            const st = (o.status || '').toUpperCase();
            if (st === 'SENT') {
                activities.push({
                    id: `outreach-${o.id}`,
                    type: 'OUTREACH_SENT',
                    title: `Outreach Sent`,
                    description: `Dispatched email to ${o.recipientEmail} (${o.companyName || 'Target Company'})`,
                    timestamp: o.sentAt || o.updatedAt
                });
            }
            else if (st === 'FAILED') {
                activities.push({
                    id: `outreach-${o.id}`,
                    type: 'OUTREACH_FAILED',
                    title: `Outreach Delivery Failed`,
                    description: `Failed to dispatch to ${o.recipientEmail}: ${o.failureReason || 'Provider rejected request'}`,
                    timestamp: o.updatedAt
                });
            }
            else {
                activities.push({
                    id: `outreach-${o.id}`,
                    type: 'OUTREACH_DRAFT',
                    title: `Outreach Draft Saved`,
                    description: `Saved ${o.type.replace(/_/g, ' ')} draft for ${o.recipientEmail}`,
                    timestamp: o.updatedAt
                });
            }
        });
        // Sort all genuine activities chronologically descending
        activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        return res.json({
            profileResumeOverview,
            applicationSummary,
            atsOverview,
            outreachSummary,
            recentApplications: applications.slice(0, 5),
            recentActivity: activities.slice(0, 10)
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
exports.default = router;
