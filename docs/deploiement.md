# Mise en ligne de « Notre cuisine »

Tout ce qui suit est gratuit et sans carte bancaire. Compte une demi-heure la première fois.

## 1. Créer les tables dans Supabase

Le projet Supabase existe déjà (identifiant `jjmrpmqdomvmqulgywfn`). Il faut y créer les tables, **une seule fois**, de l'une de ces deux façons :

- **Automatique** : si l'intégration GitHub de Supabase est active sur ce dépôt avec le dossier `supabase`, les fichiers de `supabase/migrations/` s'appliquent quand la branche principale (`main`) est mise à jour : `20261018000000_init.sql` (les tables) puis `20261018120000_images.sql` (le dossier de stockage des photos `recipe-images`).
- **À la main** : dans Supabase, ouvre **SQL Editor**, colle le contenu de chaque fichier de `supabase/migrations/` dans l'ordre de leur nom (`…_init.sql` puis `…_images.sql`), puis **Run**.

Vérifie : dans **Table Editor**, tu dois voir 5 tables (`profiles`, `recipes`, `invites`, `devices`, `submissions`) avec la mention « RLS enabled ». Ne fais pas les deux façons : la seconde afficherait « already exists », sans gravité.

Relève ensuite, dans **Project Settings → API** (ou **Data API**) :
- l'adresse du projet : `https://jjmrpmqdomvmqulgywfn.supabase.co` ;
- la clé secrète : **service_role** (ou « Secret key », qui commence par `sb_secret_`). **Garde-la pour toi : elle donne tous les droits.** Elle ne va que dans Vercel et dans ton fichier `.env.production.local`, jamais dans le dépôt GitHub.

## 2. Mettre le site en ligne avec Vercel

1. Dans Vercel : **Add New → Project**, choisis le dépôt `mat37dev/notre-cuisine`. Vercel reconnaît Next.js tout seul.
2. Dans **Settings → General → Node.js Version**, choisis `22.x`.
3. Dans **Settings → Environment Variables**, ajoute (pour Production, Preview et Development) :

| Nom | Valeur |
|---|---|
| `SUPABASE_URL` | l'adresse du projet (voir plus haut) |
| `SUPABASE_SERVICE_ROLE_KEY` | la clé secrète |
| `CRON_SECRET` | un long texte au hasard (au moins 32 caractères) |
| `IP_HASH_SALT` | un autre texte au hasard |
| `SITE_URL` | l'adresse du site, par exemple `https://cuisine.mathieucrosnier.fr` (sans `/` à la fin) |

Si tu as ajouté Supabase depuis la boutique d'intégrations de Vercel, `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont peut-être déjà là : vérifie qu'ils existent avec ces noms exacts.

4. **Deploy** (ou **Redeploy** si le premier déploiement a eu lieu avant les variables).

La tâche planifiée de `vercel.json` appelle `/api/cron/keepalive` chaque lundi à 6 h. Vercel envoie tout seul `Authorization: Bearer <CRON_SECRET>`. Cela évite que Supabase mette le projet en pause après 7 jours sans activité.

## 3. Ton premier lien d'administrateur

Sur ton ordinateur, dans le dossier du projet, crée un fichier **`.env.production.local`** (jamais commité, et jamais lu par `npm run dev` : le site de développement ne touche donc jamais à ta vraie base) :

```
SUPABASE_URL=https://jjmrpmqdomvmqulgywfn.supabase.co
SUPABASE_SERVICE_ROLE_KEY=ta-clé-secrète
SITE_URL=https://cuisine.mathieucrosnier.fr
```

Puis (la commande fonctionne avec Node 20 comme avec Node 22) :

```bash
npm install
npm run invite -- --role admin --name Mathieu --label "Téléphone de Mathieu"
```

Le script affiche un lien valable 7 jours, à usage unique. **Ouvre-le sur ton téléphone** et appuie sur **Reconnaître cet appareil** : l'appareil est reconnu (pour plus d'un an) et le menu « Admin » apparaît. (Le bouton évite qu'un aperçu de messagerie utilise le lien à ta place.) Pour un second appareil (ton PC), va dans **Admin → Inviter un autre appareil**.

Si tu perds ton téléphone, relance la commande ci-dessus : elle crée un nouveau profil administrateur, et tu retires l'ancien appareil depuis l'ancien profil dans la page Admin.

## 4. Installer l'appli sur Android

Ouvre le site dans Chrome, menu ⋮ → **Installer l'application** (ou **Ajouter à l'écran d'accueil**). L'icône « Notre cuisine » apparaît ; elle s'ouvre en plein écran.

## 5. Inviter ta copine

1. Page **Admin → Inviter quelqu'un**, écris son prénom, **Créer le lien d'invitation**.
2. Envoie-lui le lien (le bouton « Copier le lien » ou le QR code). Elle l'ouvre **une fois** sur son téléphone et appuie sur **Reconnaître cet appareil** : son appareil est reconnu, ses recettes seront publiées tout de suite.
3. Elle installe l'appli comme au point 4.
4. Elle ouvre **Instructions pour Claude** (page `/claude`), appuie sur **Copier les instructions**, et les colle au début de sa conversation avec Claude (ou dans les instructions d'un Projet).

Dès qu'elle demande une recette, Claude la termine par un bloc. Elle le copie (ou le partage vers « Notre cuisine »), appuie sur **Envoyer** : c'est en ligne.

## 6. Tester le stockage Supabase (avant d'y mettre de vraies recettes)

Ce test **vide toutes les tables** du projet. À ne lancer qu'une fois, juste après la création des tables, tant qu'il n'y a pas de vraies données :

```bash
SUPABASE_TEST_URL=https://jjmrpmqdomvmqulgywfn.supabase.co SUPABASE_TEST_KEY=ta-clé-secrète SUPABASE_TEST_WIPE=oui npx vitest run src/lib/store
```

Résultat attendu : tous les tests « Store (mémoire) » **et** « Store (Supabase) » passent. Pense à effacer la clé de l'historique de ton terminal.

## 7. Vérifications sur de vrais appareils

À cocher une fois en ligne, en notant le résultat. Certaines choses dépendent d'Android et de Claude et n'ont pas pu être testées avant.

- [ ] **Installation** : sur Chrome Android, un bouton « Installer l'appli » apparaît en haut du site (et dans Mon compte, et Admin) ; il ouvre la fenêtre d'installation. Sinon, menu ⋮ → Installer l'application. Résultat : …
- [ ] **Partage depuis Claude** : dans l'appli Claude Android, appuie longuement sur une réponse contenant une recette → Partager → « Notre cuisine ». Le texte arrive-t-il dans la page Ajouter ? Sinon, seul le bouton « Coller depuis le presse-papiers » fonctionne (et c'est suffisant). Résultat : …
- [ ] **Chrono du téléphone** : sur une recette avec un chrono, le lien « Horloge du téléphone » lance-t-il un minuteur dans l'appli Horloge ? Sinon, le chrono de la page reste utilisable ; dis-le-moi et je retire le lien. Résultat : …
- [ ] **Appareil reconnu** : l'appareil de ta copine est toujours reconnu une semaine plus tard (le menu affiche son prénom dans la barre du haut). Résultat : …
- [ ] **Claude gratuit avec les instructions** : une recette demandée finit-elle par un bloc au bon format ? Peut-il retrouver une recette si on lui donne l'adresse `…/api/recettes` ? Résultat : …
- [ ] **Visiteur** : dans une fenêtre privée, envoyer une recette → « en attente » ; elle n'apparaît pas sur la liste publique, mais dans Admin pour toi.
- [ ] **Hors ligne** : ouvre une recette, coupe le réseau, rouvre-la : elle s'affiche encore.
- [ ] **Sauvegarde** : Admin → Exporter les recettes télécharge un fichier JSON.
- [ ] **Photo** : sur une recette, « Modifier ici » → « Choisir une photo » : la photo s'affiche sur la recette et sur la liste. Si le site répond que le stockage n'est pas prêt, la migration `…_images.sql` n'a pas été appliquée (point 1).
- [ ] **Mon compte** : ton prénom en haut → « Ajouter un appareil » crée un lien pour ton ordinateur ou ta tablette ; ouvre-le sur l'autre appareil. Chaque personne peut aussi retirer ses propres appareils.
- [ ] **Jeton pour Claude** : dans Mon compte, « Créer un jeton pour Claude », copie les consignes dans une discussion Claude qui peut faire des requêtes (Claude Code par exemple) et demande-lui d'envoyer une recette : elle doit être publiée tout de suite. Retire ensuite le jeton : un nouvel envoi doit répondre 401. Résultat : …
- [ ] **robots.txt** : `/robots.txt` autorise le site (sauf `/admin` et `/invite/`) ; Claude peut ouvrir `/docs`. Résultat : …
- [ ] **Documentation pour Claude** : donne l'adresse `…/docs` à un Claude sans rien d'autre : peut-il chercher et lire une recette, et te rendre un bloc au bon format ?

## En cas de problème

- **« Supabase n'est pas configuré »** : une variable manque dans Vercel (voir le point 2), puis Redeploy.
- **Le site s'ouvre mais aucune recette ne s'enregistre** : les tables n'ont pas été créées (point 1).
- **Le lien d'invitation affiche « Invitation introuvable / expirée / déjà utilisée »** : crée-en un nouveau (Admin → Inviter). Chaque lien ne sert qu'une fois, pendant 7 jours.
- **Une recette envoyée par Claude est refusée** : le message d'erreur dit pourquoi, et le bouton « Copier un message pour Claude » lui demande de corriger.
