"use client";
import { Spinner } from "./Spinner";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  size?: "md" | "lg";
  fullWidth?: boolean;
};

export function PrimaryButton({
  loading = false,
  size = "md",
  fullWidth = false,
  disabled,
  children,
  className = "",
  ...rest
}: Props) {
  const height = size === "lg" ? "h-14 text-lg" : "h-12 text-base";
  const width = fullWidth ? "w-full" : "";
  const isDisabled = disabled || loading;

  return (
    <button
      {...rest}
      disabled={isDisabled}
      className={[
        height,
        width,
        "px-6 rounded-xl font-semibold shadow-sm transition-colors duration-150",
        "bg-amber-500 text-white",
        "hover:bg-amber-600 active:bg-amber-700 active:scale-[0.98]",
        "disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed disabled:hover:bg-stone-200 disabled:active:scale-100",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2",
        "flex items-center justify-center gap-2",
        className,
      ].join(" ")}
    >
      {loading ? <Spinner size="sm" className="text-white" /> : null}
      {children}
    </button>
  );
}
