"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const storage_provider_1 = require("../providers/storage_provider");
const db_1 = require("../db");
function assert(condition, message) {
    if (!condition) {
        console.error(`❌ FAILED: ${message}`);
        process.exit(1);
    }
    else {
        console.log(`[PASS]: ${message}`);
    }
}
async function runVideoStorageTests() {
    console.log("==========================================");
    console.log("Running Cloud Video Storage & Security Tests");
    console.log("==========================================\n");
    // 1. File Validation Tests
    console.log("--- 1. File Format & Size Limits ---");
    const validFile = {
        fieldname: 'video',
        originalname: 'pitch.webm',
        encoding: '7bit',
        mimetype: 'video/webm',
        size: 15 * 1024 * 1024, // 15MB
        destination: '/tmp',
        filename: 'pitch.webm',
        path: '/tmp/pitch.webm',
        buffer: Buffer.from([]),
        stream: null
    };
    const v1 = (0, storage_provider_1.validateVideoFile)(validFile);
    assert(v1.valid, "1.1 WebM video under 50MB is accepted");
    const oversizedFile = {
        ...validFile,
        size: 55 * 1024 * 1024 // 55MB (exceeds 50MB)
    };
    const v2 = (0, storage_provider_1.validateVideoFile)(oversizedFile);
    assert(!v2.valid, "1.2 Oversized video (>50MB) is rejected");
    assert(Boolean(v2.error && v2.error.includes("exceeds the 50MB limit")), "1.3 Error clearly states 50MB limit");
    const invalidMimeFile = {
        ...validFile,
        originalname: 'script.exe',
        mimetype: 'application/x-msdownload'
    };
    const v3 = (0, storage_provider_1.validateVideoFile)(invalidMimeFile);
    assert(!v3.valid, "1.4 Invalid MIME type (exe) is rejected");
    assert(Boolean(v3.error && v3.error.includes("Invalid video format")), "1.5 Error states supported video formats");
    // 2. Unconfigured Cloud Storage Rejection (Honest Guard)
    console.log("\n--- 2. Unconfigured Cloud Storage Honest Guard ---");
    // Temporarily unset Cloudinary credentials to test unconfigured state
    const prevCloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const prevApiKey = process.env.CLOUDINARY_API_KEY;
    const prevApiSecret = process.env.CLOUDINARY_API_SECRET;
    const prevUrl = process.env.CLOUDINARY_URL;
    delete process.env.CLOUDINARY_CLOUD_NAME;
    delete process.env.CLOUDINARY_API_KEY;
    delete process.env.CLOUDINARY_API_SECRET;
    delete process.env.CLOUDINARY_URL;
    const unconfiguredProvider = new storage_provider_1.CloudinaryVideoStorageProvider();
    assert(!unconfiguredProvider.isConfigured, "2.1 Cloudinary provider reports isConfigured: false when env vars missing");
    assert(unconfiguredProvider.isCloudPersistent, "2.2 Provider flags isCloudPersistent: true");
    let threwExpected = false;
    try {
        // Create a temporary dummy file to attempt upload
        const dummyPath = path_1.default.join(__dirname, 'dummy_test.webm');
        fs_1.default.writeFileSync(dummyPath, 'dummy video bytes');
        const testUploadFile = {
            ...validFile,
            path: dummyPath
        };
        await unconfiguredProvider.saveVideo(testUploadFile);
    }
    catch (err) {
        threwExpected = true;
        assert(err.message.includes("Persistent cloud video storage is not configured"), "2.3 Throws explicit error explaining cloud storage is unconfigured");
        assert(err.message.includes("CLOUDINARY_CLOUD_NAME"), "2.4 Identifies CLOUDINARY_CLOUD_NAME requirement");
        assert(err.message.includes("CLOUDINARY_API_KEY"), "2.5 Identifies CLOUDINARY_API_KEY requirement");
        assert(err.message.includes("CLOUDINARY_API_SECRET"), "2.6 Identifies CLOUDINARY_API_SECRET requirement");
        assert(err.message.includes("ephemeral and wiped on redeploy"), "2.7 Explains Render ephemeral container disk risk");
    }
    assert(threwExpected, "2.8 Video upload strictly fails when cloud credentials missing (NEVER falls back silently to local disk)");
    // Restore env vars
    if (prevCloudName)
        process.env.CLOUDINARY_CLOUD_NAME = prevCloudName;
    if (prevApiKey)
        process.env.CLOUDINARY_API_KEY = prevApiKey;
    if (prevApiSecret)
        process.env.CLOUDINARY_API_SECRET = prevApiSecret;
    if (prevUrl)
        process.env.CLOUDINARY_URL = prevUrl;
    // 3. Share URL and Cloud Asset ID Verification
    console.log("\n--- 3. Cloud Asset ID & Share Readiness ---");
    const cloudProvider = new storage_provider_1.CloudinaryVideoStorageProvider();
    const cloudShare = cloudProvider.getShareDetails("https://res.cloudinary.com/jobgateway-demo/video/upload/v12345/jobgateway/videos/pitch_123.mp4", "jobgateway/videos/pitch_123");
    assert(cloudShare.isShareable, "3.1 Cloudinary HTTPS URL is recognized as shareable");
    assert(cloudShare.status === "ready", "3.2 Cloud share status is 'ready'");
    assert(cloudShare.shareUrl === "https://res.cloudinary.com/jobgateway-demo/video/upload/v12345/jobgateway/videos/pitch_123.mp4", "3.3 Share URL is the secure cloud URL");
    const localProvider = new storage_provider_1.LocalDiskStorageProvider();
    const localShare = localProvider.getShareDetails("/uploads/videos/pitch_local.webm");
    assert(!localShare.isShareable, "3.4 Local disk video without public domain is NOT marked shareable");
    assert(localShare.status === "local_only_unshared", "3.5 Local disk status is 'local_only_unshared'");
    assert(localShare.reason.includes("cannot be shared with external recruiters"), "3.6 Honest explanation that recruiters cannot access private server paths");
    // 4. Database Metadata Persistence & Attachment Workflow
    console.log("\n--- 4. Database Video Metadata & Attachment Workflow ---");
    // Find or create test user
    let testUser = await db_1.prisma.user.findFirst();
    if (!testUser) {
        testUser = await db_1.prisma.user.create({
            data: {
                email: `test_video_${Date.now()}@example.com`,
                passwordHash: 'dummy_hash'
            }
        });
    }
    // Create video record with Cloudinary asset metadata
    const createdVideo = await db_1.prisma.video.create({
        data: {
            userId: testUser.id,
            title: "60-second Pitch - Fullstack Engineer",
            description: "Brief introduction detailing React and Node expertise",
            filePath: "https://res.cloudinary.com/jobgateway/video/upload/v1700000000/jobgateway/videos/pitch_test.mp4",
            durationSeconds: 58,
            fileSize: 4500000,
            mimeType: "video/mp4",
            storageProvider: "cloudinary",
            cloudAssetId: "jobgateway/videos/pitch_test",
            shareUrl: "https://res.cloudinary.com/jobgateway/video/upload/v1700000000/jobgateway/videos/pitch_test.mp4"
        }
    });
    assert(createdVideo.id > 0, "4.1 Video record created in database with primary key");
    assert(createdVideo.cloudAssetId === "jobgateway/videos/pitch_test", "4.2 Cloud asset ID persistently saved");
    assert(createdVideo.storageProvider === "cloudinary", "4.3 Storage provider recorded as cloudinary");
    assert(createdVideo.shareUrl !== null, "4.4 Share URL recorded in database");
    // Create a test resume to test attachment
    const testResume = await db_1.prisma.resume.create({
        data: {
            userId: testUser.id,
            title: "Test Resume for Attachment",
            originalFilename: "resume.pdf",
            filePath: "/resumes/resume.pdf",
            fileType: "application/pdf"
        }
    });
    // Attach video as supplemental material
    const attachment = await db_1.prisma.resumeVideoAttachment.create({
        data: {
            userId: testUser.id,
            videoId: createdVideo.id,
            resumeId: testResume.id,
            notes: "Supplemental 60s intro video"
        }
    });
    assert(attachment.id > 0, "4.5 Video successfully attached to resume as supplemental material");
    // Verify attachment query
    const fetchedAttachments = await db_1.prisma.resumeVideoAttachment.findMany({
        where: { videoId: createdVideo.id, userId: testUser.id },
        include: { resume: true, video: true }
    });
    assert(fetchedAttachments.length === 1, "4.6 Attachment queried with resume and video relations");
    assert(fetchedAttachments[0].resume?.title === "Test Resume for Attachment", "4.7 Resume relation resolved correctly");
    // Detach attachment WITHOUT deleting original video
    await db_1.prisma.resumeVideoAttachment.delete({ where: { id: attachment.id } });
    const remainingVideo = await db_1.prisma.video.findUnique({ where: { id: createdVideo.id } });
    assert(remainingVideo !== null, "4.8 Detaching attachment leaves original video intact in library");
    // Clean up test records
    await db_1.prisma.video.delete({ where: { id: createdVideo.id } });
    await db_1.prisma.resume.delete({ where: { id: testResume.id } });
    const deletedCheck = await db_1.prisma.video.findUnique({ where: { id: createdVideo.id } });
    assert(deletedCheck === null, "4.9 Video deletion removes record cleanly");
    console.log("\n==========================================");
    console.log("ALL CLOUD STORAGE & METADATA TESTS PASSED! 🎉");
    console.log("==========================================");
}
runVideoStorageTests().catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
});
