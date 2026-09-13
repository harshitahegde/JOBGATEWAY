import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../db';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

const videoUploadDir = path.join(process.cwd(), '../uploads/videos');
if (!fs.existsSync(videoUploadDir)) {
  fs.mkdirSync(videoUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, videoUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `video_${uniqueSuffix}${path.extname(file.originalname) || '.webm'}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// POST /api/videos/upload
router.post('/upload', authenticateToken, upload.single('video'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const title = req.body.title || `Self Intro Video - ${new Date().toLocaleDateString()}`;

    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    const { filename, path: filePath, size } = req.file;
    const publicUrl = `/uploads/videos/${filename}`;

    const video = await prisma.video.create({
      data: {
        userId,
        title,
        filePath: publicUrl,
        durationSeconds: 60,
        fileSize: size
      }
    });

    return res.status(201).json({
      message: 'Video self-introduction uploaded successfully',
      video
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/videos
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const videos = await prisma.video.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ videos });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
