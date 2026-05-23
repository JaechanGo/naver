"use client";
import { createContext, useContext, useState, useCallback, useEffect } from "react";

type ToastKind = "success" | "error" | "warning";

type ToastItem = {
  id: number;
  kind: ToastKind;
  message: string;
};

type ToastContextType = {
  show: (kind: ToastKind, message: string) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const show = useCallback((kind: ToastKind, message: string) => {
    const id = nextId++;
    setItems((prev) => [...prev, { id, kind, message }]);
    const duration = kind === "error" ? 6000 : 4000;
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none">
        {items.map((t) => (
          <ToastView key={t.id} item={t} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastView({ item }: { item: ToastItem }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(true);
  }, []);

  const styleMap = {
    success: "bg-green-50 border-green-200 text-green-900",
    error: "bg-red-50 border-red-200 text-red-900",
    warning: "bg-amber-50 border-amber-200 text-amber-900",
  };
  const role = item.kind === "error" ? "alert" : "status";

  return (
    <div
      role={role}
      aria-live={item.kind === "error" ? "assertive" : "polite"}
      className={[
        "px-4 py-3 rounded-xl shadow-lg border max-w-md pointer-events-auto",
        "transition-all duration-200",
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2",
        styleMap[item.kind],
      ].join(" ")}
    >
      {item.message}
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
