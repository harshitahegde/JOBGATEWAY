# JobGateway: Smart Job Application System

**JobGateway** is an AI-powered smart job application platform engineered for modern job seekers. It features a complete microservice architecture providing resume building, ATS matching analysis, recruiter outreach generation, job discovery, video self-introductions, and centralized application lifecycle tracking.

---

## 🌟 Core Modules

1. **AI Resume Builder**: Upload PDF/DOCX resumes, parse content into structured sections, edit credentials, align with job descriptions without skill fabrication, and export printable PDFs.
2. **ATS Score Analyzer**: Transparent Applicant Tracking System (ATS) matching using **TF-IDF Vectorization & Cosine Similarity**. Computes percentage match scores, highlights matched & missing tech keywords, and presents actionable suggestions.
3. **Smart Email Outreach Engine**: Look up hiring managers and recruiters, generate personalized pitch emails, review content, and send confirmed outreach with optional resume/video attachments.
4. **Job Alert & Discovery Engine**: Filter job postings by title, skills, and location, view requirement match scores, save jobs, and track applications with 1-click.
5. **Video Self-Introduction Studio**: Record 60-second video introductions directly in the browser via HTML5 MediaRecorder, preview playback, and store for recruiter emails.
6. **Application Tracker Dashboard**: Centralized kanban/table tracking job applications across lifecycle stages: `Saved`, `Applied`, `Interview`, `Selected`, `Rejected`, and `Withdrawn`.

---

## 🛠️ Technology Stack

- **Frontend**: Next.js 14, TypeScript, React 18, Tailwind CSS, Lucide Icons, Axios.
- **Backend API**: Node.js, Express.js, TypeScript, REST APIs, JWT Authentication, bcryptjs.
- **Database**: MySQL DDL schema (`database/schema.sql`), Prisma ORM (with zero-setup local SQLite fallback support for instant demo).
- **AI & NLP Microservice**: Python 3.14, FastAPI, scikit-learn (TF-IDF & Cosine Similarity), pypdf, python-docx, spaCy.
- **Mock Provider System**: Controlled via `USE_MOCK_SERVICES=true` in `.env` for zero-cost offline local testing without paid third-party API keys.

---

## 📁 Repository Structure

```
JobGateway/
├── frontend/             # Next.js 14 Web Application
├── backend/              # Node.js + Express TypeScript REST API
├── ai-service/           # Python FastAPI NLP & ATS Microservice
├── database/             # schema.sql (MySQL DDL) & seed.sql
├── uploads/              # Local storage for resumes & videos
├── docs/                 # API Documentation & Architecture Guides
└── README.md             # Project Guide & Viva Documentation
```

---

## 🚀 Quick Setup & How to Run

### Step 1: Install & Start AI Microservice (Python FastAPI)

```bash
cd ai-service
python -m venv venv
# On Windows PowerShell:
.\venv\Scripts\Activate.ps1

pip install -r requirements.txt
uvicorn app.main:app --port 8000 --reload
```
*AI Service will run on `http://localhost:8000`*

---

### Step 2: Install & Start Backend API (Node.js Express)

```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run dev
```
*Backend API will run on `http://localhost:5000`*

---

### Step 3: Install & Start Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```
*Frontend will run on `http://localhost:3000`*

---

## 🗄️ Database Setup (MySQL Configuration)

To run with your local **MySQL Server**:

1. Open MySQL Workbench or MySQL CLI:
   ```sql
   SOURCE database/schema.sql;
   SOURCE database/seed.sql;
   ```
2. In `backend/.env`, set your MySQL connection string:
   ```env
   DATABASE_URL="mysql://root:your_password@localhost:3306/jobgateway_db"
   ```

---

## ⚡ Mock Services (`USE_MOCK_SERVICES=true`)

When `USE_MOCK_SERVICES=true` is set in `backend/.env`:
- **Job Discovery Engine** serves rich mock tech postings.
- **Email Finder** provides simulated recruiter contact details.
- **Email Sender** logs dispatched outreach emails locally without needing paid SMTP keys.
- **AI Service** provides full local TF-IDF computation fallback if FastAPI is offline.

---

## 🧪 Complete End-to-End Demo Workflow for Viva

1. **Register & Login**: Go to `http://localhost:3000/register`, create an account, and log in.
2. **Setup Candidate Profile**: Navigate to `/profile`, enter skills (`React`, `Node.js`, `MySQL`), experience, and social links.
3. **Upload / Build Resume**: Go to `/resume/builder`, upload a PDF resume, or edit sections directly.
4. **Run ATS Analyzer**: Go to `/ats-analyzer`, paste a job description, and view your **TF-IDF ATS Match Score**, matched keywords, and missing skills.
5. **Optimize Resume**: Optimize bullet points to match job description keywords without skill fabrication.
6. **Discover Jobs**: Search jobs under `/jobs`, click **Save Job** or **Track Application**.
7. **Record Video Self-Intro**: Open `/video`, grant webcam access, record a 60s pitch, and upload.
8. **Smart Recruiter Outreach**: Open `/outreach`, find recruiter details, generate pitch email, review body, and click **Confirm & Dispatch**.
9. **Track Status in Dashboard**: View lifecycle stage metrics and update statuses under `/applications`.
