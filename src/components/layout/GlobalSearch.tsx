'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Award, Briefcase, ClipboardList, Compass, Play, Search, User } from 'lucide-react';
import { Icon } from '@/components/icons';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/admin-ui/command';
import { searchGlobal } from '@/lib/actions/search';
import type { SearchResult, SearchResultType } from '@/lib/data/search';
import { isNavGroup, type NavEntry } from '@/lib/nav';

function flattenNavItems(entries: NavEntry[]): { label: string; href: string; icon: Parameters<typeof Icon>[0]['name'] }[] {
  return entries.flatMap((entry) =>
    isNavGroup(entry)
      ? entry.children.map((child) => ({
          label: `${entry.label} · ${child.label}`,
          href: child.href,
          icon: child.icon,
        }))
      : [{ label: entry.label, href: entry.href, icon: entry.icon }],
  );
}

const TYPE_ICON: Record<SearchResultType, typeof Search> = {
  course: Compass,
  lesson: Play,
  certificate: Award,
  portfolio: Briefcase,
  learner: User,
  case: ClipboardList,
};

const TYPE_LABEL: Record<SearchResultType, string> = {
  course: 'Courses',
  lesson: 'Lessons',
  certificate: 'Certificates',
  portfolio: 'Portfolio',
  learner: 'Learners',
  case: 'Cases',
};

const TYPE_ORDER: SearchResultType[] = [
  'course',
  'lesson',
  'certificate',
  'portfolio',
  'learner',
  'case',
];

export function GlobalSearch({
  variant = 'icon',
  navItems,
}: {
  variant?: 'icon' | 'pill' | 'bar';
  navItems?: NavEntry[];
} = {}) {
  const navShortcuts = useMemo(() => flattenNavItems(navItems ?? []), [navItems]);
  const router = useRouter();
  const pathname = usePathname();
  const [prevPathname, setPrevPathname] = useState(pathname);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [resolved, setResolved] = useState<{ query: string; results: SearchResult[] }>({
    query: '',
    results: [],
  });

  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpen(false);
    setQuery('');
  }

  const trimmed = query.trim();
  const isSearchable = trimmed.length >= 2;
  const isLoading = isSearchable && resolved.query !== trimmed;

  useEffect(() => {
    if (!isSearchable) return;
    let cancelled = false;
    const timeout = setTimeout(async () => {
      const data = await searchGlobal(trimmed);
      if (!cancelled) setResolved({ query: trimmed, results: data });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [trimmed, isSearchable]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const grouped = useMemo(() => {
    const results = isSearchable && resolved.query === trimmed ? resolved.results : [];
    return TYPE_ORDER.map((type) => ({
      type,
      items: results.filter((result) => result.type === type),
    })).filter((group) => group.items.length > 0);
  }, [isSearchable, resolved, trimmed]);

  const handleSelect = (href: string) => {
    setOpen(false);
    setQuery('');
    router.push(href);
  };

  const emptyMessage =
    trimmed.length > 0 && !isSearchable
      ? 'Keep typing — search needs at least 2 characters.'
      : isLoading
        ? 'Searching…'
        : `No results for "${trimmed}".`;

  return (
    <>
      {variant === 'pill' ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label="Search"
          className="lhdr-search"
        >
          <Search className="h-4 w-4" />
          <span>Search…</span>
        </button>
      ) : variant === 'bar' ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label="Search"
          className="flex h-8 w-64 cursor-pointer items-center gap-2 rounded-md border border-border bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted/70"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="flex-1 text-left">Search…</span>
          <kbd className="rounded-sm border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            ⌘K
          </kbd>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label="Search"
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--ink-muted)] shadow-sm transition-colors hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
        >
          <Search className="h-4.5 w-4.5" />
        </button>
      )}

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search"
        description="Search by name, email, or title."
      >
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="Search by name, email, or title…"
        />
        <CommandList>
          {!isSearchable ? (
            trimmed.length > 0 ? (
              <CommandEmpty>{emptyMessage}</CommandEmpty>
            ) : navShortcuts.length === 0 ? (
              <CommandEmpty>Search by name, email, or title.</CommandEmpty>
            ) : null
          ) : grouped.length === 0 ? (
            <CommandEmpty>{emptyMessage}</CommandEmpty>
          ) : null}
          {!isSearchable && navShortcuts.length > 0 && (
            <CommandGroup heading="Go to">
              {navShortcuts.map((item) => (
                <CommandItem
                  key={item.href}
                  value={`nav-${item.href}-${item.label}`}
                  onSelect={() => handleSelect(item.href)}
                >
                  <Icon name={item.icon} className="size-4 opacity-60" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {grouped.map((group) => {
            const GroupIcon = TYPE_ICON[group.type];
            return (
              <CommandGroup key={group.type} heading={TYPE_LABEL[group.type]}>
                {group.items.map((result) => (
                  <CommandItem
                    key={`${result.type}-${result.href}-${result.title}`}
                    value={`${result.type}-${result.href}-${result.title}`}
                    onSelect={() => handleSelect(result.href)}
                  >
                    <GroupIcon className="size-4 opacity-60" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate">{result.title}</span>
                    <CommandShortcut className="max-w-32 truncate font-sans text-[0.7rem] font-normal normal-case">
                      {result.subtitle}
                    </CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
            );
          })}
        </CommandList>
      </CommandDialog>
    </>
  );
}
