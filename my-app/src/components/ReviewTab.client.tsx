"use client";

import { useState, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Stage, Layer, Rect, Line, Text as KonvaText } from "react-konva";
import { 
  Square, 
  Pen, 
  Type, 
  Eraser, 
  Undo, 
  Redo, 
  Download 
} from "lucide-react";
import {
  Annotation,
  AnnotationType,
  loadReviewData,
  saveReviewData,
  generateAnnotationId,
  ReviewData,
} from "@/lib/annotationStore";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

type Props = {
  documentId: number;
  storagePath: string;
};

export function ReviewTab({ documentId, storagePath }: Props) {
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [loading, setLoading] = useState(true);

  const [reviewData, setReviewData] = useState<ReviewData>({ annotations: [], notes: "" });
  const [selectedTool, setSelectedTool] = useState<AnnotationType | "eraser" | null>(null);
  const [currentColor, setCurrentColor] = useState("#ff0000");
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null);

  const [history, setHistory] = useState<Annotation[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isExporting, setIsExporting] = useState(false);

  const stageRef = useRef<any>(null);
  const pageWrapRef = useRef<HTMLDivElement | null>(null);
  const [stageSize, setStageSize] = useState({ width: 1, height: 1 });

  const measurePageSize = () => {
    const wrap = pageWrapRef.current;
    if (!wrap) return false;
    const pageEl = wrap.querySelector('.react-pdf__Page') as HTMLElement | null;
    if (!pageEl) return false;
    const rect = pageEl.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    if (w <= 1 || h <= 1) return false;
    setStageSize({ width: w, height: h });
    return true;
  };

  // Failsafe: keep the Konva overlay aligned even if react-pdf's onRenderSuccess
  // doesn't fire (this happens occasionally with dev bundlers / fast refresh).
  useEffect(() => {
    if (!pdfUrl) return;

    let stopped = false;
    let tries = 0;

    const tick = () => {
      if (stopped) return;
      tries += 1;
      const ok = measurePageSize();
      if (!ok && tries < 30) {
        requestAnimationFrame(tick);
      }
    };

    requestAnimationFrame(tick);

    const onResize = () => measurePageSize();
    window.addEventListener('resize', onResize);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => measurePageSize());
      if (pageWrapRef.current) ro.observe(pageWrapRef.current);
    }

    return () => {
      stopped = true;
      window.removeEventListener('resize', onResize);
      ro?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfUrl, currentPage, scale]);

  useEffect(() => {
    const data = loadReviewData(documentId);
    setReviewData(data);
    setHistory([data.annotations]);
    setHistoryIndex(0);
  }, [documentId]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      saveReviewData(documentId, reviewData);
    }, 500);
    return () => clearTimeout(debounce);
  }, [reviewData, documentId]);

  useEffect(() => {
    async function fetchPdfUrl() {
      try {
        setLoading(true);
        const res = await fetch(`/api/signed-url?path=${encodeURIComponent(storagePath)}`);
        const data = await res.json();
        if (data.ok) {
          setPdfUrl(data.url);
        }
      } catch (e) {
        console.error("Failed to load PDF URL:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchPdfUrl();
  }, [storagePath]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  function handleMouseDown(e: any) {
    if (!selectedTool || selectedTool === "eraser") return;

    const stage = e?.target?.getStage?.();
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;

    if (selectedTool === "rect") {
      const ann: Annotation = {
        id: generateAnnotationId(),
        type: "rect",
        pageNumber: currentPage,
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        color: currentColor,
        strokeWidth: 2,
      };
      setCurrentAnnotation(ann);
      setIsDrawing(true);
    } else if (selectedTool === "pen") {
      // Store absolute points (stable across scaling and rendering)
      const ann: Annotation = {
        id: generateAnnotationId(),
        type: "pen",
        pageNumber: currentPage,
        x: 0,
        y: 0,
        points: [pos.x, pos.y],
        color: currentColor,
        strokeWidth: 2,
      };
      setCurrentAnnotation(ann);
      setIsDrawing(true);
    } else if (selectedTool === "text") {
      const text = prompt("Enter text:");
      if (text) {
        const ann: Annotation = {
          id: generateAnnotationId(),
          type: "text",
          pageNumber: currentPage,
          x: pos.x,
          y: pos.y,
          text,
          color: currentColor,
        };
        addAnnotation(ann);
      }
      setSelectedTool(null);
    }
  }

  function handleMouseMove(e: any) {
    if (!isDrawing || !currentAnnotation) return;

    const stage = e?.target?.getStage?.();
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;

    if (currentAnnotation.type === "rect") {
      setCurrentAnnotation({
        ...currentAnnotation,
        width: pos.x - currentAnnotation.x,
        height: pos.y - currentAnnotation.y,
      });
    } else if (currentAnnotation.type === "pen") {
      const newPoints = [...(currentAnnotation.points || []), pos.x, pos.y];
      setCurrentAnnotation({ ...currentAnnotation, points: newPoints });
    }
  }

  function handleMouseUp() {
    if (!isDrawing || !currentAnnotation) return;

    addAnnotation(currentAnnotation);
    setCurrentAnnotation(null);
    setIsDrawing(false);
    if (selectedTool !== "pen") {
      setSelectedTool(null);
    }
  }

  function addAnnotation(ann: Annotation) {
    const newAnnotations = [...reviewData.annotations, ann];
    setReviewData({ ...reviewData, annotations: newAnnotations });

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newAnnotations);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }

  function handleUndo() {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setReviewData({ ...reviewData, annotations: history[newIndex] });
    }
  }

  function handleRedo() {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setReviewData({ ...reviewData, annotations: history[newIndex] });
    }
  }

  function handleEraser(annId: string) {
    const newAnnotations = reviewData.annotations.filter((a) => a.id !== annId);
    setReviewData({ ...reviewData, annotations: newAnnotations });

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newAnnotations);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }

  async function handleExportPdf() {
    try {
      setIsExporting(true);
      const res = await fetch(`/api/documents/${documentId}/export-reviewed-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ annotations: reviewData.annotations }),
      });

      const data = await res.json();
      if (!data.ok) {
        alert(`Export failed: ${data.error}`);
        return;
      }

      window.open(data.url, "_blank", "noopener,noreferrer");
      alert("Reviewed PDF exported successfully!");
    } catch (e: any) {
      alert(`Export error: ${e?.message ?? "Unknown error"}`);
    } finally {
      setIsExporting(false);
    }
  }

  const pageAnnotations = reviewData.annotations.filter((a) => a.pageNumber === currentPage);

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2 flex-wrap bg-white border rounded p-2 text-slate-800">
          <button
            onClick={() => setSelectedTool("rect")}
            className={`p-2 rounded transition-colors ${
              selectedTool === "rect" 
                ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md" 
                : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
            }`}
            title="Rectangle"
          >
            <Square className="w-4 h-4" />
          </button>
          <button
            onClick={() => setSelectedTool("pen")}
            className={`p-2 rounded transition-colors ${
              selectedTool === "pen" 
                ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md" 
                : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
            }`}
            title="Pen"
          >
            <Pen className="w-4 h-4" />
          </button>
          <button
            onClick={() => setSelectedTool("text")}
            className={`p-2 rounded transition-colors ${
              selectedTool === "text" 
                ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md" 
                : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
            }`}
            title="Text"
          >
            <Type className="w-4 h-4" />
          </button>
          <button
            onClick={() => setSelectedTool("eraser")}
            className={`p-2 rounded transition-colors ${
              selectedTool === "eraser" 
                ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md" 
                : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
            }`}
            title="Eraser"
          >
            <Eraser className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-slate-300" />
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="p-2 rounded text-slate-700 hover:bg-slate-100 hover:text-slate-900 disabled:text-slate-300 disabled:hover:bg-transparent transition-colors"
            title="Undo"
          >
            <Undo className="w-4 h-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="p-2 rounded text-slate-700 hover:bg-slate-100 hover:text-slate-900 disabled:text-slate-300 disabled:hover:bg-transparent transition-colors"
            title="Redo"
          >
            <Redo className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-slate-300" />
          <input
            type="color"
            value={currentColor}
            onChange={(e) => setCurrentColor(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer"
            title="Color"
          />
          <div className="w-px h-6 bg-slate-300" />
          <button
            onClick={() => setScale((s) => Math.max(0.5, s - 0.1))}
            className="px-2 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-100 hover:border-slate-400 text-sm transition-colors"
          >
            -
          </button>
          <span className="text-sm font-medium text-slate-700">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => setScale((s) => Math.min(2, s + 0.1))}
            className="px-2 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-100 hover:border-slate-400 text-sm transition-colors"
          >
            +
          </button>
          <div className="w-px h-6 bg-slate-300" />
          <button
            onClick={handleExportPdf}
            disabled={isExporting || reviewData.annotations.length === 0}
            className="flex items-center gap-1 px-3 py-2 rounded bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold shadow-md transition-all"
            title="Export PDF with annotations"
          >
            <Download className="w-4 h-4" />
            {isExporting ? "Exporting..." : "Export PDF"}
          </button>
        </div>

        <div className="bg-white border rounded p-4 relative overflow-auto" style={{ maxHeight: "70vh" }}>
          {loading && <div className="text-sm text-slate-500">Loading PDF...</div>}
          {!loading && pdfUrl && (
            <div ref={pageWrapRef} className="relative inline-block review-pdf-wrap">
              <Document file={pdfUrl} onLoadSuccess={onDocumentLoadSuccess}>
                <Page
                  pageNumber={currentPage}
                  scale={scale}
                  // In Review mode, we don't need text/annotation layers; they often steal pointer events.
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  onRenderSuccess={() => requestAnimationFrame(() => measurePageSize())}
                />
              </Document>

              <div className="absolute inset-0 z-50 pointer-events-auto">
                <Stage
                  width={stageSize.width}
                  height={stageSize.height}
                  ref={stageRef}
                  onMouseDown={handleMouseDown}
                  onTouchStart={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onTouchMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onTouchEnd={handleMouseUp}
                  style={{ touchAction: "none" }}
                >
                  <Layer>
                    {pageAnnotations.map((ann) => {
                      if (ann.type === "rect") {
                        return (
                          <Rect
                            key={ann.id}
                            x={ann.x}
                            y={ann.y}
                            width={ann.width || 0}
                            height={ann.height || 0}
                            stroke={ann.color}
                            strokeWidth={ann.strokeWidth || 2}
                            onClick={() => selectedTool === "eraser" && handleEraser(ann.id)}
                          />
                        );
                      }

                      if (ann.type === "pen") {
                        const pts = ann.points || [];
                        const looksRelative =
                          (ann.x || ann.y) && pts.length >= 2 && pts[0] === 0 && pts[1] === 0;

                        return (
                          <Line
                            key={ann.id}
                            points={pts}
                            stroke={ann.color}
                            strokeWidth={ann.strokeWidth || 2}
                            tension={0.5}
                            lineCap="round"
                            globalCompositeOperation="source-over"
                            {...(looksRelative ? { x: ann.x, y: ann.y } : {})}
                            onClick={() => selectedTool === "eraser" && handleEraser(ann.id)}
                          />
                        );
                      }

                      if (ann.type === "text") {
                        return (
                          <KonvaText
                            key={ann.id}
                            x={ann.x}
                            y={ann.y}
                            text={ann.text || ""}
                            fill={ann.color}
                            fontSize={14}
                            onClick={() => selectedTool === "eraser" && handleEraser(ann.id)}
                          />
                        );
                      }

                      return null;
                    })}

                    {currentAnnotation && currentAnnotation.type === "rect" && (
                      <Rect
                        x={currentAnnotation.x}
                        y={currentAnnotation.y}
                        width={currentAnnotation.width || 0}
                        height={currentAnnotation.height || 0}
                        stroke={currentAnnotation.color}
                        strokeWidth={2}
                      />
                    )}

                    {currentAnnotation && currentAnnotation.type === "pen" && (
                      <Line
                        points={currentAnnotation.points || []}
                        stroke={currentAnnotation.color}
                        strokeWidth={2}
                        tension={0.5}
                        lineCap="round"
                      />
                    )}
                  </Layer>
                </Stage>
              </div>
            </div>
          )}
        </div>

        {numPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="px-3 py-1 rounded border disabled:opacity-50"
            >
              Prev
            </button>
            <span className="text-sm">
              Page {currentPage} of {numPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
              disabled={currentPage >= numPages}
              className="px-3 py-1 rounded border disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      <div className="lg:w-80 bg-white border rounded p-4">
        <h3 className="font-semibold mb-2">Review Notes</h3>
        <textarea
          value={reviewData.notes}
          onChange={(e) => setReviewData({ ...reviewData, notes: e.target.value })}
          placeholder="Add your review notes here..."
          className="w-full h-64 px-3 py-2 border rounded resize-none text-sm"
        />
        <div className="mt-2 text-xs text-slate-500">
          Autosaved · {reviewData.annotations.length} annotation(s)
        </div>
      </div>
    </div>
  );
}
