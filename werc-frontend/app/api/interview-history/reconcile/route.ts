import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!accessToken) {
      return NextResponse.json({ error: "Missing access token." }, { status: 401 });
    }

    const wercUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const wercAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    const wercServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

    if (!wercUrl || !wercAnonKey || !wercServiceKey) {
      return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
    }

    const authSupabase = createClient(wercUrl, wercAnonKey, {
      auth: { persistSession: false },
    });

    const {
      data: { user },
      error: userError,
    } = await authSupabase.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json({ error: "Invalid access token." }, { status: 401 });
    }

    const adminSupabase = createClient(wercUrl, wercServiceKey, {
      auth: { persistSession: false },
    });

    const { data: pendingRows, error: pendingError } = await adminSupabase
      .from("interview_history")
      .select("id, title, status")
      .eq("user_id", user.id)
      .eq("status", "Pending");

    if (pendingError) {
      return NextResponse.json({ error: pendingError.message }, { status: 500 });
    }

    let updatedCount = 0;

    for (const row of pendingRows || []) {
      const { data: takenRow } = await adminSupabase
        .from("interviews_taken")
        .select("status")
        .eq("title", row.title)
        .neq("status", "Pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!takenRow?.status) {
        continue;
      }

      const { error: updateError } = await adminSupabase
        .from("interview_history")
        .update({ status: takenRow.status })
        .eq("id", row.id);

      if (!updateError) {
        updatedCount += 1;
      }
    }

    return NextResponse.json({ success: true, updatedCount });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
