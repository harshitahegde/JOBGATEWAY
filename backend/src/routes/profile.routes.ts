import { Router, Response } from 'express';
import { prisma } from '../db';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET /api/profile
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    let profile = await prisma.profile.findUnique({ where: { userId } });
    
    if (!profile) {
      profile = await prisma.profile.create({
        data: {
          userId,
          fullName: 'Developer Candidate',
          location: 'Remote / Global',
          bio: 'Enthusiastic software engineer.'
        }
      });
    }

    const skills = await prisma.userSkill.findMany({ where: { userId } });

    return res.json({
      profile: {
        ...profile,
        careerPreferences: profile.careerPreferences ? JSON.parse(profile.careerPreferences) : {},
        education: profile.education ? JSON.parse(profile.education) : [],
        experience: profile.experience ? JSON.parse(profile.experience) : [],
        projects: profile.projects ? JSON.parse(profile.projects) : [],
        certifications: profile.certifications ? JSON.parse(profile.certifications) : [],
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
        fullName,
        phone,
        location,
        bio,
        linkedinUrl,
        githubUrl,
        portfolioUrl,
        careerPreferences: careerPreferences ? JSON.stringify(careerPreferences) : undefined,
        education: education ? JSON.stringify(education) : undefined,
        experience: experience ? JSON.stringify(experience) : undefined,
        projects: projects ? JSON.stringify(projects) : undefined,
        certifications: certifications ? JSON.stringify(certifications) : undefined
      },
      create: {
        userId,
        fullName: fullName || 'User',
        phone,
        location,
        bio,
        linkedinUrl,
        githubUrl,
        portfolioUrl,
        careerPreferences: careerPreferences ? JSON.stringify(careerPreferences) : undefined,
        education: education ? JSON.stringify(education) : undefined,
        experience: experience ? JSON.stringify(experience) : undefined,
        projects: projects ? JSON.stringify(projects) : undefined,
        certifications: certifications ? JSON.stringify(certifications) : undefined
      }
    });

    // Update Skills
    if (Array.isArray(skills)) {
      await prisma.userSkill.deleteMany({ where: { userId } });
      for (const sk of skills) {
        if (sk.skillName) {
          await prisma.userSkill.create({
            data: {
              userId,
              skillName: sk.skillName,
              proficiencyLevel: sk.proficiencyLevel || 'Intermediate',
              yearsExperience: sk.yearsExperience || 1
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
