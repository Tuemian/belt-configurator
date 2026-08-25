-- Bohrungstypen für den Zuschnittskonfigurator: neue Tabelle, admin-editierbar.
-- Einmalig im Supabase SQL-Editor ausführen (Projekt axwgistssiqkuvhcdcam).
-- Muster identisch zu pricing_components (öffentlich lesbar, nur Admin schreibt).
-- Gefahrlos erneut ausführbar (IF NOT EXISTS / DROP POLICY IF EXISTS / ON CONFLICT).

create table if not exists public.hole_types (
  id text primary key,
  label_de text not null,
  label_en text not null default '',
  label_it text not null default '',
  diameter_mm numeric not null,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.hole_types enable row level security;

drop policy if exists "hole_types_public_read" on public.hole_types;
create policy "hole_types_public_read"
  on public.hole_types for select
  using (active = true);

-- has_role() lässt sich aus der SQL-Konsole nicht sauber typsicher aufrufen
-- (der echte Enum-Typname weicht vom generierten TS-Typ ab). Deshalb direkt
-- gegen user_roles prüfen — ::text-Cast auf die role-Spalte funktioniert
-- unabhängig davon, ob sie ein Enum, text oder varchar ist.
drop policy if exists "hole_types_admin_write" on public.hole_types;
create policy "hole_types_admin_write"
  on public.hole_types for all
  using (exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role::text = 'admin'
  ))
  with check (exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role::text = 'admin'
  ));

-- Seed: aktuelle fest im Code hinterlegte Werte, damit sich am Verhalten
-- zunächst nichts ändert, bis ein Admin etwas anpasst.
insert into public.hole_types (id, label_de, diameter_mm, sort_order) values
  ('d55',       'D5,5 mm (Standardbohrung)',          5.5,  10),
  ('d85',       'D8,5 mm (Verbinderbohrung)',          8.5,  20),
  ('m6-thread', 'Gewinde M6',                          6.0,  30),
  ('m8-thread', 'Gewinde M8',                          8.0,  40),
  ('step-m6',   'Stufenbohrung M6 (Ø11/5,0)',          11.0, 50),
  ('step-m8',   'Stufenbohrung M8 (Ø14/6,8)',          14.0, 60)
on conflict (id) do nothing;
