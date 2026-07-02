import { NextApiResponse } from "next";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get("werc-session")?.value;

  if (!sessionToken) {
    const loginUrl = new URL("/accounts", request.url);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false }
    });

    const { data: { user }, error } = await supabase.auth.getUser(sessionToken);

    if (error || !user) {
      const loginUrl = new URL("/accounts", request.url);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete("werc-session");
      return response;
    }
  } catch (err) {
    console.error("Middleware auth verification failed:", err);
    const loginUrl = new URL("/accounts", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/we-rc",
    "/we-rc/:path*",
    "/dashboard",
    "/dashboard/:path*"
  ],
};
