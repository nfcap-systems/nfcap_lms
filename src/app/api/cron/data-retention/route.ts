import { NextResponse, type NextRequest } from 'next/server';
import { runDataRetentionSweep } from '@/lib/actions/retention';

/** Triggered on a schedule (`.github/workflows/data-retention.yml`), not by any user — the proxy
 * matcher excludes nothing here, so this route relies entirely on CRON_SECRET rather than a
 * Supabase session (there isn't one for a scheduled job). */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await runDataRetentionSweep();
  return NextResponse.json(result);
}
