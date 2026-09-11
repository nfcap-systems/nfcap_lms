'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, type IconName } from '@/components/icons';
import { searchGlobal } from '@/lib/actions/search';
import type { SearchResult, SearchResultType } from '@/lib/data/search';

const TYPE_ICON: Record<SearchResultType, IconName> = {
  course: 'compass',
  lesson: 'play',
  certificate: 'award',
  portfolio: 'briefcase',
};

const TYPE_LABEL: Record<SearchResultType, string> = {
  course: 'Course',
  lesson: 'Lesson',
  certificate: 'Certificate',
  portfolio: 'Portfolio',
};

function ResultsList({ results, onSelect }: { results: SearchResult[]; onSelect: () => void }) {
  return (
    <ul className="max-h-80 overflow-y-auto p-1.5">
      {results.map((result) => (
        <li key={`${result.type}-${result.href}-${result.title}`}>
          <Link
            href={result.href}
            onClick={onSelect}
            className="flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors hover:bg-accent-tint"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg-subtle text-text-secondary">
              <Icon name={TYPE_ICON[result.type]} className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-text-primary">
                {result.title}
              </span>
              <span className="block truncate text-xs text-text-muted">
                {TYPE_LABEL[result.type]} · {result.subtitle}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function StatusMessage({ children }: { children: string }) {
  return <p className="px-4 py-6 text-center text-sm text-text-muted">{children}</p>;
}

export function GlobalSearch() {
  const pathname = usePathname();
  const [prevPathname, setPrevPathname] = useState(pathname);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [resolved, setResolved] = useState<{ query: string; results: SearchResult[] }>({
    query: '',
    results: [],
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestId = useRef(0);

  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpen(false);
    setQuery('');
  }

  const trimmed = query.trim();
  const isSearchable = trimmed.length >= 2;
  const isLoading = isSearchable && resolved.query !== trimmed;
  const results = isSearchable && resolved.query === trimmed ? resolved.results : [];

  useEffect(() => {
    if (!isSearchable) return;
    const timeout = setTimeout(async () => {
      const id = ++requestId.current;
      const data = await searchGlobal(trimmed);
      if (id === requestId.current) {
        setResolved({ query: trimmed, results: data });
      }
    }, 250);
    return () => clearTimeout(timeout);
  }, [trimmed, isSearchable]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const handleSelect = () => {
    setOpen(false);
    setQuery('');
  };

  const hint =
    trimmed.length > 0 && !isSearchable
      ? 'Keep typing — search needs at least 2 characters.'
      : isLoading
        ? 'Searching…'
        : isSearchable && results.length === 0
          ? `No results for "${trimmed}".`
          : null;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Search"
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-bg-subtle text-text-secondary shadow-sm transition-colors hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
      >
        <Icon name="search" className="h-4.5 w-4.5" />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border-subtle bg-bg-card shadow-elevated">
          <div className="relative border-b border-border-subtle p-2">
            <Icon
              name="search"
              className="pointer-events-none absolute top-1/2 left-5 h-4 w-4 -translate-y-1/2 text-text-muted"
            />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search courses, lessons, certificates…"
              aria-label="Search NFCAP LMS"
              className="w-full rounded-xl border-none bg-bg-subtle py-2 pr-3 pl-9 text-sm text-text-primary placeholder:text-text-muted focus:outline-2 focus:outline-offset-2 focus:outline-brand-primary"
            />
          </div>
          {hint ? (
            <StatusMessage>{hint}</StatusMessage>
          ) : results.length > 0 ? (
            <ResultsList results={results} onSelect={handleSelect} />
          ) : (
            <StatusMessage>Search across courses, lessons, and your credentials.</StatusMessage>
          )}
        </div>
      )}
    </div>
  );
}
