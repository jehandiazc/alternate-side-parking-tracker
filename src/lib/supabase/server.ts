import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { PERSIST_COOKIE, withPersistence } from "./session";

// Server-side Supabase client — for Server Components, Route Handlers, Server Actions
export async function createClient() {
  const cookieStore = await cookies();
  const persist = cookieStore.get(PERSIST_COOKIE)?.value === "1";

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, withPersistence(options, persist));
            });
          } catch {
            // setAll called from a Server Component — safe to ignore,
            // middleware handles session refresh
          }
        },
      },
    }
  );
}
