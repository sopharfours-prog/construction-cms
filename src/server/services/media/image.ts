import "server-only";

import sharp from "sharp";

import type { DetectedType } from "@/lib/files/sniff";

const MAX_EDGE = 3200;
/** Reject decompression bombs: ~50 megapixels is far above any real photo we keep. */
const MAX_INPUT_PIXELS = 50_000_000;

export type ProcessedImage = { data: Buffer; width: number; height: number; blurDataUrl: string };

/**
 * Re-encode every image: applies EXIF orientation, strips metadata (camera
 * GPS location), caps the size, and makes a tiny blur placeholder.
 * Animated images keep only their first frame.
 */
export async function processImage(input: Buffer, type: DetectedType): Promise<ProcessedImage> {
  const pipeline = sharp(input, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" })
    .rotate()
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true });

  const encoded =
    type.ext === "png"
      ? pipeline.png({ compressionLevel: 9, palette: false })
      : type.ext === "webp"
        ? pipeline.webp({ quality: 82 })
        : type.ext === "avif"
          ? pipeline.avif({ quality: 60 })
          : pipeline.jpeg({ quality: 85, mozjpeg: true });

  const { data, info } = await encoded.toBuffer({ resolveWithObject: true });
  const blur = await sharp(data).resize(16, 16, { fit: "inside" }).webp({ quality: 40 }).toBuffer();
  return {
    data,
    width: info.width,
    height: info.height,
    blurDataUrl: `data:image/webp;base64,${blur.toString("base64")}`,
  };
}
