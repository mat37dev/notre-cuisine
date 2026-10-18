-- Jetons d'accès pour Claude : ils réutilisent la table des appareils (même empreinte, même retrait),
-- avec un genre pour les distinguer d'un appareil reconnu par cookie.
alter table devices
  add column kind text not null default 'appareil' check (kind in ('appareil', 'jeton'));
