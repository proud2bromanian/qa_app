import { redirect } from '@sveltejs/kit';
import prisma from '$lib/server/prisma';

export async function load({ locals, params }) {
  if (!locals.user) redirect(302, '/login');

  const member = await prisma.projectMember.findUnique({
    where: { userId_proiectId: { userId: locals.user.id, proiectId: params.id } }
  });

  if (!member || member.rol !== 'administrator') {
    redirect(302, `/projects/${params.id}/dashboard`);
  }

  return {};
}
