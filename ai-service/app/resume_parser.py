import io
import re
from typing import Dict, Any, List

def parse_pdf_bytes(file_bytes: bytes) -> str:
    """Extract text content from raw PDF bytes using pypdf."""
    try:
        from pypdf import PdfReader
        pdf_file = io.BytesIO(file_bytes)
        reader = PdfReader(pdf_file)
        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        return text.strip()
    except Exception as e:
        return f"PDF Parse Error: {str(e)}"

def parse_docx_bytes(file_bytes: bytes) -> str:
    """Extract text content from raw DOCX bytes using python-docx."""
    try:
        import docx
        docx_file = io.BytesIO(file_bytes)
        doc = docx.Document(docx_file)
        full_text = []
        for para in doc.paragraphs:
            if para.text:
                full_text.append(para.text)
        return "\n".join(full_text).strip()
    except Exception as e:
        return f"DOCX Parse Error: {str(e)}"

def extract_structured_resume(raw_text: str) -> Dict[str, Any]:
    """
    Parses unstructured text into a clean resume structure:
    personal_info, summary, skills, education, experience, projects, certifications, achievements
    Preserves candidate's actual facts and never generates fictional experience or credentials.
    """
    if not raw_text or not raw_text.strip():
        return {
            "personal_info": {"full_name": "Candidate", "email": "", "phone": "", "location": "", "linkedin_url": "", "github_url": ""},
            "summary": "",
            "skills": [],
            "education": [],
            "experience": [],
            "projects": [],
            "certifications": [],
            "achievements": [],
            "raw_text": ""
        }

    email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', raw_text)
    phone_match = re.search(r'\(?\+?\d{1,3}\)?[-.\s]?\d{3}[-.\s]?\d{3}[-.\s]?\d{4}', raw_text)
    github_match = re.search(r'github\.com\/[\w\-]+', raw_text, re.IGNORECASE)
    linkedin_match = re.search(r'linkedin\.com\/in\/[\w\-]+', raw_text, re.IGNORECASE)

    # Extract skills
    from app.ats_analyzer import extract_keywords
    extracted_skills = extract_keywords(raw_text)

    lines = [line.strip() for line in raw_text.split('\n') if line.strip()]
    
    # Infer candidate name from top lines (avoid emails/phones/long sentences)
    name = "Candidate"
    for line in lines[:5]:
        if "@" not in line and not re.search(r'\d{5,}', line) and len(line) < 35 and not any(kw in line.lower() for kw in ['resume', 'curriculum', 'page', 'email', 'phone']):
            name = line
            break

    # Section Headers Mapping
    SECTION_HEADERS = {
        'summary': ['summary', 'professional summary', 'profile', 'executive summary', 'objective', 'about me'],
        'experience': ['experience', 'work experience', 'employment history', 'work history', 'professional experience', 'internships'],
        'education': ['education', 'academic background', 'qualifications', 'education & credentials'],
        'skills': ['skills', 'technical skills', 'core competencies', 'technologies', 'expertise'],
        'projects': ['projects', 'key projects', 'technical projects', 'personal projects'],
        'certifications': ['certifications', 'licenses', 'courses', 'certifications & licenses'],
        'achievements': ['achievements', 'awards', 'honors', 'accomplishments', 'honors & awards']
    }

    # Group lines by section
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
        line_clean = line.lower().strip(':').strip('-').strip()
        matched_section = None
        for sec, synonyms in SECTION_HEADERS.items():
            if line_clean in synonyms or any(line_clean == syn for syn in synonyms):
                matched_section = sec
                break
        
        if matched_section:
            current_section = matched_section
        else:
            sections[current_section].append(line)

    # Summary
    summary_text = " ".join(sections['summary'])
    if not summary_text and sections['header']:
        # Use header lines after name if available
        header_body = [l for l in sections['header'] if l != name and "@" not in l and "github.com" not in l and "linkedin.com" not in l]
        summary_text = " ".join(header_body[:3])

    # Education Parsing
    education_list = []
    if sections['education']:
        curr_edu = {}
        for l in sections['education']:
            degree_keywords = ['bachelor', 'master', 'phd', 'b.s.', 'b.a.', 'm.s.', 'b.tech', 'm.tech', 'degree', 'diploma', 'associate']
            if any(dk in l.lower() for dk in degree_keywords) or not curr_edu:
                if curr_edu:
                    education_list.append(curr_edu)
                curr_edu = {"degree": l, "institution": "", "year": ""}
            else:
                if not curr_edu.get("institution"):
                    curr_edu["institution"] = l
                elif not curr_edu.get("year"):
                    curr_edu["year"] = l
        if curr_edu:
            education_list.append(curr_edu)

    # Experience Parsing
    experience_list = []
    if sections['experience']:
        curr_exp = None
        for l in sections['experience']:
            has_date = bool(re.search(r'\b(20\d{2}|19\d{2}|present|current|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b', l, re.IGNORECASE))
            is_bullet = l.startswith('-') or l.startswith('•') or l.startswith('*')
            
            if curr_exp and has_date and not curr_exp['duration'] and len(l) < 40 and not is_bullet:
                curr_exp['duration'] = l
            elif not curr_exp or (not is_bullet and len(l) < 60 and not curr_exp['description'] and not (has_date and curr_exp['role'])):
                if curr_exp:
                    experience_list.append(curr_exp)
                curr_exp = {"role": l, "company": "", "duration": l if has_date else "", "description": ""}
            else:
                desc_line = l.lstrip('-•* ').strip()
                curr_exp["description"] += (" " + desc_line if curr_exp["description"] else desc_line)
        if curr_exp:
            experience_list.append(curr_exp)

    # Projects Parsing
    projects_list = []
    if sections['projects']:
        curr_proj = {}
        for l in sections['projects']:
            if not curr_proj or len(l) < 45:
                if curr_proj:
                    projects_list.append(curr_proj)
                curr_proj = {"title": l, "description": "", "tech_stack": []}
            else:
                curr_proj["description"] += (" " + l if curr_proj["description"] else l)
        if curr_proj:
            projects_list.append(curr_proj)

    return {
        "personal_info": {
            "full_name": name,
            "email": email_match.group(0) if email_match else "",
            "phone": phone_match.group(0) if phone_match else "",
            "location": "",
            "linkedin_url": f"https://{linkedin_match.group(0)}" if linkedin_match else "",
            "github_url": f"https://{github_match.group(0)}" if github_match else ""
        },
        "summary": summary_text,
        "skills": extracted_skills,
        "education": education_list,
        "experience": experience_list,
        "projects": projects_list,
        "certifications": [l for l in sections['certifications'] if len(l) > 2],
        "achievements": [l for l in sections['achievements'] if len(l) > 2],
        "raw_text": raw_text
    }
