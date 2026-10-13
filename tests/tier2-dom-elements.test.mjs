import { describe, test, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const siteWebDir = path.join(projectRoot, 'Site web');

/**
 * Utilitaire d'extraction et de recherche d'éléments DOM par ID dans une chaîne HTML
 */
function hasElementWithId(htmlContent, id) {
    const idRegex = new RegExp(`id=["']${id}["']`, 'i');
    return idRegex.test(htmlContent);
}

/**
 * Utilitaire d'extraction de la valeur de l'attribut href pour un élément avec un ID donné
 */
function getHrefForId(htmlContent, id) {
    const tagMatch = htmlContent.match(new RegExp(`<a[^>]*id=["']${id}["'][^>]*>`, 'i')) ||
                     htmlContent.match(new RegExp(`<a[^>]*href=["']([^"']*)["'][^>]*id=["']${id}["'][^>]*>`, 'i'));
    if (!tagMatch) return null;
    const hrefMatch = tagMatch[0].match(/href=["']([^"']*)["']/i);
    return hrefMatch ? hrefMatch[1] : null;
}

describe('Tier 2: PRO Dashboard DOM Contract in profil.html', () => {
    const profilPath = path.join(siteWebDir, 'profil.html');
    let content = '';

    it('profil.html must exist and load', () => {
        assert.ok(fs.existsSync(profilPath), `profil.html introuvable: ${profilPath}`);
        content = fs.readFileSync(profilPath, 'utf8');
    });

    const requiredProStatsIds = [
        'stat-impressions',
        'stat-clicks',
        'stat-conversion',
        'stat-occupancy',
        'pro-stats-blur'
    ];

    for (const elementId of requiredProStatsIds) {
        it(`profil.html must contain DOM element #${elementId}`, () => {
            content = fs.readFileSync(profilPath, 'utf8');
            const exists = hasElementWithId(content, elementId);
            assert.ok(
                exists,
                `Élément manquant dans profil.html : id="${elementId}" requis par trailers.js:loadProfileData`
            );
        });
    }
});

describe('Tier 2: Review Modal (#review-modal) Cross-Page Contract', () => {
    it('profil.html must contain #review-modal container', () => {
        const filePath = path.join(siteWebDir, 'profil.html');
        const content = fs.readFileSync(filePath, 'utf8');
        assert.ok(hasElementWithId(content, 'review-modal'), `profil.html doit inclure #review-modal`);
        assert.ok(hasElementWithId(content, 'review-modal-subtitle'), `profil.html doit inclure #review-modal-subtitle`);
    });

    it('remorque.html must contain #review-modal container', () => {
        const filePath = path.join(siteWebDir, 'remorque.html');
        const content = fs.readFileSync(filePath, 'utf8');
        assert.ok(
            hasElementWithId(content, 'review-modal'),
            `remorque.html doit inclure #review-modal pour débloquer le bouton "Laisser un avis"`
        );
        assert.ok(
            hasElementWithId(content, 'review-modal-subtitle'),
            `remorque.html doit inclure #review-modal-subtitle pour l'affichage dynamique`
        );
    });
});

describe('Tier 2: Inspection Warning Modal (#inspection-warning-modal) Cross-Page Contract', () => {
    it('inspection.html must contain #inspection-warning-modal', () => {
        const filePath = path.join(siteWebDir, 'inspection.html');
        const content = fs.readFileSync(filePath, 'utf8');
        assert.ok(
            hasElementWithId(content, 'inspection-warning-modal'),
            `inspection.html doit inclure #inspection-warning-modal`
        );
    });

    it('profil.html must contain #inspection-warning-modal', () => {
        const filePath = path.join(siteWebDir, 'profil.html');
        const content = fs.readFileSync(filePath, 'utf8');
        assert.ok(
            hasElementWithId(content, 'inspection-warning-modal'),
            `profil.html doit inclure #inspection-warning-modal pour la modale de clôture de location du chat`
        );
    });
});

describe('Tier 2: Mobile Navigation Settings Link Destination', () => {
    const htmlFiles = [
        'index.html',
        'remorques.html',
        'remorque.html',
        'louer-ma-remorque.html',
        'profil.html',
        'inspection.html',
        'pro.html',
        'cgu.html',
        'politique-confidentialite.html',
        'stats.html',
        'mentions-legales.html'
    ];

    for (const fileName of htmlFiles) {
        it(`${fileName} mobile-nav-settings must link to 'profil.html?p=settings-page'`, () => {
            const filePath = path.join(siteWebDir, fileName);
            const content = fs.readFileSync(filePath, 'utf8');
            const href = getHrefForId(content, 'mobile-nav-settings');

            assert.ok(href !== null, `Balise #mobile-nav-settings introuvable dans ${fileName}`);
            assert.strictEqual(
                href,
                'profil.html?p=settings-page',
                `Dans ${fileName}, #mobile-nav-settings pointe vers '${href}' au lieu de 'profil.html?p=settings-page'`
            );
        });
    }
});

describe('Tier 2: Essential Form & Detail Interactive Elements', () => {
    it('remorque.html must contain essential booking interaction elements', () => {
        const filePath = path.join(siteWebDir, 'remorque.html');
        const content = fs.readFileSync(filePath, 'utf8');
        assert.ok(hasElementWithId(content, 'booking-dates'), `remorque.html doit contenir #booking-dates`);
        assert.ok(hasElementWithId(content, 'action-btn'), `remorque.html doit contenir #action-btn`);
        assert.ok(hasElementWithId(content, 'caution-amount'), `remorque.html doit contenir #caution-amount`);
        assert.ok(hasElementWithId(content, 'service-fee-price'), `remorque.html doit contenir #service-fee-price`);
        assert.ok(hasElementWithId(content, 'chat-btn'), `remorque.html doit contenir #chat-btn`);
    });

    it('louer-ma-remorque.html must contain trailer publishing form fields', () => {
        const filePath = path.join(siteWebDir, 'louer-ma-remorque.html');
        const content = fs.readFileSync(filePath, 'utf8');
        assert.ok(hasElementWithId(content, 'ad-title'), `louer-ma-remorque.html doit contenir #ad-title`);
        assert.ok(hasElementWithId(content, 'ad-price'), `louer-ma-remorque.html doit contenir #ad-price`);
        assert.ok(hasElementWithId(content, 'ad-location'), `louer-ma-remorque.html doit contenir #ad-location`);
        assert.ok(hasElementWithId(content, 'ad-description') || hasElementWithId(content, 'ad-desc'), `louer-ma-remorque.html doit contenir #ad-description ou #ad-desc`);
    });
});

describe('Tier 2: Renger Analytics PRO DOM Contracts (stats.html & profil.html)', () => {
    it('profil.html must contain prominent link to stats.html', () => {
        const filePath = path.join(siteWebDir, 'profil.html');
        const content = fs.readFileSync(filePath, 'utf8');
        assert.ok(hasElementWithId(content, 'btn-access-stats-pro'), `profil.html doit inclure #btn-access-stats-pro`);
        const href = getHrefForId(content, 'btn-access-stats-pro');
        assert.strictEqual(href, 'stats.html', `Le bouton #btn-access-stats-pro doit pointer vers 'stats.html'`);
    });

    it('stats.html must contain access guard, upsell screen, and dashboard containers', () => {
        const filePath = path.join(siteWebDir, 'stats.html');
        const content = fs.readFileSync(filePath, 'utf8');
        assert.ok(hasElementWithId(content, 'stats-loading-state'), `stats.html doit inclure #stats-loading-state`);
        assert.ok(hasElementWithId(content, 'stats-upsell-container'), `stats.html doit inclure #stats-upsell-container`);
        assert.ok(hasElementWithId(content, 'stats-dashboard-container'), `stats.html doit inclure #stats-dashboard-container`);
    });

    it('stats.html must contain interactive filter controls (trailer select & period filters)', () => {
        const filePath = path.join(siteWebDir, 'stats.html');
        const content = fs.readFileSync(filePath, 'utf8');
        assert.ok(hasElementWithId(content, 'stats-trailer-select'), `stats.html doit inclure #stats-trailer-select`);
        assert.ok(hasElementWithId(content, 'stats-period-filters'), `stats.html doit inclure #stats-period-filters`);
    });

    it('stats.html must contain 4 top KPI cards and PRO ROI counter', () => {
        const filePath = path.join(siteWebDir, 'stats.html');
        const content = fs.readFileSync(filePath, 'utf8');
        assert.ok(hasElementWithId(content, 'kpi-net-earnings'), `stats.html doit inclure #kpi-net-earnings`);
        assert.ok(hasElementWithId(content, 'kpi-occupancy-rate'), `stats.html doit inclure #kpi-occupancy-rate`);
        assert.ok(hasElementWithId(content, 'kpi-total-bookings'), `stats.html doit inclure #kpi-total-bookings`);
        assert.ok(hasElementWithId(content, 'kpi-conversion-rate'), `stats.html doit inclure #kpi-conversion-rate`);
        assert.ok(hasElementWithId(content, 'kpi-roi-counter'), `stats.html doit inclure #kpi-roi-counter`);
    });

    it('stats.html must contain 4 Chart.js canvas elements', () => {
        const filePath = path.join(siteWebDir, 'stats.html');
        const content = fs.readFileSync(filePath, 'utf8');
        assert.ok(hasElementWithId(content, 'revenueTrendChart'), `stats.html doit inclure canvas #revenueTrendChart`);
        assert.ok(hasElementWithId(content, 'trailerComparisonChart'), `stats.html doit inclure canvas #trailerComparisonChart`);
        assert.ok(hasElementWithId(content, 'occupancyDoughnutChart'), `stats.html doit inclure canvas #occupancyDoughnutChart`);
        assert.ok(hasElementWithId(content, 'conversionFunnelChart'), `stats.html doit inclure canvas #conversionFunnelChart`);
    });

    it('stats.html must contain fleet breakdown table and search input', () => {
        const filePath = path.join(siteWebDir, 'stats.html');
        const content = fs.readFileSync(filePath, 'utf8');
        assert.ok(hasElementWithId(content, 'stats-table-search'), `stats.html doit inclure #stats-table-search`);
        assert.ok(hasElementWithId(content, 'stats-table-body'), `stats.html doit inclure #stats-table-body`);
    });
});

describe('Tier 2: Paid Products, Subscriptions & Boost Legal Contracts (profil.html, pro.html, cgu.html)', () => {
    it('profil.html must contain #pro-active-card with handleOpenStripePortal() trigger', () => {
        const filePath = path.join(siteWebDir, 'profil.html');
        const content = fs.readFileSync(filePath, 'utf8');
        assert.ok(hasElementWithId(content, 'pro-active-card'), 'profil.html doit inclure #pro-active-card');
        assert.ok(content.includes('handleOpenStripePortal()'), 'profil.html doit comporter un bouton appelant handleOpenStripePortal()');
        assert.ok(content.includes('Gérer mon abonnement (Factures, Résiliation)'), 'profil.html doit inclure le libellé de gestion d abonnement');
    });

    it('profil.html must contain #boost-legal-disclaimer in #boost-modal with non-refundable conditions', () => {
        const filePath = path.join(siteWebDir, 'profil.html');
        const content = fs.readFileSync(filePath, 'utf8');
        assert.ok(hasElementWithId(content, 'boost-legal-disclaimer'), 'profil.html doit inclure #boost-legal-disclaimer');
        assert.ok(content.includes('non remboursable'), 'boost-modal doit mentionner le caractère non remboursable');
        assert.ok(content.includes('activation immédiate'), 'boost-modal doit mentionner l activation immédiate');
    });

    it('pro.html must contain #pro-legal-terms with automatic renewal, 1-click cancellation, and no pro-rata refund', () => {
        const filePath = path.join(siteWebDir, 'pro.html');
        const content = fs.readFileSync(filePath, 'utf8');
        assert.ok(hasElementWithId(content, 'pro-legal-terms'), 'pro.html doit inclure #pro-legal-terms');
        assert.ok(hasElementWithId(content, 'pro-already-subscribed-banner'), 'pro.html doit inclure #pro-already-subscribed-banner');
        assert.ok(content.includes('Reconduction tacite') || content.includes('Renouvellement automatique'), 'pro.html doit mentionner la reconduction/renouvellement');
        assert.ok(content.includes('Résiliation en 1 clic'), 'pro.html doit mentionner la résiliation en 1 clic');
        assert.ok(content.includes('prorata') || content.includes('remboursement'), 'pro.html doit stipuler l absence de remboursement prorata');
    });

    it('cgu.html must contain Article 7 for PRO & Boosts with full fr, de, and en translations', () => {
        const filePath = path.join(siteWebDir, 'cgu.html');
        const content = fs.readFileSync(filePath, 'utf8');
        assert.ok(content.includes('data-i18n="h2_7"'), 'cgu.html doit contenir la balise data-i18n="h2_7"');
        assert.ok(content.includes('data-i18n="p_7_1"'), 'cgu.html doit contenir la balise data-i18n="p_7_1" (Renger PRO)');
        assert.ok(content.includes('data-i18n="p_7_2"'), 'cgu.html doit contenir la balise data-i18n="p_7_2" (Boosts)');
        assert.ok(content.includes('data-i18n="p_7_3"'), 'cgu.html doit contenir la balise data-i18n="p_7_3" (Paiements Stripe)');

        // Check translation dictionaries
        assert.ok(content.includes('h2_7:'), 'cgu.html doit définir h2_7 dans les traductions');
        assert.ok(content.includes('p_7_1:'), 'cgu.html doit définir p_7_1 dans les traductions');
        assert.ok(content.includes('p_7_2:'), 'cgu.html doit définir p_7_2 dans les traductions');
        assert.ok(content.includes('p_7_3:'), 'cgu.html doit définir p_7_3 dans les traductions');
    });

    it('profil.html must isolate fleet management in #profile-seller-section (zero subscription banner)', () => {
        const filePath = path.join(siteWebDir, 'profil.html');
        const content = fs.readFileSync(filePath, 'utf8');
        const sellerSectionMatch = content.match(/<div id="profile-seller-section"[\s\S]*?<!-- BANNIÈRE PROMINENTE RENGER ANALYTICS PRO -->/);
        assert.ok(sellerSectionMatch, 'profil.html doit comporter #profile-seller-section');
        assert.ok(!sellerSectionMatch[0].includes('id="pro-banner-container"'), '#profile-seller-section ne doit plus contenir #pro-banner-container');
        assert.ok(!sellerSectionMatch[0].includes('id="pro-active-card"'), '#profile-seller-section ne doit plus contenir #pro-active-card');
    });

    it('profil.html #settings-page must contain PRO subscription and Onboarding guide sections', () => {
        const filePath = path.join(siteWebDir, 'profil.html');
        const content = fs.readFileSync(filePath, 'utf8');
        assert.ok(hasElementWithId(content, 'settings-pro-upsell-card'), '#settings-page doit contenir #settings-pro-upsell-card');
        assert.ok(content.includes('👑 Abonnement Renger PRO actif (0% de commission)'), 'badge PRO actif complet requis');
        assert.ok(content.includes('Passer en mode PRO →'), 'bouton passer en mode pro requis');
        assert.ok(content.includes('openOnboardingModal()'), 'bouton d ouverture du guide requis');
        assert.ok(content.includes('📖 Ouvrir le guide d\'utilisation Renger'), 'libellé d ouverture du guide requis');
    });

    it('profil.html must contain complete #onboarding-modal structure', () => {
        const filePath = path.join(siteWebDir, 'profil.html');
        const content = fs.readFileSync(filePath, 'utf8');
        assert.ok(hasElementWithId(content, 'onboarding-modal'), 'profil.html doit inclure #onboarding-modal');
        assert.ok(hasElementWithId(content, 'onboarding-skip-btn'), 'doit inclure #onboarding-skip-btn');
        assert.ok(hasElementWithId(content, 'onboarding-content'), 'doit inclure #onboarding-content');
        assert.ok(hasElementWithId(content, 'onboarding-prev-btn'), 'doit inclure #onboarding-prev-btn');
        assert.ok(hasElementWithId(content, 'onboarding-next-btn'), 'doit inclure #onboarding-next-btn');
        assert.ok(hasElementWithId(content, 'onboarding-dots'), 'doit inclure #onboarding-dots');
    });

    it('profil.html must provide seamless navigation links between Mon Espace and Paramètres', () => {
        const filePath = path.join(siteWebDir, 'profil.html');
        const content = fs.readFileSync(filePath, 'utf8');
        assert.ok(hasElementWithId(content, 'btn-goto-settings'), '#profile-page doit contenir #btn-goto-settings pour accéder aux paramètres');
        assert.ok(hasElementWithId(content, 'btn-back-to-profile'), '#settings-page doit contenir #btn-back-to-profile pour retourner à Mon Espace');
    });
});

describe('Tier 2: Rental Planning Manager DOM Contract in profil.html', () => {
    const profilPath = path.join(siteWebDir, 'profil.html');
    let content = '';

    it('profil.html must load for planning elements check', () => {
        assert.ok(fs.existsSync(profilPath), `profil.html introuvable: ${profilPath}`);
        content = fs.readFileSync(profilPath, 'utf8');
    });

    const requiredPlanningIds = [
        // Sous-navigation onglets
        'tab-btn-trailers',
        'tab-btn-planning',
        'tab-btn-bookings',
        'seller-trailers-container',
        'seller-planning-section',
        'seller-bookings-container',

        // Barre d'outils planning & calendrier
        'planning-toolbar',
        'planning-trailer-filter',
        'planning-prev-month',
        'planning-month-label',
        'planning-next-month',
        'planning-today-btn',
        'btn-open-block-dates',
        'planning-calendar-grid',

        // Modale détails du jour
        'planning-day-modal',
        'planning-day-detail-modal',
        'planning-day-modal-title',
        'planning-day-modal-subtitle',
        'planning-day-events-list',

        // Modale bloquer des dates
        'modal-block-dates',
        'block-trailer-select',
        'block-start-date',
        'block-end-date',
        'block-reason-select',
        'btn-confirm-block-dates',

        // Gating PRO du planning
        'pro-planning-gate'
    ];

    for (const elemId of requiredPlanningIds) {
        it(`profil.html must contain DOM element #${elemId}`, () => {
            content = fs.readFileSync(profilPath, 'utf8');
            assert.ok(
                hasElementWithId(content, elemId),
                `Élément DOM manquant dans profil.html : id="${elemId}" requis pour le Gestionnaire de Planning`
            );
        });
    }

    it('profil.html must load js/planning.js script module', () => {
        content = fs.readFileSync(profilPath, 'utf8');
        assert.ok(
            content.includes('js/planning.js'),
            'profil.html doit inclure la balise <script src="js/planning.js">'
        );
    });

    it('profil.html must include PRO badge on #tab-btn-planning and CTA towards pro.html', () => {
        content = fs.readFileSync(profilPath, 'utf8');
        assert.ok(
            content.includes('👑 PRO'),
            'profil.html doit afficher un badge "👑 PRO" sur l\'onglet du planning'
        );
        assert.ok(
            content.includes('pro.html'),
            'Le conteneur de verrouillage du planning doit contenir un lien vers pro.html'
        );
    });

    it('pro.html must include fleet planning in benefits list and comparison table', () => {
        const proPath = path.join(siteWebDir, 'pro.html');
        const proContent = fs.readFileSync(proPath, 'utf8');
        assert.ok(
            proContent.includes('Planning interactif de flotte'),
            'pro.html doit lister le planning interactif de flotte dans ses avantages'
        );
        assert.ok(
            (proContent.includes('❌ Non disponible') || proContent.includes('❌ Non inclus')) && proContent.includes('Inclus en illimité'),
            'pro.html doit afficher le statut du planning dans le tableau comparatif'
        );
    });

    it('index.html, remorques.html and louer-ma-remorque.html must feature upgraded category SVGs', () => {
        const indexPath = path.join(siteWebDir, 'index.html');
        const remorquesPath = path.join(siteWebDir, 'remorques.html');
        const louerPath = path.join(siteWebDir, 'louer-ma-remorque.html');

        const indexContent = fs.readFileSync(indexPath, 'utf8');
        const remorquesContent = fs.readFileSync(remorquesPath, 'utf8');
        const louerContent = fs.readFileSync(louerPath, 'utf8');

        // Réfrigérée: flocon de neige
        assert.ok(indexContent.includes('M12 2v20M2 12h20M5 5l14 14'), 'index.html doit contenir le flocon de neige pour réfrigéré');
        assert.ok(remorquesContent.includes('M12 2v20M2 12h20M5 5l14 14'), 'remorques.html doit contenir le flocon de neige');
        assert.ok(louerContent.includes('M12 2v20M2 12h20M5 5l14 14'), 'louer-ma-remorque.html doit contenir le flocon de neige');

        // Porte-vélo: vrai vélo tubulaire
        assert.ok(indexContent.includes('M5.5 17.5L9 9l3 8.5H5.5'), 'index.html doit contenir le vélo vectoriel moderne');
        assert.ok(remorquesContent.includes('M5.5 17.5L9 9l3 8.5H5.5'), 'remorques.html doit contenir le vélo');
        assert.ok(louerContent.includes('M5.5 17.5L9 9l3 8.5H5.5'), 'louer-ma-remorque.html doit contenir le vélo');

        // Utilitaire: remorque à ridelles avec flèche
        assert.ok(indexContent.includes('M3 8.5h13v5.5H3V8.5z'), 'index.html doit contenir la remorque utilitaire à ridelles');
        assert.ok(remorquesContent.includes('M3 8.5h13v5.5H3V8.5z'), 'remorques.html doit contenir la remorque utilitaire');
        assert.ok(louerContent.includes('M3 8.5h13v5.5H3V8.5z'), 'louer-ma-remorque.html doit contenir la remorque utilitaire');

        // Cheval: profil équestre noble
        assert.ok(indexContent.includes('M3.5 14.5c0-1.5 1-2.5 2-3.5L8 8'), 'index.html doit contenir le profil équestre noble');
        assert.ok(remorquesContent.includes('M3.5 14.5c0-1.5 1-2.5 2-3.5L8 8'), 'remorques.html doit contenir le profil équestre');
        assert.ok(louerContent.includes('M3.5 14.5c0-1.5 1-2.5 2-3.5L8 8'), 'louer-ma-remorque.html doit contenir le profil équestre');

        // Moto: profil motocross avec réservoir et roues moto distinctes
        assert.ok(indexContent.includes('M18.5 16.5L15 7h-2.5l-2 3H6'), 'index.html doit contenir la moto vectorielle distincte');
        assert.ok(remorquesContent.includes('M18.5 16.5L15 7h-2.5l-2 3H6'), 'remorques.html doit contenir la moto');
        assert.ok(louerContent.includes('M18.5 16.5L15 7h-2.5l-2 3H6'), 'louer-ma-remorque.html doit contenir la moto');
    });

    it('components.js must feature upgraded category SVGs in RengerIcons', () => {
        const componentsPath = path.join(siteWebDir, 'js', 'components.js');
        const componentsContent = fs.readFileSync(componentsPath, 'utf8');

        assert.ok(componentsContent.includes('M12 2v20M2 12h20M5 5l14 14'), 'components.js doit contenir le flocon de neige pour snow');
        assert.ok(componentsContent.includes('M5.5 17.5L9 9l3 8.5H5.5'), 'components.js doit contenir le vélo pour bike');
        assert.ok(componentsContent.includes('M3 8.5h13v5.5H3V8.5z'), 'components.js doit contenir la remorque utilitaire pour trailer');
        assert.ok(componentsContent.includes('M3.5 14.5c0-1.5 1-2.5 2-3.5L8 8'), 'components.js doit contenir le cheval pour horse');
        assert.ok(componentsContent.includes('M18.5 16.5L15 7h-2.5l-2 3H6'), 'components.js doit contenir la moto pour moto');
    });
});


