# Audit de sécurité et de stabilité — Mpangi Pharma

Date : 14 août 2026
Révision auditée : `99bdd0b` puis branche de correction dédiée

## Résumé exécutif

Le socle compile en production et le contrôle TypeScript est valide. Les
dépendances de production sont passées de 12 vulnérabilités connues à 0.
Plusieurs risques d’accès et de confidentialité ont été corrigés. La sécurité
des données Supabase ne peut toutefois pas être certifiée tant que le schéma,
les fonctions SQL et les politiques RLS ne sont pas versionnés dans le dépôt.

## Contrôles exécutés

| Contrôle | Résultat |
|---|---|
| Tests unitaires du ticket 58/80 mm | 3/3 réussis |
| TypeScript `tsc --noEmit` | Réussi |
| Build Next.js 16.3.1 | Réussi avec variables de build non sensibles |
| Audit de toutes les dépendances | 0 vulnérabilité |
| Recherche de secrets dans les fichiers suivis | Aucun secret réel trouvé |
| ESLint complet | 52 erreurs, 13 avertissements préexistants |
| Schéma/RLS Supabase dans Git | Absent — contrôle bloqué |

## Risques corrigés

### Critiques / élevés

1. **Réinitialisation inter-pharmacies** : la création d’un membre retrouvait
   un email existant puis changeait son mot de passe avec la clé service. Un
   gérant pouvait ainsi prendre le contrôle d’un compte appartenant à une
   autre pharmacie. Désormais, un email existant est refusé et l’association
   doit passer par le Super Admin.
2. **Contournements Next.js connus** : mise à jour de 16.2.9 vers 16.3.1.
3. **SheetJS vulnérable** : remplacement de la version npm obsolète 0.18.5 par
   la distribution officielle 0.20.3.
4. **Mots de passe par défaut** : suppression des valeurs
   `ChangeMe@2026!` dans les formulaires et scripts. Les scripts exigent
   maintenant des variables d’environnement et au moins 12 caractères.
5. **Données hors-ligne sur terminal partagé** : les produits, ventes et noms
   clients IndexedDB sont effacés à la déconnexion et lors d’un changement
   d’identité détecté.

### Moyens

1. `/admin` vérifie maintenant le rôle Super Admin côté serveur avant rendu.
2. Ajout de protections HTTP : anti-sniffing, anti-iframe, politique de
   référent, permissions navigateur limitées, COOP et HSTS.
3. L’API de journalisation valide le type d’événement, limite les tailles et
   exige une session pour les événements authentifiés.
4. L’outil CLI `shadcn`, non nécessaire au runtime, a été retiré des
   dépendances installées.

## Risques ouverts

### P0 — Isolation des données Supabase non vérifiable

Les services client interrogent directement les tables et vues Supabase avec
la clé anonyme. La confidentialité entre pharmacies dépend donc entièrement
des politiques RLS et des contrôles présents dans les fonctions RPC. Aucune
migration SQL, définition de vue, fonction ou politique RLS n’est conservée
dans Git.

Actions obligatoires avant certification :

- exporter le schéma Supabase dans `supabase/migrations` ;
- vérifier RLS sur chaque table contenant `pharmacy_id` ;
- tester qu’un utilisateur de la pharmacie A ne peut ni lire ni modifier B ;
- auditer `create_sale`, `create_product_with_initial_batch` et
  `log_auth_event`, y compris `SECURITY DEFINER` et `search_path` ;
- vérifier les politiques du bucket `pharmacy-logos` ;
- ajouter ces tests d’isolation à la CI.

### P1 — Idempotence des ventes hors-ligne

Si `create_sale` réussit mais que la réponse réseau est perdue, une nouvelle
synchronisation peut recréer la vente. La base doit accepter une clé unique
`offline_sale_id` et retourner la vente existante en cas de répétition.

### P1 — Import catalogue non atomique

Le remplacement du catalogue détache et supprime les anciennes données avant
d’insérer les nouveaux lots. Une erreur en cours d’import peut laisser un
catalogue partiel. L’opération doit être déplacée dans une transaction SQL ou
un mécanisme table de staging + bascule atomique.

### P1 — Dette ESLint

Le dépôt comporte 52 erreurs et 13 avertissements sur 33 fichiers, notamment
des effets React déclenchant des mises à jour synchrones, des types `any` et
des dépendances de hooks manquantes. Le build réussit, mais la CI doit rendre
`npm run lint` bloquant après correction progressive.

### P2 — Journal d’authentification public

Les événements d’échec de connexion doivent rester accessibles avant login,
mais nécessitent une limitation de débit durable (Vercel Firewall/Upstash ou
fonction SQL) afin d’éviter le remplissage abusif de la table d’audit.

## Critères de clôture de l’audit données

L’audit pourra être déclaré complet lorsque :

1. le schéma et les RLS seront versionnés ;
2. les tests croisés pharmacie A/B seront automatisés et réussiront ;
3. les ventes hors-ligne seront idempotentes ;
4. l’import complet sera atomique ;
5. ESLint sera à 0 erreur ;
6. une restauration de sauvegarde aura été testée sur une base isolée.
