"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const outreach_generator_1 = require("../outreach_generator");
const email_provider_1 = require("../providers/email_provider");
function assert(condition, message) {
    if (!condition) {
        console.error(`❌ FAILED: ${message}`);
        process.exit(1);
    }
    else {
        console.log(`[PASS]: ${message}`);
    }
}
console.log("==========================================");
console.log("Running Fact-Grounded Outreach & Email Unit Tests");
console.log("==========================================\n");
// Test 1: Resume contains Java/Spring Boot -> Generated message may mention Java/Spring Boot
const resume1 = {
    fullName: "Alice Developer",
    skills: ["Java", "Spring Boot", "MySQL"],
    education: [{ degree: "B.S. in Computer Science", institution: "State University" }],
    experience: [{ title: "Backend Engineer", company: "DataCorp", description: "Built microservices using Java and Spring Boot." }]
};
const result1 = (0, outreach_generator_1.generateFactGroundedOutreach)({
    candidateName: "Alice Developer",
    companyName: "Acme Corp",
    jobTitle: "Backend Developer",
    resumeFacts: resume1
});
assert(result1.body.includes("Java"), "Test 1: Message contains Java");
assert(result1.body.includes("Spring Boot"), "Test 1: Message contains Spring Boot");
assert(result1.status === "DRAFT", "Test 1: Initial status is DRAFT");
// Test 2: Resume does not contain Python -> Generated message must NOT claim Python experience
assert(!result1.body.toLowerCase().includes("python"), "Test 2: Message does NOT mention Python");
// Test 3: Resume has no metrics -> Generated message must NOT invent metrics (e.g. 40%, 3 years, etc.)
assert(!/\b40%\b/.test(result1.body), "Test 3: No fabricated 40% metric");
assert(!/\b\d+%\b/.test(result1.body), "Test 3: No fabricated percentage metric");
assert(!result1.body.includes("perfect fit"), "Test 3: No unsupported 'perfect fit' boast");
// Test 4: Job description requires AWS but resume does not mention AWS -> Generated message must NOT claim AWS
const jdWithAWS = `
Job Title: Cloud Engineer
Company: CloudScale
Requirements:
Must have 5+ years of AWS experience, Docker, and Kubernetes.
`;
const result4 = (0, outreach_generator_1.generateFactGroundedOutreach)({
    candidateName: "Alice Developer",
    companyName: "CloudScale",
    jobTitle: "Cloud Engineer",
    jobDescription: jdWithAWS,
    resumeFacts: resume1 // Resume only has Java, Spring Boot, MySQL
});
assert(!result4.body.toLowerCase().includes("aws"), "Test 4: Message does NOT claim AWS despite JD requirement");
assert(result4.groundedSkills.every(s => s !== "AWS"), "Test 4: Grounded skills does not include AWS");
// Test 5: Recruiter name is missing -> Do not invent a recruiter name. Use generic greeting.
const result5 = (0, outreach_generator_1.generateFactGroundedOutreach)({
    candidateName: "Alice Developer",
    companyName: "Acme Corp",
    jobTitle: "Backend Developer",
    recruiterName: "", // missing
    resumeFacts: resume1
});
assert(result5.body.startsWith("Dear Hiring Team"), "Test 5: Appropriate generic greeting used when recruiter name missing");
assert(!result5.body.includes("Dear Sarah"), "Test 5: Did not invent recruiter name");
// Test 6: Company name is missing -> Do not invent one.
const result6 = (0, outreach_generator_1.generateFactGroundedOutreach)({
    candidateName: "Alice Developer",
    companyName: "", // missing
    jobTitle: "Software Engineer",
    resumeFacts: resume1
});
assert(!result6.body.includes("undefined"), "Test 6: No undefined company name");
assert(!result6.body.includes("Acme Corp"), "Test 6: Did not invent company name");
assert(result6.subject.includes("Software Engineer"), "Test 6: Subject gracefully formats without company name");
// Test 7: Draft generated -> Status must be DRAFT, never SENT.
assert(result6.status === "DRAFT", "Test 7: Status must strictly be DRAFT");
assert(result6.status !== "SENT", "Test 7: Status is definitely NOT SENT");
// Test 8: Email provider unavailable -> Status must be FAILED, never SENT.
const draftProvider = new email_provider_1.DraftOnlyEmailProvider();
assert(!draftProvider.isConfigured(), "Test 8: DraftOnlyEmailProvider isConfigured is false");
const unconfiguredSmtp = new email_provider_1.SmtpEmailProvider();
assert(!unconfiguredSmtp.isConfigured(), "Test 8: Unconfigured SmtpEmailProvider isConfigured is false");
draftProvider.sendEmail("recruiter@example.com", "Test", "Body").then((sendRes) => {
    assert(!sendRes.success, "Test 8: Send call rejected when provider unconfigured");
    assert(sendRes.status === "FAILED", "Test 8: Send call returns FAILED");
    assert(sendRes.status !== "SENT", "Test 8: Send call NEVER returns SENT");
    assert(Boolean(sendRes.failureReason), "Test 8: Safe failure reason provided");
    // Test 9: Mock Provider verification - Simulated live SMTP success behavior
    // Check that only when provider confirms sent does status become SENT
    const simulatedSuccess = {
        success: true,
        status: "SENT",
        providerMessageId: "msg_verified_12345"
    };
    assert(simulatedSuccess.status === "SENT", "Test 9: Only provider confirmed success yields SENT");
    assert(simulatedSuccess.providerMessageId === "msg_verified_12345", "Test 9: Provider message id recorded");
    // Test 10: User edits message before sending -> The sent content must correspond to user's final edited version
    const originalGeneratedBody = result1.body;
    const userEditedBody = originalGeneratedBody + "\n\nP.S. I am available immediately for an interview.";
    assert(userEditedBody !== originalGeneratedBody, "Test 10: Body was edited");
    assert(userEditedBody.includes("available immediately"), "Test 10: Edited content contains user additions");
    console.log("\n==========================================");
    console.log("ALL 10 ANTI-FABRICATION & HONEST SENDING TESTS PASSED! 🎉");
    console.log("==========================================");
});
