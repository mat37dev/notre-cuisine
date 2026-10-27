import type { RecipeRow } from "../store/types";
import { CATEGORIES, type Recipe } from "./types";

/** Exemple complet : il sert de modèle dans les instructions et la documentation données à Claude. */
export const EXEMPLE_RECETTE: Recipe = {
  titre: "Salade italienne à la burrata",
  description: "Une salade fraîche et généreuse, sans cuisson.",
  portions: 4,
  categorie: "salade",
  tags: ["italien", "sans cuisson"],
  ingredients: [
    { id: "burrata", nom: "burrata", quantite: 4, unite: "piece" },
    { id: "tomates", nom: "tomates cerises", quantite: 400, unite: "g" },
    { id: "roquette", nom: "roquette", quantite: 120, unite: "g" },
    { id: "jambon", nom: "tranches de jambon de Parme", quantite: 8, unite: "piece" },
    { id: "basilic", nom: "feuilles de basilic frais", quantite: 20, unite: "" },
    { id: "huile", nom: "huile d'olive extra vierge", quantite: 60, unite: "ml" },
    { id: "pignons", nom: "pignons de pin", quantite: 40, unite: "g" },
    { id: "sel", nom: "fleur de sel", quantite: 4, unite: "pincee" },
  ],
  etapes: [
    { titre: "Préparer les tomates", texte: "Couper {{tomates}} de tomates cerises en deux et les mettre dans un grand plat." },
    {
      titre: "Toaster les pignons",
      texte: "Dans une poêle sèche, faire dorer {{pignons}} de pignons de pin en remuant.",
      chrono_secondes: 150,
    },
    {
      titre: "Dresser",
      texte:
        "Disposer {{roquette}} de roquette sur les tomates, ajouter {{jambon}} tranches de jambon, les {{burrata}} burrata et {{basilic}} feuilles de basilic. Arroser de {{huile}} d'huile d'olive et finir avec {{sel}} de fleur de sel.",
    },
  ],
  notes: "Sortir la burrata du frigo au dernier moment.",
};

/** Variante de l'exemple : elle sert de modèle dans la section « Proposer une variante » de la documentation. */
export const EXEMPLE_VARIANTE: Recipe = {
  variante_de: "salade-italienne-a-la-burrata",
  nom_variante: "Végétarienne",
  ...EXEMPLE_RECETTE,
  titre: "Salade italienne à la burrata, sans jambon",
  description: "La même salade, avec des pêches grillées à la place du jambon.",
  tags: ["italien", "sans cuisson", "végétarien"],
  ingredients: EXEMPLE_RECETTE.ingredients.map((i) =>
    i.id === "jambon" ? { id: "peches", nom: "pêches jaunes", quantite: 2, unite: "piece" } : i,
  ),
  etapes: [
    EXEMPLE_RECETTE.etapes[0],
    EXEMPLE_RECETTE.etapes[1],
    {
      titre: "Dresser",
      texte:
        "Disposer {{roquette}} de roquette sur les tomates, ajouter les {{peches}} pêches coupées en quartiers, les {{burrata}} burrata et {{basilic}} feuilles de basilic. Arroser de {{huile}} d'huile d'olive et finir avec {{sel}} de fleur de sel.",
    },
  ],
};

const sansBarreFinale = (origin: string) => origin.replace(/\/+$/, "");
const EXEMPLE_JSON = JSON.stringify(EXEMPLE_RECETTE, null, 2);
const EXEMPLE_VARIANTE_JSON = JSON.stringify(EXEMPLE_VARIANTE, null, 2);

/** Description du format, commune aux instructions à coller et à la documentation complète. */
const FORMAT_RECETTE = `Format :
- titre : le nom de la recette.
- description : une phrase (facultatif).
- portions : le nombre de personnes pour lequel les quantités sont écrites (4 par défaut).
- categorie : une seule parmi ${CATEGORIES.join(", ")}.
- tags : quelques mots-clés (facultatif).
- ingredients : une liste d'objets avec id, nom, quantite, unite. L'id est un mot court sans espace (ex. "tomates"). L'unite est g, kg, ml, l, cas (cuillère à soupe), cac (cuillère à café), pincee, piece, ou "" (rien : « 3 oignons »). La quantite est un nombre (ex. 1.5), ou absente si c'est « au goût ».
- etapes : une liste d'objets avec titre, texte, chrono_secondes. Mets chrono_secondes seulement s'il y a un temps à chronométrer (cuisson, repos), en secondes.
- notes : astuces (facultatif).
- image : l'adresse https directe d'une photo du plat (facultatif). Choisis une image toi-même si tu en trouves une qui convient (photo libre de droits, de Wikimedia Commons par exemple), et ne devine jamais une adresse que tu n'as pas vue : une adresse inventée donne une image cassée. Si tu n'en trouves pas de sûre, laisse le champ de côté. Je pourrai aussi ajouter une photo directement sur le site.
- variante_de : seulement pour une variante (une autre façon de faire un plat déjà sur le site) : le slug ou l'id de la recette de départ (facultatif).
- nom_variante : le nom court de la variante, affiché sur le site pour la distinguer des autres versions du plat, par exemple « Végétarienne » ou « Express » (facultatif, 40 caractères au maximum).

Règles :
- Des quantités rondes et faciles à diviser, de préférence en g et en ml.
- Dans le texte d'une étape, écris {{id}} à la place de la quantité d'un ingrédient : le site la recalcule quand on change le nombre de personnes. Exemple : « Faire dorer {{pignons}} de pignons de pin. » s'affichera « Faire dorer 40 g de pignons de pin. ».`;

/** Texte à coller une fois dans Claude : format de recette et façon de lire le site. */
export function instructionsClaude(origin: string): string {
  const o = sansBarreFinale(origin);
  return `Instructions pour notre carnet de cuisine (à garder pendant toute la conversation).

1. Quand une recette est finalisée
Quand je te dis qu'une recette est bonne, ou que je te demande « la version finale », termine ton message par UN SEUL bloc de code \`\`\`json qui contient la recette au format ci-dessous. Ne mets rien d'autre dans ce bloc : je le copierai pour l'envoyer sur notre site.

${FORMAT_RECETTE}

Exemple :
\`\`\`json
${EXEMPLE_JSON}
\`\`\`

2. Quand je te demande une recette de notre site
- Pour chercher, ouvre ${o}/api/recettes?q=MOT (par exemple q=burrata ; sans q, tout est listé). Tu reçois la liste en JSON.
- Pour une recette complète, ouvre ${o}/api/recettes/IDENTIFIANT (l'id ou le slug donné dans la liste).
Présente-la ensuite comme d'habitude, avec le choix du nombre de personnes et les chronos.

3. Quand je veux modifier une recette
Je te colle son bloc json. Renvoie la recette COMPLÈTE corrigée dans un seul bloc, en gardant le champ "id" tel quel.

4. Quand je veux une variante d'une recette (une autre façon de faire le même plat, qui s'ajoute à côté)
Renvoie la variante COMPLÈTE dans un seul bloc, SANS champ "id", avec "variante_de" (le slug de la recette de départ) et un "nom_variante" court qui dit ce qui change.

Documentation complète du site : ${o}/docs
`;
}

/** Documentation de référence, servie sur /docs, /readme et /llms.txt : tout ce qu'il faut à Claude pour utiliser le site. */
export function documentationClaude(origin: string): string {
  const o = sansBarreFinale(origin);
  return `# Notre cuisine : documentation pour Claude

${o} est le carnet de recettes d'un couple. Cette page dit tout ce qu'il faut pour l'utiliser avec la personne qui te parle. Réponds-lui en français.

## Ce que tu peux faire

1. Chercher et lire les recettes du site, sans connexion (adresses ci-dessous).
2. Préparer une nouvelle recette, une variante d'une recette ou la modification d'une recette : tu la donnes dans un bloc de code \`\`\`json que la personne copie, ou partage, vers l'appli « Notre cuisine ».
3. Tu ne peux pas écrire sur le site toi-même : ne dis jamais « c'est enregistré ». La personne envoie le bloc depuis son téléphone.

## Lire le site

- Chercher : GET ${o}/api/recettes?q=MOT&categorie=CATEGORIE
  Les deux paramètres sont facultatifs. Sans q, toutes les recettes publiées sont listées. La recherche ignore les accents et regarde le titre, les ingrédients et les mots-clés.
  Réponse : une liste JSON d'objets avec id, slug, titre, description, categorie, image. Une variante a en plus nom_variante et variante_de (le slug de la recette de référence de son plat).
- Lire une recette : GET ${o}/api/recettes/IDENTIFIANT (l'id ou le slug)
  Réponse : la recette complète au format ci-dessous, avec en plus slug, lien (adresse de la page) et "variantes" : la liste des autres versions du même plat (id, slug, titre, nom_variante, lien), vide si la recette est seule. Une variante a aussi variante_de (le slug de la recette de référence).
- Les recettes en attente de validation n'apparaissent pas.

Quand la personne demande une recette du site : cherche, lis la bonne recette, puis présente-la avec ton affichage habituel de recette : curseur du nombre de personnes (les quantités sont écrites pour "portions" personnes), ingrédients, étapes, et un chrono pour chaque étape qui a chrono_secondes. Dans le texte d'une étape, {{id}} désigne la quantité de l'ingrédient qui a cet id : remplace-le par la quantité pour le nombre de personnes choisi.

Un même plat peut avoir plusieurs versions (des variantes : végétarienne, express, celle de Mamie…). Si "variantes" n'est pas vide, dis-le à la personne en citant leurs noms : elle choisira peut-être une autre version.

## Format d'une recette

${FORMAT_RECETTE}

Exemple complet :

\`\`\`json
${EXEMPLE_JSON}
\`\`\`

## Ajouter une recette

1. Aide la personne à finaliser sa recette dans la conversation (quantités, étapes, temps).
2. Quand elle dit que c'est bon, termine ton message par UN SEUL bloc \`\`\`json au format ci-dessus, avec uniquement la recette dedans.
3. Dis-lui de copier ce bloc, ou de le partager vers « Notre cuisine », puis d'appuyer sur « Envoyer ». Si son appareil est reconnu, la recette est publiée tout de suite ; sinon elle attend la validation de l'administrateur.

Le site est tolérant : il comprend les virgules françaises (1,5), les accents dans les noms de champs et les unités écrites en toutes lettres. Si le bloc est refusé, la personne te colle le message d'erreur : renvoie le bloc complet corrigé.

## Envoyer directement, avec un jeton

Seulement si tu peux faire des requêtes web (Claude Code, un script, un outil connecté) ET que la personne t'a donné un jeton (une clé qui commence par nc_, créée dans « Mon compte » sur le site) :

- POST ${o}/api/recettes
- En-têtes : Authorization: Bearer LE_JETON et Content-Type: application/json
- Corps : {"texte": "<le bloc JSON de la recette, sous forme de texte>"}
- Réponses : 201 (recette publiée tout de suite, avec son id, son slug et son lien ; pour une variante, aussi "variante_de" avec le slug et le titre de la recette de référence), 200 (recette existante mise à jour, si le champ "id" est présent), 422 (le bloc est refusé : la liste "errors" dit pourquoi, corrige et renvoie ; par exemple « La recette « X » indiquée dans variante_de est introuvable. » : vérifie le slug avec la recherche), 401 (jeton inconnu ou retiré : demande-en un nouveau à la personne), 429 (trop d'envois, réessaie plus tard).
- Une recette par requête : pour plusieurs recettes, fais une requête par recette.
- Le jeton est secret : ne l'affiche pas, ne l'écris jamais dans une recette ni dans une réponse, et ne l'envoie à aucune autre adresse que ${o}.
- Dans une discussion Claude normale, envoie la requête avec l'exécution de code (curl ou Python). Cela ne marche que si la personne a autorisé le domaine ${o.replace(/^https?:\/\//, "")} dans ses Paramètres → Capacités (accès réseau de l'exécution de code). Si la requête échoue avec une erreur réseau ou « bloqué », dis-le-lui et donne-lui le bloc à coller à la place.
- Sans jeton, ne tente pas d'envoyer toi-même : donne le bloc à la personne (voir « Ajouter une recette »).

## Choisir une image

Le champ "image" est facultatif, mais une recette avec sa photo est plus agréable : choisis-la toi-même quand tu peux, sans attendre que la personne t'en donne une.

1. Cherche sur le web une photo libre de droits qui montre vraiment le plat (Wikimedia Commons, Unsplash ou Pexels).
2. Prends l'adresse DIRECTE du fichier image : elle commence par https:// et se termine en général par .jpg, .jpeg, .png ou .webp (sur Wikimedia Commons, c'est l'adresse « upload.wikimedia.org » du fichier, pas celle de la page qui le présente). 500 caractères au maximum.
3. Si tu peux faire des requêtes, vérifie que l'adresse répond bien avec une image avant de l'utiliser.
4. Ne devine jamais une adresse que tu n'as pas vue dans un résultat de recherche : une adresse inventée donne une image cassée sur le site. Si tu n'en trouves pas de sûre, laisse le champ image de côté (le site met alors une illustration à la place).
5. Pour modifier une recette, garde l'image existante sauf si la personne veut en changer.

## Modifier une recette

1. Lis la recette (adresse ci-dessus), ou demande à la personne de te coller son bloc depuis le bouton « Modifier avec Claude » de la page de la recette.
2. Applique les changements demandés, puis renvoie la recette COMPLÈTE dans un seul bloc \`\`\`json, en gardant le champ "id" tel quel : c'est lui qui fait que le site met à jour la recette au lieu d'en créer une nouvelle.
3. Si tu oublies le champ image, la photo existante est conservée.
4. Pour ne changer QUE l'image, sans renvoyer toute la recette (avec un jeton, voir ci-dessus) : PUT ${o}/api/recettes/IDENTIFIANT/image avec le corps {"url": "https://adresse-directe-de-l-image"}. Réponse : 200 avec l'adresse retenue, ou 400 si l'adresse n'est pas une adresse https valide.
5. Pour une variante, garde "variante_de" et "nom_variante" tels quels (si tu les oublies, ils sont conservés). Pour la détacher de son plat et en faire une recette indépendante, mets "variante_de": null. Pour rattacher une recette existante à un plat, mets dans "variante_de" le slug d'une recette de ce plat.

## Proposer une variante

Une variante est une autre façon de faire un plat déjà sur le site (végétarienne, express, sans gluten, la version de quelqu'un d'autre…). Elle s'ajoute à côté de la recette de départ, qui reste intacte : sur le site, les deux apparaissent comme deux versions du même plat. Si la personne veut corriger la recette elle-même, c'est une modification (voir ci-dessus) ; en cas de doute, demande-lui.

1. Lis la recette de départ (adresse ci-dessus), ou demande à la personne de te coller son bloc depuis le bouton « Proposer une variante » de la page de la recette.
2. Écris la variante COMPLÈTE (tous les ingrédients, toutes les étapes), pas seulement ce qui change.
3. Ne mets PAS de champ "id" : la variante est une nouvelle recette.
4. Mets "variante_de" : le slug (ou l'id) de la recette de départ. N'importe quelle version du plat convient : le site retrouve le plat tout seul.
5. Mets "nom_variante" : quelques mots qui disent ce qui change (« Végétarienne », « Express 30 min »), 40 caractères au maximum.
6. Pour l'image, choisis-en une qui montre la variante ; garde celle de la recette de départ seulement si elle convient vraiment, sinon laisse le champ de côté.
7. Envoie-la comme une nouvelle recette (voir « Ajouter une recette »).

Exemple de variante :

\`\`\`json
${EXEMPLE_VARIANTE_JSON}
\`\`\`

## À savoir

- Les quantités se divisent par le nombre de personnes : préfère des g et des ml, et évite les fractions bizarres.
- Pour l'image, voir « Choisir une image » ci-dessus : tu peux la choisir toi-même. La personne peut aussi ajouter une photo depuis la page de modification.
- Une même documentation est disponible sur ${o}/docs, ${o}/readme et ${o}/llms.txt.
`;
}

/**
 * Message prêt à coller dans Claude pour modifier une recette existante.
 * `varianteDeSlug` : pour une variante, le slug de la recette de référence, à garder dans le bloc.
 */
export function buildEditPrompt(row: RecipeRow, varianteDeSlug?: string): string {
  const recette = varianteDeSlug ? { ...row.recipe, variante_de: varianteDeSlug } : row.recipe;
  return `Voici une recette de notre site (identifiant ${row.id}). Modifie-la comme je vais te le demander, puis renvoie la recette COMPLÈTE corrigée dans un seul bloc \`\`\`json, en gardant le champ "id" tel quel.

\`\`\`json
${JSON.stringify(recette, null, 2)}
\`\`\`

Ce que je veux changer :
`;
}

/** Message prêt à coller dans Claude pour proposer une variante d'une recette (une nouvelle recette du même plat). */
export function buildVariantPrompt(row: RecipeRow): string {
  const depart = { ...row.recipe };
  delete depart.id; // sinon Claude le recopie et le site modifierait la recette de départ
  delete depart.nom_variante;
  delete depart.image; // une image par variante : Claude en choisit une qui montre la variante
  return `Voici une recette de notre site. Je veux en faire une variante (une autre façon de faire le même plat, qui s'ajoute à côté sans remplacer l'originale). Renvoie la variante COMPLÈTE dans un seul bloc \`\`\`json, SANS champ "id", avec "variante_de": "${row.slug}" et un "nom_variante" court qui dit ce qui change. Pour le champ "image", choisis une photo qui montre la variante, ou laisse-le de côté.

\`\`\`json
${JSON.stringify(depart, null, 2)}
\`\`\`

Ce que je veux changer :
`;
}
