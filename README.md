# Notre cuisine

Petit site de recettes en commun, pensé pour le téléphone (appli installable sur Android) et alimenté depuis une conversation Claude : on copie ou partage la recette finale, elle arrive sur le site.

**Statut : version 1 écrite et testée en local ; reste à la mettre en ligne** (voir [docs/deploiement.md](docs/deploiement.md)).

## Ce que fait le site

- Recettes avec choix du nombre de personnes (quantités recalculées et lisibles), chronos et photo de présentation.
- Ajout depuis Claude : un bloc au format fixe, à copier ou à partager vers l'appli.
- Variantes : plusieurs recettes d'un même plat (`variante_de` et `nom_variante` dans le bloc), regroupées sur une seule carte de l'accueil et reliées par des pastilles sur la page de la recette.
- Trois niveaux d'accès : admin (valide, modifie, supprime, invite), membre reconnue (publie tout de suite), visiteur (en attente de validation).
- Claude peut chercher et lire les recettes : `/api/recettes`. Sa documentation complète est sur `/docs` (aussi `/readme` et `/llms.txt`) ; la page `/claude` donne les instructions à coller.
- Chaque personne gère ses appareils sur `/compte`, où se trouve aussi le bouton « Installer l'appli » (il apparaît aussi en haut du site quand le navigateur propose l'installation).
- Sur `/compte`, on peut aussi créer un **jeton pour Claude** (clé secrète `nc_…`, affichée une seule fois, 5 au maximum, retirable). Envoyé en `Authorization: Bearer`, il permet à Claude de publier des recettes directement (`POST /api/recettes`) avec les droits d'un membre, jamais ceux d'un admin. Il ne peut créer ni appareil, ni autre jeton.
- `robots.txt` laisse lire le site (pour que Claude puisse le consulter) sauf `/admin` et `/invite/` ; les moteurs de recherche restent écartés par l'en-tête `noindex`.
- Liste des recettes avec recherche en direct, catégories et tri, animés (les cartes glissent, avec respect du réglage « réduire les animations »).

## Développer

```bash
npm install
npm run dev      # http://localhost:3000, sans Supabase : base en mémoire avec une recette d'exemple.
                 # Pour voir les écrans réservés : cookie `nc_device=dev-admin` (administrateur de démonstration).
npm test         # tests (Vitest)
npm run build    # vérifie que tout se construit
npm run invite -- --role admin --name Prénom   # crée un lien d'invitation (demande les clés Supabase dans .env.production.local, jamais lu par npm run dev)
npm run icons    # refait les icônes de l'appli
```

Stack : Next.js (App Router), TypeScript, Tailwind, Supabase (Postgres), Vercel.

## Documents

- Conception : [docs/2026-10-18-recettes-famille-design.md](docs/2026-10-18-recettes-famille-design.md)
- Plan de développement : [docs/superpowers/plans/2026-10-18-notre-cuisine.md](docs/superpowers/plans/2026-10-18-notre-cuisine.md)
- Mise en ligne et vérifications : [docs/deploiement.md](docs/deploiement.md)
