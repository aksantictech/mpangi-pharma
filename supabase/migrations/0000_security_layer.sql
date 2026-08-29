alter table public.audit_logs enable row level security;

alter table public.auth_events enable row level security;

alter table public.customers enable row level security;

alter table public.expenses enable row level security;

alter table public.national_products enable row level security;

alter table public.pharmacies enable row level security;

alter table public.pharmacy_members enable row level security;

alter table public.pharmacy_opening_hours enable row level security;

alter table public.pharmacy_settings enable row level security;

alter table public.platform_admins enable row level security;

alter table public.pricing_rules enable row level security;

alter table public.product_batches enable row level security;

alter table public.product_categories enable row level security;

alter table public.products enable row level security;

alter table public.profiles enable row level security;

alter table public.sale_items enable row level security;

alter table public.sales enable row level security;

alter table public.stock_movements enable row level security;

alter table public.stock_requests enable row level security;

alter table public.suppliers enable row level security;

create policy "No direct auth events access" on public.auth_events as permissive for all to anon, authenticated using (false) with check (false);

create policy "Platform admins can read own record" on public.platform_admins as permissive for select to authenticated using ((user_id = auth.uid()));

create policy "Platform admins can read platform admins" on public.platform_admins as permissive for select to authenticated using (is_platform_admin());

create policy "Users can insert their own profile" on public.profiles as permissive for insert to authenticated using (true) with check ((id = auth.uid()));

create policy "Users can read their own platform admin status" on public.platform_admins as permissive for select to authenticated using ((user_id = auth.uid()));

create policy "Users can read their own profile" on public.profiles as permissive for select to authenticated using ((id = auth.uid()));

create policy "Users can update their own profile" on public.profiles as permissive for update to authenticated using ((id = auth.uid())) with check ((id = auth.uid()));

create policy audit_logs_select_by_owners_managers on public.audit_logs as permissive for select to authenticated using (has_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text]));

create policy customers_manage_by_sales_roles on public.customers as permissive for all to authenticated using (has_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'cashier'::text])) with check (has_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'cashier'::text]));

create policy customers_select_by_sales_and_finance_roles on public.customers as permissive for select to authenticated using (has_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'cashier'::text, 'accountant'::text]));

create policy expenses_manage_by_finance_roles on public.expenses as permissive for all to authenticated using (has_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'accountant'::text])) with check (has_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'accountant'::text]));

create policy expenses_select_by_finance_roles on public.expenses as permissive for select to authenticated using (has_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'accountant'::text]));

create policy national_products_manage_platform_admin on public.national_products as permissive for all to authenticated using (is_platform_admin()) with check (is_platform_admin());

create policy national_products_select_authenticated on public.national_products as permissive for select to authenticated using (((is_active = true) OR is_platform_admin()));

create policy pharmacies_insert_by_platform_admins on public.pharmacies as permissive for insert to authenticated using (true) with check (is_platform_admin());

create policy pharmacies_select_by_members on public.pharmacies as permissive for select to authenticated using (has_pharmacy_role(id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'cashier'::text, 'stock_manager'::text, 'accountant'::text]));

create policy pharmacies_update_by_owners_managers on public.pharmacies as permissive for update to authenticated using (has_pharmacy_role(id, ARRAY['owner'::text, 'manager'::text])) with check (has_pharmacy_role(id, ARRAY['owner'::text, 'manager'::text]));

create policy pharmacy_members_delete_by_owners_managers on public.pharmacy_members as permissive for delete to authenticated using (has_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text]));

create policy pharmacy_members_insert_by_owners_managers on public.pharmacy_members as permissive for insert to authenticated using (true) with check (has_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text]));

create policy pharmacy_members_select_by_members on public.pharmacy_members as permissive for select to authenticated using (has_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'cashier'::text, 'stock_manager'::text, 'accountant'::text]));

create policy pharmacy_members_update_by_owners_managers on public.pharmacy_members as permissive for update to authenticated using (has_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text])) with check (has_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text]));

create policy pharmacy_settings_select_by_members on public.pharmacy_settings as permissive for select to authenticated using (has_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'cashier'::text, 'stock_manager'::text, 'accountant'::text]));

create policy pharmacy_settings_update_by_owners_managers on public.pharmacy_settings as permissive for update to authenticated using (has_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text])) with check (has_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text]));

create policy pricing_rules_manage_super_admin on public.pricing_rules as permissive for all to authenticated using ((EXISTS ( SELECT 1
   FROM platform_admins pa
  WHERE ((pa.user_id = auth.uid()) AND (pa.is_active = true))))) with check ((EXISTS ( SELECT 1
   FROM platform_admins pa
  WHERE ((pa.user_id = auth.uid()) AND (pa.is_active = true)))));

create policy pricing_rules_select_own_pharmacy on public.pricing_rules as permissive for select to authenticated using (((EXISTS ( SELECT 1
   FROM pharmacy_members pm
  WHERE ((pm.pharmacy_id = pricing_rules.pharmacy_id) AND (pm.user_id = auth.uid()) AND (pm.is_active = true)))) OR (EXISTS ( SELECT 1
   FROM platform_admins pa
  WHERE ((pa.user_id = auth.uid()) AND (pa.is_active = true))))));

create policy product_batches_manage_by_stock_roles on public.product_batches as permissive for all to authenticated using (has_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'stock_manager'::text])) with check (has_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'stock_manager'::text]));

create policy product_batches_select_by_members on public.product_batches as permissive for select to authenticated using (has_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'cashier'::text, 'stock_manager'::text, 'accountant'::text]));

create policy product_categories_manage_by_stock_roles on public.product_categories as permissive for all to authenticated using (has_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'stock_manager'::text])) with check (has_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'stock_manager'::text]));

create policy product_categories_select_by_members on public.product_categories as permissive for select to authenticated using (has_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'cashier'::text, 'stock_manager'::text, 'accountant'::text]));

create policy products_manage_by_stock_roles on public.products as permissive for all to authenticated using (has_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'stock_manager'::text])) with check (has_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'stock_manager'::text]));

create policy products_select_by_members on public.products as permissive for select to authenticated using (has_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'cashier'::text, 'stock_manager'::text, 'accountant'::text]));

create policy profiles_select_self_or_same_pharmacy on public.profiles as permissive for select to authenticated using (((id = auth.uid()) OR is_platform_admin() OR (EXISTS ( SELECT 1
   FROM pharmacy_members pm
  WHERE ((pm.user_id = profiles.id) AND has_pharmacy_role(pm.pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text]))))));

create policy profiles_update_self on public.profiles as permissive for update to authenticated using ((id = auth.uid())) with check ((id = auth.uid()));

create policy sale_items_insert_by_sales_roles on public.sale_items as permissive for insert to authenticated using (true) with check ((EXISTS ( SELECT 1
   FROM sales s
  WHERE ((s.id = sale_items.sale_id) AND has_pharmacy_role(s.pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'cashier'::text])))));

create policy sale_items_select_by_sales_and_finance_roles on public.sale_items as permissive for select to authenticated using ((EXISTS ( SELECT 1
   FROM sales s
  WHERE ((s.id = sale_items.sale_id) AND has_pharmacy_role(s.pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'cashier'::text, 'accountant'::text])))));

create policy sales_insert_by_sales_roles on public.sales as permissive for insert to authenticated using (true) with check (has_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'cashier'::text]));

create policy sales_select_by_sales_and_finance_roles on public.sales as permissive for select to authenticated using (has_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'cashier'::text, 'accountant'::text]));

create policy sales_update_by_managers on public.sales as permissive for update to authenticated using (has_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text])) with check (has_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text]));

create policy stock_movements_manage_by_stock_roles on public.stock_movements as permissive for all to authenticated using (has_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'stock_manager'::text])) with check (has_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'stock_manager'::text]));

create policy stock_movements_select_by_stock_roles on public.stock_movements as permissive for select to authenticated using (has_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'stock_manager'::text]));

create policy stock_requests_insert_by_requester on public.stock_requests as permissive for insert to authenticated using (true) with check (has_pharmacy_role(requesting_pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'stock_manager'::text]));

create policy stock_requests_select_by_involved on public.stock_requests as permissive for select to authenticated using ((has_pharmacy_role(requesting_pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'stock_manager'::text]) OR has_pharmacy_role(supplier_pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'stock_manager'::text])));

create policy stock_requests_update_by_supplier_or_requester_manager on public.stock_requests as permissive for update to authenticated using ((has_pharmacy_role(supplier_pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'stock_manager'::text]) OR has_pharmacy_role(requesting_pharmacy_id, ARRAY['owner'::text, 'manager'::text]))) with check ((has_pharmacy_role(supplier_pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'stock_manager'::text]) OR has_pharmacy_role(requesting_pharmacy_id, ARRAY['owner'::text, 'manager'::text])));

create policy suppliers_manage_by_stock_roles on public.suppliers as permissive for all to authenticated using (has_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'stock_manager'::text])) with check (has_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'stock_manager'::text]));

create policy suppliers_select_by_members on public.suppliers as permissive for select to authenticated using (has_pharmacy_role(pharmacy_id, ARRAY['owner'::text, 'manager'::text, 'pharmacist'::text, 'cashier'::text, 'stock_manager'::text, 'accountant'::text]));

CREATE OR REPLACE FUNCTION public.add_product_batch(p_pharmacy_id uuid, p_product_id uuid, p_supplier_id uuid DEFAULT NULL::uuid, p_batch_number text DEFAULT NULL::text, p_expiry_date date DEFAULT NULL::date, p_purchase_price numeric DEFAULT 0, p_selling_price numeric DEFAULT 0, p_quantity numeric DEFAULT 0)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_batch_id uuid;
  v_user_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Utilisateur non connecté.';
  end if;

  if not exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = v_user_id
  )
  and not exists (
    select 1
    from public.pharmacy_members pm
    where pm.pharmacy_id = p_pharmacy_id
      and pm.user_id = v_user_id
      and pm.is_active = true
      and pm.role in ('owner', 'manager', 'pharmacist', 'stock_manager')
  ) then
    raise exception 'Accès non autorisé pour ajouter un lot.';
  end if;

  if p_product_id is null then
    raise exception 'Le produit est obligatoire.';
  end if;

  if not exists (
    select 1
    from public.products p
    where p.id = p_product_id
      and p.pharmacy_id = p_pharmacy_id
  ) then
    raise exception 'Produit introuvable dans cette pharmacie.';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'La quantité du lot doit être supérieure à zéro.';
  end if;

  if p_expiry_date is null then
    raise exception 'La date d’expiration est obligatoire.';
  end if;

  if p_selling_price is null or p_selling_price <= 0 then
    raise exception 'Le prix de vente doit être supérieur à zéro.';
  end if;

  insert into public.product_batches (
    pharmacy_id,
    product_id,
    supplier_id,
    batch_number,
    expiry_date,
    purchase_price,
    selling_price,
    quantity_initial,
    quantity_available,
    received_at,
    is_active,
    created_at,
    updated_at
  )
  values (
    p_pharmacy_id,
    p_product_id,
    p_supplier_id,
    nullif(trim(coalesce(p_batch_number, '')), ''),
    p_expiry_date,
    coalesce(p_purchase_price, 0),
    coalesce(p_selling_price, 0),
    p_quantity,
    p_quantity,
    current_date,
    true,
    now(),
    now()
  )
  returning id into v_batch_id;

  return v_batch_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.add_product_batch(p_product_id uuid, p_supplier_id uuid DEFAULT NULL::uuid, p_batch_number text DEFAULT NULL::text, p_expiry_date date DEFAULT NULL::date, p_purchase_price numeric DEFAULT 0, p_selling_price numeric DEFAULT 0, p_quantity numeric DEFAULT 0, p_reason text DEFAULT 'Entrée de stock'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  target_pharmacy_id uuid;
  new_batch_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Utilisateur non authentifié.';
  end if;

  select pharmacy_id
  into target_pharmacy_id
  from public.products
  where id = p_product_id
  limit 1;

  if target_pharmacy_id is null then
    raise exception 'Produit introuvable.';
  end if;

  if not public.can_manage_inventory(target_pharmacy_id) then
    raise exception 'Accès refusé pour la gestion du stock.';
  end if;

  if coalesce(p_quantity, 0) <= 0 then
    raise exception 'La quantité doit être supérieure à zéro.';
  end if;

  if p_expiry_date is null then
    raise exception 'La date d’expiration est obligatoire.';
  end if;

  insert into public.product_batches (
    pharmacy_id,
    product_id,
    supplier_id,
    batch_number,
    expiry_date,
    purchase_price,
    selling_price,
    quantity_initial,
    quantity_available,
    received_at,
    is_active
  )
  values (
    target_pharmacy_id,
    p_product_id,
    p_supplier_id,
    nullif(trim(coalesce(p_batch_number, '')), ''),
    p_expiry_date,
    coalesce(p_purchase_price, 0),
    coalesce(p_selling_price, 0),
    p_quantity,
    p_quantity,
    current_date,
    true
  )
  returning id into new_batch_id;

  insert into public.stock_movements (
    pharmacy_id,
    product_id,
    batch_id,
    movement_type,
    quantity,
    unit_cost,
    unit_price,
    reference_type,
    reference_id,
    reason,
    user_id
  )
  values (
    target_pharmacy_id,
    p_product_id,
    new_batch_id,
    'supplier_entry',
    p_quantity,
    coalesce(p_purchase_price, 0),
    coalesce(p_selling_price, 0),
    'batch_entry',
    new_batch_id,
    coalesce(p_reason, 'Entrée de stock'),
    auth.uid()
  );

  return new_batch_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.assert_pharmacy_role(p_pharmacy_id uuid, p_roles text[])
 RETURNS void
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
perform public.assert_pharmacy_role(
  p_pharmacy_id,
  array['owner','manager','pharmacist','cashier']
);
  if auth.uid() is null then
    raise exception 'Utilisateur non authentifié.';
  end if;

  if not public.has_pharmacy_role(p_pharmacy_id, p_roles) then
    raise exception 'Action non autorisée pour votre rôle.';
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.audit_table_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_row jsonb;
  v_old_row jsonb;
  v_pharmacy_id uuid;
  v_entity_id uuid;
  v_action text;
  v_metadata jsonb;
begin
  if tg_op = 'INSERT' then
    v_row := to_jsonb(new);
    v_old_row := null;
    v_action := tg_table_name || '.created';

  elsif tg_op = 'UPDATE' then
    v_row := to_jsonb(new);
    v_old_row := to_jsonb(old);
    v_action := tg_table_name || '.updated';

  elsif tg_op = 'DELETE' then
    v_row := to_jsonb(old);
    v_old_row := to_jsonb(old);
    v_action := tg_table_name || '.deleted';

  else
    return null;
  end if;

  if tg_table_name = 'pharmacies' then
    v_pharmacy_id := nullif(v_row ->> 'id', '')::uuid;

  elsif v_row ? 'pharmacy_id' then
    v_pharmacy_id := nullif(v_row ->> 'pharmacy_id', '')::uuid;

  else
    v_pharmacy_id := null;
  end if;

  if v_row ? 'id' then
    v_entity_id := nullif(v_row ->> 'id', '')::uuid;
  else
    v_entity_id := null;
  end if;

  v_metadata := jsonb_build_object(
    'table', tg_table_name,
    'operation', tg_op,
    'old', v_old_row,
    'new', case when tg_op = 'DELETE' then null else v_row end
  );

  perform public.write_audit_log(
    v_pharmacy_id,
    v_action,
    tg_table_name,
    v_entity_id,
    v_metadata
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.can_manage_inventory(target_pharmacy_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.get_pharmacy_role(target_pharmacy_id) in (
    'owner',
    'manager',
    'pharmacist',
    'stock_manager'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.can_sell(target_pharmacy_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.get_pharmacy_role(target_pharmacy_id) in (
    'owner',
    'manager',
    'pharmacist',
    'cashier'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.correct_batch_quantity(p_batch_id uuid, p_new_quantity numeric, p_reason text DEFAULT 'Correction inventaire'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$declare
v_pharmacy_id uuid;
  target_batch record;
  old_quantity numeric;
  quantity_difference numeric;
  movement stock_movement_type;
begin
select pharmacy_id
into v_pharmacy_id
from public.product_batches
where id = p_batch_id;

if v_pharmacy_id is null then
  raise exception 'Lot introuvable.';
end if;

perform public.assert_pharmacy_role(
  v_pharmacy_id,
  array['owner','manager','pharmacist','stock_manager']
);
  if auth.uid() is null then
    raise exception 'Utilisateur non authentifié.';
  end if;

  if p_new_quantity < 0 then
    raise exception 'La nouvelle quantité ne peut pas être négative.';
  end if;

  select *
  into target_batch
  from public.product_batches
  where id = p_batch_id
  limit 1;

  if target_batch.id is null then
    raise exception 'Lot introuvable.';
  end if;

  if not public.can_manage_inventory(target_batch.pharmacy_id) then
    raise exception 'Accès refusé pour la gestion du stock.';
  end if;

  old_quantity := coalesce(target_batch.quantity_available, 0);
  quantity_difference := p_new_quantity - old_quantity;

  if quantity_difference = 0 then
    return p_batch_id;
  end if;

  if quantity_difference > 0 then
    movement := 'adjustment_in';
  else
    movement := 'adjustment_out';
  end if;

  update public.product_batches
  set
    quantity_available = p_new_quantity,
    is_active = case
      when p_new_quantity > 0 then true
      else is_active
    end
  where id = p_batch_id;

  insert into public.stock_movements (
    pharmacy_id,
    product_id,
    batch_id,
    movement_type,
    quantity,
    unit_cost,
    unit_price,
    reference_type,
    reference_id,
    reason,
    user_id
  )
  values (
    target_batch.pharmacy_id,
    target_batch.product_id,
    target_batch.id,
    movement,
    abs(quantity_difference),
    target_batch.purchase_price,
    target_batch.selling_price,
    'inventory_correction',
    target_batch.id,
    coalesce(nullif(trim(p_reason), ''), 'Correction inventaire'),
    auth.uid()
  );

  return p_batch_id;
end;$function$
;

CREATE OR REPLACE FUNCTION public.correct_batch_quantity(p_pharmacy_id uuid, p_batch_id uuid, p_new_quantity numeric, p_reason text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid;
  v_product_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Utilisateur non connecté.';
  end if;

  if not exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = v_user_id
  )
  and not exists (
    select 1
    from public.pharmacy_members pm
    where pm.pharmacy_id = p_pharmacy_id
      and pm.user_id = v_user_id
      and pm.is_active = true
      and pm.role in ('owner', 'manager', 'pharmacist', 'stock_manager')
  ) then
    raise exception 'Accès non autorisé pour corriger ce lot.';
  end if;

  if p_new_quantity is null or p_new_quantity < 0 then
    raise exception 'La nouvelle quantité ne peut pas être négative.';
  end if;

  select product_id
  into v_product_id
  from public.product_batches
  where id = p_batch_id
    and pharmacy_id = p_pharmacy_id;

  if v_product_id is null then
    raise exception 'Lot introuvable dans cette pharmacie.';
  end if;

  update public.product_batches
  set
    quantity_available = p_new_quantity,
    updated_at = now()
  where id = p_batch_id
    and pharmacy_id = p_pharmacy_id;

  return p_batch_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_pharmacy_with_owner(p_name text, p_slug text, p_logo_url text DEFAULT NULL::text, p_address text DEFAULT NULL::text, p_city text DEFAULT NULL::text, p_province text DEFAULT NULL::text, p_phone text DEFAULT NULL::text, p_email text DEFAULT NULL::text, p_pharmacist_name text DEFAULT NULL::text, p_exchange_rate numeric DEFAULT 2800)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  new_pharmacy_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Utilisateur non authentifié.';
  end if;

  if not public.is_platform_admin() then
    raise exception 'Seul un super administrateur peut créer une pharmacie.';
  end if;

  insert into public.pharmacies (
    name,
    slug,
    logo_url,
    address,
    city,
    province,
    phone,
    email,
    pharmacist_name,
    exchange_rate,
    created_by
  )
  values (
    p_name,
    p_slug,
    p_logo_url,
    p_address,
    p_city,
    p_province,
    p_phone,
    p_email,
    p_pharmacist_name,
    p_exchange_rate,
    auth.uid()
  )
  returning id into new_pharmacy_id;

  insert into public.pharmacy_members (
    pharmacy_id,
    user_id,
    role,
    is_active
  )
  values (
    new_pharmacy_id,
    auth.uid(),
    'owner',
    true
  );

  insert into public.pharmacy_settings (
    pharmacy_id
  )
  values (
    new_pharmacy_id
  );

  return new_pharmacy_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_product_with_initial_batch(p_pharmacy_id uuid, p_name text, p_generic_name text DEFAULT NULL::text, p_category_id uuid DEFAULT NULL::uuid, p_dosage text DEFAULT NULL::text, p_form text DEFAULT NULL::text, p_unit text DEFAULT 'boîte'::text, p_barcode text DEFAULT NULL::text, p_manufacturer text DEFAULT NULL::text, p_supplier_id uuid DEFAULT NULL::uuid, p_min_stock numeric DEFAULT 0, p_requires_prescription boolean DEFAULT false, p_batch_number text DEFAULT NULL::text, p_expiry_date date DEFAULT NULL::date, p_purchase_price numeric DEFAULT 0, p_selling_price numeric DEFAULT 0, p_quantity numeric DEFAULT 0)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  new_product_id uuid;
  new_batch_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Utilisateur non authentifié.';
  end if;

  if not public.can_manage_inventory(p_pharmacy_id) then
    raise exception 'Accès refusé pour la gestion du stock.';
  end if;

  insert into public.products (
    pharmacy_id,
    category_id,
    name,
    generic_name,
    dosage,
    form,
    unit,
    barcode,
    manufacturer,
    default_supplier_id,
    min_stock,
    requires_prescription,
    status
  )
  values (
    p_pharmacy_id,
    p_category_id,
    trim(p_name),
    nullif(trim(coalesce(p_generic_name, '')), ''),
    nullif(trim(coalesce(p_dosage, '')), ''),
    nullif(trim(coalesce(p_form, '')), ''),
    coalesce(nullif(trim(coalesce(p_unit, '')), ''), 'boîte'),
    nullif(trim(coalesce(p_barcode, '')), ''),
    nullif(trim(coalesce(p_manufacturer, '')), ''),
    p_supplier_id,
    coalesce(p_min_stock, 0),
    coalesce(p_requires_prescription, false),
    'active'
  )
  returning id into new_product_id;

  if coalesce(p_quantity, 0) > 0 then
    if p_expiry_date is null then
      raise exception 'La date d’expiration est obligatoire pour créer un lot.';
    end if;

    insert into public.product_batches (
      pharmacy_id,
      product_id,
      supplier_id,
      batch_number,
      expiry_date,
      purchase_price,
      selling_price,
      quantity_initial,
      quantity_available,
      received_at,
      is_active
    )
    values (
      p_pharmacy_id,
      new_product_id,
      p_supplier_id,
      nullif(trim(coalesce(p_batch_number, '')), ''),
      p_expiry_date,
      coalesce(p_purchase_price, 0),
      coalesce(p_selling_price, 0),
      p_quantity,
      p_quantity,
      current_date,
      true
    )
    returning id into new_batch_id;

    insert into public.stock_movements (
      pharmacy_id,
      product_id,
      batch_id,
      movement_type,
      quantity,
      unit_cost,
      unit_price,
      reference_type,
      reference_id,
      reason,
      user_id
    )
    values (
      p_pharmacy_id,
      new_product_id,
      new_batch_id,
      'supplier_entry',
      p_quantity,
      coalesce(p_purchase_price, 0),
      coalesce(p_selling_price, 0),
      'initial_batch',
      new_batch_id,
      'Création du produit avec stock initial',
      auth.uid()
    );
  end if;

  return new_product_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_sale(p_pharmacy_id uuid, p_items jsonb, p_payment_method payment_method DEFAULT 'cash_cdf'::payment_method, p_currency text DEFAULT 'CDF'::text, p_discount numeric DEFAULT 0, p_customer_name text DEFAULT NULL::text, p_notes text DEFAULT NULL::text)
 RETURNS TABLE(sale_id uuid, invoice_number text, total_amount numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  item jsonb;

  requested_product_id uuid;
  requested_quantity numeric;
  remaining_quantity numeric;
  allocated_quantity numeric;

  current_product record;
  current_batch record;

  new_sale_id uuid;
  new_invoice_number text;

  sale_subtotal_ttc numeric := 0;
  sale_subtotal_ht numeric := 0;
  sale_vat_total numeric := 0;
  sale_total_ttc numeric := 0;
  sale_total_cost numeric := 0;

  discount_requested numeric := 0;
  discount_applied numeric := 0;
  discount_ratio numeric := 0;

  target_exchange_rate numeric;
  block_expired boolean := true;

  pharmacy_vat_enabled boolean := false;
  pharmacy_prices_include_vat boolean := true;

  item_vat_applicable boolean;
  item_vat_rate numeric;

  calculated_unit_price_ht numeric;
  calculated_unit_price_ttc numeric;

  calculated_line_ht numeric;
  calculated_line_vat numeric;
  calculated_line_ttc numeric;
begin
  if auth.uid() is null then
    raise exception 'Utilisateur non authentifié.';
  end if;

  if not public.can_sell(p_pharmacy_id) then
    raise exception 'Accès refusé pour la vente.';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Le panier est vide.';
  end if;

  select p.exchange_rate
  into target_exchange_rate
  from public.pharmacies p
  where p.id = p_pharmacy_id
  limit 1;

  select
    coalesce(ps.block_expired_sales, true),
    coalesce(ps.vat_enabled, false),
    coalesce(ps.prices_include_vat, true)
  into
    block_expired,
    pharmacy_vat_enabled,
    pharmacy_prices_include_vat
  from public.pharmacy_settings ps
  where ps.pharmacy_id = p_pharmacy_id
  limit 1;

  new_invoice_number :=
    public.generate_invoice_number(p_pharmacy_id);

  discount_requested :=
    greatest(coalesce(p_discount, 0), 0);

  insert into public.sales (
    pharmacy_id,
    invoice_number,
    customer_name,
    user_id,
    subtotal,
    discount,
    total_amount,
    total_cost,
    gross_margin,
    currency,
    exchange_rate,
    payment_method,
    status,
    notes,
    subtotal_ht,
    vat_total,
    total_ttc
  )
  values (
    p_pharmacy_id,
    new_invoice_number,
    nullif(trim(coalesce(p_customer_name, '')), ''),
    auth.uid(),
    0,
    discount_requested,
    0,
    0,
    0,
    coalesce(nullif(trim(p_currency), ''), 'CDF'),
    coalesce(target_exchange_rate, 2800),
    p_payment_method,
    'completed',
    nullif(trim(coalesce(p_notes, '')), ''),
    0,
    0,
    0
  )
  returning public.sales.id into new_sale_id;

  for item in
    select value
    from jsonb_array_elements(p_items)
  loop
    requested_product_id :=
      (item ->> 'product_id')::uuid;

    requested_quantity :=
      coalesce((item ->> 'quantity')::numeric, 0);

    if requested_quantity <= 0 then
      raise exception 'Quantité invalide.';
    end if;

    select p.*
    into current_product
    from public.products p
    where p.id = requested_product_id
      and p.pharmacy_id = p_pharmacy_id
      and p.status = 'active'
    limit 1;

    if current_product.id is null then
      raise exception 'Produit introuvable ou inactif.';
    end if;

    item_vat_applicable :=
      pharmacy_vat_enabled = true
      and coalesce(current_product.vat_applicable, false) = true
      and coalesce(current_product.vat_rate, 0) > 0;

    item_vat_rate :=
      case
        when item_vat_applicable then
          coalesce(current_product.vat_rate, 0)
        else
          0
      end;

    if item_vat_rate not in (0, 5, 16) then
      raise exception
        'Taux TVA non autorisé pour le produit : %',
        current_product.name;
    end if;

    remaining_quantity := requested_quantity;

    for current_batch in
      select pb.*
      from public.product_batches pb
      where pb.product_id = requested_product_id
        and pb.pharmacy_id = p_pharmacy_id
        and pb.is_active = true
        and pb.quantity_available > 0
      order by
        pb.expiry_date asc,
        pb.received_at asc
    loop
      if
        block_expired = true
        and current_batch.expiry_date < current_date
      then
        continue;
      end if;

      exit when remaining_quantity <= 0;

      allocated_quantity :=
        least(
          remaining_quantity,
          current_batch.quantity_available
        );

      if pharmacy_prices_include_vat = true then
        calculated_unit_price_ttc :=
          round(coalesce(current_batch.selling_price, 0), 4);

        calculated_unit_price_ht :=
          case
            when item_vat_rate > 0 then
              round(
                calculated_unit_price_ttc /
                (1 + item_vat_rate / 100),
                4
              )
            else
              calculated_unit_price_ttc
          end;
      else
        calculated_unit_price_ht :=
          round(coalesce(current_batch.selling_price, 0), 4);

        calculated_unit_price_ttc :=
          case
            when item_vat_rate > 0 then
              round(
                calculated_unit_price_ht *
                (1 + item_vat_rate / 100),
                4
              )
            else
              calculated_unit_price_ht
          end;
      end if;

      calculated_line_ht :=
        round(
          allocated_quantity * calculated_unit_price_ht,
          2
        );

      calculated_line_ttc :=
        round(
          allocated_quantity * calculated_unit_price_ttc,
          2
        );

      calculated_line_vat :=
        round(
          calculated_line_ttc - calculated_line_ht,
          2
        );

      update public.product_batches pb
      set
        quantity_available =
          pb.quantity_available - allocated_quantity
      where pb.id = current_batch.id;

      insert into public.sale_items (
        sale_id,
        pharmacy_id,
        product_id,
        batch_id,
        product_name,
        batch_number,
        expiry_date,
        quantity,
        unit_price,
        purchase_price,
        total_price,
        total_cost,
        vat_applicable,
        vat_rate,
        unit_price_ht,
        unit_price_ttc,
        vat_amount,
        line_total_ht,
        line_total_vat,
        line_total_ttc
      )
      values (
        new_sale_id,
        p_pharmacy_id,
        current_product.id,
        current_batch.id,
        current_product.name,
        current_batch.batch_number,
        current_batch.expiry_date,
        allocated_quantity,
        calculated_unit_price_ttc,
        current_batch.purchase_price,
        calculated_line_ttc,
        allocated_quantity * current_batch.purchase_price,
        item_vat_applicable,
        item_vat_rate,
        calculated_unit_price_ht,
        calculated_unit_price_ttc,
        calculated_line_vat,
        calculated_line_ht,
        calculated_line_vat,
        calculated_line_ttc
      );

      insert into public.stock_movements (
        pharmacy_id,
        product_id,
        batch_id,
        movement_type,
        quantity,
        unit_cost,
        unit_price,
        reference_type,
        reference_id,
        reason,
        user_id
      )
      values (
        p_pharmacy_id,
        current_product.id,
        current_batch.id,
        'sale',
        allocated_quantity,
        current_batch.purchase_price,
        calculated_unit_price_ttc,
        'sale',
        new_sale_id,
        concat('Vente facture ', new_invoice_number),
        auth.uid()
      );

      sale_subtotal_ttc :=
        sale_subtotal_ttc + calculated_line_ttc;

      sale_total_cost :=
        sale_total_cost +
        (
          allocated_quantity *
          current_batch.purchase_price
        );

      remaining_quantity :=
        remaining_quantity - allocated_quantity;
    end loop;

    if remaining_quantity > 0 then
      raise exception
        'Stock insuffisant pour le produit : %',
        current_product.name;
    end if;
  end loop;

  discount_applied :=
    least(
      discount_requested,
      sale_subtotal_ttc
    );

  if sale_subtotal_ttc > 0 then
    discount_ratio :=
      discount_applied / sale_subtotal_ttc;
  else
    discount_ratio := 0;
  end if;

  update public.sale_items as si
  set
    line_total_ht = round(
      si.quantity *
      si.unit_price_ht *
      (1 - discount_ratio),
      2
    ),

    line_total_ttc = round(
      si.quantity *
      si.unit_price_ttc *
      (1 - discount_ratio),
      2
    ),

    line_total_vat = round(
      (
        si.quantity *
        si.unit_price_ttc *
        (1 - discount_ratio)
      )
      -
      (
        si.quantity *
        si.unit_price_ht *
        (1 - discount_ratio)
      ),
      2
    ),

    vat_amount = round(
      (
        si.quantity *
        si.unit_price_ttc *
        (1 - discount_ratio)
      )
      -
      (
        si.quantity *
        si.unit_price_ht *
        (1 - discount_ratio)
      ),
      2
    )
  where si.sale_id = new_sale_id;

  select
    coalesce(sum(si.line_total_ht), 0),
    coalesce(sum(si.line_total_vat), 0),
    coalesce(sum(si.line_total_ttc), 0)
  into
    sale_subtotal_ht,
    sale_vat_total,
    sale_total_ttc
  from public.sale_items as si
  where si.sale_id = new_sale_id;

  update public.sales as s
  set
    subtotal = sale_subtotal_ttc,
    discount = discount_applied,
    subtotal_ht = sale_subtotal_ht,
    vat_total = sale_vat_total,
    total_ttc = sale_total_ttc,
    total_amount = sale_total_ttc,
    total_cost = sale_total_cost,
    gross_margin = sale_subtotal_ht - sale_total_cost
  where s.id = new_sale_id;

  return query
  select
    new_sale_id,
    new_invoice_number,
    sale_total_ttc;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.find_neighbor_pharmacy_stock(p_requesting_pharmacy_id uuid, p_product_id uuid)
 RETURNS TABLE(pharmacy_id uuid, pharmacy_name text, city text, commune text, district text, address text, phone text, whatsapp text, is_open_now boolean, product_id uuid, product_name text, generic_name text, dosage text, form text, unit text, total_quantity numeric, availability_label text, nearest_expiry_date date, distance_group text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_city text;
  v_commune text;
  v_district text;

  v_national_product_id uuid;
  v_barcode text;
  v_name text;
  v_generic_name text;
  v_dosage text;
  v_form text;
begin
  select p.city, p.commune, p.district
  into v_city, v_commune, v_district
  from public.pharmacies p
  where p.id = p_requesting_pharmacy_id;

  select
    pr.national_product_id,
    pr.barcode,
    lower(trim(pr.name)),
    lower(trim(coalesce(pr.generic_name, ''))),
    lower(trim(coalesce(pr.dosage, ''))),
    lower(trim(coalesce(pr.form, '')))
  into
    v_national_product_id,
    v_barcode,
    v_name,
    v_generic_name,
    v_dosage,
    v_form
  from public.products pr
  where pr.id = p_product_id;

  return query
  with stock as (
    select
      pr.id as product_id,
      pr.pharmacy_id,
      pr.name,
      pr.generic_name,
      pr.dosage,
      pr.form,
      pr.unit,
      coalesce(sum(pb.quantity), 0)::numeric as total_quantity,
      min(pb.expiry_date) filter (where pb.quantity > 0) as nearest_expiry_date
    from public.products pr
    join public.product_batches pb on pb.product_id = pr.id
    where pr.pharmacy_id <> p_requesting_pharmacy_id
      and pb.quantity > 0
      and (
        (
          v_national_product_id is not null
          and pr.national_product_id = v_national_product_id
        )
        or (
          v_barcode is not null
          and v_barcode <> ''
          and pr.barcode = v_barcode
        )
        or (
          lower(trim(pr.name)) = v_name
          and lower(trim(coalesce(pr.dosage, ''))) = v_dosage
          and lower(trim(coalesce(pr.form, ''))) = v_form
        )
      )
    group by
      pr.id,
      pr.pharmacy_id,
      pr.name,
      pr.generic_name,
      pr.dosage,
      pr.form,
      pr.unit
  )
  select
    ph.id as pharmacy_id,
    ph.name as pharmacy_name,
    ph.city,
    ph.commune,
    ph.district,
    ph.address,
    ph.phone,
    ph.whatsapp,
    public.is_pharmacy_open_now(ph.id) as is_open_now,
    s.product_id,
    s.name as product_name,
    s.generic_name,
    s.dosage,
    s.form,
    s.unit,
    case
      when ph.shares_exact_stock = true then s.total_quantity
      else null
    end as total_quantity,
    case
      when s.total_quantity <= 0 then 'Indisponible'
      when s.total_quantity <= 5 then 'Stock faible'
      when s.total_quantity <= 20 then 'Disponible'
      else 'Stock important'
    end as availability_label,
    s.nearest_expiry_date,
    case
      when ph.commune is not null and ph.commune = v_commune then 'Même commune'
      when ph.district is not null and ph.district = v_district then 'Même quartier'
      when ph.city is not null and ph.city = v_city then 'Même ville'
      else 'Autre zone'
    end as distance_group
  from stock s
  join public.pharmacies ph on ph.id = s.pharmacy_id
  where ph.status = 'active'
    and ph.shares_stock_with_network = true
    and ph.accepts_stock_requests = true
    and s.total_quantity > 0
  order by
    case
      when ph.district is not null and ph.district = v_district then 1
      when ph.commune is not null and ph.commune = v_commune then 2
      when ph.city is not null and ph.city = v_city then 3
      else 4
    end,
    public.is_pharmacy_open_now(ph.id) desc,
    s.total_quantity desc;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_pharmacy_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  invoice_prefix text;
begin
  select coalesce(ps.invoice_prefix, 'FAC')
  into invoice_prefix
  from public.pharmacy_settings ps
  where ps.pharmacy_id = p_pharmacy_id
  limit 1;

  return concat(
    coalesce(invoice_prefix, 'FAC'),
    '-',
    to_char(now(), 'YYYYMMDDHH24MISS'),
    '-',
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4))
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_audit_activity(p_pharmacy_id uuid DEFAULT NULL::uuid, p_event_type text DEFAULT NULL::text, p_module_name text DEFAULT NULL::text, p_source text DEFAULT NULL::text, p_severity text DEFAULT NULL::text, p_success boolean DEFAULT NULL::boolean, p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_search text DEFAULT NULL::text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS TABLE(id text, pharmacy_id uuid, pharmacy_name text, actor_user_id text, actor_email text, event_type text, module_name text, entity_type text, entity_id text, entity_label text, description text, severity text, old_values jsonb, new_values jsonb, metadata jsonb, ip_address text, user_agent text, success boolean, created_at timestamp with time zone, source text, total_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is null then
    raise exception 'Utilisateur non authentifié.';
  end if;

  if not public.is_platform_admin(auth.uid()) then
    raise exception 'Accès réservé au super administrateur.';
  end if;

  return query
  with unified as (
    select
      al.id::text as id,
      al.pharmacy_id,
      p.name::text as pharmacy_name,
      al.actor_user_id::text as actor_user_id,
      al.actor_email::text as actor_email,
      coalesce(
        nullif(al.action_type, ''),
        nullif(al.action, ''),
        'unknown'
      )::text as event_type,
      coalesce(
        nullif(al.module_name, ''),
        'systeme'
      )::text as module_name,
      coalesce(
        nullif(al.entity_type, ''),
        'unknown'
      )::text as entity_type,
      al.entity_id::text as entity_id,
      al.entity_label::text as entity_label,
      al.description::text as description,
      coalesce(
        nullif(al.severity, ''),
        'info'
      )::text as severity,
      al.old_values,
      al.new_values,
      coalesce(al.metadata, '{}'::jsonb) as metadata,
      host(al.ip_address)::text as ip_address,
      al.user_agent::text as user_agent,
      true as success,
      al.created_at,
      'audit'::text as source
    from public.audit_logs al
    left join public.pharmacies p
      on p.id = al.pharmacy_id

    union all

    select
      ae.id::text as id,
      ae.pharmacy_id,
      p.name::text as pharmacy_name,
      ae.user_id::text as actor_user_id,
      ae.email::text as actor_email,
      ae.event_type::text as event_type,
      'authentification'::text as module_name,
      'auth_event'::text as entity_type,
      ae.user_id::text as entity_id,
      ae.email::text as entity_label,
      ae.failure_reason::text as description,
      case
        when ae.success = true then 'info'
        else 'warning'
      end::text as severity,
      null::jsonb as old_values,
      null::jsonb as new_values,
      coalesce(ae.metadata, '{}'::jsonb) as metadata,
      host(ae.ip_address)::text as ip_address,
      ae.user_agent::text as user_agent,
      ae.success,
      ae.created_at,
      'auth'::text as source
    from public.auth_events ae
    left join public.pharmacies p
      on p.id = ae.pharmacy_id
  ),
  filtered as (
    select
      u.*
    from unified u
    where
      (
        p_pharmacy_id is null
        or u.pharmacy_id = p_pharmacy_id
      )
      and (
        nullif(trim(coalesce(p_event_type, '')), '') is null
        or u.event_type = p_event_type
      )
      and (
        nullif(trim(coalesce(p_module_name, '')), '') is null
        or u.module_name = p_module_name
      )
      and (
        nullif(trim(coalesce(p_source, '')), '') is null
        or u.source = p_source
      )
      and (
        nullif(trim(coalesce(p_severity, '')), '') is null
        or u.severity = p_severity
      )
      and (
        p_success is null
        or u.success = p_success
      )
      and (
        p_start_date is null
        or u.created_at >= p_start_date
      )
      and (
        p_end_date is null
        or u.created_at <= p_end_date
      )
      and (
        nullif(trim(coalesce(p_search, '')), '') is null
        or coalesce(u.actor_email, '') ilike
          '%' || trim(p_search) || '%'
        or coalesce(u.pharmacy_name, '') ilike
          '%' || trim(p_search) || '%'
        or coalesce(u.event_type, '') ilike
          '%' || trim(p_search) || '%'
        or coalesce(u.module_name, '') ilike
          '%' || trim(p_search) || '%'
        or coalesce(u.entity_type, '') ilike
          '%' || trim(p_search) || '%'
        or coalesce(u.entity_label, '') ilike
          '%' || trim(p_search) || '%'
        or coalesce(u.description, '') ilike
          '%' || trim(p_search) || '%'
      )
  )
  select
    f.id,
    f.pharmacy_id,
    f.pharmacy_name,
    f.actor_user_id,
    f.actor_email,
    f.event_type,
    f.module_name,
    f.entity_type,
    f.entity_id,
    f.entity_label,
    f.description,
    f.severity,
    f.old_values,
    f.new_values,
    f.metadata,
    f.ip_address,
    f.user_agent,
    f.success,
    f.created_at,
    f.source,
    count(*) over() as total_count
  from filtered f
  order by f.created_at desc
  limit greatest(
    1,
    least(coalesce(p_limit, 50), 100)
  )
  offset greatest(
    0,
    coalesce(p_offset, 0)
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_audit_metrics(p_pharmacy_id uuid DEFAULT NULL::uuid, p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(total_events bigint, successful_logins bigint, failed_logins bigint, active_users bigint, active_pharmacies bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is null then
    raise exception 'Utilisateur non authentifié.';
  end if;

  if not public.is_platform_admin(auth.uid()) then
    raise exception 'Accès réservé au super administrateur.';
  end if;

  return query
  with all_events as (
    select
      al.pharmacy_id,
      al.actor_user_id::text as user_identifier,
      true as success,
      coalesce(al.action_type, al.action) as event_type,
      al.created_at
    from public.audit_logs al

    union all

    select
      ae.pharmacy_id,
      coalesce(ae.user_id::text, ae.email) as user_identifier,
      ae.success,
      ae.event_type,
      ae.created_at
    from public.auth_events ae
  ),
  filtered as (
    select *
    from all_events e
    where
      (
        p_pharmacy_id is null
        or e.pharmacy_id = p_pharmacy_id
      )
      and (
        p_start_date is null
        or e.created_at >= p_start_date
      )
      and (
        p_end_date is null
        or e.created_at <= p_end_date
      )
  )
  select
    count(*)::bigint as total_events,

    count(*) filter (
      where event_type = 'login_success'
        and success = true
    )::bigint as successful_logins,

    count(*) filter (
      where event_type = 'login_failed'
        or success = false
    )::bigint as failed_logins,

    count(distinct user_identifier) filter (
      where user_identifier is not null
    )::bigint as active_users,

    count(distinct pharmacy_id) filter (
      where pharmacy_id is not null
    )::bigint as active_pharmacies
  from filtered;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_most_active_pharmacies(p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_limit integer DEFAULT 10)
 RETURNS TABLE(pharmacy_id uuid, pharmacy_name text, total_events bigint, successful_logins bigint, failed_logins bigint, active_users bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is null then
    raise exception 'Utilisateur non authentifié.';
  end if;

  if not public.is_platform_admin(auth.uid()) then
    raise exception 'Accès réservé au super administrateur.';
  end if;

  return query
  with all_events as (
    select
      al.pharmacy_id,
      al.actor_user_id::text as user_identifier,
      true as success,
      coalesce(al.action_type, al.action) as event_type,
      al.created_at
    from public.audit_logs al

    union all

    select
      ae.pharmacy_id,
      coalesce(ae.user_id::text, ae.email) as user_identifier,
      ae.success,
      ae.event_type,
      ae.created_at
    from public.auth_events ae
  )
  select
    p.id as pharmacy_id,
    p.name::text as pharmacy_name,
    count(e.*)::bigint as total_events,

    count(e.*) filter (
      where e.event_type = 'login_success'
        and e.success = true
    )::bigint as successful_logins,

    count(e.*) filter (
      where e.event_type = 'login_failed'
        or e.success = false
    )::bigint as failed_logins,

    count(distinct e.user_identifier) filter (
      where e.user_identifier is not null
    )::bigint as active_users

  from public.pharmacies p
  left join all_events e
    on e.pharmacy_id = p.id
    and (
      p_start_date is null
      or e.created_at >= p_start_date
    )
    and (
      p_end_date is null
      or e.created_at <= p_end_date
    )

  group by p.id, p.name
  order by total_events desc, p.name asc
  limit greatest(
    1,
    least(coalesce(p_limit, 10), 100)
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_pharmacy_role(target_pharmacy_id uuid)
 RETURNS pharmacy_role
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select pm.role
  from public.pharmacy_members pm
  where pm.pharmacy_id = target_pharmacy_id
    and pm.user_id = auth.uid()
    and pm.is_active = true
  limit 1;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (
    id,
    full_name,
    phone,
    avatar_url
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.has_pharmacy_role(p_pharmacy_id uuid, p_roles text[])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    public.is_platform_admin()
    or exists (
      select 1
      from public.pharmacy_members pm
      where pm.pharmacy_id = p_pharmacy_id
        and pm.user_id = auth.uid()
        and pm.is_active = true
        and pm.role::text = any(p_roles)
    );
$function$
;

CREATE OR REPLACE FUNCTION public.is_pharmacy_member(target_pharmacy_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.pharmacy_members
    where pharmacy_id = target_pharmacy_id
      and user_id = auth.uid()
      and is_active = true
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_pharmacy_open_now(p_pharmacy_id uuid, p_at timestamp with time zone DEFAULT now())
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  v_is_24h boolean;
  v_day smallint;
  v_time time;
  v_found boolean := false;
begin
  select p.is_24h
  into v_is_24h
  from public.pharmacies p
  where p.id = p_pharmacy_id;

  if coalesce(v_is_24h, false) = true then
    return true;
  end if;

  -- RDC : Africa/Kinshasa. Si besoin plus tard, on ajoutera timezone par pharmacie.
  v_day := extract(dow from timezone('Africa/Kinshasa', p_at))::smallint;
  v_time := timezone('Africa/Kinshasa', p_at)::time;

  select exists (
    select 1
    from public.pharmacy_opening_hours h
    where h.pharmacy_id = p_pharmacy_id
      and h.day_of_week = v_day
      and h.is_closed = false
      and (
        h.is_24h = true
        or (
          h.open_time is not null
          and h.close_time is not null
          and (
            -- horaire normal : 08:00 - 20:00
            (h.open_time <= h.close_time and v_time >= h.open_time and v_time <= h.close_time)
            or
            -- horaire de nuit : 20:00 - 06:00
            (h.open_time > h.close_time and (v_time >= h.open_time or v_time <= h.close_time))
          )
        )
      )
  )
  into v_found;

  return coalesce(v_found, false);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.is_pharmacy_open_now_v2(p_pharmacy_id uuid, p_at timestamp with time zone DEFAULT now())
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_mode text;
  v_is_24h boolean;
  v_day smallint;
  v_time time;
begin
  select
    coalesce(p.public_opening_mode, 'automatic'),
    coalesce(p.is_24h, false)
  into
    v_mode,
    v_is_24h
  from public.pharmacies p
  where p.id = p_pharmacy_id;

  if not found then
    return false;
  end if;

  if v_mode = 'forced_open' then
    return true;
  end if;

  if v_mode = 'forced_closed' then
    return false;
  end if;

  if v_is_24h then
    return true;
  end if;

  v_day :=
    extract(
      dow from timezone('Africa/Kinshasa', p_at)
    )::smallint;

  v_time :=
    timezone('Africa/Kinshasa', p_at)::time;

  return exists (
    select 1
    from public.pharmacy_opening_hours h
    where h.pharmacy_id = p_pharmacy_id
      and h.day_of_week = v_day
      and h.is_closed = false
      and (
        h.is_24h = true
        or (
          h.open_time is not null
          and h.close_time is not null
          and (
            (
              h.open_time <= h.close_time
              and v_time >= h.open_time
              and v_time <= h.close_time
            )
            or
            (
              h.open_time > h.close_time
              and (
                v_time >= h.open_time
                or v_time <= h.close_time
              )
            )
          )
        )
      )
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.platform_admins
    where user_id = auth.uid() and is_active = true
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_platform_admin(p_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = p_user_id
      and pa.is_active = true
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_platform_admin_user(p_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = p_user_id
      and pa.is_active = true
  );
$function$
;

CREATE OR REPLACE FUNCTION public.log_auth_event(p_event_type text, p_email text DEFAULT NULL::text, p_success boolean DEFAULT true, p_failure_reason text DEFAULT NULL::text, p_pharmacy_id uuid DEFAULT NULL::uuid, p_ip_address text DEFAULT NULL::text, p_user_agent text DEFAULT NULL::text, p_device_type text DEFAULT NULL::text, p_browser_name text DEFAULT NULL::text, p_operating_system text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_event_id uuid;
  v_ip inet;
begin
  if p_event_type not in (
    'login_success',
    'login_failed',
    'logout',
    'password_changed',
    'password_reset_requested',
    'password_reset_completed'
  ) then
    raise exception 'Type d’événement d’authentification invalide.';
  end if;

  begin
    v_ip := nullif(trim(coalesce(p_ip_address, '')), '')::inet;
  exception
    when others then
      v_ip := null;
  end;

  insert into public.auth_events (
    user_id,
    pharmacy_id,
    email,
    event_type,
    success,
    failure_reason,
    ip_address,
    user_agent,
    device_type,
    browser_name,
    operating_system,
    metadata
  )
  values (
    auth.uid(),
    p_pharmacy_id,
    nullif(lower(trim(coalesce(p_email, ''))), ''),
    p_event_type,
    coalesce(p_success, true),
    nullif(trim(coalesce(p_failure_reason, '')), ''),
    v_ip,
    nullif(trim(coalesce(p_user_agent, '')), ''),
    nullif(trim(coalesce(p_device_type, '')), ''),
    nullif(trim(coalesce(p_browser_name, '')), ''),
    nullif(trim(coalesce(p_operating_system, '')), ''),
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_event_id;

  return v_event_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.remove_batch_from_sale(p_batch_id uuid, p_reason text DEFAULT 'Retrait du lot de la vente'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$declare
v_pharmacy_id uuid;
  target_batch record;
  removed_quantity numeric;
begin
select pharmacy_id
into v_pharmacy_id
from public.product_batches
where id = p_batch_id;

if v_pharmacy_id is null then
  raise exception 'Lot introuvable.';
end if;

perform public.assert_pharmacy_role(
  v_pharmacy_id,
  array['owner','manager','pharmacist','stock_manager']
);
  if auth.uid() is null then
    raise exception 'Utilisateur non authentifié.';
  end if;

  select *
  into target_batch
  from public.product_batches
  where id = p_batch_id
  limit 1;

  if target_batch.id is null then
    raise exception 'Lot introuvable.';
  end if;

  if not public.can_manage_inventory(target_batch.pharmacy_id) then
    raise exception 'Accès refusé pour la gestion du stock.';
  end if;

  removed_quantity := coalesce(target_batch.quantity_available, 0);

  if removed_quantity <= 0 then
    update public.product_batches
    set is_active = false
    where id = p_batch_id;

    return p_batch_id;
  end if;

  insert into public.stock_movements (
    pharmacy_id,
    product_id,
    batch_id,
    movement_type,
    quantity,
    unit_cost,
    unit_price,
    reference_type,
    reference_id,
    reason,
    user_id
  )
  values (
    target_batch.pharmacy_id,
    target_batch.product_id,
    target_batch.id,
    'expired',
    removed_quantity,
    target_batch.purchase_price,
    target_batch.selling_price,
    'expiration_removal',
    target_batch.id,
    coalesce(nullif(trim(p_reason), ''), 'Retrait du lot de la vente'),
    auth.uid()
  );

  update public.product_batches
  set
    quantity_available = 0,
    is_active = false
  where id = p_batch_id;

  return p_batch_id;
end;$function$
;

CREATE OR REPLACE FUNCTION public.remove_batch_from_sale(p_pharmacy_id uuid, p_batch_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid;
  v_product_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Utilisateur non connecté.';
  end if;

  if not exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = v_user_id
  )
  and not exists (
    select 1
    from public.pharmacy_members pm
    where pm.pharmacy_id = p_pharmacy_id
      and pm.user_id = v_user_id
      and pm.is_active = true
      and pm.role in ('owner', 'manager', 'pharmacist', 'stock_manager')
  ) then
    raise exception 'Accès non autorisé pour retirer ce lot.';
  end if;

  select product_id
  into v_product_id
  from public.product_batches
  where id = p_batch_id
    and pharmacy_id = p_pharmacy_id;

  if v_product_id is null then
    raise exception 'Lot introuvable dans cette pharmacie.';
  end if;

  update public.product_batches
  set
    is_active = false,
    updated_at = now()
  where id = p_batch_id
    and pharmacy_id = p_pharmacy_id;

  return p_batch_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.search_public_open_pharmacies(p_city text DEFAULT NULL::text, p_commune text DEFAULT NULL::text, p_district text DEFAULT NULL::text, p_product_search text DEFAULT NULL::text, p_open_now_only boolean DEFAULT true)
 RETURNS TABLE(pharmacy_id uuid, pharmacy_name text, logo_url text, city text, commune text, district text, address text, latitude numeric, longitude numeric, phone text, whatsapp text, is_24h boolean, is_open_now boolean, accepts_public_calls boolean, product_availability text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with public_pharmacies as (
    select
      p.id,
      p.name,
      p.logo_url,
      p.city,
      p.commune,
      p.district,
      p.address,
      p.latitude,
      p.longitude,
      p.phone,
      p.whatsapp,
      p.is_24h,
      p.accepts_public_calls,
      case
        when p.public_opening_mode = 'forced_open' then true
        when p.public_opening_mode = 'forced_closed' then false
        when p.is_24h then true
        else true
      end as currently_open
    from public.pharmacies p
    where p.is_active = true
      and p.status = 'active'
      and p.is_public_visible = true
      and (
        nullif(trim(p_city), '') is null
        or p.city ilike '%' || trim(p_city) || '%'
      )
      and (
        nullif(trim(p_commune), '') is null
        or p.commune ilike '%' || trim(p_commune) || '%'
      )
      and (
        nullif(trim(p_district), '') is null
        or p.district ilike '%' || trim(p_district) || '%'
      )
  )
  select
    pp.id as pharmacy_id,
    pp.name as pharmacy_name,
    pp.logo_url,
    pp.city,
    pp.commune,
    pp.district,
    pp.address,
    pp.latitude,
    pp.longitude,
    pp.phone,
    pp.whatsapp,
    pp.is_24h,
    pp.currently_open as is_open_now,
    pp.accepts_public_calls,
    case
      when nullif(trim(p_product_search), '') is null then
        'Contactez la pharmacie pour confirmer'
      when exists (
        select 1
        from public.v_sellable_products sp
        where sp.pharmacy_id = pp.id
          and sp.total_quantity > 0
          and (
            sp.name ilike '%' || trim(p_product_search) || '%'
            or coalesce(sp.generic_name, '') ilike '%' || trim(p_product_search) || '%'
          )
      ) then 'Disponible'
      else 'À confirmer'
    end as product_availability
  from public_pharmacies pp
  where p_open_now_only = false or pp.currently_open = true
  order by pp.currently_open desc, pp.name asc;
$function$
;

CREATE OR REPLACE FUNCTION public.search_public_open_pharmacies_v2(p_city text DEFAULT NULL::text, p_commune text DEFAULT NULL::text, p_district text DEFAULT NULL::text, p_product_search text DEFAULT NULL::text, p_open_now_only boolean DEFAULT true)
 RETURNS TABLE(pharmacy_id uuid, pharmacy_name text, logo_url text, city text, commune text, district text, address text, phone text, whatsapp text, is_24h boolean, is_open_now boolean, accepts_public_calls boolean, product_availability text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  return query
  select
    ph.id,
    ph.name,
    ph.logo_url,
    ph.city,
    ph.commune,
    ph.district,
    ph.address,
    ph.phone,
    ph.whatsapp,
    coalesce(ph.is_24h, false),
    public.is_pharmacy_open_now(ph.id),
    coalesce(ph.accepts_public_calls, true),

    case
      when nullif(trim(p_product_search), '') is null
        then 'Non recherché'::text

      when exists (
        select 1
        from public.v_sellable_products sp
        where sp.pharmacy_id = ph.id
          and coalesce(sp.total_quantity, 0) > 0
          and (
            coalesce(sp.name, '') ilike
              '%' || trim(p_product_search) || '%'
            or coalesce(sp.generic_name, '') ilike
              '%' || trim(p_product_search) || '%'
            or coalesce(sp.barcode, '') ilike
              '%' || trim(p_product_search) || '%'
          )
      )
        then 'Disponible à confirmer'::text

      else 'Non confirmé'::text
    end

  from public.pharmacies ph
  where coalesce(ph.status, 'active') = 'active'
    and coalesce(ph.is_public_visible, false) = true
    and (
      nullif(trim(p_city), '') is null
      or coalesce(ph.city, '') ilike '%' || trim(p_city) || '%'
    )
    and (
      nullif(trim(p_commune), '') is null
      or coalesce(ph.commune, '') ilike '%' || trim(p_commune) || '%'
    )
    and (
      nullif(trim(p_district), '') is null
      or coalesce(ph.district, '') ilike '%' || trim(p_district) || '%'
    )
    and (
      p_open_now_only = false
      or public.is_pharmacy_open_now(ph.id) = true
    )

  order by
    public.is_pharmacy_open_now(ph.id) desc,
    ph.city nulls last,
    ph.commune nulls last,
    ph.district nulls last,
    ph.name;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.search_public_open_pharmacies_v3(p_city text DEFAULT NULL::text, p_commune text DEFAULT NULL::text, p_district text DEFAULT NULL::text, p_product_search text DEFAULT NULL::text, p_open_now_only boolean DEFAULT true)
 RETURNS TABLE(pharmacy_id uuid, pharmacy_name text, logo_url text, city text, commune text, district text, address text, phone text, whatsapp text, is_24h boolean, is_open_now boolean, accepts_public_calls boolean, product_availability text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  return query
  select
    ph.id,
    ph.name,
    ph.logo_url,
    ph.city,
    ph.commune,
    ph.district,
    ph.address,
    ph.phone,
    ph.whatsapp,
    coalesce(ph.is_24h, false),
    public.is_pharmacy_open_now_v2(ph.id),
    coalesce(ph.accepts_public_calls, true),

    case
      when nullif(trim(p_product_search), '') is null
        then 'Non recherché'::text

      when exists (
        select 1
        from public.v_sellable_products sp
        where sp.pharmacy_id = ph.id
          and coalesce(sp.total_quantity, 0) > 0
          and (
            coalesce(sp.name, '') ilike
              '%' || trim(p_product_search) || '%'
            or coalesce(sp.generic_name, '') ilike
              '%' || trim(p_product_search) || '%'
            or coalesce(sp.barcode, '') ilike
              '%' || trim(p_product_search) || '%'
          )
      )
        then 'Disponible à confirmer'::text

      else 'Non confirmé'::text
    end

  from public.pharmacies ph
  where coalesce(ph.status, 'active') = 'active'
    and coalesce(ph.is_public_visible, false) = true

    and (
      nullif(trim(p_city), '') is null
      or coalesce(ph.city, '') ilike
        '%' || trim(p_city) || '%'
    )

    and (
      nullif(trim(p_commune), '') is null
      or coalesce(ph.commune, '') ilike
        '%' || trim(p_commune) || '%'
    )

    and (
      nullif(trim(p_district), '') is null
      or coalesce(ph.district, '') ilike
        '%' || trim(p_district) || '%'
    )

    and (
      p_open_now_only = false
      or public.is_pharmacy_open_now_v2(ph.id)
    )

    and (
      nullif(trim(p_product_search), '') is null
      or exists (
        select 1
        from public.v_sellable_products sp
        where sp.pharmacy_id = ph.id
          and coalesce(sp.total_quantity, 0) > 0
          and (
            coalesce(sp.name, '') ilike
              '%' || trim(p_product_search) || '%'
            or coalesce(sp.generic_name, '') ilike
              '%' || trim(p_product_search) || '%'
            or coalesce(sp.barcode, '') ilike
              '%' || trim(p_product_search) || '%'
          )
      )
    )

  order by
    public.is_pharmacy_open_now_v2(ph.id) desc,
    ph.city nulls last,
    ph.commune nulls last,
    ph.district nulls last,
    ph.name;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_pharmacy_public_opening_mode(p_pharmacy_id uuid, p_mode text)
 RETURNS TABLE(pharmacy_id uuid, opening_mode text, is_open_now boolean, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid;
  v_updated_at timestamptz;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Utilisateur non authentifié.';
  end if;

  if p_mode not in (
    'automatic',
    'forced_open',
    'forced_closed'
  ) then
    raise exception 'Statut d’ouverture invalide.';
  end if;

  if not exists (
    select 1
    from public.pharmacy_members pm
    where pm.pharmacy_id = p_pharmacy_id
      and pm.user_id = v_user_id
      and pm.is_active = true
      and pm.role in (
        'owner',
        'manager',
        'pharmacist'
      )
  )
  and not exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = v_user_id
      and pa.is_active = true
  ) then
    raise exception
      'Vous n’avez pas l’autorisation de modifier le statut de cette pharmacie.';
  end if;

  v_updated_at := now();

  update public.pharmacies
  set
    public_opening_mode = p_mode,
    public_opening_status_updated_at = v_updated_at,
    public_opening_status_updated_by = v_user_id
  where id = p_pharmacy_id;

  if not found then
    raise exception 'Pharmacie introuvable.';
  end if;

  return query
  select
    p.id,
    p.public_opening_mode,
    public.is_pharmacy_open_now_v2(p.id),
    p.public_opening_status_updated_at
  from public.pharmacies p
  where p.id = p_pharmacy_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.write_audit_log(p_pharmacy_id uuid, p_action text, p_entity_type text, p_entity_id uuid DEFAULT NULL::uuid, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_audit_id uuid;
begin
  insert into public.audit_logs (
    pharmacy_id,
    actor_user_id,
    actor_email,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    p_pharmacy_id,
    auth.uid(),
    auth.jwt() ->> 'email',
    p_action,
    p_entity_type,
    p_entity_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_audit_id;

  return v_audit_id;
end;
$function$
;