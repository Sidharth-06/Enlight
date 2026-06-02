import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = await request.json();

  // Get authenticated user
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Use service client to bypass RLS for server insert
  const serviceClient = getSupabaseServiceClient();
  if (!serviceClient) {
    return NextResponse.json({ saved: false, reason: "Supabase not configured" });
  }

  const { error } = await serviceClient.from("interview_sessions").insert({
    user_id: user?.id ?? "00000000-0000-0000-0000-000000000000",
    target_role: body.profile?.role ?? "Unknown",
    difficulty: body.profile?.difficulty ?? "Intermediate",
    persona: body.profile?.persona ?? "friendly",
    average_score: body.averageScore ?? 0,
    total_questions: body.records?.length ?? 0,
    total_hints: body.totalHints ?? 0,
    question_types: body.profile?.preferredTypes ?? [],
    payload: body,
  });

  if (error) {
    return NextResponse.json({ saved: false, reason: error.message }, { status: 500 });
  }

  return NextResponse.json({ saved: true });
}

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ sessions: [] });

  const serviceClient = getSupabaseServiceClient();
  if (!serviceClient) return NextResponse.json({ sessions: [] });

  const { data, error } = await serviceClient
    .from("interview_sessions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  return NextResponse.json({ sessions: data ?? [] });
}
