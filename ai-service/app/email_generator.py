import re
from typing import Dict, Any, List, Optional

def find_relevant_match(
    job_description: Optional[str] = "",
    verified_skills: Optional[List[str]] = None,
    experience_items: Optional[List[str]] = None
) -> Optional[str]:
    """
    Identifies at most ONE relevant, truthful skill or domain match between
    the job description and verified resume facts. Never invents claims.
    """
    if not job_description or not job_description.strip():
        return None
    lower_jd = job_description.lower()

    # 1. Check verified skills
    for s in (verified_skills or []):
        if not s or len(s.strip()) < 2:
            continue
        clean = s.strip()
        pattern = r'\b' + re.escape(clean) + r'\b'
        if re.search(pattern, lower_jd, re.IGNORECASE):
            return clean

    # 2. Check key terms from experience titles
    ignored_words = {
        'from', 'with', 'senior', 'junior', 'lead', 'associate',
        'developer', 'engineer', 'manager', 'specialist', 'analyst', 'intern'
    }
    for exp in (experience_items or []):
        if not exp or len(exp.strip()) < 3:
            continue
        words = [w for w in re.split(r'[\s,/-]+', exp) if len(w) > 3 and w.lower() not in ignored_words]
        for w in words:
            pattern = r'\b' + re.escape(w) + r'\b'
            if re.search(pattern, lower_jd, re.IGNORECASE):
                return w

    return None

def generate_fact_grounded_email(
    candidate_name: Optional[str] = "",
    top_skills: Optional[List[str]] = None,
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
    Generates a contextual, professional, editable recruiter outreach email draft.
    Maintains 100% parity with the TypeScript outreach generator.
    
    Personalization rules (in priority order):
    1. Company: If supplied, mention the correct company naturally.
    2. Target role: If supplied, adapt the subject and opening to that role.
    3. Job description: If supplied, identify at most one relevant, truthful reason for interest.
       Use resume facts only if they genuinely support that reason. If no supported match, do not hallucinate.
    4. Recruiter details: Use supplied recruiter's name when available; otherwise use appropriate greeting.
    5. Candidate details: Use actual candidate name and verified information only.
    """
    raw_candidate = (candidate_name or "").strip()
    c_name = "" if raw_candidate.lower() == "candidate" else raw_candidate

    r_name = (recruiter_name or "").strip()
    c_company = (company_name or "").strip()
    j_title = (job_title or "").strip()
    j_desc = (job_description or "").strip()
    o_type = outreach_type or "recruiter_outreach"
    t_style = tone or "professional"
    v_url = (video_intro_url or "").strip()

    # 1. Greeting: never invent recruiter name
    is_generic_rname = not r_name or r_name.lower() in ["recruiter", "hiring team", "hiring manager", "team"]
    if not is_generic_rname:
        greeting = f"Dear {r_name},"
    elif c_company:
        greeting = f"Dear {c_company} Hiring Team,"
    else:
        greeting = "Dear Hiring Team,"

    # 2. Subject Line
    if o_type == "follow_up":
        if j_title and c_company:
            subject = f"Following Up: {j_title} Application at {c_company}"
        elif j_title:
            subject = f"Following Up: {j_title} Application"
        elif c_company:
            subject = f"Following Up: Application with {c_company}"
        else:
            subject = "Following Up: Application Inquiry"
    else:
        if j_title and c_company:
            subject = f"Interest in {j_title} Opportunities at {c_company}"
        elif j_title:
            subject = f"Interest in {j_title} Opportunities"
        elif c_company:
            subject = f"Inquiry: Career Opportunities at {c_company}"
        else:
            subject = "Inquiry: Career Opportunities"

    # 3. Body Construction
    paragraphs = []

    # Opening line
    if o_type == "follow_up":
        paragraphs.append("I hope you are having a productive week.")
    else:
        paragraphs.append("I hope you are doing well.")

    # Purpose / Expression of interest
    if o_type == "follow_up":
        if j_title and c_company:
            paragraphs.append(f"I am following up on my application for the {j_title} role at {c_company} and would appreciate any updates on the hiring timeline.")
        elif j_title:
            paragraphs.append(f"I am following up on my application for the {j_title} role and would appreciate any updates on the hiring timeline.")
        elif c_company:
            paragraphs.append(f"I am following up on my application with {c_company} and would appreciate any updates on the hiring timeline.")
        else:
            paragraphs.append("I am following up on my application submitted previously and would appreciate any updates on the hiring timeline.")
    elif o_type == "referral_request":
        if j_title and c_company:
            paragraphs.append(f"I am reaching out to explore potential {j_title} opportunities at {c_company}.")
        elif c_company:
            paragraphs.append(f"I am reaching out to explore potential career opportunities at {c_company}.")
        else:
            paragraphs.append("I am reaching out to explore potential opportunities where my background might align with your team.")
    else:
        # recruiter_outreach / job_application
        if j_title and c_company:
            paragraphs.append(f"I am writing to express my interest in {j_title} opportunities at {c_company}.")
        elif j_title:
            paragraphs.append(f"I am writing to express my interest in {j_title} opportunities.")
        elif c_company:
            paragraphs.append(f"I am writing to express my interest in suitable opportunities at {c_company}.")
        else:
            paragraphs.append("I am reaching out to express my interest in opportunities where my background might align with your team's needs.")

    # 4. Contextual Job Description & Resume Facts Reasoning
    matched_point = None
    if o_type != "follow_up":
        if j_desc:
            exp_items = [primary_experience] if primary_experience else []
            matched_point = find_relevant_match(j_desc, top_skills or [], exp_items)
            if matched_point:
                paragraphs.append(f"Given my background in {matched_point}, I was particularly drawn to your team's focus and would welcome the opportunity to discuss how my experience aligns with the role.")
            else:
                paragraphs.append("Having reviewed the position requirements, I would welcome the opportunity to discuss how my background and problem-solving focus could support your team's goals.")
        else:
            paragraphs.append("I would welcome the opportunity to discuss any suitable openings.")

        paragraphs.append("I have attached my resume for your consideration.")

    # 5. Video pitch link (ONLY when provided)
    if v_url:
        paragraphs.append(f"I have also included a brief video introduction: {v_url}")

    # 6. Closing
    paragraphs.append("Thank you for your time and consideration. I look forward to hearing from you.")

    # 7. Sign-off
    sign_off = f"Best regards,\n{c_name}" if c_name else "Best regards,"
    full_body = f"{greeting}\n\n" + "\n\n".join(paragraphs) + f"\n\n{sign_off}"

    return {
        "type": o_type,
        "tone": t_style,
        "recipient_name": r_name,
        "recipient_email": recruiter_email or "",
        "company_name": c_company,
        "job_title": j_title,
        "subject": subject,
        "body": full_body,
        "grounded_skills": [matched_point] if matched_point else [],
        "status": "DRAFT",
        "has_video_intro": bool(v_url)
    }

def generate_recruiter_email(
    candidate_name: str,
    candidate_title: str = "",
    top_skills: list = None,
    recruiter_name: str = "",
    company_name: str = "",
    job_title: str = "",
    video_intro_url: str = ""
) -> Dict[str, Any]:
    """Legacy backward-compatible adapter with contextual safety."""
    return generate_fact_grounded_email(
        candidate_name=candidate_name,
        top_skills=top_skills or [],
        recruiter_name=recruiter_name,
        company_name=company_name,
        job_title=job_title,
        video_intro_url=video_intro_url
    )
