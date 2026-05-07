"use client";

import { useState, useEffect } from "react";
import { ReviewTab } from "./ReviewTab";
import { MarkdownTab } from "./MarkdownTab";
import dynamic from "next/dynamic";
import { 
  ExternalLink, Link2, Sparkles, Trash2, FileText, 
  Eye, BookOpen, PenTool, StickyNote, Save 
} from "lucide-react";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

type Doc = {
  id: number;
  storage_path: string;
  original_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
  summary: string | null;
};

type Tab = "pdf" | "text" | "summary" | "review" | "markdown";

type Props = {
  document: Doc;
  onDelete: (path: string) => void;
  onSummarize: (path: string) => void;
  onRefresh?: () => void;
};

export function DocumentPanel({ document, onDelete, onSummarize, onRefresh }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("text");
  const [previewText, setPreviewText] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  
  const [editedSummary, setEditedSummary] = useState<string>("");
  const [isSavingSummary, setIsSavingSummary] = useState(false);
  const [summaryChanged, setSummaryChanged] = useState(false);

  useEffect(() => {
    setEditedSummary(document.summary || "");
    setSummaryChanged(false);
  }, [document.id, document.summary]);

  useEffect(() => {
    if (activeTab === "text") {
      loadPreview();
    } else if (activeTab === "pdf") {
      loadPdfUrl();
    }
  }, [activeTab, document.id]);

  async function loadPreview() {
    setLoadingPreview(true);
    setPreviewText("");

    try {
      const res = await fetch(`/api/preview?path=${encodeURIComponent(document.storage_path)}`, { 
        cache: "no-store" 
      });

      const raw = await res.text();
      let data: any;
      try {
        data = JSON.parse(raw);
      } catch {
        setPreviewText(`Preview failed: ${raw.slice(0, 200) || `HTTP ${res.status}`}`);
        return;
      }

      if (!data.ok) {
        setPreviewText(`Preview failed: ${data.error}`);
        return;
      }

      setPreviewText(data.text ?? "");
    } catch (e: any) {
      setPreviewText(`Preview error: ${e?.message ?? "Unknown error"}`);
    } finally {
      setLoadingPreview(false);
    }
  }

  async function loadPdfUrl() {
    setLoadingPdf(true);

    try {
      const res = await fetch(`/api/signed-url?path=${encodeURIComponent(document.storage_path)}`, { 
        cache: "no-store" 
      });
      const data = await res.json();
      if (data.ok) {
        setPdfUrl(data.url);
      }
    } catch (e) {
      console.error("Failed to load PDF URL:", e);
    } finally {
      setLoadingPdf(false);
    }
  }

  async function handleOpenFile() {
    try {
      const res = await fetch(`/api/signed-url?path=${encodeURIComponent(document.storage_path)}`, { 
        cache: "no-store" 
      });
      const data = await res.json();
      if (data.ok) {
        window.open(data.url, "_blank", "noopener,noreferrer");
      }
    } catch (e) {
      console.error("Failed to open file:", e);
    }
  }

  async function handleCopyLink() {
    try {
      const res = await fetch(`/api/signed-url?path=${encodeURIComponent(document.storage_path)}`, { 
        cache: "no-store" 
      });
      const data = await res.json();
      if (data.ok) {
        try {
          await navigator.clipboard.writeText(data.url);
          alert("Share link copied!");
        } catch {
          window.open(data.url, "_blank", "noopener,noreferrer");
        }
      }
    } catch (e) {
      console.error("Failed to copy link:", e);
    }
  }

  async function handleSaveSummary() {
    setIsSavingSummary(true);
    try {
      const res = await fetch("/api/update-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: document.id, summary: editedSummary }),
      });
      const data = await res.json();
      if (data.ok) {
        setSummaryChanged(false);
        // Trigger parent refresh if available, otherwise reload
        if (onRefresh) {
          onRefresh();
        } else {
          window.location.reload();
        }
      } else {
        alert(`Save failed: ${data.error}`);
      }
    } catch (e: any) {
      alert(`Save error: ${e?.message ?? "Unknown error"}`);
    } finally {
      setIsSavingSummary(false);
    }
  }

  const isPdf = document.original_name.toLowerCase().endsWith(".pdf");

  return (
    <div className="space-y-4 tab-content">
      <div className="glass rounded-2xl border border-slate-700/50 shadow-lg overflow-hidden">
        
        {/* Document Header */}
        <div className="p-6 border-b border-slate-700/50 bg-gradient-to-r from-indigo-900/20 to-purple-900/20">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30">
                <FileText className="w-6 h-6 text-indigo-300" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-xl text-slate-100 break-words">{document.original_name}</h2>
                <p className="text-sm text-slate-400 mt-1">
                  {new Date(document.created_at).toLocaleString()} · {((document.size_bytes ?? 0) / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleOpenFile}
                className="btn-lift px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-semibold border border-slate-600 shadow-md flex items-center gap-2 text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                Open
              </button>
              <button
                onClick={handleCopyLink}
                className="btn-lift px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-semibold border border-slate-600 shadow-md flex items-center gap-2 text-sm"
              >
                <Link2 className="w-4 h-4" />
                Share
              </button>
              <button
                onClick={() => onSummarize(document.storage_path)}
                className="btn-lift px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold shadow-md hover:shadow-neon-green flex items-center gap-2 text-sm"
              >
                <Sparkles className="w-4 h-4" />
                {document.summary ? "Regenerate" : "Generate"}
              </button>
              <button
                onClick={() => onDelete(document.storage_path)}
                className="btn-lift px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-500 text-white font-bold shadow-md hover:shadow-lg flex items-center gap-2 text-sm"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-slate-700/50 bg-slate-800/30">
          <div className="flex gap-1 p-3 overflow-x-auto">
            {isPdf && (
              <button
                onClick={() => setActiveTab("pdf")}
                className={`
                  px-5 py-2.5 rounded-xl font-semibold text-sm whitespace-nowrap
                  flex items-center gap-2 transition-all
                  ${activeTab === "pdf" 
                    ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30" 
                    : "bg-slate-700/30 text-slate-400 hover:bg-slate-700/50 hover:text-slate-300"
                  }
                `}
              >
                <Eye className="w-4 h-4" />
                PDF Viewer
              </button>
            )}
            <button
              onClick={() => setActiveTab("text")}
              className={`
                px-5 py-2.5 rounded-xl font-semibold text-sm whitespace-nowrap
                flex items-center gap-2 transition-all
                ${activeTab === "text" 
                  ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30" 
                  : "bg-slate-700/30 text-slate-400 hover:bg-slate-700/50 hover:text-slate-300"
                }
              `}
            >
              <FileText className="w-4 h-4" />
              Extracted Text
            </button>
            <button
              onClick={() => setActiveTab("summary")}
              className={`
                px-5 py-2.5 rounded-xl font-semibold text-sm whitespace-nowrap
                flex items-center gap-2 transition-all
                ${activeTab === "summary" 
                  ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30" 
                  : "bg-slate-700/30 text-slate-400 hover:bg-slate-700/50 hover:text-slate-300"
                }
              `}
            >
              <Sparkles className="w-4 h-4" />
              Summary
            </button>
            {isPdf && (
              <button
                onClick={() => setActiveTab("review")}
                className={`
                  px-5 py-2.5 rounded-xl font-semibold text-sm whitespace-nowrap
                  flex items-center gap-2 transition-all
                  ${activeTab === "review" 
                    ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30" 
                    : "bg-slate-700/30 text-slate-400 hover:bg-slate-700/50 hover:text-slate-300"
                  }
                `}
              >
                <PenTool className="w-4 h-4" />
                Review
              </button>
            )}
            <button
              onClick={() => setActiveTab("markdown")}
              className={`
                px-5 py-2.5 rounded-xl font-semibold text-sm whitespace-nowrap
                flex items-center gap-2 transition-all
                ${activeTab === "markdown" 
                  ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30" 
                  : "bg-slate-700/30 text-slate-400 hover:bg-slate-700/50 hover:text-slate-300"
                }
              `}
            >
              <StickyNote className="w-4 h-4" />
              Notes
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6 bg-slate-900/20">
          {activeTab === "pdf" && (
            <div className="min-h-[500px] rounded-xl overflow-hidden border border-slate-700/50 bg-slate-800/30 tab-content">
              {loadingPdf ? (
                <div className="flex items-center justify-center h-[500px]">
                  <div className="text-center">
                    <div className="inline-block p-4 rounded-2xl bg-indigo-500/10 mb-3">
                      <Eye className="w-8 h-8 text-indigo-400 animate-pulse" />
                    </div>
                    <p className="text-slate-400 font-medium">Loading PDF viewer...</p>
                  </div>
                </div>
              ) : pdfUrl ? (
                <iframe
                  src={pdfUrl}
                  className="w-full h-[700px]"
                  title="PDF Viewer"
                />
              ) : (
                <div className="flex items-center justify-center h-[500px]">
                  <p className="text-slate-500">Click to load PDF</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "text" && (
            <div className="tab-content">
              <pre className="text-sm whitespace-pre-wrap break-words bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 min-h-[500px] text-slate-300 font-mono">
                {loadingPreview ? (
                  <div className="flex items-center justify-center h-[500px]">
                    <div className="text-center">
                      <div className="inline-block p-4 rounded-2xl bg-indigo-500/10 mb-3">
                        <BookOpen className="w-8 h-8 text-indigo-400 animate-pulse" />
                      </div>
                      <p className="text-slate-400 font-medium">Extracting text...</p>
                    </div>
                  </div>
                ) : previewText ? (
                  previewText
                ) : (
                  <div className="flex items-center justify-center h-[500px]">
                    <p className="text-slate-500 not-italic">No text extracted</p>
                  </div>
                )}
              </pre>
            </div>
          )}

          {activeTab === "summary" && (
            <div className="min-h-[500px] tab-content">
              {document.summary || editedSummary ? (
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-emerald-500/5 to-teal-500/5 border border-emerald-500/20 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-emerald-500/20">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-emerald-400" />
                        <h3 className="font-bold text-lg text-emerald-300">AI-Generated Summary (Editable)</h3>
                      </div>
                      <div className="flex items-center gap-3">
                        {summaryChanged && (
                          <span className="text-xs text-amber-400 font-semibold">Unsaved changes</span>
                        )}
                        <button
                          onClick={handleSaveSummary}
                          disabled={!summaryChanged || isSavingSummary}
                          className="btn-lift flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Save className="w-4 h-4" />
                          {isSavingSummary ? "Saving..." : "Save"}
                        </button>
                      </div>
                    </div>
                    <div data-color-mode="dark">
                      <MDEditor
                        value={editedSummary}
                        onChange={(val) => {
                          setEditedSummary(val || "");
                          setSummaryChanged(val !== document.summary);
                        }}
                        height={400}
                        preview="live"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[500px] text-center gap-4">
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
                    <Sparkles className="w-12 h-12 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-300 mb-2">No Summary Yet</h3>
                    <p className="text-slate-500 mb-4">Click &apos;Generate&apos; to create an AI-powered summary</p>
                    <button
                      onClick={() => onSummarize(document.storage_path)}
                      className="btn-lift px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold shadow-md hover:shadow-neon-green inline-flex items-center gap-2"
                    >
                      <Sparkles className="w-5 h-5" />
                      Generate Summary
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "review" && isPdf && (
            <div className="tab-content">
              <ReviewTab documentId={document.id} storagePath={document.storage_path} />
            </div>
          )}

          {activeTab === "markdown" && (
            <div className="tab-content">
              <MarkdownTab documentId={document.id} documentName={document.original_name} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
