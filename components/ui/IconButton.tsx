"use client";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  "aria-label": string;
};

export function IconButton({ children, className = "", ...rest }: Props) {
  return (
    <button
      {...rest}
      className={[
        "h-10 w-10 rounded-full flex items-center justify-center",
        "text-stone-600 hover:bg-stone-100 active:bg-stone-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300",
        "transition-colors duration-150",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}
