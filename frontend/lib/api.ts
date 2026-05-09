/**
 * Browser-side helper. We always go through Next.js API proxy routes
 * (/app/api/*), which forward to the real backend server-side. This keeps the
 * backend port private — the browser never talks to it directly.
 */
export function apiUrl(path: string): string {
  if (!path.startsWith("/")) path = `/${path}`;
  return path;
}
