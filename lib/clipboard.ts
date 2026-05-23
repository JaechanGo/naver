export function isClipboardWriteSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.clipboard?.write === "function" &&
    typeof (globalThis as any).ClipboardItem !== "undefined"
  );
}

export async function copyHtmlAndText(html: string, text: string): Promise<void> {
  if (!isClipboardWriteSupported()) {
    throw new Error("Clipboard API not supported");
  }
  const item = new ClipboardItem({
    "text/html": new Blob([html], { type: "text/html" }),
    "text/plain": new Blob([text], { type: "text/plain" }),
  });
  await navigator.clipboard.write([item]);
}

export async function copyTextOnly(text: string): Promise<void> {
  if (!navigator.clipboard?.writeText) {
    throw new Error("Clipboard API not supported");
  }
  await navigator.clipboard.writeText(text);
}
