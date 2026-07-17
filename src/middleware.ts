import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refresh Supabase auth cookies on each request so SIWE sessions stay valid.
 * Must never throw — uncaught errors surface as MIDDLEWARE_INVOCATION_FAILED on Vercel.
 */
export async function middleware(request: NextRequest) {
  try {
    let response = NextResponse.next({ request });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
    if (!url || !anon) {
      return response;
    }

    // Invalid project URL would crash createServerClient / fetch on Edge
    if (!url.startsWith("https://") && !url.startsWith("http://")) {
      return response;
    }

    const supabase = createServerClient(url, anon, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    // Prefer getUser over getSession so tokens refresh when needed.
    // Swallow auth/network failures so the app still loads.
    await supabase.auth.getUser().catch(() => null);

    return response;
  } catch {
    return NextResponse.next({ request });
  }
}

export const config = {
  matcher: [
    /*
     * Run on app pages + APIs that use auth cookies.
     * Skip Next internals, static assets, icons, PWA, and brand files.
     */
    "/((?!_next/static|_next/image|_next/data|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest|js|map|txt|xml)$|sw\\.js|manifest\\.webmanifest|brand/).*)",
  ],
};
