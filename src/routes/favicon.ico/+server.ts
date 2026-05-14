export function GET() {
  return new Response(null, {
    status: 308,
    headers: {
      location: '/favicon.svg'
    }
  });
}
