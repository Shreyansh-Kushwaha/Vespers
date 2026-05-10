/**
 * Mobile API client. Unlike the web frontend (which proxies through Next.js
 * route handlers), the mobile app talks directly to the backend over HTTP.
 *
 * The base URL is configured at build time via EXPO_PUBLIC_API_BASE. For
 * local dev, set it to http://<your-lan-ip>:8787 (not localhost — a phone on
 * Expo Go can't reach your laptop's loopback).
 */
const BASE = (process.env.EXPO_PUBLIC_API_BASE || "").replace(/\/$/, "");

export function apiUrl(path: string): string {
  if (!path.startsWith("/")) path = `/${path}`;
  if (!BASE) {
    throw new Error(
      "EXPO_PUBLIC_API_BASE is not set. Add it to .env or your EAS build profile.",
    );
  }
  return `${BASE}${path}`;
}

export function apiBase(): string {
  return BASE;
}
