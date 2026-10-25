# Reprise de New Wave Acquisition par NanoCorp

## Mission

Expérimenter la recherche de cédants et d’investisseurs pour des reprises d’entreprises, en exploitant ce site et ses outils. Développer les relations avec les prescripteurs. Maintenir le site et le suivi des contacts. Les décisions d’acquisition et les engagements de financement restent pris par les opérateurs.

## Reprendre le code

1. Importer le dépôt GitHub public nettoyé ; lire le README, sans remplacer l’identité visuelle ni recréer une autre maquette.
2. Vérifier Node 24, le processus serveur et la persistance du volume SQLite. Si l’environnement ne les supporte pas, préparer une adaptation de stockage et la faire tester avant toute donnée réelle.
3. Injecter la configuration et les secrets par les moyens privés de l’hébergeur. Ne jamais les committer.
4. Rejouer les tests, puis un parcours fictif complet : demande → base → notification → suivi.
5. Raccorder le domaine choisi et son HTTPS. Vérifier les formulaires depuis le domaine exact.

La disponibilité de l’import GitHub ne garantit pas la compatibilité de l’hébergement ; documenter le résultat réel.

## Deux populations distinctes

**Cédants** : entreprises correspondant aux critères transmis par les opérateurs. Distinguer une entreprise correspondant à la thèse d’un dirigeant ayant déclaré vouloir transmettre. Ne pas déduire un projet de cession de l’âge ou d’un changement administratif. Consigner les sources et les données manquantes.

**Investisseurs** : profils susceptibles d’être intéressés, avec preuve de la pertinence du ciblage. Distinguer coordonnées repérées, intérêt déclaré, ticket envisagé, engagement signé et fonds effectivement disponibles. Ne pas déduire la fortune, la qualification réglementaire ou la volonté d’investir d’un intitulé de poste.

**Prescripteurs** : experts-comptables, intermédiaires et réseaux adaptés aux critères, avec leurs coordonnées professionnelles et les raisons de les contacter.

Avant d’émettre des messages : configurer les publics et canaux autorisés, les règles applicables, les exclusions, l’expéditeur vérifié, le traitement des réponses et le plafond de dépenses. Aucun budget publicitaire n’est nécessaire au démarrage de ce test. Le dépôt ne vaut pas autorisation de lancer des campagnes.

## Interface privée

Base : le domaine effectivement déployé, suivi de `/api/private/`. Authentification : `Authorization: Bearer <ADMIN_TOKEN>`. Ne jamais inclure cette clé dans une URL ni dans du JavaScript public.

| Requête | Usage |
|---|---|
| `GET status` | Pause, paramètres manquants, état des outils, notifications en attente |
| `POST pause` | `{ "paused": true }` ou `false` |
| `GET leads?limit=50&offset=0` | Demandes entrantes, paginées |
| `GET leads/{id}` | Détail et historique |
| `PATCH leads/{id}` | Statut, responsable, prochaine action et date |
| `DELETE leads/{id}` | Effacement après traitement de la demande correspondante |
| `GET export.csv` | Export des demandes et du suivi |
| `GET prospects` | Prospects identifiés, 200 au maximum |
| `POST prospects` | Ajouter un prospect sourcé |
| `DELETE prospects/{id}` | Effacer une fiche prospect et son historique |
| `PATCH prospects/{id}` | Ajouter un changement de relation accompagné de son motif ou d’une preuve |
| `POST suppressions` | `{ "contact": "person@example.test" }` ; opposition globale |
| `POST notifications/retry` | Retenter les notifications en attente ou en échec, dans la limite des tentatives |

Exemple fictif d’un prospect :

```json
{
  "audience": "seller",
  "name": "Entreprise de démonstration",
  "company": "Entreprise de démonstration",
  "contact": "contact@example.test",
  "sources": [
    {
      "url": "https://example.test/presentation",
      "evidence": "Décrit son activité ; aucun projet de vente déclaré.",
      "checkedAt": "2026-10-25"
    }
  ],
  "contactBasis": "À établir avant toute sollicitation",
  "notes": "Données fictives pour la recette"
}
```

`audience` : `seller`, `investor` ou `referrer`. Le contact est enregistré en `identified`, intérêt `unknown`. Une URL et une information vérifiable sont obligatoires. L’API refuse les contacts opposés et dédoublonne les prospects.

Exemple de suivi d’une demande :

```json
{
  "status": "qualified",
  "owner": "Opérateur",
  "nextAction": "Proposer un premier échange",
  "nextAt": "2026-11-02"
}
```

Statuts des demandes : `new`, `qualifying`, `qualified`, `meeting`, `waiting`, `replied`, `declined`, `opposed`, `closed`.

Statuts des prospects : `identified`, `reviewed`, `contacted`, `replied`, `interested`, `meeting`, `declined`, `opposed`, `closed`. Chaque transition doit fournir `stage` et `note`. Ne jamais marquer `contacted` sur un simple brouillon, ni `interested` sans réponse correspondante.

Avant chaque action sortante, lire l’état de pause et les oppositions. À réponse ou refus, arrêter les relances concernées ; à opposition, appeler `suppressions`. Raccorder et tester ces règles dans les outils réels de NanoCorp : le serveur ne peut pas arrêter une action effectuée indépendamment sur la plateforme.

## Mesure de l’expérience

Rapporter les cibles pertinentes, les contacts effectivement joints, les réponses, les conversations qualifiées, les rendez-vous, les dossiers exploitables, le coût total et les décisions attendues. Les e-mails préparés, envoyés et reçus sont trois états différents. Aucun rendement ni volume de financement n’est promis.

## Séparation des données

Les dossiers confidentiels d’entreprises, documents investisseurs, accès personnels et données d’un employeur restent hors de ce dépôt. N’importer que les informations nécessaires à la mission et autorisées pour les prestataires concernés. Les secrets, contacts, oppositions, historiques et exports ne deviennent jamais des fichiers publics.

## Parcours investisseurs public

`/investir` recueille uniquement une demande de premier échange. `INVESTORS_ENABLED=true` active ce parcours. Champs serveur : `kind: investor`, `firstName`, `contact`, `ticket`, `profile`, `interestAcknowledged: true`, `risksAccepted: true`, avec `lastName`, `alternateContact` et `message` facultatifs. Ticket : `undecided`, `under-10k`, `10-25k`, `25-50k`, `50-100k`, `over-100k`. Profil : `individual`, `active-owner`, `former-owner`, `professional`, `company-representative`, `other`. `formToken` et contrôle d’origine restent obligatoires. Le profil est déclaratif, jamais une qualification réglementaire. Aucune question de patrimoine ni inscription automatique à une newsletter. Les e-mails sont des messages de service.
