"use client";

import { useEffect } from "react";
import { supabase } from "../app/config/supabase";

export default function CookieSync() {
  useEffect(() => {
    // Sync initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        document.cookie = `werc-session=${session.access_token}; path=/; max-age=${session.expires_in}; SameSite=Lax; Secure`;
      } else {
        document.cookie = `werc-session=; path=/; max-age=0; SameSite=Lax; Secure`;
      }
    });

    // Listen to changes in auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        document.cookie = `werc-session=${session.access_token}; path=/; max-age=${session.expires_in}; SameSite=Lax; Secure`;
      } else {
        document.cookie = `werc-session=; path=/; max-age=0; SameSite=Lax; Secure`;
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
