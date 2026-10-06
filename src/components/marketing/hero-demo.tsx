/* eslint-disable @next/next/no-img-element -- static, pre-optimized marketing assets */
"use client";

import { ArrowLeft, ArrowRight, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { HotspotPin } from "@/components/tour/hotspot-pin";
import { cn } from "@/lib/utils";

interface DemoRoom {
  name: string;
  icon: string;
  x: number;
  y: number;
  images: string[];
  text: string;
}

const ROOMS: DemoRoom[] = [
  { name: "Exterior", icon: "house", x: 0.5406, y: 0.8871, images: ["exterior", "exterior-2"], text: "Black and timber cladding framed by a mature tree, glowing at dusk." },
  { name: "Living Room", icon: "sofa", x: 0.2438, y: 0.4234, images: ["living", "living-2"], text: "A timber feature wall, a deep modular sofa and glass doors onto the deck." },
  { name: "Kitchen", icon: "chef", x: 0.5063, y: 0.4887, images: ["kitchen", "kitchen-2", "kitchen-3"], text: "Crisp white cabinetry, black pendants and an island with seating for four." },
  { name: "Dining", icon: "dining", x: 0.7656, y: 0.3823, images: ["dining", "dining-2"], text: "An open-tread staircase frames a dining area that opens to the garden." },
  { name: "Primary Bedroom", icon: "bed-double", x: 0.21, y: 0.7097, images: ["primary", "primary-2"], text: "Black-framed glass doors and a reading chair with a leafy outlook." },
  { name: "Bedroom 2", icon: "bed", x: 0.6781, y: 0.7258, images: ["bedroom"], text: "Warm timber floors, a pendant light and plenty of daylight." },
  { name: "Bathroom", icon: "bath", x: 0.4156, y: 0.6548, images: ["bathroom", "bathroom-2"], text: "A freestanding tub, twin basins and matte black tapware." },
  { name: "Patio", icon: "sun", x: 0.35, y: 0.1629, images: ["patio", "patio-2"], text: "A timber deck beside the lawn, in the shade of a mature tree." },
];

const img = (name: string, w: 480 | 960 | 1600) => `/landing/${name}-${w}.webp`;

/** The homepage's live, clickable mini-tour. Auto-plays until the visitor takes over. */
export function HeroDemo() {
  const [index, setIndex] = useState(1);
  const [auto, setAuto] = useState(true);
  const [photo, setPhoto] = useState(0);

  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % ROOMS.length);
      setPhoto(0);
    }, 3600);
    return () => clearInterval(t);
  }, [auto]);

  const room = ROOMS[index];
  const go = (i: number) => {
    setAuto(false);
    setIndex((i + ROOMS.length) % ROOMS.length);
    setPhoto(0);
  };

  return (
    <div className="overflow-hidden rounded-[28px] bg-surface shadow-float ring-1 ring-black/5">
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="h-3 w-3 rounded-full bg-[#ec6a5e]" />
          <span className="h-3 w-3 rounded-full bg-[#f4bf4f]" />
          <span className="h-3 w-3 rounded-full bg-[#61c554]" />
        </div>
        <div className="mx-auto flex min-w-0 items-center gap-1.5 rounded-full bg-sunken px-3 py-1 text-xs text-ink-3">
          <Lock className="h-3 w-3 shrink-0" />
          <span className="truncate">/t/modern-chicago-home</span>
        </div>
        <span className="hidden w-[52px] sm:block" />
      </div>

      <div className="grid lg:grid-cols-[1.3fr_1fr]">
        <div className="flex items-center bg-[#fbfaf7] p-3 sm:p-6">
          <div className="relative w-full" style={{ aspectRatio: "1600 / 1240" }}>
            <img
              src="/landing/floorplan-1400.webp"
              srcSet="/landing/floorplan-800.webp 800w, /landing/floorplan-1400.webp 1400w"
              sizes="(min-width: 1024px) 640px, 100vw"
              alt="Floor plan of the example home"
              className="absolute inset-0 h-full w-full select-none rounded-xl object-contain"
              draggable={false}
            />
            {ROOMS.map((r, i) => (
              <HotspotPin
                key={r.name}
                x={r.x}
                y={r.y}
                icon={r.icon}
                label={r.name}
                active={i === index}
                labelMode="auto"
                pulse={i === index}
                onClick={() => go(i)}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col border-t border-line p-4 sm:p-6 lg:border-l lg:border-t-0">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-sunken">
            <img
              key={`${room.name}-${photo}`}
              src={img(room.images[photo], 960)}
              srcSet={`${img(room.images[photo], 480)} 480w, ${img(room.images[photo], 960)} 960w, ${img(room.images[photo], 1600)} 1600w`}
              sizes="(min-width: 1024px) 460px, 100vw"
              alt={`${room.name} photo`}
              className="absolute inset-0 h-full w-full animate-fade-in object-cover"
            />
            <span className="absolute left-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
              {index + 1} / {ROOMS.length}
            </span>
          </div>
          <div className="mt-4 flex items-baseline justify-between gap-3">
            <h3 className="font-display text-[30px] leading-none text-ink">{room.name}</h3>
            {auto ? <span className="text-xs text-ink-4">Tap a room to explore</span> : null}
          </div>
          <p className="mt-2 min-h-12 text-[15px] leading-relaxed text-ink-3">{room.text}</p>
          <div className="mt-4 flex gap-2">
            {room.images.map((name, i) => (
              <button
                key={name}
                type="button"
                onClick={() => {
                  setAuto(false);
                  setPhoto(i);
                }}
                className={cn(
                  "relative aspect-[4/3] w-1/4 overflow-hidden rounded-lg ring-2 transition-all",
                  i === photo ? "ring-ink" : "ring-transparent opacity-80 hover:opacity-100",
                )}
                aria-label={`Show photo ${i + 1}`}
              >
                <img src={img(name, 480)} alt="" className="h-full w-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
          <div className="mt-auto flex items-center justify-between gap-2 pt-5">
            <button
              type="button"
              onClick={() => go(index - 1)}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-ink-2 transition-colors hover:bg-sunken"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="max-w-28 truncate">{ROOMS[(index - 1 + ROOMS.length) % ROOMS.length].name}</span>
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ink-2"
            >
              <span className="max-w-28 truncate">{ROOMS[(index + 1) % ROOMS.length].name}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
