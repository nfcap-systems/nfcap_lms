/** A reviewer's mark on a learner's submitted criterion photo (feature #8,
 * ADM12-PhotoAnnotation). Coordinates are normalized to the image's own 0-1 space (not pixels) so
 * a mark drawn against one rendered size still lands in the right place at any other — the signed
 * URL the mark was drawn against is short-lived and re-signed on every view. */
export type AnnotationMark =
  | { id: string; type: 'arrow'; x1: number; y1: number; x2: number; y2: number; note?: string }
  | { id: string; type: 'circle'; x: number; y: number; r: number; note?: string }
  | { id: string; type: 'freehand'; points: { x: number; y: number }[]; note?: string }
  | { id: string; type: 'pin'; x: number; y: number; note: string };

export type AnnotationTool = 'arrow' | 'circle' | 'freehand' | 'pin';
