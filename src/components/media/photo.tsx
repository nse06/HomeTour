/* eslint-disable @next/next/no-img-element -- variants are pre-generated at upload; next/image would re-optimize them. */
import type { CSSProperties } from "react";
import type { MediaDTO } from "@/lib/data/types";
import { cn } from "@/lib/utils";

/**
 * Responsive photo using pre-generated WebP variants + srcset, with the tiny blurred
 * preview painted underneath so slow connections never see an empty box.
 */
export function Photo({
  media,
  sizes = "100vw",
  alt = "",
  className,
  priority = false,
  fit = "cover",
  style,
  draggable,
}: {
  media: Pick<MediaDTO, "src" | "srcSet" | "blur" | "width" | "height">;
  sizes?: string;
  alt?: string;
  className?: string;
  priority?: boolean;
  fit?: "cover" | "contain";
  style?: CSSProperties;
  draggable?: boolean;
}) {
  const src = media.src.md ?? media.src.sm ?? media.src.lg ?? media.src.thumb ?? media.src.poster;
  if (!src) return <div className={cn("bg-sunken", className)} style={style} />;
  return (
    <img
      src={src}
      srcSet={media.srcSet || undefined}
      sizes={media.srcSet ? sizes : undefined}
      alt={alt}
      width={media.width ?? undefined}
      height={media.height ?? undefined}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      draggable={draggable}
      className={cn(fit === "cover" ? "object-cover" : "object-contain", className)}
      style={{
        backgroundImage: media.blur && fit === "cover" ? `url("${media.blur}")` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        ...style,
      }}
    />
  );
}
