-- 0006_stock_ledger.sql
--
-- Journal de stock complet : à tout instant, pour chaque lot,
--     quantité disponible = somme (signée) des mouvements du lot.
--
-- Constat (audit de la base du 14/10/2026) : les fonctions add_product_batch
-- (« Entrée stock » / « Ajouter lot ») et correct_batch_quantity (« Corriger
-- quantité ») modifient les lots SANS écrire de mouvement. L'historique des
-- mouvements, l'inventaire par période et toute synchronisation future
-- reposent sur cette égalité.
--
-- Cette migration :
--   1. rattrape les mouvements manquants (une seule fois, idempotent) ;
--   2. installe un garde-fou en base : à la fin de chaque transaction, si un
--      lot touché n'est pas couvert par ses mouvements, un mouvement de
--      régularisation est ajouté. Il ne réécrit aucune fonction existante et
--      ne peut jamais faire échouer une opération de stock (toute erreur est
--      convertie en avertissement).
--
-- Idempotent : peut être relancée sans effet si tout est déjà cohérent.

begin;

-- Effet d'un mouvement sur le stock : + entrée, - sortie. Une correction
-- d'inventaire garde le signe enregistré. Le type est comparé en texte pour ne
-- pas dépendre des valeurs de l'énumération.
create or replace function public.stock_movement_effect(
  p_type text,
  p_quantity numeric
)
returns numeric
language sql
immutable
as $$
  select case
    when p_type in ('supplier_entry', 'customer_return', 'adjustment_in', 'transfer_in')
      then abs(coalesce(p_quantity, 0))
    when p_type in ('sale', 'supplier_return', 'adjustment_out', 'loss', 'damage', 'expired', 'transfer_out')
      then -abs(coalesce(p_quantity, 0))
    else coalesce(p_quantity, 0)
  end;
$$;

-- 1. Rattrapage ---------------------------------------------------------

create temporary table _ledger_gaps on commit drop as
select
  b.id as batch_id,
  b.pharmacy_id,
  b.product_id,
  b.purchase_price,
  b.selling_price,
  b.created_at,
  b.updated_at,
  b.quantity_available - coalesce(m.net, 0) as diff,
  coalesce(m.has_entry, false) as has_entry
from public.product_batches b
left join lateral (
  select
    sum(public.stock_movement_effect(sm.movement_type::text, sm.quantity)) as net,
    bool_or(sm.movement_type::text = 'supplier_entry') as has_entry
  from public.stock_movements sm
  where sm.batch_id = b.id
) m on true
where b.quantity_available - coalesce(m.net, 0) <> 0;

-- Stock entré sans mouvement d'entrée : entrée à la date de création du lot.
insert into public.stock_movements (
  pharmacy_id, product_id, batch_id, movement_type, quantity,
  unit_cost, unit_price, reference_type, reason, user_id, created_at
)
select
  g.pharmacy_id, g.product_id, g.batch_id, 'supplier_entry', g.diff,
  g.purchase_price, g.selling_price, 'ledger_backfill',
  'Entrée de stock (mouvement régularisé)', null, g.created_at
from _ledger_gaps g
where g.diff > 0 and not g.has_entry;

-- Quantité ajoutée plus tard sans mouvement.
insert into public.stock_movements (
  pharmacy_id, product_id, batch_id, movement_type, quantity,
  unit_cost, unit_price, reference_type, reason, user_id, created_at
)
select
  g.pharmacy_id, g.product_id, g.batch_id, 'adjustment_in', g.diff,
  g.purchase_price, g.selling_price, 'ledger_backfill',
  'Correction de quantité (mouvement régularisé)', null, g.updated_at
from _ledger_gaps g
where g.diff > 0 and g.has_entry;

-- Quantité retirée sans mouvement (correction ou retrait de lot).
insert into public.stock_movements (
  pharmacy_id, product_id, batch_id, movement_type, quantity,
  unit_cost, unit_price, reference_type, reason, user_id, created_at
)
select
  g.pharmacy_id, g.product_id, g.batch_id, 'adjustment_out', abs(g.diff),
  g.purchase_price, g.selling_price, 'ledger_backfill',
  'Retrait de quantité (mouvement régularisé)', null, g.updated_at
from _ledger_gaps g
where g.diff < 0;

-- 2. Garde-fou ----------------------------------------------------------

create or replace function public.tg_batch_ledger_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_batch record;
  v_net numeric;
  v_has_entry boolean;
  v_diff numeric;
begin
  begin
    select id, pharmacy_id, product_id, purchase_price, selling_price,
           quantity_available
      into v_batch
    from public.product_batches
    where id = new.id;

    -- Lot supprimé dans la même transaction : rien à régulariser.
    if not found then
      return null;
    end if;

    select
      coalesce(sum(public.stock_movement_effect(sm.movement_type::text, sm.quantity)), 0),
      coalesce(bool_or(sm.movement_type::text = 'supplier_entry'), false)
      into v_net, v_has_entry
    from public.stock_movements sm
    where sm.batch_id = v_batch.id;

    v_diff := v_batch.quantity_available - v_net;

    if v_diff = 0 then
      return null;
    end if;

    if v_diff > 0 and not v_has_entry then
      insert into public.stock_movements (
        pharmacy_id, product_id, batch_id, movement_type, quantity,
        unit_cost, unit_price, reference_type, reason, user_id
      )
      values (
        v_batch.pharmacy_id, v_batch.product_id, v_batch.id, 'supplier_entry',
        v_diff, v_batch.purchase_price, v_batch.selling_price, 'ledger_guard',
        'Entrée de stock', auth.uid()
      );
    elsif v_diff > 0 then
      insert into public.stock_movements (
        pharmacy_id, product_id, batch_id, movement_type, quantity,
        unit_cost, unit_price, reference_type, reason, user_id
      )
      values (
        v_batch.pharmacy_id, v_batch.product_id, v_batch.id, 'adjustment_in',
        v_diff, v_batch.purchase_price, v_batch.selling_price, 'ledger_guard',
        'Correction de quantité (augmentation)', auth.uid()
      );
    else
      insert into public.stock_movements (
        pharmacy_id, product_id, batch_id, movement_type, quantity,
        unit_cost, unit_price, reference_type, reason, user_id
      )
      values (
        v_batch.pharmacy_id, v_batch.product_id, v_batch.id, 'adjustment_out',
        abs(v_diff), v_batch.purchase_price, v_batch.selling_price, 'ledger_guard',
        'Correction de quantité (diminution)', auth.uid()
      );
    end if;
  exception when others then
    -- Le garde-fou ne doit jamais bloquer une opération de stock.
    raise warning 'tg_batch_ledger_guard: % (lot %)', sqlerrm, new.id;
  end;

  return null;
end;
$function$;

revoke all on function public.tg_batch_ledger_guard() from public, anon, authenticated;

drop trigger if exists tg_batch_ledger_guard on public.product_batches;

create constraint trigger tg_batch_ledger_guard
  after insert or update of quantity_available on public.product_batches
  deferrable initially deferred
  for each row
  execute function public.tg_batch_ledger_guard();

commit;
