type Props = { step: 1 | 2 | 3 | 4 };

export function ProgressBar({ step }: Props) {
  const dots = [1, 2, 3, 4] as const;
  return (
    <div
      role="progressbar"
      aria-valuenow={step}
      aria-valuemin={1}
      aria-valuemax={4}
      className="flex items-center justify-center gap-1 py-3"
    >
      {dots.map((d, i) => (
        <div key={d} className="flex items-center gap-1">
          <div
            className={`h-2.5 w-2.5 rounded-full transition-colors ${
              d <= step ? "bg-amber-500" : "bg-stone-300"
            }`}
          />
          {i < 3 && (
            <div
              className={`h-0.5 w-6 md:w-8 transition-colors ${
                d < step ? "bg-amber-500" : "bg-stone-300"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
