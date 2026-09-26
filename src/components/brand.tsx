import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * BrandIcon — renders just the Qwilo logo mark (square icon only).
 * Kept for backwards-compat with any callers that use BrandIcon directly.
 */
export function BrandIcon({
  inverted = false,
  className,
}: {
  inverted?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center", className)} aria-hidden="true">
      <Image
        src={
          inverted
            ? "/images/brand/qwilo-mark-white.png"
            : "/images/brand/qwilo-mark.png"
        }
        alt="Qwilo"
        width={32}
        height={32}
        className="h-8 w-auto"
        priority
      />
    </span>
  );
}

/**
 * Brand — full Qwilo logo (wordmark).
 * - Light / white backgrounds  → dark navy logo  (qwilo-logo.png)
 * - Dark / inverted backgrounds → all-white logo (qwilo-logo-white.png)
 */
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
      className={cn("group inline-flex items-center", className)}
      aria-label="Qwilo home"
    >
      <Image
        src={
          inverted
            ? "/images/brand/qwilo-logo-white.png"
            : "/images/brand/qwilo-logo.png"
        }
        alt="Qwilo"
        width={120}
        height={40}
        className="h-8 w-auto transition-opacity group-hover:opacity-80"
        priority
      />
    </Link>
  );
}
