# Verification record — reconstructed application

Date: 2026-09-12. This report concerns the new reconstruction, not the lost admin application's earlier test session.

## Overall status

The complete public + admin source is implemented in one repository and builds successfully. Local automated tests and real read-only Supabase checks pass. **The reconstructed application has not completed the live authenticated browser workflow and is not yet certified ready for a live release.**

No deployment was performed. No database schema, RLS policy, bucket configuration, existing product, admin account or live website was changed during reconstruction. The existing test product remains untouched.

## Completed checks

| Check | Result and scope |
| --- | --- |
| TypeScript and production build | PASS. Four HTML entries and bundled public/admin assets produced together. |
| Source completeness | PASS. Auth, dashboard, inventory, editor, categories, settings, integration utilities, image utility, original public pages/assets and both SQL migrations are present. |
| Public design preservation | PASS by source comparison: original public CSS byte-identical; original page structures/branding retained. New controls and detail-page wiring are additive. Visual browser comparison remains pending. |
| Local routes | PASS HTTP checks for `/`, `/contact.html`, `/catalog/test-slug`, `/admin`, `/admin/products/new`, `/admin/categories`, `/admin/settings`, `/admin/reset-password`. Route shell checks are not login tests. |
| PostgreSQL/security tests | PASS: 13 tests apply both original migrations in PGlite with Auth/Storage table stand-ins, then test authorization, draft visibility, CRUD, IDs, ordering, publication, availability, shared-image protection, cleanup, categories and settings. |
| Compression utility | PASS: 2 tests cover MIME/original-size validation, 1800px dimensions, WebP quality setting and bitmap release using deterministic canvas stand-ins. Real browser pixel output remains pending. |
| Source integrity checks | PASS: 5 tests verify public stylesheet/layout markers, combined build entries/source presence, empty env template and isolated anonymous client. |
| Live test database structure | PASS read-only inspection: all six tables have RLS enabled; 19 categories and 145 reserved IDs exist. |
| Live Storage configuration | PASS read-only inspection: private `product-images`, 5 MB, JPEG/PNG/WebP, existing read/upload/delete policies. |
| Live anonymous Data API | PASS through reconstructed utilities: categories, settings and existing published product read successfully. |
| Live search/filter/detail data | PASS: costume ID search combined with category and availability, and product lookup by slug. |
| Live image reads | PASS: all three existing product image signed URLs returned HTTP 200 with nonempty image content. This is a download/read test, not an upload test. |
| Live anonymous save rejection | PASS: product-save RPC denied for anonymous client. |
| Dependency audit | PASS: `npm audit --omit=dev --audit-level=high` reported zero vulnerabilities. |

The live checks targeted only the already-designated TEST project using its publishable key; environment values are excluded from the export.

## Outstanding acceptance tests

| Feature | Remaining verification |
| --- | --- |
| Admin sign-in and denied non-admin UI | Real browser sign-in with configured admin; verify another signed-in non-admin is denied. Database denial is locally tested. |
| Dashboard, add/edit/delete/duplicate | Full browser interaction with real authenticated Supabase requests. Corresponding SQL behavior is tested locally. |
| Multiple images, compression, ordering and cover | Real browser selection/compression/upload; save; inspect generated images and cover publicly. |
| Availability/public refresh | Verify real authenticated edit and automatic update in a separate signed-out browser. |
| Cleanup | Real Storage deletion after final product reference is removed, plus retry after an interrupted request. Local policy/reference behavior passed. |
| Categories and settings | Save through actual browser forms; confirm public updates. |
| Mobile | Inspect at 375px/390px; use every form/navigation/photo/save control and confirm no horizontal overflow. CSS is responsive, but this is not a visual test pass. |
| Recovery | Deliver a real reset email and let the user enter/submit the new password manually, then verify login. |
| Public visual behaviour | Browser rendering, clicking search/filters, gallery navigation, keyboard/focus and contact-page display. Real API checks do not establish visual behaviour. |

## Browser limitation encountered

The first local preview attempt using `--host 0.0.0.0` encountered `uv_interface_addresses returned Unknown system error 1` in this execution environment. A localhost-bound preview started, and same-process HTTP route checks succeeded. However, the Cloud Browser could not reach the local origin: `net::ERR_CONNECTION_REFUSED` at `http://terminal.local:4173/`, including one retry. No deployment or external tunnel was created to work around this limitation.

Use the acceptance workflow in `DEPLOYMENT.md` locally or on a separate user-created Vercel test deployment. Do not mark this report fully passed until the actual authenticated browser and mobile checks are completed.

## Known operational limits

- Storage cleanup is separate from the atomic database save. Failures are visible and retriable; the local retry queue is not a server-wide orphan scanner. Abruptly abandoned uploads on another device may require manual cleanup after checking references.
- Signed URLs already issued can remain valid until their 10-minute expiry after unpublishing.
- Product detail content is client-rendered. Unavailable products display a friendly unavailable state; the static host serves the route shell with HTTP 200. This is not server-rendered SEO metadata.
- No live product data, Auth users, passwords or Storage object bytes are included as a backup. They remain in the selected Supabase project.
