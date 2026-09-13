import type { SVGProps } from 'react';

export type IconName =
  | 'home'
  | 'compass'
  | 'book'
  | 'briefcase'
  | 'award'
  | 'user'
  | 'grid'
  | 'layers'
  | 'users'
  | 'bar-chart'
  | 'settings'
  | 'menu'
  | 'x'
  | 'chevron-right'
  | 'check'
  | 'play'
  | 'file-text'
  | 'image'
  | 'paperclip'
  | 'lock'
  | 'clock'
  | 'arrow-right'
  | 'clipboard'
  | 'upload'
  | 'list'
  | 'plus'
  | 'map-pin'
  | 'phone'
  | 'mail'
  | 'hardhat'
  | 'log-out'
  | 'search'
  | 'bell'
  | 'panel-left'
  | 'grip-vertical'
  | 'edit'
  | 'trash'
  | 'chevron-up'
  | 'chevron-down'
  | 'numbered-list'
  | 'header';

type IconProps = SVGProps<SVGSVGElement>;

const paths: Record<IconName, React.ReactNode> = {
  home: (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15 9-2 6-6 2 2-6 6-2Z" />
    </>
  ),
  book: (
    <>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" />
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    </>
  ),
  briefcase: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7" />
    </>
  ),
  award: (
    <>
      <circle cx="12" cy="8" r="5.5" />
      <path d="M8.5 12.5 7 21l5-2.5 5 2.5-1.5-8.5" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
    </>
  ),
  grid: (
    <>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
    </>
  ),
  layers: (
    <>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 13 9 5 9-5" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6" />
      <path d="M16 4.5c1.7.4 3 2 3 3.9 0 1.9-1.3 3.5-3 3.9" />
      <path d="M18.5 14.3c2 .6 3.5 2.6 3.5 5" />
    </>
  ),
  'bar-chart': (
    <>
      <path d="M4 20V10" />
      <path d="M12 20V4" />
      <path d="M20 20v-7" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8l1.8-1.8M18 6l1.8-1.8" />
    </>
  ),
  menu: (
    <>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </>
  ),
  x: (
    <>
      <path d="m5 5 14 14M19 5 5 19" />
    </>
  ),
  'chevron-right': (
    <>
      <path d="m9 5 7 7-7 7" />
    </>
  ),
  check: (
    <>
      <path d="m5 13 4 4L19 7" />
    </>
  ),
  play: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 8.5v7l6-3.5-6-3.5Z" />
    </>
  ),
  'file-text': (
    <>
      <path d="M6 3.5h8L19 8v12.5H6V3.5Z" />
      <path d="M14 3.5V8h5" />
      <path d="M9 12.5h6M9 16h6" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="4.5" width="18" height="15" rx="2" />
      <circle cx="8.5" cy="10" r="1.75" />
      <path d="m4 17 4.5-4.5 3 3 4-4.5L21 16" />
    </>
  ),
  paperclip: (
    <>
      <path d="M17.5 9.5 10 17a3.5 3.5 0 0 1-5-5l8-8a2.5 2.5 0 0 1 3.5 3.5l-7.6 7.6a1 1 0 0 1-1.4-1.4L14 7" />
    </>
  ),
  lock: (
    <>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
      <path d="M7.5 10.5V7a4.5 4.5 0 0 1 9 0v3.5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  'arrow-right': (
    <>
      <path d="M4 12h16M13 5l7 7-7 7" />
    </>
  ),
  clipboard: (
    <>
      <rect x="5" y="4.5" width="14" height="17" rx="2" />
      <path d="M9 4.5V3.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
      <path d="m8.5 13 2 2 4-4.5" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V4" />
      <path d="m7 8.5 5-5 5 5" />
      <path d="M5 15.5V19a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3.5" />
    </>
  ),
  list: (
    <>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <path d="M3 6h.01M3 12h.01M3 18h.01" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14M5 12h14" />
    </>
  ),
  'map-pin': (
    <>
      <path d="M12 21s7-6.6 7-11.5a7 7 0 0 0-14 0C5 14.4 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  phone: (
    <>
      <path d="M4.5 4h3.5l1.5 5-2.2 1.6a11 11 0 0 0 5.6 5.6L14.5 14l5 1.5V19a1.5 1.5 0 0 1-1.6 1.5C9.6 20 4 14.4 3.5 6.6A1.5 1.5 0 0 1 4.5 4Z" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 6.5 8 6 8-6" />
    </>
  ),
  hardhat: (
    <>
      <path d="M4 15.5a8 8 0 0 1 16 0" />
      <path d="M2.5 15.5h19" />
      <path d="M2.5 15.5v2a1 1 0 0 0 1 1h17a1 1 0 0 0 1-1v-2" />
      <path d="M11 7.5V5.5" />
    </>
  ),
  'log-out': (
    <>
      <path d="M9 4.5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h3" />
      <path d="M16 15.5 21 12l-5-3.5" />
      <path d="M21 12H9" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m20 20-4.8-4.8" />
    </>
  ),
  bell: (
    <>
      <path d="M6 9.5a6 6 0 0 1 12 0c0 3.5 1 5 2 6H4c1-1 2-2.5 2-6Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </>
  ),
  'panel-left': (
    <>
      <rect x="3" y="3.5" width="18" height="17" rx="2.5" />
      <path d="M9.5 3.5v17" />
    </>
  ),
  'grip-vertical': (
    <>
      <circle cx="9" cy="5.5" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="9" cy="12" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="9" cy="18.5" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="15" cy="5.5" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="15" cy="18.5" r="1.25" fill="currentColor" stroke="none" />
    </>
  ),
  edit: (
    <>
      <path d="M4 20h4L19.5 8.5a2 2 0 0 0 0-2.8l-1.2-1.2a2 2 0 0 0-2.8 0L4 16v4Z" />
      <path d="M14 6l4 4" />
    </>
  ),
  trash: (
    <>
      <path d="M5 7h14" />
      <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" />
      <path d="M6.5 7 7.3 19a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9L17.5 7" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  'chevron-up': (
    <>
      <path d="m5 15 7-7 7 7" />
    </>
  ),
  'chevron-down': (
    <>
      <path d="m5 9 7 7 7-7" />
    </>
  ),
  'numbered-list': (
    <>
      <path d="M9 6h12M9 12h12M9 18h12" />
      <path d="M4 4.5h1.2v3M4 7.5h1.6" />
      <path d="M4 14.5c0-.6.5-1 1.1-1s1.1.4 1.1 1c0 .5-.3.8-.7 1.1l-1.5 1.4h2.2" />
    </>
  ),
  header: (
    <>
      <path d="M5 4.5v15M15 4.5v15" />
      <path d="M5 12h10" />
      <path d="M18 8.5v-3l-1.5 1" />
    </>
  ),
};

export function Icon({ name, ...props }: { name: IconName } & IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
