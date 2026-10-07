"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
const ats_engine_1 = require("../ats_engine");
const outreach_generator_1 = require("../outreach_generator");
const providers_1 = require("../providers");
function assert(condition, message) {
    if (!condition) {
        console.error(`❌ FAILED: ${message}`);
        process.exit(1);
    }
    else {
        console.log(`[PASS]: ${message}`);
    }
}
async function runFakeMockAuditTests() {
    console.log('===============================================================');
    console.log('🔍 PROJECT-WIDE FAKE / MOCK / HARDCODED BEHAVIOR AUDIT SUITE');
    console.log('===============================================================\n');
    // TEST 1: JOB BOARD AUDIT
    console.log('--- 1. Auditing Job Board & Provider Status ---');
    const dbJobs = await db_1.prisma.job.findMany();
    assert(dbJobs.length === 0, 'Test 1.1: Database contains 0 mock/fake job records');
    const providerSearchResults = await providers_1.providers.job.searchJobs('', '');
    assert(providerSearchResults.length === 0, 'Test 1.2: Unconfigured Job Provider returns 0 fake listings');
    assert(providers_1.providers.job.isConfigured === false, 'Test 1.3: Job Provider honestly reports isConfigured === false');
    // TEST 2: ATS ENGINE DETERMINISM & NO FAKE SCORES
    console.log('\n--- 2. Auditing ATS Match Engine (No Fake / Random Scores) ---');
    const sampleResume = 'Full stack software engineer with 5 years experience in React, TypeScript, Node.js, and PostgreSQL. Built scalable APIs and frontend architectures.';
    const sampleJD = 'Looking for a Software Engineer proficient in React, TypeScript, and Node.js. Experience with PostgreSQL preferred.';
    const score1 = (0, ats_engine_1.calculateDeterministicATSScore)(sampleResume, sampleJD);
    const score2 = (0, ats_engine_1.calculateDeterministicATSScore)(sampleResume, sampleJD);
    assert(score1.ats_score === score2.ats_score, 'Test 2.1: Repeated runs produce identical deterministic score');
    assert(score1.ats_score > 0 && score1.ats_score <= 100, 'Test 2.2: Score is within valid bounds');
    assert(score1.scoring_formula !== undefined, 'Test 2.3: Mathematical formula breakdown is explicitly provided');
    // Test error on empty inputs
    const emptyResCheck = (0, ats_engine_1.calculateDeterministicATSScore)('', sampleJD);
    assert(Boolean(emptyResCheck.error), 'Test 2.4: Empty resume rejected with explicit error, not a fake score');
    const emptyJDCheck = (0, ats_engine_1.calculateDeterministicATSScore)(sampleResume, '');
    assert(Boolean(emptyJDCheck.error), 'Test 2.5: Empty JD rejected with explicit error, not a fake score');
    // TEST 3: RESUME IMPROVEMENT ANTI-FABRICATION
    console.log('\n--- 3. Auditing Resume Improvement (Anti-Fabrication & Fact Grounding) ---');
    const candidateFacts = {
        fullName: 'Alice Test',
        skills: ['Python', 'FastAPI'],
        experience: [{ title: 'Backend Developer', company: 'DevCo', description: 'Maintained API services' }]
    };
    const outreach = (0, outreach_generator_1.generateFactGroundedOutreach)({
        candidateName: 'Alice Test',
        companyName: 'TargetCorp',
        jobTitle: 'Senior Cloud Architect',
        jobDescription: 'Must have 10+ years of Kubernetes, AWS, Terraform, and Go experience.',
        resumeFacts: candidateFacts
    });
    // Must not claim Kubernetes, AWS, or Terraform because resume only has Python & FastAPI
    assert(!outreach.body.toLowerCase().includes('kubernetes'), 'Test 3.1: Resume improvement does NOT fabricate Kubernetes experience');
    assert(!outreach.body.toLowerCase().includes('aws'), 'Test 3.2: Resume improvement does NOT fabricate AWS experience');
    assert(!outreach.body.toLowerCase().includes('terraform'), 'Test 3.3: Resume improvement does NOT fabricate Terraform experience');
    assert(!/\b10\s*years\b/i.test(outreach.body), 'Test 3.4: Resume improvement does NOT fabricate 10 years experience');
    assert(outreach.status === 'DRAFT', 'Test 3.5: Generated outreach status is strictly DRAFT');
    // TEST 4: OUTREACH DISPATCH HONESTY
    console.log('\n--- 4. Auditing Outreach Email Provider Honesty ---');
    assert(providers_1.providers.emailSender.isConfigured() === false, 'Test 4.1: Default email provider is NOT configured');
    assert(providers_1.providers.emailSender.providerType === 'draft_only', 'Test 4.2: Default email provider is strictly draft_only');
    const dispatchAttempt = await providers_1.providers.emailSender.sendEmail('test@example.com', 'Test Subject', 'Test Body');
    assert(dispatchAttempt.success === false, 'Test 4.3: Unconfigured provider dispatch fails safely');
    assert(Boolean(dispatchAttempt.failureReason && dispatchAttempt.failureReason.includes('not configured')), 'Test 4.4: Honest failure message returned');
    // TEST 5: DASHBOARD DATABASE DERIVATION
    console.log('\n--- 5. Auditing Dashboard Grounding ---');
    const tempUser = await db_1.prisma.user.create({
        data: {
            email: `audit_fake_${Date.now()}@example.com`,
            passwordHash: 'dummy_hash',
            profile: { create: { fullName: 'Clean Test User' } }
        }
    });
    const uApps = await db_1.prisma.application.findMany({ where: { userId: tempUser.id } });
    const uAnalyses = await db_1.prisma.resumeAnalysis.findMany({ where: { userId: tempUser.id } });
    const uOutreach = await db_1.prisma.outreachEmail.findMany({ where: { userId: tempUser.id } });
    assert(uApps.length === 0, 'Test 5.1: New user application count is honestly 0');
    assert(uAnalyses.length === 0, 'Test 5.2: New user ATS analyses count is honestly 0');
    assert(uOutreach.length === 0, 'Test 5.3: New user outreach count is honestly 0');
    // Clean up
    await db_1.prisma.user.delete({ where: { id: tempUser.id } });
    console.log('Cleaned up test user.');
    console.log('\n===============================================================');
    console.log('🎉 ALL FAKE/MOCK AUDIT VERIFICATION TESTS PASSED (100%)');
    console.log('===============================================================');
}
runFakeMockAuditTests().catch(err => {
    console.error('Fake/mock audit test suite failed:', err);
    process.exit(1);
});
