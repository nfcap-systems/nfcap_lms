import { NextResponse, type NextRequest } from 'next/server';
import { runWioaFollowUpNotificationSweep } from '@/lib/actions/wioa-notifications';

/** NOTIF-3. Same shape as `src/app/api/cron/data-retention/route.ts`: triggered on a schedule, not
 * by any user, so this relies on `CRON_SECRET` rather than a Supabase session. */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await runWioaFollowUpNotificationSweep();
  return NextResponse.json(result);
}
