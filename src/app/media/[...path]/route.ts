import { getStorageConfig } from "@/lib/storage/config";
import { getStorage } from "@/lib/storage";
import { isValidStorageKey } from "@/lib/storage/keys";

/**
 * Serves public files when STORAGE_DRIVER=local. With S3/R2/MinIO, files are
 * served by the bucket or CDN at S3_PUBLIC_URL and this route returns 404.
 */
export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const key = `public/${path.join("/")}`;
  if (getStorageConfig().STORAGE_DRIVER !== "local" || !isValidStorageKey(key))
    return new Response("Not found", { status: 404 });

  // Range requests let browsers seek in videos (Safari won't play without them).
  const object = await getStorage().get(key, request.headers.get("range"));
  if (!object) return new Response("Not found", { status: 404 });
  if (object.range === "unsatisfiable") {
    return new Response(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${object.totalSize}`, "Accept-Ranges": "bytes" },
    });
  }

  const download = /\.(docx|xlsx)$/.test(key);
  return new Response(object.body, {
    status: object.range ? 206 : 200,
    headers: {
      "Content-Type": object.contentType,
      "Content-Length": String(object.size),
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      ...(object.range
        ? {
            "Content-Range": `bytes ${object.range.start}-${object.range.end}/${object.totalSize}`,
          }
        : {}),
      ...(download ? { "Content-Disposition": "attachment" } : {}),
    },
  });
}
