import { spawnSync } from 'node:child_process';
import path from 'node:path';

const rawDatabaseUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_URL_NON_POOLING;

if (!rawDatabaseUrl) {
  console.error(
    [
      'Missing database connection string.',
      'Set DATABASE_URL in Vercel Project Settings > Environment Variables.',
      'If you connected Vercel Postgres, POSTGRES_URL or POSTGRES_PRISMA_URL is also accepted.',
      'The value must be a PostgreSQL connection string.'
    ].join('\n')
  );
  process.exit(1);
}

function replacePrismaPostgresHost(connectionString, hostname) {
  try {
    const url = new URL(connectionString);
    if (url.hostname === 'db.prisma.io' || url.hostname === 'pooled.db.prisma.io') {
      url.hostname = hostname;
      return url.toString();
    }
  } catch {
    return connectionString;
  }
  return connectionString;
}

const directDatabaseUrl =
  process.env.DIRECT_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  replacePrismaPostgresHost(rawDatabaseUrl, 'db.prisma.io');

const pooledDatabaseUrl =
  process.env.POOLED_DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  replacePrismaPostgresHost(rawDatabaseUrl, 'pooled.db.prisma.io');

const env = {
  ...process.env,
  DATABASE_URL: pooledDatabaseUrl,
  DIRECT_URL: directDatabaseUrl
};
const binSuffix = process.platform === 'win32' ? '.cmd' : '';
const bin = (name) => path.join(process.cwd(), 'node_modules', '.bin', `${name}${binSuffix}`);

function run(command, args) {
  const result = spawnSync(command, args, { env, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

async function runWithRetries(command, args, attempts = 5) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const result = spawnSync(command, args, { env, stdio: 'inherit' });
    if (result.status === 0) return;
    if (attempt === attempts) process.exit(result.status ?? 1);

    const delaySeconds = attempt * 15;
    console.warn(`Command failed. Retrying in ${delaySeconds}s (${attempt}/${attempts})...`);
    await new Promise((resolve) => setTimeout(resolve, delaySeconds * 1000));
  }
}

run('node', ['-v']);
run(bin('prisma'), ['generate', '--schema=prisma/schema.vercel.prisma']);
await runWithRetries(bin('prisma'), ['db', 'push', '--schema=prisma/schema.vercel.prisma']);
run(bin('vite'), ['build']);
