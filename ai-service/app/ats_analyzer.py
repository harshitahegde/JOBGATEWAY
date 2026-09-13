import re
from typing import List, Dict, Any, Set
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# Comprehensive Tech Skill & Keyword Corpus
KNOWN_SKILLS = [
    "javascript", "typescript", "react", "next.js", "vue", "angular", "node.js", "express",
    "express.js", "python", "fastapi", "flask", "django", "java", "spring boot", "c++", "c#",
    ".net", "sql", "mysql", "postgresql", "mongodb", "redis", "docker", "kubernetes", "aws",
    "azure", "gcp", "git", "github", "gitlab", "cicd", "ci/cd", "rest api", "graphql", "html",
    "html5", "css", "css3", "tailwind css", "bootstrap", "sass", "scikit-learn", "spacy",
    "tensorflow", "pytorch", "machine learning", "deep learning", "nlp", "tf-idf", "pandas",
    "numpy", "agile", "scrum", "jira", "unit testing", "jest", "cypress", "webpack", "vite"
]

def extract_keywords(text: str) -> List[str]:
    """Extract known technical skills and keywords from raw text."""
    text_lower = text.lower()
    found_skills: Set[str] = set()
    
    for skill in KNOWN_SKILLS:
        # Match whole word or exact skill pattern
        pattern = r'\b' + re.escape(skill) + r'\b'
        if re.search(pattern, text_lower):
            # Capitalize nicely
            found_skills.add(skill.upper() if len(skill) <= 4 else skill.title())
            
    # Fallback word extraction if empty
    if not found_skills:
        words = re.findall(r'\b[a-zA-Z]{3,}\b', text_lower)
        for w in set(words):
            if w in KNOWN_SKILLS:
                found_skills.add(w.title())
                
    return sorted(list(found_skills))

def calculate_ats_score(resume_text: str, job_description: str) -> Dict[str, Any]:
    """
    Computes an ATS similarity score using TF-IDF + Cosine Similarity and skill matching based strictly on actual inputs.
    """
    if not resume_text or not resume_text.strip() or not job_description or not job_description.strip():
        return {
            "ats_score": 0.0,
            "matched_keywords": [],
            "missing_keywords": [],
            "suggestions": ["Please provide both a resume and a job description to perform ATS analysis."],
            "tfidf_score": 0.0,
            "keyword_match_score": 0.0
        }

    # 1. Extract keywords from both texts
    resume_keywords = set(k.lower() for k in extract_keywords(resume_text))
    job_keywords = set(k.lower() for k in extract_keywords(job_description))

    # 2. Compute TF-IDF Cosine Similarity
    try:
        vectorizer = TfidfVectorizer(stop_words='english', ngram_range=(1, 2))
        tfidf_matrix = vectorizer.fit_transform([resume_text, job_description])
        cosine_sim = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
        tfidf_score = round(float(cosine_sim) * 100, 2)
    except Exception:
        tfidf_score = 0.0

    # 3. Compute Keyword Match Ratio
    if job_keywords:
        matched_set = resume_keywords.intersection(job_keywords)
        missing_set = job_keywords.difference(resume_keywords)
        keyword_score = round((len(matched_set) / len(job_keywords)) * 100, 2)
    else:
        matched_set = set()
        missing_set = set()
        keyword_score = 0.0

    # Weighted final score: 60% Keyword Overlap + 40% TF-IDF Cosine Similarity
    final_score = round((0.6 * keyword_score) + (0.4 * tfidf_score), 1)
    final_score = max(0.0, min(100.0, final_score))

    matched_keywords_formatted = sorted([k.upper() if len(k) <= 4 else k.title() for k in matched_set])
    missing_keywords_formatted = sorted([k.upper() if len(k) <= 4 else k.title() for k in missing_set])

    # 4. Generate Actionable & Honest Suggestions
    suggestions = []
    if missing_keywords_formatted:
        missing_str = ", ".join(missing_keywords_formatted[:5])
        suggestions.append(
            f"Key missing keywords from job description: {missing_str}. Only add them if you possess genuine hands-on experience."
        )
    
    if final_score < 40:
        suggestions.append("Low match score. Your resume currently lacks many of the required technical terms in the job description.")
    elif final_score < 75:
        suggestions.append("Moderate match score. Tailor your professional summary and skills section to include exact terms from the job posting.")
    else:
        suggestions.append("High ATS match score! Ensure your document formatting is simple, readable, and clean.")

    return {
        "ats_score": final_score,
        "matched_keywords": matched_keywords_formatted,
        "missing_keywords": missing_keywords_formatted,
        "suggestions": suggestions,
        "tfidf_score": tfidf_score,
        "keyword_match_score": keyword_score
    }
