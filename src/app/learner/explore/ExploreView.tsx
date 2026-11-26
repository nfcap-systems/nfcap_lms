'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Icon } from '@/components/icons';
import { ExploreCourseCard } from '@/components/learner/ExploreCourseCard';
import { courseDurationMinutes, courseLessonCount } from '@/lib/types';
import type { AdminCourse } from '@/lib/data/courses';
import type { CourseProgress, CourseUnlockRecord } from '@/lib/data/progress';

export function ExploreView({
  courses,
  progressMap,
  unlocks,
}: {
  courses: AdminCourse[];
  progressMap: Record<string, CourseProgress>;
  unlocks: Record<string, CourseUnlockRecord>;
}) {
  const [category, setCategory] = useState<'all' | string>('all');

  // Category casing isn't consistently seeded (e.g. "Trade Skills" vs "trade skills") — group
  // case-insensitively so the filter doesn't show the same category twice.
  const categoryByKey = new Map<string, string>();
  for (const course of courses) {
    const key = course.category.trim().toLowerCase();
    if (!categoryByKey.has(key)) categoryByKey.set(key, course.category.trim());
  }
  const categories = Array.from(categoryByKey.values());
  const filtered =
    category === 'all'
      ? courses
      : courses.filter((c) => c.category.trim().toLowerCase() === category.trim().toLowerCase());
  const totalLessons = courses.reduce((sum, c) => sum + courseLessonCount(c), 0);
  const totalHours =
    Math.round((courses.reduce((sum, c) => sum + courseDurationMinutes(c), 0) / 60) * 10) / 10;
  const openCourseCount = courses.filter((c) => c.access === 'open').length;

  return (
    <div className="flex flex-col gap-9">
      <div style={{ position: 'relative' }}>
        <div
          className="h-auto flex-col items-start gap-3 py-5 sm:h-[150px] sm:flex-row sm:items-center sm:py-0"
          style={{
            borderRadius: 'var(--nfcap-radius-lg)',
            overflow: 'hidden',
            position: 'relative',
            background:
              'linear-gradient(105deg, #eff6ff 0%, #f5f8ff 46%, #dbe9ff 72%, var(--surface) 100%)',
            display: 'flex',
            boxShadow: 'var(--nfcap-shadow-sm)',
            border: '1px solid var(--nfcap-border)',
          }}
        >
          <div
            className="max-w-[80%] px-5 sm:max-w-[56%] sm:px-9"
            style={{
              position: 'relative',
              zIndex: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                fontFamily: 'var(--font-display)',
                color: 'var(--ink)',
              }}
            >
              Explore flooring courses
            </div>
            <div
              style={{ fontSize: 13, color: 'var(--ink-muted)', maxWidth: 400, lineHeight: 1.5 }}
            >
              NFCAP&apos;s full apprenticeship pathway. Courses marked Restricted are assigned by
              NFCAP staff based on your progress and program placement.
            </div>
          </div>
          <Image
            src="/images/learner/flooring-fundamentals.jpg"
            alt=""
            width={700}
            height={150}
            className="hidden sm:block"
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              width: '44%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center 40%',
              clipPath: 'polygon(18% 0, 100% 0, 100% 100%, 0 100%)',
            }}
          />
        </div>

        <div
          className="grid-cols-1 sm:grid-cols-3"
          style={{
            position: 'relative',
            margin: '10px 16px 0',
            display: 'grid',
            gap: 14,
            zIndex: 3,
          }}
        >
          <div className="lrn-stat">
            <span
              className="lrn-stat-icon"
              style={{ background: '#eff6ff', color: 'var(--nfcap-accent)' }}
            >
              <Icon name="book" className="h-5 w-5" />
            </span>
            <div className="vals">
              <span className="n">{courses.length}</span>
              <span className="l">Courses available</span>
            </div>
          </div>
          <div className="lrn-stat">
            <span className="lrn-stat-icon" style={{ background: '#f0fdf4', color: '#166534' }}>
              <Icon name="clock" className="h-5 w-5" />
            </span>
            <div className="vals">
              <span className="n">{totalLessons}</span>
              <span className="l">Total lessons · {totalHours}h</span>
            </div>
          </div>
          <div className="lrn-stat">
            <span className="lrn-stat-icon" style={{ background: '#f3eefe', color: '#7c3aed' }}>
              <Icon name="users" className="h-5 w-5" />
            </span>
            <div className="vals">
              <span className="n">{openCourseCount}</span>
              <span className="l">Open to self-start</span>
            </div>
          </div>
        </div>
      </div>

      <div
        className="grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px]"
        style={{
          display: 'grid',
          gap: 24,
          alignItems: 'start',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
          <div className="lrn-sechead flex-col items-start gap-2 sm:flex-row sm:items-baseline sm:gap-0">
            <h2>All courses</h2>
            {categories.length > 1 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="dtbtn"
                  style={
                    category === 'all'
                      ? {
                          background: 'var(--nfcap-accent)',
                          color: 'var(--nfcap-accent-contrast)',
                          borderColor: 'var(--nfcap-accent)',
                        }
                      : undefined
                  }
                  onClick={() => setCategory('all')}
                >
                  All
                </button>
                {categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="dtbtn"
                    style={
                      category === c
                        ? {
                            background: 'var(--nfcap-accent)',
                            color: 'var(--nfcap-accent-contrast)',
                            borderColor: 'var(--nfcap-accent)',
                          }
                        : undefined
                    }
                    onClick={() => setCategory(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid-cols-1 sm:grid-cols-2" style={{ display: 'grid', gap: 18 }}>
            {filtered.map((course, index) => (
              <ExploreCourseCard
                key={course.id}
                course={course}
                progress={progressMap[course.id]}
                unlocked={Boolean(unlocks[course.id])}
                photoIndex={index}
              />
            ))}
          </div>
        </div>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            className="lrn-side-panel"
            style={{
              background: 'linear-gradient(135deg, #f0fdf4, #f7fffb)',
              borderColor: '#bbf7d0',
            }}
          >
            <div className="lrn-side-title">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Icon name="award" className="h-3.5 w-3.5" style={{ color: '#166534' }} />
                Need funding instead?
              </h3>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-muted)', lineHeight: 1.5 }}>
              If you qualify for WIOA funding, your tuition for the full apprenticeship pathway can
              be fully covered.
            </div>
            <Link
              href="/learner/funding"
              style={{
                fontSize: 12.5,
                color: 'var(--nfcap-accent)',
                fontWeight: 600,
                textDecoration: 'underline',
              }}
            >
              Check your eligibility →
            </Link>
          </div>

          <div className="lrn-side-panel">
            <div className="lrn-side-title">
              <h3>How enrollment works</h3>
            </div>
            <div
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
                fontSize: 12.5,
                lineHeight: 1.5,
              }}
            >
              <span
                className="lrn-icon-tile"
                style={{
                  background: '#eff6ff',
                  color: 'var(--nfcap-accent)',
                  width: 24,
                  height: 24,
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                1
              </span>
              <div>
                <b style={{ display: 'block', color: 'var(--ink)', fontSize: 13 }}>Pick a course</b>
                No prerequisites beyond Safety &amp; Tools for hands-on modules.
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
                fontSize: 12.5,
                lineHeight: 1.5,
              }}
            >
              <span
                className="lrn-icon-tile"
                style={{
                  background: '#eff6ff',
                  color: 'var(--nfcap-accent)',
                  width: 24,
                  height: 24,
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                2
              </span>
              <div>
                <b style={{ display: 'block', color: 'var(--ink)', fontSize: 13 }}>
                  Start right away
                </b>
                No application review for open courses.
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
                fontSize: 12.5,
                lineHeight: 1.5,
              }}
            >
              <span
                className="lrn-icon-tile"
                style={{
                  background: '#eff6ff',
                  color: 'var(--nfcap-accent)',
                  width: 24,
                  height: 24,
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                3
              </span>
              <div>
                <b style={{ display: 'block', color: 'var(--ink)', fontSize: 13 }}>
                  Track it on My Learning
                </b>
                The course appears there as soon as you start it.
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
