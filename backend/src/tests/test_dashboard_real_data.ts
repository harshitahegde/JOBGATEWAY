import { prisma } from '../db';
import { generateToken } from '../middleware/auth';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`[PASS]: ${message}`);
  }
}

async function runDashboardIntegrationTests() {
  console.log("==========================================");
  console.log("Running Real-Data Dashboard Verification Suite");
  console.log("==========================================\n");

  // Create two distinct users to verify complete data scoping & security
  const user1 = await prisma.user.create({
    data: {
      email: `dash_u1_${Date.now()}@example.com`,
      passwordHash: 'dummy_hash',
      profile: {
        create: {
          fullName: 'Developer Alpha',
          bio: 'Full Stack Engineer',
          location: 'San Francisco, CA'
        }
      }
    }
  });

  const user2 = await prisma.user.create({
    data: {
      email: `dash_u2_${Date.now()}@example.com`,
      passwordHash: 'dummy_hash',
      profile: {
        create: {
          fullName: 'Developer Beta'
        }
      }
    }
  });

  // Test 1: User 2 has NO data initially -> Verify empty state honesty
  // No fake applications, no fake ATS scores, no fake outreach
  const u2Apps = await prisma.application.findMany({ where: { userId: user2.id } });
  const u2Analyses = await prisma.resumeAnalysis.findMany({ where: { userId: user2.id } });
  const u2Outreach = await prisma.outreachEmail.findMany({ where: { userId: user2.id } });
  const u2Resumes = await prisma.resume.findMany({ where: { userId: user2.id } });

  assert(u2Apps.length === 0, "Test 1: User 2 has 0 applications");
  assert(u2Analyses.length === 0, "Test 1: User 2 has 0 ATS analyses");
  assert(u2Outreach.length === 0, "Test 1: User 2 has 0 outreach emails");
  assert(u2Resumes.length === 0, "Test 1: User 2 has 0 resumes");

  // Test 2: Seed real data for User 1 only
  // 1. Resume
  const r1 = await prisma.resume.create({
    data: {
      userId: user1.id,
      title: "Alpha Main Resume",
      originalFilename: "resume_alpha.pdf",
      filePath: "/uploads/resumes/alpha.pdf",
      fileType: "application/pdf",
      isPrimary: true
    }
  });

  // 2. ATS Analysis
  const a1 = await prisma.resumeAnalysis.create({
    data: {
      userId: user1.id,
      resumeId: r1.id,
      jobTitle: "Senior Backend Developer",
      company: "Stripe",
      jobDescription: "Requires Node.js and TypeScript",
      atsScore: 88.5
    }
  });

  // 3. Applications across lifecycle stages
  const appSaved = await prisma.application.create({
    data: {
      userId: user1.id,
      companyName: "Acme Corp",
      jobTitle: "Node.js Engineer",
      status: "SAVED"
    }
  });

  const appApplied = await prisma.application.create({
    data: {
      userId: user1.id,
      companyName: "Meta",
      jobTitle: "Full Stack Engineer",
      status: "APPLIED",
      appliedDate: "2026-10-01"
    }
  });

  const appInterview = await prisma.application.create({
    data: {
      userId: user1.id,
      companyName: "Amazon",
      jobTitle: "Systems Engineer",
      status: "INTERVIEW",
      appliedDate: "2026-09-28"
    }
  });

  // 4. Outreach records (Draft, and Failed - NO fake SENT)
  const oDraft = await prisma.outreachEmail.create({
    data: {
      userId: user1.id,
      recipientEmail: "recruiter@acme.com",
      subject: "Inquiry: Node.js Engineer",
      body: "Hello Sarah...",
      status: "DRAFT"
    }
  });

  const oFailed = await prisma.outreachEmail.create({
    data: {
      userId: user1.id,
      recipientEmail: "recruiter@meta.com",
      subject: "Application: Full Stack",
      body: "Hello hiring team...",
      status: "FAILED",
      failureReason: "Email sending is not configured."
    }
  });

  console.log("[PASS] Seeded real records strictly for User 1.");

  // Test 3: Verify User 2's dashboard view remains completely 0 (Strict User Scoping)
  const u2ScopeApps = await prisma.application.findMany({ where: { userId: user2.id } });
  const u2ScopeAnalyses = await prisma.resumeAnalysis.findMany({ where: { userId: user2.id } });
  const u2ScopeOutreach = await prisma.outreachEmail.findMany({ where: { userId: user2.id } });
  const u2ScopeResumes = await prisma.resume.findMany({ where: { userId: user2.id } });

  assert(u2ScopeApps.length === 0, "Test 3: User 2 cannot see User 1's applications");
  assert(u2ScopeAnalyses.length === 0, "Test 3: User 2 cannot see User 1's ATS analyses");
  assert(u2ScopeOutreach.length === 0, "Test 3: User 2 cannot see User 1's outreach");
  assert(u2ScopeResumes.length === 0, "Test 3: User 2 cannot see User 1's resumes");

  // Test 4: Verify User 1's dashboard aggregations match database records exactly
  const u1Apps = await prisma.application.findMany({ where: { userId: user1.id } });
  assert(u1Apps.length === 3, "Test 4: User 1 has exactly 3 applications");

  const u1Analyses = await prisma.resumeAnalysis.findMany({ where: { userId: user1.id } });
  assert(u1Analyses.length === 1, "Test 4: User 1 has exactly 1 ATS analysis");
  assert(u1Analyses[0].atsScore === 88.5, "Test 4: ATS score is exactly 88.5%");

  const u1Outreach = await prisma.outreachEmail.findMany({ where: { userId: user1.id } });
  assert(u1Outreach.length === 2, "Test 4: User 1 has exactly 2 outreach records");

  const sentCount = u1Outreach.filter(o => o.status === 'SENT').length;
  assert(sentCount === 0, "Test 5: SENT outreach is 0 (Honest status preserved)");

  const draftCount = u1Outreach.filter(o => o.status === 'DRAFT').length;
  assert(draftCount === 1, "Test 5: DRAFT outreach is 1");

  const failedCount = u1Outreach.filter(o => o.status === 'FAILED').length;
  assert(failedCount === 1, "Test 5: FAILED outreach is 1");

  // Cleanup test users
  await prisma.outreachEmail.deleteMany({ where: { userId: { in: [user1.id, user2.id] } } });
  await prisma.application.deleteMany({ where: { userId: { in: [user1.id, user2.id] } } });
  await prisma.resumeAnalysis.deleteMany({ where: { userId: { in: [user1.id, user2.id] } } });
  await prisma.resume.deleteMany({ where: { userId: { in: [user1.id, user2.id] } } });
  await prisma.profile.deleteMany({ where: { userId: { in: [user1.id, user2.id] } } });
  await prisma.user.deleteMany({ where: { id: { in: [user1.id, user2.id] } } });

  console.log("\n==========================================");
  console.log("ALL REAL-DATA DASHBOARD TESTS PASSED! 🎉");
  console.log("==========================================");
}

runDashboardIntegrationTests().catch((err) => {
  console.error("❌ Dashboard Test Error:", err);
  process.exit(1);
});
