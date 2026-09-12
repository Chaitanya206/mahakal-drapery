# Deployment instructions

## 1. Install and run locally

Use Node.js 22.12+ and npm. From the extracted project directory:

```sh
npm ci
cp .env.example .env.local
npm run dev
```

On Windows PowerShell, use `Copy-Item .env.example .env.local` instead of `cp`. Fill the two variables before starting. Open the URL printed by Vite, then `/admin` for inventory management.

```sh
npm test
npm run build
npm run preview
```

`npm test` includes local PostgreSQL stand-ins for Supabase service tables. It does not prove live login or real file uploads. `npm run check:live` performs read-only Data API, filter, detail and signed-image checks against the project configured in `.env.local`.

## 2. Environment variables

| Variable | Value to configure privately in your environment |
| --- | --- |
| `VITE_SUPABASE_URL` | The URL from your intended Supabase project's Connect/API settings |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Its publishable key beginning `sb_publishable_` |

`.env.example` intentionally contains names with empty values. No password, access token, database password or service-role key is required by this app. Vite embeds these two public configuration values in the frontend at build time. Never put a secret in a `VITE_` variable. The build rejects non-publishable keys. Restart development after changes; rebuild/redeploy when changing Vercel environment values. Keep `.env.local` out of Git.

## 3. Supabase database — existing project

If your selected Supabase project already has this schema and data, **do not rerun either migration or reset the database**. The application uses the existing `admin_users`, `categories`, `costume_ids`, `products`, `product_images`, and `settings` tables and `save_product`/`is_admin` functions. Keep the existing RLS and Storage policies.

Your inventory and uploaded image bytes stay in Supabase. This source ZIP is not a database or Storage backup. Pointing to the same project retains that data; migrating to another project requires a separate database and Storage transfer. Auth users also need a separate account migration/recreation.

## 4. Supabase database — fresh project only

In the chosen fresh project's SQL Editor, run these files **once, in this order**, as the project administrator:

1. `supabase/migrations/20260911193029_catalog.sql`
2. `supabase/migrations/20260911193032_initial_collection.sql`

The first creates all tables, indexes, triggers, atomic product save RPC, RLS/grants, Realtime publication membership where available, and Storage bucket/policies. The second adds the actual shop settings, 19 categories and 145 reserved IDs. It creates no fictional inventory or prices.

If an object already exists, stop and reconcile the existing schema. Do not drop tables or weaken RLS to make the script pass. The SQL files contain explicit Data API grants, including for projects that do not automatically expose new tables. Keep `public` exposed in Data API settings; the helper schema `private` must not be exposed.

## 5. Supabase Storage

The schema migration creates `product-images` with:

- Private access (keep Public bucket disabled).
- 5 MB file size limit (`5242880` bytes).
- Allowed types: `image/webp`, `image/jpeg`, `image/png`.
- Upload paths `<authenticated-user-uuid>/<random-uuid>.<extension>`.
- Admin-only uploads in the admin's own folder.
- Reads for admins and for images attached to publicly readable published products.
- Admin deletion only when no product references the object.

Do not add blanket public read/write policies or allow upserts. The app uses unique paths and short-lived signed URLs. The first ordered image is the cover; there is no separate cover column or second image schema.

## 6. Create the first admin

1. In Supabase Authentication → Users, create the intended user with an email/password using the Dashboard's secure controls. Confirm the email using the Dashboard or normal email confirmation flow. Do not put the password in a SQL file, chat, Git or environment variables.
2. Copy that user's UUID.
3. In SQL Editor, replace the placeholder below with the actual UUID and run:

```sql
insert into public.admin_users (user_id)
values ('REPLACE_WITH_AUTH_USER_UUID'::uuid)
on conflict (user_id) do nothing;
```

The browser cannot grant itself membership. A signed-in user without this row is not an admin. Existing configured admins do not need recreation. To revoke admin privileges, remove the membership row using the project administrator tools; write policies check current membership.

## 7. Authentication settings

Enable the Email/password provider. Disable public new-user signup if it is not needed; this UI provides no registration route. Set a strong password policy (the reset UI requires at least 12 characters), and enable leaked-password protection if available on your plan.

For each environment you intend to test:

- Set Supabase Auth **Site URL** to that website's origin.
- Add the exact recovery URL, such as `http://localhost:5173/admin/reset-password`, to **Redirect URLs**. If using `127.0.0.1`, allow `http://127.0.0.1:5173/admin/reset-password` instead; match the actual printed URL/port.
- Once you have a separate Vercel test URL, add `https://YOUR-TEST-DEPLOYMENT.vercel.app/admin/reset-password`.
- Configure a verified SMTP sender for reliable recovery/confirmation email. Supabase's default mail service has recipient/rate restrictions; inspect Auth logs if no email arrives.

Forgot password on the login screen sends a reset email. Open the link, enter and confirm a new password, save, and sign in again. This app uses the Supabase browser client's default recovery URL handling, not a custom Next.js callback. Expired links require a new email. Never share recovery links or passwords in chat.

## 8. GitHub → separate Vercel deployment

1. Create a new GitHub repository and upload the entire extracted project, including `src/`, `public/`, `supabase/`, the lockfile and configuration files. Do not upload `.env.local`, `node_modules/`, `build/` or `exports/`.
2. Import that repository into a **new Vercel project**, leaving the existing live site/domain untouched.
3. Use Framework Preset **Vite**, install command `npm ci`, build command `npm run build`, output directory **build**. The included `vercel.json` specifies output and route rewrites.
4. Add both environment variables for the deployment environment you are using. Vercel preview and production environments can have different values; initially use your TEST Supabase project for the separate test deployment.
5. Deploy it yourself and configure its exact Auth recovery redirect URL in Supabase. Do not connect the live domain yet.
6. Verify direct navigation and refresh at `/admin`, `/admin/products`, `/admin/products/new`, `/admin/categories`, `/admin/settings`, and `/catalog/<product-slug>`.

This is a static multi-page Vite application with a React admin; no Next.js configuration, Node server, API route, Cloudflare or Astra dependency is needed. Supabase executes the database and authentication functionality. `dist/` is retained historical reference only and is not the current deployment output.

## 9. Required acceptance workflow before live release

On the separate deployment with TEST Supabase:

1. Confirm anonymous visitors see the catalogue/contact pages and cannot enter admin data screens or write through the Data API.
2. Sign in as the configured admin and confirm dashboard counts.
3. Create a clearly named disposable test product with two or more photos. Inspect compression, previews, alternate image ordering and Make primary. Save as a draft, verify it is hidden publicly, then publish.
4. In a signed-out browser, verify the card, details, all photos, ID search, category/availability/price/size/colour filters and pagination.
5. Edit name/price, change availability from the list, and verify public updates within 15 seconds or upon focus/refresh. Test editing from two tabs to confirm a stale save is rejected.
6. Duplicate the product. Verify a new permanent costume ID, draft status and shared images. Publish the duplicate; delete one product and confirm the other's images remain.
7. Delete the remaining disposable product and verify its now-unreferenced Storage objects are removed. Retry any reported cleanup failure from Dashboard.
8. Add/edit/archive a test category and edit shop settings. Confirm the public changes; restore your intended settings afterward.
9. Repeat admin use at 375px and 390px mobile widths. Check navigation, keyboard, all form fields, photo controls and save bar.
10. Request password recovery and complete it manually. Confirm old password no longer works and the new password does.

Keep the test report in `VERIFICATION.md` updated. Only connect a live domain after these real-browser/live-service checks pass.

## Official references

- [Vite builds](https://vite.dev/guide/build.html)
- [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite)
- [Supabase password sign-in](https://supabase.com/docs/reference/javascript/auth-signinwithpassword)
- [Supabase password recovery](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail)
- [Supabase standard uploads](https://supabase.com/docs/guides/storage/uploads/standard-uploads)
- [Explicit Data API grants](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically)
