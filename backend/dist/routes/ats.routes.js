"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const providers_1 = require("../providers");
const router = (0, express_1.Router)();
// POST /api/ats/analyze
router.post('/analyze', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { resumeId, resumeText, jobTitle, company, jobDescription } = req.body;
        if (!jobDescription) {
            return res.status(400).json({ error: 'Job description text is required' });
        }
        let textToAnalyze = resumeText || "";
        if (resumeId) {
            const resume = await db_1.prisma.resume.findFirst({ where: { id: parseInt(resumeId), userId } });
            if (resume && resume.parsedContent) {
                const parsed = JSON.parse(resume.parsedContent);
                textToAnalyze = `${parsed.summary || ''} ${Array.isArray(parsed.skills) ? parsed.skills.join(' ') : ''} ${JSON.stringify(parsed.experience || [])}`;
            }
        }
        if (!textToAnalyze || !textToAnalyze.trim()) {
            return res.status(400).json({ error: 'Please provide resume text or select an uploaded resume' });
        }
        const analysisResult = await providers_1.providers.ai.calculateATSScore(textToAnalyze, jobDescription);
        // Record analysis in database
        const record = await db_1.prisma.resumeAnalysis.create({
            data: {
                userId,
                resumeId: resumeId ? parseInt(resumeId) : null,
                jobTitle: jobTitle || 'Target Role',
                company: company || 'Company',
                jobDescription,
                atsScore: analysisResult.ats_score,
                matchedKeywords: JSON.stringify(analysisResult.matched_keywords),
                missingKeywords: JSON.stringify(analysisResult.missing_keywords),
                suggestions: JSON.stringify(analysisResult.suggestions)
            }
        });
        return res.json({
            analysisId: record.id,
            jobTitle: jobTitle || 'Target Role',
            company: company || 'Company',
            atsScore: analysisResult.ats_score,
            matchedKeywords: analysisResult.matched_keywords,
            missingKeywords: analysisResult.missing_keywords,
            suggestions: analysisResult.suggestions,
            createdAt: record.createdAt
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
exports.default = router;
