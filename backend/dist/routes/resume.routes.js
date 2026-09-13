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
const providers_1 = require("../providers");
const router = (0, express_1.Router)();
const uploadDir = path_1.default.join(process.cwd(), '../uploads/resumes');
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${uniqueSuffix}${path_1.default.extname(file.originalname)}`);
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        if (ext === '.pdf' || ext === '.docx' || ext === '.doc') {
            cb(null, true);
        }
        else {
            cb(new Error('Only PDF and DOCX files are allowed'));
        }
    }
});
// POST /api/resumes/upload
router.post('/upload', auth_1.authenticateToken, upload.single('resume'), async (req, res) => {
    try {
        const userId = req.user.userId;
        if (!req.file) {
            return res.status(400).json({ error: 'No resume file uploaded' });
        }
        const { originalname, filename, path: filePath, mimetype } = req.file;
        // Perform actual parsing using FastAPI / Python AI service provider
        const parseResult = await providers_1.providers.ai.parseResume(filePath);
        const parsedData = parseResult.parsed_data || {
            personal_info: { full_name: "Candidate", email: req.user.email, phone: "", location: "" },
            summary: parseResult.raw_text ? parseResult.raw_text.slice(0, 300) : "",
            skills: [],
            education: [],
            experience: [],
            projects: [],
            certifications: [],
            achievements: []
        };
        const resume = await db_1.prisma.resume.create({
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
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// GET /api/resumes
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const resumes = await db_1.prisma.resume.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            include: { versions: true }
        });
        const formatted = resumes.map(r => ({
            ...r,
            parsedContent: r.parsedContent ? JSON.parse(r.parsedContent) : null
        }));
        return res.json({ resumes: formatted });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// GET /api/resumes/:id
router.get('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const id = parseInt(req.params.id);
        const resume = await db_1.prisma.resume.findFirst({
            where: { id, userId },
            include: { versions: true }
        });
        if (!resume)
            return res.status(404).json({ error: 'Resume not found' });
        return res.json({
            resume: {
                ...resume,
                parsedContent: resume.parsedContent ? JSON.parse(resume.parsedContent) : null
            }
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// PUT /api/resumes/:id
router.put('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const id = parseInt(req.params.id);
        const { title, parsedContent } = req.body;
        const resume = await db_1.prisma.resume.updateMany({
            where: { id, userId },
            data: {
                title,
                parsedContent: parsedContent ? JSON.stringify(parsedContent) : undefined
            }
        });
        return res.json({ message: 'Resume updated successfully' });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// POST /api/resumes/:id/optimize
router.post('/:id/optimize', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const id = parseInt(req.params.id);
        const { jobDescription, targetJobTitle, targetCompany } = req.body;
        const resume = await db_1.prisma.resume.findFirst({ where: { id, userId } });
        if (!resume)
            return res.status(404).json({ error: 'Resume not found' });
        const currentContent = resume.parsedContent ? JSON.parse(resume.parsedContent) : {};
        const optimized = await providers_1.providers.ai.optimizeResume(currentContent, jobDescription || "", targetJobTitle || "Software Engineer");
        // Create a new Resume Version
        const version = await db_1.prisma.resumeVersion.create({
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
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
exports.default = router;
