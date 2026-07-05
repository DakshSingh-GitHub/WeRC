"use client";

import { useEffect } from "react";
import { supabase } from "../app/config/supabase";
import { clearSessionCookie, setSessionCookie } from "../app/lib/auth/session-cookie";

export default function CookieSync() {
  useEffect(() => {
    // Sync initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        void setSessionCookie(session);
      } else {
        void clearSessionCookie();
      }
    });

    // Listen to changes in auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        void setSessionCookie(session);
      } else {
        void clearSessionCookie();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
