import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import prisma from '$lib/server/prisma';

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET nu este setat. Adaugă-l în .env sau în setările Vercel');
  return secret;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function createToken(payload: { id: string; email: string; nume: string }): string {
  return jwt.sign(payload, getSecret(), { expiresIn: '7d' });
}

export function verifyToken(token: string): { id: string; email: string; nume: string } | null {
  try {
    return jwt.verify(token, getSecret()) as { id: string; email: string; nume: string };
  } catch {
    return null;
  }
}

export async function verificaMembruProiect(userId: string, proiectId: string): Promise<{ autorizat: boolean; rol?: string }> {
  const membru = await prisma.projectMember.findUnique({
    where: { userId_proiectId: { userId, proiectId } },
    select: { rol: true }
  });
  if (!membru) return { autorizat: false };
  return { autorizat: true, rol: membru.rol };
}

export function esteAdmin(rol: string | undefined): boolean {
  return rol === 'administrator';
}

