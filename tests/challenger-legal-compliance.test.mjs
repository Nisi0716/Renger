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
            assert.ok(content.includes('Canton de Vaud'), 'Canton de Vaud doit être mentionné');
            assert.ok(content.includes('info@renger.ch'), 'info@renger.ch doit être présent');
            assert.ok(content.includes('https://renger.ch'), 'URL https://renger.ch doit être présente');
        });

        it('must describe certified professional cloud hosting', () => {
            assert.ok(content.includes('Hébergement') || content.includes('Hosting'));
            assert.ok(content.includes('prestataires cloud professionnels certifiés') || content.includes('Cloud-Anbietern') || content.includes('cloud providers'));
        });

        it('must state intellectual property protection for Renger', () => {
            assert.ok(content.includes('Propriété intellectuelle') || content.includes('Geistiges Eigentum') || content.includes('Intellectual Property'));
            assert.ok(content.includes('propriété exclusive de Renger') || content.includes('Eigentum von Renger') || content.includes('exclusive property of Renger'));
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

        it('must state intermediary role pursuant to art. 253 ss CO', () => {
            assert.ok(content.includes('Statut d\'intermédiaire') || content.includes('Vermittlerstatus') || content.includes('Intermediary Status'));
            assert.ok(content.includes('253 ss CO') || content.includes('253 ff. OR') || content.includes('253 ff. CO'));
        });

        it('must define exemption of liability and road insurance pursuant to art. 63 ss LCR', () => {
            assert.ok(content.includes('Exonération de responsabilité') || content.includes('Haftungsausschluss') || content.includes('Limitation of Liability'));
            assert.ok(content.includes('63 ss LCR') || content.includes('63 ff. SVG') || content.includes('63 ff. Road Traffic Act'));
        });

        it('must define renter obligations regarding Permis B / BE', () => {
            assert.ok(content.includes('Permis B ou BE') || content.includes('Kategorie B oder BE') || content.includes('Category B or BE'));
        });

        it('must define condition report and deposit pre-authorization capture', () => {
            assert.ok(content.includes('état des lieux contradictoire photographique') || content.includes('Zustandsprotokoll') || content.includes('condition report'));
            assert.ok(content.includes('caution') || content.includes('Kaution') || content.includes('deposit'));
        });

        it('must define service fees, boosts/abonnements and cancellation policy', () => {
            assert.ok(content.includes('Frais de service et Services payants') || content.includes('Servicegebühren') || content.includes('Service Fees'));
            assert.ok(content.includes('Boosts') && content.includes('abonnements'));
            assert.ok(content.includes('politique d\'annulation') || content.includes('Stornierungsbedingungen') || content.includes('cancellation policy'));
        });

        it('must specify exclusive jurisdiction: Canton de Vaud and Swiss law', () => {
            assert.ok(content.includes('droit suisse') || content.includes('schweizerischem Recht') || content.includes('Swiss law'));
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
            assert.ok(content.includes('Canton de Vaud'));
        });

        it('must state compliance with Swiss nLPD and European GDPR', () => {
            assert.ok(content.includes('nLPD') || content.includes('DSG') || content.includes('FADP'));
            assert.ok(content.includes('RGPD') || content.includes('DSGVO') || content.includes('GDPR'));
        });

        it('must disclose subcontracting standards and PCI-DSS external banking partner', () => {
            assert.ok(content.includes('PCI-DSS'));
            assert.ok(content.includes('Sous-traitants et Sécurité') || content.includes('Auftragsverarbeiter') || content.includes('Subprocessors'));
        });

        it('must state mandatory 10-year accounting retention pursuant to CO art. 958f', () => {
            assert.ok(content.includes('958f'), 'CO art. 958f requis');
            assert.ok(content.includes('10 ans') || content.includes('10 Jahren') || content.includes('10 years'), 'Conservation 10 ans requise');
        });

        it('must detail data subject rights (access, rectification, erasure, portability) and contact', () => {
            assert.ok(content.includes('accès') || content.includes('Auskunft') || content.includes('access'));
            assert.ok(content.includes('rectification') || content.includes('Berichtigung') || content.includes('rectify'));
            assert.ok(content.includes('effacement') || content.includes('Löschung') || content.includes('erase'));
            assert.ok(content.includes('portabilité') || content.includes('Übertragbarkeit') || content.includes('portability'));
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

                assert.ok(frKeys.length >= 7, `${file} doit avoir au moins 7 clés de traduction`);
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
