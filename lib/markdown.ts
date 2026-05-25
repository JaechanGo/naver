import { marked } from "marked";
import type { Photo } from "@/lib/draft";

const PHOTO_TOKEN_RE = /!\[\]\((?:photo_id=)?([a-zA-Z0-9_-]+)\)/g;

export function extractPhotoTokens(markdown: string): string[] {
  const ids: string[] = [];
  for (const match of markdown.matchAll(PHOTO_TOKEN_RE)) {
    ids.push(match[1]);
  }
  return ids;
}

export function markdownToHtmlWithPhotos(markdown: string, photos: Photo[]): string {
  const byId = new Map(photos.map((p) => [p.id, p.dataUrl]));

  const replaced = markdown.replace(PHOTO_TOKEN_RE, (_, id: string) => {
    const dataUrl = byId.get(id);
    if (!dataUrl) return "";
    return `\n\n<img src="${dataUrl}" alt="" />\n\n`;
  });

  return marked.parse(replaced, { async: false }) as string;
}

export function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(PHOTO_TOKEN_RE, "[사진]")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/#+\s/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
