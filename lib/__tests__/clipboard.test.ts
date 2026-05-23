import { describe, it, expect, vi, beforeEach } from "vitest";
import { copyHtmlAndText, isClipboardWriteSupported } from "@/lib/clipboard";

describe("clipboard", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("isClipboardWriteSupported returns false when ClipboardItem missing", () => {
    const original = (globalThis as any).ClipboardItem;
    (globalThis as any).ClipboardItem = undefined;
    expect(isClipboardWriteSupported()).toBe(false);
    (globalThis as any).ClipboardItem = original;
  });

  it("copyHtmlAndText calls navigator.clipboard.write with html and text blobs", async () => {
    const writeMock = vi.fn().mockResolvedValue(undefined);
    (globalThis as any).ClipboardItem = class {
      constructor(public items: Record<string, Blob>) {}
    };
    Object.defineProperty(globalThis.navigator, "clipboard", {
      value: { write: writeMock },
      configurable: true,
    });

    await copyHtmlAndText("<p>hi</p>", "hi");

    expect(writeMock).toHaveBeenCalledOnce();
    const arg = writeMock.mock.calls[0][0][0];
    expect(arg.items["text/html"]).toBeInstanceOf(Blob);
    expect(arg.items["text/plain"]).toBeInstanceOf(Blob);
  });
});
