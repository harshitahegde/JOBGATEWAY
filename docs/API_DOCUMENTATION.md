# JobGateway REST API Documentation

Base URL: `http://localhost:5000/api`

---

## 1. Authentication
- `POST /api/auth/register` - Create new user account.
  - Body: `{ email, password, fullName }`
- `POST /api/auth/login` - Authenticate user & receive JWT.
  - Body: `{ email, password }`
- `GET /api/auth/me` - Fetch authenticated user details. (Requires Header `Authorization: Bearer <token>`)

---

## 2. Profile Management
- `GET /api/profile` - Fetch current user profile & skills.
- `PUT /api/profile` - Update candidate profile, links, bio, and skills.

---

## 3. Resume Builder & Optimizer
- `POST /api/resumes/upload` - Upload PDF/DOCX resume file (Multer).
- `GET /api/resumes` - List uploaded resumes and versions.
- `GET /api/resumes/:id` - Fetch single resume details.
- `PUT /api/resumes/:id` - Edit parsed resume sections.
- `POST /api/resumes/:id/optimize` - Align resume with target job description.

---

## 4. ATS Score Analyzer
- `POST /api/ats/analyze` - Run TF-IDF Cosine Match between resume & job description.
  - Body: `{ resumeText, jobTitle, company, jobDescription }`
  - Response: `{ atsScore, matchedKeywords, missingKeywords, suggestions }`

---

## 5. Job Alert & Discovery Engine
- `GET /api/jobs?title=&location=` - Search and filter jobs.
- `GET /api/jobs/:id` - Fetch job posting details.
- `POST /api/jobs/:id/save` - Toggle saving a job posting.

---

## 6. Smart Recruiter Outreach
- `POST /api/outreach/generate` - Lookup recruiter email and generate cold outreach pitch.
- `POST /api/outreach/send` - Confirm and dispatch outreach email (Mock / SMTP).

---

## 7. Video Self-Introduction
- `POST /api/videos/upload` - Upload WebCam video recording (WebM).
- `GET /api/videos` - List candidate's saved video introductions.

---

## 8. Application Tracker & Dashboard
- `GET /api/applications` - List tracked applications with status history.
- `POST /api/applications` - Add new job application entry.
- `PUT /api/applications/:id` - Update status (Saved, Applied, Interview, Selected, Rejected, Withdrawn).
- `DELETE /api/applications/:id` - Delete application record.
- `GET /api/dashboard` - Fetch aggregated metrics, status breakdown, and recent activities.
