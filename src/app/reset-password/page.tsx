import { Suspense } from 'react';
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import { Theme } from '@astryxdesign/core/theme';
import { themes, defaultThemeSlug } from '@/astryx-themes';
import { ResetPasswordAstryx } from './ResetPasswordAstryx';

export default function ResetPasswordPage() {
  return (
    <Theme theme={themes[defaultThemeSlug]}>
      <Suspense>
        <ResetPasswordAstryx />
      </Suspense>
    </Theme>
  );
}
