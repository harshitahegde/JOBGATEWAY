import fs from 'fs';
import path from 'path';
import { extractTechKeywords } from './ats_engine';

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

export function extractStructuredResumeTS(rawText: string): any {
  if (!rawText || !rawText.trim()) {
    return {
      personal_info: { full_name: '', email: '', phone: '', location: '', linkedin_url: '', github_url: '' },
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
        fields_absent: ['full_name', 'email', 'phone', 'skills', 'experience', 'education']
      }
    };
  }

  const email = extractEmail(rawText);
  const phone = extractPhoneNumber(rawText);
  const linkedin_url = extractLinkedIn(rawText);
  const github_url = extractGitHub(rawText);

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
    const normLine = line
      .replace(/^[#*\-•\d.]+\s*/, '')
      .replace(/^[:\-]+|[:\-]+$/g, '')
      .trim()
      .toLowerCase();

    let matchedSection: string | null = null;
    for (const [sec, synonyms] of Object.entries(SECTION_SYNONYMS)) {
      if (synonyms.includes(normLine)) {
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

  // Summary
  let summaryText = sections.summary.join(' ').trim();
  if (!summaryText && sections.header.length > 0) {
    const headerBody = sections.header.filter(
      l => l !== name && !l.includes('@') && !l.includes('github.com') && !l.includes('linkedin.com') && l.length > 20
    );
    if (headerBody.length > 0) {
      summaryText = headerBody.slice(0, 2).join(' ').trim();
    }
  }

  // Skills
  const candidateSkills = extractSkillsFromSection(sections.skills);
  const knownTech = extractTechKeywords(rawText);
  const allSkills: string[] = [];
  const seenSkills = new Set<string>();

  for (const s of candidateSkills) {
    const sClean = s.trim();
    if (!seenSkills.has(sClean.toLowerCase())) {
      seenSkills.add(sClean.toLowerCase());
      allSkills.push(sClean);
    }
  }
  for (const s of knownTech) {
    if (!seenSkills.has(s.toLowerCase())) {
      seenSkills.add(s.toLowerCase());
      allSkills.push(s);
    }
  }

  // Education
  const educationList: any[] = [];
  if (sections.education.length > 0) {
    let currEdu: any = null;
    const degreeKeywords = [
      'bachelor', 'master', 'phd', 'doctorate', 'b.s.', 'b.a.', 'm.s.', 'm.a.',
      'b.tech', 'm.tech', 'degree', 'diploma', 'associate', 'bba', 'mba', 'b.c.a.', 'm.c.a.'
    ];

    for (const l of sections.education) {
      const lLower = l.toLowerCase();
      const yearMatch = l.match(/\b(20\d{2}|19\d{2})\b/);
      const isDegreeLine = degreeKeywords.some(dk => lLower.includes(dk));

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

  // Experience
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
          duration: hasDate && !l.includes('|') ? l : '',
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
          currExp.description += currExp.description ? '\n' + descLine : descLine;
        }
      }
    }
    if (currExp) experienceList.push(currExp);
  }

  // Projects
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
          currProj.description += currProj.description ? ' ' + descLine : descLine;
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

  // Location heuristic
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
      github_url
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
      fields_absent: fieldsAbsent
    }
  };
}

export async function parseResumeFileTS(filePath: string): Promise<any> {
  const filename = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();

  let rawText = '';

  if (ext === '.pdf') {
    const pdfParse = require('pdf-parse');
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);
    rawText = (pdfData.text || '').trim();
  } else if (ext === '.docx') {
    // DOCX extraction: DOCX is a zip file with word/document.xml
    try {
      const dataBuffer = fs.readFileSync(filePath);
      // Fallback clean extraction of text xml nodes
      const str = dataBuffer.toString('utf-8');
      const textMatches = str.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
      if (textMatches) {
        rawText = textMatches
          .map(m => m.replace(/<[^>]+>/g, ''))
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
      }
    } catch (e) {
      rawText = '';
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

  const structuredData = extractStructuredResumeTS(rawText);

  return {
    filename,
    raw_text: rawText,
    parsed_data: structuredData
  };
}
