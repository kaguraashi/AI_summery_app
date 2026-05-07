export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/app/lib/supabaseAdmin";
const BUCKET = process.env.SUPABASE_BUCKET || "documents";

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
  const { path } = await req.json();
  if (!path) return NextResponse.json({ ok: false, error: "Missing path" }, { status: 400 });

  const { error: stErr } = await supabaseAdmin.storage.from(BUCKET).remove([path]);
  if (stErr) return NextResponse.json({ ok: false, error: stErr.message }, { status: 500 });

  const { error: dbErr } = await supabaseAdmin.from("documents").delete().eq("storage_path", path);
  if (dbErr) return NextResponse.json({ ok: false, error: dbErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[API error]", e);
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
