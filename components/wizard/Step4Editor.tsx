"use client";
import { useState, useMemo, useRef } from "react";
import { Copy, Check, Download } from "lucide-react";
import JSZip from "jszip";
import type { Draft, Photo } from "@/lib/draft";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SecondaryButton } from "@/components/ui/SecondaryButton";
import { markdownToHtmlWithPhotos, markdownToPlainText } from "@/lib/markdown";
import { copyHtmlAndText, isClipboardWriteSupported } from "@/lib/clipboard";
import { useToast } from "@/components/ui/Toast";
import { FloatingRefineMenu } from "@/components/FloatingRefineMenu";

type Props = {
  result: NonNullable<Draft["result"]>;
  photos: Photo[];
  onUpdateResult: (title: string, body: string) => void;
  onDone: () => void;
};

export function Step4Editor({ result, photos, onUpdateResult, onDone }: Props) {
  const [copyState, setCopyState] = useState<"idle" | "ok" | "fail">("idle");
  const [showFallback, setShowFallback] = useState(false);
  const toast = useToast();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selection, setSelection] = useState<{ start: number; end: number; text: string } | null>(
    null,
  );
  const [refining, setRefining] = useState(false);
  const [prevBody, setPrevBody] = useState<string | null>(null);

  function handleSelect() {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    if (start === end) {
      setSelection(null);
      return;
    }
    const text = result.bodyMarkdown.slice(start, end);
    if (text.trim().length < 5) {
      setSelection(null);
      return;
    }
    setSelection({ start, end, text });
  }

  async function applyRefine(instruction: string) {
    if (!selection) return;
    setRefining(true);
    setPrevBody(result.bodyMarkdown);

    try {
      const res = await fetch("/api/refine", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fullBody: result.bodyMarkdown,
          selection: { text: selection.text },
          instruction,
        }),
      });
      if (!res.ok || !res.body) throw new Error("수정 실패");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let replaced = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        replaced += decoder.decode(value, { stream: true });
        const newBody =
          result.bodyMarkdown.slice(0, selection.start) +
          replaced +
          result.bodyMarkdown.slice(selection.end);
        onUpdateResult(result.title, newBody);
      }
      toast.show("success", "수정 완료. 되돌리기 버튼으로 원래대로");
      setSelection(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "수정 실패";
      toast.show("error", msg);
      if (prevBody !== null) onUpdateResult(result.title, prevBody);
    } finally {
      setRefining(false);
    }
  }

  function undoRefine() {
    if (prevBody !== null) {
      onUpdateResult(result.title, prevBody);
      setPrevBody(null);
      toast.show("success", "되돌렸습니다");
    }
  }

  const html = useMemo(
    () => markdownToHtmlWithPhotos(result.bodyMarkdown, photos),
    [result.bodyMarkdown, photos],
  );
  const plain = useMemo(() => markdownToPlainText(result.bodyMarkdown), [result.bodyMarkdown]);

  async function handleCopy() {
    const titleHtml = `<h1>${escapeHtml(result.title)}</h1>\n`;
    const fullHtml = titleHtml + html;
    const fullText = result.title + "\n\n" + plain;

    if (!isClipboardWriteSupported()) {
      setShowFallback(true);
      try {
        await downloadPhotosZip();
      } catch {
        /* ignore */
      }
      return;
    }

    try {
      await copyHtmlAndText(fullHtml, fullText);
      setCopyState("ok");
      toast.show("success", "복사됨! 네이버 블로그 PC 웹 에디터에 Ctrl+V 하세요");
      setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("fail");
      setShowFallback(true);
      toast.show("error", "클립보드 복사 실패. 아래에서 직접 복사하세요");
    }
  }

  async function downloadPhotosZip() {
    const zip = new JSZip();
    for (let i = 0; i < photos.length; i++) {
      const p = photos[i];
      const match = p.dataUrl.match(/^data:image\/[a-z]+;base64,(.+)$/);
      if (!match) continue;
      const ext = p.dataUrl.includes("image/png") ? "png" : "jpg";
      zip.file(`photo-${i + 1}.${ext}`, match[1], { base64: true });
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "photos.zip";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="px-4 md:px-8 pb-32">
      <div className="sticky top-12 z-20 bg-stone-50/95 backdrop-blur -mx-4 md:-mx-8 px-4 md:px-8 py-2 border-b border-stone-200 flex gap-2 justify-end">
        <PrimaryButton onClick={handleCopy}>
          {copyState === "ok" ? (
            <>
              <Check className="h-4 w-4" /> 복사됨
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" /> 복사하기
            </>
          )}
        </PrimaryButton>
        <SecondaryButton onClick={downloadPhotosZip}>
          <Download className="h-4 w-4 inline mr-1" /> 사진 ZIP
        </SecondaryButton>
      </div>

      <div className="mt-4 space-y-3">
        <label className="block text-sm font-medium text-stone-700">제목</label>
        <Input
          value={result.title}
          onChange={(e) => onUpdateResult(e.target.value, result.bodyMarkdown)}
          className="text-lg font-semibold"
        />

        <label className="block text-sm font-medium text-stone-700 mt-4">본문 (마크다운)</label>
        <Textarea
          ref={textareaRef}
          value={result.bodyMarkdown}
          onChange={(e) => onUpdateResult(result.title, e.target.value)}
          onMouseUp={handleSelect}
          onTouchEnd={handleSelect}
          onKeyUp={handleSelect}
          rows={20}
          className="font-mono text-sm"
        />

        <details open className="mt-4 bg-white border border-stone-200 rounded-xl p-4">
          <summary className="cursor-pointer text-sm font-medium">▼ 미리보기</summary>
          <div
            className="prose prose-stone max-w-none mt-3"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </details>

        <details className="bg-white border border-stone-200 rounded-xl p-4">
          <summary className="cursor-pointer text-sm font-medium">
            사진 모음 ({photos.length}장)
          </summary>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3">
            {photos.map((p, i) => (
              <div key={p.id} className="relative">
                <img src={p.dataUrl} alt="" className="w-full aspect-square object-cover rounded" />
                <span className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-black/60 text-white text-xs flex items-center justify-center">
                  {i + 1}
                </span>
              </div>
            ))}
          </div>
        </details>

        {showFallback && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm text-amber-900 font-medium">
              클립보드 자동 복사가 실패했습니다. 아래 텍스트를 직접 선택해서 복사하세요.
            </p>
            <textarea
              readOnly
              value={result.title + "\n\n" + plain}
              className="w-full mt-2 p-2 border border-amber-300 rounded font-mono text-xs"
              rows={10}
              onFocus={(e) => e.target.select()}
            />
          </div>
        )}

        <div className="pt-6">
          <SecondaryButton fullWidth onClick={onDone}>
            완료 (처음으로)
          </SecondaryButton>
        </div>
      </div>

      {selection && !refining && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-30 px-4 w-full max-w-md">
          <FloatingRefineMenu
            selectedText={selection.text}
            onApply={applyRefine}
            onCancel={() => setSelection(null)}
          />
        </div>
      )}

      {prevBody !== null && !refining && (
        <button
          type="button"
          onClick={undoRefine}
          className="fixed bottom-4 left-4 z-30 px-3 py-1.5 text-xs bg-stone-900 text-white rounded-lg shadow-lg"
        >
          ⤺ 되돌리기
        </button>
      )}
    </div>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c] as string));
}
