import { verifyToken } from '$lib/server/auth';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get('token');
  event.locals.user = token ? verifyToken(token) : null;
  const response = await resolve(event);

  if (response.headers.get('content-type')?.includes('text/html')) {
    response.headers.set('Cache-Control', 'no-store, max-age=0');
  }

  return response;
};
