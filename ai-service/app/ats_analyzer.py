import re
from typing import List, Dict, Any, Set, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# 1. Generic & Stop Words to filter out from keyword matching
GENERIC_WORDS = {
    "developer", "engineer", "software", "experience", "team", "work", "role",
    "building", "candidate", "responsibilities", "qualifications", "position",
    "company", "working", "knowledge", "ability", "strong", "skills", "years",
    "looking", "project", "projects", "management", "opportunity", "solutions",
    "environment", "system", "systems", "applications", "application", "support",
    "development", "requirements", "degree", "field", "related", "duty", "duties",
    "perform", "performing", "plus", "bonus", "must", "have", "preferred", "required",
    "seeking", "professional", "hands-on", "proven", "track", "record", "good",
    "excellent", "communication", "design", "create", "implement", "maintain"
}

# 2. Defensible Explicit Synonym Dictionary (alias -> canonical)
SYNONYM_MAP = {
    "react": "React", "react.js": "React", "reactjs": "React",
    "node": "Node.js", "node.js": "Node.js", "nodejs": "Node.js",
    "express": "Express.js", "express.js": "Express.js", "expressjs": "Express.js",
    "vue": "Vue.js", "vue.js": "Vue.js", "vuejs": "Vue.js",
    "next": "Next.js", "next.js": "Next.js", "nextjs": "Next.js",
    "postgres": "PostgreSQL", "postgresql": "PostgreSQL",
    "mongo": "MongoDB", "mongodb": "MongoDB",
    "k8s": "Kubernetes", "kubernetes": "Kubernetes",
    "aws": "AWS", "amazon web services": "AWS",
    "gcp": "GCP", "google cloud platform": "GCP",
    "azure": "Azure", "microsoft azure": "Azure",
    "ci/cd": "CI/CD", "cicd": "CI/CD", "continuous integration": "CI/CD",
    "rest": "REST API", "rest api": "REST API", "restful api": "REST API",
    "graphql": "GraphQL",
    "js": "JavaScript", "javascript": "JavaScript",
    "ts": "TypeScript", "typescript": "TypeScript",
    "py": "Python", "python": "Python",
    "go": "Go", "golang": "Go",
    "java": "Java",
    "c": "C",
    "c#": "C#", "csharp": "C#",
    "c++": "C++", "cpp": "C++",
    "html": "HTML", "html5": "HTML",
    "css": "CSS", "css3": "CSS",
    "tailwind": "Tailwind CSS", "tailwind css": "Tailwind CSS",
    "bootstrap": "Bootstrap",
    "docker": "Docker",
    "git": "Git", "github": "Git", "gitlab": "Git",
    "sql": "SQL", "mysql": "MySQL", "redis": "Redis",
    "scikit-learn": "Scikit-Learn", "sklearn": "Scikit-Learn",
    "tensorflow": "TensorFlow", "pytorch": "PyTorch",
    "pandas": "Pandas", "numpy": "NumPy",
    "jira": "Jira", "agile": "Agile", "scrum": "Scrum",
    "jest": "Jest", "cypress": "Cypress", "webpack": "Webpack", "vite": "Vite"
}

ENGLISH_STOP_WORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't",
    "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can't",
    "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during",
    "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't", "have", "haven't", "having",
    "he", "he'd", "he'll", "he's", "her", "here", "here's", "hers", "herself", "him", "himself", "his", "how",
    "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's", "its", "itself",
    "let's", "me", "more", "most", "mustn't", "my", "myself", "no", "nor", "not", "of", "off", "on", "once",
    "only", "or", "other", "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "shan't", "she",
    "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such", "than", "that", "that's", "the",
    "their", "theirs", "them", "themselves", "then", "there", "there's", "these", "they", "they'd", "they'll",
    "they're", "they've", "this", "those", "through", "to", "too", "under", "until", "up", "very", "was", "wasn't",
    "we", "we'd", "we'll", "we're", "we've", "were", "weren't", "what", "what's", "when", "when's", "where",
    "where's", "which", "while", "who", "who's", "whom", "why", "why's", "with", "won't", "would", "wouldn't",
    "you", "you'd", "you'll", "you're", "you've", "your", "yours", "yourself", "yourselves"
}

def extract_ngrams(text: str) -> List[str]:
    tokens = [w for w in re.findall(r'\b[a-zA-Z0-9_.#-]+\b', text.lower()) if len(w) > 1 and w not in GENERIC_WORDS and w not in ENGLISH_STOP_WORDS]
    ngrams = list(tokens)
    for i in range(len(tokens) - 1):
        ngrams.append(f"{tokens[i]} {tokens[i+1]}")
    return ngrams

def compute_tfidf_cosine_sim(text1: str, text2: str) -> float:
    import math
    ngrams1 = extract_ngrams(text1)
    ngrams2 = extract_ngrams(text2)
    if not ngrams1 or not ngrams2:
        return 0.0
    tf1 = {}
    for t in ngrams1: tf1[t] = tf1.get(t, 0) + 1
    tf2 = {}
    for t in ngrams2: tf2[t] = tf2.get(t, 0) + 1
    vocab = set(tf1.keys()).union(set(tf2.keys()))
    dot_product = 0.0
    norm1_sq = 0.0
    norm2_sq = 0.0
    for t in vocab:
        c1 = tf1.get(t, 0)
        c2 = tf2.get(t, 0)
        df = (1 if c1 > 0 else 0) + (1 if c2 > 0 else 0)
        idf = math.log(3.0 / (1.0 + df)) + 1.0
        v1 = c1 * idf
        v2 = c2 * idf
        dot_product += v1 * v2
        norm1_sq += v1 * v1
        norm2_sq += v2 * v2
    if norm1_sq == 0 or norm2_sq == 0:
        return 0.0
    sim = dot_product / (math.sqrt(norm1_sq) * math.sqrt(norm2_sq))
    return round(sim, 4)

def extract_tech_keywords(text: str) -> List[str]:
    """
    Extract recognized technical skills using exact boundary matching and defensible synonym resolution.
    Strictly keeps Java != JavaScript, C != C++, etc.
    """
    if not text:
        return []
    text_lower = text.lower()
    found: Dict[str, str] = {}
    
    for alias, canonical in SYNONYM_MAP.items():
        escaped = re.escape(alias)
        pattern = r'(?<![a-zA-Z0-9_])' + escaped + r'(?![a-zA-Z0-9_])'
        
        if re.search(pattern, text_lower):
            # Special strict non-equivalence checks
            if alias == "js":
                if re.search(r'(?<![a-zA-Z0-9_.])js(?![a-zA-Z0-9_])', text_lower):
                    found[canonical] = canonical
            elif alias == "java":
                # Ensure word is 'java' and not substring of 'javascript'
                if re.search(r'\bjava\b', text_lower) and not re.search(r'\bjavascript\b', text_lower):
                    found[canonical] = canonical
            elif alias == "c":
                if re.search(r'\bc\b', text_lower) and not re.search(r'\b(c\+\+|c#|cpp|csharp)\b', text_lower):
                    found[canonical] = canonical
            elif alias == "go":
                if re.search(r'\b(go|golang)\b', text_lower):
                    found[canonical] = canonical
            else:
                found[canonical] = canonical

    return sorted(list(found.keys()))

extract_keywords = extract_tech_keywords

def parse_jd_sections(job_description: str) -> Tuple[List[str], List[str], List[str]]:
    """
    Parses Job Description into Required Skills, Preferred Skills, and All Tech Keywords.
    """
    lines = job_description.split('\n')
    req_lines = []
    pref_lines = []
    general_lines = []
    
    current_mode = 'general'
    
    for line in lines:
        l_lower = line.lower().strip()
        if any(h in l_lower for h in ["required skills", "requirements", "qualifications", "must have", "what you need", "basic qualifications", "who you are"]):
            current_mode = 'req'
            continue
        elif any(h in l_lower for h in ["preferred skills", "preferred qualifications", "preferred", "nice to have", "pluses", "desirable", "bonus points", "additional skills"]):
            current_mode = 'pref'
            continue
            
        if current_mode == 'req':
            req_lines.append(line)
        elif current_mode == 'pref':
            pref_lines.append(line)
        else:
            general_lines.append(line)
            
    req_skills = extract_tech_keywords("\n".join(req_lines))
    pref_skills = extract_tech_keywords("\n".join(pref_lines))
    all_jd_skills = extract_tech_keywords(job_description)
    
    if not req_skills and not pref_skills:
        req_skills = all_jd_skills
        pref_skills = []
    elif req_skills and not pref_skills:
        pref_skills = [s for s in all_jd_skills if s not in req_skills]

    return req_skills, pref_skills, all_jd_skills

def extract_experience_and_education_reqs(job_description: str, resume_text: str, parsed_resume: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Extracts experience & education requirements from JD and checks against actual resume facts.
    Does NOT infer missing data or fabricate matches.
    """
    jd_lower = job_description.lower()
    res_lower = (resume_text or "").lower()
    
    # 1. Experience Check
    exp_match = re.search(r'(\d+)\+?\s*years?(?:\s*of)?\s*(?:experience|work|exp)', jd_lower)
    required_years = int(exp_match.group(1)) if exp_match else None
    
    detected_years = None
    if parsed_resume and parsed_resume.get("experience"):
        years_found = []
        for exp in parsed_resume["experience"]:
            dur = str(exp.get("duration", ""))
            matches = re.findall(r'\b(20\d{2}|19\d{2})\b', dur)
            if len(matches) >= 2:
                y1, y2 = int(matches[0]), int(matches[1])
                years_found.append(abs(y2 - y1))
            elif len(matches) == 1 and any(p in dur.lower() for p in ["present", "current", "now"]):
                y1 = int(matches[0])
                years_found.append(max(0, 2026 - y1))
        if years_found:
            detected_years = sum(years_found)
    elif not parsed_resume:
        # Fallback date search in raw text
        matches = re.findall(r'\b(20\d{2}|19\d{2})\b', res_lower)
        if len(matches) >= 2:
            years = [int(m) for m in matches]
            detected_years = max(years) - min(years)
            
    exp_score = 7.5
    exp_status = "No specific experience duration required"
    if required_years is not None:
        if detected_years is not None:
            if detected_years >= required_years:
                exp_score = 7.5
                exp_status = f"Matched ({detected_years} years detected vs {required_years}+ years required)"
            else:
                exp_score = round((detected_years / required_years) * 7.5, 2)
                exp_status = f"Partial match ({detected_years} years detected vs {required_years}+ years required)"
        else:
            exp_score = 0.0
            exp_status = f"Insufficient Information ({required_years}+ years required, but verifiable work dates were not detected in resume)"
            
    # 2. Education Check
    req_degree = None
    if any(d in jd_lower for d in ["phd", "doctorate"]):
        req_degree = "PhD"
    elif any(d in jd_lower for d in ["master", "m.s.", "mtech", "mba"]):
        req_degree = "Master's"
    elif any(d in jd_lower for d in ["bachelor", "b.s.", "btech", "b.a.", "degree"]):
        req_degree = "Bachelor's"
        
    edu_score = 7.5
    edu_status = "No specific degree level required"
    
    if req_degree:
        res_edu_text = ""
        if parsed_resume and parsed_resume.get("education"):
            res_edu_text = " ".join([str(e) for e in parsed_resume["education"]]).lower()
        else:
            res_edu_text = res_lower
            
        has_degree = False
        if req_degree == "PhD" and any(d in res_edu_text for d in ["phd", "doctorate"]):
            has_degree = True
        elif req_degree == "Master's" and any(d in res_edu_text for d in ["master", "m.s.", "mtech", "mba", "phd", "doctorate"]):
            has_degree = True
        elif req_degree == "Bachelor's" and any(d in res_edu_text for d in ["bachelor", "b.s.", "btech", "b.a.", "degree", "master", "m.s.", "phd"]):
            has_degree = True
            
        if has_degree:
            edu_score = 7.5
            edu_status = f"Matched ({req_degree} degree or equivalent detected)"
        else:
            edu_score = 0.0
            edu_status = f"Not Detected ({req_degree} degree required by job description but not found in resume)"

    return {
        "exp_score": exp_score,
        "edu_score": edu_score,
        "total_exp_edu_score": round(exp_score + edu_score, 2),
        "experience_status": exp_status,
        "education_status": edu_status
    }

def check_resume_completeness(resume_text: str, parsed_resume: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Checks presence of core mandatory resume sections: Skills, Work Experience, Education.
    Does NOT penalize missing optional sections.
    """
    res_lower = (resume_text or "").lower()
    
    detected_sections = []
    missing_core = []
    
    # Skills section
    if (parsed_resume and len(parsed_resume.get("skills", [])) > 0) or any(h in res_lower for h in ["skills", "technical skills", "technologies"]):
        detected_sections.append("Skills")
    else:
        missing_core.append("Skills")
        
    # Experience section
    if (parsed_resume and len(parsed_resume.get("experience", [])) > 0) or any(h in res_lower for h in ["experience", "employment", "work history", "professional experience"]):
        detected_sections.append("Experience")
    else:
        missing_core.append("Experience")
        
    # Education section
    if (parsed_resume and len(parsed_resume.get("education", [])) > 0) or any(h in res_lower for h in ["education", "academic", "qualifications", "degree"]):
        detected_sections.append("Education")
    else:
        missing_core.append("Education")
        
    # Optional sections noted for summary display
    if (parsed_resume and len(parsed_resume.get("projects", [])) > 0) or "projects" in res_lower:
        detected_sections.append("Projects")
    if (parsed_resume and len(parsed_resume.get("certifications", [])) > 0) or "certifications" in res_lower:
        detected_sections.append("Certifications")
    if (parsed_resume and len(parsed_resume.get("summary", "")) > 0) or "summary" in res_lower:
        detected_sections.append("Summary")

    core_count = 3 - len(missing_core)
    score = round((core_count / 3.0) * 15.0, 2)
    
    return {
        "score": score,
        "max_score": 15.0,
        "detected_sections": detected_sections,
        "missing_core_sections": missing_core,
        "details": f"{core_count}/3 core sections detected (Skills, Experience, Education)"
    }

def calculate_ats_score(resume_text: str, job_description: str, parsed_resume: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Computes a 100% deterministic, explainable ATS similarity score using 5 weighted components.
    Zero randomness, zero LLM fabrication.
    """
    if not resume_text or not resume_text.strip():
        return {
            "error": "Resume text is empty or unreadable.",
            "ats_score": 0.0
        }
        
    if not job_description or not job_description.strip():
        return {
            "error": "Job description text is required.",
            "ats_score": 0.0
        }

    words = re.findall(r'\b[a-zA-Z0-9_-]+\b', resume_text)
    if len(words) < 15:
        return {
            "error": f"Resume contains insufficient text (only {len(words)} words detected). Please upload a text-based resume.",
            "ats_score": 0.0
        }

    # Extract skills & keywords
    req_skills, pref_skills, all_jd_skills = parse_jd_sections(job_description)
    resume_skills = set(extract_tech_keywords(resume_text))
    if parsed_resume and parsed_resume.get("skills"):
        resume_skills.update(extract_tech_keywords(" ".join(parsed_resume["skills"])))

    # 1. Required Skills Match (35%)
    matched_req = sorted(list(set(req_skills).intersection(resume_skills)))
    missing_req = sorted(list(set(req_skills).difference(resume_skills)))
    req_score = round((len(matched_req) / len(req_skills)) * 35.0, 2) if req_skills else 35.0

    # 2. Preferred Skills Match (15%)
    matched_pref = sorted(list(set(pref_skills).intersection(resume_skills)))
    missing_pref = sorted(list(set(pref_skills).difference(resume_skills)))
    pref_score = round((len(matched_pref) / len(pref_skills)) * 15.0, 2) if pref_skills else 15.0

    # 3. Keywords & TF-IDF Cosine Similarity (20%)
    matched_kw = sorted(list(set(all_jd_skills).intersection(resume_skills)))
    missing_kw = sorted(list(set(all_jd_skills).difference(resume_skills)))
    keyword_ratio = (len(matched_kw) / max(1, len(all_jd_skills)))

    cosine_sim = compute_tfidf_cosine_sim(resume_text, job_description)
    kw_score = round(((0.5 * keyword_ratio) + (0.5 * cosine_sim)) * 20.0, 2)

    # 4. Experience & Education (15%)
    exp_edu_res = extract_experience_and_education_reqs(job_description, resume_text, parsed_resume)

    # 5. Resume Completeness (15%)
    struct_res = check_resume_completeness(resume_text, parsed_resume)

    # Total Score Calculation
    final_score = round(req_score + pref_score + kw_score + exp_edu_res["total_exp_edu_score"] + struct_res["score"], 1)
    final_score = max(0.0, min(100.0, final_score))

    # Construct Grounded Suggestions
    suggestions = []
    potential_issues = []
    
    if missing_req:
        top_missing = ", ".join(missing_req[:4])
        suggestions.append(f"Required skills missing from resume: {top_missing}. If you genuinely possess experience with these, ensure they are explicitly listed.")
        
    if missing_pref:
        top_pref = ", ".join(missing_pref[:3])
        suggestions.append(f"Preferred skills missing: {top_pref}. Mentioning these (if applicable) can strengthen your application.")
        
    if "Insufficient Information" in exp_edu_res["experience_status"]:
        potential_issues.append("Verifiable work experience dates were not detected in the resume.")
        suggestions.append("Ensure your work experience entries include clear start and end dates (e.g., '2021 - 2023').")
        
    if "Not Detected" in exp_edu_res["education_status"]:
        potential_issues.append("Target degree level was not detected in the resume education section.")
        suggestions.append("Verify that your degree title (e.g. Bachelor's, Master's) is clearly listed in your Education section.")

    if struct_res["missing_core_sections"]:
        missing_str = ", ".join(struct_res["missing_core_sections"])
        potential_issues.append(f"Core resume sections missing: {missing_str}.")

    return {
        "ats_score": final_score,
        "scoring_formula": {
            "required_skills_weight": "35%",
            "preferred_skills_weight": "15%",
            "keywords_weight": "20%",
            "exp_edu_weight": "15%",
            "structure_weight": "15%"
        },
        "breakdown": {
            "required_skills": {
                "score": req_score,
                "max_score": 35.0,
                "matched_count": len(matched_req),
                "total_count": len(req_skills),
                "matched": matched_req,
                "missing": missing_req,
                "details": f"{len(matched_req)}/{len(req_skills)} required skills matched" if req_skills else "No specific required skills section found in JD"
            },
            "preferred_skills": {
                "score": pref_score,
                "max_score": 15.0,
                "matched_count": len(matched_pref),
                "total_count": len(pref_skills),
                "matched": matched_pref,
                "missing": missing_pref,
                "details": f"{len(matched_pref)}/{len(pref_skills)} preferred skills matched" if pref_skills else "No preferred skills explicitly listed"
            },
            "keywords": {
                "score": kw_score,
                "max_score": 20.0,
                "matched_count": len(matched_kw),
                "total_count": len(all_jd_skills),
                "matched": matched_kw,
                "missing": missing_kw,
                "details": f"{len(matched_kw)}/{len(all_jd_skills)} domain tech keywords matched ({round(keyword_ratio * 100, 1)}%)"
            },
            "experience_and_education": {
                "score": exp_edu_res["total_exp_edu_score"],
                "max_score": 15.0,
                "experience_status": exp_edu_res["experience_status"],
                "education_status": exp_edu_res["education_status"],
                "details": "Evaluated experience dates and degree requirements"
            },
            "resume_structure": {
                "score": struct_res["score"],
                "max_score": 15.0,
                "detected_sections": struct_res["detected_sections"],
                "missing_core_sections": struct_res["missing_core_sections"],
                "details": struct_res["details"]
            }
        },
        "matched_keywords": matched_kw,
        "missing_keywords": missing_kw,
        "detected_sections": struct_res["detected_sections"],
        "potential_issues": potential_issues,
        "suggestions": suggestions
    }
