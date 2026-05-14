import { json } from '@sveltejs/kit';
import prisma from '$lib/server/prisma';

export async function POST({ locals, params, request }) {
  if (!locals.user) return json({ error: 'Neautentificat' }, { status: 401 });
  const { cod } = await request.json();
  const invitatie = await prisma.invitation.findUnique({ where: { cod } });
  if (!invitatie || !invitatie.activa || invitatie.expiraLa < new Date()) {
    return json({ error: 'Cod de invitație invalid sau expirat' }, { status: 400 });
  }
  if (invitatie.proiectId !== params.id) {
    return json({ error: 'Codul nu aparține acestui proiect' }, { status: 400 });
  }
  const existing = await prisma.projectMember.findUnique({
    where: { userId_proiectId: { userId: locals.user.id, proiectId: params.id } }
  });
  if (existing) return json({ error: 'Ești deja membru al acestui proiect' }, { status: 400 });

  await prisma.projectMember.create({
    data: { userId: locals.user.id, proiectId: params.id, rol: 'membru' }
  });
  return json({ success: true });
}
