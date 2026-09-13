"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /api/applications
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const applications = await db_1.prisma.application.findMany({
            where: { userId },
            orderBy: { updatedAt: 'desc' },
            include: {
                job: true,
                resumeVersion: true,
                outreachEmails: true,
                statusHistory: { orderBy: { changedAt: 'desc' } }
            }
        });
        return res.json({ applications });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// POST /api/applications
router.post('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { jobId, companyName, jobTitle, status, appliedDate, notes, resumeVersionId, videoId } = req.body;
        if (!companyName || !jobTitle) {
            return res.status(400).json({ error: 'Company name and job title are required' });
        }
        const applicationStatus = status || 'Applied';
        const dateStr = appliedDate || new Date().toISOString().split('T')[0];
        const application = await db_1.prisma.application.create({
            data: {
                userId,
                jobId: jobId ? parseInt(jobId) : null,
                companyName,
                jobTitle,
                status: applicationStatus,
                appliedDate: dateStr,
                notes,
                resumeVersionId: resumeVersionId ? parseInt(resumeVersionId) : null,
                videoId: videoId ? parseInt(videoId) : null,
                statusHistory: {
                    create: {
                        previousStatus: null,
                        newStatus: applicationStatus,
                        notes: 'Application created'
                    }
                }
            },
            include: { statusHistory: true }
        });
        return res.status(201).json({ message: 'Application tracked successfully', application });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// PUT /api/applications/:id
router.put('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const id = parseInt(req.params.id);
        const { status, notes, appliedDate, videoId } = req.body;
        const existing = await db_1.prisma.application.findFirst({ where: { id, userId } });
        if (!existing)
            return res.status(404).json({ error: 'Application not found' });
        const statusChanged = status && status !== existing.status;
        const updated = await db_1.prisma.application.update({
            where: { id },
            data: {
                status: status || existing.status,
                notes: notes !== undefined ? notes : existing.notes,
                appliedDate: appliedDate || existing.appliedDate,
                videoId: videoId ? parseInt(videoId) : existing.videoId,
                ...(statusChanged ? {
                    statusHistory: {
                        create: {
                            previousStatus: existing.status,
                            newStatus: status,
                            notes: notes || `Status changed to ${status}`
                        }
                    }
                } : {})
            },
            include: { statusHistory: true }
        });
        return res.json({ message: 'Application updated successfully', application: updated });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// DELETE /api/applications/:id
router.delete('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const id = parseInt(req.params.id);
        await db_1.prisma.application.deleteMany({ where: { id, userId } });
        return res.json({ message: 'Application deleted successfully' });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
exports.default = router;
