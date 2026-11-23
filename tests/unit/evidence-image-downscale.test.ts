import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { downscaleImageIfNeeded } from '@/lib/supabase/evidence-storage';

async function makeJpeg(width: number, height: number): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: 'red' } })
    .jpeg({ quality: 100 })
    .toBuffer();
}

describe('downscaleImageIfNeeded', () => {
  it('resizes an oversized image down to the long-edge cap', async () => {
    const original = await makeJpeg(3000, 2000);

    const result = await downscaleImageIfNeeded(original, 'image/jpeg');

    const metadata = await sharp(result).metadata();
    expect(metadata.width).toBe(2000);
    expect(metadata.height).toBe(1333);
    expect(result.length).toBeLessThan(original.length);
  });

  it('leaves an already-small image at its original dimensions', async () => {
    const original = await makeJpeg(400, 300);

    const result = await downscaleImageIfNeeded(original, 'image/jpeg');

    const metadata = await sharp(result).metadata();
    expect(metadata.width).toBe(400);
    expect(metadata.height).toBe(300);
  });

  it('passes through non-image types unchanged', async () => {
    const pdfLike = Buffer.from('%PDF-1.4 not a real pdf');

    const result = await downscaleImageIfNeeded(pdfLike, 'application/pdf');

    expect(result).toBe(pdfLike);
  });
});
