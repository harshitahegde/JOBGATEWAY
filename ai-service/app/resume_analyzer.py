import re
from typing import Dict, Any, List

ACTION_VERBS = {
    "architected", "built", "created", "designed", "developed", "engineered",
    "implemented", "launched", "managed", "optimized", "spearheaded", "automated",
    "scaled", "constructed", "integrated", "refactored", "deployed", "orchestrated",
    "formulated", "established", "directed", "transformed", "streamlined"
}

WEAK_PASSIVE_PHRASES = [
    "responsible for", "worked on", "helped with", "assisted in", "duties included",
    "tasked with", "involved in", "handled", "participated in"
]

def rewrite_bullet_fact_grounded(bullet: str) -> tuple[str, str]:
    """
    Rewrites a bullet point to start with a strong, clean action verb while preserving exact facts.
    Returns (fact_grounded_rewrite, metric_guidance).
    """
    clean_bullet = bullet.strip()
    if not clean_bullet:
        return "", "Insufficient information"

    # Check for metrics in the original bullet
    has_metric = bool(re.search(r'\b(\d+%|\d+\+|\$\d+|\d+\s*users|\d+\s*ms|\d+\s*k|\d+\s*GB|\d+\s*TB|\d+\s*x)\b', clean_bullet, re.IGNORECASE))
    metric_note = "Contains verified numbers" if has_metric else "Add a verified metric if available."

    rewritten = clean_bullet
    
    # Specific passive prefix patterns to clean action verbs
    patterns = [
        (r'^(?:was\s+)?responsible\s+for\s+(?:the\s+)?([a-z]+ing)\b', lambda m: verb_ing_to_ed(m.group(1))),
        (r'^(?:was\s+)?responsible\s+for\s+', ''),
        (r'^worked\s+on\s+(?:the\s+)?([a-z]+ing)\b', lambda m: verb_ing_to_ed(m.group(1))),
        (r'^worked\s+on\s+', 'Developed '),
        (r'^helped\s+with\s+(?:the\s+)?([a-z]+ing)\b', lambda m: 'Contributed to ' + m.group(1)),
        (r'^helped\s+with\s+', 'Contributed to '),
        (r'^assisted\s+in\s+(?:the\s+)?([a-z]+ing)\b', lambda m: 'Assisted with ' + m.group(1)),
        (r'^assisted\s+in\s+', 'Assisted with '),
        (r'^duties\s+included\s+(?:the\s+)?([a-z]+ing)\b', lambda m: verb_ing_to_ed(m.group(1))),
        (r'^duties\s+included\s+', ''),
        (r'^tasked\s+with\s+(?:the\s+)?([a-z]+ing)\b', lambda m: verb_ing_to_ed(m.group(1))),
        (r'^tasked\s+with\s+', ''),
        (r'^involved\s+in\s+(?:the\s+)?([a-z]+ing)\b', lambda m: 'Participated in ' + m.group(1)),
        (r'^involved\s+in\s+', 'Participated in '),
        (r'^handled\s+(?:the\s+)?([a-z]+ing)\b', lambda m: verb_ing_to_ed(m.group(1))),
        (r'^handled\s+', 'Managed ')
    ]

    for pat, repl in patterns:
        if re.search(pat, rewritten, re.IGNORECASE):
            if callable(repl):
                rewritten = re.sub(pat, repl, rewritten, flags=re.IGNORECASE)
            else:
                rewritten = re.sub(pat, repl, rewritten, flags=re.IGNORECASE)
            break

    # Capitalize the first letter if needed
    rewritten = rewritten.strip()
    if rewritten:
        rewritten = rewritten[0].upper() + rewritten[1:]

    return rewritten, metric_note

def verb_ing_to_ed(ing_verb: str) -> str:
    """Converts a present participle (-ing) to past tense (-ed) accurately."""
    w = ing_verb.lower()
    if w == "building": return "Built"
    if w == "creating": return "Created"
    if w == "designing": return "Designed"
    if w == "developing": return "Developed"
    if w == "engineering": return "Engineered"
    if w == "implementing": return "Implemented"
    if w == "managing": return "Managed"
    if w == "optimizing": return "Optimized"
    if w == "writing": return "Wrote"
    if w == "testing": return "Tested"
    if w == "deploying": return "Deployed"
    if w == "maintaining": return "Maintained"
    if w == "configuring": return "Configured"
    if w == "automating": return "Automated"
    if w == "scaling": return "Scaled"
    if w.endswith("ing"):
        return w[:-3] + "ed"
    return ing_verb.capitalize()

def analyze_resume_content(resume_data: Dict[str, Any], raw_text: str, target_job_description: str = "") -> Dict[str, Any]:
    """
    Performs a 3-layer factual analysis of the user's resume:
    1. Extracted Facts (unaltered baseline)
    2. Quality Audit & Actionable Improvement Suggestions
    3. Fact-Grounded Rewrites (action-oriented rephrasings preserving original facts, zero metrics invented)
    """
    raw = raw_text or resume_data.get("raw_text", "")
    p_info = resume_data.get("personal_info", {})
    
    # -------------------------------------------------------------
    # LAYER 1: EXTRACTED FACTS (Factual Baseline)
    # -------------------------------------------------------------
    extracted_facts = {
        "personal_info": {
            "full_name": p_info.get("full_name") or "Not found in resume",
            "email": p_info.get("email") or "Not found in resume",
            "phone": p_info.get("phone") or "Not found in resume",
            "location": p_info.get("location") or "Not found in resume",
            "linkedin_url": p_info.get("linkedin_url") or "Not found in resume",
            "github_url": p_info.get("github_url") or "Not found in resume"
        },
        "summary": resume_data.get("summary") or "Not found in resume",
        "skills": resume_data.get("skills", []),
        "education": resume_data.get("education", []),
        "experience": resume_data.get("experience", []),
        "projects": resume_data.get("projects", []),
        "certifications": resume_data.get("certifications", []),
        "achievements": resume_data.get("achievements", [])
    }

    # -------------------------------------------------------------
    # LAYER 2: RESUME QUALITY AUDIT & SUGGESTIONS
    # -------------------------------------------------------------
    suggestions = []
    missing_info = []
    audit_notes = []

    # 1. Contact Information Audit
    if not p_info.get("email"):
        missing_info.append("Email address: Not found in resume header.")
        suggestions.append("Ensure your primary email address is clearly listed at the top of your resume.")
    if not p_info.get("phone"):
        missing_info.append("Phone number: Not found in resume.")
        suggestions.append("Consider adding a contact phone number for recruiters.")
    if not p_info.get("linkedin_url"):
        missing_info.append("LinkedIn profile: Not found in resume.")
        suggestions.append("Including a LinkedIn profile link helps recruiters verify your professional background.")

    # 2. Word Count & Length Audit
    words = re.findall(r'\b[a-zA-Z0-9_-]+\b', raw)
    word_count = len(words)
    if word_count < 150:
        audit_notes.append(f"Brief resume length detected ({word_count} words).")
        suggestions.append("Your resume text is concise. Consider elaborating on key technical responsibilities and project details.")
    elif word_count > 900:
        audit_notes.append(f"Extended resume length detected ({word_count} words).")
        suggestions.append("Your resume exceeds 900 words. Consider tightening bullet points for maximum readability.")
    else:
        audit_notes.append(f"Optimal resume length ({word_count} words).")

    # 3. Core Section Completeness Audit
    core_sections = []
    if extracted_facts["skills"]:
        core_sections.append("Skills")
    else:
        missing_info.append("Technical Skills section: Not found in resume.")
        suggestions.append("Create a distinct 'Technical Skills' section listing your primary programming languages and frameworks.")

    if extracted_facts["experience"]:
        core_sections.append("Experience")
    else:
        missing_info.append("Work Experience section: Not found in resume.")
        suggestions.append("Include a 'Work Experience' or 'Professional Experience' section with role titles and dates.")

    if extracted_facts["education"]:
        core_sections.append("Education")
    else:
        missing_info.append("Education section: Not found in resume.")
        suggestions.append("List your academic background under an 'Education' section.")

    # 4. Experience Bullet Point & Verb Analysis
    weak_verbs_found = []
    bullets_without_metrics = []
    
    for exp in extracted_facts["experience"]:
        desc = exp.get("description", "")
        if not desc:
            continue
            
        desc_lower = desc.lower()
        for phrase in WEAK_PASSIVE_PHRASES:
            if phrase in desc_lower and phrase not in weak_verbs_found:
                weak_verbs_found.append(phrase)
                
        # Check if numbers/metrics exist in bullet
        has_metric = bool(re.search(r'\b(\d+%|\d+\+|\$\d+|\d+\s*users|\d+\s*ms|\d+\s*k)\b', desc, re.IGNORECASE))
        if not has_metric:
            bullets_without_metrics.append(exp.get("role", "Experience entry"))

    if weak_verbs_found:
        phrases_str = ", ".join([f'"{p}"' for p in weak_verbs_found[:3]])
        suggestions.append(f"Passive phrasing detected ({phrases_str}). Replace passive phrases with strong action verbs (e.g. Engineered, Architected, Developed).")

    if bullets_without_metrics:
        suggestions.append("Some work experience entries lack quantifiable metrics. If you have verified metrics (e.g., user count, query speed, project scope), consider adding them. Otherwise, do not fabricate numbers.")

    quality_score = round(min(100.0, max(20.0, 40.0 + (len(core_sections) * 15.0) + (10.0 if p_info.get("email") else 0) + (10.0 if not weak_verbs_found else 0))), 1)

    quality_audit = {
        "overall_quality_score": quality_score,
        "word_count": word_count,
        "word_count_status": f"{word_count} words detected",
        "core_sections_detected": core_sections,
        "missing_information": missing_info if missing_info else ["No critical contact or section information missing."],
        "audit_notes": audit_notes,
        "improvement_suggestions": suggestions
    }

    # -------------------------------------------------------------
    # LAYER 3: FACT-GROUNDED REWRITES (Zero Metric Invention)
    # -------------------------------------------------------------
    orig_summary = resume_data.get("summary", "")
    rewritten_summary = ""
    if orig_summary and orig_summary.strip():
        rewritten_summary = orig_summary.strip()
        if extracted_facts["skills"]:
            top_sk = ", ".join(extracted_facts["skills"][:5])
            rewritten_summary += f" Core competencies include {top_sk}."
    else:
        rewritten_summary = "Not available (Summary section missing from original resume)."

    bullet_rewrites = []
    for exp in extracted_facts["experience"]:
        role = exp.get("role", "Not found in resume")
        company = exp.get("company", "Not found in resume")
        duration = exp.get("duration", "Not found in resume")
        desc = exp.get("description", "")
        
        if not desc:
            continue
            
        fg_rewrite, metric_note = rewrite_bullet_fact_grounded(desc)
        
        bullet_rewrites.append({
            "role": role,
            "company": company,
            "duration": duration,
            "original_bullet": desc,
            "fact_grounded_rewrite": fg_rewrite,
            "metric_guidance": metric_note
        })

    fact_grounded_rewrites = {
        "original_summary": orig_summary if (orig_summary and orig_summary.strip()) else "Not found in resume",
        "fact_grounded_summary": rewritten_summary,
        "bullet_rewrites": bullet_rewrites,
        "rewriting_rule": "Rewrites use ONLY facts extracted from original resume. Zero fictional skills, metrics, or experience generated."
    }

    # Optional Target Job Gap Analysis
    target_job_gap = None
    if target_job_description and target_job_description.strip():
        from app.ats_analyzer import extract_tech_keywords
        jd_skills = set(extract_tech_keywords(target_job_description))
        res_skills = set(extracted_facts["skills"])
        matched = sorted(list(jd_skills.intersection(res_skills)))
        missing = sorted(list(jd_skills.difference(res_skills)))
        
        target_job_gap = {
            "matched_skills": matched,
            "missing_skills": missing,
            "guidance": "Only add missing skills to your resume if you possess genuine hands-on experience with them."
        }

    return {
        "extracted_facts": extracted_facts,
        "quality_audit": quality_audit,
        "fact_grounded_rewrites": fact_grounded_rewrites,
        "target_job_gap": target_job_gap
    }
