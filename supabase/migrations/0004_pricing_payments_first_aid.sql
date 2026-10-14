-- ============================================================================
-- 0004 — Indice de prix par défaut, modes de paiement personnalisés,
--        module « Trousse de secours »
-- ============================================================================
-- Idempotente (add column if not exists, create table if not exists, drop
-- policy if exists + recreate, create or replace function) et transactionnelle :
-- rejouable sans risque, tout ou rien.
--
-- Sécurité : mêmes principes que 0002 — RLS sur les nouvelles tables, accès
-- aux données métier conditionné à un abonnement actif (has_active_pharmacy_role)
-- et écritures sensibles uniquement via fonctions SECURITY DEFINER qui
-- revérifient rôle et abonnement.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. Indice de calcul automatique du prix de vente (par défaut)
--    prix de vente = prix d'achat x coefficient, arrondi selon le mode choisi.
--    NULL = non configuré (comportement historique : règles par origine).
-- ----------------------------------------------------------------------------

alter table public.pharmacy_settings
  add column if not exists default_price_coefficient numeric
    check (default_price_coefficient is null or default_price_coefficient > 0);

alter table public.pharmacy_settings
  add column if not exists default_price_rounding text not null default 'none'
    check (default_price_rounding in ('none', 'ceil_1', 'ceil_50', 'ceil_100', 'ceil_500'));

-- ----------------------------------------------------------------------------
-- 2. Modes de paiement personnalisés (sociétés conventionnées, etc.)
--    Les 6 modes standard (cash CDF/USD, mobile money, carte, crédit, mixte)
--    restent natifs (enum payment_method) ; cette table ajoute les autres.
-- ----------------------------------------------------------------------------

create table if not exists public.pharmacy_payment_methods (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  kind text not null default 'convention'
    check (kind in ('convention', 'mobile', 'bank', 'other')),
  notes text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists pharmacy_payment_methods_name_uidx
  on public.pharmacy_payment_methods (pharmacy_id, lower(btrim(name)));

alter table public.pharmacy_payment_methods enable row level security;

drop policy if exists pharmacy_payment_methods_select_by_members on public.pharmacy_payment_methods;
create policy pharmacy_payment_methods_select_by_members
  on public.pharmacy_payment_methods as permissive for select to authenticated
  using (has_active_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'cashier'::text, 'stock_manager'::text, 'accountant'::text]));

drop policy if exists pharmacy_payment_methods_manage_by_owners_managers on public.pharmacy_payment_methods;
create policy pharmacy_payment_methods_manage_by_owners_managers
  on public.pharmacy_payment_methods as permissive for all to authenticated
  using (has_active_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text]))
  with check (has_active_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text]));

-- La vente garde le NOM du mode de paiement (même si le mode est supprimé
-- ensuite) et un lien vers lui tant qu'il existe.
alter table public.sales
  add column if not exists payment_method_id uuid
    references public.pharmacy_payment_methods(id) on delete set null;

alter table public.sales
  add column if not exists payment_method_label text;

-- Étiquette un mode de paiement personnalisé sur une vente que l'utilisateur
-- vient de créer (create_sale reste inchangée et enregistre le mode de base,
-- ex. « credit » pour une société conventionnée). Gardes : droit de vendre +
-- abonnement actif (can_sell), vente créée par l'appelant, moins de 30 min.
create or replace function public.set_sale_payment_method(p_sale_id uuid, p_method_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_sale record;
  v_method record;
begin
  if auth.uid() is null then
    raise exception 'Utilisateur non authentifié.';
  end if;

  select s.id, s.pharmacy_id, s.user_id, s.created_at
  into v_sale
  from public.sales s
  where s.id = p_sale_id;

  if not found then
    raise exception 'Vente introuvable.';
  end if;

  if not public.can_sell(v_sale.pharmacy_id) then
    raise exception 'Accès refusé pour la vente.';
  end if;

  if v_sale.user_id is distinct from auth.uid()
     or v_sale.created_at < now() - interval '30 minutes' then
    raise exception 'Le mode de paiement ne peut plus être modifié pour cette vente.';
  end if;

  select m.id, m.name
  into v_method
  from public.pharmacy_payment_methods m
  where m.id = p_method_id
    and m.pharmacy_id = v_sale.pharmacy_id
    and m.is_active;

  if not found then
    raise exception 'Mode de paiement introuvable ou désactivé.';
  end if;

  update public.sales
  set payment_method_id = v_method.id,
      payment_method_label = v_method.name
  where id = p_sale_id;
end;
$function$;

revoke all on function public.set_sale_payment_method(uuid, uuid) from public, anon;
grant execute on function public.set_sale_payment_method(uuid, uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 3. Trousse de secours : réquisitions pendant les gardes
--    Chaque réquisition sort du stock (FEFO, lots expirés exclus), est tracée
--    en mouvement de stock (adjustment_out, reference_type 'kit_requisition')
--    et valorisée au prix d'achat pour la comptabilité et les KPI.
-- ----------------------------------------------------------------------------

create table if not exists public.kit_requisitions (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  reference text not null,
  requester_name text not null check (char_length(btrim(requester_name)) > 0),
  department text,
  reason text,
  status text not null default 'completed' check (status in ('completed', 'cancelled')),
  total_quantity numeric not null default 0,
  total_cost numeric not null default 0,
  created_by uuid,
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  cancelled_by uuid,
  cancel_reason text
);

create index if not exists kit_requisitions_pharmacy_idx
  on public.kit_requisitions (pharmacy_id, created_at desc);

create table if not exists public.kit_requisition_items (
  id uuid primary key default gen_random_uuid(),
  requisition_id uuid not null references public.kit_requisitions(id) on delete cascade,
  pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  batch_id uuid references public.product_batches(id) on delete set null,
  product_name text not null,
  batch_number text,
  expiry_date date,
  quantity numeric not null check (quantity > 0),
  unit_cost numeric not null default 0,
  total_cost numeric not null default 0
);

create index if not exists kit_requisition_items_req_idx
  on public.kit_requisition_items (requisition_id);
create index if not exists kit_requisition_items_pharmacy_idx
  on public.kit_requisition_items (pharmacy_id);

alter table public.kit_requisitions enable row level security;
alter table public.kit_requisition_items enable row level security;

-- Lecture : tous les rôles de la pharmacie (module accessible à tous).
-- Aucune policy d'écriture : tout passe par les fonctions ci-dessous.
drop policy if exists kit_requisitions_select_by_members on public.kit_requisitions;
create policy kit_requisitions_select_by_members
  on public.kit_requisitions as permissive for select to authenticated
  using (has_active_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'cashier'::text, 'stock_manager'::text, 'accountant'::text]));

drop policy if exists kit_requisition_items_select_by_members on public.kit_requisition_items;
create policy kit_requisition_items_select_by_members
  on public.kit_requisition_items as permissive for select to authenticated
  using (has_active_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'cashier'::text, 'stock_manager'::text, 'accountant'::text]));

-- Crée une réquisition : p_items = [{"product_id": "...", "quantity": 2}, ...]
create or replace function public.create_kit_requisition(
  p_pharmacy_id uuid,
  p_items jsonb,
  p_requester_name text,
  p_department text default null,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_req_id uuid;
  v_reference text;
  v_item jsonb;
  v_product record;
  v_batch record;
  v_product_id uuid;
  v_quantity numeric;
  v_remaining numeric;
  v_take numeric;
  v_total_qty numeric := 0;
  v_total_cost numeric := 0;
begin
  if auth.uid() is null then
    raise exception 'Utilisateur non authentifié.';
  end if;

  if not public.has_active_pharmacy_role(
    p_pharmacy_id,
    array['owner', 'manager', 'pharmacist', 'cashier', 'stock_manager', 'accountant']
  ) then
    raise exception 'Accès refusé : abonnement inactif ou rôle non autorisé.';
  end if;

  if nullif(btrim(coalesce(p_requester_name, '')), '') is null then
    raise exception 'Le nom du demandeur (médecin) est obligatoire.';
  end if;

  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'Aucun produit à prélever.';
  end if;

  v_reference := concat(
    'TS-', to_char(now(), 'YYYYMMDD-HH24MISS'), '-',
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4))
  );

  insert into public.kit_requisitions (
    pharmacy_id, reference, requester_name, department, reason, created_by
  )
  values (
    p_pharmacy_id, v_reference, btrim(p_requester_name),
    nullif(btrim(coalesce(p_department, '')), ''),
    nullif(btrim(coalesce(p_reason, '')), ''),
    auth.uid()
  )
  returning id into v_req_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_quantity := (v_item ->> 'quantity')::numeric;

    if v_quantity is null or v_quantity <= 0 then
      raise exception 'Quantité invalide.';
    end if;

    select p.id, p.name
    into v_product
    from public.products p
    where p.id = v_product_id
      and p.pharmacy_id = p_pharmacy_id;

    if not found then
      raise exception 'Produit introuvable pour cette pharmacie.';
    end if;

    v_remaining := v_quantity;

    -- FEFO : le lot le plus proche de l'expiration d'abord ; lots expirés
    -- toujours exclus (un médicament périmé ne doit jamais être prélevé).
    for v_batch in
      select pb.*
      from public.product_batches pb
      where pb.product_id = v_product.id
        and pb.pharmacy_id = p_pharmacy_id
        and pb.is_active = true
        and pb.quantity_available > 0
        and (pb.expiry_date is null or pb.expiry_date >= current_date)
      order by pb.expiry_date asc nulls last, pb.received_at asc
      for update
    loop
      exit when v_remaining <= 0;

      v_take := least(v_remaining, v_batch.quantity_available);

      update public.product_batches
      set quantity_available = quantity_available - v_take
      where id = v_batch.id;

      insert into public.kit_requisition_items (
        requisition_id, pharmacy_id, product_id, batch_id, product_name,
        batch_number, expiry_date, quantity, unit_cost, total_cost
      )
      values (
        v_req_id, p_pharmacy_id, v_product.id, v_batch.id, v_product.name,
        v_batch.batch_number, v_batch.expiry_date, v_take,
        coalesce(v_batch.purchase_price, 0),
        v_take * coalesce(v_batch.purchase_price, 0)
      );

      insert into public.stock_movements (
        pharmacy_id, product_id, batch_id, movement_type, quantity,
        unit_cost, unit_price, reference_type, reference_id, reason, user_id
      )
      values (
        p_pharmacy_id, v_product.id, v_batch.id, 'adjustment_out', v_take,
        coalesce(v_batch.purchase_price, 0), coalesce(v_batch.selling_price, 0),
        'kit_requisition', v_req_id,
        concat('Trousse de secours ', v_reference, ' — ', btrim(p_requester_name)),
        auth.uid()
      );

      v_total_qty := v_total_qty + v_take;
      v_total_cost := v_total_cost + v_take * coalesce(v_batch.purchase_price, 0);
      v_remaining := v_remaining - v_take;
    end loop;

    if v_remaining > 0 then
      raise exception 'Stock insuffisant (lots expirés exclus) pour le produit : %', v_product.name;
    end if;
  end loop;

  update public.kit_requisitions
  set total_quantity = v_total_qty,
      total_cost = v_total_cost
  where id = v_req_id;

  return jsonb_build_object(
    'id', v_req_id,
    'reference', v_reference,
    'total_quantity', v_total_qty,
    'total_cost', v_total_cost
  );
end;
$function$;

revoke all on function public.create_kit_requisition(uuid, jsonb, text, text, text) from public, anon;
grant execute on function public.create_kit_requisition(uuid, jsonb, text, text, text) to authenticated;

-- Annule une réquisition (erreur de saisie) : remet les quantités dans leurs
-- lots d'origine et trace la remise en stock. Réservé propriétaire/gérant/
-- pharmacien.
create or replace function public.cancel_kit_requisition(p_requisition_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_req record;
  v_item record;
begin
  if auth.uid() is null then
    raise exception 'Utilisateur non authentifié.';
  end if;

  select * into v_req from public.kit_requisitions where id = p_requisition_id for update;

  if not found then
    raise exception 'Réquisition introuvable.';
  end if;

  if not public.has_active_pharmacy_role(
    v_req.pharmacy_id, array['owner', 'manager', 'pharmacist']
  ) then
    raise exception 'Accès refusé : seuls le propriétaire, le gérant et le pharmacien peuvent annuler.';
  end if;

  if v_req.status <> 'completed' then
    raise exception 'Cette réquisition est déjà annulée.';
  end if;

  for v_item in
    select * from public.kit_requisition_items where requisition_id = p_requisition_id
  loop
    if v_item.batch_id is not null then
      update public.product_batches
      set quantity_available = quantity_available + v_item.quantity,
          is_active = true
      where id = v_item.batch_id;

      insert into public.stock_movements (
        pharmacy_id, product_id, batch_id, movement_type, quantity,
        unit_cost, unit_price, reference_type, reference_id, reason, user_id
      )
      values (
        v_req.pharmacy_id, v_item.product_id, v_item.batch_id, 'adjustment_in',
        v_item.quantity, v_item.unit_cost, 0,
        'kit_requisition_cancel', v_req.id,
        concat('Annulation trousse de secours ', v_req.reference),
        auth.uid()
      );
    end if;
  end loop;

  update public.kit_requisitions
  set status = 'cancelled',
      cancelled_at = now(),
      cancelled_by = auth.uid(),
      cancel_reason = nullif(btrim(coalesce(p_reason, '')), '')
  where id = p_requisition_id;
end;
$function$;

revoke all on function public.cancel_kit_requisition(uuid, text) from public, anon;
grant execute on function public.cancel_kit_requisition(uuid, text) to authenticated;

commit;
