/** Client-only helper for triggering a browser download from a base64 string returned by a
 * server action — same Blob/object-URL pattern DataIoView.tsx already uses for CSV exports, just
 * starting from base64 instead of plain text so it works for binary content like a PDF. */
export function downloadBase64File(base64: string, filename: string, mimeType: string): void {
  const bytes = atob(base64);
  const array = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    array[i] = bytes.charCodeAt(i);
  }
  const blob = new Blob([array], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
