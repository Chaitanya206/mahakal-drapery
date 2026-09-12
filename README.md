# Mahakal Drapery — public catalogue + admin inventory

This is the reconstructed combined application, based on the preserved public website. The admin implementation was rebuilt; it is not a recovery of the lost admin UI. See `VERIFICATION.md` for completed checks and outstanding live/browser tests.

Start with **DEPLOYMENT.md**. This is one Vite + React + TypeScript project. It is not a Next.js application and needs no Next.js middleware, Astra runtime, Cloudflare worker, custom API server or service-role key. Supabase provides Auth, the Data API, PostgreSQL RPC functions and private Storage.

## Run

1. Install Node.js 22.12 or newer.
2. Run `npm ci`.
3. Copy `.env.example` to `.env.local` and configure your Supabase URL and publishable key.
4. Run `npm run dev` and open the printed local URL.
5. Build with `npm run build`. Deploy the resulting `build/` output using the included Vercel configuration.

## Source map

- `index.html`, `contact.html`, `styles.css`: preserved public layout and stylesheet, with additive data wiring and controls.
- `product.html`, `src/public.js`, `src/public-extra.css`, `src/shop.js`: live catalogue, search/filtering, product detail route, galleries and shared shop information.
- `src/admin/`: protected administration, login/reset, dashboard, inventory, editor, category and settings forms.
- `src/api.ts`, `src/types.ts`, `src/images.ts`: Supabase access, authorization checks, refresh, concurrency handling, image signing/upload/compression/cleanup.
- `public/assets/`: original logo and assets. Historic demo photographs are retained as source assets, not automatically assigned to inventory.
- `supabase/migrations/`: both original migrations, recovered verbatim from the saved setup document. These define the only database architecture.
- `tests/`: local PostgreSQL/security, compression utility and source-preservation checks.
- `scripts/check-test-project.mjs`: optional read-only live Supabase checks using your local environment; no login or mutations.
- `dist/`, `data/`, `docs/PUBLIC-BASELINE.md`: preserved older public baseline and ID registry for reference/comparison. **Do not deploy `dist/`**; the combined application's output is `build/`.
- `scripts/export-project.py`: produces a credential-free ZIP from the committed combined source. The older public-only download generator is not part of the current workflow.

## Editing stock

Use `/admin`. Add/edit photos and details, choose category and availability, then enable Publish. The first photo is the cover. A duplicate starts as a draft with a fresh permanent ID, and may share its source's photos. Deleting one duplicate does not delete photos used elsewhere. Archive a category to hide it and its products publicly; IDs are never reused.

Uploads accept JPEG, PNG and WebP (up to 25 MB originals), resize to a maximum 1800-pixel edge, and use WebP when the browser supports it. Final files must fit the bucket's 5 MB limit. Up to 12 photos per product are saved in order. Use current Chrome, Edge, Firefox or Safari with Canvas, createImageBitmap and BroadcastChannel support.

Public updates use Realtime, focus refresh and a 15-second visible-page poll. Signed image URLs last 10 minutes and refresh with the data. A URL already issued can continue working until it expires after a product is unpublished; this is normal signed-URL behavior.

## Safety and recovery

The client never receives a service-role key. Actual write authorization is enforced by the preserved database/Storage RLS; hiding the admin UI alone is not the security boundary. Admin membership can only be granted outside the browser app by a project administrator.

Product writes use the existing `save_product` RPC, idempotent create request IDs and optimistic edit timestamps. Database changes and image metadata are atomic. Storage deletion is a separate operation: failures are reported and queued locally for retry from the Dashboard. Closing a tab abruptly may leave unreferenced uploads; use Retry pending cleanup on the same browser/device. The queue is browser-local and is not a global orphan-file collector. Do not run cleanup in another tab while an editor has unsaved uploads. Files still referenced in the database are protected by RLS.

Deployment and account setup are intentionally not performed by this repository. No live website has been changed.
