import { afterEach, describe, expect, it } from "vitest";
import { estimateCostUsd } from "@/lib/ai/pricing";
import { normalizeAnalysis } from "@/lib/ai/schemas";
import { can, maxActiveTours } from "@/lib/plans";
import { categoryFromName, tokenize, uniqueRoomName } from "@/lib/rooms";
import { slugify, validateSlug } from "@/lib/slug";
import { ctaHref, propertyFacts, roomSlugs, videoEmbed } from "@/lib/tour";
import { pickCoverFrom } from "@/lib/data/derive";
import type { RoomDTO } from "@/lib/data/types";

describe("slugs", () => {
  it("slugifies titles", () => {
    expect(slugify("Modern 3-Bedroom Chicago Home")).toBe("modern-3-bedroom-chicago-home");
    expect(slugify("  Café & Bar — Rooftop!! ")).toBe("cafe-and-bar-rooftop");
    expect(slugify("Owner's Suite")).toBe("owners-suite");
    expect(slugify("!!!")).toBe("tour");
  });

  it("validates custom slugs", () => {
    expect(validateSlug("maple-street")).toBeNull();
    expect(validateSlug("ab")).not.toBeNull();
    expect(validateSlug("-leading")).not.toBeNull();
    expect(validateSlug("double--dash")).not.toBeNull();
    expect(validateSlug("Upper")).not.toBeNull();
    expect(validateSlug("admin")).toMatch(/reserved/);
  });
});

describe("room names", () => {
  it.each([
    ["kitchen-2.jpg", "kitchen"],
    ["Master Bath.jpeg", "bathroom"],
    ["master-suite-3.jpg", "primary_bedroom"],
    ["Primary Bedroom", "primary_bedroom"],
    ["bedroom2.png", "bedroom"],
    ["Great Room", "living_room"],
    ["front-exterior-dusk.jpg", "exterior"],
    ["back deck.jpg", "patio"],
    ["powder room.jpg", "bathroom"],
    ["IMG_4032.JPG", null],
    ["DSC09912.jpg", null],
  ])("%s → %s", (name, expected) => {
    expect(categoryFromName(name)).toBe(expected);
  });

  it("tokenizes and joins word pairs", () => {
    expect(tokenize("great room.jpg")).toEqual(["great", "room", "greatroom"]);
  });

  it("de-duplicates room names case-insensitively", () => {
    expect(uniqueRoomName("Bedroom", ["Kitchen"])).toBe("Bedroom");
    expect(uniqueRoomName("Bedroom", ["bedroom", "Bedroom 2"])).toBe("Bedroom 3");
  });
});

describe("AI normalization", () => {
  it("clamps and cleans model output", () => {
    const n = normalizeAnalysis({
      index: 1,
      category: "kitchen",
      confidence: 94,
      image_type: "interior",
      is_panorama: false,
      features: ["Kitchen island", "  ", "Pendant lighting", "a", "b", "c", "d"],
      caption: "Bright kitchen",
      quality: 140.6,
    });
    expect(n.confidence).toBeCloseTo(0.94);
    expect(n.quality).toBe(100);
    expect(n.features).toEqual(["kitchen island", "pendant lighting", "a", "b", "c", "d"]);
  });

  it("estimates cost per model", () => {
    expect(estimateCostUsd("claude-haiku-4-5", 1_000_000, 0)).toBeCloseTo(1);
    expect(estimateCostUsd("claude-opus-5-5", 0, 1_000_000)).toBeCloseTo(20);
    expect(estimateCostUsd("claude-haiku-4-5", 10_000, 1_000)).toBeCloseTo(0.015);
  });
});

describe("tour helpers", () => {
  it("builds privacy-friendly video embeds", () => {
    expect(videoEmbed("https://www.youtube.com/watch?v=abc123")).toEqual({
      kind: "iframe",
      src: "https://www.youtube-nocookie.com/embed/abc123?rel=0",
    });
    expect(videoEmbed("https://youtu.be/xyz")?.src).toContain("/embed/xyz");
    expect(videoEmbed("https://vimeo.com/123456789")?.src).toBe("https://player.vimeo.com/video/123456789?dnt=1");
    expect(videoEmbed("https://cdn.example.com/walk.mp4")).toEqual({ kind: "file", src: "https://cdn.example.com/walk.mp4" });
    expect(videoEmbed("not a url")).toBeNull();
    expect(videoEmbed("https://example.com/page")).toBeNull();
  });

  it("builds CTA links", () => {
    expect(ctaHref({ enabled: true, label: "Email", type: "email", value: "a@b.co" }, "Home")).toBe(
      "mailto:a@b.co?subject=Inquiry%3A%20Home",
    );
    expect(ctaHref({ enabled: true, label: "Call", type: "phone", value: "(312) 555-0142" }, "Home")).toBe("tel:3125550142");
    expect(ctaHref({ enabled: true, label: "Book", type: "url", value: "calendly.com/x" }, "Home")).toBe("https://calendly.com/x");
    expect(ctaHref({ enabled: false, label: "Book", type: "url", value: "https://x" }, "Home")).toBeNull();
  });

  it("creates unique, readable room slugs", () => {
    const rooms = [{ id: "a", name: "Bedroom" }, { id: "b", name: "Bedroom" }, { id: "c", name: "Living Room" }] as RoomDTO[];
    expect([...roomSlugs(rooms).values()]).toEqual(["bedroom", "bedroom-2", "living-room"]);
  });

  it("formats property facts", () => {
    expect(propertyFacts({ bedrooms: 3, bathrooms: 2.5, squareFeet: 2150, yearBuilt: 2019 })).toEqual([
      "3 beds",
      "2.5 baths",
      "2,150 sq ft",
      "Built 2019",
    ]);
    expect(propertyFacts({ bedrooms: 1, bathrooms: null, squareFeet: null, yearBuilt: null })).toEqual(["1 bed"]);
  });

  describe("cover photo", () => {
    const photo = (id: string, roomId: string | null, kind = "photo") => ({ id, roomId, kind, status: "ready" });
    // Upload order puts the bathroom first, as a camera roll sorted by name would.
    const media = [photo("bath-1", "bath"), photo("living-1", "living"), photo("living-2", "living"), photo("pano-1", "kitchen", "pano")];
    const rooms = [
      { id: "bath", category: "bathroom", sortOrder: 2, coverMediaId: null },
      { id: "living", category: "living_room", sortOrder: 0, coverMediaId: "living-2" },
      { id: "kitchen", category: "kitchen", sortOrder: 1, coverMediaId: null },
    ];

    it("uses the opening room's cover, not the first upload", () => {
      expect(pickCoverFrom(null, rooms, media)?.id).toBe("living-2");
    });

    it("prefers an explicit choice, then the exterior", () => {
      expect(pickCoverFrom("bath-1", rooms, media)?.id).toBe("bath-1");
      const withExterior = [...rooms, { id: "ext", category: "exterior", sortOrder: 9, coverMediaId: null }];
      expect(pickCoverFrom(null, withExterior, [...media, photo("ext-1", "ext")])?.id).toBe("ext-1");
    });

    it("never derives a flat cover from a 360° photo", () => {
      expect(pickCoverFrom(null, [{ id: "kitchen", category: "kitchen", sortOrder: 0, coverMediaId: "pano-1" }], media)?.id).not.toBe("pano-1");
      expect(pickCoverFrom(null, [], [])).toBeNull();
    });
  });
});

describe("plans", () => {
  const original = process.env.BILLING_ENABLED;
  afterEach(() => {
    process.env.BILLING_ENABLED = original;
  });

  it("unlocks everything during early access", () => {
    delete process.env.BILLING_ENABLED;
    expect(can({ plan: "free" }, "embed")).toBe(true);
    expect(maxActiveTours({ plan: "free" })).toBe(Number.POSITIVE_INFINITY);
  });

  it("gates features once billing is on", () => {
    process.env.BILLING_ENABLED = "true";
    expect(can({ plan: "free" }, "removeBranding")).toBe(false);
    expect(can({ plan: "pro" }, "removeBranding")).toBe(true);
    expect(can({ plan: "pro" }, "leadCapture")).toBe(false);
    expect(can({ plan: "business" }, "leadCapture")).toBe(true);
    expect(maxActiveTours({ plan: "free" })).toBe(1);
  });
});
