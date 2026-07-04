import { createClient, Session, SupabaseClient } from "@supabase/supabase-js";

export interface SavedAccountSession {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  access_token: string;
  refresh_token: string;
  provider: string;
}

export interface SwitchAccountResult {
  ok: boolean;
  reason?: "stale_session" | "switch_failed";
  session?: Session;
}

function createEphemeralClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function switchSavedAccount(
  supabase: SupabaseClient,
  account: SavedAccountSession
): Promise<SwitchAccountResult> {
  const {
    data: { session: previousSession },
  } = await supabase.auth.getSession();

  const ephemeralClient = createEphemeralClient();
  const { data: validatedData, error: validationError } = await ephemeralClient.auth.setSession({
    access_token: account.access_token,
    refresh_token: account.refresh_token,
  });

  if (validationError || !validatedData.session) {
    return { ok: false, reason: "stale_session" };
  }

  const { data: switchedData, error: switchError } = await supabase.auth.setSession({
    access_token: validatedData.session.access_token,
    refresh_token: validatedData.session.refresh_token,
  });

  if (switchError || !switchedData.session) {
    if (previousSession) {
      await supabase.auth.setSession({
        access_token: previousSession.access_token,
        refresh_token: previousSession.refresh_token,
      });
    }

    return { ok: false, reason: "switch_failed" };
  }

  return { ok: true, session: switchedData.session };
}
