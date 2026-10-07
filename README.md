# JobGateway

An integrated, candidate-centric job application management and preparation platform designed to streamline resume optimization, Applicant Tracking System (ATS) analysis, factual recruiter outreach drafting, and database-backed application lifecycle tracking.

## Overview

JobGateway provides modern job seekers with tools to organize and improve their job search workflow:

- **Factual Resume Analysis & Improvement:** 3-layer structural quality audits, missing information detection, and fact-grounded bullet rewrites.
- **Deterministic ATS-Style Scoring:** A 5-component weighted scoring engine comparing resume content against job descriptions with full mathematical transparency.
- **Application Lifecycle Tracking:** Database-backed tracking of real job applications across 7 distinct milestones with full transition audit history.
- **Fact-Grounded Outreach Drafting:** Generator for recruiter outreach, job applications, referral requests, and follow-ups based strictly on verifiable candidate facts.
- **Real Data Dashboard:** Live metrics and activity timeline aggregated directly from the authenticated user's database records.
- **User Data Ownership & Security:** Strict JWT-based session security, bcrypt password hashing, and user-isolated database queries.
- **Video Self-Introduction Studio:** In-browser 60-second webcam recording studio via HTML5 MediaRecorder.
- **Product Scope Note:** JobGateway is designed to assist candidates in preparing, organizing, and optimizing their job search. It does not autonomously apply for jobs, scrape private recruiter directories, or fabricate candidate credentials.

## Key Features

### 1. ATS-Style Match Analyzer

JobGateway features a deterministic, 5-component weighted scoring engine that evaluates resume compatibility against target job descriptions:

**ATS Score**

=  
S_required  
+ S_preferred  
+ S_keywords  
+ S_experience/education  
+ S_structure

- **Required Skills (35%):** Exact token and explicitly defined synonym matching of required technical competencies.
- **Preferred Skills (15%):** Weighted matching of secondary/nice-to-have tools and frameworks.
- **Keywords & TF-IDF Overlap (20%):** Term Frequency-Inverse Document Frequency vector overlap measuring vocabulary alignment.
- **Experience & Education (15%):** Chronological work tenure and degree-level qualification checks.
- **Resume Structure & Completeness (15%):** Section presence (Summary, Skills, Experience, Education) and contact field completeness.

#### Technical Boundaries & Parity

- **Language Boundaries:** Enforces strict non-equivalence guards for programming languages with shared prefixes (e.g., Java does not match JavaScript; C does not match C++ or C#).
- **Python / TypeScript Parity:** Verified 100% mathematical output parity between the Python FastAPI service (scikit-learn) and the standalone TypeScript backend engine.
- **Honest Framing:** This score represents JobGateway's deterministic ATS-style compatibility estimate, not an official evaluation by third-party proprietary ATS vendors (e.g., Workday, Taleo, Greenhouse).

### 2. Resume Quality Audit & Fact-Grounded Rewriter

The resume analysis engine operates on a 3-layer verification model:

- **Layer 1 — Extracted Facts Baseline:** Parses uploaded PDF/DOCX files into structured contact info, technical skills, employment history, education, and projects without alterations.
- **Layer 2 — Quality Audit & Gap Identification:** Evaluates section completeness and highlights missing contact details or sparse descriptions ("Not found in resume").
- **Layer 3 — Fact-Grounded Rewrites:** Generates action-oriented bullet points using the Action Verb + Context + Result pattern based strictly on existing resume content.

#### Anti-Fabrication Guard

- The engine will never invent years of experience, fake metrics (e.g., "improved performance by 40%"), unearned degrees, or unverified technical skills.
- Scanned or image-only PDF documents require digital text or OCR preprocessing.

### 3. Application Tracker

A centralized tracker backed by relational database records belonging to the authenticated user.

- **7 Supported Statuses:** SAVED, APPLIED, ASSESSMENT, INTERVIEW, OFFER, REJECTED, WITHDRAWN.
- **Status Transition Auditing:** Automatically logs every status update to ApplicationStatusHistory with previous status, new status, custom notes, and timestamps.
- **Search & Filters:** Real-time filtering by lifecycle status and keyword search across company names, roles, and notes.

### 4. Smart Outreach & Recruiter Contact

Generates professional communication drafts tailored to specific job opportunities:

**Supported Outreach Types:**

- Recruiter Cold Introduction
- Job Application Message
- Referral Request
- Application Follow-up

**Customizable Tones:** Professional, Concise, Enthusiastic, Confident.

**Fact-Grounded Generation:** Only references technical skills and project details verified in the user's active resume.

**Full User Control:** Every generated field (Recipient, Subject, Body) is fully editable before saving.

**Delivery States:** DRAFT, READY_TO_SEND, SENDING, SENT, FAILED.

#### Honest Email Provider Model

- By default, JobGateway operates in Draft-Only Mode.
- Clicking Send without configured SMTP credentials safely fails with status FAILED and `sentAt: null` rather than fabricating delivery.
- Live dispatch requires valid SMTP server configuration in `backend/.env`.

### 5. Live Data Dashboard

The dashboard provides a live database-backed summary of candidate progress aggregated from database records:

- Total tracked applications and lifecycle stage breakdown.
- Primary resume status, version name, and profile completeness percentage.
- Verified ATS analysis history and average match score.
- Outreach message breakdown (Drafts, Ready to Send, Sent, Failed).
- Recent activity timeline tracking genuine user milestones.
- Quick action shortcuts to the Resume Builder, ATS Analyzer, Application Tracker, and Outreach engine.

### 6. Authentication & Data Ownership

- **Stateless Authentication:** JSON Web Tokens (JWT) signed via HMAC-SHA256 (jsonwebtoken), valid for 7 days.
- **Password Security:** Salted password hashing via bcryptjs (cost factor 10).
- **Tenant Isolation:** All database queries (findFirst, findMany, update, delete) enforce `where: { userId: req.user.userId }`.
- **Protected Endpoints:** Requests with missing tokens return 401 Unauthorized; invalid or cross-tenant requests return 403 Forbidden or 404 Not Found.

### 7. Job Discovery Engine (Current State)

- **Status:** Live third-party job search APIs (e.g., Jooble, Adzuna, RapidAPI) are currently unconfigured.
- **User Experience:** The Jobs page transparently informs users that live external job aggregation is pending, allowing candidates to manually track applications and analyze custom job descriptions in the meantime.

### 8. Video Self-Introduction Studio

Uses the browser's native `navigator.mediaDevices.getUserMedia` and HTML5 MediaRecorder API.

Enables recording, instant local playback, and uploading of 60-second `.webm` video pitches to the backend storage.

## System Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                    Next.js 14 Frontend                      │
│            (React 18, Tailwind CSS, Lucide Icons)           │
│                   http://localhost:3000                     │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / REST API (JWT Bearer)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Express + TypeScript Backend                │
│       (Auth Guard, File Uploads, Route Controllers)         │
│                   http://localhost:5000                     │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
               ▼                               ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│      Prisma ORM Database     │ │   FastAPI Python Service   │
│   (SQLite / MySQL Compatible)│ │  (TF-IDF / ATS Algorithms) │
│       file:./dev.db          │ │   http://localhost:8000    │
└──────────────────────────────┘ └────────────────────────────┘
```

### Component Responsibilities

- **Frontend (`frontend/`):** Client-side UI, client-side route protection, responsive mobile drawer, interactive forms, and live PDF preview rendering.
- **Backend API (`backend/`):** Request validation, JWT authentication middleware, file uploads (Multer), Prisma ORM data persistence, deterministic ATS scoring engine, and email dispatch abstraction.
- **AI / NLP Microservice (`ai-service/`):** Python FastAPI service providing scikit-learn TF-IDF vectorization and cosine similarity calculations.
- **Database (`backend/prisma/`):** Relational data store containing users, profiles, resumes, resume versions, applications, status histories, and outreach records.

## Technology Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Frontend Framework | Next.js (App Router) | 14.1.0 | React web application framework |
| UI Library | React | 18.2.0 | Declarative component UI |
| Styling | Tailwind CSS | 3.4.1 | Utility-first responsive design |
| Icons | Lucide React | 0.344.0 | UI icon components |
| HTTP Client | Axios | 1.6.8 | API communication |
| Backend Framework | Express.js | 4.19.2 | REST API routing and middleware |
| Backend Language | TypeScript | 5.3.3 | Type-safe backend application logic |
| ORM & Database | Prisma Client & SQLite | 5.10.0 | Database modeling and migrations |
| Authentication | JSON Web Tokens & bcryptjs | 9.0.2 / 2.4.3 | Token sessions and password hashing |
| File Parsing | pdf-parse / Multer | 1.1.1 / 1.4.5-lts.1 | Resume upload and text extraction |
| Email Client | Nodemailer | 10.0.12 | SMTP email dispatch abstraction |
| AI / Microservice | FastAPI & Uvicorn | 0.100.0+ / 0.22.0+ | Python NLP microservice |
| Machine Learning | scikit-learn & NumPy | 1.3.0+ / 1.24.0+ | TF-IDF vectorization and matrix math |

## Project Structure

```text
JOBGATEWAY/
├── frontend/                     # Next.js 14 Frontend Application
│   ├── src/
│   │   ├── app/                  # App Router Pages
│   │   │   ├── applications/     # Application Tracker page
│   │   │   ├── ats-analyzer/     # ATS Match Analyzer page
│   │   │   ├── dashboard/        # Central Dashboard page
│   │   │   ├── jobs/             # Job Discovery page
│   │   │   ├── login/            # User Login page
│   │   │   ├── outreach/         # Recruiter Outreach page
│   │   │   ├── profile/          # Candidate Profile page
│   │   │   ├── register/         # User Registration page
│   │   │   ├── resume/           # Resume Builder & Quality Audit
│   │   │   ├── settings/         # System Diagnostics page
│   │   │   └── video/            # Video Self-Intro Studio
│   │   ├── components/            # Reusable UI components (Navigation)
│   │   └── lib/                  # Axios API instance and auth helpers
│   ├── package.json
│   └── tsconfig.json
│
├── backend/                      # Express + TypeScript Backend
│   ├── src/
│   │   ├── middleware/           # Authentication guards (auth.ts)
│   │   ├── providers/            # Email & AI Provider abstractions
│   │   ├── routes/               # Express REST Route Handlers
│   │   │   ├── application.routes.ts
│   │   │   ├── ats.routes.ts
│   │   │   ├── auth.routes.ts
│   │   │   ├── dashboard.routes.ts
│   │   │   ├── job.routes.ts
│   │   │   ├── outreach.routes.ts
│   │   │   ├── profile.routes.ts
│   │   │   ├── resume.routes.ts
│   │   │   └── video.routes.ts
│   │   ├── tests/                # Automated integration & unit test suites
│   │   ├── ats_engine.ts         # Deterministic 5-component scoring engine
│   │   ├── outreach_generator.ts # Fact-grounded email drafting logic
│   │   ├── resume_analyzer_ts.ts # 3-layer quality audit & rewrite engine
│   │   ├── db.ts                 # Prisma database client instance
│   │   └── index.ts              # Express server entry point
│   ├── prisma/
│   │   └── schema.prisma         # Relational database schema
│   ├── package.json
│   └── tsconfig.json
│
├── ai-service/                   # Python FastAPI Microservice
│   ├── app/
│   │   ├── services/             # ATS Engine & NLP analyzers
│   │   └── main.py               # FastAPI application entry point
│   ├── test_ats.py               # Python ATS engine unit tests
│   ├── test_parity.py            # Python vs TypeScript parity tests
│   └── requirements.txt
│
├── database/                     # MySQL DDL Reference Schemas
│   ├── schema.sql
│   └── seed.sql
│
├── uploads/                      # Local storage directory for uploads
└── README.md
```

## Setup & Running Locally

### Prerequisites

- Node.js: v18.x or v20.x
- Python: v3.10+ (optional if using local TypeScript fallback)
- Git

### Step 1: Install & Start AI Microservice (Optional)

```bash
cd ai-service
python -m venv venv
```

**On Windows PowerShell:**

```powershell
.\venv\Scripts\Activate.ps1
```

**On macOS/Linux:**

```bash
source venv/bin/activate
```

```bash
pip install -r requirements.txt
uvicorn app.main:app --port 8000 --reload
```

Runs on `http://localhost:8000` (Backend automatically uses standalone TypeScript engine if offline).

### Step 2: Configure & Start Backend API

```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run dev
```

Backend runs on `http://localhost:5000`.

### Step 3: Install & Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:3000`.

## Environment Variables

### Backend Configuration (`backend/.env`)

| Variable | Requirement | Description | Default / Example |
|---|---|---|---|
| PORT | Required | Express API HTTP port | `5000` |
| DATABASE_URL | Required | Database connection string | `"file:./dev.db"` |
| JWT_SECRET | Required | HMAC-SHA256 secret for signing auth tokens | `"your_secret_key"` |
| AI_SERVICE_URL | Optional | URL of the Python FastAPI microservice | `http://localhost:8000` |
| SMTP_HOST | Optional | Outbound SMTP server hostname for live emails | (Unset = Draft-Only Mode) |
| SMTP_PORT | Optional | Outbound SMTP server port (e.g., 587, 465) | `587` |
| SMTP_USER | Optional | Outbound SMTP username | `user@example.com` |
| SMTP_PASS | Optional | Outbound SMTP password or app password | `secret_password` |
| SMTP_FROM | Optional | Outbound sender email address | `no-reply@jobgateway.local` |

### Frontend Configuration (`frontend/.env.local`)

| Variable | Requirement | Description | Default / Example |
|---|---|---|---|
| NEXT_PUBLIC_API_URL | Required | Base URL for backend REST API endpoints | `http://localhost:5000/api` |

## Testing & Verification

JobGateway includes an extensive suite of automated tests covering end-to-end user journeys, cross-tenant isolation, anti-fabrication enforcement, deterministic ATS mathematical calculations, and edge cases.

### Running Test Suites

```bash
# Run all backend test suites
cd backend
npx ts-node src/tests/test_full_e2e_journey.ts
npx ts-node src/tests/test_edge_cases.ts
npx ts-node src/tests/test_auth_ownership_audit.ts
npx ts-node src/tests/test_fake_mock_audit.ts
npx ts-node src/tests/test_ats_engine.ts
npx ts-node src/tests/test_outreach.ts
npx ts-node src/tests/test_application_tracker.ts
npx ts-node src/tests/test_dashboard_real_data.ts

# Run Python AI unit and parity tests
cd ../ai-service
python test_ats.py
python test_parity.py

# Verify production builds
cd ../backend && npm run build
cd ../frontend && npm run build
```

### Verified Test Results

| Test Suite | File | Verified Pass Rate | Key Validations |
|---|---|---:|---|
| Full E2E User Journey | `test_full_e2e_journey.ts` | 14 / 14 (100%) | Register → Profile → Resume Upload → Audit → ATS → Outreach → Tracker → Dashboard → Auth Guard |
| Edge Cases & Failure Modes | `test_edge_cases.ts` | 21 / 21 (100%) | Token tampering, Unicode safety, skill deduplication, sparse resume text rejection, Multer limits |
| Auth & Data Ownership | `test_auth_ownership_audit.ts` | 28 / 28 (100%) | User A vs User B strict isolation; zero cross-tenant read/write/hijacking leaks |
| Fake / Mock Data Prevention | `test_fake_mock_audit.ts` | 15 / 15 (100%) | Zero fake jobs in DB; unconfigured provider honesty; no hallucinated skills or metrics |
| ATS Scoring Engine | `test_ats_engine.ts` | 16 / 16 (100%) | Mathematical weighting, repeatability, Java vs JS and C vs C++ boundary protections |
| Fact-Grounded Outreach | `test_outreach.ts` | 10 / 10 (100%) | Anti-fabrication check; unconfigured SMTP failure handling (`sentAt: null`) |
| Application Tracker | `test_application_tracker.ts` | 22 / 22 (100%) | Status normalization, 7-status lifecycle transitions, audit history logging |
| Real-Data Dashboard | `test_dashboard_real_data.ts` | 14 / 14 (100%) | Aggregates actual DB records; zero synthetic metrics for new accounts |
| Python ATS Engine | `ai-service/test_ats.py` | 8 / 8 (100%) | Python TF-IDF and keyword matching unit tests |
| Python ↔ TypeScript Parity | `ai-service/test_parity.py` | 10 / 10 (100%) | 100% score parity across 10 realistic evaluation scenarios |
| Backend TypeScript Build | `tsc` | PASS (0 errors) | Full compilation of TypeScript codebase |
| Frontend Production Build | `next build` | PASS (0 errors) | 16 static routes compiled successfully |

## Current Limitations

- **Live External Job Search:** Third-party aggregator APIs (e.g., Jooble, Adzuna) are not connected. The application supports manual application tracking and ATS analysis of user-supplied job descriptions.
- **Email Delivery:** SMTP credentials are unconfigured by default. The outreach module operates in Draft-Only Mode and fails safely if dispatch is attempted without SMTP credentials.
- **Scanned PDF Resumes:** The resume parser reads text-based PDF and DOCX files. Image-only or scanned PDFs require text extraction or OCR prior to analysis.
- **Browser & Device Testing:** Responsive behavior has been reviewed across desktop, tablet, and mobile viewport layouts; automated cross-browser Selenium/Playwright testing is not bundled.

## Honest Product Boundaries

To maintain factual integrity and transparent engineering standards, JobGateway strictly adheres to the following principles:

- **No ATS Compatibility Guarantees:** Computes transparent, deterministic compatibility estimates; does not guarantee selection by proprietary enterprise ATS scanners.
- **No Autonomous Job Applications:** Candidates maintain full agency and review every tracked record and outreach message.
- **No Hallucinated Credentials:** Resume optimization and outreach drafting will never invent skills, metrics, or work history.
- **No False Delivery Confirmations:** Outreach messages are only marked as SENT when a configured SMTP provider confirms successful transmission.
- **No Synthetic Placeholders:** Dashboards and trackers render genuine zeros when a user has no records.

## Security & Privacy

- **Password Security:** Passwords are hashed with salted bcrypt before database persistence.
- **Scoped Tenant Access:** All controller operations enforce database queries scoped to `req.user.userId`.
- **Upload Boundaries:** Strict file size limits (10 MB for resumes, 50 MB for video pitch) and MIME-type validation.
- **Safe Input Handling:** Replaced unprotected JSON parsers with safe JSON parsers to prevent unhandled exceptions.

## Development Status

- JWT Authentication & User Session Management
- Candidate Profile & Technical Skills Management
- PDF/DOCX Resume Upload & Extraction
- 3-Layer Resume Quality Audit & Grounded Rewriter
- Deterministic 5-Component ATS-Style Scoring
- Application Lifecycle Tracker with Audit History
- Fact-Grounded Recruiter Outreach Generator (Draft-Only Mode)
- Live Database-Backed User Dashboard
- HTML5 WebCam Video Self-Introduction Studio
- Python ↔ TypeScript Parity & Automated Test Suite
- Live External Job Search API Integration (Pending API key configuration)
- Production SMTP Delivery Gateway (Pending SMTP credentials)
