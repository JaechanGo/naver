"use client";
import { useState, useEffect } from "react";
import { Search, MapPin, Loader2 } from "lucide-react";
import type { StoreInfo, Photo } from "@/lib/draft";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Card } from "@/components/ui/Card";
import { PrimaryButton } from "@/components/ui/PrimaryButton";

type PlaceResult = {
  name: string;
  address: string;
  phone: string;
  hours: string;
  category: string;
};

type Props = {
  storeInfo: StoreInfo;
  topicHint: string;
  photos: Photo[];
  onChangeStore: (info: StoreInfo) => void;
  onChangeTopic: (topic: string) => void;
  onNext: () => void;
};

export function Step2Info({ storeInfo, topicHint, photos, onChangeStore, onChangeTopic, onNext }: Props) {
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [gpsDetected, setGpsDetected] = useState(false);

  const photoGps = photos.find((p) => p.gps)?.gps ?? null;

  useEffect(() => {
    if (photoGps && !gpsDetected && !storeInfo.name) {
      setGpsDetected(true);
      searchByGps(photoGps.lat, photoGps.lng);
    }
  }, [photoGps]);

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

  async function searchByName() {
    const q = storeInfo.name?.trim();
    if (!q) return;
    setSearching(true);
    setShowResults(true);
    try {
      const res = await fetch("/api/search-place", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setResults(data.results ?? []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function searchByGps(lat: number, lng: number) {
    setSearching(true);
    setShowResults(true);
    try {
      const res = await fetch("/api/search-place", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng, query: storeInfo.name || undefined }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setResults(data.results ?? []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  function selectPlace(place: PlaceResult) {
    onChangeStore({
      ...storeInfo,
      name: place.name,
      address: place.address,
      phone: place.phone || storeInfo.phone,
      hours: place.hours || storeInfo.hours,
    });
    setShowResults(false);
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="px-4 md:px-8 pb-32 space-y-4">
      <div>
        <h2 className="text-xl font-semibold mb-1">리뷰 대상 정보를 알려주세요</h2>
        <p className="text-sm text-stone-600">비워두면 AI 가 추측합니다</p>
      </div>

      {photoGps && (
        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
          <MapPin className="h-4 w-4 shrink-0" />
          <span>사진에서 GPS 위치 감지됨</span>
          <button
            type="button"
            onClick={() => searchByGps(photoGps.lat, photoGps.lng)}
            className="ml-auto text-emerald-600 font-medium hover:underline"
          >
            다시 검색
          </button>
        </div>
      )}

      <Card>
        <div className="space-y-3">
          <Field label="이름">
            <div className="flex gap-2">
              <Input
                type="text"
                value={storeInfo.name ?? ""}
                onChange={(e) => updateStore("name", e.target.value)}
                placeholder="예: ○○ 가게 / ○○ 제품 / ○○ 장소"
                onKeyDown={(e) => e.key === "Enter" && searchByName()}
              />
              <button
                type="button"
                onClick={searchByName}
                disabled={searching || !storeInfo.name?.trim()}
                className="shrink-0 h-11 w-11 rounded-lg bg-amber-500 text-white flex items-center justify-center hover:bg-amber-600 disabled:bg-stone-300 disabled:cursor-not-allowed transition-colors"
              >
                {searching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </button>
            </div>
          </Field>

          {showResults && (
            <div className="rounded-lg border border-stone-200 overflow-hidden">
              {searching ? (
                <div className="flex items-center justify-center gap-2 py-4 text-sm text-stone-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  장소 검색 중...
                </div>
              ) : results.length === 0 ? (
                <div className="py-3 px-4 text-sm text-stone-500">검색 결과가 없습니다</div>
              ) : (
                results.map((r, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => selectPlace(r)}
                    className="w-full text-left px-4 py-3 hover:bg-amber-50 border-b border-stone-100 last:border-b-0 transition-colors"
                  >
                    <div className="font-medium text-sm">{r.name}</div>
                    <div className="text-xs text-stone-500 mt-0.5">{r.address}</div>
                    {(r.phone || r.hours) && (
                      <div className="text-xs text-stone-400 mt-0.5">
                        {r.phone && <span>{r.phone}</span>}
                        {r.phone && r.hours && <span> · </span>}
                        {r.hours && <span>{r.hours}</span>}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          )}

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
          {(storeInfo.phone || storeInfo.hours) && (
            <div className="rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-600 space-y-1">
              {storeInfo.phone && (
                <div className="flex items-center gap-2">
                  <span className="text-stone-400 text-xs font-medium w-16">전화</span>
                  <span>{storeInfo.phone}</span>
                </div>
              )}
              {storeInfo.hours && (
                <div className="flex items-center gap-2">
                  <span className="text-stone-400 text-xs font-medium w-16">영업시간</span>
                  <span>{storeInfo.hours}</span>
                </div>
              )}
            </div>
          )}
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
