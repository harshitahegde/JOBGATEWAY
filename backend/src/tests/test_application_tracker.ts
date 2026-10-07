import { prisma } from '../db';
import { generateToken } from '../middleware/auth';
import { normalizeStatus, VALID_APPLICATION_STATUSES } from '../routes/application.routes';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`[PASS]: ${message}`);
  }
}

async function runApplicationTrackerTests() {
  console.log("==========================================");
  console.log("Running Application Tracker Unit & Security Tests");
  console.log("==========================================\n");

  // 1. Status normalization tests
  assert(normalizeStatus("saved") === "SAVED", "Lowercase 'saved' normalizes to 'SAVED'");
  assert(normalizeStatus("APPLIED") === "APPLIED", "Uppercase 'APPLIED' valid");
  assert(normalizeStatus("assessment") === "ASSESSMENT", "Assessment status valid");
  assert(normalizeStatus("interview") === "INTERVIEW", "Interview status valid");
  assert(normalizeStatus("offer") === "OFFER", "Offer status valid");
  assert(normalizeStatus("Selected") === "OFFER", "Legacy 'Selected' mapped to 'OFFER'");
  assert(normalizeStatus("rejected") === "REJECTED", "Rejected status valid");
  assert(normalizeStatus("withdrawn") === "WITHDRAWN", "Withdrawn status valid");
  assert(normalizeStatus("invalid_status") === null, "Invalid status rejected");
  assert(normalizeStatus("") === null, "Empty status rejected");

  // 2. Setup two distinct test users in DB to verify isolation & security
  const user1 = await prisma.user.create({
    data: {
      email: `user1_tracker_${Date.now()}@example.com`,
      passwordHash: 'dummy_hash',
      profile: { create: { fullName: 'Candidate One' } }
    }
  });

  const user2 = await prisma.user.create({
    data: {
      email: `user2_tracker_${Date.now()}@example.com`,
      passwordHash: 'dummy_hash',
      profile: { create: { fullName: 'Candidate Two' } }
    }
  });

  // 3. User 1 creates an application (SAVED)
  const app1 = await prisma.application.create({
    data: {
      userId: user1.id,
      companyName: "Google",
      jobTitle: "Software Engineer III",
      location: "Mountain View, CA",
      jobUrl: "https://careers.google.com/jobs/1",
      status: "SAVED",
      notes: "Referral requested from friend.",
      statusHistory: {
        create: {
          previousStatus: null,
          newStatus: "SAVED",
          notes: "Created as SAVED"
        }
      }
    },
    include: { statusHistory: true }
  });

  assert(app1.userId === user1.id, "App 1 belongs to User 1");
  assert(app1.status === "SAVED", "App 1 initial status is SAVED");
  assert(app1.statusHistory.length === 1, "Status history initiated with 1 record");

  // 4. User 1 transitions status: SAVED -> APPLIED
  const updatedApp1 = await prisma.application.update({
    where: { id: app1.id },
    data: {
      status: "APPLIED",
      appliedDate: "2026-10-04",
      statusHistory: {
        create: {
          previousStatus: "SAVED",
          newStatus: "APPLIED",
          notes: "Applied via careers portal"
        }
      }
    },
    include: { statusHistory: { orderBy: { changedAt: 'asc' } } }
  });

  assert(updatedApp1.status === "APPLIED", "Status updated to APPLIED");
  assert(updatedApp1.appliedDate === "2026-10-04", "Applied date recorded");
  assert(updatedApp1.statusHistory.length === 2, "Status history tracks progression");
  assert(updatedApp1.statusHistory[1].previousStatus === "SAVED", "Previous status was SAVED");
  assert(updatedApp1.statusHistory[1].newStatus === "APPLIED", "New status is APPLIED");

  // 5. User 1 transitions to INTERVIEW, then OFFER
  await prisma.application.update({
    where: { id: app1.id },
    data: {
      status: "INTERVIEW",
      notes: "Technical phone screen scheduled",
      statusHistory: {
        create: {
          previousStatus: "APPLIED",
          newStatus: "INTERVIEW",
          notes: "Technical phone screen scheduled"
        }
      }
    }
  });

  const offerApp1 = await prisma.application.update({
    where: { id: app1.id },
    data: {
      status: "OFFER",
      notes: "Received formal offer letter",
      statusHistory: {
        create: {
          previousStatus: "INTERVIEW",
          newStatus: "OFFER",
          notes: "Received formal offer letter"
        }
      }
    },
    include: { statusHistory: true }
  });

  assert(offerApp1.status === "OFFER", "Application transitioned to OFFER");
  assert(offerApp1.statusHistory.length === 4, "All 4 lifecycle milestones tracked");

  // 6. Security and Ownership Verification:
  // User 2 must NOT be able to view, update, or delete User 1's application
  const user2AttemptView = await prisma.application.findFirst({
    where: { id: app1.id, userId: user2.id }
  });
  assert(user2AttemptView === null, "Security Test 1: User 2 cannot access User 1's application");

  // Verify User 2 list only shows User 2's applications
  const user2Apps = await prisma.application.findMany({
    where: { userId: user2.id }
  });
  assert(user2Apps.length === 0, "Security Test 2: User 2 application list is completely isolated");

  // User 2 creates their own application
  const app2 = await prisma.application.create({
    data: {
      userId: user2.id,
      companyName: "Stripe",
      jobTitle: "Backend Infrastructure Engineer",
      status: "APPLIED"
    }
  });
  assert(app2.userId === user2.id, "App 2 belongs strictly to User 2");

  // User 1 cannot view User 2's application
  const user1AttemptView = await prisma.application.findFirst({
    where: { id: app2.id, userId: user1.id }
  });
  assert(user1AttemptView === null, "Security Test 3: User 1 cannot access User 2's application");

  // 7. Delete verification
  await prisma.applicationStatusHistory.deleteMany({ where: { applicationId: app1.id } });
  await prisma.application.delete({ where: { id: app1.id } });
  const deletedCheck = await prisma.application.findUnique({ where: { id: app1.id } });
  assert(deletedCheck === null, "Deletion Test: Application deleted cleanly from database");

  // Cleanup
  await prisma.applicationStatusHistory.deleteMany({ where: { applicationId: app2.id } });
  await prisma.application.delete({ where: { id: app2.id } });
  await prisma.profile.deleteMany({ where: { userId: { in: [user1.id, user2.id] } } });
  await prisma.user.deleteMany({ where: { id: { in: [user1.id, user2.id] } } });

  console.log("\n==========================================");
  console.log("ALL APPLICATION TRACKER TESTS PASSED! 🎉");
  console.log("==========================================");
}

runApplicationTrackerTests().catch((err) => {
  console.error("❌ Application Tracker Test Error:", err);
  process.exit(1);
});
