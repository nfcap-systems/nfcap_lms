import { Suspense } from 'react';
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import { Theme } from '@astryxdesign/core/theme';
import { themes, defaultThemeSlug } from '@/astryx-themes';
import { ForgotPasswordAstryx } from './ForgotPasswordAstryx';

export default function ForgotPasswordPage() {
  return (
    <Theme theme={themes[defaultThemeSlug]}>
      <Suspense>
        <ForgotPasswordAstryx />
      </Suspense>
    </Theme>
  );
}
