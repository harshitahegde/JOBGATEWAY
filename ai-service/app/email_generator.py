from typing import Dict, Any

def generate_recruiter_email(
    candidate_name: str,
    candidate_title: str,
    top_skills: list,
    recruiter_name: str,
    company_name: str,
    job_title: str,
    video_intro_url: str = ""
) -> Dict[str, Any]:
    """
    Generates a high-converting, professional cold outreach email to recruiters.
    """
    greeting = f"Dear {recruiter_name}" if recruiter_name and recruiter_name != "Recruiter" else "Dear Hiring Manager"
    skills_str = ", ".join(top_skills[:3]) if top_skills else "full-stack development and modern web technologies"
    
    video_mention = ""
    if video_intro_url:
        video_mention = f"\n\nI have also recorded a brief 60-second video introduction for your review here: {video_intro_url}"

    subject = f"Application / Expression of Interest: {job_title} - {candidate_name}"
    
    body = (
        f"{greeting},\n\n"
        f"I hope this message finds you well. I am reaching out to express my strong interest in the {job_title} role at {company_name}.\n\n"
        f"As a {candidate_title or 'Software Developer'} with expertise in {skills_str}, I have built robust web applications, designed RESTful services, and delivered scalable database solutions. "
        f"I admire {company_name}'s focus on innovation and would love the opportunity to contribute to your engineering initiatives.\n\n"
        f"Attached to this message is my resume highlighting my relevant experience and technical projects.{video_mention}\n\n"
        f"Thank you for your time and consideration. I would welcome the opportunity for a brief introductory call to discuss how my background aligns with your team's needs.\n\n"
        f"Best regards,\n"
        f"{candidate_name}"
    )

    return {
        "recipient_name": recruiter_name or "Hiring Manager",
        "company_name": company_name,
        "job_title": job_title,
        "subject": subject,
        "body": body,
        "attachments": ["resume.pdf"],
        "has_video_link": bool(video_intro_url)
    }
