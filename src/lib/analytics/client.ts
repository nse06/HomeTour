"use client";

import type { EventType } from "./events";

const SESSION_KEY = "ht_sid";

/** Anonymous per-tab id (sessionStorage only: no cookies, nothing persistent). */
export function getSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

export interface ClientEvent {
  tourId?: string;
  roomId?: string;
  mediaId?: string;
  source?: string;
  value?: number;
  meta?: Record<string, string | number | boolean>;
}

/** Fire-and-forget analytics. Uses sendBeacon so it survives page unloads. */
export function trackClient(type: EventType, data: ClientEvent = {}): void {
  if (typeof window === "undefined") return;
  const body = JSON.stringify({ type, sessionId: getSessionId(), ...data });
  try {
    if (navigator.sendBeacon?.("/api/events", new Blob([body], { type: "application/json" }))) return;
  } catch {
    /* fall through to fetch */
  }
  fetch("/api/events", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } }).catch(
    () => {},
  );
}

/** Tracks an event at most once per browser tab session (e.g. landing_view). */
export function trackOncePerSession(type: EventType, key: string = type, data?: ClientEvent): void {
  try {
    const flag = `ht_once:${key}`;
    if (sessionStorage.getItem(flag)) return;
    sessionStorage.setItem(flag, "1");
  } catch {
    /* storage unavailable: still track */
  }
  trackClient(type, data);
}
