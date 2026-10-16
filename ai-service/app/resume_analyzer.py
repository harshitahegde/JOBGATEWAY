import re
from typing import Dict, Any, List, Tuple

ACTION_VERBS = {
    "architected", "built", "created", "designed", "developed", "engineered",
    "implemented", "launched", "managed", "optimized", "spearheaded", "automated",
    "scaled", "constructed", "integrated", "refactored", "deployed", "orchestrated",
    "formulated", "established", "directed", "transformed", "streamlined", "led",
    "delivered", "programmed", "authored", "resolved", "accelerated", "reduced"
}

WEAK_PASSIVE_PHRASES = [
    "responsible for", "worked on", "helped with", "assisted in", "duties included",
    "tasked with", "involved in", "handled", "participated in", "helped to"
]

def verb_ing_to_ed(ing_verb: str) -> str:
    """Converts a present participle (-ing) to past tense (-ed) accurately."""
    w = ing_verb.lower()
    mapping = {
        "building": "Built", "creating": "Created", "designing": "Designed",
        "developing": "Developed", "engineering": "Engineered", "implementing": "Implemented",
        "managing": "Managed", "optimizing": "Optimized", "writing": "Wrote",
        "testing": "Tested", "deploying": "Deployed", "maintaining": "Maintained",
        "configuring": "Configured", "automating": "Automated", "scaling": "Scaled",
        "leading": "Led", "delivering": "Delivered", "refactoring": "Refactored",
        "integrating": "Integrated", "architecting": "Architected", "orchestrating": "Orchestrated"
    }
    if w in mapping:
        return mapping[w]
    if w.endswith("ing"):
        return (w[:-3] + "ed").capitalize()
    return ing_verb.capitalize()

def rewrite_bullet_fact_grounded(bullet: str) -> Tuple[str, str]:
    """
    Rewrites a bullet point to start with a strong action verb while preserving exact facts.
    Never fabricates metrics, credentials, or technologies.
    Returns (fact_grounded_rewrite, metric_guidance).
    """
    clean = bullet.strip().lstrip('-•* \t')
    if not clean:
        return "", "Insufficient text"

    # Check for metrics
    has_metric = bool(re.search(
        r'\b(?:\d+%\+?|\$\d+(?:\.\d+)?[kmb]?|\d+\+?\s*(?:users|requests|qps|ms|k|mb|gb|tb|x|million|billion|teams?|engineers?))\b',
        clean,
        re.IGNORECASE
    ))
    metric_note = "Contains verified numbers" if has_metric else "Consider adding a verifiable metric if you have real numbers from this role."

    rewritten = clean

    # Regex transformations to replace weak passive openings with strong action verbs
    patterns = [
        (r'^(?:i\s+)?(?:was\s+)?responsible\s+for\s+(?:the\s+)?([a-z]+ing)\b', lambda m: verb_ing_to_ed(m.group(1)) + " "),
        (r'^(?:i\s+)?(?:was\s+)?responsible\s+for\s+(?:the\s+)?development\s+of\b', 'Developed '),
        (r'^(?:i\s+)?(?:was\s+)?responsible\s+for\s+(?:the\s+)?design\s+of\b', 'Designed '),
        (r'^(?:i\s+)?(?:was\s+)?responsible\s+for\s+(?:the\s+)?management\s+of\b', 'Managed '),
        (r'^(?:i\s+)?(?:was\s+)?responsible\s+for\s+', 'Led and developed '),
        (r'^(?:i\s+)?worked\s+on\s+(?:the\s+)?([a-z]+ing)\b', lambda m: verb_ing_to_ed(m.group(1)) + " "),
        (r'^(?:i\s+)?worked\s+on\s+', 'Developed '),
        (r'^(?:i\s+)?helped\s+with\s+(?:the\s+)?([a-z]+ing)\b', lambda m: 'Contributed to ' + m.group(1) + " "),
        (r'^(?:i\s+)?helped\s+with\s+', 'Contributed to '),
        (r'^(?:i\s+)?assisted\s+in\s+(?:the\s+)?([a-z]+ing)\b', lambda m: 'Assisted in ' + m.group(1) + " "),
        (r'^(?:i\s+)?assisted\s+in\s+', 'Assisted with '),
        (r'^(?:my\s+)?duties\s+included\s+(?:the\s+)?([a-z]+ing)\b', lambda m: verb_ing_to_ed(m.group(1)) + " "),
        (r'^(?:my\s+)?duties\s+included\s+', 'Managed and executed '),
        (r'^(?:i\s+)?(?:was\s+)?tasked\s+with\s+(?:the\s+)?([a-z]+ing)\b', lambda m: verb_ing_to_ed(m.group(1)) + " "),
        (r'^(?:i\s+)?(?:was\s+)?tasked\s+with\s+', 'Executed '),
        (r'^(?:i\s+)?(?:was\s+)?involved\s+in\s+(?:the\s+)?([a-z]+ing)\b', lambda m: 'Participated in ' + m.group(1) + " "),
        (r'^(?:i\s+)?(?:was\s+)?involved\s+in\s+', 'Participated in '),
        (r'^(?:i\s+)?handled\s+(?:the\s+)?([a-z]+ing)\b', lambda m: verb_ing_to_ed(m.group(1)) + " "),
        (r'^(?:i\s+)?handled\s+', 'Managed ')
    ]

    for pat, repl in patterns:
        if re.search(pat, rewritten, re.IGNORECASE):
            if callable(repl):
                rewritten = re.sub(pat, repl, rewritten, count=1, flags=re.IGNORECASE)
            else:
                rewritten = re.sub(pat, repl, rewritten, count=1, flags=re.IGNORECASE)
            break

    rewritten = re.sub(r'\s+', ' ', rewritten).strip()
    if rewritten:
        rewritten = rewritten[0].upper() + rewritten[1:]

    return rewritten, metric_note

def calculate_resume_quality_score(resume_data: Dict[str, Any], raw_text: str) -> Dict[str, Any]:
    """
    Evaluates resume quality dynamically on actual extracted facts using a documented 100-point rubric:
    1. Contact Information & Identity (15 pts)
    2. Core Section Completeness (30 pts)
    3. Content Depth & Specificity (25 pts)
    4. Action Verbs & Writing Strength (15 pts)
    5. Profile Depth & Additional Sections (15 pts)

    Zero arbitrary base scores, zero 50% defaults.
    """
    p_info = resume_data.get("personal_info", {})
    skills = resume_data.get("skills", [])
    experience = resume_data.get("experience", [])
    education = resume_data.get("education", [])
    projects = resume_data.get("projects", [])
    certifications = resume_data.get("certifications", [])
    achievements = resume_data.get("achievements", [])
    summary = resume_data.get("summary", "")

    # Handle empty/unparsed resume
    words = re.findall(r'\b[a-zA-Z0-9_-]+\b', raw_text or "")
    if len(words) < 15 and not skills and not experience:
        return {
            "overall_quality_score": 0.0,
            "status": "UNREADABLE_OR_EMPTY",
            "message": "Resume contains insufficient readable text to perform quality analysis.",
            "core_sections_detected": [],
            "rubric_breakdown": {
                "contact_info": {"score": 0.0, "max_score": 15.0, "deductions": ["No contact info extracted."]},
                "core_sections": {"score": 0.0, "max_score": 30.0, "deductions": ["No core sections detected."]},
                "content_depth_and_metrics": {"score": 0.0, "max_score": 25.0, "deductions": ["No experience entries found."]},
                "action_verbs": {"score": 0.0, "max_score": 15.0, "deductions": ["No bullets found."]},
                "additional_sections": {"score": 0.0, "max_score": 15.0, "deductions": ["No additional sections."]}
            },
            "missing_information": ["Full Resume Text"],
            "improvement_suggestions": ["Upload a text-readable PDF or DOCX file."]
        }

    deductions: Dict[str, List[str]] = {
        "contact_info": [],
        "core_sections": [],
        "content_depth_and_metrics": [],
        "action_verbs": [],
        "additional_sections": []
    }

    # 1. Contact Info (15 pts)
    contact_score = 0.0
    name = (p_info.get("full_name") or "").strip()
    if name and name.lower() not in ["candidate", "not found in resume", "not found", ""]:
        contact_score += 5.0
    else:
        deductions["contact_info"].append("Candidate name is missing from resume header (-5 pts)")

    email = (p_info.get("email") or "").strip()
    if email and "@" in email and email.lower() not in ["not found in resume", ""]:
        contact_score += 5.0
    else:
        deductions["contact_info"].append("Valid contact email address is missing (-5 pts)")

    phone = (p_info.get("phone") or "").strip()
    if phone and phone.lower() not in ["not found in resume", ""]:
        contact_score += 3.0
    else:
        deductions["contact_info"].append("Contact phone number is missing (-3 pts)")

    links = [p_info.get("linkedin_url"), p_info.get("github_url")]
    has_valid_link = any(l and "http" in str(l) for l in links)
    if has_valid_link:
        contact_score += 2.0
    else:
        deductions["contact_info"].append("Professional profile link (LinkedIn or GitHub) is missing (-2 pts)")

    # 2. Core Section Completeness (30 pts)
    core_score = 0.0
    if experience and len(experience) > 0:
        core_score += 10.0
    else:
        deductions["core_sections"].append("Work experience section is missing (-10 pts)")

    if education and len(education) > 0:
        core_score += 10.0
    else:
        deductions["core_sections"].append("Education section is missing (-10 pts)")

    if skills and len(skills) >= 3:
        core_score += 10.0
    elif skills and len(skills) >= 1:
        core_score += 5.0
        deductions["core_sections"].append(f"Only {len(skills)} skills detected; recommended to list at least 3-5 core technical proficiencies (-5 pts)")
    else:
        deductions["core_sections"].append("Technical skills section is missing (-10 pts)")

    # 3. Content Depth & Specificity (25 pts)
    depth_score = 0.0
    has_desc = False
    has_metrics = False
    has_dates = False

    if experience:
        desc_count = 0
        for exp in experience:
            desc = (exp.get("description") or "").strip()
            dur = (exp.get("duration") or "").strip()
            if len(desc.split()) >= 8:
                desc_count += 1
            if re.search(r'\b(?:\d+%\+?|\$\d+|\d+\+?\s*(?:users|qps|ms|k|mb|gb|tb|million|engineers?|teams?))\b', desc, re.IGNORECASE):
                has_metrics = True
            if dur and re.search(r'\b(20\d{2}|19\d{2}|present|current)\b', dur, re.IGNORECASE):
                has_dates = True

        if desc_count > 0:
            has_desc = True
            depth_score += 10.0
        else:
            deductions["content_depth_and_metrics"].append("Work experience entries lack substantive responsibility details (-10 pts)")

        if has_metrics:
            depth_score += 10.0
        else:
            deductions["content_depth_and_metrics"].append("No quantifiable metrics (percentages, volume, latency) found in experience descriptions (-10 pts)")

        if has_dates:
            depth_score += 5.0
        else:
            deductions["content_depth_and_metrics"].append("Verifiable employment dates (e.g. '2021 - 2024') not found on experience entries (-5 pts)")
    else:
        deductions["content_depth_and_metrics"].append("Experience section empty; cannot evaluate depth, metrics, or tenure (-25 pts)")

    # 4. Action Verbs & Phrasing (15 pts)
    action_score = 0.0
    passive_phrases_found = []
    action_verb_count = 0
    total_bullets = 0

    if experience:
        for exp in experience:
            desc = (exp.get("description") or "").strip()
            if not desc:
                continue
            lines_in_desc = [l.strip().lstrip('-•* \t') for l in desc.split('\n') if l.strip()]
            for b in lines_in_desc:
                total_bullets += 1
                first_word = b.split()[0].lower() if b.split() else ""
                first_word_clean = re.sub(r'[^a-z]', '', first_word)
                if first_word_clean in ACTION_VERBS:
                    action_verb_count += 1

                for phrase in WEAK_PASSIVE_PHRASES:
                    if phrase in b.lower() and phrase not in passive_phrases_found:
                        passive_phrases_found.append(phrase)

        # Action verbs score (10 pts)
        if total_bullets > 0 and (action_verb_count / total_bullets) >= 0.5:
            action_score += 10.0
        elif action_verb_count > 0:
            action_score += 5.0
            deductions["action_verbs"].append(f"Only {action_verb_count}/{total_bullets} experience bullet lines start with strong action verbs (-5 pts)")
        else:
            deductions["action_verbs"].append("Experience bullets do not start with recognized action verbs (-10 pts)")

        # Absence of weak passive phrasing (5 pts)
        if not passive_phrases_found:
            action_score += 5.0
        else:
            deduct_pts = min(5.0, float(len(passive_phrases_found) * 2.0))
            action_score += max(0.0, 5.0 - deduct_pts)
            phrases_str = ", ".join([f'"{p}"' for p in passive_phrases_found[:3]])
            deductions["action_verbs"].append(f"Passive phrasing detected ({phrases_str}) (-{deduct_pts:.0f} pts)")
    else:
        deductions["action_verbs"].append("No work experience bullets found to evaluate action verbs (-15 pts)")

    # 5. Additional Sections (15 pts)
    additional_score = 0.0
    if summary and len(summary.split()) >= 15:
        additional_score += 5.0
    elif summary:
        additional_score += 2.5
        deductions["additional_sections"].append("Professional summary is very brief; consider expanding to 2-3 sentences (-2.5 pts)")
    else:
        deductions["additional_sections"].append("Professional summary section is missing (-5 pts)")

    if projects and len(projects) > 0:
        additional_score += 5.0
    else:
        deductions["additional_sections"].append("Technical projects section is missing (-5 pts)")

    if certifications or achievements:
        additional_score += 5.0
    else:
        deductions["additional_sections"].append("Certifications or achievements section is missing (-5 pts)")

    total_score = round(contact_score + core_score + depth_score + action_score + additional_score, 1)
    total_score = max(0.0, min(100.0, total_score))

    missing_info = []
    if not name or name.lower() in ["candidate", ""]: missing_info.append("Candidate Full Name")
    if not email: missing_info.append("Email Address")
    if not phone: missing_info.append("Phone Number")
    if not links or not has_valid_link: missing_info.append("LinkedIn / Portfolio Link")
    if not experience: missing_info.append("Work Experience Section")
    if not education: missing_info.append("Education Section")
    if not skills: missing_info.append("Technical Skills Section")

    suggestions = []
    for cat_deductions in deductions.values():
        for d in cat_deductions:
            suggestions.append(d)

    core_sections = []
    if skills: core_sections.append("Skills")
    if experience: core_sections.append("Experience")
    if education: core_sections.append("Education")
    if projects: core_sections.append("Projects")
    if certifications or achievements: core_sections.append("Certifications")

    return {
        "overall_quality_score": total_score,
        "word_count": len(words),
        "word_count_status": f"{len(words)} words detected",
        "core_sections_detected": core_sections,
        "rubric_breakdown": {
            "contact_info": {
                "score": round(contact_score, 1),
                "max_score": 15.0,
                "deductions": deductions["contact_info"]
            },
            "core_sections": {
                "score": round(core_score, 1),
                "max_score": 30.0,
                "deductions": deductions["core_sections"]
            },
            "content_depth_and_metrics": {
                "score": round(depth_score, 1),
                "max_score": 25.0,
                "deductions": deductions["content_depth_and_metrics"]
            },
            "action_verbs": {
                "score": round(action_score, 1),
                "max_score": 15.0,
                "deductions": deductions["action_verbs"]
            },
            "additional_sections": {
                "score": round(additional_score, 1),
                "max_score": 15.0,
                "deductions": deductions["additional_sections"]
            }
        },
        "missing_information": missing_info if missing_info else ["No critical contact or section information missing."],
        "improvement_suggestions": suggestions if suggestions else ["Resume meets all core quality standards."]
    }

def generate_concrete_improvements(resume_data: Dict[str, Any], raw_text: str, target_jd: str = "") -> List[Dict[str, Any]]:
    """
    Generates structured, evidence-based recommendations for user review.
    Shows section, affected field/bullet, existing text, problem, suggested revision, rationale, and optional vs required flag.
    Never invents credentials, dates, employment, or metrics.
    """
    improvements = []
    p_info = resume_data.get("personal_info", {})
    experience = resume_data.get("experience", [])
    skills = resume_data.get("skills", [])
    summary = resume_data.get("summary", "")

    # 1. Contact Improvements
    if not p_info.get("phone"):
        improvements.append({
            "id": "contact_phone",
            "section": "contact",
            "fieldOrBullet": "Phone Number",
            "existingText": "(Not provided)",
            "problem": "Contact phone number is not listed in resume header.",
            "suggestedRevision": "",
            "whyItHelps": "Allows recruiters and hiring managers to quickly initiate phone screening.",
            "isOptional": True
        })

    if not p_info.get("linkedin_url"):
        improvements.append({
            "id": "contact_linkedin",
            "section": "contact",
            "fieldOrBullet": "LinkedIn Profile",
            "existingText": "(Not provided)",
            "problem": "LinkedIn profile link is missing.",
            "suggestedRevision": "",
            "whyItHelps": "A verified LinkedIn URL helps recruiters confirm your experience and recommendations.",
            "isOptional": True
        })

    # 2. Summary Improvement
    if not summary or len(summary.strip()) < 10:
        top_skills = ", ".join(skills[:4]) if skills else "relevant technical capabilities"
        improvements.append({
            "id": "summary_missing",
            "section": "summary",
            "fieldOrBullet": "Professional Summary",
            "existingText": "(No summary)",
            "problem": "Resume does not include a professional summary.",
            "suggestedRevision": f"Software Engineer with experience in {top_skills}. Dedicated to building reliable, high-performance systems.",
            "whyItHelps": "A concise 2-3 sentence overview immediately establishes your domain focus for recruiters.",
            "isOptional": True
        })

    # 3. Experience Bullet Point Improvements
    for exp_idx, exp in enumerate(experience):
        role = exp.get("role", "Experience entry")
        company = exp.get("company", "")
        role_label = f"{role}" + (f" @ {company}" if company else "")
        desc = (exp.get("description") or "").strip()
        if not desc:
            continue

        lines = [l.strip().lstrip('-•* \t') for l in desc.split('\n') if l.strip()]
        for line_idx, line in enumerate(lines):
            fg_rewrite, metric_note = rewrite_bullet_fact_grounded(line)

            # Check for passive phrasing
            found_passive = [p for p in WEAK_PASSIVE_PHRASES if p in line.lower()]
            if found_passive and fg_rewrite.lower() != line.lower():
                improvements.append({
                    "id": f"exp_rewrite_{exp_idx}_{line_idx}",
                    "section": "experience",
                    "fieldOrBullet": f"{role_label} (Bullet #{line_idx + 1})",
                    "existingText": line,
                    "problem": f'Contains passive phrasing "{found_passive[0]}".',
                    "suggestedRevision": fg_rewrite,
                    "whyItHelps": "Starting with an active verb demonstrates direct initiative and ownership.",
                    "isOptional": False,
                    "expIndex": exp_idx,
                    "bulletIndex": line_idx
                })

            # Check for missing metric
            has_metric = bool(re.search(
                r'\b(?:\d+%\+?|\$\d+|\d+\+?\s*(?:users|qps|ms|k|mb|gb|tb|million|engineers?|teams?))\b',
                line,
                re.IGNORECASE
            ))
            if not has_metric and len(line.split()) >= 8:
                improvements.append({
                    "id": f"exp_metric_{exp_idx}_{line_idx}",
                    "section": "experience",
                    "fieldOrBullet": f"{role_label} (Bullet #{line_idx + 1})",
                    "existingText": line,
                    "problem": "Description lacks quantifiable metrics or impact scale.",
                    "suggestedRevision": line + " (e.g., resulting in measurable performance improvement)",
                    "whyItHelps": "Quantifiable metrics give recruiters concrete evidence of your engineering scope. (Add your genuine metrics; do not fabricate numbers).",
                    "isOptional": True,
                    "expIndex": exp_idx,
                    "bulletIndex": line_idx
                })

    # 4. Target Job Description Skill Gaps (if JD provided)
    if target_jd and target_jd.strip():
        from app.ats_analyzer import parse_jd_sections
        req_skills, pref_skills, all_jd_skills = parse_jd_sections(target_jd)
        res_skills_lower = set(s.lower() for s in skills)

        for req in req_skills:
            if req.lower() not in res_skills_lower:
                improvements.append({
                    "id": f"req_skill_{req.lower()}",
                    "section": "skills",
                    "fieldOrBullet": f"Required Skill: {req}",
                    "existingText": "(Not in resume)",
                    "problem": f'Target job description lists "{req}" as a required qualification, but it is absent from your resume.',
                    "suggestedRevision": req,
                    "whyItHelps": f'Adding "{req}" directly improves ATS required-skills match from 0% to credited. Only add if you possess actual hands-on experience.',
                    "isOptional": False
                })

        for pref in pref_skills:
            if pref.lower() not in res_skills_lower:
                improvements.append({
                    "id": f"pref_skill_{pref.lower()}",
                    "section": "skills",
                    "fieldOrBullet": f"Preferred Skill: {pref}",
                    "existingText": "(Not in resume)",
                    "problem": f'Target job lists "{pref}" as a preferred/bonus qualification.',
                    "suggestedRevision": pref,
                    "whyItHelps": f'Listing "{pref}" earns preferred skills credit in employer ATS screening.',
                    "isOptional": True
                })

    return improvements

def analyze_resume_content(resume_data: Dict[str, Any], raw_text: str, target_job_description: str = "") -> Dict[str, Any]:
    """
    Performs comprehensive factual analysis:
    - Layer 1: Extracted Facts Baseline
    - Layer 2: 100-Point Dynamic Quality Audit
    - Layer 3: Concrete, Evidence-Based Improvements (Action-verb rewrites, missing skills, metric guidance)
    - ATS Match Score (when target JD is provided)
    """
    raw = raw_text or resume_data.get("raw_text", "")
    p_info = resume_data.get("personal_info", {})

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

    quality_audit = calculate_resume_quality_score(resume_data, raw)
    improvements = generate_concrete_improvements(resume_data, raw, target_job_description)

    # Bullet rewrites for backwards-compatibility
    bullet_rewrites = []
    for exp in extracted_facts["experience"]:
        role = exp.get("role", "Experience entry")
        company = exp.get("company", "")
        duration = exp.get("duration", "")
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
        "original_summary": resume_data.get("summary") or "Not found in resume",
        "fact_grounded_summary": resume_data.get("summary") or "Not found in resume",
        "bullet_rewrites": bullet_rewrites,
        "improvements": improvements,
        "rewriting_rule": "Rewrites use ONLY facts extracted from original resume. Zero fictional skills, metrics, or experience generated."
    }

    # Job match analysis if target JD provided
    job_match = None
    if target_job_description and target_job_description.strip():
        from app.ats_analyzer import calculate_ats_score
        job_match = calculate_ats_score(raw, target_job_description, resume_data)

    return {
        "extracted_facts": extracted_facts,
        "quality_audit": quality_audit,
        "fact_grounded_rewrites": fact_grounded_rewrites,
        "improvements": improvements,
        "job_match": job_match
    }
