"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Search, MapPin, Loader2, ChevronRight } from "lucide-react";
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
  const gpsPhotos = photos.filter((p) => p.gps);
  const photoGps = getMedianGps(photos);
  const hasGps = !!photoGps;

  const [tab, setTab] = useState<"gps" | "manual">(hasGps ? "gps" : "manual");
  const [gpsResults, setGpsResults] = useState<PlaceResult[]>([]);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [placed, setPlaced] = useState(!!storeInfo.name);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    if (hasGps) loadGpsResults();
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
    setSearchResults([]);
  }

  function clearPlace() {
    onChangeStore({ ...storeInfo, name: undefined, address: undefined, phone: undefined, hours: undefined });
    setPlaced(false);
    setSearchQuery("");
    setSearchResults([]);
  }

  function handleSearchInput(q: string) {
    setSearchQuery(q);
    updateStore("name", q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch("/api/search-place", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q }),
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setSearchResults(data.results ?? []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 800);
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
        <>
          <Card>
            <div className="space-y-3">
              <label className="block text-sm font-medium text-stone-700">장소 찾기</label>

              {/* 라디오 탭 */}
              <div className="grid grid-cols-2 gap-2">
                <RadioTab
                  active={tab === "gps"}
                  disabled={!hasGps}
                  onClick={() => hasGps && setTab("gps")}
                  icon={<MapPin className="h-4 w-4" />}
                  label="사진 위치로 찾기"
                  sub={hasGps ? `${gpsPhotos.length}장 GPS 감지` : "GPS 없음"}
                />
                <RadioTab
                  active={tab === "manual"}
                  onClick={() => setTab("manual")}
                  icon={<Search className="h-4 w-4" />}
                  label="직접 입력"
                  sub="이름으로 검색"
                />
              </div>

              {/* GPS 탭 내용 */}
              {tab === "gps" && (
                <div>
                  {gpsLoading ? (
                    <div className="flex items-center gap-2 py-6 text-sm text-stone-500 justify-center">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      근처 장소 검색 중...
                    </div>
                  ) : gpsResults.length === 0 ? (
                    <div className="py-4 text-center text-sm text-stone-500">
                      <p>주변 장소를 찾지 못했습니다</p>
                      <button
                        type="button"
                        onClick={() => setTab("manual")}
                        className="mt-2 text-amber-600 font-medium hover:underline text-xs"
                      >
                        직접 입력으로 전환
                      </button>
                    </div>
                  ) : (
                    <PlaceList results={gpsResults} onSelect={selectPlace} />
                  )}
                </div>
              )}

              {/* 직접 입력 탭 내용 */}
              {tab === "manual" && (
                <div className="space-y-2">
                  <div className="relative">
                    <Input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearchInput(e.target.value)}
                      placeholder="가게/장소 이름을 입력하세요"
                      autoFocus
                    />
                    {searching && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-stone-400" />
                      </div>
                    )}
                  </div>

                  {searchResults.length > 0 && (
                    <PlaceList results={searchResults} onSelect={selectPlace} />
                  )}

                  {searchQuery.trim().length >= 2 && !searching && searchResults.length === 0 && (
                    <p className="text-xs text-stone-400 text-center py-2">검색 결과가 없습니다. 아래에서 직접 입력하세요.</p>
                  )}
                </div>
              )}

              {/* 건너뛰기 */}
              <div className="flex items-center gap-3 text-xs text-stone-400 pt-1">
                <div className="flex-1 border-t border-stone-200" />
                <button type="button" onClick={() => setPlaced(true)} className="hover:text-stone-600">
                  건너뛰기 (AI가 추측)
                </button>
                <div className="flex-1 border-t border-stone-200" />
              </div>
            </div>
          </Card>

          {/* 직접 입력 시 나머지 필드 */}
          {tab === "manual" && (
            <Card>
              <div className="space-y-3">
                <Field label="위치 (선택)">
                  <Input
                    type="text"
                    value={storeInfo.address ?? ""}
                    onChange={(e) => updateStore("address", e.target.value)}
                    placeholder="예: 서울 강남구 / 구매처 / 위치"
                  />
                </Field>
                <Field label="날짜">
                  <Input type="date" value={storeInfo.visitDate ?? today} onChange={(e) => updateStore("visitDate", e.target.value)} />
                </Field>
                <Field label="주문/구매/체험 항목">
                  <Textarea value={storeInfo.menu ?? ""} onChange={(e) => updateStore("menu", e.target.value)} placeholder="예: 갈비탕 1 / 에어팟 프로 2 / 콘서트 R석" rows={3} />
                </Field>
              </div>
            </Card>
          )}
        </>
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
                <button type="button" onClick={clearPlace} className="text-xs text-amber-600 hover:underline shrink-0">
                  변경
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-sm text-stone-500">장소 미선택 (AI가 추측)</span>
                <button type="button" onClick={() => setPlaced(false)} className="text-xs text-amber-600 hover:underline">
                  선택하기
                </button>
              </div>
            )}

            <Field label="날짜">
              <Input type="date" value={storeInfo.visitDate ?? today} onChange={(e) => updateStore("visitDate", e.target.value)} />
            </Field>
            <Field label="주문/구매/체험 항목">
              <Textarea value={storeInfo.menu ?? ""} onChange={(e) => updateStore("menu", e.target.value)} placeholder="예: 갈비탕 1 / 에어팟 프로 2 / 콘서트 R석" rows={3} />
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

function RadioTab({
  active,
  disabled,
  onClick,
  icon,
  label,
  sub,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center gap-1 py-3 rounded-lg border-2 transition-all text-center ${
        active
          ? "border-amber-500 bg-amber-50"
          : disabled
            ? "border-stone-200 bg-stone-50 opacity-50 cursor-not-allowed"
            : "border-stone-200 hover:border-stone-300"
      }`}
    >
      <div className={active ? "text-amber-600" : "text-stone-400"}>{icon}</div>
      <div className={`text-xs font-medium ${active ? "text-amber-700" : "text-stone-600"}`}>{label}</div>
      <div className="text-[10px] text-stone-400">{sub}</div>
    </button>
  );
}

function PlaceList({ results, onSelect }: { results: PlaceResult[]; onSelect: (p: PlaceResult) => void }) {
  return (
    <div className="rounded-lg border border-stone-200 overflow-hidden">
      {results.map((r, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSelect(r)}
          className="w-full text-left px-4 py-3 hover:bg-amber-50 border-b border-stone-100 last:border-b-0 transition-colors flex items-center gap-3"
        >
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm">{r.name}</div>
            {r.address && <div className="text-xs text-stone-500 mt-0.5 truncate">{r.address}</div>}
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
  );
}

function Field({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-stone-700 mb-1.5">{label}</label>
      {children}
      {help && <p className="text-xs text-stone-500 mt-1">{help}</p>}
    </div>
  );
}

function getMedianGps(photos: Photo[]): { lat: number; lng: number } | null {
  const coords = photos.filter((p) => p.gps).map((p) => p.gps!);
  if (coords.length === 0) return null;
  if (coords.length === 1) return coords[0];
  const sorted = (arr: number[]) => [...arr].sort((a, b) => a - b);
  const median = (arr: number[]) => {
    const s = sorted(arr);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  };
  return {
    lat: median(coords.map((c) => c.lat)),
    lng: median(coords.map((c) => c.lng)),
  };
}
