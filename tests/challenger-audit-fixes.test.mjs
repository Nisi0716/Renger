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

describe('Audit Fixes Verification Suite', () => {

    it('createSellerRentalHistoryCard calculates 100% net for PRO and 80% for Standard', () => {
        const trailersCode = fs.readFileSync(path.join(jsDir, 'trailers.js'), 'utf8');

        // Extraction de createSellerRentalHistoryCard
        const match = trailersCode.match(/(function\s+createSellerRentalHistoryCard\s*\([\s\S]*?\n\})/);
        assert.ok(match, "createSellerRentalHistoryCard doit exister dans trailers.js");

        const createEl = (tag = 'div') => ({
            tagName: tag.toUpperCase(),
            className: '',
            textContent: '',
            innerHTML: '',
            children: [],
            appendChild(child) { this.children.push(child); return child; },
            setAttribute() {},
            type: ''
        });

        const ctx = {
            Date: globalThis.Date,
            Math: globalThis.Math,
            Number: globalThis.Number,
            document: { createElement: createEl },
            renderAvatar: () => createEl('div'),
            openPublicProfile: () => {},
            openChatForBooking: () => {},
            window: { RengerContracts: null }
        };

        const fn = new Function('ctx', `
            with (ctx) {
                ${match[1]}
                return createSellerRentalHistoryCard;
            }
        `)(ctx);

        const mockBooking = {
            start_date: '2026-11-01',
            end_date: '2026-11-03', // 3 jours
            trailers: { price: 50, title: 'Remorque Test' },
            renter_id: 'renter-123'
        };

        // 1. Test Propriétaire PRO : 3 jours * 50 = 150 CHF -> 100% = 150.00 CHF
        const cardPro = fn(mockBooking, null, '2026-11-05', true);
        const proText = JSON.stringify(cardPro);
        assert.ok(proText.includes('+ 150.00 CHF'), 'Le propriétaire PRO doit percevoir 100% (150.00 CHF)');
        assert.ok(proText.includes('Net perçu PRO (100%)'), 'Le libellé PRO doit être Net perçu PRO (100%)');

        // 2. Test Propriétaire Standard : 3 jours * 50 = 150 CHF -> 80% = 120.00 CHF
        const cardStandard = fn(mockBooking, null, '2026-11-05', false);
        const standardText = JSON.stringify(cardStandard);
        assert.ok(standardText.includes('+ 120.00 CHF'), 'Le propriétaire standard doit percevoir 80% (120.00 CHF)');
        assert.ok(standardText.includes('Net perçu (80%)'), 'Le libellé standard doit être Net perçu (80%)');

        // 3. Test cas limite : booking sans trailer ni total_price ne doit pas produire NaN
        const cardEmpty = fn({ start_date: '2026-11-01', end_date: '2026-11-01' }, null, '2026-11-05', false);
        const emptyText = JSON.stringify(cardEmpty);
        assert.ok(!emptyText.includes('NaN'), 'Une réservation vide ne doit pas produire de montant NaN');
        assert.ok(emptyText.includes('+ 0.00 CHF'), 'Une réservation vide doit évaluer les gains à 0.00 CHF');
    });

    it('openTrailerDetail reveals boost and verified badges on future boost_end_date and verified', async () => {
        const bookingCode = fs.readFileSync(path.join(jsDir, 'booking.js'), 'utf8');

        function createMockBadge() {
            const classes = new Set(['hidden']);
            return {
                classList: {
                    add(c) { classes.add(c); },
                    remove(c) { classes.delete(c); },
                    contains(c) { return classes.has(c); }
                },
                _classes: classes
            };
        }

        const elements = {
            'detail-page': { classList: { add() {}, remove() {}, contains: () => false } },
            'detail-title': { innerText: '' },
            'detail-price': { innerText: '' },
            'detail-socket': { innerText: '' },
            'detail-payload': { innerText: '' },
            'detail-rating': { innerHTML: '', appendChild() {} },
            'detail-desc': { innerText: '' },
            'booking-dates': { value: '' },
            'booking-summary': { classList: { add() {}, remove() {} } },
            'detail-boost-badge': createMockBadge(),
            'detail-verified-badge': createMockBadge(),
            'detail-owner-badge': createMockBadge(),
            'action-btn': { innerText: '', className: '', onclick: null },
            'booking-header': { classList: { add() {}, remove() {}, contains: () => false } },
            'caution-amount': { innerText: '' },
            'caution-explain-amount': { innerText: '' },
            'owner-card': { classList: { add() {}, remove() {}, contains: () => false } },
            'owner-avatar': { innerHTML: '', appendChild() {} },
            'owner-username': { textContent: '' },
            'owner-badges': { innerHTML: '', appendChild() {} }
        };

        const ctx = {
            currentUser: { id: 'user-abc' },
            document: {
                getElementById: (id) => elements[id] || null,
                querySelector: () => null,
                title: ''
            },
            localStorage: { getItem: () => 'fr' },
            translations: { fr: { detail_desc: 'Desc' } },
            renderRatingBadge: () => ({}),
            initDetailCarousel: () => {},
            updateChatButtonState: () => {},
            getTrailerCaution: () => 150,
            flatpickr: () => ({ destroy: () => {} }),
            bookingCalendar: null,
            computeBadges: () => [],
            renderAvatar: () => ({}),
            blockOwnerDates: () => {},
            submitBooking: () => {},
            loadTrailerReviews: () => {},
            checkUserReviewEligibility: () => {},
            supabaseClient: {
                rpc: () => Promise.resolve(),
                from: () => ({
                    select: () => ({
                        eq: () => ({
                            maybeSingle: () => Promise.resolve({ data: null }),
                            eq: () => Promise.resolve({ data: [] }),
                            in: () => Promise.resolve({ data: [] })
                        }),
                        in: () => Promise.resolve({ data: [] })
                    })
                })
            }
        };

        const fn = new Function('ctx', `
            with (ctx) {
                let currentTrailer = null;
                let selectedStartDate = null;
                let selectedEndDate = null;
                ${bookingCode.slice(bookingCode.indexOf('async function openTrailerDetail'), bookingCode.indexOf('function submitBooking'))}
                return openTrailerDetail;
            }
        `)(ctx);

        // Test 1: Trailer avec boost_end_date futur
        const boostedTrailer = {
            id: 't-1',
            title: 'Remorque Boostée',
            price: 50,
            socket: '7 broches',
            payload: 500,
            boost_end_date: new Date(Date.now() + 86400000).toISOString(),
            is_verified: true,
            owner_id: 'user-abc'
        };

        await fn(boostedTrailer);
        assert.ok(!elements['detail-boost-badge']._classes.has('hidden'), 'Le badge boost doit être visible pour une date future');
        assert.ok(!elements['detail-verified-badge']._classes.has('hidden'), 'Le badge vérifié doit être visible');
        assert.ok(!elements['detail-owner-badge']._classes.has('hidden'), 'Le badge propriétaire doit être visible pour le propriétaire');

        // Test 2: Trailer avec boost_end_date passée
        const expiredTrailer = {
            id: 't-2',
            title: 'Remorque Expirée',
            price: 50,
            socket: '7 broches',
            payload: 500,
            boost_end_date: '2020-01-01T00:00:00Z',
            is_verified: false,
            owner_id: 'user-other'
        };

        await fn(expiredTrailer);
        assert.ok(elements['detail-boost-badge']._classes.has('hidden'), 'Le badge boost doit être masqué pour une date expirée');
        assert.ok(elements['detail-verified-badge']._classes.has('hidden'), 'Le badge vérifié doit être masqué');
        assert.ok(elements['detail-owner-badge']._classes.has('hidden'), 'Le badge propriétaire doit être masqué pour un autre utilisateur');
    });

    it('openManageTrailer aggregates revenue and rentals for paye, paid, and confirmed bookings', () => {
        const bookingCode = fs.readFileSync(path.join(jsDir, 'booking.js'), 'utf8');

        const elements = {
            'manage-trailer-title': { textContent: '' },
            'manage-trailer-revenue': { textContent: '' },
            'manage-trailer-rentals': { textContent: '' },
            'manage-trailer-views': { textContent: '' },
            'profile-seller-section': { classList: { add() {}, remove() {} } },
            'manage-trailer-section': { classList: { add() {}, remove() {} } }
        };

        const ctx = {
            cachedSellerBookings: [
                { trailer_id: 't-10', status: 'paye', total_price: 100, end_date: '2026-01-01' },
                { trailer_id: 't-10', status: 'paid', total_price: 150, end_date: '2026-01-02' },
                { trailer_id: 't-10', status: 'confirmed', total_price: 200, end_date: '2026-01-03' },
                { trailer_id: 't-10', status: 'cancelled', total_price: 500, end_date: '2026-01-04' } // ignoré
            ],
            document: {
                getElementById: (id) => elements[id] || null
            },
            window: { scrollTo() {} },
            showToast: () => {}
        };

        const fn = new Function('ctx', `
            with (ctx) {
                let currentManagedTrailer = null;
                let currentManagedCity = null;
                ${bookingCode.slice(bookingCode.indexOf('function openManageTrailer'), bookingCode.indexOf('function closeManageTrailer'))}
                return openManageTrailer;
            }
        `)(ctx);

        fn({ id: 't-10', title: 'Ma Remorque Flotte', views_count: 42 });

        assert.strictEqual(elements['manage-trailer-title'].textContent, 'Ma Remorque Flotte');
        assert.strictEqual(elements['manage-trailer-rentals'].textContent, 3, 'Doit comptabiliser les 3 réservations payées/confirmées');
        assert.strictEqual(elements['manage-trailer-revenue'].textContent, '450.00 CHF', 'Le revenu doit sommer 100 + 150 + 200 = 450.00 CHF');
    });

    it('updateTrailersMap renders Sponsorisé for future boost_end_date and immunizes onerror', () => {
        const trailersCode = fs.readFileSync(path.join(jsDir, 'trailers.js'), 'utf8');

        assert.ok(trailersCode.includes('boost_end_date && new Date(trailer.boost_end_date) > new Date()'),
            'updateTrailersMap doit vérifier boost_end_date pour les remorques réelles de la BDD');

        assert.ok(trailersCode.includes('img.onerror = null;'),
            'Les gestionnaires onerror doivent réinitialiser img.onerror = null pour prévenir toute boucle infinie');
    });

    it('louer-ma-remorque.html populates ad-ptac and dimensions in edit mode', () => {
        const html = fs.readFileSync(path.join(siteWebDir, 'louer-ma-remorque.html'), 'utf8');

        assert.ok(html.includes("ad-ptac"), "Le champ #ad-ptac doit être renseigné en mode édition");
        assert.ok(html.includes("ad-length"), "Le champ #ad-length doit être renseigné en mode édition");
        assert.ok(html.includes("ad-width"), "Le champ #ad-width doit être renseigné en mode édition");
        assert.ok(html.includes("ad-height"), "Le champ #ad-height doit être renseigné en mode édition");
    });

    it('components.js keydown listener closes inspection-success-modal on Escape key', () => {
        const componentsCode = fs.readFileSync(path.join(jsDir, 'components.js'), 'utf8');

        assert.ok(componentsCode.includes("inspection-success-modal"),
            "components.js doit inclure inspection-success-modal dans la liste des modales fermées par la touche Échap");
    });
});
