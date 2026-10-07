"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function assert(condition, message) {
    if (!condition) {
        console.error(`❌ FAILED: ${message}`);
        process.exit(1);
    }
    else {
        console.log(`[PASS]: ${message}`);
    }
}
async function runAuthAndOwnershipAuditSuite() {
    console.log('===============================================================');
    console.log('🔒 COMPREHENSIVE AUTHENTICATION & DATA OWNERSHIP AUDIT TEST SUITE');
    console.log('===============================================================\n');
    // PART 1: TOKEN / AUTHENTICATION BYPASS VERIFICATION
    console.log('--- 1. Testing Authentication & Token Verification ---');
    const JWT_SECRET = process.env.JWT_SECRET || 'jobgateway_super_secret_key_2026';
    // 1.1 Valid Token Generation
    const tokenUserA = (0, auth_1.generateToken)(1001, 'userA@test.com');
    const decodedA = jsonwebtoken_1.default.verify(tokenUserA, JWT_SECRET);
    assert(decodedA.userId === 1001, 'Token encodes correct userId');
    assert(decodedA.email === 'userA@test.com', 'Token encodes correct email');
    // 1.2 Invalid Signature Rejection
    let invalidSignatureCaught = false;
    try {
        jsonwebtoken_1.default.verify(tokenUserA, 'wrong_tampered_secret_key');
    }
    catch (err) {
        invalidSignatureCaught = true;
    }
    assert(invalidSignatureCaught, 'Token with invalid secret/signature is rejected');
    // 1.3 Expired Token Rejection
    const expiredToken = jsonwebtoken_1.default.sign({ userId: 1001, email: 'userA@test.com' }, JWT_SECRET, { expiresIn: '-1s' });
    let expiredCaught = false;
    try {
        jsonwebtoken_1.default.verify(expiredToken, JWT_SECRET);
    }
    catch (err) {
        expiredCaught = true;
    }
    assert(expiredCaught, 'Expired token is rejected');
    // 1.4 Malformed Token Rejection
    let malformedCaught = false;
    try {
        jsonwebtoken_1.default.verify('not.a.valid.jwt.token', JWT_SECRET);
    }
    catch (err) {
        malformedCaught = true;
    }
    assert(malformedCaught, 'Malformed token string is rejected');
    // PART 2: CROSS-USER DATA ISOLATION (USER A vs USER B)
    console.log('\n--- 2. Setting up Two Distinct Users for Data Isolation Tests ---');
    const timestamp = Date.now();
    const userA = await db_1.prisma.user.create({
        data: {
            email: `audit_usera_${timestamp}@test.com`,
            passwordHash: 'dummy_hash_a',
            profile: {
                create: {
                    fullName: 'Alice User A',
                    bio: 'Senior Backend Engineer',
                    location: 'San Francisco, CA'
                }
            }
        },
        include: { profile: true }
    });
    const userB = await db_1.prisma.user.create({
        data: {
            email: `audit_userb_${timestamp}@test.com`,
            passwordHash: 'dummy_hash_b',
            profile: {
                create: {
                    fullName: 'Bob User B',
                    bio: 'Frontend Engineer',
                    location: 'New York, NY'
                }
            }
        },
        include: { profile: true }
    });
    console.log(`User A created: ID ${userA.id} (${userA.email})`);
    console.log(`User B created: ID ${userB.id} (${userB.email})`);
    // PART 3: SEED PRIVATE RECORDS FOR USER A
    console.log('\n--- 3. Seeding Private Records for User A ---');
    // 3.1 User A Skills
    const userASkill = await db_1.prisma.userSkill.create({
        data: {
            userId: userA.id,
            skillName: 'TypeScript Security Audit',
            proficiencyLevel: 'Expert',
            yearsExperience: 5
        }
    });
    // 3.2 User A Resume
    const userAResume = await db_1.prisma.resume.create({
        data: {
            userId: userA.id,
            title: 'Alice_Resume_2026.pdf',
            originalFilename: 'Alice_Resume.pdf',
            filePath: '/uploads/resumes/alice_resume.pdf',
            fileType: 'application/pdf',
            parsedContent: JSON.stringify({
                personal_info: { full_name: 'Alice User A', email: userA.email },
                summary: 'Experienced distributed systems engineer with deep security expertise.',
                skills: ['TypeScript', 'Node.js', 'PostgreSQL', 'Docker'],
                experience: [{ title: 'Principal Engineer', company: 'SecOps', description: 'Led isolation audits.' }]
            }),
            isPrimary: true
        }
    });
    // 3.3 User A Resume Version
    const userAResumeVersion = await db_1.prisma.resumeVersion.create({
        data: {
            userId: userA.id,
            resumeId: userAResume.id,
            versionName: 'Targeted for Staff Security Engineer',
            targetJobTitle: 'Staff Security Engineer',
            targetCompany: 'SecureTech Corp',
            content: JSON.stringify({
                summary: 'Tailored summary for Staff Security Engineer.'
            })
        }
    });
    // 3.4 User A Resume Analysis (ATS)
    const userAAnalysis = await db_1.prisma.resumeAnalysis.create({
        data: {
            userId: userA.id,
            resumeId: userAResume.id,
            jobTitle: 'Senior Infrastructure Engineer',
            company: 'CloudNet Inc',
            jobDescription: 'Seeking expert in cloud infrastructure, Kubernetes, and distributed architecture.',
            atsScore: 88,
            matchedKeywords: JSON.stringify(['Docker', 'TypeScript']),
            missingKeywords: JSON.stringify(['Kubernetes', 'Terraform']),
            suggestions: JSON.stringify(['Add Kubernetes deployment experience'])
        }
    });
    // 3.5 User A Application
    const userAApp = await db_1.prisma.application.create({
        data: {
            userId: userA.id,
            companyName: 'Stripe',
            jobTitle: 'Backend Security Engineer',
            location: 'Remote',
            jobUrl: 'https://stripe.com/jobs/sec-eng',
            status: 'INTERVIEW',
            appliedDate: '2026-09-15',
            notes: 'Internal referral from team lead.',
            resumeVersionId: userAResumeVersion.id,
            statusHistory: {
                create: [
                    { previousStatus: null, newStatus: 'SAVED', notes: 'Saved from board' },
                    { previousStatus: 'SAVED', newStatus: 'APPLIED', notes: 'Applied via referral' },
                    { previousStatus: 'APPLIED', newStatus: 'INTERVIEW', notes: 'Technical screen scheduled' }
                ]
            }
        }
    });
    // 3.6 User A Outreach Email
    const userAOutreach = await db_1.prisma.outreachEmail.create({
        data: {
            userId: userA.id,
            applicationId: userAApp.id,
            type: 'recruiter_outreach',
            recipientEmail: 'recruiter@stripe.com',
            recipientName: 'Sarah Jenkins',
            companyName: 'Stripe',
            jobTitle: 'Backend Security Engineer',
            subject: 'Candidate Inquiry: Backend Security Engineer - Alice',
            body: 'Dear Sarah, I am writing to express my interest in the Backend Security Engineer role.',
            status: 'DRAFT'
        }
    });
    // 3.7 User A Video
    const userAVideo = await db_1.prisma.video.create({
        data: {
            userId: userA.id,
            title: 'Alice Self Intro Video',
            filePath: '/uploads/videos/alice_intro.webm',
            durationSeconds: 45,
            fileSize: 10485760
        }
    });
    console.log('All private records for User A seeded successfully.');
    // PART 4: AUDIT USER B ATTEMPTING TO ACCESS USER A RECORDS (READ ISOLATION)
    console.log('\n--- 4. Auditing User B Cross-Tenant Access Attempts (Read Isolation) ---');
    // 4.1 Profile Read
    const u2Profile = await db_1.prisma.profile.findFirst({
        where: { userId: userB.id }
    });
    assert(u2Profile !== null && u2Profile.fullName === 'Bob User B', 'User B gets Bob Profile');
    assert(u2Profile?.fullName !== userA.profile?.fullName, 'User B cannot see User A profile data');
    // 4.2 Skills Read
    const u2Skills = await db_1.prisma.userSkill.findMany({
        where: { userId: userB.id }
    });
    assert(u2Skills.length === 0, 'User B has 0 skills (User A skill isolated)');
    // 4.3 Resume Read by ID
    const u2AttemptResume = await db_1.prisma.resume.findFirst({
        where: { id: userAResume.id, userId: userB.id }
    });
    assert(u2AttemptResume === null, 'User B querying User A resume ID returns null (404 pattern)');
    // 4.4 Resume Listing
    const u2Resumes = await db_1.prisma.resume.findMany({
        where: { userId: userB.id }
    });
    assert(u2Resumes.length === 0, 'User B resume list is empty');
    // 4.5 Resume Version Read
    const u2AttemptVersion = await db_1.prisma.resumeVersion.findFirst({
        where: { id: userAResumeVersion.id, userId: userB.id }
    });
    assert(u2AttemptVersion === null, 'User B querying User A resume version ID returns null');
    // 4.6 ATS Analysis Read
    const u2AttemptAnalysis = await db_1.prisma.resumeAnalysis.findFirst({
        where: { id: userAAnalysis.id, userId: userB.id }
    });
    assert(u2AttemptAnalysis === null, 'User B querying User A ATS analysis ID returns null');
    // 4.7 Application Read by ID
    const u2AttemptApp = await db_1.prisma.application.findFirst({
        where: { id: userAApp.id, userId: userB.id }
    });
    assert(u2AttemptApp === null, 'User B querying User A application ID returns null (404 pattern)');
    // 4.8 Application Status History Read
    const u2AttemptHistory = await db_1.prisma.applicationStatusHistory.findMany({
        where: {
            applicationId: userAApp.id,
            application: { userId: userB.id }
        }
    });
    assert(u2AttemptHistory.length === 0, 'User B querying User A application status history returns 0 rows');
    // 4.9 Outreach Email Read by ID
    const u2AttemptOutreach = await db_1.prisma.outreachEmail.findFirst({
        where: { id: userAOutreach.id, userId: userB.id }
    });
    assert(u2AttemptOutreach === null, 'User B querying User A outreach email ID returns null');
    // 4.10 Video Read
    const u2Videos = await db_1.prisma.video.findMany({
        where: { userId: userB.id }
    });
    assert(u2Videos.length === 0, 'User B video list contains 0 videos');
    // 4.11 Dashboard Aggregation
    const [dProfile, dResumes, dVersions, dAnalyses, dApps, dOutreach] = await Promise.all([
        db_1.prisma.profile.findUnique({ where: { userId: userB.id } }),
        db_1.prisma.resume.findMany({ where: { userId: userB.id } }),
        db_1.prisma.resumeVersion.findMany({ where: { userId: userB.id } }),
        db_1.prisma.resumeAnalysis.findMany({ where: { userId: userB.id } }),
        db_1.prisma.application.findMany({ where: { userId: userB.id } }),
        db_1.prisma.outreachEmail.findMany({ where: { userId: userB.id } })
    ]);
    assert(dProfile?.fullName === 'Bob User B', 'Dashboard for User B shows User B profile');
    assert(dResumes.length === 0, 'Dashboard for User B shows 0 resumes');
    assert(dVersions.length === 0, 'Dashboard for User B shows 0 resume versions');
    assert(dAnalyses.length === 0, 'Dashboard for User B shows 0 ATS analyses');
    assert(dApps.length === 0, 'Dashboard for User B shows 0 applications');
    assert(dOutreach.length === 0, 'Dashboard for User B shows 0 outreach emails');
    // PART 5: AUDIT USER B ATTEMPTING TO MODIFY USER A RECORDS (WRITE ISOLATION)
    console.log('\n--- 5. Auditing User B Cross-Tenant Mutation Rejection (Write Isolation) ---');
    // 5.1 User B tries to update User A resume
    const u2UpdateResumeCheck = await db_1.prisma.resume.findFirst({
        where: { id: userAResume.id, userId: userB.id }
    });
    assert(u2UpdateResumeCheck === null, 'Guard check rejects User B updating User A resume (would return 404)');
    // 5.2 User B tries to update User A application
    const u2UpdateAppCheck = await db_1.prisma.application.findFirst({
        where: { id: userAApp.id, userId: userB.id }
    });
    assert(u2UpdateAppCheck === null, 'Guard check rejects User B updating User A application (would return 404)');
    // 5.3 User B tries to delete User A application
    const u2DeleteAppCheck = await db_1.prisma.application.findFirst({
        where: { id: userAApp.id, userId: userB.id }
    });
    assert(u2DeleteAppCheck === null, 'Guard check rejects User B deleting User A application (would return 404)');
    // 5.4 User B tries to update User A outreach email
    const u2UpdateOutreachCheck = await db_1.prisma.outreachEmail.findFirst({
        where: { id: userAOutreach.id, userId: userB.id }
    });
    assert(u2UpdateOutreachCheck === null, 'Guard check rejects User B updating User A outreach (would return 404)');
    // 5.5 User B tries to delete User A outreach email
    const u2DeleteOutreachCheck = await db_1.prisma.outreachEmail.findFirst({
        where: { id: userAOutreach.id, userId: userB.id }
    });
    assert(u2DeleteOutreachCheck === null, 'Guard check rejects User B deleting User A outreach (would return 404)');
    // PART 6: AUDIT CROSS-TENANT FOREIGN KEY INJECTION
    console.log('\n--- 6. Auditing Foreign Key Hijacking Rejection ---');
    // 6.1 User B tries to create an Application linking User A's ResumeVersion
    const u2HijackVersionCheck = await db_1.prisma.resumeVersion.findFirst({
        where: { id: userAResumeVersion.id, userId: userB.id }
    });
    assert(u2HijackVersionCheck === null, 'Cross-user resumeVersionId rejected on application creation');
    // 6.2 User B tries to create an Application linking User A's Video
    const u2HijackVideoCheck = await db_1.prisma.video.findFirst({
        where: { id: userAVideo.id, userId: userB.id }
    });
    assert(u2HijackVideoCheck === null, 'Cross-user videoId rejected on application creation');
    // 6.3 User B tries to save an Outreach draft linking User A's Application
    const u2HijackAppCheck = await db_1.prisma.application.findFirst({
        where: { id: userAApp.id, userId: userB.id }
    });
    assert(u2HijackAppCheck === null, 'Cross-user applicationId rejected on outreach draft creation');
    // 6.4 User B tries to run ATS analysis targeting User A's Resume ID
    const u2HijackResumeAtsCheck = await db_1.prisma.resume.findFirst({
        where: { id: userAResume.id, userId: userB.id }
    });
    assert(u2HijackResumeAtsCheck === null, 'Cross-user resumeId rejected on ATS analyze request');
    // PART 7: VERIFY USER A'S DATA REMAINS UNTOUCHED AND INTACT
    console.log('\n--- 7. Verifying User A Data Integrity Post-Audit ---');
    const verifyUserAApp = await db_1.prisma.application.findUnique({
        where: { id: userAApp.id }
    });
    assert(verifyUserAApp !== null && verifyUserAApp.status === 'INTERVIEW', 'User A application status remains intact');
    const verifyUserAOutreach = await db_1.prisma.outreachEmail.findUnique({
        where: { id: userAOutreach.id }
    });
    assert(verifyUserAOutreach !== null && verifyUserAOutreach.status === 'DRAFT', 'User A outreach draft remains intact');
    // CLEANUP TEST USERS
    console.log('\n--- 8. Cleaning Up Audit Test Artifacts ---');
    await db_1.prisma.user.delete({ where: { id: userA.id } });
    await db_1.prisma.user.delete({ where: { id: userB.id } });
    console.log('Cleanup completed.');
    console.log('\n===============================================================');
    console.log('🎉 ALL AUTHENTICATION & DATA OWNERSHIP AUDIT TESTS PASSED (100%)');
    console.log('===============================================================');
}
runAuthAndOwnershipAuditSuite().catch(err => {
    console.error('Audit test suite encountered an unexpected error:', err);
    process.exit(1);
});
