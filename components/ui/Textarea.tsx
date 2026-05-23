import { forwardRef } from "react";

type Props = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: boolean;
};

export const Textarea = forwardRef<HTMLTextAreaElement, Props>(function Textarea(
  { error = false, className = "", ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      {...rest}
      className={[
        "w-full px-4 py-3 rounded-lg border bg-white text-base text-stone-900 placeholder-stone-400",
        "leading-relaxed resize-none min-h-[120px]",
        "focus:outline-none focus:ring-2",
        error
          ? "border-red-500 focus:border-red-500 focus:ring-red-100"
          : "border-stone-200 focus:border-amber-500 focus:ring-amber-100",
        className,
      ].join(" ")}
    />
  );
});
