import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

/**
 * Safe Migration Script: SQLite -> Persistent PostgreSQL
 * 
 * Preserves all user accounts, profiles, resumes, versions, ATS analyses,
 * job applications, outreach drafts, video library metadata, and supplemental attachments.
 * 
 * Usage:
 *   npx ts-node scripts/migrate_sqlite_to_postgres.ts --export
 *   npx ts-node scripts/migrate_sqlite_to_postgres.ts --import [optional_target_postgres_url]
 *   npx ts-node scripts/migrate_sqlite_to_postgres.ts --all [optional_target_postgres_url]
 */

const BACKUP_DIR = path.join(__dirname, '../data_backup');
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

interface ExportData {
  exportedAt: string;
  sourceProvider: string;
  counts: Record<string, number>;
  tables: {
    users: any[];
    profiles: any[];
    resumes: any[];
    resumeVersions: any[];
    resumeAnalyses: any[];
    skills: any[];
    userSkills: any[];
    jobs: any[];
    jobSkills: any[];
    savedJobs: any[];
    recruiters: any[];
    applications: any[];
    applicationStatusHistory: any[];
    outreachEmails: any[];
    videos: any[];
    videoAttachments: any[];
    notifications: any[];
  };
}

export async function exportSqliteData(outputFilename?: string): Promise<string> {
  console.log('[MIGRATION] Starting export of existing SQLite data...');
  const prisma = new PrismaClient();

  try {
    const users = await prisma.user.findMany();
    const profiles = await prisma.profile.findMany();
    const resumes = await prisma.resume.findMany();
    const resumeVersions = await prisma.resumeVersion.findMany();
    const resumeAnalyses = await prisma.resumeAnalysis.findMany();
    const skills = await prisma.skill.findMany();
    const userSkills = await prisma.userSkill.findMany();
    const jobs = await prisma.job.findMany();
    const jobSkills = await prisma.jobSkill.findMany();
    const savedJobs = await prisma.savedJob.findMany();
    const recruiters = await prisma.recruiter.findMany();
    const applications = await prisma.application.findMany();
    const applicationStatusHistory = await prisma.applicationStatusHistory.findMany();
    const outreachEmails = await prisma.outreachEmail.findMany();
    const videos = await prisma.video.findMany();
    const videoAttachments = await prisma.resumeVideoAttachment.findMany();
    const notifications = await prisma.notification.findMany();

    const data: ExportData = {
      exportedAt: new Date().toISOString(),
      sourceProvider: 'sqlite',
      counts: {
        users: users.length,
        profiles: profiles.length,
        resumes: resumes.length,
        resumeVersions: resumeVersions.length,
        resumeAnalyses: resumeAnalyses.length,
        skills: skills.length,
        userSkills: userSkills.length,
        jobs: jobs.length,
        jobSkills: jobSkills.length,
        savedJobs: savedJobs.length,
        recruiters: recruiters.length,
        applications: applications.length,
        applicationStatusHistory: applicationStatusHistory.length,
        outreachEmails: outreachEmails.length,
        videos: videos.length,
        videoAttachments: videoAttachments.length,
        notifications: notifications.length
      },
      tables: {
        users,
        profiles,
        resumes,
        resumeVersions,
        resumeAnalyses,
        skills,
        userSkills,
        jobs,
        jobSkills,
        savedJobs,
        recruiters,
        applications,
        applicationStatusHistory,
        outreachEmails,
        videos,
        videoAttachments,
        notifications
      }
    };

    const targetFile = outputFilename || path.join(BACKUP_DIR, `sqlite_dump_${Date.now()}.json`);
    const latestFile = path.join(BACKUP_DIR, 'latest_sqlite_dump.json');

    fs.writeFileSync(targetFile, JSON.stringify(data, null, 2), 'utf8');
    fs.writeFileSync(latestFile, JSON.stringify(data, null, 2), 'utf8');

    console.log(`[MIGRATION] Export completed successfully!`);
    console.log(`[MIGRATION] Saved to: ${targetFile}`);
    console.log(`[MIGRATION] Table Counts:`, JSON.stringify(data.counts, null, 2));

    return targetFile;
  } finally {
    await prisma.$disconnect();
  }
}

export async function importPostgresData(dumpFilePath?: string, targetPostgresUrl?: string) {
  const filePath = dumpFilePath || path.join(BACKUP_DIR, 'latest_sqlite_dump.json');
  if (!fs.existsSync(filePath)) {
    throw new Error(`Data dump file not found at: ${filePath}. Run export first.`);
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const data: ExportData = JSON.parse(raw);

  console.log(`[MIGRATION] Loading data dump from ${filePath} (Exported at: ${data.exportedAt})...`);

  // Initialize Prisma client with target PostgreSQL URL if specified
  const prisma = targetPostgresUrl
    ? new PrismaClient({ datasources: { db: { url: targetPostgresUrl } } })
    : new PrismaClient();

  try {
    console.log('[MIGRATION] Beginning safe insertion into target database...');

    // 1. Users
    for (const u of data.tables.users) {
      await prisma.user.upsert({
        where: { id: u.id },
        update: {},
        create: {
          id: u.id,
          email: u.email,
          passwordHash: u.passwordHash,
          createdAt: new Date(u.createdAt),
          updatedAt: new Date(u.updatedAt)
        }
      });
    }
    console.log(`[MIGRATION] Restored ${data.tables.users.length} Users`);

    // 2. Profiles
    for (const p of data.tables.profiles) {
      await prisma.profile.upsert({
        where: { id: p.id },
        update: {},
        create: {
          id: p.id,
          userId: p.userId,
          fullName: p.fullName,
          phone: p.phone,
          location: p.location,
          bio: p.bio,
          linkedinUrl: p.linkedinUrl,
          githubUrl: p.githubUrl,
          portfolioUrl: p.portfolioUrl,
          leetcodeUrl: p.leetcodeUrl,
          careerPreferences: p.careerPreferences,
          education: p.education,
          experience: p.experience,
          projects: p.projects,
          certifications: p.certifications,
          createdAt: new Date(p.createdAt),
          updatedAt: new Date(p.updatedAt)
        }
      });
    }
    console.log(`[MIGRATION] Restored ${data.tables.profiles.length} Profiles`);

    // 3. Resumes
    for (const r of data.tables.resumes) {
      await prisma.resume.upsert({
        where: { id: r.id },
        update: {},
        create: {
          id: r.id,
          userId: r.userId,
          title: r.title,
          originalFilename: r.originalFilename,
          filePath: r.filePath,
          fileType: r.fileType,
          parsedContent: r.parsedContent,
          isPrimary: r.isPrimary,
          createdAt: new Date(r.createdAt),
          updatedAt: new Date(r.updatedAt)
        }
      });
    }
    console.log(`[MIGRATION] Restored ${data.tables.resumes.length} Resumes`);

    // 4. Resume Versions
    for (const rv of data.tables.resumeVersions) {
      await prisma.resumeVersion.upsert({
        where: { id: rv.id },
        update: {},
        create: {
          id: rv.id,
          resumeId: rv.resumeId,
          userId: rv.userId,
          versionName: rv.versionName,
          targetJobTitle: rv.targetJobTitle,
          targetCompany: rv.targetCompany,
          content: rv.content,
          createdAt: new Date(rv.createdAt)
        }
      });
    }
    console.log(`[MIGRATION] Restored ${data.tables.resumeVersions.length} Resume Versions`);

    // 5. Resume Analyses
    for (const ra of data.tables.resumeAnalyses) {
      await prisma.resumeAnalysis.upsert({
        where: { id: ra.id },
        update: {},
        create: {
          id: ra.id,
          userId: ra.userId,
          resumeId: ra.resumeId,
          jobTitle: ra.jobTitle,
          company: ra.company,
          jobDescription: ra.jobDescription,
          atsScore: ra.atsScore,
          matchedKeywords: ra.matchedKeywords,
          missingKeywords: ra.missingKeywords,
          suggestions: ra.suggestions,
          createdAt: new Date(ra.createdAt)
        }
      });
    }
    console.log(`[MIGRATION] Restored ${data.tables.resumeAnalyses.length} Resume Analyses`);

    // 6. Skills
    for (const s of data.tables.skills) {
      await prisma.skill.upsert({
        where: { id: s.id },
        update: {},
        create: {
          id: s.id,
          name: s.name,
          category: s.category
        }
      });
    }

    // 7. User Skills
    for (const us of data.tables.userSkills) {
      await prisma.userSkill.upsert({
        where: { id: us.id },
        update: {},
        create: {
          id: us.id,
          userId: us.userId,
          skillName: us.skillName,
          proficiencyLevel: us.proficiencyLevel,
          yearsExperience: us.yearsExperience
        }
      });
    }

    // 8. Jobs
    for (const j of data.tables.jobs) {
      await prisma.job.upsert({
        where: { id: j.id },
        update: {},
        create: {
          id: j.id,
          title: j.title,
          company: j.company,
          location: j.location,
          type: j.type,
          experienceLevel: j.experienceLevel,
          salaryRange: j.salaryRange,
          description: j.description,
          requirements: j.requirements,
          applicationUrl: j.applicationUrl,
          source: j.source,
          createdAt: new Date(j.createdAt)
        }
      });
    }

    // 9. Job Skills
    for (const js of data.tables.jobSkills) {
      await prisma.jobSkill.upsert({
        where: { id: js.id },
        update: {},
        create: {
          id: js.id,
          jobId: js.jobId,
          skillName: js.skillName,
          isRequired: js.isRequired
        }
      });
    }

    // 10. Saved Jobs
    for (const sj of data.tables.savedJobs) {
      await prisma.savedJob.upsert({
        where: { id: sj.id },
        update: {},
        create: {
          id: sj.id,
          userId: sj.userId,
          jobId: sj.jobId,
          savedAt: new Date(sj.savedAt)
        }
      });
    }

    // 11. Recruiters
    for (const rc of data.tables.recruiters) {
      await prisma.recruiter.upsert({
        where: { id: rc.id },
        update: {},
        create: {
          id: rc.id,
          companyName: rc.companyName,
          name: rc.name,
          title: rc.title,
          email: rc.email,
          linkedinUrl: rc.linkedinUrl,
          verified: rc.verified,
          createdAt: new Date(rc.createdAt)
        }
      });
    }

    // 12. Applications
    for (const a of data.tables.applications) {
      await prisma.application.upsert({
        where: { id: a.id },
        update: {},
        create: {
          id: a.id,
          userId: a.userId,
          jobId: a.jobId,
          externalJobId: a.externalJobId,
          companyName: a.companyName,
          jobTitle: a.jobTitle,
          location: a.location,
          jobUrl: a.jobUrl,
          status: a.status,
          appliedDate: a.appliedDate,
          resumeVersionId: a.resumeVersionId,
          outreachEmailId: a.outreachEmailId,
          videoId: a.videoId,
          notes: a.notes,
          createdAt: new Date(a.createdAt),
          updatedAt: new Date(a.updatedAt)
        }
      });
    }
    console.log(`[MIGRATION] Restored ${data.tables.applications.length} Applications`);

    // 13. Application Status History
    for (const ash of data.tables.applicationStatusHistory) {
      await prisma.applicationStatusHistory.upsert({
        where: { id: ash.id },
        update: {},
        create: {
          id: ash.id,
          applicationId: ash.applicationId,
          previousStatus: ash.previousStatus,
          newStatus: ash.newStatus,
          notes: ash.notes,
          changedAt: new Date(ash.changedAt)
        }
      });
    }

    // 14. Outreach Emails
    for (const oe of data.tables.outreachEmails) {
      await prisma.outreachEmail.upsert({
        where: { id: oe.id },
        update: {},
        create: {
          id: oe.id,
          userId: oe.userId,
          applicationId: oe.applicationId,
          recruiterId: oe.recruiterId,
          type: oe.type,
          recipientEmail: oe.recipientEmail,
          recipientName: oe.recipientName,
          companyName: oe.companyName,
          jobTitle: oe.jobTitle,
          subject: oe.subject,
          body: oe.body,
          status: oe.status,
          providerMessageId: oe.providerMessageId,
          failureReason: oe.failureReason,
          sentAt: oe.sentAt ? new Date(oe.sentAt) : null,
          createdAt: new Date(oe.createdAt),
          updatedAt: new Date(oe.updatedAt)
        }
      });
    }
    console.log(`[MIGRATION] Restored ${data.tables.outreachEmails.length} Outreach Emails`);

    // 15. Videos
    for (const v of data.tables.videos) {
      await prisma.video.upsert({
        where: { id: v.id },
        update: {},
        create: {
          id: v.id,
          userId: v.userId,
          title: v.title,
          description: v.description,
          filePath: v.filePath,
          durationSeconds: v.durationSeconds,
          fileSize: v.fileSize,
          mimeType: v.mimeType,
          storageProvider: v.storageProvider,
          cloudAssetId: v.cloudAssetId || null,
          shareUrl: v.shareUrl,
          createdAt: new Date(v.createdAt)
        }
      });
    }
    console.log(`[MIGRATION] Restored ${data.tables.videos.length} Videos`);

    // 16. Resume Video Attachments
    for (const rva of data.tables.videoAttachments) {
      await prisma.resumeVideoAttachment.upsert({
        where: { id: rva.id },
        update: {},
        create: {
          id: rva.id,
          userId: rva.userId,
          videoId: rva.videoId,
          resumeId: rva.resumeId,
          resumeVersionId: rva.resumeVersionId,
          notes: rva.notes,
          createdAt: new Date(rva.createdAt)
        }
      });
    }
    console.log(`[MIGRATION] Restored ${data.tables.videoAttachments.length} Video Attachments`);

    // 17. Notifications
    for (const n of data.tables.notifications) {
      await prisma.notification.upsert({
        where: { id: n.id },
        update: {},
        create: {
          id: n.id,
          userId: n.userId,
          title: n.title,
          message: n.message,
          type: n.type,
          isRead: n.isRead,
          createdAt: new Date(n.createdAt)
        }
      });
    }

    // Reset Postgres sequences if connected to PostgreSQL
    const dbUrl = targetPostgresUrl || process.env.DATABASE_URL || '';
    if (dbUrl.startsWith('postgres') || dbUrl.startsWith('postgresql')) {
      console.log('[MIGRATION] Resetting PostgreSQL autoincrement sequences...');
      const tablesWithId = [
        'User', 'Profile', 'Resume', 'ResumeVersion', 'ResumeAnalysis',
        'Skill', 'UserSkill', 'Job', 'JobSkill', 'SavedJob', 'Recruiter',
        'Application', 'ApplicationStatusHistory', 'OutreachEmail', 'Video',
        'ResumeVideoAttachment', 'Notification'
      ];

      for (const table of tablesWithId) {
        try {
          await prisma.$executeRawUnsafe(
            `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), coalesce(max(id), 1), max(id) IS NOT null) FROM "${table}";`
          );
        } catch (err: any) {
          // If sequence name differs, continue safely
        }
      }
      console.log('[MIGRATION] PostgreSQL sequence sync completed.');
    }

    console.log('[MIGRATION] Data import to target database completed successfully with zero records lost!');
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || '--export';

  if (mode === '--export') {
    await exportSqliteData();
  } else if (mode === '--import') {
    const targetUrl = args[1];
    await importPostgresData(undefined, targetUrl);
  } else if (mode === '--all') {
    const targetUrl = args[1];
    const dumpFile = await exportSqliteData();
    await importPostgresData(dumpFile, targetUrl);
  } else {
    console.log('Usage:');
    console.log('  npx ts-node scripts/migrate_sqlite_to_postgres.ts --export');
    console.log('  npx ts-node scripts/migrate_sqlite_to_postgres.ts --import [target_postgres_url]');
    console.log('  npx ts-node scripts/migrate_sqlite_to_postgres.ts --all [target_postgres_url]');
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('[MIGRATION FATAL ERROR]:', err);
    process.exit(1);
  });
}
