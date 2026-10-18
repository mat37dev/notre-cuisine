# Notre cuisine — conception

Date : 2026-10-18. Statut : **à valider par Mathieu avant tout développement.**

Légende : **[Décidé]** = dit par Mathieu. **[Mon choix]** = choix de Claude, que Mathieu peut changer. **[À tester]** = je ne suis pas sûr que ça marche, donc je prévois une alternative.

## 1. Pourquoi

Mathieu se fait des recettes dans une conversation Claude (claude.ai) qui contient aujourd'hui une dizaine de recettes mélangées à des questions, des corrections et des idées. Il a peur de les perdre. Il veut tout avoir au même endroit, en commun avec sa copine, qui pourra aussi en ajouter. Elle ne connaît rien au code, n'a pas d'abonnement Claude, et passera donc uniquement par une conversation Claude gratuite.

Réussite : sa copine ajoute une recette en quelques appuis sur son téléphone, sans rien taper ni configurer. Mathieu retrouve toutes les recettes sur téléphone ou PC et cuisine directement dedans.

## 2. Objectifs

1. Bibliothèque commune de recettes, lisible sur téléphone et PC, installable comme une appli sur Android (PWA).
2. Affichage de recette dans l'esprit du widget de recette de Claude : curseur de portions avec quantités recalculées, étapes, chronos, notes.
3. Ajout facile depuis un chat Claude : Claude fournit la recette dans un format fixe, un copier ou un partage envoie le tout au site.
4. Modification facile depuis un chat Claude, en plus d'un éditeur simple dans le site.
5. Claude peut chercher et récupérer une recette du site (adresses qui renvoient du JSON, plus une page de documentation pensée pour Claude).
6. Petit système de rôles : admin, membre reconnue, visiteur.
7. Tout est gratuit : aucun abonnement, aucune carte bancaire.

## 3. Hors périmètre (version 1)

- Photos des plats, liste de courses, favoris, commentaires, notes : à envisager plus tard.
- Application native, Google Play, iPhone (une PWA suffit, Android uniquement).
- Appel d'une API Claude payante, par exemple pour analyser du texte libre.
- Interface en autre langue que le français.

## 4. Ce qui ferait échouer le projet, même si tout fonctionne

- Sa copine doit modifier du code, un réglage technique ou comprendre du JSON.
- Les quantités redeviennent illisibles (« 14 3/4 ml »), ce que Mathieu a déjà reproché au widget.
- Une recette est perdue parce que la base gratuite s'est endormie ou que rien n'a été sauvegardé.
- N'importe qui peut remplir le site de recettes ou de spam.

## 5. Parcours

### 5.1 Ajouter une recette (le parcours principal)
1. Sa copine demande une recette à Claude. Ses instructions (voir 7.1) font que chaque recette finale se termine par un bloc de code prêt à copier.
2. Elle copie le bloc, ou le partage vers l'appli « Notre cuisine » depuis le menu Partager d'Android.
3. L'appli s'ouvre sur une page « Ajouter » avec la recette déjà lue et un aperçu. Elle appuie sur « Envoyer ».
4. Sa recette est **publiée tout de suite** s'il s'agit d'un appareil reconnu de membre. Sinon (visiteur) elle est **en attente** de validation par Mathieu. **[Décidé]**

La page « Ajouter » accepte aussi du texte collé qui contient le bloc au milieu d'autres phrases (Claude en écrit souvent autour). Elle extrait le JSON toute seule et affiche des erreurs en français si le format est faux, avec un bouton « Copier un message à renvoyer à Claude pour qu'il corrige ».

Partage Android : fonctionne pour une PWA installée, en HTTPS. **[À tester]** : je ne sais pas ce que l'appli Claude Android partage exactement (texte du message ou rien). Alternative prévue : un gros bouton « Coller depuis le presse-papiers ».

### 5.2 Modifier une recette
- Sur chaque recette, un bouton « Modifier avec Claude » copie un message prêt à coller dans Claude (instructions + recette actuelle). Claude renvoie un bloc qui contient l'identifiant de la recette. L'import propose alors « Mettre à jour » à la place de « Nouvelle recette ».
- Un éditeur de formulaire simple dans le site pour les petites corrections.
- Les membres modifient leurs propres recettes. L'admin modifie tout. **[Mon choix]**

### 5.3 Lire et cuisiner
- Liste avec recherche (titre et ingrédients) et catégories (salade, plat, dessert…).
- Page recette : titre, description, curseur de portions, ingrédients, étapes avec chronos, notes. Mode « cuisine » avec gros texte et écran qui reste allumé.
- **Quantités lisibles** **[Décidé]** : jamais de fraction étrange. Règles à définir par le développeur, par exemple : g et ml arrondis à 5 (ou à 1 en dessous de 10), cuillères au quart, pièces au demi avec ½ ¼ ¾, et affichage « 1 poivron » plutôt que 0,73. Quand c'est indivisible, on arrondit avec une note discrète.
- Chrono : un chrono dans la page (démarrer, pause, alarme sonore et vibration, plusieurs en même temps) **[Décidé]**. Mathieu voulait qu'il déclenche le chrono du téléphone. **[À tester]** : sur Android, Chrome sait ouvrir l'appli Horloge avec un lien de type `intent:` (action `SET_TIMER`), ce qui est mieux que mon affirmation précédente. Je prévois un bouton « Lancer dans l'horloge du téléphone » à essayer, avec le chrono de la page en secours.

### 5.4 Valider
Pour l'admin : une file des recettes en attente (accepter, modifier, refuser), la gestion des invitations et des appareils, un bouton d'export de toutes les recettes en JSON (sauvegarde).

## 6. Rôles et appareils reconnus

| Rôle | Qui | Peut |
|---|---|---|
| Admin | Mathieu | Tout : valider, modifier, supprimer, inviter, exporter |
| Membre | Sa copine | Publier directement, modifier ses recettes |
| Visiteur | Tout inconnu | Lire, envoyer une recette (en attente, invisible tant que non validée) |

- **Appareil reconnu [Décidé]** : l'admin génère un lien d'invitation (ou QR code). Ouvert une fois sur un appareil, il le lie au compte de la personne pour des mois, sans mot de passe. Chaque appareil a besoin de sa propre invitation (téléphone, PC). L'admin voit les appareils et peut en retirer un.
- Connexion de l'admin : e-mail + mot de passe ou lien magique, au choix du développeur.
- **Lecture publique [Mon choix]** : les recettes publiées sont lisibles sans connexion, car Claude doit pouvoir les récupérer. Le site demande aux moteurs de recherche de ne pas l'indexer. **Mathieu : dis-moi si tu préfères tout protéger.**
- **Anti-spam** : l'envoi par un visiteur est limité en fréquence et en taille, et les recettes en attente ne sont visibles que par l'admin.
- **Reconnaître Claude [Décidé : pas possible tel quel]** : un site ne peut pas savoir que la demande vient de Claude. Option plus tard **[À tester]** : une clé personnelle dans les instructions de Claude pour envoyer directement une recette par URL, si son Claude gratuit sait le faire. Ne fait pas partie de la version 1 : le parcours 5.1 suffit.

## 7. Claude et le site

### 7.1 Page de documentation pour Claude
Une page `/claude` (lisible par un humain, avec un bouton « Copier les instructions ») et la même chose en texte brut. Elle contient :
- Les **instructions à coller une fois** dans Claude (par exemple dans un Projet ou les préférences) : « Quand une recette est finalisée, termine par un bloc de code au format suivant. Garde les quantités rondes. Ne mets que la recette dans le bloc. »
- Le format du bloc, avec un exemple complet.
- Comment lire le site : les adresses ci-dessous et la consigne de présenter ensuite la recette comme Claude le fait d'habitude.

### 7.2 Format d'une recette (JSON)
Même contenu que le widget de recette de Claude, plus quelques champs :
- `titre`, `description`
- `portions` (nombre de personnes pour lequel les quantités sont écrites)
- `categorie` (parmi une liste courte), `tags` (facultatif)
- `ingredients` : liste de `{ id, nom, quantite, unite }`. Unités : g, kg, ml, l, cuillère à soupe, cuillère à café, pincée, pièce, ou aucune.
- `etapes` : liste de `{ titre, texte, chrono_secondes (facultatif) }`. Le texte peut citer un ingrédient par son `id` pour afficher sa quantité recalculée (syntaxe à choisir par le développeur ; une référence inconnue s'affiche en texte simple).
- `notes` (facultatif)
- `id` (seulement pour une mise à jour)

Le format doit être **tolérant** (accents, majuscules, nombres écrits « 1,5 »), car Claude se trompe parfois. En cas de doute, le site corrige ou demande, mais ne refuse pas sans expliquer.

### 7.3 Adresses lisibles par Claude (sans connexion)
- `GET /api/recettes?q=…&categorie=…` : liste (identifiant, titre, description, catégorie).
- `GET /api/recettes/{identifiant}` : la recette complète au format 7.2.
- Seules les recettes publiées sont renvoyées.

## 8. Contraintes et choix techniques

Tout est **[Mon choix]**, à confirmer par Mathieu :
- Hébergement : Vercel (offre gratuite).
- Base de données, comptes et sécurité des droits : Supabase (offre gratuite, sans carte). Le projet gratuit se met en pause après 7 jours sans activité : une tâche planifiée gratuite sur Vercel l'appelle chaque semaine pour l'éviter. Ce n'est donc pas une base « locale » mais une base en ligne gratuite.
- Site : Next.js en français, pensé pour le téléphone d'abord, avec un thème clair et sombre.
- PWA : fichier manifeste, installation sur l'écran d'accueil, cible de partage Android. Le mode hors ligne (lire une recette déjà ouverte sans réseau) est un plus souhaitable.
- Sauvegarde : bouton d'export JSON pour l'admin (et le développeur propose une sauvegarde automatique si c'est gratuit et simple).

## 9. À la charge du développeur

Le choix de la bibliothèque d'interface, les règles d'arrondi précises, la syntaxe des références d'ingrédient dans les étapes, le mécanisme exact des invitations, les messages d'erreur, le design visuel (proche du widget de Claude, mais le plus agréable possible sur téléphone).

## 10. Après la version 1

Import des recettes de la conversation actuelle (à la main, au même format). Essai de la clé personnelle pour l'envoi direct par Claude. Photos, liste de courses.
