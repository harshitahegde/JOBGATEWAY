"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /api/dashboard
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const [applications, savedJobs, resumes, analyses, videos] = await Promise.all([
            db_1.prisma.application.findMany({
                where: { userId },
                orderBy: { updatedAt: 'desc' },
                include: { job: true }
            }),
            db_1.prisma.savedJob.findMany({ where: { userId } }),
            db_1.prisma.resume.findMany({ where: { userId } }),
            db_1.prisma.resumeAnalysis.findMany({ where: { userId } }),
            db_1.prisma.video.findMany({ where: { userId } })
        ]);
        const totalApplications = applications.length;
        // Status breakdown
        const statusCounts = {
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
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
exports.default = router;
