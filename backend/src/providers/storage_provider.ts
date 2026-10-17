import fs from 'fs';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';

export interface VideoStorageResult {
  filePath: string;
  storageProvider: 'cloudinary' | 'local_disk' | 's3' | 'unconfigured';
  cloudAssetId?: string | null;
  isPersistentCloudStorage: boolean;
  fileSize: number;
  mimeType: string;
  durationSeconds?: number;
  shareUrl: string | null;
  shareStatus: 'ready' | 'local_only_unshared' | 'unconfigured';
  shareExplanation: string;
}

export interface VideoShareDetails {
  isShareable: boolean;
  shareUrl: string | null;
  status: 'ready' | 'local_only_unshared' | 'unconfigured';
  reason: string;
}

export interface VideoStorageProvider {
  readonly name: string;
  readonly isConfigured: boolean;
  readonly isCloudPersistent: boolean;
  saveVideo(file: Express.Multer.File): Promise<VideoStorageResult>;
  deleteVideo(filePath: string, cloudAssetId?: string): Promise<boolean>;
  getShareDetails(filePath: string, cloudAssetId?: string, reqBaseUrl?: string): VideoShareDetails;
}

const ALLOWED_MIME_TYPES = new Set([
  'video/webm',
  'video/mp4',
  'video/quicktime', // .mov
  'video/x-matroska', // .mkv
  'video/ogg'
]);

const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB limit

export function validateVideoFile(file?: Express.Multer.File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No video file provided.' };
  }

  const mime = file.mimetype.toLowerCase();
  const ext = path.extname(file.originalname).toLowerCase();
  const validExts = ['.webm', '.mp4', '.mov', '.mkv', '.ogg'];

  if (!ALLOWED_MIME_TYPES.has(mime) && !validExts.includes(ext)) {
    return {
      valid: false,
      error: `Invalid video format (${file.mimetype}). Supported formats: WebM, MP4, MOV, MKV, OGG.`
    };
  }

  if (file.size > MAX_VIDEO_SIZE) {
    return {
      valid: false,
      error: `Video file size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the 50MB limit.`
    };
  }

  return { valid: true };
}

/**
 * Persistent Cloud Video Storage Provider using Cloudinary.
 * Never stores persistent videos on ephemeral local disks or database blobs.
 * Enforces honest error reporting when cloud storage credentials are not configured.
 */
export class CloudinaryVideoStorageProvider implements VideoStorageProvider {
  readonly name = 'cloudinary';
  readonly isCloudPersistent = true;

  constructor() {
    this.configureCloudinary();
  }

  private configureCloudinary(): boolean {
    if (process.env.CLOUDINARY_URL && process.env.CLOUDINARY_URL.trim()) {
      cloudinary.config({
        cloudinary_url: process.env.CLOUDINARY_URL.trim()
      });
      return true;
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
    const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
    const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true
      });
      return true;
    }

    return false;
  }

  get isConfigured(): boolean {
    return Boolean(
      (process.env.CLOUDINARY_URL && process.env.CLOUDINARY_URL.trim()) ||
      (process.env.CLOUDINARY_CLOUD_NAME?.trim() &&
       process.env.CLOUDINARY_API_KEY?.trim() &&
       process.env.CLOUDINARY_API_SECRET?.trim())
    );
  }

  async saveVideo(file: Express.Multer.File): Promise<VideoStorageResult> {
    if (!this.isConfigured) {
      // Clean up the temporary multer file from server disk immediately
      if (file.path && fs.existsSync(file.path)) {
        try { fs.unlinkSync(file.path); } catch {}
      }

      // Explicit honest rejection: never silently fall back to local disk
      throw new Error(
        'Persistent cloud video storage is not configured. To permanently store and share videos on Render, please configure the following environment variables: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET (or CLOUDINARY_URL). Local container disks are ephemeral and wiped on redeploy.'
      );
    }

    this.configureCloudinary();

    try {
      const publicId = `pitch_${Date.now()}_${Math.round(Math.random() * 1e6)}`;

      const uploadResult = await cloudinary.uploader.upload(file.path, {
        resource_type: 'video',
        folder: 'jobgateway/videos',
        public_id: publicId,
        overwrite: true
      });

      // Immediately delete temporary local multer file from server disk
      if (file.path && fs.existsSync(file.path)) {
        try { fs.unlinkSync(file.path); } catch {}
      }

      const secureUrl = uploadResult.secure_url || uploadResult.url;
      const durationSec = Math.round(uploadResult.duration || 0);

      return {
        filePath: secureUrl,
        storageProvider: 'cloudinary',
        cloudAssetId: uploadResult.public_id,
        isPersistentCloudStorage: true,
        fileSize: uploadResult.bytes || file.size,
        mimeType: file.mimetype || 'video/mp4',
        durationSeconds: durationSec,
        shareUrl: secureUrl,
        shareStatus: 'ready',
        shareExplanation: 'Video is persistently hosted on Cloudinary cloud storage and accessible to recruiters.'
      };
    } catch (err: any) {
      if (file.path && fs.existsSync(file.path)) {
        try { fs.unlinkSync(file.path); } catch {}
      }
      throw new Error(`Cloudinary video upload failed: ${err.message || err}`);
    }
  }

  async deleteVideo(filePath: string, cloudAssetId?: string): Promise<boolean> {
    if (!this.isConfigured) return false;
    try {
      this.configureCloudinary();
      let publicId = cloudAssetId;

      if (!publicId && filePath.includes('cloudinary.com')) {
        const match = filePath.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-zA-Z0-9]+)?$/);
        if (match) {
          publicId = match[1];
        }
      }

      if (publicId) {
        await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
        return true;
      }
      return false;
    } catch (err) {
      console.error('[CLOUDINARY] Error deleting cloud video:', err);
      return false;
    }
  }

  getShareDetails(filePath: string, cloudAssetId?: string): VideoShareDetails {
    if (filePath.startsWith('https://res.cloudinary.com') || filePath.startsWith('http://res.cloudinary.com')) {
      return {
        isShareable: true,
        shareUrl: filePath,
        status: 'ready',
        reason: 'Video is hosted on persistent Cloudinary storage and accessible to recruiters via secure share URL.'
      };
    }

    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      return {
        isShareable: true,
        shareUrl: filePath,
        status: 'ready',
        reason: 'Video is stored on persistent cloud storage.'
      };
    }

    return {
      isShareable: false,
      shareUrl: null,
      status: 'unconfigured',
      reason: 'Persistent cloud video storage (Cloudinary) is not configured. Local server storage cannot be shared externally.'
    };
  }
}

/**
 * Local Disk Provider — strictly used when STORAGE_PROVIDER=local_disk is explicitly configured
 * for offline local testing.
 */
export class LocalDiskStorageProvider implements VideoStorageProvider {
  readonly name = 'local_disk';
  readonly isConfigured = true;
  readonly isCloudPersistent = false;
  private uploadDir: string;

  constructor(uploadDir?: string) {
    this.uploadDir = uploadDir || path.join(process.cwd(), '../uploads/videos');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async saveVideo(file: Express.Multer.File): Promise<VideoStorageResult> {
    const filename = file.filename || path.basename(file.path);
    const publicRelativeUrl = `/uploads/videos/${filename}`;
    const shareDetails = this.getShareDetails(publicRelativeUrl);

    return {
      filePath: publicRelativeUrl,
      storageProvider: 'local_disk',
      cloudAssetId: null,
      isPersistentCloudStorage: false,
      fileSize: file.size,
      mimeType: file.mimetype || 'video/webm',
      shareUrl: shareDetails.shareUrl,
      shareStatus: shareDetails.status,
      shareExplanation: shareDetails.reason
    };
  }

  async deleteVideo(filePath: string): Promise<boolean> {
    try {
      const filename = path.basename(filePath);
      const fullPath = path.join(this.uploadDir, filename);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        return true;
      }
      return false;
    } catch (err) {
      console.error('[STORAGE] Error deleting local video file:', err);
      return false;
    }
  }

  getShareDetails(filePath: string, cloudAssetId?: string, reqBaseUrl?: string): VideoShareDetails {
    const publicBaseUrl = process.env.PUBLIC_APP_URL?.trim() || process.env.BACKEND_PUBLIC_URL?.trim();

    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      return {
        isShareable: true,
        shareUrl: filePath,
        status: 'ready',
        reason: 'Video is stored on persistent cloud storage and ready for external sharing.'
      };
    }

    if (publicBaseUrl && publicBaseUrl.startsWith('https://')) {
      const fullUrl = `${publicBaseUrl.replace(/\/+$/, '')}${filePath.startsWith('/') ? '' : '/'}${filePath}`;
      return {
        isShareable: true,
        shareUrl: fullUrl,
        status: 'ready',
        reason: 'Video URL generated via configured public host.'
      };
    }

    return {
      isShareable: false,
      shareUrl: null,
      status: 'local_only_unshared',
      reason: 'Persistent cloud video storage (Cloudinary) is not configured. The video is saved locally on the application server and cannot be shared with external recruiters without a public cloud URL.'
    };
  }
}

/**
 * Creates the active video storage provider.
 * Defaults to Cloudinary for persistent production cloud storage.
 * Local disk is only enabled if STORAGE_PROVIDER is explicitly set to 'local_disk'.
 */
export function createVideoStorageProvider(): VideoStorageProvider {
  const providerType = (process.env.STORAGE_PROVIDER || 'cloudinary').toLowerCase().trim();

  if (providerType === 'local_disk') {
    return new LocalDiskStorageProvider();
  }

  return new CloudinaryVideoStorageProvider();
}
