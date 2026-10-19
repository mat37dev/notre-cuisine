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

const sansBarreFinale = (origin: string) => origin.replace(/\/+$/, "");
const EXEMPLE_JSON = JSON.stringify(EXEMPLE_RECETTE, null, 2);

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
- image : l'adresse https d'une image, seulement si je t'en donne une (facultatif, n'en invente jamais). Je pourrai aussi ajouter une photo directement sur le site.

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
2. Préparer une nouvelle recette ou la modification d'une recette : tu la donnes dans un bloc de code \`\`\`json que la personne copie, ou partage, vers l'appli « Notre cuisine ».
3. Tu ne peux pas écrire sur le site toi-même : ne dis jamais « c'est enregistré ». La personne envoie le bloc depuis son téléphone.

## Lire le site

- Chercher : GET ${o}/api/recettes?q=MOT&categorie=CATEGORIE
  Les deux paramètres sont facultatifs. Sans q, toutes les recettes publiées sont listées. La recherche ignore les accents et regarde le titre, les ingrédients et les mots-clés.
  Réponse : une liste JSON d'objets avec id, slug, titre, description, categorie, image.
- Lire une recette : GET ${o}/api/recettes/IDENTIFIANT (l'id ou le slug)
  Réponse : la recette complète au format ci-dessous, avec en plus slug et lien (adresse de la page).
- Les recettes en attente de validation n'apparaissent pas.

Quand la personne demande une recette du site : cherche, lis la bonne recette, puis présente-la avec ton affichage habituel de recette : curseur du nombre de personnes (les quantités sont écrites pour "portions" personnes), ingrédients, étapes, et un chrono pour chaque étape qui a chrono_secondes. Dans le texte d'une étape, {{id}} désigne la quantité de l'ingrédient qui a cet id : remplace-le par la quantité pour le nombre de personnes choisi.

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
- Réponses : 201 (recette publiée tout de suite, avec son id, son slug et son lien), 200 (recette existante mise à jour, si le champ "id" est présent), 422 (le bloc est refusé : la liste "errors" dit pourquoi, corrige et renvoie), 401 (jeton inconnu ou retiré : demande-en un nouveau à la personne), 429 (trop d'envois, réessaie plus tard).
- Une recette par requête : pour plusieurs recettes, fais une requête par recette.
- Le jeton est secret : ne l'affiche pas, ne l'écris jamais dans une recette ni dans une réponse, et ne l'envoie à aucune autre adresse que ${o}.
- Dans une discussion Claude normale, envoie la requête avec l'exécution de code (curl ou Python). Cela ne marche que si la personne a autorisé le domaine ${o.replace(/^https?:\/\//, "")} dans ses Paramètres → Capacités (accès réseau de l'exécution de code). Si la requête échoue avec une erreur réseau ou « bloqué », dis-le-lui et donne-lui le bloc à coller à la place.
- Sans jeton, ne tente pas d'envoyer toi-même : donne le bloc à la personne (voir « Ajouter une recette »).

## Modifier une recette

1. Lis la recette (adresse ci-dessus), ou demande à la personne de te coller son bloc depuis le bouton « Modifier avec Claude » de la page de la recette.
2. Applique les changements demandés, puis renvoie la recette COMPLÈTE dans un seul bloc \`\`\`json, en gardant le champ "id" tel quel : c'est lui qui fait que le site met à jour la recette au lieu d'en créer une nouvelle.
3. Si tu oublies le champ image, la photo existante est conservée.
4. Pour ne changer QUE l'image, sans renvoyer toute la recette (avec un jeton, voir ci-dessus) : PUT ${o}/api/recettes/IDENTIFIANT/image avec le corps {"url": "https://adresse-directe-de-l-image"}. Réponse : 200 avec l'adresse retenue, ou 400 si l'adresse n'est pas une adresse https valide.

## À savoir

- Les quantités se divisent par le nombre de personnes : préfère des g et des ml, et évite les fractions bizarres.
- N'invente jamais l'adresse d'une image : mets le champ image seulement si la personne t'en a donné une. Elle peut aussi ajouter une photo depuis la page de modification.
- Une même documentation est disponible sur ${o}/docs, ${o}/readme et ${o}/llms.txt.
`;
}

/** Message prêt à coller dans Claude pour modifier une recette existante. */
export function buildEditPrompt(row: RecipeRow): string {
  return `Voici une recette de notre site (identifiant ${row.id}). Modifie-la comme je vais te le demander, puis renvoie la recette COMPLÈTE corrigée dans un seul bloc \`\`\`json, en gardant le champ "id" tel quel.

\`\`\`json
${JSON.stringify(row.recipe, null, 2)}
\`\`\`

Ce que je veux changer :
`;
}
