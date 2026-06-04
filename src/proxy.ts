import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { PERSIST_COOKIE, withPersistence } from "@/lib/supabase/session";

export async function proxy(request: NextRequest) {
  // Guard: if Supabase env vars are missing, let the request through rather
  // than crashing. The client-side auth check in each page will handle it.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error("Proxy: missing Supabase env vars — passing request through");
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  // Persist auth cookies for 90 days when the client signalled it's an installed
  // PWA (see lib/supabase/session); otherwise leave them as session cookies.
  const persist = request.cookies.get(PERSIST_COOKIE)?.value === "1";

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, withPersistence(options, persist))
          );
        },
      },
    }
  );

  // Refresh session — must happen before any auth checks
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Allow auth routes through unconditionally
  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth/callback") ||
    pathname.startsWith("/invite");

  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Run on all routes except Next.js internals, static files, and API routes
    // (API routes manage their own auth — cron uses CRON_SECRET, others use Supabase session)
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|api/|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
