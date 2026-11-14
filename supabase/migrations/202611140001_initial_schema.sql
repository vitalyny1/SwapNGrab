-- SwapNGrab initial Supabase schema
-- Run in the Supabase SQL Editor or apply with Supabase CLI.
create extension if not exists pgcrypto with schema extensions;
create extension if not exists postgis with schema extensions;
create extension if not exists pg_trgm with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  username text unique,
  city text,
  region text,
  postal_code text,
  country_code text not null default 'US',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username is null or username ~ '^[A-Za-z0-9_]{3,30}$')
);

create table if not exists public.listings (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  -- Category organizes browsing; it does not restrict cross-category matching.
  listing_type text not null default 'item'
    check (listing_type in ('item', 'service', 'skill', 'experience', 'space', 'other')),
  description text,
  have_text text not null,
  -- NULL/blank WANT means the owner is open to any offer.
  want_text text,
  city text,
  region text,
  postal_code text,
  country_code text not null default 'US',
  latitude double precision,
  longitude double precision,
  location extensions.geography(Point, 4326)
    generated always as (
      case
        when latitude is not null and longitude is not null
          then extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography
        else null
      end
    ) stored,
  status text not null default 'active'
    check (status in ('draft', 'active', 'paused', 'completed', 'removed')),
  keywords text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint listings_title_not_blank check (length(btrim(title)) > 0),
  constraint listings_have_not_blank check (length(btrim(have_text)) > 0),
  constraint listings_latitude_range check (latitude is null or latitude between -90 and 90),
  constraint listings_longitude_range check (longitude is null or longitude between -180 and 180)
);

create table if not exists public.listing_images (
  id uuid primary key default extensions.gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null unique,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists listings_owner_id_idx on public.listings(owner_id);
create index if not exists listings_status_created_idx on public.listings(status, created_at desc);
create index if not exists listings_location_gix on public.listings using gist(location);
create index if not exists listings_title_trgm_idx on public.listings using gin(title extensions.gin_trgm_ops);
create index if not exists listings_have_trgm_idx on public.listings using gin(have_text extensions.gin_trgm_ops);
create index if not exists listings_want_trgm_idx on public.listings using gin(want_text extensions.gin_trgm_ops);
create index if not exists listing_images_listing_order_idx on public.listing_images(listing_id, sort_order);

create or replace function public.normalize_listing_want()
returns trigger
language plpgsql
as $$
begin
  new.want_text = nullif(btrim(new.want_text), '');
  new.title = btrim(new.title);
  new.have_text = btrim(new.have_text);
  return new;
end;
$$;

drop trigger if exists listings_normalize_want on public.listings;
create trigger listings_normalize_want
before insert or update on public.listings
for each row execute function public.normalize_listing_want();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
drop trigger if exists listings_set_updated_at on public.listings;
create trigger listings_set_updated_at before update on public.listings
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, username)
  values (
    new.id,
    nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'username'), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.listing_images enable row level security;

drop policy if exists "Public profiles are readable" on public.profiles;
create policy "Public profiles are readable" on public.profiles
for select to anon, authenticated using (true);
drop policy if exists "Users insert own profile" on public.profiles;
create policy "Users insert own profile" on public.profiles
for insert to authenticated with check (id = (select auth.uid()));
drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles
for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "Anyone can read active listings" on public.listings;
create policy "Anyone can read active listings" on public.listings
for select to anon, authenticated using (status = 'active' or owner_id = (select auth.uid()));
drop policy if exists "Authenticated users create own listings" on public.listings;
create policy "Authenticated users create own listings" on public.listings
for insert to authenticated with check (owner_id = (select auth.uid()));
drop policy if exists "Owners update own listings" on public.listings;
create policy "Owners update own listings" on public.listings
for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
drop policy if exists "Owners delete own listings" on public.listings;
create policy "Owners delete own listings" on public.listings
for delete to authenticated using (owner_id = (select auth.uid()));

drop policy if exists "Readable listing images" on public.listing_images;
create policy "Readable listing images" on public.listing_images
for select to anon, authenticated using (
  exists (
    select 1 from public.listings l
    where l.id = listing_id and (l.status = 'active' or l.owner_id = (select auth.uid()))
  )
);
drop policy if exists "Owners add listing images" on public.listing_images;
create policy "Owners add listing images" on public.listing_images
for insert to authenticated with check (
  owner_id = (select auth.uid()) and exists (
    select 1 from public.listings l where l.id = listing_id and l.owner_id = (select auth.uid())
  )
);
drop policy if exists "Owners remove listing images" on public.listing_images;
create policy "Owners remove listing images" on public.listing_images
for delete to authenticated using (owner_id = (select auth.uid()));

-- Public bucket for listing photos. Uploads are restricted to a user's own folder:
-- listing-photos/<auth-user-uuid>/<listing-uuid>/<filename>
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-photos', 'listing-photos', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view listing photos" on storage.objects;
create policy "Public can view listing photos" on storage.objects
for select to anon, authenticated using (bucket_id = 'listing-photos');
drop policy if exists "Users upload photos to own folder" on storage.objects;
create policy "Users upload photos to own folder" on storage.objects
for insert to authenticated with check (
  bucket_id = 'listing-photos' and (storage.foldername(name))[1] = (select auth.uid())::text
);
drop policy if exists "Users update photos in own folder" on storage.objects;
create policy "Users update photos in own folder" on storage.objects
for update to authenticated using (
  bucket_id = 'listing-photos' and (storage.foldername(name))[1] = (select auth.uid())::text
) with check (
  bucket_id = 'listing-photos' and (storage.foldername(name))[1] = (select auth.uid())::text
);
drop policy if exists "Users delete photos in own folder" on storage.objects;
create policy "Users delete photos in own folder" on storage.objects
for delete to authenticated using (
  bucket_id = 'listing-photos' and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- Email addresses are deliberately not stored in public.profiles.
-- Messaging/contact relay will be added server-side so owners' email addresses stay private.
