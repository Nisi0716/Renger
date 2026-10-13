import { describe, it } from 'node:test';
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

    describe('3. Présence & Intégrité des 6 Modules dans Syni', () => {
        const syniHtml = fs.readFileSync(path.join(siteWebDir, 'syni.html'), 'utf8');

        it('syni.html doit contenir les 6 modules dédiés', () => {
            assert.ok(syniHtml.includes('id="syni-mod-cockpit"'), 'Module 1 : Cockpit Général requis');
            assert.ok(syniHtml.includes('id="syni-mod-users"'), 'Module 2 : Utilisateurs requis');
            assert.ok(syniHtml.includes('id="syni-mod-bookings"'), 'Module 3 : Réservations & Cashflow requis');
            assert.ok(syniHtml.includes('id="syni-mod-trailers"'), 'Module 4 : Flotte de Remorques requis');
            assert.ok(syniHtml.includes('id="syni-mod-inspections"'), 'Module 5 : États des Lieux & Audits requis');
            assert.ok(syniHtml.includes('id="syni-mod-seo"'), 'Module 6 : Google SEO & Acquisition requis');
        });

        it('syni.html doit comporter la barre latérale avec les 6 boutons de navigation et le bouton toggle rétractable', () => {
            assert.ok(syniHtml.includes('id="tab-cockpit"'), '#tab-cockpit requis');
            assert.ok(syniHtml.includes('id="tab-users"'), '#tab-users requis');
            assert.ok(syniHtml.includes('id="tab-bookings"'), '#tab-bookings requis');
            assert.ok(syniHtml.includes('id="tab-trailers"'), '#tab-trailers requis');
            assert.ok(syniHtml.includes('id="tab-inspections"'), '#tab-inspections requis');
            assert.ok(syniHtml.includes('id="tab-seo"'), '#tab-seo requis');
            assert.ok(syniHtml.includes('id="btn-toggle-sidebar"'), '#btn-toggle-sidebar requis pour la barre rétractable');
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

});
