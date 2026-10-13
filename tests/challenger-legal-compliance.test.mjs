import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const siteWebDir = path.join(projectRoot, 'Site web');

const ALL_11_HTML_FILES = [
    'index.html',
    'remorques.html',
    'remorque.html',
    'louer-ma-remorque.html',
    'profil.html',
    'pro.html',
    'stats.html',
    'inspection.html',
    'cgu.html',
    'politique-confidentialite.html',
    'mentions-legales.html'
];

describe('Challenger Legal Compliance Suite: Mentions Légales, CGU & Confidentialité', () => {

    describe('1. Mentions Légales Integrity & Structure (mentions-legales.html)', () => {
        const filePath = path.join(siteWebDir, 'mentions-legales.html');
        assert.ok(fs.existsSync(filePath), 'mentions-legales.html doit exister');
        const content = fs.readFileSync(filePath, 'utf8');

        it('must be valid HTML5 with proper doctype, meta charset, viewport and canonical', () => {
            assert.match(content, /<!DOCTYPE\s+html>/i);
            assert.match(content, /<html[^>]*lang=["']fr["'][^>]*>/i);
            assert.match(content, /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/renger\.ch\/mentions-legales\.html["']/i);
            assert.match(content, /<meta[^>]+name=["']referrer["'][^>]+content=["']strict-origin-when-cross-origin["']/i);
            assert.match(content, /<meta[^>]+http-equiv=["']Content-Security-Policy["']/i);
        });

        it('must disclose Enis Medjiti as founder & publisher with individual company status in Canton de Vaud', () => {
            assert.ok(content.includes('Enis Medjiti'), 'Enis Medjiti doit être nommé comme exploitant');
            assert.ok(content.includes('Entreprise individuelle') || content.includes('individuelle'), 'Entreprise individuelle doit être mentionnée');
            assert.ok(content.includes('Canton de Vaud') || content.includes('Lausanne'), 'Lausanne et Canton de Vaud doivent être mentionnés');
            assert.ok(content.includes('info@renger.ch'), 'info@renger.ch doit être présent');
            assert.ok(content.includes('https://renger.ch'), 'URL https://renger.ch doit être présente');
        });

        it('must clearly state Renger technical intermediary status (CO art. 253 ss)', () => {
            assert.ok(content.includes('intermédiaire technique') || content.includes('infrastructure technologique'));
            assert.ok(content.includes('253') && content.includes('Obligations'));
        });

        it('must disclose all third-party infrastructure providers (Supabase, Stripe, Resend, OpenStreetMap)', () => {
            assert.ok(content.includes('Supabase Inc.') || content.includes('Supabase'), 'Supabase doit être listé');
            assert.ok(content.includes('Stripe Payments Europe Ltd') || content.includes('Stripe'), 'Stripe doit être listé');
            assert.ok(content.includes('Resend Inc.') || content.includes('Resend'), 'Resend doit être listé');
            assert.ok(content.includes('OpenStreetMap'), 'OpenStreetMap doit être listé');
        });

        it('must state intellectual property protection for Renger and Terracotta #d85110', () => {
            assert.ok(content.includes('Propriété intellectuelle'));
            assert.ok(content.includes('#d85110') || content.includes('Terracotta'));
        });

        it('must implement full trilingual support (FR, DE, EN) with localStorage persistence', () => {
            assert.ok(content.includes('const translations = {'), 'Dictionnaire de traduction requis');
            assert.ok(content.includes('fr:') && content.includes('de:') && content.includes('en:'), 'FR, DE et EN requis');
            assert.ok(content.includes('localStorage.setItem(\'renger_lang\','), 'Persistance renger_lang requise');
            assert.ok(content.includes('id="lang-selector"'), 'Sélecteur de langue requis');
            assert.ok(content.includes('id="theme-icon"'), 'Sélecteur de thème requis');
            assert.ok(content.includes('profil.html?p=settings-page'), 'Lien settings-page mobile requis');
        });
    });

    describe('2. Universal Harmonized Footers Across All 11 HTML Pages', () => {
        for (const fileName of ALL_11_HTML_FILES) {
            it(`${fileName} must contain a <footer> tag with the 3 mandatory legal links`, () => {
                const filePath = path.join(siteWebDir, fileName);
                assert.ok(fs.existsSync(filePath), `${fileName} doit exister`);
                const content = fs.readFileSync(filePath, 'utf8');

                assert.ok(content.includes('<footer'), `${fileName} doit comporter une balise <footer>`);
                assert.ok(
                    content.includes('href="mentions-legales.html"'),
                    `${fileName} doit contenir le lien vers mentions-legales.html`
                );
                assert.ok(
                    content.includes('href="cgu.html"'),
                    `${fileName} doit contenir le lien vers cgu.html`
                );
                assert.ok(
                    content.includes('href="politique-confidentialite.html"'),
                    `${fileName} doit contenir le lien vers politique-confidentialite.html`
                );
            });
        }
    });

    describe('3. Conditions Générales d\'Utilisation (cgu.html) Completeness', () => {
        const filePath = path.join(siteWebDir, 'cgu.html');
        const content = fs.readFileSync(filePath, 'utf8');

        it('must define complete Swiss financial formulas: 5% fee, 4.90 min, 0.05 rounding, 20% commission, PRO 0%', () => {
            assert.ok(content.includes('5%'), 'Frais locataire 5%');
            assert.ok(content.includes('4.90 CHF'), 'Minimum garanti 4.90 CHF');
            assert.ok(content.includes('5 centimes') || content.includes('5 Rappen') || content.includes('0.05 CHF'), 'Arrondi suisse aux 5 centimes');
            assert.ok(content.includes('20%'), 'Commission propriétaire 20%');
            assert.ok(content.includes('80%'), 'Net propriétaire 80%');
            assert.ok(content.includes('39 CHF/mois') || content.includes('39 CHF / mois'), 'PRO 39 CHF/mois');
            assert.ok(content.includes('390 CHF/an') || content.includes('390 CHF / an'), 'PRO 390 CHF/an');
            assert.ok(content.includes('5.90 CHF') && content.includes('9.90 CHF'), 'Boosts 5.90 CHF et 9.90 CHF');
        });

        it('must define deposit scales (200 / 300 / 400 CHF) and off-session non-debited hold', () => {
            assert.ok(content.includes('200 CHF'), 'Caution 200 CHF');
            assert.ok(content.includes('300 CHF'), 'Caution 300 CHF');
            assert.ok(content.includes('400 CHF'), 'Caution 400 CHF');
            assert.ok(content.includes('off-session') || content.includes('non débitée') || content.includes('Vorautorisierung'), 'Caution non débitée');
            assert.ok(content.includes('48h') || content.includes('48 heures') || content.includes('48 Stunden') || content.includes('48 hours'), 'Libération sous 48h');
        });

        it('must define mandatory 4-photo contradictory inventory (CO art. 257a) and Swiss presumption of liability', () => {
            assert.ok(content.includes('257a'), 'CO art. 257a requis');
            assert.ok(content.includes('présumée imputable') || content.includes('présumé responsable') || content.includes('vermutungshalber') || content.includes('presumed attributable'), 'Présomption légale suisse requise');
        });

        it('must define balanced Zero-Loss cancellation policy in fr, de, en', () => {
            assert.ok(content.includes('Zero-Loss'), 'Zero-Loss doit figurer dans les CGU');
            assert.ok(content.includes('h2_8') && content.includes('p_8'), 'Balises i18n d\'annulation requises');
        });

        it('must specify exclusive jurisdiction: Lausanne, Canton de Vaud', () => {
            assert.ok(content.includes('Lausanne'), 'For de Lausanne');
            assert.ok(content.includes('Canton de Vaud') || content.includes('Kanton Waadt'));
        });
    });

    describe('4. Absolute Removal of Arbitrary 50 CHF Penalty Across Codebase', () => {
        it('Site web/js/contracts.js must NOT contain 50 CHF penalty', () => {
            const contractsCode = fs.readFileSync(path.join(siteWebDir, 'js', 'contracts.js'), 'utf8');
            assert.strictEqual(contractsCode.includes('50 CHF est due'), false);
            assert.strictEqual(contractsCode.includes('pénalité forfaitaire de 50 CHF'), false);
            assert.strictEqual(contractsCode.includes('pénalité de 50 CHF'), false);
        });

        it('Site web/inspection.html must NOT contain 50 CHF penalty', () => {
            const inspectionHtml = fs.readFileSync(path.join(siteWebDir, 'inspection.html'), 'utf8');
            assert.strictEqual(inspectionHtml.includes('50 CHF de pénalité'), false);
            assert.strictEqual(inspectionHtml.includes('Pénalité de 50 CHF'), false);
        });

        it('Site web/profil.html must NOT contain 50 CHF penalty', () => {
            const profilHtml = fs.readFileSync(path.join(siteWebDir, 'profil.html'), 'utf8');
            assert.strictEqual(profilHtml.includes('50 CHF de pénalité'), false);
            assert.strictEqual(profilHtml.includes('Pénalité de 50 CHF'), false);
        });

        it('Site web/js/chat.js must NOT contain 50 CHF penalty', () => {
            const chatJs = fs.readFileSync(path.join(siteWebDir, 'js', 'chat.js'), 'utf8');
            assert.strictEqual(chatJs.includes('50 CHF de pénalité'), false);
            assert.strictEqual(chatJs.includes('pénalité forfaitaire de 50 CHF'), false);
            assert.strictEqual(chatJs.includes('Pénalité de 50 CHF'), false);
            assert.strictEqual(chatJs.includes('pénalité 50 CHF'), false);
        });
    });

    describe('5. Politique de Confidentialité (politique-confidentialite.html) Completeness', () => {
        const filePath = path.join(siteWebDir, 'politique-confidentialite.html');
        const content = fs.readFileSync(filePath, 'utf8');

        it('must disclose Enis Medjiti as data controller with info@renger.ch contact', () => {
            assert.ok(content.includes('Enis Medjiti'));
            assert.ok(content.includes('info@renger.ch'));
            assert.ok(content.includes('Lausanne') || content.includes('Canton de Vaud'));
        });

        it('must state compliance with Swiss nLPD and European GDPR', () => {
            assert.ok(content.includes('nLPD') || content.includes('DSG') || content.includes('FADP'));
            assert.ok(content.includes('RGPD') || content.includes('DSGVO') || content.includes('GDPR'));
        });

        it('must disclose all subcontractors: Supabase, Stripe, Resend, OpenStreetMap', () => {
            assert.ok(content.includes('Supabase'));
            assert.ok(content.includes('Stripe'));
            assert.ok(content.includes('Resend'));
            assert.ok(content.includes('OpenStreetMap'));
        });

        it('must state mandatory 10-year accounting retention pursuant to CO art. 958f', () => {
            assert.ok(content.includes('958f'), 'CO art. 958f requis');
            assert.ok(content.includes('10 ans') || content.includes('10 Jahren') || content.includes('10 years'), 'Conservation 10 ans requise');
        });

        it('must detail data subject rights (access, rectification, erasure, portability) and DPO contact', () => {
            assert.ok(content.includes('Droit d\'accès') || content.includes('Auskunftsrecht') || content.includes('Right to Access'));
            assert.ok(content.includes('Droit de rectification') || content.includes('Berichtigungsrecht') || content.includes('Right to Rectification'));
            assert.ok(content.includes('Droit à l\'effacement') || content.includes('Löschungsrecht') || content.includes('Right to Erasure'));
        });

        it('must implement full trilingual support (FR, DE, EN)', () => {
            assert.ok(content.includes('fr:') && content.includes('de:') && content.includes('en:'));
        });
    });

    describe('6. Legal Corporate Status & Trilingual Dictionary Symmetry Rigor', () => {
        const legalPages = ['mentions-legales.html', 'cgu.html', 'politique-confidentialite.html'];

        it('contracts.js and legal pages must NOT refer to inexistent corporate form "Sàrl" (Entreprise individuelle exclusively)', () => {
            const contractsCode = fs.readFileSync(path.join(siteWebDir, 'js', 'contracts.js'), 'utf8');
            assert.strictEqual(contractsCode.includes('Renger Sàrl'), false, 'contracts.js ne doit plus contenir Renger Sàrl');
            assert.strictEqual(contractsCode.includes('Renger Sarl'), false, 'contracts.js ne doit plus contenir Renger Sarl');

            for (const file of legalPages) {
                const content = fs.readFileSync(path.join(siteWebDir, file), 'utf8');
                assert.strictEqual(content.includes('Sàrl'), false, `${file} ne doit pas contenir Sàrl`);
                assert.strictEqual(content.includes('Sarl'), false, `${file} ne doit pas contenir Sarl`);
            }
        });

        it('all 3 legal pages must have strictly symmetric FR, DE, and EN translation keys without any missing entry', () => {
            for (const file of legalPages) {
                const content = fs.readFileSync(path.join(siteWebDir, file), 'utf8');
                const match = content.match(/const translations = (\{[\s\S]*?\n\s*\});/);
                assert.ok(match, `Dictionnaire translations introuvable dans ${file}`);

                const translations = new Function(`return ${match[1]}`)();
                const frKeys = Object.keys(translations.fr || {});
                const deKeys = Object.keys(translations.de || {});
                const enKeys = Object.keys(translations.en || {});

                assert.ok(frKeys.length > 10, `${file} doit avoir au moins 10 clés de traduction`);
                assert.strictEqual(deKeys.length, frKeys.length, `${file} : DE (${deKeys.length}) doit avoir le même nombre de clés que FR (${frKeys.length})`);
                assert.strictEqual(enKeys.length, frKeys.length, `${file} : EN (${enKeys.length}) doit avoir le même nombre de clés que FR (${frKeys.length})`);

                for (const k of frKeys) {
                    assert.ok(k in translations.de, `${file} : clé '${k}' manquante dans translations.de`);
                    assert.ok(k in translations.en, `${file} : clé '${k}' manquante dans translations.en`);
                    assert.ok(translations.fr[k].length > 0, `${file} : FR['${k}'] ne doit pas être vide`);
                    assert.ok(translations.de[k].length > 0, `${file} : DE['${k}'] ne doit pas être vide`);
                    assert.ok(translations.en[k].length > 0, `${file} : EN['${k}'] ne doit pas être vide`);
                }
            }
        });

        it('all DOM data-i18n and data-i18n-title attributes across legal pages must exist in translation dictionaries', () => {
            for (const file of legalPages) {
                const content = fs.readFileSync(path.join(siteWebDir, file), 'utf8');
                const match = content.match(/const translations = (\{[\s\S]*?\n\s*\});/);
                const translations = new Function(`return ${match[1]}`)();

                const i18nRegex = /data-i18n="([^"]+)"/g;
                let m;
                while ((m = i18nRegex.exec(content)) !== null) {
                    const key = m[1];
                    assert.ok(key in translations.fr, `${file} : data-i18n="${key}" absent de translations.fr`);
                    assert.ok(key in translations.de, `${file} : data-i18n="${key}" absent de translations.de`);
                    assert.ok(key in translations.en, `${file} : data-i18n="${key}" absent de translations.en`);
                }

                const titleRegex = /data-i18n-title="([^"]+)"/g;
                while ((m = titleRegex.exec(content)) !== null) {
                    const key = m[1];
                    assert.ok(key in translations.fr, `${file} : data-i18n-title="${key}" absent de translations.fr`);
                }
            }
        });

        it('contracts.js must preserve photo aspect ratio logic via getImageProperties to prevent image distortion', () => {
            const contractsCode = fs.readFileSync(path.join(siteWebDir, 'js', 'contracts.js'), 'utf8');
            assert.ok(contractsCode.includes('getImageProperties'), 'contracts.js doit utiliser getImageProperties pour préserver le ratio');
            assert.ok(contractsCode.includes('imgAspect'), 'contracts.js doit calculer imgAspect');
            assert.ok(contractsCode.includes('boxAspect'), 'contracts.js doit comparer avec boxAspect');
        });
    });
});
