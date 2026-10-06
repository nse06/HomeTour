"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

/** Chip-style list input: Enter or comma adds, backspace on empty removes the last chip. */
export function TagInput({
  value,
  onChange,
  placeholder,
  max = 30,
  id,
  suggestions = [],
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  max?: number;
  id?: string;
  suggestions?: string[];
}) {
  const [draft, setDraft] = useState("");
  const add = (raw: string) => {
    const tag = raw.trim().replace(/,$/, "").slice(0, 60);
    if (!tag || value.some((v) => v.toLowerCase() === tag.toLowerCase()) || value.length >= max) return;
    onChange([...value, tag]);
  };
  const unused = suggestions.filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase())).slice(0, 8);

  return (
    <div>
      <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl bg-surface px-2 py-1.5 ring-1 ring-line-strong focus-within:ring-2 focus-within:ring-ink">
        {value.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-sunken py-1 pl-2.5 pr-1.5 text-[13px] text-ink-2">
            {tag}
            <button
              type="button"
              onClick={() => onChange(value.filter((t) => t !== tag))}
              className="rounded-full p-0.5 text-ink-4 hover:bg-line hover:text-ink"
              aria-label={`Remove ${tag}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(e) => {
            const v = e.target.value;
            if (v.endsWith(",")) {
              add(v);
              setDraft("");
            } else setDraft(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(draft);
              setDraft("");
            } else if (e.key === "Backspace" && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => {
            if (draft.trim()) {
              add(draft);
              setDraft("");
            }
          }}
          placeholder={value.length ? "" : placeholder}
          className="h-8 min-w-32 flex-1 bg-transparent px-1.5 text-[15px] text-ink outline-none placeholder:text-ink-4"
        />
      </div>
      {unused.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {unused.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className={cn("rounded-full px-2.5 py-1 text-xs text-ink-3 ring-1 ring-line transition-colors hover:bg-sunken hover:text-ink")}
            >
              + {s}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
