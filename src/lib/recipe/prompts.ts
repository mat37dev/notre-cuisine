import type { RecipeRow } from "../store/types";
import { CATEGORIES, type Recipe } from "./types";

/** Exemple complet : il sert de modèle dans les instructions données à Claude. */
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

const ORIGINE = (origin: string) => origin.replace(/\/+$/, "");

/** Texte à coller une fois dans Claude : format de recette et façon de lire le site. */
export function instructionsClaude(origin: string): string {
  const o = ORIGINE(origin);
  return `Instructions pour notre carnet de cuisine (à garder pendant toute la conversation).

1. Quand une recette est finalisée
Quand je te dis qu'une recette est bonne, ou que je te demande « la version finale », termine ton message par UN SEUL bloc de code \`\`\`json qui contient la recette au format ci-dessous. Ne mets rien d'autre dans ce bloc : je le copierai pour l'envoyer sur notre site.

Format :
- titre : le nom de la recette.
- description : une phrase (facultatif).
- portions : le nombre de personnes pour lequel les quantités sont écrites (4 par défaut).
- categorie : une seule parmi ${CATEGORIES.join(", ")}.
- tags : quelques mots-clés (facultatif).
- ingredients : une liste d'objets avec id, nom, quantite, unite. L'id est un mot court sans espace (ex. "tomates"). L'unite est g, kg, ml, l, cas (cuillère à soupe), cac (cuillère à café), pincee, piece, ou "" (rien : « 3 oignons »). La quantite est un nombre (ex. 1.5), ou absente si c'est « au goût ».
- etapes : une liste d'objets avec titre, texte, chrono_secondes. Mets chrono_secondes seulement s'il y a un temps à chronométrer (cuisson, repos), en secondes.
- notes : astuces (facultatif).

Règles :
- Des quantités rondes et faciles à diviser, de préférence en g et en ml.
- Dans le texte d'une étape, écris {{id}} à la place de la quantité d'un ingrédient : le site la recalcule quand on change le nombre de personnes. Exemple : « Faire dorer {{pignons}} de pignons de pin. » s'affichera « Faire dorer 40 g de pignons de pin. ».

Exemple :
\`\`\`json
${JSON.stringify(EXEMPLE_RECETTE, null, 2)}
\`\`\`

2. Quand je te demande une recette de notre site
- Pour chercher, ouvre ${o}/api/recettes?q=MOT (par exemple q=burrata ; sans q, tout est listé). Tu reçois la liste en JSON.
- Pour une recette complète, ouvre ${o}/api/recettes/IDENTIFIANT (l'id ou le slug donné dans la liste).
Présente-la ensuite comme d'habitude, avec le choix du nombre de personnes et les chronos.

3. Quand je veux modifier une recette
Je te colle son bloc json. Renvoie la recette COMPLÈTE corrigée dans un seul bloc, en gardant le champ "id" tel quel.
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
