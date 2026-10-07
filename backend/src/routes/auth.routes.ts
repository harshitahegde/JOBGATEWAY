import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db';
import { generateToken, authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, fullName } = req.body;
    if (!email || !password || !fullName) {
      return res.status(400).json({ error: 'Email, password and full name are required' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        profile: {
          create: {
            fullName,
            bio: '',
            location: ''
          }
        }
      },
      include: { profile: true }
    });

    const token = generateToken(user.id, user.email);
    return res.status(201).json({
      message: 'Registration successful',
      token,
      user: { id: user.id, email: user.email, fullName: user.profile?.fullName }
    });
  } catch (err: any) {
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

    const user = await prisma.user.findUnique({
      where: { email },
      include: { profile: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user.id, user.email);
    return res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, email: user.email, fullName: user.profile?.fullName }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.userId },
      include: { profile: true }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    return res.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.profile?.fullName,
        profile: user.profile
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
