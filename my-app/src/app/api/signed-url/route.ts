import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/app/lib/supabaseAdmin";
const BUCKET = process.env.SUPABASE_BUCKET || "documents";

export async function GET(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
  const url = new URL(req.url);
  const path = url.searchParams.get("path");
  if (!path) return NextResponse.json({ ok: false, error: "Missing path" }, { status: 400 });

  const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(path, 60);
  if (error || !data) return NextResponse.json({ ok: false, error: error?.message ?? "Failed" }, { status: 500 });

  return NextResponse.json({ ok: true, url: data.signedUrl });
  } catch (e: any) {
    console.error("[API error]", e);
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
