import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { __prisma?: PrismaClient };

function createPrisma(): PrismaClient {
  if (globalForPrisma.__prisma) return globalForPrisma.__prisma;
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
