import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const { emailOrUsername, password } = await request.json();

    if (!emailOrUsername || !password) {
      return NextResponse.json(
        { error: "Username/Email and Password are required." },
        { status: 400 }
      );
    }

    // 1. Initialize Vlyxir Supabase Client
    const vlyxirUrl = process.env.NEXT_PUBLIC_VLYXIR_SUPABASE_URL;
    const vlyxirAnonKey = process.env.NEXT_PUBLIC_VLYXIR_SUPABASE_ANON_KEY;

    if (!vlyxirUrl || !vlyxirAnonKey) {
      return NextResponse.json(
        { error: "Vlyxir Supabase configuration is missing on the server. Please define NEXT_PUBLIC_VLYXIR_SUPABASE_URL and NEXT_PUBLIC_VLYXIR_SUPABASE_ANON_KEY." },
        { status: 500 }
      );
    }

    const vlyxirSupabase = createClient(vlyxirUrl, vlyxirAnonKey, {
      auth: { persistSession: false },
    });

    // Resolve username to email on Vlyxir if username is provided
    let email = emailOrUsername.trim();
    if (!email.includes("@")) {
      // Query Vlyxir profiles to find email for the username
      const { data: profile, error: profileError } = await vlyxirSupabase
        .from("profiles")
        .select("email")
        .eq("username", email.toLowerCase())
        .maybeSingle();

      if (profileError) {
        return NextResponse.json(
          { error: "Failed to resolve Vlyxir username: " + profileError.message },
          { status: 500 }
        );
      }

      if (!profile || !profile.email) {
        return NextResponse.json(
          { error: "Vlyxir username not found." },
          { status: 400 }
        );
      }
      email = profile.email;
    }

    // Authenticate user against Vlyxir Supabase Auth
    const { data: authData, error: authError } = await vlyxirSupabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || "Invalid Vlyxir credentials." },
        { status: 401 }
      );
    }

    const vlyxirUser = authData.user;

    // Fetch user details from Vlyxir profiles if they have extra data like avatar, display name etc.
    const { data: vlyxirProfile } = await vlyxirSupabase
      .from("profiles")
      .select("*")
      .eq("id", vlyxirUser.id)
      .maybeSingle();

    // 2. Initialize WeRC Supabase Admin Client
    const wercUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const wercServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!wercUrl || !wercServiceKey) {
      return NextResponse.json(
        { error: "WeRC Supabase admin configuration is missing on the server. Please define SUPABASE_SERVICE_ROLE_KEY." },
        { status: 500 }
      );
    }

    const wercAdminSupabase = createClient(wercUrl, wercServiceKey, {
      auth: { persistSession: false },
    });

    // Check if the user already exists in WeRC
    const { data: existingUserList, error: checkError } = await wercAdminSupabase.auth.admin.listUsers();
    if (checkError) {
      return NextResponse.json(
        { error: "Failed to query WeRC users: " + checkError.message },
        { status: 500 }
      );
    }

    let targetUser = existingUserList.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (!targetUser) {
      // Create user in WeRC Auth with a random secure password
      const randomPassword = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
      const fullName = vlyxirProfile?.full_name || vlyxirUser.user_metadata?.full_name || email.split("@")[0];
      const username = vlyxirProfile?.username || email.split("@")[0].replace(/[^a-z0-9-_]/g, "");

      const { data: newUser, error: createError } = await wercAdminSupabase.auth.admin.createUser({
        email,
        password: randomPassword,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          username: username,
          avatar_url: vlyxirProfile?.avatar_url || vlyxirUser.user_metadata?.avatar_url || null,
          display_name: fullName,
          provider: "vlyxir",
          country: vlyxirProfile?.country || null,
          bio: vlyxirProfile?.bio || null,
        },
      });

      if (createError || !newUser.user) {
        return NextResponse.json(
          { error: "Failed to create user in WeRC: " + (createError?.message || "Unknown error") },
          { status: 500 }
        );
      }

      targetUser = newUser.user;

      // Upsert profile row into the profiles table in WeRC
      const { error: profileInsertError } = await wercAdminSupabase
        .from("profiles")
        .upsert({
          id: targetUser.id,
          full_name: fullName,
          username: username,
          email: email,
          avatar_url: vlyxirProfile?.avatar_url || null,
          bio: vlyxirProfile?.bio || null,
          country: vlyxirProfile?.country || null,
          updated_at: new Date().toISOString(),
        });
      
      if (profileInsertError) {
        console.warn("Could not upsert profile entry:", profileInsertError.message);
      }
    } else {
      // Sync bio/country on subsequent logins as well if profile exists
      const fullName = vlyxirProfile?.full_name || targetUser.user_metadata?.full_name || email.split("@")[0];
      const username = vlyxirProfile?.username || targetUser.user_metadata?.username || email.split("@")[0].replace(/[^a-z0-9-_]/g, "");
      
      const { error: profileSyncError } = await wercAdminSupabase
        .from("profiles")
        .upsert({
          id: targetUser.id,
          full_name: fullName,
          username: username,
          email: email,
          avatar_url: vlyxirProfile?.avatar_url || targetUser.user_metadata?.avatar_url || null,
          bio: vlyxirProfile?.bio || null,
          country: vlyxirProfile?.country || null,
          updated_at: new Date().toISOString(),
        });

      if (profileSyncError) {
        console.warn("Could not sync profile entry:", profileSyncError.message);
      }
    }

    // 3. Generate Magic Link (Sign in Link) for the WeRC user
    const { data: linkData, error: linkError } = await wercAdminSupabase.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo: `${new URL(request.url).origin}/`,
      },
    });

    if (linkError || !linkData.properties?.action_link) {
      return NextResponse.json(
        { error: "Failed to generate session link: " + (linkError?.message || "Unknown error") },
        { status: 500 }
      );
    }

    return NextResponse.json({ redirectUrl: linkData.properties.action_link });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
