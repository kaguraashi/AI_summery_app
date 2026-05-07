export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/app/lib/supabaseAdmin";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

const BUCKET = process.env.SUPABASE_BUCKET || "documents";

type Annotation = {
  id: string;
  type: "rect" | "pen" | "text";
  pageNumber: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  points?: number[];
  text?: string;
  color: string;
  strokeWidth?: number;
};

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : { r: 1, g: 0, b: 0 };
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
  try {
    const { id } = await params;
    const { annotations } = await req.json();
    const documentId = parseInt(id, 10);

    if (!annotations || !Array.isArray(annotations)) {
      return NextResponse.json({ ok: false, error: "Missing annotations" }, { status: 400 });
    }

    const { data: doc, error: fetchErr } = await supabaseAdmin
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (fetchErr || !doc) {
      return NextResponse.json(
        { ok: false, error: "Document not found" },
        { status: 404 }
      );
    }

    const { data: pdfBlob, error: dlErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .download(doc.storage_path);

    if (dlErr || !pdfBlob) {
      return NextResponse.json(
        { ok: false, error: "Failed to download PDF" },
        { status: 500 }
      );
    }

    const pdfBytes = await pdfBlob.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const annotationsByPage: Record<number, Annotation[]> = {};
    annotations.forEach((ann: Annotation) => {
      if (!annotationsByPage[ann.pageNumber]) {
        annotationsByPage[ann.pageNumber] = [];
      }
      annotationsByPage[ann.pageNumber].push(ann);
    });

    Object.entries(annotationsByPage).forEach(([pageNumStr, pageAnnotations]) => {
      const pageNum = parseInt(pageNumStr, 10);
      if (pageNum < 1 || pageNum > pages.length) return;

      const page = pages[pageNum - 1];
      const { height } = page.getSize();

      pageAnnotations.forEach((ann) => {
        const color = hexToRgb(ann.color);

        if (ann.type === "rect" && ann.width && ann.height) {
          page.drawRectangle({
            x: ann.x,
            y: height - ann.y - ann.height,
            width: ann.width,
            height: ann.height,
            borderColor: rgb(color.r, color.g, color.b),
            borderWidth: ann.strokeWidth || 2,
          });
        } else if (ann.type === "text" && ann.text) {
          page.drawText(ann.text, {
            x: ann.x,
            y: height - ann.y - 14,
            size: 14,
            font: font,
            color: rgb(color.r, color.g, color.b),
          });
        }
      });
    });

    const modifiedPdfBytes = await pdfDoc.save();
    const timestamp = Date.now();
    const reviewedPath = doc.storage_path.replace(/(\.\w+)$/, `-reviewed-${timestamp}$1`);

    const { error: uploadErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(reviewedPath, modifiedPdfBytes, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadErr) {
      return NextResponse.json(
        { ok: false, error: `Upload failed: ${uploadErr.message}` },
        { status: 500 }
      );
    }

    const { data: urlData } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(reviewedPath, 3600);

    if (!urlData?.signedUrl) {
      return NextResponse.json(
        { ok: false, error: "Failed to generate signed URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, url: urlData.signedUrl, path: reviewedPath });
  } catch (e: any) {
    console.error("Export reviewed PDF error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
  } catch (e: any) {
    console.error("[API error]", e);
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
