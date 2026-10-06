"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="bottom-center"
      toastOptions={{
        classNames: {
          toast:
            "!rounded-2xl !bg-ink !text-white !border-0 !shadow-float !font-sans !text-[14px] !px-4 !py-3 !gap-2.5",
          description: "!text-white/70",
          actionButton: "!bg-white !text-ink !rounded-full !font-medium",
        },
      }}
    />
  );
}
