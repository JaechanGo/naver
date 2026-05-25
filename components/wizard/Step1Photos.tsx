"use client";
import { useRef, useState } from "react";
import { ImagePlus, Camera } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy } from "@dnd-kit/sortable";
import type { Photo } from "@/lib/draft";
import { resizeImageToDataUrl, dataUrlByteLength } from "@/lib/imageResize";
import { extractGps } from "@/lib/exif";
import { PhotoTile } from "@/components/PhotoTile";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { useToast } from "@/components/ui/Toast";

const MAX_TOTAL_BYTES = 5 * 1024 * 1024;
const MAX_PHOTOS_WARN = 10;

type Props = {
  photos: Photo[];
  onChange: (photos: Photo[]) => void;
  onNext: () => void;
};

export function Step1Photos({ photos, onChange, onNext }: Props) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const toast = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const newPhotos: Photo[] = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      try {
        const [dataUrl, gps] = await Promise.all([
          resizeImageToDataUrl(file),
          extractGps(file),
        ]);
        newPhotos.push({ id: crypto.randomUUID(), dataUrl, gps: gps ?? undefined });
      } catch {
        toast.show("error", `사진 ${file.name} 처리 실패`);
      }
    }

    const combined = [...photos, ...newPhotos];
    const totalBytes = combined.reduce((s, p) => s + dataUrlByteLength(p.dataUrl), 0);
    if (totalBytes > MAX_TOTAL_BYTES) {
      toast.show("error", "사진 용량이 너무 큽니다. 일부를 줄이거나 삭제하세요.");
      return;
    }
    if (combined.length > MAX_PHOTOS_WARN) {
      toast.show("warning", "권장 10장까지입니다");
    }

    onChange(combined);
  }

  function handleDelete(id: string) {
    onChange(photos.filter((p) => p.id !== id));
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = photos.findIndex((p) => p.id === active.id);
    const newIndex = photos.findIndex((p) => p.id === over.id);
    onChange(arrayMove(photos, oldIndex, newIndex));
  }

  function saveNote(id: string, note: string) {
    onChange(photos.map((p) => (p.id === id ? { ...p, userNote: note } : p)));
    setEditingNote(null);
  }

  return (
    <div className="px-4 md:px-8 pb-32">
      <h2 className="text-xl font-semibold mb-1">사진을 올려주세요</h2>
      <p className="text-sm text-stone-600 mb-4">사진을 모두 한 번에 올려주세요. 1~10장 권장</p>

      <div className="border-2 border-dashed border-stone-300 rounded-xl bg-white h-32 md:h-40 flex flex-col items-center justify-center gap-2 mb-4 hover:border-amber-500 hover:bg-amber-50 transition-colors">
        <ImagePlus className="h-6 w-6 text-amber-500" />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            className="px-3 py-1.5 text-sm rounded-lg bg-stone-100 hover:bg-stone-200"
          >
            갤러리에서 선택
          </button>
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="px-3 py-1.5 text-sm rounded-lg bg-stone-100 hover:bg-stone-200 flex items-center gap-1"
          >
            <Camera className="h-4 w-4" /> 카메라
          </button>
        </div>
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {photos.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={photos.map((p) => p.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3" role="list">
              {photos.map((p, i) => (
                <PhotoTile
                  key={p.id}
                  photo={p}
                  index={i}
                  onDelete={() => handleDelete(p.id)}
                  onEditNote={() => setEditingNote(p.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {editingNote && (
        <NoteModal
          initial={photos.find((p) => p.id === editingNote)?.userNote ?? ""}
          onSave={(note) => saveNote(editingNote, note)}
          onCancel={() => setEditingNote(null)}
        />
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-stone-50/95 backdrop-blur border-t border-stone-200 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
        <PrimaryButton
          fullWidth
          size="lg"
          disabled={photos.length === 0}
          onClick={onNext}
        >
          다음
        </PrimaryButton>
      </div>
    </div>
  );
}

function NoteModal({
  initial,
  onSave,
  onCancel,
}: {
  initial: string;
  onSave: (note: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <div className="fixed inset-0 z-40 bg-black/40 flex items-end md:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-4">
        <h3 className="text-lg font-semibold mb-2">사진 메모</h3>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="예: 이건 ○○ / 갈비탕 / 에어팟"
          className="w-full min-h-[80px] px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-100 focus:border-amber-500"
          autoFocus
        />
        <div className="flex gap-2 mt-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 h-11 rounded-lg border border-stone-200 hover:bg-stone-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => onSave(value)}
            className="flex-1 h-11 rounded-lg bg-amber-500 text-white hover:bg-amber-600"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
