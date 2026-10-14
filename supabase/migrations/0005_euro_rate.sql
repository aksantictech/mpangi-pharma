-- 0005_euro_rate.sql
-- Taux de change EUR de la pharmacie, utilisé pour afficher les montants en
-- euros (les montants restent enregistrés en CDF). Idempotent.
begin;

alter table public.pharmacies
  add column if not exists exchange_rate_eur numeric;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'pharmacies_exchange_rate_eur_positive'
  ) then
    alter table public.pharmacies
      add constraint pharmacies_exchange_rate_eur_positive
      check (exchange_rate_eur is null or exchange_rate_eur > 0);
  end if;
end $$;

commit;
