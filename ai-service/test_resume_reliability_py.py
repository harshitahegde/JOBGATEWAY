from app.resume_parser import extract_email, extract_phone_number, extract_linkedin_url, extract_github_url, extract_skills_from_section, extract_structured_resume
from app.resume_analyzer import calculate_resume_quality_score, generate_concrete_improvements, rewrite_bullet_fact_grounded
from app.ats_analyzer import calculate_ats_score, extract_tech_keywords

def log_pass(msg: str):
    print(f"[PASS] {msg}")

def run_tests():
    print("===============================================================")
    print("PYTHON RESUME WORKFLOW RELIABILITY & PARITY AUDIT SUITE")
    print("===============================================================\n")

    # 1. Extraction formatting
    phones = ["+1 (555) 234-5678", "+91 98765 43210", "(415) 555-0199", "555-839-2019"]
    for p in phones:
        ext = extract_phone_number(f"Contact at {p} anytime.")
        assert len(ext) > 0, f"Phone extracted: {p} -> {ext}"
    log_pass("1.1: Phone extraction handles international & domestic formats")

    # Year range not mistaken for phone
    year_range = "Education: Stanford University from 2018 - 2022."
    assert extract_phone_number(year_range) == "", "Year range not mistaken for phone"
    log_pass("1.2: Year ranges excluded from phone extraction")

    # Email
    email = "jane.doe+jobgateway@subdomain.example.org"
    assert extract_email(f"Email: {email}") == email
    log_pass("1.3: Complex email format correctly extracted")

    # LinkedIn
    assert extract_linkedin_url("Profile: https://www.linkedin.com/in/harshita-hegde/").startswith("https://linkedin.com/in/")
    log_pass("1.4: Canonical LinkedIn URL extracted")

    # Skills section
    skills_lines = [
        "Languages: TypeScript, Python, Golang, Rust, React, Next.js",
        "Cloud: Docker, Kubernetes, AWS, Terraform"
    ]
    extracted_skills = extract_skills_from_section(skills_lines)
    assert "TypeScript" in extracted_skills and "Terraform" in extracted_skills
    log_pass(f"1.5: Extracted {len(extracted_skills)} skills directly from sections without synonym limit")

    # 2. Genuine Absence vs Failed Extraction
    partial_text = """
    Harshita Hegde
    harshita@example.com
    SUMMARY
    Senior Engineer building scalable web services.
    EXPERIENCE
    Senior Software Engineer @ CloudTech (2022 - Present)
    - Developed microservices handling 50k QPS in Go.
    """
    partial_parsed = extract_structured_resume(partial_text)
    assert partial_parsed["personal_info"]["full_name"] == "Harshita Hegde"
    assert partial_parsed["personal_info"]["email"] == "harshita@example.com"
    assert partial_parsed["personal_info"]["phone"] == ""
    assert partial_parsed["personal_info"]["linkedin_url"] == ""
    assert "phone" in partial_parsed["extraction_metadata"]["fields_absent"]
    log_pass("2.1: Genuinely absent fields preserved as empty, not fabricated")

    # 3. Dynamic Quality Scoring (Elimination of 50% default)
    strong_data = {
        "personal_info": {
            "full_name": "Harshita Hegde",
            "email": "harshita@example.com",
            "phone": "+1-555-0199",
            "linkedin_url": "https://linkedin.com/in/harshita-hegde"
        },
        "summary": "Experienced Senior Engineer specializing in microservices.",
        "skills": ["TypeScript", "Node.js", "Go", "Docker", "PostgreSQL"],
        "experience": [
            {
                "role": "Senior Engineer",
                "company": "Apex",
                "duration": "2021 - Present",
                "description": "Architected distributed pipelines in Go and Docker, reducing API latency by 45%."
            }
        ],
        "education": [{"degree": "B.S. CS", "institution": "UW", "year": "2021"}],
        "projects": [{"title": "Rate Limiter", "description": "Token bucket rate limiter sustaining 25k QPS."}],
        "certifications": [{"name": "AWS Architect", "issuer": "AWS", "year": "2023"}]
    }
    strong_score = calculate_resume_quality_score(strong_data, "Harshita Hegde harshita@example.com +1-555-0199 Senior Engineer Apex 2021 Present Architected distributed pipelines in Go and Docker reducing API latency by 45 percent Rate Limiter AWS Architect")
    assert strong_score["overall_quality_score"] >= 80, f"Strong resume scored high: {strong_score['overall_quality_score']}"
    log_pass(f"3.1: Strong resume received high dynamic score: {strong_score['overall_quality_score']}/100")

    weak_data = {
        "personal_info": {"full_name": "Candidate", "email": ""},
        "summary": "",
        "skills": [],
        "experience": [{"role": "Intern", "company": "ABC", "duration": "", "description": "was responsible for helping."}],
        "education": []
    }
    weak_score = calculate_resume_quality_score(weak_data, "Candidate Intern ABC was responsible for helping around the office with daily routine tasks.")
    assert weak_score["overall_quality_score"] < 50, f"Weak resume scored low: {weak_score['overall_quality_score']}"
    assert weak_score["overall_quality_score"] != 50.0, "Weak resume does not default to 50%"
    log_pass(f"3.2: Weak resume scored dynamically ({weak_score['overall_quality_score']}/100), NOT 50%")

    # 4. Strict ATS Boundaries
    java_resume = "Senior Backend Engineer with 8 years of Java, Spring Boot, Hibernate, JVM tuning, and Maven."
    js_jd = "Frontend Engineer required with expert JavaScript, React, Vue, CSS, and Webpack."
    java_vs_js = calculate_ats_score(java_resume, js_jd)
    assert java_vs_js["breakdown"]["required_skills"]["matched_count"] == 0
    log_pass("4.1: Java != JavaScript strict boundary enforced in Python engine")

    c_resume = "Embedded Firmware Engineer with 7 years of professional experience in C programming, Linux kernel drivers, memory registers, assembly, and RTOS development."
    cpp_jd = "C++ Systems Engineer needed for high-frequency trading in C++20, Boost, and template metaprogramming."
    c_vs_cpp = calculate_ats_score(c_resume, cpp_jd)
    assert c_vs_cpp["breakdown"]["required_skills"]["matched_count"] == 0
    log_pass("4.2: C != C++ strict boundary enforced in Python engine")

    # 5. Fact Grounded Bullet Rewriting
    clean_rewrite, metric_note = rewrite_bullet_fact_grounded("was responsible for developing high-performance REST APIs in Node.js and TypeScript.")
    assert clean_rewrite == "Developed high-performance REST APIs in Node.js and TypeScript.", f"Rewrite: {clean_rewrite}"
    assert "  " not in clean_rewrite, "No double spaces in rewritten text"
    log_pass(f"5.1: Fact-grounded active verb rewrite verified: \"{clean_rewrite}\"")

    print("\n===============================================================")
    print("ALL PYTHON RELIABILITY & PARITY AUDIT TESTS PASSED (100%)")
    print("===============================================================")

if __name__ == "__main__":
    run_tests()
