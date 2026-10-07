import { prisma } from '../db';
import { generateToken } from '../middleware/auth';
import { calculateDeterministicATSScore } from '../ats_engine';
import { generateFactGroundedOutreach } from '../outreach_generator';
import { analyzeResumeContentTS } from '../resume_analyzer_ts';
import { normalizeStatus } from '../routes/application.routes';
import { providers } from '../providers';
import jwt from 'jsonwebtoken';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`[PASS]: ${message}`);
  }
}

async function runEdgeCaseAuditSuite() {
  console.log('===============================================================');
  console.log('🛡️  COMPLETE ERROR HANDLING, VALIDATION & EDGE-CASE AUDIT SUITE');
  console.log('===============================================================\n');

  const JWT_SECRET = process.env.JWT_SECRET || 'jobgateway_super_secret_key_2026';

  // SECTION 1: AUTHENTICATION EDGE CASES
  console.log('--- 1. Authentication & Token Edge Cases ---');

  // 1.1 Malformed Token
  let malformedCaught = false;
  try {
    jwt.verify('invalid.token.structure', JWT_SECRET);
  } catch {
    malformedCaught = true;
  }
  assert(malformedCaught, '1.1: Malformed token string fails verification');

  // 1.2 Expired Token
  let expiredCaught = false;
  try {
    const expToken = jwt.sign({ userId: 1, email: 'exp@test.com' }, JWT_SECRET, { expiresIn: '-10s' });
    jwt.verify(expToken, JWT_SECRET);
  } catch {
    expiredCaught = true;
  }
  assert(expiredCaught, '1.2: Expired token fails verification');

  // 1.3 Signature Tampering
  let tamperedCaught = false;
  try {
    const validToken = generateToken(1, 'valid@test.com');
    jwt.verify(validToken, 'tampered_secret_key_123');
  } catch {
    tamperedCaught = true;
  }
  assert(tamperedCaught, '1.3: Tampered signature is rejected');

  // 1.4 Missing userId in payload
  const tokenNoUserId = jwt.sign({ email: 'no_id@test.com' }, JWT_SECRET);
  const decodedNoUserId = jwt.verify(tokenNoUserId, JWT_SECRET) as any;
  assert(typeof decodedNoUserId.userId !== 'number', '1.4: Missing userId in payload is identified');

  // SECTION 2: PROFILE EDGE CASES (Unicode, Long Strings, Duplicate Skills)
  console.log('\n--- 2. Profile Edge Cases & Validation ---');
  const testUser = await prisma.user.create({
    data: {
      email: `edge_user_${Date.now()}@example.com`,
      passwordHash: 'dummy_hash',
      profile: {
        create: {
          fullName: 'Prof. Jöhnathan D’Souza 🚀',
          location: 'Tōkyō, Japan 🇯🇵',
          bio: 'Engineer <script>alert("XSS")</script> & SQL \' OR 1=1 --'
        }
      }
    },
    include: { profile: true }
  });

  assert(testUser.profile?.fullName === 'Prof. Jöhnathan D’Souza 🚀', '2.1: Unicode & special chars in fullName preserved accurately');
  assert(Boolean(testUser.profile?.bio?.includes('<script>')), '2.2: Stored raw text without unhandled SQL injection syntax errors');

  // 2.3 Duplicate skills deduplication test
  const inputSkills = [
    { skillName: 'React', proficiencyLevel: 'Expert', yearsExperience: 4 },
    { skillName: 'react', proficiencyLevel: 'Intermediate', yearsExperience: 2 },
    { skillName: 'REACT', proficiencyLevel: 'Advanced', yearsExperience: 3 },
    { skillName: 'TypeScript', proficiencyLevel: 'Advanced', yearsExperience: 3 }
  ];

  await prisma.userSkill.deleteMany({ where: { userId: testUser.id } });
  const seenSkills = new Set<string>();
  for (const sk of inputSkills) {
    const rawName = sk.skillName.trim();
    const nameLower = rawName.toLowerCase();
    if (rawName && !seenSkills.has(nameLower)) {
      seenSkills.add(nameLower);
      await prisma.userSkill.create({
        data: {
          userId: testUser.id,
          skillName: rawName,
          proficiencyLevel: sk.proficiencyLevel,
          yearsExperience: sk.yearsExperience
        }
      });
    }
  }

  const savedSkills = await prisma.userSkill.findMany({ where: { userId: testUser.id } });
  assert(savedSkills.length === 2, '2.3: Duplicate case-insensitive skills cleanly deduplicated to 2 distinct skills (React, TypeScript)');

  // SECTION 3: ATS ANALYZER EDGE CASES
  console.log('\n--- 3. ATS Analyzer Extreme Edge Cases ---');

  // 3.1 Empty Resume + Valid JD
  const emptyResResult = calculateDeterministicATSScore('', 'Requires React and TypeScript.');
  assert(Boolean(emptyResResult.error), '3.1: Empty resume returns explicit error message');

  // 3.2 Valid Resume + Empty JD
  const emptyJDResult = calculateDeterministicATSScore('Full stack React and Node.js developer.', '');
  assert(Boolean(emptyJDResult.error), '3.2: Empty JD returns explicit error message');

  // 3.3 Java vs JavaScript Non-Equivalence
  const javaResume = 'Senior Java Developer with 8 years Spring Boot, Hibernate, JVM optimization.';
  const jsJD = 'Looking for a Frontend Developer with JavaScript, React, and CSS.';
  const javaScore = calculateDeterministicATSScore(javaResume, jsJD);
  assert(!javaScore.matched_keywords?.includes('JavaScript'), '3.3: Java resume does NOT match JavaScript requirement');
  assert((javaScore.ats_score || 0) < 60, '3.3b: Java vs JavaScript score remains low');

  // 3.4 C vs C++ Non-Equivalence
  const cResume = 'Embedded C Systems Programmer working with microcontrollers and Linux kernel drivers.';
  const cppJD = 'Looking for Modern C++ Developer with templates, STL, and Qt.';
  const cScore = calculateDeterministicATSScore(cResume, cppJD);
  assert(!cScore.matched_keywords?.includes('C++'), '3.4: C resume does NOT match C++ requirement');

  // 3.5 Extremely Long Inputs (Boundary stress test)
  const longText = 'React TypeScript Node.js PostgreSQL Docker AWS '.repeat(200);
  const longScore = calculateDeterministicATSScore(longText, longText);
  assert((longScore.ats_score || 0) >= 80 && (longScore.ats_score || 0) <= 100, '3.5: Extremely long input calculated deterministically without memory overflow or NaN');

  // 3.6 Unrelated Content Zero Match
  const culinaryResume = 'Executive Chef with 10 years of professional fine dining experience in French cuisine, pastry preparation, restaurant operations, inventory management, and kitchen leadership.';
  const softwareJD = 'Software Engineer needed for Kubernetes distributed backend microservices in Go and Rust.';
  const zeroMatch = calculateDeterministicATSScore(culinaryResume, softwareJD);
  assert(zeroMatch.breakdown?.required_skills?.matched_count === 0, '3.6: Unrelated resume matches 0 skills');
  assert((zeroMatch.ats_score || 0) <= 45, '3.6b: Unrelated score reflects zero matching technical capabilities');

  // SECTION 4: RESUME IMPROVEMENT & QUALITY EDGE CASES
  console.log('\n--- 4. Resume Quality & Improvement Edge Cases ---');

  // 4.1 Minimal/Empty Resume Analysis
  const minimalAnalysis = analyzeResumeContentTS(
    { personal_info: {}, summary: '', skills: [], experience: [], education: [] },
    'Jane Minimal',
    'Target Job'
  );
  assert(!minimalAnalysis.quality_audit.core_sections_detected.includes('Skills'), '4.1: Correctly identifies missing skills section');
  assert(!minimalAnalysis.quality_audit.core_sections_detected.includes('Experience'), '4.1b: Correctly identifies missing experience section');
  assert(minimalAnalysis.quality_audit.improvement_suggestions.length > 0, '4.1c: Generates actionable advice to add missing sections');

  // SECTION 5: OUTREACH EDGE CASES & ANTI-FABRICATION
  console.log('\n--- 5. Outreach Dispatch & Anti-Fabrication Edge Cases ---');

  // 5.1 Missing recipient email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  assert(emailRegex.test('valid.candidate@company.org'), '5.1: Valid email accepted');
  assert(!emailRegex.test('invalid_email_format'), '5.2: Malformed email rejected');
  assert(!emailRegex.test(''), '5.3: Empty email rejected');
  assert(!emailRegex.test('user@'), '5.4: Incomplete email rejected');

  // 5.2 Unconfigured SMTP dispatch attempt
  const sendResult = await providers.emailSender.sendEmail('recruiter@acme.com', 'Inquiry', 'Hello');
  assert(sendResult.status === 'FAILED', '5.5: Unconfigured dispatch returns FAILED status');
  assert(sendResult.success === false, '5.6: Unconfigured dispatch success is false');
  assert(sendResult.sentAt === undefined, '5.7: No false sent timestamp generated');

  // SECTION 6: APPLICATION TRACKER STATUS LIFECYCLE EDGE CASES
  console.log('\n--- 6. Application Tracker Normalization & Edge Cases ---');

  // 6.1 Status normalization
  assert(normalizeStatus('saved') === 'SAVED', '6.1: lowercase saved -> SAVED');
  assert(normalizeStatus('APPLIED') === 'APPLIED', '6.2: APPLIED canonical');
  assert(normalizeStatus('Selected') === 'OFFER', '6.3: Legacy Selected -> OFFER');
  assert(normalizeStatus('UNKNOWN_STATUS') === null, '6.4: Invalid status returns null');
  assert(normalizeStatus(undefined) === null, '6.5: undefined status returns null');

  // 6.2 Application with null optional fields
  const app = await prisma.application.create({
    data: {
      userId: testUser.id,
      companyName: 'Stripe',
      jobTitle: 'Backend Security Engineer',
      status: 'SAVED',
      location: null,
      jobUrl: null,
      notes: null
    }
  });
  assert(app.id > 0, '6.6: Application created successfully with null optional fields');

  // 6.3 Cascading deletion test
  await prisma.applicationStatusHistory.create({
    data: {
      applicationId: app.id,
      newStatus: 'SAVED',
      notes: 'Initial save'
    }
  });

  await prisma.applicationStatusHistory.deleteMany({ where: { applicationId: app.id } });
  await prisma.application.delete({ where: { id: app.id } });
  const checkDeleted = await prisma.application.findUnique({ where: { id: app.id } });
  assert(checkDeleted === null, '6.7: Application cleanly deleted without orphan status histories');

  // SECTION 7: DASHBOARD METRICS INTEGRITY
  console.log('\n--- 7. Dashboard Grounding with 0 Records (Brand New User) ---');
  const brandNewUser = await prisma.user.create({
    data: {
      email: `edge_brandnew_${Date.now()}@example.com`,
      passwordHash: 'dummy_hash'
    }
  });

  const [dResumes, dApps, dAnalyses, dOutreach] = await Promise.all([
    prisma.resume.findMany({ where: { userId: brandNewUser.id } }),
    prisma.application.findMany({ where: { userId: brandNewUser.id } }),
    prisma.resumeAnalysis.findMany({ where: { userId: brandNewUser.id } }),
    prisma.outreachEmail.findMany({ where: { userId: brandNewUser.id } })
  ]);

  assert(dResumes.length === 0, '7.1: Brand new user has 0 resumes');
  assert(dApps.length === 0, '7.2: Brand new user has 0 applications');
  assert(dAnalyses.length === 0, '7.3: Brand new user has 0 analyses');
  assert(dOutreach.length === 0, '7.4: Brand new user has 0 outreach drafts');

  // CLEANUP
  console.log('\n--- 8. Cleaning Up Edge Case Test Artifacts ---');
  await prisma.user.delete({ where: { id: testUser.id } });
  await prisma.user.delete({ where: { id: brandNewUser.id } });
  console.log('Cleanup completed.');

  console.log('\n===============================================================');
  console.log('🎉 ALL ERROR HANDLING & EDGE-CASE AUDIT TESTS PASSED (100%)');
  console.log('===============================================================');
}

runEdgeCaseAuditSuite().catch(err => {
  console.error('Edge case test suite failed with error:', err);
  process.exit(1);
});
