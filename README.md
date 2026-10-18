# Notre cuisine

Petit site de recettes en commun, pensé pour le téléphone (appli installable sur Android) et alimenté depuis une conversation Claude : on copie ou partage la recette finale, elle arrive sur le site.

**Statut : version 1 écrite et testée en local ; reste à la mettre en ligne** (voir [docs/deploiement.md](docs/deploiement.md)).

## Ce que fait le site

- Recettes avec choix du nombre de personnes (quantités recalculées et lisibles) et chronos.
- Ajout depuis Claude : un bloc au format fixe, à copier ou à partager vers l'appli.
- Trois niveaux d'accès : admin (valide, modifie, supprime, invite), membre reconnue (publie tout de suite), visiteur (en attente de validation).
- Claude peut chercher et lire les recettes : `/api/recettes` et la page `/claude`.

## Développer

```bash
npm install
npm run dev      # http://localhost:3000, sans Supabase : base en mémoire avec une recette d'exemple
npm test         # tests (Vitest)
npm run build    # vérifie que tout se construit
npm run invite -- --role admin --name Prénom   # crée un lien d'invitation (demande les clés Supabase dans .env.local)
npm run icons    # refait les icônes de l'appli
```

Stack : Next.js (App Router), TypeScript, Tailwind, Supabase (Postgres), Vercel.

## Documents

- Conception : [docs/2026-10-18-recettes-famille-design.md](docs/2026-10-18-recettes-famille-design.md)
- Plan de développement : [docs/superpowers/plans/2026-10-18-notre-cuisine.md](docs/superpowers/plans/2026-10-18-notre-cuisine.md)
- Mise en ligne et vérifications : [docs/deploiement.md](docs/deploiement.md)
