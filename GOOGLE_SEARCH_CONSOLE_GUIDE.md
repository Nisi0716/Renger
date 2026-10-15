# 🚀 Guide d'Indexation Google Search Console & Stratégie SEO Renger

Ce guide pas à pas détaille la procédure officielle pour indexer et positionner au sommet le site **[renger.ch](https://renger.ch)** sur le moteur de recherche Google (google.ch et google.com).

---

## 1. Connexion & Ajout de la Propriété dans Google Search Console

1. Rendez-vous sur la console officielle : **[Google Search Console](https://search.google.com/search-console)**.
2. Connectez-vous avec l'adresse Google du projet (`enism2007@hotmail.com` ou le compte Google associé).
3. Cliquez sur **Ajouter la propriété** en haut à gauche :
   - **Option recommandée (Préfixe de l'URL) :** Saisissez `https://renger.ch`.
   - **Option DNS (Domaine global) :** Saisissez `renger.ch` si vous avez accès direct aux enregistrements TXT de votre registrar DNS (Infomaniak, Cloudflare, etc.).

---

## 2. Validation de la Propriété (Deux Méthodes Disponibles)

### Méthode A : Balise HTML (Instantanée)
Dans `Site web/index.html`, la balise suivante est prête à l'emploi :
```html
<meta name="google-site-verification" content="GOOGLE_SEARCH_CONSOLE_VERIFICATION_TOKEN">
```
1. Lors du choix de la méthode de validation, sélectionnez **Balise HTML**.
2. Copiez le jeton unique fourni par Google (la chaîne alphanumérique dans `content="..."`).
3. Remplacez `GOOGLE_SEARCH_CONSOLE_VERIFICATION_TOKEN` dans `Site web/index.html` par votre jeton réel.
4. Déployez le site et cliquez sur **Valider** dans Google Search Console.

### Méthode B : Fichier HTML
1. Téléchargez le fichier de validation Google (généralement nommé `google[code].html`).
2. Vous pouvez également renommer le fichier modèle préparé `Site web/google-site-verification-template.html` avec le nom exact exigé par Google.
3. Déposez-le à la racine publique de votre hébergeur web.
4. Cliquez sur **Valider**.

---

## 3. Soumission du Sitemap XML

Dès la propriété validée :
1. Dans le menu de gauche de Google Search Console, cliquez sur **Sitemaps**.
2. Dans le champ « Ajouter un sitemap », saisissez :
   ```
   sitemap.xml
   ```
   (ce qui correspond à l'URL complète `https://renger.ch/sitemap.xml`).
3. Cliquez sur **Envoyer**.
4. Le statut doit passer à **Opération réussie (Success)**, détectant l'ensemble des 11 URLs publiques prioritaires :
   - `https://renger.ch/` (Page d'accueil)
   - `https://renger.ch/index.html`
   - `https://renger.ch/remorques.html` (Catalogue complet & carte)
   - `https://renger.ch/louer-ma-remorque.html` (Dépôt d'annonce)
   - `https://renger.ch/pro.html` (Offre Loueur PRO)
   - `https://renger.ch/location-remorque-vaud.html` (Hub Canton de Vaud / Lausanne)
   - `https://renger.ch/location-remorque-geneve.html` (Hub Canton de Genève)
   - `https://renger.ch/location-remorque-valais.html` (Hub Canton du Valais / Sion)
   - `https://renger.ch/cgu.html` (CGU légales suisses)
   - `https://renger.ch/mentions-legales.html` (Mentions légales)
   - `https://renger.ch/politique-confidentialite.html` (nLPD / RGPD)

---

## 4. Forçage de l'Indexation Initiale (Inspection d'URL)

Googlebot peut prendre quelques jours pour explorer un nouveau sitemap. Pour accélérer l'indexation sous 24-48 heures :
1. Utilisez la barre de recherche supérieure **« Inspecter n'importe quelle URL »**.
2. Entrez successivement :
   - `https://renger.ch/`
   - `https://renger.ch/remorques.html`
   - `https://renger.ch/location-remorque-vaud.html`
   - `https://renger.ch/location-remorque-geneve.html`
   - `https://renger.ch/location-remorque-valais.html`
3. Pour chaque URL, cliquez sur **Demander une indexation (Request Indexing)**.

---

## 5. Données Structurées & Rich Snippets Google

Le code source intègre les schémas Schema.org JSON-LD validés pour maximiser le taux de clic (CTR) dans les résultats de recherche (SERP) :
- **AutoRental & LocalBusiness** : Déclaration officielle de l'activité de location, monnaie CHF, zones desservies en Suisse romande.
- **FAQPage** : Affichage d'accordéons de questions/réponses directement sous le résultat Google (rich snippets & People Also Ask).
- **BreadcrumbList** : Fil d'Ariane hiérarchique clair dans les extraits de recherche Google.
- **ItemList / AggregateOffer** : Présentation structurée du catalogue des remorques.

Vous pouvez tester à tout moment la validité de ces balises via l'outil officiel :
**[Google Rich Results Test](https://search.google.com/test/rich-results)**.

---

## 6. Protection des Espaces Privés & Zéro Trust

Conformément à la sécurité nLPD et aux directives de confidentialité :
- Les fichiers `profil.html`, `inspection.html`, `stats.html` et `syni.html` sont protégés par la balise `<meta name="robots" content="noindex, nofollow">`.
- Le fichier `robots.txt` interdit explicitement l'exploration de ces routes ainsi que des dossiers d'infrastructure `/supabase/` et `/tests/`.
