'use client';

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { Dialog } from '@/components/ui';
import { getCriterionFileUrl } from '@/lib/actions/progress';
import { saveCriterionAnnotation } from '@/lib/actions/criterionReview';
import type { AnnotationMark, AnnotationTool } from '@/lib/types/annotation';

const TOOL_ICONS: Record<AnnotationTool, ReactNode> = {
  arrow: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M5 19L19 5M19 5h-7M19 5v7" />
    </svg>
  ),
  circle: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <circle cx="12" cy="12" r="8" />
    </svg>
  ),
  freehand: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M3 17c3-1 5-9 8-9s2 8 5 8 4-5 4-5" />
    </svg>
  ),
  pin: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M12 21s-7-6.5-7-11a7 7 0 1 1 14 0c0 4.5-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.3" />
    </svg>
  ),
};

const TOOLS: { tool: AnnotationTool; label: string }[] = [
  { tool: 'arrow', label: 'Arrow' },
  { tool: 'circle', label: 'Circle' },
  { tool: 'freehand', label: 'Freehand' },
  { tool: 'pin', label: 'Note pin' },
];

function markLabel(mark: AnnotationMark): string {
  if (mark.type === 'pin') return mark.note;
  return mark.note || `${mark.type[0].toUpperCase()}${mark.type.slice(1)} mark`;
}

/** Feature #8 — ADM12-PhotoAnnotation. Opened from CriterionReviewView for a single criterion's
 * submitted photo. The board is a full staff page in the canvas; implemented here as a wide dialog
 * launched from the per-criterion review screen that already is this feature's real "home" page,
 * rather than a second route — same toolbar/canvas/annotations-list layout, same actions. */
export function PhotoAnnotationDialog({
  open,
  onClose,
  criterionAssessmentId,
  criterionTitle,
  initialMarks,
  initialNote,
}: {
  open: boolean;
  onClose: () => void;
  criterionAssessmentId: string;
  criterionTitle: string;
  initialMarks: AnnotationMark[];
  initialNote: string;
}) {
  const [, startTransition] = useTransition();
  // No criterionAssessmentId-keyed reset effect needed: CriterionReviewView mounts this dialog
  // with `key={criterionAssessmentId}`, so a fresh instance (and fresh initial state below) is
  // what switching criteria actually produces — avoids setState-in-effect cascades entirely.
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [tool, setTool] = useState<AnnotationTool>('arrow');
  const [marks, setMarks] = useState<AnnotationMark[]>(initialMarks);
  const [note, setNote] = useState(initialNote);
  const [saving, setSaving] = useState(false);
  const [drawing, setDrawing] = useState<{
    x: number;
    y: number;
    points: { x: number; y: number }[];
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const loading = imageUrl === null;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    startTransition(async () => {
      const url = await getCriterionFileUrl(criterionAssessmentId);
      if (!cancelled) setImageUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [open, criterionAssessmentId, startTransition]);

  function normalizedPoint(e: ReactPointerEvent): { x: number; y: number } {
    const rect = containerRef.current!.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    };
  }

  function handlePointerDown(e: ReactPointerEvent) {
    if (!imageUrl) return;
    const p = normalizedPoint(e);
    if (tool === 'pin') {
      const text = window.prompt('Note for this pin:');
      if (!text) return;
      setMarks((prev) => [
        ...prev,
        { id: crypto.randomUUID(), type: 'pin', x: p.x, y: p.y, note: text },
      ]);
      return;
    }
    setDrawing({ x: p.x, y: p.y, points: [p] });
  }

  function handlePointerMove(e: ReactPointerEvent) {
    if (!drawing) return;
    const p = normalizedPoint(e);
    if (tool === 'freehand') {
      setDrawing((prev) => (prev ? { ...prev, points: [...prev.points, p] } : prev));
    } else {
      setDrawing((prev) => (prev ? { ...prev, points: [prev.points[0], p] } : prev));
    }
  }

  function handlePointerUp() {
    if (!drawing) return;
    if (tool === 'arrow') {
      const end = drawing.points[drawing.points.length - 1] ?? drawing;
      setMarks((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          type: 'arrow',
          x1: drawing.x,
          y1: drawing.y,
          x2: end.x,
          y2: end.y,
        },
      ]);
    } else if (tool === 'circle') {
      const end = drawing.points[drawing.points.length - 1] ?? drawing;
      const r = Math.hypot(end.x - drawing.x, end.y - drawing.y);
      setMarks((prev) => [
        ...prev,
        { id: crypto.randomUUID(), type: 'circle', x: drawing.x, y: drawing.y, r },
      ]);
    } else if (tool === 'freehand' && drawing.points.length > 1) {
      setMarks((prev) => [
        ...prev,
        { id: crypto.randomUUID(), type: 'freehand', points: drawing.points },
      ]);
    }
    setDrawing(null);
  }

  function clearMarks() {
    setMarks([]);
  }

  function save() {
    setSaving(true);
    startTransition(async () => {
      try {
        await saveCriterionAnnotation(criterionAssessmentId, marks, note);
        onClose();
      } finally {
        setSaving(false);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Annotate photo"
      description={criterionTitle}
      className="w-full max-w-5xl"
      footer={
        <>
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={clearMarks}
            disabled={saving}
          >
            Clear marks
          </button>
          <button
            type="button"
            className="btn-primary btn-sm"
            onClick={save}
            disabled={saving || !imageUrl}
          >
            Save annotation
          </button>
        </>
      }
    >
      <div className="flex gap-4">
        <div
          className="panel"
          style={{
            width: 56,
            flex: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            alignItems: 'center',
            padding: '12px 8px',
          }}
        >
          {TOOLS.map((t) => (
            <button
              key={t.tool}
              type="button"
              aria-label={t.label}
              title={t.label}
              onClick={() => setTool(t.tool)}
              className={`tool ${tool === t.tool ? 'on' : ''}`}
            >
              {TOOL_ICONS[t.tool]}
            </button>
          ))}
        </div>

        <div
          ref={containerRef}
          className="panel relative"
          style={{
            flex: 1.6,
            padding: 0,
            overflow: 'hidden',
            background: 'var(--surface-muted)',
            minHeight: 520,
            cursor: imageUrl ? 'crosshair' : 'default',
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {loading && (
            <div className="flex h-[520px] items-center justify-center text-sm text-[var(--ink-muted)]">
              Loading photo&hellip;
            </div>
          )}
          {imageUrl && (
            /* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL, not an optimizable asset */
            <img src={imageUrl} alt="" className="block w-full select-none" draggable={false} />
          )}
          {imageUrl && (
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <defs>
                <marker
                  id="annotation-arrowhead"
                  markerWidth="6"
                  markerHeight="6"
                  refX="3"
                  refY="3"
                  orient="auto"
                >
                  <path d="M0 0L6 3L0 6Z" fill="var(--status-problem)" />
                </marker>
              </defs>
              {marks.map((mark) => (
                <AnnotationMarkShape key={mark.id} mark={mark} />
              ))}
              {drawing && tool !== 'pin' && (
                <AnnotationMarkShape
                  mark={
                    tool === 'arrow'
                      ? {
                          id: 'draft',
                          type: 'arrow',
                          x1: drawing.x,
                          y1: drawing.y,
                          x2: drawing.points[drawing.points.length - 1]?.x ?? drawing.x,
                          y2: drawing.points[drawing.points.length - 1]?.y ?? drawing.y,
                        }
                      : tool === 'circle'
                        ? {
                            id: 'draft',
                            type: 'circle',
                            x: drawing.x,
                            y: drawing.y,
                            r: Math.hypot(
                              (drawing.points[drawing.points.length - 1]?.x ?? drawing.x) -
                                drawing.x,
                              (drawing.points[drawing.points.length - 1]?.y ?? drawing.y) -
                                drawing.y,
                            ),
                          }
                        : { id: 'draft', type: 'freehand', points: drawing.points }
                  }
                />
              )}
            </svg>
          )}
        </div>

        <div className="panel flex-1" style={{ maxHeight: 460, overflowY: 'auto' }}>
          <div style={{ fontWeight: 600, fontSize: 14.5, marginBottom: 10 }}>Annotations</div>
          {marks.length === 0 ? (
            <p className="text-sm text-[var(--ink-faint)]">
              Use a tool on the left to mark up the photo.
            </p>
          ) : (
            marks.map((mark, i) => (
              <div
                key={mark.id}
                style={{
                  display: 'flex',
                  gap: 10,
                  padding: '10px 0',
                  borderBottom: '1px solid var(--nfcap-border)',
                }}
              >
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: 'var(--status-problem)',
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: 'none',
                  }}
                >
                  {i + 1}
                </span>
                <div style={{ fontSize: 13 }}>{markLabel(mark)}</div>
              </div>
            ))
          )}
          <div style={{ marginTop: 14 }}>
            <label className="field-label">Reviewer note</label>
            <textarea
              className="field-textarea"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What needs to change for resubmission"
            />
          </div>
        </div>
      </div>
    </Dialog>
  );
}

function AnnotationMarkShape({ mark }: { mark: AnnotationMark }) {
  const stroke = 'var(--status-problem)';
  if (mark.type === 'arrow') {
    return (
      <line
        x1={mark.x1 * 100}
        y1={mark.y1 * 100}
        x2={mark.x2 * 100}
        y2={mark.y2 * 100}
        stroke={stroke}
        strokeWidth={0.6}
        markerEnd="url(#annotation-arrowhead)"
      />
    );
  }
  if (mark.type === 'circle') {
    return (
      <circle
        cx={mark.x * 100}
        cy={mark.y * 100}
        r={mark.r * 100}
        fill="none"
        stroke={stroke}
        strokeWidth={0.6}
      />
    );
  }
  if (mark.type === 'freehand') {
    const points = mark.points.map((p) => `${p.x * 100},${p.y * 100}`).join(' ');
    return (
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth={0.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  }
  return <circle cx={mark.x * 100} cy={mark.y * 100} r={1.4} fill={stroke} />;
}
