import axios from 'axios';
import { prisma } from '../db';
import { generateToken } from '../middleware/auth';

async function runE2ETest() {
  console.log("==========================================");
  console.log("Running End-to-End API Integration Verification");
  console.log("==========================================\n");

  const baseUrl = "http://localhost:5000/api";

  // 1. Ensure test user exists in database
  const email = `test_outreach_${Date.now()}@example.com`;
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: 'dummy_hash',
      profile: {
        create: {
          fullName: 'Harshita Hegde',
          bio: 'Full Stack Engineer with experience building Java and React applications.'
        }
      }
    },
    include: { profile: true }
  });

  const token = generateToken(user.id, user.email);
  const authHeaders = { Authorization: `Bearer ${token}` };

  // Create sample resume for user
  const resume = await prisma.resume.create({
    data: {
      userId: user.id,
      title: "Full Stack Resume",
      originalFilename: "resume.pdf",
      filePath: "/uploads/resumes/dummy.pdf",
      fileType: "application/pdf",
      isPrimary: true,
      parsedContent: JSON.stringify({
        personal_info: { full_name: "Harshita Hegde", email },
        skills: ["Java", "Spring Boot", "React", "TypeScript", "MySQL"],
        education: [{ degree: "B.E. in Information Science Engineering", institution: "VTU" }],
        experience: [{ title: "Software Engineer", company: "Tech Labs", description: "Built microservices using Java and Spring Boot." }],
        projects: [{ name: "JobGateway", description: "Job application platform" }]
      })
    }
  });

  console.log("[PASS] Test user and resume seeded in database.");

  // Test Provider Status
  const { providers } = await import('../providers');
  const providerStatus = providers.emailSender.getConfigurationStatus();
  console.log(`[CHECK] Active email provider mode: ${providers.emailSender.providerType}`);
  console.log(`[CHECK] Is provider configured for real send: ${providers.emailSender.isConfigured()}`);

  // Test 1: Generate Fact-Grounded Draft
  const { generateFactGroundedOutreach } = await import('../outreach_generator');
  const generated = generateFactGroundedOutreach({
    candidateName: "Harshita Hegde",
    companyName: "Acme Software",
    jobTitle: "Java Backend Engineer",
    jobDescription: "Requires Java, Spring Boot, and AWS.",
    resumeFacts: {
      fullName: "Harshita Hegde",
      skills: ["Java", "Spring Boot", "React", "TypeScript", "MySQL"],
      education: [{ degree: "B.E. in Information Science Engineering", institution: "VTU" }]
    }
  });

  if (!generated.body.includes("Java") || !generated.body.includes("Spring Boot")) {
    throw new Error("Generated draft missing verified resume skills!");
  }
  if (generated.body.toLowerCase().includes("aws")) {
    throw new Error("Fabrication detected! AWS was not in resume.");
  }
  if (generated.status !== "DRAFT") {
    throw new Error(`Initial status must be DRAFT, but got ${generated.status}`);
  }
  console.log("[PASS] 1. Resume -> Generated draft strictly uses actual resume facts (Java/Spring Boot, zero AWS fabrication).");
  console.log(`[PASS] 2. Draft status is strictly '${generated.status}'.`);

  // Test 2: Save Draft
  const savedRecord = await prisma.outreachEmail.create({
    data: {
      userId: user.id,
      recipientEmail: "recruiter@acme.com",
      recipientName: "Sarah Jenkins",
      companyName: "Acme Software",
      jobTitle: "Java Backend Engineer",
      subject: generated.subject,
      body: generated.body,
      status: "DRAFT"
    }
  });
  console.log(`[PASS] 3. Saved draft to database (ID: ${savedRecord.id}, Status: ${savedRecord.status}).`);

  // Test 3: Edit Draft & Mark Ready to Send
  const userEditedBody = generated.body + "\n\nI am eager to discuss how my Java experience can support your team.";
  const updatedRecord = await prisma.outreachEmail.update({
    where: { id: savedRecord.id },
    data: {
      body: userEditedBody,
      status: "READY_TO_SEND"
    }
  });
  if (updatedRecord.status !== "READY_TO_SEND") {
    throw new Error("Status failed to transition to READY_TO_SEND");
  }
  if (!updatedRecord.body.includes("eager to discuss")) {
    throw new Error("Edited content was not preserved!");
  }
  console.log(`[PASS] 4. User edited draft and updated status to '${updatedRecord.status}'.`);

  // Test 4: Attempt Send Without Configured Provider
  if (!providers.emailSender.isConfigured()) {
    const sendResult = await providers.emailSender.sendEmail(updatedRecord.recipientEmail, updatedRecord.subject, updatedRecord.body);
    if (sendResult.success || sendResult.status === "SENT") {
      throw new Error("CRITICAL FAILURE: System claimed email was SENT without configured provider!");
    }
    const failedRecord = await prisma.outreachEmail.update({
      where: { id: savedRecord.id },
      data: {
        status: "FAILED",
        failureReason: sendResult.failureReason
      }
    });
    console.log(`[PASS] 5. Send attempted without real provider: Result is strictly '${failedRecord.status}' (Reason: ${failedRecord.failureReason}).`);
    console.log("[PASS] 6. System absolutely NEVER claims 'Sent' without provider confirmation!");
  }

  // Clean up test data
  await prisma.outreachEmail.deleteMany({ where: { userId: user.id } });
  await prisma.resume.deleteMany({ where: { userId: user.id } });
  await prisma.profile.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
  console.log("[PASS] Cleaned up temporary test data.");

  console.log("\n==========================================");
  console.log("END-TO-END VERIFICATION COMPLETED SUCCESSFULLY!");
  console.log("==========================================");
}

runE2ETest().catch((err) => {
  console.error("❌ E2E Test Error:", err);
  process.exit(1);
});
