"use client";

import { useEffect } from "react";
import { supabase } from "../app/config/supabase";

export interface SavedAccount {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  access_token: string;
  refresh_token: string;
  provider: string;
}

export default function AccountSync() {
  useEffect(() => {
    const checkAndCreateProfile = async (user: any) => {
      try {
        const { data: existingProfile, error } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          console.warn("Failed to check profile existence:", error);
          return;
        }

        if (!existingProfile) {
          const displayName = user.user_metadata?.display_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
          const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;
          
          const newProfile = {
            id: user.id,
            full_name: displayName,
            username: user.user_metadata?.username?.replace(/\./g, "_") || user.email?.split("@")[0]?.replace(/\./g, "_") || `user_${Math.random().toString(36).substr(2, 5)}`,
            country: user.user_metadata?.country || "United States",
            bio: ""
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
        refresh_token: session.refresh_token,
        provider: provider
      };

      const existingIndex = savedAccounts.findIndex((acc) => acc.id === user.id);
      if (existingIndex > -1) {
        savedAccounts[existingIndex] = updatedAccount;
      } else {
        savedAccounts.push(updatedAccount);
      }

      localStorage.setItem("werc_saved_accounts", JSON.stringify(savedAccounts));
    };

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
