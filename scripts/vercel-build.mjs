import { spawnSync } from 'node:child_process';
import path from 'node:path';

const databaseUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_URL_NON_POOLING;

if (!databaseUrl) {
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

const env = { ...process.env, DATABASE_URL: databaseUrl };
const binSuffix = process.platform === 'win32' ? '.cmd' : '';
const bin = (name) => path.join(process.cwd(), 'node_modules', '.bin', `${name}${binSuffix}`);

function run(command, args) {
  const result = spawnSync(command, args, { env, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run('node', ['-v']);
run(bin('prisma'), ['generate', '--schema=prisma/schema.vercel.prisma']);
run(bin('prisma'), ['db', 'push', '--schema=prisma/schema.vercel.prisma']);
run(bin('vite'), ['build']);
