# New Wave Acquisition

Site de transmission d’entreprises, qualification des demandes et préparation d’un vivier d’investisseurs. Le projet reprend une direction visuelle existante : fond clair, graphite, jaune et échafaudage animé. Le code ne contient aucun dossier de cible ni historique privé.

## Démarrer

Node.js 24 ou ultérieur. Aucun paquet tiers n’est nécessaire pour exécuter le site.

```sh
cp config.example.json config.local.json
cp .env.example .env
npm start
```

Ouvrir `http://127.0.0.1:4321`. Pour le suivi privé : `/suivi`. Renseigner `ADMIN_TOKEN` dans `.env` avec une valeur aléatoire d’au moins 32 caractères. Par exemple, générer la valeur localement avec `node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))"`. Ne jamais publier ce fichier, ni coller cette clé dans le site public.

## Ce qui fonctionne

- Pages adressables, navigation navigateur, contenu rendu côté serveur et 404 réelle.
- Parcours cédant en quatre étapes et formulaire prescripteur.
- Diagnostic en dix questions, score et chantiers débloqués après enregistrement du contact. Ses réponses restent dans le navigateur sauf accord distinct.
- Simulateur avec calcul local, coût chargé du dirigeant remplaçant, multiples par métier et trésorerie exclusivement excédentaire. Il reste indisponible jusqu’à réception de règles validées, sans résultat fictif. La fiscalité personnelle n’est pas calculée.
- Parcours investisseurs avec activation séparée : premier échange, profil déclaré, ticket envisagé (ou à préciser), coordonnées et message facultatif. Il ne recueille aucun patrimoine, versement ou souscription. Aucun statut réglementaire ne se déduit du profil déclaré.
- Stockage SQLite persistant, historique, dédoublonnage, oppositions, suivi du responsable et de la prochaine action, export CSV privé.
- Registre de prospects sourcés séparé des demandes entrantes. Aucun intérêt n’est déduit du seul repérage d’une personne.
- File de notifications internes et d’accusés de réception, réessais et identifiants de livraison stables. Aucun e-mail n’est envoyé tant que le prestataire n’est pas configuré.
- Polices auto-hébergées avec licences ; aucun appel à Google Fonts, pixel ou cookie publicitaire.

## Configuration de publication

`config.local.json` : identité réelle de l’éditeur, responsable de publication, siège, immatriculation, hébergeur, contact données personnelles, coordonnées publiques et critères de recherche. Les coordonnées ne sont jamais devinées.

`.env` :

| Variable | Rôle |
|---|---|
| `HOST`, `PORT` | Écoute du serveur ; `HOST=0.0.0.0` derrière l’hébergeur |
| `PUBLIC_ORIGIN` | Adresse publique exacte en HTTPS ; contrôle de l’origine des formulaires |
| `DATA_DIR` | Dossier persistant de la base SQLite, protégé et sauvegardé |
| `ADMIN_TOKEN` | Accès privé, transmis uniquement par en-tête Bearer |
| `PUBLIC_READY` | `false` par défaut ; rend le site non indexable pendant la préparation |
| `INVESTORS_ENABLED` | `false` par défaut ; active le parcours de premier échange investisseurs |
| `EMAIL_API_KEY` | Clé d’un prestataire d’envoi compatible avec l’API Resend |
| `EMAIL_FROM` | Expéditeur vérifié chez ce prestataire ; une adresse Gmail ne peut pas être usurpée |
| `NOTIFY_EMAIL` | Destinataire des notifications internes |
| `EMAIL_API_URL` | Endpoint du prestataire, facultatif |
| `CONFIG_FILE` | Chemin d’une configuration injectée de façon privée |

La réception en base reste indépendante de l’envoi d’e-mail. Les notifications partent depuis la file au plus toutes les 60 secondes, avec trois tentatives au maximum ; l’API privée permet un nouvel essai. Un échec de notification ne transforme pas une demande enregistrée en demande perdue. La confirmation à l’écran annonce l’enregistrement, jamais une réception d’e-mail non vérifiée.

Le contrôle anti-abus est volontairement simple : jeton signé, délai minimal, champ piège et cinq demandes par heure par adresse réseau. Ne pas faire confiance à des en-têtes proxy arbitraires. Derrière un reverse proxy, adapter la résolution de l’adresse uniquement à un proxy authentifié ; sans cela plusieurs visiteurs peuvent partager le même quota.

`PUBLIC_READY=true` refuse le démarrage si l’identité et les critères requis manquent ou si l’origine n’est pas HTTPS. Ce contrôle technique ne constitue pas une validation juridique. `noindex` ne protège pas une prévisualisation privée : utiliser l’accès privé de l’hébergeur si une telle protection est nécessaire.

## Estimation

Dans `valuation` :

- `approved: true` et `approvedAt` : validation explicite et date réelle ;
- `replacementCostLoaded` : coût annuel chargé du remplacement ;
- `multiples` : table par métier de paires `[borneBasse, borneHaute]` validées ;
- `cashPolicy: "excess-only"` : seule la trésorerie excédentaire est utilisée.

Le site ne propose pas de reconstitution approximative de l’EBE à partir du résultat net. Si l’EBE ou l’EBE retraité est négatif ou nul, le résultat est « À discuter ». Aucun barème de fiscalité ni avantage fiscal n’est inventé.

## Hébergement gratuit avec base persistante

Le mode Worker/D1 partage les règles et le rendu du serveur local. Voir [DEPLOYMENT.md](DEPLOYMENT.md). Les accès et clés de déploiement restent privés ; aucun abonnement supplémentaire ni API LLM payante ne sont nécessaires au fonctionnement des formulaires.

## Déployer / reprise par NanoCorp

Voir [NANOCORP.md](NANOCORP.md). Lancement : `npm start`. Le Dockerfile fournit aussi un serveur Node 24 avec volume `/data` ; il n’a pas été exécuté lors de la recette locale. Un disque persistant et des sauvegardes sont indispensables. Un hébergement de fichiers statiques seul ne suffit pas.

L’import depuis un dépôt GitHub est annoncé par NanoCorp : https://www.nanocorp.so/whats-new/v3-0-5. La compatibilité de son environnement avec Node 24 et un volume SQLite persistant doit être vérifiée au moment de l’import. Si NanoCorp impose sa propre base, adapter la couche `lib/store.mjs` et rejouer les tests avant de collecter des données. La reprise effective par NanoCorp n’est pas prouvée par la seule présence du dépôt.

## Tests et livraison

```sh
npm run check
npm test
npm run export:public -- /chemin/vers/un-nouveau-dossier
```

L’export utilise une liste de fichiers autorisés, refuse les liens symboliques et contrôle des marqueurs de données privées et de secrets. Il exclut `.env`, `config.local.json`, `var/`, les captures, les dossiers externes et tout historique Git. Compléter ce contrôle par une revue humaine avant publication. Initialiser un dépôt neuf uniquement dans la copie nettoyée.

Les tests navigateur optionnels nécessitent Playwright et Chromium déjà disponibles : `npm run test:browser`. Les variables `PLAYWRIGHT_MODULE` et `CHROME_PATH` permettent de réutiliser un runtime existant, sans installer de dépendance dans le projet.

La recette navigateur doit couvrir mobile et ordinateur, demande cédant, diagnostic avec et sans partage, investisseur activé en environnement de test, simulateur avec règles fictives exclusivement en test, panne réseau, accès privé et liens internes.

## Exploitation

- Ne pas exposer la base, les exports, les clés ni les sauvegardes.
- Sauvegarder le volume avant une migration ou une reprise de l’hébergement et tester la restauration.
- Examiner et supprimer les données arrivées au terme de leur durée de conservation ; aucune purge automatique n’est annoncée ni activée dans cette version.
- La suspension interne bloque les nouvelles demandes et l’ajout de prospects, et suspend les notifications. Elle ne commande pas directement un agent NanoCorp externe : son arrêt doit être raccordé et testé séparément.
- La prospection et ses autorisations sont configurées dans NanoCorp. Ce dépôt ne lance aucune campagne, publicité ni achat.
