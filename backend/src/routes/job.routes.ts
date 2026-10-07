import { Router, Response } from 'express';
import { prisma } from '../db';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { providers } from '../providers';

const router = Router();

// GET /api/jobs
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { title, location, skill } = req.query;

    let jobs = await prisma.job.findMany({
      orderBy: { createdAt: 'desc' }
    });

    // Filter jobs in memory if title/location/skill query params provided
    let filtered = jobs;
    if (title && (title as string).trim()) {
      const tLower = (title as string).toLowerCase().trim();
      filtered = filtered.filter(j => j.title.toLowerCase().includes(tLower) || j.company.toLowerCase().includes(tLower) || j.description.toLowerCase().includes(tLower));
    }
    if (location && (location as string).trim()) {
      const lLower = (location as string).toLowerCase().trim();
      filtered = filtered.filter(j => j.location.toLowerCase().includes(lLower));
    }
    if (skill && (skill as string).trim()) {
      const sLower = (skill as string).toLowerCase().trim();
      filtered = filtered.filter(j => j.requirements?.toLowerCase().includes(sLower) || j.description.toLowerCase().includes(sLower));
    }

    // Get user saved job IDs
    const savedJobs = await prisma.savedJob.findMany({ where: { userId } });
    const savedJobIds = new Set(savedJobs.map(s => s.jobId));

    const result = filtered.map(j => ({
      ...j,
      requirements: j.requirements ? JSON.parse(j.requirements) : [],
      isSaved: savedJobIds.has(j.id),
      isDemo: false
    }));

    return res.json({
      jobs: result,
      provider: {
        isConfigured: providers.job.isConfigured,
        message: providers.job.isConfigured
          ? "Live API Connected"
          : "Live job search is not connected yet."
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/jobs/:id
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const id = parseInt(req.params.id);

    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const saved = await prisma.savedJob.findUnique({
      where: { userId_jobId: { userId, jobId: id } }
    });

    return res.json({
      job: {
        ...job,
        requirements: job.requirements ? JSON.parse(job.requirements) : [],
        isSaved: Boolean(saved)
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/jobs/:id/save
router.post('/:id/save', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const jobId = parseInt(req.params.id);

    const existing = await prisma.savedJob.findUnique({
      where: { userId_jobId: { userId, jobId } }
    });

    if (existing) {
      await prisma.savedJob.delete({
        where: { userId_jobId: { userId, jobId } }
      });
      return res.json({ message: 'Job removed from saved jobs', isSaved: false });
    } else {
      await prisma.savedJob.create({
        data: { userId, jobId }
      });
      return res.json({ message: 'Job saved successfully', isSaved: true });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
