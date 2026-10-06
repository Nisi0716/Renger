# Architecture de l'Infrastructure de Tests Automatisés — Renger

## 1. Philosophie & Principes Directeurs
L'infrastructure de test du projet Renger est conçue selon le principe **zéro dépendance externe** (Zero Dependencies) afin de garantir :
- Une exécution instantanée (< 250 ms pour l'ensemble de la suite).
- Une portabilité totale sur tout environnement disposant de **Node.js 24 LTS** sans étape préalable de `npm install`.
- L'absence d'obsolescence ou de conflits de paquets tiers (`vitest`, `jest`, `jsdom`, etc.).
- L'utilisation exclusive des modules natifs standards de Node.js 24 :
  - `node:test` : Test runner natif, suites hiérarchiques (`describe`, `test`, `it`), cycle de vie (`before`, `after`, `beforeEach`), assertions asynchrones.
  - `node:assert/strict` : Moteurs d'assertion stricts (`strictEqual`, `deepStrictEqual`, `match`, `throws`).
  - `node:vm` : Isolation et exécution sécurisée des scripts front-end Vanilla JS dans un contexte sandbox avec simulation de l'environnement global (`window`, `document`, `localStorage`).
  - `node:child_process` : Vérification syntaxique formelle via `node --check`.
  - `node:fs` & `node:path` : Analyse statique du code source HTML et JS.

---

## 2. Modèle Orchestration Dual Track (Double Voie)
Dans le cadre du développement du projet Renger, les tests et l'implémentation fonctionnent en pistes parallèles étanches :
1. **Piste Tests (Test Track) :** Écrit et maintient les spécifications exécutables dans `tests/` en fonction des exigences de `ORIGINAL_REQUEST.md` et des contrats d'interface de `PROJECT.md`. Ne modifie jamais le code source applicatif dans `Site web/`.
2. **Piste Implémentation (Milestones M1 à M4) :** Corrige les bogues identifiés dans `Site web/` et valide chaque jalon par rapport à la suite de tests automatisée.

Aucun test "façade" (test artificiel passant systématiquement sans tester la logique) n'est toléré. Chaque test doit répondre à la question : *"Si ce test échoue, quelle fonctionnalité métier est dégradée ?"*

---

## 3. Architecture des 4 Paliers de Tests (Tiered Test Architecture)

```
tests/
├── run-tests.mjs                   # Runner global orchestrateur et générateur de rapport
├── tier1-syntax-html.test.mjs      # Tier 1 : Syntaxe JS, intégrité HTML5, configuration Tailwind
├── tier2-dom-elements.test.mjs     # Tier 2 : Présence des identifiants DOM, modales et liens MPA
├── tier3-business-logic.test.mjs   # Tier 3 : Calculs de dates (DST), caution, frais, anti-scam, cookies
└── tier4-mpa-journeys.test.mjs     # Tier 4 : Payloads d'annonces, routage MPA ?edit=, filtres, résilience Supabase
```

### Tier 1 : Syntaxe & Intégrité HTML (`tier1-syntax-html.test.mjs`)
- **Objectif :** Vérification formelle du code source avant tout chargement en runtime.
- **Périmètre :**
  - Validation syntaxique `node --check` sur tous les fichiers `Site web/js/*.js` (`core.js`, `trailers.js`, `booking.js`, `chat.js`, `components.js`, `inspection.js`, `tracking.js`). Détecte immédiatement les erreurs de syntaxe fatales (ex. `trailers.js:1574`).
  - Validation structurelle des 9 pages HTML (`index.html`, `remorques.html`, `remorque.html`, `louer-ma-remorque.html`, `profil.html`, `inspection.html`, `pro.html`, `cgu.html`, `politique-confidentialite.html`).
  - Détection et rejet des artefacts textuels `\n` bruts injectés avant la balise fermante `</body>`.
  - Vérification de l'inclusion obligatoire de `<script src="js/tracking.js"></script>` dans `index.html`.
  - Contrôle de la configuration CDN Tailwind CSS : vérifie que `darkMode` vaut `'class'` et rejette les coquilles comme `'c11lass'`.

### Tier 2 : Éléments DOM & Contrats de Modales (`tier2-dom-elements.test.mjs`)
- **Objectif :** Garantir que les éléments ciblés par les scripts JS existent dans le balisage des pages concernées.
- **Périmètre :**
  - Tableau de bord PRO dans `profil.html` : présence obligatoire des éléments `#stat-impressions`, `#stat-clicks`, `#stat-conversion`, `#stat-occupancy` et du conteneur de flou `#pro-stats-blur`.
  - Modale d'avis (`#review-modal`) : présente dans `remorque.html` et `profil.html` pour permettre le dépôt d'avis sans exception DOM.
  - Modale d'avertissement d'état des lieux (`#inspection-warning-modal`) : présente dans `profil.html` et `inspection.html` pour avertir le locataire tentant de clôturer sans photos.
  - Navigation mobile : vérification que le lien `#mobile-nav-settings` cible bien `profil.html?p=settings-page` au lieu de `profil.html` brut sur toutes les pages.

### Tier 3 : Logique Métier & Calculs (`tier3-business-logic.test.mjs`)
- **Objectif :** Valider les algorithmes purs, les règles financières et de conformité légale suisse.
- **Périmètre :**
  - Calcul de durée de location et transition d'heure d'hiver (DST) : vérifie qu'une location du 24 au 26 octobre 2026 (passage à l'heure d'hiver en Suisse, 49 heures) est calculée comme exactement 3 jours de location et non 4 jours.
  - Calcul des frais de service Renger (`calculateRengerServiceFee`) : 5% du prix de la location avec un minimum garanti de 4.90 CHF et arrondi suisse aux 5 centimes (ex: 20 CHF -> 4.90 CHF, 100 CHF -> 5.00 CHF, 77 CHF -> 4.90 CHF).
  - Calcul du barème de caution (`getTrailerCaution`) : gestion des surcharges catégories lourdes (400 CHF pour cheval, voiture, réfrigéré ou charge utile > 1200 kg), intermédiaires (300 CHF pour moto ou charge utile > 750 kg), standards (200 CHF pour utilitaires légers). Respect des montants personnalisés de la remorque.
  - Filtre anti-contournement / Anti-scam (`sanitizeMessage`) : masquage des numéros de téléphone suisses et internationaux (+41, 079, 0041...), adresses email, identifiants bancaires IBAN suisses (format `CH...`), tout en préservant le texte légitime d'une annonce ou question normale.
  - Évaluation du consentement cookies (RGPD / nLPD) : respect de la valeur `renger_cookie_consent` ('accepted' active le tracking, 'refused' ou 'declined' désactive tout appel analytique).

### Tier 4 : Parcours Utilisateurs MPA & Résilience (`tier4-mpa-journeys.test.mjs`)
- **Objectif :** Tester les flux transversaux entre pages et la tolérance aux pannes réseau ou Supabase.
- **Périmètre :**
  - Structure du payload de publication d'annonce : vérification que l'objet `newTrailer` produit par `handlePublish()` conserve le champ textuel `location` saisi par l'utilisateur en plus des coordonnées géocodées (`location_city`, `latitude`, `longitude`).
  - Flux d'édition d'annonce MPA : vérification que `editTrailer(id)` redirige vers `louer-ma-remorque.html?edit=${id}` et que la page de formulaire parse `edit` pour pré-remplir les champs et basculer le libellé du bouton en mise à jour.
  - Invocation des filtres de catégories : vérification que sur `remorques.html?category=...`, la fonction appelée est `setFilter` (et non la fonction indéfinie `filterByCategory`).
  - Résilience hors-ligne / fallback Supabase : vérification que les fonctions analytiques (`logImpression`, `logClick`, `startTracking`) et de chargement (`loadTrailers`) ne lèvent pas d'exception non gérée lorsque `supabaseClient` est `null` ou indisponible, et que l'indisponibilité de la vue `trailer_booked_dates` dispose d'un repli élégant.

---

## 4. Guide d'Exécution & Commandes CLI

### 4.1 Exécution Globale avec Rapport Détaillé
```bash
node tests/run-tests.mjs
```
Exécute séquentiellement les 4 tiers, affiche la sortie détaillée des tests ainsi qu'un tableau récapitulatif avec taux de succès par palier et temps d'exécution.

### 4.2 Exécution Ciblée par Palier
```bash
# Exécuter uniquement le Tier 1 (Syntaxe & HTML)
node --test tests/tier1-syntax-html.test.mjs

# Exécuter uniquement le Tier 2 (DOM & Modales)
node --test tests/tier2-dom-elements.test.mjs

# Exécuter uniquement le Tier 3 (Logique Métier & Calculs)
node --test tests/tier3-business-logic.test.mjs

# Exécuter uniquement le Tier 4 (Parcours MPA & Résilience)
node --test tests/tier4-mpa-journeys.test.mjs
```

### 4.3 Codes de Retour & Intégration Continue (CI)
- Code `0` : 100% des tests exécutés avec succès.
- Code `1` : Au moins un test a échoué (diagnostic d'anomalie à escalader vers l'agent d'implémentation concerné).
