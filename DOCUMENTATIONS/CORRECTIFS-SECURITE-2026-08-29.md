# Correctifs sécurité & impression — 29 août 2026

Base : `main` à `c26c0bc`.

## 1. Impression terminal Android (corrigé)

| Fichier | Changement |
|---|---|
| `src/lib/printing/receipt-image.ts` | Ticket rendu en **bitmap 58 mm** (384 px), noir pur binarisé, police à chasse fixe non grasse, sans lissage. Expose `dataUrl`. |
| `src/lib/printing/escpos-receipt.ts` *(nouveau)* | Flux **ESC/POS** portable (init, PC437, coupe), accents repliés ASCII. |
| `src/lib/print-invoice.ts` | `printThermalImagesInIsolatedFrame()` : impression du bitmap plein cadre dans un iframe isolé, sans CSS de l'app. |
| `src/services/native-thermal-printer.service.ts` | `printThermalReceiptViaRawBt()`, `canUseRawBtPrinting()`, `createThermalReceiptImages()`. |
| `src/app/(dashboard)/factures/[id]/page.tsx` | Nouveau flux + bouton « Impression directe (RawBT) » (Android sans pont natif). |
| `src/app/globals.css` | Conflit `@page` A4 ↔ 80 mm ↔ Arial supprimé, unifié 58 mm / Courier. |

Action terrain : installer **RawBT Print Service** sur le terminal et y configurer
l'imprimante interne. Recette matérielle IMP-01…IMP-10 à repasser.

## 2. Sécurité — correctifs de code appliqués

| ID | Fichier | Correctif |
|---|---|---|
| S2 | `next.config.ts` | **Content-Security-Policy** ajoutée (`default-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`, `connect-src` limité à l'origine + Supabase). `script-src` garde `'unsafe-inline'`/`'unsafe-eval'` (limite Next sans nonce) — à resserrer plus tard. |
| S3 | `src/lib/supabase/middleware.ts` | **Fail-closed** : sans config Supabase, les routes protégées redirigent vers `/connexion` au lieu d'être ouvertes. |
| S4 | `src/lib/http/request-security.ts` | `assertSameOriginRequest` durci (`Sec-Fetch-Site` = `same-origin`/`none` uniquement, repli `Referer`). Nouveau `assertSameOriginRead` pour les GET sensibles. |
| S4 | `src/app/api/pharmacy/products/export`, `pharmacy/national-products`, `admin/national-products`, `admin/national-products/filters` | Contrôle d'origine `assertSameOriginRead` sur les GET. Export marqué `Cache-Control: private, no-store`. Statuts d'erreur normalisés. |
| S5 | `api/*/national-products` | Filtre de recherche : neutralisation des caractères de syntaxe PostgREST `, ( ) * : \` + bornage 120 caractères, dans les deux routes. |
| S8 | `public/sw.js` | Handler `fetch` réduit à un passe-plat minimal (navigation, même origine) avec repli hors-ligne ; plus d'interception globale. |
| S10 | `src/app/manifest.ts` | Icônes **PNG 192/512 + maskable** référencées (avant : SVG uniquement → install WebAPK dégradée). |

Vérifs : `tsc` OK · ESLint (fichiers modifiés) OK · 13/13 tests · `next build` OK.

## 3. Sécurité — NON traité (hors code applicatif)

| ID | Raison |
|---|---|
| **S1** RLS / RPC Supabase multi-pharmacies | Le schéma, les policies RLS et les fonctions `SECURITY DEFINER` ne sont pas dans le dépôt. **À faire dans Supabase** : activer RLS sur toute table à `pharmacy_id`, auditer `search_path` des RPC, tests croisés A/B. C'est le risque P0. |
| **S6** Contrôle de rôle par page | Aujourd'hui uniquement côté client (`DashboardShell`). La vraie barrière reste la RLS (S1). Un garde serveur par page serait un refactor important. |
| S9 | Chiffrement IndexedDB au repos — nécessite MDM / verrouillage terminal. |
| S12 | Rate-limiting connexion — à activer sur Vercel/Supabase. |
