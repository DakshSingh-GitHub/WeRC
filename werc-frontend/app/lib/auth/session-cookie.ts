import { Session } from "@supabase/supabase-js";

/**
 * Session cookie management via server-side API route.
 * The cookie is set with HttpOnly flag server-side, preventing
 * client-side JavaScript from reading the session token (XSS protection).
 */

export async function setSessionCookie(session: Session) {
  try {
    await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_token: session.access_token,
        expires_in: session.expires_in,
      }),
    });
  } catch (err) {
    console.error("Failed to set session cookie:", err);
  }
}

export async function clearSessionCookie() {
  try {
    await fetch("/api/auth/session", {
      method: "DELETE",
    });
  } catch (err) {
    console.error("Failed to clear session cookie:", err);
  }
}
