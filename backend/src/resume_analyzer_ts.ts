import { extractTechKeywords, parseJDSections, calculateDeterministicATSScore } from './ats_engine';

const ACTION_VERBS = new Set([
  "architected", "built", "created", "designed", "developed", "engineered",
  "implemented", "launched", "managed", "optimized", "spearheaded", "automated",
  "scaled", "constructed", "integrated", "refactored", "deployed", "orchestrated",
  "formulated", "established", "directed", "transformed", "streamlined", "led",
  "delivered", "programmed", "authored", "resolved", "accelerated", "reduced"
]);

const WEAK_PASSIVE_PHRASES = [
  "responsible for", "worked on", "helped with", "assisted in", "duties included",
  "tasked with", "involved in", "handled", "participated in", "helped to"
];

export function verbIngToEdTS(ingVerb: string): string {
  const w = ingVerb.toLowerCase();
  const mapping: Record<string, string> = {
    building: "Built", creating: "Created", designing: "Designed",
    developing: "Developed", engineering: "Engineered", implementing: "Implemented",
    managing: "Managed", optimizing: "Optimized", writing: "Wrote",
    testing: "Tested", deploying: "Deployed", maintaining: "Maintained",
    configuring: "Configured", automating: "Automated", scaling: "Scaled",
    leading: "Led", delivering: "Delivered", refactoring: "Refactored",
    integrating: "Integrated", architecting: "Architected", orchestrating: "Orchestrated"
  };
  if (mapping[w]) return mapping[w];
  if (w.endsWith("ing")) {
    return (w.slice(0, -3) + "ed").charAt(0).toUpperCase() + (w.slice(0, -3) + "ed").slice(1);
  }
  return ingVerb.charAt(0).toUpperCase() + ingVerb.slice(1);
}

export function rewriteBulletFactGroundedTS(bullet: string): { fgRewrite: string; metricNote: string } {
  const clean = bullet.trim().replace(/^[-*• \t]+/, '');
  if (!clean) {
    return { fgRewrite: "", metricNote: "Insufficient text" };
  }

  const hasMetric = /\b(?:\d+%\+?|\$\d+(?:\.\d+)?[kmb]?|\d+\+?\s*(?:users|requests|qps|ms|k|mb|gb|tb|x|million|billion|teams?|engineers?))\b/i.test(clean);
  const metricNote = hasMetric ? "Contains verified numbers" : "Consider adding a verifiable metric if you have real numbers from this role.";

  let rewritten = clean;

  const patterns: { regex: RegExp; replacer: (match: any, g1?: string) => string }[] = [
    { regex: /^(?:i\s+)?(?:was\s+)?responsible\s+for\s+(?:the\s+)?([a-z]+ing)\b/i, replacer: (_, g1) => verbIngToEdTS(g1 || '') + " " },
    { regex: /^(?:i\s+)?(?:was\s+)?responsible\s+for\s+(?:the\s+)?development\s+of\b/i, replacer: () => 'Developed ' },
    { regex: /^(?:i\s+)?(?:was\s+)?responsible\s+for\s+(?:the\s+)?design\s+of\b/i, replacer: () => 'Designed ' },
    { regex: /^(?:i\s+)?(?:was\s+)?responsible\s+for\s+(?:the\s+)?management\s+of\b/i, replacer: () => 'Managed ' },
    { regex: /^(?:i\s+)?(?:was\s+)?responsible\s+for\s+/i, replacer: () => 'Led and developed ' },
    { regex: /^(?:i\s+)?worked\s+on\s+(?:the\s+)?([a-z]+ing)\b/i, replacer: (_, g1) => verbIngToEdTS(g1 || '') + " " },
    { regex: /^(?:i\s+)?worked\s+on\s+/i, replacer: () => 'Developed ' },
    { regex: /^(?:i\s+)?helped\s+with\s+(?:the\s+)?([a-z]+ing)\b/i, replacer: (_, g1) => 'Contributed to ' + g1 + " " },
    { regex: /^(?:i\s+)?helped\s+with\s+/i, replacer: () => 'Contributed to ' },
    { regex: /^(?:i\s+)?assisted\s+in\s+(?:the\s+)?([a-z]+ing)\b/i, replacer: (_, g1) => 'Assisted in ' + g1 + " " },
    { regex: /^(?:i\s+)?assisted\s+in\s+/i, replacer: () => 'Assisted with ' },
    { regex: /^(?:my\s+)?duties\s+included\s+(?:the\s+)?([a-z]+ing)\b/i, replacer: (_, g1) => verbIngToEdTS(g1 || '') + " " },
    { regex: /^(?:my\s+)?duties\s+included\s+/i, replacer: () => 'Managed and executed ' },
    { regex: /^(?:i\s+)?(?:was\s+)?tasked\s+with\s+(?:the\s+)?([a-z]+ing)\b/i, replacer: (_, g1) => verbIngToEdTS(g1 || '') + " " },
    { regex: /^(?:i\s+)?(?:was\s+)?tasked\s+with\s+/i, replacer: () => 'Executed ' },
    { regex: /^(?:i\s+)?(?:was\s+)?involved\s+in\s+(?:the\s+)?([a-z]+ing)\b/i, replacer: (_, g1) => 'Participated in ' + g1 + " " },
    { regex: /^(?:i\s+)?(?:was\s+)?involved\s+in\s+/i, replacer: () => 'Participated in ' },
    { regex: /^(?:i\s+)?handled\s+(?:the\s+)?([a-z]+ing)\b/i, replacer: (_, g1) => verbIngToEdTS(g1 || '') + " " },
    { regex: /^(?:i\s+)?handled\s+/i, replacer: () => 'Managed ' }
  ];

  for (const item of patterns) {
    if (item.regex.test(rewritten)) {
      rewritten = rewritten.replace(item.regex, (match, g1) => item.replacer(match, g1));
      break;
    }
  }

  rewritten = rewritten.replace(/\s+/g, ' ').trim();
  if (rewritten) {
    rewritten = rewritten.charAt(0).toUpperCase() + rewritten.slice(1);
  }

  return { fgRewrite: rewritten, metricNote };
}

export function calculateResumeQualityScoreTS(resumeData: any, rawText: string) {
  const pInfo = resumeData?.personal_info || {};
  const skills = Array.isArray(resumeData?.skills) ? resumeData.skills : [];
  const experience = Array.isArray(resumeData?.experience) ? resumeData.experience : [];
  const education = Array.isArray(resumeData?.education) ? resumeData.education : [];
  const projects = Array.isArray(resumeData?.projects) ? resumeData.projects : [];
  const certifications = Array.isArray(resumeData?.certifications) ? resumeData.certifications : [];
  const achievements = Array.isArray(resumeData?.achievements) ? resumeData.achievements : [];
  const summary = String(resumeData?.summary || '');

  const words = (rawText || '').match(/\b[a-zA-Z0-9_-]+\b/g) || [];

  if (words.length < 15 && skills.length === 0 && experience.length === 0) {
    return {
      overall_quality_score: 0.0,
      status: "UNREADABLE_OR_EMPTY",
      message: "Resume contains insufficient readable text to perform quality analysis.",
      core_sections_detected: [] as string[],
      rubric_breakdown: {
        contact_info: { score: 0.0, max_score: 15.0, deductions: ["No contact info extracted."] },
        core_sections: { score: 0.0, max_score: 30.0, deductions: ["No core sections detected."] },
        content_depth_and_metrics: { score: 0.0, max_score: 25.0, deductions: ["No experience entries found."] },
        action_verbs: { score: 0.0, max_score: 15.0, deductions: ["No bullets found."] },
        additional_sections: { score: 0.0, max_score: 15.0, deductions: ["No additional sections."] }
      },
      missing_information: ["Full Resume Text"],
      improvement_suggestions: ["Upload a text-readable PDF or DOCX file."]
    };
  }

  const deductions: Record<string, string[]> = {
    contact_info: [],
    core_sections: [],
    content_depth_and_metrics: [],
    action_verbs: [],
    additional_sections: []
  };

  // 1. Contact Info (15 pts)
  let contactScore = 0.0;
  const name = String(pInfo.full_name || '').trim();
  if (name && !['candidate', 'not found in resume', 'not found', ''].includes(name.toLowerCase())) {
    contactScore += 5.0;
  } else {
    deductions.contact_info.push("Candidate name is missing from resume header (-5 pts)");
  }

  const email = String(pInfo.email || '').trim();
  if (email && email.includes('@') && email.toLowerCase() !== 'not found in resume') {
    contactScore += 5.0;
  } else {
    deductions.contact_info.push("Valid contact email address is missing (-5 pts)");
  }

  const phone = String(pInfo.phone || '').trim();
  if (phone && phone.toLowerCase() !== 'not found in resume') {
    contactScore += 3.0;
  } else {
    deductions.contact_info.push("Contact phone number is missing (-3 pts)");
  }

  const links = [pInfo.linkedin_url, pInfo.github_url];
  const hasValidLink = links.some(l => l && String(l).includes('http'));
  if (hasValidLink) {
    contactScore += 2.0;
  } else {
    deductions.contact_info.push("Professional profile link (LinkedIn or GitHub) is missing (-2 pts)");
  }

  // 2. Core Section Completeness (30 pts)
  let coreScore = 0.0;
  if (experience.length > 0) {
    coreScore += 10.0;
  } else {
    deductions.core_sections.push("Work experience section is missing (-10 pts)");
  }

  if (education.length > 0) {
    coreScore += 10.0;
  } else {
    deductions.core_sections.push("Education section is missing (-10 pts)");
  }

  if (skills.length >= 3) {
    coreScore += 10.0;
  } else if (skills.length >= 1) {
    coreScore += 5.0;
    deductions.core_sections.push(`Only ${skills.length} skills detected; recommended to list at least 3-5 core technical proficiencies (-5 pts)`);
  } else {
    deductions.core_sections.push("Technical skills section is missing (-10 pts)");
  }

  // 3. Content Depth & Specificity (25 pts)
  let depthScore = 0.0;
  if (experience.length > 0) {
    let descCount = 0;
    let hasMetrics = false;
    let hasDates = false;

    for (const exp of experience) {
      const desc = String(exp.description || '').trim();
      const dur = String(exp.duration || '').trim();
      if (desc.split(/\s+/).length >= 8) descCount++;
      if (/\b(?:\d+%\+?|\$\d+|\d+\+?\s*(?:users|qps|ms|k|mb|gb|tb|million|engineers?|teams?))\b/i.test(desc)) {
        hasMetrics = true;
      }
      if (dur && /\b(20\d{2}|19\d{2}|present|current)\b/i.test(dur)) {
        hasDates = true;
      }
    }

    if (descCount > 0) {
      depthScore += 10.0;
    } else {
      deductions.content_depth_and_metrics.push("Work experience entries lack substantive responsibility details (-10 pts)");
    }

    if (hasMetrics) {
      depthScore += 10.0;
    } else {
      deductions.content_depth_and_metrics.push("No quantifiable metrics (percentages, volume, latency) found in experience descriptions (-10 pts)");
    }

    if (hasDates) {
      depthScore += 5.0;
    } else {
      deductions.content_depth_and_metrics.push("Verifiable employment dates (e.g. '2021 - 2024') not found on experience entries (-5 pts)");
    }
  } else {
    deductions.content_depth_and_metrics.push("Experience section empty; cannot evaluate depth, metrics, or tenure (-25 pts)");
  }

  // 4. Action Verbs & Phrasing (15 pts)
  let actionScore = 0.0;
  const passivePhrasesFound: string[] = [];
  let actionVerbCount = 0;
  let totalBullets = 0;

  if (experience.length > 0) {
    for (const exp of experience) {
      const desc = String(exp.description || '').trim();
      if (!desc) continue;
      const lines = desc.split('\n').map(l => l.replace(/^[-*• \t]+/, '').trim()).filter(Boolean);
      for (const b of lines) {
        totalBullets++;
        const firstWord = (b.split(/\s+/)[0] || '').toLowerCase().replace(/[^a-z]/g, '');
        if (ACTION_VERBS.has(firstWord)) {
          actionVerbCount++;
        }
        for (const phrase of WEAK_PASSIVE_PHRASES) {
          if (b.toLowerCase().includes(phrase) && !passivePhrasesFound.includes(phrase)) {
            passivePhrasesFound.push(phrase);
          }
        }
      }
    }

    if (totalBullets > 0 && (actionVerbCount / totalBullets) >= 0.5) {
      actionScore += 10.0;
    } else if (actionVerbCount > 0) {
      actionScore += 5.0;
      deductions.action_verbs.push(`Only ${actionVerbCount}/${totalBullets} experience bullet lines start with strong action verbs (-5 pts)`);
    } else {
      deductions.action_verbs.push("Experience bullets do not start with recognized action verbs (-10 pts)");
    }

    if (passivePhrasesFound.length === 0) {
      actionScore += 5.0;
    } else {
      const deductPts = Math.min(5.0, passivePhrasesFound.length * 2.0);
      actionScore += Math.max(0.0, 5.0 - deductPts);
      const phrasesStr = passivePhrasesFound.slice(0, 3).map(p => `"${p}"`).join(', ');
      deductions.action_verbs.push(`Passive phrasing detected (${phrasesStr}) (-${deductPts} pts)`);
    }
  } else {
    deductions.action_verbs.push("No work experience bullets found to evaluate action verbs (-15 pts)");
  }

  // 5. Additional Sections (15 pts)
  let additionalScore = 0.0;
  if (summary && summary.split(/\s+/).length >= 15) {
    additionalScore += 5.0;
  } else if (summary) {
    additionalScore += 2.5;
    deductions.additional_sections.push("Professional summary is very brief; consider expanding to 2-3 sentences (-2.5 pts)");
  } else {
    deductions.additional_sections.push("Professional summary section is missing (-5 pts)");
  }

  if (projects.length > 0) {
    additionalScore += 5.0;
  } else {
    deductions.additional_sections.push("Technical projects section is missing (-5 pts)");
  }

  if (certifications.length > 0 || achievements.length > 0) {
    additionalScore += 5.0;
  } else {
    deductions.additional_sections.push("Certifications or achievements section is missing (-5 pts)");
  }

  const totalScore = Math.round((contactScore + coreScore + depthScore + actionScore + additionalScore) * 10) / 10;
  const clampedScore = Math.max(0.0, Math.min(100.0, totalScore));

  const missingInfo: string[] = [];
  if (!name || name.toLowerCase() === 'candidate') missingInfo.push("Candidate Full Name");
  if (!email) missingInfo.push("Email Address");
  if (!phone) missingInfo.push("Phone Number");
  if (!hasValidLink) missingInfo.push("LinkedIn / Portfolio Link");
  if (experience.length === 0) missingInfo.push("Work Experience Section");
  if (education.length === 0) missingInfo.push("Education Section");
  if (skills.length === 0) missingInfo.push("Technical Skills Section");

  const suggestions: string[] = [];
  for (const catDeductions of Object.values(deductions)) {
    for (const d of catDeductions) {
      suggestions.push(d);
    }
  }

  const coreSectionsDetected: string[] = [];
  if (skills.length > 0) coreSectionsDetected.push("Skills");
  if (experience.length > 0) coreSectionsDetected.push("Experience");
  if (education.length > 0) coreSectionsDetected.push("Education");
  if (projects.length > 0) coreSectionsDetected.push("Projects");
  if (certifications.length > 0 || achievements.length > 0) coreSectionsDetected.push("Certifications");

  return {
    overall_quality_score: clampedScore,
    word_count: words.length,
    word_count_status: `${words.length} words detected`,
    core_sections_detected: coreSectionsDetected,
    rubric_breakdown: {
      contact_info: { score: Math.round(contactScore * 10) / 10, max_score: 15.0, deductions: deductions.contact_info },
      core_sections: { score: Math.round(coreScore * 10) / 10, max_score: 30.0, deductions: deductions.core_sections },
      content_depth_and_metrics: { score: Math.round(depthScore * 10) / 10, max_score: 25.0, deductions: deductions.content_depth_and_metrics },
      action_verbs: { score: Math.round(actionScore * 10) / 10, max_score: 15.0, deductions: deductions.action_verbs },
      additional_sections: { score: Math.round(additionalScore * 10) / 10, max_score: 15.0, deductions: deductions.additional_sections }
    },
    missing_information: missingInfo.length > 0 ? missingInfo : ["No critical contact or section information missing."],
    improvement_suggestions: suggestions.length > 0 ? suggestions : ["Resume meets all core quality standards."]
  };
}

export function generateConcreteImprovementsTS(resumeData: any, rawText: string, targetJd?: string) {
  const improvements: any[] = [];
  const pInfo = resumeData?.personal_info || {};
  const experience: any[] = Array.isArray(resumeData?.experience) ? resumeData.experience : [];
  const skills: string[] = Array.isArray(resumeData?.skills) ? resumeData.skills : [];
  const summary = String(resumeData?.summary || '');

  // 1. Contact
  if (!pInfo.phone) {
    improvements.push({
      id: "contact_phone",
      section: "contact",
      fieldOrBullet: "Phone Number",
      existingText: "(Not provided)",
      problem: "Contact phone number is not listed in resume header.",
      suggestedRevision: "",
      whyItHelps: "Allows recruiters and hiring managers to quickly initiate phone screening.",
      isOptional: true
    });
  }

  if (!pInfo.linkedin_url) {
    improvements.push({
      id: "contact_linkedin",
      section: "contact",
      fieldOrBullet: "LinkedIn Profile",
      existingText: "(Not provided)",
      problem: "LinkedIn profile link is missing.",
      suggestedRevision: "",
      whyItHelps: "A verified LinkedIn URL helps recruiters confirm your experience and recommendations.",
      isOptional: true
    });
  }

  // 2. Summary
  if (!summary || summary.trim().length < 10) {
    const topSkills = skills.slice(0, 4).join(', ') || 'relevant technical capabilities';
    improvements.push({
      id: "summary_missing",
      section: "summary",
      fieldOrBullet: "Professional Summary",
      existingText: "(No summary)",
      problem: "Resume does not include a professional summary.",
      suggestedRevision: `Software Engineer with experience in ${topSkills}. Dedicated to building reliable, high-performance systems.`,
      whyItHelps: "A concise 2-3 sentence overview immediately establishes your domain focus for recruiters.",
      isOptional: true
    });
  }

  // 3. Experience Bullets
  experience.forEach((exp: any, expIdx: number) => {
    const role = exp.role || 'Experience entry';
    const company = exp.company || '';
    const roleLabel = `${role}${company ? ` @ ${company}` : ''}`;
    const desc = String(exp.description || '').trim();
    if (!desc) return;

    const lines = desc.split('\n').map(l => l.replace(/^[-*• \t]+/, '').trim()).filter(Boolean);
    lines.forEach((line: string, lineIdx: number) => {
      const { fgRewrite } = rewriteBulletFactGroundedTS(line);
      const foundPassive = WEAK_PASSIVE_PHRASES.filter(p => line.toLowerCase().includes(p));

      if (foundPassive.length > 0 && fgRewrite.toLowerCase() !== line.toLowerCase()) {
        improvements.push({
          id: `exp_rewrite_${expIdx}_${lineIdx}`,
          section: "experience",
          fieldOrBullet: `${roleLabel} (Bullet #${lineIdx + 1})`,
          existingText: line,
          problem: `Contains passive phrasing "${foundPassive[0]}".`,
          suggestedRevision: fgRewrite,
          whyItHelps: "Starting with an active verb demonstrates direct initiative and ownership.",
          isOptional: false,
          expIndex: expIdx,
          bulletIndex: lineIdx
        });
      }

      const hasMetric = /\b(?:\d+%\+?|\$\d+|\d+\+?\s*(?:users|qps|ms|k|mb|gb|tb|million|engineers?|teams?))\b/i.test(line);
      if (!hasMetric && line.split(/\s+/).length >= 8) {
        improvements.push({
          id: `exp_metric_${expIdx}_${lineIdx}`,
          section: "experience",
          fieldOrBullet: `${roleLabel} (Bullet #${lineIdx + 1})`,
          existingText: line,
          problem: "Description lacks quantifiable metrics or impact scale.",
          suggestedRevision: line + " (e.g., resulting in measurable performance improvement)",
          whyItHelps: "Quantifiable metrics give recruiters concrete evidence of your engineering scope. (Add your genuine metrics; do not fabricate numbers).",
          isOptional: true,
          expIndex: expIdx,
          bulletIndex: lineIdx
        });
      }
    });
  });

  // 4. Target JD Skill Gaps
  if (targetJd && targetJd.trim()) {
    const { reqSkills, prefSkills } = parseJDSections(targetJd);
    const resSkillsLower = new Set(skills.map(s => s.toLowerCase()));

    for (const req of reqSkills) {
      if (!resSkillsLower.has(req.toLowerCase())) {
        improvements.push({
          id: `req_skill_${req.toLowerCase()}`,
          section: "skills",
          fieldOrBullet: `Required Skill: ${req}`,
          existingText: "(Not in resume)",
          problem: `Target job description lists "${req}" as a required qualification, but it is absent from your resume.`,
          suggestedRevision: req,
          whyItHelps: `Adding "${req}" directly improves ATS required-skills match from 0% to credited. Only add if you possess actual hands-on experience.`,
          isOptional: false
        });
      }
    }

    for (const pref of prefSkills) {
      if (!resSkillsLower.has(pref.toLowerCase())) {
        improvements.push({
          id: `pref_skill_${pref.toLowerCase()}`,
          section: "skills",
          fieldOrBullet: `Preferred Skill: ${pref}`,
          existingText: "(Not in resume)",
          problem: `Target job lists "${pref}" as a preferred/bonus qualification.`,
          suggestedRevision: pref,
          whyItHelps: `Listing "${pref}" earns preferred skills credit in employer ATS screening.`,
          isOptional: true
        });
      }
    }
  }

  return improvements;
}

export function analyzeResumeContentTS(resumeData: any, rawText?: string, targetJobDescription?: string) {
  const raw = rawText || resumeData?.raw_text || "";
  const pInfo = resumeData?.personal_info || {};

  const extractedFacts = {
    personal_info: {
      full_name: pInfo.full_name || "Not found in resume",
      email: pInfo.email || "Not found in resume",
      phone: pInfo.phone || "Not found in resume",
      location: pInfo.location || "Not found in resume",
      linkedin_url: pInfo.linkedin_url || "Not found in resume",
      github_url: pInfo.github_url || "Not found in resume"
    },
    summary: resumeData?.summary || "Not found in resume",
    skills: Array.isArray(resumeData?.skills) ? resumeData.skills : [],
    education: Array.isArray(resumeData?.education) ? resumeData.education : [],
    experience: Array.isArray(resumeData?.experience) ? resumeData.experience : [],
    projects: Array.isArray(resumeData?.projects) ? resumeData.projects : [],
    certifications: Array.isArray(resumeData?.certifications) ? resumeData.certifications : [],
    achievements: Array.isArray(resumeData?.achievements) ? resumeData.achievements : []
  };

  const qualityAudit = calculateResumeQualityScoreTS(resumeData, raw);
  const improvements = generateConcreteImprovementsTS(resumeData, raw, targetJobDescription);

  const bulletRewrites: any[] = [];
  for (const exp of extractedFacts.experience) {
    const role = exp.role || "Not found in resume";
    const company = exp.company || "Not found in resume";
    const duration = exp.duration || "Not found in resume";
    const desc = String(exp.description || "");
    if (!desc) continue;

    const { fgRewrite, metricNote } = rewriteBulletFactGroundedTS(desc);
    bulletRewrites.push({
      role,
      company,
      duration,
      original_bullet: desc,
      fact_grounded_rewrite: fgRewrite,
      metric_guidance: metricNote
    });
  }

  const factGroundedRewrites = {
    original_summary: resumeData?.summary || "Not found in resume",
    fact_grounded_summary: resumeData?.summary || "Not found in resume",
    bullet_rewrites: bulletRewrites,
    improvements,
    rewriting_rule: "Rewrites use ONLY facts extracted from original resume. Zero fictional skills, metrics, or experience generated."
  };

  let jobMatch: any = null;
  if (targetJobDescription && targetJobDescription.trim()) {
    jobMatch = calculateDeterministicATSScore(raw, targetJobDescription, resumeData);
  }

  return {
    extracted_facts: extractedFacts,
    quality_audit: qualityAudit,
    fact_grounded_rewrites: factGroundedRewrites,
    improvements,
    job_match: jobMatch
  };
}

export function optimizeResumeContentTS(resumeData: any, targetJobDescription: string, targetJobTitle: string) {
  // Grounded optimization: creates actionable improvements without mutating the user's authentic facts
  const existingSkills: string[] = Array.isArray(resumeData?.skills) ? resumeData.skills : [];
  const targetKeywords: string[] = targetJobDescription ? extractTechKeywords(targetJobDescription) : [];

  const existingLower = new Set(existingSkills.map(s => s.toLowerCase()));
  const targetLower = new Set(targetKeywords.map(k => k.toLowerCase()));

  const matchingSkills = existingSkills.filter(s => targetLower.has(s.toLowerCase()));
  const missingSkills = targetKeywords.filter(k => !existingLower.has(k.toLowerCase()));

  const improvements = generateConcreteImprovementsTS(resumeData, resumeData?.raw_text || '', targetJobDescription);

  const suggestedRewrites = improvements
    .filter((imp: any) => imp.section === 'experience' && imp.suggestedRevision)
    .map((imp: any) => ({
      section: 'experience',
      itemIndex: imp.expIndex,
      bulletIndex: imp.bulletIndex,
      original: imp.existingText,
      suggested: imp.suggestedRevision,
      reason: imp.problem + " " + imp.whyItHelps
    }));

  return {
    original_content: { ...resumeData },
    optimized_content: { ...resumeData },
    matched_skills: matchingSkills,
    missing_keywords: missingSkills,
    suggested_rewrites: suggestedRewrites,
    improvements,
    optimization_notes: [
      `Identified ${matchingSkills.length} skills matching target job description.`,
      `Found ${missingSkills.length} missing keywords from job description. Add to skills only if genuine experience exists.`,
      'Maintained strict factual integrity based on user\'s uploaded resume. Zero fabricated information.'
    ]
  };
}
