type Props = React.HTMLAttributes<HTMLDivElement>;

export function Card({ children, className = "", ...rest }: Props) {
  return (
    <div
      {...rest}
      className={`bg-white border border-stone-200 rounded-xl p-4 md:p-6 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}
