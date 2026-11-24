import { Suspense } from 'react';
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import { Theme } from '@astryxdesign/core/theme';
import { themes, defaultThemeSlug } from '@/astryx-themes';
import { LoginAstryx } from './LoginAstryx';

export default function LoginPage() {
  return (
    <Theme theme={themes[defaultThemeSlug]}>
      <Suspense>
        <LoginAstryx />
      </Suspense>
    </Theme>
  );
}
