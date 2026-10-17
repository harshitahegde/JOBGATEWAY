const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

function setupDatabase() {
  const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
  if (!fs.existsSync(schemaPath)) {
    console.error('[DB SETUP] schema.prisma not found at:', schemaPath);
    process.exit(1);
  }

  const databaseUrl = (process.env.DATABASE_URL || '').trim();
  let targetProvider = 'sqlite';

  if (databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://')) {
    targetProvider = 'postgresql';
  } else if (databaseUrl.startsWith('mysql://')) {
    targetProvider = 'mysql';
  } else {
    targetProvider = 'sqlite';
  }

  console.log(`[DB SETUP] Configuring database schema for provider: ${targetProvider}`);

  let schemaContent = fs.readFileSync(schemaPath, 'utf8');
  const datasourceRegex = /(datasource\s+db\s*\{[\s\S]*?provider\s*=\s*")[^"]+("\s*[\s\S]*?\})/;

  if (datasourceRegex.test(schemaContent)) {
    const currentProviderMatch = schemaContent.match(/datasource\s+db\s*\{[\s\S]*?provider\s*=\s*"([^"]+)"/);
    const currentProvider = currentProviderMatch ? currentProviderMatch[1] : null;

    if (currentProvider !== targetProvider) {
      console.log(`[DB SETUP] Updating provider in schema.prisma from "${currentProvider}" to "${targetProvider}"...`);
      schemaContent = schemaContent.replace(datasourceRegex, `$1${targetProvider}$2`);
      fs.writeFileSync(schemaPath, schemaContent, 'utf8');
      console.log('[DB SETUP] schema.prisma updated successfully.');
    } else {
      console.log(`[DB SETUP] schema.prisma provider is already "${targetProvider}".`);
    }
  } else {
    console.warn('[DB SETUP] Warning: datasource block not matched cleanly in schema.prisma');
  }

  // Generate Prisma Client
  try {
    console.log('[DB SETUP] Running prisma generate...');
    execSync('npx prisma generate', {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit'
    });
    console.log('[DB SETUP] Prisma client generated successfully.');
  } catch (err) {
    console.error('[DB SETUP] Failed to generate prisma client:', err.message);
    process.exit(1);
  }

  // If running in production or explicit push requested, push schema
  if (process.env.AUTO_DB_PUSH === 'true' || (process.env.NODE_ENV === 'production' && targetProvider === 'postgresql')) {
    try {
      console.log(`[DB SETUP] Pushing schema to ${targetProvider} database...`);
      execSync('npx prisma db push --skip-generate', {
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit'
      });
      console.log('[DB SETUP] Database schema push completed.');
    } catch (err) {
      console.error('[DB SETUP] Database push failed:', err.message);
      // Don't crash build if DB connection isn't available at build-time (e.g. Render build stage)
      if (process.env.NODE_ENV !== 'production') {
        process.exit(1);
      }
    }
  }
}

if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase };
