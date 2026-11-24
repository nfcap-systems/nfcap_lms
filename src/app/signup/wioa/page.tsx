import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import { Theme } from '@astryxdesign/core/theme';
import { themes, defaultThemeSlug } from '@/astryx-themes';
import { SignupWioaAstryx } from './SignupWioaAstryx';

export default function SignupWioaPage() {
  return (
    <Theme theme={themes[defaultThemeSlug]}>
      <SignupWioaAstryx />
    </Theme>
  );
}
