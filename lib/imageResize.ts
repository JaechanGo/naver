export function calcTargetSize(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } {
  if (width <= maxEdge && height <= maxEdge) {
    return { width, height };
  }
  const ratio = Math.min(maxEdge / width, maxEdge / height);
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
}

export async function resizeImageToDataUrl(
  file: File,
  maxEdge = 1024,
  quality = 0.85,
): Promise<string> {
  const img = await loadImage(file);
  const { width, height } = calcTargetSize(img.width, img.height, maxEdge);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");
  ctx.drawImage(img, 0, 0, width, height);

  return canvas.toDataURL("image/jpeg", quality);
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to load image: ${e}`));
    };
    img.src = url;
  });
}

export function dataUrlByteLength(dataUrl: string): number {
  const base64 = dataUrl.split(",")[1] ?? "";
  return Math.floor((base64.length * 3) / 4);
}
