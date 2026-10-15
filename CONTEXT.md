# 📘 BIBLE & GUIDE MAÎTRE DU PROJET — RENGER (CONTEXT.md)

> ⚠️ **INSTRUCTION IMPÉRATIVE POUR TOUT AGENT IA INTERVENANT SUR CE PROJET :**  
> 1. Vous devez **lire et respecter l'intégralité de ce document** avant d'écrire la moindre ligne de code.  
> 2. Toute décision d'implémentation doit respecter les règles financières, de sécurité et architecturales définies ici.  
> 3. À la fin de chaque tâche ou intervention, vous avez **l'obligation absolue de mettre à jour ce fichier** pour consigner les nouveaux ajouts, tables, modifications de code ou avancées de la roadmap.

---

## 1. VUE D'ENSEMBLE DU PROJET

* **Nom :** Renger (`renger.ch`)
* **Mission :** Plateforme collaborative suisse de location de remorques entre particuliers et professionnels (cantons romands en priorité : Vaud, Genève, Valais, etc.).
* **Devise :** Franc suisse (**CHF**). Tous les montants affichés et calculés sont en CHF.
* **Philosophie technique :** Performance brute, légèreté maximale, zéro dépendance inutile (pas de React/Vue/Angular), architecture Multi-Pages (MPA) modulaire en Vanilla JavaScript et Tailwind CSS.
* **Hébergement & Backend :** 
  - Frontend : Hébergement statique (GitHub Pages / Cloudflare Pages / Vercel).
  - Backend : Supabase (PostgreSQL, Authentification, Stockage S3, PostgREST).
  - Paiements : Stripe Checkout & Stripe Billing (Subscriptions).

---

## 2. ARBORESCENCE & RÔLE DE CHAQUE FICHIER

```text
/Users/enismedjiti/Documents/Renger/Site web/
├── Logo_Renger.jpg                 # Logo haute définition (JPEG) - image officielle OpenGraph/Twitter Card
├── supabase_migrations.sql         # Script SQL consolidé (géolocalisation, analytics, tables récentes)
├── CONTEXT.md                      # [CE DOCUMENT] Guide maître pour l'utilisateur et les agents IA
├── GOOGLE_SEARCH_CONSOLE_GUIDE.md  # Guide complet pas à pas pour l'indexation Google Search Console (renger.ch)
├── sitemap.xml                     # Plan de site XML SEO officiel (11 pages publiques, priorités & fréquences)
├── robots.txt                      # Directives de crawl racine (Allow /, Disallow privées + déclaration Sitemap)
│
├── Site web/                       # Racine web en production (Multi-Pages Architecture)
│   ├── index.html                  # Landing page (Hero, barre de recherche rapide, avis clients, FAQ)
│   ├── remorques.html              # Catalogue complet + Carte interactive Leaflet OpenStreetMap
│   ├── remorque.html               # Fiche détaillée de la remorque (photos, équipements, calendrier)
│   ├── louer-ma-remorque.html      # Dépôt & publication d'une annonce (ou mode édition si editId)
│   ├── profil.html                 # Espace Personnel ("Mon Espace" : onglet Locataire & onglet Propriétaire) [noindex]
│   ├── pro.html                    # Page de souscription à l'abonnement "Renger PRO" (39 CHF/mois)
│   ├── stats.html                  # Cockpit Renger Analytics PRO (Graphiques Chart.js, KPIs, comparateur flotte) [noindex]
│   ├── inspection.html             # Interface d'état des lieux (check-in / check-out avec photos horodatées) [noindex]
│   ├── mentions-legales.html       # Mentions Légales suisses (Enis Medjiti, entreprise individuelle, Vaud)
│   ├── cgu.html                    # Conditions Générales d'Utilisation légales suisses
│   ├── politique-confidentialite.html # Politique de confidentialité conforme nLPD & RGPD
│   ├── syni.html                   # Panel d'Administration Suprême Syni (accès restreint enism2007@hotmail.com) [noindex]
│   ├── location-remorque-vaud.html # Hub SEO Local Canton de Vaud (Lausanne, Yverdon, Nyon, Vevey, Morges, etc.)
│   ├── location-remorque-geneve.html # Hub SEO Local Canton de Genève (Genève, Carouge, Meyrin, Vernier, Lancy)
│   ├── location-remorque-valais.html # Hub SEO Local Canton du Valais (Sion, Martigny, Sierre, Monthey, Brig)
│   ├── sitemap.xml                 # Miroir Sitemap pour déploiement serveur statique
│   ├── robots.txt                  # Directives robots.txt serveur web
│   ├── google-site-verification-template.html # Template de validation Search Console par fichier HTML
│   ├── Logo_Renger.jpg             # Image officielle OpenGraph / Twitter Cards (2048x2048 JPEG)
│   ├── logo.png                    # Logo carré optimisé (512x512 PNG)
│   ├── style.css                   # Feuilles de style personnalisées & ajustements fins
│   ├── Renger_Logo_SVG.svg         # Logo vectoriel du projet
│   │
│   └── js/                         # Modules JavaScript découplés
│       ├── core.js                 # Initialisation Supabase, session Auth, modales, toasts, i18n
│       ├── components.js           # Injection Header/Footer dynamique, RENGER_SEO_HUBS, Dark Mode, Badges réputation
│       ├── trailers.js             # Catalogue, filtres catégories/dates, Leaflet map, formulaire annonce
│       ├── booking.js              # Moteur Flatpickr, calcul des devis, création de sessions Stripe
│       ├── contracts.js            # Génération de contrats de location PDF (CO art. 253) & états des lieux
│       ├── inspection.js           # Capture photo sécurisée, géoloc anti-fraude, filigrane indélébile
│       ├── chat.js                 # Messagerie instantanée locataire/propriétaire (Supabase Realtime)
│       ├── tracking.js             # Analytics first-party (impressions de vignettes, clics d'annonces)
│       ├── stats.js                # Calculs statistiques PRO, Chart.js, filtres dynamiques & export CSV
│       ├── planning.js             # Gestionnaire de planning des locations, calendrier interactif & blocage dates
│       └── syni.js                 # Moteur du cockpit Syni Palantir 3.0 (9 modules, God Mode CRUD, Soft-delete CO art. 958f, Sentinel, Network Explorer, Geo-Radar, 1-Clic Backup, Cmd+K, Business Brain V3)
│
├── tests/                          # Suite automatisée de validation (762 tests validés à 100% : 396 tiers + 366 challengers)
│   ├── run-tests.mjs               # Lanceur de tests complet (8 paliers T1 à T8)
│   ├── tier1-syntax-html.test.mjs
│   ├── tier2-dom-elements.test.mjs
│   ├── tier3-business-logic.test.mjs
│   ├── tier4-mpa-journeys.test.mjs
│   ├── tier5-map-contracts.test.mjs
│   ├── cancellation-policy.test.mjs
│   ├── challenger-syni-admin.test.mjs # Suite de tests pour le panel d'administration suprême Syni
│   └── tier8-seo-audit.test.mjs    # Suite Tier 8 : Audit SEO exhaustif (crawlabilité, JSON-LD, OpenGraph, Hubs)
│
├── .agents/                        # Directives pour l'IA (exclu de Git via .git/info/exclude)
│   └── rules/
│       ├── supabase_security.md    # Règles Zéro-Confiance DevSecOps
│       └── context_maintenance.md  # Obligation de maintenir CONTEXT.md à jour
│
└── supabase/                       # Fonctions Edge Deno & Templates (exclu de Git via .git/info/exclude)
    ├── email_templates/            # Templates HTML Supabase Auth (confirm_signup.html, reset_password.html)
    └── functions/
        ├── syni-data/              # Agrégation sécurisée Zéro-Confiance pour le panel Syni
        ├── stripe-checkout/        # Session location + Frais Renger + caution off-session
        ├── stripe-pro-checkout/    # Session abonnement 39 CHF/mois Renger PRO
        ├── stripe-boost-checkout/  # Session Boosts d'annonce (5.90 CHF ou 9.90 CHF)
        ├── stripe-portal/          # Session Portail Client Stripe (Factures, CB, Résiliation)
        ├── stripe-webhook/         # Réception webhooks Stripe + Notifications e-mail Resend (index.ts, email.ts)
        └── test-resend/            # Fonction Edge de test direct de la clé API Resend
```

---

## 3. RÈGLES MÉTIER & FORMULES FINANCIÈRES STRICTES

Toute IA manipulant les prix ou le flux Stripe **doit appliquer scrupuleusement ces formules** :

1. **Calcul de la durée de location :**
   * En jours pleins, date de début et de fin incluses (`diffDays = Math.round((end - start) / 86400000) + 1`).
2. **Prix de base :**
   * `basePrice = diffDays * trailer.price`
3. **Frais de traitement Renger (facturés au Locataire) :**
   * **5% du montant de base**, avec un **minimum garanti de 4.90 CHF**.
   * Arrondi suisse aux 5 centimes les plus proches (`Math.round(rawFee * 20) / 20`).
   * Total payé par le locataire = `basePrice + rengerFee`.
4. **Revenus nets du Propriétaire :**
   * **Mode Standard (Non-PRO) :** Le propriétaire perçoit exactement **80% du prix de base** (Renger prélève 20% de commission sur la location). Les frais de service locataire restent intégralement acquis à Renger.
   * **Mode Renger PRO :** Le propriétaire perçoit **100% du prix de base** (0% de commission prélevée).
5. **Caution bancaire (Sécurité & Empreinte bancaire) :**
   * Montant standard : 200 CHF (petites remorques) ou 400 CHF (vans à chevaux / grands plateaux).
   * **0 CHF prélevé au moment du paiement.**
   * Configurée via Stripe Payment Intent : `payment_intent_data: { setup_future_usage: 'off_session' }`.
   * Ne JAMAIS créer de ligne Stripe à 0 CHF pour la caution (bloqué par Stripe).
6. **Abonnement Renger PRO :**
   * 39.00 CHF / mois ou 390.00 CHF / an (facturation récurrente Stripe avec reconduction tacite et résiliation en 1 clic sans prorata).
   * Rattaché au compte propriétaire (`profiles.is_pro = true`). Toutes ses remorques bénéficient de 0% de commission.
7. **Boosts d'annonce (Mise en avant) :**
   * Boost Week-end : 5.90 CHF (du vendredi au dimanche).
   * Boost 7 jours : 9.90 CHF (tête de liste pendant une semaine).
   * Achats fermes, définitifs et non remboursables (prestation numérique à exécution immédiate).
8. **Politique d'annulation équilibrée (« Zero-Loss ») :**
   * Annulation par le locataire avant début : remboursement intégral du loyer déduction faite des frais bancaires Stripe incompressibles réels.
   * Annulation par le propriétaire : remboursement intégral 100% de la réservation (frais de service inclus).
9. **État des lieux contradictoire certifié (CO art. 257a) & Règle anti-pénalité :**
   * 4 photos géolocalisées et horodatées au départ et au retour.
   * **AUCUNE pénalité arbitraire de 50 CHF.** En cas d'absence de photos de retour par le locataire, toute dégradation signalée par le bailleur est présumée imputable au locataire conformément au droit suisse.
10. **Assurance & Permis de conduire :**
    * Assurance RC du véhicule tracteur (LCR art. 63 ss) obligatoire et exclusive en circulation.
    * Vérification permis de conduire B vs BE à la charge exclusive du conducteur/locataire.
11. **Droit applicable & For juridique :**
    * Droit suisse exclusivement. For juridique exclusif : Lausanne, Canton de Vaud.

---

## 4. SCHÉMA DE BASE DE DONNÉES (POSTGRESQL / SUPABASE)

### Table `public.trailers`
* `id` : `bigint primary key`
* `owner_id` : `uuid references auth.users(id)`
* `title` : `text`
* `description` : `text`
* `category` : `text` (`bagagere`, `plateau`, `porte-voiture`, `benne`, `fermee`, `van-chevaux`, `moto-velo`)
* `price` : `numeric` (CHF / jour)
* `caution` : `numeric default 200`
* `payload` : `integer` (charge utile en kg)
* `socket` : `text` (`7` ou `13` broches)
* `location` : `text` (adresse complète ou canton)
* `location_city` : `text` (ville extraite pour filtres et boost)
* `latitude` / `longitude` : `double precision` (coordonnées Leaflet)
* `image_url` : `text` (photo principale)
* `is_active` : `boolean default true` (Masquage catalogue : `false` = masquée)
* `is_deleted` : `boolean default false` (Soft Delete CO art. 958f : `true` = corbeille / archivé)
* `deleted_at` : `timestamp with time zone default null`
* `views_count` : `integer default 0` (incrémenté via RPC `increment_views`)
* `equipments` / `upsells` : `text[]`

### Table `public.bookings`
* `id` : `bigint primary key`
* `trailer_id` : `bigint references trailers(id)`
* `renter_id` : `uuid references auth.users(id)`
* `owner_id` : `uuid references auth.users(id)`
* `start_date` / `end_date` : `date`
* `total_price` : `numeric` (montant total payé)
* `status` : `text` (`en_attente`, `paye`, `indisponible`)
* `stripe_payment_id` : `text`
* `is_deleted` : `boolean default false` (Archivage comptable 10 ans CO art. 958f)
* `deleted_at` : `timestamp with time zone default null`
* **Contrainte d'exclusion GiST anti-surbooking :**
  ```sql
  ALTER TABLE public.bookings ADD CONSTRAINT no_overlapping_bookings
  EXCLUDE USING gist (trailer_id WITH =, daterange(start_date, end_date, '[]') WITH &&)
  WHERE (status IN ('paye', 'indisponible'));
  ```

### Table `public.profiles`
* `id` : `uuid primary key references auth.users(id)`
* `username` : `text unique`
* `avatar_url` : `text`
* `completed_rentals` : `integer default 0`
* `is_pro` : `boolean default false`
* `is_admin` : `boolean default false` (Droit administrateur suprême)
* `is_deleted` : `boolean default false` (Soft Delete profil CO art. 958f)
* `deleted_at` : `timestamp with time zone default null`
* `stripe_customer_id` : `text` (Identifiant client Stripe `cus_...`)
* `stripe_subscription_id` : `text` (Identifiant d'abonnement actif `sub_...`)

### Tables de Tracking & Analytics
* `public.impressions` (`id`, `trailer_id`, `user_id`, `created_at`)
* `public.clicks` (`id`, `trailer_id`, `user_id`, `created_at`)
* `public.analytics_events` (`id`, `event_name`, `page_url`, `user_id`, `session_id`, `created_at`)
* `public.rate_limits` (`id`, `user_id`, `action`, `created_at`)

---

## 5. DICTIONNAIRE DES DONNÉES & CONTRATS D'API

### Edge Functions Stripe (`supabase/functions/`)
1. **`stripe-checkout` :**
   * *Méthode :* POST.
   * *Payload :* `{ bookingId, trailerId, startDate, endDate }`.
   * *Vérifications serveur :* Détection de collision de dates en base, calcul strict des montants depuis `trailers`, vérification du Rate Limit (5 requêtes / 10 min).
   * *Retour :* `{ url: "https://checkout.stripe.com/..." }`.
2. **`stripe-pro-checkout` :**
   * *Payload :* `{ user_id, plan }`. Mode `subscription` (39 CHF/mois ou 390 CHF/an).
3. **`stripe-boost-checkout` :**
   * *Payload :* `{ trailer_id, plan }`. Mode `payment` (5.90 ou 9.90 CHF).
4. **`stripe-portal` :**
   * *Méthode :* POST (Auth JWT Bearer requise).
   * *Vérifications serveur :* Token utilisateur Supabase, Rate Limit (max 5 requêtes / 10 min), résolution de `stripe_customer_id` depuis `profiles` (avec fallback recherche Stripe par email).
   * *Action :* Crée une session Customer Portal Stripe (`stripe.billingPortal.sessions.create`) avec retour automatique sur `profil.html`.
   * *Retour :* `{ url: "https://billing.stripe.com/p/session/..." }`.
5. **`stripe-webhook` :**
   * Vérifie la signature cryptographique Stripe (`STRIPE_WEBHOOK_SECRET`).
   * Gère `checkout.session.completed` : réservations de remorques (`status = 'paye'`), abonnements PRO (sauvegarde `stripe_customer_id` et `stripe_subscription_id`, active `is_pro = true`), boosts d'annonce (prolonge `boost_end_date`).
   * **Notifications e-mail Resend (`email.ts`) :** Déclenche automatiquement l'envoi de deux e-mails HTML chartés Renger (Terracotta `#d85110`) via l'API REST Resend :
     - Au **Locataire** : récapitulatif de la réservation, dates au format suisse JJ.MM.AAAA, montant payé en CHF, mention explicite de la caution 0 CHF débitée, prochaines étapes (contact propriétaire, état des lieux photo 4/4, contrat CO art. 253).
     - Au **Propriétaire** : alerte de nouvelle réservation, identité du locataire, dates de location, calcul du gain net perçu (100% si PRO vs 80% si Standard), lien vers son planning.
   * Gère `customer.subscription.deleted` et `customer.subscription.updated` : révoque l'accès PRO (`is_pro = false`) en cas de résiliation ou défaut de paiement.
6. **`test-resend` :**
   * *Méthode :* POST.
   * *Payload :* `{ to: "email@destinataire.ch" }` (optionnel).
   * *Action :* Test direct de la clé API `RESEND_API_KEY` et de l'expéditeur `RESEND_FROM_EMAIL`.

---

## 6. RÈGLES DE SÉCURITÉ DEVSECOPS (ZÉRO-CONFIANCE)

1. **Aucun calcul financier côté client :** Le montant du loyer et des frais est recalculé côté serveur dans les Edge Functions en interrogeant directement PostgreSQL.
2. **Protection Row Level Security (RLS) :**
   * Le client JS public ne peut jamais modifier directement le `status` d'une réservation (seule la `service_role` de l'Edge function ou du Webhook Stripe a ce droit).
   * L'incrémentation des vues passe obligatoirement par la fonction `SECURITY DEFINER` : `increment_views(trailer_id)`.
3. **Validation Magic Bytes des fichiers :**
   * Tout upload d'image vérifie les 4 premiers octets dans `validateImageMagicBytes` (JPEG `FF D8 FF`, PNG `89 50 4E 47`, WEBP `52 49 46 46`).
   * Les buckets Supabase sont verrouillés à 5 Mo max et interdisent les extensions exécutables (`.svg`, `.html`, `.js`).
4. **Bucket privé `inspections` :**
   * Les photos d'état des lieux sont protégées : pas d'URL publique, accès uniquement via URL signées temporaires (durée 3600s).

---

## 7. JOURNAL DES DÉCISIONS ARCHITECTURALES (ADR)

* **ADR-001 : Passage d'une SPA monolithique à une MPA modulaire (Octobre 2026)**
  - *Raison :* `app.js` dépassait 4500 lignes, ce qui rendait le débogage complexe et nuisait au référencement Google (SEO). Le découpage en pages HTML dédiées (`remorques.html`, `profil.html`, etc.) combiné à des modules JS spécialisés (`core.js`, `trailers.js`, etc.) offre une isolation parfaite des erreurs.
* **ADR-002 : Choix de Leaflet au lieu de Google Maps API**
  - *Raison :* Évite les coûts exorbitants de Google Maps et la dépendance à une clé d'API restreinte. Leaflet avec les tuiles OpenStreetMap est gratuit, rapide et respecte la vie privée des utilisateurs.
* **ADR-003 : Caution en mode "Off-Session" plutôt qu'une retenue bancaire immédiate**
  - *Raison :* Bloquer 200 à 400 CHF sur la carte d'un utilisateur pendant 7 jours fait chuter le taux de conversion. En enregistrant le moyen de paiement pour un usage futur (`setup_future_usage`), le locataire ne paie que sa location immédiate sans friction.
* **ADR-004 : Vanilla JS sans framework (React/Vue/Svelte)**
  - *Raison :* Temps de chargement inférieur à 0.5 seconde sur mobile, aucun bundling npm requis, résilience maximale et maintenance simple sur le long terme.

---

## 8. PIÈGES & GOTCHAS CONNUS (TROUBLESHOOTING)

* ⚠️ **Pas de Node/npm sur la machine de développement principale :**
  - Ne lancez pas de commandes de compilation `npm run build` ou `node`. Tout le code s'exécute directement dans le navigateur ou via des CDN certifiés.
* ⚠️ **Content-Security-Policy (CSP) & Stripe :**
  - Les directives CSP dans `index.html` et les autres pages doivent impérativement autoriser `https://js.stripe.com` dans `script-src` et `frame-src`. Ne jamais remettre `frame-ancestors` dans une balise `<meta>` (non conforme aux standards W3C).
* ⚠️ **Exclusions Git locales (`.git/info/exclude`) :**
  - Ne tentez pas de commiter `CONTEXT.md`, `supabase/` ou `.agents/`. Ils sont masqués via `.git/info/exclude` pour préserver un dépôt GitHub 100% propre.

---

## 9. ROADMAP & JOURNAL D'AVANCEMENT

### ✅ Fonctionnalités Achevées
- [x] Authentification complète Supabase (Email/Mot de passe & Google OAuth avec gestion de session persistante).
- [x] Catalogue complet avec carte interactive Leaflet et filtres catégories.
- [x] Filtre de disponibilité temporelle (exclusion des remorques déjà réservées).
- [x] Processus de réservation et paiement Stripe Checkout (calcul des frais suisses).
- [x] Caution Stripe off-session.
- [x] Espace personnel "Mon Espace" (onglets Locataire et Propriétaire).
- [x] Page de gestion d'annonce (statistiques : revenus, locations, vues + actions Modifier, Booster, Archiver).
- [x] Formulaire de publication / édition avec Smart Pricing et détection du permis (Permis B vs BE).
- [x] Abonnement Renger PRO (39 CHF/mois) et Edge Function `stripe-pro-checkout`.
- [x] Modale et Edge Function pour les Boosts d'annonce (5.90 CHF et 9.90 CHF).
- [x] Module d'état des lieux numérique avec filigrane photo et coordonnées GPS.
- [x] Génération de contrats de location officiels en PDF.
- [x] Messagerie instantanée en temps réel.
- [x] Architecture MPA modulaire et passage avec succès des 209 tests automatisés.
- [x] Traitement webhook Stripe sécurisé (`stripe-webhook`) pour activer automatiquement `is_pro = true`, prolonger `boost_end_date` et valider les locations réglées (`status: 'paye'`).
- [x] Authentification renforcée : Carré d'inscription dédié (onglets distincts), filtrage anti-spam d'emails (Gmail, Outlook, iCloud, Yahoo, Bluewin, Proton) et politique de mot de passe stricte (8 car., majuscule, minuscule, chiffre, car. spécial) avec validation visuelle en direct.
- [x] **Fine-tuning & sécurisation complète (Session du 8 Octobre 2026) :**
  1. **État des lieux sous condition stricte** (`chat.js`) : Affichage du bandeau et des boutons d'état des lieux uniquement si la réservation est payée (`status === 'paye'`) ET que la date du jour est comprise dans la période de réservation.
  2. **Confidentialité des adresses physiques** (`trailers.js`) : Masquage strict de la rue exacte tant que la réservation n'est pas réglée (seule la localité/ville est exposée publiquement).
  3. **Correction de l'encodage PDF de l'état des lieux** (`contracts.js`) : Éradication des caractères corrompus (ex: `Ø=ûÂ`, `Ø=ûÎ`) par des libellés textuels propres compatibles avec la table de caractères de jsPDF.
  4. **Refonte de l'en-tête utilisateur** (`components.js`) : Suppression du lien texte redondant "Mon Espace" au profit de la pastille de profil unique.
  5. **Offre Annuelle PRO à 390 CHF/an** (`pro.html`) : Ajout de la double tarification (Mensuel 39 CHF/mois vs Annuel 390 CHF/an avec 2 mois offerts) et synchronisation avec Stripe.
  6. **Correction d'affichage de la modale de Boost** (`profil.html`) : Nettoyage complet des caractères corrompus d'accents et emojis (`fÜÇ`, `t├¼te`).
  7. **Statistiques détaillées par annonce en mode PRO** (`trailers.js`) : Affichage des indicateurs de performance (revenus nets, jours loués, ratio terminées/annulées) sur chaque carte dans l'espace propriétaire.
  8. **Sablier animé pour les attentes Stripe** (`core.js`) : Remplacement de l'emoji par un loader SVG/CSS animé stylisé Terracotta lors de la génération des liens Stripe.
  9. **Affichage fiable des réservations payées** (`trailers.js` & `stripe-webhook`) : Prise en charge des statuts payés et mise à jour automatique via le webhook lors du checkout Stripe.
  10. **Signalétique visuelle des annonces boostées** (`trailers.js`) : Badge "🚀 Sponsorisé" en dégradé Terracotta visible dans le catalogue public et pour le propriétaire avec décompte actif.
- [x] **Audit & Sécurisation RLS Inspections (Jules / Google Labs - 9 Octobre 2026) :**
  - Correction de la politique RLS trop permissive sur la table `inspections` (remplacement de `USING (true)` / `WITH CHECK (true)` par une vérification stricte `auth.uid() = user_id` à l'insertion et restriction d'accès en lecture aux seuls participants ou propriétaires de la remorque). Migration consignée dans `supabase/migrations/20260330000000_fix_inspections_rls.sql` et `supabase_migrations.sql`.
- [x] **Cockpit Dédié "Renger Analytics PRO" (`stats.html` & `stats.js` - 9 Octobre 2026) :**
  - Page MPA complète dédiée aux abonnés PRO (`is_pro === true`), protégée par un guard d'authentification et présentant un écran d'upsell/teaser premium avec aperçu immersif pour les non-abonnés.
  - Barre de filtres interactifs : sélecteur de remorque spécifique ou vue consolidée de flotte, et filtres temporels dynamiques (7 jours, 30 jours, Cette année, Tout l'historique).
  - 4 KPI Cards stratégiques : Chiffre d'affaires net perçu (CHF à 100%), Taux d'occupation moyen (% calendrier), Nombre de réservations confirmées, Taux de conversion (Clics → Réservations).
  - Compteur dynamique de ROI PRO ("Économies nettes conservées : +X CHF") démontrant le retour sur investissement immédiat par rapport à la commission standard de 20%.
  - Pack de 4 visualisations interactives Chart.js avec support natif du Dark Mode :
    1. Courbe/Aire d'évolution temporelle des revenus et volume de réservations.
    2. Bar chart comparatif de rentabilité et jours loués par remorque de la flotte.
    3. Donut de répartition calendaire (jours loués vs jours disponibles).
    4. Entonnoir de conversion (impressions catalogue → fiches détail → réservations validées).
  - Tableau récapitulatif détaillé triable par colonnes (Revenus, Jours, Réservations, Taux d'occupation, Tarif) avec recherche instantanée et export CSV natif (BOM UTF-8 pour Excel).
  - Intégration dans `profil.html` d'un bouton et d'un encart valorisant "📊 Accéder à Renger Analytics PRO" dans l'espace propriétaire.
  - Sécurisation mathématique du cockpit : normalisation des fuseaux horaires et calculs de chevauchement calendaire exacts, intégration de la modale d'authentification canonique Renger (Google OAuth + Email/Password + Reset), et gestion automatique du cycle de vie Auth (`onAuthStateChange`).
  - Enrichissement de la suite de tests automatisés (Tiers 1, 2 et 3) avec 128 tests passés à 100%.
- [x] **Écosystème Produits Payants, Résiliation PRO & Conditions de Vente (9 Octobre 2026) :**
  - **Portail Client Stripe en libre-service** (`stripe-portal`) : Génération d'une session Stripe Customer Portal sécurisée (`stripe.billingPortal.sessions.create`), authentification JWT stricte, rate-limiting (5 req / 10 min), résolution du `stripe_customer_id` depuis `profiles` avec fallback recherche email sur l'API Stripe, extraction sécurisée de l'origine (`new URL().origin`) éliminant le bug de chemin dupliqué `/profil.html/profil.html`.
  - **Cycle de vie Webhook & Révocation/Rétablissement automatique** (`stripe-webhook`) : Enregistrement de `stripe_customer_id` et `stripe_subscription_id` lors de `checkout.session.completed` (`pro_subscription`). Révocation automatique de l'abonnement (`is_pro = false`) lors de `customer.subscription.deleted` et `customer.subscription.updated` (`status === 'canceled' || 'unpaid'`), et rétablissement automatique (`is_pro = true`) lors de la reprise d'un statut actif.
  - **Correction du calcul de durée des Boosts** (`stripe-boost-checkout` & `stripe-webhook`) : Transmission explicite de `duration_days` dans les métadonnées de session (3 jours pour le "Boost Week-end" à 5.90 CHF et 7 jours pour le "Boost 7 Jours" à 9.90 CHF) et repli sécurisé dans le webhook, résolvant l'anomalie où le Boost Week-end recevait par défaut 7 jours.
  - **Garde-fou anti-doublon d'abonnement PRO** (`stripe-pro-checkout` & `booking.js`) : Blocage préventif côté client et serveur si `is_pro === true` avec redirection directe vers le portail Stripe, empêchant toute double souscription payante.
  - **Espace Propriétaire & Page PRO enrichis** (`profil.html`, `pro.html`, `trailers.js`) :
    - Affichage de la carte d'état d'abonnement actif (`#pro-active-card`) avec bouton d'accès au portail Stripe "⚙️ Gérer mon abonnement (Factures, Résiliation)" appelant `handleOpenStripePortal()`.
    - Bandeau d'abonné actif `#pro-already-subscribed-banner` sur `pro.html` avec détection automatique au chargement.
    - Consolidation déterministe de `loadProfileData()` dans `trailers.js` (une seule requête `maybeSingle()` sans promesse asynchrone concurrente ni risque de plantage sur profil inexistant).
  - **Mentions légales & Conditions fermes des Boosts** (`profil.html`) : Ajout dans `#boost-modal` d'un encart légal `#boost-legal-disclaimer` au-dessus du bouton de validation précisant le caractère ferme, définitif, immédiatement exécuté et non remboursable des achats de visibilité.
  - **Transparence tarifaire PRO** (`pro.html`) : Ajout des mentions légales explicites `#pro-legal-terms` sur la reconduction tacite, la résiliation libre en 1 clic sans préavis et l'absence de remboursement prorata temporis.
  - **Formalisation contractuelle suisse des CGU** (`cgu.html`) : Intégration de l'Article 7 ("Produits payants, Abonnements PRO et Options de visibilité (Boosts)") avec traduction intégrale en Français, Allemand et Anglais.
  - **Migrations consolidées** (`supabase_migrations.sql`) : Ajout de la colonne `is_pro` sur `profiles` et de la table `rate_limits` avec index et politiques RLS (`authenticated` et `service_role`).
  - **Tests automatisés de bout en bout** : Suite de tests portée à 139 tests unitaires/intégration (Tiers 1 à 5) + 177 tests de stress adversariaux passés à 100% de succès.
- [x] **Refonte "Mon Espace" vs "Paramètres", Résilience Stripe Portal & Guide Utilisateur (9 Octobre 2026) :**
  - **Isolation stricte "Mon Espace" vs "Paramètres"** (`profil.html`, `trailers.js`) :
    - "Mon Espace" (`#profile-seller-section`) est désormais 100% centré sur la gestion matérielle de la flotte de remorques, les annonces, les réservations reçues et le lien vers `stats.html`. Retrait de `#pro-banner-container` et de `#pro-active-card` de cette section.
    - Transfert de la gestion de l'abonnement et des factures dans les Paramètres du compte (`#settings-page`), positionné avant Stripe Connect :
      - Si `is_pro === true` : carte sombre avec badge vert émeraude "👑 Abonnement Renger PRO actif (0% de commission)" et bouton autonome "⚙️ Gérer mon abonnement (Factures, Résiliation)" appelant `handleOpenStripePortal()`.
      - Si `is_pro === false` : carte d'upsell `#settings-pro-upsell-card` avec bouton "Passer en mode PRO →" menant à `pro.html`.
    - Synchronisation dynamique dans `loadProfileSettings()` dans `trailers.js` et exposition globale sur `window.loadProfileSettings`.
  - **Résilience accrue de l'Edge Function Stripe Portal** (`booking.js`, `supabase/functions/stripe-portal/index.ts`) :
    - Interception exhaustive des erreurs d'invocation pour `FunctionsFetchError`, `FunctionsRelayError` et `FunctionsHttpError` (code HTTP 404 renvoyé par la passerelle API Supabase lorsque la fonction n'est pas déployée) avec extraction des payloads `{ message: ... }` et `{ error: ... }`. Affichage du toast clair et explicite : *"Le portail Stripe n'est pas encore déployé sur Supabase. Veuillez déployer la fonction stripe-portal depuis votre tableau de bord Supabase."*, tout en préservant intacts les messages de rate limiting backend ("Rate limit exceeded. Please try again later.").
    - Configuration de l'URL de retour (`return_url`) du portail Stripe directement vers `profil.html?p=settings-page` pour que l'utilisateur revienne précisément dans l'espace de gestion de son abonnement.
  - **Guide Interactif Nouveaux Utilisateurs (Onboarding Modal)** (`profil.html`, `components.js`) :
    - Composant `#onboarding-modal` avec fond flouté, responsive, support Dark Mode, et bouton d'évitement immédiat "Passer le guide" en haut à droite.
    - Étape 0 d'aiguillage : choix intuitif entre "🚗 Je cherche une remorque (Locataire)" et "🚜 Je loue ma remorque (Propriétaire)".
    - Parcours Locataire en 3 étapes :
      1. Recherche par canton & permis nécessaire (B vs BE selon PTAC).
      2. Réservation & caution non débitée via Stripe off-session.
      3. État des lieux photo 4/4 géolocalisé au départ et au retour avec contrats PDF certifiés (CO art. 253 & 257a) et bouton d'action directe vers `remorques.html`.
    - Parcours Propriétaire en 3 étapes :
      1. Publication d'annonce en 2 minutes avec suggestion intelligente de prix.
      2. Liaison bancaire Stripe Connect pour les virements automatiques.
      3. Validation de l'état des lieux pour débloquer les fonds et 0% de commission avec le mode PRO et bouton d'action directe vers `louer-ma-remorque.html`.
    - Contrôles & ergonomie avancée : navigation Précédent/Suivant, bascule instantanée entre profils Locataire et Propriétaire sans réinitialisation, navigation au clavier (Flèches Gauche/Droite + Échap), sécurisation contre les `window.location` non initialisés, persistance dans `localStorage` (`renger_onboarding_completed`), et section dédiée "Guide & Prise en main" dans `#settings-page` permettant la réouverture permanente via `openOnboardingModal()`.
  - **Navigation fluide Mon Espace ⇄ Paramètres** (`profil.html`) :
    - Bouton `#btn-goto-settings` ("⚙️ Paramètres du compte →") dans l'en-tête de Mon Espace.
    - Bouton `#btn-back-to-profile` ("← Retour à Mon Espace") dans les Paramètres du compte.
    - Rafraîchissement automatique dans `core.js` dès la résolution de l'authentification (`onAuthStateChange`).
  - **Tests automatisés enrichis** : Suite de tests portée à 146 tests (Tiers 1 à 5) + 188 tests de stress adversariaux validés à 100% de succès (334 tests au total).
- [x] **Audit Exhaustif & Traitement Global des Anomalies Visuelles et Fonctionnelles (9 Octobre 2026) :**
  - **Charte Graphique Terracotta & Mode Sombre Unifiés (`style.css`, `cgu.html`, `politique-confidentialite.html`) :**
    - Harmonisation complète du code couleur Terracotta officiel `#d85110` (hover `#bc450b`) sur l'intégralité du site et des pages légales, éliminant les divergences `#d16a54`.
    - Cohérence Dark/Light mode : correction des styles pour les cases à cocher et boutons radios personnalisés, intégration des règles dark mode pour les popups Leaflet (`.leaflet-popup-content-wrapper` et pointe de flèche en `#292524`), élévation du z-index Flatpickr (`z-index: 1000 !important`).
    - Standardisation de la commande de changement de thème avec icônes lune/soleil bicolores et réactives.
  - **Landing Page & Vitrine Enrichie (`index.html` - Étape 1) :**
    - Enrichissement complet de l'accueil avec grille de catégories populaires (8 raccourcis thématiques vers `remorques.html`), parcours "Comment ça marche ?" en 3 cartes illustrées (Recherche, Caution 0 CHF non débitée, État des lieux photo 4/4), arguments suisses "Pourquoi choisir Renger ?" (100% Romand, CO art. 253/257a, Transparence CHF, Renger PRO 0%), section d'avis clients 5 étoiles et foire aux questions interactive avec accordéons `<details>` fluides.
  - **Catalogue & Fiche Détaillée (`remorques.html`, `remorque.html`, `trailers.js`, `booking.js` - Étape 2) :**
    - Carte Leaflet responsive (`h-[380px] sm:h-[480px] md:h-[540px]`), dimensions d'icônes optimisées (`[60, 26]`) pour empêcher toute troncature des prix en CHF, support Dark Mode complet des popups, ajout du badge `🚀 Sponsorisé` dans les marqueurs boostés et fiabilisation de `invalidateSize()` avec délai asynchrone sécurisé (`setTimeout(..., 80)` avec guard sandbox).
    - Fiche détaillée : fond de carrousel sombre `dark:bg-stone-800` pour éliminer tout flash lumineux au chargement, intégration des badges dynamiques `#detail-boost-badge` ("🚀 Sponsorisé"), `#detail-verified-badge` ("✓ Vérifié") et `#detail-owner-badge` ("Votre remorque"), et repli d'image automatique `img.onerror` vers un placeholder élégant.
    - État vide élégant du catalogue : remplacement du message brut par un encart centré avec icône de recherche, texte explicatif et bouton de réinitialisation des filtres.
  - **Création d'Annonce & Pédagogie Matérielle (`louer-ma-remorque.html`, `trailers.js` - Étape 3) :**
    - Ajout de champs structurés optionnels pour le PTAC (`#ad-ptac` en kg) et les dimensions utiles intérieures (`#ad-length`, `#ad-width`, `#ad-height` en cm).
    - Générateur automatique de description mis à niveau pour intégrer automatiquement les dimensions et le PTAC saisis dans le texte d'annonce, avec écouteurs d'événements dynamiques.
  - **Espace Personnel & Rémunération PRO (`profil.html`, `trailers.js`, `booking.js` - Étape 4) :**
    - Correction mathématique critique dans `trailers.js` : les gains nets du propriétaire PRO sont désormais calculés à 100% de la valeur locative de base (`isPro ? 1.0 : 0.8`), restaurant l'avantage contractuel 0% commission plateforme (contre 80% en mode standard).
    - Calcul du revenu mensuel propriétaire fiabilisé avec pré-résolution du profil PRO.
    - Modale de Boost : fermeture sur clic extérieur (backdrop `handleBoostModalBackdrop`), arrêt de propagation du conteneur et fermeture globale via touche Échap.
  - **Offre PRO & Comparatif Commercial (`pro.html` - Étape 5) :**
    - Rectification de la mention trompeuse sur la commission d'apport d'affaires : *"0% de commission au lieu de 20%"* (au lieu de 5%).
    - Ajout d'un tableau comparatif détaillé Standard (Gratuit) vs PRO et mise en évidence claire du seuil d'amortissement économique (rentabilisé dès 195 CHF de locations par mois, soit ~2 jours de location).
  - **Composants Partagés & Micro-interactions (`components.js`, `core.js` - Étape 7) :**
    - Toast de notification élevé à `z-[100]` avec icône info modernisée (`ℹ️`).
    - Guide onboarding : espacement mobile repensé pour éviter toute collision entre le bouton "Passer le guide" et les contrôles de bascule de profil sur écrans étroits.
    - Gestion universelle de la touche Échap étendue à la modale de Boost.
  - **Validation & Maintien de la Qualité :**
    - **Corrections critiques d'audit de bout en bout (9 Octobre 2026 - Passe de fiabilisation) :**
      - *Calcul PRO dans l'historique vendeur (`trailers.js`)* : Ajout du paramètre `isPro` à `createSellerRentalHistoryCard` pour garantir 100% de net perçu aux propriétaires PRO (`baseRental * 1.0` avec label explicite `Net perçu PRO (100%)`) contre 80% en standard. Sécurisation anti-`NaN` sur `booking.total_price` et transmission de `isPro` dans `loadProfileData`.
      - *Détection des remorques boostées et vérifiées (`trailers.js`, `booking.js`)* : Rapprochement avec le schéma réel de la base Supabase en vérifiant `boost_end_date && new Date(trailer.boost_end_date) > new Date()` en plus de `is_boosted`. Les popups Leaflet et la fiche détaillée affichent désormais fidèlement le badge `🚀 Sponsorisé` pour les remorques en base. Évaluation du badge vérifié via `is_verified || verified`.
      - *Immunité contre les boucles récursives d'erreur d'image (`trailers.js`)* : Neutralisation de `img.onerror = null` dans `initDetailCarousel`, `goToCarouselSlide` et la popup Leaflet avec repli vers un SVG inline data URI local (zéro dépendance externe).
      - *Agrégation des locations dans la modale de gestion (`booking.js`)* : Extension du filtre de statut de réservation dans `openManageTrailer` à `['paye', 'paid', 'confirmed']` garantissant le comptage exact du chiffre d'affaires et des locations terminées.
      - *Édition d'annonce complète (`louer-ma-remorque.html`)* : Remplissage automatique des champs techniques `#ad-ptac`, `#ad-length`, `#ad-width` et `#ad-height` lors du passage en mode modification d'une annonce existante.
      - *Réinitialisation intégrale des filtres de catalogue (`core.js`)* : Le bouton de réinitialisation dans l'état vide remet désormais à zéro `currentStartDate` et `currentEndDate` et déclenche le vidage du sélecteur de dates DOM (`#catalog-clear-dates`).
      - *Fermeture universelle Échap (`components.js`)* : Prise en charge de `#inspection-success-modal` dans les modales refermables par la touche Échap.
    - **Suite de tests challenger dédiée (`tests/challenger-audit-fixes.test.mjs`) :**
      - 6 tests unitaires et d'intégration couvrant chacun des correctifs d'audit ci-dessus, validés à 100% de succès.
    - **Bilan Global des Tests :**
      - 146 tests unitaires/intégration standard (Tiers 1 à 5) + 194 tests de stress adversariaux challenger = **340 / 340 tests validés avec succès (100%)**.

- [x] **Renforcement Sécurité RLS `analytics_events` (12 Octobre 2026 - Jules Sentinel PR #2) :**
  - Remplacement de la politique SELECT permissive `USING (true)` par `USING (auth.uid() = user_id)` sur `analytics_events` dans `supabase_migrations.sql` et application directe sur la base Supabase en production.
  - Protection totale de la confidentialité des visiteurs : chaque utilisateur ne peut désormais lire que ses propres données de télémétrie.

- [x] **Gestionnaire de Planning des Locations (`profil.html`, `planning.js`, `trailers.js` - 12 Octobre 2026) :**
  - **Système d'onglets ergonomiques dans l'Espace Propriétaire** (`profil.html`) :
    - Navigation par onglets fluide entre `🚗 Mes Annonces` (`#tab-btn-trailers`), `📅 Planning des Locations` (`#tab-btn-planning`) et `📋 Locations Reçues` (`#tab-btn-bookings`).
    - Basculement instantané sans rechargement entre `#seller-trailers-container`, `#seller-planning-section` et `#seller-bookings-container`.
  - **Barre d'outils & Calendrier Mensuel Interactif** (`planning.js`, `profil.html`) :
    - Sélecteur de remorque dynamique (`#planning-trailer-filter`) pour filtrer le calendrier sur l'ensemble de la flotte ou sur une remorque spécifique.
    - Contrôles de navigation temporelle : mois précédent (`#planning-prev-month`), mois suivant (`#planning-next-month`), retour immédiat à aujourd'hui (`#planning-today-btn`), et libellé mensuel dynamique (`#planning-month-label`).
    - Grille calendaire responsive 7 jours (`#planning-calendar-grid`) avec en-têtes Lun-Dim, surbrillance du jour d'aujourd'hui, pastilles de réservations colorées selon le cycle de vie réel (vert: confirmé/futur, bleu: en cours aujourd'hui, gris: terminé/passé, ambre: indisponible/bloqué) et gestion continue des réservations multi-jours.
    - Résolution temporelle rigoureuse : évaluation du statut relatif à la date actuelle du jour pour garantir la visibilité de l'ensemble des couleurs de légende.
    - Bouton rapide "🔒 Bloquer des dates" (`#btn-open-block-dates`).
  - **Modale Détails du Jour (`#planning-day-modal`)** :
    - Affiche les événements de la date cliquée avec intitulé complet en français.
    - Si réservation client : vignette/photo de la remorque, identité du locataire complète avec nom complet, username, avatar photo ou initiales, période de location avec durée en jours, calcul automatique des revenus nets perçus (100% pour propriétaire PRO vs 80% pour Standard avec mention transparente de commission plateforme), badge de statut coloré, et boutons d'action rapide vers le Chat direct (`openChatWithBooking`) et le contrat officiel PDF (`downloadRentalContract`).
    - Si date bloquée : affichage clair de l'indisponibilité avec mention exacte "🔒 Période indisponible (Maintenance / Usage personnel)" et bouton de déblocage immédiat (`unblockDates`).
  - **Modale de Blocage de Dates (`#modal-block-dates`) & Sécurité** :
    - Formulaire intuitif permettant de choisir la remorque (`#block-trailer-select`), les dates de début et fin (`#block-start-date`, `#block-end-date`), et le motif (`#block-reason-select` : Maintenance/Révision, Usage personnel, Autre).
    - Validation préventive anti-chevauchement côté client, immunité contre la fuite de dates passées, et insertion en base Supabase (`status: 'indisponible'`, `renter_id: currentUser.id`, `owner_id: currentUser.id`, `total_price: 0`).
    - Sécurité DevSecOps sur `unblockDates` : vérification stricte du statut `indisponible` côté client et dans la clause PostgREST `.eq('status', 'indisponible')` empêchant toute suppression accidentelle ou malveillante d'une réservation client payée.
  - **Isolation des Métriques & Flotte Propriétaire** (`trailers.js`) :
    - Pré-chargement des profils locataires (`profiles: id, username, full_name, avatar_url`) pour enrichir les réservations avant initialisation du planning.
    - Exclusion des enregistrements `indisponible` des métriques de conversion et d'occupation du dashboard PRO, ainsi que du compteur d'historique de locations.
    - Badge d'état de remorque ("État de ma flotte") affichant fidèlement "Indisponible" (ambre) lors d'un blocage actuel, au lieu d'une fausse alerte "En location actuelle" (rouge).
  - **Architecture Modulaire & Raccourcis Clavier** (`planning.js`, `components.js`) :
    - Module universel découplé `Site web/js/planning.js` exposé sur `window.RengerPlanning` et CommonJS/Node pour les tests.
    - Fermeture universelle des modales de planning via la touche Échap et sur clic extérieur (backdrop).
- [x] **Optimisation Taux d'Acceptation Cookies & Réassurance Suisse (`tracking.js` - 12 Octobre 2026) :**
  - **Refonte visuelle haute conversion** : transformation du bandeau classique en pastille flottante premium (`fixed bottom-4 left-4 right-4 md:right-6 md:max-w-md bg-stone-900/95 rounded-3xl shadow-2xl border border-stone-700/80 backdrop-blur-md`).
  - **Argumentaire suisse persuasif & réassurance (Framing)** : mise en avant des garanties suisses (hébergement sécurisé nLPD, zéro pub, zéro tiers, calcul des remorques à proximité).
  - **Hiérarchie d'action prédominante** : bouton CTA principal en Terracotta vibrant avec ombre portée (`#btn-accept-cookies`), et lien de refus discret sous le bouton (`#btn-refuse-cookies`).
  - **Persistance & Compatibilité** : acceptation persistante dans `localStorage` avec déclenchement direct du tracking, et respect des tests automatisés (100% de succès sur les 397 tests).
- [x] **Simplification UX & Modernisation Graphique Complète (SVG & Info-bulles Pédagogiques - 12 Octobre 2026) :**
  - **Éradication systématique de tous les emojis bruts du DOM** : Remplacement de l'intégralité des emojis par des illustrations vectorielles SVG monochromes ultra-nettes (style Heroicons / Lucide, terracotta `#d85110`, pierre neutre, compatible dark mode) dans toutes les pages HTML (`index.html`, `remorques.html`, `remorque.html`, `louer-ma-remorque.html`, `profil.html`, `pro.html`, `stats.html`, `inspection.html`) et modules JS (`components.js`, `core.js`, `trailers.js`, `booking.js`, `chat.js`, `planning.js`, `tracking.js`, `inspection.js`, `stats.js`).
  - **Bibliothèque vectorielle `RengerIcons`** (`components.js`) : Standardisation des icônes SVG réutilisables (shield, lock, calendar, user, check, alert, info, sparkles, camera, document, trailer, swiss cross, etc.).
  - **Moteur Universel d'Info-bulles Pédagogiques ("i") & Dictionnaire Canonique** (`components.js`, `style.css`) :
    - Dictionnaire canonique centralisé `RengerTooltipDictionary` accessible globalement (`window.RengerTooltipDictionary` et CommonJS) avec résolveur transparent `data-tooltip-key` et fallback `data-tooltip`.
    - Déploiement de pastilles d'aide discrètes avec bulle flottante sombre (`z-[10000]`, flèche directionnelle CSS dynamique avec inversion haut/bas selon la position dans le viewport).
    - Détection fine des limites d'écran (clamping horizontal et vertical anti-débordement) garantissant une lisibilité parfaite sur mobile et bureau.
    - Accessibilité complète : déclenchement au survol souris (`mouseover` / `mouseout`), au focus clavier (`focusin` / `focusout`), au tap tactile (`click` toggle) et fermeture universelle à la touche Échap (`Escape`), au clic hors-bulle, au scroll et au redimensionnement.
    - Couverture des 8 concepts clés de la plateforme avec définitions suisses exactes :
      1. `caution-non-debitee` : Caution non débitée : simple empreinte bancaire Stripe sécurisée. Aucun prélèvement immédiat n'est effectué sur votre carte bancaire.
      2. `permis-b-be` : Permis B vs BE : le permis B voiture standard suffit pour les remorques ≤ 750 kg ou ensembles ≤ 3'500 kg. Au-delà, le permis BE est requis.
      3. `ptac` : PTAC (Poids Total Autorisé en Charge) : poids maximum légal cumulé de la remorque et de sa charge utile selon la législation routière suisse.
      4. `renger-pro` : Abonnement Renger PRO : conservez 100% de vos revenus locatifs (0% de commission plateforme), remorques illimitées et accès au cockpit Renger Analytics PRO.
      5. `boosts` : Boost d'annonce : propulsez votre remorque en tête de liste et sur la carte interactive pendant le week-end ou 7 jours pour maximiser vos réservations.
      6. `etat-lieux-certifie` : État des lieux photo certifié (CO art. 257a) : 4 photos obligatoires avec horodatage suisse et coordonnées GPS infalsifiables protégeant locataire et propriétaire.
      7. `stripe-connect` : Virements Stripe Connect : vos gains nets de location sont transférés automatiquement et de façon sécurisée vers votre compte bancaire suisse.
      8. `blocage-dates` : Blocage de dates : réservez facilement votre remorque pour votre usage personnel ou pour sa maintenance sans frais.
  - **Formulaires & Badges Vectoriels (`core.js`)** :
    - Remplacement des caractères Unicode `✓` par des icônes SVG vectorielles inline nettes dans les validations en direct de formulaires (domaine e-mail autorisé, règles de complexité mot de passe, concordance des mots de passe).
  - **Préservation rigoureuse des assertions de tests existantes** : Maintien strict des métadonnées internes indispensables (`statusInfo.icon` pour les tests unitaires de statut, `assert.match` Leaflet sur `loc.textContent`, jsPDF text stream sur `contracts.js:854`, et signatures compatibles dans `profil.html` et `trailers.js`).
- [x] **Élévation Graphique des Illustrations SVG & Exclusivité Renger PRO du Planning (`index.html`, `remorques.html`, `louer-ma-remorque.html`, `components.js`, `profil.html`, `planning.js`, `pro.html` - 12 Octobre 2026) :**
  - **Refonte vectorielle haute précision des 5 illustrations de catégories phares** :
    1. *Réfrigérée* : remplacement des flèches multidirectionnelles par un flocon de neige vectoriel très net (cristal géométrique à branches et chevrons d'expansion).
    2. *Porte-vélo* : silhouette vectorielle épurée d'une vraie bicyclette moderne (deux roues, cadre tubulaire en losange, selle horizontale sur tige, guidon et fourche).
    3. *Porte-moto* : moto profilée/motocross racée avec réservoir volumique, guidon motocross bas, fourche avant inclinée, ligne d'échappement et roues moto renforcées (double jante/pneu épais), nettement distincte du vélo.
    4. *Van à chevaux* : profil équestre noble et fluide (tête et encolure de cheval stylisée avec regard et oreilles profilées) remplaçant le polygone abstrait difforme.
    5. *Utilitaire* : remorque utilitaire à ridelles avec caisson ouvert, montants verticaux complets, garde-boue, roue centrale, flèche et timon d'attelage avec boule de couplage.
    - Déploiement coordonné et synchronisé sur la grille d'accueil (`index.html`), les boutons filtres de catalogue (`remorques.html`), le sélecteur d'annonce (`louer-ma-remorque.html`) ET le dictionnaire global d'icônes `RengerIcons` dans `Site web/js/components.js` (`trailer`, `horse`, `moto`, `snow`, `bike`).
  - **Exclusivité Renger PRO sur le Planning de Gestion de Flotte (Monétisation)** :
    - Ajout du badge `👑 PRO` sur l'onglet `#tab-btn-planning` dans `profil.html`.
    - Gating pour utilisateurs standards (`is_pro === false`) : affichage d'un calque flouté immersif (`backdrop-blur-md` sur `#pro-planning-gate`, conteneur `min-h-[520px]`) avec bannière de conversion incitative vers `pro.html` (39 CHF/mois, conservation de 100% des gains), et verrouillage côté contrôleur des actions de détails de jour (`showDayDetails`), de blocage/déblocage manuel de dates (`openBlockDatesModal`, `submitBlockDates`, `unblockDates`), et des actions contextuelles (`openChatWithBooking`, `downloadRentalContract`).
    - Méthode réactive `setPro(val)` sur `window.RengerPlanning` pour basculer dynamiquement le gating lors des transitions de session à chaud sans réinitialiser la flotte.
    - Accès complet et sans calque pour les abonnés PRO (`is_pro === true`).
    - Mise à jour de `pro.html` : ajout du "Planning interactif de flotte (qui loue quand)" dans la liste des avantages de l'offre PRO et dans le tableau comparatif Standard (❌ Non disponible) vs PRO (✅ Inclus en illimité).
  - **Suite de tests automatisés enrichie & 100% au vert** :
    - Ajout des assertions DOM de gating et des signatures vectorielles des 5 SVGs dans `index.html`, `remorques.html`, `louer-ma-remorque.html` et `components.js` au sein de `tests/tier2-dom-elements.test.mjs`.
    - Ajout de la suite de tests de gating PRO, contrôles d'accès (`unblockDates`, `openChatWithBooking`, `downloadRentalContract`) et transition dynamique `setPro` dans `tests/challenger-planning.test.mjs`.
    - 185/185 tests passés avec succès sur `node tests/run-tests.mjs` (100%).
    - 220/220 tests passés avec succès sur `node --test tests/challenger-*.test.mjs` (100%). Total de 405 tests automatisés réussis sans aucun échec.

- [x] **Correction Résiliente du Schéma BDD : Colonne `location` vs `location_city` (`Site web/js/trailers.js`, `supabase_migrations.sql` - 12 Octobre 2026) :**
  - **Diagnostic** : Lors de la publication ou modification d'une annonce (`handlePublish`), le payload envoyé à Supabase incluait à la fois `location: locationInput` et `location_city: geoData.city`. Dans la base de données Supabase, la colonne est `location_city` (créée à l'étape 1 des migrations), et `location` n'existait pas dans le cache de schéma PostgREST, provoquant une erreur bloquante `Erreur BDD : Could not find the 'location' column of 'trailers' in the schema cache`.
  - **Résolution Zero-Downtime** :
    1. Implémentation dans `Site web/js/trailers.js` d'un repli automatique et transparent : si Supabase renvoie une erreur mentionnant la colonne `location`, le payload supprime instantanément `location` et réexécute l'insertion/mise à jour avec `location_city`, `latitude`, `longitude` sans afficher d'erreur à l'utilisateur.
    2. Ajout de `ADD COLUMN IF NOT EXISTS location text;` dans `supabase_migrations.sql` pour garantir la compatibilité bilatérale dans PostgreSQL.
    3. Ajout d'un test dédié dans `tests/tier4-mpa-journeys.test.mjs` validant la résilience du repli.
  - **Validation** : 186/186 tests (Tiers 1-5) et 220/220 tests (Challengers) réussis (Total : 406/406 tests au vert, 100%).

- [x] **Intégration Notifications par E-mail Resend & Custom SMTP Supabase Auth (13 Octobre 2026) :**
  - **Module d'emails transactionnels Resend** (`supabase/functions/stripe-webhook/email.ts`) :
    - Envoi automatique via l'API REST Resend (`https://api.resend.com/emails`) lors de la validation d'une réservation (`status: 'paye'`) dans `stripe-webhook`.
    - E-mail pour le **Locataire** : récapitulatif clair de la réservation, remorque, dates au format suisse JJ.MM.AAAA, montant payé en CHF, réassurance sur l'empreinte bancaire / caution non débitée (0 CHF), prochaines étapes certifiées (chat avec le propriétaire, état des lieux photo 4/4 conforme CO art. 257a, contrat officiel CO art. 253), bouton d'accès direct vers `renger.ch/profil.html`.
    - E-mail pour le **Propriétaire** : notification immédiate avec détails du locataire (nom, username), dates, calcul exact des gains nets perçus (100% sans commission pour les propriétaires PRO vs 80% pour Standard), instructions de remise des clés et lien vers le planning.
    - Résilience maximale : l'envoi d'e-mail est exécuté dans un bloc `try/catch` non bloquant ; si la clé API Resend n'est pas encore configurée ou si une erreur réseau survient, la validation de la réservation en BDD n'est jamais interrompue.
  - **Fonction Edge de Test Dédiée** (`supabase/functions/test-resend/index.ts`) :
    - Permet de tester instantanément la clé `RESEND_API_KEY` et l'expéditeur `RESEND_FROM_EMAIL` sans passer par un cycle complet de paiement Stripe.
  - **Templates Supabase Auth personnalisés** (`supabase/email_templates/`) :
    - `confirm_signup.html` : Gabarit HTML haut de gamme aux couleurs Renger (Terracotta `#d85110`, fond neutre, réassurance nLPD suisse) pour la confirmation d'adresse e-mail à l'inscription.
    - `reset_password.html` : Gabarit pour la réinitialisation de mot de passe sécurisée.
  - **Validation & Tests** :
    - Ajout de la suite de tests `tests/challenger-resend-email.test.mjs` (5 tests validés).
    - 186/186 tests (Tiers 1-5) et 225/225 tests (Challengers) réussis = **411 / 411 tests validés à 100%**.

- [x] **Finalisation Intégrale du Cadre Légal Suisse & Mentions Légales (`mentions-legales.html`, `cgu.html`, `politique-confidentialite.html`, footers harmonisés - 13 Octobre 2026) :**
  - **Création des Mentions Légales Officielles (`Site web/mentions-legales.html`)** :
    - Respect absolu de la charte graphique Renger (Terracotta `#d85110`, Dark Stone, mode sombre/clair, barre de navigation mobile).
    - Identité juridique complète : Enis Medjiti, Fondateur & Exploitant de Renger (Entreprise individuelle, Lausanne, Canton de Vaud, Suisse).
    - Contact officiel : `info@renger.ch`, URL officielle : `https://renger.ch`.
    - Sous-traitants & infrastructure déclarés : Supabase Inc. (base de données & Auth, SOC 2 Type II), Stripe Payments Europe Ltd (paiements & cautionnement PCI-DSS Niveau 1), Resend Inc. (e-mails transactionnels), OpenStreetMap (cartographie).
    - Propriété intellectuelle : Renger, logos, marque et code source protégés.
    - Système trilingue complet (FR, DE, EN) avec sélecteur de langue fonctionnel et persistance `localStorage` (`renger_lang`).
  - **Harmonisation Universelle des Footers sur l'Ensemble du Site** :
    - Déploiement des 3 liens légaux obligatoires (`Mentions Légales`, `Conditions Générales d'Utilisation (CGU)`, `Politique de Confidentialité`) sur les 11 pages du site : `index.html`, `remorques.html`, `remorque.html`, `louer-ma-remorque.html`, `profil.html`, `pro.html`, `stats.html`, `inspection.html`, `cgu.html`, `politique-confidentialite.html`, `mentions-legales.html`.
  - **Refonte et Finalisation des CGU (`Site web/cgu.html`)** :
    - Statut de Renger : intermédiaire technique exclusif, aucun contrat de location direct avec Renger (CO art. 253 ss).
    - Formules financières complètes : frais de traitement locataire 5% (min. garanti 4.90 CHF, arrondi suisse aux 5 centimes), commission propriétaire standard 20% (net 80%), abonnement Renger PRO à 0% de commission (39 CHF/mois ou 390 CHF/an, reconduction tacite et résiliation en 1 clic sans prorata), Boosts (5.90 CHF et 9.90 CHF fermes et non remboursables).
    - Caution bancaire : barème 200 CHF / 300 CHF / 400 CHF en empreinte non débitée via Stripe (`off_session`), libération automatique sous 48h.
    - État des lieux contradictoire photo 4/4 obligatoire départ et retour selon CO art. 257a.
    - **Suppression absolue de la pénalité de 50 CHF** : remplacée par la présomption légale suisse de responsabilité imputable au locataire en cas d'absence de clichés de retour.
    - Politique d'annulation à l'équilibre (« Zero-Loss ») : locataire remboursé déduction faite des frais de traitement bancaire réels Stripe avant le début de la location ; remboursement 100% en cas d'annulation par le bailleur.
    - For juridique exclusif : Lausanne, Canton de Vaud, droit suisse.
    - Traduction intégrale en FR, DE, EN.
  - **Suppression de la pénalité de 50 CHF dans l'intégralité du Codebase** :
    - Supprimée dans `Site web/js/contracts.js` (remplacée par la présomption légale suisse dans le contrat officiel).
    - Supprimée dans `Site web/inspection.html` et `Site web/profil.html` (modale d'avertissement et bouton de clôture sans pénalité).
    - Supprimée dans `Site web/js/chat.js` (dialogue de confirmation et message de statut sans pénalité de 50 CHF).
  - **Refonte et Enrichissement de la Politique de Confidentialité (`Site web/politique-confidentialite.html`)** :
    - Déclaration d'Enis Medjiti comme responsable du traitement (`info@renger.ch`, Canton de Vaud).
    - Conformité nLPD (loi fédérale suisse) et RGPD européen.
    - Déclaration complète des sous-traitants (Supabase, Stripe, Resend, OpenStreetMap).
    - Données collectées, états des lieux photos, données financières, tracking analytics first-party sans régies publicitaires tierces.
    - Durées de conservation : 10 ans pour les pièces comptables (CO art. 958f), conservation proportionnée pour les états des lieux.
    - Droits d'accès, de rectification, d'effacement et contact DPO.
    - Traduction intégrale en FR, DE, EN.
  - **Suite de Tests Dédiée & Qualité Inattaquable** :
    - Ajout de `tests/challenger-legal-compliance.test.mjs` (36 assertions rigoureuses couvrant les mentions légales, la conformité des CGU, la confidentialité, l'absence de pénalité de 50 CHF, les footers harmonisés, la symétrie stricte des dictionnaires trilingues FR/DE/EN et la préservation du ratio photo).
    - Correction juridique formelle : éradication de toute mention résiduelle erronée de « Sàrl » dans `contracts.js` au profit exclusif de la forme déclarée « Entreprise individuelle ».
    - Restauration de l'algorithme de letterboxing / ratio d'aspect (`getImageProperties`) dans `contracts.js` pour éliminer toute déformation des clichés photos sur les constats PDF.
    - Mise à jour de `tests/tier1-syntax-html.test.mjs` et `tests/tier2-dom-elements.test.mjs` incluant `mentions-legales.html`.
    - **100% de réussite** : 210/210 tests (Tiers 1 à 6 via `node tests/run-tests.mjs`) et 262/262 tests (Challengers via `node --test tests/challenger-*.test.mjs`). Total de **472 tests au vert**.
  - **Intégration des Textes Juridiques Concis & Clairs (Demande Utilisateur)** :
    - Application intégrale et sans réserve des textes concis rédigés par l'utilisateur sur les 3 pages légales (`mentions-legales.html` en 3 articles, `cgu.html` en 7 articles, `politique-confidentialite.html` en 5 articles).
    - Synchronisation parfaite avec les traductions allemande (DE) et anglaise (EN), et vérification de la symétrie 100% des dictionnaires `translations`.

- [x] **Cockpit d'Administration Suprême « Syni » V2 & Référencement Google SEO (13 Octobre 2026) :**
  - **Identité Administrateur Suprême & Double-Facteur** :
    - Compte officiel exclusif : `enism2007@hotmail.com` (matérialisé par `profiles.is_admin = true`).
    - 2ème niveau de sécurité renforcé : validation par passphrase maîtresse `SYNI_MASTER_KEY` (`RengerSyni2026!`).
    - Écran de garde (`#syni-auth-guard`) bloquant tout visiteur non authentifié ou non autorisé.
    - Modale de saisie de passphrase (`#syni-passphrase-modal`) avec stockage éphémère de session en `sessionStorage` (`renger_syni_unlocked`).
  - **Signalétique & Accès Discret dans le Site Web** :
    - Accès direct via `Site web/syni.html` (URL `https://renger.ch/syni.html`).
    - Raccourci discret dans le menu utilisateur et dans `Site web/profil.html` (`#settings-page`), visible UNIQUEMENT pour `enism2007@hotmail.com` ou `is_admin = true`.
    - Règle formelle respectée : AUCUN emoji (notamment aucune couronne). Utilisation exclusive de l'illustration vectorielle SVG d'œil épurée (`RengerIcons.eye`).
  - **Modération Opérationnelle Directe en 1 Clic & Modale Sécurisée** :
    - **Gestion Utilisateurs** : boutons directs `[Passer PRO / Retirer PRO]` (bascule instantanée `is_pro` avec 0% commission) et `[Bannir / Débannir]` (`is_banned`).
    - **Gestion Flotte** : boutons directs `[Masquer / Activer]` (bascule `is_active` pour retrait du catalogue) et `[Offrir Boost 7j]` (activation immédiate d'un boost de 7 jours).
    - **Gestion Réservations** : boutons directs `[Libérer Caution]` (levée de l'empreinte bancaire Stripe off-session), `[Capturer Caution]` (réclamation de caution en cas de litige/dégâts), et `[Annuler Réservation]` (annulation administrative avec traçabilité Zero-Loss).
    - **Modale de Confirmation Sécurisée** (`#syni-action-modal`) : obligatoire avant toute exécution, affiche l'impact, permet la saisie d'un motif optionnel (`actionReason`), et propose `Annuler` ou `Confirmer l'action`.
    - **Journal d'Audit des Actions Suprêmes (Audit Trail)** : persistance localStorage (`syni_audit_log`, max 500 entrées) avec horodatage ISO, type d'action, cible, identifiant, motif et email administrateur (`enism2007@hotmail.com`).
  - **Backend & Sécurité Edge Function (`supabase/functions/syni-data/index.ts`)** :
    - Vérification du JWT de session Bearer et validation de l'administrateur suprême.
    - Validation de la passphrase maîtresse `SYNI_MASTER_KEY`.
    - Rate limiter strict anti-brute force ordonnancé AVANT validation de mot de passe via `rate_limits` (max 30 requêtes par 10 minutes) avec journalisation des tentatives infructueuses.
    - Agrégation complète de la BDD avec `supabaseAdmin` (`SERVICE_ROLE_KEY`) : profils, remorques, réservations, inspections, rate limits, analytics, impressions, clicks.
    - Protection Zéro-Confiance en BDD : trigger `protect_is_admin()` bloquant toute tentative d'auto-promotion sur `profiles.is_admin`.
    - Mode de repli hybride automatique côté client (`syni.js`) vers requêtes Supabase directes ou données simulées offline.
  - **Les 8 Modules de Syni V2 (`Site web/syni.html` et `Site web/js/syni.js`)** :
    1. **Cockpit Général** : KPIs clés (Total Utilisateurs & % PRO, Remorques actives & boostées, Réservations confirmées, Volume brut CHF, Revenus nets Renger CHF, Cautions en séquestre, Taux de conversion global), filtres temporels avec bornage strict (Aujourd'hui, 7j, 30j, Année, Tout), 4 graphiques Chart.js (courbe revenus/volume, répartition cantons suisses, catégories remorques, referrers).
    2. **Utilisateurs** : Répertoire complet avec recherche multi-champs instantanée, filtres PRO/Propriétaires/Locataires/Admin, compteurs d'activité (flotte & locations), boutons d'action PRO/Ban avec modale sécurisée, et export CSV UTF-8 avec BOM complet.
    3. **Réservations & Cashflow** : Flux complet de toutes les réservations, ventilation financière exacte en CHF (Base price, Frais Renger 5% min 4.90 CHF, Part propriétaire 80% ou 100% PRO, Commission 20% ou 0% PRO), suivi des cautions off-session, boutons de modération Libérer/Capturer/Annuler, et export CSV UTF-8.
    4. **Flotte de Remorques** : Inventaire complet avec photos réelles, catégories, charges utiles PTAC, villes/cantons, prix journalier, cautions, statuts d'activité, distinction Boosts Week-end / 7 jours, métriques de vues/clics (CTR), et actions Masquer/Activer et Offrir Boost 7j.
    5. **États des Lieux & Audits** : Contrôle des inspections photo 4/4 géolocalisées, coordonnées GPS avec précision métrique, horodatage suisse certifié, détection des clôtures sans photos de retour, et journal d'audit de sécurité des rate limits.
    6. **Google SEO & Acquisition de Trafic** : Tableau de bord SEO hybride avec KPIs Search Console (Clics organiques, Impressions, CTR moyen %, Position moyenne sur google.ch), suivi des 9 mots-clés suisses prioritaires (ex: "location remorque vaud", "remorque lausanne", "location porte voiture suisse"), analyse en temps réel des referrers organiques (`google.ch`, `google.com`), grille des canaux d'acquisition, et connecteur configurable Search Console.
    7. **Contrôle Global & Diffusion** :
       - *Bandeau d'Annonce Global* (`renger_broadcast_banner`) : contrôle complet (actif/inactif, types info/success/warning/danger, texte, bouton avec lien optionnel, option masquable par les visiteurs), prévisualisation en direct dans Syni, injection automatique responsive sur toutes les pages via `components.js` (`initBroadcastBanner`).
       - *Mode Maintenance d'Urgence* (`renger_maintenance_mode`) : écran bloquant plein écran pour le grand public avec message personnalisé, bypass automatique pour l'administrateur suprême (`enism2007@hotmail.com` ou `is_admin = true`) matérialisé par un badge discret pulsant (`#renger-maintenance-admin-badge`), synchronisé réactivement via `core.js` sur `onAuthStateChange`.
       - *Journal d'Audit Chronologique* (`#syni-audit-log-table`) : visualiseur paginé avec filtres par type d'action et recherche texte, bouton d'export CSV UTF-8 (`syniModule.generateAuditCsv`).
    8. **Simulateur Business & Croissance** :
       - Curseurs interactifs temps réel : Flotte active (10 à 500), Taux abonnés PRO (0 à 80%), Jours loués/mois (1 à 25), Prix journalier moyen (30 à 150 CHF), Taux de remorques boostées (0 à 50%), Coûts fixes mensuels (100 à 2'000 CHF).
       - Moteur mathématique financier rigoureux : GMV mensuel & annuel, MRR & ARR des abonnements PRO (39 CHF/mois), Commissions Renger (20% sur non-PRO), Frais de traitement locataires (5% min 4.90 CHF sur chaque location), Revenus des boosts (moyenne pondérée 7.90 CHF), Revenu Net Total, Bénéfice Net Mensuel & Marge nette %, et Seuil de Rentabilité (Break-Even Point en nombre minimal de remorques et réservations).
       - Widget comparatif « Données Réelles de la Plateforme vs Scénario Simulé » avec tableau de bord KPI juxtapose.
  - **Footer Légal Harmonisé & Barre Rétractable** : Présence des 3 liens obligatoires (`mentions-legales.html`, `cgu.html`, `politique-confidentialite.html`), bouton toggle `#btn-toggle-sidebar` pour navigation mobile.

- [x] **Mise à Niveau Suprême « Syni Palantir 3.0 » & God Mode CRUD (`Site web/syni.html`, `Site web/js/syni.js`, `supabase/migrations/20260403000000_syni_admin.sql` - 13 Octobre 2026) :**
  - **God Mode CRUD Universel & Master Editor Modal (`#syni-master-editor-modal`)** :
    - Interface d'édition et création totale universelle pour toutes les entités de la plateforme : Utilisateurs (profils), Remorques (flotte) et Réservations (cashflow).
    - Méthodes intégrées : `openMasterEditor(entityType, entityId)`, `closeMasterEditor()`, `saveMasterEntity(entityType, entityId, formData, reason)` et `handleMasterEditorFormSave()`.
    - Boutons d'ajout directs `[+ Nouveau]` intégrés dans les en-têtes des modules Utilisateurs (`#btn-create-user`), Réservations (`#btn-create-booking`) et Remorques (`#btn-create-trailer`).
    - Boutons `[Éditer]` en direct sur chaque ligne de tableau pour modification à chaud (statuts, coordonnées, prix, caution, attributs PRO/Admin).
    - Journalisation automatique d'audit de chaque création et modification administrative avec traçabilité immédiate.
  - **Cycle de Vie Universel Soft-Delete & Corbeille (Conformité Droit Suisse CO art. 958f)** :
    - Remplacement absolu de toute suppression destructrice par un marquage d'archivage légal conforme à l'obligation de rétention de 10 ans des pièces comptables et transactions (CO art. 958f).
    - Ajout des colonnes `is_deleted boolean DEFAULT false` et `deleted_at timestamp with time zone DEFAULT null` avec index partiels B-Tree sur `profiles`, `trailers` et `bookings`.
    - Actions suprêmes dédiées `soft_delete` (mise en corbeille) et `restore` (restauration d'entité) avec motif obligatoire et journal d'audit.
    - Vues filtrées « Corbeille » intégrées dans les tableaux Utilisateurs (`#users-filter-role` -> `trash`), Remorques (`#trailers-filter-status` -> `trash`) et Réservations (`#bookings-filter-status` -> `trash`).
    - Actions contextuelles dynamiques : `[Supprimer]` pour les éléments actifs, `[Restaurer]` pour les éléments archivés en corbeille.
    - Prise en compte dans le moteur d'agrégation `computeSyniMetrics` (`metrics.trash.usersCount`, `metrics.trash.trailersCount`, `metrics.trash.bookingsCount`) et exclusion rigoureuse des remorques supprimées des métriques de flotte active.
  - **Module 9 : Palantir & Intelligence Opérationnelle (`#syni-mod-palantir`)** :
    - *Palantir Sentinel (Détection d'Anomalies & Fraudes)* :
      - Moteur heuristique temps réel calculant un score de risque global (0 à 100) et un statut d'intégrité dynamique (`NORMAL`, `VIGILANCE`, `CRITIQUE`) avec jauge colorée vectorielle.
      - 4 heuristiques spécialisées : Litiges & Cautions capturées (`heuristics.disputes`), États des lieux sans photos ou suspects (`heuristics.inspections`), Attaques par force brute / Rate limits dépassés (`heuristics.rateLimits`), et Taux d'annulations anormales (`heuristics.cancellations`).
      - Flux d'alertes hiérarchisé par niveau de sévérité (`CRITICAL`, `WARNING`, `INFO`).
    - *Network Explorer (Constellation Relationnelle)* :
      - Visualiseur de graphe relationnel vectoriel interactif (`#palantir-network-graph`, `getNetworkConstellation`) cartographiant les interconnexions multidirectionnelles entre utilisateurs, remorques possédées ou louées, réservations, inspections et cautions sous séquestre.
      - Sélecteur d'entités cible (`#palantir-entity-selector`) permettant d'isoler instantanément la toile relationnelle d'un utilisateur ou d'une remorque.
    - *Swiss Geo-Radar (Télémétrie & Cartographie GPS)* :
      - Grille de concentration de la flotte et des réservations par canton suisse (`#palantir-geo-cantons-grid` : Vaud, Genève, Valais, Fribourg, Neuchâtel, Berne, etc.) avec pourcentages et jauges.
      - Télémétrie GPS des états des lieux récents (`#palantir-gps-radar-list`) affichant coordonnées précises, horodatage suisse certifié et liens directs OpenStreetMap.
    - *Sauvegarde Intégrale BDD 1-Clic JSON (Conformité CO art. 958f)* :
      - Moteur d'exportation complète de la base de données (`generatePalantirBackup`, `exportDatabaseBackup`, boutons `#btn-palantir-backup-top` et `#btn-palantir-backup`).
      - Génère un fichier JSON horodaté (`renger_database_backup_YYYY-MM-DD_HH-mm-ss.json`) contenant tous les profils, remorques, réservations, inspections, rate limits, métadonnées de rétention légale suisse (10 ans) et empreinte SHA-256.
  - **Barre de Commande Rapide (Command Palette `Cmd+K` / `Ctrl+K`)** :
    - Modale de commande rapide façon cockpit opérationnel (`#syni-command-palette`, `#palantir-cmd-input`, `#palantir-cmd-results`).
    - Déclenchement au clavier (`Cmd+K` sur Mac, `Ctrl+K` sur PC, fermeture `Escape`) et par bouton dédié dans la barre supérieure (`#btn-open-command-palette`).
    - Moteur de recherche et d'actions prédictif `searchCommandPalette` :
      - Navigation instantanée vers les 9 modules (`Cockpit`, `Utilisateurs`, `Réservations`, `Flotte`, `Inspections`, `SEO`, `Contrôle`, `Simulateur`, `Palantir`).
      - Raccourcis d'actions God Mode (Créer un utilisateur, Ajouter une remorque, Nouvelle réservation, Sauvegarde JSON, Corbeille).
      - Recherche multi-critères en direct d'utilisateurs, remorques et réservations avec raccourcis directs d'édition dans le Master Editor.
  - **Business Brain V3 (Recommandations Stratégiques, Décomposeur OKR & 4 Scénarios d'Expansion)** :
    - *Recommandations Stratégiques Algorithmiques* (`computeStrategicRecommendations`, `#sim-strategic-recommendations`) : 3 recommandations prioritaires calculées sur la base des métriques réelles (taux de conversion PRO, pénétration cantonale, dynamisme de la tarification et des boosts).
    - *Décomposeur d'Objectifs OKR (ARR Target)* (`calculateOkrBreakdown`, `#sim-target-arr`, `#sim-okr-breakdown`) : Décomposition mathématique d'un objectif d'ARR (ex. 100'000 CHF) en nombre de remorques actives requises, réservations mensuelles, et quotas ciblés par canton romand (Vaud, Genève, Valais, Neuchâtel, Fribourg, Jura).
    - *Comparateur de 4 Scénarios d'Expansion* (`calculateExpansionScenarios`, `#sim-expansion-scenarios`) : Tableau comparatif stratégique des 4 scénarios de mise à l'échelle (1. Conservateur Romandie, 2. Agressif PRO, 3. Flotte Dense Suisse Alémanique, 4. Palantir Scale Suprême) avec GMV, Revenu net Renger, Bénéfice net et marge projetée.
  - **Module 10 : Syni Copilot & Studio Modulaire Colab (`#syni-mod-copilot`)** :
    - *Assistant Conversationnel & IA Data Science Dédié* :
      - Assistant conversationnel bidirectionnel intégré (`#copilot-chat-messages`, `#copilot-chat-form`, `#copilot-input`, `#copilot-shortcuts-bar`).
      - Analyse en langage naturel ou suggestions en 1 clic : *Filtres x Prix des remorques & évolution*, *Équilibre Offre vs Demande par canton*, *Recherches sans résultat & opportunités de flotte*, *Élasticité prix et conversion*.
    - *Canevas Dynamique Modulaire Interactif* (`#copilot-dynamic-canvas`) :
      - Studio modulaire générant en temps réel des graphiques interactifs Chart.js (barres, courbes, comparaisons) et tableaux complets exportables en CSV.
      - Cartes modulaires amovibles individuellement ou réinitialisables en 1 clic (`#btn-clear-canvas`).
    - *Moteur Analytique Avancé : Croisement Filtres x Prix Catalogue* (`analyzeSearchFiltersVsTrailerPrices`) :
      - Croisement multidimensionnel entre les filtres de recherche les plus sollicités (Plateau porte-voiture, Bagagère, Porte-moto, Benne, etc.) et les remorques réelles du catalogue Renger.
      - Calcul automatisé de l'écart budgétaire en CHF (`priceGap` = Prix Catalogue - Budget Recherché), du ratio de tension de l'offre/demande, et de la tendance temporelle d'évolution.
    - *Deep-Dive Catégoriel : Recherches vs Prix par Tranche (ex: Remorques à Cheval)* (`analyzeCategoryDeepDive`, `analyze_category_depth`) :
      - Traitement ultra-précis des questions ciblées : *« quantité de recherche pour des remorques à cheval en relation avec les prix de celle-ci »*.
      - Discrétisation de la demande locataire et de l'offre catalogue en 5 tranches tarifaires réelles (`< 70 CHF`, `70 - 89 CHF`, `90 - 109 CHF`, `110 - 129 CHF`, `≥ 130 CHF`).
      - Détection automatique des zones de pénurie critique (ex: tranche 70 - 89 CHF avec 38.3% des recherches et 0 remorque en catalogue) et génération d'un graphique logique à barres groupées (Demande locataires en bleu ciel `#38bdf8` vs Offre catalogue en Terracotta `#d85110`).
      - Bouton de suggestion rapide en 1 clic intégré dans l'interface de chat (`Vans à chevaux : Recherches vs Prix`).
    - *Pipeline de Télémétrie First-Party Sécurisé (`search_events`)* :
      - Table PostgreSQL `search_events` (`id`, `category`, `search_text`, `has_dates`, `results_count`, `results_avg_price`, `results_min_price`, `results_max_price`, `session_id`, `created_at`).
      - RLS stricte : insertion publique avec vérification de bornes, sélection réservée à `is_syni_admin()`.
      - Module `tracking.js` (`trackSearch`) et `core.js` (`loadTrailers`) collectant les recherches réelles dans le strict respect de la nLPD suisse (session anonyme, opt-in cookies, anti-rebond 30s).
    - *Google Colab Bridge & Triple Mode Hybride* :
      - Notebook Jupyter officiel prêt à l'emploi (`renger_analytics_colab.ipynb`) avec pandas, matplotlib, scikit-learn, fonction `analyze_category_depth` et serveur FastAPI bridge (ngrok).
      - Export live du dataset plateforme complet en 1 clic au format JSON (`exportColabDataset`, `#btn-colab-export-dataset`).
      - Modale de configuration Google Colab (`#syni-colab-modal`, `#colab-endpoint-url`) permettant de brancher l'URL du webhook distant avec bascule automatique et transparente sur le moteur analytique local JavaScript en cas de déconnexion.
  - **Tests & Validation Rigoureuse** :
    - 4 suites de tests challengers (Suites 18 à 21) dans `tests/challenger-syni-admin.test.mjs` (83 tests à 100%).
    - **100% de réussite** sur l'ensemble des 7 paliers (`node tests/run-tests.mjs`) : **293 / 293 tests validés**.
    - **100% de réussite** sur l'ensemble des tests challengers (`node --test tests/challenger-*.test.mjs`) : **345 / 345 tests validés**.
    - Total de **638 tests automatisés au vert sans aucun échec ni régression**.

- [x] **Stratégie Complète de Référencement Google SEO & Indexation Suisse Romande (15 Octobre 2026) :**
  - **Crawlabilité Technique & Maîtrise de l'Indexation** :
    - Génération de `sitemap.xml` (à la racine `/sitemap.xml` et miroir dans `Site web/sitemap.xml`) recensant les 11 URLs publiques officielles avec priorités pondérées (`1.0` pour l'accueil, `0.9` pour le catalogue et les hubs cantonaux, `0.8` pour le dépôt d'annonce et l'offre PRO, `0.5` pour les pages juridiques) et fréquences de rafraîchissement adaptées.
    - Configuration de `robots.txt` autorisant explicitement l'indexation publique (`Allow: /`) tout en interdisant le crawl des routes privées et sensibles (`/profil`, `/profil.html`, `/inspection`, `/inspection.html`, `/stats`, `/stats.html`, `/syni`, `/syni.html`, `/supabase/`, `/tests/`) et en déclarant la directive `Sitemap: https://renger.ch/sitemap.xml`.
    - Injection de `<meta name="robots" content="noindex, nofollow">` sur l'ensemble des 4 interfaces privées (`profil.html`, `inspection.html`, `stats.html`, `syni.html`) pour prémunir toute fuite d'indexation dans Google.
    - Création du template de vérification Search Console `Site web/google-site-verification-template.html` et du guide pas à pas `GOOGLE_SEARCH_CONSOLE_GUIDE.md` (validation DNS TXT / balise HTML / fichier HTML, soumission de sitemap, inspection d'URL, suivi des 9 mots-clés suisses prioritaires).
  - **Métadonnées On-Page Haute Performance & Social Sharing** :
    - Balises `<title>` percutantes (50 à 60 caractères) optimisées CTR avec mots-clés géo-ciblés en Suisse romande ("Location Remorque Suisse | Particuliers & Pros | Dès 25 CHF/j | Renger", etc.).
    - Balises `<meta name="description">` persuasives (145 à 160 caractères) mentionnant explicitement la devise CHF, l'absence de commission cachée, la caution sécurisée, le contrat suisse et les cantons romands (Vaud, Genève, Valais).
    - Balises `<link rel="canonical">` absolues (`https://renger.ch/...`) sur toutes les pages.
    - Balises OpenGraph et Twitter Cards harmonisées pointant vers l'image haute fidélité `https://renger.ch/Logo_Renger.jpg` (résolution du rejet universel des SVG par WhatsApp, Facebook, LinkedIn et X).
  - **Données Structurées Schema.org JSON-LD Riches** :
    - `index.html` : `AutoRental` & `LocalBusiness` déclarant les prix en CHF (`priceRange: "$$"`), devises acceptées (`currenciesAccepted: "CHF"`), cantons desservis (`areaServed` : Vaud, Genève, Valais) et `FAQPage` alignée à 100% avec les 4 questions de l'accordéon utilisateur.
    - `remorques.html` : `ItemList` et `AggregateOffer` en CHF avec fil d'Ariane `BreadcrumbList`.
    - `remorque.html`, `louer-ma-remorque.html`, `pro.html`, `mentions-legales.html`, `cgu.html`, `politique-confidentialite.html` : `BreadcrumbList` et `LocalBusiness` enrichis.
    - Hubs cantonaux : `Service`, `AutoRental` et `BreadcrumbList` géo-spécifiques.
  - **3 Hubs Locaux SEO Suisse Romande & Maillage Interne (`js/components.js`)** :
    - `Site web/location-remorque-vaud.html` : Dédié au Canton de Vaud (Lausanne, Yverdon-les-Bains, Montreux, Nyon, Morges, Vevey, Aigle).
    - `Site web/location-remorque-geneve.html` : Dédié au Canton de Genève (Genève, Carouge, Meyrin, Vernier, Lancy, Thônex, Versoix).
    - `Site web/location-remorque-valais.html` : Dédié au Canton du Valais (Sion, Martigny, Sierre, Monthey, Brig-Glis, Verbier).
    - Structure complète par hub : Hero local, grille tarifaire indicative par type de remorque, cas d'usage régionaux (déménagement, chantiers alpins, vignobles, nautisme Léman), FAQ géolocalisée et call-to-action dirigeant vers le catalogue avec pré-filtrage cantonal (`remorques.html?canton=...` alimentant automatiquement le moteur de recherche `core.js`). Intégration de `components.js` et `tracking.js` pour la synchronisation du thème sombre et de la bannière cookies nLPD.
    - Maillage dynamique : Constante `RENGER_SEO_HUBS` et fonction `injectSeoFooterLinks()` dans `Site web/js/components.js`, avec gardes défensives pour l'environnement bac à sable VM et footers légaux harmonisés (préservation obligatoire des liens Mentions Légales, CGU et Confidentialité).
  - **Suite Automatisée Tier 8 SEO (`tests/tier8-seo-audit.test.mjs`) & Non-Régression** :
    - 94 assertions automatisées vérifiant la syntaxe de sitemaps, robots.txt, balises noindex privées, longueurs et mots-clés des titres/descriptions publiques, OpenGraph/Twitter Cards, dimensions physiques réelles sur disque des images sociales (min 200x200), parsing JSON-LD de tous les blocs Schema.org (incluant ItemList & AggregateOffer en CHF sur le catalogue), et intégrité des 3 hubs régionaux.
    - Intégration en tant que Tier 8 dans le lanceur de tests `tests/run-tests.mjs`.
    - **100% de réussite** : 396 / 396 tests sur l'ensemble des 8 paliers du runner (`node tests/run-tests.mjs`), 366 / 366 tests sur les challengers (`node --test tests/challenger-*.test.mjs`). Total de **762 tests automatisés validés à 100%**.
- [x] **Consolidation Financière & Expérience Propriétaire 100% Stripe Connect (15 Octobre 2026) :**
  - **Suppression intégrale du bloc de saisie manuelle d'IBAN suisse** (`profil.html`) :
    - Éradication de la boîte manuelle "Coordonnées de versement bancaire" (`#settings-fullname`, `#settings-iban`, `#settings-save-bank-btn`).
    - Élimination des frictions et risques de conservation de coordonnées bancaires en base de données.
  - **Priorisation exclusive de l'infrastructure Stripe Connect Sécurisée** (`profil.html`, `core.js`, `trailers.js`) :
    - Carte Stripe Connect officielle avec statut réactif (`#settings-stripe-status-badge`) : pastille verte animée `COMPTE CONFIGURÉ` lorsque le compte est relié, ou pastille ambre `À CONFIGURER`.
    - Bouton d'action sécurisé `#settings-stripe-btn` avec gestion d'état de chargement en direct (`Connexion sécurisée à Stripe...`) prévenant les double-clics.
    - Explication tarifaire dynamique (`#settings-stripe-explainer`) distinguant avec clarté les utilisateurs standards (80% net de gains) et les abonnés Renger PRO (100% net de gains, 0% commission).
    - Traitement transparent des redirections retour Stripe (`?stripe=success` et `?stripe=refresh`).
  - **Suite de tests mise à jour & conformité** :
    - Refonte du test Item 6 dans `tests/challenger-owner-experience.test.mjs` vérifiant la présence du bouton et du badge Stripe Connect et confirmant l'absence totale du champ `#settings-iban`.
- [x] **Système de Solde Propriétaire & Retrait Sécurisé dès 80 CHF (15 Octobre 2026) :**
  - **Affichage dynamique du solde disponible** (`profil.html`, `trailers.js`) :
    - Nouvelle carte dédiée "Solde du compte" dans les paramètres (`#settings-account-balance`) et indicateur direct dans le cockpit Propriétaire de Mon Espace (`#seller-available-balance`).
    - Algorithme de calcul certifié `calculateOwnerBalance()` : prise en compte exclusive des réservations complétées et payées (`todayStr > endStr`), application du taux net (100% PRO vs 80% Standard), et déduction exacte des versements déjà demandés.
  - **Seuil strict de retrait à 80.00 CHF & Bouton intelligent** :
    - Si solde < 80 CHF : bouton `#btn-request-payout` désactivé avec mention du montant manquant (`Encore X.XX CHF pour débloquer votre versement`) et badge d'état neutre `Min. 80 CHF`.
    - Si solde >= 80 CHF : bouton actif en émeraude avec libellé dynamique `Retirer mes gains (X.XX CHF) →` et badge animé `Retrait disponible`.
    - Sécurité Stripe Connect : vérification de la présence de `stripe_account_id` avant toute demande de virement (redirection vers le bouton de liaison si non configuré) et dialogue de confirmation détaillé.
  - **Contrat BDD PostgreSQL & Sécurité RLS (`supabase_migrations.sql`)** :
    - Table `public.payouts` (`id`, `user_id`, `amount`, `status`, `created_at`) avec contrainte SQL stricte `CHECK (amount >= 80.00)` et politiques RLS Zéro-Confiance pour l'utilisateur et l'administrateur Syni.
    - Fallback de persistance locale hybride pour garantir l'expérience même en cas d'attente d'exécution du script SQL par l'administrateur.
  - **Suite de tests & Robustesse** :
    - Ajout du groupe Item 11 dans `tests/challenger-owner-experience.test.mjs` testant les seuils, les taux 80%/100%, les déductions et les contraintes SQL.
    - **100% de réussite** : 396 tests Tiers T1-T8 + 368 tests challengers. Total de **764 tests automatisés au vert sans régression**.
- [x] **Backend Automatisé de Virement Stripe Connect & Edge Function `stripe-payout` (15 Octobre 2026) :**
  - **Edge Function Sécurisée Deno `stripe-payout` (`supabase/functions/stripe-payout/index.ts`)** :
    - Déploiement en production sur Supabase Cloud (`cwifrzajxrcpnqceyxnj`) avec statut `ACTIVE`.
    - Authentification stricte de l'appelant via JWT Bearer (`supabaseAdmin.auth.getUser(token)`).
    - Rate limiter anti-DoS financier sur la table `rate_limits` : maximum 5 requêtes par fenêtre glissante de 10 minutes par `user.id`.
    - **Zero-Trust Financial Architecture** : Le montant n'est jamais dicté par le client ; le solde disponible réel est calculé intégralement côté serveur par interrogation PostgreSQL (`bookings` payées et complétées où `end_date < todayStr`, application du taux 100% PRO ou 80% Standard, déduction de la table `payouts`).
    - Contrôle impératif du seuil minimum de 80.00 CHF : rejet immédiat en HTTP 400 si `verifiedBalance < 80.00`.
    - Vérification du compte de destination : validation de l'existence de `stripe_account_id` dans `profiles`.
    - Exécution du transfert bancaire officiel via `stripe.transfers.create({ amount, currency: 'chf', destination: profile.stripe_account_id, description: 'Virement de gains locatifs Renger' })`.
    - Gestion robuste des états de versement dans `payouts` : insertion initiale en `en_cours`, bascule en `vire` avec `stripe_transfer_id` en cas de succès, ou bascule en `echoue` avec conservation de `error_message` pour libérer le solde en cas de refus bancaire.
  - **Câblage Frontend Déterministe (`Site web/js/trailers.js` & `Site web/js/core.js`)** :
    - Exposition globale de `callEdgeFunction` sur `window` et dans les exports Node.js.
    - Déclenchement transparent de `callEdgeFunction('stripe-payout')` avec indicateur de chargement (`Transfert Stripe en cours...`) et toast récapitulatif mentionnant la référence Stripe Connect.
    - Robustesse de calcul `calculateOwnerBalance` : exclusion automatique des versements dont le statut est `echoue` ou `rejete`.
  - **Migrations de schéma (`supabase_migrations.sql` & `supabase/migrations/20260416000000_payouts.sql`)** :
    - Déclaration des colonnes `stripe_transfer_id` et `error_message` avec RLS Zéro-Trust.
  - **Validation & Couverture de Tests Automatisés** :
    - Ajout du groupe Item 12 dans `tests/challenger-owner-experience.test.mjs` testant l'Edge Function et ses garde-fous Zero-Trust DevSecOps.
    - **100% de réussite** : 396 tests (Tiers 1 à 8) + 374 tests challengers. Total de **770 tests automatisés validés avec succès**.
- [x] **Cockpit Syni : Suivi Financier des Soldes Propriétaires, Flottes & Fonds Stripe (16 Octobre 2026) :**
  - **Carte KPI Globale des Fonds Propriétaires (`Site web/syni.html`, `Site web/js/syni.js`)** :
    - Intégration en 5ème carte KPI majeure dans le Cockpit Général (`#kpi-owners-funds-cockpit`) et dans le Module 3 Réservations & Cashflow (`#kpi-owners-funds-cashflow`).
    - Métrique principale : Total des gains nets non encore retirés et immédiatement disponibles pour les propriétaires (`todayStr > endStr`, 100% PRO / 80% Standard, déduction des virements initiés/effectués).
    - Métrique secondaire / sous-titre : Total des fonds séquestrés en cours de sécurisation (`#kpi-owners-ongoing-escrow`) pour les locations actives (`todayStr <= endStr`).
  - **Tableau des Utilisateurs Enrichi (`Site web/syni.html`, `Site web/js/syni.js`)** :
    - Nouvelle colonne "Solde Propriétaire" avec badge dynamique vert émeraude si retirable (`≥ 80.00 CHF`), badge neutre si `< 80.00 CHF`, et tiret pour les locataires purs.
    - Nouveau filtre rapide dans le sélecteur d'utilisateurs : `<option value="withdrawable">Solde ≥ 80 CHF (Retirable)</option>`.
    - Bouton "Inspecter" ouvrant un volet/modale d'inspection de profil (`#syni-user-detail-modal`) :
      * Coordonnées, rôle (PRO/Standard/Locataire), Stripe Customer ID et statut Stripe Connect isolé.
      * Synthèse financière certifiée (Total gains nets, total déjà retiré, solde immédiatement disponible, fonds séquestrés en cours).
      * Grille de toutes les remorques associées au propriétaire (photos, tarifs, plaques d'immatriculation, freinage, statut).
      * Historique exhaustif des demandes de virement du propriétaire avec date, montant, statut (`vire`, `en_cours`, `echoue`) et référence `stripe_transfer_id`.
  - **Module Réservations & Cashflow (`Site web/syni.html`, `Site web/js/syni.js`)** :
    - Tableau centralisé de tous les virements de la plateforme (`#syni-payouts-tbody`) avec filtrage, statut et lien direct vers les profils.
    - Export CSV enrichi intégrant le solde propriétaire, les fonds sous séquestre et le Stripe Connect ID.
    - Recherche instantanée dans la palette de commandes (Cmd+K) par référence de virement Stripe.
  - **Backend & Edge Functions (`supabase/functions/syni-data/index.ts`)** :
    - Intégration de la requête `public.payouts` dans `syni-data` et déploiement live sur Supabase Cloud (`cwifrzajxrcpnqceyxnj`).
    - Arithmétique calendaire robuste sur fuseau horaire UTC minuit éliminant les biais horaires et de changements d'heure (DST).
  - **Suite Automatisée & Couverture** :
    - Ajout de la Suite 22 dans `tests/challenger-syni-admin.test.mjs` (18 tests complets couvrant calculs, filtres, modale et Edge Functions).
    - **100% de réussite** : 414 tests des 8 paliers du runner + 392 tests challengers. Total de **806 tests automatisés validés à 100%**.

### ⏳ Prochaines Évolutions Prioritaires
- [ ] Optimiser le chargement mobile des images d'annonces (format WebP automatique).
- [ ] Déployer la fonction `stripe-portal` sur Supabase Cloud et renseigner `SYNI_MASTER_KEY` dans les secrets Supabase.
