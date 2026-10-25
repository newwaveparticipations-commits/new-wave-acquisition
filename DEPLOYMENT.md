# Mise en ligne

Deux modes partagent les mêmes règles et la même présentation : serveur Node 24 avec SQLite persistant, ou Worker avec base D1 persistante. Le dépôt public ne contient aucune configuration réelle, donnée ou clé.

## Worker / D1

Le fichier `wrangler.jsonc` fournit le modèle pour Cloudflare Free. Créer la base, remplacer son identifiant, appliquer les migrations puis déployer. Ne pas activer de forfait payant ni de dépassement facturé.

Secrets : `SITE_CONFIG` (JSON reprenant config.example.json complété), `ADMIN_TOKEN` et `FORM_SECRET` (valeurs aléatoires d'au moins 32 caractères). Paramètres : `PUBLIC_ORIGIN`, `PUBLIC_READY`, `INVESTORS_ENABLED`. Ajouter `EMAIL_API_KEY`, `EMAIL_FROM`, `NOTIFY_EMAIL` uniquement lors du branchement du prestataire gratuit. Ne pas réutiliser de clé LLM payante.

Les demandes sont persistées avant toute notification. Les messages sont envoyés après la demande, hors du temps de réponse ; le cron Cloudflare ou l'action privée de reprise permet de réessayer. Le déploiement Sites utilise la même base D1 ; aucun compte Cloudflare séparé n'est nécessaire. Son hébergement n'active pas automatiquement le cron du modèle Wrangler.

L'envoi Worker est limité volontairement à 90 tentatives/jour et 2 900/mois, et à cinq messages par passage. Les messages au-delà restent en file. Le quota effectif du prestataire peut être consommé par d'autres usages du compte : réserver celui-ci au site et contrôler son tableau de bord. Un code 429 laisse les messages en attente. Aucun dépassement payant n'est activé par le code. Les messages de prospection non sollicitée ne doivent pas passer par Resend.

Le jeton anti-spam est signé avec une clé stable ; la limitation par adresse est persistante et utilise l'adresse fournie par Cloudflare. Les adresses sont hachées et expirent après une heure. Le suivi et les API restent protégés par Bearer ; jamais de clé en URL.

## Recette avant ouverture

Vérifier configuration complète, HTTPS/origine canonique, pages publiques, liens et mobile. Soumettre une demande de test autorisée, vérifier le suivi, réception réelle et réponse. Contrôler la persistance après redéploiement, export et restauration. Le statut interne `sent` indique l'acceptation par le prestataire, pas la lecture ni la réception finale.

Le simulateur sans règles approuvées propose un diagnostic et un échange. L'ouverture Investisseurs reste un réglage distinct. Aucun changement du calcul ou du périmètre de prospection n'est nécessaire pour publier la première version.
