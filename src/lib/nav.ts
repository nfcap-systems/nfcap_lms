import type { IconName } from '@/components/icons';

export type NavItem = {
  label: string;
  href: string;
  icon: IconName;
  /** Section header rendered above this entry when it differs from the previous entry's
   * section — matches the design canvas's Sidebar.dc.html `.navgroup` labels (e.g. "Learning &
   * curriculum", "System"). Optional: a nav with no sections just renders flat. */
  section?: string;
};

export type NavGroup = {
  label: string;
  icon: IconName;
  children: NavItem[];
  section?: string;
};

export type NavEntry = NavItem | NavGroup;

export function isNavGroup(entry: NavEntry): entry is NavGroup {
  return 'children' in entry;
}

export type Role = 'learner' | 'admin' | 'partner' | 'coordinator';

export const ROLE_LABEL: Record<Role, string> = {
  learner: 'Learner',
  admin: 'Admin',
  partner: 'Partner Staff',
  coordinator: 'WIOA Coordinator',
};

// Order matches the design canvas's LearnerHeader.dc.html nav strip exactly (Home, My Learning,
// Course Catalog, Portfolio, Certificates, Funding) — not an arbitrary IA choice.
export const learnerNav: NavItem[] = [
  { label: 'Home', href: '/learner', icon: 'home' },
  { label: 'My Learning', href: '/learner/my-learning', icon: 'book' },
  { label: 'Course Catalog', href: '/learner/explore', icon: 'compass' },
  { label: 'Portfolio', href: '/learner/portfolio', icon: 'briefcase' },
  { label: 'Certificates', href: '/learner/certificates', icon: 'award' },
];

// Shown only when the learner's fundingSource is WIOA_PENDING (docs/wioa/WIOA_INTEGRATION_PLAN.md
// Section 4/7 — fundingSource is a routing/UX signal, this is its one nav-visibility effect).
export const wioaNavItem: NavItem = { label: 'Funding', href: '/learner/funding', icon: 'map-pin' };

// Section labels and grouping match the design canvas's Sidebar.dc.html ("Dashboards" /
// "Learning & curriculum" / "Review & cohorts" / "Funding (WIOA)" / "System").
export const adminNav: NavEntry[] = [
  { label: 'Dashboard', href: '/admin', icon: 'grid', section: 'Dashboards' },
  { label: 'Courses', href: '/admin/courses', icon: 'layers', section: 'Learning & curriculum' },
  { label: 'Pathway', href: '/admin/pathway', icon: 'compass' },
  { label: 'Quiz Bank', href: '/admin/quiz-bank', icon: 'list' },
  { label: 'Review Queue', href: '/admin/reviews', icon: 'check', section: 'Review & cohorts' },
  { label: 'Learners', href: '/admin/learners', icon: 'users' },
  { label: 'Cohorts', href: '/admin/cohorts', icon: 'users' },
  // WIOA case operations moved to /coordinator and /partner (docs/build/WIOA_BUILD_WORKFLOW.md
  // Phase 3, retiring the Phase 2 /admin/wioa stopgap) — Admin keeps only the reference-data CRUD
  // that has no other owner (workforce boards/contacts, document requirements).
  {
    label: 'WIOA',
    icon: 'map-pin',
    section: 'Funding (WIOA)',
    children: [
      { label: 'Boards', href: '/admin/wioa/boards', icon: 'map-pin' },
      { label: 'Documents', href: '/admin/wioa/document-requirements', icon: 'clipboard' },
      { label: 'Email Template', href: '/admin/wioa/email-template', icon: 'mail' },
      { label: 'Reports', href: '/admin/wioa/reports', icon: 'bar-chart' },
    ],
  },
  { label: 'Announcements', href: '/admin/announcements', icon: 'bell', section: 'System' },
  { label: 'Data Import/Export', href: '/admin/data-io', icon: 'upload' },
  { label: 'Audit Log', href: '/admin/audit', icon: 'lock' },
  { label: 'Roles', href: '/admin/roles', icon: 'user' },
];

// Partner Staff: scoped to their own assigned cases only, no funding visibility
// (WIOA_INTEGRATION_PLAN.md Section 5a — confirmed, not open).
export const partnerNav: NavItem[] = [
  { label: 'My Cases', href: '/partner', icon: 'clipboard' },
  { label: 'Reports', href: '/partner/reports', icon: 'bar-chart' },
];

// WIOA Coordinator: sees every case plus funding requests/authorizations end to end
// (WIOA_INTEGRATION_PLAN.md Section 5a) — funding section is a placeholder until Phase 4.
export const coordinatorNav: NavItem[] = [
  { label: 'All Cases', href: '/coordinator', icon: 'clipboard' },
  { label: 'Stalled Cases', href: '/coordinator/stalled', icon: 'alert-circle' },
  { label: 'Reports', href: '/coordinator/reports', icon: 'bar-chart' },
];

export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === '/learner' || href === '/admin' || href === '/partner' || href === '/coordinator') {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isNavGroupActive(pathname: string, group: NavGroup): boolean {
  return group.children.some((child) => isNavItemActive(pathname, child.href));
}

export function getActiveNavLabel(
  pathname: string,
  navItems: NavEntry[],
  fallback: string,
): string {
  for (const entry of navItems) {
    if (isNavGroup(entry)) {
      const child = [...entry.children]
        .sort((a, b) => b.href.length - a.href.length)
        .find((item) => isNavItemActive(pathname, item.href));
      if (child) return `${entry.label} ${child.label}`;
    } else if (isNavItemActive(pathname, entry.href)) {
      return entry.label;
    }
  }
  return fallback;
}
