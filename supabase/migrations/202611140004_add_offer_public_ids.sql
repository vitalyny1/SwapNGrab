-- Give every offer a permanent, human-readable unique ID.
create sequence if not exists public.listing_public_id_seq;

alter table public.listings
  add column if not exists public_id text;

update public.listings
set public_id =
  to_char(created_at, 'YYYYMMDD HH24MISS') || ' ' ||
  lpad(nextval('public.listing_public_id_seq')::text, 4, '0')
where public_id is null;

alter table public.listings
  alter column public_id set default (
    to_char(clock_timestamp(), 'YYYYMMDD HH24MISS') || ' ' ||
    lpad(nextval('public.listing_public_id_seq')::text, 4, '0')
  ),
  alter column public_id set not null;

create unique index if not exists listings_public_id_uidx
  on public.listings(public_id);

notify pgrst, 'reload schema';
