export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/app/lib/supabaseAdmin";
const BUCKET = process.env.SUPABASE_BUCKET || "documents";

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "Missing file" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      return NextResponse.json({ ok: false, error: "Empty file is not allowed" }, { status: 400 });
    }

    const storage_path = `${Date.now()}-${file.name}`;

    const { error: upErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(storage_path, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (upErr) {
      return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });
    }

    const { error: dbErr } = await supabaseAdmin.from("documents").insert({
      storage_path,
      original_name: file.name,
      mime_type: file.type || null,
      size_bytes: buffer.length,
    });

    if (dbErr) {
      return NextResponse.json({ ok: false, error: dbErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, storage_path });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
  } catch (e: any) {
    console.error("[API error]", e);
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
