# Impression Android et mobile — architecture v2

Date de référence : 20 août 2026

## Diagnostic confirmé

L'APK actuellement publié dans `public/download/Mpangi-Pharma.apk` est une
enveloppe WebAPK/Trusted Web Activity lancée par Chrome ou Samsung Internet.
Il ne contient ni pilote d'imprimante, ni SDK SUNMI/H10, ni implémentation du
pont JavaScript `window.MpangiNativePrinter` attendu par l'application web.

Le résultat observé est donc cohérent : l'impression du navigateur fonctionne
sur ordinateur, mais le terminal Android ne peut pas piloter silencieusement
son imprimante intégrée. Une TWA affiche le site dans le navigateur Android ;
elle n'ajoute pas automatiquement les API natives du constructeur.

## Solution déployée dans le code web

Le bouton **Imprimer le ticket** suit désormais cet ordre :

1. pont natif Mpangi, uniquement s'il existe réellement sur l'appareil ;
2. sur Android sans pont natif, génération locale et synchrone d'un ticket PNG
   noir sur blanc, puis partage immédiat vers le sélecteur Android ;
3. sur ordinateur, dialogue d'impression isolé existant ;
4. si le partage de fichiers n'est pas supporté, partage texte puis
   téléchargement PNG de secours.

Le PNG est généré sans serveur et sans transfert de données à un service tiers.
Les dimensions sont déterministes :

| Papier | Largeur raster | Ticket texte |
|---|---:|---:|
| 58 mm | 384 px | 32 caractères |
| 80 mm | 576 px | 48 caractères |

Les tickets de plus de 160 lignes sont découpés en plusieurs images afin
d'éviter les limites de hauteur ou de mémoire des applications Android.

## Ce que « universel » signifie réellement

Aucune API web standard ne permet d'envoyer des commandes ESC/POS à toutes les
imprimantes intégrées Android. Les terminaux utilisent selon les modèles un SDK
Java/Kotlin, un service AIDL, un port série, USB, Bluetooth ou une application
constructeur.

La solution PNG + partage Android est le meilleur repli indépendant du modèle :
elle fonctionne si l'application **Printer** du constructeur accepte les images
partagées ou si un service/app ESC/POS compatible est installé.

Pour obtenir une impression directe, automatique et sans sélecteur sur un H10,
SUNMI ou autre terminal, il faut construire un véritable APK Android Mpangi et
y intégrer un adaptateur par famille :

| Adaptateur | Usage |
|---|---|
| Android Print Framework | Imprimantes exposées comme Print Service |
| SDK SUNMI | Imprimantes SUNMI via leur service natif |
| SDK/AIDL H10 | Imprimante intégrée du firmware H10 exact |
| ESC/POS Bluetooth/USB/TCP | Imprimantes externes compatibles |

Le moteur de reçu TypeScript et le protocole `printerMode: thermal-native`
restent réutilisables par ce futur APK.

## Test immédiat sur le terminal

1. Dans l'application **Printer** du terminal, lancer son auto-test matériel.
2. Mettre à jour Chrome/Samsung Internet et l'application Printer.
3. Ouvrir une facture Mpangi, toucher **Imprimer le ticket**.
4. Dans le sélecteur Android, choisir **Printer**, l'application constructeur
   ou l'application ESC/POS installée, puis imprimer l'image à 100 %, sans marge.
5. Si aucune application d'impression n'apparaît dans le sélecteur, installer
   le plugin constructeur ou récupérer son SDK : le navigateur ne peut pas
   créer ce pilote manquant.

Le bouton **Ticket PNG Android** permet de tester explicitement le même chemin.

## Recette matérielle obligatoire

| ID | Test | Résultat attendu |
|---|---|---|
| IMP-01 | Ticket d'un seul produit | Ticket complet, une seule impression |
| IMP-02 | Nom de produit très long | Retour à la ligne, aucun texte coupé |
| IMP-03 | 25 produits | Toutes les lignes et le total sont présents |
| IMP-04 | Accents français | Texte raster lisible |
| IMP-05 | Ticket de plus de 160 lignes | Plusieurs PNG ordonnés sont proposés |
| IMP-06 | Imprimante éteinte | Facture et vente restent conservées |
| IMP-07 | Annulation du partage | Aucun blocage de l'écran |
| IMP-08 | Deux impressions successives | Deux tickets identiques, pas de page blanche |
| IMP-09 | Réseau coupé après affichage | Ticket déjà chargé encore partageable |
| IMP-10 | Android sans partage de fichiers | Partage texte ou PNG téléchargé |

## Sécurité du futur connecteur natif

Ne pas exposer `addJavascriptInterface` à des pages ou iframes arbitraires.
L'APK natif devra limiter la navigation au domaine Mpangi attendu, refuser les
origines inconnues et n'accepter qu'un schéma de reçu validé. Les données du
ticket ne doivent jamais contenir de commande brute fournie par l'utilisateur.

## Références techniques officielles

- Trusted Web Activity : https://developer.chrome.com/docs/android/trusted-web-activity
- Impression d'un document WebView : https://developer.android.com/training/printing/html-docs
- Partage Android `ACTION_SEND` : https://developer.android.com/develop/ui/compose/sharing/send
- Web Share avec fichiers : https://web.dev/articles/web-share
- Sécurité des ponts WebView : https://developer.android.com/privacy-and-security/risks/insecure-webview-native-bridges
- Démonstration SDK d'impression SUNMI : https://github.com/shangmisunmi/SunmiPrinterDemo
- Fiche H10 : https://www.coresmart-equipment.com/pos-terminal/pos-terminal-machine/h10-pos-terminal.html
