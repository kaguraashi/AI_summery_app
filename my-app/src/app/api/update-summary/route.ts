export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/app/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = await req.json();
    const { documentId, summary } = body;
    
    if (!documentId) {
      return NextResponse.json({ ok: false, error: "Missing documentId" }, { status: 400 });
    }

    if (summary === undefined) {
      return NextResponse.json({ ok: false, error: "Missing summary" }, { status: 400 });
    }

    const { error: dbErr } = await supabaseAdmin
      .from("documents")
      .update({ summary })
      .eq("id", documentId);

    if (dbErr) {
      return NextResponse.json({ ok: false, error: dbErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[API error]", e);
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
