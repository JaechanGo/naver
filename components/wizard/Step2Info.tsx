"use client";
import type { StoreInfo } from "@/lib/draft";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Card } from "@/components/ui/Card";
import { PrimaryButton } from "@/components/ui/PrimaryButton";

type Props = {
  storeInfo: StoreInfo;
  topicHint: string;
  onChangeStore: (info: StoreInfo) => void;
  onChangeTopic: (topic: string) => void;
  onNext: () => void;
};

export function Step2Info({ storeInfo, topicHint, onChangeStore, onChangeTopic, onNext }: Props) {
  function handleNext() {
    if (!topicHint.trim()) {
      const ok = confirm(
        "주제 메모가 비어 있습니다. AI 가 사진만 보고 추측하면 품질이 떨어집니다. 그래도 진행할까요?",
      );
      if (!ok) return;
    }
    onNext();
  }

  function updateStore<K extends keyof StoreInfo>(key: K, value: StoreInfo[K]) {
    onChangeStore({ ...storeInfo, [key]: value });
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="px-4 md:px-8 pb-32 space-y-4">
      <div>
        <h2 className="text-xl font-semibold mb-1">리뷰 대상 정보를 알려주세요</h2>
        <p className="text-sm text-stone-600">비워두면 AI 가 추측합니다</p>
      </div>

      <Card>
        <div className="space-y-3">
          <Field label="이름">
            <Input
              type="text"
              value={storeInfo.name ?? ""}
              onChange={(e) => updateStore("name", e.target.value)}
              placeholder="예: ○○ 가게 / ○○ 제품 / ○○ 장소"
            />
          </Field>
          <Field label="위치 (선택)">
            <Input
              type="text"
              value={storeInfo.address ?? ""}
              onChange={(e) => updateStore("address", e.target.value)}
              placeholder="예: 서울 강남구 / 구매처 / 위치"
            />
          </Field>
          <Field label="날짜">
            <Input
              type="date"
              value={storeInfo.visitDate ?? today}
              onChange={(e) => updateStore("visitDate", e.target.value)}
            />
          </Field>
          <Field label="주문/구매/체험 항목">
            <Textarea
              value={storeInfo.menu ?? ""}
              onChange={(e) => updateStore("menu", e.target.value)}
              placeholder="예: 갈비탕 1 / 에어팟 프로 2 / 콘서트 R석"
              rows={3}
            />
          </Field>
        </div>
      </Card>

      <Card>
        <Field label="주제 메모 ✨" help="비울수록 글 품질이 떨어집니다">
          <Textarea
            value={topicHint}
            onChange={(e) => onChangeTopic(e.target.value)}
            placeholder="예: 강남 한우집, 분위기 좋음, 갈비탕 추천 / 에어팟 프로 2, 노이즈 캔슬링 만족 / 등"
            rows={5}
          />
        </Field>
      </Card>

      <div className="fixed bottom-0 left-0 right-0 bg-stone-50/95 backdrop-blur border-t border-stone-200 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
        <PrimaryButton fullWidth size="lg" onClick={handleNext}>
          글 만들기
        </PrimaryButton>
      </div>
    </div>
  );
}

function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-stone-700 mb-1.5">{label}</label>
      {children}
      {help && <p className="text-xs text-stone-500 mt-1">{help}</p>}
    </div>
  );
}
