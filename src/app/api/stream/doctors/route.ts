export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * DEPRECATED: This SSE endpoint has been replaced by Pusher real-time.
 * Returning 410 Gone so clients know to upgrade.
 */
export async function GET() {
  return new Response(
    JSON.stringify({ error: 'This SSE endpoint is deprecated. Use Pusher instead.' }),
    {
      status: 410,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
