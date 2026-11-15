-- Remove listing categories from SwapNGrab.
-- Existing listings, photos, owners, and other listing data are preserved.

alter table public.listings
  drop constraint if exists listings_listing_type_check;

alter table public.listings
  drop column if exists listing_type;

-- Ask Supabase's API layer to refresh its schema cache.
notify pgrst, 'reload schema';
