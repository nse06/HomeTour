"use client";

import { useEffect } from "react";
import { trackOncePerSession } from "@/lib/analytics/client";
import type { EventType } from "@/lib/analytics/events";

export function TrackOnce({ event }: { event: EventType }) {
  useEffect(() => {
    trackOncePerSession(event);
  }, [event]);
  return null;
}
