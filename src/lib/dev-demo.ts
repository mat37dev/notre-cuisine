import type { Recipe } from "./recipe/types";

// Fausse « photo » (une illustration), pour voir à quoi ressemble une recette avec image.
const PHOTO_DEMO =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 625"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#fde68a"/><stop offset="1" stop-color="#f59e0b"/></linearGradient></defs>' +
      '<rect width="1000" height="625" fill="url(#g)"/><circle cx="500" cy="330" r="230" fill="#fffbeb"/>' +
      '<path d="M270 330a230 230 0 0 1 460 0z" fill="#fde047"/><path d="M270 330a230 230 0 0 1 460 0z" fill="none" stroke="#fffbeb" stroke-width="16"/>' +
      '<path d="M300 300q40-40 80 0t80 0 80 0 80 0 80 0" fill="none" stroke="#fff" stroke-width="22" stroke-linecap="round"/></svg>',
  );

/** Recettes d'exemple de la base de développement (jamais utilisées en production). */
export const RECETTES_DEMO: Recipe[] = [
  {
    titre: "Tarte au citron meringuée",
    description: "Acidulée et fondante, avec une meringue dorée.",
    image: PHOTO_DEMO,
    portions: 6,
    categorie: "dessert",
    tags: ["famille"],
    ingredients: [
      { id: "pate", nom: "pâte sablée", quantite: 1, unite: "piece" },
      { id: "citrons", nom: "citrons", quantite: 4, unite: "piece" },
      { id: "sucre", nom: "sucre", quantite: 150, unite: "g" },
      { id: "oeufs", nom: "œufs", quantite: 3, unite: "piece" },
      { id: "beurre", nom: "beurre", quantite: 60, unite: "g" },
    ],
    etapes: [
      { titre: "Cuire la pâte", texte: "Cuire la pâte à blanc.", chrono_secondes: 900 },
      { titre: "Préparer la crème", texte: "Faire chauffer le jus des citrons avec {{sucre}} de sucre et {{beurre}} de beurre." },
      { titre: "Dorer", texte: "Passer la tarte 5 minutes au four.", chrono_secondes: 300 },
    ],
    notes: "Elle est encore meilleure le lendemain.",
  },
  {
    titre: "Hachis parmentier",
    description: "Le plat qui fait plusieurs repas.",
    portions: 4,
    categorie: "plat",
    tags: ["réconfortant"],
    ingredients: [
      { id: "boeuf", nom: "bœuf haché", quantite: 500, unite: "g" },
      { id: "pdt", nom: "pommes de terre", quantite: 1, unite: "kg" },
      { id: "oignon", nom: "oignons", quantite: 2, unite: "piece" },
      { id: "lait", nom: "lait", quantite: 150, unite: "ml" },
      { id: "sel", nom: "sel et poivre" },
    ] as Recipe["ingredients"],
    etapes: [
      { titre: "Cuire les pommes de terre", texte: "Cuire {{pdt}} de pommes de terre à l'eau.", chrono_secondes: 1200 },
      { titre: "La viande", texte: "Faire revenir les oignons puis {{boeuf}} de bœuf." },
      { titre: "Gratiner", texte: "Monter le plat et gratiner au four.", chrono_secondes: 1500 },
    ],
  },
  {
    titre: "Cookies pâte crue",
    description: "Protéinés, à manger à la cuillère.",
    portions: 3,
    categorie: "gouter",
    tags: [],
    ingredients: [
      { id: "cacahuete", nom: "beurre de cacahuète", quantite: 100, unite: "g" },
      { id: "flocons", nom: "flocons d'avoine", quantite: 60, unite: "g" },
      { id: "miel", nom: "miel", quantite: 2, unite: "cas" },
    ],
    etapes: [{ titre: "Mélanger", texte: "Mélanger {{cacahuete}} de beurre de cacahuète, {{flocons}} de flocons et {{miel}} de miel." }],
    notes: "Se garde 5 jours au frais.",
  },
  {
    titre: "Vinaigrette à la moutarde",
    portions: 4,
    categorie: "sauce",
    tags: [],
    ingredients: [
      { id: "moutarde", nom: "moutarde", quantite: 1, unite: "cas" },
      { id: "vinaigre", nom: "vinaigre", quantite: 30, unite: "ml" },
      { id: "huile", nom: "huile d'olive", quantite: 90, unite: "ml" },
    ],
    etapes: [{ texte: "Fouetter {{moutarde}} de moutarde avec {{vinaigre}} de vinaigre, puis ajouter {{huile}} d'huile en filet." }],
  },
  {
    titre: "Velouté de courge",
    description: "Une entrée douce pour les soirées fraîches.",
    portions: 4,
    categorie: "entree",
    tags: ["végétarien"],
    ingredients: [
      { id: "courge", nom: "courge butternut", quantite: 800, unite: "g" },
      { id: "creme", nom: "crème", quantite: 100, unite: "ml" },
    ],
    etapes: [
      { titre: "Cuire", texte: "Cuire {{courge}} de courge en morceaux.", chrono_secondes: 1500 },
      { titre: "Mixer", texte: "Mixer avec {{creme}} de crème." },
    ],
  },
];
