export type MarkdownFile = {
  id: string;
  name: string;
  content: string;
  documentId: number;
  lastModified: number;
};

export type MarkdownVersion = {
  content: string;
  timestamp: number;
  label: string;
};

const STORAGE_PREFIX = "md-file-";
const VERSIONS_PREFIX = "md-versions-";
const MAX_VERSIONS = 10;

export function loadMarkdownFile(documentId: number): MarkdownFile | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(`${STORAGE_PREFIX}${documentId}`);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function saveMarkdownFile(file: MarkdownFile): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(`${STORAGE_PREFIX}${file.documentId}`, JSON.stringify(file));
    saveVersion(file.documentId, file.content);
  } catch (e) {
    console.error("Failed to save markdown file:", e);
  }
}

function saveVersion(documentId: number, content: string): void {
  try {
    const stored = localStorage.getItem(`${VERSIONS_PREFIX}${documentId}`);
    let versions: MarkdownVersion[] = stored ? JSON.parse(stored) : [];
    
    const newVersion: MarkdownVersion = {
      content,
      timestamp: Date.now(),
      label: new Date().toLocaleString(),
    };

    versions.unshift(newVersion);
    if (versions.length > MAX_VERSIONS) {
      versions = versions.slice(0, MAX_VERSIONS);
    }

    localStorage.setItem(`${VERSIONS_PREFIX}${documentId}`, JSON.stringify(versions));
  } catch (e) {
    console.error("Failed to save version:", e);
  }
}

export function loadVersions(documentId: number): MarkdownVersion[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(`${VERSIONS_PREFIX}${documentId}`);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function createNewMarkdownFile(documentId: number, name: string, content: string = ""): MarkdownFile {
  return {
    id: `md-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    documentId,
    content,
    lastModified: Date.now(),
  };
}

export function exportMarkdown(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".md") ? filename : `${filename}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function importMarkdown(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".md,.markdown,.txt";
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      
      try {
        const text = await file.text();
        resolve(text);
      } catch {
        resolve(null);
      }
    };
    
    input.click();
  });
}
