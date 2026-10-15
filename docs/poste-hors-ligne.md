# Poste hors-ligne de la pharmacie — mise en service et recette

*Mpangi Pharma — 15 octobre 2026. Option « poste renforcé » : un seul portable qui continue de travailler pendant les coupures d'internet, les téléphones restant en ligne.*

## 1. Ce que le poste sait faire sans internet

| Fonction | Sans internet |
|---|---|
| Ouvrir l'application (même après un redémarrage de l'ordinateur) | **Oui**, si l'application a déjà été ouverte avec internet sur cet appareil |
| Caisse : vendre, scanner, remise, mode de paiement, ticket provisoire | **Oui** |
| Coupure **pendant** une vente (au moment d'Encaisser) | La vente est **gardée sur l'appareil**, rien n'est perdu |
| Consulter Produits, Stock, Expirations, Tableau de bord | **Oui**, avec la **copie** de l'appareil (date affichée) |
| Envoi des ventes au serveur | **Automatique** au retour d'internet (et toutes les minutes tant qu'il en reste) |
| Entrée de stock, correction, création/modification de produit, finances, inventaire à jour | **Non** : à faire une fois internet revenu |

## 2. Ce qui a été construit

1. **Ouverture sans internet** : un service worker garde l'application (pages, scripts, polices) sur l'appareil. Les pages de l'espace pharmacie sont préparées automatiquement (au plus toutes les 6 h) selon le rôle de l'utilisateur.
2. **Copie locale à jour** : produits, stock, lots, expirations, catégories, fournisseurs, réglages et 1 000 derniers mouvements sont recopiés sur l'appareil au plus toutes les 10 minutes quand internet fonctionne, et après chaque envoi de ventes. En cas de coupure, les écrans Produits, Stock, Expirations et Tableau de bord s'affichent avec cette copie.
3. **Détection réelle de la coupure** : l'application ne se fie plus au seul Wi-Fi (le cas fréquent est « Wi-Fi OK mais internet coupé »). Elle suit les réponses du serveur, met un délai maximum de 25 secondes aux requêtes, et sonde le serveur toutes les 8 secondes pendant une coupure.
4. **Ventes sécurisées** :
   - une vente tentée en ligne dont la connexion tombe en route est enregistrée localement ;
   - **anti-doublon** : chaque vente porte une référence (`Réf. caisse : OFF-…`) ; avant tout renvoi, l'application cherche cette référence sur le serveur, donc une vente déjà enregistrée par le serveur (réponse perdue) n'est **jamais recréée** ;
   - une vente restée « en cours d'envoi » après une fermeture brutale est reprise automatiquement ;
   - un seul envoi à la fois (pas de double envoi entre l'automatique et le bouton) ;
   - la copie des produits retire les ventes encore en attente, pour ne pas revendre du stock déjà vendu ;
   - **déconnexion refusée** tant que des ventes ne sont pas parties (elle effaçait auparavant les données de l'appareil) ;
   - le navigateur demande confirmation si on ferme la fenêtre avec des ventes en attente ;
   - le navigateur est invité à ne pas effacer ces données en cas de manque de place.
5. **Journal de stock fiable** (migration 0006, déjà appliquée) : chaque lot est couvert par ses mouvements.

## 3. Mise en service sur le portable (une seule fois)

1. **Chrome ou Edge** à jour, jamais en navigation privée. Fixer l'heure en automatique.
2. Avec internet : ouvrir l'application, se connecter, cliquer sur **Installer** (barre d'adresse), puis l'ouvrir depuis son icône.
3. Ouvrir une fois **Caisse, Produits, Stock, Expirations, Synchronisation**.
4. Vérifier dans la barre : « Mode en ligne · synchronisation automatique » et une date de copie récente ; sinon cliquer sur **Synchroniser produits**.
5. Ne jamais effacer les « données de navigation » ; verrouiller la session Windows quand l'appareil est sans surveillance.

## 4. Recette sur site (à faire avant la mise en production)

- [ ] Débrancher internet (Wi-Fi/câble). La barre indique **Mode hors-ligne**.
- [ ] Fermer et rouvrir l'application, puis **redémarrer l'ordinateur** et la rouvrir : elle s'ouvre, Produits et Stock s'affichent.
- [ ] Faire 3 ventes (dont une sur ordonnance et une avec remise) : tickets provisoires, stock local qui baisse.
- [ ] Essayer **Déconnexion** : elle doit être refusée.
- [ ] Rebrancher internet **sans rien cliquer** : au bout d'environ 10 à 30 secondes, le nombre de ventes en attente tombe à 0.
- [ ] Sur un téléphone : les 3 ventes sont dans **Factures**, **sans doublon**, avec leurs vrais numéros ; le stock a baissé.
- [ ] Couper internet **au moment d'Encaisser** : message « Connexion perdue : vente enregistrée sur cet appareil ».
- [ ] Vendre le **même produit** sur le portable (hors-ligne) et sur un téléphone, puis rebrancher : si le stock manque, la vente apparaît « en conflit » dans **Synchronisation**.
- [ ] Laisser internet coupé plusieurs heures : la session reste ouverte et les ventes partent au retour.

## 5. Limites connues (à connaître)

- **Seules les ventes** s'enregistrent hors-ligne. Produits et stock sont en **consultation seule** ; la copie est une photo : les ventes faites hors-ligne n'y figurent qu'après envoi (la caisse, elle, tient compte du stock local).
- Une page jamais ouverte avec internet sur l'appareil ne s'ouvrira pas hors-ligne (un écran propose alors la Caisse, les Produits ou le Stock).
- Si le portable reste hors-ligne **plusieurs jours**, la connexion à la session peut expirer : au retour d'internet, il faut se reconnecter ; les ventes en attente restent sur l'appareil et partent après la reconnexion.
- Deux postes qui vendent le dernier article en même temps (portable hors-ligne + téléphone) peuvent rendre le stock négatif : la vente est signalée en conflit pour régularisation par le gérant.
- **Vérifié** : scénarios automatisés dans un vrai Chrome avec un serveur simulé (ouverture serveur arrêté, vente hors-ligne, reprise automatique, anti-doublon, reprise d'une vente bloquée, coupure en pleine vente, refus de déconnexion). **Non vérifié** : une vraie session connectée sur l'environnement en ligne, et une vraie coupure réseau sur le portable de l'hôpital. C'est l'objet de la recette ci-dessus.
