export type RequestInfo = {
  ipAddress: string | null;
  userAgent: string | null;
};

const IP_PATTERN = /^[0-9a-fA-F.:]{3,45}$/;

/**
 * Client IP and user agent from request headers.
 *
 * X-Forwarded-For is only trustworthy when the app sits behind a proxy that
 * overwrites it (Vercel does; configure Nginx with `proxy_set_header
 * X-Forwarded-For $remote_addr`). The left-most entry is the client.
 */
export function getRequestInfo(headers: Headers): RequestInfo {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const candidate = forwarded || headers.get("x-real-ip")?.trim() || null;
  const ipAddress = candidate && IP_PATTERN.test(candidate) ? candidate : null;
  const userAgent = headers.get("user-agent")?.slice(0, 512) ?? null;
  return { ipAddress, userAgent };
}
