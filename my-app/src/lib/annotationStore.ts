export type AnnotationType = "rect" | "pen" | "text";

export type Annotation = {
  id: string;
  type: AnnotationType;
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

export type ReviewData = {
  annotations: Annotation[];
  notes: string;
};

const STORAGE_PREFIX = "review-data-";

export function loadReviewData(documentId: number): ReviewData {
  if (typeof window === "undefined") {
    return { annotations: [], notes: "" };
  }

  try {
    const stored = localStorage.getItem(`${STORAGE_PREFIX}${documentId}`);
    if (!stored) return { annotations: [], notes: "" };
    return JSON.parse(stored);
  } catch {
    return { annotations: [], notes: "" };
  }
}

export function saveReviewData(documentId: number, data: ReviewData): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(`${STORAGE_PREFIX}${documentId}`, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save review data:", e);
  }
}

export function generateAnnotationId(): string {
  return `ann-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
