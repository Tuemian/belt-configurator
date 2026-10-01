-- Tortechnik-Konfigurator: Tabelle für eingehende Anfragen (Schnelllauftore).
-- Einmalig im Supabase SQL-Editor ausführen (Projekt axwgistssiqkuvhcdcam — bei Zugriff über
-- den Supabase-Login "nichts", stattdessen über Lovable -> Supabase-Tab öffnen, siehe frühere
-- Erfahrung mit supabase-hole-types.sql).
-- Gefahrlos erneut ausführbar (CREATE TABLE IF NOT EXISTS).
-- Schema identisch zu den bestehenden belt_inquiries/profile_inquiries
-- (supabase/migrations/20260428213803_*.sql) — bewusst OHNE die reference-Spalten/Sequenz-
-- Integration der beiden anderen Tabellen (Scope-Cut für v1, siehe Umsetzungsplan).

create table if not exists public.door_inquiries (
  id uuid not null default gen_random_uuid() primary key,
  created_at timestamptz not null default now(),
  lang text not null default 'de',
  name text not null,
  company text,
  email text not null,
  phone text,
  message text,
  configuration jsonb not null default '{}'::jsonb,
  summary_text text,
  pdf_filename text
);

alter table public.door_inquiries enable row level security;

drop policy if exists "No public read on door_inquiries" on public.door_inquiries;
create policy "No public read on door_inquiries"
  on public.door_inquiries for select
  using (false);

create index if not exists idx_door_inquiries_created_at on public.door_inquiries(created_at desc);
