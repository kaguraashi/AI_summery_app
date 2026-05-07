export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/app/lib/supabaseAdmin";
export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("documents")
    .select("id, storage_path, original_name, mime_type, size_bytes, created_at, summary")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, documents: data });
  } catch (e: any) {
    console.error("[API error]", e);
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
