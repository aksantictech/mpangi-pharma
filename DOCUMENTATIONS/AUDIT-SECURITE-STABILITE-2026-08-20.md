# Audit sécurité, fiabilité et données — Mpangi Pharma

Date : 20 août 2026
Base auditée : `main` à `1d9fa79`, puis correctifs locaux dédiés

## Verdict exécutif

L'application possède un socle applicatif exploitable et ses dépendances ne
présentent aucune vulnérabilité connue par `npm audit`. Les routes sensibles
auditées ont été durcies contre les requêtes intersites, les corps excessifs,
les entrées invalides et plusieurs escalades de rôle.

Elle ne peut toutefois pas encore être déclarée « résistante à toute attaque »
ou certifiée pour l'isolation multi-pharmacies : le schéma Supabase, les
fonctions SQL et les politiques RLS ne sont pas versionnés dans le dépôt. Les
accès directs du navigateur à Supabase dépendent entièrement de ces politiques.

## Contrôles exécutés

| Contrôle | Résultat |
|---|---|
| Tests unitaires reçus + raster Android + sécurité HTTP | 9/9 réussis |
| TypeScript `tsc --noEmit` | Réussi |
| ESLint des fichiers modifiés | Réussi |
| ESLint complet | 47 erreurs, 13 avertissements préexistants |
| Audit npm, 560 dépendances | 0 vulnérabilité connue |
| Recherche de JWT/secrets suivis | Aucun secret réel trouvé |
| Recherche `eval`, `Function`, HTML brut dangereux | Aucun cas trouvé |
| Build Next.js 16.3.1 | Réussi avec variables de build non sensibles |
| Schéma, fonctions et RLS Supabase dans Git | Absents — certification bloquée |
| Test sur imprimante H10 physique | À exécuter sur le terminal réel |

## Correctifs intégrés pendant cet audit

### API et contrôle d'accès

- rejet des mutations venant explicitement d'une origine différente ;
- obligation de `Content-Type: application/json` sur les routes concernées ;
- contrôle de la taille réelle du corps, même sans `Content-Length` ;
- validation des UUID et longueur des champs sensibles ;
- limites de 4 Mo / 2 000 lignes pour l'import produits ;
- limites de 16 Mo / 5 000 lignes pour l'import catalogue national ;
- validation des nombres, dates et longueurs avant import ;
- un gérant ne peut plus créer, promouvoir ou réinitialiser un autre gérant ;
- réponses d'autorisation normalisées sans divulguer les erreurs de base ;
- export de pharmacie marqué `private, no-store` ;
- modules utilisant la clé Supabase privilégiée marqués `server-only`.

### Données et stabilité

- correction de l'URL de statut membre `/statuts`, auparavant inexistante ;
- suppression à la déconnexion des identifiants de pharmacie conservés en
  `localStorage`, en plus de la purge IndexedDB déjà en place ;
- journal d'authentification : validation du contexte et impossibilité pour le
  client de déclarer un `login_failed` comme réussi ;
- APK téléchargé depuis le chemin réellement publié `/download/...`.

### Impression

- détection synchrone du vrai pont Android avant de l'appeler ;
- ticket PNG 58/80 mm généré localement, sans réseau ;
- appel du partage de fichiers dans le même geste utilisateur ;
- pagination des tickets longs et replis texte/téléchargement ;
- maintien de l'impression navigateur pour les ordinateurs.

## Risques encore ouverts

### P0 — RLS et fonctions Supabase non auditables

La clé `service_role` contourne la RLS et doit rester exclusivement côté
serveur. Cela est respecté dans le code audité, mais les services client
interrogent aussi Supabase avec la clé anonyme. Sans migrations SQL dans Git,
il est impossible de prouver qu'un compte de la pharmacie A ne peut pas lire ou
modifier les données de B.

Actions obligatoires :

1. exporter le schéma dans `supabase/migrations` ;
2. activer et vérifier RLS sur toute table exposée, en particulier celles avec
   `pharmacy_id` ;
3. auditer chaque vue et fonction `SECURITY DEFINER`, son `search_path` et ses
   droits d'exécution ;
4. tester automatiquement lecture, écriture et export croisés A/B ;
5. auditer les politiques Storage du bucket de logos.

### P1 — Ventes hors ligne non prouvées idempotentes

Si la base crée une vente mais que la réponse est perdue, une nouvelle
synchronisation peut la dupliquer. `offline_sale_id` doit être unique en base
et la RPC doit retourner la vente existante lors d'une répétition.

### P1 — Import catalogue national non atomique

Le remplacement s'effectue en plusieurs opérations. Une panne intermédiaire
peut laisser un catalogue partiel. Il faut une table de staging puis une bascule
transactionnelle en SQL.

### P1 — Données hors ligne non chiffrées au repos

IndexedDB reste lisible par une personne disposant d'un terminal déverrouillé
ou compromis. Prévoir verrouillage Android, compte utilisateur nominatif,
chiffrement complet de l'appareil, MDM/effacement à distance et délai de session.

### P1 — Défenses périmétriques non vérifiées

La limitation de débit, la protection contre les robots, les alertes et la
rétention des journaux dépendent de Vercel/Supabase et ne sont pas vérifiables
depuis ce dépôt. Elles doivent être activées et testées sur l'environnement de
production.

### P2 — Dette de qualité

Le build n'est pas bloqué par les 47 erreurs ESLint préexistantes. Il faut les
réduire à zéro puis rendre lint et tests obligatoires avant déploiement.

## Scénarios d'attaque à valider en préproduction

| Scénario | Contrôle attendu |
|---|---|
| Utilisateur A lit/modifie une ressource B | 403/RLS, aucune ligne retournée |
| Gérant tente de devenir owner/admin | 403, événement d'audit |
| Requête JSON intersite | 403 |
| Import trop gros ou valeurs hors plage | 413/400, aucune donnée partielle |
| Réutilisation d'une vente hors ligne | Même vente, aucun doublon |
| Vol d'un jeton expiré/révoqué | Session refusée |
| Brute force connexion | 429 et alerte |
| Sauvegarde restaurée | RPO/RTO mesurés, données cohérentes |

## Conditions avant certification production

1. schéma/RLS/RPC versionnés et tests A/B réussis ;
2. idempotence des ventes hors ligne prouvée ;
3. import national atomique ;
4. limitation de débit et alertes testées ;
5. restauration d'une sauvegarde réussie sur une base isolée ;
6. ESLint à zéro et contrôles CI obligatoires ;
7. recette d'impression exécutée sur chaque famille de terminal supportée.

## Références officielles

- Supabase RLS : https://supabase.com/docs/guides/database/postgres/row-level-security
- Sécuriser l'API Data : https://supabase.com/docs/guides/api/securing-your-api
- Préparation production Supabase : https://supabase.com/docs/guides/deployment/going-into-prod
- Checklist production Next.js : https://nextjs.org/docs/app/guides/production-checklist
