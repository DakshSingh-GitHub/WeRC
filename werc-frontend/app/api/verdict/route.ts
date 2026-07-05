import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthenticatedUser, validateOrigin } from "../../lib/auth/api-auth";

export async function POST(request: Request) {
  try {
    // CSRF Protection: Validate request origin
    const originError = validateOrigin(request);
    if (originError) return originError;

    // Authentication: Verify the caller is logged in
    const authenticatedUser = await getAuthenticatedUser(request);
    if (!authenticatedUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { roomCode, verdict } = await request.json();

    if (!roomCode || !verdict) {
      return NextResponse.json({ error: "roomCode and verdict are required." }, { status: 400 });
    }

    const validVerdicts = ["Accepted", "Rejected", "Pending"];
    if (!validVerdicts.includes(verdict)) {
      return NextResponse.json({ error: "Invalid verdict value." }, { status: 400 });
    }

    const wercUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const wercServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

    if (!wercUrl || !wercServiceKey) {
      return NextResponse.json(
        { error: "Server configuration error." },
        { status: 500 }
      );
    }

    const adminSupabase = createClient(wercUrl, wercServiceKey, {
      auth: { persistSession: false },
    });

    // Authorization: Verify the authenticated user is the host of this session
    const { data: session } = await adminSupabase
      .from("interview_sessions")
      .select("host_id")
      .eq("code", roomCode)
      .maybeSingle();

    if (!session || session.host_id !== authenticatedUser.id) {
      return NextResponse.json({ error: "Forbidden: only the host can set verdicts." }, { status: 403 });
    }

    // First, delete duplicate records keeping only the OLDEST one per candidate+room
    const { data: allRecords } = await adminSupabase
      .from("interview_history")
      .select("id, user_id, created_at")
      .eq("title", `Coding Interview (${roomCode})`)
      .order("created_at", { ascending: true });

    if (allRecords && allRecords.length > 0) {
      // Group by user_id, keep first (oldest), delete the rest
      const seenUsers = new Set<string>();
      const idsToDelete: string[] = [];

      for (const record of allRecords) {
        if (seenUsers.has(record.user_id)) {
          idsToDelete.push(record.id);
        } else {
          seenUsers.add(record.user_id);
        }
      }

      if (idsToDelete.length > 0) {
        await adminSupabase
          .from("interview_history")
          .delete()
          .in("id", idsToDelete);
      }

      // Now update ALL remaining records for this room with the verdict
      const { error: updateError } = await adminSupabase
        .from("interview_history")
        .update({ status: verdict })
        .eq("title", `Coding Interview (${roomCode})`);

      if (updateError) {
        console.warn("Failed to update interview_history verdict:", updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Verdict route error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
