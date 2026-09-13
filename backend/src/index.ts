import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/auth.routes';
import profileRoutes from './routes/profile.routes';
import resumeRoutes from './routes/resume.routes';
import atsRoutes from './routes/ats.routes';
import jobRoutes from './routes/job.routes';
import applicationRoutes from './routes/application.routes';
import outreachRoutes from './routes/outreach.routes';
import videoRoutes from './routes/video.routes';
import dashboardRoutes from './routes/dashboard.routes';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Serve Uploaded Files (Resumes, Videos)
const uploadsPath = path.join(process.cwd(), '../uploads');
app.use('/uploads', express.static(uploadsPath));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'JobGateway Express Backend',
    timestamp: new Date().toISOString()
  });
});

// API Routes Registration
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/ats', atsRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/outreach', outreachRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[SERVER ERROR]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 JobGateway Backend running on http://localhost:${PORT}`);
  console.log(`📁 Uploads served from ${uploadsPath}`);
  console.log(`=======================================================`);
});
