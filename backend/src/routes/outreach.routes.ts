import { Router, Response } from 'express';
import { prisma } from '../db';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { providers } from '../providers';
import { generateFactGroundedOutreach } from '../outreach_generator';

const router = Router();

// GET /api/outreach/provider-status
// Returns active provider capabilities honestly (Draft-only vs configured SMTP)
router.get('/provider-status', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const config = providers.emailSender.getConfigurationStatus();
    return res.json({
      providerType: providers.emailSender.providerType,
      isConfigured: providers.emailSender.isConfigured(),
      details: config
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/outreach/generate
// Generates fact-grounded draft based on verified resume facts and job information
router.post('/generate', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const {
      resumeId,
      applicationId,
      companyName,
      jobTitle,
      jobDescription,
      recruiterName,
      recruiterEmail,
      type,
      tone,
      videoIntroUrl,
      referralContactName
    } = req.body;

    // 1. Fetch user profile and skills
    const profile = await prisma.profile.findUnique({ where: { userId } });
    const userSkills = await prisma.userSkill.findMany({ where: { userId } });

    // 2. Fetch selected or primary resume to extract verified facts
    let resumeRecord = null;
    if (resumeId) {
      resumeRecord = await prisma.resume.findFirst({
        where: { id: parseInt(resumeId, 10), userId }
      });
    }
    if (!resumeRecord) {
      resumeRecord = await prisma.resume.findFirst({
        where: { userId, isPrimary: true }
      }) || await prisma.resume.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });
    }

    let parsedResumeData: any = null;
    if (resumeRecord && resumeRecord.parsedContent) {
      try {
        parsedResumeData = JSON.parse(resumeRecord.parsedContent);
      } catch (e) {
        console.warn('[OUTREACH GENERATE] Error parsing resume json:', e);
      }
    }

    // Combine verifiable facts strictly from user's actual stored data
    const skillsList = parsedResumeData?.skills && parsedResumeData.skills.length > 0
      ? parsedResumeData.skills
      : userSkills.map(s => s.skillName);

function safeJsonParse<T>(val: any, fallback: T): T {
  if (!val) return fallback;
  if (typeof val !== 'string') return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

    const resumeFacts = {
      fullName: parsedResumeData?.personal_info?.full_name || profile?.fullName || undefined,
      headline: profile?.bio || undefined,
      summary: parsedResumeData?.summary || profile?.bio || undefined,
      skills: skillsList,
      education: parsedResumeData?.education || safeJsonParse(profile?.education, []),
      experience: parsedResumeData?.experience || safeJsonParse(profile?.experience, []),
      projects: parsedResumeData?.projects || safeJsonParse(profile?.projects, []),
      rawText: parsedResumeData?.raw_text || ""
    };

    // 3. If application provided, use its job information if not specified
    let targetCompany = companyName;
    let targetTitle = jobTitle;
    let targetJD = jobDescription;

    if (applicationId) {
      const app = await prisma.application.findFirst({
        where: { id: parseInt(applicationId, 10), userId },
        include: { job: true }
      });
      if (app) {
        targetCompany = targetCompany || app.companyName;
        targetTitle = targetTitle || app.jobTitle;
        if (app.job?.description) {
          targetJD = targetJD || app.job.description;
        }
      }
    }

    // 4. Generate fact-grounded message
    const generated = await providers.ai.generateEmail({
      type,
      tone,
      candidateName: resumeFacts.fullName || profile?.fullName || 'Candidate',
      recruiterName: recruiterName || '',
      recruiterEmail: recruiterEmail || '',
      companyName: targetCompany || '',
      jobTitle: targetTitle || '',
      jobDescription: targetJD || '',
      videoIntroUrl: videoIntroUrl || '',
      referralContactName: referralContactName || '',
      resumeFacts
    });

    return res.json({
      outreach: generated,
      provider: {
        isConfigured: providers.emailSender.isConfigured(),
        providerType: providers.emailSender.providerType,
        status: providers.emailSender.getConfigurationStatus()
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/outreach/save-draft
// Saves a message as DRAFT or READY_TO_SEND
router.post('/save-draft', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const {
      applicationId,
      recruiterId,
      recipientEmail,
      recipientName,
      companyName,
      jobTitle,
      subject,
      body,
      type,
      status
    } = req.body;

    if (!recipientEmail || !recipientEmail.trim()) {
      return res.status(400).json({ error: 'Recipient email is required to save an outreach record.' });
    }
    if (!subject || !subject.trim()) {
      return res.status(400).json({ error: 'Subject is required.' });
    }
    if (!body || !body.trim()) {
      return res.status(400).json({ error: 'Body is required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail.trim())) {
      return res.status(400).json({ error: 'Invalid recipient email format.' });
    }

    let parsedAppId: number | null = null;
    if (applicationId) {
      const aId = parseInt(applicationId, 10);
      const ownedApp = await prisma.application.findFirst({
        where: { id: aId, userId }
      });
      if (!ownedApp) {
        return res.status(400).json({ error: 'Referenced application not found or does not belong to you.' });
      }
      parsedAppId = aId;
    }

    const allowedStatuses = ['DRAFT', 'READY_TO_SEND'];
    const recordStatus = allowedStatuses.includes(status) ? status : 'DRAFT';

    const outreach = await prisma.outreachEmail.create({
      data: {
        userId,
        applicationId: parsedAppId,
        recruiterId: recruiterId ? parseInt(recruiterId, 10) : null,
        type: type || 'recruiter_outreach',
        recipientEmail: recipientEmail.trim(),
        recipientName: recipientName?.trim() || null,
        companyName: companyName?.trim() || null,
        jobTitle: jobTitle?.trim() || null,
        subject: subject.trim(),
        body: body.trim(),
        status: recordStatus
      }
    });

    return res.status(201).json({
      message: 'Draft saved successfully.',
      outreach
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/outreach/:id
// Update an existing outreach draft (user editing)
router.put('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const id = parseInt(req.params.id, 10);
    const { recipientEmail, recipientName, companyName, jobTitle, subject, body, status, type } = req.body;

    const existing = await prisma.outreachEmail.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Outreach draft not found or unauthorized.' });
    }

    // If an email has already been confirmed SENT, disallow direct content mutation
    if (existing.status === 'SENT') {
      return res.status(400).json({ error: 'Cannot modify an outreach message that has already been dispatched and verified as SENT.' });
    }

    if (recipientEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(recipientEmail.trim())) {
        return res.status(400).json({ error: 'Invalid recipient email format.' });
      }
    }

    const updated = await prisma.outreachEmail.update({
      where: { id },
      data: {
        recipientEmail: recipientEmail !== undefined ? recipientEmail.trim() : undefined,
        recipientName: recipientName !== undefined ? recipientName.trim() : undefined,
        companyName: companyName !== undefined ? companyName.trim() : undefined,
        jobTitle: jobTitle !== undefined ? jobTitle.trim() : undefined,
        subject: subject !== undefined ? subject.trim() : undefined,
        body: body !== undefined ? body.trim() : undefined,
        type: type !== undefined ? type : undefined,
        status: status && ['DRAFT', 'READY_TO_SEND'].includes(status) ? status : undefined
      }
    });

    return res.json({
      message: 'Outreach draft updated successfully.',
      outreach: updated
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/outreach
// List user's outreach records (with ownership check)
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const records = await prisma.outreachEmail.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        application: true,
        recruiter: true
      }
    });

    return res.json({
      outreachRecords: records
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/outreach/:id
// Get a specific outreach draft/record (with user ownership check)
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const id = parseInt(req.params.id, 10);

    const record = await prisma.outreachEmail.findFirst({
      where: { id, userId },
      include: {
        application: true,
        recruiter: true
      }
    });

    if (!record) {
      return res.status(404).json({ error: 'Outreach record not found or unauthorized.' });
    }

    return res.json({ outreach: record });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/outreach/send
// Attempt sending via real configured provider.
// NEVER claims "SENT" unless the real provider confirms successful dispatch.
router.post('/send', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id, recipientEmail, recipientName, companyName, jobTitle, subject, body, applicationId } = req.body;

    if (!recipientEmail || !subject || !body) {
      return res.status(400).json({ error: 'Recipient email, subject, and body are required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail.trim())) {
      return res.status(400).json({ error: 'Invalid recipient email format.' });
    }

    // 1. Locate or create draft record
    let outreachRecord = null;
    if (id) {
      outreachRecord = await prisma.outreachEmail.findFirst({
        where: { id: parseInt(id, 10), userId }
      });
      if (!outreachRecord) {
        return res.status(404).json({ error: 'Outreach record not found or unauthorized.' });
      }
    } else {
      let parsedAppId: number | null = null;
      if (applicationId) {
        const aId = parseInt(applicationId, 10);
        const ownedApp = await prisma.application.findFirst({
          where: { id: aId, userId }
        });
        if (!ownedApp) {
          return res.status(400).json({ error: 'Referenced application not found or does not belong to you.' });
        }
        parsedAppId = aId;
      }

      outreachRecord = await prisma.outreachEmail.create({
        data: {
          userId,
          applicationId: parsedAppId,
          recipientEmail: recipientEmail.trim(),
          recipientName: recipientName?.trim() || null,
          companyName: companyName?.trim() || null,
          jobTitle: jobTitle?.trim() || null,
          subject: subject.trim(),
          body: body.trim(),
          status: 'READY_TO_SEND'
        }
      });
    }

    // 2. Mark state transition: READY_TO_SEND -> SENDING
    await prisma.outreachEmail.update({
      where: { id: outreachRecord.id },
      data: {
        recipientEmail: recipientEmail.trim(),
        subject: subject.trim(),
        body: body.trim(),
        status: 'SENDING'
      }
    });

    // 3. Check if real email sending provider is configured
    if (!providers.emailSender.isConfigured()) {
      // Real provider not configured -> transition to FAILED or READY_TO_SEND
      // Crucial: NEVER CLAIM SENT!
      const failureReason = 'Email sending is not configured. JobGateway operates in Draft-Only Mode and will not claim an email was sent.';
      
      const failedRecord = await prisma.outreachEmail.update({
        where: { id: outreachRecord.id },
        data: {
          status: 'FAILED',
          failureReason
        }
      });

      return res.status(400).json({
        success: false,
        status: 'FAILED',
        error: failureReason,
        outreach: failedRecord,
        providerConfigured: false
      });
    }

    // 4. Call real configured provider
    const sendResult = await providers.emailSender.sendEmail(recipientEmail.trim(), subject.trim(), body.trim());

    if (sendResult.success && sendResult.status === 'SENT') {
      const sentRecord = await prisma.outreachEmail.update({
        where: { id: outreachRecord.id },
        data: {
          status: 'SENT',
          sentAt: sendResult.sentAt || new Date(),
          providerMessageId: sendResult.providerMessageId || null,
          failureReason: null
        }
      });

      return res.json({
        success: true,
        status: 'SENT',
        message: 'Email successfully sent via configured provider.',
        providerMessageId: sendResult.providerMessageId,
        outreach: sentRecord
      });
    } else {
      const failedRecord = await prisma.outreachEmail.update({
        where: { id: outreachRecord.id },
        data: {
          status: 'FAILED',
          failureReason: sendResult.failureReason || 'Provider rejected email transmission'
        }
      });

      return res.status(502).json({
        success: false,
        status: 'FAILED',
        error: sendResult.failureReason || 'Failed to dispatch email via provider',
        outreach: failedRecord
      });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/outreach/:id
// Delete outreach draft
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const id = parseInt(req.params.id, 10);

    const existing = await prisma.outreachEmail.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Outreach draft not found or unauthorized.' });
    }

    await prisma.outreachEmail.delete({ where: { id } });

    return res.json({ message: 'Outreach record deleted successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
