"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
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
// GET /api/profile
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        let profile = await db_1.prisma.profile.findUnique({ where: { userId } });
        if (!profile) {
            profile = await db_1.prisma.profile.create({
                data: {
                    userId,
                    fullName: req.user?.email.split('@')[0] || 'User',
                    location: '',
                    bio: ''
                }
            });
        }
        const skills = await db_1.prisma.userSkill.findMany({ where: { userId } });
        return res.json({
            profile: {
                ...profile,
                careerPreferences: safeJsonParse(profile.careerPreferences, {}),
                education: safeJsonParse(profile.education, []),
                experience: safeJsonParse(profile.experience, []),
                projects: safeJsonParse(profile.projects, []),
                certifications: safeJsonParse(profile.certifications, []),
                skills
            }
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// PUT /api/profile
router.put('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { fullName, phone, location, bio, linkedinUrl, githubUrl, portfolioUrl, careerPreferences, education, experience, projects, certifications, skills } = req.body;
        const updatedProfile = await db_1.prisma.profile.upsert({
            where: { userId },
            update: {
                fullName: typeof fullName === 'string' ? fullName.trim() : undefined,
                phone: typeof phone === 'string' ? phone.trim() : undefined,
                location: typeof location === 'string' ? location.trim() : undefined,
                bio: typeof bio === 'string' ? bio.trim() : undefined,
                linkedinUrl: typeof linkedinUrl === 'string' ? linkedinUrl.trim() : undefined,
                githubUrl: typeof githubUrl === 'string' ? githubUrl.trim() : undefined,
                portfolioUrl: typeof portfolioUrl === 'string' ? portfolioUrl.trim() : undefined,
                careerPreferences: careerPreferences ? JSON.stringify(careerPreferences) : undefined,
                education: education ? JSON.stringify(education) : undefined,
                experience: experience ? JSON.stringify(experience) : undefined,
                projects: projects ? JSON.stringify(projects) : undefined,
                certifications: certifications ? JSON.stringify(certifications) : undefined
            },
            create: {
                userId,
                fullName: typeof fullName === 'string' && fullName.trim() ? fullName.trim() : (req.user?.email.split('@')[0] || 'User'),
                phone: typeof phone === 'string' ? phone.trim() : undefined,
                location: typeof location === 'string' ? location.trim() : '',
                bio: typeof bio === 'string' ? bio.trim() : '',
                linkedinUrl: typeof linkedinUrl === 'string' ? linkedinUrl.trim() : undefined,
                githubUrl: typeof githubUrl === 'string' ? githubUrl.trim() : undefined,
                portfolioUrl: typeof portfolioUrl === 'string' ? portfolioUrl.trim() : undefined,
                careerPreferences: careerPreferences ? JSON.stringify(careerPreferences) : undefined,
                education: education ? JSON.stringify(education) : undefined,
                experience: experience ? JSON.stringify(experience) : undefined,
                projects: projects ? JSON.stringify(projects) : undefined,
                certifications: certifications ? JSON.stringify(certifications) : undefined
            }
        });
        // Update Skills (with deduplication)
        if (Array.isArray(skills)) {
            await db_1.prisma.userSkill.deleteMany({ where: { userId } });
            const seenSkills = new Set();
            for (const sk of skills) {
                const rawName = sk && typeof sk.skillName === 'string' ? sk.skillName.trim() : '';
                const nameLower = rawName.toLowerCase();
                if (rawName && !seenSkills.has(nameLower)) {
                    seenSkills.add(nameLower);
                    await db_1.prisma.userSkill.create({
                        data: {
                            userId,
                            skillName: rawName,
                            proficiencyLevel: sk.proficiencyLevel || 'Intermediate',
                            yearsExperience: typeof sk.yearsExperience === 'number' && !isNaN(sk.yearsExperience)
                                ? Math.max(0, sk.yearsExperience)
                                : 1
                        }
                    });
                }
            }
        }
        return res.json({ message: 'Profile updated successfully', profile: updatedProfile });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
exports.default = router;
