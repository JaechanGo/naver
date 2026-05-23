"use client";
import { useState } from "react";
import { Sparkles, X } from "lucide-react";

type QuickAction = { label: string; instruction: string };

const QUICK_ACTIONS: QuickAction[] = [
  { label: "더 친근하게", instruction: "더 친근하고 캐주얼한 말투로 다시 써줘" },
  { label: "더 짧게", instruction: "내용을 유지하면서 더 짧게 줄여줘" },
  { label: "더 자세히", instruction: "묘사를 더 풍부하고 자세하게 보강해줘" },
  { label: "묘사 강화", instruction: "감각적 묘사(맛·향·촉감·분위기 등)를 더 강화해줘" },
];

type Props = {
  selectedText: string;
  onApply: (instruction: string) => void;
  onCancel: () => void;
};

export function FloatingRefineMenu({ selectedText, onApply, onCancel }: Props) {
  const [custom, setCustom] = useState("");

  return (
    <div
      role="dialog"
      aria-label="텍스트 수정 옵션"
      className="bg-white rounded-2xl shadow-lg border border-stone-200 p-3 w-full max-w-sm"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1 text-sm font-medium text-amber-700">
          <Sparkles className="h-4 w-4" /> 선택 영역 수정
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label="닫기"
          className="text-stone-500 hover:text-stone-900"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="text-xs text-stone-500 mb-2 line-clamp-2 italic">"{selectedText}"</div>

      <div className="flex flex-wrap gap-2 mb-3">
        {QUICK_ACTIONS.map((a) => (
          <button
            key={a.label}
            type="button"
            onClick={() => onApply(a.instruction)}
            className="px-3 py-1.5 rounded-full bg-stone-100 text-sm font-medium hover:bg-amber-100 active:bg-amber-200"
          >
            {a.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="직접 지시하기..."
          className="flex-1 h-10 px-3 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-100 focus:border-amber-500"
          onKeyDown={(e) => {
            if (e.key === "Enter" && custom.trim()) onApply(custom.trim());
          }}
        />
        <button
          type="button"
          disabled={!custom.trim()}
          onClick={() => onApply(custom.trim())}
          className="h-10 px-3 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 disabled:bg-stone-200 disabled:text-stone-400"
        >
          적용
        </button>
      </div>
    </div>
  );
}
