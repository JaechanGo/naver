import { Loader2 } from "lucide-react";

type Props = {
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
};

const SIZE_MAP = {
  xs: "h-3 w-3",
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-8 w-8",
};

export function Spinner({ size = "md", className = "" }: Props) {
  return <Loader2 className={`animate-spin ${SIZE_MAP[size]} ${className}`} />;
}
