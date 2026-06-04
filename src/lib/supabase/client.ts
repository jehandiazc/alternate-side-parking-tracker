import {
  createBrowserClient,
  parseCookieHeader,
  serializeCookieHeader,
} from "@supabase/ssr";
import {
  PERSIST_COOKIE,
  isStandaloneDisplay,
  withPersistence,
} from "./session";

// Browser-side Supabase client — safe to use in Client Components.
//
// Session lifetime depends on launch context (see ./session): installed PWA →
// persistent 90-day cookies; browser tab → session cookies. We supply custom
// cookie methods because @supabase/ssr otherwise forces its own maxAge default;
// our setAll is the final writer and gets the last word on the lifetime.
export function createClient() {
  const persist = isStandaloneDisplay();

  // Record the decision so the middleware writes auth cookies with the same
  // lifetime when it refreshes the session server-side.
  if (typeof document !== "undefined") {
    document.cookie = serializeCookieHeader(
      PERSIST_COOKIE,
      persist ? "1" : "0",
      withPersistence({ path: "/", sameSite: "lax" }, persist)
    );
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          // parseCookieHeader can yield undefined values; the client expects strings.
          return parseCookieHeader(document.cookie).map(({ name, value }) => ({
            name,
            value: value ?? "",
          }));
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            document.cookie = serializeCookieHeader(
              name,
              value,
              withPersistence(options, persist)
            );
          });
        },
      },
    }
  );
}
