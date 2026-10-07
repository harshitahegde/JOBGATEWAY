import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../db';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { providers } from '../providers';

const router = Router();

const uploadDir = path.join(process.cwd(), '../uploads/resumes');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.pdf' || ext === '.docx' || ext === '.doc') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and DOCX files are allowed'));
    }
  }
});

const handleResumeUpload = (req: AuthenticatedRequest, res: Response, next: Function) => {
  upload.single('resume')(req, res, (err: any) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'Resume file exceeds 10MB size limit.' });
        }
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      }
      return res.status(400).json({ error: err.message || 'Invalid resume file.' });
    }
    next();
  });
};

function safeJsonParse<T>(val: any, fallback: T): T {
  if (!val) return fallback;
  if (typeof val !== 'string') return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

// POST /api/resumes/upload
router.post('/upload', authenticateToken, handleResumeUpload, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    if (!req.file) {
      return res.status(400).json({ error: 'No resume file uploaded' });
    }

    const { originalname, filename, path: filePath, mimetype } = req.file;

    // Perform actual parsing using FastAPI / Python AI service provider
    const parseResult = await providers.ai.parseResume(filePath);
    const parsedData = parseResult.parsed_data || {
      personal_info: { full_name: "Candidate", email: req.user!.email, phone: "", location: "" },
      summary: parseResult.raw_text ? parseResult.raw_text.slice(0, 300) : "",
      skills: [],
      education: [],
      experience: [],
      projects: [],
      certifications: [],
      achievements: []
    };

    const resume = await prisma.resume.create({
      data: {
        userId,
        title: originalname.replace(/\.[^/.]+$/, ""),
        originalFilename: originalname,
        filePath,
        fileType: mimetype || 'application/pdf',
        parsedContent: JSON.stringify(parsedData),
        isPrimary: true
      }
    });

    return res.status(201).json({
      message: 'Resume uploaded and parsed successfully',
      resume: {
        ...resume,
        parsedContent: parsedData
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/resumes/versions/:versionId
router.get('/versions/:versionId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const versionId = parseInt(req.params.versionId, 10);
    if (isNaN(versionId)) return res.status(400).json({ error: 'Invalid version ID' });

    const version = await prisma.resumeVersion.findFirst({
      where: { id: versionId, userId }
    });

    if (!version) return res.status(404).json({ error: 'Resume version not found' });

    return res.json({
      version: {
        ...version,
        content: safeJsonParse(version.content, null)
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/resumes/versions/:versionId
router.put('/versions/:versionId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const versionId = parseInt(req.params.versionId, 10);
    if (isNaN(versionId)) return res.status(400).json({ error: 'Invalid version ID' });

    const { versionName, targetJobTitle, targetCompany, content } = req.body;

    const existing = await prisma.resumeVersion.findFirst({
      where: { id: versionId, userId }
    });
    if (!existing) return res.status(404).json({ error: 'Resume version not found' });

    const updated = await prisma.resumeVersion.update({
      where: { id: versionId },
      data: {
        versionName: versionName !== undefined ? versionName : existing.versionName,
        targetJobTitle: targetJobTitle !== undefined ? targetJobTitle : existing.targetJobTitle,
        targetCompany: targetCompany !== undefined ? targetCompany : existing.targetCompany,
        content: content ? (typeof content === 'string' ? content : JSON.stringify(content)) : existing.content
      }
    });

    return res.json({
      message: 'Resume version updated successfully',
      version: {
        ...updated,
        content: safeJsonParse(updated.content, null)
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/resumes
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const resumes = await prisma.resume.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { versions: true }
    });

    const formatted = resumes.map(r => ({
      ...r,
      parsedContent: safeJsonParse(r.parsedContent, null)
    }));

    return res.json({ resumes: formatted });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/resumes/:id/versions
router.get('/:id/versions', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const resumeId = parseInt(req.params.id, 10);
    if (isNaN(resumeId)) return res.status(400).json({ error: 'Invalid resume ID' });

    const resume = await prisma.resume.findFirst({
      where: { id: resumeId, userId }
    });
    if (!resume) return res.status(404).json({ error: 'Resume not found' });

    const versions = await prisma.resumeVersion.findMany({
      where: { resumeId, userId },
      orderBy: { createdAt: 'desc' }
    });

    const formatted = versions.map(v => ({
      ...v,
      content: safeJsonParse(v.content, null)
    }));

    return res.json({ versions: formatted });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/resumes/:id/versions
router.post('/:id/versions', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const resumeId = parseInt(req.params.id, 10);
    if (isNaN(resumeId)) return res.status(400).json({ error: 'Invalid resume ID' });
    const { versionName, targetJobTitle, targetCompany, content } = req.body;

    const resume = await prisma.resume.findFirst({
      where: { id: resumeId, userId }
    });
    if (!resume) return res.status(404).json({ error: 'Resume not found' });

    const version = await prisma.resumeVersion.create({
      data: {
        resumeId,
        userId,
        versionName: versionName || `Optimized Version ${new Date().toLocaleDateString()}`,
        targetJobTitle: targetJobTitle || null,
        targetCompany: targetCompany || null,
        content: content ? (typeof content === 'string' ? content : JSON.stringify(content)) : (resume.parsedContent || '{}')
      }
    });

    return res.status(201).json({
      message: 'Resume version created successfully',
      version: {
        ...version,
        content: safeJsonParse(version.content, null)
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/resumes/:id
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const id = parseInt(req.params.id, 10);

    const resume = await prisma.resume.findFirst({
      where: { id, userId },
      include: { versions: true }
    });

    if (!resume) return res.status(404).json({ error: 'Resume not found' });

    return res.json({
      resume: {
        ...resume,
        parsedContent: resume.parsedContent ? JSON.parse(resume.parsedContent) : null
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/resumes/:id
router.put('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const id = parseInt(req.params.id, 10);
    const { title, parsedContent } = req.body;

    const existing = await prisma.resume.findFirst({ where: { id, userId } });
    if (!existing) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    await prisma.resume.update({
      where: { id },
      data: {
        title,
        parsedContent: parsedContent ? JSON.stringify(parsedContent) : undefined
      }
    });

    return res.json({ message: 'Resume updated successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/resumes/:id/optimize
router.post('/:id/optimize', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid resume ID' });
    const { jobDescription, targetJobTitle, targetCompany } = req.body;

    const resume = await prisma.resume.findFirst({ where: { id, userId } });
    if (!resume) return res.status(404).json({ error: 'Resume not found' });

    const currentContent = resume.parsedContent ? JSON.parse(resume.parsedContent) : {};

    const optimized = await providers.ai.optimizeResume(
      currentContent,
      jobDescription || "",
      targetJobTitle || "Software Engineer"
    );

    const completeOptimizedResume = optimized.optimized_content || optimized;

    // Create a new Resume Version
    const version = await prisma.resumeVersion.create({
      data: {
        resumeId: id,
        userId,
        versionName: `Optimized for ${targetJobTitle || 'Target Role'}${targetCompany ? ` @ ${targetCompany}` : ''}`,
        targetJobTitle: targetJobTitle || null,
        targetCompany: targetCompany || null,
        content: JSON.stringify(completeOptimizedResume)
      }
    });

    const optPayload = {
      ...optimized,
      ...completeOptimizedResume,
      optimized_content: completeOptimizedResume,
      original_content: optimized.original_content || currentContent,
      matched_skills: optimized.matched_skills || [],
      missing_keywords: optimized.missing_keywords || [],
      suggested_rewrites: optimized.suggested_rewrites || []
    };

    return res.json({
      message: 'Resume optimized successfully',
      versionId: version.id,
      version: {
        ...version,
        content: completeOptimizedResume
      },
      optimizedContent: optPayload,
      matchedSkills: optimized.matched_skills || [],
      missingKeywords: optimized.missing_keywords || [],
      suggestedRewrites: optimized.suggested_rewrites || [],
      optimizationNotes: optimized.optimization_notes || []
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/resumes/:id/analyze
router.post('/:id/analyze', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const id = parseInt(req.params.id);
    const { targetJobDescription } = req.body;

    const resume = await prisma.resume.findFirst({ where: { id, userId } });
    if (!resume) return res.status(404).json({ error: 'Resume not found' });

    const currentContent = resume.parsedContent ? JSON.parse(resume.parsedContent) : {};
    const rawText = currentContent.raw_text || `${currentContent.summary || ''} ${(currentContent.skills || []).join(' ')}`;

    const analysis = await providers.ai.analyzeResume(
      currentContent,
      rawText,
      targetJobDescription || ""
    );

    return res.json({
      message: 'Resume quality analysis completed',
      analysis
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/resumes/analyze-raw
router.post('/analyze-raw', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { resumeData, rawText, targetJobDescription } = req.body;

    if (!resumeData && !rawText) {
      return res.status(400).json({ error: 'Please provide resume data or resume text for analysis.' });
    }

    const dataObj = resumeData || { summary: rawText, skills: [], experience: [], education: [] };
    const analysis = await providers.ai.analyzeResume(
      dataObj,
      rawText || "",
      targetJobDescription || ""
    );

    return res.json({
      message: 'Resume quality analysis completed',
      analysis
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
