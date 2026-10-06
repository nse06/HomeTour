# HomeTour

Interactive property walkthroughs: a floor plan with clickable rooms, photo galleries, video and
360° photos, in a viewer that works beautifully on any phone. AI helps sort photos into rooms and
draft descriptions, but every suggestion is editable and the app works fully without it.

It is deliberately not a 3D/LiDAR/VR product — no special cameras, just the photos you already have.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000. `npm run dev` creates a local SQLite database in `.data/`, applies
migrations, seeds the example tour (`/t/modern-chicago-home`) and starts Next.js. No accounts or
API keys are needed. Requires Node 20.9+.

AI is optional: put `ANTHROPIC_API_KEY` in `.env.local` to sort photos and write descriptions with
Claude, or set `AI_PROVIDER=mock` for deterministic fake results. Without either, photos are sorted
using hints in their file names and you organize the rest by hand.

## Deploying to Vercel

Vercel's servers have no persistent disk, so the app needs a hosted database and media storage.
Both have free tiers and connect from the project dashboard:

1. **Database** — Storage → Turso → create a database and connect it to the project. This sets
   `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` (`DATABASE_URL` + `DATABASE_AUTH_TOKEN` work too).
2. **Media storage** — Storage → Blob → create a store with **public** access and connect it to the
   project. This sets `BLOB_READ_WRITE_TOKEN`.
3. **Redeploy.** The build checks that both are connected, applies database migrations and seeds the
   example tour. If something is missing, the build fails with a message saying exactly what.

Optional: `ANTHROPIC_API_KEY` for AI features, and `APP_URL` if you use a custom domain (share
links default to the Vercel production domain).

Good to know:
- Vercel functions accept request bodies up to 4.5 MB, so the editor re-encodes larger photos in
  the browser before uploading (to at most 3200 px, or 4096 px for 360° photos). Video files over
  that size can't be uploaded on Vercel yet — add a YouTube or Vimeo link to the room instead.
- Any other Node host works with `npm run build && npm start`: keep the defaults on a persistent
  disk, or use Turso plus an S3-compatible bucket (`STORAGE_DRIVER=s3`, e.g. Cloudflare R2).

## Configuration

Everything is optional locally; see [`.env.example`](.env.example) for the full list.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL`, `DATABASE_AUTH_TOKEN` | libSQL database (default `file:./.data/hometour.db`; `TURSO_*` also accepted) |
| `STORAGE_DRIVER` | `local`, `blob` or `s3` — defaults to Blob when a store is connected, else local disk |
| `S3_*` | Bucket, endpoint, keys and public CDN URL for `STORAGE_DRIVER=s3` |
| `APP_URL` / `NEXT_PUBLIC_APP_URL` | Public base URL for share links, QR codes and embeds |
| `ANTHROPIC_API_KEY`, `AI_PROVIDER` | AI provider (`anthropic`, `mock`, `off`) |
| `AI_MAX_SPEND_PER_PROPERTY_USD` | Hard ceiling on AI spend per property (default $1) |
| `BILLING_ENABLED` | `false` (default) unlocks every plan feature during early access |
| `ADMIN_EMAILS` | Who can open `/admin` (product funnel and AI spend) |

## How it works

- **App** — Next.js 16 (App Router, React Compiler), React 19, Tailwind CSS v4.
- **Data** — Drizzle ORM on libSQL: a SQLite file locally, Turso in production. Properties have
  floors, rooms and media; a tour holds the public slug and display settings. Migrations live in
  `drizzle/`.
- **Media** — uploads are processed with sharp into WebP variants (320–2400 px, 360° photos up to
  4096 px) with a blur placeholder and a perceptual hash for spotting near-duplicates. Originals are
  kept under unguessable keys for reprocessing and are never linked publicly. Storage drivers: local
  disk, Vercel Blob, or any S3-compatible bucket.
- **Accounts** — guest-first: anyone can build a tour immediately; signing up keeps their work.
- **AI** — a fast vision model classifies photos in small batches (downscaled copies, cached by
  content hash, with a per-property spend cap and a usage ledger). A deterministic builder then groups
  photos into rooms, picks covers and orders the walkthrough — never overriding the owner's own
  choices. Room descriptions describe only what is visible plus facts the owner entered.
- **Viewer** — `/t/[slug]` is the public tour, `/embed/[slug]` the iframe version. Rooms deep-link
  with `?room=`; 360° photos open in a lightweight WebGL viewer. Analytics are anonymous (no cookies)
  and sent with `sendBeacon`.

## Development

```bash
npm test                 # unit tests (Vitest)
npm run build && npm run test:e2e   # Playwright acceptance tests: production build, isolated DB, mock AI
npm run typecheck
npm run lint
npm run db:generate      # after editing src/lib/db/schema.ts
npm run db:seed -- --force   # rebuild the example tour
```

Set `PLAYWRIGHT_CHROMIUM_PATH` to use an already-installed Chromium for the end-to-end tests.

## Roadmap

- Direct-to-storage video uploads (Blob client uploads / S3 presigned URLs) so large videos work on
  serverless hosts.
- Build a whole tour from photos alone, and detect rooms on uploaded floor plans.
- Lead capture forms and billing (plans are already modeled in `src/lib/plans.ts`).
