-- ============================================================================
-- 0007 — Services et gardes de la pharmacie (liste du menu « Service / garde »
--        de la Trousse de secours, modifiable dans Paramètres)
-- ============================================================================
-- Idempotente (create table if not exists, drop policy if exists + recreate) :
-- rejouable sans risque. Aucune table temporaire (compatible avec l'éditeur SQL
-- de Supabase). Les réquisitions déjà enregistrées gardent le nom du service
-- en texte : supprimer un service ne les modifie pas.
-- ============================================================================

create table if not exists public.pharmacy_kit_services (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  kind text not null default 'service'
    check (kind in ('service', 'garde')),
  notes text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists pharmacy_kit_services_name_uidx
  on public.pharmacy_kit_services (pharmacy_id, lower(btrim(name)));

alter table public.pharmacy_kit_services enable row level security;

-- Lecture : tous les membres actifs (la liste alimente le formulaire de la trousse).
drop policy if exists pharmacy_kit_services_select_by_members on public.pharmacy_kit_services;
create policy pharmacy_kit_services_select_by_members
  on public.pharmacy_kit_services as permissive for select to authenticated
  using (has_active_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'cashier'::text, 'stock_manager'::text, 'accountant'::text]));

-- Écriture : propriétaire et gérant uniquement.
drop policy if exists pharmacy_kit_services_manage_by_owners_managers on public.pharmacy_kit_services;
create policy pharmacy_kit_services_manage_by_owners_managers
  on public.pharmacy_kit_services as permissive for all to authenticated
  using (has_active_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text]))
  with check (has_active_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text]));
