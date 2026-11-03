'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { Button, Card, CardContent } from '@/components/ui';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-subtle p-6">
      <Card className="max-w-md">
        <CardContent className="flex flex-col items-start gap-4 py-10">
          <h1 className="text-lg font-semibold text-brand-heading">Something went wrong</h1>
          <p className="text-sm text-text-secondary">
            We hit an unexpected error. Our team has been notified — try again, or come back in a
            moment.
          </p>
          <Button onClick={reset}>Try again</Button>
        </CardContent>
      </Card>
    </div>
  );
}
