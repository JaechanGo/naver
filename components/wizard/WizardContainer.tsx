"use client";
import { useEffect, useState } from "react";
import { ArrowLeft, RotateCcw, WifiOff } from "lucide-react";
import { type Draft, createEmptyDraft, readDraft, writeDraft, clearDraft } from "@/lib/draft";
import { ProgressBar } from "@/components/wizard/ProgressBar";
import { Step1Photos } from "@/components/wizard/Step1Photos";
import { Step2Info } from "@/components/wizard/Step2Info";
import { Step3Generating } from "@/components/wizard/Step3Generating";
import { Step4Editor } from "@/components/wizard/Step4Editor";
import { IconButton } from "@/components/ui/IconButton";

export function WizardContainer() {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    const existing = readDraft();
    setDraft(existing ?? createEmptyDraft());
  }, []);

  useEffect(() => {
    if (draft) writeDraft(draft);
  }, [draft]);

  if (!draft) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-stone-400">불러오는 중...</div>
      </div>
    );
  }

  function update(patch: Partial<Draft>) {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  function goBack() {
    if (draft && draft.step > 1) update({ step: (draft.step - 1) as Draft["step"] });
  }

  function reset() {
    if (!confirm("작업 중인 글이 모두 사라집니다. 처음부터 새로 작성할까요?")) return;
    clearDraft();
    setDraft(createEmptyDraft());
  }

  return (
    <main className="min-h-screen pb-32">
      {!online && (
        <div className="bg-red-50 border-b border-red-200 text-red-900 text-sm px-4 py-2 flex items-center gap-2 justify-center">
          <WifiOff className="h-4 w-4" /> 오프라인 — 인터넷 연결 확인
        </div>
      )}
      <header className="sticky top-0 z-30 bg-stone-50/80 backdrop-blur border-b border-stone-200">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-4 h-12">
          <IconButton aria-label="뒤로" onClick={goBack} disabled={draft.step === 1}>
            <ArrowLeft className="h-5 w-5" />
          </IconButton>
          <ProgressBar step={draft.step} />
          <IconButton aria-label="처음부터" onClick={reset}>
            <RotateCcw className="h-5 w-5" />
          </IconButton>
        </div>
      </header>

      <div className="max-w-2xl mx-auto pt-4">
        {draft.step === 1 && (
          <Step1Photos
            photos={draft.photos}
            onChange={(photos) => update({ photos })}
            onNext={() => update({ step: 2 })}
          />
        )}
        {draft.step === 2 && (
          <Step2Info
            storeInfo={draft.storeInfo}
            topicHint={draft.topicHint}
            onChangeStore={(storeInfo) => update({ storeInfo })}
            onChangeTopic={(topicHint) => update({ topicHint })}
            onNext={() => update({ step: 3 })}
          />
        )}
        {draft.step === 3 && (
          <Step3Generating
            photos={draft.photos}
            storeInfo={draft.storeInfo}
            topicHint={draft.topicHint}
            onProgress={(patch) => update(patch)}
            onError={() => update({ step: 2 })}
            onComplete={(title, bodyMarkdown) =>
              update({
                step: 4,
                result: { title, bodyMarkdown, generatedAt: new Date().toISOString() },
              })
            }
          />
        )}
        {draft.step === 4 && draft.result && (
          <Step4Editor
            result={draft.result}
            photos={draft.photos}
            onUpdateResult={(title, bodyMarkdown) =>
              update({ result: { ...draft.result!, title, bodyMarkdown } })
            }
            onDone={() => {
              clearDraft();
              setDraft(createEmptyDraft());
            }}
          />
        )}
      </div>
    </main>
  );
}
