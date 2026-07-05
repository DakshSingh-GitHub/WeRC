"use client";

import { useEffect } from "react";
import { supabase } from "../app/config/supabase";
import { createClient } from "@supabase/supabase-js";

export interface SavedAccount {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  access_token: string;
  // SECURITY: refresh_token is intentionally NOT stored in localStorage.
  // It is long-lived and would allow full account takeover if exfiltrated via XSS.
  provider: string;
}

export default function AccountSync() {
  useEffect(() => {
    // Clean up the access token hash fragment from the URL bar immediately
    if (typeof window !== "undefined" && (window.location.hash.includes("access_token=") || window.location.hash.includes("id_token="))) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }

    const checkAndCreateProfile = async (user: any) => {
      try {
        const { data: existingProfile, error } = await supabase
          .from("profiles")
          .select("id, bio, country, username, avatar_url")
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          console.warn("Failed to check profile existence:", error);
          return;
        }

        const isNewProfile = !existingProfile;
        const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;
        const needsSync = isNewProfile || !existingProfile.bio || !existingProfile.country || existingProfile.country === "United States" || (!existingProfile.avatar_url && avatarUrl);

        if (needsSync) {
          // Initialize Vlyxir Supabase Client to check if a profile exists under this email
          let vlyxirBio = "";
          let vlyxirCountry = "United States";
          let vlyxirUsername = "";

          const vlyxirUrl = process.env.NEXT_PUBLIC_VLYXIR_SUPABASE_URL;
          const vlyxirAnonKey = process.env.NEXT_PUBLIC_VLYXIR_SUPABASE_ANON_KEY;

          if (vlyxirUrl && vlyxirAnonKey && user.email) {
            try {
              const vlyxirSupabase = createClient(vlyxirUrl, vlyxirAnonKey, { auth: { persistSession: false } });
              const { data: vlyxirProfile } = await vlyxirSupabase
                .from("profiles")
                .select("username, bio, country")
                .eq("email", user.email.toLowerCase())
                .maybeSingle();

              if (vlyxirProfile) {
                vlyxirBio = vlyxirProfile.bio || "";
                vlyxirCountry = vlyxirProfile.country || "United States";
                vlyxirUsername = vlyxirProfile.username || "";
              }
            } catch (vlyxirErr) {
              console.warn("Could not fetch vlyxir profile for sync:", vlyxirErr);
            }
          }

          if (isNewProfile) {
            const displayName = user.user_metadata?.display_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
            
            let resolvedUsername = vlyxirUsername.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "");
            if (!resolvedUsername || resolvedUsername.length < 3) {
              resolvedUsername = user.user_metadata?.username?.replace(/\./g, "_") || user.email?.split("@")[0]?.replace(/\./g, "_") || `user_${Math.random().toString(36).substr(2, 5)}`;
            }

            // Check if username is already taken on WeRC
            try {
              const { data: usernameCheck } = await supabase
                .from("profiles")
                .select("username")
                .eq("username", resolvedUsername)
                .maybeSingle();

              if (usernameCheck) {
                resolvedUsername = `${resolvedUsername}_${Math.random().toString(36).substr(2, 4)}`;
              }
            } catch (err) {
              console.warn("Failed to check username uniqueness:", err);
            }

            const newProfile = {
              id: user.id,
              full_name: displayName,
              username: resolvedUsername,
              country: vlyxirCountry,
              bio: vlyxirBio
            };

            const insertPayload: any = { ...newProfile };
            
            // Try inserting with avatar_url. Fall back if the column doesn't exist.
            const { error: insertError } = await supabase
              .from("profiles")
              .insert({ ...insertPayload, avatar_url: avatarUrl });

            if (insertError) {
              if (insertError.message.includes("column")) {
                const { error: fallbackError } = await supabase
                  .from("profiles")
                  .insert(insertPayload);
                if (fallbackError) {
                  console.error("Failed fallback profile insertion:", fallbackError);
                }
              } else {
                console.error("Failed to insert profile record:", insertError);
              }
            }
          } else {
            // Profile exists, but update bio, country & avatar_url from Vlyxir/Social if they are empty
            const updates: any = {};
            if (!existingProfile.bio && vlyxirBio) {
              updates.bio = vlyxirBio;
            }
            if ((!existingProfile.country || existingProfile.country === "United States") && vlyxirCountry && vlyxirCountry !== "United States") {
              updates.country = vlyxirCountry;
            }
            if (!existingProfile.avatar_url && avatarUrl) {
              updates.avatar_url = avatarUrl;
            }

            if (Object.keys(updates).length > 0) {
              const { error: updateError } = await supabase
                .from("profiles")
                .update(updates)
                .eq("id", user.id);

              if (updateError) {
                console.warn("Failed to update profile sync details:", updateError.message);
              }
            }
          }
        }
      } catch (err) {
        console.error("Error in checkAndCreateProfile:", err);
      }
    };

    const syncSession = (session: any) => {
      if (!session || !session.user) return;

      const user = session.user;
      
      // Auto-create profile record in the database if it doesn't exist
      checkAndCreateProfile(user);

      const savedAccountsStr = localStorage.getItem("werc_saved_accounts");
      let savedAccounts: SavedAccount[] = [];

      if (savedAccountsStr) {
        try {
          savedAccounts = JSON.parse(savedAccountsStr);
        } catch (e) {
          console.error("Failed to parse saved accounts", e);
        }
      }

      const provider = user.app_metadata?.provider || user.app_metadata?.providers?.[0] || "email";
      const displayName = user.user_metadata?.display_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
      const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;

      const updatedAccount: SavedAccount = {
        id: user.id,
        email: user.email || "",
        display_name: displayName,
        avatar_url: avatarUrl,
        access_token: session.access_token,
        // refresh_token intentionally omitted — not safe for localStorage
        provider: provider
      };

      const existingIndex = savedAccounts.findIndex((acc) => acc.email === user.email);
      if (existingIndex > -1) {
        savedAccounts[existingIndex] = updatedAccount;
      } else {
        savedAccounts.push(updatedAccount);
      }

      localStorage.setItem("werc_saved_accounts", JSON.stringify(savedAccounts));
    };

    // Register PWA Service Worker
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("SW registered:", reg.scope))
        .catch((err) => console.error("SW registration failed:", err));
    }

    // Sync initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) syncSession(session);
    });

    // Listen to changes in auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        syncSession(session);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
