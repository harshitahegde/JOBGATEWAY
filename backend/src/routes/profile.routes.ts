import { Router, Response } from 'express';
import { prisma } from '../db';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

function safeJsonParse<T>(val: any, fallback: T): T {
  if (!val) return fallback;
  if (typeof val !== 'string') return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

// GET /api/profile
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    let profile = await prisma.profile.findUnique({ where: { userId } });
    
    if (!profile) {
      profile = await prisma.profile.create({
        data: {
          userId,
          fullName: req.user?.email.split('@')[0] || 'User',
          location: '',
          bio: ''
        }
      });
    }

    const skills = await prisma.userSkill.findMany({ where: { userId } });

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
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/profile
router.put('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const {
      fullName, phone, location, bio, linkedinUrl, githubUrl, portfolioUrl,
      careerPreferences, education, experience, projects, certifications, skills
    } = req.body;

    const updatedProfile = await prisma.profile.upsert({
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
      await prisma.userSkill.deleteMany({ where: { userId } });
      const seenSkills = new Set<string>();
      for (const sk of skills) {
        const rawName = sk && typeof sk.skillName === 'string' ? sk.skillName.trim() : '';
        const nameLower = rawName.toLowerCase();
        if (rawName && !seenSkills.has(nameLower)) {
          seenSkills.add(nameLower);
          await prisma.userSkill.create({
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
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
