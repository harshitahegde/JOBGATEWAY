"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const axios_1 = __importDefault(require("axios"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const resume_routes_1 = __importDefault(require("../routes/resume.routes"));
const JWT_SECRET = process.env.JWT_SECRET || 'jobgateway-insecure-test-secret-key';
function generateToken(userId, email) {
    return jsonwebtoken_1.default.sign({ userId, email }, JWT_SECRET, { expiresIn: '1h' });
}
function assert(condition, message) {
    if (!condition) {
        console.error(`❌ [ASSERTION FAILED]: ${message}`);
        throw new Error(message);
    }
    console.log(`✓ [PASS]: ${message}`);
}
async function runResumeVersionAuditTests() {
    console.log('===============================================================');
    console.log('📄 RESUME BUILDER VERSIONING & OPTIMIZATION WORKFLOW TEST SUITE');
    console.log('===============================================================');
    // 1. Setup ephemeral test server
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.use('/api/resumes', resume_routes_1.default);
    const server = http_1.default.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    const baseUrl = `http://localhost:${port}/api/resumes`;
    // 2. Create isolated test users
    const timestamp = Date.now();
    const userA = await db_1.prisma.user.create({
        data: {
            email: `resume_usera_${timestamp}@test.com`,
            passwordHash: 'hashed_password_a'
        }
    });
    const userB = await db_1.prisma.user.create({
        data: {
            email: `resume_userb_${timestamp}@test.com`,
            passwordHash: 'hashed_password_b'
        }
    });
    const tokenA = generateToken(userA.id, userA.email);
    const tokenB = generateToken(userB.id, userB.email);
    const authA = { headers: { Authorization: `Bearer ${tokenA}` } };
    const authB = { headers: { Authorization: `Bearer ${tokenB}` } };
    try {
        // 3. Create original uploaded resume for User A
        const originalResumeFacts = {
            personal_info: {
                full_name: 'Harshita Hegde',
                email: 'harshita@example.com',
                phone: '+1-555-0199',
                location: 'San Francisco, CA',
                linkedin_url: 'https://linkedin.com/in/harshita-hegde',
                github_url: 'https://github.com/harshita-hegde'
            },
            summary: 'Software Engineer with experience building full-stack web applications and microservices.',
            skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker'],
            experience: [
                {
                    role: 'Full Stack Engineer',
                    company: 'TechFlow Solutions',
                    duration: '2022 - Present',
                    description: 'was responsible for developing high-performance REST APIs in Node.js and TypeScript.'
                },
                {
                    role: 'Frontend Developer',
                    company: 'WebSphere Labs',
                    duration: '2020 - 2022',
                    description: 'worked on building responsive UI components in React and optimized bundle load time by 30%.'
                }
            ],
            education: [
                {
                    degree: 'Bachelor of Science in Computer Science',
                    institution: 'University of California, Berkeley',
                    year: '2020'
                }
            ],
            projects: [
                {
                    title: 'Cloud Dashboard Platform',
                    description: 'Designed and deployed microservices architecture using Node.js and Docker.'
                }
            ],
            certifications: [
                {
                    name: 'AWS Certified Developer',
                    issuer: 'Amazon Web Services',
                    year: '2023'
                }
            ],
            achievements: []
        };
        const userAResume = await db_1.prisma.resume.create({
            data: {
                userId: userA.id,
                title: 'Harshita Hegde Full Stack Resume',
                originalFilename: 'harshita_hegde_resume.pdf',
                filePath: '/uploads/resumes/harshita_resume.pdf',
                fileType: 'application/pdf',
                isPrimary: true,
                parsedContent: JSON.stringify(originalResumeFacts)
            }
        });
        console.log('\n--- 1. Testing Optimization & Complete Version Creation ---');
        const targetJD = 'Seeking a Senior Full Stack Engineer proficient in TypeScript, React, GraphQL, and AWS.';
        const targetTitle = 'Senior Full Stack Engineer';
        const targetCompany = 'NextGen Innovations';
        const optimizeRes = await axios_1.default.post(`${baseUrl}/${userAResume.id}/optimize`, {
            jobDescription: targetJD,
            targetJobTitle: targetTitle,
            targetCompany: targetCompany
        }, authA);
        assert(optimizeRes.status === 200, 'Optimization endpoint returned HTTP 200');
        assert(Boolean(optimizeRes.data.versionId), 'Returned a valid versionId');
        assert(optimizeRes.data.version?.targetJobTitle === targetTitle, 'Saved targetJobTitle correctly');
        assert(optimizeRes.data.version?.targetCompany === targetCompany, 'Saved targetCompany correctly');
        const optContent = optimizeRes.data.optimizedContent;
        assert(optContent.personal_info?.full_name === 'Harshita Hegde', 'Preserved personal_info.full_name');
        assert(optContent.personal_info?.email === 'harshita@example.com', 'Preserved personal_info.email');
        assert(optContent.personal_info?.linkedin_url === 'https://linkedin.com/in/harshita-hegde', 'Preserved contact links');
        assert(optContent.summary === originalResumeFacts.summary, 'Preserved authentic summary without fabricating replacement');
        assert(optContent.skills.includes('TypeScript') && optContent.skills.includes('React'), 'Maintained genuine skills');
        assert(!optContent.skills.includes('GraphQL'), 'Missing JD keyword GraphQL was NOT hallucinated into candidate skills');
        assert(Array.isArray(optimizeRes.data.missingKeywords) && optimizeRes.data.missingKeywords.includes('GraphQL'), 'Reported GraphQL in missing keywords');
        assert(Array.isArray(optContent.experience) && optContent.experience.length === 2, 'Preserved all 2 experience entries');
        assert(Array.isArray(optContent.education) && optContent.education.length === 1, 'Preserved education section');
        assert(Array.isArray(optContent.projects) && optContent.projects.length === 1, 'Preserved projects section');
        assert(Array.isArray(optContent.certifications) && optContent.certifications.length === 1, 'Preserved certifications section');
        // Check suggested rewrites structure
        assert(Array.isArray(optimizeRes.data.suggestedRewrites), 'Suggested rewrites returned as array');
        const rewrites = optimizeRes.data.suggestedRewrites;
        const passiveExpRewrite = rewrites.find((r) => r.itemIndex === 0);
        assert(Boolean(passiveExpRewrite), 'Found suggested rewrite for passive verb entry');
        assert(passiveExpRewrite.suggested === 'Developing high-performance REST APIs in Node.js and TypeScript.' || passiveExpRewrite.suggested === 'Developed high-performance REST APIs in Node.js and TypeScript.', `Suggested clean action-verb rewrite: "${passiveExpRewrite.suggested}"`);
        assert(passiveExpRewrite.original === originalResumeFacts.experience[0].description, 'Original bullet preserved in rewrite item');
        const versionId = optimizeRes.data.versionId;
        console.log('\n--- 2. Verifying Original Resume Remained Untouched ---');
        const originalCheck = await db_1.prisma.resume.findUnique({ where: { id: userAResume.id } });
        assert(originalCheck !== null, 'Original resume exists in database');
        const storedParsed = JSON.parse(originalCheck.parsedContent);
        assert(storedParsed.summary === originalResumeFacts.summary, 'Original summary unchanged in database');
        assert(storedParsed.skills.length === originalResumeFacts.skills.length, 'Original skills array unchanged in database');
        assert(storedParsed.experience[0].description === originalResumeFacts.experience[0].description, 'Original experience bullet unchanged in database');
        console.log('\n--- 3. Testing Version Retrieval by Resume ID ---');
        const versionsListRes = await axios_1.default.get(`${baseUrl}/${userAResume.id}/versions`, authA);
        assert(versionsListRes.status === 200, 'Fetched versions list HTTP 200');
        assert(versionsListRes.data.versions.length >= 1, 'Found created version in list');
        assert(versionsListRes.data.versions[0].id === versionId, 'Version ID matches');
        assert(typeof versionsListRes.data.versions[0].content === 'object', 'Version content is parsed JSON');
        console.log('\n--- 4. Testing Single Version Retrieval by Version ID ---');
        const singleVersionRes = await axios_1.default.get(`${baseUrl}/versions/${versionId}`, authA);
        assert(singleVersionRes.status === 200, 'Fetched single version HTTP 200');
        assert(singleVersionRes.data.version.id === versionId, 'Single version ID matches');
        assert(singleVersionRes.data.version.content.personal_info.full_name === 'Harshita Hegde', 'Single version content intact');
        console.log('\n--- 5. Testing Version Content Updates (Editor Save Workflow) ---');
        const editedContent = {
            ...optContent,
            summary: 'Updated summary saved from Content Editor by user.',
            skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker', 'Next.js'],
            experience: [
                {
                    ...optContent.experience[0],
                    description: passiveExpRewrite.suggested // User applied suggested rewrite!
                },
                optContent.experience[1]
            ]
        };
        const updateRes = await axios_1.default.put(`${baseUrl}/versions/${versionId}`, {
            versionName: 'Custom Fine-Tuned Version',
            targetJobTitle: 'Lead Full Stack Engineer',
            content: editedContent
        }, authA);
        assert(updateRes.status === 200, 'Update version returned HTTP 200');
        assert(updateRes.data.version.versionName === 'Custom Fine-Tuned Version', 'Updated version name');
        assert(updateRes.data.version.targetJobTitle === 'Lead Full Stack Engineer', 'Updated target title');
        assert(updateRes.data.version.content.summary === 'Updated summary saved from Content Editor by user.', 'Updated summary in content');
        assert(updateRes.data.version.content.experience[0].description === passiveExpRewrite.suggested, 'Saved applied bullet rewrite in version content');
        // Reopen and check persistence
        const reopenedRes = await axios_1.default.get(`${baseUrl}/versions/${versionId}`, authA);
        assert(reopenedRes.data.version.content.summary === 'Updated summary saved from Content Editor by user.', 'Version updates persist across reopen');
        assert(reopenedRes.data.version.content.skills.includes('Next.js'), 'Custom edited skill persists');
        console.log('\n--- 6. Testing Unauthorized Version Access & Mutation (Tenant Isolation) ---');
        // User B trying to GET User A version
        try {
            await axios_1.default.get(`${baseUrl}/versions/${versionId}`, authB);
            assert(false, 'User B should NOT be able to view User A version');
        }
        catch (err) {
            assert(err.response?.status === 404, 'User B GET User A version rejected with 404');
        }
        // User B trying to list User A resume versions
        try {
            await axios_1.default.get(`${baseUrl}/${userAResume.id}/versions`, authB);
            assert(false, 'User B should NOT be able to list User A resume versions');
        }
        catch (err) {
            assert(err.response?.status === 404, 'User B list User A versions rejected with 404');
        }
        // User B trying to PUT User A version
        try {
            await axios_1.default.put(`${baseUrl}/versions/${versionId}`, { content: { summary: 'Hacked summary' } }, authB);
            assert(false, 'User B should NOT be able to update User A version');
        }
        catch (err) {
            assert(err.response?.status === 404, 'User B PUT User A version rejected with 404');
        }
        // Verify User A content was NOT compromised
        const finalCheck = await db_1.prisma.resumeVersion.findUnique({ where: { id: versionId } });
        const finalContent = JSON.parse(finalCheck.content);
        assert(finalContent.summary === 'Updated summary saved from Content Editor by user.', 'User A version content preserved after attack attempt');
        console.log('\n===============================================================');
        console.log('🎉 ALL RESUME VERSIONING & OPTIMIZATION AUDIT TESTS PASSED (100%)');
        console.log('===============================================================');
    }
    finally {
        // Cleanup
        server.close();
        await db_1.prisma.resumeVersion.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
        await db_1.prisma.resume.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
        await db_1.prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });
    }
}
runResumeVersionAuditTests().catch((err) => {
    console.error('Test run failed with error:', err);
    process.exit(1);
});
