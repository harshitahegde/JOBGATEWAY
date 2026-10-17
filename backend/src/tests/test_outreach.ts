import { generateFactGroundedOutreach, extractVerifiableResumeFacts, findRelevantMatch } from '../outreach_generator';
import { DraftOnlyEmailProvider } from '../providers/email_provider';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`[PASS]: ${message}`);
  }
}

console.log("==========================================");
console.log("Running Comprehensive Outreach Regression Tests");
console.log("==========================================\n");

// 1. Emails with no company, role, recruiter name, or candidate name
const t1_empty = generateFactGroundedOutreach({
  candidateName: "",
  companyName: "",
  jobTitle: "",
  recruiterName: "",
  resumeFacts: {}
});
assert(t1_empty.subject === "Inquiry: Career Opportunities", "1.1 Subject for empty input is clean and professional");
assert(t1_empty.body.startsWith("Dear Hiring Team,"), "1.2 Greeting for empty input uses neutral professional team greeting");
assert(!t1_empty.body.includes("undefined"), "1.3 No 'undefined' in body for empty input");
assert(!t1_empty.subject.includes("undefined"), "1.4 No 'undefined' in subject for empty input");
assert(!t1_empty.body.includes("null"), "1.5 No 'null' in body for empty input");
assert(t1_empty.body.endsWith("Best regards,"), "1.6 Sign-off gracefully omits missing candidate name without awkward literals");
assert(!t1_empty.body.includes("Candidate"), "1.7 Does NOT insert literal 'Candidate'");

// 2. Company-only inquiry
const t2_companyOnly = generateFactGroundedOutreach({
  candidateName: "Jordan Smith",
  companyName: "Acme Innovations",
  jobTitle: "",
  recruiterName: "",
  resumeFacts: { fullName: "Jordan Smith", skills: ["TypeScript"] }
});
assert(t2_companyOnly.subject === "Inquiry: Career Opportunities at Acme Innovations", "2.1 Subject mentions company correctly");
assert(t2_companyOnly.body.startsWith("Dear Acme Innovations Hiring Team,"), "2.2 Greeting addresses Acme Innovations Hiring Team");
assert(t2_companyOnly.body.includes("suitable opportunities at Acme Innovations"), "2.3 Expresses interest in company without inventing role");
assert(!t2_companyOnly.body.includes("Software Engineer"), "2.4 Does NOT invent a target role");

// 3. Role-only inquiry
const t3_roleOnly = generateFactGroundedOutreach({
  candidateName: "Jordan Smith",
  companyName: "",
  jobTitle: "DevOps Engineer",
  recruiterName: "",
  resumeFacts: { fullName: "Jordan Smith" }
});
assert(t3_roleOnly.subject === "Interest in DevOps Engineer Opportunities", "3.1 Subject adapts to role without company");
assert(t3_roleOnly.body.startsWith("Dear Hiring Team,"), "3.2 Neutral greeting when company is missing");
assert(t3_roleOnly.body.includes("DevOps Engineer opportunities"), "3.3 Naturally mentions role");
assert(!t3_roleOnly.body.includes("at "), "3.4 Does not generate dangling 'at ' preposition");

// 4. Company and role supplied together
const t4_both = generateFactGroundedOutreach({
  candidateName: "Jordan Smith",
  companyName: "Starlight Dynamics",
  jobTitle: "Senior Frontend Engineer",
  recruiterName: "Elena Rostova",
  resumeFacts: { fullName: "Jordan Smith", skills: ["React", "TypeScript"] }
});
assert(t4_both.subject === "Interest in Senior Frontend Engineer Opportunities at Starlight Dynamics", "4.1 Subject combines role and company naturally");
assert(t4_both.body.startsWith("Dear Elena Rostova,"), "4.2 Uses specific recruiter name when supplied");
assert(t4_both.body.includes("Senior Frontend Engineer opportunities at Starlight Dynamics"), "4.3 Naturally combines role and company in body");

// 5. Job description with relevant resume evidence
const t5_withEvidence = generateFactGroundedOutreach({
  candidateName: "Jordan Smith",
  companyName: "CloudScale",
  jobTitle: "Fullstack Developer",
  jobDescription: "We are seeking an engineer experienced in React, Next.js, and distributed microservices architecture.",
  resumeFacts: {
    fullName: "Jordan Smith",
    skills: ["React", "PostgreSQL", "Docker"],
    experience: [{ title: "Frontend Lead", company: "WebCorp" }]
  }
});
assert(t5_withEvidence.body.includes("Given my background in React"), "5.1 Uses verified resume match ('React') to ground interest");
assert(t5_withEvidence.groundedSkills.includes("React"), "5.2 groundedSkills array contains verified match");
assert(!t5_withEvidence.body.includes("Docker"), "5.3 Does NOT dump unrelated skills (Docker, PostgreSQL)");

// 6. Job description with NO supported matching experience
const t6_noEvidence = generateFactGroundedOutreach({
  candidateName: "Jordan Smith",
  companyName: "FinTech Quantum",
  jobTitle: "Rust Low-Latency Engineer",
  jobDescription: "Must have 5+ years of high frequency trading kernel development in C++ and Rust.",
  resumeFacts: {
    fullName: "Jordan Smith",
    skills: ["JavaScript", "UI Design"],
    experience: [{ title: "Graphic Designer", company: "ArtStudio" }]
  }
});
assert(!t6_noEvidence.body.includes("Given my background in Rust"), "6.1 Does NOT claim background in Rust");
assert(!t6_noEvidence.body.includes("Given my background in C++"), "6.2 Does NOT claim background in C++");
assert(t6_noEvidence.body.includes("Having reviewed the position requirements"), "6.3 Uses truthful requirement review sentence without hallucinations");
assert(t6_noEvidence.groundedSkills.length === 0, "6.4 groundedSkills is empty when no match exists");

// 7. Resumes containing 50+ skills: No skill stuffing
const fiftySkills = Array.from({ length: 50 }, (_, i) => `TechSkill_${i + 1}`);
const t7_fiftySkills = generateFactGroundedOutreach({
  candidateName: "Jordan Smith",
  companyName: "Enterprise Co",
  jobTitle: "Principal Architect",
  resumeFacts: { fullName: "Jordan Smith", skills: fiftySkills }
});
assert(!t7_fiftySkills.body.includes("TechSkill_1, TechSkill_2"), "7.1 Does NOT dump list of skills");
assert(t7_fiftySkills.body.split("\n\n").length <= 7, "7.2 Email draft remains concise and readable");

// 8. Correct subject, greeting, body, and sign-off without malformed placeholders
const placeholders = ["undefined", "null", "NaN", "[Company", "[Role", "[Recruiter", "[Candidate", "object Object"];
for (const draft of [t1_empty, t2_companyOnly, t3_roleOnly, t4_both, t5_withEvidence, t6_noEvidence, t7_fiftySkills]) {
  for (const ph of placeholders) {
    assert(!draft.body.includes(ph), `8. Zero malformed placeholder '${ph}' in body`);
    assert(!draft.subject.includes(ph), `8. Zero malformed placeholder '${ph}' in subject`);
  }
}

// 9. Video pitch URL: Included strictly when selected
const t9_withVideo = generateFactGroundedOutreach({
  candidateName: "Jordan Smith",
  companyName: "Acme",
  videoIntroUrl: "https://res.cloudinary.com/jobgateway/video/upload/v12345/jobgateway/videos/pitch_1.mp4"
});
assert(t9_withVideo.hasVideoIntro, "9.1 hasVideoIntro is true");
assert(t9_withVideo.body.includes("https://res.cloudinary.com/jobgateway/video/upload/v12345/jobgateway/videos/pitch_1.mp4"), "9.2 Video link present");

const t9_noVideo = generateFactGroundedOutreach({
  candidateName: "Jordan Smith",
  companyName: "Acme",
  videoIntroUrl: ""
});
assert(!t9_noVideo.hasVideoIntro, "9.3 hasVideoIntro is false");
assert(!t9_noVideo.body.includes("video"), "9.4 No video link when not provided");

// 10. Status strictly DRAFT upon generation & Draft-only provider test
assert(t1_empty.status === "DRAFT", "10.1 Generated email status is strictly DRAFT");
const draftProvider = new DraftOnlyEmailProvider();
assert(!draftProvider.isConfigured(), "10.2 Email provider correctly reports unconfigured");
draftProvider.sendEmail("recruiter@example.com", "Subject", "Body").then((sendRes) => {
  assert(!sendRes.success, "10.3 Send safely rejected without live provider");
  assert(sendRes.status === "FAILED", "10.4 Status is FAILED, never false-SENT");

  console.log("\n==========================================");
  console.log("ALL 28 OUTREACH REGRESSION ASSERTIONS PASSED! 🎉");
  console.log("==========================================\n");
});
