import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.ats_analyzer import calculate_ats_score, extract_tech_keywords, parse_jd_sections

def run_tests():
    print("==========================================")
    print("Running ATS Engine Python Unit Tests")
    print("==========================================\n")

    # 1. Strict Keyword Extraction (Java vs JavaScript)
    js_text = "Experienced Frontend Engineer proficient in JavaScript, React, and Node.js."
    skills_js = extract_tech_keywords(js_text)
    assert "JavaScript" in skills_js, "JavaScript detected"
    assert "Java" not in skills_js, "Java NOT matched for JavaScript"
    print("[PASS]: Java != JavaScript non-equivalence test")

    java_text = "Backend Developer specializing in Java, Spring Boot, and PostgreSQL."
    skills_java = extract_tech_keywords(java_text)
    assert "Java" in skills_java, "Java detected"
    assert "JavaScript" not in skills_java, "JavaScript NOT matched for Java"
    print("[PASS]: JavaScript != Java non-equivalence test")

    cpp_text = "Systems programmer working with C++ and Linux."
    skills_cpp = extract_tech_keywords(cpp_text)
    assert "C++" in skills_cpp, "C++ detected"
    assert "C#" not in skills_cpp, "C# NOT matched for C++"
    print("[PASS]: C++ != C# non-equivalence test")

    # 2. Full Match Scenario
    resume_full = """
    Jane Doe
    jane@example.com | 2021 - 2026
    Summary: Full Stack Developer
    Skills: React, Node.js, TypeScript, PostgreSQL, Docker
    Education: Bachelor of Science in Computer Science
    Experience: 
    Software Developer (2021 - 2026)
    Developed full stack web applications with React, Node.js, TypeScript, PostgreSQL, and Docker.
    """
    
    jd_full = """
    Required Skills:
    React, Node.js, TypeScript, PostgreSQL
    Preferred Skills:
    Docker
    Requirements:
    Bachelor degree in Computer Science or related field. 3+ years experience.
    """
    
    res_full = calculate_ats_score(resume_full, jd_full)
    print("DEBUG res_full required_skills:", res_full["breakdown"]["required_skills"])
    assert "error" not in res_full, "No error in full match"
    assert res_full["ats_score"] > 80.0, f"High score expected, got {res_full['ats_score']}"
    assert res_full["breakdown"]["required_skills"]["matched_count"] == 4, "4 required skills matched"
    assert res_full["breakdown"]["preferred_skills"]["matched_count"] == 1, "1 preferred skill matched"
    assert "Matched" in res_full["breakdown"]["experience_and_education"]["experience_status"], "Experience matched"
    assert "Matched" in res_full["breakdown"]["experience_and_education"]["education_status"], "Education matched"
    print("[PASS]: Full match scenario test")

    # 3. Zero Match Scenario
    resume_zero = """
    John Smith
    john@example.com | 2020 - 2024
    Summary: Accountant and Financial Manager
    Skills: Excel, Bookkeeping, Financial Auditing, Quickbooks
    Education: Bachelor of Business Administration
    Experience:
    Accountant (2020 - 2024)
    Managed corporate ledger and financial reporting.
    """

    jd_zero = """
    Required Skills:
    Kubernetes, Docker, Go, Rust
    Preferred Skills:
    Terraform
    """
    
    res_zero = calculate_ats_score(resume_zero, jd_zero)
    assert "error" not in res_zero, "No error in zero match"
    assert res_zero["ats_score"] <= 45.0, f"Low score expected, got {res_zero['ats_score']}"
    assert res_zero["breakdown"]["required_skills"]["matched_count"] == 0, "0 required skills matched"
    assert res_zero["breakdown"]["preferred_skills"]["matched_count"] == 0, "0 preferred skills matched"
    print("[PASS]: Zero match scenario test")

    # 4. Reproducibility Test
    res1 = calculate_ats_score(resume_full, jd_full)
    res2 = calculate_ats_score(resume_full, jd_full)
    assert res1["ats_score"] == res2["ats_score"], "Identical score on repeated runs"
    assert res1["breakdown"]["required_skills"]["score"] == res2["breakdown"]["required_skills"]["score"], "Identical breakdown"
    print("[PASS]: Reproducibility test")

    # 5. Empty Inputs Validation Test
    res_empty = calculate_ats_score("", "Job Description")
    assert "error" in res_empty, "Error returned for empty resume"

    jd_empty = calculate_ats_score("Resume text here", "")
    assert "error" in jd_empty, "Error returned for empty JD"
    print("[PASS]: Empty inputs validation test")

    # 6. Insufficient Work Dates Test
    resume_nodates = "Jane Smith. Summary: Frontend developer looking for opportunities. Skills: React, Node.js. Education: Bachelor degree in computer science. No work experience dates listed here."
    jd_reqs = "Requirements: 3+ years experience. Required Skills: React."
    
    res_nodates = calculate_ats_score(resume_nodates, jd_reqs)
    assert "Insufficient Information" in res_nodates["breakdown"]["experience_and_education"]["experience_status"], "Insufficient info reported"
    print("[PASS]: Insufficient work dates test")

    print("\n==========================================")
    print("ALL PYTHON ATS ENGINE TESTS PASSED!")
    print("==========================================")

if __name__ == "__main__":
    run_tests()
