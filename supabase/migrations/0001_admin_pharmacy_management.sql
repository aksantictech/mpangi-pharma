-- Gestion Super Admin des pharmacies : archivage + suppression définitive.
-- A executer une seule fois dans Supabase SQL Editor (ou via une future
-- pipeline de migrations). Idempotent : peut etre relance sans danger.

-- 1. Colonne d'archivage (distincte de is_active, qui reste le
--    marqueur "compte suspendu / desactive").
alter table public.pharmacies
  add column if not exists archived_at timestamptz;

-- 2. Suppression definitive et complete d'une pharmacie et de toutes les
--    donnees qui lui sont rattachees.
--    Securite : PAS de controle is_platform_admin()/auth.uid() ici -
--    auth.uid() est NULL quand la fonction est appelee avec la cle
--    service_role (le cas normal, depuis la route API deja protegee par
--    requirePlatformAdmin()), donc ce controle echouait toujours a tort.
--    A la place, la fonction n'est accordee (grant) qu'au role service_role :
--    aucun utilisateur authentifie ne peut l'appeler directement, meme en
--    connaissant son nom, quel que soit son role.
--    Introspecte information_schema pour rester robuste si le schema evolue :
--    ne touche que les tables/colonnes qui existent reellement.
create or replace function public.admin_delete_pharmacy(p_pharmacy_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_table text;
  v_count bigint;
  v_deleted jsonb := '{}'::jsonb;
begin
  if not exists (select 1 from public.pharmacies where id = p_pharmacy_id) then
    raise exception 'Pharmacie introuvable.';
  end if;

  -- sale_items : rattache via pharmacy_id si present, sinon via sales.sale_id.
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'sale_items' and column_name = 'pharmacy_id'
  ) then
    delete from public.sale_items where pharmacy_id = p_pharmacy_id;
    get diagnostics v_count = row_count;
    v_deleted := v_deleted || jsonb_build_object('sale_items', v_count);
  elsif exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'sale_items' and column_name = 'sale_id'
  ) then
    delete from public.sale_items
    where sale_id in (select id from public.sales where pharmacy_id = p_pharmacy_id);
    get diagnostics v_count = row_count;
    v_deleted := v_deleted || jsonb_build_object('sale_items', v_count);
  end if;

  -- Tables simples rattachees par pharmacy_id, dans un ordre qui respecte
  -- les dependances usuelles (mouvements/ventes avant lots/produits, puis
  -- produits avant categories/fournisseurs, puis le reste).
  foreach v_table in array array[
    'stock_movements',
    'sales',
    'product_batches',
    'products',
    'product_categories',
    'suppliers',
    'customers',
    'expenses',
    'pricing_rules',
    'pharmacy_opening_hours',
    'pharmacy_settings',
    'audit_logs',
    'auth_events',
    'pharmacy_members'
  ]
  loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = v_table and column_name = 'pharmacy_id'
    ) then
      execute format('delete from public.%I where pharmacy_id = $1', v_table)
        using p_pharmacy_id;
      get diagnostics v_count = row_count;
      v_deleted := v_deleted || jsonb_build_object(v_table, v_count);
    end if;
  end loop;

  -- stock_requests : deux colonnes pharmacie possibles (demandeuse / fournisseuse).
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'stock_requests'
      and column_name = 'requesting_pharmacy_id'
  ) then
    delete from public.stock_requests
    where requesting_pharmacy_id = p_pharmacy_id
       or supplier_pharmacy_id = p_pharmacy_id;
    get diagnostics v_count = row_count;
    v_deleted := v_deleted || jsonb_build_object('stock_requests', v_count);
  end if;

  delete from public.pharmacies where id = p_pharmacy_id;
  v_deleted := v_deleted || jsonb_build_object('pharmacies', 1);

  return v_deleted;
end;
$$;

revoke all on function public.admin_delete_pharmacy(uuid) from public, anon, authenticated;
grant execute on function public.admin_delete_pharmacy(uuid) to service_role;
