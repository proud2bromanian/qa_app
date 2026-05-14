import { json } from '@sveltejs/kit';
import prisma from '$lib/server/prisma';

export async function PATCH({ request, locals }) {
  if (!locals.user) return json({ error: 'Neautorizat' }, { status: 401 });

  const { nume } = await request.json();
  if (!nume || nume.trim().length === 0) {
    return json({ error: 'Numele nu poate fi gol' }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: locals.user.id },
    data: { nume: nume.trim() }
  });

  return json({ id: user.id, email: user.email, nume: user.nume });
}
