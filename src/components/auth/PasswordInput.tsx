'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { TextInput, type TextInputProps } from '@astryxdesign/core/TextInput';

type PasswordInputProps = Omit<TextInputProps, 'type'>;

/** A `TextInput` with a show/hide toggle, for every password field on the Astryx-based auth
 * pages (login, signup) — the design system's `TextInput` has no trailing-icon slot to hang a
 * toggle off (only `startIcon`), so this wraps it instead of patching the vendored component.
 *
 * The toggle button sits in its own `top: 0` row matching the input's own row height
 * (`--size-element-{size}`, the same CSS var `TextInput` sizes its row from), not centered via
 * `top: 50%` of the whole wrapper — that wrapper also contains `TextInput`'s error message box
 * when `status.type === 'error'`, so a percentage-of-total-height center drifts down into the
 * error banner the moment one appears instead of staying put over the input. */
export function PasswordInput(props: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const size = props.size ?? 'md';

  return (
    <div style={{ position: 'relative' }}>
      <TextInput
        {...props}
        type={visible ? 'text' : 'password'}
        controlStyle={{ paddingRight: 36, ...props.controlStyle }}
      />
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 10,
          height: `var(--size-element-${size})`,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          style={{
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
    </div>
  );
}
