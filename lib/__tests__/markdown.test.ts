import { describe, it, expect } from "vitest";
import { markdownToHtmlWithPhotos, extractPhotoTokens } from "@/lib/markdown";

describe("markdown", () => {
  const photos = [
    { id: "a", dataUrl: "data:image/jpeg;base64,AAAA" },
    { id: "b", dataUrl: "data:image/jpeg;base64,BBBB" },
  ];

  it("renders text without photos as plain HTML", () => {
    const html = markdownToHtmlWithPhotos("**Hello** world", []);
    expect(html).toContain("<strong>Hello</strong>");
  });

  it("replaces photo tokens with inline base64 img tags", () => {
    const md = "안녕\n\n![](a)\n\n다음";
    const html = markdownToHtmlWithPhotos(md, photos);
    expect(html).toContain('src="data:image/jpeg;base64,AAAA"');
  });

  it("removes unmatched photo tokens", () => {
    const md = "![](nonexistent)";
    const html = markdownToHtmlWithPhotos(md, photos);
    expect(html).not.toContain("nonexistent");
  });

  it("extractPhotoTokens returns ids in order", () => {
    expect(extractPhotoTokens("![](a) text ![](b) more ![](a)")).toEqual(["a", "b", "a"]);
  });
});
