import { describe, it, expect, beforeEach } from "vitest";
import { readDraft, writeDraft, clearDraft, createEmptyDraft, type Draft } from "@/lib/draft";

describe("draft", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("createEmptyDraft returns step 1 with empty fields", () => {
    const draft = createEmptyDraft();
    expect(draft.step).toBe(1);
    expect(draft.photos).toEqual([]);
    expect(draft.topicHint).toBe("");
    expect(draft.storeInfo).toEqual({});
    expect(draft.result).toBeUndefined();
  });

  it("readDraft returns null when nothing stored", () => {
    expect(readDraft()).toBeNull();
  });

  it("writeDraft then readDraft returns same object", () => {
    const draft: Draft = {
      step: 2,
      photos: [{ id: "abc", dataUrl: "data:image/jpeg;base64,xxx" }],
      storeInfo: { name: "한우집" },
      topicHint: "맛있었음",
    };
    writeDraft(draft);
    expect(readDraft()).toEqual(draft);
  });

  it("clearDraft removes stored data", () => {
    writeDraft(createEmptyDraft());
    expect(readDraft()).not.toBeNull();
    clearDraft();
    expect(readDraft()).toBeNull();
  });
});
