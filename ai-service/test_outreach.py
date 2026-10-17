import sys
import os

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.email_generator import generate_fact_grounded_email, find_relevant_match

def run_tests():
    print("==========================================")
    print("Running Python AI Service Outreach Regression Tests")
    print("==========================================\n")

    # 1. Emails with no company, role, recruiter name, or candidate name
    t1_empty = generate_fact_grounded_email(
        candidate_name="",
        company_name="",
        job_title="",
        recruiter_name="",
        top_skills=[]
    )
    assert t1_empty["subject"] == "Inquiry: Career Opportunities", "1.1 Subject for empty input is clean"
    assert t1_empty["body"].startswith("Dear Hiring Team,"), "1.2 Greeting for empty input is neutral"
    assert "undefined" not in t1_empty["body"], "1.3 No undefined in body"
    assert "undefined" not in t1_empty["subject"], "1.4 No undefined in subject"
    assert "null" not in t1_empty["body"], "1.5 No null in body"
    assert t1_empty["body"].endswith("Best regards,"), "1.6 Sign-off gracefully omits missing name"
    assert "Candidate" not in t1_empty["body"], "1.7 Does NOT insert literal 'Candidate'"
    print("[PASS]: 1. Empty fields handled gracefully")

    # 2. Company-only inquiry
    t2_company = generate_fact_grounded_email(
        candidate_name="Jordan Smith",
        company_name="Acme Innovations",
        job_title="",
        recruiter_name="",
        top_skills=["TypeScript"]
    )
    assert t2_company["subject"] == "Inquiry: Career Opportunities at Acme Innovations", "2.1 Subject mentions company"
    assert t2_company["body"].startswith("Dear Acme Innovations Hiring Team,"), "2.2 Greeting addresses Acme"
    assert "suitable opportunities at Acme Innovations" in t2_company["body"], "2.3 Mentions company naturally"
    assert "Software Engineer" not in t2_company["body"], "2.4 Does NOT invent role"
    print("[PASS]: 2. Company-only inquiry formatted correctly")

    # 3. Role-only inquiry
    t3_role = generate_fact_grounded_email(
        candidate_name="Jordan Smith",
        company_name="",
        job_title="DevOps Engineer",
        recruiter_name=""
    )
    assert t3_role["subject"] == "Interest in DevOps Engineer Opportunities", "3.1 Subject adapts to role"
    assert t3_role["body"].startswith("Dear Hiring Team,"), "3.2 Neutral greeting"
    assert "DevOps Engineer opportunities" in t3_role["body"], "3.3 Naturally mentions role"
    assert " at " not in t3_role["body"], "3.4 No dangling preposition"
    print("[PASS]: 3. Role-only inquiry formatted correctly")

    # 4. Company and role supplied together
    t4_both = generate_fact_grounded_email(
        candidate_name="Jordan Smith",
        company_name="Starlight Dynamics",
        job_title="Senior Frontend Engineer",
        recruiter_name="Elena Rostova",
        top_skills=["React", "TypeScript"]
    )
    assert t4_both["subject"] == "Interest in Senior Frontend Engineer Opportunities at Starlight Dynamics", "4.1 Subject combines role and company"
    assert t4_both["body"].startswith("Dear Elena Rostova,"), "4.2 Uses recruiter name"
    assert "Senior Frontend Engineer opportunities at Starlight Dynamics" in t4_both["body"], "4.3 Combines role and company in body"
    print("[PASS]: 4. Company and role combined naturally")

    # 5. Job description with relevant resume evidence
    t5_with_evidence = generate_fact_grounded_email(
        candidate_name="Jordan Smith",
        company_name="CloudScale",
        job_title="Fullstack Developer",
        job_description="We are seeking an engineer experienced in React, Next.js, and distributed microservices architecture.",
        top_skills=["React", "PostgreSQL", "Docker"],
        primary_experience="Frontend Lead at WebCorp"
    )
    assert "Given my background in React" in t5_with_evidence["body"], "5.1 Uses verified resume match ('React')"
    assert "React" in t5_with_evidence["grounded_skills"], "5.2 grounded_skills contains React"
    assert "Docker" not in t5_with_evidence["body"], "5.3 Does NOT dump unrelated skills"
    print("[PASS]: 5. Job description with verified resume evidence grounded cleanly")

    # 6. Job description with NO supported matching experience
    t6_no_evidence = generate_fact_grounded_email(
        candidate_name="Jordan Smith",
        company_name="FinTech Quantum",
        job_title="Rust Low-Latency Engineer",
        job_description="Must have 5+ years of high frequency trading kernel development in C++ and Rust.",
        top_skills=["JavaScript", "UI Design"],
        primary_experience="Graphic Designer at ArtStudio"
    )
    assert "Given my background in Rust" not in t6_no_evidence["body"], "6.1 Does NOT claim background in Rust"
    assert "Given my background in C++" not in t6_no_evidence["body"], "6.2 Does NOT claim background in C++"
    assert "Having reviewed the position requirements" in t6_no_evidence["body"], "6.3 Uses truthful review sentence"
    assert len(t6_no_evidence["grounded_skills"]) == 0, "6.4 grounded_skills is empty"
    print("[PASS]: 6. Job description without matching skills avoids hallucinations")

    # 7. Resumes containing 50+ skills: No skill stuffing
    fifty_skills = [f"TechSkill_{i+1}" for i in range(50)]
    t7_fifty = generate_fact_grounded_email(
        candidate_name="Jordan Smith",
        company_name="Enterprise Co",
        job_title="Principal Architect",
        top_skills=fifty_skills
    )
    assert "TechSkill_1, TechSkill_2" not in t7_fifty["body"], "7.1 Does NOT dump list of skills"
    assert len(t7_fifty["body"].split("\n\n")) <= 7, "7.2 Email draft remains concise and readable"
    print("[PASS]: 7. 50+ skills resume avoids skill stuffing")

    # 8. Correct subject, greeting, body, and sign-off without malformed placeholders
    placeholders = ["undefined", "null", "NaN", "[Company", "[Role", "[Recruiter", "[Candidate", "object Object"]
    for draft in [t1_empty, t2_company, t3_role, t4_both, t5_with_evidence, t6_no_evidence, t7_fifty]:
        for ph in placeholders:
            assert ph not in draft["body"], f"8. Zero malformed placeholder '{ph}' in body"
            assert ph not in draft["subject"], f"8. Zero malformed placeholder '{ph}' in subject"
    print("[PASS]: 8. Zero malformed placeholders across all drafts")

    # 9. Video pitch URL
    t9_with_vid = generate_fact_grounded_email(
        candidate_name="Jordan Smith",
        company_name="Acme",
        video_intro_url="https://res.cloudinary.com/jobgateway/video/upload/v12345/jobgateway/videos/pitch_1.mp4"
    )
    assert t9_with_vid["has_video_intro"] is True, "9.1 has_video_intro is True"
    assert "https://res.cloudinary.com/jobgateway/video/upload/v12345/jobgateway/videos/pitch_1.mp4" in t9_with_vid["body"], "9.2 Video link in body"

    t9_no_vid = generate_fact_grounded_email(
        candidate_name="Jordan Smith",
        company_name="Acme",
        video_intro_url=""
    )
    assert t9_no_vid["has_video_intro"] is False, "9.3 has_video_intro is False"
    assert "video" not in t9_no_vid["body"], "9.4 No video mention when omitted"
    print("[PASS]: 9. Video pitch URL included strictly when provided")

    # 10. Status strictly DRAFT
    assert t1_empty["status"] == "DRAFT", "10.1 Status is strictly DRAFT"
    print("[PASS]: 10. Draft status strictly preserved")

    print("\n==========================================")
    print("ALL PYTHON OUTREACH REGRESSION TESTS PASSED! [SUCCESS]")
    print("==========================================")

if __name__ == "__main__":
    run_tests()
