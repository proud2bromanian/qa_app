import { json } from '@sveltejs/kit';

export async function GET({ locals }) {
  if (!locals.user) return json({ error: 'Neautentificat' }, { status: 401 });
  return json(locals.user);
}
