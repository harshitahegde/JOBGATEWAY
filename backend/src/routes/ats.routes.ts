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

    if (!jobDescription || !jobDescription.trim()) {
      return res.status(400).json({ error: 'Job description text is required. Please paste the target job description.' });
    }

    let textToAnalyze = resumeText || "";
    let parsedResumeObj: any = null;

    let validResumeId: number | null = null;
    if (resumeId !== undefined && resumeId !== null && resumeId !== '') {
      const parsedId = parseInt(resumeId, 10);
      if (isNaN(parsedId) || parsedId <= 0) {
        return res.status(400).json({ error: 'Invalid resume ID format.' });
      }
      validResumeId = parsedId;
    }

    if (validResumeId) {
      const resume = await prisma.resume.findFirst({ where: { id: validResumeId, userId } });
      if (!resume) {
        return res.status(404).json({ error: 'Resume not found or unauthorized.' });
      }
      if (resume.parsedContent) {
        try {
          parsedResumeObj = JSON.parse(resume.parsedContent);
          if (parsedResumeObj.raw_text) {
            textToAnalyze = parsedResumeObj.raw_text;
          } else {
            textToAnalyze = `${parsedResumeObj.summary || ''} ${Array.isArray(parsedResumeObj.skills) ? parsedResumeObj.skills.join(' ') : ''} ${JSON.stringify(parsedResumeObj.experience || [])}`;
          }
        } catch (e) {
          console.warn('[ATS ROUTE] Error parsing stored resume JSON:', e);
        }
      }
    }

    if (!textToAnalyze || !textToAnalyze.trim()) {
      return res.status(400).json({ error: 'Please provide resume text or select a valid uploaded resume file.' });
    }

    const wordCount = (textToAnalyze.match(/\b[a-zA-Z0-9_-]+\b/g) || []).length;
    if (wordCount < 15) {
      return res.status(400).json({ error: `Resume text contains insufficient extractable text (only ${wordCount} words detected). Ensure your resume file is text-readable.` });
    }

    const analysisResult = await providers.ai.calculateATSScore(textToAnalyze, jobDescription, parsedResumeObj);

    if (analysisResult.error) {
      return res.status(400).json({ error: analysisResult.error });
    }

    // Record analysis in database
    const record = await prisma.resumeAnalysis.create({
      data: {
        userId,
        resumeId: validResumeId,
        jobTitle: jobTitle || 'Target Role',
        company: company || 'Company',
        jobDescription,
        atsScore: analysisResult.ats_score,
        matchedKeywords: JSON.stringify(analysisResult.matched_keywords || []),
        missingKeywords: JSON.stringify(analysisResult.missing_keywords || []),
        suggestions: JSON.stringify(analysisResult.suggestions || [])
      }
    });

    return res.json({
      analysisId: record.id,
      jobTitle: jobTitle || 'Target Role',
      company: company || 'Company',
      atsScore: analysisResult.ats_score,
      scoringFormula: analysisResult.scoring_formula,
      breakdown: analysisResult.breakdown,
      matchedKeywords: analysisResult.matched_keywords || [],
      missingKeywords: analysisResult.missing_keywords || [],
      detectedSections: analysisResult.detected_sections || [],
      potentialIssues: analysisResult.potential_issues || [],
      suggestions: analysisResult.suggestions || [],
      createdAt: record.createdAt
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'ATS Analysis failed' });
  }
});

export default router;
