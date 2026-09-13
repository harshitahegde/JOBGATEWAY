"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const providers_1 = require("../providers");
const router = (0, express_1.Router)();
// POST /api/outreach/generate
router.post('/generate', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { companyName, jobTitle, recruiterName, videoIntroUrl } = req.body;
        const profile = await db_1.prisma.profile.findUnique({ where: { userId } });
        const userSkills = await db_1.prisma.userSkill.findMany({ where: { userId } });
        const candidateName = profile?.fullName || 'Software Candidate';
        const topSkills = userSkills.map(s => s.skillName);
        // Look up or mock recruiter
        const recruiterInfo = await providers_1.providers.emailFinder.findRecruiter(companyName || 'Target Company');
        // Generate personalized email content
        const emailData = await providers_1.providers.ai.generateEmail(candidateName, 'Full Stack Engineer', topSkills.length ? topSkills : ['React', 'Node.js', 'TypeScript', 'MySQL'], recruiterName || recruiterInfo.name, companyName || 'Target Company', jobTitle || 'Software Engineer', videoIntroUrl);
        return res.json({
            recruiter: recruiterInfo,
            email: emailData,
            provider: {
                isMockMode: providers_1.providers.emailSender.isMockMode,
                isFinderDemo: providers_1.providers.emailFinder.isDemoMode
            }
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// POST /api/outreach/send
router.post('/send', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { recipientEmail, subject, body, applicationId } = req.body;
        if (!recipientEmail || !subject || !body) {
            return res.status(400).json({ error: 'Recipient email, subject, and body are required' });
        }
        // Send email using provider (Mock or SMTP)
        const sendResult = await providers_1.providers.emailSender.sendEmail(recipientEmail, subject, body);
        // Save outreach record
        const outreachRecord = await db_1.prisma.outreachEmail.create({
            data: {
                userId,
                applicationId: applicationId ? parseInt(applicationId) : null,
                recipientEmail,
                subject,
                body,
                status: sendResult.isMock ? 'Demo Record' : (sendResult.success ? 'Sent' : 'Failed'),
                sentAt: new Date()
            }
        });
        return res.json({
            message: sendResult.statusMessage || (sendResult.isMock ? "Demo email created successfully. No email was actually sent." : "Email sent successfully."),
            isMock: sendResult.isMock,
            outreachId: outreachRecord.id,
            status: outreachRecord.status,
            messageId: sendResult.messageId
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
exports.default = router;
