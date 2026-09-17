-- ============================================================================
-- Abonnements des pharmacies (gérés par le Super Admin)
-- ============================================================================
-- Contexte : le Super Admin doit pouvoir octroyer un abonnement (1, 3, 6, 12
-- mois ou personnalisé) à chaque pharmacie, et en bloquer une pour lui couper
-- l'accès à la plateforme. Côté pharmacie, un menu « Abonnement » doit
-- afficher le nombre de jours restants et les moyens de paiement configurés
-- par le Super Admin (mobile money, virement, carte bancaire).
--
-- Sécurité : l'application vérifie déjà côté client (DashboardShell), mais
-- la vraie barrière est ici, dans les policies RLS et les fonctions
-- SECURITY DEFINER utilisées par les RPC métier (create_sale,
-- add_product_batch, correct_batch_quantity, remove_batch_from_sale...) :
-- une pharmacie bloquée/expirée ne doit plus pouvoir lire ni écrire ses
-- données métier (produits, stock, ventes, clients, dépenses, fournisseurs),
-- que l'appel passe par une requête directe (RLS) ou par une RPC
-- (SECURITY DEFINER, qui contourne la RLS et doit donc vérifier elle-même).
--
-- Important : les tables « structurelles » (pharmacies, pharmacy_members,
-- pharmacy_settings) restent lisibles via has_pharmacy_role() (INCHANGÉ),
-- pas via la nouvelle has_active_pharmacy_role() : sinon une pharmacie
-- bloquée deviendrait invisible pour ses propres membres et sa page
-- « Abonnement » ne pourrait plus jamais s'afficher ni leur dire pourquoi.
--
-- Cette migration est idempotente (create table if not exists, drop policy
-- if exists + recreate, on conflict do nothing, backfill avec where not
-- exists) : elle peut être rejouée sans risque.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. Table pharmacy_subscriptions : état courant de l'abonnement, 1 ligne
--    par pharmacie.
-- ----------------------------------------------------------------------------

create table if not exists public.pharmacy_subscriptions (
  pharmacy_id uuid primary key references public.pharmacies(id) on delete cascade,
  status text not null default 'trial'
    check (status in ('trial', 'active', 'expired', 'blocked')),
  plan_label text,
  expires_at timestamptz,
  blocked_at timestamptz,
  blocked_reason text,
  updated_by uuid,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.pharmacy_subscriptions enable row level security;

drop policy if exists pharmacy_subscriptions_select_by_members on public.pharmacy_subscriptions;
create policy pharmacy_subscriptions_select_by_members
  on public.pharmacy_subscriptions
  as permissive for select
  to authenticated
  using (
    public.is_platform_admin()
    or exists (
      select 1 from public.pharmacy_members pm
      where pm.pharmacy_id = pharmacy_subscriptions.pharmacy_id
        and pm.user_id = auth.uid()
        and pm.is_active = true
    )
  );

-- Aucune policy insert/update/delete : seul service_role (routes Super
-- Admin) peut modifier un abonnement, comme admin_delete_pharmacy().

-- ----------------------------------------------------------------------------
-- 2. Table subscription_payments : historique (octrois admin +
--    déclarations de paiement soumises par la pharmacie).
-- ----------------------------------------------------------------------------

create table if not exists public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  kind text not null check (kind in ('grant', 'payment_submission')),
  method text check (method in ('mobile_money', 'bank_transfer', 'bank_card')),
  amount numeric,
  currency text default 'USD',
  reference text,
  note text,
  period_days integer,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_by uuid,
  created_at timestamptz not null default now(),
  reviewed_by uuid,
  reviewed_at timestamptz
);

create index if not exists subscription_payments_pharmacy_id_idx
  on public.subscription_payments (pharmacy_id, created_at desc);

alter table public.subscription_payments enable row level security;

drop policy if exists subscription_payments_select_by_owners_managers on public.subscription_payments;
create policy subscription_payments_select_by_owners_managers
  on public.subscription_payments
  as permissive for select
  to authenticated
  using (
    public.is_platform_admin()
    or exists (
      select 1 from public.pharmacy_members pm
      where pm.pharmacy_id = subscription_payments.pharmacy_id
        and pm.user_id = auth.uid()
        and pm.is_active = true
        and pm.role::text = any (array['owner', 'manager'])
    )
  );

-- Un propriétaire/gérant peut déclarer un paiement pour SA pharmacie, mais
-- uniquement 'payment_submission' + 'pending' : impossible de s'auto-
-- approuver ni d'écrire un octroi ('grant'), réservé à service_role.
drop policy if exists subscription_payments_insert_by_owners_managers on public.subscription_payments;
create policy subscription_payments_insert_by_owners_managers
  on public.subscription_payments
  as permissive for insert
  to authenticated
  with check (
    kind = 'payment_submission'
    and status = 'pending'
    and created_by = auth.uid()
    and exists (
      select 1 from public.pharmacy_members pm
      where pm.pharmacy_id = subscription_payments.pharmacy_id
        and pm.user_id = auth.uid()
        and pm.is_active = true
        and pm.role::text = any (array['owner', 'manager'])
    )
  );

-- Pas de policy update/delete : seul service_role (revue Super Admin) peut
-- changer le statut d'une déclaration.

-- ----------------------------------------------------------------------------
-- 3. Table platform_payment_settings : moyens de paiement de la plateforme,
--    configurés par le Super Admin (ligne singleton).
-- ----------------------------------------------------------------------------

create table if not exists public.platform_payment_settings (
  id text primary key default 'default' check (id = 'default'),
  mobile_money_options jsonb not null default '[]'::jsonb,
  bank_options jsonb not null default '[]'::jsonb,
  card_instructions text,
  updated_by uuid,
  updated_at timestamptz not null default now()
);

alter table public.platform_payment_settings enable row level security;

-- Les moyens de paiement doivent rester visibles même pour une pharmacie
-- bloquée/expirée (sinon impossible de savoir comment payer) : aucune
-- donnée sensible ici, uniquement les canaux de paiement de la plateforme.
drop policy if exists platform_payment_settings_select_by_authenticated on public.platform_payment_settings;
create policy platform_payment_settings_select_by_authenticated
  on public.platform_payment_settings
  as permissive for select
  to authenticated
  using (true);

-- Pas de policy insert/update/delete : configuration réservée à
-- service_role (route Super Admin).

insert into public.platform_payment_settings (id)
values ('default')
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- 4. Fonctions de vérification de l'abonnement.
-- ----------------------------------------------------------------------------

create or replace function public.pharmacy_subscription_active(target_pharmacy_id uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select
    public.is_platform_admin()
    or coalesce(
      (
        select ps.status not in ('blocked', 'expired')
          and (ps.expires_at is null or ps.expires_at > now())
        from public.pharmacy_subscriptions ps
        where ps.pharmacy_id = target_pharmacy_id
      ),
      false
    );
$function$;

-- Variante de has_pharmacy_role() qui exige en plus un abonnement actif.
-- Utilisée uniquement sur les tables de données MÉTIER (produits, stock,
-- ventes, clients, dépenses, fournisseurs...). Les tables structurelles
-- (pharmacies, pharmacy_members, pharmacy_settings) restent sur
-- has_pharmacy_role() pour qu'une pharmacie bloquée reste identifiable.
create or replace function public.has_active_pharmacy_role(p_pharmacy_id uuid, p_roles text[])
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select
    public.has_pharmacy_role(p_pharmacy_id, p_roles)
    and public.pharmacy_subscription_active(p_pharmacy_id);
$function$;

-- get_pharmacy_role() est le socle de can_manage_inventory()/can_sell(),
-- eux-mêmes utilisés par les RPC métier (create_sale, add_product_batch...)
-- qui s'exécutent en SECURITY DEFINER et contournent donc la RLS des
-- tables : sans ce correctif, une pharmacie bloquée pourrait continuer à
-- vendre/gérer son stock via ces RPC malgré la RLS durcie ci-dessous.
-- Aucun risque pour la visibilité de la pharmacie elle-même : cette
-- fonction n'est utilisée par AUCUNE policy sur pharmacies/pharmacy_members
-- /pharmacy_settings (uniquement can_manage_inventory()/can_sell()).
create or replace function public.get_pharmacy_role(target_pharmacy_id uuid)
returns pharmacy_role
language sql
security definer
set search_path to 'public'
as $function$
  select pm.role
  from public.pharmacy_members pm
  where pm.pharmacy_id = target_pharmacy_id
    and pm.user_id = auth.uid()
    and pm.is_active = true
    and public.pharmacy_subscription_active(target_pharmacy_id)
  limit 1;
$function$;

-- assert_pharmacy_role() est le garde interne utilisé par add_product_batch,
-- correct_batch_quantity, remove_batch_from_sale (RPC SECURITY DEFINER) :
-- même raison que ci-dessus, il doit vérifier l'abonnement lui-même.
create or replace function public.assert_pharmacy_role(p_pharmacy_id uuid, p_roles text[])
returns void
language plpgsql
stable security definer
set search_path to 'public'
as $function$
begin
  if auth.uid() is null then
    raise exception 'Utilisateur non authentifié.';
  end if;

  if not public.has_pharmacy_role(p_pharmacy_id, p_roles) then
    raise exception 'Action non autorisée pour votre rôle.';
  end if;

  if not public.pharmacy_subscription_active(p_pharmacy_id) then
    raise exception 'Abonnement de la pharmacie inactif ou bloqué. Contactez Aksantic Technology.';
  end if;
end;
$function$;

-- ----------------------------------------------------------------------------
-- 5. Bascule des policies de données métier vers has_active_pharmacy_role().
--    Reproduction exacte des policies existantes (0000_security_layer.sql),
--    fonction swap uniquement. Les policies INSERT perdent leur `using
--    (true)` : Postgres n'autorise que WITH CHECK pour FOR INSERT.
-- ----------------------------------------------------------------------------

drop policy if exists audit_logs_select_by_owners_managers on public.audit_logs;
create policy audit_logs_select_by_owners_managers on public.audit_logs as permissive for select to authenticated using (has_active_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text]));

drop policy if exists customers_manage_by_sales_roles on public.customers;
create policy customers_manage_by_sales_roles on public.customers as permissive for all to authenticated using (has_active_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'cashier'::text])) with check (has_active_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'cashier'::text]));

drop policy if exists customers_select_by_sales_and_finance_roles on public.customers;
create policy customers_select_by_sales_and_finance_roles on public.customers as permissive for select to authenticated using (has_active_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'cashier'::text, 'accountant'::text]));

drop policy if exists expenses_manage_by_finance_roles on public.expenses;
create policy expenses_manage_by_finance_roles on public.expenses as permissive for all to authenticated using (has_active_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'accountant'::text])) with check (has_active_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'accountant'::text]));

drop policy if exists expenses_select_by_finance_roles on public.expenses;
create policy expenses_select_by_finance_roles on public.expenses as permissive for select to authenticated using (has_active_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'accountant'::text]));

drop policy if exists product_batches_manage_by_stock_roles on public.product_batches;
create policy product_batches_manage_by_stock_roles on public.product_batches as permissive for all to authenticated using (has_active_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'stock_manager'::text])) with check (has_active_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'stock_manager'::text]));

drop policy if exists product_batches_select_by_members on public.product_batches;
create policy product_batches_select_by_members on public.product_batches as permissive for select to authenticated using (has_active_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'cashier'::text, 'stock_manager'::text, 'accountant'::text]));

drop policy if exists product_categories_manage_by_stock_roles on public.product_categories;
create policy product_categories_manage_by_stock_roles on public.product_categories as permissive for all to authenticated using (has_active_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'stock_manager'::text])) with check (has_active_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'stock_manager'::text]));

drop policy if exists product_categories_select_by_members on public.product_categories;
create policy product_categories_select_by_members on public.product_categories as permissive for select to authenticated using (has_active_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'cashier'::text, 'stock_manager'::text, 'accountant'::text]));

drop policy if exists products_manage_by_stock_roles on public.products;
create policy products_manage_by_stock_roles on public.products as permissive for all to authenticated using (has_active_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'stock_manager'::text])) with check (has_active_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'stock_manager'::text]));

drop policy if exists products_select_by_members on public.products;
create policy products_select_by_members on public.products as permissive for select to authenticated using (has_active_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'cashier'::text, 'stock_manager'::text, 'accountant'::text]));

drop policy if exists sale_items_insert_by_sales_roles on public.sale_items;
create policy sale_items_insert_by_sales_roles on public.sale_items as permissive for insert to authenticated with check (exists (select 1 from public.sales s where s.id = sale_items.sale_id and has_active_pharmacy_role(s.pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'cashier'::text])));

drop policy if exists sale_items_select_by_sales_and_finance_roles on public.sale_items;
create policy sale_items_select_by_sales_and_finance_roles on public.sale_items as permissive for select to authenticated using (exists (select 1 from public.sales s where s.id = sale_items.sale_id and has_active_pharmacy_role(s.pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'cashier'::text, 'accountant'::text])));

drop policy if exists sales_insert_by_sales_roles on public.sales;
create policy sales_insert_by_sales_roles on public.sales as permissive for insert to authenticated with check (has_active_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'cashier'::text]));

drop policy if exists sales_select_by_sales_and_finance_roles on public.sales;
create policy sales_select_by_sales_and_finance_roles on public.sales as permissive for select to authenticated using (has_active_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'cashier'::text, 'accountant'::text]));

drop policy if exists sales_update_by_managers on public.sales;
create policy sales_update_by_managers on public.sales as permissive for update to authenticated using (has_active_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text])) with check (has_active_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text]));

drop policy if exists stock_movements_manage_by_stock_roles on public.stock_movements;
create policy stock_movements_manage_by_stock_roles on public.stock_movements as permissive for all to authenticated using (has_active_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'stock_manager'::text])) with check (has_active_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'stock_manager'::text]));

drop policy if exists stock_movements_select_by_stock_roles on public.stock_movements;
create policy stock_movements_select_by_stock_roles on public.stock_movements as permissive for select to authenticated using (has_active_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'stock_manager'::text]));

drop policy if exists stock_requests_insert_by_requester on public.stock_requests;
create policy stock_requests_insert_by_requester on public.stock_requests as permissive for insert to authenticated with check (has_active_pharmacy_role(requesting_pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'stock_manager'::text]));

drop policy if exists stock_requests_select_by_involved on public.stock_requests;
create policy stock_requests_select_by_involved on public.stock_requests as permissive for select to authenticated using ((has_active_pharmacy_role(requesting_pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'stock_manager'::text]) OR has_active_pharmacy_role(supplier_pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'stock_manager'::text])));

drop policy if exists stock_requests_update_by_supplier_or_requester_manager on public.stock_requests;
create policy stock_requests_update_by_supplier_or_requester_manager on public.stock_requests as permissive for update to authenticated using ((has_active_pharmacy_role(supplier_pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'stock_manager'::text]) OR has_active_pharmacy_role(requesting_pharmacy_id, ARRAY['owner'::text, 'manager'::text]))) with check ((has_active_pharmacy_role(supplier_pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'stock_manager'::text]) OR has_active_pharmacy_role(requesting_pharmacy_id, ARRAY['owner'::text, 'manager'::text])));

drop policy if exists suppliers_manage_by_stock_roles on public.suppliers;
create policy suppliers_manage_by_stock_roles on public.suppliers as permissive for all to authenticated using (has_active_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'stock_manager'::text])) with check (has_active_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'stock_manager'::text]));

drop policy if exists suppliers_select_by_members on public.suppliers;
create policy suppliers_select_by_members on public.suppliers as permissive for select to authenticated using (has_active_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'cashier'::text, 'stock_manager'::text, 'accountant'::text]));

-- ----------------------------------------------------------------------------
-- 6. Backfill : abonnement initial pour toutes les pharmacies existantes,
--    pour qu'aucune pharmacie déjà cliente ne perde l'accès lors de ce
--    déploiement. Le Super Admin ajuste ensuite chaque pharmacie depuis
--    /admin/abonnements.
-- ----------------------------------------------------------------------------

insert into public.pharmacy_subscriptions (pharmacy_id, status, plan_label, expires_at)
select p.id, 'active', 'Abonnement initial (migration)', now() + interval '1 year'
from public.pharmacies p
where not exists (
  select 1 from public.pharmacy_subscriptions ps where ps.pharmacy_id = p.id
);

commit;
