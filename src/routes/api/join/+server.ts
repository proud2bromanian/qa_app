import { json } from '@sveltejs/kit';
import prisma from '$lib/server/prisma';

export async function POST({ locals, request }) {
  if (!locals.user) return json({ error: 'Neautentificat' }, { status: 401 });
  const { cod } = await request.json();
  if (!cod) return json({ error: 'Cod de invitație lipsă' }, { status: 400 });

  const invitatie = await prisma.invitation.findUnique({ where: { cod: cod.trim().toUpperCase() } });
  if (!invitatie || !invitatie.activa || invitatie.expiraLa < new Date()) {
    return json({ error: 'Cod de invitație invalid sau expirat' }, { status: 400 });
  }

  const existing = await prisma.projectMember.findUnique({
    where: { userId_proiectId: { userId: locals.user.id, proiectId: invitatie.proiectId } }
  });
  if (existing) return json({ error: 'Sunteți deja membru al acestui proiect' }, { status: 400 });

  await prisma.projectMember.create({
    data: { userId: locals.user.id, proiectId: invitatie.proiectId, rol: 'membru' }
  });

  return json({ proiectId: invitatie.proiectId, success: true });
}
