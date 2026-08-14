# Impression mobile — architecture et validation

Date de référence : 14 août 2026

## Décision d’architecture

Une PWA ne peut pas piloter de façon universelle l’imprimante intégrée de
chaque terminal Android. Les constructeurs exposent des SDK, services AIDL,
ports série ou applications d’impression différents. Mpangi Pharma utilise
donc trois niveaux, dans cet ordre :

1. **Connecteur natif Mpangi** quand l’application Android du terminal expose
   `window.MpangiNativePrinter` ;
2. **service d’impression du système** pour Android Print Framework, AirPrint,
   Mopria et les pilotes installés par le constructeur ;
3. **partage d’un ticket texte ESC/POS de 32 colonnes** vers l’application du
   fabricant ou une application d’impression compatible.

Une panne du connecteur natif déclenche automatiquement le niveau 2. Le reçu
reste également disponible en A4/PDF.

## Correctifs intégrés

- suppression du bouton expérimental spécifique H10 ;
- détection du connecteur natif sans exception bloquante ;
- protocole de reçu natif version 2 ;
- ticket texte déterministe en 58 mm (32 colonnes) et 80 mm (48 colonnes) ;
- partage Android/iOS, avec téléchargement `.txt` de secours ;
- conservation de l’iframe jusqu’à `afterprint` ou 120 secondes au lieu de la
  supprimer après 2 secondes ;
- repli automatique vers le menu d’impression du système ;
- messages d’aide directement sur la facture.

## Mise en service sur le terminal H10

1. Dans l’application **Printer** livrée avec le terminal, lancer le test
   matériel. Si ce test échoue, il s’agit d’un défaut matériel, papier ou
   firmware, pas de Mpangi Pharma.
2. Vérifier dans Android **Paramètres > Connexion/Impression** si un service
   d’impression du constructeur est présent et activé.
3. Dans Mpangi Pharma, ouvrir une facture puis toucher **Imprimer le ticket**.
4. Si l’imprimante interne est proposée, la sélectionner et conserver ce choix
   comme imprimante par défaut.
5. Si elle n’est pas proposée, toucher **Autre application** et sélectionner
   l’application d’impression du terminal.

Pour une impression directe silencieuse sur ce H10, il faut obtenir auprès du
vendeur le **SDK exact correspondant au firmware installé** : fichier AAR/JAR,
documentation AIDL ou port série, application de démonstration et APK du
service d’impression. Le modèle H10 est commercialisé avec un SDK, mais ce SDK
n’est ni standardisé ni présent dans ce dépôt. Le connecteur natif Mpangi est
prêt à recevoir cet adaptateur sans modifier le moteur de reçu.

## Matrice de compatibilité

| Appareil / imprimante | Méthode recommandée | Secours |
|---|---|---|
| Android + imprimante interne avec Print Service | Imprimer le ticket | Autre application |
| Android + imprimante interne avec SDK seulement | Connecteur natif Mpangi | Autre application |
| Android + Bluetooth/USB/réseau ESC/POS | Print Service/Mopria | Partage vers l’app du fabricant |
| iPhone/iPad + AirPrint | Imprimer le ticket | Partage |
| PC + imprimante 58/80 mm | Dialogue système | A4/PDF |

## Recette matérielle obligatoire

| ID | Test | Résultat attendu |
|---|---|---|
| IMP-01 | Ticket d’un seul produit | Ticket complet, une seule impression |
| IMP-02 | Nom de produit très long | Retour à la ligne, aucun texte coupé |
| IMP-03 | 25 produits | Toutes les lignes et le total sont présents |
| IMP-04 | Accents français | Texte lisible ou repli texte accepté |
| IMP-05 | Imprimante éteinte | Erreur du pilote, facture et vente conservées |
| IMP-06 | Annulation du dialogue | Aucun blocage de l’écran |
| IMP-07 | Deux impressions successives | Deux tickets identiques, pas de page blanche |
| IMP-08 | Réseau indisponible après chargement | Réimpression de la facture déjà affichée |

## Références techniques

- Android Print Framework : https://developer.android.com/training/printing/custom-docs
- Installation SheetJS corrigée : https://docs.sheetjs.com/docs/getting-started/installation/nodejs/
- Fiche H10 avec imprimante 58 mm :
  https://www.coresmart-equipment.com/pos-terminal/pos-terminal-machine/h10-pos-terminal.html
