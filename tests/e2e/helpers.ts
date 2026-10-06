import { copyFileSync, mkdirSync, readdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, type APIRequestContext, type Page } from "@playwright/test";
import type { PropertyGraph } from "../../src/lib/data/types";

export const PHOTO_DIR = path.resolve("seed/demo/photos");
export const FLOOR_PLAN = path.resolve("seed/demo/floorplan.png");

export function demoPhotos(count: number): string[] {
  return readdirSync(PHOTO_DIR)
    .filter((f) => f.endsWith(".jpg"))
    .sort()
    .slice(0, count)
    .map((f) => path.join(PHOTO_DIR, f));
}

/** A realistic "camera roll": some descriptive names, some IMG_1234-style names. */
export function mixedPhotos(count: number): string[] {
  const dir = path.join(os.tmpdir(), `hometour-mixed-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  return demoPhotos(count).map((src, i) => {
    const name = i % 3 === 0 ? `IMG_${4000 + i}.jpg` : path.basename(src);
    const dest = path.join(dir, name);
    copyFileSync(src, dest);
    return dest;
  });
}

export async function getGraph(request: APIRequestContext, propertyId: string): Promise<PropertyGraph> {
  const res = await request.get(`/api/properties/${propertyId}`);
  expect(res.ok()).toBeTruthy();
  return (await res.json()) as PropertyGraph;
}

export async function createProperty(page: Page, name: string, title: string): Promise<string> {
  await page.goto("/create");
  await page.getByLabel("Property name").fill(name);
  await page.getByLabel(/^Address/).fill("123 Maple St, Evanston, IL");
  await page.locator("label").filter({ hasText: /^House$/ }).click();
  await page.getByLabel("Tour title").fill(title);
  await page.getByRole("button", { name: /Continue to floor plan/ }).click();
  await page.waitForURL(/\/app\/p\/[a-z0-9]+\/floor-plan/);
  return page.url().match(/\/app\/p\/([a-z0-9]+)\//)![1];
}

export async function uploadPhotosAndWaitForOrganize(page: Page, files: string[]) {
  await page.waitForURL(/\/photos$/);
  await page.locator('input[type="file"][multiple]').setInputFiles(files);
  await expect(page.getByText(/We.ve built your tour/)).toBeVisible({ timeout: 180_000 });
}
