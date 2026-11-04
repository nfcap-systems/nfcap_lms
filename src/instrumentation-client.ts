import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Off in dev/no-DSN environments by construction — Sentry no-ops without a DSN, so this file
  // is always safe to import.
  tracesSampleRate: 1,
});
