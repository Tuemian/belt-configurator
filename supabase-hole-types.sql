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

-- Alter Katalog entfernt (durch den unten stehenden ersetzt) — falls dieses Skript
-- schon einmal mit dem alten Stand gelaufen ist, hier aufräumen. Admin-Anpassungen an
-- den NEUEN Zeilen (nach diesem Lauf) bleiben bei erneutem Ausführen unangetastet,
-- da der ON CONFLICT unten nur bei fehlender Zeile einfügt, nicht überschreibt.
delete from public.hole_types where id in ('d55', 'd85', 'm6-thread', 'm8-thread');

-- Seed: aktueller Katalog (Stufenbohrungen + zwei Durchgangsbohrungs-Festmaße).
-- "Durchgangsbohrung/Gewindebohrung nach Wunsch" sind clientseitig fest hinterlegt
-- (kein fester Durchmesser, daher nicht Teil dieser Tabelle).
insert into public.hole_types (id, label_de, diameter_mm, sort_order) values
  ('step-m5', 'Stufenbohrung M5 (Ø9,5/4,2)', 9.5,  10),
  ('step-m6', 'Stufenbohrung M6 (Ø11/5,0)',  11.0, 20),
  ('step-m8', 'Stufenbohrung M8 (Ø14/6,8)',  14.0, 30),
  ('d45',     'Durchgangsbohrung D4,5 mm',   4.5,  40),
  ('d75',     'Durchgangsbohrung D7,5 mm',   7.5,  50)
on conflict (id) do nothing;
