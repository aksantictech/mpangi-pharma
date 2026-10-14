/*
 * Contenu du menu Aide : guides pratiques pas à pas, par métier.
 *
 * Les libellés entre **doubles étoiles** sont ceux affichés à l'écran (boutons,
 * champs, menus) ; la page les met en gras. En cas de changement d'un libellé
 * dans l'application, mettre à jour ce fichier.
 */

export type HelpTask = {
  id: string;
  title: string;
  /** Une phrase qui dit à quoi sert cette procédure. */
  summary: string;
  steps: string[];
  tips?: string[];
  /** Page de l'application où réaliser la procédure. */
  link?: { label: string; href: string };
};

export type HelpGuideId =
  | "demarrage"
  | "gerant"
  | "pharmacien"
  | "stock"
  | "vente"
  | "comptable"
  | "tous";

export type HelpGuide = {
  id: HelpGuideId;
  title: string;
  /** Libellé court pour l'onglet. */
  tab: string;
  subtitle: string;
  tasks: HelpTask[];
};

export const helpGuides: HelpGuide[] = [
  {
    id: "demarrage",
    title: "Démarrer la pharmacie",
    tab: "Démarrage",
    subtitle:
      "Première configuration, à faire une seule fois par le propriétaire ou le gérant.",
    tasks: [
      {
        id: "infos-logo",
        title: "Renseigner les informations et le logo",
        summary:
          "Le nom, l’adresse, le téléphone et le logo apparaissent sur les factures et les rapports imprimés.",
        steps: [
          "Ouvrez **Paramètres** dans le menu, puis la carte **Ma pharmacie**.",
          "Remplissez **Nom pharmacie**, **Pharmacien responsable**, **Adresse**, **Ville**, **Téléphone** et **Email**.",
          "Cliquez sur **Choisir un logo** et sélectionnez l’image du logo de la pharmacie.",
          "Écrivez le **Pied de facture** (ex. « Merci pour votre confiance »).",
          "Enregistrez les informations de la pharmacie.",
        ],
        tips: [
          "Un logo carré ou horizontal sur fond blanc donne le meilleur rendu à l’impression.",
        ],
        link: { label: "Ouvrir Ma pharmacie", href: "/parametres/general" },
      },
      {
        id: "taux-change",
        title: "Régler les taux de change USD et EUR",
        summary:
          "Les prix restent enregistrés en CDF ; les taux servent à les afficher en dollars ou en euros.",
        steps: [
          "Dans **Paramètres > Ma pharmacie**, trouvez **Taux de change : 1 USD = combien de CDF ?** et saisissez le taux du jour.",
          "Si vous voulez l’euro, renseignez aussi **Taux de change : 1 EUR = combien de CDF ?**.",
          "Enregistrez. Les boutons **CDF / USD / EUR** de l’application deviennent alors utilisables.",
        ],
        tips: [
          "Une devise dont le taux est vide reste grisée. Mettez les taux à jour quand le marché change.",
        ],
        link: { label: "Ouvrir Ma pharmacie", href: "/parametres/general" },
      },
      {
        id: "regles",
        title: "Choisir les règles de gestion",
        summary:
          "Ces réglages protègent le stock et déclenchent les alertes.",
        steps: [
          "Dans **Paramètres > Ma pharmacie**, descendez à la section des règles de gestion.",
          "Activez **Bloquer les ventes expirées** pour empêcher la vente de lots périmés.",
          "Laissez **Autoriser le stock négatif** désactivé, sauf besoin particulier.",
          "Réglez **Alerte de stock faible** et **Jours d’alerte expiration**.",
          "Choisissez le **Préfixe facture** et le **Format du reçu**, puis enregistrez les règles.",
        ],
        link: { label: "Ouvrir Ma pharmacie", href: "/parametres/general" },
      },
      {
        id: "utilisateurs",
        title: "Créer les comptes de l’équipe",
        summary:
          "Chaque personne a son compte et un rôle qui limite ce qu’elle voit.",
        steps: [
          "Ouvrez **Paramètres > Utilisateurs de ma pharmacie**.",
          "Saisissez l’**Email**, le **Téléphone** et un **Mot de passe temporaire**.",
          "Choisissez le rôle : **Gérant**, **Pharmacien**, **Caissier**, **Gestionnaire stock** ou **Comptable**.",
          "Cliquez sur **Ajouter**, puis communiquez l’email et le mot de passe temporaire à la personne.",
          "À sa première connexion, elle choisit son propre mot de passe.",
        ],
        tips: [
          "Donnez le rôle le plus restreint qui suffit : un caissier n’a pas besoin de la finance.",
        ],
        link: {
          label: "Ouvrir Utilisateurs",
          href: "/parametres/utilisateurs",
        },
      },
      {
        id: "fournisseurs-categories",
        title: "Ajouter les fournisseurs et les catégories",
        summary:
          "Ils servent à classer les produits et à suivre les achats.",
        steps: [
          "Ouvrez **Paramètres > Fournisseurs** et ajoutez chaque fournisseur (nom, téléphone).",
          "Ouvrez **Paramètres > Catégories de produits** et ajoutez vos catégories (antalgiques, antibiotiques…), avec une couleur si vous voulez.",
          "Ces listes se retrouvent ensuite dans la création de produit, le stock et l’inventaire.",
        ],
        link: { label: "Ouvrir Fournisseurs", href: "/parametres/fournisseurs" },
      },
      {
        id: "indice-prix",
        title: "Définir l’indice de prix automatique",
        summary:
          "Le prix de vente se calcule tout seul à partir du prix d’achat.",
        steps: [
          "Ouvrez **Paramètres > Prix automatique**.",
          "Saisissez l’indice : avec 2, un produit acheté 1 000 CDF sera proposé à 2 000 CDF.",
          "Choisissez l’arrondi si besoin, puis enregistrez.",
          "L’indice s’applique d’office aux nouveaux produits et aux nouveaux lots ; vous pouvez toujours corriger un prix à la main.",
        ],
        link: { label: "Ouvrir Prix automatique", href: "/parametres/prix" },
      },
      {
        id: "modes-paiement",
        title: "Ajouter des sociétés conventionnées et autres modes de paiement",
        summary:
          "Les sociétés conventionnées apparaissent dans la caisse et sur les rapports.",
        steps: [
          "Ouvrez **Paramètres > Modes de paiement**.",
          "Saisissez le **Nom** (ex. une société ou une assurance) et choisissez le **Type**.",
          "Ajoutez une **Note** si utile (numéro de convention, taux de prise en charge), puis **Ajouter**.",
          "Utilisez les boutons d’action de la liste pour modifier, désactiver ou supprimer un mode.",
        ],
        tips: [
          "Une vente à une société conventionnée est enregistrée comme créance (« Crédit ») et regroupée par nom dans les rapports.",
        ],
        link: { label: "Ouvrir Modes de paiement", href: "/parametres/paiements" },
      },
      {
        id: "charger-produits",
        title: "Charger les produits et le stock de départ",
        summary: "Sans produit ni lot en stock, la caisse ne peut rien vendre.",
        steps: [
          "Ajoutez vos produits un par un ou par import Excel : suivez le guide « Gestionnaire de stock ».",
          "Pour chaque produit, enregistrez au moins un lot avec sa quantité, sa date d’expiration, son prix d’achat et son prix de vente.",
          "Revenez au **Tableau de bord** : la liste « Démarrez votre pharmacie » se coche au fur et à mesure.",
        ],
        link: { label: "Ouvrir Produits", href: "/produits" },
      },
      {
        id: "abonnement",
        title: "Suivre et payer l’abonnement",
        summary:
          "Un abonnement expiré limite l’accès à la page Abonnement jusqu’au paiement.",
        steps: [
          "Ouvrez **Paramètres > Abonnement** pour voir les jours restants.",
          "Payez par l’un des **Moyens de paiement** de la plateforme indiqués sur la page.",
          "Revenez déclarer votre paiement avec le formulaire de déclaration, puis attendez la validation.",
        ],
        tips: [
          "Un message vous prévient dans le menu quand il reste 7 jours ou moins.",
        ],
        link: { label: "Ouvrir Abonnement", href: "/abonnement" },
      },
    ],
  },
  {
    id: "gerant",
    title: "Gérant et propriétaire",
    tab: "Gérant",
    subtitle: "Piloter l’activité, l’équipe et les chiffres au quotidien.",
    tasks: [
      {
        id: "tableau-bord",
        title: "Lire le tableau de bord",
        summary: "En un coup d’œil : ventes du jour, stock à surveiller, expirations.",
        steps: [
          "Ouvrez **Tableau de bord** : les **Ventes du jour** montrent le chiffre d’affaires et la variation par rapport à hier.",
          "**Nombre de ventes** compare avec la veille ; le graphique montre les 7 derniers jours.",
          "**À réapprovisionner** liste les produits en rupture ou sous leur seuil.",
          "**Lots à surveiller** et **Alertes expiration** signalent les lots proches de la péremption.",
          "Cliquez sur un raccourci (Caisse, Produits, Stock…) pour aller directement à l’action.",
        ],
        link: { label: "Ouvrir le tableau de bord", href: "/dashboard" },
      },
      {
        id: "gerer-utilisateurs",
        title: "Gérer les accès de l’équipe",
        summary: "Ajouter, bloquer ou dépanner un compte.",
        steps: [
          "Ouvrez **Paramètres > Utilisateurs de ma pharmacie**.",
          "Pour un nouvel employé : email, téléphone, **Mot de passe temporaire**, rôle, puis **Ajouter**.",
          "Si quelqu’un oublie son mot de passe : cliquez sur **Réinitialiser** sur sa ligne et donnez-lui le nouveau mot de passe temporaire.",
          "Si quelqu’un quitte la pharmacie : cliquez sur **Désactiver** sur sa ligne, il ne pourra plus accéder à la pharmacie.",
        ],
        link: { label: "Ouvrir Utilisateurs", href: "/parametres/utilisateurs" },
      },
      {
        id: "finances",
        title: "Suivre les finances d’une période",
        summary: "Recettes, coûts, marge, dépenses et résultat estimé.",
        steps: [
          "Ouvrez **Finances**.",
          "Choisissez la période : **Aujourd’hui**, **Cette semaine**, **Ce mois** ou **Personnalisé** (dates de début et de fin).",
          "Lisez les cartes : recettes, coût des produits, marge brute, dépenses, **Trousse de secours** et résultat estimé.",
          "Descendez pour voir le rapport des ventes par mode de paiement et la liste des dépenses.",
          "Cliquez sur **Rapport PDF** pour obtenir le rapport sur papier ou en PDF.",
        ],
        tips: [
          "Les prélèvements de la trousse de secours sont comptés comme un coût et diminuent le résultat estimé.",
        ],
        link: { label: "Ouvrir Finances", href: "/finances" },
      },
      {
        id: "depense",
        title: "Enregistrer une dépense",
        summary: "Loyer, électricité, transport… pour que le résultat soit juste.",
        steps: [
          "Dans **Finances**, cliquez sur **Ajouter une dépense**.",
          "Renseignez **Catégorie**, **Montant**, **Devise**, **Mode de paiement** et **Date**.",
          "Ajoutez une **Description** puis enregistrez.",
        ],
        link: { label: "Ouvrir Finances", href: "/finances" },
      },
      {
        id: "inventaire-gerant",
        title: "Faire et imprimer l’inventaire",
        summary: "La situation du stock et sa valeur, par période et par filtre.",
        steps: [
          "Ouvrez **Inventaire**.",
          "Choisissez la période : **Situation actuelle**, **Ce mois**, **Mois dernier**, **30 derniers jours**, **3 derniers mois** ou **Personnalisée**.",
          "Filtrez si besoin : catégorie, type / forme, fournisseur, stock, expiration, ordonnance, ou seulement les produits mouvementés.",
          "Lisez les indicateurs : quantité en stock, valeur d’achat, valeur de vente, marge potentielle, ruptures.",
          "Cliquez sur **Imprimer** pour un document A4 avec le logo, les totaux et les zones de signature, ou sur **Excel** pour l’exporter.",
        ],
        tips: [
          "La valeur est calculée au prix moyen des lots actuellement en stock.",
          "Un « stock de début négatif » signale des mouvements manquants : vérifiez ces produits avant d’imprimer.",
        ],
        link: { label: "Ouvrir Inventaire", href: "/inventaire" },
      },
      {
        id: "devise",
        title: "Afficher les montants en dollars ou en euros",
        summary: "Pratique pour comparer ou présenter les chiffres.",
        steps: [
          "Cliquez sur le bouton **CDF / USD / EUR** en haut de l’écran (dans le menu sur téléphone).",
          "Tous les montants affichés sont convertis avec les taux de la pharmacie ; les données restent en CDF.",
          "La facture A4 imprimée précise le taux utilisé. Les tickets thermiques restent en CDF.",
        ],
      },
      {
        id: "ouverture",
        title: "Indiquer si la pharmacie est ouverte",
        summary: "Le public voit les pharmacies ouvertes sur le site.",
        steps: [
          "Cliquez sur la pastille d’ouverture en haut de l’écran, ou ouvrez la page **Pharmacies**.",
          "Choisissez **Auto** (statut automatique), **Ouverte** ou **Fermée** pour forcer le statut.",
        ],
        link: { label: "Ouvrir Pharmacies", href: "/pharmacies" },
      },
      {
        id: "trousse-gerant",
        title: "Suivre la trousse de secours",
        summary: "Les produits pris pendant les gardes, avec leur coût.",
        steps: [
          "Ouvrez **Trousse de secours**.",
          "Choisissez la période : les indicateurs comparent avec la période précédente.",
          "Consultez les produits les plus prélevés, le coût par médecin ou demandeur, et par service ou garde.",
          "En cas d’erreur de saisie, ouvrez le prélèvement dans l’historique et choisissez **Annuler et remettre en stock**.",
        ],
        link: { label: "Ouvrir la trousse", href: "/trousse" },
      },
    ],
  },
  {
    id: "pharmacien",
    title: "Pharmacien",
    tab: "Pharmacien",
    subtitle: "Dispensation, contrôle des péremptions et corrections de fiches.",
    tasks: [
      {
        id: "ordonnance",
        title: "Vendre un médicament sur ordonnance",
        summary: "Le système vous demande de vérifier l’ordonnance avant d’encaisser.",
        steps: [
          "Dans la **Caisse**, repérez les produits marqués **Ordonnance** et ajoutez-les au panier.",
          "Le panier affiche un avertissement rouge.",
          "Cliquez sur **Encaisser** : une fenêtre liste les produits concernés et demande si l’ordonnance a été vérifiée.",
          "Confirmez seulement après vérification ; sinon annulez et la vente n’est pas enregistrée.",
        ],
        link: { label: "Ouvrir la caisse", href: "/ventes" },
      },
      {
        id: "expirations",
        title: "Surveiller et retirer les lots périmés",
        summary: "Éviter de vendre ou de garder des produits périmés.",
        steps: [
          "Ouvrez **Expirations**.",
          "Filtrez avec **Expirés**, **≤ 30 jours**, **≤ 60 jours** ou **≤ 90 jours**.",
          "Pour un lot à écarter, cliquez sur **Retirer** puis confirmez : le lot n’est plus proposé à la vente.",
        ],
        tips: [
          "Avec **Bloquer les ventes expirées** activé dans les paramètres, la caisse ignore déjà les lots périmés.",
        ],
        link: { label: "Ouvrir Expirations", href: "/expirations" },
      },
      {
        id: "modifier-produit",
        title: "Corriger un produit enregistré par erreur",
        summary: "Faute dans le nom, mauvais dosage, mauvaise option.",
        steps: [
          "Ouvrez **Produits** et trouvez le produit (recherche ou filtres).",
          "Cliquez sur le menu **⋯** de sa ligne, puis **Modifier le produit** (sur téléphone : bouton **Modifier le produit** de la carte).",
          "Corrigez le nom, la DCI, le dosage, la forme, l’unité, le code-barres, la catégorie, le fournisseur, le seuil, l’ordonnance ou la TVA.",
          "Cliquez sur **Enregistrer**.",
        ],
        tips: [
          "Les prix et les quantités se gèrent dans les lots : ils ne changent pas ici.",
          "Les anciennes factures gardent le nom qu’avait le produit à la vente.",
        ],
        link: { label: "Ouvrir Produits", href: "/produits" },
      },
      {
        id: "inventaire-pharmacien",
        title: "Établir l’inventaire des médicaments",
        summary: "État du stock par produit, imprimable pour le contrôle.",
        steps: [
          "Ouvrez **Inventaire** et choisissez la période (**Situation actuelle** pour l’état du jour).",
          "Filtrez par catégorie, type / forme, stock, expiration ou ordonnance.",
          "Vérifiez les lignes en rupture, en stock faible ou avec des quantités périmées.",
          "Cliquez sur **Imprimer** : le document porte le logo et un espace pour votre signature.",
        ],
        link: { label: "Ouvrir Inventaire", href: "/inventaire" },
      },
      {
        id: "trousse-prelevement",
        title: "Enregistrer un prélèvement de trousse de secours",
        summary: "Quand un médecin prend des produits pendant une garde.",
        steps: [
          "Ouvrez **Trousse de secours** puis **Nouveau prélèvement**.",
          "Indiquez le demandeur (médecin), le service ou la garde et le motif.",
          "Recherchez chaque produit et réglez la quantité avec **+** et **-**.",
          "Cliquez sur **Enregistrer le prélèvement** : les quantités sortent du stock (lots les plus proches de l’expiration d’abord) et comptent dans le coût de la trousse.",
        ],
        link: { label: "Ouvrir la trousse", href: "/trousse" },
      },
      {
        id: "stock-voisin",
        title: "Trouver un produit chez une pharmacie voisine",
        summary: "Quand un produit est en rupture chez vous.",
        steps: [
          "Ouvrez **Stock voisin**.",
          "À l’**Étape 1**, recherchez et choisissez le produit.",
          "Les pharmacies proches qui l’ont s’affichent (même quartier, même commune, même ville).",
          "Appelez, écrivez sur WhatsApp ou envoyez une demande à la pharmacie choisie.",
        ],
        link: { label: "Ouvrir Stock voisin", href: "/stock-voisin" },
      },
    ],
  },
  {
    id: "stock",
    title: "Gestionnaire de stock",
    tab: "Stock",
    subtitle: "Produits, réceptions, corrections et historique des mouvements.",
    tasks: [
      {
        id: "ajouter-produit",
        title: "Ajouter un nouveau produit",
        summary: "Création de la fiche et du premier lot en une fois.",
        steps: [
          "Ouvrez **Produits** et cliquez sur **Ajouter un produit**.",
          "Recherchez le produit dans le catalogue ACOREP et sélectionnez-le. S’il n’y est pas (lingettes, savon…), cliquez sur **Hors catalogue** et remplissez la fiche à la main.",
          "Dans **Code-barres**, scannez avec votre lecteur (cliquez dans le champ puis scannez) ou touchez **Scanner** pour utiliser la caméra.",
          "Choisissez la catégorie, le fournisseur et le seuil de stock minimum.",
          "Renseignez le premier lot : numéro de lot, date d’expiration, prix d’achat, quantité. Le prix de vente est proposé selon l’indice de prix automatique.",
          "Cliquez sur **Enregistrer**.",
        ],
        tips: [
          "Un produit identique déjà enregistré est refusé pour éviter les doublons.",
        ],
        link: { label: "Ouvrir Produits", href: "/produits" },
      },
      {
        id: "import-excel",
        title: "Importer plusieurs produits depuis Excel",
        summary: "Gagner du temps pour un catalogue de départ.",
        steps: [
          "Dans **Produits**, cliquez sur **Modèle Excel** pour télécharger le fichier à remplir.",
          "Remplissez une ligne par produit sans changer les titres de colonnes.",
          "Cliquez sur **Importer Excel** et choisissez votre fichier.",
          "Vérifiez le résultat dans la liste. **Exporter Excel** vous donne la liste actuelle.",
        ],
        link: { label: "Ouvrir Produits", href: "/produits" },
      },
      {
        id: "modifier-produit-stock",
        title: "Modifier un produit après enregistrement",
        summary: "Corriger une erreur de nom ou d’option.",
        steps: [
          "Dans **Produits**, cliquez sur le menu **⋯** de la ligne puis **Modifier le produit**.",
          "Corrigez les champs puis **Enregistrer**.",
          "Pour retirer un produit sans le supprimer, utilisez **Désactiver** ou **Archiver** dans le même menu ; **Supprimer** n’est possible que s’il n’a ni lot, ni vente, ni mouvement.",
        ],
        link: { label: "Ouvrir Produits", href: "/produits" },
      },
      {
        id: "entree-stock",
        title: "Enregistrer une réception de marchandise",
        summary: "Ajouter un lot reçu d’un fournisseur.",
        steps: [
          "Ouvrez **Stock** et cliquez sur **Entrée stock**.",
          "Choisissez le **Produit** et le **Fournisseur**.",
          "Saisissez le **Numéro de lot**, la **Date d’expiration**, le **Prix d’achat**, le **Prix de vente** et la **Quantité**.",
          "Ajustez le **Motif** si besoin puis enregistrez.",
        ],
        tips: [
          "Vous pouvez aussi utiliser **Ajouter lot** directement sur la ligne du produit dans **Produits**.",
          "Un mouvement « Entrée » est enregistré automatiquement dans l’historique.",
        ],
        link: { label: "Ouvrir Stock", href: "/stock" },
      },
      {
        id: "correction",
        title: "Corriger une quantité après comptage",
        summary: "Quand le stock réel ne correspond pas à l’écran.",
        steps: [
          "Comptez physiquement le lot.",
          "Dans **Stock > Lots en stock**, trouvez le lot et cliquez sur **Corriger quantité**.",
          "Saisissez la **Nouvelle quantité** réelle et gardez ou changez le motif (« Correction inventaire »).",
          "Enregistrez : la correction apparaît dans l’historique avec votre nom.",
        ],
        link: { label: "Ouvrir Stock", href: "/stock" },
      },
      {
        id: "historique-impression",
        title: "Consulter et imprimer l’historique des mouvements",
        summary: "Qui a fait entrer ou sortir quoi, et quand.",
        steps: [
          "Dans **Stock**, descendez à **Historique des mouvements**.",
          "Filtrez par **Type de mouvement**, par dates (**Date du** / **Date au**) ou avec la recherche (produit, lot, utilisateur).",
          "Cliquez sur **Imprimer** : le document reprend tous les mouvements filtrés, avec le logo, le total des entrées et des sorties.",
        ],
        link: { label: "Ouvrir Stock", href: "/stock" },
      },
      {
        id: "inventaire-stock",
        title: "Préparer un inventaire",
        summary: "Situation complète du stock avec sa valeur.",
        steps: [
          "Ouvrez **Inventaire** (accessible au propriétaire, au gérant et au pharmacien : si vous n’y avez pas accès, demandez-leur l’impression).",
          "Choisissez la période et les filtres, puis **Imprimer**.",
          "Comparez avec votre comptage physique et corrigez les écarts avec **Corriger quantité**.",
        ],
        link: { label: "Ouvrir Inventaire", href: "/inventaire" },
      },
      {
        id: "reapprovisionner",
        title: "Anticiper les ruptures",
        summary: "Réapprovisionner avant que le produit manque.",
        steps: [
          "Renseignez un **seuil de stock minimum** réaliste dans la fiche de chaque produit.",
          "Consultez chaque jour la carte **À réapprovisionner** du **Tableau de bord**.",
          "Passez la commande au fournisseur puis enregistrez la réception avec **Entrée stock**.",
        ],
        link: { label: "Ouvrir le tableau de bord", href: "/dashboard" },
      },
    ],
  },
  {
    id: "vente",
    title: "Vente et caisse",
    tab: "Vente",
    subtitle: "Encaisser vite, même sans internet.",
    tasks: [
      {
        id: "faire-vente",
        title: "Faire une vente",
        summary: "De la recherche du produit à la facture.",
        steps: [
          "Ouvrez **Caisse**.",
          "Cherchez le produit dans la barre de recherche ou choisissez une catégorie, puis touchez la tuile du produit : il s’ajoute au panier (chaque touche ajoute une unité).",
          "Sur téléphone, touchez **Voir le panier** en bas de l’écran ; sur ordinateur le panier est à droite.",
          "Ajustez les quantités avec **+** et **-** ou en tapant le nombre.",
          "Choisissez le **Mode de paiement**.",
          "Touchez **Encaisser**. Une confirmation s’affiche.",
          "Touchez **Voir / imprimer la facture** ou **Nouvelle vente**.",
        ],
        tips: [
          "Un produit grisé « Rupture » n’a plus de stock disponible.",
          "Le total est toujours affiché en gros, juste au-dessus du bouton **Encaisser**.",
        ],
        link: { label: "Ouvrir la caisse", href: "/ventes" },
      },
      {
        id: "scanner",
        title: "Vendre avec le lecteur de code-barres",
        summary: "Plus rapide que la recherche au clavier.",
        steps: [
          "Cliquez dans la barre de recherche de la caisse.",
          "Scannez le code-barres du produit avec le lecteur : le produit est ajouté au panier tout de suite.",
          "Recommencez pour chaque produit.",
        ],
        tips: [
          "Si le code-barres n’est pas reconnu, le produit n’a peut-être pas de code dans sa fiche : demandez au gestionnaire de stock de l’ajouter.",
        ],
        link: { label: "Ouvrir la caisse", href: "/ventes" },
      },
      {
        id: "remise-client",
        title: "Ajouter un client, une remise ou une note",
        summary: "Pour une facture au nom du client ou une réduction.",
        steps: [
          "Dans le panier, ouvrez la zone **Client, remise, note**.",
          "Saisissez le **Client optionnel**, la **Remise (CDF)** et une **Note optionnelle**.",
          "Le total est recalculé ; continuez avec **Encaisser**.",
        ],
        link: { label: "Ouvrir la caisse", href: "/ventes" },
      },
      {
        id: "paiements",
        title: "Choisir le bon mode de paiement",
        summary: "Cash, mobile money, carte, crédit ou société conventionnée.",
        steps: [
          "Dans le panier, ouvrez la liste **Mode de paiement**.",
          "Choisissez **Cash CDF**, **Cash USD** (l’équivalent en dollars s’affiche), **Mobile Money**, **Carte**, **Crédit client** ou **Paiement mixte**.",
          "Pour un client d’une société conventionnée, choisissez son nom dans le groupe **Sociétés et autres modes**.",
        ],
        tips: [
          "Les sociétés conventionnées se configurent dans Paramètres > Modes de paiement (gérant).",
        ],
        link: { label: "Ouvrir la caisse", href: "/ventes" },
      },
      {
        id: "devise-caisse",
        title: "Montrer les prix en dollars ou en euros",
        summary: "Quand un client demande le prix dans une autre devise.",
        steps: [
          "Dans la **Caisse**, touchez **USD** ou **EUR** à côté de « Devise d’affichage ».",
          "Les prix et le total sont convertis. Touchez **CDF** pour revenir.",
        ],
        tips: [
          "La vente reste enregistrée en CDF. Le bouton ne change que l’affichage.",
          "Si USD ou EUR est grisé, le gérant doit renseigner le taux dans Paramètres.",
        ],
        link: { label: "Ouvrir la caisse", href: "/ventes" },
      },
      {
        id: "imprimer-facture",
        title: "Imprimer une facture ou un ticket",
        summary: "Après la vente, ou plus tard depuis la liste des factures.",
        steps: [
          "Après l’encaissement, touchez **Voir / imprimer la facture**. Plus tard, ouvrez **Factures** et choisissez la facture.",
          "Sur la page de la facture, choisissez **Imprimer le ticket** pour une imprimante de caisse, ou **Facture A4** pour une impression classique.",
          "Sur un terminal Android, **Ticket PNG Android** envoie le ticket à l’application d’impression du terminal.",
        ],
        link: { label: "Ouvrir Factures", href: "/factures" },
      },
      {
        id: "hors-ligne",
        title: "Vendre sans internet",
        summary: "La caisse continue de fonctionner et enregistre les ventes sur le terminal.",
        steps: [
          "Avant la coupure, quand vous avez internet : cliquez sur **Synchroniser produits** pour mettre les produits sur le terminal.",
          "Si la connexion tombe, la caisse affiche **Mode hors-ligne** : vendez normalement, le bouton devient **Enregistrer hors-ligne**.",
          "Vous recevez un ticket provisoire pour chaque vente.",
          "Dès que la connexion revient, cliquez sur **Synchroniser ventes** pour envoyer les ventes au serveur.",
        ],
        tips: [
          "Ne vous déconnectez pas du compte tant que des ventes hors-ligne sont en attente.",
          "La page **Synchronisation** liste les ventes en attente et leur état.",
        ],
        link: { label: "Ouvrir Synchronisation", href: "/synchronisation" },
      },
      {
        id: "annuler-locale",
        title: "Annuler une vente faite hors-ligne",
        summary: "Possible tant que la vente n’a pas été synchronisée.",
        steps: [
          "Ouvrez **Synchronisation**.",
          "Trouvez la vente en attente et cliquez sur **Annuler vente locale**, puis confirmez.",
        ],
        link: { label: "Ouvrir Synchronisation", href: "/synchronisation" },
      },
    ],
  },
  {
    id: "comptable",
    title: "Comptable",
    tab: "Comptable",
    subtitle: "Factures, finances et TVA.",
    tasks: [
      {
        id: "factures",
        title: "Consulter et imprimer les factures",
        summary: "Retrouver une vente, ses lignes et son mode de paiement.",
        steps: [
          "Ouvrez **Factures**.",
          "Filtrez avec la recherche, la période (**Aujourd’hui**, **Cette semaine**, **Ce mois**, **Personnalisée**) et le mode de paiement.",
          "Cliquez sur **Voir / Imprimer** pour ouvrir une facture, puis imprimez-la en **Facture A4**.",
          "**Imprimer / PDF** en haut de la liste imprime les factures filtrées avec les totaux.",
        ],
        link: { label: "Ouvrir Factures", href: "/factures" },
      },
      {
        id: "finances-compta",
        title: "Produire le rapport financier",
        summary: "Recettes, marge, dépenses et résultat sur une période.",
        steps: [
          "Ouvrez **Finances** et choisissez la période.",
          "Contrôlez les cartes puis la répartition par mode de paiement : les sociétés conventionnées apparaissent sous leur propre nom.",
          "Enregistrez les dépenses manquantes avec **Ajouter une dépense**.",
          "Imprimez le rapport avec **Rapport PDF**.",
        ],
        link: { label: "Ouvrir Finances", href: "/finances" },
      },
      {
        id: "tva",
        title: "Consulter le rapport TVA",
        summary: "TVA collectée sur les ventes de la période.",
        steps: [
          "Ouvrez **Rapport TVA** (sous Finances dans le menu).",
          "Choisissez la période et lisez les totaux hors taxes, TVA et toutes taxes comprises.",
          "Imprimez le rapport avec **Imprimer / PDF**.",
        ],
        link: { label: "Ouvrir Rapport TVA", href: "/finances/tva" },
      },
      {
        id: "devise-compta",
        title: "Présenter les montants en dollars ou en euros",
        summary: "Le bouton de devise convertit l’affichage et les impressions A4.",
        steps: [
          "Touchez **USD** ou **EUR** en haut de l’écran.",
          "Les rapports et la facture A4 sont alors convertis ; la facture mentionne le taux utilisé.",
        ],
      },
    ],
  },
  {
    id: "tous",
    title: "Pour tous",
    tab: "Pour tous",
    subtitle: "Astuces communes et dépannage.",
    tasks: [
      {
        id: "mon-compte",
        title: "Changer son mot de passe ou son profil",
        summary: "Chaque utilisateur gère son propre compte.",
        steps: [
          "Cliquez sur votre nom en haut à droite, puis **Modifier le profil** ou **Modifier le mot de passe** (ou ouvrez **Paramètres > Mon compte**).",
          "Modifiez le nom affiché, l’email ou le mot de passe et enregistrez.",
        ],
        link: { label: "Ouvrir Mon compte", href: "/compte" },
      },
      {
        id: "recherche-rapide",
        title: "Aller n’importe où avec la recherche rapide",
        summary: "Une page, un produit ou une facture en quelques lettres.",
        steps: [
          "Sur ordinateur, appuyez sur **Ctrl + K** (ou **Cmd + K** sur Mac). Sur téléphone, ouvrez le menu et touchez **Rechercher**.",
          "Tapez le nom d’une page, d’un produit ou un numéro de facture.",
          "Utilisez **↑ ↓** pour choisir, **Entrée** pour ouvrir, **Échap** pour fermer.",
        ],
      },
      {
        id: "mode-sombre",
        title: "Utiliser le mode sombre",
        summary: "Plus reposant pour les gardes de nuit.",
        steps: [
          "Cliquez sur l’icône lune / soleil en haut de l’écran (dans le menu sur téléphone, **Mode sombre**).",
          "Le choix est mémorisé sur cet appareil. Cliquez à nouveau pour revenir au mode clair.",
        ],
      },
      {
        id: "installer",
        title: "Installer l’application sur Android",
        summary: "Pour utiliser la caisse comme une vraie application.",
        steps: [
          "Ouvrez le site dans Chrome sur le terminal Android.",
          "Ajoutez-le à l’écran d’accueil (menu du navigateur) ou installez l’application fournie par Aksantic Technology.",
          "Ouvrez l’application, connectez-vous, puis touchez **Synchroniser produits** pour préparer le mode hors-ligne.",
        ],
      },
      {
        id: "depannage",
        title: "Que faire si… ?",
        summary: "Les problèmes les plus fréquents.",
        steps: [
          "**Un produit n’apparaît pas en caisse** : il n’a pas de stock disponible ou pas de prix de vente. Vérifiez ses lots dans Produits.",
          "**La vente d’un lot est refusée** : le lot est périmé ou a été retiré de la vente (voir Expirations).",
          "**Un message dit que l’abonnement est expiré** : le propriétaire ou le gérant doit régulariser dans Paramètres > Abonnement.",
          "**La page ne charge pas** : vérifiez la connexion, puis touchez le bouton d’actualisation. En caisse, le mode hors-ligne prend le relais.",
          "**Les ventes hors-ligne ne partent pas** : ouvrez Synchronisation et cliquez sur Synchroniser ventes une fois la connexion stable.",
          "**USD ou EUR est grisé** : le taux de change n’est pas renseigné dans Paramètres > Ma pharmacie.",
        ],
      },
      {
        id: "support",
        title: "Contacter le support",
        summary: "Une question que ce guide ne couvre pas.",
        steps: [
          "Écrivez à **aksantictech@gmail.com** ou sur WhatsApp au **+243 801 655 726**.",
          "Précisez votre pharmacie, la page concernée et le message affiché à l’écran.",
        ],
      },
    ],
  },
];

/** Guide ouvert par défaut selon le rôle de l'utilisateur. */
export function defaultGuideForRole(role?: string | null): HelpGuideId {
  switch (role) {
    case "owner":
    case "manager":
      return "gerant";
    case "pharmacist":
      return "pharmacien";
    case "stock_manager":
      return "stock";
    case "cashier":
      return "vente";
    case "accountant":
      return "comptable";
    default:
      return "tous";
  }
}
