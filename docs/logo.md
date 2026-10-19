# Logo « Notre cuisine »

Un carnet de recettes à marque-page, dont la couverture laisse voir une marmite en creux : toutes nos recettes au même endroit.
Dessiné avec le skill `logo-design`. Les fichiers sont dans `public/logo/` (donc aussi en ligne, par exemple `/logo/notre-cuisine-horizontal-color.svg`).

## Fichiers

| Fichier | Quand l'utiliser |
|---|---|
| `notre-cuisine-symbol-color.svg` | Le carnet seul, en couleur, à partir de 32 px de haut |
| `notre-cuisine-symbol-small-color.svg` | Le carnet simplifié (sans marque-page, grosse marmite) : de 16 à 40 px (onglet, en-tête du site) |
| `notre-cuisine-horizontal-color.svg` | Le carnet + le nom sur une ligne (en-têtes, documents) |
| `notre-cuisine-stacked-color.svg` | Le carnet au-dessus du nom (affiche, carré) |
| `notre-cuisine-wordmark-color.svg` | Le nom seul |
| `…-black.svg`, `…-white.svg` | Une seule couleur : noir (impression simple) ou blanc (fond sombre) |

Le nom est dessiné en contours (police Fraunces Bold, la même que le site, licence libre SIL OFL) : aucune police à installer.

Icônes de l'appli : `public/icon.svg`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `src/app/apple-icon.png` (carnet crème sur fond terracotta), onglet : `src/app/icon.svg` et `src/app/favicon.ico` (16, 32 et 48 px). `npm run icons` refait les PNG et les SVG ; `favicon.ico` a été produit à part et n'est pas régénéré.

## Couleurs

| Rôle | Couleur |
|---|---|
| Couverture | `#a3400e` (terracotta) |
| Dos du carnet | `#7f330b` (terracotta foncé) |
| Marque-page | `#e0a42a` (moutarde) |
| Nom | `#3a2312` (brun) |
| Fond de page conseillé | `#f8eddb` ou `#ecdcc0` (crème, sable) |

La marmite est un vrai trou : on y voit la couleur du fond.

## Règles

- Espace libre autour du logo : au moins le quart de la hauteur du carnet.
- Taille minimale : carnet complet 32 px ; en dessous, la version petite taille. Logo horizontal : 140 px de large.
- Sur fond sombre : la version blanche (ou crème), jamais les couleurs d'origine.
- Ne pas étirer, pivoter, ajouter d'ombre ni changer les couleurs, ne pas remplacer la police du nom.
- Le marque-page moutarde ne s'utilise pas seul et disparaît en petite taille : c'est normal.

## Limites

Aucune recherche d'antériorité de marque n'a été faite : pour un usage commercial, vérifier dans une base de marques. Pour un site personnel, ce n'est pas nécessaire.
