export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/app/lib/supabaseAdmin";
import { Buffer } from "buffer";
import { createRequire } from "module";

const BUCKET = process.env.SUPABASE_BUCKET || "documents";
const require = createRequire(import.meta.url);

function isPdf(path: string) {
  return path.toLowerCase().endsWith(".pdf");
}

export async function GET(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
  try {
    const url = new URL(req.url);
    const path = url.searchParams.get("path");
    if (!path) return NextResponse.json({ ok: false, error: "Missing path" }, { status: 400 });

    const { data, error } = await supabaseAdmin.storage.from(BUCKET).download(path);
    if (error || !data) {
      return NextResponse.json({ ok: false, error: error?.message ?? "Download failed" }, { status: 500 });
    }

    let text = "";

    if (isPdf(path)) {
      const ab = await data.arrayBuffer();
      const buf = Buffer.from(ab);
      if (buf.length === 0) return NextResponse.json({ ok: false, error: "Empty PDF buffer" }, { status: 400 });

      const pdfParse: any = require("pdf-parse/lib/pdf-parse");
      const parsed = await pdfParse(buf);
      text = String(parsed?.text || "").trim();

      if (!text) {
        return NextResponse.json(
          { ok: false, error: "No extractable text found in this PDF (scanned/image-only PDF not supported)." },
          { status: 400 }
        );
      }
    } else {
      text = String(await data.text()).trim();
    }

    if (text.length > 20000) text = text.slice(0, 20000) + "\n\n[TRUNCATED FOR PREVIEW]";
    return NextResponse.json({ ok: true, text });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
  } catch (e: any) {
    console.error("[API error]", e);
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
