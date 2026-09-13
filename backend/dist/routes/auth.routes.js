"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { email, password, fullName } = req.body;
        if (!email || !password || !fullName) {
            return res.status(400).json({ error: 'Email, password and full name are required' });
        }
        const existing = await db_1.prisma.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        const user = await db_1.prisma.user.create({
            data: {
                email,
                passwordHash,
                profile: {
                    create: {
                        fullName,
                        bio: 'Software Engineering professional passionate about building clean, scalable applications.',
                        location: 'Remote / Open to Relocation'
                    }
                }
            },
            include: { profile: true }
        });
        const token = (0, auth_1.generateToken)(user.id, user.email);
        return res.status(201).json({
            message: 'Registration successful',
            token,
            user: { id: user.id, email: user.email, fullName: user.profile?.fullName }
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Registration failed' });
    }
});
// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        const user = await db_1.prisma.user.findUnique({
            where: { email },
            include: { profile: true }
        });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        const validPassword = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        const token = (0, auth_1.generateToken)(user.id, user.email);
        return res.json({
            message: 'Login successful',
            token,
            user: { id: user.id, email: user.email, fullName: user.profile?.fullName }
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Login failed' });
    }
});
// GET /api/auth/me
router.get('/me', auth_1.authenticateToken, async (req, res) => {
    try {
        const user = await db_1.prisma.user.findUnique({
            where: { id: req.user?.userId },
            include: { profile: true }
        });
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        return res.json({
            user: {
                id: user.id,
                email: user.email,
                fullName: user.profile?.fullName,
                profile: user.profile
            }
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
exports.default = router;
