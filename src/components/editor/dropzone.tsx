"use client";

import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Drag-and-drop + click-to-browse file target. Works with the native mobile photo picker. */
export function Dropzone({
  onFiles,
  accept,
  multiple = true,
  children,
  className,
  disabled,
  label = "Upload files",
}: {
  onFiles: (files: File[]) => void;
  accept: string;
  multiple?: boolean;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  label?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const depth = useRef(0);

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      aria-disabled={disabled}
      onClick={() => !disabled && input.current?.click()}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          input.current?.click();
        }
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        depth.current++;
        setOver(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => {
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) setOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        depth.current = 0;
        setOver(false);
        if (disabled) return;
        const files = Array.from(e.dataTransfer.files);
        if (files.length) onFiles(multiple ? files : files.slice(0, 1));
      }}
      className={cn(
        "relative cursor-pointer rounded-3xl border-2 border-dashed transition-all duration-200",
        over ? "scale-[1.01] border-ink bg-sunken" : "border-line-strong bg-surface hover:border-ink-4 hover:bg-sunken/40",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      <input
        ref={input}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (files.length) onFiles(files);
        }}
      />
      {children}
    </div>
  );
}
