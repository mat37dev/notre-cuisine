-- Variantes : une recette peut être rattachée à la recette de référence d'un plat.
-- Contient toujours l'id de la référence (jamais celui d'une autre variante) ; null pour une recette indépendante ou de référence.
alter table recipes add column variante_de uuid references recipes (id) on delete set null;
create index recipes_variante_de_idx on recipes (variante_de);
