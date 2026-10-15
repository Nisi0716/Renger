import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const siteWebDir = path.join(projectRoot, 'Site web');
const jsDir = path.join(siteWebDir, 'js');
const edgeFunctionPath = path.join(projectRoot, 'supabase', 'functions', 'syni-data', 'index.ts');

// Importer le module syni.js
import syniModule from '../Site web/js/syni.js';

describe('Challenger Suite: Syni — Cockpit d\'Administration Suprême Renger', () => {

    describe('1. Contrôle d\'Accès & Sécurité Double-Facteur', () => {
        it('checkSupremeAdminAccess doit autoriser enism2007@hotmail.com', () => {
            const user = { email: 'enism2007@hotmail.com' };
            const profile = { email: 'enism2007@hotmail.com', is_admin: false };
            assert.equal(syniModule.checkSupremeAdminAccess(user, profile), true);
        });

        it('checkSupremeAdminAccess doit autoriser un compte avec profiles.is_admin = true', () => {
            const user = { email: 'autre.admin@renger.ch', is_admin: false };
            const profile = { email: 'autre.admin@renger.ch', is_admin: true };
            assert.equal(syniModule.checkSupremeAdminAccess(user, profile), true);
        });

        it('checkSupremeAdminAccess doit refuser un utilisateur standard non-admin', () => {
            const user = { email: 'locataire@bluewin.ch', is_admin: false };
            const profile = { email: 'locataire@bluewin.ch', is_admin: false };
            assert.equal(syniModule.checkSupremeAdminAccess(user, profile), false);
        });

        it('checkSupremeAdminAccess doit refuser les entrées nulles ou indéfinies', () => {
            assert.equal(syniModule.checkSupremeAdminAccess(null, null), false);
            assert.equal(syniModule.checkSupremeAdminAccess(undefined, undefined), false);
        });

        it('verifyMasterPassphrase doit valider SYNI_MASTER_KEY et refuser les clés erronées', () => {
            assert.equal(syniModule.verifyMasterPassphrase('RengerSyni2026!'), true);
            assert.equal(syniModule.verifyMasterPassphrase('MauvaisMotDePasse'), false);
            assert.equal(syniModule.verifyMasterPassphrase(''), false);
            assert.equal(syniModule.verifyMasterPassphrase(null), false);
        });
    });

    describe('2. Signalétique Vectorielle SVG d\'Œil & Absence d\'Emojis', () => {
        it('components.js doit définir l\'icône SVG d\'œil dans RengerIcons', () => {
            const componentsCode = fs.readFileSync(path.join(jsDir, 'components.js'), 'utf8');
            assert.ok(componentsCode.includes('eye:'), 'RengerIcons doit comporter la clé eye');
            assert.ok(componentsCode.includes('<svg'), 'L\'icône eye doit être un vecteur SVG');
            assert.ok(componentsCode.includes('M15 12a3 3 0 11-6 0 3 3 0 016 0z'), 'Tracé SVG pupille œil');
        });

        it('components.js et profil.html ne doivent contenir AUCUN emoji couronne pour Syni', () => {
            const componentsCode = fs.readFileSync(path.join(jsDir, 'components.js'), 'utf8');
            const profilHtml = fs.readFileSync(path.join(siteWebDir, 'profil.html'), 'utf8');
            const syniHtml = fs.readFileSync(path.join(siteWebDir, 'syni.html'), 'utf8');

            assert.ok(!profilHtml.includes('👑 Syni'), 'profil.html ne doit comporter aucune couronne');
            assert.ok(!syniHtml.includes('👑'), 'syni.html ne doit comporter aucun emoji couronne');
            assert.ok(profilHtml.includes('id="settings-syni-card"'), 'profil.html doit comporter #settings-syni-card');
            assert.ok(profilHtml.includes('id="btn-goto-syni"'), 'profil.html doit comporter #btn-goto-syni');
        });

        it('profil.html doit afficher le raccourci Syni ciblant syni.html avec l\'icône vectorielle', () => {
            const profilHtml = fs.readFileSync(path.join(siteWebDir, 'profil.html'), 'utf8');
            assert.ok(profilHtml.includes('href="syni.html"'), 'Lien vers syni.html dans profil.html');
            assert.ok(profilHtml.includes('Syni — Cockpit Administrateur Suprême'), 'Titre de la section Syni dans Paramètres');
        });
    });

    describe('3. Présence & Intégrité des 8 Modules dans Syni', () => {
        const syniHtml = fs.readFileSync(path.join(siteWebDir, 'syni.html'), 'utf8');

        it('syni.html doit contenir les 8 modules dédiés dont Contrôle et Simulateur', () => {
            assert.ok(syniHtml.includes('id="syni-mod-cockpit"'), 'Module 1 : Cockpit Général requis');
            assert.ok(syniHtml.includes('id="syni-mod-users"'), 'Module 2 : Utilisateurs requis');
            assert.ok(syniHtml.includes('id="syni-mod-bookings"'), 'Module 3 : Réservations & Cashflow requis');
            assert.ok(syniHtml.includes('id="syni-mod-trailers"'), 'Module 4 : Flotte de Remorques requis');
            assert.ok(syniHtml.includes('id="syni-mod-inspections"'), 'Module 5 : États des Lieux & Audits requis');
            assert.ok(syniHtml.includes('id="syni-mod-seo"'), 'Module 6 : Google SEO & Acquisition requis');
            assert.ok(syniHtml.includes('id="syni-mod-control"'), 'Module 7 : Contrôle Global & Diffusion requis');
            assert.ok(syniHtml.includes('id="syni-mod-simulator"'), 'Module 8 : Simulateur Business requis');
        });

        it('syni.html doit comporter la barre latérale avec les 8 boutons de navigation et le bouton toggle rétractable', () => {
            assert.ok(syniHtml.includes('id="tab-cockpit"'), '#tab-cockpit requis');
            assert.ok(syniHtml.includes('id="tab-users"'), '#tab-users requis');
            assert.ok(syniHtml.includes('id="tab-bookings"'), '#tab-bookings requis');
            assert.ok(syniHtml.includes('id="tab-trailers"'), '#tab-trailers requis');
            assert.ok(syniHtml.includes('id="tab-inspections"'), '#tab-inspections requis');
            assert.ok(syniHtml.includes('id="tab-seo"'), '#tab-seo requis');
            assert.ok(syniHtml.includes('id="tab-control"'), '#tab-control requis pour Module 7');
            assert.ok(syniHtml.includes('id="tab-simulator"'), '#tab-simulator requis pour Module 8');
            assert.ok(syniHtml.includes('id="btn-toggle-sidebar"'), '#btn-toggle-sidebar requis pour la barre rétractable');
        });

        it('syni.html doit comporter la modale d\'action sécurisée #syni-action-modal pour la modération opérationnelle', () => {
            assert.ok(syniHtml.includes('id="syni-action-modal"'), '#syni-action-modal requis');
            assert.ok(syniHtml.includes('id="syni-action-title"'), '#syni-action-title requis');
            assert.ok(syniHtml.includes('id="syni-action-message"'), '#syni-action-message requis');
            assert.ok(syniHtml.includes('id="syni-action-reason"'), '#syni-action-reason pour motif optionnel');
            assert.ok(syniHtml.includes('id="syni-action-cancel"'), '#syni-action-cancel requis');
            assert.ok(syniHtml.includes('id="syni-action-confirm"'), '#syni-action-confirm requis');
        });

        it('syni.html doit comporter les contrôles de diffusion, de maintenance et d\'audit dans le Module 7', () => {
            assert.ok(syniHtml.includes('id="broadcast-banner-text"'), '#broadcast-banner-text requis pour message');
            assert.ok(syniHtml.includes('id="broadcast-banner-type"'), '#broadcast-banner-type requis pour type');
            assert.ok(syniHtml.includes('id="btn-save-broadcast-banner"'), '#btn-save-broadcast-banner requis');
            assert.ok(syniHtml.includes('id="broadcast-banner-preview"'), '#broadcast-banner-preview requis pour aperçu direct');
            assert.ok(syniHtml.includes('id="maintenance-mode-enabled"'), '#maintenance-mode-enabled requis pour bascule maintenance');
            assert.ok(syniHtml.includes('id="maintenance-mode-message"'), '#maintenance-mode-message requis pour message');
            assert.ok(syniHtml.includes('id="btn-save-maintenance-mode"'), '#btn-save-maintenance-mode requis');
            assert.ok(syniHtml.includes('id="syni-audit-log-table"'), '#syni-audit-log-table requis pour traçabilité');
            assert.ok(syniHtml.includes('id="btn-export-audit-csv"'), '#btn-export-audit-csv requis pour export');
        });

        it('syni.html doit comporter les curseurs et KPIs du Simulateur Business dans le Module 8', () => {
            assert.ok(syniHtml.includes('id="sim-active-trailers"'), '#sim-active-trailers curseur remorques');
            assert.ok(syniHtml.includes('id="sim-pro-rate"'), '#sim-pro-rate curseur taux PRO');
            assert.ok(syniHtml.includes('id="sim-rental-days"'), '#sim-rental-days curseur jours loués');
            assert.ok(syniHtml.includes('id="sim-daily-price"'), '#sim-daily-price curseur prix moyen');
            assert.ok(syniHtml.includes('id="sim-boost-rate"'), '#sim-boost-rate curseur boosts');
            assert.ok(syniHtml.includes('id="sim-fixed-costs"'), '#sim-fixed-costs curseur coûts fixes');
            assert.ok(syniHtml.includes('id="sim-out-gmv-monthly"'), '#sim-out-gmv-monthly KPI GMV mensuel');
            assert.ok(syniHtml.includes('id="sim-out-total-revenue"'), '#sim-out-total-revenue KPI Revenu net Renger');
            assert.ok(syniHtml.includes('id="sim-out-net-profit"'), '#sim-out-net-profit KPI Bénéfice net');
            assert.ok(syniHtml.includes('id="sim-out-breakeven-trailers"'), '#sim-out-breakeven-trailers KPI Seuil rentabilité');
            assert.ok(syniHtml.includes('id="sim-comparison-table"'), '#sim-comparison-table widget comparatif');
        });

        it('syni.html doit comporter la colonne d\'en-tête Actions dans les tables Utilisateurs, Réservations et Remorques', () => {
            const matches = syniHtml.match(/<th class="py-3 px-4 font-bold text-center">Actions<\/th>/g);
            assert.ok(matches && matches.length >= 3, 'Au moins 3 en-têtes Actions dans les tableaux de gestion');
        });

        it('syni.html doit comporter l\'écran de garde et la modale de passphrase maîtresse avec panneau masqué par défaut', () => {
            assert.ok(syniHtml.includes('id="syni-auth-guard"'), '#syni-auth-guard requis');
            assert.ok(syniHtml.includes('id="syni-passphrase-modal"'), '#syni-passphrase-modal requis');
            assert.ok(syniHtml.includes('id="syni-passphrase-input"'), '#syni-passphrase-input requis');
            assert.ok(syniHtml.includes('id="syni-passphrase-submit"'), '#syni-passphrase-submit requis');
            assert.ok(syniHtml.includes('id="syni-main-panel" class="hidden'), 'Panneau principal masqué par défaut pour immunité FOUC');
        });

        it('syni.html doit charger Chart.js, core.js, components.js et syni.js', () => {
            assert.ok(syniHtml.includes('chart.js'), 'Chart.js CDN requis');
            assert.ok(syniHtml.includes('js/core.js'), 'js/core.js requis');
            assert.ok(syniHtml.includes('js/components.js'), 'js/components.js requis');
            assert.ok(syniHtml.includes('js/syni.js'), 'js/syni.js requis');
        });

        it('syni.html doit inclure le footer harmonisé à 3 liens légaux', () => {
            assert.ok(syniHtml.includes('<footer'), 'Balise <footer> requise');
            assert.ok(syniHtml.includes('href="mentions-legales.html"'), 'Lien mentions-legales.html requis');
            assert.ok(syniHtml.includes('href="cgu.html"'), 'Lien cgu.html requis');
            assert.ok(syniHtml.includes('href="politique-confidentialite.html"'), 'Lien politique-confidentialite.html requis');
        });

        it('syni.html doit inclure les filtres propriétaires/locataires et les sections audits et referrers', () => {
            assert.ok(syniHtml.includes('value="owners"'), 'Option filtre propriétaires requise');
            assert.ok(syniHtml.includes('value="renters"'), 'Option filtre locataires requise');
            assert.ok(syniHtml.includes('id="syni-ratelimits-table"'), 'Table de journal des rate limits requise');
            assert.ok(syniHtml.includes('id="seo-referrers-grid"'), 'Grille des canaux d\'acquisition SEO requise');
            assert.ok(syniHtml.includes('PTAC / Charge utile'), 'En-tête PTAC dans la flotte de remorques requis');
        });
    });

    describe('4. Logique Financière & Calculs des Métriques de Conversion', () => {
        it('calculateBookingFinancials : Propriétaire standard (commission 20% + frais 5% min 4.90 CHF)', () => {
            const booking = {
                id: 'b-1',
                start_date: '2026-10-10',
                end_date: '2026-10-12', // 3 jours
                status: 'paye'
            };
            const trailer = { price: 50, category: 'utilitaire', caution: 200 };
            const ownerProfile = { is_pro: false };

            const fin = syniModule.calculateBookingFinancials(booking, trailer, ownerProfile);
            assert.equal(fin.days, 3, '3 jours de location');
            assert.equal(fin.basePrice, 150, 'Prix de base = 150 CHF');
            assert.equal(fin.rengerFee, 7.50, 'Frais Renger = 5% de 150 = 7.50 CHF');
            assert.equal(fin.totalPaid, 157.50, 'Total payé par locataire = 157.50 CHF');
            assert.equal(fin.ownerPayout, 120, 'Part proprio Standard = 80% de 150 = 120 CHF');
            assert.equal(fin.platformCommission, 30, 'Commission Renger = 20% de 150 = 30 CHF');
            assert.equal(fin.platformNetRevenue, 37.50, 'Revenu total Renger = 30 + 7.50 = 37.50 CHF');
            assert.equal(fin.depositAmount, 200, 'Caution standard = 200 CHF');
        });

        it('calculateBookingFinancials : Propriétaire PRO (0% commission, 100% au propriétaire)', () => {
            const booking = {
                id: 'b-2',
                start_date: '2026-10-15',
                end_date: '2026-10-15', // 1 jour
                status: 'paye'
            };
            const trailer = { price: 80, category: 'utilitaire', caution: 200 };
            const ownerProfile = { is_pro: true };

            const fin = syniModule.calculateBookingFinancials(booking, trailer, ownerProfile);
            assert.equal(fin.days, 1);
            assert.equal(fin.basePrice, 80);
            assert.equal(fin.rengerFee, 4.90, 'Minimum garanti de 4.90 CHF respecté');
            assert.equal(fin.totalPaid, 84.90);
            assert.equal(fin.ownerPayout, 80, '100% au propriétaire PRO');
            assert.equal(fin.platformCommission, 0, '0% de commission');
            assert.equal(fin.platformNetRevenue, 4.90, 'Revenu Renger = frais de service seuls');
        });

        it('computeSyniMetrics : Agrégation des KPIs et enrichissement des profils/remorques', () => {
            const mockData = {
                profiles: [
                    { id: 'u1', is_pro: true, email: 'enism2007@hotmail.com' },
                    { id: 'u2', is_pro: false, email: 'user2@renger.ch' },
                    { id: 'u3', is_pro: false, email: 'user3@renger.ch' }
                ],
                trailers: [
                    { id: 1, price: 50, owner_id: 'u1', category: 'utilitaire', location_city: 'Lausanne', is_active: true, ptac: 750 },
                    { id: 2, price: 100, owner_id: 'u2', category: 'voiture', location_city: 'Genève', is_active: true, ptac: 2500 }
                ],
                bookings: [
                    { id: 'b1', trailer_id: 1, user_id: 'u3', start_date: '2026-10-01', end_date: '2026-10-02', status: 'paye', total_price: 105.00, created_at: '2026-10-01T10:00:00Z' },
                    { id: 'b2', trailer_id: 2, user_id: 'u3', start_date: '2026-10-05', end_date: '2026-10-06', status: 'annule', total_price: 210.00, created_at: '2026-10-02T10:00:00Z' }
                ],
                analytics: [
                    { id: 'a1', session_id: 's1', page_url: 'https://renger.ch/?ref=google.ch', created_at: '2026-10-01T08:00:00Z' },
                    { id: 'a2', session_id: 's2', page_url: 'https://renger.ch/?ref=google.com', created_at: '2026-10-01T09:00:00Z' },
                    { id: 'a3', session_id: 's3', page_url: 'https://renger.ch/remorques.html', created_at: '2026-10-01T10:00:00Z' }
                ],
                inspections: [],
                rateLimits: [{ id: 'rl-1', action: 'syni_data_request', user_id: 'u1', created_at: '2026-10-01T10:00:00Z' }],
                impressions: [{ id: 'i1', trailer_id: 1, created_at: '2026-10-01T09:00:00Z' }],
                clicks: [{ id: 'c1', trailer_id: 1, created_at: '2026-10-01T09:01:00Z' }]
            };

            const metrics = syniModule.computeSyniMetrics(mockData, 'all');

            assert.equal(metrics.users.total, 3, 'Total 3 utilisateurs');
            assert.equal(metrics.users.pro, 1, '1 membre PRO');
            assert.equal(metrics.trailers.total, 2, 'Total 2 remorques');
            assert.equal(metrics.bookings.confirmed, 1, '1 réservation payée');
            assert.equal(metrics.bookings.cancelled, 1, '1 réservation annulée');
            assert.equal(metrics.analytics.uniqueSessions, 3, '3 sessions uniques');
            // Taux de conversion = 1 confirmée / 3 sessions = 33.33%
            assert.equal(metrics.analytics.conversionRate, 33.33, 'Taux de conversion calculé avec précision');

            // Vérifier l'enrichissement des profils (activité)
            const u1Enriched = metrics.users.list.find(u => u.id === 'u1');
            assert.equal(u1Enriched.trailers_count, 1, 'u1 possède 1 remorque');
            assert.equal(u1Enriched.is_owner, true, 'u1 est bien propriétaire');
            const u3Enriched = metrics.users.list.find(u => u.id === 'u3');
            assert.equal(u3Enriched.bookings_count, 2, 'u3 a réalisé 2 réservations');
            assert.equal(u3Enriched.is_renter, true, 'u3 est bien locataire');

            // Vérifier l'enrichissement des remorques (vues et clics)
            const tr1Enriched = metrics.trailers.list.find(t => t.id === 1);
            assert.equal(tr1Enriched.views, 1, 'Remorque 1 a 1 vue');
            assert.equal(tr1Enriched.clicks, 1, 'Remorque 1 a 1 clic');
        });
    });

    describe('5. Module Google SEO & Référencement Suisse', () => {
        it('computeGoogleSeoMetrics doit inclure les mots-clés suisses prioritaires et leurs métriques', () => {
            const seo = syniModule.computeGoogleSeoMetrics([], '');
            assert.ok(seo.keywords.length >= 8, 'Au moins 8 mots-clés suisses suivis');
            
            const kwTexts = seo.keywords.map(k => k.keyword);
            assert.ok(kwTexts.includes('location remorque vaud'), 'Mot-clé Vaud requis');
            assert.ok(kwTexts.includes('remorque lausanne'), 'Mot-clé Lausanne requis');
            assert.ok(kwTexts.includes('location porte voiture suisse'), 'Mot-clé porte voiture suisse requis');

            assert.ok(seo.totalOrganicClicks > 0, 'Volume total de clics organiques > 0');
            assert.ok(seo.totalImpressions > 0, 'Volume d\'impressions Google > 0');
            assert.ok(seo.averagePosition <= 5.0, 'Position moyenne favorable sur google.ch');
        });

        it('computeSyniMetrics doit ventiler correctement les referrers google.ch et google.com', () => {
            const mockEvents = {
                analytics: [
                    { id: '1', session_id: 's1', page_url: 'https://renger.ch/?ref=google.ch' },
                    { id: '2', session_id: 's2', page_url: 'https://renger.ch/?ref=google.ch' },
                    { id: '3', session_id: 's3', page_url: 'https://renger.ch/?ref=google.com' },
                    { id: '4', session_id: 's4', page_url: 'https://renger.ch/remorques.html' }
                ]
            };

            const metrics = syniModule.computeSyniMetrics(mockEvents, 'all');
            assert.equal(metrics.analytics.referrers['google.ch'], 2, '2 visites depuis google.ch');
            assert.equal(metrics.analytics.referrers['google.com'], 1, '1 visite depuis google.com');
            assert.equal(metrics.analytics.referrers['direct / autre'], 1, '1 visite directe');
        });
    });

    describe('6. Edge Function Deno syni-data & Robustesse Backend', () => {
        it('L\'Edge Function syni-data/index.ts doit exister et vérifier l\'authentification JWT', () => {
            assert.ok(fs.existsSync(edgeFunctionPath), 'L\'Edge Function syni-data doit exister');
            const code = fs.readFileSync(edgeFunctionPath, 'utf8');

            assert.ok(code.includes('authHeader'), 'Vérification en-tête Authorization requise');
            assert.ok(code.includes('supabaseAdmin.auth.getUser'), 'Validation token utilisateur requise');
        });

        it('L\'Edge Function doit contrôler strictement enism2007@hotmail.com ou profiles.is_admin', () => {
            const code = fs.readFileSync(edgeFunctionPath, 'utf8');
            assert.ok(code.includes('enism2007@hotmail.com'), 'Contrôle direct de l\'email administrateur suprême');
            assert.ok(code.includes('is_admin'), 'Contrôle de la colonne is_admin');
        });

        it('L\'Edge Function doit valider SYNI_MASTER_KEY et implémenter le rate limiting anti-DoS AVANT validation de mot de passe', () => {
            const code = fs.readFileSync(edgeFunctionPath, 'utf8');
            assert.ok(code.includes('SYNI_MASTER_KEY'), 'Contrôle de la passphrase maîtresse');
            assert.ok(code.includes('rate_limits'), 'Contrôle anti-brute force via rate_limits');
            assert.ok(code.includes('429'), 'Code de statut 429 Too Many Requests prévu');
            assert.ok(code.includes('syni_failed_passphrase'), 'Journalisation des échecs de mot de passe pour rate limiting');
        });

        it('La migration SQL doit définir la colonne is_admin sur profiles et le trigger de protection contre l\'escalade', () => {
            const sql = fs.readFileSync(path.join(projectRoot, 'supabase_migrations.sql'), 'utf8');
            assert.ok(sql.includes('is_admin boolean'), 'supabase_migrations.sql doit comporter is_admin boolean');
            assert.ok(sql.includes('enism2007@hotmail.com'), 'Attribution initiale pour enism2007@hotmail.com');
            assert.ok(sql.includes('protect_is_admin'), 'Trigger protect_is_admin requis pour empêcher l\'auto-promotion');
        });
    });

    describe('7. Exports CSV UTF-8 & Intégrité Données Exportables', () => {
        it('generateUsersCsv doit débuter par le BOM UTF-8 \\uFEFF et inclure les en-têtes requis dont l\'activité', () => {
            const users = [
                { id: 'u-1', username: 'enis', email: 'enism2007@hotmail.com', is_pro: true, is_admin: true, stripe_customer_id: 'cus_1', trailers_count: 2, bookings_count: 5 }
            ];
            const csv = syniModule.generateUsersCsv(users);
            assert.ok(csv.startsWith('\uFEFF'), 'Le CSV doit contenir le BOM UTF-8 pour Excel');
            assert.ok(csv.includes('Nom d\'utilisateur;Email'), 'En-têtes CSV séparés par point-virgule');
            assert.ok(csv.includes('Nb Remorques;Nb Réservations'), 'Colonnes d\'activité présentes dans CSV');
            assert.ok(csv.includes('enism2007@hotmail.com'), 'Présence de l\'email');
        });

        it('generateBookingsCsv doit inclure la ventilation financière en CHF', () => {
            const bookings = [
                {
                    id: 'b-99',
                    start_date: '2026-10-01',
                    end_date: '2026-10-02',
                    status: 'paye',
                    financials: { days: 2, totalPaid: 105.00, rengerFee: 5.00, platformCommission: 20.00, ownerPayout: 80.00, depositAmount: 200.00 }
                }
            ];
            const csv = syniModule.generateBookingsCsv(bookings);
            assert.ok(csv.startsWith('\uFEFF'), 'BOM UTF-8 requis');
            assert.ok(csv.includes('Montant Total CHF'), 'En-tête Montant Total CHF requis');
            assert.ok(csv.includes('105.00'), 'Présence du montant total payé');
        });
    });

    describe('8. Actions Opérationnelles Suprêmes & Journal d\'Audit', () => {
        let mockStorageStore = new Map();
        let originalWindow;

        beforeEach(() => {
            mockStorageStore = new Map();
            originalWindow = global.window;
            global.window = {
                localStorage: {
                    getItem: (k) => mockStorageStore.get(k) || null,
                    setItem: (k, v) => mockStorageStore.set(k, String(v)),
                    removeItem: (k) => mockStorageStore.delete(k),
                    clear: () => mockStorageStore.clear()
                }
            };
        });

        afterEach(() => {
            if (originalWindow !== undefined) global.window = originalWindow;
            else delete global.window;
        });

        it('executeSupremeAction : bascule de statut PRO et Bannissement pour un utilisateur avec enregistrement dans l\'audit log', async () => {
            await syniModule.fetchSyniData();

            const proRes = syniModule.executeSupremeAction('toggle_pro', 'user', 'u-admin-1', 'Validation PRO partenaire');
            assert.equal(proRes.success, true);
            assert.ok(proRes.message.includes('PRO'));
            assert.equal(proRes.log.action, 'toggle_pro');
            assert.equal(proRes.log.target_type, 'user');
            assert.equal(proRes.log.target_id, 'u-admin-1');
            assert.equal(proRes.log.admin_email, 'enism2007@hotmail.com');

            const banRes = syniModule.executeSupremeAction('toggle_ban', 'user', 'u-admin-1', 'Fraude avérée');
            assert.equal(banRes.success, true);
            assert.ok(banRes.message.includes('banni') || banRes.message.includes('débanni'));
            assert.equal(banRes.log.action, 'toggle_ban');

            const logs = syniModule.getAuditLogs();
            assert.ok(logs.length >= 2, 'Au moins 2 entrées journalisées');
            assert.equal(logs[0].action, 'toggle_ban');
            assert.equal(logs[1].action, 'toggle_pro');
        });

        it('executeSupremeAction : masquage/activation et octroi de boost 7j pour une remorque', async () => {
            await syniModule.fetchSyniData();

            const hideRes = syniModule.executeSupremeAction('toggle_active', 'trailer', '1', 'Photos non conformes');
            assert.equal(hideRes.success, true);
            assert.ok(hideRes.message.includes('Remorque #1'));

            const boostRes = syniModule.executeSupremeAction('boost_7d', 'trailer', '1', 'Offre de lancement');
            assert.equal(boostRes.success, true);
            assert.ok(boostRes.message.includes('7 jours'));
            assert.equal(boostRes.log.action, 'boost_7d');
            assert.equal(boostRes.log.target_type, 'trailer');
        });

        it('executeSupremeAction : gestion des cautions Stripe (libération, capture) et annulation administrative', async () => {
            await syniModule.fetchSyniData();

            const releaseRes = syniModule.executeSupremeAction('release_caution', 'booking', 'b-1', 'Restitution conforme');
            assert.equal(releaseRes.success, true);
            assert.ok(releaseRes.message.includes('libérée'));

            const captureRes = syniModule.executeSupremeAction('capture_caution', 'booking', 'b-2', 'Châssis tordu');
            assert.equal(captureRes.success, true);
            assert.ok(captureRes.message.includes('capturée'));

            const cancelRes = syniModule.executeSupremeAction('cancel_booking', 'booking', 'b-3', 'Annulation d urgence');
            assert.equal(cancelRes.success, true);
            assert.ok(cancelRes.message.includes('annulée'));
        });

        it('recordAuditLog et getAuditLogs : persistance et plafonnement sécurisé de l\'audit trail', () => {
            const entry = syniModule.recordAuditLog('test_action', 'system', 'sys-1', 'Test audit', 'enism2007@hotmail.com');
            assert.ok(entry.id.startsWith('log_'));
            assert.equal(entry.action, 'test_action');
            assert.equal(entry.admin_email, 'enism2007@hotmail.com');

            const stored = syniModule.getAuditLogs();
            assert.ok(stored.length > 0);
            assert.equal(stored[0].id, entry.id);
        });

        it('generateAuditCsv : export conforme UTF-8 avec BOM et point-virgule', () => {
            const testLogs = [
                {
                    timestamp: '2026-10-13T12:00:00.000Z',
                    action: 'toggle_pro',
                    target_type: 'user',
                    target_id: 'u-1',
                    reason: 'Passage PRO',
                    admin_email: 'enism2007@hotmail.com'
                }
            ];
            const csv = syniModule.generateAuditCsv(testLogs);
            assert.ok(csv.startsWith('\uFEFF'), 'BOM UTF-8 requis pour compatibilité Excel');
            assert.ok(csv.includes('Horodatage;Action;Type Cible;ID Cible;Motif;Administrateur'), 'En-têtes CSV attendus');
            assert.ok(csv.includes('toggle_pro'));
            assert.ok(csv.includes('enism2007@hotmail.com'));
        });

        it('openActionModal : exécute onConfirm(reason) avec motif et préserve le callback sans écrasement prématuré', () => {
            const originalDoc = global.document;
            let modalHidden = true;
            let capturedReason = null;
            let onConfirmRan = false;

            const modalEl = {
                classList: {
                    contains: (cls) => cls === 'hidden' ? modalHidden : false,
                    remove: (cls) => { if (cls === 'hidden') modalHidden = false; },
                    add: (cls) => { if (cls === 'hidden') modalHidden = true; }
                },
                onclick: null
            };
            const titleEl = { textContent: '' };
            const msgEl = { textContent: '' };
            const reasonInput = { value: '', onkeydown: null };
            const cancelBtn = { onclick: null };
            const confirmBtn = { onclick: null };

            global.document = {
                getElementById: (id) => {
                    if (id === 'syni-action-modal') return modalEl;
                    if (id === 'syni-action-title') return titleEl;
                    if (id === 'syni-action-message') return msgEl;
                    if (id === 'syni-action-reason') return reasonInput;
                    if (id === 'syni-action-cancel') return cancelBtn;
                    if (id === 'syni-action-confirm') return confirmBtn;
                    return null;
                }
            };

            syniModule.openActionModal({
                title: "Validation Partenaire PRO",
                message: "Confirmez le passage en PRO",
                actionType: 'toggle_pro',
                targetType: 'user',
                targetId: 'u-123',
                onConfirm: (reason) => {
                    onConfirmRan = true;
                    capturedReason = reason;
                }
            });

            assert.equal(modalHidden, false, 'Modale visible');
            assert.equal(titleEl.textContent, 'Validation Partenaire PRO');

            // Simuler saisie motif et clic confirmation
            reasonInput.value = 'Partenaire Vaud vérifié';
            assert.equal(typeof confirmBtn.onclick, 'function');
            confirmBtn.onclick();

            assert.equal(modalHidden, true, 'Modale refermée après validation');
            assert.equal(onConfirmRan, true, 'Callback onConfirm bien exécuté');
            assert.equal(capturedReason, 'Partenaire Vaud vérifié', 'Motif transmis au callback');

            global.document = originalDoc;
        });

        it('openActionModal : fermeture sans exécuter l action lors d une annulation', () => {
            const originalDoc = global.document;
            let modalHidden = true;
            let onConfirmRan = false;

            const modalEl = {
                classList: {
                    contains: (cls) => cls === 'hidden' ? modalHidden : false,
                    remove: (cls) => { if (cls === 'hidden') modalHidden = false; },
                    add: (cls) => { if (cls === 'hidden') modalHidden = true; }
                }
            };
            const cancelBtn = { onclick: null };
            const confirmBtn = { onclick: null };

            global.document = {
                getElementById: (id) => {
                    if (id === 'syni-action-modal') return modalEl;
                    if (id === 'syni-action-cancel') return cancelBtn;
                    if (id === 'syni-action-confirm') return confirmBtn;
                    return {};
                }
            };

            syniModule.openActionModal({
                title: "Action à annuler",
                message: "Avertissement",
                actionType: 'toggle_ban',
                targetType: 'user',
                targetId: 'u-456',
                onConfirm: () => { onConfirmRan = true; }
            });

            assert.equal(modalHidden, false);
            cancelBtn.onclick();
            assert.equal(modalHidden, true, 'Modale masquée après clic annuler');
            assert.equal(onConfirmRan, false, 'onConfirm non exécuté lors d une annulation');

            global.document = originalDoc;
        });
    });

    describe('9. Bandeau d\'Annonce Global & Mode Maintenance Sécurisé', () => {
        let mockStorageStore = new Map();
        let originalWindow;

        beforeEach(() => {
            mockStorageStore = new Map();
            originalWindow = global.window;
            global.window = {
                localStorage: {
                    getItem: (k) => mockStorageStore.get(k) || null,
                    setItem: (k, v) => mockStorageStore.set(k, String(v)),
                    removeItem: (k) => mockStorageStore.delete(k),
                    clear: () => mockStorageStore.clear()
                }
            };
        });

        afterEach(() => {
            if (originalWindow !== undefined) global.window = originalWindow;
            else delete global.window;
        });

        it('getBroadcastBannerConfig et setBroadcastBannerConfig : persistance dans localStorage', () => {
            const config = {
                enabled: true,
                type: 'warning',
                message: 'Maintenance programmée dimanche à 02h00',
                linkUrl: 'https://renger.ch/cgu.html',
                linkText: 'En savoir plus',
                dismissible: true
            };
            syniModule.setBroadcastBannerConfig(config);
            const saved = syniModule.getBroadcastBannerConfig();
            assert.equal(saved.enabled, true);
            assert.equal(saved.type, 'warning');
            assert.equal(saved.message, 'Maintenance programmée dimanche à 02h00');
            assert.equal(saved.linkUrl, 'https://renger.ch/cgu.html');
            assert.equal(saved.dismissible, true);
        });

        it('getMaintenanceModeConfig et setMaintenanceModeConfig : persistance dans localStorage', () => {
            const config = {
                enabled: true,
                message: 'Mise à niveau de l infrastructure Renger Suisse'
            };
            syniModule.setMaintenanceModeConfig(config);
            const saved = syniModule.getMaintenanceModeConfig();
            assert.equal(saved.enabled, true);
            assert.equal(saved.message, 'Mise à niveau de l infrastructure Renger Suisse');
        });

        it('components.js et core.js : intégration du bandeau et du mode maintenance avec l accès administrateur', () => {
            const componentsCode = fs.readFileSync(path.join(jsDir, 'components.js'), 'utf8');
            const coreCode = fs.readFileSync(path.join(jsDir, 'core.js'), 'utf8');

            assert.ok(componentsCode.includes('function initBroadcastBanner'), 'initBroadcastBanner requis dans components.js');
            assert.ok(componentsCode.includes('function initMaintenanceMode'), 'initMaintenanceMode requis dans components.js');
            assert.ok(componentsCode.includes('renger_broadcast_banner'), 'Clé renger_broadcast_banner scrutée');
            assert.ok(componentsCode.includes('renger_maintenance_mode'), 'Clé renger_maintenance_mode scrutée');
            assert.ok(componentsCode.includes('renger-maintenance-overlay'), 'Overlay bloquant pour grand public');
            assert.ok(componentsCode.includes('renger-maintenance-admin-badge'), 'Badge discret réservé à l administrateur');
            assert.ok(componentsCode.includes('enism2007@hotmail.com'), 'Contrôle administrateur suprême dans maintenance mode');
            assert.ok(componentsCode.includes('javascript:'), 'Filtrage préventif des URLs malveillantes');

            // Intégration auth dans core.js
            assert.ok(coreCode.includes('initMaintenanceMode'), 'core.js doit actualiser le mode maintenance sur onAuthStateChange');
            assert.ok(coreCode.includes('initBroadcastBanner'), 'core.js doit actualiser le bandeau sur onAuthStateChange');
        });

        it('initBroadcastBanner et initMaintenanceMode : exécution sécurisée et conformité Node.js', async () => {
            const { createRequire } = await import('module');
            const require = createRequire(import.meta.url);
            const comp = require('../Site web/js/components.js');

            assert.equal(typeof comp.initBroadcastBanner, 'function');
            assert.equal(typeof comp.initMaintenanceMode, 'function');
        });
    });

    describe('10. Simulateur Business & Modélisation Financière Renger', () => {
        it('calculateSimulatorProjections : modèle de référence par défaut (50 remorques, 20% PRO, 4j, 65 CHF)', () => {
            const proj = syniModule.calculateSimulatorProjections({
                activeTrailers: 50,
                proRate: 20,
                rentalDays: 4,
                dailyPrice: 65,
                boostRate: 15,
                fixedCosts: 250
            });

            // GMV
            assert.equal(proj.gmvMonthly, 13000, 'GMV mensuel = 50 * 4 * 65 = 13000 CHF');
            assert.equal(proj.gmvAnnual, 156000, 'GMV annuel = 13000 * 12 = 156000 CHF');

            // PRO MRR & ARR
            assert.equal(proj.nbPro, 10, '10 abonnés PRO (20% de 50)');
            assert.equal(proj.mrr, 390, 'MRR = 10 * 39 CHF = 390 CHF');
            assert.equal(proj.arr, 4680, 'ARR = 390 * 12 = 4680 CHF');

            // Commissions Renger sur non-PRO (20%)
            assert.equal(proj.nonProGmv, 10400, 'GMV non-PRO = 13000 * 80% = 10400 CHF');
            assert.equal(proj.platformCommissions, 2080, 'Commissions = 20% de 10400 = 2080 CHF');

            // Frais locataires (5% min 4.90 CHF)
            assert.equal(proj.totalBookings, 100, '100 réservations moyennes (200 jours / 2j par loc)');
            assert.equal(proj.feePerBooking, 6.50, 'Frais = 5% de 130 CHF = 6.50 CHF (> 4.90)');
            assert.equal(proj.renterFees, 650, 'Total frais locataires = 100 * 6.50 = 650 CHF');

            // Boosts (7.90 CHF moyenne pondérée)
            assert.equal(proj.nbBoosted, 8, '8 remorques boostées (15% de 50 = 7.5 arrondi à 8)');
            assert.equal(proj.boostRevenue, 63.20, 'Revenu boosts = 8 * 7.90 = 63.20 CHF');

            // Revenu Net Total & Profit
            assert.equal(proj.totalNetRevenue, 3183.20, 'Net Total = 2080 + 650 + 390 + 63.20 = 3183.20 CHF');
            assert.equal(proj.netProfit, 2933.20, 'Bénéfice Net = 3183.20 - 250 = 2933.20 CHF');
            assert.equal(proj.netMargin, 92.1, 'Marge nette = 92.1%');

            // Seuil de rentabilité (Break-Even)
            assert.equal(proj.breakEvenTrailers, 4, '4 remorques suffisent à couvrir 250 CHF de coûts fixes');
            assert.equal(proj.breakEvenBookings, 8, '8 réservations suffisent pour rentabiliser');
        });

        it('calculateSimulatorProjections : seuil minimum de frais locataires garanti à 4.90 CHF sur les petits montants', () => {
            const proj = syniModule.calculateSimulatorProjections({
                activeTrailers: 10,
                proRate: 0,
                rentalDays: 1,
                dailyPrice: 25, // Panier 25 CHF * 1j = 25 CHF -> 5% = 1.25 CHF < 4.90 CHF
                avgRentalDuration: 1,
                boostRate: 0,
                fixedCosts: 100
            });

            assert.equal(proj.feePerBooking, 4.90, 'Minimum légal Renger garanti à 4.90 CHF');
            assert.equal(proj.renterFees, 49, '10 réservations * 4.90 CHF = 49 CHF');
        });

        it('calculateSimulatorProjections : scénario 100% PRO avec 0% de commission de plateforme', () => {
            const proj = syniModule.calculateSimulatorProjections({
                activeTrailers: 50,
                proRate: 100,
                rentalDays: 4,
                dailyPrice: 65,
                boostRate: 0,
                fixedCosts: 300
            });

            assert.equal(proj.nbPro, 50, 'Toutes les remorques sous PRO');
            assert.equal(proj.mrr, 1950, 'MRR = 50 * 39 CHF = 1950 CHF');
            assert.equal(proj.nonProGmv, 0, 'Zéro GMV non-PRO');
            assert.equal(proj.platformCommissions, 0, 'Zéro commission prélevée sur membres PRO');
            assert.ok(proj.totalNetRevenue > proj.mrr, 'Revenus incluent les frais locataires');
        });

        it('calculateSimulatorProjections : seuil de rentabilité (Break-Even) avec coûts fixes élevés', () => {
            const proj = syniModule.calculateSimulatorProjections({
                activeTrailers: 40,
                proRate: 20,
                rentalDays: 3,
                dailyPrice: 50,
                boostRate: 10,
                fixedCosts: 1800
            });

            assert.ok(proj.breakEvenTrailers > 0, 'Seuil de remorques calculé');
            assert.ok(proj.breakEvenBookings > 0, 'Seuil de réservations calculé');
            const revPerTrailer = proj.totalNetRevenue / proj.activeTrailers;
            assert.ok(proj.breakEvenTrailers * revPerTrailer >= 1800, 'Couverture stricte des coûts fixes');
        });

        it('calculateSimulatorProjections : robustesse face aux cas limites (flotte 0, jours 0, coûts fixes 0, valeurs négatives)', () => {
            // Flotte à 0 remorque
            const projZero = syniModule.calculateSimulatorProjections({
                activeTrailers: 0,
                proRate: 20,
                rentalDays: 4,
                dailyPrice: 65,
                boostRate: 15,
                fixedCosts: 250
            });
            assert.equal(projZero.activeTrailers, 0);
            assert.equal(projZero.gmvMonthly, 0);
            assert.equal(projZero.totalBookings, 0, 'Zéro réservation quand 0 remorque');
            assert.equal(projZero.renterFees, 0, 'Zéro frais locataires fantômes');
            assert.equal(projZero.totalNetRevenue, 0);
            assert.equal(projZero.netProfit, -250);
            assert.equal(projZero.breakEvenTrailers, 0, 'Pas de NaN ou Infinity');
            assert.equal(projZero.breakEvenBookings, 0, 'Pas de NaN ou Infinity');

            // Coûts fixes à 0 CHF
            const projZeroCosts = syniModule.calculateSimulatorProjections({
                activeTrailers: 20,
                fixedCosts: 0
            });
            assert.equal(projZeroCosts.breakEvenTrailers, 0);
            assert.equal(projZeroCosts.breakEvenBookings, 0);

            // Jours loués à 0
            const projZeroDays = syniModule.calculateSimulatorProjections({
                activeTrailers: 30,
                rentalDays: 0,
                proRate: 0,
                boostRate: 0,
                fixedCosts: 100
            });
            assert.equal(projZeroDays.totalBookings, 0);
            assert.equal(projZeroDays.renterFees, 0);
            assert.equal(projZeroDays.gmvMonthly, 0);

            // Valeurs négatives
            const projNegative = syniModule.calculateSimulatorProjections({
                activeTrailers: -5,
                proRate: -10,
                rentalDays: -2,
                dailyPrice: -50,
                boostRate: -5,
                fixedCosts: -100
            });
            assert.equal(projNegative.activeTrailers, 0);
            assert.equal(projNegative.proRate, 0);
            assert.equal(projNegative.rentalDays, 0);
            assert.equal(projNegative.dailyPrice, 0);
            assert.equal(projNegative.boostRate, 0);
            assert.equal(projNegative.fixedCosts, 0);
        });

        it('syniModule expose toutes les constantes et fonctions opérationnelles Syni Palantir 3.0 & Copilot', () => {
            assert.equal(syniModule.MODULES.length, 10, '10 modules officiels dans Syni Copilot & Palantir');
            assert.ok(syniModule.MODULES.includes('control'), 'Module control exposé');
            assert.ok(syniModule.MODULES.includes('simulator'), 'Module simulator exposé');
            assert.ok(syniModule.MODULES.includes('palantir'), 'Module palantir exposé');
            assert.ok(syniModule.MODULES.includes('copilot'), 'Module copilot exposé');
            assert.equal(syniModule.BROADCAST_BANNER_KEY, 'renger_broadcast_banner');
            assert.equal(syniModule.MAINTENANCE_MODE_KEY, 'renger_maintenance_mode');
            assert.equal(syniModule.AUDIT_LOG_KEY, 'syni_audit_log');
            assert.equal(syniModule.COLAB_CONFIG_KEY, 'renger_colab_config');
            assert.equal(typeof syniModule.executeSupremeAction, 'function');
            assert.equal(typeof syniModule.calculateSimulatorProjections, 'function');
            assert.equal(typeof syniModule.openActionModal, 'function');
            assert.equal(typeof syniModule.closeActionModal, 'function');
            assert.equal(typeof syniModule.getAuditLogs, 'function');
            assert.equal(typeof syniModule.generateAuditCsv, 'function');
            // Master Editor & CRUD Absolu
            assert.equal(typeof syniModule.openMasterEditor, 'function');
            assert.equal(typeof syniModule.closeMasterEditor, 'function');
            assert.equal(typeof syniModule.saveMasterEntity, 'function');
            // Business Brain V3
            assert.equal(typeof syniModule.computeStrategicRecommendations, 'function');
            assert.equal(typeof syniModule.calculateOkrBreakdown, 'function');
            assert.equal(typeof syniModule.calculateExpansionScenarios, 'function');
            // Module 9 Palantir
            assert.equal(typeof syniModule.computeSentinelRiskScores, 'function');
            assert.equal(typeof syniModule.getNetworkConstellation, 'function');
            assert.equal(typeof syniModule.renderPalantirSection, 'function');
            assert.equal(typeof syniModule.generatePalantirBackup, 'function');
            assert.equal(typeof syniModule.exportDatabaseBackup, 'function');
            assert.equal(typeof syniModule.searchCommandPalette, 'function');
            assert.equal(typeof syniModule.openCommandPalette, 'function');
            assert.equal(typeof syniModule.closeCommandPalette, 'function');
        });
    });

    describe('11. God Mode CRUD : Soft-Delete Universel & Corbeille (CO art. 958f)', () => {
        it('executeSupremeAction soft_delete et restore sur un utilisateur avec journal d\'audit', () => {
            const resDelete = syniModule.executeSupremeAction('soft_delete', 'user', 'usr-owner-1', 'Test suppression compte');
            assert.equal(resDelete.success, true);
            assert.ok(resDelete.message.includes('corbeille'));
            assert.equal(resDelete.log.action, 'soft_delete');
            assert.equal(resDelete.log.target_type, 'user');
            assert.equal(resDelete.log.target_id, 'usr-owner-1');

            const resRestore = syniModule.executeSupremeAction('restore', 'user', 'usr-owner-1', 'Restauration compte');
            assert.equal(resRestore.success, true);
            assert.ok(resRestore.message.includes('restauré'));
            assert.equal(resRestore.log.action, 'restore');
        });

        it('executeSupremeAction soft_delete et restore sur une remorque (masquage et réactivation)', () => {
            const resDelete = syniModule.executeSupremeAction('soft_delete', 'trailer', '1', 'Retrait remorque');
            assert.equal(resDelete.success, true);
            assert.ok(resDelete.message.includes('corbeille'));

            const resRestore = syniModule.executeSupremeAction('restore', 'trailer', '1', 'Restauration remorque');
            assert.equal(resRestore.success, true);
            assert.ok(resRestore.message.includes('restaurée'));
        });

        it('executeSupremeAction soft_delete et restore sur une réservation (archivage CO 958f)', () => {
            const resDelete = syniModule.executeSupremeAction('soft_delete', 'booking', 'bkg-101', 'Archivage réservation');
            assert.equal(resDelete.success, true);
            assert.ok(resDelete.message.includes('corbeille'));

            const resRestore = syniModule.executeSupremeAction('restore', 'booking', 'bkg-101', 'Restauration réservation');
            assert.equal(resRestore.success, true);
            assert.ok(resRestore.message.includes('restaurée'));
        });

        it('computeSyniMetrics compte fidèlement les entités dans la corbeille et exclut les remorques supprimées', () => {
            const mockData = {
                profiles: [
                    { id: 'u1', username: 'u1', is_deleted: false },
                    { id: 'u2', username: 'u2', is_deleted: true }
                ],
                trailers: [
                    { id: 1, title: 'T1', is_deleted: false, is_active: true },
                    { id: 2, title: 'T2', is_deleted: true, is_active: false }
                ],
                bookings: [
                    { id: 'b1', total_price: 100, is_deleted: false },
                    { id: 'b2', total_price: 200, is_deleted: true }
                ]
            };
            const metrics = syniModule.computeSyniMetrics(mockData);
            assert.equal(metrics.trash.usersCount, 1);
            assert.equal(metrics.trash.trailersCount, 1);
            assert.equal(metrics.trash.bookingsCount, 1);
            assert.equal(metrics.trailers.active, 1, 'Seule la remorque non supprimée et active est comptée');
        });
    });

    describe('12. Master Editor Universel (Édition & Création Toutes Entités)', () => {
        it('saveMasterEntity crée un nouvel utilisateur et l\'enregistre dans l\'audit log', () => {
            const res = syniModule.saveMasterEntity('user', null, {
                username: 'jean_palantir',
                email: 'jean@renger.ch',
                is_pro: true,
                is_admin: false
            }, 'Création administrative directe');

            assert.equal(res.success, true);
            assert.equal(res.isNew, true);
            assert.ok(res.id);
            assert.equal(res.entity.username, 'jean_palantir');
            assert.equal(res.entity.is_pro, true);
            assert.equal(res.entity.is_deleted, false);

            const logs = syniModule.getAuditLogs();
            assert.ok(logs.some(l => l.action === 'create_user' && l.target_id === String(res.id)));
        });

        it('saveMasterEntity met à jour un utilisateur existant', () => {
            const resCreate = syniModule.saveMasterEntity('user', null, {
                username: 'alice_temp',
                email: 'alice@renger.ch'
            });

            const resUpdate = syniModule.saveMasterEntity('user', resCreate.id, {
                username: 'alice_officielle',
                is_admin: true
            }, 'Promotion administrateur');

            assert.equal(resUpdate.success, true);
            assert.equal(resUpdate.isNew, false);
            assert.equal(resUpdate.entity.username, 'alice_officielle');
            assert.equal(resUpdate.entity.is_admin, true);
        });

        it('saveMasterEntity crée et modifie une remorque avec tous ses paramètres', () => {
            const res = syniModule.saveMasterEntity('trailer', null, {
                title: 'Remorque Benne Saris 3000kg',
                category: 'benne',
                price: 95,
                caution: 400,
                payload: 2200,
                location: '1000 Lausanne',
                location_city: 'Lausanne',
                owner_id: 'usr-pro-1',
                is_active: true
            }, 'Ajout remorque Master Editor');

            assert.equal(res.success, true);
            assert.ok(res.id);
            assert.equal(res.entity.title, 'Remorque Benne Saris 3000kg');
            assert.equal(res.entity.price, 95);
            assert.equal(res.entity.caution, 400);
        });

        it('saveMasterEntity crée une réservation directe administrateur', () => {
            const res = syniModule.saveMasterEntity('booking', null, {
                trailer_id: 1,
                user_id: 'usr-renter-1',
                start_date: '2026-11-01',
                end_date: '2026-11-03',
                total_price: 210,
                status: 'paye',
                deposit_status: 'reserve'
            }, 'Réservation directe admin');

            assert.equal(res.success, true);
            assert.equal(res.entity.status, 'paye');
            assert.equal(res.entity.total_price, 210);
        });
    });

    describe('13. Module 9 : Palantir Sentinel (Détection d\'Anomalies & Fraudes)', () => {
        it('computeSentinelRiskScores calcule un score et 4 heuristiques de détection', () => {
            const mockData = {
                profiles: [{ id: 'u1' }],
                trailers: [{ id: 1 }],
                bookings: [
                    { id: 'b1', deposit_status: 'capture', status: 'termine', end_date: '2026-09-01' },
                    { id: 'b2', deposit_status: 'reserve', status: 'termine', end_date: '2026-09-05' }
                ],
                inspections: [
                    { booking_id: 'b1', mode: 'departure' } // Manque retour
                ],
                rateLimits: [
                    { id: 'r1', action: 'blocked', user_id: 'u1' }
                ]
            };

            const sentinel = syniModule.computeSentinelRiskScores(mockData);
            assert.ok(sentinel.globalScore >= 0 && sentinel.globalScore <= 100);
            assert.ok(['NORMAL', 'VIGILANCE', 'CRITIQUE'].includes(sentinel.status));
            assert.equal(typeof sentinel.heuristics.disputes, 'object');
            assert.equal(typeof sentinel.heuristics.inspections, 'object');
            assert.equal(typeof sentinel.heuristics.rateLimits, 'object');
            assert.equal(typeof sentinel.heuristics.cancellations, 'object');
            assert.ok(sentinel.alerts.length > 0, 'Des alertes sont remontées pour capture, photos manquantes et rate limit');
        });

        it('computeSentinelRiskScores renvoie un score nominal et sans alertes pour des données parfaites', () => {
            const mockData = {
                profiles: [{ id: 'u1' }],
                trailers: [{ id: 1 }],
                bookings: [
                    { id: 'b1', deposit_status: 'libere', status: 'termine', end_date: '2026-09-01' }
                ],
                inspections: [
                    { booking_id: 'b1', mode: 'departure' },
                    { booking_id: 'b1', mode: 'return' }
                ],
                rateLimits: []
            };

            const sentinel = syniModule.computeSentinelRiskScores(mockData);
            assert.equal(sentinel.globalScore, 0);
            assert.equal(sentinel.status, 'NORMAL');
            assert.equal(sentinel.alerts.length, 0);
        });
    });

    describe('14. Module 9 : Network Explorer & Constellation Relationnelle', () => {
        it('getNetworkConstellation extrait la constellation d\'un utilisateur (remorques, réservations, inspections, cautions)', () => {
            const mockData = {
                profiles: [{ id: 'usr-target', username: 'marc_cible' }],
                trailers: [{ id: 10, owner_id: 'usr-target', title: 'Remorque Marc' }],
                bookings: [
                    { id: 'bkg-1', trailer_id: 10, user_id: 'autre-user', total_price: 150, deposit_status: 'reserve' }
                ],
                inspections: [
                    { id: 'insp-1', booking_id: 'bkg-1', trailer_id: 10, mode: 'departure', step: 1 }
                ]
            };

            const constellation = syniModule.getNetworkConstellation('user', 'usr-target', mockData);
            assert.equal(constellation.entityType, 'user');
            assert.equal(constellation.entity.username, 'marc_cible');
            assert.equal(constellation.trailers.length, 1);
            assert.equal(constellation.bookings.length, 1);
            assert.equal(constellation.inspections.length, 1);
            assert.equal(constellation.cautions.length, 1);
            assert.equal(constellation.summary.totalVolume, 150);
        });

        it('getNetworkConstellation extrait la constellation d\'une remorque', () => {
            const mockData = {
                profiles: [{ id: 'usr-owner', username: 'proprio' }],
                trailers: [{ id: 5, owner_id: 'usr-owner', title: 'Remorque N5' }],
                bookings: [
                    { id: 'bkg-5', trailer_id: 5, total_price: 200 }
                ],
                inspections: []
            };

            const constellation = syniModule.getNetworkConstellation('trailer', '5', mockData);
            assert.equal(constellation.entityType, 'trailer');
            assert.equal(constellation.entity.title, 'Remorque N5');
            assert.equal(constellation.owner.username, 'proprio');
            assert.equal(constellation.bookings.length, 1);
            assert.equal(constellation.summary.totalVolume, 200);
        });
    });

    describe('15. Module 9 : Sauvegarde Intégrale BDD 1-Clic JSON (CO art. 958f)', () => {
        it('generatePalantirBackup produit un JSON complet, horodaté et conforme au droit suisse', () => {
            const backupJson = syniModule.generatePalantirBackup();
            assert.equal(typeof backupJson, 'string');
            const parsed = JSON.parse(backupJson);

            assert.equal(parsed.meta.system, 'Renger Syni Palantir 3.0');
            assert.ok(parsed.meta.exported_at);
            assert.ok(parsed.meta.legal_retention.includes('CO art. 958f'));
            assert.ok(Array.isArray(parsed.data.profiles));
            assert.ok(Array.isArray(parsed.data.trailers));
            assert.ok(Array.isArray(parsed.data.bookings));
            assert.ok(Array.isArray(parsed.data.inspections));
            assert.ok(Array.isArray(parsed.data.audit_logs));
        });
    });

    describe('16. Barre de Commande Rapide (Cmd+K / searchCommandPalette)', () => {
        it('searchCommandPalette renvoie les modules officiels et les actions God Mode par défaut', () => {
            const res = syniModule.searchCommandPalette('');
            assert.ok(res.length >= 10);
            assert.ok(res.some(r => r.title.includes('Cockpit Général')));
            assert.ok(res.some(r => r.title.includes('Palantir Sentinel')));
            assert.ok(res.some(r => r.title.includes('Nouveau') || r.title.includes('Nouvelle')));
            assert.ok(res.some(r => r.title.includes('Sauvegarde Intégrale BDD')));
        });

        it('searchCommandPalette filtre pertinemment par mot-clé et cible les entités', () => {
            const resPalantir = syniModule.searchCommandPalette('palantir');
            assert.ok(resPalantir.some(r => r.title.includes('Palantir')));

            const resCorbeille = syniModule.searchCommandPalette('corbeille');
            assert.ok(resCorbeille.some(r => r.title.includes('Corbeille')));
        });
    });

    describe('17. Business Brain V3 : Recommandations, Décomposeur OKR & 4 Scénarios d\'Expansion', () => {
        it('computeStrategicRecommendations produit 3 recommandations stratégiques exploitables', () => {
            const recs = syniModule.computeStrategicRecommendations();
            assert.equal(recs.length, 3);
            assert.ok(recs.some(r => r.title.includes('Élasticité Prix')));
            assert.ok(recs.some(r => r.title.includes('Expansion Territoriale')));
            assert.ok(recs.some(r => r.title.includes('Spécialisée')));
            recs.forEach(r => {
                assert.ok(r.tag);
                assert.ok(r.description);
                assert.ok(r.recommendation);
            });
        });

        it('calculateOkrBreakdown décompose mathématiquement l\'objectif d\'ARR en jalons et quotas cantons', () => {
            const okr = syniModule.calculateOkrBreakdown(100000);
            assert.equal(okr.targetArr, 100000);
            assert.ok(okr.currentArr >= 0);
            assert.ok(okr.progressPct >= 0 && okr.progressPct <= 100);
            assert.ok(okr.milestones.trailers.target > 0);
            assert.ok(okr.milestones.proUsers.target > 0);
            assert.ok(okr.milestones.monthlyBookings.target > 0);
            assert.ok(okr.cantonsQuota.VD > 0);
            assert.ok(okr.cantonsQuota.GE > 0);
            assert.ok(okr.cantonsQuota.ZH > 0);
        });

        it('calculateExpansionScenarios calcule et compare fidèlement les 4 scénarios d\'expansion', () => {
            const scenarios = syniModule.calculateExpansionScenarios();
            assert.equal(scenarios.length, 4);

            const [actuel, summer, alemanique, stress] = scenarios;
            assert.equal(actuel.id, 'actuel');
            assert.equal(summer.id, 'summer');
            assert.equal(alemanique.id, 'alemanique');
            assert.equal(stress.id, 'stress');

            assert.ok(summer.bookings > actuel.bookings, 'Haute saison a plus de locations que l actuel');
            assert.ok(alemanique.trailers > actuel.trailers, 'Expansion alémanique recrute plus de remorques');
            assert.ok(alemanique.netMonthlyRevenue > actuel.netMonthlyRevenue);
            assert.ok(stress.trailers <= actuel.trailers, 'Stress test plus conservateur');
        });
    });

    describe('18. Module 10 : Syni Copilot & Studio Modulaire Colab (UI & Structure)', () => {
        const syniHtml = fs.readFileSync(path.join(siteWebDir, 'syni.html'), 'utf8');

        it('syni.html contient la navigation Module 10 (#tab-copilot) et la section #syni-mod-copilot', () => {
            assert.ok(syniHtml.includes('id="tab-copilot"'), '#tab-copilot requis dans la barre latérale');
            assert.ok(syniHtml.includes('id="syni-mod-copilot"'), 'Section #syni-mod-copilot requise');
        });

        it('syni.html contient l\'interface split-screen studio (chat gauche, canevas droit)', () => {
            assert.ok(syniHtml.includes('id="copilot-chat-messages"'), 'Conteneur des messages chat requis');
            assert.ok(syniHtml.includes('id="copilot-chat-form"'), 'Formulaire de saisie prompt requis');
            assert.ok(syniHtml.includes('id="copilot-input"'), 'Input de chat copilot requis');
            assert.ok(syniHtml.includes('id="copilot-dynamic-canvas"'), 'Canevas dynamique modulaire droit requis');
            assert.ok(syniHtml.includes('id="btn-clear-canvas"'), 'Bouton vider canevas requis');
            assert.ok(syniHtml.includes('id="btn-copilot-clear-chat"'), 'Bouton vider chat requis');
            assert.ok(syniHtml.includes('btn-copilot-shortcut'), 'Boutons de suggestions rapides en 1 clic requis');
        });

        it('syni.html contient la modale de configuration Google Colab (#syni-colab-modal)', () => {
            assert.ok(syniHtml.includes('id="syni-colab-modal"'), '#syni-colab-modal requis');
            assert.ok(syniHtml.includes('renger_analytics_colab.ipynb'), 'Lien de téléchargement du notebook officiel requis');
            assert.ok(syniHtml.includes('id="colab-endpoint-url"'), 'Input URL webhook Colab requis');
            assert.ok(syniHtml.includes('id="btn-colab-save-config"'), 'Bouton enregistrer config Colab requis');
            assert.ok(syniHtml.includes('id="btn-colab-test-connection"'), 'Bouton test connexion Colab requis');
        });

        it('Le fichier notebook Jupyter renger_analytics_colab.ipynb existe et est valide', () => {
            const notebookPath = path.join(process.cwd(), 'renger_analytics_colab.ipynb');
            assert.ok(fs.existsSync(notebookPath), 'renger_analytics_colab.ipynb doit être présent');
            const content = fs.readFileSync(notebookPath, 'utf8');
            const parsed = JSON.parse(content);
            assert.ok(Array.isArray(parsed.cells), 'Doit contenir des cellules de code/markdown');
            assert.ok(content.includes('pandas'), 'Doit importer pandas');
            assert.ok(content.includes('analyze_search_vs_prices'), 'Doit définir l analyse des filtres vs prix');
            assert.ok(content.includes('FastAPI'), 'Doit contenir le serveur bridge FastAPI');
        });
    });

    describe('19. Moteur Analytique : Croisement Filtres x Prix des remorques & Évolution', () => {
        it('analyzeSearchFiltersVsTrailerPrices croise rigoureusement filtres, budgets et tarifs catalogues', () => {
            const mockData = {
                trailers: [
                    { id: 't1', category: 'Plateau porte-voiture', price: 90, is_active: true },
                    { id: 't2', category: 'Plateau porte-voiture', price: 80, is_active: true },
                    { id: 't3', category: 'Fermée / Bagagère', price: 50, is_active: true },
                    { id: 't4', category: 'Porte-moto', price: 40, is_active: true }
                ],
                analytics: [
                    { event_name: 'search', category: 'Plateau porte-voiture', max_budget: 70 },
                    { event_name: 'search', category: 'Plateau porte-voiture', max_budget: 75 },
                    { event_name: 'search', category: 'Plateau porte-voiture', max_budget: 80 },
                    { event_name: 'search', category: 'Fermée / Bagagère', max_budget: 45 }
                ]
            };

            const result = syniModule.analyzeSearchFiltersVsTrailerPrices(mockData);
            assert.ok(Array.isArray(result.filters), 'filters doit être un tableau');
            assert.ok(result.filters.length >= 2);

            const plateau = result.filters.find(f => f.category === 'Plateau porte-voiture');
            assert.ok(plateau, 'Plateau porte-voiture doit être analysé');
            assert.equal(plateau.catalogCount, 2);
            assert.equal(plateau.avgCatalogPrice, 85); // (90 + 80) / 2
            assert.ok(plateau.avgSearchBudget > 0);
            assert.equal(plateau.priceGap, Math.round((plateau.avgCatalogPrice - plateau.avgSearchBudget) * 10) / 10);
            assert.ok(plateau.trend, 'Doit comporter une tendance d évolution');

            assert.ok(result.globalStats);
            assert.ok(result.globalStats.totalSearches > 0);
            assert.ok(result.globalStats.avgCatalogPrice > 0);
            assert.ok(Array.isArray(result.recommendations) && result.recommendations.length > 0);
        });

        it('computeSupplyDemandBalance calcule la saturation territoriale suisse', () => {
            const balance = syniModule.computeSupplyDemandBalance();
            assert.ok(Array.isArray(balance.cantons));
            assert.ok(balance.cantons.length >= 6);
            const vd = balance.cantons.find(c => c.canton === 'VD');
            assert.ok(vd, 'Canton de Vaud doit être présent');
            assert.ok(vd.saturationRatio >= 0);
            assert.ok(vd.status);
            assert.ok(balance.summary);
        });

        it('computePriceElasticity ventile les tranches tarifaires et taux de conversion', () => {
            const elasticity = syniModule.computePriceElasticity();
            assert.ok(Array.isArray(elasticity.tiers));
            assert.equal(elasticity.tiers.length, 4);
            elasticity.tiers.forEach(t => {
                assert.ok(t.label);
                assert.ok(t.conversionRate > 0);
                assert.ok(t.fleetCount >= 0);
            });
            assert.ok(elasticity.insight);
        });
    });

    describe('20. Syni Copilot : Traitement du Langage Naturel & Génération Modulaire', () => {
        it('processCopilotPrompt gère la demande de croisement filtres x prix', () => {
            const res = syniModule.processCopilotPrompt("Peux-tu croiser les données des filtres de recherche avec le prix des remorques pour voir l'évolution ?");
            assert.ok(res.responseText.includes('filtres de recherche'));
            assert.ok(res.widget, 'Un widget dynamique doit être retourné');
            assert.equal(res.widget.type, 'chart_and_table');
            assert.equal(res.widget.chartType, 'bar');
            assert.ok(Array.isArray(res.widget.chartData.labels));
            assert.ok(Array.isArray(res.widget.chartData.datasets));
            assert.equal(res.widget.chartData.datasets.length, 2, 'Doit comparer Budget recherché vs Prix catalogue');
            assert.ok(Array.isArray(res.widget.tableData));
            assert.ok(res.widget.summaryText);
        });

        it('processCopilotPrompt gère la demande d\'offre vs demande cantonale', () => {
            const res = syniModule.processCopilotPrompt("Analyse l'équilibre offre vs demande par canton suisse");
            assert.ok(res.responseText.includes('Offre vs Demande'));
            assert.ok(res.widget);
            assert.equal(res.widget.badge, 'Radar Géographique');
            assert.ok(res.widget.chartData.labels.includes('VD'));
        });

        it('processCopilotPrompt gère la recherche d\'opportunités et requêtes sans résultat', () => {
            const res = syniModule.processCopilotPrompt("Quelles sont les opportunités de nouvelles remorques basées sur les recherches sans résultat ?");
            assert.ok(res.responseText.includes('opportunités'));
            assert.ok(res.widget);
            assert.equal(res.widget.badge, 'Potentiel Business');
            assert.ok(res.widget.tableData.length >= 3);
        });

        it('processCopilotPrompt gère l\'élasticité prix', () => {
            const res = syniModule.processCopilotPrompt("Quelle est l'élasticité prix ?");
            assert.ok(res.responseText.includes('élasticité'));
            assert.ok(res.widget);
            assert.equal(res.widget.chartType, 'line');
        });

        it('processCopilotPrompt renvoie une synthèse de bienvenue intelligente pour tout autre prompt', () => {
            const res = syniModule.processCopilotPrompt("Bonjour, que sais-tu faire ?");
            assert.ok(res.responseText.includes('Syni Copilot'));
            assert.ok(res.widget);
        });
    });

    describe('21. Google Colab Bridge : Configuration, Export Dataset & Fallback', () => {
        it('getColabConfig et setColabConfig gèrent la persistance locale de la configuration', () => {
            syniModule.setColabConfig({ endpointUrl: 'https://test-colab.ngrok-free.app/analyze', enabled: true });
            const cfg = syniModule.getColabConfig();
            assert.equal(cfg.endpointUrl, 'https://test-colab.ngrok-free.app/analyze');
            assert.equal(cfg.enabled, true);

            syniModule.setColabConfig({ endpointUrl: '', enabled: false });
            const cfgReset = syniModule.getColabConfig();
            assert.equal(cfgReset.endpointUrl, '');
            assert.equal(cfgReset.enabled, false);
        });

        it('exportColabDataset formate et exporte fidèlement les données plateforme pour Python', () => {
            const exported = syniModule.exportColabDataset();
            assert.ok(exported, 'Doit retourner un objet exporté');
            assert.equal(exported.meta.source, 'Renger Syni Studio');
            assert.ok(exported.meta.exported_at);
            assert.ok(Array.isArray(exported.trailers));
            assert.ok(Array.isArray(exported.bookings));
            assert.ok(Array.isArray(exported.search_events));
            assert.ok(Array.isArray(exported.profiles));
            assert.ok(exported.kpis);
        });

        it('queryColabApi bascule de manière transparente sur le moteur JS local en mode hors ligne', async () => {
            syniModule.setColabConfig({ endpointUrl: '', enabled: false });
            const res = await syniModule.queryColabApi("filtres et prix");
            assert.ok(res.responseText);
            assert.ok(res.widget);
            assert.equal(res.engine, 'Syni Data Science Local');
        });
        it('launchColab ouvre le notebook Colab dans un nouvel onglet sécurisé et le bouton existe dans Syni', () => {
            const syniHtml = fs.readFileSync(path.join(siteWebDir, 'syni.html'), 'utf8');
            assert.ok(syniHtml.includes('id="btn-colab-launch"'), 'Bouton Lancer Colab requis');

            const opened = [];
            const originalWindow = global.window;
            global.window = { open: (...args) => opened.push(args) };
            try {
                const url = syniModule.launchColab();
                assert.ok(url.startsWith('https://colab.research.google.com/github/'));
                assert.ok(url.endsWith('renger_analytics_colab.ipynb'));
                assert.equal(opened.length, 1);
                assert.equal(opened[0][1], '_blank');
                assert.ok(opened[0][2].includes('noopener'));
            } finally {
                if (originalWindow !== undefined) global.window = originalWindow;
                else delete global.window;
            }
        });
    });

});

