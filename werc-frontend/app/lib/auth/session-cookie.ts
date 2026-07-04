import { Session } from "@supabase/supabase-js";

function buildCookieAttributes(maxAge: number) {
  const attrs = [`path=/`, `max-age=${maxAge}`, `SameSite=Lax`];

  if (typeof window !== "undefined" && window.location.protocol === "https:") {
    attrs.push("Secure");
  }

  return attrs.join("; ");
}

export function setSessionCookie(session: Session) {
  document.cookie = `werc-session=${session.access_token}; ${buildCookieAttributes(session.expires_in)}`;
}

export function clearSessionCookie() {
  document.cookie = `werc-session=; ${buildCookieAttributes(0)}`;
}
