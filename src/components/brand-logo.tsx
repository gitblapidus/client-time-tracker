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
    sm: { width: 40, height: 40, className: "h-9 w-9" },
    md: { width: 160, height: 160, className: "h-24 w-24" },
    lg: { width: 220, height: 220, className: "h-28 w-28" },
  };
  const config = sizes[size];

  return (
    <Image
      src="/dss-partners-logo.png"
      alt="DSS Partners"
      width={config.width}
      height={config.height}
      priority={priority}
      className={cn("object-contain", config.className, className)}
    />
  );
}
