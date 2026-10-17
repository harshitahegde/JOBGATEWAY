import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../db';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { providers } from '../providers';
import { validateVideoFile } from '../providers/storage_provider';

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
    const ext = path.extname(file.originalname).toLowerCase() || '.webm';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `video_${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

const handleVideoUpload = (req: AuthenticatedRequest, res: Response, next: Function) => {
  upload.single('video')(req, res, (err: any) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'Video file exceeds 50MB size limit.' });
        }
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      }
      return res.status(400).json({ error: err.message || 'Invalid video file.' });
    }
    next();
  });
};

// POST /api/videos/upload
// Upload or save newly recorded video file
router.post('/upload', authenticateToken, handleVideoUpload, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const title = (req.body.title || `Video Pitch - ${new Date().toLocaleDateString()}`).trim();
    const description = (req.body.description || '').trim();
    const durationSeconds = parseInt(req.body.durationSeconds, 10) || 0;

    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    const validation = validateVideoFile(req.file);
    if (!validation.valid) {
      // Clean up uploaded file if validation failed
      if (req.file.path && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch {}
      }
      return res.status(400).json({ error: validation.error });
    }

    const storageResult = await providers.videoStorage.saveVideo(req.file);

    const video = await prisma.video.create({
      data: {
        userId,
        title,
        description,
        filePath: storageResult.filePath,
        durationSeconds: storageResult.durationSeconds || durationSeconds,
        fileSize: storageResult.fileSize,
        mimeType: storageResult.mimeType,
        storageProvider: storageResult.storageProvider,
        cloudAssetId: storageResult.cloudAssetId || null,
        shareUrl: storageResult.shareUrl
      }
    });

    return res.status(201).json({
      message: 'Video saved successfully',
      video: {
        ...video,
        shareDetails: {
          isShareable: Boolean(storageResult.shareUrl),
          shareUrl: storageResult.shareUrl,
          status: storageResult.shareStatus,
          reason: storageResult.shareExplanation,
          isPersistentCloudStorage: storageResult.isPersistentCloudStorage
        }
      }
    });
  } catch (err: any) {
    console.error('[VIDEO UPLOAD ERROR]:', err.message);
    const isUnconfigured = err.message && err.message.includes('Persistent cloud video storage is not configured');
    return res.status(isUnconfigured ? 503 : 500).json({
      error: err.message,
      code: isUnconfigured ? 'CLOUD_STORAGE_UNCONFIGURED' : 'UPLOAD_FAILED',
      requiredEnvVars: isUnconfigured
        ? ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']
        : undefined
    });
  }
});

// GET /api/videos
// List user's saved videos with metadata and share details
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const videos = await prisma.video.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        attachments: {
          include: {
            resume: { select: { id: true, title: true, originalFilename: true } },
            resumeVersion: { select: { id: true, versionName: true, targetJobTitle: true } }
          }
        }
      }
    });

    const enriched = videos.map(v => {
      const share = providers.videoStorage.getShareDetails(v.filePath, (v as any).cloudAssetId || undefined);
      return {
        ...v,
        shareDetails: share,
        attachmentCount: v.attachments.length
      };
    });

    return res.json({
      videos: enriched,
      storageStatus: {
        provider: providers.videoStorage.name,
        isConfigured: providers.videoStorage.isConfigured,
        isCloudPersistent: providers.videoStorage.isCloudPersistent
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/videos/:id
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid video ID' });

    const video = await prisma.video.findFirst({
      where: { id, userId },
      include: {
        attachments: {
          include: {
            resume: { select: { id: true, title: true } },
            resumeVersion: { select: { id: true, versionName: true } }
          }
        }
      }
    });

    if (!video) return res.status(404).json({ error: 'Video not found' });

    const share = providers.videoStorage.getShareDetails(video.filePath, (video as any).cloudAssetId || undefined);
    return res.json({ video: { ...video, shareDetails: share } });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/videos/:id
// Delete video after explicit user confirmation
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid video ID' });

    const video = await prisma.video.findFirst({
      where: { id, userId }
    });

    if (!video) return res.status(404).json({ error: 'Video not found' });

    // Delete file from storage (cloud or local)
    await providers.videoStorage.deleteVideo(video.filePath, (video as any).cloudAssetId || undefined);

    // Delete database record (cascades attachments)
    await prisma.video.delete({
      where: { id }
    });

    return res.json({
      message: 'Video deleted successfully',
      deletedVideoId: id
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/videos/:id/attach
// Attach saved video to a resume or resume version
router.post('/:id/attach', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const videoId = parseInt(req.params.id, 10);
    if (isNaN(videoId)) return res.status(400).json({ error: 'Invalid video ID' });

    const { resumeId, resumeVersionId, notes } = req.body;
    const rId = resumeId ? parseInt(resumeId, 10) : undefined;
    const rvId = resumeVersionId ? parseInt(resumeVersionId, 10) : undefined;

    if (!rId && !rvId) {
      return res.status(400).json({ error: 'Must specify a resumeId or resumeVersionId to attach to.' });
    }

    // Verify video ownership
    const video = await prisma.video.findFirst({
      where: { id: videoId, userId }
    });
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Verify resume ownership if provided
    if (rId) {
      const resume = await prisma.resume.findFirst({
        where: { id: rId, userId }
      });
      if (!resume) {
        return res.status(404).json({ error: 'Target resume not found or access denied.' });
      }
    }

    // Verify resume version ownership if provided
    if (rvId) {
      const version = await prisma.resumeVersion.findFirst({
        where: { id: rvId, userId }
      });
      if (!version) {
        return res.status(404).json({ error: 'Target resume version not found or access denied.' });
      }
    }

    // Check if attachment already exists
    const existing = await prisma.resumeVideoAttachment.findFirst({
      where: {
        userId,
        videoId,
        resumeId: rId || null,
        resumeVersionId: rvId || null
      }
    });

    if (existing) {
      return res.status(200).json({
        message: 'Video is already attached to this resume material.',
        attachment: existing
      });
    }

    const attachment = await prisma.resumeVideoAttachment.create({
      data: {
        userId,
        videoId,
        resumeId: rId || null,
        resumeVersionId: rvId || null,
        notes: notes || null
      },
      include: {
        video: true,
        resume: { select: { id: true, title: true } },
        resumeVersion: { select: { id: true, versionName: true } }
      }
    });

    return res.status(201).json({
      message: 'Video attached to resume supplemental material successfully',
      attachment
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/videos/attachments
// List attachments for user, optionally filtered by resumeId or resumeVersionId
router.get('/attachments/list', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { resumeId, resumeVersionId } = req.query;

    const where: any = { userId };
    if (resumeId) where.resumeId = parseInt(resumeId as string, 10);
    if (resumeVersionId) where.resumeVersionId = parseInt(resumeVersionId as string, 10);

    const attachments = await prisma.resumeVideoAttachment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        video: true,
        resume: { select: { id: true, title: true, originalFilename: true } },
        resumeVersion: { select: { id: true, versionName: true, targetJobTitle: true } }
      }
    });

    return res.json({ attachments });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/videos/attachments/:attachmentId
// Detach video from resume/version WITHOUT deleting the original video
router.delete('/attachments/:attachmentId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const attachmentId = parseInt(req.params.attachmentId, 10);
    if (isNaN(attachmentId)) return res.status(400).json({ error: 'Invalid attachment ID' });

    const attachment = await prisma.resumeVideoAttachment.findFirst({
      where: { id: attachmentId, userId }
    });

    if (!attachment) {
      return res.status(404).json({ error: 'Attachment record not found' });
    }

    await prisma.resumeVideoAttachment.delete({
      where: { id: attachmentId }
    });

    return res.json({
      message: 'Attachment removed successfully. Original video remains in your library.',
      deletedAttachmentId: attachmentId
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
