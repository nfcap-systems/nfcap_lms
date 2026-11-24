import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import { Theme } from '@astryxdesign/core/theme';
import { themes, defaultThemeSlug } from '@/astryx-themes';
import { SignupAstryx } from './SignupAstryx';

export default function SignupPage() {
  return (
    <Theme theme={themes[defaultThemeSlug]}>
      <SignupAstryx />
    </Theme>
  );
}
