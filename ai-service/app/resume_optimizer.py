from typing import Dict, Any, List
from app.resume_analyzer import rewrite_bullet_fact_grounded

def optimize_resume_content(resume_data: Dict[str, Any], target_job_description: str, target_job_title: str) -> Dict[str, Any]:
    """
    Optimizes resume structure for a target job description without fabricating experience or skills.
    Refines summary phrasing, suggests action-verb bullet enhancements, and prioritizes matching skills while strictly preserving actual facts.
    """
    from app.ats_analyzer import extract_keywords
    
    existing_skills = list(resume_data.get("skills", []))
    target_keywords = extract_keywords(target_job_description) if target_job_description else []
    
    # Matching vs Missing Keywords
    existing_lower = set(s.lower() for s in existing_skills)
    matching_skills = [s for s in existing_skills if s.lower() in set(k.lower() for k in target_keywords)]
    other_skills = [s for s in existing_skills if s.lower() not in set(k.lower() for k in target_keywords)]
    missing_skills = [k for k in target_keywords if k.lower() not in existing_lower]
    
    # Reordered skills prioritizing matching skills first
    optimized_skills = matching_skills + other_skills

    # Optimize summary phrasing for target role without adding fake facts
    original_summary = resume_data.get("summary", "")
    role_title = target_job_title or "Target Role"
    
    if original_summary:
        optimized_summary = f"Targeted {role_title} professional. {original_summary}"
        if matching_skills:
            optimized_summary += f" Key aligned competencies include {', '.join(matching_skills[:4])}."
    else:
        optimized_summary = f"Targeted {role_title} candidate with focus on {', '.join(matching_skills[:4]) if matching_skills else 'relevant technical capabilities'}."

    # Experience: preserve complete original entries and generate suggested_rewrites
    raw_exp = resume_data.get("experience", [])
    optimized_experience = []
    suggested_rewrites = []

    for i, exp in enumerate(raw_exp):
        role = exp.get("role", "")
        company = exp.get("company", "")
        duration = exp.get("duration", "")
        desc = exp.get("description", "")
        
        optimized_experience.append({
            "role": role,
            "company": company,
            "duration": duration,
            "description": desc
        })

        if desc:
            fg_rewrite, metric_note = rewrite_bullet_fact_grounded(desc)
            if fg_rewrite and fg_rewrite.strip().lower() != desc.strip().lower():
                suggested_rewrites.append({
                    "section": "experience",
                    "itemIndex": i,
                    "field": "description",
                    "role": role,
                    "company": company,
                    "original": desc,
                    "suggested": fg_rewrite,
                    "reason": "Replaces passive phrasing with strong action verb while preserving original facts.",
                    "metricGuidance": metric_note
                })

    optimized_data = {
        "personal_info": resume_data.get("personal_info", {}),
        "target_job_title": target_job_title,
        "summary": optimized_summary,
        "skills": optimized_skills,
        "education": resume_data.get("education", []),
        "experience": optimized_experience,
        "projects": resume_data.get("projects", []),
        "certifications": resume_data.get("certifications", []),
        "achievements": resume_data.get("achievements", [])
    }
    if "raw_text" in resume_data:
        optimized_data["raw_text"] = resume_data["raw_text"]

    return {
        "original_content": {
            "personal_info": resume_data.get("personal_info", {}),
            "summary": original_summary,
            "skills": existing_skills,
            "experience": resume_data.get("experience", []),
            "education": resume_data.get("education", []),
            "projects": resume_data.get("projects", []),
            "certifications": resume_data.get("certifications", []),
            "achievements": resume_data.get("achievements", [])
        },
        "optimized_content": optimized_data,
        "matched_skills": matching_skills,
        "missing_keywords": missing_skills,
        "suggested_rewrites": suggested_rewrites,
        "optimization_notes": [
            f"Identified {len(matching_skills)} skills matching target job description.",
            f"Found {len(missing_skills)} missing keywords. Add to skills only if genuine experience exists.",
            "Maintained strict factual accuracy based on user's uploaded resume."
        ]
    }
