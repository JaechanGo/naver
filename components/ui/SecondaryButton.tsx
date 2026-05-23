"use client";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: "md" | "lg";
  fullWidth?: boolean;
};

export function SecondaryButton({
  size = "md",
  fullWidth = false,
  children,
  className = "",
  ...rest
}: Props) {
  const height = size === "lg" ? "h-14 text-lg" : "h-12 text-base";
  const width = fullWidth ? "w-full" : "";

  return (
    <button
      {...rest}
      className={[
        height,
        width,
        "px-6 rounded-xl font-medium",
        "bg-white border border-stone-200 text-stone-900",
        "hover:bg-stone-50 hover:border-stone-300 active:bg-stone-100",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300 focus-visible:ring-offset-2",
        "transition-colors duration-150",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}
