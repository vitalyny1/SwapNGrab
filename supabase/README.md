# SwapNGrab database setup

SwapNGrab uses Supabase (PostgreSQL + Auth + Storage).

## 1. Create the Supabase project

1. Go to https://supabase.com/dashboard and sign in or create an account.
2. Select **New project**.
3. Name it **SwapNGrab**.
4. Choose a strong database password and save it somewhere secure.
5. Select a region close to your expected users (for a US launch, a US region is a sensible starting point).
6. Wait until the project is ready.

## 2. Create the database tables

1. Open the new project.
2. In the left menu, open **SQL Editor**.
3. Choose **New query**.
4. Open `supabase/migrations/202611140001_initial_schema.sql` in this repository.
5. Copy the entire SQL file into the SQL Editor and click **Run**.
6. Check that the query completes successfully.

This migration creates:
- `profiles` — public profile details only; email addresses are not exposed.
- `listings` — HAVE/WANT listings, one of the launch categories (`item`, `service_skill`, `space`), location coordinates, status and timestamps.
- `listing_images` — photo metadata.
- Row-level security so visitors can browse active listings and signed-in users can manage only their own listings.
- A `listing-photos` storage bucket with uploads restricted to each user's own folder.
- A blank WANT value is normalized to NULL, representing “open to any offer.”
- Supabase Auth user creation automatically creates a matching `profiles` row. Login, signup, password reset and email verification are handled by Supabase Auth when we connect the website.

## 3. Connect the website (next development step)

In Supabase, open **Project Settings → API** (or **API Keys**, depending on the dashboard version). We will need:
- Project URL
- Publishable/anon key

These are intended for browser use when Row Level Security is enabled. **Never share or put the service_role/secret key in website code, GitHub, or a chat.**

SwapNGrab's frontend now uses the project URL and publishable key in `assets/app.js`. The publishable key is designed to be public; database access is protected by Row Level Security. Never put the `service_role` or `sb_secret_...` key in website code, GitHub, or a chat.\n\nThe website uses Supabase Auth for email/password registration and login, reads active listings from the database, and allows signed-in users to publish offers and upload listing photos. Contact-owner messaging is a later feature and is not yet enabled.
