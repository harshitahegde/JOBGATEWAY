from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

from app.ats_analyzer import calculate_ats_score
from app.resume_parser import parse_pdf_bytes, parse_docx_bytes, extract_structured_resume
from app.resume_optimizer import optimize_resume_content
from app.email_generator import generate_recruiter_email

app = FastAPI(
    title="JobGateway AI Service",
    description="Microservice providing ATS scoring, resume parsing, optimization, and email generation.",
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

class OptimizeRequest(BaseModel):
    resume_data: Dict[str, Any]
    target_job_description: str
    target_job_title: str

class EmailGenerateRequest(BaseModel):
    candidate_name: str
    candidate_title: Optional[str] = "Software Developer"
    top_skills: Optional[List[str]] = []
    recruiter_name: Optional[str] = "Hiring Manager"
    company_name: str
    job_title: str
    video_intro_url: Optional[str] = ""

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "JobGateway AI Service"}

@app.post("/ats-score")
def ats_score_endpoint(payload: ATSRequest):
    result = calculate_ats_score(payload.resume_text, payload.job_description)
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
        # Fallback to plain text
        raw_text = contents.decode("utf-8", errors="ignore")
        
    structured_data = extract_structured_resume(raw_text)
    return {
        "filename": file.filename,
        "raw_text": raw_text,
        "parsed_data": structured_data
    }

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
    email_data = generate_recruiter_email(
        candidate_name=payload.candidate_name,
        candidate_title=payload.candidate_title or "Software Developer",
        top_skills=payload.top_skills or [],
        recruiter_name=payload.recruiter_name or "Hiring Manager",
        company_name=payload.company_name,
        job_title=payload.job_title,
        video_intro_url=payload.video_intro_url or ""
    )
    return email_data
