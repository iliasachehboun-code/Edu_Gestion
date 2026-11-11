import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandLogo({
  className,
  size = "md",
  priority = false,
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
  priority?: boolean;
}) {
  const sizes = {
    sm: { box: "h-9 w-9", px: 36 },
    md: { box: "h-11 w-11", px: 44 },
    lg: { box: "h-16 w-16 sm:h-20 sm:w-20", px: 80 },
  }[size];

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-line",
        sizes.box,
        className
      )}
    >
      <Image
        src="/edu-gestion-mark.svg"
        alt="Edu Gestion"
        width={sizes.px}
        height={sizes.px}
        priority={priority}
        className="h-full w-full object-cover"
      />
    </span>
  );
}
