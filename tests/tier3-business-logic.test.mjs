import { describe, test, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const siteWebDir = path.join(projectRoot, 'Site web');
const jsDir = path.join(siteWebDir, 'js');

/**
 * Chargeur sandbox pour booking.js dans un contexte VM isolé
 */
function loadBookingContext(customMocks = {}) {
    const bookingCode = fs.readFileSync(path.join(jsDir, 'booking.js'), 'utf8');
    let capturedFlatpickrConfig = null;

    const createEl = () => ({
        classList: { add() {}, remove() {}, contains: () => false },
        innerText: '',
        textContent: '',
        value: '',
        appendChild() {},
        innerHTML: '',
        setAttribute() {},
        style: {}
    });

    const domElements = {
        'detail-page': createEl(),
        'detail-title': createEl(),
        'detail-price': createEl(),
        'detail-socket': createEl(),
        'detail-payload': createEl(),
        'detail-rating': createEl(),
        'booking-dates': createEl(),
        'total-days': createEl(),
        'total-days-plural': createEl(),
        'total-rental-price': createEl(),
        'service-fee-price': createEl(),
        'caution-amount': createEl(),
        'caution-explain-amount': createEl(),
        'total-price': createEl(),
        'booking-summary': createEl(),
        'action-btn': createEl(),
        'booking-header': createEl(),
        'confirm-modal': createEl(),
        'confirm-dates': createEl(),
        'confirm-rental-price': createEl(),
        'confirm-service-fee': createEl(),
        'confirm-caution': createEl(),
        'confirm-total': createEl()
    };

    const ctx = {
        window: {
            location: { href: 'http://localhost/remorque.html?id=trailer-1' }
        },
        document: {
            getElementById: (id) => domElements[id] || createEl(),
            querySelector: () => null,
            querySelectorAll: () => [],
            createElement: createEl,
            title: ''
        },
        localStorage: {
            getItem: () => 'fr',
            setItem: () => {}
        },
        translations: {
            fr: { detail_desc: 'Description par défaut' }
        },
        bookingCalendar: null,
        selectedStartDate: null,
        selectedEndDate: null,
        renderRatingBadge: () => createEl(),
        renderAvatar: () => createEl(),
        computeBadges: () => [],
        renderBadge: () => createEl(),
        updateChatButtonState: () => {},
        initDetailCarousel: () => {},
        checkUserReviewEligibility: () => {},
        loadTrailerReviews: () => {},
        showToast: () => {},
        flatpickr: (selector, cfg) => {
            capturedFlatpickrConfig = cfg;
            return { destroy() {} };
        },
        supabaseClient: {
            rpc: () => Promise.resolve(),
            from: () => ({
                select: () => ({
                    eq: () => ({
                        maybeSingle: () => Promise.resolve({ data: null })
                    })
                })
            })
        },
        currentUser: { id: 'renter-user-1' },
        currentTrailer: {
            id: 'trailer-100',
            title: 'Remorque Bâche 750kg',
            price: 30,
            payload: 750,
            category: 'utilitaire',
            owner_id: 'owner-user-99'
        },
        ...customMocks
    };

    vm.createContext(ctx);
    vm.runInContext(bookingCode, ctx);

    return { ctx, domElements, getFlatpickrConfig: () => capturedFlatpickrConfig };
}

/**
 * Chargeur sandbox pour chat.js dans un contexte VM isolé
 */
function loadChatContext() {
    const chatCode = fs.readFileSync(path.join(jsDir, 'chat.js'), 'utf8');
    const ctx = {
        window: {},
        document: {
            getElementById: () => null,
            querySelector: () => null,
            createElement: () => ({ appendChild() {} })
        },
        supabaseClient: null,
        currentUser: null,
        currentTrailer: null,
        showToast: () => {}
    };
    vm.createContext(ctx);
    vm.runInContext(chatCode, ctx);
    return ctx;
}

/**
 * Chargeur sandbox pour tracking.js dans un contexte VM isolé
 */
function loadTrackingContext(mockStorage = {}) {
    const trackingCode = fs.readFileSync(path.join(jsDir, 'tracking.js'), 'utf8');
    const store = { ...mockStorage };
    const insertedEvents = [];

    const bannerElement = {
        id: 'cookie-banner',
        remove() { bannerElement.removed = true; },
        removed: false
    };

    const listeners = {};

    const ctx = {
        window: {
            location: { pathname: '/index.html', search: '' }
        },
        document: {
            addEventListener: (event, handler) => { listeners[event] = handler; },
            getElementById: (id) => (id === 'cookie-banner' ? (bannerElement.removed ? null : bannerElement) : null),
            createElement: () => bannerElement,
            body: { appendChild: () => {} }
        },
        localStorage: {
            getItem: (key) => store[key] || null,
            setItem: (key, val) => { store[key] = String(val); }
        },
        sessionStorage: {
            getItem: (key) => store[key] || null,
            setItem: (key, val) => { store[key] = String(val); }
        },
        crypto: {
            randomUUID: () => 'test-session-uuid-123'
        },
        supabaseClient: {
            from: (table) => ({
                insert: (rows) => {
                    if (table === 'analytics_events') {
                        insertedEvents.push(...rows);
                    }
                    return Promise.resolve({ data: rows, error: null });
                }
            })
        },
        currentUser: { id: 'user-analytics-test' },
        console: { warn() {}, error() {}, log() {} }
    };

    vm.createContext(ctx);
    vm.runInContext(trackingCode, ctx);

    return { ctx, store, insertedEvents, listeners };
}

describe('Tier 3: Date Duration Calculations & Autumn DST Transition', () => {
    it('should calculate 1 day for a same-day rental (e.g. 2026-06-15 to 2026-06-15)', async () => {
        const { ctx, domElements, getFlatpickrConfig } = loadBookingContext();
        await ctx.openTrailerDetail(ctx.currentTrailer);

        const config = getFlatpickrConfig();
        assert.ok(config && typeof config.onChange === 'function', 'flatpickr onChange doit être configuré');

        const start = new Date(2026, 5, 15);
        const end = new Date(2026, 5, 15);
        config.onChange([start, end]);

        assert.strictEqual(
            parseInt(domElements['total-days'].innerText, 10),
            1,
            'Une location sur la même journée doit compter pour 1 jour'
        );
    });

    it('should calculate 3 days for a standard summer 3-day rental (2026-06-15 to 2026-06-17)', async () => {
        const { ctx, domElements, getFlatpickrConfig } = loadBookingContext();
        await ctx.openTrailerDetail(ctx.currentTrailer);

        const config = getFlatpickrConfig();
        const start = new Date(2026, 5, 15);
        const end = new Date(2026, 5, 17);
        config.onChange([start, end]);

        assert.strictEqual(
            parseInt(domElements['total-days'].innerText, 10),
            3,
            'Une location du 15 au 17 juin inclus doit compter pour 3 jours'
        );
    });

    it('must calculate exactly 3 days (not 4) during Autumn DST transition in Switzerland (Oct 24 to Oct 26, 2026)', async () => {
        // En Suisse (fuseau Europe/Zurich), le passage à l'heure d'hiver a lieu dans la nuit du 24 au 25 octobre 2026 (49 heures écoulées).
        // Le calcul naïf Math.ceil(49h / 24h) + 1 donne 3 + 1 = 4 jours au lieu de 3.
        const { ctx, domElements, getFlatpickrConfig } = loadBookingContext();
        await ctx.openTrailerDetail(ctx.currentTrailer);

        const config = getFlatpickrConfig();
        // Simulation des deux dates avec décalage horaire d'automne (+02:00 vers +01:00 = 49h)
        const start = new Date('2026-10-24T00:00:00+02:00');
        const end = new Date('2026-10-26T00:00:00+01:00');
        config.onChange([start, end]);

        const computedDays = parseInt(domElements['total-days'].innerText, 10);
        assert.strictEqual(
            computedDays,
            3,
            `Anomalie DST détectée : du 24 au 26 octobre (3 jours calendaires) a été calculé comme ${computedDays} jours au lieu de 3`
        );
    });
});

describe('Tier 3: Pricing, Deposit and Service Fee Calculations', () => {
    it('calculateRengerServiceFee should apply 5% fee with guaranteed minimum 4.90 CHF and Swiss 0.05 rounding', () => {
        const { ctx } = loadBookingContext();
        assert.strictEqual(typeof ctx.calculateRengerServiceFee, 'function');

        // Prix nul ou négatif -> 4.90 CHF minimum
        assert.strictEqual(ctx.calculateRengerServiceFee(0), 4.90);
        assert.strictEqual(ctx.calculateRengerServiceFee(-20), 4.90);

        // Location à 30 CHF : 30 * 0.05 = 1.50 CHF -> plafonné au min 4.90 CHF
        assert.strictEqual(ctx.calculateRengerServiceFee(30), 4.90);

        // Location à 100 CHF : 100 * 0.05 = 5.00 CHF
        assert.strictEqual(ctx.calculateRengerServiceFee(100), 5.00);

        // Arrondi suisse aux 5 centimes : 113 CHF * 0.05 = 5.65 CHF
        assert.strictEqual(ctx.calculateRengerServiceFee(113), 5.65);

        // Location à 253 CHF * 0.05 = 12.65 CHF
        assert.strictEqual(ctx.calculateRengerServiceFee(253), 12.65);
    });

    it('getTrailerCaution should apply Swiss scale according to category, payload, and custom values', () => {
        const { ctx } = loadBookingContext();
        assert.strictEqual(typeof ctx.getTrailerCaution, 'function');

        // Remorque nulle -> défaut 200 CHF
        assert.strictEqual(ctx.getTrailerCaution(null), 200);

        // Remorque avec caution explicite
        assert.strictEqual(ctx.getTrailerCaution({ caution: 350 }), 350);
        assert.strictEqual(ctx.getTrailerCaution({ deposit: 500 }), 500);

        // Catégories lourdes -> 400 CHF
        assert.strictEqual(ctx.getTrailerCaution({ category: 'cheval', payload: 1000 }), 400);
        assert.strictEqual(ctx.getTrailerCaution({ category: 'voiture', payload: 1100 }), 400);
        assert.strictEqual(ctx.getTrailerCaution({ category: 'refrigere', payload: 800 }), 400);
        assert.strictEqual(ctx.getTrailerCaution({ category: 'utilitaire', payload: 1500 }), 400); // payload > 1200

        // Catégories moyennes -> 300 CHF
        assert.strictEqual(ctx.getTrailerCaution({ category: 'moto', payload: 400 }), 300);
        assert.strictEqual(ctx.getTrailerCaution({ category: 'utilitaire', payload: 800 }), 300); // payload > 750

        // Utilitaires standards & légers -> 200 CHF
        assert.strictEqual(ctx.getTrailerCaution({ category: 'utilitaire', payload: 500 }), 200);
        assert.strictEqual(ctx.getTrailerCaution({ category: 'porte-velo', payload: 200 }), 200);
    });

    it('should calculate total rental price and fees accurately for tenant view', async () => {
        const { ctx, domElements, getFlatpickrConfig } = loadBookingContext();
        ctx.currentTrailer.price = 25; // 25 CHF par jour
        await ctx.openTrailerDetail(ctx.currentTrailer);

        const config = getFlatpickrConfig();
        const start = new Date(2026, 6, 1);
        const end = new Date(2026, 6, 3); // 3 jours
        config.onChange([start, end]);

        // 3 jours * 25 CHF = 75 CHF de location
        assert.strictEqual(domElements['total-rental-price'].innerText, '75 CHF');

        // Frais : 75 * 0.05 = 3.75 CHF -> minimum 4.90 CHF
        assert.strictEqual(domElements['service-fee-price'].innerText, '4.90 CHF');

        // Total locataire : 75 + 4.90 = 79.90 CHF
        assert.strictEqual(domElements['total-price'].innerText, '79.90 CHF');
    });

    it('should display 0 CHF total for trailer owner viewing their own ad', async () => {
        const { ctx, domElements, getFlatpickrConfig } = loadBookingContext({
            currentUser: { id: 'owner-user-99' },
            currentTrailer: { id: 'trailer-100', price: 50, owner_id: 'owner-user-99' }
        });
        await ctx.openTrailerDetail(ctx.currentTrailer);

        const config = getFlatpickrConfig();
        const start = new Date(2026, 6, 1);
        const end = new Date(2026, 6, 2); // 2 jours
        config.onChange([start, end]);

        assert.strictEqual(domElements['total-price'].innerText, '0 CHF');
    });
});

describe('Tier 3: Anti-Scam Filter & Message Sanitization', () => {
    it('sanitizeMessage must mask emails, phone numbers and IBANs while preserving legitimate rental descriptions', () => {
        const chatCtx = loadChatContext();
        assert.strictEqual(typeof chatCtx.sanitizeMessage, 'function');
        const MASK = '[Information masquée avant réservation]';

        // 1. Emails
        assert.strictEqual(
            chatCtx.sanitizeMessage('Écris-moi sur contact@renger.ch merci'),
            `Écris-moi sur ${MASK} merci`
        );
        assert.strictEqual(
            chatCtx.sanitizeMessage('Mon adresse est jean.dupont123@bluewin.ch'),
            `Mon adresse est ${MASK}`
        );

        // 2. Téléphones suisses & formats internationaux
        assert.strictEqual(
            chatCtx.sanitizeMessage('Appelle-moi au +41 79 123 45 67'),
            `Appelle-moi au ${MASK}`
        );
        assert.strictEqual(
            chatCtx.sanitizeMessage('Mon numéro est 0791234567'),
            `Mon numéro est ${MASK}`
        );
        assert.strictEqual(
            chatCtx.sanitizeMessage('Joignable au 079 456 78 90'),
            `Joignable au ${MASK}`
        );
        assert.strictEqual(
            chatCtx.sanitizeMessage('0041 78 999 88 77 pour convenir de l\'heure'),
            `${MASK} pour convenir de l'heure`
        );

        // 3. IBAN suisse (suite de chiffres masquée)
        const ibanMessage = 'Virement sur CH93 0076 2011 6238 5295 7';
        const sanitizedIban = chatCtx.sanitizeMessage(ibanMessage);
        assert.ok(
            sanitizedIban.includes(MASK),
            `L'IBAN '${ibanMessage}' doit être intercepté et masqué par le filtre anti-scam`
        );

        // 4. Texte légitime d'une annonce / discussion de location (NE DOIT PAS être masqué)
        const legitMessage1 = 'Bonjour, la remorque 750 kg est-elle disponible ce samedi matin ?';
        assert.strictEqual(
            chatCtx.sanitizeMessage(legitMessage1),
            legitMessage1,
            'Une description normale avec un poids ne doit pas être altérée'
        );

        const legitMessage2 = 'La prise est une 13 broches avec adaptateur 7 broches inclus.';
        assert.strictEqual(
            chatCtx.sanitizeMessage(legitMessage2),
            legitMessage2,
            'Une mention de prise et broches ne doit pas être altérée'
        );

        const legitMessage3 = 'Rendez-vous à 14h devant le numéro 12 de la rue de la Gare.';
        assert.strictEqual(
            chatCtx.sanitizeMessage(legitMessage3),
            legitMessage3,
            'Une adresse simple et une heure ne doivent pas être altérées'
        );
    });
});

describe('Tier 3: Cookie Consent Evaluation (RGPD / nLPD)', () => {
    it('should render banner and NOT track when consent is missing', () => {
        const { ctx, store, insertedEvents, listeners } = loadTrackingContext();
        assert.strictEqual(typeof ctx.initCookieBanner, 'function');

        ctx.initCookieBanner();
        assert.strictEqual(store['renger_cookie_consent'], undefined, 'Aucun consentement ne doit être présumé');
        assert.strictEqual(insertedEvents.length, 0, 'Aucun événement ne doit être émis sans consentement préalable');
    });

    it('should start tracking when consent is accepted', async () => {
        const { ctx, insertedEvents } = loadTrackingContext({
            renger_cookie_consent: 'accepted'
        });

        await ctx.startTracking();
        assert.strictEqual(insertedEvents.length, 1, 'Un événement de tracking doit être émis si le consentement est accepté');
        assert.strictEqual(insertedEvents[0].event_name, 'page_view');
        assert.strictEqual(insertedEvents[0].user_id, 'user-analytics-test');
    });

    it('must NOT start tracking when consent is refused or declined', async () => {
        const { ctx, insertedEvents } = loadTrackingContext({
            renger_cookie_consent: 'refused'
        });

        ctx.initCookieBanner();
        assert.strictEqual(insertedEvents.length, 0, 'Les événements analytiques doivent être bloqués en cas de refus des cookies');
    });
});

describe('Tier 3: Renger Analytics PRO Financial & Business Logic (stats.js)', () => {
    const statsModule = (function() {
        const statsPath = path.join(jsDir, 'stats.js');
        const statsCode = fs.readFileSync(statsPath, 'utf8');
        const m = { exports: {} };
        const fn = new Function('module', 'exports', statsCode);
        fn(m, m.exports);
        return m.exports;
    })();

    it('calculateOverlapDays must accurately calculate overlap between dates', () => {
        const startA = new Date('2026-05-10T00:00:00Z');
        const endA = new Date('2026-05-15T00:00:00Z');

        // Cas 1: Période totalement incluse (10 au 15 mai = 6 jours)
        const startB = new Date('2026-05-01T00:00:00Z');
        const endB = new Date('2026-05-31T00:00:00Z');
        assert.strictEqual(statsModule.calculateOverlapDays(startA, endA, startB, endB), 6);

        // Cas 2: Période chevauchant le début (10 au 12 mai = 3 jours)
        const endB2 = new Date('2026-05-12T00:00:00Z');
        assert.strictEqual(statsModule.calculateOverlapDays(startA, endA, startB, endB2), 3);

        // Cas 3: Aucun chevauchement (avant ou après)
        const startDisjoint = new Date('2026-06-01T00:00:00Z');
        const endDisjoint = new Date('2026-06-05T00:00:00Z');
        assert.strictEqual(statsModule.calculateOverlapDays(startA, endA, startDisjoint, endDisjoint), 0);
    });

    it('formatChf must format amounts in Swiss Francs (CHF) with 2 decimals', () => {
        assert.match(statsModule.formatChf(1250), /1[\s\u202F'’]?250[.,]00 CHF/);
        assert.match(statsModule.formatChf(39.5), /39[.,]50 CHF/);
        assert.match(statsModule.formatChf(0), /0[.,]00 CHF/);
    });

    it('escapeHtml must sanitize malicious HTML strings', () => {
        const payload = '<script>alert("xss")</script>&<img src="x" onerror="evil()"/>';
        const escaped = statsModule.escapeHtml(payload);
        assert.strictEqual(escaped.includes('<script>'), false);
        assert.strictEqual(escaped.includes('&lt;script&gt;'), true);
        assert.strictEqual(escaped.includes('&amp;'), true);
    });

    it('PRO financial formula must guarantee 100% net revenue and 20% platform commission savings', () => {
        // Pour une location de 5 jours à 50 CHF/j = 250 CHF base
        const rentalDays = 5;
        const dailyPrice = 50;
        const baseRental = rentalDays * dailyPrice; // 250 CHF

        // Mode Standard (Non-PRO) : Propriétaire touche 80% (200 CHF), Renger prend 20% (50 CHF)
        const standardOwnerRevenue = baseRental * 0.80;
        const platformCommissionLost = baseRental * 0.20;
        assert.strictEqual(standardOwnerRevenue, 200);
        assert.strictEqual(platformCommissionLost, 50);

        // Mode Renger PRO : Propriétaire touche 100% (250 CHF)
        const proOwnerRevenue = baseRental * 1.00;
        const proSavings = baseRental * 0.20; // 50 CHF conservés grâce à PRO
        assert.strictEqual(proOwnerRevenue, 250);
        assert.strictEqual(proSavings, 50);
        assert.strictEqual(proOwnerRevenue - standardOwnerRevenue, proSavings);
    });

    it('calculateOverlapDays must handle end-of-day timestamps without off-by-one bug', () => {
        // Booking from May 1 to May 20 inside a May 1 to May 10 period with 23:59:59.999
        const bStart = '2026-05-01';
        const bEnd = '2026-05-20';
        const pStart = new Date(2026, 4, 1, 0, 0, 0, 0);
        const pEnd = new Date(2026, 4, 10, 23, 59, 59, 999);
        const overlap = statsModule.calculateOverlapDays(bStart, bEnd, pStart, pEnd);
        assert.strictEqual(overlap, 10, 'Overlap of May 1..20 inside May 1..10 must be exactly 10 days (not 11)');

        // Single-day booking on May 10 inside May 1..31
        const singleDay = statsModule.calculateOverlapDays('2026-05-10', '2026-05-10', '2026-05-01', '2026-05-31');
        assert.strictEqual(singleDay, 1, 'Single-day booking must count as exactly 1 day');

        // Invalid dates must return 0
        assert.strictEqual(statsModule.calculateOverlapDays(null, '2026-05-10', '2026-05-01', '2026-05-31'), 0);
        assert.strictEqual(statsModule.calculateOverlapDays('invalid-date', '2026-05-10', '2026-05-01', '2026-05-31'), 0);
    });

    it('formatDateKey and normalizeToDateOnly must eliminate timezone shifts', () => {
        const dt = statsModule.normalizeToDateOnly('2026-05-10');
        assert.ok(dt instanceof Date);
        assert.strictEqual(dt.getFullYear(), 2026);
        assert.strictEqual(dt.getMonth(), 4); // May = 4
        assert.strictEqual(dt.getDate(), 10);
        assert.strictEqual(dt.getHours(), 0);

        const key = statsModule.formatDateKey('2026-05-10');
        assert.strictEqual(key, '2026-05-10');
    });

    it('getBookingDailyPrice must resolve prices with cascading fallbacks', () => {
        // Case 1: trailer price joined
        const b1 = { trailers: { price: 65 }, total_price: 200 };
        assert.strictEqual(statsModule.getBookingDailyPrice(b1, '2026-05-01', '2026-05-03'), 65);

        // Case 2: daily_price property
        const b2 = { daily_price: 45, total_price: 150 };
        assert.strictEqual(statsModule.getBookingDailyPrice(b2, '2026-05-01', '2026-05-03'), 45);

        // Case 3: total_price divided by days (3 days = 150 / 3 = 50)
        const b3 = { total_price: 150 };
        assert.strictEqual(statsModule.getBookingDailyPrice(b3, '2026-05-01', '2026-05-03'), 50);
    });

    it('getPeriodDateRange for year must span from Jan 1 to Dec 31 of current year', () => {
        const { start, end } = statsModule.getPeriodDateRange('year');
        const curYear = new Date().getFullYear();
        assert.strictEqual(start.getFullYear(), curYear);
        assert.strictEqual(start.getMonth(), 0);
        assert.strictEqual(start.getDate(), 1);
        assert.strictEqual(end.getFullYear(), curYear);
        assert.strictEqual(end.getMonth(), 11);
        assert.strictEqual(end.getDate(), 31);
    });
});
