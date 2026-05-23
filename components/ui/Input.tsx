import { forwardRef } from "react";

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  error?: boolean;
};

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { error = false, className = "", ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      {...rest}
      className={[
        "w-full h-12 px-4 rounded-lg border bg-white text-base text-stone-900 placeholder-stone-400",
        "focus:outline-none focus:ring-2",
        error
          ? "border-red-500 focus:border-red-500 focus:ring-red-100"
          : "border-stone-200 focus:border-amber-500 focus:ring-amber-100",
        className,
      ].join(" ")}
    />
  );
});
