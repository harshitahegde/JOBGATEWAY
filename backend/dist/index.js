"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const profile_routes_1 = __importDefault(require("./routes/profile.routes"));
const resume_routes_1 = __importDefault(require("./routes/resume.routes"));
const ats_routes_1 = __importDefault(require("./routes/ats.routes"));
const job_routes_1 = __importDefault(require("./routes/job.routes"));
const application_routes_1 = __importDefault(require("./routes/application.routes"));
const outreach_routes_1 = __importDefault(require("./routes/outreach.routes"));
const video_routes_1 = __importDefault(require("./routes/video.routes"));
const dashboard_routes_1 = __importDefault(require("./routes/dashboard.routes"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '20mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '20mb' }));
// Serve Uploaded Files (Resumes, Videos)
const uploadsPath = path_1.default.join(process.cwd(), '../uploads');
app.use('/uploads', express_1.default.static(uploadsPath));
// Health Check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'JobGateway Express Backend',
        timestamp: new Date().toISOString()
    });
});
// API Routes Registration
app.use('/api/auth', auth_routes_1.default);
app.use('/api/profile', profile_routes_1.default);
app.use('/api/resumes', resume_routes_1.default);
app.use('/api/ats', ats_routes_1.default);
app.use('/api/jobs', job_routes_1.default);
app.use('/api/applications', application_routes_1.default);
app.use('/api/outreach', outreach_routes_1.default);
app.use('/api/videos', video_routes_1.default);
app.use('/api/dashboard', dashboard_routes_1.default);
// Global Error Handler
app.use((err, req, res, next) => {
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
