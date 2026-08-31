-- Bohrungstypen für den Zuschnittskonfigurator: neue Tabelle, admin-editierbar.
-- Einmalig im Supabase SQL-Editor ausführen (Projekt axwgistssiqkuvhcdcam).
-- Muster identisch zu pricing_components (öffentlich lesbar, nur Admin schreibt).
-- Gefahrlos erneut ausführbar (IF NOT EXISTS / DROP POLICY IF EXISTS / ON CONFLICT).

-- Voraussetzung für die Admin-Schreibrechte unten: app_role-Enum, user_roles-Tabelle
-- und has_role()-Funktion. Diese sollten laut Migrationshistorie bereits existieren
-- (werden auch von AdminUsers.tsx und pricing_components genutzt) — hier trotzdem
-- idempotent mit angelegt, falls das auf diesem Projekt (noch) nicht der Fall ist
-- ("relation public.user_roles does not exist"). Bereits vorhandene Objekte bleiben
-- unangetastet (CREATE TYPE nur bei Fehlen, CREATE TABLE/POLICY mit IF NOT EXISTS).
do $$ begin
  create type public.app_role as enum ('admin', 'user');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

drop policy if exists "Users can read their own roles" on public.user_roles;
create policy "Users can read their own roles" on public.user_roles
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Admins can read all roles" on public.user_roles;
create policy "Admins can read all roles" on public.user_roles
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can insert roles" on public.user_roles;
create policy "Admins can insert roles" on public.user_roles
  for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can update roles" on public.user_roles;
create policy "Admins can update roles" on public.user_roles
  for update to authenticated
  using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can delete roles" on public.user_roles;
create policy "Admins can delete roles" on public.user_roles
  for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- Falls noch kein einziger Admin existiert, kommt niemand mehr rein (has_role() liefert
-- für jeden false) — die INSERT-Policy oben würde sich selbst blockieren. Deshalb hier
-- den allerersten Admin gezielt freischalten: eigene Supabase-Auth-User-ID unten eintragen
-- (Auth → Users im Supabase-Dashboard) und die Zeile einmalig auskommentieren/ausführen.
-- insert into public.user_roles (user_id, role) values ('DEINE-USER-UUID-HIER', 'admin')
--   on conflict (user_id, role) do nothing;

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

-- Alter Katalog entfernt (durch den unten stehenden ersetzt) — falls dieses Skript
-- schon einmal mit dem alten Stand gelaufen ist, hier aufräumen.
delete from public.hole_types where id in ('d55', 'd85', 'm6-thread', 'm8-thread');

-- Seed: aktueller Katalog (Stufenbohrungen + zwei Durchgangsbohrungs-Festmaße).
-- "Durchgangsbohrung/Gewindebohrung nach Wunsch" sind clientseitig fest hinterlegt
-- (kein fester Durchmesser, daher nicht Teil dieser Tabelle).
-- UPSERT (nicht nur "bei Fehlen einfügen"): bereits vorhandene Zeilen aus einem
-- früheren, älteren Lauf dieses Skripts werden auf die aktuellen Maße/Labels
-- nachgezogen statt stehen zu bleiben. Änderungen, die später über die
-- "Bohrungstypen"-Admin-Oberfläche gemacht werden, bitte NICHT durch erneutes
-- Ausführen dieses Skripts überschreiben.
insert into public.hole_types (id, label_de, diameter_mm, sort_order) values
  ('step-m5', 'Stufenbohrung M5 (Ø10/5,5)',  10.0, 10),
  ('step-m6', 'Stufenbohrung M6 (Ø11/6,6)',  11.0, 20),
  ('step-m8', 'Stufenbohrung M8 (Ø15/9)',    15.0, 30),
  ('d45',     'Durchgangsbohrung D4,5 mm',   4.5,  40),
  ('d75',     'Durchgangsbohrung D7,5 mm',   7.5,  50)
on conflict (id) do update set
  label_de = excluded.label_de,
  diameter_mm = excluded.diameter_mm,
  sort_order = excluded.sort_order,
  active = true;
