# Variantes de recettes : plan de développement

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objectif :** permettre plusieurs recettes d'un même plat (variantes), envoyées par le même bloc JSON que d'habitude (`variante_de`, `nom_variante`), avec des pastilles sur la page recette, une carte « pile de fiches » sur l'accueil (éventail au survol et à l'appui long, vignettes), et une documentation pour Claude à jour.

**Architecture :** une variante est une ligne `recipes` ordinaire, avec une nouvelle colonne `variante_de` qui contient toujours l'id de la recette de référence (un seul niveau). Tout le métier passe par `src/lib/service.ts` : résolution de `variante_de`, conservation du lien, promotion à la suppression. Le regroupement pour l'affichage est une fonction pure (`src/lib/recipe/plats.ts`), utilisée par l'accueil et la page recette. Toute la documentation pour Claude reste dans `src/lib/recipe/prompts.ts`.

**Stack :** Next.js 16.4 (App Router ; lire `node_modules/next/dist/docs/` avant d'écrire une page, voir `AGENTS.md`), React 19, TypeScript, Tailwind 4, Vitest + Testing Library, Supabase.

**Spécification :** [docs/superpowers/specs/2026-10-27-variantes-design.md](../specs/2026-10-27-variantes-design.md). La lire en entier avant de commencer : elle contient la maquette décrite en mots, et le tableau des règles d'envoi.

## Contraintes globales

- Travailler sur la branche `feature/variantes`, créée depuis `main`. Le premier commit ajoute la spécification et ce plan.
- Interface, messages, noms de variables et commentaires en français, dans le ton du code existant.
- Un bloc JSON sans `variante_de` se comporte exactement comme avant : tous les tests existants restent verts.
- Champs JSON : `variante_de` (slug ou id) et `nom_variante` (40 caractères maximum). Alias : `variant_of`, `variant_name`.
- Message de refus, mot pour mot : `La recette « ${ref} » indiquée dans variante_de est introuvable.` (HTTP 422).
- Pour une modification, l'absence de `variante_de` ou de `nom_variante` **conserve** la valeur existante. `null` (ou `""` pour `nom_variante`) la retire.
- Choix du plan, en complément de la spécification : `nom_variante` est conservé quand il est absent, comme `variante_de` et l'image, pour qu'un bloc renvoyé par Claude ou par « Modifier ici » ne le perde pas.
- Éventail : appui long de 400 ms, annulé si le doigt bouge de plus de 10 px. Vibration `navigator.vibrate?.(10)`. Survol seulement sous `@media (hover: hover) and (pointer: fine)`. Rotations de ±7°, décalage de ±15 %, montée de 10 px pour les fiches et de 4 px pour la carte, transition de 0,45 s avec `cubic-bezier(.2,.8,.2,1)`.
- Lancer les tests : `npx vitest run <fichier>`. Tout le projet : `npm test`, `npm run lint`, `npx tsc --noEmit`.

## Points de vigilance

1. **Claude modifie une variante et oublie `variante_de` et `nom_variante`** : la recette reste dans son groupe, avec son nom. → test dans la Tâche 3.
2. **« Modifier ici » sur une variante** : l'éditeur renvoie le bloc sans `variante_de`. Le lien et le `nom_variante` saisi doivent survivre. → test dans la Tâche 9.
3. **On supprime l'originale alors que la seule variante est encore en attente** : la variante en attente devient la référence, et l'accueil n'affiche aucune carte cassée ni vide pour ce plat. → tests dans les Tâches 3 et 4.
4. **Appui long sur Android** : ni le menu du navigateur, ni l'ouverture de la recette au relâchement. Un appui court ouvre toujours la recette. → test dans la Tâche 8.
5. **`variante_de` désigne la recette elle-même**, ou une variante de son propre groupe, lors d'une modification : rien ne change, pas d'erreur, pas de boucle. → test dans la Tâche 3.

---

### Tâche 1 : lire `variante_de` et `nom_variante` dans le bloc JSON

**Fichiers :**
- Modifier : `src/lib/recipe/types.ts` (type `Recipe`)
- Modifier : `src/lib/recipe/parse.ts` (`ALIAS_CLES`, fin de `parseRecipeBlock`)
- Test : `src/lib/recipe/parse.test.ts`

**Interfaces :**
- Produit : dans `Recipe`, `variante_de?: string | null` (le slug ou l'id tel qu'il a été reçu ; `null` = détacher) et `nom_variante?: string | null` (`null` = retirer). `undefined` veut dire « non fourni ».
- Produit : `export const MAX_NOM_VARIANTE = 40` dans `types.ts`.

- [ ] **Étape 1 : écrire les tests qui échouent**, dans un `describe("variantes")` :

```ts
test("lit variante_de et nom_variante", () => {
  const r = parseRecipeBlock(JSON.stringify({ ...uneRecette(), variante_de: "lasagnes", nom_variante: "Végétarienne" }));
  expect(r.ok && r.recipe.variante_de).toBe("lasagnes");
  expect(r.ok && r.recipe.nom_variante).toBe("Végétarienne");
});
test("comprend les alias anglais variant_of et variant_name", () => { /* mêmes attentes */ });
test("null est gardé (détacher), un champ absent reste absent", () => {
  const nul = parseRecipeBlock(JSON.stringify({ ...uneRecette(), variante_de: null, nom_variante: null }));
  expect(nul.ok && nul.recipe.variante_de).toBeNull();
  expect(nul.ok && nul.recipe.nom_variante).toBeNull();
  const absent = parseRecipeBlock(JSON.stringify(uneRecette()));
  expect(absent.ok && "variante_de" in absent.recipe).toBe(false);
  expect(absent.ok && "nom_variante" in absent.recipe).toBe(false);
});
test("nom_variante vide vaut null ; trop long, il est coupé à 40 caractères avec un avertissement", () => {
  // "" → null ; "x".repeat(50) → longueur 40, warnings contient un texte avec « 40 caractères »
});
test("variante_de vide est ignoré", () => { /* "  " → champ absent */ });
```

- [ ] **Étape 2 : lancer `npx vitest run src/lib/recipe/parse.test.ts`.** Résultat attendu : les nouveaux tests ÉCHOUENT.
- [ ] **Étape 3 : implémenter.** Dans `ALIAS_CLES`, ajouter `variant_of: "variante_de"` et `variant_name: "nom_variante"`. Dans `parseRecipeBlock`, après `image` : utiliser `"variante_de" in brut` pour distinguer `null` de l'absence ; un texte vide vaut absent pour `variante_de` et `null` pour `nom_variante`. Le texte de l'avertissement : `Le nom de la variante est trop long : il est coupé à 40 caractères.`
- [ ] **Étape 4 : relancer le même fichier.** Résultat attendu : tout passe.
- [ ] **Étape 5 : commit** `feat(variantes): lire variante_de et nom_variante dans le bloc JSON`.

### Tâche 2 : stocker le rattachement (`varianteDe`)

**Fichiers :**
- Créer : `supabase/migrations/20261027000000_variantes.sql`
- Modifier : `src/lib/store/types.ts`, `src/lib/store/memory.ts`, `src/lib/store/supabase.ts`
- Test : `src/lib/store/contract.ts` (tests communs, lancés par `memory.test.ts`)

**Interfaces :**
- Consomme : `Recipe.variante_de`, `Recipe.nom_variante` (Tâche 1).
- Produit : `RecipeRow.varianteDe: string | null`, l'id de la recette de référence (ou `null`).
- Produit : `insertRecipe(input: { status; authorId; recipe; varianteDe?: string | null })`.
- Produit : `updateRecipe(id, patch: { status?; recipe?; varianteDe?: string | null })`. Une clé `varianteDe` absente du patch ne change rien.
- Garantie : `row.recipe` ne contient jamais `variante_de` (le champ est retiré avant le stockage, comme `id`). `nom_variante` est stocké dans `data`.

- [ ] **Étape 1 : écrire les tests qui échouent**, dans le `describe("recettes")` de `contract.ts` :

```ts
test("une recette est indépendante par défaut ; insertRecipe enregistre varianteDe", async () => {
  const a = await store.insertRecipe({ status: "published", authorId: null, recipe: uneRecette() });
  expect(a.varianteDe).toBeNull();
  const b = await store.insertRecipe({ status: "published", authorId: null, recipe: uneRecette(), varianteDe: a.id });
  expect(b.varianteDe).toBe(a.id);
  expect((await store.getRecipe(b.slug))?.varianteDe).toBe(a.id);
  expect((await store.listRecipes()).find((r) => r.id === b.id)?.varianteDe).toBe(a.id);
});
test("updateRecipe change varianteDe seulement s'il est donné", async () => {
  // patch { status } garde varianteDe ; patch { varianteDe: null } le retire
});
test("variante_de n'est jamais stocké dans la recette, nom_variante l'est", async () => {
  const row = await store.insertRecipe({ status: "published", authorId: null,
    recipe: uneRecette({ variante_de: "x", nom_variante: "Végé" }) });
  expect("variante_de" in row.recipe).toBe(false);
  expect(row.recipe.nom_variante).toBe("Végé");
});
```

- [ ] **Étape 2 : lancer `npx vitest run src/lib/store/memory.test.ts`.** Résultat attendu : ÉCHEC (et erreurs de type sur `varianteDe`).
- [ ] **Étape 3 : écrire la migration.**

```sql
-- Variantes : une recette peut être rattachée à la recette de référence d'un plat.
-- Contient toujours l'id de la référence (jamais celui d'une autre variante) ; null pour une recette indépendante ou de référence.
alter table recipes add column variante_de uuid references recipes (id) on delete set null;
create index recipes_variante_de_idx on recipes (variante_de);
```

- [ ] **Étape 4 : implémenter dans les deux stores.** Dans `memory.ts` et `supabase.ts`, `sansId` retire aussi `variante_de`. Dans `supabase.ts` : `DbRecipe.variante_de`, `toRow` le recopie en `varianteDe`, et `insert`/`update` écrivent la colonne quand elle est fournie.
- [ ] **Étape 5 : relancer `npx vitest run src/lib/store` puis `npx tsc --noEmit`.** Résultat attendu : tout passe, aucune erreur de type. Corriger les fixtures de test qui construisent des `RecipeRow` à la main en ajoutant `varianteDe: null`.
- [ ] **Étape 6 : commit** `feat(variantes): colonne variante_de et rattachement dans les stores`.

### Tâche 3 : règles d'envoi, de suppression et de lecture d'un groupe (service + POST)

**Fichiers :**
- Modifier : `src/lib/service.ts`, `src/app/api/recettes/route.ts`
- Test : `src/lib/service.test.ts`, `src/app/api/recettes/route.test.ts`

**Interfaces :**
- Consomme : Tâches 1 et 2 (`Recipe.variante_de`, `Recipe.nom_variante`, `RecipeRow.varianteDe`, `insertRecipe`/`updateRecipe` avec `varianteDe`).
- Produit : un nouveau code d'erreur `"variante_introuvable"` dans `ServiceResult`.
- Produit : `racineDe(row: RecipeRow): string`, qui renvoie `row.varianteDe ?? row.id` (exportée).
- Produit : `listerGroupe(store: Store, viewer: Viewer, row: RecipeRow): Promise<RecipeRow[]>`. Elle renvoie les recettes du groupe de `row` visibles par `viewer` : publiées, plus `row` elle-même. L'ordre est la référence d'abord, puis les variantes de la plus ancienne à la plus récente (ordre inverse de `listRecipes`, en cas d'égalité de date). Elle renvoie `[row]` si la recette est seule.
- `submitRecipe` suit le tableau « Règles à l'envoi » de la spécification. Pour une modification, `nom_variante` absent reprend celui qui existe (même endroit que l'image) ; `null` le retire du JSON stocké.
- `removeRecipe` : si `row` est une référence avec des variantes, il commence par promouvoir la plus ancienne (son `varianteDe` passe à `null`, les autres pointent vers elle). Ensuite, il supprime.
- `POST /api/recettes` : sur `variante_introuvable`, il renvoie 422 avec le message des contraintes globales (`ref` = `lu.recipe.variante_de`). En cas de succès, si `row.varianteDe` est renseigné, la réponse gagne `variante_de: { slug, titre }` (ceux de la référence).

- [ ] **Étape 1 : écrire les tests de service qui échouent**, dans un `describe("variantes")`. Un test par ligne :
  - nouvelle recette avec `variante_de: <slug de A>` → `varianteDe === A.id` ;
  - `variante_de` = slug d'une variante B de A → `varianteDe === A.id` (aplatissement) ;
  - `variante_de: "inconnue"` → `{ ok: false, code: "variante_introuvable" }` ;
  - `variante_de` qui désigne une recette en attente envoyée par quelqu'un d'autre, pour un visiteur → `variante_introuvable` ;
  - un visiteur envoie une variante d'une recette publiée → `status: "pending"` et `varianteDe` renseigné ;
  - **[vigilance 1]** modification d'une variante avec `id`, sans `variante_de` ni `nom_variante` → `varianteDe` et `recipe.nom_variante` inchangés ;
  - modification avec `variante_de: null` → `varianteDe === null` ;
  - modification avec `nom_variante: null` → `nom_variante` absent de la recette ;
  - modification d'une référence A (qui a la variante B) avec `variante_de: <slug de C>` → A et B ont `varianteDe === C.id` ;
  - **[vigilance 5]** modification de A avec `variante_de: <slug de A>`, puis avec `<slug de B>` (B variante de A) → `varianteDe` de A reste `null`, pas d'erreur ;
  - **[vigilance 3]** suppression de la référence A avec ses variantes B (plus ancienne) et C → B a `varianteDe === null`, C a `varianteDe === B.id` ; même chose si B est en attente ;
  - `listerGroupe` : l'ordre est la référence puis les variantes de la plus ancienne à la plus récente ; une variante en attente n'est incluse que si c'est la recette demandée ; une recette seule renvoie une liste d'un élément.
- [ ] **Étape 2 : écrire les tests de route qui échouent**, dans `route.test.ts` : un 422 avec le message exact pour une `variante_de` inconnue, et un 201 avec `variante_de: { slug, titre }` pour une variante envoyée par un membre.
- [ ] **Étape 3 : lancer `npx vitest run src/lib/service.test.ts src/app/api/recettes/route.test.ts`.** Résultat attendu : ÉCHEC.
- [ ] **Étape 4 : implémenter** dans `service.ts` (une fonction interne `resoudreVariante(store, viewer, ref): Promise<RecipeRow | null>` renvoie la référence du groupe visé, ou `null`), puis dans la route.
- [ ] **Étape 5 : relancer les deux fichiers, puis `npm test`.** Résultat attendu : tout passe (le refus admin passe par `removeRecipe` et profite de la promotion).
- [ ] **Étape 6 : commit** `feat(variantes): règles d'envoi, promotion à la suppression, lecture d'un groupe`.

### Tâche 4 : regrouper les recettes par plat (fonction pure)

**Fichiers :**
- Créer : `src/lib/recipe/plats.ts`
- Test : `src/lib/recipe/plats.test.ts`

**Interfaces :**
- Consomme : `searchRecipes` (inchangé) et `RecipeRow.varianteDe`.
- Produit : `type PlatAffiche = { carte: RecipeRow; autres: RecipeRow[]; total: number }`.
  - `carte` : la recette à montrer.
  - `autres` : les autres recettes publiées du groupe, en commençant par celles qui suivent `carte` dans l'ordre du groupe (référence, puis de la plus ancienne à la plus récente), et en reprenant au début si besoin.
  - `total` : le nombre de recettes publiées du groupe.
- Produit : `platsAffiches(rows: RecipeRow[], q: string, categorie?: string): PlatAffiche[]`.
  - `rows` : les recettes publiées, de la plus récente à la plus ancienne (l'ordre de `listPublished`).
  - Sortie : une entrée par groupe qui a au moins une recette correspondant à la recherche. Les groupes sont dans l'ordre de leur recette la plus récente, c'est-à-dire de leur première apparition dans `rows`.
  - Choix de `carte` : la référence si elle est dans `rows` et qu'elle correspond, sinon la plus ancienne recette du groupe qui correspond.

- [ ] **Étape 1 : écrire les tests qui échouent** (avec `MemoryStore` et `uneRecette`, comme `RecipeGrid.test.tsx`) :
  - trois recettes, dont A et sa variante B → 2 plats, et le plat de A a `total` 2, `carte` A, `autres` [B] ;
  - une nouvelle variante fait remonter son plat en tête ;
  - la recherche « vegetarien » (B a le tag « végétarien ») → `carte` B, `autres` [A] ;
  - catégorie : une variante d'une autre catégorie qui correspond montre le plat ;
  - **[vigilance 3]** une référence absente de `rows` (en attente ou supprimée) → la plus ancienne variante publiée sert de carte, `total` compte seulement les recettes publiées ;
  - un groupe de 4 dont la carte est la 2ᵉ → `autres` = [3ᵉ, 4ᵉ, 1ʳᵉ].
- [ ] **Étape 2 : lancer `npx vitest run src/lib/recipe/plats.test.ts`.** Résultat attendu : ÉCHEC.
- [ ] **Étape 3 : implémenter `platsAffiches`** (regroupement par `row.varianteDe ?? row.id`, puis `searchRecipes` pour savoir quelles recettes correspondent).
- [ ] **Étape 4 : relancer le fichier.** Résultat attendu : tout passe.
- [ ] **Étape 5 : commit** `feat(variantes): regroupement des recettes par plat`.

### Tâche 5 : l'API de lecture donne les variantes

**Fichiers :**
- Modifier : `src/app/api/recettes/route.ts` (GET), `src/app/api/recettes/[id]/route.ts` (GET)
- Test : `src/app/api/recettes/route.test.ts`, et `src/app/api/recettes/[id]/get.test.ts` à créer sur le modèle de `delete.test.ts`

**Interfaces :**
- Consomme : `listerGroupe` et `racineDe` (Tâche 3).
- `GET /api/recettes` : chaque entrée gagne `nom_variante` (seulement s'il est présent) et `variante_de` (le slug de la référence, seulement pour une variante dont la référence est publiée).
- `GET /api/recettes/ID` : gagne `variante_de` (le slug de la référence, pour une variante) et `variantes: Array<{ id, slug, titre, nom_variante?, lien }>`, qui liste les autres recettes publiées du groupe (`[]` si la recette est seule).

- [ ] **Étape 1 : écrire les tests qui échouent.** La liste contient la variante avec `variante_de: "<slug de A>"`. Le détail de A a `variantes` = [B], sans `variante_de`. Le détail de B a `variante_de` égal au slug de A, et `variantes` = [A]. Une recette seule a `variantes: []`.
- [ ] **Étape 2 : lancer les deux fichiers de test.** Résultat attendu : ÉCHEC.
- [ ] **Étape 3 : implémenter.** Appeler `listerGroupe` avec `VISITOR` (importé de `@/lib/auth`) : l'API ne montre que des recettes publiées, et la recette demandée l'est déjà (sinon 404, comme aujourd'hui).
- [ ] **Étape 4 : relancer les deux fichiers.** Résultat attendu : tout passe.
- [ ] **Étape 5 : commit** `feat(variantes): l'API de lecture donne les variantes`.

### Tâche 6 : documentation et messages pour Claude

**Fichiers :**
- Modifier : `src/lib/recipe/prompts.ts`, `README.md`
- Test : `src/lib/recipe/prompts.test.ts`

**Interfaces :**
- Produit : `buildVariantPrompt(row: RecipeRow): string`. Texte d'introduction mot pour mot (spécification, § « Messages pour Claude », point 2), avec `row.slug`, puis le JSON de `row.recipe` **sans `id` ni `nom_variante`**, puis `Ce que je veux changer :`.
- Change : `buildEditPrompt(row: RecipeRow, varianteDeSlug?: string): string`. Quand `varianteDeSlug` est donné, le JSON copié contient `"variante_de": varianteDeSlug`.
- Produit : `export const EXEMPLE_VARIANTE: Recipe`, dérivé de `EXEMPLE_RECETTE`. Il est sans jambon, avec `titre: "Salade italienne à la burrata, sans jambon"`, `nom_variante: "Végétarienne"`, `variante_de: "salade-italienne-a-la-burrata"`, et sans `{{jambon}}` dans les étapes.

- [ ] **Étape 1 : écrire les tests qui échouent :**
  - `EXEMPLE_VARIANTE` se relit avec `parseRecipeBlock`, avec `variante_de` et `nom_variante` ;
  - la documentation contient `variante_de`, `nom_variante`, `## Proposer une variante`, `"variantes"`, et le message `indiquée dans variante_de est introuvable` ;
  - la section « Modifier une recette » mentionne `"variante_de": null` ;
  - les instructions à coller contiennent `4. Quand je veux une variante` et `variante_de` ;
  - `buildVariantPrompt(row)` contient `"variante_de": "<slug>"` dans le texte, ne contient pas `row.id`, et son bloc se relit sans `id` ;
  - `buildEditPrompt(row, "lasagnes")` contient `"variante_de": "lasagnes"` et toujours `row.id`.
- [ ] **Étape 2 : lancer `npx vitest run src/lib/recipe/prompts.test.ts`.** Résultat attendu : ÉCHEC.
- [ ] **Étape 3 : rédiger** les changements des points 1 à 5 du § « Messages pour Claude et documentation » de la spécification, dans le style des sections existantes (phrases courtes, tutoiement, listes numérotées). Ajouter au README une ligne : « Variantes : plusieurs recettes d'un même plat, regroupées sur une seule carte. »
- [ ] **Étape 4 : relancer le fichier, puis `npx vitest run src/app/docs src/app/(site)/claude.txt`.** Résultat attendu : tout passe.
- [ ] **Étape 5 : commit** `docs(variantes): format, section Proposer une variante, messages pour Claude`.

### Tâche 7 : page recette (pastilles et bouton « Proposer une variante »)

**Fichiers :**
- Créer : `src/components/VariantPills.tsx`, `src/components/VariantPills.test.tsx`
- Modifier : `src/components/CopyButton.tsx` (classes de base modifiables), `src/app/(site)/recettes/[id]/page.tsx`, `src/app/globals.css`
- Test : `src/components/CopyButton.test.tsx`

**Interfaces :**
- Consomme : `listerGroupe` et `racineDe` (Tâche 3), `buildVariantPrompt` et `buildEditPrompt(row, slug)` (Tâche 6).
- Change : `CopyButton({ text, label, className?, base? })`, où `base` vaut `"btn btn-primary"` par défaut et remplace ces classes quand il est donné.
- Produit : `type Version = { slug: string; titre: string; nomVariante?: string; image?: string; categorie: Categorie; auteur: string | null; originale: boolean }`.
- Produit : `VariantPills({ versions: Version[]; courante: string; promptVariante: string })`. Il ne rend rien si `versions.length < 2`.
- Classes CSS ajoutées dans `globals.css` (couche `components`) :
  - `.btn-variante` : bordure de 2 px en pointillés `--herbe`, texte `--herbe`, fond `color-mix(in srgb, var(--herbe) 10%, var(--papier))` ;
  - `.puce-plus` : la même chose, en pastille.

- [ ] **Étape 1 : écrire les tests qui échouent** (`VariantPills.test.tsx`) :
  - le titre « 3 façons de faire ce plat » est affiché ;
  - les pastilles sont dans l'ordre reçu, avec le texte `nomVariante`, ou `titre` à défaut ;
  - « originale » apparaît sur la référence, et le prénom de l'auteur sur les variantes ;
  - la pastille courante a `aria-current="true"` et n'est pas un lien ; les autres sont des liens vers `/recettes/<slug>` ;
  - chaque pastille a une vignette : `img` si `image`, sinon l'emoji de la catégorie ;
  - le bouton « ＋ » copie `promptVariante` (presse-papiers simulé, comme dans `CopyButton.test.tsx`) ;
  - avec une seule version, le composant ne rend rien.
  - Dans `CopyButton.test.tsx` : avec `base="btn btn-variante"`, le bouton n'a pas `btn-primary`.
- [ ] **Étape 2 : lancer `npx vitest run src/components/VariantPills.test.tsx src/components/CopyButton.test.tsx`.** Résultat attendu : ÉCHEC.
- [ ] **Étape 3 : implémenter `VariantPills`** (rangée qui défile horizontalement, comme la barre de catégories de `RecipeGrid`) et `CopyButton`.
- [ ] **Étape 4 : brancher la page.**
  - La page appelle `listerGroupe` et récupère le nom de chaque auteur avec `store.getProfile`.
  - Elle passe `VariantPills` à `RecipeView` par une nouvelle prop facultative `entete?: React.ReactNode`, rendue sous la description, dans la carte d'en-tête (fond `--beurre` léger, séparateur en pointillés).
  - Le pied de page affiche « ＋ Proposer une variante » (`CopyButton` avec `base="btn btn-variante"`) **pour tout le monde**. Les boutons de modification restent soumis à `modifiable`.
  - « Modifier avec Claude » reçoit le slug de la référence pour une variante.
- [ ] **Étape 5 : lancer `npm test`, `npm run lint` et `npx tsc --noEmit`.** Résultat attendu : tout passe.
- [ ] **Étape 6 : commit** `feat(variantes): pastilles et bouton Proposer une variante sur la page recette`.

### Tâche 8 : accueil (une carte par plat, pile, vignettes, éventail)

**Fichiers :**
- Créer : `src/components/PlatCard.tsx`, `src/components/PlatCard.test.tsx`
- Modifier : `src/components/RecipeGrid.tsx`, `src/app/globals.css`
- Test : `src/components/RecipeGrid.test.tsx`

**Interfaces :**
- Consomme : `platsAffiches` et `PlatAffiche` (Tâche 4).
- Produit : `PlatCard({ plat: PlatAffiche; index: number })`. Il rend le `<li class="carte-liste">` complet, qui reprend le contenu de la carte actuelle de `RecipeGrid`. Il ajoute un état `ouvert`, appliqué en classe `.ouvert` sur `.pile`.
- Comportement quand `total >= 2` :
  - jusqu'à 2 `.feuille` `aria-hidden`, chacune avec le `RecipeArt` de `autres[0]` (`.f1`, à gauche) et de `autres[1]` (`.f2`, à droite), et une étiquette `.tranche` qui porte le `nom_variante` (ou le `titre`) ;
  - la ligne « 🍽️ N versions » avec jusqu'à 2 vignettes rondes de 20 px qui se chevauchent ;
  - un texte masqué pour les lecteurs d'écran : `Autres versions : A, B`.
- Comportement quand `total === 1` : la carte est rendue exactement comme aujourd'hui.
- CSS (`globals.css`) : `.pile`, `.feuille`, `.f1`, `.f2`, `.tranche`. Les valeurs de l'éventail sont dans les contraintes globales. L'état ouvert s'applique pour `.pile.ouvert` toujours, et pour `.pile:hover` seulement sous `@media (hover: hover) and (pointer: fine)`. Une pile ouverte ou survolée passe à `z-index: 10` au-dessus de ses voisines. `.pile` : `-webkit-touch-callout: none; user-select: none`. Rien ne doit couper les fiches qui débordent : pas d'`overflow-hidden` sur `li` ni sur `.pile` (seulement sur la carte de devant et les fiches).

- [ ] **Étape 1 : écrire les tests qui échouent** (`PlatCard.test.tsx`, avec des minuteries simulées `vi.useFakeTimers()`) :
  - avec 3 versions : 2 fiches, les noms des 2 autres versions sur les tranches, « 3 versions », 2 vignettes, et le texte « Autres versions : … » ;
  - avec 2 versions : une seule fiche, `.f1` ;
  - avec 1 version : pas de fiche, pas de « versions », et le même contenu qu'avant ;
  - **[vigilance 4]** `touchstart` puis 400 ms → `.ouvert`, et `navigator.vibrate` appelé avec 10. `touchend` → plus `.ouvert`. Le `click` qui suit est annulé (`defaultPrevented`) ;
  - `touchstart`, puis `touchmove` de 15 px avant 400 ms → jamais `.ouvert`, et le `click` suivant n'est pas annulé ;
  - un appui court (`touchstart`, `touchend` à 100 ms, puis `click`) n'est pas annulé ;
  - l'événement `contextmenu` est annulé sur une pile, et pas sur une carte seule.
  - Dans `RecipeGrid.test.tsx` : on ajoute aux 4 recettes de `lignes()` une variante du « Brownie ». La liste montre toujours 4 cartes, une seule titrée « Brownie », et le compteur affiche « 4 recettes ». Chercher un mot présent seulement dans la variante montre la carte de la variante. Les tests existants restent verts.
- [ ] **Étape 2 : lancer `npx vitest run src/components/PlatCard.test.tsx src/components/RecipeGrid.test.tsx`.** Résultat attendu : ÉCHEC.
- [ ] **Étape 3 : implémenter `PlatCard`.**
  - Appui long : `setTimeout` de 400 ms au `touchstart`, annulé au `touchmove` au-delà de 10 px et au `touchend` / `touchcancel`. Un `ref` « appui long fait » est utilisé pour annuler le `click` suivant.
  - Dans `RecipeGrid`, remplacer `searchRecipes` par `platsAffiches`. Le tri A → Z se fait sur `carte.recipe.titre`, et le compteur compte les plats.
- [ ] **Étape 4 : relancer les deux fichiers, puis `npm test` et `npm run lint`.** Résultat attendu : tout passe.
- [ ] **Étape 5 : vérifier dans le navigateur.**
  - Lancer `npm run dev`, puis préparer deux variantes avec la démo de développement (`/dev/admin`) et un envoi par `/ajouter`.
  - Contrôler le survol sur ordinateur, ainsi que l'appui long, le défilement et l'appui court en mode mobile des outils de développement.
  - Vérifier que les fiches ne sont coupées ni par les cartes voisines ni par le bord de la grille.
- [ ] **Étape 6 : commit** `feat(variantes): une carte par plat sur l'accueil, pile et éventail`.

### Tâche 9 : formulaire « Ajouter », « Modifier ici » et administration

**Fichiers :**
- Modifier : `src/components/AddRecipeForm.tsx`, `src/components/RecipeEditor.tsx`, `src/app/(site)/recettes/[id]/modifier/page.tsx`, `src/app/(site)/admin/page.tsx`
- Test : `src/components/AddRecipeForm.test.tsx`, `src/components/RecipeEditor.test.tsx` (la page admin, composant serveur sans test existant, est vérifiée à la main à l'étape 4)

**Interfaces :**
- Consomme : la réponse de `POST` avec `variante_de: { slug, titre }` (Tâche 3), et `listerGroupe` (Tâche 3).
- Change : `RecipeEditor({ recipe, slug, dansUnGroupe?: boolean })`. Quand `dansUnGroupe` est vrai, il affiche le champ « Nom de la variante », pré-rempli avec `recipe.nom_variante`. Le bloc envoyé contient alors `nom_variante` (la valeur saisie, ou `null` si le champ est vidé). Il ne contient jamais `variante_de`.
- Messages de succès d'`AddRecipeForm`, quand la réponse a `variante_de` : `Variante ajoutée à « ${titre} » !` si elle est publiée, `Variante envoyée : elle est en attente de validation.` sinon.

- [ ] **Étape 1 : écrire les tests qui échouent :**
  - le message de succès d'une variante publiée et celui d'une variante en attente (simulation de `fetch` comme dans les tests existants) ;
  - **[vigilance 2]** l'éditeur avec `dansUnGroupe` : le champ est pré-rempli, le corps envoyé contient `nom_variante` modifié, et ne contient pas `variante_de` ;
  - sans `dansUnGroupe`, le champ est absent.
- [ ] **Étape 2 : lancer les fichiers de test.** Résultat attendu : ÉCHEC.
- [ ] **Étape 3 : implémenter.** La page « modifier » calcule `dansUnGroupe` avec `(await listerGroupe(...)).length >= 2`. La page admin lit la référence avec `store.getRecipe(row.varianteDe)`.
- [ ] **Étape 4 : lancer `npm test`, `npm run lint` et `npx tsc --noEmit`.** Résultat attendu : tout passe. Ensuite, avec `npm run dev`, envoyer une variante depuis un navigateur privé (visiteur) et vérifier que `/admin` affiche « Variante de « Titre » » sous son titre.
- [ ] **Étape 5 : commit** `feat(variantes): formulaire d'ajout, éditeur et administration`.
