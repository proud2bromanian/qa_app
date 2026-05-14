import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { __prisma?: PrismaClient };
const databaseUrlAliases = ['POSTGRES_PRISMA_URL', 'POSTGRES_URL', 'POSTGRES_URL_NON_POOLING'] as const;

function ensureDatabaseUrl() {
  if (process.env.DATABASE_URL) return;
  const fallback = databaseUrlAliases.map((key) => process.env[key]).find(Boolean);
  if (fallback) process.env.DATABASE_URL = fallback;
}

function createPrisma(): PrismaClient {
  if (globalForPrisma.__prisma) return globalForPrisma.__prisma;
  ensureDatabaseUrl();
  const client = new PrismaClient();
  if (process.env.NODE_ENV !== 'production') globalForPrisma.__prisma = client;
  return client;
}

const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const real = createPrisma();
    return (real as any)[prop];
  }
});

export default prisma;
