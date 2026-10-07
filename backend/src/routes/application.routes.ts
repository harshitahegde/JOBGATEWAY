import { Router, Response } from 'express';
import { prisma } from '../db';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

export const VALID_APPLICATION_STATUSES = [
  'SAVED',
  'APPLIED',
  'ASSESSMENT',
  'INTERVIEW',
  'OFFER',
  'REJECTED',
  'WITHDRAWN'
] as const;

export type ApplicationStatus = typeof VALID_APPLICATION_STATUSES[number];

/**
 * Normalizes status strings (e.g. "applied", "Interview", "SAVED") to canonical uppercase.
 */
export function normalizeStatus(statusRaw?: string): ApplicationStatus | null {
  if (!statusRaw || typeof statusRaw !== 'string') return null;
  const upper = statusRaw.trim().toUpperCase();

  // Backward compatibility mapping for old legacy records:
  if (upper === 'SELECTED') return 'OFFER';

  if (VALID_APPLICATION_STATUSES.includes(upper as ApplicationStatus)) {
    return upper as ApplicationStatus;
  }
  return null;
}

// GET /api/applications
// List all applications for the authenticated user, plus real database summary stats
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { status, search } = req.query;

    const whereClause: any = { userId };

    if (status && typeof status === 'string' && status !== 'ALL') {
      const canonical = normalizeStatus(status);
      if (canonical) {
        whereClause.status = canonical;
      }
    }

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      whereClause.OR = [
        { companyName: { contains: q } },
        { jobTitle: { contains: q } },
        { location: { contains: q } },
        { notes: { contains: q } }
      ];
    }

    const applications = await prisma.application.findMany({
      where: whereClause,
      orderBy: { updatedAt: 'desc' },
      include: {
        job: true,
        resumeVersion: true,
        outreachEmails: {
          select: {
            id: true,
            recipientEmail: true,
            recipientName: true,
            status: true,
            sentAt: true,
            createdAt: true
          }
        },
        statusHistory: { orderBy: { changedAt: 'desc' } }
      }
    });

    // Summary calculation across ALL real applications of this user (unfiltered)
    const allUserApps = await prisma.application.findMany({
      where: { userId },
      select: { status: true }
    });

    const summary = {
      total: allUserApps.length,
      saved: 0,
      applied: 0,
      assessment: 0,
      interview: 0,
      offer: 0,
      rejected: 0,
      withdrawn: 0
    };

    allUserApps.forEach(app => {
      const norm = normalizeStatus(app.status);
      if (norm === 'SAVED') summary.saved++;
      else if (norm === 'APPLIED') summary.applied++;
      else if (norm === 'ASSESSMENT') summary.assessment++;
      else if (norm === 'INTERVIEW') summary.interview++;
      else if (norm === 'OFFER') summary.offer++;
      else if (norm === 'REJECTED') summary.rejected++;
      else if (norm === 'WITHDRAWN') summary.withdrawn++;
    });

    return res.json({
      applications,
      summary
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/applications/:id
// Retrieve single application detail with ownership check
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const id = parseInt(req.params.id, 10);

    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid application ID.' });
    }

    const application = await prisma.application.findFirst({
      where: { id, userId },
      include: {
        job: true,
        resumeVersion: true,
        outreachEmails: true,
        statusHistory: { orderBy: { changedAt: 'desc' } }
      }
    });

    if (!application) {
      return res.status(404).json({ error: 'Application record not found or unauthorized.' });
    }

    return res.json({ application });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/applications
// Create/save a new application
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const {
      companyName,
      jobTitle,
      location,
      jobUrl,
      status,
      appliedDate,
      notes,
      jobId,
      externalJobId,
      resumeVersionId,
      videoId
    } = req.body;

    if (!companyName || typeof companyName !== 'string' || !companyName.trim()) {
      return res.status(400).json({ error: 'Company name is required.' });
    }
    if (!jobTitle || typeof jobTitle !== 'string' || !jobTitle.trim()) {
      return res.status(400).json({ error: 'Job title is required.' });
    }

    let canonicalStatus: ApplicationStatus = 'SAVED';
    if (status) {
      const normalized = normalizeStatus(status);
      if (!normalized) {
        return res.status(400).json({
          error: `Invalid status '${status}'. Allowed statuses: ${VALID_APPLICATION_STATUSES.join(', ')}`
        });
      }
      canonicalStatus = normalized;
    }

    const dateStr = appliedDate && typeof appliedDate === 'string' && appliedDate.trim()
      ? appliedDate.trim()
      : (canonicalStatus !== 'SAVED' ? new Date().toISOString().split('T')[0] : null);

    let parsedResumeVersionId: number | null = null;
    if (resumeVersionId) {
      const vId = parseInt(resumeVersionId, 10);
      const ownedVersion = await prisma.resumeVersion.findFirst({
        where: { id: vId, userId }
      });
      if (!ownedVersion) {
        return res.status(400).json({ error: 'Referenced resume version not found or does not belong to you.' });
      }
      parsedResumeVersionId = vId;
    }

    let parsedVideoId: number | null = null;
    if (videoId) {
      const vid = parseInt(videoId, 10);
      const ownedVideo = await prisma.video.findFirst({
        where: { id: vid, userId }
      });
      if (!ownedVideo) {
        return res.status(400).json({ error: 'Referenced video not found or does not belong to you.' });
      }
      parsedVideoId = vid;
    }

    const application = await prisma.application.create({
      data: {
        userId,
        jobId: jobId ? parseInt(jobId, 10) : null,
        externalJobId: externalJobId ? String(externalJobId).trim() : null,
        companyName: companyName.trim(),
        jobTitle: jobTitle.trim(),
        location: location ? location.trim() : null,
        jobUrl: jobUrl ? jobUrl.trim() : null,
        status: canonicalStatus,
        appliedDate: dateStr,
        notes: notes ? notes.trim() : null,
        resumeVersionId: parsedResumeVersionId,
        videoId: parsedVideoId,
        statusHistory: {
          create: {
            previousStatus: null,
            newStatus: canonicalStatus,
            notes: notes ? `Initial: ${notes.slice(0, 100)}` : 'Application created'
          }
        }
      },
      include: {
        job: true,
        statusHistory: true
      }
    });

    return res.status(201).json({
      message: 'Application created successfully.',
      application
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/applications/:id
// Full or partial edit of application details, status transitions, notes, and dates
router.put('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const id = parseInt(req.params.id, 10);

    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid application ID.' });
    }

    const existing = await prisma.application.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Application not found or unauthorized.' });
    }

    const {
      companyName,
      jobTitle,
      location,
      jobUrl,
      status,
      appliedDate,
      notes,
      resumeVersionId,
      videoId
    } = req.body;

    let targetStatus: ApplicationStatus = existing.status as ApplicationStatus;
    let statusChanged = false;

    if (status !== undefined) {
      const normalized = normalizeStatus(status);
      if (!normalized) {
        return res.status(400).json({
          error: `Invalid status '${status}'. Allowed statuses: ${VALID_APPLICATION_STATUSES.join(', ')}`
        });
      }
      if (normalized !== existing.status) {
        targetStatus = normalized;
        statusChanged = true;
      }
    }

    let parsedResumeVersionId: number | null | undefined = undefined;
    if (resumeVersionId !== undefined) {
      if (resumeVersionId === null || resumeVersionId === '') {
        parsedResumeVersionId = null;
      } else {
        const vId = parseInt(resumeVersionId, 10);
        const ownedVersion = await prisma.resumeVersion.findFirst({
          where: { id: vId, userId }
        });
        if (!ownedVersion) {
          return res.status(400).json({ error: 'Referenced resume version not found or does not belong to you.' });
        }
        parsedResumeVersionId = vId;
      }
    }

    let parsedVideoId: number | null | undefined = undefined;
    if (videoId !== undefined) {
      if (videoId === null || videoId === '') {
        parsedVideoId = null;
      } else {
        const vid = parseInt(videoId, 10);
        const ownedVideo = await prisma.video.findFirst({
          where: { id: vid, userId }
        });
        if (!ownedVideo) {
          return res.status(400).json({ error: 'Referenced video not found or does not belong to you.' });
        }
        parsedVideoId = vid;
      }
    }

    const updated = await prisma.application.update({
      where: { id },
      data: {
        companyName: companyName !== undefined ? companyName.trim() : undefined,
        jobTitle: jobTitle !== undefined ? jobTitle.trim() : undefined,
        location: location !== undefined ? (location ? location.trim() : null) : undefined,
        jobUrl: jobUrl !== undefined ? (jobUrl ? jobUrl.trim() : null) : undefined,
        status: targetStatus,
        appliedDate: appliedDate !== undefined ? (appliedDate ? appliedDate.trim() : null) : undefined,
        notes: notes !== undefined ? (notes ? notes.trim() : null) : undefined,
        resumeVersionId: parsedResumeVersionId,
        videoId: parsedVideoId,
        ...(statusChanged ? {
          statusHistory: {
            create: {
              previousStatus: existing.status,
              newStatus: targetStatus,
              notes: notes ? `Status updated: ${notes.slice(0, 100)}` : `Status updated to ${targetStatus}`
            }
          }
        } : {})
      },
      include: {
        job: true,
        resumeVersion: true,
        outreachEmails: true,
        statusHistory: { orderBy: { changedAt: 'desc' } }
      }
    });

    return res.json({
      message: 'Application updated successfully.',
      application: updated
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/applications/:id
// Delete application with strict ownership validation
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const id = parseInt(req.params.id, 10);

    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid application ID.' });
    }

    const existing = await prisma.application.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Application not found or unauthorized.' });
    }

    // Cascade or nullify references safely: statusHistory is linked by applicationId
    await prisma.applicationStatusHistory.deleteMany({
      where: { applicationId: id }
    });

    await prisma.application.delete({
      where: { id }
    });

    return res.json({ message: 'Application deleted successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
