"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const videoUploadDir = path_1.default.join(process.cwd(), '../uploads/videos');
if (!fs_1.default.existsSync(videoUploadDir)) {
    fs_1.default.mkdirSync(videoUploadDir, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, videoUploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `video_${uniqueSuffix}${path_1.default.extname(file.originalname) || '.webm'}`);
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});
// POST /api/videos/upload
router.post('/upload', auth_1.authenticateToken, upload.single('video'), async (req, res) => {
    try {
        const userId = req.user.userId;
        const title = req.body.title || `Self Intro Video - ${new Date().toLocaleDateString()}`;
        if (!req.file) {
            return res.status(400).json({ error: 'No video file provided' });
        }
        const { filename, path: filePath, size } = req.file;
        const publicUrl = `/uploads/videos/${filename}`;
        const video = await db_1.prisma.video.create({
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
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// GET /api/videos
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const videos = await db_1.prisma.video.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
        return res.json({ videos });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
exports.default = router;
