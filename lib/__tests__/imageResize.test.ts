import { describe, it, expect } from "vitest";
import { calcTargetSize } from "@/lib/imageResize";

describe("calcTargetSize", () => {
  it("does not upscale smaller images", () => {
    expect(calcTargetSize(800, 600, 1024)).toEqual({ width: 800, height: 600 });
  });

  it("resizes landscape image by width", () => {
    expect(calcTargetSize(2048, 1536, 1024)).toEqual({ width: 1024, height: 768 });
  });

  it("resizes portrait image by height", () => {
    expect(calcTargetSize(1536, 2048, 1024)).toEqual({ width: 768, height: 1024 });
  });

  it("handles square image", () => {
    expect(calcTargetSize(2000, 2000, 1024)).toEqual({ width: 1024, height: 1024 });
  });
});
