from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

from app.ats_analyzer import calculate_ats_score
from app.resume_parser import parse_pdf_bytes, parse_docx_bytes, extract_structured_resume
from app.resume_optimizer import optimize_resume_content
from app.resume_analyzer import analyze_resume_content
from app.email_generator import generate_recruiter_email

app = FastAPI(
    title="JobGateway AI Service",
    description="Microservice providing ATS scoring, resume parsing, quality analysis, optimization, and email generation.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ATSRequest(BaseModel):
    resume_text: str
    job_description: str
    parsed_resume: Optional[Dict[str, Any]] = None

class OptimizeRequest(BaseModel):
    resume_data: Dict[str, Any]
    target_job_description: str
    target_job_title: str

class AnalyzeResumeRequest(BaseModel):
    resume_data: Dict[str, Any]
    raw_text: Optional[str] = ""
    target_job_description: Optional[str] = ""

class EmailGenerateRequest(BaseModel):
    candidate_name: str
    candidate_title: Optional[str] = "Software Developer"
    top_skills: Optional[List[str]] = []
    recruiter_name: Optional[str] = ""
    recruiter_email: Optional[str] = ""
    company_name: Optional[str] = ""
    job_title: Optional[str] = ""
    video_intro_url: Optional[str] = ""
    outreach_type: Optional[str] = "recruiter_outreach"
    tone: Optional[str] = "professional"
    job_description: Optional[str] = ""
    primary_education: Optional[str] = ""
    primary_experience: Optional[str] = ""
    primary_project: Optional[str] = ""

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "JobGateway AI Service"}

@app.post("/ats-score")
def ats_score_endpoint(payload: ATSRequest):
    result = calculate_ats_score(payload.resume_text, payload.job_description, payload.parsed_resume)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@app.post("/parse-resume")
async def parse_resume_endpoint(file: UploadFile = File(...)):
    contents = await file.read()
    filename = file.filename.lower()
    
    if filename.endswith(".pdf"):
        raw_text = parse_pdf_bytes(contents)
    elif filename.endswith(".docx") or filename.endswith(".doc"):
        raw_text = parse_docx_bytes(contents)
    else:
        raw_text = contents.decode("utf-8", errors="ignore")
        
    if not raw_text or raw_text.startswith("PDF Parse Error") or raw_text.startswith("DOCX Parse Error"):
        raise HTTPException(status_code=400, detail="Failed to parse resume file. Ensure the file is unencrypted and text-readable.")

    structured_data = extract_structured_resume(raw_text)
    return {
        "filename": file.filename,
        "raw_text": raw_text,
        "parsed_data": structured_data
    }

@app.post("/analyze-resume")
def analyze_resume_endpoint(payload: AnalyzeResumeRequest):
    analysis = analyze_resume_content(
        payload.resume_data,
        payload.raw_text or "",
        payload.target_job_description or ""
    )
    return analysis

@app.post("/optimize-resume")
def optimize_resume_endpoint(payload: OptimizeRequest):
    optimized = optimize_resume_content(
        payload.resume_data,
        payload.target_job_description,
        payload.target_job_title
    )
    return optimized

@app.post("/generate-email")
def generate_email_endpoint(payload: EmailGenerateRequest):
    from app.email_generator import generate_fact_grounded_email
    email_data = generate_fact_grounded_email(
        candidate_name=payload.candidate_name,
        top_skills=payload.top_skills or [],
        recruiter_name=payload.recruiter_name or "",
        recruiter_email=payload.recruiter_email or "",
        company_name=payload.company_name or "",
        job_title=payload.job_title or "",
        outreach_type=payload.outreach_type or "recruiter_outreach",
        tone=payload.tone or "professional",
        job_description=payload.job_description or "",
        video_intro_url=payload.video_intro_url or "",
        primary_education=payload.primary_education or "",
        primary_experience=payload.primary_experience or "",
        primary_project=payload.primary_project or ""
    )
    return email_data
