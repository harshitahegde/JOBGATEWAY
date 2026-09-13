import { Router, Response } from 'express';
import { prisma } from '../db';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET /api/dashboard
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const [applications, savedJobs, resumes, analyses, videos] = await Promise.all([
      prisma.application.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        include: { job: true }
      }),
      prisma.savedJob.findMany({ where: { userId } }),
      prisma.resume.findMany({ where: { userId } }),
      prisma.resumeAnalysis.findMany({ where: { userId } }),
      prisma.video.findMany({ where: { userId } })
    ]);

    const totalApplications = applications.length;

    // Status breakdown
    const statusCounts: Record<string, number> = {
      Saved: 0,
      Applied: 0,
      Interview: 0,
      Selected: 0,
      Rejected: 0,
      Withdrawn: 0
    };

    applications.forEach(app => {
      if (statusCounts[app.status] !== undefined) {
        statusCounts[app.status]++;
      }
    });

    // Calculate Average ATS score
    const avgAtsScore = analyses.length > 0
      ? Math.round(analyses.reduce((acc, curr) => acc + curr.atsScore, 0) / analyses.length)
      : 0;

    return res.json({
      metrics: {
        totalApplications,
        savedJobsCount: savedJobs.length,
        resumesCount: resumes.length,
        analysesCount: analyses.length,
        videosCount: videos.length,
        avgAtsScore,
        statusBreakdown: statusCounts
      },
      recentApplications: applications.slice(0, 5),
      latestAnalysis: analyses.length > 0 ? analyses[analyses.length - 1] : null
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
