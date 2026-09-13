import { Router, Response } from 'express';
import { prisma } from '../db';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { providers } from '../providers';

const router = Router();

// POST /api/outreach/generate
router.post('/generate', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { companyName, jobTitle, recruiterName, videoIntroUrl } = req.body;

    const profile = await prisma.profile.findUnique({ where: { userId } });
    const userSkills = await prisma.userSkill.findMany({ where: { userId } });
    
    const candidateName = profile?.fullName || 'Software Candidate';
    const topSkills = userSkills.map(s => s.skillName);

    // Look up or mock recruiter
    const recruiterInfo = await providers.emailFinder.findRecruiter(companyName || 'Target Company');

    // Generate personalized email content
    const emailData = await providers.ai.generateEmail(
      candidateName,
      'Full Stack Engineer',
      topSkills.length ? topSkills : ['React', 'Node.js', 'TypeScript', 'MySQL'],
      recruiterName || recruiterInfo.name,
      companyName || 'Target Company',
      jobTitle || 'Software Engineer',
      videoIntroUrl
    );

    return res.json({
      recruiter: recruiterInfo,
      email: emailData,
      provider: {
        isMockMode: providers.emailSender.isMockMode,
        isFinderDemo: providers.emailFinder.isDemoMode
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/outreach/send
router.post('/send', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { recipientEmail, subject, body, applicationId } = req.body;

    if (!recipientEmail || !subject || !body) {
      return res.status(400).json({ error: 'Recipient email, subject, and body are required' });
    }

    // Send email using provider (Mock or SMTP)
    const sendResult = await providers.emailSender.sendEmail(recipientEmail, subject, body);

    // Save outreach record
    const outreachRecord = await prisma.outreachEmail.create({
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
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
