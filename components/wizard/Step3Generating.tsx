"use client";
import { useEffect, useRef, useState } from "react";
import { Check, AlertTriangle } from "lucide-react";
import type { Draft, Photo, StoreInfo } from "@/lib/draft";
import { Spinner } from "@/components/ui/Spinner";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SecondaryButton } from "@/components/ui/SecondaryButton";
import { fetchWithRetry } from "@/lib/retry";

type Phase = "analyzing" | "generating" | "done" | "error";

type Props = {
  photos: Photo[];
  storeInfo: StoreInfo;
  topicHint: string;
  onProgress: (patch: Partial<Draft>) => void;
  onError: () => void;
  onComplete: (title: string, bodyMarkdown: string) => void;
};

export function Step3Generating({
  photos,
  storeInfo,
  topicHint,
  onProgress,
  onError,
  onComplete,
}: Props) {
  const [phase, setPhase] = useState<Phase>("analyzing");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (hasRunRef.current) return;
    hasRunRef.current = true;

    const ac = new AbortController();
    abortRef.current = ac;
    runPipeline(ac.signal).catch((e: unknown) => {
      const err = e as { name?: string; message?: string };
      if (err?.name !== "AbortError") {
        setErrorMsg(err?.message ?? "알 수 없는 오류");
        setPhase("error");
      }
    });
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runPipeline(signal: AbortSignal) {
    setPhase("analyzing");

    const ar = await fetchWithRetry(
      "/api/analyze-photos",
      {
        method: "POST",
        signal,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ photos, storeInfo, topicHint }),
        retries: 2,
      },
      (s) => s >= 500 || s === 429,
    );
    if (!ar.ok) {
      const errBody = await ar.json().catch(() => ({}));
      throw new Error(errBody.error ?? "사진 분석 실패");
    }
    const analyzed: {
      captions: { photo_id: string; caption: string; food_name_guess?: string }[];
      tone_suggestion: string;
    } = await ar.json();

    const captionMap = new Map(analyzed.captions.map((c) => [c.photo_id, c.caption]));
    const updatedPhotos = photos.map((p) => ({
      ...p,
      aiCaption: captionMap.get(p.id),
    }));
    onProgress({ photos: updatedPhotos });

    setPhase("generating");

    const gr = await fetchWithRetry(
      "/api/generate-post",
      {
        method: "POST",
        signal,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          captions: analyzed.captions,
          toneSuggestion: analyzed.tone_suggestion,
          storeInfo,
          topicHint,
        }),
        retries: 2,
      },
      (s) => s >= 500 || s === 429,
    );
    if (!gr.ok || !gr.body) {
      const errBody = await gr.json().catch(() => ({}));
      throw new Error(errBody.error ?? "본문 생성 실패");
    }

    const reader = gr.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
    }

    const lines = buffer.split("\n");
    const firstLine = lines[0]?.trim() ?? "";
    let title = "";
    let body = buffer;
    if (firstLine.startsWith("# ")) {
      title = firstLine.replace(/^#\s+/, "").trim();
      body = lines.slice(1).join("\n").trim();
    } else {
      title = (storeInfo.name ?? "리뷰") + " 후기";
    }

    setPhase("done");
    onComplete(title, body);
  }

  function cancel() {
    abortRef.current?.abort();
    onError();
  }

  if (phase === "error") {
    return (
      <div className="px-4 py-12 max-w-md mx-auto text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold">글을 만들지 못했어요</h2>
        <p className="text-sm text-stone-600 mt-2">{errorMsg}</p>
        <div className="mt-6 flex flex-col gap-2">
          <PrimaryButton onClick={() => window.location.reload()} size="lg">
            다시 시도
          </PrimaryButton>
          <SecondaryButton onClick={onError} size="lg">
            정보 수정
          </SecondaryButton>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-12 max-w-md mx-auto text-center">
      <div className="text-6xl mb-4 animate-wiggle">✨</div>
      <h2 className="text-xl font-semibold mb-6">AI 가 글을 쓰고 있어요</h2>
      <div className="space-y-2 text-left bg-white rounded-xl border border-stone-200 p-4">
        <PhaseRow
          label="사진 분석"
          done={phase === "generating" || phase === "done"}
          active={phase === "analyzing"}
        />
        <PhaseRow label="글 초안 작성" done={phase === "done"} active={phase === "generating"} />
      </div>
      <p className="text-xs text-stone-500 mt-4">약 20~40초 걸립니다</p>
      <div className="mt-6">
        <SecondaryButton onClick={cancel}>취소</SecondaryButton>
      </div>
    </div>
  );
}

function PhaseRow({ label, done, active }: { label: string; done: boolean; active: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {done ? (
        <Check className="h-4 w-4 text-green-600" />
      ) : active ? (
        <Spinner size="xs" className="text-amber-500" />
      ) : (
        <div className="h-4 w-4 rounded-full border border-stone-300" />
      )}
      <span
        className={done ? "text-stone-900" : active ? "text-amber-600 font-medium" : "text-stone-400"}
      >
        {label}
        {active ? " 중..." : done ? " 완료" : ""}
      </span>
    </div>
  );
}
