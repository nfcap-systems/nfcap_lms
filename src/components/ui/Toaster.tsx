'use client';

import type { CSSProperties } from 'react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

/** Mounted once in src/app/layout.tsx, above every role's own layout (admin/learner/coordinator/
 * partner) — one shared toast viewport for the whole app, not the Astryx design system the auth
 * pages (login/signup/forgot-password/reset-password) use. Those use Astryx's own `useToast()`
 * instead, which needs no mounted viewport at all.
 *
 * Styled via the shadcn tokens already in src/app/globals.css (--popover/--border/etc.) rather
 * than this app's own --nfcap-* tokens — those are scoped per [data-system="learner"|"staff"]
 * attribute on each role's own shell, which this sits outside of, so it couldn't read them
 * anyway. theme="light" is explicit: nothing in this app currently toggles .dark. */
export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      position="top-right"
      richColors
      closeButton
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as CSSProperties
      }
      {...props}
    />
  );
}
