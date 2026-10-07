import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.email_generator import generate_fact_grounded_email

def run_tests():
    print("==========================================")
    print("Running Python AI Service Outreach Unit Tests")
    print("==========================================\n")

    # Test 1: Resume contains Java/Spring Boot
    email_1 = generate_fact_grounded_email(
        candidate_name="Alice Developer",
        top_skills=["Java", "Spring Boot", "MySQL"],
        company_name="Acme Corp",
        job_title="Backend Developer"
    )
    assert "Java" in email_1["body"], "Test 1: Contains Java"
    assert "Spring Boot" in email_1["body"], "Test 1: Contains Spring Boot"
    assert email_1["status"] == "DRAFT", "Test 1: Status is DRAFT"
    print("[PASS]: Test 1: Mentions actual candidate skills and status is DRAFT")

    # Test 2: Resume does not contain Python
    assert "python" not in email_1["body"].lower(), "Test 2: Does not claim Python"
    print("[PASS]: Test 2: Does NOT claim Python experience when missing")

    # Test 3: Resume has no metrics -> do not invent
    assert "40%" not in email_1["body"], "Test 3: No fabricated 40%"
    assert "perfect fit" not in email_1["body"].lower(), "Test 3: No unsupported boast"
    print("[PASS]: Test 3: Zero fabricated metrics or boastful claims")

    # Test 4: JD requires AWS but resume doesn't
    jd = "Requirements: Must have AWS and Kubernetes."
    email_4 = generate_fact_grounded_email(
        candidate_name="Alice Developer",
        top_skills=["Java", "Spring Boot", "MySQL"],
        company_name="CloudScale",
        job_title="Cloud Engineer",
        job_description=jd
    )
    assert "aws" not in email_4["body"].lower(), "Test 4: Does not claim AWS"
    print("[PASS]: Test 4: Does NOT claim AWS despite job description requirement")

    # Test 5: Recruiter name missing -> generic greeting
    email_5 = generate_fact_grounded_email(
        candidate_name="Alice Developer",
        top_skills=["Java"],
        recruiter_name=""
    )
    assert email_5["body"].startswith("Dear Hiring Team"), "Test 5: Uses neutral greeting"
    print("[PASS]: Test 5: Missing recruiter name handled neutrally without invention")

    # Test 6: Company name missing
    email_6 = generate_fact_grounded_email(
        candidate_name="Alice Developer",
        top_skills=["Java"],
        company_name=""
    )
    assert "undefined" not in email_6["body"], "Test 6: No undefined"
    print("[PASS]: Test 6: Missing company name formatted cleanly")

    print("\n==========================================")
    print("ALL PYTHON EMAIL GENERATOR TESTS PASSED!")
    print("==========================================")

if __name__ == "__main__":
    run_tests()
