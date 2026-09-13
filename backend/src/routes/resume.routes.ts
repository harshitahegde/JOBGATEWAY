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

// POST /api/resumes/upload
router.post('/upload', authenticateToken, upload.single('resume'), async (req: AuthenticatedRequest, res: Response) => {
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
      parsedContent: r.parsedContent ? JSON.parse(r.parsedContent) : null
    }));

    return res.json({ resumes: formatted });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/resumes/:id
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const id = parseInt(req.params.id);

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
    const id = parseInt(req.params.id);
    const { title, parsedContent } = req.body;

    const resume = await prisma.resume.updateMany({
      where: { id, userId },
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
    const id = parseInt(req.params.id);
    const { jobDescription, targetJobTitle, targetCompany } = req.body;

    const resume = await prisma.resume.findFirst({ where: { id, userId } });
    if (!resume) return res.status(404).json({ error: 'Resume not found' });

    const currentContent = resume.parsedContent ? JSON.parse(resume.parsedContent) : {};

    const optimized = await providers.ai.optimizeResume(
      currentContent,
      jobDescription || "",
      targetJobTitle || "Software Engineer"
    );

    // Create a new Resume Version
    const version = await prisma.resumeVersion.create({
      data: {
        resumeId: id,
        userId,
        versionName: `Optimized for ${targetJobTitle || 'Target Role'} @ ${targetCompany || 'Target Company'}`,
        targetJobTitle,
        targetCompany,
        content: JSON.stringify(optimized)
      }
    });

    return res.json({
      message: 'Resume optimized successfully',
      versionId: version.id,
      optimizedContent: optimized
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
