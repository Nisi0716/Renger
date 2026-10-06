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
        'politique-confidentialite.html'
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
