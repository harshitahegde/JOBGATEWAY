"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const providers_1 = require("../providers");
const router = (0, express_1.Router)();
// GET /api/jobs
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { title, location, skill } = req.query;
        let jobs = await db_1.prisma.job.findMany({
            orderBy: { createdAt: 'desc' }
        });
        // Seed mock jobs if database is empty
        if (jobs.length === 0) {
            const mockJobs = await providers_1.providers.job.searchJobs("", "");
            for (const m of mockJobs) {
                await db_1.prisma.job.create({
                    data: {
                        title: m.title,
                        company: m.company,
                        location: m.location,
                        type: m.type,
                        experienceLevel: m.experienceLevel,
                        salaryRange: m.salaryRange,
                        description: m.description,
                        requirements: JSON.stringify(m.requirements),
                        applicationUrl: m.applicationUrl,
                        source: m.source
                    }
                });
            }
            jobs = await db_1.prisma.job.findMany({ orderBy: { createdAt: 'desc' } });
        }
        // Filter jobs in memory
        let filtered = jobs;
        if (title && title.trim()) {
            const tLower = title.toLowerCase().trim();
            filtered = filtered.filter(j => j.title.toLowerCase().includes(tLower) || j.company.toLowerCase().includes(tLower) || j.description.toLowerCase().includes(tLower));
        }
        if (location && location.trim()) {
            const lLower = location.toLowerCase().trim();
            filtered = filtered.filter(j => j.location.toLowerCase().includes(lLower));
        }
        if (skill && skill.trim()) {
            const sLower = skill.toLowerCase().trim();
            filtered = filtered.filter(j => j.requirements?.toLowerCase().includes(sLower) || j.description.toLowerCase().includes(sLower));
        }
        // Get user saved job IDs
        const savedJobs = await db_1.prisma.savedJob.findMany({ where: { userId } });
        const savedJobIds = new Set(savedJobs.map(s => s.jobId));
        const result = filtered.map(j => ({
            ...j,
            requirements: j.requirements ? JSON.parse(j.requirements) : [],
            isSaved: savedJobIds.has(j.id),
            isDemo: providers_1.providers.job.isDemoMode
        }));
        return res.json({
            jobs: result,
            provider: {
                isDemoMode: providers_1.providers.job.isDemoMode,
                message: providers_1.providers.job.isDemoMode
                    ? "Demo Mode: Showing sample jobs. Connect a job provider API to retrieve live listings."
                    : "Live API Connected"
            }
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// GET /api/jobs/:id
router.get('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const id = parseInt(req.params.id);
        const job = await db_1.prisma.job.findUnique({ where: { id } });
        if (!job)
            return res.status(404).json({ error: 'Job not found' });
        const saved = await db_1.prisma.savedJob.findUnique({
            where: { userId_jobId: { userId, jobId: id } }
        });
        return res.json({
            job: {
                ...job,
                requirements: job.requirements ? JSON.parse(job.requirements) : [],
                isSaved: Boolean(saved)
            }
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// POST /api/jobs/:id/save
router.post('/:id/save', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const jobId = parseInt(req.params.id);
        const existing = await db_1.prisma.savedJob.findUnique({
            where: { userId_jobId: { userId, jobId } }
        });
        if (existing) {
            await db_1.prisma.savedJob.delete({
                where: { userId_jobId: { userId, jobId } }
            });
            return res.json({ message: 'Job removed from saved jobs', isSaved: false });
        }
        else {
            await db_1.prisma.savedJob.create({
                data: { userId, jobId }
            });
            return res.json({ message: 'Job saved successfully', isSaved: true });
        }
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
exports.default = router;
