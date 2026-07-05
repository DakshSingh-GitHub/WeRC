import { NextResponse } from "next/server";

/**
 * Server-side session cookie management.
 * Sets the werc-session cookie with HttpOnly flag so it cannot be
 * accessed by client-side JavaScript (XSS protection).
 */

export async function POST(request: Request) {
  try {
    const { access_token, expires_in } = await request.json();

    if (!access_token) {
      return NextResponse.json(
        { error: "Missing access token." },
        { status: 400 }
      );
    }

    const maxAge = expires_in || 3600;
    const isProduction = process.env.NODE_ENV === "production";

    const response = NextResponse.json({ ok: true });
    response.cookies.set("werc-session", access_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: maxAge,
    });

    return response;
  } catch (err: any) {
    console.error("Session cookie POST error:", err);
    return NextResponse.json(
      { error: "Failed to set session." },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const response = NextResponse.json({ ok: true });
    response.cookies.set("werc-session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (err: any) {
    console.error("Session cookie DELETE error:", err);
    return NextResponse.json(
      { error: "Failed to clear session." },
      { status: 500 }
    );
  }
}
