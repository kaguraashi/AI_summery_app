"use client";

import { useEffect, useMemo, useState } from "react";
import { SettingsDialog } from "@/components/SettingsDialog";
import { DocumentPanel } from "@/components/DocumentPanel";
import { loadSummarySettings } from "@/lib/summarySettings";
import { 
  Upload, RefreshCw, Settings, FileText, Search, 
  SortAsc, Calendar, FileArchive, Sparkles, Folder
} from "lucide-react";

type Doc = {
  id: number;
  storage_path: string;
  original_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
  summary: string | null;
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [status, setStatus] = useState("Ready");
  const [showSettings, setShowSettings] = useState(false);

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest" | "name" | "size">("newest");

  const selected = useMemo(
    () => docs.find((d) => d.id === selectedId) ?? null,
    [docs, selectedId]
  );

  const visibleDocs = useMemo(() => {
    const q = query.trim().toLowerCase();
    let arr = docs.filter((d) => (q ? d.original_name.toLowerCase().includes(q) : true));
    arr = [...arr].sort((a, b) => {
      if (sort === "name") return a.original_name.localeCompare(b.original_name);
      if (sort === "size") return (b.size_bytes ?? 0) - (a.size_bytes ?? 0);
      if (sort === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return arr;
  }, [docs, query, sort]);

  async function refreshList() {
    try {
      setStatus("Refreshing...");

      const res = await fetch("/api/documents", {
        method: "GET",
        cache: "no-store",
        headers: { "cache-control": "no-store" },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        setStatus(`Refresh failed: HTTP ${res.status} ${text.slice(0, 120)}`);
        return;
      }

      const data = await res.json();
      if (!data.ok) {
        setStatus(`Refresh failed: ${data.error ?? "Unknown error"}`);
        return;
      }

      setDocs(data.documents);

      if (selectedId !== null && !data.documents.some((d: Doc) => d.id === selectedId)) {
        setSelectedId(null);
      }

      setStatus(`Refreshed: ${data.documents.length} document(s)`);
    } catch (e: any) {
      setStatus(`Refresh error: ${e?.message ?? "Unknown error"}`);
    }
  }

  async function upload() {
    if (!file) return;
    setStatus("Uploading...");
    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!data.ok) {
        setStatus(`Upload failed: ${data.error}`);
        return;
      }
      setStatus(`Uploaded: ${data.storage_path}`);
      setFile(null);
      await refreshList();
    } catch (e: any) {
      setStatus(`Upload error: ${e?.message ?? "Unknown error"}`);
    }
  }

  async function summarize(path: string) {
    setStatus("Summarizing...");

    try {
      const settings = loadSummarySettings();
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          path,
          language: settings.language,
          length: settings.length,
          style: settings.style,
          customInstructions: settings.customInstructions,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setStatus(`Summarize failed: ${data.error}`);
        return;
      }
      setStatus("Summary generated");
      await refreshList();
    } catch (e: any) {
      setStatus(`Summarize error: ${e?.message ?? "Unknown error"}`);
    }
  }

  async function removeDoc(path: string) {
    setStatus("Deleting...");

    try {
      const res = await fetch("/api/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
      const data = await res.json();
      if (!data.ok) {
        setStatus(`Delete failed: ${data.error}`);
        return;
      }
      setStatus("Deleted");
      setSelectedId(null);
      await refreshList();
    } catch (e: any) {
      setStatus(`Delete error: ${e?.message ?? "Unknown error"}`);
    }
  }

  useEffect(() => {
    refreshList();
  }, []);

  const showNoDocsYet = docs.length === 0;
  const showNoMatch = docs.length > 0 && visibleDocs.length === 0;

  return (
    <main className="min-h-screen animated-bg">
      <SettingsDialog isOpen={showSettings} onClose={() => setShowSettings(false)} />
      
      {/* App Shell */}
      <div className="min-h-screen backdrop-blur-sm bg-slate-900/30">
        <div className="max-w-[1920px] mx-auto p-6 space-y-6">
          
          {/* Top Bar */}
          <header className="fade-in">
            <div className="glass rounded-2xl p-6 border border-slate-700/50 shadow-lg">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-neon">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                      Document Workspace
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">
                      Intelligent document management and analysis platform
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => setShowSettings(true)}
                  className="btn-lift px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg hover:shadow-neon flex items-center gap-2"
                >
                  <Settings className="w-5 h-5" />
                  Settings
                </button>
              </div>
            </div>
          </header>

          {/* Upload Module */}
          <section className="fade-in" style={{ animationDelay: '100ms' }}>
            <div className="glass rounded-2xl p-6 border border-slate-700/50 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-emerald-500/20">
                  <Upload className="w-5 h-5 text-emerald-400" />
                </div>
                <h2 className="text-lg font-bold text-slate-100">Quick Upload</h2>
              </div>
              
              <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
                <div className="flex-1">
                  <input
                    type="file"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="
                      block w-full text-sm text-slate-300
                      file:mr-4 file:rounded-xl file:border-0
                      file:bg-gradient-to-r file:from-emerald-500 file:to-teal-500
                      file:px-6 file:py-3
                      file:text-sm file:font-bold file:text-white
                      file:shadow-md hover:file:shadow-neon-green
                      file:cursor-pointer file:btn-lift
                      bg-slate-800/50 rounded-xl px-4 py-3 border border-slate-700
                    "
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={upload}
                    disabled={!file}
                    className="btn-lift px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold shadow-md hover:shadow-neon-green disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Upload
                  </button>
                  <button 
                    onClick={refreshList} 
                    className="btn-lift px-6 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-semibold shadow-md border border-slate-600 flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </button>
                </div>
              </div>
              
              {/* Status Badge */}
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700">
                <div className="w-2 h-2 rounded-full bg-emerald-400 pulse-glow"></div>
                <span className="text-sm text-slate-300 font-medium">{status}</span>
              </div>
            </div>
          </section>

          {/* Main Content Grid */}
          <section className="grid grid-cols-1 xl:grid-cols-12 gap-6 fade-in" style={{ animationDelay: '200ms' }}>
            
            {/* Left Panel - File Browser */}
            <div className="xl:col-span-4 2xl:col-span-3">
              <div className="glass rounded-2xl border border-slate-700/50 shadow-lg overflow-hidden">
                
                {/* Panel Header */}
                <div className="p-5 border-b border-slate-700/50 bg-gradient-to-r from-indigo-900/30 to-purple-900/30">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-indigo-500/20">
                      <Folder className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div className="flex-1">
                      <h2 className="font-bold text-lg text-slate-100">Document Library</h2>
                      <p className="text-xs text-slate-400 mt-0.5">{docs.length} total documents</p>
                    </div>
                  </div>

                  {/* Search & Filter */}
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search documents..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/70 border border-slate-700 text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                      />
                    </div>
                    
                    <div className="relative">
                      <SortAsc className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <select
                        value={sort}
                        onChange={(e) => setSort(e.target.value as any)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/70 border border-slate-700 text-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none appearance-none cursor-pointer"
                      >
                        <option value="newest">📅 Newest first</option>
                        <option value="oldest">⏰ Oldest first</option>
                        <option value="name">🔤 Name (A-Z)</option>
                        <option value="size">📊 Size (desc)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Document List */}
                <div className="p-4 max-h-[calc(100vh-400px)] overflow-y-auto">
                  <ul className="space-y-2">
                    {visibleDocs.map((d, idx) => (
                      <li
                        key={d.id}
                        className={`
                          stagger-item p-4 rounded-xl cursor-pointer border transition-all
                          ${selectedId === d.id 
                            ? "border-indigo-500 bg-indigo-500/20 shadow-neon" 
                            : "border-slate-700/50 bg-slate-800/30 hover:bg-slate-700/30 hover:border-slate-600 card-interactive"
                          }
                        `}
                        style={{ animationDelay: `${idx * 50}ms` }}
                        onClick={() => setSelectedId(d.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${selectedId === d.id ? 'bg-indigo-500/30' : 'bg-slate-700/50'}`}>
                            <FileText className={`w-5 h-5 ${selectedId === d.id ? 'text-indigo-300' : 'text-slate-400'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`font-semibold text-sm break-words mb-1 ${selectedId === d.id ? 'text-indigo-200' : 'text-slate-200'}`}>
                              {d.original_name}
                            </div>
                            <div className="text-xs text-slate-500 break-words mb-2">
                              {d.storage_path}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-400">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(d.created_at).toLocaleDateString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <FileArchive className="w-3 h-3" />
                                {((d.size_bytes ?? 0) / 1024).toFixed(1)} KB
                              </span>
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              {d.summary ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                                  <Sparkles className="w-3 h-3" />
                                  Summary
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-700/50 border border-slate-600 text-slate-400 text-xs">
                                  No summary
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}

                    {showNoDocsYet && (
                      <li className="text-center py-12">
                        <div className="inline-flex flex-col items-center gap-3">
                          <div className="p-4 rounded-2xl bg-slate-800/50">
                            <FileText className="w-12 h-12 text-slate-600" />
                          </div>
                          <p className="text-slate-500 font-medium">No documents yet</p>
                          <p className="text-xs text-slate-600">Upload a file to get started</p>
                        </div>
                      </li>
                    )}
                    
                    {showNoMatch && (
                      <li className="text-center py-12">
                        <div className="inline-flex flex-col items-center gap-3">
                          <div className="p-4 rounded-2xl bg-slate-800/50">
                            <Search className="w-12 h-12 text-slate-600" />
                          </div>
                          <p className="text-slate-500 font-medium">No matches found</p>
                          <p className="text-xs text-slate-600">Try adjusting your search</p>
                        </div>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>

            {/* Right Panel - Document Viewer */}
            <div className="xl:col-span-8 2xl:col-span-9">
              {selected ? (
                <DocumentPanel 
                  document={selected} 
                  onDelete={removeDoc} 
                  onSummarize={summarize}
                  onRefresh={refreshList}
                />
              ) : (
                <div className="glass rounded-2xl border border-slate-700/50 shadow-lg p-12">
                  <div className="flex flex-col items-center justify-center text-center gap-4 py-12">
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
                      <FileText className="w-16 h-16 text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-300 mb-2">No Document Selected</h3>
                      <p className="text-slate-500">Select a document from the library to view details and analysis</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
