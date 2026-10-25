# Notre cuisine — Plan de développement

> **Pour les agents :** SOUS-COMPÉTENCE REQUISE : utiliser superpowers:subagent-driven-development (recommandé) ou superpowers:executing-plans pour exécuter ce plan tâche par tâche. Les étapes utilisent des cases à cocher (`- [ ]`).

**Objectif :** un site de recettes en commun (PWA Android), alimenté par copier/partager depuis un chat Claude, avec rôles, validation et affichage interactif (portions, chronos).

**Architecture :** Next.js (App Router, TypeScript) déployé sur Vercel. Supabase sert uniquement d'hébergeur Postgres gratuit : toutes les lectures et écritures passent par du code serveur Next.js avec la clé « service role », les tables n'ont aucune politique publique. Les comptes sont maison, sans mot de passe : un profil (admin ou membre) et des appareils reconnus par un jeton dans un cookie, obtenu via un lien d'invitation. La logique métier est écrite contre une interface `Store`, avec une version en mémoire pour les tests et une version Supabase.

**Stack :** Node 22, Next.js (dernière version stable), TypeScript, Tailwind, Zod, Vitest, Testing Library, `@supabase/supabase-js`, `sharp` (génération d'icônes).

**Spécification :** [docs/2026-10-18-recettes-famille-design.md](../../2026-10-18-recettes-famille-design.md)

## Contraintes globales

- Tout est gratuit, sans carte bancaire : Vercel (offre gratuite), Supabase (offre gratuite). Aucun appel à une API Claude.
- Interface et messages d'erreur en français. Nombres affichés avec la virgule (`1,5`).
- Cible : Chrome sur Android (PWA installée) et navigateur PC. Mobile d'abord, thèmes clair et sombre.
- Les recettes publiées sont lisibles sans connexion, le site demande aux moteurs de recherche de ne pas l'indexer (`X-Robots-Tag: noindex`, `robots.txt`).
- Visiteur inconnu : recette `pending`, invisible hors admin. Membre ou admin : recette `published` tout de suite.
- Envoi d'un visiteur limité à 5 par heure et par adresse IP (hachée), charge utile limitée à 100 000 octets.
- Quantités toujours lisibles : jamais de fraction étrange, jamais `NaN` ni `0`.
- Unités canoniques : `g`, `kg`, `ml`, `l`, `cas` (cuillère à soupe), `cac` (cuillère à café), `pincee`, `piece`, `""` (aucune).
- Catégories : `entree`, `salade`, `plat`, `dessert`, `gouter`, `sauce`, `cocktail`, `autre`.
- Référence d'ingrédient dans une étape : `{{id}}` est remplacé par la **quantité seulement** (ex. « 40 g »). L'auteur écrit « {{pignons}} de pignons de pin ».
- Les champs du JSON de recette sont en français : `titre`, `description`, `portions`, `categorie`, `tags`, `ingredients[{id, nom, quantite, unite}]`, `etapes[{titre, texte, chrono_secondes}]`, `notes`, `id` (mise à jour seulement).

## Points de vigilance (non couverts par les fonctions principales)

1. Claude écrit du texte autour du bloc, plusieurs blocs, des guillemets typographiques ou une virgule en trop : l'import doit quand même trouver la recette (Tâche 2).
2. Quantité absente (« sel, au goût »), nulle ou minuscule après division, et portions à 1, 0,5 ou 0 : jamais de `NaN`, jamais de « 0 pincée » (Tâche 3).
3. Charge utile énorme ou envois en rafale d'un visiteur : refusés avant d'écrire en base (Tâche 6).
4. Invitation expirée, déjà utilisée, inconnue ou appareil retiré : message clair, jamais d'erreur 500, retour au rôle visiteur (Tâche 5).
5. Texte partagé contenant `</script>` ou du HTML : jamais exécuté ni affiché brut (Tâche 9).

## Structure des fichiers

```
package.json  tsconfig.json  vitest.config.ts  vercel.json  .env.example
supabase/migrations/0001_init.sql
src/lib/recipe/{types,parse,scale,search,slug,prompts}.ts   (+ .test.ts à côté)
src/lib/store/{types,memory,supabase,index}.ts  + contract.ts, memory.test.ts
src/lib/{auth,service,share-bridge,timer}.ts                (+ .test.ts)
src/app/(site)/page.tsx                        liste et recherche
src/app/(site)/recettes/[id]/page.tsx          recette (RecipeView, Timers)
src/app/(site)/recettes/[id]/modifier/page.tsx éditeur
src/app/(site)/ajouter/page.tsx                import + aperçu
src/app/(site)/admin/page.tsx                  validation, invitations, appareils, export
src/app/(site)/claude/page.tsx                 documentation pour Claude
src/app/api/recettes/route.ts                  GET liste, POST envoi
src/app/api/recettes/[id]/route.ts             GET recette
src/app/api/cron/keepalive/route.ts
src/app/ajouter/partage/route.ts               cible de partage Android (POST)
src/app/invite/[token]/route.ts                activation d'un appareil
src/app/manifest.ts   src/app/robots.ts   public/sw.js
scripts/create-invite.ts   scripts/make-icons.mjs
docs/deploiement.md
```

---

### Tâche 1 : Squelette et outils

**Fichiers :**
- Créer : le projet Next.js à la racine du dépôt (sans écraser `docs/` ni `README.md`), `vitest.config.ts`, `.env.example`, `src/lib/sanity.test.ts` (supprimé à la fin de la tâche)

**Interfaces :**
- Produit : scripts npm `dev`, `build`, `test` (Vitest, environnement `jsdom`, alias `@` → `src`), `lint`. Variables d'environnement documentées dans `.env.example` : `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `SITE_URL`, `IP_HASH_SALT`.

- [ ] **Étape 1 :** Générer le projet avec `create-next-app` (TypeScript, Tailwind, App Router, dossier `src`, alias `@/*`, ESLint) dans un dossier temporaire puis le déplacer à la racine sans toucher à `docs/` ni `README.md`. Ajouter `zod`, `@supabase/supabase-js`, et en dev `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@vitejs/plugin-react`, `sharp`, `tsx`.
- [ ] **Étape 2 :** Écrire `src/lib/sanity.test.ts` avec `expect(1 + 1).toBe(2)`, puis `npm test` doit afficher 1 test réussi.
- [ ] **Étape 3 :** `npm run build` doit réussir. Supprimer `sanity.test.ts`.
- [ ] **Étape 4 :** Ajouter `.env.example` (variables ci-dessus, valeurs vides, commentaire d'une ligne chacune) et vérifier que `.env*` (sauf `.env.example`) est dans `.gitignore`.
- [ ] **Étape 5 :** Commit `chore: squelette Next.js et outils de test`.

---

### Tâche 2 : Format de recette et lecture tolérante

**Fichiers :**
- Créer : `src/lib/recipe/types.ts`, `src/lib/recipe/parse.ts`
- Test : `src/lib/recipe/parse.test.ts`

**Interfaces :**
- Produit (`types.ts`) : `UNITES`, `CATEGORIES` (valeurs des contraintes globales), `type Unite`, `type Categorie`, `type Ingredient = { id: string; nom: string; quantite: number | null; unite: Unite }`, `type Etape = { titre?: string; texte: string; chrono_secondes?: number }`, `type Recipe = { id?: string; titre: string; description?: string; portions: number; categorie: Categorie; tags: string[]; ingredients: Ingredient[]; etapes: Etape[]; notes?: string }`.
- Produit (`parse.ts`) : `parseRecipeBlock(text: string): ParseResult` avec `type ParseResult = { ok: true; recipe: Recipe; warnings: string[] } | { ok: false; errors: string[] }`.

- [ ] **Étape 1 : écrire les tests qui échouent** (`parse.test.ts`, tous avec de vraies recettes courtes) :
  - `extrait un bloc entouré de phrases` : texte « Voilà ! » + bloc ```json … ``` + « Bon appétit » → `ok: true`, `recipe.titre` égal au titre du bloc.
  - `choisit le premier bloc qui est une recette` : deux blocs, le premier sans `titre` ni `ingredients` → renvoie le second.
  - `accepte les variantes` : clé `Titre`, clé `catégorie`, `"quantite": "1,5"` → `1.5`, unité `"grams"` → `g`, `"cuillères à soupe"` → `cas`, `"pincée"` → `pincee`, `"pièce"` → `piece`, guillemets typographiques `“ ”`, virgule en trop avant `}` ou `]`.
  - `portions manquantes` → `portions: 4` et un avertissement.
  - `identifiants d'ingrédient en double` → `tomates` puis `tomates-2` et un avertissement.
  - `erreurs en français` : sans JSON → `["Je ne trouve pas de recette dans ce texte."]` ; sans titre → contient `"Il manque le titre."` ; sans ingrédient → contient `"Aucun ingrédient."` ; sans étape → contient `"Aucune étape."` ; plus de 100 ingrédients ou 60 étapes → erreur de taille.
  - `catégorie inconnue` → `autre` et un avertissement.
- [ ] **Étape 2 :** `npx vitest run src/lib/recipe/parse.test.ts` → échec (module absent).
- [ ] **Étape 3 :** Implémenter `types.ts` et `parse.ts`. Approche : repérer les blocs ``` puis les accolades équilibrées dans le texte brut, normaliser (guillemets, virgules finales, clés sans accent ni majuscule), valider avec Zod, convertir les nombres français, traduire les alias d'unité par un tableau.
- [ ] **Étape 4 :** Relancer les tests → tous passent.
- [ ] **Étape 5 :** Commit `feat: format de recette et lecture tolérante`.

---

### Tâche 3 : Quantités et texte des étapes

**Fichiers :**
- Créer : `src/lib/recipe/scale.ts`
- Test : `src/lib/recipe/scale.test.ts`

**Interfaces :**
- Consomme : `Unite`, `Ingredient` (Tâche 2).
- Produit : `formatQuantity(quantite: number | null, unite: Unite, portionsBase: number, portionsCible: number): string` ; `renderStepText(texte: string, ingredients: Ingredient[], portionsBase: number, portionsCible: number): string`. Lève `RangeError` si une portion est ≤ 0.

Règles d'arrondi (décidées ici) : `g` et `ml` au multiple de 5, ou à l'unité en dessous de 10 ; à partir de 1000, `kg` et `l` avec une décimale ; `cas` et `cac` au quart, affichés `¼ ½ ¾` (ex. `1 ½ càs`) ; `piece` à la demi, minimum `½`, aucun texte d'unité ; `pincee` entier, minimum 1, pluriel `pincées`. Quantité `null` ou 0 → chaîne vide.

- [ ] **Étape 1 : tests qui échouent** (`formatQuantity(quantite, unite, base, cible)` → attendu) :
  - `(90, 'ml', 4, 1)` → `"25 ml"` ; `(500, 'g', 4, 1)` → `"125 g"` ; `(60, 'ml', 4, 6)` → `"90 ml"` ; `(7, 'g', 4, 1)` → `"2 g"`
  - `(1500, 'g', 4, 4)` → `"1,5 kg"` ; `(1000, 'ml', 4, 4)` → `"1 l"`
  - `(3, 'cas', 4, 1)` → `"¾ càs"` ; `(1, 'cas', 2, 3)` → `"1 ½ càs"` ; `(1, 'cac', 4, 1)` → `"¼ càc"`
  - `(4, 'piece', 4, 1)` → `"1"` ; `(1, 'piece', 4, 2)` → `"½"` ; `(3, 'piece', 4, 1)` → `"1"`
  - `(2, 'pincee', 4, 1)` → `"1 pincée"` ; `(2, 'pincee', 4, 4)` → `"2 pincées"`
  - `(null, 'g', 4, 2)` → `""` ; `(0, 'g', 4, 2)` → `""`
  - portions cible 0 ou −1 → lève `RangeError`
  - `renderStepText('Faire dorer {{pignons}} de pignons', [pignons 40 g], 4, 2)` → `"Faire dorer 20 g de pignons"` ; référence inconnue `{{inconnu}}` → `"inconnu"` (texte simple) ; texte sans référence inchangé.
- [ ] **Étape 2 :** lancer le fichier de test → échec.
- [ ] **Étape 3 :** Implémenter les deux fonctions (une table de règles par unité, un seul point d'arrondi par règle).
- [ ] **Étape 4 :** Tests → passent.
- [ ] **Étape 5 :** Commit `feat: calcul et affichage lisible des quantités`.

---

### Tâche 4 : Stockage (interface, mémoire, Supabase)

**Fichiers :**
- Créer : `src/lib/recipe/slug.ts`, `src/lib/store/types.ts`, `src/lib/store/memory.ts`, `src/lib/store/contract.ts`, `src/lib/store/supabase.ts`, `src/lib/store/index.ts`, `supabase/migrations/0001_init.sql`
- Test : `src/lib/recipe/slug.test.ts`, `src/lib/store/memory.test.ts`

**Interfaces :**
- Consomme : `Recipe` (Tâche 2).
- Produit (`slug.ts`) : `makeSlug(titre: string, existants: Set<string>): string`.
- Produit (`store/types.ts`) :
  `type Role = 'admin' | 'member'` ; `type Status = 'published' | 'pending'` ;
  `type RecipeRow = { id: string; slug: string; status: Status; authorId: string | null; createdAt: string; updatedAt: string; recipe: Recipe }` ;
  `type Profile = { id: string; name: string; role: Role }` ;
  `type Device = { id: string; profileId: string; label: string; createdAt: string; lastSeenAt: string; revokedAt: string | null }` ;
  `interface Store` avec : `insertRecipe(input: { status: Status; authorId: string | null; recipe: Recipe }): Promise<RecipeRow>` ; `updateRecipe(id: string, patch: { status?: Status; recipe?: Recipe }): Promise<RecipeRow | null>` ; `getRecipe(idOrSlug: string): Promise<RecipeRow | null>` ; `listRecipes(filter?: { status?: Status }): Promise<RecipeRow[]>` ; `deleteRecipe(id: string): Promise<boolean>` ; `createProfile(name: string, role: Role): Promise<Profile>` ; `getProfile(id: string): Promise<Profile | null>` ; `createInvite(profileId: string, label: string, tokenHash: string, expiresAt: string): Promise<void>` ; `claimInvite(tokenHash: string, deviceTokenHash: string, nowIso: string): Promise<{ status: 'ok'; device: Device } | { status: 'invalide' | 'expiree' | 'utilisee' }>` ; `findDevice(tokenHash: string): Promise<{ device: Device; profile: Profile } | null>` (renvoie `null` si l'appareil est retiré) ; `touchDevice(id: string, nowIso: string): Promise<void>` ; `listDevices(): Promise<Array<Device & { profileName: string }>>` ; `revokeDevice(id: string, nowIso: string): Promise<void>` ; `countSubmissions(ipHash: string, sinceIso: string): Promise<number>` ; `logSubmission(ipHash: string, nowIso: string): Promise<void>` ; `ping(): Promise<void>`.
- Produit : `getStore(): Store` (Supabase si les variables d'environnement existent, sinon une erreur claire) et `setStoreForTests(store: Store | null): void`. `runStoreContract(name: string, make: () => Promise<Store>): void` dans `contract.ts`, qui déclare les tests communs.

- [ ] **Étape 1 : tests qui échouent.** `slug.test.ts` : `"Salade Italienne à la Burrata"` → `"salade-italienne-a-la-burrata"` ; avec `existants = {"salade"}`, `"Salade"` → `"salade-2"`. `memory.test.ts` appelle `runStoreContract('mémoire', async () => new MemoryStore())`. Le contrat vérifie : insertion puis lecture par `id` et par `slug` ; deux recettes au même titre ont des slugs différents ; `listRecipes({ status: 'published' })` n'inclut pas les `pending` ; `updateRecipe` change le statut ; `deleteRecipe` renvoie `true` puis `false` ; une invitation se réclame une fois (`ok`, puis `utilisee`), une invitation expirée renvoie `expiree`, un jeton inconnu `invalide` ; `findDevice` renvoie `null` après `revokeDevice` ; `countSubmissions` ne compte que les envois après `sinceIso`.
- [ ] **Étape 2 :** `npx vitest run src/lib` → échec.
- [ ] **Étape 3 :** Implémenter `slug.ts`, `types.ts`, `memory.ts`, `contract.ts`, `index.ts`.
- [ ] **Étape 4 :** Écrire `0001_init.sql` : tables `profiles`, `recipes` (colonnes `id`, `slug` unique, `status`, `author_id`, `data jsonb`, dates), `invites` (`token_hash` unique, `profile_id`, `label`, `expires_at`, `claimed_at`), `devices`, `submissions`, `RLS` activé sur toutes sans aucune politique. Implémenter `supabase.ts` (client avec la clé « service role », même contrat). Les tables se créent en collant le SQL dans l'éditeur SQL de Supabase (voir Tâche 12).
- [ ] **Étape 5 :** `npx vitest run` → passe. Le contrat Supabase se lance seulement si `SUPABASE_TEST_URL` est défini (non exécuté ici, voir Tâche 12).
- [ ] **Étape 6 :** Commit `feat: stockage des recettes, profils et appareils`.

---

### Tâche 5 : Invitations et appareils reconnus

**Fichiers :**
- Créer : `src/lib/auth.ts`, `scripts/create-invite.ts`, `src/app/invite/[token]/route.ts`
- Test : `src/lib/auth.test.ts`

**Interfaces :**
- Consomme : `Store`, `Profile`, `Role` (Tâche 4).
- Produit : `type Viewer = { role: 'admin' | 'member' | 'visitor'; profileId: string | null; name: string | null; deviceId: string | null }` ; `DEVICE_COOKIE = 'nc_device'` ; `hashToken(token: string): string` (SHA-256 hexadécimal) ; `newToken(): string` (32 octets aléatoires, base64url) ; `createInviteLink(store: Store, profileId: string, label: string, origin: string, now?: () => number): Promise<string>` (valable 7 jours, renvoie `${origin}/invite/${token}`) ; `claimInvite(store: Store, token: string, now?: () => number): Promise<{ ok: true; deviceToken: string } | { ok: false; erreur: string }>` (message en français) ; `getViewer(store: Store, deviceToken: string | undefined, now?: () => number): Promise<Viewer>`.

- [ ] **Étape 1 : tests qui échouent :**
  - invitation créée puis réclamée → `ok: true`, puis `getViewer` avec le `deviceToken` renvoie `role: 'member'` et le bon `name`.
  - invitation réclamée deux fois → `{ ok: false, erreur: "Cette invitation a déjà été utilisée." }`.
  - invitation vieille de 8 jours → `{ ok: false, erreur: "Cette invitation a expiré." }`.
  - jeton inconnu → `{ ok: false, erreur: "Invitation introuvable." }`.
  - `getViewer(store, undefined)` → `role: 'visitor'` ; jeton inconnu → visiteur ; appareil retiré → visiteur.
  - profil `admin` → `role: 'admin'`.
- [ ] **Étape 2 :** lancer `auth.test.ts` → échec.
- [ ] **Étape 3 :** Implémenter `auth.ts` (le jeton n'est jamais stocké en clair, seulement son hachage).
- [ ] **Étape 4 :** Écrire la route `GET /invite/[token]` : réclame l'invitation, pose le cookie `nc_device` (`httpOnly`, `secure`, `sameSite=lax`, 400 jours) et redirige vers `/` ; en cas d'erreur, affiche le message sur une page simple avec statut 410.
- [ ] **Étape 5 :** Écrire `scripts/create-invite.ts` (`npm run invite -- --role admin --name Mathieu`) : crée le profil et affiche le lien. Ajouter le script npm `invite`.
- [ ] **Étape 6 :** Tests → passent. Commit `feat: invitations et appareils reconnus`.

---

### Tâche 6 : Règles métier

**Fichiers :**
- Créer : `src/lib/recipe/search.ts`, `src/lib/service.ts`
- Test : `src/lib/recipe/search.test.ts`, `src/lib/service.test.ts`

**Interfaces :**
- Consomme : `Store`, `RecipeRow`, `Viewer`, `Recipe`.
- Produit : `searchRecipes(rows: RecipeRow[], q: string, categorie?: string): RecipeRow[]` (insensible aux accents et à la casse, cherche dans le titre et les noms d'ingrédients) ; `type ServiceResult<T> = { ok: true; value: T } | { ok: false; code: 'forbidden' | 'not_found' | 'rate_limited' | 'too_large' }` ; `submitRecipe(store: Store, viewer: Viewer, recipe: Recipe, ctx: { ipHash: string; now?: () => number }): Promise<ServiceResult<RecipeRow>>` ; `approveRecipe(store: Store, viewer: Viewer, id: string): Promise<ServiceResult<RecipeRow>>` ; `removeRecipe(store: Store, viewer: Viewer, id: string): Promise<ServiceResult<true>>` ; `listPublished(store: Store, q?: string, categorie?: string): Promise<RecipeRow[]>` ; `listPending(store: Store, viewer: Viewer): Promise<ServiceResult<RecipeRow[]>>` ; `exportAll(store: Store, viewer: Viewer): Promise<ServiceResult<RecipeRow[]>>`.

- [ ] **Étape 1 : tests qui échouent :**
  - `search` : « creme » trouve « Crème brûlée » ; « burrata » trouve une recette dont seul un ingrédient s'appelle burrata ; filtre `categorie: 'dessert'` ; `q` vide renvoie tout.
  - visiteur : `submitRecipe` → `status: 'pending'` ; membre → `published` avec `authorId` ; admin → `published`.
  - 6e envoi d'un même `ipHash` dans l'heure → `{ ok: false, code: 'rate_limited' }` ; le 6e après 61 minutes passe.
  - recette dont `JSON.stringify` dépasse 100 000 octets → `too_large`, et rien n'est écrit en base.
  - mise à jour (`recipe.id` présent) : membre sur sa propre recette → ok et le statut reste `published` ; membre sur la recette d'un autre → `forbidden` ; admin → ok ; visiteur → `forbidden` ; `id` inconnu → `not_found`.
  - `approveRecipe` : admin seulement ; passe de `pending` à `published`.
  - `removeRecipe` : membre sur sa recette ok, sur une autre `forbidden`, admin ok.
  - `listPublished` exclut les `pending` ; `listPending` et `exportAll` sont réservés à l'admin (`forbidden` sinon).
- [ ] **Étape 2 :** lancer les deux fichiers → échec.
- [ ] **Étape 3 :** Implémenter `search.ts` et `service.ts` (aucun accès HTTP ici, uniquement le `Store`).
- [ ] **Étape 4 :** Tests → passent. Commit `feat: règles de publication, droits et recherche`.

---

### Tâche 7 : API publique et page pour Claude

**Fichiers :**
- Créer : `src/lib/recipe/prompts.ts`, `src/app/api/recettes/route.ts`, `src/app/api/recettes/[id]/route.ts`, `src/app/(site)/claude/page.tsx`, `src/app/robots.ts`
- Modifier : `next.config.ts` (en-tête `X-Robots-Tag: noindex, nofollow` partout)
- Test : `src/lib/recipe/prompts.test.ts`, `src/app/api/recettes/route.test.ts`

**Interfaces :**
- Consomme : `parseRecipeBlock`, `submitRecipe`, `listPublished`, `getStore`, `getViewer`, `DEVICE_COOKIE`.
- Produit (`prompts.ts`) : `EXEMPLE_RECETTE: Recipe` (recette complète réaliste, avec chrono et référence `{{id}}`) ; `instructionsClaude(origin: string): string` (texte à coller dans Claude : quand une recette est finalisée, la terminer par un bloc ```json au format, quantités rondes, rien d'autre dans le bloc, et comment lire le site) ; `buildEditPrompt(row: RecipeRow): string` (message prêt à coller dans Claude, contenant la recette actuelle avec son `id`).
- Produit : `GET /api/recettes?q=&categorie=` → `200` JSON `[{ id, slug, titre, description, categorie }]` (publiées seulement) ; `GET /api/recettes/[id]` (par `id` ou `slug`) → `200` recette complète, `404` si absente ou en attente ; `POST /api/recettes` corps `{ "texte": string }` → `201` publiée, `202` en attente, `422 { errors: string[] }`, `413`, `429`, `403`.

- [ ] **Étape 1 : tests qui échouent :**
  - `prompts.test.ts` : `parseRecipeBlock('```json\n' + JSON.stringify(EXEMPLE_RECETTE) + '\n```')` renvoie `ok: true` (le format documenté reste lisible) ; `instructionsClaude('https://x.test')` contient `https://x.test/api/recettes` ; `buildEditPrompt` contient l'`id` de la recette, et le bloc qu'il contient se relit avec `parseRecipeBlock` en gardant le même `id`.
  - `route.test.ts` (on appelle les gestionnaires avec des objets `Request`, le store est injecté par `setStoreForTests`) : la liste exclut les recettes en attente ; `?q=burrata` filtre ; `GET /api/recettes/<slug>` → 200, recette en attente → 404 ; `POST` visiteur avec un bloc valide → 202 ; `POST` avec `cookie: nc_device=<jeton membre>` → 201 ; `POST` avec un texte sans recette → 422 et `errors` en français ; corps de plus de 100 000 octets → 413 ; 6 envois d'un visiteur → le 6e renvoie 429.
- [ ] **Étape 2 :** lancer les deux fichiers → échec.
- [ ] **Étape 3 :** Implémenter `prompts.ts` et les gestionnaires. L'adresse IP vient de `x-forwarded-for`, hachée avec `IP_HASH_SALT` avant tout usage.
- [ ] **Étape 4 :** Écrire `/claude` : page lisible avec un bouton « Copier les instructions » (instructions pour Claude, exemple de bloc, adresses de lecture) et sa version texte brut en réponse `text/plain` sur `/claude.txt` (route `src/app/(site)/claude.txt/route.ts`, même contenu). `robots.ts` interdit l'indexation.
- [ ] **Étape 5 :** Tests → passent. Commit `feat: API publique et documentation pour Claude`.

---

### Tâche 8 : Liste et page recette (portions, chronos)

**Fichiers :**
- Créer : `src/lib/timer.ts`, `src/components/RecipeView.tsx`, `src/components/Timers.tsx`, `src/app/(site)/page.tsx`, `src/app/(site)/recettes/[id]/page.tsx`, `src/app/layout.tsx` (thème, police, métadonnées, barre de navigation)
- Test : `src/lib/timer.test.ts`, `src/components/RecipeView.test.tsx`

**Interfaces :**
- Consomme : `Recipe`, `formatQuantity`, `renderStepText`, `listPublished`, `getRecipe`.
- Produit (`timer.ts`) : `remainingMs(endsAt: number, now: number): number` (jamais négatif) ; `formatClock(ms: number): string` (`"02:30"`, `"1:05:00"` au-delà d'une heure) ; `clockIntentUrl(seconds: number): string` (lien Android pour l'appli Horloge).
- Produit : `<RecipeView recipe={Recipe} />` : champ de portions (boutons `−` et `+`, de 1 à 50, départ = `recipe.portions`), liste des ingrédients et étapes recalculées, une puce de chrono par étape qui en a un, notes. `<Timers>` gère plusieurs chronos à la fois, avec pause, alarme sonore, vibration, et garde l'écran allumé (Wake Lock) tant qu'un chrono tourne.

- [ ] **Étape 1 : tests qui échouent :**
  - `timer.test.ts` : `formatClock(150000)` → `"02:30"` ; `formatClock(3900000)` → `"1:05:00"` ; `remainingMs(1000, 5000)` → `0` ; `clockIntentUrl(150)` → exactement `"intent:#Intent;action=android.intent.action.SET_TIMER;i.android.intent.extra.alarm.LENGTH=150;B.android.intent.extra.alarm.SKIP_UI=true;end"`.
  - `RecipeView.test.tsx` : avec une recette de base 4 portions contenant `400 g` de tomates, l'écran affiche `400 g` ; après trois clics sur `−` il affiche `100 g` et « 1 » portion ; le bouton `−` est désactivé à 1 ; une étape contenant `{{pignons}}` affiche la quantité recalculée ; une étape avec `chrono_secondes: 150` affiche une puce `02:30`.
- [ ] **Étape 2 :** lancer les deux fichiers → échec.
- [ ] **Étape 3 :** Implémenter `timer.ts`, `RecipeView`, `Timers`. La puce de chrono propose deux boutons : « Lancer ici » (chrono de la page) et « Horloge du téléphone » (lien `clockIntentUrl`, à tester sur le vrai téléphone, voir Tâche 12).
- [ ] **Étape 4 :** Page d'accueil : champ de recherche, filtres par catégorie, cartes de recettes (rendu serveur, données de `listPublished`). Page recette : `getRecipe` (404 si absente ou en attente, sauf pour l'auteur et l'admin), bouton « Modifier avec Claude » (copie `buildEditPrompt`) et lien « Modifier » si les droits le permettent.
- [ ] **Étape 5 :** Tests → passent, puis `npm run dev` et vérification visuelle sur une largeur de 375 px (liste, recette, curseur, chrono).
- [ ] **Étape 6 :** Commit `feat: liste, recette interactive et chronos`.

---

### Tâche 9 : Ajouter une recette et partage Android

**Fichiers :**
- Créer : `src/lib/share-bridge.ts`, `src/app/ajouter/partage/route.ts`, `src/app/(site)/ajouter/page.tsx`, `src/components/AddRecipeForm.tsx`
- Test : `src/lib/share-bridge.test.ts`, `src/components/AddRecipeForm.test.tsx`

**Interfaces :**
- Consomme : `parseRecipeBlock`, `POST /api/recettes`.
- Produit : `buildShareBridgeHtml(texte: string): string` : page HTML minimale qui écrit le texte dans `sessionStorage` sous la clé `nc_partage` puis redirige vers `/ajouter?partage=1`, avec le texte échappé (`<` en `<`, ` ` et ` ` aussi) ; `POST /ajouter/partage` (formulaire multipart avec `text`, `title`, `url`) → réponse `200 text/html` de cette page.
- Produit : `<AddRecipeForm />` : zone de texte, bouton « Coller depuis le presse-papiers », lecture en direct avec `parseRecipeBlock`, aperçu (`RecipeView`), erreurs et avertissements en français, bouton « Envoyer » ; reprend le texte de `sessionStorage` (`nc_partage`) ou des paramètres `?text=`. Si le bloc contient un `id` connu, le bouton devient « Mettre à jour ». Résultat : « Publiée » avec lien (membre) ou « En attente de validation » (visiteur).

- [ ] **Étape 1 : tests qui échouent :**
  - `share-bridge.test.ts` : `buildShareBridgeHtml('</script><b>x</b>')` ne contient `</script>` qu'une seule fois (la balise de fermeture du script lui-même) et contient `</script>` ; un texte avec des guillemets et des retours à la ligne est restitué à l'identique lorsqu'on évalue la valeur échappée ; la route `POST` avec un formulaire contenant `text` renvoie 200 `text/html`.
  - `AddRecipeForm.test.tsx` : coller du texte sans recette affiche « Je ne trouve pas de recette dans ce texte. » ; coller le bloc de `EXEMPLE_RECETTE` affiche l'aperçu et active « Envoyer » ; un bloc avec un avertissement l'affiche sans bloquer l'envoi.
- [ ] **Étape 2 :** lancer les deux fichiers → échec.
- [ ] **Étape 3 :** Implémenter `share-bridge.ts`, la route et le formulaire. Le bouton « Coller » utilise `navigator.clipboard.readText()`, avec la zone de texte comme repli.
- [ ] **Étape 4 :** Tests → passent. Commit `feat: ajout de recette et cible de partage`.

---

### Tâche 10 : Administration, édition et appareils

**Fichiers :**
- Créer : `src/app/(site)/admin/page.tsx`, `src/app/(site)/recettes/[id]/modifier/page.tsx`, `src/components/RecipeEditor.tsx`, `src/app/api/admin/*/route.ts` (valider, refuser, inviter, retirer un appareil, exporter)
- Test : `src/app/api/admin/admin.test.ts`

**Interfaces :**
- Consomme : `approveRecipe`, `removeRecipe`, `listPending`, `exportAll`, `createInviteLink`, `Store.listDevices`, `Store.revokeDevice`, `getViewer`.
- Produit : `POST /api/admin/valider/[id]`, `POST /api/admin/refuser/[id]`, `POST /api/admin/inviter` (corps `{ nom: string; label: string }`, crée un profil membre et renvoie `{ lien: string }`), `POST /api/admin/appareils/[id]/retirer`, `GET /api/admin/export` (JSON de toutes les recettes). Tout renvoie `403` si l'appelant n'est pas admin. `<RecipeEditor recipe onSave />` : formulaire (titre, description, portions, catégorie, ingrédients, étapes avec chrono, notes) qui envoie une mise à jour via `POST /api/recettes`.

- [ ] **Étape 1 : tests qui échouent :** chaque route renvoie 403 pour un membre et pour un visiteur ; `valider` fait passer une recette `pending` en `published` pour l'admin ; `inviter` renvoie un lien `…/invite/<jeton>` utilisable par `claimInvite` ; `appareils/[id]/retirer` fait que `getViewer` renvoie ensuite `visitor` pour cet appareil ; `export` renvoie toutes les recettes, en attente comprises.
- [ ] **Étape 2 :** lancer le fichier → échec.
- [ ] **Étape 3 :** Implémenter les routes. Écrire `/admin` : file d'attente (aperçu, Valider, Modifier, Refuser), formulaire « Inviter quelqu'un » qui affiche le lien et un QR code (bibliothèque `qrcode`, côté serveur), liste des appareils avec « Retirer », bouton « Exporter les recettes ».
- [ ] **Étape 4 :** Écrire l'éditeur de recette et sa page. Un membre n'ouvre que ses recettes, l'admin toutes.
- [ ] **Étape 5 :** Tests → passent. Vérification manuelle avec `npm run dev` : inviter, ouvrir le lien dans une fenêtre privée, envoyer une recette (publiée), puis en visiteur (en attente), valider côté admin.
- [ ] **Étape 6 :** Commit `feat: administration, invitations et édition`.

---

### Tâche 11 : PWA, mode hors ligne et tâche d'éveil

**Fichiers :**
- Créer : `src/app/manifest.ts`, `public/sw.js`, `scripts/make-icons.mjs`, `public/icon.svg`, `src/components/RegisterSW.tsx`, `src/app/api/cron/keepalive/route.ts`, `vercel.json`
- Test : `src/app/manifest.test.ts`, `src/app/api/cron/keepalive/route.test.ts`

**Interfaces :**
- Produit : `manifest()` renvoie `name: 'Notre cuisine'`, `display: 'standalone'`, `start_url: '/'`, des icônes 192 et 512 px (dont une `maskable`), et `share_target: { action: '/ajouter/partage', method: 'POST', enctype: 'multipart/form-data', params: { title: 'title', text: 'text', url: 'url' } }`. `GET /api/cron/keepalive` : `401` sans l'en-tête `Authorization: Bearer ${CRON_SECRET}`, sinon appelle `store.ping()` et renvoie `200 { ok: true }`. `vercel.json` : tâche planifiée hebdomadaire (`0 6 * * 1`) vers `/api/cron/keepalive`.

- [ ] **Étape 1 : tests qui échouent :** le manifeste contient `share_target.action === '/ajouter/partage'`, `method === 'POST'` et des icônes 192 et 512 ; le gestionnaire `keepalive` renvoie 401 avec un mauvais secret, 200 avec le bon, et le `MemoryStore` de test a bien reçu un appel à `ping`.
- [ ] **Étape 2 :** lancer les deux fichiers → échec.
- [ ] **Étape 3 :** Implémenter le manifeste, la route, `vercel.json`. `make-icons.mjs` génère `public/icon-192.png`, `public/icon-512.png` et `public/icon-maskable-512.png` depuis `public/icon.svg` avec `sharp` (script npm `icons`, lancé une fois, fichiers générés commités).
- [ ] **Étape 4 :** Écrire `public/sw.js` (cache des fichiers statiques, des pages de recettes déjà ouvertes et de `/api/recettes`, réseau d'abord avec repli sur le cache) et `RegisterSW.tsx` (enregistre le service worker en production seulement). Le service worker ne met jamais en cache `/admin`, `/invite`, ni les réponses `POST`.
- [ ] **Étape 5 :** Tests → passent, puis `npm run build && npm start`, et vérification dans Chrome (onglet Application : manifeste valide, service worker actif, installable).
- [ ] **Étape 6 :** Commit `feat: PWA installable, hors ligne et tâche d'éveil`.

---

### Tâche 12 : Déploiement et vérifications sur le vrai téléphone

**Fichiers :**
- Créer : `docs/deploiement.md`

**Interfaces :**
- Produit : mode d'emploi pas à pas pour Mathieu (Supabase, Vercel, premier lien d'invitation admin, installation sur le téléphone) et liste de vérifications réelles.

- [ ] **Étape 1 :** Rédiger `docs/deploiement.md` : créer le projet Supabase gratuit ; coller `0001_init.sql` dans l'éditeur SQL ; relever `SUPABASE_URL` et la clé « service role » ; importer le dépôt dans Vercel ; saisir les variables (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `SITE_URL`, `IP_HASH_SALT`, valeurs aléatoires pour les deux secrets) ; déployer ; lancer `npm run invite -- --role admin --name Mathieu` en local avec les mêmes variables, ouvrir le lien sur son téléphone.
- [ ] **Étape 2 :** Lancer le contrat de stockage contre Supabase : `SUPABASE_TEST_URL=… npx vitest run src/lib/store` → tout passe (utiliser un projet de test ou nettoyer les données après).
- [ ] **Étape 3 : vérifications sur appareils réels** (à cocher et noter le résultat dans le document) :
  1. Installer la PWA sur le téléphone Android (Chrome, « Ajouter à l'écran d'accueil »).
  2. Dans l'appli Claude Android, partager le texte d'une recette vers « Notre cuisine » : le texte arrive-t-il dans `/ajouter` ? Sinon, noter que seul le bouton « Coller » fonctionne.
  3. Le bouton « Horloge du téléphone » démarre-t-il bien un minuteur dans l'appli Horloge ? Sinon, noter que seul le chrono de la page est utilisé et masquer ce bouton.
  4. Créer un lien d'invitation pour la copine, l'ouvrir sur son téléphone, fermer et rouvrir l'appli une semaine plus tard : toujours reconnue ?
  5. Dans un Claude gratuit avec les instructions de `/claude` : une recette demandée finit-elle par un bloc au bon format ? Une recette du site se récupère-t-elle en donnant l'adresse `/api/recettes` ?
  6. Visiteur (fenêtre privée) : envoi → en attente, invisible sur la liste publique.
- [ ] **Étape 4 :** Mettre à jour `README.md` (statut, adresse du site, comment lancer les tests). Commit `docs: déploiement et vérifications`.

---

## Auto-relecture

- **Couverture de la spécification :** parcours d'ajout (Tâches 2, 7, 9), modification par Claude et par formulaire (7, 8, 10), lecture et cuisine (3, 8), validation et export (10), rôles et appareils (5, 6, 10), page pour Claude et API (7), contraintes techniques, Vercel, Supabase, pause évitée, PWA, sauvegarde (1, 4, 11, 12). L'import des anciennes recettes et la clé personnelle sont hors version 1, comme prévu.
- **Cohérence des noms :** `parseRecipeBlock`, `formatQuantity`, `renderStepText`, `submitRecipe`, `getViewer`, `claimInvite`, `createInviteLink`, `setStoreForTests`, `DEVICE_COOKIE` sont utilisés avec les mêmes signatures dans toutes les tâches.
- **Proportion :** une tâche par ensemble qui a son propre test ; les corps de fonctions ne sont pas écrits, seuls les signatures, les valeurs de la spécification et les assertions le sont.
