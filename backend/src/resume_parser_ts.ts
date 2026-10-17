import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { extractTechKeywords } from './ats_engine';

export interface ProfileLink {
  platform: 'LinkedIn' | 'GitHub' | 'LeetCode' | 'Codeforces' | 'HackerRank' | 'CodeChef' | 'Kaggle' | 'GitLab' | 'Portfolio' | 'Other';
  url: string;
  label: string;
  source: 'annotation' | 'docx_rel' | 'text_match';
}

export const KNOWN_PLATFORMS = ['LinkedIn', 'GitHub', 'LeetCode', 'Codeforces', 'HackerRank', 'CodeChef', 'Kaggle', 'GitLab', 'Portfolio'] as const;

/**
 * Unescapes PDF literal strings including octal escape sequences (\ooo) and standard escapes.
 */
export function unescapePdfString(str: string): string {
  let decoded = str.replace(/\\([0-7]{1,3})/g, (_, oct) => {
    return String.fromCharCode(parseInt(oct, 8));
  });
  decoded = decoded
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\b/g, '\b')
    .replace(/\\f/g, '\f')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\');
  return decoded.trim();
}

/**
 * Normalizes and validates URLs extracted from resume files or text.
 */
export function normalizeUrl(rawUrl: string): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  let clean = rawUrl.trim();

  // Strip leading/trailing quotes, angle brackets, parentheses, spaces
  clean = clean.replace(/^[<"'\(\[\{\s]+|[>"'\)\]\}\s.,;:]+$/g, '');

  // Strip mailto:
  if (clean.toLowerCase().startsWith('mailto:')) {
    return null;
  }

  // Prepend protocol if missing
  if (/^(?:www\.|[a-zA-Z0-9-]+\.(?:com|org|net|io|dev|me|ai|co|cn|in|app|tech|site|online)\b)/i.test(clean)) {
    clean = `https://${clean}`;
  }

  try {
    const parsed = new URL(clean);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    // Hostname must contain at least one dot or be localhost
    if (!parsed.hostname.includes('.') && parsed.hostname !== 'localhost') {
      return null;
    }

    // Return normalized canonical URL with trailing slashes stripped
    const cleanPath = parsed.pathname.replace(/\/+$/, '');
    let result = parsed.origin + cleanPath;
    if (parsed.search) result += parsed.search;
    return result;
  } catch {
    return null;
  }
}

/**
 * Detects platform based on actual destination URL hostname and path.
 * Rule: Platform detection MUST be driven by URL, not just anchor text!
 */
export function detectPlatformFromUrl(url: string, anchorText?: string): { platform: ProfileLink['platform']; label: string } {
  let hostname = '';
  let pathname = '';

  try {
    const parsed = new URL(url);
    hostname = parsed.hostname.toLowerCase();
    pathname = parsed.pathname;
  } catch {
    const match = url.match(/^(?:https?:\/\/)?([^\/]+)(\/.*)?$/i);
    if (match) {
      hostname = (match[1] || '').toLowerCase();
      pathname = match[2] || '';
    }
  }

  const cleanAnchor = (anchorText || '').trim();

  // 1. LeetCode
  if (hostname.includes('leetcode.com') || hostname.includes('leetcode.cn')) {
    return { platform: 'LeetCode', label: cleanAnchor || 'LeetCode' };
  }

  // 2. LinkedIn
  if (hostname.includes('linkedin.com')) {
    return { platform: 'LinkedIn', label: cleanAnchor || 'LinkedIn' };
  }

  // 3. GitHub
  if (hostname.includes('github.com')) {
    const cleanPath = pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
    const reserved = ['pricing', 'features', 'enterprise', 'explore', 'contact', 'about', 'topics', 'trending', 'collections'];
    if (!reserved.includes(cleanPath)) {
      return { platform: 'GitHub', label: cleanAnchor || 'GitHub' };
    }
  }

  // 4. GitLab
  if (hostname.includes('gitlab.com')) {
    return { platform: 'GitLab', label: cleanAnchor || 'GitLab' };
  }

  // 5. Codeforces
  if (hostname.includes('codeforces.com')) {
    return { platform: 'Codeforces', label: cleanAnchor || 'Codeforces' };
  }

  // 6. HackerRank
  if (hostname.includes('hackerrank.com')) {
    return { platform: 'HackerRank', label: cleanAnchor || 'HackerRank' };
  }

  // 7. CodeChef
  if (hostname.includes('codechef.com')) {
    return { platform: 'CodeChef', label: cleanAnchor || 'CodeChef' };
  }

  // 8. Kaggle
  if (hostname.includes('kaggle.com')) {
    return { platform: 'Kaggle', label: cleanAnchor || 'Kaggle' };
  }

  // 9. Portfolio / Personal Website
  const isPortfolioHost = (
    hostname.includes('github.io') ||
    hostname.includes('gitlab.io') ||
    hostname.includes('vercel.app') ||
    hostname.includes('netlify.app') ||
    hostname.includes('pages.dev') ||
    hostname.endsWith('.dev') ||
    hostname.endsWith('.me') ||
    hostname.endsWith('.site') ||
    hostname.endsWith('.design') ||
    hostname.includes('portfolio') ||
    /portfolio|personal\s*site|personal\s*website/i.test(cleanAnchor)
  );
  if (isPortfolioHost) {
    return { platform: 'Portfolio', label: cleanAnchor || 'Portfolio' };
  }

  // 10. Other / Unrecognized destination URL
  return {
    platform: 'Other',
    label: cleanAnchor || hostname || 'Web Link'
  };
}

/**
 * Extracts links embedded in PDF annotations (both uncompressed objects and raw streams).
 */
export function extractPdfLinksFromBuffer(buffer: Buffer): Array<{ url: string; label?: string; source: 'annotation' }> {
  const links: Array<{ url: string; label?: string; source: 'annotation' }> = [];
  const seenUrls = new Set<string>();

  const pdfStr = buffer.toString('latin1');

  // Pattern 1: Literal URI string /URI (http...) or /URI (https...)
  const uriRegex = /\/URI\s*(?:\(([^)\r\n]+)\)|<([0-9a-fA-F]+)>)/g;
  let match: RegExpExecArray | null;

  while ((match = uriRegex.exec(pdfStr)) !== null) {
    let rawUrl = '';
    if (match[1]) {
      rawUrl = unescapePdfString(match[1]);
    } else if (match[2]) {
      try {
        rawUrl = Buffer.from(match[2], 'hex').toString('utf-8');
      } catch {}
    }

    const normalized = normalizeUrl(rawUrl);
    if (normalized && !seenUrls.has(normalized.toLowerCase())) {
      seenUrls.add(normalized.toLowerCase());
      links.push({ url: normalized, source: 'annotation' });
    }
  }

  // Pattern 2: Inspect decompressed FlateDecode streams for embedded /URI
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let streamMatch: RegExpExecArray | null;

  while ((streamMatch = streamRegex.exec(pdfStr)) !== null) {
    try {
      const streamBytes = Buffer.from(streamMatch[1], 'latin1');
      let inflated: Buffer | null = null;
      try {
        inflated = zlib.inflateSync(streamBytes);
      } catch {
        try {
          inflated = zlib.inflateRawSync(streamBytes);
        } catch {}
      }

      if (inflated) {
        const decompressed = inflated.toString('latin1');
        let streamUriMatch: RegExpExecArray | null;
        while ((streamUriMatch = uriRegex.exec(decompressed)) !== null) {
          let sUrl = streamUriMatch[1] ? unescapePdfString(streamUriMatch[1]) : '';
          const norm = normalizeUrl(sUrl);
          if (norm && !seenUrls.has(norm.toLowerCase())) {
            seenUrls.add(norm.toLowerCase());
            links.push({ url: norm, source: 'annotation' });
          }
        }
      }
    } catch {}
  }

  return links;
}

/**
 * Extracts ZIP entries from DOCX buffer in pure Node.js using standard zlib.
 */
export function extractZipEntries(buffer: Buffer): Map<string, string> {
  const entries = new Map<string, string>();
  let offset = 0;

  while (offset < buffer.length - 30) {
    // Check local file header signature 0x04034b50 ('PK\x03\x04')
    if (buffer.readUInt32LE(offset) !== 0x04034b50) {
      offset++;
      continue;
    }

    const compressionMethod = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const uncompressedSize = buffer.readUInt32LE(offset + 22);
    const fileNameLength = buffer.readUInt16LE(offset + 26);
    const extraFieldLength = buffer.readUInt16LE(offset + 28);

    const fileNameStart = offset + 30;
    const fileNameEnd = fileNameStart + fileNameLength;
    if (fileNameEnd > buffer.length) break;

    const fileName = buffer.toString('utf-8', fileNameStart, fileNameEnd);
    const dataStart = fileNameEnd + extraFieldLength;
    const dataEnd = dataStart + compressedSize;

    if (dataEnd <= buffer.length) {
      try {
        const compressedData = buffer.slice(dataStart, dataEnd);
        let uncompressedData: Buffer;
        if (compressionMethod === 0) {
          uncompressedData = compressedData;
        } else if (compressionMethod === 8) {
          uncompressedData = zlib.inflateRawSync(compressedData);
        } else {
          uncompressedData = Buffer.alloc(0);
        }

        if (uncompressedData.length > 0) {
          entries.set(fileName, uncompressedData.toString('utf-8'));
        }
      } catch {}
    }

    offset = dataEnd;
  }

  return entries;
}

/**
 * Extracts hyperlinks and visible anchor texts from DOCX relationships and document XML.
 */
export function extractDocxLinksFromBuffer(buffer: Buffer): Array<{ url: string; label?: string; source: 'docx_rel' }> {
  const links: Array<{ url: string; label?: string; source: 'docx_rel' }> = [];
  const entries = extractZipEntries(buffer);

  const relsContent = entries.get('word/_rels/document.xml.rels') || '';
  const docXmlContent = entries.get('word/document.xml') || '';

  // 1. Map r:id -> Target URL from document.xml.rels
  const relMap = new Map<string, string>();
  const relRegex = /<Relationship\b[^>]*\bId=["']([^"']+)["'][^>]*\bType=["'][^"']*hyperlink["'][^>]*\bTarget=["']([^"']+)["'][^>]*\bTargetMode=["']External["']/gi;
  let rMatch: RegExpExecArray | null;

  while ((rMatch = relRegex.exec(relsContent)) !== null) {
    const id = rMatch[1];
    const target = rMatch[2];
    relMap.set(id, target);
  }

  // Also match Target before Type order variation
  const relRegex2 = /<Relationship\b[^>]*\bTarget=["']([^"']+)["'][^>]*\bId=["']([^"']+)["'][^>]*\bType=["'][^"']*hyperlink["']/gi;
  while ((rMatch = relRegex2.exec(relsContent)) !== null) {
    const target = rMatch[1];
    const id = rMatch[2];
    relMap.set(id, target);
  }

  // 2. Map r:id -> Visible text from word/document.xml
  const anchorMap = new Map<string, string>();
  const linkRegex = /<w:hyperlink\b[^>]*\br:id=["']([^"']+)["'][^>]*>([\s\S]*?)<\/w:hyperlink>/gi;
  let lMatch: RegExpExecArray | null;

  while ((lMatch = linkRegex.exec(docXmlContent)) !== null) {
    const id = lMatch[1];
    const innerXml = lMatch[2];
    // Extract text from <w:t> tags
    const textMatches = innerXml.match(/<w:t\b[^>]*>([^<]*)<\/w:t>/gi) || [];
    const visibleText = textMatches.map(t => t.replace(/<[^>]+>/g, '')).join('').trim();
    if (visibleText) {
      anchorMap.set(id, visibleText);
    }
  }

  // 3. Assemble verified external hyperlinks
  const seenUrls = new Set<string>();
  for (const [id, targetUrl] of relMap.entries()) {
    const normalized = normalizeUrl(targetUrl);
    if (normalized && !seenUrls.has(normalized.toLowerCase())) {
      seenUrls.add(normalized.toLowerCase());
      const label = anchorMap.get(id) || '';
      links.push({
        url: normalized,
        label: label || undefined,
        source: 'docx_rel'
      });
    }
  }

  return links;
}

/**
 * Extracts visible web URLs written directly in resume text.
 */
export function extractTextUrls(text: string): Array<{ url: string; label?: string; source: 'text_match' }> {
  const links: Array<{ url: string; label?: string; source: 'text_match' }> = [];
  if (!text) return links;

  const urlRegex = /(?:https?:\/\/|www\.)[a-zA-Z0-9-._~:/?#\[\]@!$&'()*+,;=%]+/gi;
  const matches = text.match(urlRegex) || [];
  const seen = new Set<string>();

  for (const raw of matches) {
    const normalized = normalizeUrl(raw);
    if (normalized && !seen.has(normalized.toLowerCase())) {
      seen.add(normalized.toLowerCase());
      links.push({
        url: normalized,
        source: 'text_match'
      });
    }
  }

  return links;
}

/**
 * Merges embedded link annotations and visible text URLs.
 * Deduplicates destination URLs and classifies platforms.
 * Strictly NEVER invents a profile URL when only the platform name is mentioned!
 */
export function extractProfileLinks(
  embeddedLinks: Array<{ url: string; label?: string; source: 'annotation' | 'docx_rel' | 'text_match' }>,
  rawText: string
): { profileLinks: ProfileLink[]; platformsDetected: string[]; platformsMissing: string[] } {
  const visibleLinks = extractTextUrls(rawText);

  // Combine and deduplicate
  const linkMap = new Map<string, ProfileLink>();

  // 1. Process embedded annotations first (they often carry explicit anchor text)
  for (const item of embeddedLinks) {
    const norm = normalizeUrl(item.url);
    if (!norm) continue;
    const key = norm.toLowerCase();
    if (!linkMap.has(key)) {
      const { platform, label } = detectPlatformFromUrl(norm, item.label);
      linkMap.set(key, {
        platform,
        url: norm,
        label,
        source: item.source
      });
    }
  }

  // 2. Process visible text matches (deduplicating against existing)
  for (const item of visibleLinks) {
    const norm = normalizeUrl(item.url);
    if (!norm) continue;
    const key = norm.toLowerCase();
    if (!linkMap.has(key)) {
      const { platform, label } = detectPlatformFromUrl(norm, item.label);
      linkMap.set(key, {
        platform,
        url: norm,
        label,
        source: 'text_match'
      });
    }
  }

  const profileLinks = Array.from(linkMap.values());

  // Determine detected platforms
  const detectedPlatformsSet = new Set<string>();
  for (const link of profileLinks) {
    if (link.platform !== 'Other') {
      detectedPlatformsSet.add(link.platform);
    }
  }

  const platformsDetected = Array.from(detectedPlatformsSet);

  // Determine missing platforms from standard checklist
  const standardPlatforms = ['LinkedIn', 'GitHub', 'LeetCode'];
  const platformsMissing = standardPlatforms.filter(p => !detectedPlatformsSet.has(p));

  return {
    profileLinks,
    platformsDetected,
    platformsMissing
  };
}

export function extractPhoneNumber(text: string): string {
  const phoneCandidates = text.match(
    /(?:(?:\+|00)\d{1,3}[-.\s]*)?(?:\(?\d{2,5}\)?[-.\s]*)?\d{3,5}[-.\s]*\d{3,5}(?:[-.\s]*\d{1,4})?/g
  ) || [];

  for (const cand of phoneCandidates) {
    const candClean = cand.trim();
    const digits = candClean.replace(/\D/g, '');
    if (digits.length >= 7 && digits.length <= 15) {
      if (/^(?:19|20)\d{2}[-.\s]*(?:19|20)\d{2}$/.test(candClean)) {
        continue;
      }
      return candClean;
    }
  }
  return '';
}

export function extractEmail(text: string): string {
  const match = text.match(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/);
  return match ? match[0].replace(/\.+$/, '') : '';
}

export function extractLinkedIn(text: string): string {
  const match = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:in|pub)\/([a-zA-Z0-9_.-]+)/i);
  if (match) {
    const username = match[1].replace(/\/+$/, '');
    return `https://linkedin.com/in/${username}`;
  }
  return '';
}

export function extractGitHub(text: string): string {
  const match = text.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)/i);
  if (match) {
    const username = match[1].replace(/\/+$/, '');
    if (!['pricing', 'features', 'enterprise', 'explore', 'contact'].includes(username.toLowerCase())) {
      return `https://github.com/${username}`;
    }
  }
  return '';
}

export function extractSkillsFromSection(sectionLines: string[]): string[] {
  const skills: string[] = [];
  const seen = new Set<string>();

  for (const line of sectionLines) {
    let cleanLine = line.trim();
    if (!cleanLine) continue;

    if (cleanLine.includes(':')) {
      cleanLine = cleanLine.split(':', 2)[1];
    } else if (cleanLine.includes(' - ') && cleanLine.split(' - ')[0].length < 25) {
      cleanLine = cleanLine.split(' - ', 2)[1];
    }

    const tokens = cleanLine.split(/[,|;•·\t\n]+/);
    for (const tok of tokens) {
      const t = tok.trim().replace(/^[-*• ]+|[-*• ]+$/g, '');
      if (t && t.length <= 35 && !t.toLowerCase().startsWith('etc') && t.length > 1) {
        const tLower = t.toLowerCase();
        if (!seen.has(tLower)) {
          seen.add(tLower);
          skills.push(t);
        }
      }
    }
  }
  return skills;
}

export function extractStructuredResumeTS(
  rawText: string,
  embeddedLinks: Array<{ url: string; label?: string; source: 'annotation' | 'docx_rel' | 'text_match' }> = []
): any {
  const { profileLinks, platformsDetected, platformsMissing } = extractProfileLinks(embeddedLinks, rawText);

  if (!rawText || !rawText.trim()) {
    return {
      personal_info: {
        full_name: '',
        email: '',
        phone: '',
        location: '',
        linkedin_url: '',
        github_url: '',
        profile_links: profileLinks
      },
      summary: '',
      skills: [],
      education: [],
      experience: [],
      projects: [],
      certifications: [],
      achievements: [],
      raw_text: '',
      extraction_metadata: {
        word_count: 0,
        is_empty: true,
        fields_detected: [],
        fields_absent: ['full_name', 'email', 'phone', 'skills', 'experience', 'education'],
        profile_links_count: profileLinks.length,
        platforms_detected: platformsDetected,
        platforms_missing: platformsMissing,
        link_extraction_status: profileLinks.length > 0 ? 'SUCCESS' : 'NO_LINKS_FOUND'
      }
    };
  }

  const email = extractEmail(rawText);
  const phone = extractPhoneNumber(rawText);

  // Derive linkedin and github from structured profile links first, then text fallback
  const linkedInObj = profileLinks.find(l => l.platform === 'LinkedIn');
  const gitHubObj = profileLinks.find(l => l.platform === 'GitHub');

  const linkedin_url = linkedInObj ? linkedInObj.url : extractLinkedIn(rawText);
  const github_url = gitHubObj ? gitHubObj.url : extractGitHub(rawText);

  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

  let name = '';
  for (const line of lines.slice(0, 6)) {
    const lLow = line.toLowerCase();
    if (
      !line.includes('@') &&
      !(/\d{5,}/.test(line)) &&
      line.length < 40 &&
      !['resume', 'curriculum', 'vitae', 'page', 'email', 'phone', 'linkedin.com', 'github.com',
        'summary', 'experience', 'education', 'skills', 'objective', 'profile'].some(kw => lLow.includes(kw)) &&
      !line.startsWith('http')
    ) {
      name = line.split('|')[0].split('•')[0].trim();
      if (name) break;
    }
  }

  const SECTION_SYNONYMS: Record<string, string[]> = {
    summary: [
      'summary', 'professional summary', 'executive summary', 'profile', 'professional profile',
      'about me', 'career objective', 'objective', 'summary of qualifications'
    ],
    experience: [
      'experience', 'work experience', 'employment history', 'work history',
      'professional experience', 'internships', 'employment', 'relevant experience', 'career history'
    ],
    education: [
      'education', 'academic background', 'qualifications', 'education & credentials',
      'education and training', 'academic qualifications', 'degrees', 'academics'
    ],
    skills: [
      'skills', 'technical skills', 'core competencies', 'technologies', 'expertise',
      'skills & abilities', 'technical proficiencies', 'key skills', 'competencies', 'programming skills'
    ],
    projects: [
      'projects', 'key projects', 'technical projects', 'personal projects',
      'selected projects', 'academic projects'
    ],
    certifications: [
      'certifications', 'licenses', 'courses', 'certifications & licenses',
      'certifications and licenses', 'professional certifications', 'certificates'
    ],
    achievements: [
      'achievements', 'awards', 'honors', 'accomplishments', 'honors & awards',
      'awards & achievements', 'recognition'
    ]
  };

  let currentSection = 'header';
  const sections: Record<string, string[]> = {
    header: [],
    summary: [],
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
    achievements: []
  };

  for (const line of lines) {
    const norm = line
      .replace(/^[#*\-•\d.]+\s*/, '')
      .replace(/^[:\-]+|[:\-]+$/g, '')
      .trim()
      .toLowerCase();

    let matchedSection: string | null = null;
    for (const [sec, synonyms] of Object.entries(SECTION_SYNONYMS)) {
      if (synonyms.includes(norm)) {
        matchedSection = sec;
        break;
      }
    }

    if (matchedSection) {
      currentSection = matchedSection;
    } else {
      sections[currentSection].push(line);
    }
  }

  let summaryText = sections.summary.join(' ').trim();
  if (!summaryText && sections.header.length > 0) {
    const headerBody = sections.header.filter(
      l => l !== name && !l.includes('@') && !l.includes('github.com') && !l.includes('linkedin.com') && l.length > 20
    );
    if (headerBody.length > 0) {
      summaryText = headerBody.slice(0, 2).join(' ').trim();
    }
  }

  const candidateSkills = extractSkillsFromSection(sections.skills);
  const knownTech = extractTechKeywords(rawText);

  const allSkills: string[] = [];
  const seenSkills = new Set<string>();

  for (const s of candidateSkills) {
    const clean = s.trim();
    if (!seenSkills.has(clean.toLowerCase())) {
      seenSkills.add(clean.toLowerCase());
      allSkills.push(clean);
    }
  }
  for (const s of knownTech) {
    if (!seenSkills.has(s.toLowerCase())) {
      seenSkills.add(s.toLowerCase());
      allSkills.push(s);
    }
  }

  const educationList: any[] = [];
  if (sections.education.length > 0) {
    let currEdu: any = null;
    const degreeKws = [
      'bachelor', 'master', 'phd', 'doctorate', 'b.s.', 'b.a.', 'm.s.', 'm.a.',
      'b.tech', 'm.tech', 'degree', 'diploma', 'associate', 'bba', 'mba', 'b.c.a.', 'm.c.a.'
    ];

    for (const l of sections.education) {
      const lLow = l.toLowerCase();
      const yearMatch = l.match(/\b(20\d{2}|19\d{2})\b/);
      const isDegreeLine = degreeKws.some(dk => lLow.includes(dk));

      if (isDegreeLine || !currEdu) {
        if (currEdu) educationList.push(currEdu);
        currEdu = { degree: l, institution: '', year: yearMatch ? yearMatch[0] : '' };
      } else {
        if (!currEdu.institution) {
          currEdu.institution = l;
        } else if (!currEdu.year && yearMatch) {
          currEdu.year = yearMatch[0];
        } else {
          currEdu.institution = `${currEdu.institution}, ${l}`;
        }
      }
    }
    if (currEdu) educationList.push(currEdu);
  }

  const experienceList: any[] = [];
  if (sections.experience.length > 0) {
    let currExp: any = null;
    const datePattern = /\b(?:20\d{2}|19\d{2}|present|current|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i;

    for (const l of sections.experience) {
      const hasDate = datePattern.test(l);
      const isBullet = l.startsWith('-') || l.startsWith('•') || l.startsWith('*') || /^\d+\./.test(l);

      if (!currExp) {
        currExp = {
          role: l.split('|')[0].trim(),
          company: l.includes('|') ? l.split('|')[1].trim() : '',
          duration: hasDate && !l.includes('|') ? l.trim() : '',
          description: ''
        };
      } else if (hasDate && !currExp.duration && l.length < 45 && !isBullet) {
        currExp.duration = l.trim();
      } else if (!isBullet && l.length < 65 && !currExp.description && (l.includes('|') || l.includes(' at ') || l.includes(' - '))) {
        experienceList.push(currExp);
        currExp = {
          role: l.split('|')[0].trim(),
          company: l.includes('|') ? l.split('|')[1].trim() : '',
          duration: '',
          description: ''
        };
      } else {
        const descLine = l.replace(/^[-*• \t]+/, '').trim();
        if (descLine) {
          currExp.description = currExp.description ? `${currExp.description}\n${descLine}` : descLine;
        }
      }
    }
    if (currExp) experienceList.push(currExp);
  }

  const projectsList: any[] = [];
  if (sections.projects.length > 0) {
    let currProj: any = null;
    for (const l of sections.projects) {
      const isBullet = l.startsWith('-') || l.startsWith('•') || l.startsWith('*');
      if (!currProj || (!isBullet && l.length < 50 && !currProj.description)) {
        if (currProj) projectsList.push(currProj);
        currProj = { title: l.replace(/^[-*• ]+/, '').trim(), description: '', tech_stack: [] };
      } else {
        const descLine = l.replace(/^[-*• ]+/, '').trim();
        if (descLine) {
          currProj.description = currProj.description ? `${currProj.description} ${descLine}` : descLine;
        }
      }
    }
    if (currProj) projectsList.push(currProj);
  }

  const certifications = sections.certifications
    .map(l => l.replace(/^[-*• ]+/, '').trim())
    .filter(l => l.length > 2);

  const achievements = sections.achievements
    .map(l => l.replace(/^[-*• ]+/, '').trim())
    .filter(l => l.length > 2);

  let location = '';
  for (const hl of sections.header) {
    if ([', CA', ', NY', ', TX', ', WA', ', FL', 'Remote', 'USA', 'United States', 'San Francisco', 'New York'].some(s => hl.includes(s))) {
      location = hl.split('|')[0].trim();
      break;
    }
  }

  const fieldsDetected: string[] = [];
  const fieldsAbsent: string[] = [];

  if (name) fieldsDetected.push('full_name');
  else fieldsAbsent.push('full_name');

  if (email) fieldsDetected.push('email');
  else fieldsAbsent.push('email');

  if (phone) fieldsDetected.push('phone');
  else fieldsAbsent.push('phone');

  if (linkedin_url) fieldsDetected.push('linkedin_url');
  else fieldsAbsent.push('linkedin_url');

  if (allSkills.length > 0) fieldsDetected.push('skills');
  else fieldsAbsent.push('skills');

  if (experienceList.length > 0) fieldsDetected.push('experience');
  else fieldsAbsent.push('experience');

  if (educationList.length > 0) fieldsDetected.push('education');
  else fieldsAbsent.push('education');

  const words = rawText.match(/\b[a-zA-Z0-9_-]+\b/g) || [];

  return {
    personal_info: {
      full_name: name,
      email,
      phone,
      location,
      linkedin_url,
      github_url,
      profile_links: profileLinks
    },
    summary: summaryText,
    skills: allSkills,
    education: educationList,
    experience: experienceList,
    projects: projectsList,
    certifications,
    achievements,
    raw_text: rawText,
    extraction_metadata: {
      word_count: words.length,
      is_empty: false,
      fields_detected: fieldsDetected,
      fields_absent: fieldsAbsent,
      profile_links_count: profileLinks.length,
      platforms_detected: platformsDetected,
      platforms_missing: platformsMissing,
      link_extraction_status: profileLinks.length > 0 ? 'SUCCESS' : 'NO_LINKS_FOUND'
    }
  };
}

export async function parseResumeFileTS(filePath: string): Promise<any> {
  const filename = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();

  let rawText = '';
  let embeddedLinks: Array<{ url: string; label?: string; source: 'annotation' | 'docx_rel' | 'text_match' }> = [];

  if (ext === '.pdf') {
    const dataBuffer = fs.readFileSync(filePath);

    // 1. Extract link annotations from PDF buffer
    embeddedLinks = extractPdfLinksFromBuffer(dataBuffer);

    // 2. Extract plain text via pdf-parse
    try {
      const pdfParse = require('pdf-parse');
      const pdfData = await pdfParse(dataBuffer);
      rawText = (pdfData.text || '').trim();
    } catch (e) {
      // Fallback clean text extract from uncompressed stream text objects
      const str = dataBuffer.toString('latin1');
      const textMatches = str.match(/\(([^)\\]{2,})\)\s*Tj/g) || [];
      rawText = textMatches.map(m => m.replace(/^\(|\)\s*Tj$/g, '')).join(' ');
    }
  } else if (ext === '.docx') {
    const dataBuffer = fs.readFileSync(filePath);

    // 1. Extract relationships and hyperlink XML from DOCX ZIP entries
    embeddedLinks = extractDocxLinksFromBuffer(dataBuffer);

    // 2. Extract plain text from paragraphs and tables
    const entries = extractZipEntries(dataBuffer);
    const docXml = entries.get('word/document.xml') || '';
    if (docXml) {
      const textMatches = docXml.match(/<w:t\b[^>]*>([^<]+)<\/w:t>/g);
      if (textMatches) {
        rawText = textMatches
          .map(m => m.replace(/<[^>]+>/g, ''))
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
      }
    }
  } else {
    rawText = fs.readFileSync(filePath, 'utf-8').trim();
  }

  // Check if text is genuinely empty or scanned image
  const words = rawText.match(/\b[a-zA-Z0-9_-]+\b/g) || [];
  if (words.length < 10) {
    return {
      error: 'NO_EXTRACTABLE_TEXT',
      message: 'This document appears to be a scanned image or contains no selectable text. JobGateway currently requires text-based PDF or DOCX files (optical character recognition / OCR for scanned images is not yet supported). Please upload a text-selectable PDF or DOCX version, or paste your resume text.'
    };
  }

  const structuredData = extractStructuredResumeTS(rawText, embeddedLinks);

  return {
    filename,
    raw_text: rawText,
    parsed_data: structuredData
  };
}
