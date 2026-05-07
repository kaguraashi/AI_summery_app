export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/app/lib/supabaseAdmin";
import OpenAI from "openai";

const BUCKET = process.env.SUPABASE_BUCKET || "documents";

const ENDPOINT = process.env.LLM_BASE_URL || "https://models.github.ai/inference";
const MODEL = process.env.LLM_MODEL || "openai/gpt-4.1-mini";
const TOKEN = process.env.GITHUB_TOKEN || "";

function bytesToTextSafety(s: string) {
  const nonPrintable = (s.match(/[\x00-\x08\x0E-\x1F]/g) || []).length;
  return nonPrintable < 20;
}

function isPdfPath(path: string) {
  return path.toLowerCase().endsWith(".pdf");
}

async function extractPdfText(blob: Blob): Promise<string> {
  const mod: any = await import("pdf-parse/lib/pdf-parse");
  const pdfParse: any = mod?.default ?? mod;
  const ab = await blob.arrayBuffer();
  const buf = Buffer.from(ab);
  const parsed = await pdfParse(buf);
  return String(parsed?.text || "").trim();
}

function buildSummaryPrompt(
  language: string,
  length: string,
  style: string,
  customInstructions: string
): string {
  let prompt = "You are a professional document summarizer. ";

  // Style instructions
  if (style === "bullet") {
    prompt += "Provide a summary using clear bullet points. ";
  } else if (style === "structured") {
    prompt += "Provide a well-structured summary with sections and headings. ";
  } else if (style === "academic") {
    prompt += "Provide an academic-style summary with formal language and precise terminology. ";
  } else if (style === "executive") {
    prompt += "Provide an executive summary focusing on key insights and actionable items. ";
  }

  // Length instructions
  if (length === "short") {
    prompt += "Keep it brief (2-3 key points). ";
  } else if (length === "long") {
    prompt += "Provide a comprehensive summary with detailed analysis. ";
  } else {
    prompt += "Provide a balanced summary (4-6 key points). ";
  }

  // Language instructions
  if (language !== "auto") {
    const langMap: Record<string, string> = {
      english: "English",
      "zh-tw": "Traditional Chinese (繁體中文)",
      "zh-cn": "Simplified Chinese (简体中文)",
      japanese: "Japanese (日本語)",
      korean: "Korean (한국어)",
    };
    const langName = langMap[language] || "English";
    prompt += `Write the summary in ${langName}. `;
  }

  // Custom instructions
  if (customInstructions?.trim()) {
    prompt += `\n\nAdditional requirements: ${customInstructions.trim()}`;
  }

  prompt += "\n\nDo not invent facts. Be accurate and faithful to the source material. Return the summary in Markdown format.";

  return prompt;
}

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
  try {
    const body = await req.json();
    const { path, language = "auto", length = "medium", style = "bullet", customInstructions = "" } = body;
    
    if (!path) {
      return NextResponse.json({ ok: false, error: "Missing path" }, { status: 400 });
    }

    if (!TOKEN) {
      return NextResponse.json(
        { ok: false, error: "Missing GITHUB_TOKEN (GitHub Models token) in env" },
        { status: 500 }
      );
    }

    const { data, error: dlErr } = await supabaseAdmin.storage.from(BUCKET).download(path);
    if (dlErr || !data) {
      return NextResponse.json({ ok: false, error: dlErr?.message ?? "Download failed" }, { status: 500 });
    }

    let text = "";

    if (isPdfPath(path)) {
      text = await extractPdfText(data);
      if (!text) {
        return NextResponse.json(
          { ok: false, error: "No extractable text found in this PDF (scanned/image-only PDFs are not supported)." },
          { status: 400 }
        );
      }
    } else {
      text = (await data.text()).trim();
      if (!text) return NextResponse.json({ ok: false, error: "Empty text cannot be summarized" }, { status: 400 });

      if (!bytesToTextSafety(text)) {
        return NextResponse.json({ ok: false, error: "This file does not look like plain text." }, { status: 400 });
      }
    }

    if (text.length > 12000) {
      text = text.slice(0, 12000) + "\n\n[TRUNCATED FOR SUMMARY]";
    }

    const client = new OpenAI({ apiKey: TOKEN, baseURL: ENDPOINT });

    const systemPrompt = buildSummaryPrompt(language, length, style, customInstructions);

    const resp = await client.chat.completions.create({
      model: MODEL,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `Please summarize the following document:\n\n${text}`,
        },
      ],
    });

    const summary = (resp.choices?.[0]?.message?.content || "").trim();
    if (!summary) {
      return NextResponse.json({ ok: false, error: "No summary returned by model" }, { status: 500 });
    }

    const { error: dbErr } = await supabaseAdmin
      .from("documents")
      .update({ summary })
      .eq("storage_path", path);

    if (dbErr) return NextResponse.json({ ok: false, error: dbErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, summary });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
  } catch (e: any) {
    console.error("[API error]", e);
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
