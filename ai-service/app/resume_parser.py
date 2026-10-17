import io
import re
import urllib.parse
import zipfile
from typing import Dict, Any, List, Set, Tuple, Optional

KNOWN_PLATFORMS = ['LinkedIn', 'GitHub', 'LeetCode', 'Codeforces', 'HackerRank', 'CodeChef', 'Kaggle', 'GitLab', 'Portfolio']

def unescape_pdf_string(s: str) -> str:
    """Unescapes octal and standard escape sequences in PDF literal strings."""
    def replace_oct(m):
        return chr(int(m.group(1), 8))
    decoded = re.sub(r'\\([0-7]{1,3})', replace_oct, s)
    decoded = (
        decoded.replace('\\n', '\n')
        .replace('\\r', '\r')
        .replace('\\t', '\t')
        .replace('\\b', '\b')
        .replace('\\f', '\f')
        .replace('\\(', '(')
        .replace('\\)', ')')
        .replace('\\\\', '\\')
    )
    return decoded.strip()

def normalize_url(raw_url: str) -> Optional[str]:
    """Cleans, normalizes, and validates URLs from resume documents."""
    if not raw_url or not isinstance(raw_url, str):
        return None
    clean = raw_url.strip()

    # Strip surrounding quotes, angle brackets, parentheses, trailing punctuation
    clean = re.sub(r'^[<"\'\(\[\{\s]+|[>"\'\)\]\}\s.,;:]+$', '', clean)

    if clean.lower().startswith("mailto:"):
        return None

    # Prepend https:// if missing
    if re.match(r'^(?:www\.|[a-zA-Z0-9-]+\.(?:com|org|net|io|dev|me|ai|co|cn|in|app|tech|site|online)\b)', clean, re.IGNORECASE):
        clean = f"https://{clean}"

    try:
        parsed = urllib.parse.urlparse(clean)
        if parsed.scheme not in ["http", "https"]:
            return None
        if not parsed.netloc or ("." not in parsed.netloc and parsed.netloc != "localhost"):
            return None

        # Return canonical normalized URL with trailing slashes stripped
        clean_path = parsed.path.rstrip("/")
        norm = urllib.parse.urlunparse((
            parsed.scheme,
            parsed.netloc,
            clean_path,
            '',
            parsed.query,
            ''
        ))
        return norm
    except Exception:
        return None

def detect_platform_from_url(url: str, anchor_text: str = "") -> Tuple[str, str]:
    """
    Detects platform based on actual destination URL hostname and path.
    Does NOT infer platform merely from anchor text!
    """
    clean_anchor = (anchor_text or "").strip()
    try:
        parsed = urllib.parse.urlparse(url)
        hostname = (parsed.hostname or "").lower()
        pathname = parsed.path
    except Exception:
        m = re.match(r'^(?:https?:\/\/)?([^\/]+)(\/.*)?$', url, re.IGNORECASE)
        hostname = (m.group(1) if m else "").lower()
        pathname = m.group(2) if m and m.group(2) else ""

    # 1. LeetCode
    if "leetcode.com" in hostname or "leetcode.cn" in hostname:
        return "LeetCode", clean_anchor or "LeetCode"

    # 2. LinkedIn
    if "linkedin.com" in hostname:
        return "LinkedIn", clean_anchor or "LinkedIn"

    # 3. GitHub
    if "github.com" in hostname:
        clean_path = pathname.strip("/").lower()
        reserved = ["pricing", "features", "enterprise", "explore", "contact", "about", "topics", "trending", "collections"]
        if clean_path not in reserved:
            return "GitHub", clean_anchor or "GitHub"

    # 4. GitLab
    if "gitlab.com" in hostname:
        return "GitLab", clean_anchor or "GitLab"

    # 5. Codeforces
    if "codeforces.com" in hostname:
        return "Codeforces", clean_anchor or "Codeforces"

    # 6. HackerRank
    if "hackerrank.com" in hostname:
        return "HackerRank", clean_anchor or "HackerRank"

    # 7. CodeChef
    if "codechef.com" in hostname:
        return "CodeChef", clean_anchor or "CodeChef"

    # 8. Kaggle
    if "kaggle.com" in hostname:
        return "Kaggle", clean_anchor or "Kaggle"

    # 9. Portfolio / Personal Website
    is_portfolio = (
        "github.io" in hostname or
        "gitlab.io" in hostname or
        "vercel.app" in hostname or
        "netlify.app" in hostname or
        "pages.dev" in hostname or
        hostname.endswith(".dev") or
        hostname.endswith(".me") or
        hostname.endswith(".site") or
        hostname.endswith(".design") or
        "portfolio" in hostname or
        bool(re.search(r'portfolio|personal\s*site|personal\s*website', clean_anchor, re.IGNORECASE))
    )
    if is_portfolio:
        return "Portfolio", clean_anchor or "Portfolio"

    # 10. Other web link
    return "Other", clean_anchor or hostname or "Web Link"

def extract_pdf_links_bytes(file_bytes: bytes) -> List[Dict[str, Any]]:
    """Extracts link annotations from PDF using pypdf and regex stream fallbacks."""
    links = []
    seen = set()

    # 1. pypdf annotation inspection
    try:
        from pypdf import PdfReader
        pdf_file = io.BytesIO(file_bytes)
        reader = PdfReader(pdf_file)
        for page in reader.pages:
            annots = getattr(page, "annotations", None)
            if annots is None and "/Annots" in page:
                annots = page["/Annots"]

            if annots:
                annot_list = annots.get_object() if hasattr(annots, "get_object") else annots
                if isinstance(annot_list, list):
                    for a_ref in annot_list:
                        a = a_ref.get_object() if hasattr(a_ref, "get_object") else a_ref
                        if isinstance(a, dict):
                            # Link annotation
                            if a.get("/Subtype") == "/Link":
                                action = a.get("/A")
                                if action:
                                    act_obj = action.get_object() if hasattr(action, "get_object") else action
                                    if isinstance(act_obj, dict) and act_obj.get("/S") == "/URI":
                                        raw_uri = str(act_obj.get("/URI", ""))
                                        norm = normalize_url(raw_uri)
                                        if norm and norm.lower() not in seen:
                                            seen.add(norm.lower())
                                            links.append({"url": norm, "source": "annotation"})
                                elif a.get("/URI"):
                                    raw_uri = str(a.get("/URI", ""))
                                    norm = normalize_url(raw_uri)
                                    if norm and norm.lower() not in seen:
                                        seen.add(norm.lower())
                                        links.append({"url": norm, "source": "annotation"})
    except Exception as e:
        pass

    # 2. Raw buffer regex fallback for /URI (...) or /URI <hex>
    try:
        pdf_str = file_bytes.decode('latin1', errors='ignore')
        uri_matches = re.findall(r'/URI\s*(?:\(([^)\r\n]+)\)|<([0-9a-fA-F]+)>)', pdf_str)
        for lit, hx in uri_matches:
            raw_url = ""
            if lit:
                raw_url = unescape_pdf_string(lit)
            elif hx:
                try:
                    raw_url = bytes.fromhex(hx).decode('utf-8', errors='ignore')
                except Exception:
                    pass
            norm = normalize_url(raw_url)
            if norm and norm.lower() not in seen:
                seen.add(norm.lower())
                links.append({"url": norm, "source": "annotation"})
    except Exception:
        pass

    return links

def extract_docx_links_bytes(file_bytes: bytes) -> List[Dict[str, Any]]:
    """Extracts hyperlinks and anchor text from DOCX relationships and document XML."""
    links = []
    seen = set()

    try:
        docx_file = io.BytesIO(file_bytes)
        with zipfile.ZipFile(docx_file, 'r') as z:
            # 1. Read word/_rels/document.xml.rels
            rels_content = ""
            if 'word/_rels/document.xml.rels' in z.namelist():
                rels_content = z.read('word/_rels/document.xml.rels').decode('utf-8', errors='ignore')

            # Map r:id -> target URL
            rel_map = {}
            for m in re.finditer(r'<Relationship\b[^>]*\bId=["\']([^"\']+)["\'][^>]*\bType=["\'][^"\']*hyperlink["\'][^>]*\bTarget=["\']([^"\']+)["\']', rels_content, re.IGNORECASE):
                rel_map[m.group(1)] = m.group(2)
            for m in re.finditer(r'<Relationship\b[^>]*\bTarget=["\']([^"\']+)["\'][^>]*\bId=["\']([^"\']+)["\'][^>]*\bType=["\'][^"\']*hyperlink["\']', rels_content, re.IGNORECASE):
                rel_map[m.group(2)] = m.group(1)

            # 2. Read word/document.xml for visible text
            doc_xml = ""
            if 'word/document.xml' in z.namelist():
                doc_xml = z.read('word/document.xml').decode('utf-8', errors='ignore')

            anchor_map = {}
            for m in re.finditer(r'<w:hyperlink\b[^>]*\br:id=["\']([^"\']+)["\'][^>]*>([\s\S]*?)<\/w:hyperlink>', doc_xml, re.IGNORECASE):
                r_id = m.group(1)
                inner = m.group(2)
                t_texts = re.findall(r'<w:t\b[^>]*>([^<]*)</w:t>', inner, re.IGNORECASE)
                vis = "".join(t_texts).strip()
                if vis:
                    anchor_map[r_id] = vis

            # 3. Assemble
            for r_id, target in rel_map.items():
                norm = normalize_url(target)
                if norm and norm.lower() not in seen:
                    seen.add(norm.lower())
                    label = anchor_map.get(r_id, "")
                    links.append({
                        "url": norm,
                        "label": label or None,
                        "source": "docx_rel"
                    })
    except Exception:
        pass

    return links

def extract_text_urls(text: str) -> List[Dict[str, Any]]:
    """Finds visible web URLs in plain text."""
    if not text:
        return []
    links = []
    seen = set()
    url_pattern = r'(?:https?:\/\/|www\.)[a-zA-Z0-9-._~:/?#\[\]@!$&\'()*+,;=%]+'
    for raw in re.findall(url_pattern, text):
        norm = normalize_url(raw)
        if norm and norm.lower() not in seen:
            seen.add(norm.lower())
            links.append({"url": norm, "source": "text_match"})
    return links

def extract_profile_links(
    embedded_links: List[Dict[str, Any]],
    raw_text: str
) -> Dict[str, Any]:
    """
    Merges and deduplicates destination URLs from embedded annotations and text.
    Strictly never invents profile URLs when only the platform name is mentioned in text!
    """
    visible_links = extract_text_urls(raw_text)
    link_map = {}

    # 1. Embedded links first
    for item in (embedded_links or []):
        norm = normalize_url(item.get("url", ""))
        if not norm:
            continue
        key = norm.lower()
        if key not in link_map:
            platform, label = detect_platform_from_url(norm, item.get("label", ""))
            link_map[key] = {
                "platform": platform,
                "url": norm,
                "label": label,
                "source": item.get("source", "annotation")
            }

    # 2. Visible text URLs
    for item in visible_links:
        norm = normalize_url(item.get("url", ""))
        if not norm:
            continue
        key = norm.lower()
        if key not in link_map:
            platform, label = detect_platform_from_url(norm, item.get("label", ""))
            link_map[key] = {
                "platform": platform,
                "url": norm,
                "label": label,
                "source": "text_match"
            }

    profile_links = list(link_map.values())
    detected_platforms = {l["platform"] for l in profile_links if l["platform"] != "Other"}
    standard_platforms = ["LinkedIn", "GitHub", "LeetCode"]
    missing_platforms = [p for p in standard_platforms if p not in detected_platforms]

    return {
        "profile_links": profile_links,
        "platforms_detected": list(detected_platforms),
        "platforms_missing": missing_platforms
    }

def parse_pdf_bytes(file_bytes: bytes) -> str:
    """Extract text content from raw PDF bytes using pypdf."""
    text, _ = parse_pdf_bytes_with_links(file_bytes)
    return text

def parse_pdf_bytes_with_links(file_bytes: bytes) -> Tuple[str, List[Dict[str, Any]]]:
    """Extract selectable text and link annotations from PDF bytes."""
    links = extract_pdf_links_bytes(file_bytes)
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
            return "PDF_SCANNED_OR_EMPTY: No selectable text extracted. The PDF may be a scanned image or empty.", links
        return full_text, links
    except Exception as e:
        return f"PDF Parse Error: {str(e)}", links

def parse_docx_bytes(file_bytes: bytes) -> str:
    """Extract text content from raw DOCX bytes."""
    text, _ = parse_docx_bytes_with_links(file_bytes)
    return text

def parse_docx_bytes_with_links(file_bytes: bytes) -> Tuple[str, List[Dict[str, Any]]]:
    """Extract selectable text and hyperlinks from DOCX bytes."""
    links = extract_docx_links_bytes(file_bytes)
    try:
        import docx
        docx_file = io.BytesIO(file_bytes)
        doc = docx.Document(docx_file)
        full_text = []
        for para in doc.paragraphs:
            if para.text and para.text.strip():
                full_text.append(para.text.strip())
        for table in doc.tables:
            for row in table.rows:
                row_cells = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                if row_cells:
                    full_text.append(" | ".join(row_cells))
        joined = "\n".join(full_text).strip()
        if not joined:
            return "DOCX_EMPTY: No readable text found in DOCX file.", links
        return joined, links
    except Exception as e:
        return f"DOCX Parse Error: {str(e)}", links

def extract_email(text: str) -> str:
    email_match = re.search(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', text)
    return email_match.group(0).rstrip('.') if email_match else ""

def extract_phone_number(text: str) -> str:
    phone_candidates = re.findall(
        r'(?:(?:\+|00)\d{1,3}[-.\s]*)?(?:\(?\d{2,5}\)?[-.\s]*)?\d{3,5}[-.\s]*\d{3,5}(?:[-.\s]*\d{1,4})?',
        text
    )
    for cand in phone_candidates:
        cand_clean = cand.strip()
        digits = re.sub(r'\D', '', cand_clean)
        if 7 <= len(digits) <= 15:
            if re.match(r'^(?:19|20)\d{2}[-.\s]*(?:19|20)\d{2}$', cand_clean):
                continue
            return cand_clean
    return ""

def extract_linkedin_url(text: str) -> str:
    match = re.search(r'(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:in|pub)\/([a-zA-Z0-9_.-]+)', text, re.IGNORECASE)
    if match:
        username = match.group(1).rstrip('/')
        return f"https://linkedin.com/in/{username}"
    return ""

def extract_github_url(text: str) -> str:
    match = re.search(r'(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)', text, re.IGNORECASE)
    if match:
        username = match.group(1).rstrip('/')
        if username.lower() not in ['pricing', 'features', 'enterprise', 'explore', 'contact']:
            return f"https://github.com/{username}"
    return ""

def extract_skills_from_section(section_lines: List[str]) -> List[str]:
    skills = []
    seen = set()
    for line in section_lines:
        clean_line = line.strip()
        if not clean_line:
            continue
        if ':' in clean_line:
            clean_line = clean_line.split(':', 1)[1]
        elif ' - ' in clean_line and len(clean_line.split(' - ')[0]) < 25:
            clean_line = clean_line.split(' - ', 1)[1]

        tokens = re.split(r'[,|;•·\t\n]+', clean_line)
        for tok in tokens:
            t = tok.strip().strip('-*• ')
            if t and len(t) <= 35 and not t.lower().startswith('etc') and len(t) > 1:
                t_lower = t.lower()
                if t_lower not in seen:
                    seen.add(t_lower)
                    skills.append(t)
    return skills

def extract_structured_resume(
    raw_text: str,
    embedded_links: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Parses unstructured text and extracted links into a structured resume model.
    Guarantees:
    - Never fabricates missing profile URLs
    - Correctly detects platforms based on destination URL
    - Populates profile_links, platforms_detected, platforms_missing
    """
    links_data = extract_profile_links(embedded_links or [], raw_text)
    profile_links = links_data["profile_links"]
    platforms_detected = links_data["platforms_detected"]
    platforms_missing = links_data["platforms_missing"]

    if not raw_text or not raw_text.strip():
        return {
            "personal_info": {
                "full_name": "",
                "email": "",
                "phone": "",
                "location": "",
                "linkedin_url": "",
                "github_url": "",
                "profile_links": profile_links
            },
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
                "fields_absent": ["full_name", "email", "phone", "skills", "experience", "education"],
                "profile_links_count": len(profile_links),
                "platforms_detected": platforms_detected,
                "platforms_missing": platforms_missing,
                "link_extraction_status": "SUCCESS" if profile_links else "NO_LINKS_FOUND"
            }
        }

    email = extract_email(raw_text)
    phone = extract_phone_number(raw_text)

    # Derive linkedin and github URLs from structured profile links if available
    li_link = next((l["url"] for l in profile_links if l["platform"] == "LinkedIn"), "")
    gh_link = next((l["url"] for l in profile_links if l["platform"] == "GitHub"), "")

    linkedin_url = li_link or extract_linkedin_url(raw_text)
    github_url = gh_link or extract_github_url(raw_text)

    lines = [line.strip() for line in raw_text.split('\n') if line.strip()]

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
            name = line.split('|')[0].split('•')[0].strip()
            if name:
                break

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
        norm_line = re.sub(r'^[#*\-•\d.]+\s*', '', line)
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

    summary_text = " ".join(sections['summary']).strip()
    if not summary_text and sections['header']:
        header_body = [
            l for l in sections['header']
            if l != name and "@" not in l and "github.com" not in l and "linkedin.com" not in l and len(l) > 20
        ]
        if header_body:
            summary_text = " ".join(header_body[:2]).strip()

    candidate_skills = extract_skills_from_section(sections['skills'])
    from app.ats_analyzer import extract_tech_keywords
    known_tech = extract_tech_keywords(raw_text)

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

    certifications = [l.strip('-•* ') for l in sections['certifications'] if len(l.strip()) > 2]
    achievements = [l.strip('-•* ') for l in sections['achievements'] if len(l.strip()) > 2]

    location = ""
    for hl in sections['header']:
        if any(state in hl for state in [", CA", ", NY", ", TX", ", WA", ", FL", "Remote", "USA", "United States", "San Francisco", "New York"]):
            location = hl.split('|')[0].strip()
            break

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
            "github_url": github_url,
            "profile_links": profile_links
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
            "fields_absent": fields_absent,
            "profile_links_count": len(profile_links),
            "platforms_detected": platforms_detected,
            "platforms_missing": platforms_missing,
            "link_extraction_status": "SUCCESS" if profile_links else "NO_LINKS_FOUND"
        }
    }
