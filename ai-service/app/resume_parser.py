import io
import re
from typing import Dict, Any, List, Set, Tuple

def parse_pdf_bytes(file_bytes: bytes) -> str:
    """Extract text content from raw PDF bytes using pypdf. Detects image-only/scanned files."""
    try:
        from pypdf import PdfReader
        pdf_file = io.BytesIO(file_bytes)
        reader = PdfReader(pdf_file)
        text_parts = []
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
        full_text = "\n".join(text_parts).strip()
        if not full_text:
            return "PDF_SCANNED_OR_EMPTY: No selectable text extracted. The PDF may be a scanned image or empty."
        return full_text
    except Exception as e:
        return f"PDF Parse Error: {str(e)}"

def parse_docx_bytes(file_bytes: bytes) -> str:
    """Extract text content from raw DOCX bytes including paragraphs and tables."""
    try:
        import docx
        docx_file = io.BytesIO(file_bytes)
        doc = docx.Document(docx_file)
        full_text = []
        for para in doc.paragraphs:
            if para.text and para.text.strip():
                full_text.append(para.text.strip())
        # Also extract text from tables (often used in resume layouts)
        for table in doc.tables:
            for row in table.rows:
                row_cells = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                if row_cells:
                    full_text.append(" | ".join(row_cells))
        joined = "\n".join(full_text).strip()
        if not joined:
            return "DOCX_EMPTY: No readable text found in DOCX file."
        return joined
    except Exception as e:
        return f"DOCX Parse Error: {str(e)}"

def extract_email(text: str) -> str:
    """Extracts email address from text with trailing dot cleanup."""
    email_match = re.search(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', text)
    return email_match.group(0).rstrip('.') if email_match else ""

def extract_phone_number(text: str) -> str:
    """
    Extracts phone numbers across various international and national formats:
    - (555) 019-2834, 555-019-2834, 555.019.2834, 555 019 2834
    - +1 (555) 019-2834, +1-555-019-2834
    - +91 98765 43210, +44 20 7946 0919, +61 2 9876 5432
    - 01234 567890
    """
    phone_candidates = re.findall(
        r'(?:(?:\+|00)\d{1,3}[-.\s]*)?(?:\(?\d{2,5}\)?[-.\s]*)?\d{3,5}[-.\s]*\d{3,5}(?:[-.\s]*\d{1,4})?',
        text
    )
    for cand in phone_candidates:
        cand_clean = cand.strip()
        digits = re.sub(r'\D', '', cand_clean)
        # Valid phone numbers generally have 7 to 15 digits
        if 7 <= len(digits) <= 15:
            # Avoid matching year ranges like 2021-2026 or pure dates
            if re.match(r'^(?:19|20)\d{2}[-.\s]*(?:19|20)\d{2}$', cand_clean):
                continue
            return cand_clean
    return ""

def extract_linkedin_url(text: str) -> str:
    """Matches full and partial LinkedIn URLs, handles dots, hyphens, and slashes."""
    match = re.search(r'(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:in|pub)\/([a-zA-Z0-9_.-]+)', text, re.IGNORECASE)
    if match:
        username = match.group(1).rstrip('/')
        return f"https://linkedin.com/in/{username}"
    return ""

def extract_github_url(text: str) -> str:
    """Matches full and partial GitHub URLs, handles dots, hyphens, and slashes."""
    match = re.search(r'(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)', text, re.IGNORECASE)
    if match:
        username = match.group(1).rstrip('/')
        if username.lower() not in ['pricing', 'features', 'enterprise', 'explore', 'contact']:
            return f"https://github.com/{username}"
    return ""

def extract_skills_from_section(section_lines: List[str]) -> List[str]:
    """
    Parses candidate's actual listed skills from the Skills section lines.
    Handles commas, bullets, pipes, semicolons, and category headers like 'Languages: Python, Go'.
    """
    skills = []
    seen = set()

    for line in section_lines:
        clean_line = line.strip()
        if not clean_line:
            continue

        # If line contains category prefix like "Languages: Python, JavaScript" or "Backend - Node, Python"
        if ':' in clean_line:
            clean_line = clean_line.split(':', 1)[1]
        elif ' - ' in clean_line and len(clean_line.split(' - ')[0]) < 25:
            clean_line = clean_line.split(' - ', 1)[1]

        # Split on commas, bullets, pipes, semicolons
        tokens = re.split(r'[,|;•·\t\n]+', clean_line)
        for tok in tokens:
            t = tok.strip().strip('-*• ')
            # Filter out empty or too long sentences
            if t and len(t) <= 35 and not t.lower().startswith('etc') and len(t) > 1:
                t_lower = t.lower()
                if t_lower not in seen:
                    seen.add(t_lower)
                    skills.append(t)
    return skills

def extract_structured_resume(raw_text: str) -> Dict[str, Any]:
    """
    Parses unstructured text into a clean resume structure:
    personal_info, summary, skills, education, experience, projects, certifications, achievements
    Preserves candidate's actual facts and never generates fictional experience or credentials.
    Accurately distinguishes genuine absence from extraction status.
    """
    if not raw_text or not raw_text.strip():
        return {
            "personal_info": {"full_name": "", "email": "", "phone": "", "location": "", "linkedin_url": "", "github_url": ""},
            "summary": "",
            "skills": [],
            "education": [],
            "experience": [],
            "projects": [],
            "certifications": [],
            "achievements": [],
            "raw_text": "",
            "extraction_metadata": {
                "word_count": 0,
                "is_empty": True,
                "fields_detected": [],
                "fields_absent": ["full_name", "email", "phone", "skills", "experience", "education"]
            }
        }

    # 1. Contact Information Extraction
    email_match = re.search(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', raw_text)
    email = email_match.group(0).rstrip('.') if email_match else ""
    phone = extract_phone_number(raw_text)
    linkedin_url = extract_linkedin_url(raw_text)
    github_url = extract_github_url(raw_text)

    # 2. Section Partitioning
    lines = [line.strip() for line in raw_text.split('\n') if line.strip()]

    # Infer candidate name from top lines (avoid emails/phones/URLs/common headings)
    name = ""
    for line in lines[:6]:
        l_low = line.lower()
        if (
            "@" not in line
            and not re.search(r'\d{5,}', line)
            and len(line) < 40
            and not any(kw in l_low for kw in [
                'resume', 'curriculum', 'vitae', 'page', 'email', 'phone', 'linkedin.com', 'github.com',
                'summary', 'experience', 'education', 'skills', 'objective', 'profile'
            ])
            and not line.startswith('http')
        ):
            # Clean up trailing pipes/bullets if any
            name = line.split('|')[0].split('•')[0].strip()
            if name:
                break

    # Section Headers Mapping (normalized lowercase)
    SECTION_SYNONYMS = {
        'summary': [
            'summary', 'professional summary', 'executive summary', 'profile', 'professional profile',
            'about me', 'career objective', 'objective', 'summary of qualifications'
        ],
        'experience': [
            'experience', 'work experience', 'employment history', 'work history',
            'professional experience', 'internships', 'employment', 'relevant experience', 'career history'
        ],
        'education': [
            'education', 'academic background', 'qualifications', 'education & credentials',
            'education and training', 'academic qualifications', 'degrees', 'academics'
        ],
        'skills': [
            'skills', 'technical skills', 'core competencies', 'technologies', 'expertise',
            'skills & abilities', 'technical proficiencies', 'key skills', 'competencies', 'programming skills'
        ],
        'projects': [
            'projects', 'key projects', 'technical projects', 'personal projects',
            'selected projects', 'academic projects'
        ],
        'certifications': [
            'certifications', 'licenses', 'courses', 'certifications & licenses',
            'certifications and licenses', 'professional certifications', 'certificates'
        ],
        'achievements': [
            'achievements', 'awards', 'honors', 'accomplishments', 'honors & awards',
            'awards & achievements', 'recognition'
        ]
    }

    current_section = 'header'
    sections: Dict[str, List[str]] = {
        'header': [],
        'summary': [],
        'experience': [],
        'education': [],
        'skills': [],
        'projects': [],
        'certifications': [],
        'achievements': []
    }

    for line in lines:
        # Normalize line for header detection
        norm_line = re.sub(r'^[#*\-•\d.]+\s*', '', line)  # remove leading markdown, bullets, numbers
        norm_line = norm_line.strip(':').strip('-').strip().lower()

        matched_section = None
        for sec, synonyms in SECTION_SYNONYMS.items():
            if norm_line in synonyms:
                matched_section = sec
                break

        if matched_section:
            current_section = matched_section
        else:
            sections[current_section].append(line)

    # 3. Summary
    summary_text = " ".join(sections['summary']).strip()
    if not summary_text and sections['header']:
        # Header body lines after candidate name
        header_body = [
            l for l in sections['header']
            if l != name and "@" not in l and "github.com" not in l and "linkedin.com" not in l and len(l) > 20
        ]
        if header_body:
            summary_text = " ".join(header_body[:2]).strip()

    # 4. Skills: Combine candidate's listed skills with technical keyword detections
    candidate_skills = extract_skills_from_section(sections['skills'])
    from app.ats_analyzer import extract_tech_keywords
    known_tech = extract_tech_keywords(raw_text)

    # Merge preserving order and unique names
    all_skills = []
    seen_skills = set()
    for s in candidate_skills:
        s_clean = s.strip()
        if s_clean.lower() not in seen_skills:
            seen_skills.add(s_clean.lower())
            all_skills.append(s_clean)
    for s in known_tech:
        if s.lower() not in seen_skills:
            seen_skills.add(s.lower())
            all_skills.append(s)

    # 5. Education Parsing
    education_list = []
    if sections['education']:
        curr_edu = {}
        degree_keywords = [
            'bachelor', 'master', 'phd', 'doctorate', 'b.s.', 'b.a.', 'm.s.', 'm.a.',
            'b.tech', 'm.tech', 'degree', 'diploma', 'associate', 'bba', 'mba', 'b.c.a.', 'm.c.a.'
        ]
        for l in sections['education']:
            l_lower = l.lower()
            year_match = re.search(r'\b(20\d{2}|19\d{2})\b', l)
            is_degree_line = any(dk in l_lower for dk in degree_keywords)

            if is_degree_line or not curr_edu:
                if curr_edu:
                    education_list.append(curr_edu)
                curr_edu = {"degree": l, "institution": "", "year": year_match.group(0) if year_match else ""}
            else:
                if not curr_edu.get("institution"):
                    curr_edu["institution"] = l
                elif not curr_edu.get("year") and year_match:
                    curr_edu["year"] = year_match.group(0)
                else:
                    curr_edu["institution"] = f"{curr_edu['institution']}, {l}"
        if curr_edu:
            education_list.append(curr_edu)

    # 6. Experience Parsing
    experience_list = []
    if sections['experience']:
        curr_exp = None
        date_pattern = r'\b(?:20\d{2}|19\d{2}|present|current|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b'
        
        for l in sections['experience']:
            has_date = bool(re.search(date_pattern, l, re.IGNORECASE))
            is_bullet = l.startswith('-') or l.startswith('•') or l.startswith('*') or re.match(r'^\d+\.', l)

            if not curr_exp:
                curr_exp = {
                    "role": l.split('|')[0].strip(),
                    "company": l.split('|')[1].strip() if '|' in l else "",
                    "duration": l if has_date and '|' not in l else "",
                    "description": ""
                }
            elif has_date and not curr_exp.get("duration") and len(l) < 45 and not is_bullet:
                curr_exp["duration"] = l.strip()
            elif not is_bullet and len(l) < 65 and not curr_exp.get("description") and ('|' in l or ' at ' in l or ' - ' in l):
                experience_list.append(curr_exp)
                curr_exp = {
                    "role": l.split('|')[0].strip(),
                    "company": l.split('|')[1].strip() if '|' in l else "",
                    "duration": "",
                    "description": ""
                }
            else:
                desc_line = l.lstrip('-•* \t').strip()
                if desc_line:
                    curr_exp["description"] += ("\n" + desc_line if curr_exp["description"] else desc_line)

        if curr_exp:
            experience_list.append(curr_exp)

    # 7. Projects Parsing
    projects_list = []
    if sections['projects']:
        curr_proj = {}
        for l in sections['projects']:
            is_bullet = l.startswith('-') or l.startswith('•') or l.startswith('*')
            if not curr_proj or (not is_bullet and len(l) < 50 and not curr_proj.get("description")):
                if curr_proj:
                    projects_list.append(curr_proj)
                curr_proj = {"title": l.strip('-•* '), "description": "", "tech_stack": []}
            else:
                desc_line = l.lstrip('-•* ').strip()
                if desc_line:
                    curr_proj["description"] += (" " + desc_line if curr_proj["description"] else desc_line)
        if curr_proj:
            projects_list.append(curr_proj)

    # 8. Certifications & Achievements
    certifications = [l.strip('-•* ') for l in sections['certifications'] if len(l.strip()) > 2]
    achievements = [l.strip('-•* ') for l in sections['achievements'] if len(l.strip()) > 2]

    # Location heuristic from header if present
    location = ""
    for hl in sections['header']:
        if any(state in hl for state in [", CA", ", NY", ", TX", ", WA", ", FL", "Remote", "USA", "United States", "San Francisco", "New York"]):
            location = hl.split('|')[0].strip()
            break

    # Build detection and absent metadata
    fields_detected = []
    fields_absent = []

    if name: fields_detected.append("full_name")
    else: fields_absent.append("full_name")

    if email: fields_detected.append("email")
    else: fields_absent.append("email")

    if phone: fields_detected.append("phone")
    else: fields_absent.append("phone")

    if linkedin_url: fields_detected.append("linkedin_url")
    else: fields_absent.append("linkedin_url")

    if all_skills: fields_detected.append("skills")
    else: fields_absent.append("skills")

    if experience_list: fields_detected.append("experience")
    else: fields_absent.append("experience")

    if education_list: fields_detected.append("education")
    else: fields_absent.append("education")

    word_count = len(re.findall(r'\b[a-zA-Z0-9_-]+\b', raw_text))

    return {
        "personal_info": {
            "full_name": name,
            "email": email,
            "phone": phone,
            "location": location,
            "linkedin_url": linkedin_url,
            "github_url": github_url
        },
        "summary": summary_text,
        "skills": all_skills,
        "education": education_list,
        "experience": experience_list,
        "projects": projects_list,
        "certifications": certifications,
        "achievements": achievements,
        "raw_text": raw_text,
        "extraction_metadata": {
            "word_count": word_count,
            "is_empty": False,
            "fields_detected": fields_detected,
            "fields_absent": fields_absent
        }
    }
