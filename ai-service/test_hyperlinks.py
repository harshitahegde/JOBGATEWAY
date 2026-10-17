import io
import zlib
from app.resume_parser import (
    normalize_url,
    detect_platform_from_url,
    extract_profile_links,
    extract_structured_resume,
    extract_docx_links_bytes,
    extract_pdf_links_bytes
)

print("====================================================")
print("Testing Resume Hyperlink Extraction & Parity (Python)")
print("====================================================\n")

def create_mock_docx_bytes(relationships_xml: str, document_xml: str) -> bytes:
    import zipfile
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('word/_rels/document.xml.rels', relationships_xml)
        z.writestr('word/document.xml', document_xml)
    return buf.getvalue()

# 1. Visible text says "LeetCode" and links to LeetCode
print('Case 1: Visible text says "LeetCode" and links to LeetCode')
res1 = extract_profile_links(
    [{"url": "https://leetcode.com/u/candidate1", "label": "LeetCode", "source": "annotation"}],
    "Personal Info: Jane Doe | LeetCode Profile"
)
assert len(res1["profile_links"]) == 1
assert res1["profile_links"][0]["platform"] == "LeetCode"
assert res1["profile_links"][0]["url"] == "https://leetcode.com/u/candidate1"
assert "LeetCode" in res1["platforms_detected"]
print("  [PASS] Correctly detected LeetCode when text says LeetCode\n")

# 2. Visible text says "Coding Profile" but links to LeetCode
print('Case 2: Visible text says "Coding Profile" but links to LeetCode')
res2 = extract_profile_links(
    [{"url": "https://leetcode.com/u/candidate2", "label": "Coding Profile", "source": "annotation"}],
    "Candidate: Alex Taylor | Coding Profile | Phone: 555-0199"
)
assert len(res2["profile_links"]) == 1
assert res2["profile_links"][0]["platform"] == "LeetCode"
assert res2["profile_links"][0]["url"] == "https://leetcode.com/u/candidate2"
assert res2["profile_links"][0]["label"] == "Coding Profile"
assert "LeetCode" in res2["platforms_detected"]
print('  [PASS] Identified destination as LeetCode despite generic anchor text "Coding Profile"\n')

# 3. A hyperlink has no useful visible label
print('Case 3: A hyperlink has no useful visible label')
res3 = extract_profile_links(
    [{"url": "https://github.com/developer-hero", "label": "click here", "source": "annotation"}],
    "Portfolio & Links: click here"
)
assert len(res3["profile_links"]) == 1
assert res3["profile_links"][0]["platform"] == "GitHub"
assert res3["profile_links"][0]["url"] == "https://github.com/developer-hero"
print('  [PASS] Correctly identified platform from destination URL when label was "click here"\n')

# 4. LinkedIn and GitHub links with common URL variations
print('Case 4: LinkedIn and GitHub links with common URL variations')
variations = [
    ("http://linkedin.com/in/jane-doe/", "LinkedIn"),
    ("https://www.linkedin.com/pub/john-smith/1/2/3", "LinkedIn"),
    ("linkedin.com/in/janedoe", "LinkedIn"),
    ("http://github.com/janedoe", "GitHub"),
    ("https://www.github.com/janedoe/", "GitHub"),
    ("github.com/janedoe", "GitHub")
]
for raw, expected in variations:
    norm = normalize_url(raw)
    assert norm is not None, f"Expected valid URL for {raw}"
    plat, _ = detect_platform_from_url(norm)
    assert plat == expected, f"Expected {expected} for {raw}, got {plat}"
print("  [PASS] All 6 common LinkedIn and GitHub URL variants normalized and detected\n")

# 5. A resume with platform names but NO clickable links
print('Case 5: A resume with platform names but NO clickable links (Anti-Fabrication Guard)')
text_without_urls = """
Jane Doe
jane@example.com | 555-0199
Summary: Active problem solver on LeetCode with 400+ problems solved.
Maintains multiple open source projects on GitHub and network on LinkedIn.
Skills: Python, TypeScript, React
"""
res5 = extract_structured_resume(text_without_urls, [])
assert len(res5["personal_info"]["profile_links"]) == 0
assert res5["personal_info"]["linkedin_url"] == ""
assert res5["personal_info"]["github_url"] == ""
assert len(res5["extraction_metadata"]["platforms_detected"]) == 0
assert "LeetCode" in res5["extraction_metadata"]["platforms_missing"]
assert "GitHub" in res5["extraction_metadata"]["platforms_missing"]
assert "LinkedIn" in res5["extraction_metadata"]["platforms_missing"]
print("  [PASS] Successfully avoided fabricating URLs when platform names were only mentioned in text\n")

# 6. A resume containing duplicate visible and embedded URLs
print('Case 6: A resume containing duplicate visible and embedded URLs')
resume_text = """
Alex Smith
alex@example.com
Profile: https://leetcode.com/u/alexsmith
https://github.com/alexsmith
"""
embedded = [
    {"url": "https://leetcode.com/u/alexsmith", "label": "LeetCode", "source": "annotation"},
    {"url": "https://github.com/alexsmith/", "label": "GitHub", "source": "annotation"}
]
res6 = extract_structured_resume(resume_text, embedded)
assert len(res6["personal_info"]["profile_links"]) == 2
plats = [l["platform"] for l in res6["personal_info"]["profile_links"]]
assert "LeetCode" in plats
assert "GitHub" in plats
print("  [PASS] Deduplicated identical URLs appearing in both annotations and plain text\n")

# 7. DOCX hyperlinks stored in relationships
print('Case 7: DOCX hyperlinks stored in relationships with generic anchor text')
rels_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://leetcode.com/u/dev_pro" TargetMode="External"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://codeforces.com/profile/dev_pro" TargetMode="External"/>
</Relationships>"""

doc_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    <w:p>
      <w:hyperlink r:id="rId1">
        <w:r><w:t>Coding Profile</w:t></w:r>
      </w:hyperlink>
    </w:p>
    <w:p>
      <w:hyperlink r:id="rId2">
        <w:r><w:t>Competitive Programming</w:t></w:r>
      </w:hyperlink>
    </w:p>
  </w:body>
</w:document>"""

docx_bytes = create_mock_docx_bytes(rels_xml, doc_xml)
extracted = extract_docx_links_bytes(docx_bytes)
assert len(extracted) == 2
res7 = extract_profile_links(extracted, "Candidate profile")
assert len(res7["profile_links"]) == 2
leet = next((l for l in res7["profile_links"] if l["platform"] == "LeetCode"), None)
cf = next((l for l in res7["profile_links"] if l["platform"] == "Codeforces"), None)
assert leet is not None
assert leet["url"] == "https://leetcode.com/u/dev_pro"
assert leet["label"] == "Coding Profile"
assert cf is not None
assert cf["url"] == "https://codeforces.com/profile/dev_pro"
assert cf["label"] == "Competitive Programming"
print("  [PASS] Successfully extracted DOCX relationships and attached visible anchor labels\n")

# 8. PDFs without link annotations and malformed links
print('Case 8: PDFs without link annotations and malformed links')
mock_pdf = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n%%EOF"
extracted8 = extract_pdf_links_bytes(mock_pdf)
assert len(extracted8) == 0

assert normalize_url("not-a-valid-url") is None
assert normalize_url("http:///bad") is None
assert normalize_url("javascript:alert(1)") is None

res8 = extract_profile_links(extracted8, "Plain text resume with no links.")
assert len(res8["profile_links"]) == 0
assert len(res8["platforms_detected"]) == 0
print("  [PASS] Handled PDF without annotations and safely discarded malformed URLs\n")

print("====================================================")
print("ALL 8 HYPERLINK EXTRACTION TESTS PASSED (PYTHON)!")
print("====================================================")
