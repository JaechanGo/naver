const STORAGE_KEY = "current_draft";

export type Photo = {
  id: string;
  dataUrl: string;
  userNote?: string;
  aiCaption?: string;
};

export type StoreInfo = {
  name?: string;
  address?: string;
  visitDate?: string;
  menu?: string;
};

export type Draft = {
  step: 1 | 2 | 3 | 4;
  photos: Photo[];
  storeInfo: StoreInfo;
  topicHint: string;
  result?: {
    title: string;
    bodyMarkdown: string;
    generatedAt: string;
  };
};

export function createEmptyDraft(): Draft {
  return {
    step: 1,
    photos: [],
    storeInfo: {},
    topicHint: "",
  };
}

export function readDraft(): Draft | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Draft;
  } catch {
    return null;
  }
}

export function writeDraft(draft: Draft): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch (e) {
    if (e instanceof DOMException && e.name === "QuotaExceededError") {
      console.warn("localStorage quota exceeded; draft not saved");
      return;
    }
    throw e;
  }
}

export function clearDraft(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
