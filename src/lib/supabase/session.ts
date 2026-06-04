// ─────────────────────────────────────────────────────────────────────────────
// Session persistence policy
// ─────────────────────────────────────────────────────────────────────────────
// Installed PWA (launched from the homescreen) → persistent 90-day session, so
// users aren't asked to re-authenticate every time they open the app. A regular
// browser tab → a session cookie that's cleared when the browser closes, so a
// shared / public browser doesn't retain a login (re-auth via 6-digit OTP next
// time).
//
// @supabase/ssr overwrites maxAge with its own 400-day default when it builds
// cookie options, so the real lifetime is enforced in our custom setAll writers
// (browser client + middleware), which get the final say on what's written. The
// browser records its decision in PERSIST_COOKIE so the server-side session
// refresher (middleware) can apply the same lifetime.
//
// iOS caveat: Safari/WebKit caps *script-written* cookies (document.cookie) to
// ~7 days. The middleware re-issues the 90-day cookie via Set-Cookie on each
// visit, which is the durable path on iOS as long as the app is opened within
// that window.

import type { CookieOptions } from "@supabase/ssr";

export const PERSIST_COOKIE = "ps-persist";
export const PERSIST_MAX_AGE_SECONDS = 60 * 60 * 24 * 90; // 90 days

// True when running as an installed PWA (standalone display), false in a tab.
export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    // iOS Safari — legacy, non-standard property
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

// Apply the persistence policy to a set of cookie options. Persistent → 90-day
// max-age; ephemeral → strip max-age/expires so the browser treats it as a
// session cookie (cleared when the browser closes).
export function withPersistence(options: CookieOptions, persist: boolean): CookieOptions {
  const next: CookieOptions = { ...options };
  delete next.expires;
  if (persist) {
    next.maxAge = PERSIST_MAX_AGE_SECONDS;
  } else {
    delete next.maxAge;
  }
  return next;
}
