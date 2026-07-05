import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Verifies the caller's session from the werc-session cookie.
 * Returns the authenticated user or null.
 */
export async function getAuthenticatedUser(request: Request) {
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(/werc-session=([^;]+)/);
  const sessionToken = match?.[1];

  if (!sessionToken) return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  if (!supabaseUrl || !supabaseAnonKey) return null;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });

  const { data: { user }, error } = await supabase.auth.getUser(sessionToken);
  if (error || !user) return null;

  return user;
}

/**
 * Validates the Origin header to protect against CSRF attacks.
 * Returns an error response if the origin is invalid, or null if valid.
 */
export function validateOrigin(request: Request): NextResponse | null {
  const origin = request.headers.get("origin");
  // Allow requests without Origin header (same-origin, non-browser clients)
  if (!origin) return null;

  try {
    const requestUrl = new URL(request.url);
    const originUrl = new URL(origin);

    if (originUrl.host !== requestUrl.host) {
      return NextResponse.json(
        { error: "Forbidden: invalid origin." },
        { status: 403 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Forbidden: malformed origin." },
      { status: 403 }
    );
  }

  return null;
}
