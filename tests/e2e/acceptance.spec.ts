import { devices, expect, test } from "@playwright/test";
import { createProperty, FLOOR_PLAN, demoPhotos, getGraph, mixedPhotos, uploadPhotosAndWaitForOrganize } from "./helpers";

test.describe.configure({ mode: "serial" });

let slug = "";
let propertyId = "";
const CREATOR_STATE = "test-results/creator-state.json";

test("manual flow: create → floor plan → 12 photos → rooms → hotspots → descriptions → preview → publish", async ({ page }) => {
  // 1. Create a property (guest — no signup wall).
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("interactive walkthrough");
  propertyId = await createProperty(page, "Maple Street House", "Sunny 3-Bedroom Maple Street Home");

  // 2. Upload a floor plan.
  await page.locator('input[type="file"]').first().setInputFiles(FLOOR_PLAN);
  await expect(page.getByAltText("Main floor floor plan")).toBeVisible({ timeout: 60_000 });
  await page.getByRole("link", { name: /Continue to photos/ }).click();

  // 3. Upload 12 photos; sorting starts automatically when the batch finishes.
  await uploadPhotosAndWaitForOrganize(page, demoPhotos(12));
  let graph = await getGraph(page.request, propertyId);
  expect(graph.media.filter((m) => m.kind === "photo")).toHaveLength(12);
  expect(graph.rooms.length).toBeGreaterThanOrEqual(4);
  expect(graph.media.every((m) => m.roomId)).toBe(true);

  // 4. Rooms: create a room by hand and move a photo into it (correcting the sort).
  await page.getByRole("link", { name: /Review rooms/ }).click();
  await page.waitForURL(/\/rooms$/);
  await page.getByRole("button", { name: "Add room" }).first().click();
  await page.getByPlaceholder("Room name").fill("Guest Suite");
  await page.getByRole("dialog").getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();

  const kitchenPhoto = graph.media.find((m) => m.filename?.startsWith("kitchen"))!;
  const tile = page.locator(`img[src="${kitchenPhoto.src.sm}"]`).locator("xpath=ancestor::div[contains(@class,'group')][1]");
  await tile.hover();
  await tile.getByRole("button", { name: "Photo options" }).click();
  await page.getByRole("menuitem", { name: /Move to/ }).click();
  await page.getByRole("menuitem", { name: "Guest Suite" }).click();
  await expect
    .poll(async () => {
      const g = await getGraph(page.request, propertyId);
      const guest = g.rooms.find((r) => r.name === "Guest Suite");
      return g.media.find((m) => m.id === kitchenPhoto.id)?.roomId === guest?.id && Boolean(guest);
    })
    .toBe(true);

  // Rename a room inline.
  const nameInput = page.getByRole("textbox", { name: "Room name" }).filter({ hasNot: page.locator("[disabled]") }).first();
  await nameInput.fill("Front of House");
  await nameInput.press("Enter");
  await expect.poll(async () => (await getGraph(page.request, propertyId)).rooms.some((r) => r.name === "Front of House")).toBe(true);

  // 5. Hotspots: place every room on the plan.
  await page.getByRole("link", { name: /Place rooms on the plan/ }).click();
  await page.waitForURL(/\/tour$/);
  const plan = page.getByLabel("Floor plan editor").locator("> div").first();
  await expect(plan).toBeVisible();
  graph = await getGraph(page.request, propertyId);
  const toPlace = graph.rooms.filter((r) => !r.hotspot);
  const box = (await plan.boundingBox())!;
  for (const [i, room] of toPlace.entries()) {
    await page.getByRole("button", { name: room.name, exact: true }).last().click();
    const x = box.width * (0.15 + (i % 4) * 0.22);
    const y = box.height * (0.25 + Math.floor(i / 4) * 0.3);
    await plan.click({ position: { x, y } });
    await page.waitForTimeout(150);
  }
  await expect
    .poll(async () => (await getGraph(page.request, propertyId)).rooms.filter((r) => r.hotspot).length, { timeout: 20_000 })
    .toBe(toPlace.length + graph.rooms.filter((r) => r.hotspot).length);

  // 6. Edit a description by hand, then let AI draft the rest.
  await page.getByRole("button", { name: /Guest Suite/ }).first().click();
  const desc = page.getByPlaceholder(/Bright kitchen/);
  await desc.fill("Quiet guest suite with its own entrance.");
  await desc.blur();
  await expect
    .poll(async () => (await getGraph(page.request, propertyId)).rooms.find((r) => r.name === "Guest Suite")?.description)
    .toBe("Quiet guest suite with its own entrance.");
  await page.getByRole("button", { name: /Write \d+ description/ }).click();
  await expect
    .poll(async () => (await getGraph(page.request, propertyId)).rooms.filter((r) => r.descriptionSource === "ai").length, { timeout: 30_000 })
    .toBeGreaterThan(0);
  graph = await getGraph(page.request, propertyId);
  expect(graph.rooms.find((r) => r.name === "Guest Suite")?.description).toBe("Quiet guest suite with its own entrance.");

  // 7. Preview (draft, owner only).
  await page.goto(`/app/p/${propertyId}/preview`);
  await expect(page.getByText(/only you can see this/)).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sunny 3-Bedroom Maple Street Home");

  // 8. Publish.
  await page.goto(`/app/p/${propertyId}/publish`);
  await page.getByRole("button", { name: "Publish tour" }).click();
  await expect(page.getByText("Your tour is live!").first()).toBeVisible();
  graph = await getGraph(page.request, propertyId);
  expect(graph.tour.status).toBe("published");
  slug = graph.tour.slug;
  expect(slug).toBe("sunny-3-bedroom-maple-street-home");
  await page.context().storageState({ path: CREATOR_STATE });
});

test("visitor flow: public URL, hotspots, rooms, gallery, share — no login", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"]);
  const page = await ctx.newPage();
  const res = await page.goto(`/t/${slug}`);
  expect(res?.status()).toBe(200);
  expect(res?.headers()["x-frame-options"]).toBe("SAMEORIGIN");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sunny 3-Bedroom Maple Street Home");

  // Click a hotspot on the floor plan.
  const graph = await (await page.request.get(`/t/${slug}`)).text();
  expect(graph).toContain("application/ld+json");
  const pin = page.locator("#explore button[aria-pressed]").first();
  const pinName = await pin.getAttribute("aria-label");
  await pin.click();
  const dialog = page.getByRole("dialog", { name: pinName! });
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(/\?room=/);

  // Browse photos in the lightbox, then walk to the next room.
  await dialog.getByRole("button", { name: /Open photo 1 full screen/ }).click();
  await expect(page.getByRole("dialog", { name: /photos$/ })).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: /photos$/ })).toBeHidden();
  const next = dialog.getByRole("button", { name: /Next room/ });
  if (await next.isVisible()) {
    await next.click();
    await expect(page.getByRole("dialog").first()).not.toHaveAttribute("aria-label", pinName!);
  }
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // Explore list opens every room.
  const listButtons = page.locator("#explore ol button");
  const count = await listButtons.count();
  expect(count).toBeGreaterThanOrEqual(4);
  for (let i = 0; i < count; i++) {
    await listButtons.nth(i).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Close room" }).click();
  }

  // Share copies the link.
  await page.getByRole("button", { name: /Share/ }).first().click();
  await expect(page.getByText("Link copied")).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain(`/t/${slug}`);
  await ctx.close();
});

test("visitor on a phone: start the tour and swipe through rooms", async ({ browser }) => {
  const ctx = await browser.newContext({ ...devices["iPhone 13"] });
  const page = await ctx.newPage();
  await page.goto(`/t/${slug}`);
  await page.getByRole("button", { name: "Start the tour" }).tap();
  const dialog = page.getByRole("dialog").first();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/Room 1 of/)).toBeVisible();
  await dialog.getByRole("button", { name: /Next room/ }).tap();
  await expect(dialog.getByText(/Room 2 of/)).toBeVisible();
  await ctx.close();
});

test("embed is frameable, exposes no editor, and analytics recorded the visits", async ({ browser, request }) => {
  const res = await request.get(`/embed/${slug}`);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-security-policy"]).toContain("frame-ancestors *");
  expect(res.headers()["x-frame-options"]).toBeUndefined();
  const html = await res.text();
  expect(html).not.toContain("/app/p/");

  // Anonymous visitors can't reach the editor or its API.
  expect((await request.get(`/api/properties/${propertyId}`)).status()).toBe(401);

  // The owner sees the visits from the visitor tests.
  const ctx = await browser.newContext({ storageState: CREATOR_STATE });
  const page = await ctx.newPage();
  await expect
    .poll(
      async () => {
        await page.goto(`/app/p/${propertyId}/analytics`);
        const tile = page.locator("div", { has: page.getByText("Tour views", { exact: true }) }).last();
        return Number((await tile.locator("p").nth(1).textContent())?.replace(/[^0-9]/g, "") || 0);
      },
      { timeout: 20_000 },
    )
    .toBeGreaterThanOrEqual(2);
  await expect(page.getByText("Most-viewed rooms")).toBeVisible();
  await ctx.close();
});

test("AI flow: 20 mixed photos → AI sorts → review & correct → descriptions → publish", async ({ page }) => {
  const id = await createProperty(page, "Lakeview Condo", "Lakeview Condo with Terrace");
  await page.getByRole("link", { name: /Continue to photos/ }).click();
  await uploadPhotosAndWaitForOrganize(page, mixedPhotos(20));

  let graph = await getGraph(page.request, id);
  const photos = graph.media.filter((m) => m.kind === "photo");
  expect(photos).toHaveLength(20);
  expect(photos.every((m) => m.ai?.category && m.ai.confidence !== null)).toBe(true);
  expect(graph.rooms.length).toBeGreaterThanOrEqual(5);

  // Review: the AI suggestion is visible and explains itself.
  await page.getByRole("link", { name: /Review rooms/ }).click();
  await page.waitForURL(/\/rooms$/);
  const chip = page.locator('button[aria-label^="AI suggestion"]').first();
  await chip.click();
  await expect(page.getByText("Likely")).toBeVisible();
  await expect(page.getByText("Confidence")).toBeVisible();
  await page.keyboard.press("Escape");

  // Correct one photo: move it to a different room.
  const victim = graph.media.find((m) => m.filename?.startsWith("IMG_"))!;
  const target = graph.rooms.find((r) => r.id !== victim.roomId)!;
  const tile = page.locator(`img[src="${victim.src.sm}"]`).locator("xpath=ancestor::div[contains(@class,'group')][1]");
  await tile.hover();
  await tile.getByRole("button", { name: "Photo options" }).click();
  await page.getByRole("menuitem", { name: /Move to/ }).click();
  await page.getByRole("menuitem", { name: target.name, exact: true }).click();
  await expect
    .poll(async () => {
      const m = (await getGraph(page.request, id)).media.find((x) => x.id === victim.id);
      return m?.roomId === target.id && m?.roomAssignedBy === "user";
    })
    .toBe(true);

  // Re-running the organizer never undoes a user's correction.
  await page.request.post(`/api/properties/${id}/ai/organize`, { headers: { origin: new URL(page.url()).origin } });
  graph = await getGraph(page.request, id);
  expect(graph.media.find((m) => m.id === victim.id)?.roomId).toBe(target.id);

  // Generate descriptions, then publish.
  await page.goto(`/app/p/${id}/tour`);
  await page.getByRole("button", { name: /Write \d+ description/ }).click();
  await expect
    .poll(async () => (await getGraph(page.request, id)).rooms.filter((r) => r.description).length, { timeout: 30_000 })
    .toBeGreaterThanOrEqual(5);
  await page.goto(`/app/p/${id}/publish`);
  await page.getByRole("button", { name: "Publish tour" }).click();
  await expect(page.getByText("Your tour is live!").first()).toBeVisible();
  const published = await getGraph(page.request, id);
  const res = await page.request.get(`/t/${published.tour.slug}`);
  expect(res.status()).toBe(200);
});

test("seeded demo tour and marketing pages render", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /See an Example/ }).first().click();
  await page.waitForURL(/\/t\/modern-chicago-home/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Modern 3-Bedroom Chicago Home");
  await page.getByRole("button", { name: "Bathroom", exact: true }).click();
  await page.getByRole("button", { name: /360° view/ }).click();
  await expect(page.getByRole("dialog", { name: /360° view/ })).toBeVisible();
  for (const path of ["/pricing", "/interactive-floor-plan", "/airbnb-virtual-tour", "/sitemap.xml", "/robots.txt"]) {
    const r = await page.request.get(path);
    expect(r.status(), path).toBe(200);
  }
  expect((await page.request.get("/not-a-real-landing-page")).status()).toBe(404);
});
