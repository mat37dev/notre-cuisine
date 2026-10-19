-- Les jetons d'accès pour Claude reviennent : on recrée la colonne retirée par 20261019000000_retire_jetons.sql
-- (les jetons supprimés alors ne reviennent pas : il faut en recréer dans « Mon compte »).
alter table devices
  add column if not exists kind text not null default 'appareil' check (kind in ('appareil', 'jeton'));
