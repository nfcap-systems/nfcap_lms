'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { TextInput, type TextInputProps } from '@astryxdesign/core/TextInput';

type PasswordInputProps = Omit<TextInputProps, 'type'>;

/** A `TextInput` with a show/hide toggle, for every password field on the Astryx-based auth
 * pages (login, signup) — the design system's `TextInput` has no trailing-icon slot to hang a
 * toggle off (only `startIcon`), so this wraps it instead of patching the vendored component.
 *
 * Relies on the field having no visible label row and no `description` (always pass
 * `isLabelHidden`, keep hint text as a sibling `<Text>` instead of `description`) — the wrapping
 * div's bounding box is then exactly the input's own box, which is what makes `top: 50%`
 * positioning line up. A visible label/description inside `TextInput` itself would push the input
 * down without this component knowing by how much. */
export function PasswordInput(props: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <TextInput
        {...props}
        type={visible ? 'text' : 'password'}
        controlStyle={{ paddingRight: 36, ...props.controlStyle }}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        style={{
          position: 'absolute',
          right: 10,
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'none',
          border: 'none',
          padding: 2,
          margin: 0,
          cursor: 'pointer',
          color: 'rgba(15, 17, 21, 0.5)',
          lineHeight: 0,
        }}
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}
