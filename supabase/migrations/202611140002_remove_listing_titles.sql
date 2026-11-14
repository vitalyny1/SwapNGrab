-- Remove the redundant listing title field.
-- Existing offers, photos, owners, and all other listing data are preserved.

drop index if exists public.listings_title_trgm_idx;
alter table public.listings
  drop constraint if exists listings_title_not_blank;

create or replace function public.normalize_listing_want()
returns trigger
language plpgsql
as $$
begin
  new.want_text = nullif(btrim(new.want_text), '');
  new.have_text = btrim(new.have_text);
  return new;
end;
$$;

alter table public.listings
  drop column if exists title;
