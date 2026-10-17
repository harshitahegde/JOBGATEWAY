import { 
  normalizeUrl, 
  detectPlatformFromUrl, 
  extractProfileLinks, 
  extractStructuredResumeTS,
  extractDocxLinksFromBuffer,
  extractPdfLinksFromBuffer
} from '../resume_parser_ts';
import assert from 'assert';
import zlib from 'zlib';

console.log('====================================================');
console.log('Testing Resume Hyperlink Extraction & Parity (TS)');
console.log('====================================================\n');

function createMockDocxBuffer(relationshipsXml: string, documentXml: string): Buffer {
  // Build a minimal valid in-memory zip archive containing the two XML entries
  const buffers: Buffer[] = [];
  const entries = [
    { name: 'word/_rels/document.xml.rels', data: Buffer.from(relationshipsXml, 'utf-8') },
    { name: 'word/document.xml', data: Buffer.from(documentXml, 'utf-8') }
  ];

  for (const entry of entries) {
    const compData = zlib.deflateRawSync(entry.data);
    const nameBuf = Buffer.from(entry.name, 'utf-8');
    const header = Buffer.alloc(30);

    header.writeUInt32LE(0x04034b50, 0); // signature
    header.writeUInt16LE(20, 4);        // version
    header.writeUInt16LE(0, 6);         // flags
    header.writeUInt16LE(8, 8);         // compression: deflate
    header.writeUInt16LE(0, 10);        // mod time
    header.writeUInt16LE(0, 12);        // mod date
    header.writeUInt32LE(0, 14);        // crc32
    header.writeUInt32LE(compData.length, 18); // comp size
    header.writeUInt32LE(entry.data.length, 22); // uncomp size
    header.writeUInt16LE(nameBuf.length, 26);  // name length
    header.writeUInt16LE(0, 28);               // extra length

    buffers.push(header, nameBuf, compData);
  }

  return Buffer.concat(buffers);
}

// 1. Visible text says "LeetCode" and links to LeetCode
console.log('Case 1: Visible text says "LeetCode" and links to LeetCode');
{
  const res = extractProfileLinks(
    [{ url: 'https://leetcode.com/u/candidate1', label: 'LeetCode', source: 'annotation' }],
    'Personal Info: Jane Doe | LeetCode Profile'
  );
  assert.strictEqual(res.profileLinks.length, 1);
  assert.strictEqual(res.profileLinks[0].platform, 'LeetCode');
  assert.strictEqual(res.profileLinks[0].url, 'https://leetcode.com/u/candidate1');
  assert.ok(res.platformsDetected.includes('LeetCode'));
  console.log('  [PASS] Correctly detected LeetCode when text says LeetCode\n');
}

// 2. Visible text says "Coding Profile" but links to LeetCode
console.log('Case 2: Visible text says "Coding Profile" but links to LeetCode');
{
  const res = extractProfileLinks(
    [{ url: 'https://leetcode.com/u/candidate2', label: 'Coding Profile', source: 'annotation' }],
    'Candidate: Alex Taylor | Coding Profile | Phone: 555-0199'
  );
  assert.strictEqual(res.profileLinks.length, 1);
  assert.strictEqual(res.profileLinks[0].platform, 'LeetCode');
  assert.strictEqual(res.profileLinks[0].url, 'https://leetcode.com/u/candidate2');
  assert.strictEqual(res.profileLinks[0].label, 'Coding Profile');
  assert.ok(res.platformsDetected.includes('LeetCode'));
  console.log('  [PASS] Identified destination as LeetCode despite generic anchor text "Coding Profile"\n');
}

// 3. A hyperlink has no useful visible label (empty or "click here")
console.log('Case 3: A hyperlink has no useful visible label');
{
  const res = extractProfileLinks(
    [{ url: 'https://github.com/developer-hero', label: 'click here', source: 'annotation' }],
    'Portfolio & Links: click here'
  );
  assert.strictEqual(res.profileLinks.length, 1);
  assert.strictEqual(res.profileLinks[0].platform, 'GitHub');
  assert.strictEqual(res.profileLinks[0].url, 'https://github.com/developer-hero');
  console.log('  [PASS] Correctly identified platform from destination URL when label was "click here"\n');
}

// 4. LinkedIn and GitHub links with common URL variations
console.log('Case 4: LinkedIn and GitHub links with common URL variations');
{
  const variations = [
    { raw: 'http://linkedin.com/in/jane-doe/', expectedPlatform: 'LinkedIn', expectedHost: 'linkedin.com' },
    { raw: 'https://www.linkedin.com/pub/john-smith/1/2/3', expectedPlatform: 'LinkedIn', expectedHost: 'linkedin.com' },
    { raw: 'linkedin.com/in/janedoe', expectedPlatform: 'LinkedIn', expectedHost: 'linkedin.com' },
    { raw: 'http://github.com/janedoe', expectedPlatform: 'GitHub', expectedHost: 'github.com' },
    { raw: 'https://www.github.com/janedoe/', expectedPlatform: 'GitHub', expectedHost: 'github.com' },
    { raw: 'github.com/janedoe', expectedPlatform: 'GitHub', expectedHost: 'github.com' }
  ];

  for (const v of variations) {
    const norm = normalizeUrl(v.raw);
    assert.ok(norm, `Expected valid normalized URL for ${v.raw}`);
    const { platform } = detectPlatformFromUrl(norm!);
    assert.strictEqual(platform, v.expectedPlatform, `Expected ${v.expectedPlatform} for ${v.raw}`);
  }
  console.log('  [PASS] All 6 common LinkedIn and GitHub URL variants normalized and detected\n');
}

// 5. A resume with platform names but NO clickable links
console.log('Case 5: A resume with platform names but NO clickable links (Anti-Fabrication Guard)');
{
  const resumeTextWithoutUrls = `
    Jane Doe
    jane@example.com | 555-0199
    Summary: Active problem solver on LeetCode with 400+ problems solved.
    Maintains multiple open source projects on GitHub and network on LinkedIn.
    Skills: Python, TypeScript, React
  `;
  const structured = extractStructuredResumeTS(resumeTextWithoutUrls, []);
  assert.strictEqual(structured.personal_info.profile_links.length, 0);
  assert.strictEqual(structured.personal_info.linkedin_url, '');
  assert.strictEqual(structured.personal_info.github_url, '');
  assert.strictEqual(structured.extraction_metadata.platforms_detected.length, 0);
  assert.ok(structured.extraction_metadata.platforms_missing.includes('LeetCode'));
  assert.ok(structured.extraction_metadata.platforms_missing.includes('GitHub'));
  assert.ok(structured.extraction_metadata.platforms_missing.includes('LinkedIn'));
  console.log('  [PASS] Successfully avoided fabricating URLs when platform names were only mentioned in text\n');
}

// 6. A resume containing duplicate visible and embedded URLs
console.log('Case 6: A resume containing duplicate visible and embedded URLs');
{
  const resumeText = `
    Alex Smith
    alex@example.com
    Profile: https://leetcode.com/u/alexsmith
    https://github.com/alexsmith
  `;
  const embedded = [
    { url: 'https://leetcode.com/u/alexsmith', label: 'LeetCode', source: 'annotation' as const },
    { url: 'https://github.com/alexsmith/', label: 'GitHub', source: 'annotation' as const }
  ];
  const structured = extractStructuredResumeTS(resumeText, embedded);
  assert.strictEqual(structured.personal_info.profile_links.length, 2);
  const platforms = structured.personal_info.profile_links.map((l: any) => l.platform);
  assert.ok(platforms.includes('LeetCode'));
  assert.ok(platforms.includes('GitHub'));
  console.log('  [PASS] Deduplicated identical URLs appearing in both annotations and plain text\n');
}

// 7. DOCX hyperlinks stored in relationships
console.log('Case 7: DOCX hyperlinks stored in relationships with generic anchor text');
{
  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://leetcode.com/u/dev_pro" TargetMode="External"/>
      <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://codeforces.com/profile/dev_pro" TargetMode="External"/>
    </Relationships>`;

  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
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
    </w:document>`;

  const docxBuf = createMockDocxBuffer(relsXml, docXml);
  const extracted = extractDocxLinksFromBuffer(docxBuf);
  assert.strictEqual(extracted.length, 2);

  const res = extractProfileLinks(extracted, 'Candidate profile');
  assert.strictEqual(res.profileLinks.length, 2);
  const leet = res.profileLinks.find(l => l.platform === 'LeetCode');
  const cf = res.profileLinks.find(l => l.platform === 'Codeforces');

  assert.ok(leet, 'LeetCode link must be present');
  assert.strictEqual(leet?.url, 'https://leetcode.com/u/dev_pro');
  assert.strictEqual(leet?.label, 'Coding Profile');

  assert.ok(cf, 'Codeforces link must be present');
  assert.strictEqual(cf?.url, 'https://codeforces.com/profile/dev_pro');
  assert.strictEqual(cf?.label, 'Competitive Programming');
  console.log('  [PASS] Successfully extracted DOCX relationships and attached visible anchor labels\n');
}

// 8. PDFs without link annotations and malformed links
console.log('Case 8: PDFs without link annotations and malformed links');
{
  const mockPdfWithoutAnnots = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n%%EOF');
  const extracted = extractPdfLinksFromBuffer(mockPdfWithoutAnnots);
  assert.strictEqual(extracted.length, 0);

  // Test malformed URLs
  assert.strictEqual(normalizeUrl('not-a-valid-url'), null);
  assert.strictEqual(normalizeUrl('http:///bad'), null);
  assert.strictEqual(normalizeUrl('javascript:alert(1)'), null);

  const res = extractProfileLinks(extracted, 'Plain text resume with no links.');
  assert.strictEqual(res.profileLinks.length, 0);
  assert.strictEqual(res.platformsDetected.length, 0);
  console.log('  [PASS] Handled PDF without annotations and safely discarded malformed URLs\n');
}

console.log('====================================================');
console.log('ALL 8 HYPERLINK EXTRACTION TESTS PASSED! 🎉');
console.log('====================================================');
