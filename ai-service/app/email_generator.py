import re
from typing import Dict, Any, List, Optional

def generate_fact_grounded_email(
    candidate_name: str,
    top_skills: List[str],
    recruiter_name: Optional[str] = "",
    recruiter_email: Optional[str] = "",
    company_name: Optional[str] = "",
    job_title: Optional[str] = "",
    outreach_type: Optional[str] = "recruiter_outreach",
    tone: Optional[str] = "professional",
    job_description: Optional[str] = "",
    video_intro_url: Optional[str] = "",
    primary_education: Optional[str] = "",
    primary_experience: Optional[str] = "",
    primary_project: Optional[str] = ""
) -> Dict[str, Any]:
    """
    Generates a fact-grounded outreach email.
    Guarantees:
    - Never fabricates skills not in top_skills
    - Never invents recruiter or company name
    - Uses neutral professional phrasing with zero hallucinated metrics
    """
    c_name = (candidate_name or "Candidate").strip()
    r_name = (recruiter_name or "").strip()
    c_company = (company_name or "").strip()
    j_title = (job_title or "").strip()
    o_type = outreach_type or "recruiter_outreach"
    t_style = tone or "professional"

    # 1. Greeting: do NOT invent recruiter name
    greeting = f"Dear {r_name}" if r_name and r_name.lower() != "recruiter" else "Dear Hiring Team"

    # 2. Intersect skills with JD if provided
    grounded_skills = []
    if job_description and job_description.strip():
        jd_lower = job_description.lower()
        for s in top_skills:
            if s and s.strip():
                # check if keyword in JD
                pat = r'(?<![a-zA-Z0-9_])' + re.escape(s.lower()) + r'(?![a-zA-Z0-9_])'
                if re.search(pat, jd_lower):
                    grounded_skills.append(s)

    if not grounded_skills and top_skills:
        grounded_skills = [s for s in top_skills if s and s.strip()][:4]

    # 3. Subject
    role_context = f"{j_title} at {c_company}" if (j_title and c_company) else (j_title or (f"Opportunity at {c_company}" if c_company else "Expression of Interest"))
    if o_type == "job_application":
        subject = f"Job Application: {role_context} - {c_name}"
    elif o_type == "referral_request":
        subject = f"Inquiry regarding {role_context} - {c_name}"
    elif o_type == "follow_up":
        subject = f"Following Up: Application for {role_context} - {c_name}"
    else:
        subject = f"Inquiry / Expression of Interest: {role_context} - {c_name}"

    # 4. Body Paragraphs
    body_paragraphs = []

    if o_type == "job_application":
        if c_company and j_title:
            body_paragraphs.append(f"I am writing to express my interest in the {j_title} role at {c_company}.")
        elif j_title:
            body_paragraphs.append(f"I am writing to express my interest in the {j_title} position.")
        elif c_company:
            body_paragraphs.append(f"I am writing to express my interest in engineering opportunities at {c_company}.")
        else:
            body_paragraphs.append("I am reaching out regarding current engineering opportunities with your team.")
    elif o_type == "referral_request":
        body_paragraphs.append(f"I hope this note finds you well. I noticed your team's work at {c_company or 'your company'} and wanted to connect regarding engineering opportunities.")
    elif o_type == "follow_up":
        body_paragraphs.append(f"I hope you are having a productive week. I am following up on my application for the {j_title or 'open'} position{f' at {c_company}' if c_company else ''}.")
    else:
        if c_company and j_title:
            body_paragraphs.append(f"I am reaching out to introduce myself and express interest in the {j_title} opening at {c_company}.")
        elif c_company:
            body_paragraphs.append(f"I am reaching out to introduce myself and inquire about software engineering opportunities at {c_company}.")
        else:
            body_paragraphs.append("I am reaching out to introduce myself and inquire about potential technical roles with your team.")

    # Factual statements
    fact_parts = []
    if primary_education:
        fact_parts.append(f"My background includes {primary_education}")
    if primary_experience:
        fact_parts.append(f"experience as {primary_experience}")

    if grounded_skills:
        skills_str = ", ".join(grounded_skills[:4])
        if fact_parts:
            body_paragraphs.append(f"{', with '.join(fact_parts)}. My practical technical background includes hands-on work with {skills_str}.")
        else:
            body_paragraphs.append(f"My practical technical background includes hands-on work with {skills_str}.")
    elif fact_parts:
        body_paragraphs.append(f"{', with '.join(fact_parts)}.")

    if primary_project:
        body_paragraphs.append(f"Recently, I developed {primary_project}, applying these technologies to build reliable functionality.")

    # Tone adjustments
    if t_style == "enthusiastic" and c_company:
        body_paragraphs.append(f"I closely follow {c_company}'s engineering culture and would value the chance to contribute thoughtfully to your team's upcoming initiatives.")
    elif t_style == "confident":
        body_paragraphs.append("I am confident that my technical foundation and problem-solving focus align well with your team's technical standards.")

    if video_intro_url and video_intro_url.strip():
        body_paragraphs.append(f"To give a quick introduction, I have recorded a brief self-introduction video which you can view here: {video_intro_url.strip()}")

    if o_type == "follow_up":
        body_paragraphs.append("I would welcome the opportunity to provide any additional details that might be helpful. Thank you for your continued time and consideration.")
    else:
        body_paragraphs.append("I have attached my resume for your review. If your schedule allows, I would welcome a brief introductory conversation to learn more about your team's priorities.")

    full_body = f"{greeting},\n\n" + "\n\n".join(body_paragraphs) + f"\n\nSincerely,\n{c_name}"

    return {
        "type": o_type,
        "tone": t_style,
        "recipient_name": r_name,
        "recipient_email": recruiter_email or "",
        "company_name": c_company,
        "job_title": j_title,
        "subject": subject,
        "body": full_body,
        "grounded_skills": grounded_skills,
        "status": "DRAFT",
        "has_video_intro": bool(video_intro_url and video_intro_url.strip())
    }

def generate_recruiter_email(
    candidate_name: str,
    candidate_title: str,
    top_skills: list,
    recruiter_name: str,
    company_name: str,
    job_title: str,
    video_intro_url: str = ""
) -> Dict[str, Any]:
    """Legacy backward-compatible adapter with fact-grounded safety."""
    return generate_fact_grounded_email(
        candidate_name=candidate_name,
        top_skills=top_skills,
        recruiter_name=recruiter_name,
        company_name=company_name,
        job_title=job_title,
        video_intro_url=video_intro_url
    )
