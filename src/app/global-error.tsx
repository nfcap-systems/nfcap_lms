'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

// Catches errors in the root layout itself — the layout (and its CSS) may not have rendered, so
// this renders its own minimal <html>/<body> with inline styles rather than relying on the
// design system or Tailwind having loaded.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          display: 'flex',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          padding: '1.5rem',
        }}
      >
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Something went wrong</h1>
          <p style={{ fontSize: '0.875rem', color: '#555', marginTop: '0.5rem' }}>
            We hit an unexpected error. Our team has been notified — please reload the page.
          </p>
        </div>
      </body>
    </html>
  );
}
