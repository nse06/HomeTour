"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api-client";

export function DeleteTourButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        if (!confirm(`Delete “${name}”? Its photos and link will be removed permanently.`)) return;
        setBusy(true);
        try {
          await api.del(`/api/properties/${id}`);
          toast.success("Tour deleted");
          router.refresh();
        } catch (err) {
          toast.error(err instanceof ApiError ? err.message : "Couldn't delete the tour.");
        } finally {
          setBusy(false);
        }
      }}
      className="flex h-7 w-7 items-center justify-center rounded-full text-ink-4 transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-40"
      aria-label={`Delete ${name}`}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}
