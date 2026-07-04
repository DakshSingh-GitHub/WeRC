import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Ephemeral in-memory store for local sliding-window rate-limiting
const rateLimitStore: Record<string, number[]> = {};

const LIMIT = 5; // Max 5 runs
const WINDOW_MS = 60 * 1000; // 60 seconds

export async function POST(request: Request) {
  try {
    const { files, entrypoint, input, roomCode } = await request.json();

    if (!roomCode) {
      return NextResponse.json({ error: "roomCode is required." }, { status: 400 });
    }

    // 1. Initialize Supabase Admin Client
    const wercUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const wercServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

    if (!wercUrl || !wercServiceKey) {
      return NextResponse.json(
        { error: "WeRC Supabase admin configuration is missing on the server." },
        { status: 500 }
      );
    }

    const wercAdminSupabase = createClient(wercUrl, wercServiceKey, {
      auth: { persistSession: false },
    });

    // 2. Fetch Session Details
    const { data: session, error: sessionError } = await wercAdminSupabase
      .from("interview_sessions")
      .select("*")
      .eq("code", roomCode)
      .maybeSingle();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: sessionError?.message || "Session not found." },
        { status: 404 }
      );
    }

    // 3. Status Checks
    if (session.status === "expired") {
      return NextResponse.json(
        { error: "This room has expired due to inactivity." },
        { status: 403 }
      );
    }

    if (session.execution_enabled === false) {
      return NextResponse.json(
        { error: "Code execution has been disabled by the host." },
        { status: 403 }
      );
    }

    // 4. Token-Gated Validation (Verify candidate has joined via interview_history record)
    const { data: historyRecords, error: historyError } = await wercAdminSupabase
      .from("interview_history")
      .select("id")
      .eq("title", `Coding Interview (${roomCode})`)
      .limit(1);

    if (historyError || !historyRecords || historyRecords.length === 0) {
      return NextResponse.json(
        { error: "An applicant must be present in the workspace to execute code." },
        { status: 403 }
      );
    }

    // 5. Sliding-Window Rate Limiting
    const now = Date.now();
    if (!rateLimitStore[roomCode]) {
      rateLimitStore[roomCode] = [];
    }

    // Filter out timestamps outside the 60s window
    rateLimitStore[roomCode] = rateLimitStore[roomCode].filter(
      (timestamp) => now - timestamp < WINDOW_MS
    );

    if (rateLimitStore[roomCode].length >= LIMIT) {
      const oldestTimestamp = rateLimitStore[roomCode][0];
      const retryAfterSeconds = Math.ceil((WINDOW_MS - (now - oldestTimestamp)) / 1000);
      
      return NextResponse.json(
        { error: `Rate limit exceeded. Please wait ${retryAfterSeconds}s before running code again.` },
        { 
          status: 429,
          headers: {
            "Retry-After": retryAfterSeconds.toString(),
          }
        }
      );
    }

    // Record the current execution run timestamp
    rateLimitStore[roomCode].push(now);

    // Update last activity timestamp in DB
    await wercAdminSupabase
      .from("interview_sessions")
      .update({ last_activity_at: new Date().toISOString() })
      .eq("code", roomCode);

    // 6. Forward Request to Vlyxir execution backend
    const vlyxirApiUrl = process.env.NEXT_PUBLIC_JUDGE_API_URL || "https://code-judge-6fm6.vercel.app";
    const response = await fetch(`${vlyxirApiUrl}/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ files, entrypoint, input }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: errorText || response.statusText },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
