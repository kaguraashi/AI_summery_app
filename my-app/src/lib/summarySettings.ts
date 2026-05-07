export type SummarySettings = {
  language: "auto" | "english" | "zh-tw" | "zh-cn" | "japanese" | "korean";
  length: "short" | "medium" | "long";
  style: "bullet" | "structured" | "academic" | "executive";
  customInstructions: string;
};

const DEFAULT_SETTINGS: SummarySettings = {
  language: "auto",
  length: "medium",
  style: "bullet",
  customInstructions: "",
};

const STORAGE_KEY = "summary-settings";

export function loadSummarySettings(): SummarySettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSummarySettings(settings: SummarySettings): void {
  if (typeof window === "undefined") return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error("Failed to save summary settings:", e);
  }
}

export function getLanguageLabel(lang: SummarySettings["language"]): string {
  const labels = {
    auto: "Auto",
    english: "English",
    "zh-tw": "中文(繁體)",
    "zh-cn": "中文(简体)",
    japanese: "日本語",
    korean: "한국어",
  };
  return labels[lang];
}
