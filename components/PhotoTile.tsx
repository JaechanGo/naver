"use client";
import { X, MessageSquare } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Photo } from "@/lib/draft";

type Props = {
  photo: Photo;
  index: number;
  onDelete: () => void;
  onEditNote: () => void;
};

export function PhotoTile({ photo, index, onDelete, onEditNote }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: photo.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="relative aspect-square rounded-lg overflow-hidden bg-stone-100 cursor-grab active:cursor-grabbing touch-none"
    >
      <img src={photo.dataUrl} alt="" className="w-full h-full object-cover" draggable={false} />
      <span className="absolute top-1 left-1 h-6 w-6 rounded-full bg-black/60 text-white text-xs font-medium flex items-center justify-center">
        {index + 1}
      </span>
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        aria-label={`사진 ${index + 1} 삭제`}
        className="absolute top-1 right-1 h-7 w-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
      >
        <X className="h-4 w-4" />
      </button>
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onEditNote();
        }}
        aria-label={`사진 ${index + 1} 메모`}
        className={`absolute bottom-1 left-1 h-7 w-7 rounded-full text-white flex items-center justify-center ${
          photo.userNote ? "bg-amber-500" : "bg-black/40"
        }`}
      >
        <MessageSquare className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
