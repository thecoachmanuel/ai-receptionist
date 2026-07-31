import Link from "next/link";
import { cn } from "@/lib/utils";

export function BrandIcon({
  inverted = false,
  className,
}: {
  inverted?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative flex size-8 shrink-0 items-center justify-center rounded-[8px] border p-1 transition-all duration-300 group-hover:scale-105 group-hover:-rotate-2 shadow-xs",
        inverted
          ? "border-white/20 bg-white text-slate-950 shadow-white/10"
          : "border-foreground/15 bg-foreground text-background shadow-black/10",
        className,
      )}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="size-full"
      >
        {/* '1' Stem & Flag (Left Column - Represents 'One') */}
        <path
          d="M 6.2 11.2 C 6.2 11.2 8.2 9.4 10.2 7.7 C 10.7 7.3 11.5 7.6 11.5 8.3 V 24.2 C 11.5 25.2 10.7 26 9.7 26 H 7.5 C 6.5 26 5.7 25.2 5.7 24.2 V 12.2 C 5.7 11.7 5.9 11.4 6.2 11.2 Z"
          fill="currentColor"
        />

        {/* Top-Right Board Tile (Represents 'Board' panel 1) */}
        <rect
          x="14.8"
          y="7.5"
          width="11.5"
          height="8.2"
          rx="2"
          fill="currentColor"
          fillOpacity={inverted ? "0.3" : "0.35"}
        />

        {/* Status indicator on top tile */}
        <circle
          cx="22.5"
          cy="11.6"
          r="1.2"
          fill="currentColor"
          fillOpacity={inverted ? "0.9" : "0.85"}
        />

        {/* Bottom-Right Board Tile (Represents 'Board' panel 2) */}
        <rect
          x="14.8"
          y="17.5"
          width="11.5"
          height="8.5"
          rx="2"
          fill="currentColor"
          fillOpacity={inverted ? "0.75" : "0.8"}
        />
      </svg>
    </span>
  );
}

export function Brand({
  href = "/",
  inverted = false,
  className,
}: {
  href?: string;
  inverted?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("group inline-flex items-center gap-2.5", className)}
      aria-label="Oneboard home"
    >
      <BrandIcon inverted={inverted} />
      <span
        className={cn(
          "font-heading text-[1.4rem] font-semibold tracking-[-0.035em]",
          inverted && "text-white",
        )}
      >
        Oneboard
      </span>
    </Link>
  );
}

