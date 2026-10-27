# Variantes de recettes : conception

Date : 2026-10-27. Maquette validée dans la conversation (page recette avec pastilles, carte « pile de fiches » sur l'accueil, bouton « Proposer une variante », deux champs JSON en plus).

## Intention

On veut pouvoir garder **plusieurs recettes d'un même plat** (les lasagnes de Mamie, une version végétarienne, une version express) sans écraser l'originale. La modification remplace une recette. La variante s'ajoute à côté. Elle doit être aussi simple à faire que l'ajout d'une recette : on demande à Claude, on copie le bloc JSON, on l'envoie. Claude doit savoir le faire seul en lisant la documentation du site.

## Objectifs

- Une variante est une **recette complète et autonome** : sa page, son adresse (`/recettes/lasagnes-vegetariennes`), ses quantités qui se recalculent, ses chronos, son image, son auteur.
- Les recettes d'un même plat forment un **groupe**. Le groupe a une **recette de référence** (l'« originale ») et des variantes qui y sont rattachées.
- Sur la page d'une recette du groupe, une rangée de pastilles « 🍽️ N façons de faire ce plat » permet de passer d'une version à l'autre.
- Sur l'accueil, **une seule carte par plat**, avec l'effet « pile de fiches » et la mention « 🍽️ N versions ».
- Un bouton « ＋ Proposer une variante » sur chaque page de recette copie un message prêt à coller dans Claude.
- Format JSON : deux champs facultatifs en plus, `variante_de` et `nom_variante`. La documentation pour Claude (`/docs`, `/readme`, `/llms.txt`, `/claude`, `/claude.txt`) explique comment s'en servir.

## Non-objectifs

- Pas d'arbre : une variante d'une variante rejoint le même groupe (un seul niveau).
- Pas de comparaison côte à côte des variantes, pas de vote ni de « variante préférée ».
- Pas d'écran du site pour créer une variante sans Claude (la page « Modifier ici » ne crée pas de variante).
- Pas d'écran dédié pour rattacher ou détacher des recettes : ça passe par le JSON (`variante_de`), avec « Modifier avec Claude ».
- Pas d'héritage d'image : une variante sans image affiche l'illustration de sa catégorie, comme toute recette (voir « Une image par variante »).

## Anti-objectifs (ce qui serait un échec même si « ça marche »)

- Casser un bloc JSON existant : un bloc sans `variante_de` doit se comporter exactement comme aujourd'hui (nouvelle recette sans `id`, modification avec `id`).
- Perdre le lien d'une variante parce que Claude a oublié le champ en la modifiant (même logique que l'image aujourd'hui).
- Faire disparaître des variantes quand on supprime l'originale.
- Obliger Claude à envoyer un « diff » : une variante est toujours une recette complète.

## Format JSON

Deux champs facultatifs, ajoutés à `Recipe` (`src/lib/recipe/types.ts`) :

```json
{
  "variante_de": "lasagnes-a-la-bolognaise",
  "nom_variante": "Végétarienne",
  "titre": "Lasagnes végétariennes",
  "...": "le reste de la recette, complet, comme d'habitude"
}
```

- `variante_de` : le **slug ou l'id** de n'importe quelle recette du plat (l'originale ou une de ses variantes). Le site retrouve tout seul la recette de référence du groupe.
- `nom_variante` : texte court, affiché dans la pastille (« Végétarienne », « Express 30 min », « La recette de Mamie »). Facultatif. On le coupe à 40 caractères avec un avertissement.
- Alias tolérés par l'import (`ALIAS_CLES` dans `parse.ts`) : `variant_of` → `variante_de`, `variant_name` → `nom_variante`. Les accents et la casse des noms de champs sont déjà tolérés.

Règles à l'envoi (`submitRecipe` dans `src/lib/service.ts`) :

| Bloc reçu | Résultat |
|---|---|
| ni `id`, ni `variante_de` | nouvelle recette indépendante (inchangé) |
| `variante_de`, sans `id` | nouvelle recette rattachée au groupe de la recette visée |
| `id`, sans `variante_de` | modification ; le rattachement actuel est **conservé** |
| `id` + `variante_de: "slug"` | modification + rattachement au groupe visé |
| `id` + `variante_de: null` | modification + la recette est **détachée** et redevient indépendante |

- `nom_variante` suit la même logique pour une modification : s'il est absent, celui qui existe est conservé (comme l'image) ; `null` ou `""` le retire.
- Si la recette visée par `variante_de` est introuvable, ou que la personne qui envoie ne peut pas la voir (`canView`) : refus 422 avec le message « La recette « X » indiquée dans variante_de est introuvable. » Claude corrige à partir de ce message, comme pour les autres erreurs.
- Une recette ne peut pas être sa propre variante : si le groupe visé est le sien, le rattachement ne change rien (pas d'erreur).
- Si on rattache à un autre groupe une recette de référence qui a des variantes, ses variantes la suivent : tout le groupe rejoint le nouveau groupe (un seul niveau).
- Les droits ne changent pas. Un visiteur peut envoyer une variante, qui attend la validation comme toute recette. Un membre ou l'admin la publie tout de suite. Une modification reste réservée à `canEdit`.

## Stockage

- Nouvelle migration `supabase/migrations/20261027000000_variantes.sql` : une colonne `variante_de uuid null references recipes (id) on delete set null` sur `recipes`, avec un index. Elle vaut `null` pour une recette de référence ou indépendante, et contient **toujours l'id de la recette de référence** pour une variante (jamais celui d'une autre variante).
- `RecipeRow` gagne `varianteDe: string | null`. `insertRecipe` reçoit `varianteDe` en option, et le patch de `updateRecipe` accepte aussi `varianteDe`. Implémentation dans `MemoryStore` et `SupabaseStore`.
- `nom_variante` reste dans le JSON `data` de la recette. En revanche, `variante_de` **n'est pas stocké dans `data`** : il est retiré comme `id` (`sansId`), et c'est la colonne qui fait foi.
- Un groupe est défini par l'id de sa racine : `row.varianteDe ?? row.id`.

## Suppression

Quand on supprime (ou qu'on refuse, côté admin) une recette de référence qui a des variantes, `removeRecipe` (et le refus admin, qui passe par la même suppression) **promeut d'abord la plus ancienne variante** (`createdAt`) : son `varianteDe` passe à `null`, et les autres variantes pointent vers elle. Ensuite seulement, la suppression a lieu. Le `on delete set null` n'est qu'un filet de sécurité.

## Une image par variante

C'est une demande explicite : **chaque variante a sa propre image**, indépendante de celle de l'originale.

- Par le JSON : le champ `image` de la variante, comme pour toute recette. Claude en choisit une qui montre la variante (la version végétarienne, pas les lasagnes au bœuf).
- Sur le site : la page « Modifier ici » d'une variante propose l'envoi d'une photo (`ImageField`, `PUT /api/recettes/ID/image`), exactement comme pour une recette normale. La photo est rangée sous l'id de la variante, donc sans risque d'écraser celle de l'originale.
- Partout où une variante apparaît (sa page, sa pastille, sa fiche dans l'éventail de l'accueil, la carte de l'accueil quand c'est elle qui est affichée), c'est **son** image qui est utilisée. Sinon, c'est l'illustration de sa catégorie (`RecipeArt`).
- Pastilles de la page recette : chaque pastille montre en plus une petite vignette ronde (24 px) de l'image de la variante, ou l'emoji de sa catégorie s'il n'y a pas d'image.

## Affichage

### Page d'une recette (`src/app/(site)/recettes/[id]/page.tsx`, `RecipeView`)

- Le site charge les recettes publiées du groupe, plus la recette affichée même si elle est en attente. La rangée de pastilles n'apparaît que si le groupe contient au moins 2 recettes visibles.
- Elle se place sous le titre et la description, dans la carte d'en-tête, sur un fond « beurre » léger, avec un séparateur en pointillés (voir la maquette). Libellé : « 🍽️ N façons de faire ce plat ».
- Une pastille par recette, dans l'ordre suivant : l'originale d'abord, puis les variantes de la plus ancienne à la plus récente. Texte de la pastille : `nom_variante`, ou à défaut le `titre`. En plus petit : « · originale » pour la recette de référence, « · Prénom » (le nom du profil de l'auteur) pour les variantes qui ont un auteur. La pastille de la recette affichée est pleine (style `.puce[aria-current="true"]`). Les autres sont des liens vers `/recettes/<slug>`.
- En fin de rangée, une pastille « ＋ » en pointillés vert « herbe » fait la même chose que le bouton « Proposer une variante ».
- Sur mobile, la rangée défile horizontalement (même traitement que la barre de catégories de l'accueil).
- Dans le pied de page, à côté de « Modifier avec Claude », « Modifier ici » et « Supprimer », un bouton « ＋ Proposer une variante » (bordure verte en pointillés, fond vert très clair). Il est visible par **tout le monde**, visiteurs compris, puisque tout le monde peut envoyer une recette. Il copie le message décrit plus bas (composant `CopyButton` existant).
- Le titre de la page reste celui de la recette affichée.

### Accueil (`RecipeGrid`, `searchRecipes`)

- Les recettes publiées sont regroupées par groupe, et chaque groupe donne **une carte**.
- La carte montre la recette de référence si elle est publiée et qu'elle correspond à la recherche et à la catégorie. Sinon, elle montre la plus ancienne recette du groupe qui y correspond. Exemple : chercher « végétarien » affiche la carte des lasagnes, qui ouvre directement la version végétarienne.
- Un groupe n'apparaît que si au moins une de ses recettes correspond à la recherche et à la catégorie.
- Si le groupe compte au moins 2 recettes publiées : effet « pile de fiches » (une ou deux feuilles décalées derrière la carte, voir l'éventail ci-dessous) et ligne « 🍽️ N versions » sous les portions.
- **Éventail au survol (ordinateur seulement)**, une demande explicite, validée sur une seconde maquette :
  - Au repos, les deux feuilles derrière la carte sont de **vraies fiches**. Chacune montre en fond l'image d'une autre recette du groupe (`RecipeArt` de cette recette), avec le décalage léger de la pile.
  - Quand la souris passe sur la carte, les fiches s'ouvrent en éventail comme des livres. La carte de devant monte de 4 px. La fiche de gauche pivote d'environ -7° et glisse de 15 % vers la gauche, celle de droite fait de même de l'autre côté. Le pivot est en bas au centre (`transform-origin: 50% 100%`), avec une transition d'environ 0,45 s (même courbe que le reste du site). Le **nom de la variante** apparaît sur la tranche visible de chaque fiche, dans une étiquette verticale sombre (`writing-mode: vertical-rl`), en fondu.
  - Seules les 2 premières autres versions sont montrées : les variantes après la carte affichée, dans l'ordre du groupe. Au-delà, le « 🍽️ N versions » suffit. Avec 2 recettes dans le groupe, il n'y a qu'une seule fiche, à gauche.
  - Les fiches ne sont pas cliquables : un clic n'importe où ouvre la carte affichée, et le choix de la version se fait ensuite avec les pastilles. Elles sont décoratives (`aria-hidden`). Le nom des autres versions est donné aux lecteurs d'écran dans la carte (par exemple en texte masqué : « Autres versions : Végétarienne, Express »).
  - Sur ordinateur, le survol déclenche l'éventail seulement sous `@media (hover: hover) and (pointer: fine)`. Avec « réduire les animations », rien ne bouge (la règle globale existante s'en charge).
  - **Sur téléphone, l'appui long ouvre l'éventail** (validé). Il faut garder le doigt immobile environ 400 ms. On envoie alors une petite vibration (`navigator.vibrate?.(10)`, Android seulement, sans erreur ailleurs) et la carte passe dans l'état « ouvert », le même que le survol. L'éventail se referme quand on lâche, ou si on annule (`touchend`, `touchcancel`).
    - Un appui long ne doit pas ouvrir la recette en lâchant le doigt : il faut annuler la navigation qui suit.
    - Si le doigt bouge de plus d'environ 10 px avant les 400 ms, c'est un défilement : on ne fait rien.
    - Sur ces cartes **seulement**, on désactive le menu du navigateur et la sélection de texte (`contextmenu` annulé, `-webkit-touch-callout: none`, `user-select: none`). Les cartes d'une recette seule restent inchangées.
    - Un appui court ouvre la recette, comme aujourd'hui.
  - **Vignettes toujours visibles** (validé) : sur la ligne « 🍽️ N versions », jusqu'à 2 petites vignettes rondes (≈ 20 px, qui se chevauchent légèrement, bordure couleur papier) montrent l'image des autres versions, ou l'emoji de leur catégorie. Elles s'affichent sur téléphone comme sur ordinateur. Ce sont elles qui signalent qu'il y a d'autres versions, sans avoir à connaître le geste.
  - Pendant le survol, la carte passe au-dessus de ses voisines (`z-index`) pour que les fiches qui débordent sur l'espace entre les cartes restent visibles. Elle ne doit pas être coupée par un `overflow: hidden` d'un parent.
- Le compteur « N recettes » compte les cartes, c'est-à-dire les plats.
- Tri « Plus récentes » : selon la recette la plus récente du groupe, pour qu'une nouvelle variante fasse remonter le plat. Tri « A → Z » : selon le titre de la carte affichée.
- Le regroupement est une fonction pure dans `src/lib/recipe/`, testée à part, et utilisée par `RecipeGrid`.

### Formulaire « Ajouter » (`AddRecipeForm`)

Si la recette envoyée est une variante, le message de succès le dit : « Variante ajoutée à « Lasagnes à la bolognaise » ». La réponse de `POST /api/recettes` gagne un champ `variante_de: { slug, titre }` (le titre et le slug de la recette de référence) quand la recette est rattachée.

### Page « Modifier ici » (`RecipeEditor`)

Si la recette fait partie d'un groupe d'au moins 2 recettes, un champ « Nom de la variante » (facultatif) permet de modifier `nom_variante`. Le bloc envoyé n'inclut pas `variante_de` : le rattachement est donc conservé.

### Administration (`src/app/(site)/admin/page.tsx`)

Dans la liste « Recettes en attente », une variante affiche « Variante de « Titre de la référence » » sous son titre. Ça permet à l'admin de la valider en connaissant le contexte.

## API de lecture (pour Claude)

- `GET /api/recettes` : une entrée **par recette** (pas par plat), pour que Claude trouve aussi les variantes. Chaque entrée gagne `nom_variante` (si présent) et `variante_de` (le slug de la recette de référence, seulement pour une variante).
- `GET /api/recettes/ID` : gagne `variante_de` (slug de la référence, pour une variante) et `variantes` : la liste des **autres** recettes publiées du groupe, référence comprise, sous la forme `{ id, slug, titre, nom_variante, lien }`. La liste est vide si la recette est seule.

## Messages pour Claude et documentation (`src/lib/recipe/prompts.ts`)

Toute la documentation pour Claude vient de ce fichier. Il faut le mettre à jour, ainsi que `prompts.test.ts` :

1. **`FORMAT_RECETTE`** : ajouter `variante_de` et `nom_variante`, avec une ligne chacun, dans le même ton que les autres champs.
2. **Nouvelle fonction `buildVariantPrompt(row)`**, sur le modèle de `buildEditPrompt`. Elle produit : « Voici une recette de notre site. Je veux en faire une variante (une autre façon de faire le même plat, qui s'ajoute à côté sans remplacer l'originale). Renvoie la variante COMPLÈTE dans un seul bloc ```json, SANS champ "id", avec "variante_de": "<slug>" et un "nom_variante" court qui dit ce qui change. » Suivent le JSON de la recette **sans son `id`** (pour que Claude ne le recopie pas), puis « Ce que je veux changer : ».
3. **`documentationClaude`** :
   - dans « Lire le site », décrire les nouveaux champs des réponses (`variante_de`, `nom_variante`, `variantes`) et dire qu'une recette peut avoir des variantes : en présentant une recette, Claude peut signaler qu'il en existe d'autres versions ;
   - nouvelle section **« Proposer une variante »** placée après « Modifier une recette ». Elle doit dire : quand l'utiliser (la personne veut une autre façon de faire le plat, pas corriger l'originale ; en cas de doute, lui demander) ; pas de champ `id` ; `variante_de` = le slug (ou l'id) de la recette de départ ; `nom_variante` court ; recette complète ; image nouvelle ou absente, mais pas celle de l'originale sauf si elle convient vraiment. Ajouter un exemple JSON complet de variante (dérivé de `EXEMPLE_RECETTE`, par exemple « Salade italienne sans jambon », `nom_variante: "Végétarienne"`) ;
   - dans « Modifier une recette », préciser : garder `variante_de` tel quel ou l'omettre (le rattachement est conservé) ; `"variante_de": null` détache la recette ; mettre `variante_de` sur une recette existante la rattache à un plat ;
   - dans « Envoyer directement, avec un jeton », ajouter que le 201/202 vaut aussi pour une variante, et le nouveau message 422 en cas de `variante_de` introuvable.
4. **`instructionsClaude`** (le texte court à coller) : ajouter un point « 4. Quand je veux une variante d'une recette », en trois lignes : pas d'`id`, `variante_de` avec le slug, `nom_variante` court, recette complète.
5. **`buildEditPrompt`** : pour une variante, le JSON copié contient `variante_de` (le slug de la référence), pour que Claude voie le lien et le garde.
6. **README** : une ligne dans la liste des fonctionnalités.

## Tests attendus

- **Import** (`parse.test.ts`) : les deux champs, leurs alias, `variante_de: null` distingué de l'absence du champ, et `nom_variante` coupé à 40 caractères.
- **Service** (`service` / route `POST`) : chaque ligne du tableau des règles ; aplatissement (variante d'une variante → racine) ; refus si la recette visée est introuvable ou invisible ; groupe qui suit sa racine ; un visiteur obtient une variante en attente.
- **Suppression** : promotion de la plus ancienne variante, et re-pointage des autres.
- **Stores** : le contrat de stockage commun (`store/contract.ts`) couvre `varianteDe`.
- **Regroupement et recherche** : une carte par plat, choix de la carte affichée, compteur de versions, tri.
- **Composants** : pastilles (ordre, recette courante, « originale », prénom, vignette), fiches de l'éventail (images et noms des 2 autres versions, une seule fiche pour un groupe de 2, absentes pour une recette seule), vignettes « N versions », appui long (ouvre l'éventail après 400 ms, n'ouvre pas la recette au relâchement, un mouvement annule, un appui court ouvre la recette), bouton « Proposer une variante » visible même pour un visiteur, carte « N versions », message de succès du formulaire.
- **Documentation** (`prompts.test.ts`) : la documentation mentionne `variante_de`, `nom_variante` et la section « Proposer une variante ». `buildVariantPrompt` ne contient pas d'`id` et contient le slug.
- **API** : `GET /api/recettes/ID` renvoie `variantes` et `variante_de`.

## Choix laissés à la personne qui construit

- Le nom exact des fonctions et des composants (par exemple `VariantPills`, `grouperParPlat`).
- Le détail visuel, tant qu'il suit la maquette et les classes existantes (`.puce`, `.carte`, `.badge`, `.btn`, variables `--herbe`, `--beurre`).
- La façon de charger le groupe sur la page recette (une lecture filtrée ou `listRecipes` filtré en mémoire, comme le fait déjà l'accueil).
