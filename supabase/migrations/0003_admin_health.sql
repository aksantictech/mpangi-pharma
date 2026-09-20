-- ============================================================================
-- Mesures de santé de la base (Super Admin > Paramètres système)
-- ============================================================================
-- Fournit à la page /admin/stabilite des mesures RÉELLES que le client
-- supabase-js ne peut pas lire directement : taille de la base, connexions
-- ouvertes, taux de cache, tables sans RLS et contrôles d'intégrité des
-- données. Lecture seule : aucune table n'est modifiée.
--
-- Sécurité : SECURITY DEFINER + exécution réservée à service_role (comme
-- admin_delete_pharmacy) : la fonction n'est appelable que par les routes
-- serveur du Super Admin, jamais depuis un navigateur (anon/authenticated).
--
-- Robustesse : chaque mesure est isolée dans son propre bloc
-- begin/exception. Si une colonne ou une vue diffère de ce qui est attendu,
-- seule CETTE mesure passe à null (affichée « non vérifiable ») au lieu de
-- faire échouer toute la fonction.
--
-- Idempotente : create or replace, rejouable sans risque.
-- ============================================================================

create or replace function public.admin_database_health()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_result jsonb := '{}'::jsonb;
  v_value jsonb;
begin
  -- Taille de la base (octets)
  begin
    v_result := v_result || jsonb_build_object(
      'db_size_bytes', pg_database_size(current_database())
    );
  exception when others then null;
  end;

  -- Connexions ouvertes / maximum autorisé
  begin
    v_result := v_result || jsonb_build_object(
      'connections_used',
        (select count(*) from pg_stat_activity where datname = current_database()),
      'connections_max',
        current_setting('max_connections')::int
    );
  exception when others then null;
  end;

  -- Taux de lectures servies depuis la mémoire (cache hit ratio, en %)
  begin
    select to_jsonb(round(
      100.0 * sum(blks_hit) / nullif(sum(blks_hit + blks_read), 0), 2
    ))
    into v_value
    from pg_stat_database
    where datname = current_database();

    v_result := v_result || jsonb_build_object('cache_hit_ratio', v_value);
  exception when others then null;
  end;

  -- Tables du schéma public SANS row level security
  begin
    select coalesce(jsonb_agg(c.relname order by c.relname), '[]'::jsonb)
    into v_value
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and not c.relrowsecurity;

    v_result := v_result || jsonb_build_object('tables_without_rls', v_value);
  exception when others then null;
  end;

  -- Contrôles d'intégrité : nombre d'anomalies (0 = OK), null = non vérifiable
  begin
    v_result := v_result || jsonb_build_object(
      'integrity_negative_batches',
        (select count(*) from public.product_batches where quantity_available < 0)
    );
  exception when others then null;
  end;

  begin
    v_result := v_result || jsonb_build_object(
      'integrity_sales_without_items',
        (select count(*) from public.sales s
          where not exists (
            select 1 from public.sale_items i where i.sale_id = s.id
          ))
    );
  exception when others then null;
  end;

  begin
    v_result := v_result || jsonb_build_object(
      'integrity_orphan_sale_items',
        (select count(*) from public.sale_items i
          where not exists (
            select 1 from public.sales s where s.id = i.sale_id
          ))
    );
  exception when others then null;
  end;

  begin
    v_result := v_result || jsonb_build_object(
      'integrity_pharmacies_without_manager',
        (select count(*) from public.pharmacies p
          where p.is_active
            and p.archived_at is null
            and not exists (
              select 1 from public.pharmacy_members m
              where m.pharmacy_id = p.id
                and m.is_active
                and m.role::text in ('owner', 'manager')
            ))
    );
  exception when others then null;
  end;

  begin
    v_result := v_result || jsonb_build_object(
      'integrity_pharmacies_without_settings',
        (select count(*) from public.pharmacies p
          where p.archived_at is null
            and not exists (
              select 1 from public.pharmacy_settings ps
              where ps.pharmacy_id = p.id
            ))
    );
  exception when others then null;
  end;

  begin
    v_result := v_result || jsonb_build_object(
      'integrity_pharmacies_without_subscription',
        (select count(*) from public.pharmacies p
          where p.archived_at is null
            and not exists (
              select 1 from public.pharmacy_subscriptions s
              where s.pharmacy_id = p.id
            ))
    );
  exception when others then null;
  end;

  return v_result;
end;
$function$;

revoke all on function public.admin_database_health() from public, anon, authenticated;
grant execute on function public.admin_database_health() to service_role;
