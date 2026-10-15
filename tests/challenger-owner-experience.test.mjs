import { describe, test, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const siteWebDir = path.join(projectRoot, 'Site web');
const jsDir = path.join(siteWebDir, 'js');

describe('Challenger Suite: Trailer Owner Experience & Swiss Business Rigor (Marc, 40 ans)', () => {

    describe('Item 1: Trailer Ad Draft Persistence (localStorage)', () => {
        it('trailers.js must export getTrailerFormDraft and handlePublish must save draft if !currentUser', () => {
            const trailersCode = fs.readFileSync(path.join(jsDir, 'trailers.js'), 'utf8');
            assert.ok(trailersCode.includes('function getTrailerFormDraft'), 'trailers.js doit déclarer getTrailerFormDraft()');
            assert.ok(trailersCode.includes('renger_pending_trailer'), 'trailers.js doit faire référence à la clé renger_pending_trailer');
            assert.match(trailersCode, /localStorage\.setItem\(['"]renger_pending_trailer['"]/, 'handlePublish doit sauvegarder le brouillon dans localStorage');
            assert.match(trailersCode, /localStorage\.removeItem\(['"]renger_pending_trailer['"]/, 'handlePublish doit nettoyer le brouillon après publication réussie');
        });

        it('louer-ma-remorque.html must contain #trailer-draft-banner and draft restoration handlers', () => {
            const html = fs.readFileSync(path.join(siteWebDir, 'louer-ma-remorque.html'), 'utf8');
            assert.ok(html.includes('id="trailer-draft-banner"'), 'louer-ma-remorque.html doit contenir #trailer-draft-banner');
            assert.ok(html.includes('restoreTrailerDraft()') || html.includes('restoreTrailerDraft'), 'louer-ma-remorque.html doit lier restoreTrailerDraft()');
            assert.ok(html.includes('dismissTrailerDraft()'), 'louer-ma-remorque.html doit lier dismissTrailerDraft()');
            assert.ok(html.includes('function initTrailerDraft'), 'louer-ma-remorque.html doit déclarer initTrailerDraft()');
            assert.ok(html.includes('function setupDraftAutoSave'), 'louer-ma-remorque.html doit déclarer setupDraftAutoSave()');
            assert.ok(html.includes('renger_pending_trailer_photos'), 'louer-ma-remorque.html doit gérer la restauration des photos');
        });
    });

    describe('Item 2: Fleet Header Add Button & Direct Navigation Link', () => {
        it('profil.html must contain #btn-add-trailer-permanent in fleet header', () => {
            const html = fs.readFileSync(path.join(siteWebDir, 'profil.html'), 'utf8');
            assert.ok(html.includes('id="btn-add-trailer-permanent"'), 'profil.html doit contenir #btn-add-trailer-permanent');
            assert.ok(/id="btn-add-trailer-permanent"/.test(html) && html.includes('href="louer-ma-remorque.html"'), 'Le bouton permanent doit mener vers louer-ma-remorque.html');
        });

        it('components.js updateUserMenu must include direct link to louer-ma-remorque.html', () => {
            const compCode = fs.readFileSync(path.join(jsDir, 'components.js'), 'utf8');
            assert.ok(compCode.includes('id="nav-rent-my-trailer-link"'), 'updateUserMenu doit intégrer #nav-rent-my-trailer-link');
            assert.ok(compCode.includes('louer-ma-remorque.html'), 'updateUserMenu doit pointer vers louer-ma-remorque.html');
        });
    });

    describe('Item 3: Standard Owner Personal Date Unblocking', () => {
        it('planning.js unblockDates must allow standard (non-pro) owners to unblock their own dates', () => {
            const planningCode = fs.readFileSync(path.join(jsDir, 'planning.js'), 'utf8');
            // Doit NE PAS contenir if (!isProUser) dans unblockDates
            const unblockMatch = planningCode.match(/async\s+function\s+unblockDates\([^)]*\)\s*\{([\s\S]*?)\n\s{4}\}/);
            assert.ok(unblockMatch, 'planning.js doit déclarer unblockDates');
            assert.ok(!unblockMatch[1].includes('if (!isProUser)'), 'unblockDates ne doit plus être verrouillé par isProUser');
        });
    });

    describe('Item 4: Open Email Validation for Swiss Artisans', () => {
        let core;
        beforeEach(async () => {
            // Mock minimal browser globals for core.js in Node
            global.window = global;
            global.document = {
                getElementById: () => null,
                addEventListener: () => {}
            };
            const coreModule = await import('../Site web/js/core.js');
            core = coreModule.default || coreModule;
        });

        it('core.js isValidEmail and isAllowedEmailDomain must accept Swiss artisan and business domains', () => {
            const validArtisans = [
                'marc@menuiserie-dubois.ch',
                'contact@garage-muller.ch',
                'info@batiment-vaud.ch',
                'artisan@bluewin.ch',
                'support@entreprise.swiss',
                'jean@pro-renov.com'
            ];

            for (const email of validArtisans) {
                assert.equal(core.isValidEmail(email), true, `isValidEmail doit accepter ${email}`);
                assert.equal(core.isAllowedEmailDomain(email), true, `isAllowedEmailDomain doit accepter ${email}`);
            }
        });

        it('core.js must reject invalid formats and disposable/spam email domains', () => {
            const invalidEmails = [
                'invalid-email',
                '@no-user.ch',
                'no-domain@',
                'spaces in@email.ch'
            ];
            for (const email of invalidEmails) {
                assert.equal(core.isValidEmail(email), false, `isValidEmail doit rejeter ${email}`);
            }

            const disposableEmails = [
                'spam@10minutemail.com',
                'test@tempmail.com',
                'fake@guerrillamail.com',
                'bot@mailinator.com',
                'throwaway@yopmail.com'
            ];
            for (const email of disposableEmails) {
                assert.equal(core.isAllowedEmailDomain(email), false, `isAllowedEmailDomain doit rejeter ${email}`);
            }
        });
    });

    describe('Item 5: Pickup Location on Confirmed/Paid Renter Booking', () => {
        it('trailers.js createRenterBookingCard must display trailer pickup address for paid renter', () => {
            const trailersCode = fs.readFileSync(path.join(jsDir, 'trailers.js'), 'utf8');
            const cardMatch = trailersCode.match(/function\s+createRenterBookingCard[\s\S]*?\{([\s\S]*?)\n\}/);
            assert.ok(cardMatch, 'trailers.js doit déclarer createRenterBookingCard');
            const body = cardMatch[1];
            assert.ok(body.includes('Adresse de retrait'), 'createRenterBookingCard doit contenir le libellé "Adresse de retrait"');
            assert.ok(body.includes('booking.trailers.location') || body.includes('booking.trailers?.location'), 'createRenterBookingCard doit lire location');
        });
    });

    describe('Item 6: Bank Details UI & Stripe Connect Integration', () => {
        let trailers;
        beforeEach(async () => {
            const trailersModule = await import('../Site web/js/trailers.js');
            trailers = trailersModule.default || trailersModule;
        });

        it('profil.html must contain Stripe Connect onboarding button and status badge, without manual IBAN box', () => {
            const html = fs.readFileSync(path.join(siteWebDir, 'profil.html'), 'utf8');
            assert.ok(html.includes('id="settings-stripe-btn"'), 'profil.html doit inclure #settings-stripe-btn');
            assert.ok(html.includes('id="settings-stripe-status-badge"'), 'profil.html doit inclure #settings-stripe-status-badge');
            assert.ok(html.includes('setupStripePayouts()'), 'profil.html doit déclencher setupStripePayouts()');
            assert.ok(!html.includes('id="settings-iban"'), 'profil.html ne doit plus contenir la saisie manuelle d IBAN (#settings-iban supprimé)');
        });

        it('trailers.js isValidSwissIBAN must accurately validate Swiss ISO 7064 mod 97 check', () => {
            assert.equal(typeof trailers.isValidSwissIBAN, 'function', 'isValidSwissIBAN doit être exportée');

            // Valid Swiss IBANs
            const validIBANs = [
                'CH93 0076 2011 6238 5295 7',
                'CH9300762011623852957',
                'ch93 0076 2011 6238 5295 7',
                'CH93-0076-2011-6238-5295-7',
                'CH93.0076.2011.6238.5295.7'
            ];
            for (const iban of validIBANs) {
                assert.equal(trailers.isValidSwissIBAN(iban), true, `IBAN valide ${iban} doit être accepté`);
            }

            // Invalid Swiss IBANs (wrong checksum, wrong length, wrong country)
            const invalidIBANs = [
                'CH93 0076 2011 6238 5295 8', // Wrong checksum
                'FR76 3000 6000 0112 3456 7890 189', // French IBAN
                'CH93 0076', // Incomplete
                '',
                null,
                undefined
            ];
            for (const iban of invalidIBANs) {
                assert.equal(trailers.isValidSwissIBAN(iban), false, `IBAN invalide ${iban} doit être rejeté`);
            }
        });

        it('trailers.js formatSwissIBAN must format in 4-character blocks', () => {
            assert.equal(typeof trailers.formatSwissIBAN, 'function', 'formatSwissIBAN doit être exportée');
            assert.equal(trailers.formatSwissIBAN('ch9300762011623852957'), 'CH93 0076 2011 6238 5295 7');
        });
    });

    describe('Item 7: Swiss Trailer Form Fields & Deposit Configuration', () => {
        it('louer-ma-remorque.html must contain Swiss inputs (is_braked, license_plate, deposit_amount, hitch_lock)', () => {
            const html = fs.readFileSync(path.join(siteWebDir, 'louer-ma-remorque.html'), 'utf8');
            assert.ok(html.includes('id="ad-license-plate"'), 'doit contenir #ad-license-plate');
            assert.ok(html.includes('name="is_braked"'), 'doit contenir radio name="is_braked"');
            assert.ok(html.includes('name="deposit_amount"'), 'doit contenir radio name="deposit_amount"');
            assert.ok(html.includes('id="ad-hitch-lock"'), 'doit contenir #ad-hitch-lock');
        });

        it('trailers.js handlePublish must incorporate Swiss fields in payload with schema fallback', () => {
            const trailersCode = fs.readFileSync(path.join(jsDir, 'trailers.js'), 'utf8');
            assert.ok(trailersCode.includes('is_braked: isBraked'), 'newTrailer doit inclure is_braked');
            assert.ok(trailersCode.includes('license_plate: licensePlateInput'), 'newTrailer doit inclure license_plate');
            assert.ok(trailersCode.includes('deposit_amount: depositAmount'), 'newTrailer doit inclure deposit_amount');
            assert.ok(trailersCode.includes('has_hitch_lock: hasHitchLock'), 'newTrailer doit inclure has_hitch_lock');

            // Graceful fallback
            assert.match(trailersCode, /delete\s+payload\.is_braked/, 'doit pouvoir replier is_braked');
            assert.match(trailersCode, /delete\s+payload\.license_plate/, 'doit pouvoir replier license_plate');
            assert.match(trailersCode, /delete\s+payload\.deposit_amount/, 'doit pouvoir replier deposit_amount');
            assert.match(trailersCode, /delete\s+payload\.has_hitch_lock/, 'doit pouvoir replier has_hitch_lock');
            assert.ok(trailersCode.includes('while (res.error && res.error.message'), 'doit utiliser une boucle de repli itérative multi-colonnes');
        });

        it('contracts.js must resolve trailer custom deposit_amount before category default', async () => {
            const contractsModule = await import('../Site web/js/contracts.js');
            const contracts = contractsModule.default || contractsModule;
            const customTrailer = { id: 1, category: 'utilitaire', deposit_amount: 800 };
            const caution = contracts.resolveCautionAmount(customTrailer);
            assert.equal(caution, 800, 'resolveCautionAmount doit honorer deposit_amount = 800');
        });
    });

    describe('Item 8: Damage & Dispute Reporting on Completed Rentals', () => {
        it('profil.html must contain #modal-dispute with dispute form and mailto info@renger.ch', () => {
            const html = fs.readFileSync(path.join(siteWebDir, 'profil.html'), 'utf8');
            assert.ok(html.includes('id="modal-dispute"'), 'profil.html doit contenir #modal-dispute');
            assert.ok(html.includes('id="dispute-description"'), 'profil.html doit contenir #dispute-description');
            assert.ok(html.includes('handleSendDispute(event)'), 'profil.html doit déclencher handleSendDispute');
            assert.ok(html.includes('info@renger.ch'), 'profil.html doit mentionner info@renger.ch');
        });

        it('trailers.js must render dispute button when todayStr > endStr and not cancelled, excluding indisponible blocks', () => {
            const trailersCode = fs.readFileSync(path.join(jsDir, 'trailers.js'), 'utf8');
            assert.ok(trailersCode.includes('Signaler un dommage / litige'), 'doit contenir le texte du bouton de litige');
            assert.ok(trailersCode.includes('openDisputeModal(booking)'), 'doit appeler openDisputeModal');
            assert.ok(trailersCode.includes('function openDisputeModal'), 'doit déclarer openDisputeModal');
            assert.ok(trailersCode.includes('function closeDisputeModal'), 'doit déclarer closeDisputeModal');
            assert.ok(trailersCode.includes('function handleSendDispute'), 'doit déclarer handleSendDispute');
            assert.ok(trailersCode.includes("statusNormOwner !== 'indisponible'"), 'createSellerRentalHistoryCard ne doit pas afficher le litige sur les dates bloquées personnelles');
        });
    });

    describe('Item 9: Native Camera Fallback in Inspection', () => {
        it('inspection.html must contain #inspection-fallback-file with capture="environment"', () => {
            const html = fs.readFileSync(path.join(siteWebDir, 'inspection.html'), 'utf8');
            assert.ok(html.includes('id="inspection-fallback-file"'), 'inspection.html doit inclure #inspection-fallback-file');
            assert.match(html, /capture=["']environment["']/, 'doit spécifier capture="environment" pour smartphone natif');
            assert.ok(html.includes('handleFallbackInspectionPhoto(event)'), 'doit lier onchange="handleFallbackInspectionPhoto(event)"');
        });

        it('inspection.js must export triggerFallbackCamera and handleFallbackInspectionPhoto with security validations', () => {
            const inspectionCode = fs.readFileSync(path.join(jsDir, 'inspection.js'), 'utf8');
            assert.ok(inspectionCode.includes('function triggerFallbackCamera'), 'inspection.js doit déclarer triggerFallbackCamera');
            assert.ok(inspectionCode.includes('async function handleFallbackInspectionPhoto'), 'inspection.js doit déclarer handleFallbackInspectionPhoto');
            assert.ok(inspectionCode.includes("'svg', 'html'"), 'handleFallbackInspectionPhoto doit valider et rejeter svg et html');
        });
    });

    describe('Item 10: Client-side Photo Compression before Validation', () => {
        let core;
        beforeEach(async () => {
            const coreModule = await import('../Site web/js/core.js');
            core = coreModule.default || coreModule;
        });

        it('core.js must export compressImageFile function', () => {
            assert.equal(typeof core.compressImageFile, 'function', 'compressImageFile doit être exportée');
        });

        it('core.js handleMultiPhotoSelect must invoke compressImageFile before size check', () => {
            const coreCode = fs.readFileSync(path.join(jsDir, 'core.js'), 'utf8');
            const fnMatch = coreCode.match(/async\s+function\s+handleMultiPhotoSelect[\s\S]*?\{([\s\S]*?)\n\}/);
            assert.ok(fnMatch, 'core.js doit déclarer handleMultiPhotoSelect');
            assert.ok(fnMatch[1].includes('compressImageFile'), 'handleMultiPhotoSelect doit appeler compressImageFile');
        });
    });

    describe('Database Migrations Contract (supabase_migrations.sql)', () => {
        it('supabase_migrations.sql must contain all owner experience columns with safe IF NOT EXISTS', () => {
            const sql = fs.readFileSync(path.join(projectRoot, 'supabase_migrations.sql'), 'utf8');
            assert.match(sql, /ALTER\s+TABLE\s+profiles[\s\S]*?full_name/i, 'migrations doit ajouter full_name à profiles');
            assert.match(sql, /ALTER\s+TABLE\s+profiles[\s\S]*?iban/i, 'migrations doit ajouter iban à profiles');
            assert.match(sql, /ALTER\s+TABLE\s+trailers[\s\S]*?is_braked/i, 'migrations doit ajouter is_braked à trailers');
            assert.match(sql, /ALTER\s+TABLE\s+trailers[\s\S]*?license_plate/i, 'migrations doit ajouter license_plate à trailers');
            assert.match(sql, /ALTER\s+TABLE\s+trailers[\s\S]*?deposit_amount/i, 'migrations doit ajouter deposit_amount à trailers');
            assert.match(sql, /ALTER\s+TABLE\s+trailers[\s\S]*?has_hitch_lock/i, 'migrations doit ajouter has_hitch_lock à trailers');
        });
    });
});
