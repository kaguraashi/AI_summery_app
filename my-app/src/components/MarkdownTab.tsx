"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import {
  Save,
  FileDown,
  FileUp,
  History,
  Search,
  FileText,
} from "lucide-react";
import {
  loadMarkdownFile,
  saveMarkdownFile,
  createNewMarkdownFile,
  loadVersions,
  exportMarkdown,
  importMarkdown,
  MarkdownFile,
  MarkdownVersion,
} from "@/lib/markdownStore";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

type Props = {
  documentId: number;
  documentName: string;
};

type SaveState = "saved" | "unsaved" | "saving";

export function MarkdownTab({ documentId, documentName }: Props) {
  const [mdFile, setMdFile] = useState<MarkdownFile | null>(null);
  const [content, setContent] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [showVersions, setShowVersions] = useState(false);
  const [showFind, setShowFind] = useState(false);
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleSave = () => {
    if (!mdFile) return;

    setSaveState("saving");
    const updated: MarkdownFile = {
      ...mdFile,
      content,
      lastModified: Date.now(),
    };
    saveMarkdownFile(updated);
    setMdFile(updated);
    setSaveState("saved");
  };

  useEffect(() => {
    const existing = loadMarkdownFile(documentId);
    if (existing) {
      setMdFile(existing);
      setContent(existing.content);
    } else {
      const newFile = createNewMarkdownFile(documentId, `${documentName}-notes`);
      setMdFile(newFile);
      setContent(newFile.content);
    }
  }, [documentId, documentName]);

  useEffect(() => {
    if (!mdFile) return;

    if (content !== mdFile.content) {
      setSaveState("unsaved");
      
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        handleSave();
      }, 2000);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [content, mdFile, handleSave]);

  function handleSaveAs() {
    const newName = prompt("Enter new file name:", mdFile?.name || "note");
    if (!newName) return;

    const newFile = createNewMarkdownFile(documentId, newName, content);
    saveMarkdownFile(newFile);
    setMdFile(newFile);
    setSaveState("saved");
  }

  function handleExport() {
    if (!mdFile) return;
    exportMarkdown(content, mdFile.name);
  }

  async function handleImport() {
    const imported = await importMarkdown();
    if (imported !== null) {
      setContent(imported);
      setSaveState("unsaved");
    }
  }

  function handleRestore(version: MarkdownVersion) {
    if (confirm(`Restore version from ${version.label}?`)) {
      setContent(version.content);
      setShowVersions(false);
      setSaveState("unsaved");
    }
  }

  function handleFind() {
    if (!findText) return;

    const textarea = document.querySelector(".w-md-editor-text-input") as HTMLTextAreaElement;
    if (!textarea) return;

    const text = textarea.value.toLowerCase();
    const search = findText.toLowerCase();
    const index = text.indexOf(search);
    
    if (index >= 0) {
      textarea.focus();
      textarea.setSelectionRange(index, index + findText.length);
    }
  }

  function handleReplace() {
    if (!findText) return;
    setContent(content.replace(new RegExp(findText, "g"), replaceText));
    setShowFind(false);
  }

  const versions = showVersions ? loadVersions(documentId) : [];

  const saveIndicator = {
    saved: "Saved",
    unsaved: "Unsaved changes",
    saving: "Saving...",
  }[saveState];

  return (
    <div className="space-y-4">
      
      {/* Toolbar */}
      <div className="glass rounded-xl p-4 border border-slate-700/50">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <FileText className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="font-bold text-slate-200">{mdFile?.name || "Markdown Notes"}</h3>
              <span className={`text-xs font-semibold ${
                saveState === "saved" ? "text-emerald-400" : 
                saveState === "saving" ? "text-amber-400" : "text-orange-400"
              }`}>
                {saveIndicator}
              </span>
            </div>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleSave}
              className="btn-lift flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-md"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
            <button
              onClick={handleSaveAs}
              className="btn-lift px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-semibold text-sm border border-slate-600"
            >
              Save As
            </button>
            <button
              onClick={handleImport}
              className="btn-lift flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-semibold text-sm border border-slate-600"
            >
              <FileUp className="w-4 h-4" />
              Import
            </button>
            <button
              onClick={handleExport}
              className="btn-lift flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-semibold text-sm border border-slate-600"
            >
              <FileDown className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={() => setShowVersions(!showVersions)}
              className="btn-lift flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md"
            >
              <History className="w-4 h-4" />
              History
            </button>
            <button
              onClick={() => setShowFind(!showFind)}
              className="btn-lift flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm shadow-md"
            >
              <Search className="w-4 h-4" />
              Find
            </button>
          </div>
        </div>
      </div>

      {/* Find & Replace Panel */}
      {showFind && (
        <div className="glass rounded-xl p-4 border border-purple-500/30 bg-purple-500/5 space-y-3 tab-content">
          <div className="flex items-center gap-2 mb-2">
            <Search className="w-4 h-4 text-purple-400" />
            <h4 className="font-bold text-sm text-slate-200">Find & Replace</h4>
          </div>
          <div className="flex gap-3">
            <input
              type="text"
              value={findText}
              onChange={(e) => setFindText(e.target.value)}
              placeholder="Search text..."
              className="flex-1 px-4 py-2 rounded-lg bg-slate-800/70 border border-slate-700 text-slate-200 placeholder-slate-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 outline-none text-sm"
            />
            <button
              onClick={handleFind}
              className="btn-lift px-5 py-2 rounded-lg bg-purple-600 text-white font-semibold text-sm shadow-md hover:shadow-lg"
            >
              Find
            </button>
          </div>
          <div className="flex gap-3">
            <input
              type="text"
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              placeholder="Replace with..."
              className="flex-1 px-4 py-2 rounded-lg bg-slate-800/70 border border-slate-700 text-slate-200 placeholder-slate-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 outline-none text-sm"
            />
            <button
              onClick={handleReplace}
              className="btn-lift px-5 py-2 rounded-lg bg-emerald-600 text-white font-semibold text-sm shadow-md hover:shadow-lg"
            >
              Replace All
            </button>
          </div>
        </div>
      )}

      {/* Version History Panel */}
      {showVersions && versions.length > 0 && (
        <div className="glass rounded-xl p-4 border border-indigo-500/30 bg-indigo-500/5 tab-content">
          <div className="flex items-center gap-2 mb-3">
            <History className="w-4 h-4 text-indigo-400" />
            <h4 className="font-bold text-sm text-slate-200">Version History (Last {versions.length})</h4>
          </div>
          <ul className="space-y-2">
            {versions.map((v, i) => (
              <li 
                key={i} 
                className="flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg border border-slate-700 transition-colors"
              >
                <span className="text-sm text-slate-300 font-medium">{v.label}</span>
                <button
                  onClick={() => handleRestore(v)}
                  className="btn-lift px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  Restore
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Markdown Editor */}
      <div className="glass rounded-xl overflow-hidden border border-slate-700/50" data-color-mode="dark">
        <MDEditor
          value={content}
          onChange={(val) => setContent(val || "")}
          height={500}
          preview="live"
          hideToolbar={false}
        />
      </div>

      {/* Footer Info */}
      <div className="flex items-center gap-2 text-xs text-slate-500 px-2">
        <div className="w-1.5 h-1.5 rounded-full bg-slate-600"></div>
        Last modified: {mdFile ? new Date(mdFile.lastModified).toLocaleString() : "Never"}
      </div>
    </div>
  );
}
