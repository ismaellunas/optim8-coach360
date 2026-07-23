-- STORY-10.4 — marketplace supply review fields on package_metadata

alter table public.package_metadata
  add column if not exists suggested_price_cents int,
  add column if not exists price_cents int,
  add column if not exists currency text,
  add column if not exists created_by_role text;

comment on column public.package_metadata.suggested_price_cents is
  'Coach-suggested display price in minor units (OQ-4.4); admin may override via price_cents.';
comment on column public.package_metadata.price_cents is
  'Admin-finalized catalog display price in minor units.';
comment on column public.package_metadata.created_by_role is
  'Author role hint: coach | admin (OQ-4.1 both-with-approval supply model).';
