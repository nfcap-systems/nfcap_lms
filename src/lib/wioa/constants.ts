/** Hard cap on total uploads per `WioaDocument` (archived versions + the current live file),
 * independent of how spread out in time they are (`src/lib/actions/wioa.ts`'s
 * `enforceRateLimit` only caps upload *rate*). Shared between the action that enforces it and the
 * data layer that needs to know whether a document is capped (`CAP-3`'s follow-up trigger,
 * `CAP-4`'s "Allow another upload" staff action), so the number can't drift between the two. */
export const MAX_UPLOADS_PER_DOCUMENT = 10;

/** The limit that actually applies to a document: `uploadLimitOverride` when staff have raised it
 * (`CAP-4`), otherwise the standard cap. */
export function effectiveUploadLimit(uploadLimitOverride: number | null): number {
  return uploadLimitOverride ?? MAX_UPLOADS_PER_DOCUMENT;
}
