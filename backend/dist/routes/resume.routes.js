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
const handleResumeUpload = (req, res, next) => {
    upload.single('resume')(req, res, (err) => {
        if (err) {
            if (err instanceof multer_1.default.MulterError) {
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
function safeJsonParse(val, fallback) {
    if (!val)
        return fallback;
    if (typeof val !== 'string')
        return val;
    try {
        return JSON.parse(val);
    }
    catch {
        return fallback;
    }
}
// POST /api/resumes/upload
router.post('/upload', auth_1.authenticateToken, handleResumeUpload, async (req, res) => {
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
// GET /api/resumes/versions/:versionId
router.get('/versions/:versionId', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const versionId = parseInt(req.params.versionId, 10);
        if (isNaN(versionId))
            return res.status(400).json({ error: 'Invalid version ID' });
        const version = await db_1.prisma.resumeVersion.findFirst({
            where: { id: versionId, userId }
        });
        if (!version)
            return res.status(404).json({ error: 'Resume version not found' });
        return res.json({
            version: {
                ...version,
                content: safeJsonParse(version.content, null)
            }
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// PUT /api/resumes/versions/:versionId
router.put('/versions/:versionId', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const versionId = parseInt(req.params.versionId, 10);
        if (isNaN(versionId))
            return res.status(400).json({ error: 'Invalid version ID' });
        const { versionName, targetJobTitle, targetCompany, content } = req.body;
        const existing = await db_1.prisma.resumeVersion.findFirst({
            where: { id: versionId, userId }
        });
        if (!existing)
            return res.status(404).json({ error: 'Resume version not found' });
        const updated = await db_1.prisma.resumeVersion.update({
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
            parsedContent: safeJsonParse(r.parsedContent, null)
        }));
        return res.json({ resumes: formatted });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// GET /api/resumes/:id/versions
router.get('/:id/versions', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const resumeId = parseInt(req.params.id, 10);
        if (isNaN(resumeId))
            return res.status(400).json({ error: 'Invalid resume ID' });
        const resume = await db_1.prisma.resume.findFirst({
            where: { id: resumeId, userId }
        });
        if (!resume)
            return res.status(404).json({ error: 'Resume not found' });
        const versions = await db_1.prisma.resumeVersion.findMany({
            where: { resumeId, userId },
            orderBy: { createdAt: 'desc' }
        });
        const formatted = versions.map(v => ({
            ...v,
            content: safeJsonParse(v.content, null)
        }));
        return res.json({ versions: formatted });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// POST /api/resumes/:id/versions
router.post('/:id/versions', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const resumeId = parseInt(req.params.id, 10);
        if (isNaN(resumeId))
            return res.status(400).json({ error: 'Invalid resume ID' });
        const { versionName, targetJobTitle, targetCompany, content } = req.body;
        const resume = await db_1.prisma.resume.findFirst({
            where: { id: resumeId, userId }
        });
        if (!resume)
            return res.status(404).json({ error: 'Resume not found' });
        const version = await db_1.prisma.resumeVersion.create({
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
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// GET /api/resumes/:id
router.get('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const id = parseInt(req.params.id, 10);
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
        const id = parseInt(req.params.id, 10);
        const { title, parsedContent } = req.body;
        const existing = await db_1.prisma.resume.findFirst({ where: { id, userId } });
        if (!existing) {
            return res.status(404).json({ error: 'Resume not found' });
        }
        await db_1.prisma.resume.update({
            where: { id },
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
        const id = parseInt(req.params.id, 10);
        if (isNaN(id))
            return res.status(400).json({ error: 'Invalid resume ID' });
        const { jobDescription, targetJobTitle, targetCompany } = req.body;
        const resume = await db_1.prisma.resume.findFirst({ where: { id, userId } });
        if (!resume)
            return res.status(404).json({ error: 'Resume not found' });
        const currentContent = resume.parsedContent ? JSON.parse(resume.parsedContent) : {};
        const optimized = await providers_1.providers.ai.optimizeResume(currentContent, jobDescription || "", targetJobTitle || "Software Engineer");
        const completeOptimizedResume = optimized.optimized_content || optimized;
        // Create a new Resume Version
        const version = await db_1.prisma.resumeVersion.create({
            data: {
                resumeId: id,
                userId,
                versionName: `Optimized for ${targetJobTitle || 'Target Role'}${targetCompany ? ` @ ${targetCompany}` : ''}`,
                targetJobTitle: targetJobTitle || null,
                targetCompany: targetCompany || null,
                content: JSON.stringify(completeOptimizedResume)
            }
        });
        return res.json({
            message: 'Resume optimized successfully',
            versionId: version.id,
            version: {
                ...version,
                content: completeOptimizedResume
            },
            optimizedContent: completeOptimizedResume,
            matchedSkills: optimized.matched_skills || [],
            missingKeywords: optimized.missing_keywords || [],
            suggestedRewrites: optimized.suggested_rewrites || [],
            optimizationNotes: optimized.optimization_notes || []
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// POST /api/resumes/:id/analyze
router.post('/:id/analyze', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const id = parseInt(req.params.id);
        const { targetJobDescription } = req.body;
        const resume = await db_1.prisma.resume.findFirst({ where: { id, userId } });
        if (!resume)
            return res.status(404).json({ error: 'Resume not found' });
        const currentContent = resume.parsedContent ? JSON.parse(resume.parsedContent) : {};
        const rawText = currentContent.raw_text || `${currentContent.summary || ''} ${(currentContent.skills || []).join(' ')}`;
        const analysis = await providers_1.providers.ai.analyzeResume(currentContent, rawText, targetJobDescription || "");
        return res.json({
            message: 'Resume quality analysis completed',
            analysis
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// POST /api/resumes/analyze-raw
router.post('/analyze-raw', auth_1.authenticateToken, async (req, res) => {
    try {
        const { resumeData, rawText, targetJobDescription } = req.body;
        if (!resumeData && !rawText) {
            return res.status(400).json({ error: 'Please provide resume data or resume text for analysis.' });
        }
        const dataObj = resumeData || { summary: rawText, skills: [], experience: [], education: [] };
        const analysis = await providers_1.providers.ai.analyzeResume(dataObj, rawText || "", targetJobDescription || "");
        return res.json({
            message: 'Resume quality analysis completed',
            analysis
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
exports.default = router;
