/**
 * The base URL of the Vespers backend.
 *
 * In development the backend listens on http://localhost:8787; in production
 * set NEXT_PUBLIC_BACKEND_URL to your deployed backend's URL.
 */
export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8787";

/** Build a fully-qualified backend URL, e.g. apiUrl("/api/chat"). */
export function apiUrl(path: string): string {
  if (!path.startsWith("/")) path = `/${path}`;
  return `${BACKEND_URL}${path}`;
}
