import { Router, Response } from 'express';
import { prisma } from '../db';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { providers } from '../providers';

const router = Router();

// POST /api/ats/analyze
router.post('/analyze', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { resumeId, resumeText, jobTitle, company, jobDescription } = req.body;

    if (!jobDescription) {
      return res.status(400).json({ error: 'Job description text is required' });
    }

    let textToAnalyze = resumeText || "";

    if (resumeId) {
      const resume = await prisma.resume.findFirst({ where: { id: parseInt(resumeId), userId } });
      if (resume && resume.parsedContent) {
        const parsed = JSON.parse(resume.parsedContent);
        textToAnalyze = `${parsed.summary || ''} ${Array.isArray(parsed.skills) ? parsed.skills.join(' ') : ''} ${JSON.stringify(parsed.experience || [])}`;
      }
    }

    if (!textToAnalyze || !textToAnalyze.trim()) {
      return res.status(400).json({ error: 'Please provide resume text or select an uploaded resume' });
    }

    const analysisResult = await providers.ai.calculateATSScore(textToAnalyze, jobDescription);

    // Record analysis in database
    const record = await prisma.resumeAnalysis.create({
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
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
