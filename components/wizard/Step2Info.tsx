"use client";
import { useState, useEffect, useCallback } from "react";
import { Search, MapPin, Loader2, Pencil, ChevronRight } from "lucide-react";
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

type InputMode = "pick" | "search" | "manual" | null;

type Props = {
  storeInfo: StoreInfo;
  topicHint: string;
  photos: Photo[];
  onChangeStore: (info: StoreInfo) => void;
  onChangeTopic: (topic: string) => void;
  onNext: () => void;
};

export function Step2Info({ storeInfo, topicHint, photos, onChangeStore, onChangeTopic, onNext }: Props) {
  const [mode, setMode] = useState<InputMode>(null);
  const [gpsResults, setGpsResults] = useState<PlaceResult[]>([]);
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [placed, setPlaced] = useState(false);

  const photoGps = photos.find((p) => p.gps)?.gps ?? null;

  const loadGpsResults = useCallback(async () => {
    if (!photoGps) return;
    setGpsLoading(true);
    try {
      const res = await fetch("/api/search-place", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: photoGps.lat, lng: photoGps.lng }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setGpsResults(data.results ?? []);
    } catch {
      setGpsResults([]);
    } finally {
      setGpsLoading(false);
    }
  }, [photoGps?.lat, photoGps?.lng]);

  useEffect(() => {
    if (storeInfo.name) {
      setPlaced(true);
      return;
    }
    if (photoGps) {
      loadGpsResults();
    }
  }, []);

  function handleNext() {
    if (!topicHint.trim()) {
      const ok = confirm("주제 메모가 비어 있습니다. AI 가 사진만 보고 추측하면 품질이 떨어집니다. 그래도 진행할까요?");
      if (!ok) return;
    }
    onNext();
  }

  function updateStore<K extends keyof StoreInfo>(key: K, value: StoreInfo[K]) {
    onChangeStore({ ...storeInfo, [key]: value });
  }

  function selectPlace(place: PlaceResult) {
    onChangeStore({
      ...storeInfo,
      name: place.name,
      address: place.address,
      phone: place.phone || undefined,
      hours: place.hours || undefined,
    });
    setPlaced(true);
    setMode(null);
  }

  function clearPlace() {
    onChangeStore({ ...storeInfo, name: undefined, address: undefined, phone: undefined, hours: undefined });
    setPlaced(false);
    setMode(null);
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch("/api/search-place", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSearchResults(data.results ?? []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  function startManual() {
    setMode("manual");
    setPlaced(true);
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="px-4 md:px-8 pb-32 space-y-4">
      <div>
        <h2 className="text-xl font-semibold mb-1">리뷰 대상 정보를 알려주세요</h2>
        <p className="text-sm text-stone-600">비워두면 AI 가 추측합니다</p>
      </div>

      {/* === 장소 선택 영역 === */}
      {!placed ? (
        <Card>
          <div className="space-y-3">
            <label className="block text-sm font-medium text-stone-700">장소 선택</label>

            {/* GPS 추천 */}
            {(gpsLoading || gpsResults.length > 0) && (
              <div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 mb-2">
                  <MapPin className="h-3.5 w-3.5" />
                  사진 위치 기반 추천
                </div>
                {gpsLoading ? (
                  <div className="flex items-center gap-2 py-3 text-sm text-stone-500 justify-center">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    근처 장소 검색 중...
                  </div>
                ) : (
                  <div className="rounded-lg border border-emerald-200 overflow-hidden">
                    {gpsResults.map((r, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => selectPlace(r)}
                        className="w-full text-left px-4 py-3 hover:bg-emerald-50 border-b border-emerald-100 last:border-b-0 transition-colors flex items-center gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{r.name}</div>
                          <div className="text-xs text-stone-500 mt-0.5 truncate">{r.address}</div>
                          {(r.phone || r.hours) && (
                            <div className="text-xs text-stone-400 mt-0.5 truncate">
                              {[r.phone, r.hours].filter(Boolean).join(" · ")}
                            </div>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-stone-300 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 구분선 */}
            {gpsResults.length > 0 && (
              <div className="flex items-center gap-3 text-xs text-stone-400">
                <div className="flex-1 border-t border-stone-200" />
                또는
                <div className="flex-1 border-t border-stone-200" />
              </div>
            )}

            {/* 검색 / 직접입력 버튼 */}
            {mode !== "search" ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMode("search")}
                  className="flex-1 flex items-center justify-center gap-2 h-11 rounded-lg border border-stone-200 hover:bg-stone-50 text-sm font-medium transition-colors"
                >
                  <Search className="h-4 w-4 text-amber-500" />
                  이름으로 검색
                </button>
                <button
                  type="button"
                  onClick={startManual}
                  className="flex-1 flex items-center justify-center gap-2 h-11 rounded-lg border border-stone-200 hover:bg-stone-50 text-sm font-medium transition-colors"
                >
                  <Pencil className="h-4 w-4 text-stone-400" />
                  직접 입력
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="가게/장소 이름 입력"
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleSearch}
                    disabled={searching || !searchQuery.trim()}
                    className="shrink-0 h-11 w-11 rounded-lg bg-amber-500 text-white flex items-center justify-center hover:bg-amber-600 disabled:bg-stone-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </button>
                </div>
                {searching && (
                  <div className="flex items-center gap-2 py-3 text-sm text-stone-500 justify-center">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    검색 중...
                  </div>
                )}
                {!searching && searchResults.length > 0 && (
                  <div className="rounded-lg border border-stone-200 overflow-hidden">
                    {searchResults.map((r, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => selectPlace(r)}
                        className="w-full text-left px-4 py-3 hover:bg-amber-50 border-b border-stone-100 last:border-b-0 transition-colors flex items-center gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{r.name}</div>
                          <div className="text-xs text-stone-500 mt-0.5 truncate">{r.address}</div>
                          {(r.phone || r.hours) && (
                            <div className="text-xs text-stone-400 mt-0.5 truncate">
                              {[r.phone, r.hours].filter(Boolean).join(" · ")}
                            </div>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-stone-300 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => { setMode(null); setSearchResults([]); }}
                  className="text-xs text-stone-400 hover:text-stone-600"
                >
                  ← 돌아가기
                </button>
              </div>
            )}

            {/* 건너뛰기 */}
            <button
              type="button"
              onClick={() => setPlaced(true)}
              className="w-full text-center text-xs text-stone-400 hover:text-stone-600 py-1"
            >
              건너뛰기 (AI가 추측)
            </button>
          </div>
        </Card>
      ) : (
        /* === 장소 선택 완료 후 === */
        <Card>
          <div className="space-y-3">
            {storeInfo.name ? (
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-medium text-stone-700">{storeInfo.name}</div>
                  {storeInfo.address && <div className="text-xs text-stone-500 mt-0.5">{storeInfo.address}</div>}
                  {(storeInfo.phone || storeInfo.hours) && (
                    <div className="text-xs text-stone-400 mt-0.5">
                      {[storeInfo.phone, storeInfo.hours].filter(Boolean).join(" · ")}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={clearPlace}
                  className="text-xs text-amber-600 hover:underline shrink-0"
                >
                  변경
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-sm text-stone-500">장소 미선택 (AI가 추측)</span>
                <button
                  type="button"
                  onClick={() => setPlaced(false)}
                  className="text-xs text-amber-600 hover:underline"
                >
                  선택하기
                </button>
              </div>
            )}

            {mode === "manual" && (
              <>
                <Field label="이름">
                  <Input
                    type="text"
                    value={storeInfo.name ?? ""}
                    onChange={(e) => updateStore("name", e.target.value)}
                    placeholder="예: ○○ 가게 / ○○ 제품 / ○○ 장소"
                    autoFocus
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
              </>
            )}

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
      )}

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
