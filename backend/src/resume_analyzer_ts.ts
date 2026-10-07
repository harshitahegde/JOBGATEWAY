// 3-Layer Fact-Grounded Resume Analysis Engine for Node.js / TypeScript
// 100% logic and output parity with Python FastAPI resume_analyzer.py

const WEAK_PASSIVE_PHRASES = [
  "responsible for", "worked on", "helped with", "assisted in", "duties included",
  "tasked with", "involved in", "handled", "participated in"
];

function verbIngToEdTS(ingVerb: string): string {
  const w = ingVerb.toLowerCase();
  if (w === "building") return "Built";
  if (w === "creating") return "Created";
  if (w === "designing") return "Designed";
  if (w === "developing") return "Developed";
  if (w === "engineering") return "Engineered";
  if (w === "implementing") return "Implemented";
  if (w === "managing") return "Managed";
  if (w === "optimizing") return "Optimized";
  if (w === "writing") return "Wrote";
  if (w === "testing") return "Tested";
  if (w === "deploying") return "Deployed";
  if (w === "maintaining") return "Maintained";
  if (w === "configuring") return "Configured";
  if (w === "automating") return "Automated";
  if (w === "scaling") return "Scaled";
  if (w.endsWith("ing")) {
    return w.slice(0, -3) + "ed";
  }
  return ingVerb.charAt(0).toUpperCase() + ingVerb.slice(1);
}

function rewriteBulletFactGroundedTS(bullet: string): { fgRewrite: string; metricNote: string } {
  const cleanBullet = bullet.trim();
  if (!cleanBullet) {
    return { fgRewrite: "", metricNote: "Insufficient information" };
  }

  const hasMetric = /\b(\d+%|\d+\+|\$\d+|\d+\s*users|\d+\s*ms|\d+\s*k|\d+\s*GB|\d+\s*TB|\d+\s*x)\b/i.test(cleanBullet);
  const metricNote = hasMetric ? "Contains verified numbers" : "Add a verified metric if available.";

  let rewritten = cleanBullet;

  const patterns: { regex: RegExp; replacer: (match: any, g1?: string) => string }[] = [
    {
      regex: /^(?:was\s+)?responsible\s+for\s+(?:the\s+)?([a-z]+ing)\b/i,
      replacer: (_, g1) => verbIngToEdTS(g1 || '')
    },
    {
      regex: /^(?:was\s+)?responsible\s+for\s+/i,
      replacer: () => ''
    },
    {
      regex: /^worked\s+on\s+(?:the\s+)?([a-z]+ing)\b/i,
      replacer: (_, g1) => verbIngToEdTS(g1 || '')
    },
    {
      regex: /^worked\s+on\s+/i,
      replacer: () => 'Developed '
    },
    {
      regex: /^helped\s+with\s+(?:the\s+)?([a-z]+ing)\b/i,
      replacer: (_, g1) => 'Contributed to ' + g1
    },
    {
      regex: /^helped\s+with\s+/i,
      replacer: () => 'Contributed to '
    },
    {
      regex: /^assisted\s+in\s+(?:the\s+)?([a-z]+ing)\b/i,
      replacer: (_, g1) => 'Assisted with ' + g1
    },
    {
      regex: /^assisted\s+in\s+/i,
      replacer: () => 'Assisted with '
    },
    {
      regex: /^duties\s+included\s+(?:the\s+)?([a-z]+ing)\b/i,
      replacer: (_, g1) => verbIngToEdTS(g1 || '')
    },
    {
      regex: /^duties\s+included\s+/i,
      replacer: () => ''
    },
    {
      regex: /^tasked\s+with\s+(?:the\s+)?([a-z]+ing)\b/i,
      replacer: (_, g1) => verbIngToEdTS(g1 || '')
    },
    {
      regex: /^tasked\s+with\s+/i,
      replacer: () => ''
    },
    {
      regex: /^involved\s+in\s+(?:the\s+)?([a-z]+ing)\b/i,
      replacer: (_, g1) => 'Participated in ' + g1
    },
    {
      regex: /^involved\s+in\s+/i,
      replacer: () => 'Participated in '
    },
    {
      regex: /^handled\s+(?:the\s+)?([a-z]+ing)\b/i,
      replacer: (_, g1) => verbIngToEdTS(g1 || '')
    },
    {
      regex: /^handled\s+/i,
      replacer: () => 'Managed '
    }
  ];

  for (const item of patterns) {
    if (item.regex.test(rewritten)) {
      rewritten = rewritten.replace(item.regex, (match, g1) => item.replacer(match, g1));
      break;
    }
  }

  rewritten = rewritten.trim();
  if (rewritten) {
    rewritten = rewritten.charAt(0).toUpperCase() + rewritten.slice(1);
  }

  return { fgRewrite: rewritten, metricNote };
}

export function analyzeResumeContentTS(resumeData: any, rawText?: string, targetJobDescription?: string) {
  const raw = rawText || resumeData?.raw_text || "";
  const pInfo = resumeData?.personal_info || {};

  // -------------------------------------------------------------
  // LAYER 1: EXTRACTED FACTS (Factual Baseline)
  // -------------------------------------------------------------
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

  // -------------------------------------------------------------
  // LAYER 2: QUALITY AUDIT & SUGGESTIONS
  // -------------------------------------------------------------
  const suggestions: string[] = [];
  const missingInfo: string[] = [];
  const auditNotes: string[] = [];

  if (!pInfo.email) {
    missingInfo.push("Email address: Not found in resume header.");
    suggestions.push("Ensure your primary email address is clearly listed at the top of your resume.");
  }
  if (!pInfo.phone) {
    missingInfo.push("Phone number: Not found in resume.");
    suggestions.push("Consider adding a contact phone number for recruiters.");
  }
  if (!pInfo.linkedin_url) {
    missingInfo.push("LinkedIn profile: Not found in resume.");
    suggestions.push("Including a LinkedIn profile link helps recruiters verify your professional background.");
  }

  const words = raw.match(/\b[a-zA-Z0-9_-]+\b/g) || [];
  const wordCount = words.length;

  if (wordCount < 150) {
    auditNotes.push(`Brief resume length detected (${wordCount} words).`);
    suggestions.push("Your resume text is concise. Consider elaborating on key technical responsibilities and project details.");
  } else if (wordCount > 900) {
    auditNotes.push(`Extended resume length detected (${wordCount} words).`);
    suggestions.push("Your resume exceeds 900 words. Consider tightening bullet points for maximum readability.");
  } else {
    auditNotes.push(`Optimal resume length (${wordCount} words).`);
  }

  const coreSections: string[] = [];
  if (extractedFacts.skills.length > 0) coreSections.push("Skills");
  else {
    missingInfo.push("Technical Skills section: Not found in resume.");
    suggestions.push("Create a distinct 'Technical Skills' section listing your primary programming languages and frameworks.");
  }

  if (extractedFacts.experience.length > 0) coreSections.push("Experience");
  else {
    missingInfo.push("Work Experience section: Not found in resume.");
    suggestions.push("Include a 'Work Experience' or 'Professional Experience' section with role titles and dates.");
  }

  if (extractedFacts.education.length > 0) coreSections.push("Education");
  else {
    missingInfo.push("Education section: Not found in resume.");
    suggestions.push("List your academic background under an 'Education' section.");
  }

  const weakVerbsFound: string[] = [];
  const bulletsWithoutMetrics: string[] = [];

  for (const exp of extractedFacts.experience) {
    const desc = String(exp.description || '');
    if (!desc) continue;

    const descLower = desc.toLowerCase();
    for (const phrase of WEAK_PASSIVE_PHRASES) {
      if (descLower.includes(phrase) && !weakVerbsFound.includes(phrase)) {
        weakVerbsFound.push(phrase);
      }
    }

    const hasMetric = /\b(\d+%|\d+\+|\$\d+|\d+\s*users|\d+\s*ms|\d+\s*k)\b/i.test(desc);
    if (!hasMetric) {
      bulletsWithoutMetrics.push(exp.role || "Experience entry");
    }
  }

  if (weakVerbsFound.length > 0) {
    const phrasesStr = weakVerbsFound.slice(0, 3).map(p => `"${p}"`).join(', ');
    suggestions.push(`Passive phrasing detected (${phrasesStr}). Replace passive phrases with strong action verbs (e.g. Engineered, Architected, Developed).`);
  }

  if (bulletsWithoutMetrics.length > 0) {
    suggestions.push("Some work experience entries lack quantifiable metrics. If you have verified metrics (e.g., user count, query speed, project scope), consider adding them. Otherwise, do not fabricate numbers.");
  }

  const qualityScore = Math.round(Math.min(100.0, Math.max(20.0, 40.0 + (coreSections.length * 15.0) + (pInfo.email ? 10.0 : 0) + (weakVerbsFound.length === 0 ? 10.0 : 0))) * 10) / 10;

  const qualityAudit = {
    overall_quality_score: qualityScore,
    word_count: wordCount,
    word_count_status: `${wordCount} words detected`,
    core_sections_detected: coreSections,
    missing_information: missingInfo.length > 0 ? missingInfo : ["No critical contact or section information missing."],
    audit_notes: auditNotes,
    improvement_suggestions: suggestions
  };

  // -------------------------------------------------------------
  // LAYER 3: FACT-GROUNDED REWRITES (Zero Metric Invention)
  // -------------------------------------------------------------
  const origSummary = String(resumeData?.summary || '');
  let rewrittenSummary = "";
  if (origSummary.trim()) {
    rewrittenSummary = origSummary.trim();
    if (extractedFacts.skills.length > 0) {
      const topSk = extractedFacts.skills.slice(0, 5).join(', ');
      rewrittenSummary += ` Core competencies include ${topSk}.`;
    }
  } else {
    rewrittenSummary = "Not available (Summary section missing from original resume).";
  }

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
    original_summary: origSummary.trim() ? origSummary : "Not found in resume",
    fact_grounded_summary: rewrittenSummary,
    bullet_rewrites: bulletRewrites,
    rewriting_rule: "Rewrites use ONLY facts extracted from original resume. Zero fictional skills, metrics, or experience generated."
  };

  let targetJobGap: any = null;
  if (targetJobDescription && targetJobDescription.trim()) {
    const { extractTechKeywords } = require('./ats_engine');
    const jdSkills = new Set<string>(extractTechKeywords(targetJobDescription));
    const resSkills = new Set<string>(extractedFacts.skills);

    const matched = Array.from(jdSkills).filter(s => resSkills.has(s)).sort();
    const missing = Array.from(jdSkills).filter(s => !resSkills.has(s)).sort();

    targetJobGap = {
      matched_skills: matched,
      missing_skills: missing,
      guidance: "Only add missing skills to your resume if you possess genuine hands-on experience with them."
    };
  }

  return {
    extracted_facts: extractedFacts,
    quality_audit: qualityAudit,
    fact_grounded_rewrites: factGroundedRewrites,
    target_job_gap: targetJobGap
  };
}

export { rewriteBulletFactGroundedTS };

export function optimizeResumeContentTS(resumeData: any, targetJobDescription: string, targetJobTitle: string) {
  const { extractTechKeywords } = require('./ats_engine');
  
  const existingSkills: string[] = Array.isArray(resumeData?.skills) ? resumeData.skills : [];
  const targetKeywords: string[] = targetJobDescription ? extractTechKeywords(targetJobDescription) : [];
  
  const existingLower = new Set(existingSkills.map(s => s.toLowerCase()));
  const targetLower = new Set(targetKeywords.map(k => k.toLowerCase()));
  
  const matchingSkills = existingSkills.filter(s => targetLower.has(s.toLowerCase()));
  const otherSkills = existingSkills.filter(s => !targetLower.has(s.toLowerCase()));
  const missingSkills = targetKeywords.filter(k => !existingLower.has(k.toLowerCase()));
  
  const optimizedSkills = [...matchingSkills, ...otherSkills];
  
  const originalSummary = String(resumeData?.summary || '').trim();
  const roleTitle = targetJobTitle || 'Target Role';
  
  let optimizedSummary = '';
  if (originalSummary) {
    optimizedSummary = `Targeted ${roleTitle} professional. ${originalSummary}`;
    if (matchingSkills.length > 0) {
      optimizedSummary += ` Key aligned competencies include ${matchingSkills.slice(0, 4).join(', ')}.`;
    }
  } else {
    optimizedSummary = `Targeted ${roleTitle} candidate with focus on ${matchingSkills.length > 0 ? matchingSkills.slice(0, 4).join(', ') : 'relevant technical capabilities'}.`;
  }
  
  const rawExp: any[] = Array.isArray(resumeData?.experience) ? resumeData.experience : [];
  const optimizedExperience: any[] = [];
  const suggestedRewrites: any[] = [];
  
  for (let i = 0; i < rawExp.length; i++) {
    const exp = rawExp[i];
    const role = exp?.role || '';
    const company = exp?.company || '';
    const duration = exp?.duration || '';
    const desc = String(exp?.description || '');
    
    optimizedExperience.push({
      role,
      company,
      duration,
      description: desc
    });
    
    if (desc) {
      const { fgRewrite, metricNote } = rewriteBulletFactGroundedTS(desc);
      if (fgRewrite && fgRewrite.trim().toLowerCase() !== desc.trim().toLowerCase()) {
        suggestedRewrites.push({
          section: 'experience',
          itemIndex: i,
          field: 'description',
          role,
          company,
          original: desc,
          suggested: fgRewrite,
          reason: 'Replaces passive phrasing with strong action verb while preserving original facts.',
          metricGuidance: metricNote
        });
      }
    }
  }
  
  const optimizedData = {
    personal_info: resumeData?.personal_info || {},
    target_job_title: targetJobTitle,
    summary: optimizedSummary,
    skills: optimizedSkills,
    education: Array.isArray(resumeData?.education) ? resumeData.education : [],
    experience: optimizedExperience,
    projects: Array.isArray(resumeData?.projects) ? resumeData.projects : [],
    certifications: Array.isArray(resumeData?.certifications) ? resumeData.certifications : [],
    achievements: Array.isArray(resumeData?.achievements) ? resumeData.achievements : []
  };
  
  if (resumeData?.raw_text) {
    (optimizedData as any).raw_text = resumeData.raw_text;
  }
  
  return {
    original_content: {
      personal_info: resumeData?.personal_info || {},
      summary: originalSummary,
      skills: existingSkills,
      experience: resumeData?.experience || [],
      education: resumeData?.education || [],
      projects: resumeData?.projects || [],
      certifications: resumeData?.certifications || [],
      achievements: resumeData?.achievements || []
    },
    optimized_content: optimizedData,
    matched_skills: matchingSkills,
    missing_keywords: missingSkills,
    suggested_rewrites: suggestedRewrites,
    optimization_notes: [
      `Identified ${matchingSkills.length} skills matching target job description.`,
      `Found ${missingSkills.length} missing keywords. Add to skills only if genuine experience exists.`,
      'Maintained strict factual accuracy based on user\'s uploaded resume.'
    ]
  };
}
