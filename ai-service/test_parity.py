import sys
import os
import json
import subprocess

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.ats_analyzer import calculate_ats_score

# 10 Verification Scenarios required by USER
TEST_CASES = [
    {
        "name": "1. Full skill match",
        "resume": """Jane Doe
jane@example.com | 2021 - 2026
Summary: Senior Full Stack Developer
Skills: React, Node.js, TypeScript, PostgreSQL, Docker
Education: Bachelor of Science in Computer Science
Experience:
Senior Software Developer (2021 - 2026)
Developed scalable microservices using React, Node.js, TypeScript, PostgreSQL, and Docker.
""",
        "jd": """Required Skills:
React, Node.js, TypeScript, PostgreSQL
Preferred Skills:
Docker
Requirements:
Bachelor degree in Computer Science. 3+ years experience.
"""
    },
    {
        "name": "2. Partial required-skill match",
        "resume": """John Developer
john@example.com | 2022 - 2025
Summary: Frontend Engineer
Skills: React, JavaScript, HTML, CSS
Education: Bachelor of Science
Experience:
Frontend Developer (2022 - 2025)
Built web user interfaces using React and JavaScript.
""",
        "jd": """Required Skills:
React, Node.js, TypeScript, PostgreSQL
Requirements:
Bachelor degree. 2+ years experience.
"""
    },
    {
        "name": "3. Preferred skills match",
        "resume": """Alex Tech
alex@example.com | 2020 - 2025
Summary: Backend Developer
Skills: Python, FastAPI, PostgreSQL, Docker, Redis, Kubernetes
Education: Bachelor of Science
Experience:
Backend Engineer (2020 - 2025)
Engineered microservices using Python, FastAPI, PostgreSQL, Docker, and Redis.
""",
        "jd": """Required Skills:
Python, FastAPI, PostgreSQL
Preferred Skills:
Docker, Redis, Kubernetes
Requirements:
Bachelor degree. 3+ years experience.
"""
    },
    {
        "name": "4. Java vs JavaScript non-equivalence",
        "resume": """Sam Engineer
sam@example.com | 2021 - 2025
Summary: Frontend Developer
Skills: JavaScript, React, HTML, CSS, Node.js
Education: Bachelor of Computer Applications
Experience:
Developer (2021 - 2025)
Developed web applications in JavaScript.
""",
        "jd": """Required Skills:
Java, Spring Boot, PostgreSQL
Requirements:
Bachelor degree.
"""
    },
    {
        "name": "5. C vs C++ non-equivalence",
        "resume": """Chris Programmer
chris@example.com | 2020 - 2024
Summary: C++ Developer
Skills: C++, Linux, Multithreading, Git
Education: Bachelor of Technology
Experience:
Software Engineer (2020 - 2024)
Systems development in C++ and Linux.
""",
        "jd": """Required Skills:
C, Embedded Systems, Microcontrollers
Requirements:
Bachelor degree.
"""
    },
    {
        "name": "6. Missing experience dates",
        "resume": """Taylor Engineer
taylor@example.com
Summary: Software Developer
Skills: Python, Django, PostgreSQL
Education: Bachelor of Science
Experience:
Software Engineer at Acme Corp
Built Django web applications and managed database schemas.
""",
        "jd": """Required Skills:
Python, Django
Requirements:
3+ years experience. Bachelor degree.
"""
    },
    {
        "name": "7. Different education requirements",
        "resume": """Jordan Scientist
jordan@example.com | 2021 - 2025
Summary: Data Developer
Skills: Python, SQL, Pandas
Education: Bachelor of Science in Mathematics
Experience:
Data Analyst (2021 - 2025)
Analyzed datasets using Python and SQL.
""",
        "jd": """Required Skills:
Python, SQL
Requirements:
Master's degree in Computer Science or Data Science.
"""
    },
    {
        "name": "8. Missing resume sections",
        "resume": """Morgan Developer
morgan@example.com | 2022 - 2025
Skills: React, Node.js, Express, MongoDB
Built various full stack web apps. Worked with REST APIs and databases.
""",
        "jd": """Required Skills:
React, Node.js
Requirements:
Bachelor degree.
"""
    },
    {
        "name": "9. Empty / invalid inputs",
        "resume": "Too short text",
        "jd": "Job description requirement for developer"
    },
    {
        "name": "10. Realistic Backend Developer Resume + JD",
        "resume": """Harshita Hegde
harshita@example.com | (555) 019-2834 | San Francisco, CA
LinkedIn: linkedin.com/in/harshita-hegde | GitHub: github.com/harshita-hegde

PROFESSIONAL SUMMARY
Results-driven Senior Backend Engineer with 5+ years of experience building high-throughput microservices, RESTful APIs, and distributed data pipelines. Proven expertise in Node.js, Python, PostgreSQL, Redis, Docker, and AWS cloud infrastructure.

TECHNICAL SKILLS
- Languages: TypeScript, JavaScript, Python, SQL, Go
- Frameworks & Libraries: Node.js, Express.js, FastAPI, Django
- Databases & Caching: PostgreSQL, MongoDB, Redis
- Cloud & DevOps: AWS, Docker, Kubernetes, CI/CD, Git
- Concepts: REST API, Microservices, Unit Testing, Agile/Scrum

WORK EXPERIENCE
Senior Software Engineer | TechCorp Inc. | 2021 - 2026
- Architected and deployed Node.js microservices processing 10M+ daily API requests with 99.99% uptime.
- Optimized PostgreSQL database queries and implemented Redis caching, reducing API latency by 45%.
- Containerized microservices using Docker and automated CI/CD deployment pipelines on AWS.

Backend Engineer | DataPulse Systems | 2019 - 2021
- Developed scalable REST APIs using Python and FastAPI for data processing pipelines.
- Integrated JWT authentication, role-based access control, and MySQL database schemas.

EDUCATION
Bachelor of Science in Computer Science | University of Technology | 2015 - 2019
""",
        "jd": """Senior Backend Developer

Company: Acme Tech Solutions
Location: Remote (US)

Job Summary:
We are seeking an experienced Senior Backend Developer to design, build, and scale core microservices. You will work closely with frontend engineers and cloud architects to deliver reliable web systems.

Required Skills:
Node.js, Express.js, Python, PostgreSQL, Redis, REST API, Docker

Preferred Skills:
AWS, Kubernetes, CI/CD, TypeScript, Go

Requirements:
- 4+ years of professional software development experience.
- Bachelor's degree in Computer Science, Software Engineering, or equivalent.
- Strong knowledge of microservices architecture, database optimization, and cloud deployments.
"""
    }
]

def run_typescript_engine(resume: str, jd: str):
    """Executes backend/src/ats_engine.ts via ts-node and returns JSON result."""
    backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../backend"))
    temp_json = os.path.join(backend_dir, "temp_parity_input.json")
    with open(temp_json, "w", encoding="utf-8") as f:
        json.dump({"resume": resume, "jd": jd}, f)
        
    cmd = ["npx", "ts-node", "src/tests/run_single.ts", "temp_parity_input.json"]
    proc = subprocess.run(cmd, cwd=backend_dir, capture_output=True, text=True, shell=True)
    if proc.returncode != 0 or not proc.stdout.strip():
        raise RuntimeError(f"TS execution failed: code={proc.returncode}, stdout='{proc.stdout}', stderr='{proc.stderr}'")
    return json.loads(proc.stdout.strip())

def run_parity_test():
    print("===============================================================")
    print("PYTHON <-> TYPESCRIPT COMPREHENSIVE PARITY VERIFICATION (10 SCENARIOS)")
    print("===============================================================\n")

    all_passed = True
    discrepancies = []

    for idx, tc in enumerate(TEST_CASES, 1):
        name = tc["name"]
        print(f"--- Running Test #{idx}: {name} ---")

        py_res = calculate_ats_score(tc["resume"], tc["jd"])
        ts_res = run_typescript_engine(tc["resume"], tc["jd"])

        # Compare outputs
        is_match = True
        mismatches = []

        if "error" in py_res or "error" in ts_res:
            if py_res.get("error") != ts_res.get("error") and (not py_res.get("error") or not ts_res.get("error")):
                is_match = False
                mismatches.append(f"Error mismatch: Py='{py_res.get('error')}' vs TS='{ts_res.get('error')}'")
        else:
            # 1. Final Score
            if abs(py_res["ats_score"] - ts_res["ats_score"]) > 0.1:
                is_match = False
                mismatches.append(f"ATS Score: Py={py_res['ats_score']} vs TS={ts_res['ats_score']}")

            # 2. Required Skill Matches & Missing
            py_req = py_res["breakdown"]["required_skills"]
            ts_req = ts_res["breakdown"]["required_skills"]
            if py_req["matched"] != ts_req["matched"]:
                is_match = False
                mismatches.append(f"Req Skill Matched: Py={py_req['matched']} vs TS={ts_req['matched']}")
            if py_req["missing"] != ts_req["missing"]:
                is_match = False
                mismatches.append(f"Req Skill Missing: Py={py_req['missing']} vs TS={ts_req['missing']}")
            if abs(py_req["score"] - ts_req["score"]) > 0.1:
                is_match = False
                mismatches.append(f"Req Skill Score: Py={py_req['score']} vs TS={ts_req['score']}")

            # 3. Preferred Skill Matches & Missing
            py_pref = py_res["breakdown"]["preferred_skills"]
            ts_pref = ts_res["breakdown"]["preferred_skills"]
            if py_pref["matched"] != ts_pref["matched"]:
                is_match = False
                mismatches.append(f"Pref Skill Matched: Py={py_pref['matched']} vs TS={ts_pref['matched']}")
            if py_pref["missing"] != ts_pref["missing"]:
                is_match = False
                mismatches.append(f"Pref Skill Missing: Py={py_pref['missing']} vs TS={ts_pref['missing']}")

            # 4. Keyword Score
            py_kw = py_res["breakdown"]["keywords"]
            ts_kw = ts_res["breakdown"]["keywords"]
            if abs(py_kw["score"] - ts_kw["score"]) > 0.5:
                is_match = False
                mismatches.append(f"Keyword Score: Py={py_kw['score']} vs TS={ts_kw['score']}")

            # 5. Experience & Education Status
            py_ee = py_res["breakdown"]["experience_and_education"]
            ts_ee = ts_res["breakdown"]["experience_and_education"]
            if py_ee["experience_status"] != ts_ee["experience_status"]:
                is_match = False
                mismatches.append(f"Exp Status: Py='{py_ee['experience_status']}' vs TS='{ts_ee['experience_status']}'")
            if py_ee["education_status"] != ts_ee["education_status"]:
                is_match = False
                mismatches.append(f"Edu Status: Py='{py_ee['education_status']}' vs TS='{ts_ee['education_status']}'")

            # 6. Detected Sections
            if py_res["detected_sections"] != ts_res["detected_sections"]:
                is_match = False
                mismatches.append(f"Detected Sections: Py={py_res['detected_sections']} vs TS={ts_res['detected_sections']}")

        if is_match:
            print(f"[PASS] Scenario #{idx} ({name}): 100% Output Parity! (ATS Score = {py_res.get('ats_score', 0)}%)\n")
        else:
            all_passed = False
            discrepancies.append((name, mismatches))
            print(f"[FAIL] Scenario #{idx} ({name}) Discrepancies:")
            for m in mismatches:
                print(f"  - {m}")
            print()

    print("===============================================================")
    if all_passed:
        print("RESULT: ALL 10 TEST SCENARIOS PASSED WITH PERFECT OUTPUT PARITY!")
    else:
        print(f"RESULT: {len(discrepancies)} SCENARIOS HAD DISCREPANCIES.")
    print("===============================================================")

if __name__ == "__main__":
    run_parity_test()
