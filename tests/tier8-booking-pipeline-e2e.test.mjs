import { describe, test, it, beforeEach } from 'node:test';
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
const functionsDir = path.join(projectRoot, 'supabase', 'functions');

/**
 * Création d'un élément DOM simulé avec support complet classList, style, attributes
 */
function createMockElement(id = '', tagName = 'div') {
    const classList = new Set();
    const children = [];
    const attributes = new Map();
    let _innerText = '';
    let _textContent = '';
    let _innerHTML = '';
    let _value = '';

    const el = {
        id,
        tagName: tagName.toUpperCase(),
        style: {},
        dataset: {},
        disabled: false,
        onclick: null,
        src: '',
        get value() { return _value; },
        set value(val) { _value = String(val ?? ''); },
        get className() { return Array.from(classList).join(' '); },
        set className(val) {
            classList.clear();
            (val || '').split(/\s+/).filter(Boolean).forEach(c => classList.add(c));
        },
        get innerText() { return _innerText; },
        set innerText(v) { _innerText = String(v ?? ''); _textContent = String(v ?? ''); },
        get textContent() { return _textContent; },
        set textContent(v) { _textContent = String(v ?? ''); _innerText = String(v ?? ''); },
        get innerHTML() { return _innerHTML; },
        set innerHTML(v) { _innerHTML = String(v ?? ''); },
        classList: {
            add: (...cls) => cls.forEach(c => c && classList.add(c)),
            remove: (...cls) => cls.forEach(c => c && classList.delete(c)),
            contains: (c) => classList.has(c),
            toggle: (c) => (classList.has(c) ? classList.delete(c) : classList.add(c))
        },
        setAttribute: (k, v) => attributes.set(k, String(v)),
        getAttribute: (k) => attributes.get(k) || null,
        removeAttribute: (k) => attributes.delete(k),
        children,
        appendChild: (child) => {
            children.push(child);
            return child;
        },
        addEventListener: () => {}
    };
    return el;
}

/**
 * Sandbox de chargement du moteur de réservation (booking.js & core.js)
 */
function createBookingSandbox(options = {}) {
    const bookingCode = fs.readFileSync(path.join(jsDir, 'booking.js'), 'utf8');
    const coreCode = fs.readFileSync(path.join(jsDir, 'core.js'), 'utf8');

    const domMap = new Map();
    const getOrCreateEl = (id, tag = 'div') => {
        if (!domMap.has(id)) {
            domMap.set(id, createMockElement(id, tag));
        }
        return domMap.get(id);
    };

    // Pré-initialisation des éléments clés du template remorque.html
    const requiredIds = [
        'detail-page', 'detail-title', 'detail-price', 'detail-socket', 'detail-payload',
        'detail-permit', 'detail-boost-badge', 'detail-verified-badge', 'detail-owner-badge',
        'detail-rating', 'detail-desc', 'detail-equipments', 'equipments-title',
        'detail-upsells', 'upsells-title', 'booking-dates', 'total-days', 'total-days-plural',
        'total-rental-price', 'service-fee-price', 'caution-amount', 'caution-explain-amount',
        'total-price', 'booking-summary', 'action-btn', 'booking-header', 'chat-btn',
        'owner-card', 'owner-avatar', 'owner-username', 'owner-badges', 'owner-profile-btn',
        'detail-review-prompt', 'booking-confirm-modal', 'confirm-img', 'confirm-title',
        'confirm-dates', 'confirm-days', 'confirm-rental-calc', 'confirm-rental-price',
        'confirm-service-fee', 'confirm-caution-price', 'confirm-price', 'confirm-pay-amount',
        'confirm-btn-caution', 'caution-info-modal'
    ];
    requiredIds.forEach(id => getOrCreateEl(id));

    // booking-summary et booking-confirm-modal démarrent avec 'hidden'
    getOrCreateEl('booking-summary').classList.add('hidden');
    getOrCreateEl('booking-confirm-modal').classList.add('hidden');

    let capturedFlatpickrConfig = null;
    const toastLog = [];
    const historyLog = [];
    const edgeFunctionCalls = [];
    const localStorageStore = new Map();

    const currentUser = options.currentUser !== undefined ? options.currentUser : { id: 'renter-uuid-42', email: 'renter@renger.ch' };
    const currentTrailer = options.currentTrailer !== undefined ? options.currentTrailer : {
        id: 'trailer-swiss-100',
        title: 'Remorque Fourgon Saris 750kg',
        price: 35,
        payload: 750,
        socket: '7 broches',
        category: 'utilitaire',
        owner_id: 'owner-uuid-99',
        image_url: 'https://images.unsplash.com/photo-trailer.jpg'
    };

    const defaultSupabaseClient = {
        rpc: () => Promise.resolve({ data: null, error: null }),
        from: (table) => ({
            select: () => ({
                eq: () => ({
                    maybeSingle: () => Promise.resolve({ data: null, error: null }),
                    single: () => Promise.resolve({ data: null, error: null }),
                    in: () => Promise.resolve({ data: [], error: null })
                }),
                in: () => Promise.resolve({ data: [], error: null })
            }),
            insert: () => Promise.resolve({ data: null, error: null })
        }),
        auth: {
            getSession: () => Promise.resolve({
                data: { session: { access_token: 'mock-jwt-token-123' } },
                error: null
            }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } })
        }
    };

    const ctx = {
        window: {
            location: {
                href: 'https://renger.ch/remorque.html?id=' + (currentTrailer?.id || ''),
                pathname: '/remorque.html',
                search: '?id=' + (currentTrailer?.id || '')
            },
            history: {
                replaceState: (state, title, url) => {
                    historyLog.push({ state, title, url });
                }
            },
            showStripeLoading: () => {},
            hideStripeLoading: () => {}
        },
        URLSearchParams,
        setTimeout: (fn, ms) => setTimeout(fn, Math.min(ms, 2)),
        clearTimeout,
        openProfile: async () => {
            toastLog.push({ msg: 'OPEN_PROFILE', type: 'action' });
        },
        document: {
            getElementById: (id) => getOrCreateEl(id),
            querySelector: (sel) => {
                if (sel.startsWith('#')) return getOrCreateEl(sel.slice(1));
                return null;
            },
            querySelectorAll: () => [],
            createElement: (tag) => createMockElement('', tag),
            title: ''
        },
        localStorage: {
            getItem: (k) => localStorageStore.get(k) || null,
            setItem: (k, v) => localStorageStore.set(k, String(v)),
            removeItem: (k) => localStorageStore.delete(k),
            clear: () => localStorageStore.clear()
        },
        currentUser,
        currentTrailer,
        bookingCalendar: null,
        selectedStartDate: null,
        selectedEndDate: null,
        translations: {
            fr: { detail_desc: 'Description par défaut de la remorque' }
        },
        showToast: (msg, type) => {
            toastLog.push({ msg, type });
        },
        openAuthModal: () => {
            toastLog.push({ msg: 'OPEN_AUTH_MODAL', type: 'action' });
        },
        flatpickr: (selector, cfg) => {
            capturedFlatpickrConfig = cfg;
            return {
                destroy: () => {}
            };
        },
        renderRatingBadge: () => createMockElement('', 'span'),
        renderAvatar: () => createMockElement('', 'div'),
        computeBadges: () => [],
        renderBadge: () => createMockElement('', 'span'),
        updateChatButtonState: () => {},
        initDetailCarousel: () => {},
        checkUserReviewEligibility: () => {},
        loadTrailerReviews: () => {},
        openPublicProfile: () => {},
        supabaseClient: options.supabaseClient || defaultSupabaseClient,
        callEdgeFunction: async (fnName, payload) => {
            edgeFunctionCalls.push({ fnName, payload });
            if (options.edgeFunctionMock) {
                return options.edgeFunctionMock(fnName, payload);
            }
            return {
                url: 'https://checkout.stripe.com/c/pay/cs_test_mocked_session',
                bookingId: 'bk-' + Math.floor(Math.random() * 100000)
            };
        },
        console: {
            log: () => {},
            warn: () => {},
            error: () => {}
        }
    };

    // Fonctions utilitaires définies dans core.js
    ctx.formatDateToLocalISO = function(date) {
        if (!date) return '';
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    vm.createContext(ctx);
    vm.runInContext(bookingCode, ctx);

    return {
        ctx,
        domMap,
        getEl: (id) => getOrCreateEl(id),
        getFlatpickrConfig: () => capturedFlatpickrConfig,
        toastLog,
        historyLog,
        edgeFunctionCalls,
        localStorageStore
    };
}

/**
 * Simulateur fidèle de l'Edge Function Supabase 'stripe-checkout'
 */
function createStripeCheckoutSimulator(dbState = {}) {
    const trailers = dbState.trailers || new Map();
    const bookings = dbState.bookings || [];
    const users = dbState.users || new Map();
    let stripeSessionCreated = null;

    async function handleRequest({ authHeader, body, origin = 'https://renger.ch' }) {
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
        };

        // 1. Authentification
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return {
                status: 401,
                body: { error: "Non autorisé." }
            };
        }
        const token = authHeader.replace('Bearer ', '');
        const user = users.get(token);
        if (!user) {
            return {
                status: 401,
                body: { error: "Utilisateur non authentifié." }
            };
        }

        const { trailerId, startDate, endDate, cautionAmount, durationHours } = body || {};

        if (!trailerId || !startDate || !endDate) {
            return {
                status: 400,
                body: { error: "Paramètres de réservation manquants." }
            };
        }

        // 2. Annonce remorque
        const trailer = trailers.get(trailerId);
        if (!trailer) {
            return {
                status: 404,
                body: { error: "Remorque introuvable." }
            };
        }

        // Interdiction propriétaire
        if (trailer.owner_id === user.id) {
            return {
                status: 400,
                body: { error: "Vous ne pouvez pas louer votre propre remorque." }
            };
        }

        if (!trailer.price || Number(trailer.price) <= 0 || isNaN(Number(trailer.price))) {
            return {
                status: 400,
                body: { error: "Prix journalier de la remorque invalide." }
            };
        }

        // Validation temporelle
        const todayStr = new Date().toISOString().split('T')[0];
        if (startDate < todayStr) {
            return {
                status: 400,
                body: { error: "La date de début ne peut pas être dans le passé." }
            };
        }
        if (startDate > endDate) {
            return {
                status: 400,
                body: { error: "La date de fin doit être postérieure à la date de début." }
            };
        }

        // Calculs financiers (Normalisation UTC minuit contre les décalages DST)
        const startParts = String(startDate).split('T')[0].split('-').map(Number);
        const endParts = String(endDate).split('T')[0].split('-').map(Number);
        const utcStart = Date.UTC(startParts[0], startParts[1] - 1, startParts[2]);
        const utcEnd = Date.UTC(endParts[0], endParts[1] - 1, endParts[2]);
        const diffTime = Math.abs(utcEnd - utcStart);
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;

        const rawTiers = Array.isArray(trailer.pricing_tiers) ? trailer.pricing_tiers : [];
        let validatedDurationHours = null;
        if (durationHours !== undefined && durationHours !== null && durationHours !== '') {
            const parsedHours = parseInt(String(durationHours), 10);
            const matchingHourTier = rawTiers.find(t => (t.unit === 'hours' || t.unit === 'hour') && Number(t.duration) === parsedHours);
            if (!Number.isFinite(parsedHours) || parsedHours <= 0 || diffDays !== 1 || !matchingHourTier) {
                return {
                    status: 400,
                    body: { error: "Forfait horaire invalide ou indisponible pour cette remorque." }
                };
            }
            validatedDurationHours = parsedHours;
        }

        // Rate limiting (max 5 réservations en 10 minutes)
        const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
        const recentBookingsCount = bookings.filter(b => 
            b.renter_id === user.id && 
            new Date(b.created_at).getTime() >= tenMinutesAgo
        ).length;

        if (recentBookingsCount >= 5) {
            return {
                status: 429,
                body: { error: "Trop de tentatives de réservation. Veuillez patienter 10 minutes." }
            };
        }

        // Conflits de réservation (surbooking - VULN-03)
        const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
        const conflicts = bookings.filter(b => {
            if (b.trailer_id !== trailerId) return false;
            if (!['paye', 'paid', 'confirmed', 'active', 'en_attente', 'indisponible'].includes(b.status)) return false;
            // Overlap check
            const overlaps = b.start_date <= endDate && b.end_date >= startDate;
            if (!overlaps) return false;
            if (b.status === 'en_attente') {
                return new Date(b.created_at).getTime() > thirtyMinutesAgo;
            }
            return true;
        });

        if (conflicts.length > 0) {
            return {
                status: 409,
                body: { error: "Ces dates ne sont plus disponibles. Veuillez en choisir d'autres." }
            };
        }

        let totalRentalPrice = diffDays * Number(trailer.price);
        if (validatedDurationHours) {
            const ht = rawTiers.find(t => (t.unit === 'hours' || t.unit === 'hour') && Number(t.duration) === validatedDurationHours);
            if (ht) totalRentalPrice = Number(ht.price);
        } else if (rawTiers.some(t => (t.unit === 'days' || t.unit === 'day') && Number(t.duration) <= diffDays)) {
            const dayTiers = [{ duration: 1, price: Number(trailer.price) }];
            for (const t of rawTiers) {
                if ((t.unit === 'days' || t.unit === 'day') && Number(t.duration) >= 1 && Number(t.duration) <= diffDays) {
                    dayTiers.push({ duration: Number(t.duration), price: Number(t.price) });
                }
            }
            const dp = new Array(diffDays + 1).fill(Infinity);
            dp[0] = 0;
            for (let d = 1; d <= diffDays; d++) {
                for (const dt of dayTiers) {
                    if (dt.duration <= d) {
                        const cand = Math.round((dp[d - dt.duration] + dt.price) * 100) / 100;
                        if (cand < dp[d]) dp[d] = cand;
                    }
                }
            }
            totalRentalPrice = dp[diffDays];
        }

        const rawServiceFee = totalRentalPrice * 0.05;
        const serviceFee = Math.max(4.90, Math.round(rawServiceFee * 20) / 20);
        const totalPaidPrice = parseFloat((totalRentalPrice + serviceFee).toFixed(2));

        const isHeavy = ['cheval', 'voiture', 'refrigere'].includes(trailer.category) || (trailer.payload && trailer.payload > 1200);
        const isMedium = trailer.category === 'moto' || (trailer.payload && trailer.payload > 750);
        const customCaution = Number(trailer.deposit_amount) > 0 ? Number(trailer.deposit_amount) : (Number(trailer.caution) > 0 ? Number(trailer.caution) : (Number(trailer.deposit) > 0 ? Number(trailer.deposit) : 0));
        const caution = customCaution > 0 ? customCaution : (isHeavy ? 400 : (isMedium ? 300 : 200));

        // Insertion réservation en_attente
        const newBooking = {
            id: 'bk-' + (bookings.length + 1),
            trailer_id: trailer.id,
            renter_id: user.id,
            owner_id: trailer.owner_id,
            start_date: startDate,
            end_date: endDate,
            total_price: totalPaidPrice,
            rental_price: totalRentalPrice,
            ...(validatedDurationHours ? { duration_hours: validatedDurationHours } : {}),
            status: 'en_attente',
            created_at: new Date().toISOString()
        };
        bookings.push(newBooking);

        const durationLabel = validatedDurationHours
            ? `${validatedDurationHours}h`
            : `${diffDays} jour${diffDays > 1 ? 's' : ''}`;

        // Session Stripe mockée avec les contrats stricts
        stripeSessionCreated = {
            id: 'cs_test_' + newBooking.id,
            url: `https://checkout.stripe.com/c/pay/cs_test_${newBooking.id}`,
            client_reference_id: newBooking.id,
            line_items: [
                {
                    price_data: {
                        currency: 'chf',
                        product_data: {
                            name: `Location : ${trailer.title} (${durationLabel})`,
                            description: `Période du ${startDate} au ${endDate}`
                        },
                        unit_amount: Math.round(totalRentalPrice * 100)
                    },
                    name: `Location : ${trailer.title} (${durationLabel})`,
                    unit_amount: Math.round(totalRentalPrice * 100),
                    currency: 'chf',
                    quantity: 1
                },
                {
                    price_data: {
                        currency: 'chf',
                        product_data: {
                            name: `Frais de traitement Renger`,
                            description: `Frais de service plateforme sécurisée (5%, min. 4.90 CHF)`
                        },
                        unit_amount: Math.round(serviceFee * 100)
                    },
                    name: `Frais de traitement Renger`,
                    unit_amount: Math.round(serviceFee * 100),
                    currency: 'chf',
                    quantity: 1
                }
            ],
            payment_intent_data: {
                setup_future_usage: 'off_session',
                metadata: {
                    booking_id: newBooking.id,
                    rental_price: totalRentalPrice.toFixed(2),
                    service_fee: serviceFee.toFixed(2),
                    caution_amount: caution.toString(),
                    ...(validatedDurationHours ? { duration_hours: String(validatedDurationHours) } : {})
                }
            },
            custom_text: {
                submit: {
                    message: `🛡️ Empreinte bancaire : La caution de ${caution} CHF n'est pas débitée (0 CHF prélevé). Elle sera automatiquement libérée sans frais après l'état des lieux de retour.`
                }
            }
        };

        return {
            status: 200,
            body: {
                url: stripeSessionCreated.url,
                bookingId: newBooking.id
            },
            stripeSession: stripeSessionCreated,
            booking: newBooking
        };
    }

    return {
        handleRequest,
        getLastStripeSession: () => stripeSessionCreated,
        getBookings: () => bookings
    };
}

describe('Tier 8: Banc de Test E2E Tunnel de Réservation & Stripe Checkout', () => {

    // =========================================================================
    // R1. Exactitude du Devis Financier et Normalisation Calendrier
    // =========================================================================
    describe('R1. Exactitude du Devis Financier et Normalisation Calendrier', () => {

        it('R1-1: La sélection de 1 jour facture exactement 1 journée de location + plancher garanti de 4.90 CHF', async () => {
            const { ctx, getEl, getFlatpickrConfig } = createBookingSandbox({
                currentTrailer: { id: 't1', title: 'Remorque 1', price: 25, payload: 500, category: 'utilitaire', owner_id: 'o1' }
            });

            await ctx.openTrailerDetail(ctx.currentTrailer);
            const fp = getFlatpickrConfig();
            assert.ok(fp && typeof fp.onChange === 'function', 'Flatpickr onChange doit être configuré');

            // 1 jour : même date de début et de fin (ex: 15 juin 2026)
            const sameDay = new Date(2026, 5, 15);
            fp.onChange([sameDay, sameDay]);

            assert.strictEqual(getEl('total-days').innerText, '1', 'Durée doit être de 1 jour');
            assert.strictEqual(getEl('total-days-plural').innerText, '', 'Pas de pluriel pour 1 jour');
            assert.strictEqual(getEl('total-rental-price').innerText, '25 CHF', 'Prix base = 1 * 25 CHF');
            // 25 * 0.05 = 1.25 CHF < 4.90 CHF plancher
            assert.strictEqual(getEl('service-fee-price').innerText, '4.90 CHF', 'Plancher de 4.90 CHF appliqué');
            assert.strictEqual(getEl('total-price').innerText, '29.90 CHF', 'Total = 25 + 4.90 = 29.90 CHF');
        });

        it('R1-2: Calcul des frais de service Renger avec arrondi suisse aux 5 centimes et plancher 4.90 CHF', () => {
            const { ctx } = createBookingSandbox();

            // Plancher garanti à 4.90 CHF
            assert.strictEqual(ctx.calculateRengerServiceFee(0), 4.90);
            assert.strictEqual(ctx.calculateRengerServiceFee(10), 4.90); // 10 * 0.05 = 0.50 -> 4.90
            assert.strictEqual(ctx.calculateRengerServiceFee(50), 4.90); // 50 * 0.05 = 2.50 -> 4.90
            assert.strictEqual(ctx.calculateRengerServiceFee(98), 4.90); // 98 * 0.05 = 4.90 -> 4.90

            // Au-delà de 98 CHF : 5% avec arrondi aux 5 centimes suisses
            assert.strictEqual(ctx.calculateRengerServiceFee(100), 5.00); // 100 * 0.05 = 5.00
            assert.strictEqual(ctx.calculateRengerServiceFee(101), 5.05); // 101 * 0.05 = 5.05
            assert.strictEqual(ctx.calculateRengerServiceFee(102), 5.10); // 102 * 0.05 = 5.10
            assert.strictEqual(ctx.calculateRengerServiceFee(103), 5.15); // 103 * 0.05 = 5.15
            assert.strictEqual(ctx.calculateRengerServiceFee(123), 6.15); // 123 * 0.05 = 6.15
            assert.strictEqual(ctx.calculateRengerServiceFee(137), 6.85); // 137 * 0.05 = 6.85
            assert.strictEqual(ctx.calculateRengerServiceFee(250), 12.50); // 250 * 0.05 = 12.50
            assert.strictEqual(ctx.calculateRengerServiceFee(1000), 50.00); // 1000 * 0.05 = 50.00
        });

        it('R1-3: Barème dynamique de caution : 400 CHF (charges lourdes >1200kg ou cheval/voiture/refrigere) vs 200 CHF standard', () => {
            const { ctx } = createBookingSandbox();

            // Standards -> 200 CHF
            assert.strictEqual(ctx.getTrailerCaution({ category: 'utilitaire', payload: 500 }), 200);
            assert.strictEqual(ctx.getTrailerCaution({ category: 'porte-velo', payload: 150 }), 200);
            assert.strictEqual(ctx.getTrailerCaution({ category: 'bagagere', payload: 600 }), 200);
            assert.strictEqual(ctx.getTrailerCaution({ category: 'utilitaire', payload: 750 }), 200);

            // Charges lourdes (> 1200 kg) -> 400 CHF
            assert.strictEqual(ctx.getTrailerCaution({ category: 'utilitaire', payload: 1201 }), 400);
            assert.strictEqual(ctx.getTrailerCaution({ category: 'benne', payload: 1500 }), 400);
            assert.strictEqual(ctx.getTrailerCaution({ category: 'plateau', payload: 2500 }), 400);

            // Catégories spécifiques à haut risque -> 400 CHF (même avec charge <= 1200 kg)
            assert.strictEqual(ctx.getTrailerCaution({ category: 'cheval', payload: 900 }), 400);
            assert.strictEqual(ctx.getTrailerCaution({ category: 'voiture', payload: 1100 }), 400);
            assert.strictEqual(ctx.getTrailerCaution({ category: 'refrigere', payload: 800 }), 400);

            // Catégories moyennes -> 300 CHF
            assert.strictEqual(ctx.getTrailerCaution({ category: 'moto', payload: 400 }), 300);
            assert.strictEqual(ctx.getTrailerCaution({ category: 'utilitaire', payload: 800 }), 300);

            // Valeurs personnalisées déclarées
            assert.strictEqual(ctx.getTrailerCaution({ caution: 350, category: 'utilitaire' }), 350);
            assert.strictEqual(ctx.getTrailerCaution({ deposit: 350, category: 'utilitaire' }), 350);
            assert.strictEqual(ctx.getTrailerCaution({ deposit_amount: 500, category: 'utilitaire' }), 500);
            assert.strictEqual(ctx.getTrailerCaution(null), 200);
        });

        it('R1-4: Immunité totale aux transitions de fuseaux horaires et changements d\'heure (DST Printemps et Automne)', async () => {
            const { ctx, getEl, getFlatpickrConfig } = createBookingSandbox();
            await ctx.openTrailerDetail(ctx.currentTrailer);
            const fp = getFlatpickrConfig();

            // 1. Passage heure d'hiver (Automne) : 24 oct au 26 oct (49h locales) -> 3 jours calendaires exacts
            const startAutumn = new Date('2026-10-24T00:00:00+02:00');
            const endAutumn = new Date('2026-10-26T00:00:00+01:00');
            fp.onChange([startAutumn, endAutumn]);
            assert.strictEqual(parseInt(getEl('total-days').innerText, 10), 3, 'Automne DST doit compter exactement 3 jours');

            // 2. Passage heure d'été (Printemps) : 28 mars au 30 mars (47h locales) -> 3 jours calendaires exacts
            const startSpring = new Date('2026-03-28T00:00:00+01:00');
            const endSpring = new Date('2026-03-30T00:00:00+02:00');
            fp.onChange([startSpring, endSpring]);
            assert.strictEqual(parseInt(getEl('total-days').innerText, 10), 3, 'Printemps DST doit compter exactement 3 jours');

            // 3. Franchissement de fin de mois (30 oct au 2 nov) -> 4 jours calendaires exacts
            const startMonth = new Date('2026-10-30T10:00:00Z');
            const endMonth = new Date('2026-11-02T18:00:00Z');
            fp.onChange([startMonth, endMonth]);
            assert.strictEqual(parseInt(getEl('total-days').innerText, 10), 4, 'Changement de mois doit compter 4 jours');

            // 4. Franchissement de nouvelle année (30 déc au 2 janv) -> 4 jours calendaires exacts
            const startYear = new Date('2026-12-30T00:00:00Z');
            const endYear = new Date('2027-01-02T00:00:00Z');
            fp.onChange([startYear, endYear]);
            assert.strictEqual(parseInt(getEl('total-days').innerText, 10), 4, 'Changement d\'année doit compter 4 jours');
        });

        it('R1-5: Exactitude du calcul de jours et montant Stripe lors des transitions DST (49h Automne = exactement 3 jours)', async () => {
            const trailer = { id: 'tr-dst', title: 'Remorque DST', price: 50, payload: 500, category: 'utilitaire', owner_id: 'own-dst' };
            const user = { id: 'user-dst', email: 'dst@renger.ch' };
            const simulator = createStripeCheckoutSimulator({
                trailers: new Map([[trailer.id, trailer]]),
                users: new Map([['token-dst', user]])
            });

            // Du 24 au 26 octobre 2026 (49 heures locales en raison du passage à l'heure d'hiver)
            const res = await simulator.handleRequest({
                authHeader: 'Bearer token-dst',
                body: {
                    trailerId: trailer.id,
                    startDate: '2026-10-24',
                    endDate: '2026-10-26'
                }
            });

            assert.strictEqual(res.status, 200);
            const session = simulator.getLastStripeSession();
            // 3 jours calendaires * 50 CHF = 150 CHF (15000 centimes)
            assert.strictEqual(session.line_items[0].unit_amount, 15000, 'Doit facturer 3 jours et non 4 jours');
            // Frais : 150 * 0.05 = 7.50 CHF (750 centimes)
            assert.strictEqual(session.line_items[1].unit_amount, 750, 'Frais de service calculés sur 3 jours');
        });
    });

    // =========================================================================
    // R2. Intégrité des Éléments DOM et Modale de Confirmation
    // =========================================================================
    describe('R2. Intégrité des Éléments DOM et Modale de Confirmation', () => {

        it('R2-1: remorque.html contient l\'ensemble des identifiants DOM et les mentions d\'empreinte bancaire', () => {
            const html = fs.readFileSync(path.join(siteWebDir, 'remorque.html'), 'utf8');

            const mandatoryIds = [
                'booking-dates', 'booking-summary', 'total-days', 'total-days-plural',
                'total-rental-price', 'service-fee-price', 'caution-amount', 'caution-explain-amount',
                'total-price', 'action-btn', 'booking-header', 'booking-confirm-modal',
                'confirm-img', 'confirm-title', 'confirm-dates', 'confirm-days',
                'confirm-rental-calc', 'confirm-rental-price', 'confirm-service-fee',
                'confirm-caution-price', 'confirm-price', 'confirm-pay-amount'
            ];

            mandatoryIds.forEach(id => {
                assert.ok(html.includes(`id="${id}"`), `remorque.html doit contenir id="${id}"`);
            });

            // Mentions obligatoires d'empreinte bancaire non débitée
            assert.ok(html.includes('Empreinte bancaire (0 CHF débité)'), 'remorque.html doit mentionner "Empreinte bancaire (0 CHF débité)"');
            assert.ok(html.includes('La caution n\'est JAMAIS débitée de votre compte'), 'remorque.html doit contenir la clause pédagogique anti-débit de caution');
            assert.ok(html.includes('0 CHF prélevé'), 'remorque.html doit mentionner "0 CHF prélevé"');
        });

        it('R2-2: L\'élément #booking-summary devient visible dès que deux dates valides sont sélectionnées et se masque sinon', async () => {
            const { ctx, getEl, getFlatpickrConfig } = createBookingSandbox();
            await ctx.openTrailerDetail(ctx.currentTrailer);
            const fp = getFlatpickrConfig();

            const summaryEl = getEl('booking-summary');
            assert.ok(summaryEl.classList.contains('hidden'), 'Le devis doit être masqué initialement');

            // 1 date sélectionnée : doit rester masqué
            fp.onChange([new Date(2026, 6, 1)]);
            assert.ok(summaryEl.classList.contains('hidden'), 'Devis masqué quand 1 seule date est choisie');

            // 2 dates sélectionnées : doit devenir visible
            fp.onChange([new Date(2026, 6, 1), new Date(2026, 6, 3)]);
            assert.ok(!summaryEl.classList.contains('hidden'), 'Devis visible après sélection de 2 dates valides');

            // Réinitialisation / effacement des dates : doit se masquer
            fp.onChange([]);
            assert.ok(summaryEl.classList.contains('hidden'), 'Devis masqué après déselection des dates');
        });

        it('R2-3: La modale #booking-confirm-modal détaille séparément location, frais Renger et caution non débitée', async () => {
            const { ctx, getEl, getFlatpickrConfig } = createBookingSandbox({
                currentTrailer: { id: 't-test', title: 'Remorque Bâche XXL', price: 40, payload: 1300, category: 'utilitaire', owner_id: 'o-other' }
            });

            await ctx.openTrailerDetail(ctx.currentTrailer);
            const fp = getFlatpickrConfig();

            // Location de 3 jours : du 10 au 12 novembre 2026
            const d1 = new Date(2026, 10, 10);
            const d2 = new Date(2026, 10, 12);
            fp.onChange([d1, d2]);

            // Clic sur "Réserver" pour ouvrir la modale
            ctx.submitBooking();

            const modal = getEl('booking-confirm-modal');
            assert.ok(!modal.classList.contains('hidden'), '#booking-confirm-modal doit être affichée');

            // Vérifications des lignes séparées
            // 3 jours * 40 CHF = 120 CHF
            assert.strictEqual(getEl('confirm-days').innerText, '3 jours');
            assert.strictEqual(getEl('confirm-rental-calc').innerText, '3 jours × 40 CHF / jour');
            assert.strictEqual(getEl('confirm-rental-price').innerText, '120 CHF');

            // Frais Renger 5% de 120 CHF = 6.00 CHF
            assert.strictEqual(getEl('confirm-service-fee').innerText, '6.00 CHF');

            // Caution remorque lourde (>1200kg) = 400 CHF (séparée, non ajoutée au total débité)
            assert.strictEqual(getEl('confirm-caution-price').innerText, '400 CHF');

            // Total débité aujourd'hui = 120 + 6 = 126.00 CHF
            assert.strictEqual(getEl('confirm-price').innerText, '126.00 CHF');
            assert.strictEqual(getEl('confirm-pay-amount').innerText, '126.00');
            assert.strictEqual(getEl('confirm-btn-caution').innerText, '400');

            // Fermeture de la modale
            ctx.closeBookingConfirmModal();
            assert.ok(modal.classList.contains('hidden'), 'Modale masquée après closeBookingConfirmModal()');
        });

        it('R2-4: Pour un propriétaire consultant sa propre remorque, le montant total affiché est neutralisé (0 CHF) et la location bloquée', async () => {
            const ownerId = 'user-owner-swiss-99';
            const { ctx, getEl, getFlatpickrConfig, toastLog } = createBookingSandbox({
                currentUser: { id: ownerId, email: 'owner@renger.ch' },
                currentTrailer: { id: 't-own', title: 'Ma Remorque Personnelle', price: 50, payload: 750, category: 'utilitaire', owner_id: ownerId }
            });

            await ctx.openTrailerDetail(ctx.currentTrailer);

            // Bouton configuré pour bloquer les dates, pas louer
            const actionBtn = getEl('action-btn');
            assert.strictEqual(actionBtn.innerText, 'Bloquer ces dates', 'Le libellé pour le propriétaire doit être "Bloquer ces dates"');

            // Sélection de dates
            const fp = getFlatpickrConfig();
            fp.onChange([new Date(2026, 7, 1), new Date(2026, 7, 3)]);

            // Neutralisation du montant total
            assert.strictEqual(getEl('total-price').innerText, '0 CHF', 'Le montant total affiché au propriétaire doit être 0 CHF');

            // Tentative d'appel direct à submitBooking()
            ctx.submitBooking();
            const modal = getEl('booking-confirm-modal');
            assert.ok(modal.classList.contains('hidden'), 'La modale de réservation ne doit JAMAIS s\'ouvrir pour le propriétaire');
            assert.ok(toastLog.some(t => t.msg.includes('Vous ne pouvez pas louer votre propre remorque')), 'Toast d\'interdiction déclenché');
        });

        it('R2-5: Le verrou isProcessingBooking bloque immédiatement les clics concurrents et prévient les doubles réservations', async () => {
            let edgeCallCount = 0;
            let edgeFunctionResolver;
            const edgePromise = new Promise(resolve => { edgeFunctionResolver = resolve; });

            const { ctx, getFlatpickrConfig } = createBookingSandbox({
                edgeFunctionMock: async () => {
                    edgeCallCount++;
                    return edgePromise;
                }
            });

            await ctx.openTrailerDetail(ctx.currentTrailer);
            const fp = getFlatpickrConfig();
            fp.onChange([new Date(2026, 10, 10), new Date(2026, 10, 12)]);

            // Clic 1 sur processBooking()
            const p1 = ctx.processBooking();
            assert.strictEqual(ctx.isProcessingBooking || ctx.window.isProcessingBooking, true, 'isProcessingBooking doit être true pendant l\'exécution');

            // Clic 2 immédiat concurrent
            const p2 = ctx.processBooking();
            // Clic 3 immédiat concurrent
            const p3 = ctx.processBooking();

            // Un seul appel Edge Function doit avoir été émis
            assert.strictEqual(edgeCallCount, 1, 'Un seul appel Edge Function doit être émis malgré les clics concurrents');

            // Résolution de l'appel
            edgeFunctionResolver({ url: 'https://checkout.stripe.com/pay/cs_1', bookingId: 'bk-1' });
            await Promise.all([p1, p2, p3]);

            // Le verrou doit être relâché
            assert.strictEqual(ctx.isProcessingBooking || ctx.window.isProcessingBooking, false, 'isProcessingBooking doit être false après terminaison');
        });

        it('R2-6: Rejet immédiat dans processBooking() si utilisateur non authentifié', async () => {
            const { ctx, getFlatpickrConfig, edgeFunctionCalls, toastLog } = createBookingSandbox({
                currentUser: null
            });

            await ctx.openTrailerDetail(ctx.currentTrailer);
            const fp = getFlatpickrConfig();
            fp.onChange([new Date(2026, 8, 10), new Date(2026, 8, 12)]);

            await ctx.processBooking();

            // Doit rejeter sans appeler stripe-checkout
            assert.strictEqual(edgeFunctionCalls.length, 0, 'Ne doit pas appeler l\'Edge Function si non authentifié');
            assert.ok(toastLog.some(t => t.msg.includes('connecté')), 'Toast de connexion requis');
            assert.ok(toastLog.some(t => t.msg === 'OPEN_AUTH_MODAL'), 'Modale auth ouverte');
            assert.strictEqual(ctx.isProcessingBooking || ctx.window.isProcessingBooking, false, 'Verrou relâché');
        });

        it('R2-7: Résilience face aux erreurs réseau ou serveur dans processBooking() et possibilité de retenter', async () => {
            let attempt = 0;
            let stripeLoadingHidden = 0;
            const { ctx, getFlatpickrConfig, toastLog } = createBookingSandbox({
                edgeFunctionMock: async () => {
                    attempt++;
                    if (attempt === 1) {
                        throw new Error('NetworkError: Connexion réseau interrompue');
                    }
                    return {
                        url: 'https://checkout.stripe.com/c/pay/cs_retry_success',
                        bookingId: 'bk-retry-ok'
                    };
                }
            });

            ctx.window.hideStripeLoading = () => { stripeLoadingHidden++; };

            await ctx.openTrailerDetail(ctx.currentTrailer);
            const fp = getFlatpickrConfig();
            fp.onChange([new Date(2026, 10, 10), new Date(2026, 10, 12)]);

            // Tentative 1 : Erreur réseau
            await ctx.processBooking();

            assert.strictEqual(attempt, 1, 'Premier appel réseau émis');
            assert.strictEqual(stripeLoadingHidden, 1, 'hideStripeLoading() appelé après erreur');
            assert.strictEqual(ctx.isProcessingBooking || ctx.window.isProcessingBooking, false, 'isProcessingBooking relâché via finally');
            assert.ok(toastLog.some(t => t.msg.includes('Connexion réseau interrompue')), 'Toast d\'erreur affiché à l\'utilisateur');

            // Tentative 2 : L'utilisateur réessaie et l'appel réussit
            await ctx.processBooking();

            assert.strictEqual(attempt, 2, 'Deuxième appel réseau après retry');
            assert.strictEqual(ctx.localStorage.getItem('pending_booking_id'), 'bk-retry-ok', 'Pending booking mémorisé après succès');
            assert.strictEqual(ctx.window.location.href, 'https://checkout.stripe.com/c/pay/cs_retry_success', 'Redirection effective');
            assert.strictEqual(ctx.isProcessingBooking || ctx.window.isProcessingBooking, false, 'Verrou relâché après redirection');
        });

        it('R2-8: Rejet précoce des dates inversées et données remorque manquantes dans submitBooking() et processBooking()', async () => {
            const { ctx, toastLog, edgeFunctionCalls } = createBookingSandbox({
                currentTrailer: { id: 't-test', title: 'Remorque', price: 30, payload: 500, owner_id: 'other' }
            });

            ctx.selectedStartDate = new Date(2026, 10, 15);
            ctx.selectedEndDate = new Date(2026, 10, 10); // Date inversée

            ctx.submitBooking();
            assert.ok(toastLog.some(t => t.msg.includes('postérieure')), 'submitBooking doit rejeter les dates inversées');

            await ctx.processBooking();
            assert.ok(toastLog.some(t => t.msg.includes('postérieure')), 'processBooking doit rejeter les dates inversées');
            assert.strictEqual(edgeFunctionCalls.length, 0, 'Aucun appel Edge Function en cas de dates inversées');
        });

        it('R2-9: Rejet précoce des dates dans le passé dans submitBooking() et processBooking()', async () => {
            const { ctx, toastLog, edgeFunctionCalls } = createBookingSandbox();

            // Date de début dans le passé (ex: 2020)
            ctx.selectedStartDate = new Date(2020, 0, 15);
            ctx.selectedEndDate = new Date(2020, 0, 18);

            ctx.submitBooking();
            assert.ok(toastLog.some(t => t.msg.includes('passé')), 'submitBooking doit rejeter les dates passées');

            await ctx.processBooking();
            assert.ok(toastLog.some(t => t.msg.includes('passé')), 'processBooking doit rejeter les dates passées');
            assert.strictEqual(edgeFunctionCalls.length, 0, 'Aucun appel Edge Function si dates dans le passé');
        });

        it('R2-10: Robustesse face à une remorque nulle dans submitBooking() et openTrailerDetail() sans TypeError', async () => {
            const { ctx, toastLog } = createBookingSandbox({
                currentTrailer: null
            });

            // openTrailerDetail avec null ne doit pas lever d'exception
            await assert.doesNotReject(async () => {
                await ctx.openTrailerDetail(null);
            }, 'openTrailerDetail(null) ne doit pas lever d\'exception');

            // submitBooking avec currentTrailer null ne doit pas crasher sur reading price
            ctx.selectedStartDate = new Date(2026, 11, 1);
            ctx.selectedEndDate = new Date(2026, 11, 3);

            assert.doesNotThrow(() => {
                ctx.submitBooking();
            }, 'submitBooking ne doit pas crasher si currentTrailer est null');
            assert.ok(toastLog.some(t => t.msg.includes('Remorque introuvable')), 'Toast remorque introuvable déclenché');
        });

        it('R2-11: Résilience face aux erreurs de quota localStorage (ex: mode navigation privée) dans processBooking()', async () => {
            const { ctx, getFlatpickrConfig } = createBookingSandbox({
                edgeFunctionMock: async () => ({
                    url: 'https://checkout.stripe.com/c/pay/cs_private_mode',
                    bookingId: 'bk-private-1'
                })
            });

            // Simule un échec QuotaExceededError sur localStorage.setItem
            ctx.localStorage.setItem = () => {
                const err = new Error('QuotaExceededError: The quota has been exceeded.');
                err.name = 'QuotaExceededError';
                throw err;
            };

            await ctx.openTrailerDetail(ctx.currentTrailer);
            const fp = getFlatpickrConfig();
            fp.onChange([new Date(2026, 10, 10), new Date(2026, 10, 12)]);

            await assert.doesNotReject(async () => {
                await ctx.processBooking();
            });

            assert.strictEqual(ctx.window.location.href, 'https://checkout.stripe.com/c/pay/cs_private_mode', 'Redirection effective même si localStorage est bloqué');
            assert.strictEqual(ctx.isProcessingBooking || ctx.window.isProcessingBooking, false, 'Verrou relâché');
        });

        it('R2-12: Détection dynamique du propriétaire après connexion différée et neutralisation du prix à 0 CHF', async () => {
            const ownerId = 'owner-delayed-99';
            const trailer = { id: 'tr-delayed', title: 'Remorque Test', price: 40, payload: 750, category: 'utilitaire', owner_id: ownerId };
            // Utilisateur initialement non connecté
            const { ctx, getEl, getFlatpickrConfig } = createBookingSandbox({
                currentUser: null,
                currentTrailer: trailer
            });

            await ctx.openTrailerDetail(trailer);

            // L'utilisateur se connecte après coup en tant que propriétaire
            ctx.currentUser = { id: ownerId, email: 'delayed_owner@renger.ch' };

            // Sélection de dates sur le calendrier
            const fp = getFlatpickrConfig();
            fp.onChange([new Date(2026, 8, 1), new Date(2026, 8, 3)]);

            // Le total doit être immédiatement neutralisé à 0 CHF
            assert.strictEqual(getEl('total-price').innerText, '0 CHF', 'Le montant total doit être neutralisé à 0 CHF pour le propriétaire même après connexion différée');
        });

        it('R2-13: blockOwnerDates() valide rigoureusement les dates (rejet des dates inversées et passées)', async () => {
            const ownerId = 'owner-block-check';
            const trailer = { id: 'tr-block', title: 'Remorque', price: 30, payload: 500, owner_id: ownerId };
            let insertCalled = false;
            const mockSupabase = {
                from: () => ({
                    insert: () => {
                        insertCalled = true;
                        return Promise.resolve({ error: null });
                    }
                })
            };

            const { ctx, toastLog } = createBookingSandbox({
                currentUser: { id: ownerId, email: 'owner@renger.ch' },
                currentTrailer: trailer,
                supabaseClient: mockSupabase
            });

            // 1. Dates inversées
            ctx.selectedStartDate = new Date(2026, 10, 15);
            ctx.selectedEndDate = new Date(2026, 10, 10);
            await ctx.blockOwnerDates();
            assert.strictEqual(insertCalled, false, 'Ne doit pas insérer si dates inversées');
            assert.ok(toastLog.some(t => t.msg.includes('postérieure')), 'Toast date postérieure attendu');

            // 2. Dates dans le passé
            ctx.selectedStartDate = new Date(2020, 0, 1);
            ctx.selectedEndDate = new Date(2020, 0, 3);
            await ctx.blockOwnerDates();
            assert.strictEqual(insertCalled, false, 'Ne doit pas insérer si dates dans le passé');
            assert.ok(toastLog.some(t => t.msg.includes('passé')), 'Toast date passée attendu');
        });

        it('R2-14: submitBooking() et closeBookingConfirmModal() sont résilients en l\'absence d\'éléments DOM ou de modale auth', () => {
            const { ctx, domMap, toastLog } = createBookingSandbox({
                currentUser: null // Déclenche openAuthModal()
            });

            // Suppression intentionnelle d'openAuthModal du contexte
            delete ctx.openAuthModal;

            // submitBooking ne doit pas lever de ReferenceError si openAuthModal est manquant
            assert.doesNotThrow(() => {
                ctx.submitBooking();
            }, 'submitBooking ne doit pas lever d\'exception si openAuthModal n\'est pas défini');
            assert.ok(toastLog.some(t => t.msg.includes('connecté')));

            // Suppression intentionnelle de booking-confirm-modal du DOM
            domMap.delete('booking-confirm-modal');
            assert.doesNotThrow(() => {
                ctx.closeBookingConfirmModal();
            }, 'closeBookingConfirmModal ne doit pas lever de TypeError si le modal est absent du DOM');
        });

        it('R2-15: processBooking() gère défensivement une réponse vide ou invalide de l\'Edge function sans fuite de verrou', async () => {
            const { ctx, getFlatpickrConfig, toastLog } = createBookingSandbox({
                edgeFunctionMock: async () => null // Réponse vide invalide
            });

            await ctx.openTrailerDetail(ctx.currentTrailer);
            const fp = getFlatpickrConfig();
            fp.onChange([new Date(2026, 10, 10), new Date(2026, 10, 12)]);

            await assert.doesNotReject(async () => {
                await ctx.processBooking();
            });

            assert.strictEqual(ctx.isProcessingBooking || ctx.window.isProcessingBooking, false, 'Le verrou doit être relâché après réponse vide');
            assert.ok(toastLog.some(t => t.msg.includes('Erreur de réservation')), 'Toast d\'erreur affiché');
        });
    });

    // =========================================================================
    // R3. Contrat d'Appel et Simulation de l'Edge Function stripe-checkout
    // =========================================================================
    describe('R3. Contrat d\'Appel et Simulation de l\'Edge Function stripe-checkout', () => {

        it('R3-1: Conformité stricte des paramètres transmis lors de l\'appel à stripe-checkout', async () => {
            const { ctx, getFlatpickrConfig, edgeFunctionCalls } = createBookingSandbox();

            await ctx.openTrailerDetail(ctx.currentTrailer);
            const fp = getFlatpickrConfig();
            const start = new Date(2026, 10, 15);
            const end = new Date(2026, 10, 18);
            fp.onChange([start, end]);

            await ctx.processBooking();

            assert.strictEqual(edgeFunctionCalls.length, 1);
            const call = edgeFunctionCalls[0];
            assert.strictEqual(call.fnName, 'stripe-checkout');
            assert.deepStrictEqual(Object.keys(call.payload).sort(), ['cautionAmount', 'endDate', 'startDate', 'trailerId'].sort());
            assert.strictEqual(call.payload.trailerId, ctx.currentTrailer.id);
            assert.strictEqual(call.payload.startDate, '2026-11-15');
            assert.strictEqual(call.payload.endDate, '2026-11-18');
            assert.strictEqual(typeof call.payload.cautionAmount, 'number');
        });

        it('R3-2: Cas nominal (200 OK) : Génération de la session Stripe et création de la réservation en_attente', async () => {
            const trailer = { id: 'tr-nom', title: 'Remorque Alu 1000kg', price: 40, payload: 1000, category: 'utilitaire', owner_id: 'own-1' };
            const user = { id: 'renter-1', email: 'locataire@renger.ch' };
            const simulator = createStripeCheckoutSimulator({
                trailers: new Map([[trailer.id, trailer]]),
                users: new Map([['token-ok', user]])
            });

            const res = await simulator.handleRequest({
                authHeader: 'Bearer token-ok',
                body: {
                    trailerId: trailer.id,
                    startDate: '2026-11-01',
                    endDate: '2026-11-03',
                    cautionAmount: 200
                }
            });

            assert.strictEqual(res.status, 200, 'Statut HTTP attendu : 200');
            assert.ok(res.body.url && res.body.url.includes('checkout.stripe.com'), 'URL de paiement Stripe fournie');
            assert.ok(res.body.bookingId, 'Booking ID créé');

            // Vérification de la session Stripe générée
            const session = simulator.getLastStripeSession();
            assert.ok(session, 'Session Stripe doit avoir été créée');
            assert.strictEqual(session.line_items.length, 2, 'Doit contenir exactement 2 lignes (location + frais Renger)');
            // 3 jours * 40 = 120 CHF -> 12000 centimes
            assert.strictEqual(session.line_items[0].unit_amount, 12000);
            // 5% de 120 = 6 CHF -> 600 centimes
            assert.strictEqual(session.line_items[1].unit_amount, 600);
            // Caution en empreinte bancaire non débitée
            assert.strictEqual(session.payment_intent_data.setup_future_usage, 'off_session');
            assert.ok(session.custom_text?.submit?.message?.includes("n'est pas débitée"), 'Mention réassurance caution dans Stripe');
        });

        it('R3-3: Cas d\'erreur métier 400 (Bad Request) : Dates dans le passé, dates inversées, paramètres manquants, propriétaire', async () => {
            const trailer = { id: 'tr-400', title: 'Remorque Test', price: 30, payload: 500, category: 'utilitaire', owner_id: 'own-400' };
            const user = { id: 'renter-400', email: 'r@renger.ch' };
            const simulator = createStripeCheckoutSimulator({
                trailers: new Map([[trailer.id, trailer]]),
                users: new Map([['token-400', user], ['token-owner', { id: 'own-400', email: 'o@renger.ch' }]])
            });

            // 1. Paramètres manquants
            const missing = await simulator.handleRequest({
                authHeader: 'Bearer token-400',
                body: { trailerId: trailer.id, startDate: '2026-11-01' }
            });
            assert.strictEqual(missing.status, 400);
            assert.ok(missing.body.error.includes('manquants'));

            // 2. Dates dans le passé
            const past = await simulator.handleRequest({
                authHeader: 'Bearer token-400',
                body: { trailerId: trailer.id, startDate: '2020-01-01', endDate: '2020-01-02' }
            });
            assert.strictEqual(past.status, 400);
            assert.ok(past.body.error.includes('passé'));

            // 3. Dates inversées (start > end)
            const inverted = await simulator.handleRequest({
                authHeader: 'Bearer token-400',
                body: { trailerId: trailer.id, startDate: '2026-11-05', endDate: '2026-11-02' }
            });
            assert.strictEqual(inverted.status, 400);
            assert.ok(inverted.body.error.includes('postérieure'));

            // 4. Propriétaire louant sa propre remorque
            const ownerSelf = await simulator.handleRequest({
                authHeader: 'Bearer token-owner',
                body: { trailerId: trailer.id, startDate: '2026-11-10', endDate: '2026-11-12' }
            });
            assert.strictEqual(ownerSelf.status, 400);
            assert.ok(ownerSelf.body.error.includes('propre remorque'));
        });

        it('R3-4: Cas d\'erreur métier 404 (Not Found) : Remorque introuvable', async () => {
            const simulator = createStripeCheckoutSimulator({
                users: new Map([['token-404', { id: 'u1', email: 'u@renger.ch' }]])
            });

            const res = await simulator.handleRequest({
                authHeader: 'Bearer token-404',
                body: {
                    trailerId: 'trailer-inexistant-999',
                    startDate: '2026-11-10',
                    endDate: '2026-11-12'
                }
            });

            assert.strictEqual(res.status, 404);
            assert.ok(res.body.error.includes('Remorque introuvable'));
        });

        it('R3-5: Cas d\'erreur métier 409 (Conflict) : Collision de calendrier / surbooking', async () => {
            const trailer = { id: 'tr-conflict', title: 'Remorque Partagée', price: 30, payload: 500, category: 'utilitaire', owner_id: 'own-1' };
            const simulator = createStripeCheckoutSimulator({
                trailers: new Map([[trailer.id, trailer]]),
                users: new Map([['token-renter', { id: 'renter-2', email: 'r2@renger.ch' }]]),
                bookings: [
                    // Réservation confirmée déjà existante du 10 au 15 novembre 2026
                    {
                        id: 'bk-existing',
                        trailer_id: trailer.id,
                        renter_id: 'other-user',
                        start_date: '2026-11-10',
                        end_date: '2026-11-15',
                        status: 'paye',
                        created_at: new Date().toISOString()
                    }
                ]
            });

            // Tentative de réservation chevauchante du 12 au 17 novembre
            const overlap = await simulator.handleRequest({
                authHeader: 'Bearer token-renter',
                body: {
                    trailerId: trailer.id,
                    startDate: '2026-11-12',
                    endDate: '2026-11-17'
                }
            });

            assert.strictEqual(overlap.status, 409, 'Statut 409 Conflict attendu en cas de surbooking');
            assert.ok(overlap.body.error.includes('plus disponibles'), 'Message d\'indisponibilité attendu');

            // En revanche, une réservation sur des dates libres doit réussir (ex: 20 au 22 novembre)
            const available = await simulator.handleRequest({
                authHeader: 'Bearer token-renter',
                body: {
                    trailerId: trailer.id,
                    startDate: '2026-11-20',
                    endDate: '2026-11-22'
                }
            });
            assert.strictEqual(available.status, 200, 'Dates libres doivent retourner 200 OK');
        });

        it('R3-6: Cas d\'erreur métier 429 (Too Many Requests) : Rate limiting anti-abus financier (max 5 / 10 min)', async () => {
            const trailer = { id: 'tr-flood', title: 'Remorque Flot', price: 30, payload: 500, category: 'utilitaire', owner_id: 'own-f' };
            const renter = { id: 'renter-spammer', email: 'spammer@renger.ch' };
            const existingBookings = [];

            // 5 réservations créées il y a 2 minutes
            const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
            for (let i = 1; i <= 5; i++) {
                existingBookings.push({
                    id: 'bk-flood-' + i,
                    trailer_id: 'tr-other-' + i,
                    renter_id: renter.id,
                    created_at: twoMinutesAgo,
                    start_date: '2026-12-01',
                    end_date: '2026-12-02',
                    status: 'en_attente'
                });
            }

            const simulator = createStripeCheckoutSimulator({
                trailers: new Map([[trailer.id, trailer]]),
                users: new Map([['token-spammer', renter]]),
                bookings: existingBookings
            });

            // 6ème tentative immédiate
            const res = await simulator.handleRequest({
                authHeader: 'Bearer token-spammer',
                body: {
                    trailerId: trailer.id,
                    startDate: '2026-12-10',
                    endDate: '2026-12-12'
                }
            });

            assert.strictEqual(res.status, 429, 'Statut 429 Too Many Requests attendu');
            assert.ok(res.body.error.includes('Trop de tentatives') || res.body.error.includes('patienter'), 'Message de rate-limiting attendu');
        });

        it('R3-7: Code source stripe-checkout/index.ts valide les garde-fous Zero-Trust et la non-débitation de la caution', () => {
            const edgeFunctionPath = path.join(functionsDir, 'stripe-checkout', 'index.ts');
            assert.ok(fs.existsSync(edgeFunctionPath), 'Le fichier stripe-checkout/index.ts doit exister');
            const code = fs.readFileSync(edgeFunctionPath, 'utf8');

            // Vérifications des contrôles de sécurité
            assert.ok(code.includes('trailer.owner_id === user.id'), 'Contrôle interdisant au propriétaire de louer son bien');
            assert.ok(code.includes('startDate < todayStr'), 'Contrôle des dates dans le passé');
            assert.ok(code.includes('startDate > endDate'), 'Contrôle des dates inversées');
            assert.ok(code.includes('status: 409'), 'Contrôle de surbooking avec statut 409');
            assert.ok(code.includes('status: 429'), 'Rate-limiting avec statut 429');
            assert.ok(code.includes('status: 404'), 'Statut 404 en cas de remorque introuvable');
            assert.ok(code.includes('setup_future_usage: \'off_session\''), 'Empreinte bancaire via setup_future_usage off_session');
            assert.ok(!code.includes('unit_amount: 0'), 'Aucun line_item à 0 CHF pour la caution (interdit Stripe)');
            assert.ok(code.includes('Number(trailer.price) <= 0'), 'Contrôle validant le prix journalier de la remorque');
            assert.ok(code.includes("'paye', 'paid', 'confirmed', 'active'"), 'Contrôle de collision couvrant tous les statuts actifs');
        });

        it('R3-8: Prise en compte prioritaire de la caution personnalisée deposit_amount dans stripe-checkout', async () => {
            const trailerWithDeposit = {
                id: 'tr-custom-dep',
                title: 'Remorque Benne Basculante Pro',
                price: 50,
                payload: 750, // Standard
                category: 'utilitaire',
                deposit_amount: 800, // Définie par le propriétaire à 800 CHF
                owner_id: 'own-dep'
            };
            const user = { id: 'renter-dep', email: 'dep@renger.ch' };
            const simulator = createStripeCheckoutSimulator({
                trailers: new Map([[trailerWithDeposit.id, trailerWithDeposit]]),
                users: new Map([['token-dep', user]])
            });

            const res = await simulator.handleRequest({
                authHeader: 'Bearer token-dep',
                body: {
                    trailerId: trailerWithDeposit.id,
                    startDate: '2026-11-01',
                    endDate: '2026-11-02'
                }
            });

            assert.strictEqual(res.status, 200);
            const session = simulator.getLastStripeSession();
            assert.strictEqual(session.payment_intent_data.metadata.caution_amount, '800', 'Caution doit être 800 CHF');
            assert.ok(session.custom_text.submit.message.includes('800 CHF'), 'Message Stripe doit afficher 800 CHF');

            // Vérification aussi dans le code source de stripe-checkout/index.ts
            const edgeFunctionPath = path.join(functionsDir, 'stripe-checkout', 'index.ts');
            const code = fs.readFileSync(edgeFunctionPath, 'utf8');
            assert.ok(code.includes('trailer.deposit_amount'), 'stripe-checkout/index.ts doit interroger trailer.deposit_amount');
        });

        it('R3-9: Prise en compte du barème moyen (300 CHF pour moto et charge > 750kg) et custom deposit dans stripe-checkout', async () => {
            const motoTrailer = { id: 'tr-moto', title: 'Porte-Moto 3 Rails', price: 40, payload: 450, category: 'moto', owner_id: 'own-m' };
            const mediumTrailer = { id: 'tr-med', title: 'Remorque 800kg', price: 35, payload: 800, category: 'utilitaire', owner_id: 'own-m' };
            const depositTrailer = { id: 'tr-dep', title: 'Remorque Déposée', price: 30, payload: 500, category: 'utilitaire', deposit: 350, owner_id: 'own-m' };
            const user = { id: 'renter-m', email: 'm@renger.ch' };

            const simulator = createStripeCheckoutSimulator({
                trailers: new Map([
                    [motoTrailer.id, motoTrailer],
                    [mediumTrailer.id, mediumTrailer],
                    [depositTrailer.id, depositTrailer]
                ]),
                users: new Map([['token-m', user]])
            });

            // 1. Moto -> 300 CHF
            const res1 = await simulator.handleRequest({
                authHeader: 'Bearer token-m',
                body: { trailerId: motoTrailer.id, startDate: '2026-11-01', endDate: '2026-11-02' }
            });
            assert.strictEqual(res1.status, 200);
            assert.strictEqual(simulator.getLastStripeSession().payment_intent_data.metadata.caution_amount, '300');

            // 2. Payload 800kg -> 300 CHF
            const res2 = await simulator.handleRequest({
                authHeader: 'Bearer token-m',
                body: { trailerId: mediumTrailer.id, startDate: '2026-11-01', endDate: '2026-11-02' }
            });
            assert.strictEqual(res2.status, 200);
            assert.strictEqual(simulator.getLastStripeSession().payment_intent_data.metadata.caution_amount, '300');

            // 3. Custom deposit -> 350 CHF
            const res3 = await simulator.handleRequest({
                authHeader: 'Bearer token-m',
                body: { trailerId: depositTrailer.id, startDate: '2026-11-01', endDate: '2026-11-02' }
            });
            assert.strictEqual(res3.status, 200);
            assert.strictEqual(simulator.getLastStripeSession().payment_intent_data.metadata.caution_amount, '350');
        });

        it('R3-10: Détection des collisions de calendrier avec les statuts alternatifs validés (confirmed, paid, active)', async () => {
            const trailer = { id: 'tr-active-conflict', title: 'Remorque Multi-Status', price: 40, payload: 600, category: 'utilitaire', owner_id: 'own-active' };
            const testStatuses = ['confirmed', 'paid', 'active'];

            for (const status of testStatuses) {
                const simulator = createStripeCheckoutSimulator({
                    trailers: new Map([[trailer.id, trailer]]),
                    users: new Map([['token-active', { id: 'renter-active', email: 'active@renger.ch' }]]),
                    bookings: [
                        {
                            id: `bk-${status}-1`,
                            trailer_id: trailer.id,
                            renter_id: 'existing-renter',
                            start_date: '2026-11-10',
                            end_date: '2026-11-15',
                            status: status,
                            created_at: new Date().toISOString()
                        }
                    ]
                });

                // Tentative de réservation chevauchante
                const res = await simulator.handleRequest({
                    authHeader: 'Bearer token-active',
                    body: {
                        trailerId: trailer.id,
                        startDate: '2026-11-12',
                        endDate: '2026-11-14'
                    }
                });

                assert.strictEqual(res.status, 409, `Doit détecter la collision pour le statut "${status}"`);
                assert.ok(res.body.error.includes('plus disponibles'), `Message d'indisponibilité pour "${status}"`);
            }
        });

        it('R3-11: Rejet avec statut 400 en cas de prix journalier de remorque invalide ou nul (<= 0 CHF)', async () => {
            const invalidTrailers = [
                { id: 'tr-zero', title: 'Remorque Gratuite Illégale', price: 0, payload: 500, owner_id: 'o-zero' },
                { id: 'tr-neg', title: 'Remorque Négative', price: -10, payload: 500, owner_id: 'o-neg' },
                { id: 'tr-nan', title: 'Remorque NaN', price: 'gratuit', payload: 500, owner_id: 'o-nan' }
            ];

            for (const t of invalidTrailers) {
                const simulator = createStripeCheckoutSimulator({
                    trailers: new Map([[t.id, t]]),
                    users: new Map([['token-price-test', { id: 'user-price', email: 'p@renger.ch' }]])
                });

                const res = await simulator.handleRequest({
                    authHeader: 'Bearer token-price-test',
                    body: {
                        trailerId: t.id,
                        startDate: '2026-11-20',
                        endDate: '2026-11-22'
                    }
                });

                assert.strictEqual(res.status, 400, `Prix invalide ${t.price} doit être rejeté avec 400`);
                assert.ok(res.body.error.includes('invalide'), 'Message d\'erreur de prix attendu');
            }
        });
    });

    // =========================================================================
    // R4. Cycle Post-Paiement & Gestion de Retour Webhook (checkPaymentStatus)
    // =========================================================================
    describe('R4. Cycle Post-Paiement & Gestion de Retour Webhook (checkPaymentStatus)', () => {

        it('R4-1: Retour Stripe avec paiement réussi : polling réactif, statut paye, nettoyage localStorage / URL et redirection', async () => {
            let queryCount = 0;
            const mockSupabase = {
                from: (table) => ({
                    select: () => ({
                        eq: (col, val) => ({
                            single: async () => {
                                queryCount++;
                                // Tentative 1: en_attente, Tentative 2: paye (simule réception du webhook Stripe)
                                return {
                                    data: {
                                        id: val,
                                        status: queryCount >= 2 ? 'paye' : 'en_attente'
                                    },
                                    error: null
                                };
                            }
                        })
                    })
                })
            };

            const { ctx, toastLog, historyLog, localStorageStore } = createBookingSandbox({
                supabaseClient: mockSupabase
            });

            ctx.window.location.search = '?payment=success&booking_id=bk-paid-42';
            localStorageStore.set('pending_booking_id', 'bk-paid-42');

            await ctx.checkPaymentStatus();

            // 1. Nettoyage immédiat du localStorage et URL
            assert.strictEqual(ctx.localStorage.getItem('pending_booking_id'), null, 'pending_booking_id doit être purgé du localStorage');
            assert.ok(historyLog.length > 0, 'history.replaceState doit être appelé');
            assert.strictEqual(historyLog[0].url, '/remorque.html', 'URL nettoyée des paramètres sensibles Stripe');

            // 2. Détection du paiement et redirection
            assert.ok(toastLog.some(t => t.msg.includes('Paiement reçu')), 'Toast initial de réception affiché');
            assert.ok(toastLog.some(t => t.msg.includes('Réservation confirmée')), 'Toast de confirmation après transition à "paye"');
            assert.ok(queryCount >= 2, 'Polling exécuté au moins 2 fois');
        });

        it('R4-2: Retour Stripe avec webhook lent : délai dépassé, avertissement pédagogique et redirection profil', async () => {
            const mockSupabase = {
                from: (table) => ({
                    select: () => ({
                        eq: (col, val) => ({
                            single: async () => {
                                // Toujours en attente (webhook Stripe en retard)
                                return {
                                    data: { id: val, status: 'en_attente' },
                                    error: null
                                };
                            }
                        })
                    })
                })
            };

            const { ctx, toastLog, historyLog, localStorageStore } = createBookingSandbox({
                supabaseClient: mockSupabase
            });

            ctx.window.location.search = '?payment=success&booking_id=bk-slow-99';
            localStorageStore.set('pending_booking_id', 'bk-slow-99');

            await ctx.checkPaymentStatus();

            assert.strictEqual(ctx.localStorage.getItem('pending_booking_id'), null);
            assert.ok(historyLog.length > 0);
            assert.ok(toastLog.some(t => t.msg.includes('traitement bancaire')), 'Message rassurant de traitement bancaire affiché');
        });

        it('R4-3: Annulation du paiement Stripe (payment=cancel) : nettoyage du pending_booking_id et message informatif', async () => {
            const { ctx, toastLog, historyLog, localStorageStore } = createBookingSandbox();

            ctx.window.location.search = '?payment=cancel&booking_id=bk-cancel-1';
            localStorageStore.set('pending_booking_id', 'bk-cancel-1');

            await ctx.checkPaymentStatus();

            assert.strictEqual(ctx.localStorage.getItem('pending_booking_id'), null, 'pending_booking_id supprimé après annulation');
            assert.ok(historyLog.length > 0, 'Paramètres payment=cancel retirés de l\'URL');
            assert.ok(toastLog.some(t => t.msg.includes('annulé') && t.type === 'error'), 'Toast d\'annulation affiché');
        });

        it('R4-4: Récupération du booking_id en repli depuis localStorage si absent des paramètres d\'URL', async () => {
            let queriedId = null;
            const mockSupabase = {
                from: (table) => ({
                    select: () => ({
                        eq: (col, val) => ({
                            single: async () => {
                                queriedId = val;
                                return { data: { id: val, status: 'paye' }, error: null };
                            }
                        })
                    })
                })
            };

            const { ctx, toastLog, localStorageStore } = createBookingSandbox({
                supabaseClient: mockSupabase
            });

            // L'URL contient seulement ?payment=success sans booking_id
            ctx.window.location.search = '?payment=success';
            localStorageStore.set('pending_booking_id', 'bk-local-storage-fallback');

            await ctx.checkPaymentStatus();

            assert.strictEqual(queriedId, 'bk-local-storage-fallback', 'Doit interroger l\'ID stocké dans le localStorage');
            assert.strictEqual(ctx.localStorage.getItem('pending_booking_id'), null, 'localStorage purgé');
            assert.ok(toastLog.some(t => t.msg.includes('Réservation confirmée')));
        });

        it('R4-5: Préservation des paramètres tiers d\'URL (comme ?id=trailer-swiss) lors du nettoyage des paramètres Stripe', async () => {
            const { ctx, historyLog, localStorageStore } = createBookingSandbox();

            // L'URL initiale contient l'identifiant de la remorque et le retour Stripe
            ctx.window.location.href = 'https://renger.ch/remorque.html?id=trailer-swiss-100&payment=cancel&booking_id=bk-cancel-9';
            ctx.window.location.search = '?id=trailer-swiss-100&payment=cancel&booking_id=bk-cancel-9';
            localStorageStore.set('pending_booking_id', 'bk-cancel-9');

            await ctx.checkPaymentStatus();

            assert.strictEqual(ctx.localStorage.getItem('pending_booking_id'), null);
            assert.ok(historyLog.length > 0);
            // L'URL nettoyée doit conserver ?id=trailer-swiss-100
            assert.strictEqual(historyLog[0].url, '/remorque.html?id=trailer-swiss-100', 'Paramètre id de l\'annonce préservé');
        });

        it('R4-6: Polling checkPaymentStatus() valide et confirme les statuts alternatifs "paid" et "confirmed"', async () => {
            for (const expectedStatus of ['paid', 'confirmed']) {
                const mockSupabase = {
                    from: () => ({
                        select: () => ({
                            eq: (col, val) => ({
                                single: async () => ({
                                    data: { id: val, status: expectedStatus },
                                    error: null
                                })
                            })
                        })
                    })
                };

                const { ctx, toastLog, localStorageStore } = createBookingSandbox({
                    supabaseClient: mockSupabase
                });

                ctx.window.location.search = `?payment=success&booking_id=bk-${expectedStatus}-1`;
                localStorageStore.set('pending_booking_id', `bk-${expectedStatus}-1`);

                await ctx.checkPaymentStatus();

                assert.ok(toastLog.some(t => t.msg.includes('Réservation confirmée')), `Doit confirmer la réservation avec le statut "${expectedStatus}"`);
                assert.strictEqual(ctx.localStorage.getItem('pending_booking_id'), null);
            }
        });
    });

    // =========================================================================
    // Parcours Intégré de Bout-en-Bout (E2E Journey)
    // =========================================================================
    describe('Parcours Intégré E2E : De la sélection calendaire à la redirection Stripe', () => {

        it('Exécute avec succès le cycle complet de réservation', async () => {
            const trailer = {
                id: 'trailer-e2e-1',
                title: 'Remorque Bâche Lausanne',
                price: 45,
                payload: 800,
                category: 'utilitaire',
                owner_id: 'owner-lausanne'
            };

            let capturedRedirection = null;
            const { ctx, getEl, getFlatpickrConfig, localStorageStore } = createBookingSandbox({
                currentTrailer: trailer,
                edgeFunctionMock: async (fnName, payload) => {
                    return {
                        url: 'https://checkout.stripe.com/c/pay/cs_test_e2e_verified_123',
                        bookingId: 'bk-e2e-999'
                    };
                }
            });

            // 1. Ouverture de la fiche détail
            await ctx.openTrailerDetail(trailer);

            // 2. Sélection de dates par le locataire : 15 au 17 novembre 2026 (3 jours)
            const fp = getFlatpickrConfig();
            fp.onChange([new Date(2026, 10, 15), new Date(2026, 10, 17)]);

            // 3. Vérification de la mise à jour réactive du devis DOM
            assert.strictEqual(getEl('total-days').innerText, '3');
            assert.strictEqual(getEl('total-rental-price').innerText, '135 CHF'); // 3 * 45
            // Frais : 135 * 0.05 = 6.75 CHF
            assert.strictEqual(getEl('service-fee-price').innerText, '6.75 CHF');
            assert.strictEqual(getEl('total-price').innerText, '141.75 CHF');
            assert.ok(!getEl('booking-summary').classList.contains('hidden'));

            // 4. L'utilisateur clique sur "Réserver"
            ctx.submitBooking();
            assert.ok(!getEl('booking-confirm-modal').classList.contains('hidden'), 'Modale de confirmation ouverte');
            assert.strictEqual(getEl('confirm-price').innerText, '141.75 CHF');

            // Mock de redirection de fenêtre
            Object.defineProperty(ctx.window.location, 'href', {
                set: (val) => { capturedRedirection = val; },
                get: () => capturedRedirection
            });

            // 5. L'utilisateur confirme et lance le paiement Stripe
            await ctx.processBooking();

            // 6. Vérifications finales
            assert.strictEqual(localStorageStore.get('pending_booking_id'), 'bk-e2e-999', 'bookingId mémorisé pour le retour webhook');
            assert.strictEqual(capturedRedirection, 'https://checkout.stripe.com/c/pay/cs_test_e2e_verified_123', 'Redirection vers Stripe Checkout');
            assert.strictEqual(ctx.isProcessingBooking || ctx.window.isProcessingBooking, false, 'Verrou relâché après redirection');
        });
    });

    // =========================================================================
    // R5. Tarifs par Durée & Dégressifs (Heures, Jours, Programmation Dynamique & Zero-Trust)
    // =========================================================================
    describe('R5. Tarifs par Durée & Dégressifs (Heures, Jours, Programmation Dynamique & Zero-Trust)', () => {

        it('R5-1: Sélection d\'un forfait horaire (12h = 20 CHF) sur 1 jour met à jour le devis, la modale et transmet durationHours à stripe-checkout', async () => {
            const tieredTrailer = {
                id: 't-tiered-1',
                title: 'Remorque Utilitaire Genève',
                price: 30,
                pricing_tiers: [
                    { unit: 'hours', duration: 12, price: 20 },
                    { unit: 'days', duration: 2, price: 45 },
                    { unit: 'days', duration: 7, price: 150 }
                ],
                payload: 500,
                category: 'utilitaire',
                owner_id: 'owner-ge'
            };

            let capturedPayload = null;
            const { ctx, getEl, getFlatpickrConfig } = createBookingSandbox({
                currentTrailer: tieredTrailer,
                edgeFunctionMock: async (fnName, payload) => {
                    capturedPayload = payload;
                    return { url: 'https://checkout.stripe.com/c/pay/cs_test_12h', bookingId: 'bk-12h' };
                }
            });

            await ctx.openTrailerDetail(tieredTrailer);

            // Les paliers sont affichés sous le prix principal de la fiche détail
            assert.ok(!getEl('detail-pricing-tiers').classList.contains('hidden'), 'La grille detail-pricing-tiers doit être visible');
            assert.strictEqual(getEl('detail-pricing-tiers').children.length, 3);
            assert.strictEqual(getEl('detail-pricing-tiers').children[0].textContent, '12h : 20 CHF');
            assert.strictEqual(getEl('detail-pricing-tiers').children[1].textContent, '2 jours : 45 CHF');

            // Sélection d'1 seule journée (2026-11-20 au 2026-11-20)
            const fp = getFlatpickrConfig();
            fp.onChange([new Date(2026, 10, 20), new Date(2026, 10, 20)]);

            // Par défaut sur 1 jour : tarif journée complète (30 CHF), mais le sélecteur horaire est visible
            assert.ok(!getEl('hourly-tier-selector').classList.contains('hidden'), 'Le sélecteur horaire doit être affiché sur 1 jour');
            assert.strictEqual(getEl('total-rental-price').innerText, '30 CHF');

            // Le locataire choisit le forfait 12h (20 CHF)
            ctx.selectBookingHourlyTier(12);
            assert.strictEqual(getEl('total-days').innerText, '1');
            assert.strictEqual(getEl('total-rental-price').innerText, '20 CHF');
            assert.strictEqual(getEl('booking-pricing-detail').textContent, 'Forfait 12h × 20 CHF');
            assert.ok(!getEl('booking-pricing-detail').classList.contains('hidden'));
            // Frais Renger sur 20 CHF : 5% = 1.00 -> plancher 4.90 CHF -> total 24.90 CHF
            assert.strictEqual(getEl('service-fee-price').innerText, '4.90 CHF');
            assert.strictEqual(getEl('total-price').innerText, '24.90 CHF');

            // Ouverture de la modale de confirmation
            ctx.submitBooking();
            assert.strictEqual(getEl('confirm-days').textContent, '12h (1 jour)');
            assert.strictEqual(getEl('confirm-rental-calc').textContent, 'Forfait 12h × 20 CHF');
            assert.strictEqual(getEl('confirm-rental-price').textContent, '20 CHF');
            assert.strictEqual(getEl('confirm-price').textContent, '24.90 CHF');

            // Lancement de processBooking -> doit inclure durationHours: 12
            await ctx.processBooking();
            assert.ok(capturedPayload, 'Le payload stripe-checkout doit avoir été envoyé');
            assert.strictEqual(capturedPayload.durationHours, 12);
            assert.strictEqual(capturedPayload.trailerId, 't-tiered-1');
        });

        it('R5-2: Calcul automatique par programmation dynamique des tarifs dégressifs multi-jours (2j=45, 3j=75, 4j=90, 7j=150, 8j=180, 9j=195)', async () => {
            const tieredTrailer = {
                id: 't-tiered-dp',
                title: 'Remorque DP',
                price: 30,
                pricing_tiers: [
                    { unit: 'hours', duration: 12, price: 20 },
                    { unit: 'days', duration: 2, price: 45 },
                    { unit: 'days', duration: 7, price: 150 }
                ],
                payload: 500,
                category: 'utilitaire',
                owner_id: 'owner-dp'
            };

            const { ctx, getEl, getFlatpickrConfig } = createBookingSandbox({
                currentTrailer: tieredTrailer
            });

            await ctx.openTrailerDetail(tieredTrailer);
            const fp = getFlatpickrConfig();

            // Vérification mathématique directe sur 1..9 jours
            const expectedByDays = [
                { days: 1, price: 30, custom: false },
                { days: 2, price: 45, custom: true, labelIncludes: 'Forfait 2 jours (45 CHF)' },
                { days: 3, price: 75, custom: true, labelIncludes: 'Forfait 2 jours (45 CHF) + 1 jour × 30 CHF' },
                { days: 4, price: 90, custom: true, labelIncludes: '2 × forfait 2 jours (45 CHF)' },
                { days: 5, price: 120, custom: true }, // 2*45 + 30 = 120
                { days: 6, price: 135, custom: true }, // 3*45 = 135
                { days: 7, price: 150, custom: true, labelIncludes: 'Forfait 7 jours (150 CHF)' },
                { days: 8, price: 180, custom: true, labelIncludes: 'Forfait 7 jours (150 CHF) + 1 jour × 30 CHF' },
                { days: 9, price: 195, custom: true, labelIncludes: 'Forfait 7 jours (150 CHF) + Forfait 2 jours (45 CHF)' }
            ];

            for (const c of expectedByDays) {
                const res = ctx.calculateTieredRentalPrice(tieredTrailer, c.days, null);
                assert.strictEqual(res.rentalPrice, c.price, `Pour ${c.days} jour(s), le prix attendu est ${c.price} CHF (obtenu: ${res.rentalPrice})`);
                assert.strictEqual(res.hasCustomTierApplied, c.custom);
                if (c.labelIncludes) {
                    assert.strictEqual(res.label, c.labelIncludes);
                }
            }

            // Simulation UI sur 3 jours (10 au 12 nov 2026) -> 45 + 30 = 75 CHF, sélecteur horaire masqué
            fp.onChange([new Date(2026, 10, 10), new Date(2026, 10, 12)]);
            assert.ok(getEl('hourly-tier-selector').classList.contains('hidden'), 'Le sélecteur horaire doit être masqué sur plusieurs jours');
            assert.strictEqual(getEl('total-days').innerText, '3');
            assert.strictEqual(getEl('total-rental-price').innerText, '75 CHF');
            assert.strictEqual(getEl('booking-pricing-detail').textContent, 'Forfait 2 jours (45 CHF) + 1 jour × 30 CHF');
            assert.strictEqual(getEl('service-fee-price').innerText, '4.90 CHF'); // 75 * 0.05 = 3.75 -> min 4.90
            assert.strictEqual(getEl('total-price').innerText, '79.90 CHF');
        });

        it('R5-3: Zero-Trust stripe-checkout : recalcule les paliers horaires et multi-jours côté serveur et rejette (400) un durationHours invalide', async () => {
            const tieredTrailer = {
                id: 'trailer-zt-tiers',
                title: 'Van Chevaux Dégressif',
                price: 30,
                pricing_tiers: [
                    { unit: 'hours', duration: 12, price: 20 },
                    { unit: 'days', duration: 2, price: 45 }
                ],
                category: 'utilitaire',
                payload: 500,
                owner_id: 'owner-zt'
            };
            const renter = { id: 'renter-zt-1', email: 'renter-zt@renger.ch' };
            const sim = createStripeCheckoutSimulator({
                trailers: new Map([[tieredTrailer.id, tieredTrailer]]),
                users: new Map([['valid-token-renter-1', renter]])
            });

            // Cas 1 : Forfait 12h valide sur 1 jour (2026-12-05 au 2026-12-05) avec tentative de falsification client (price: 1)
            const res12h = await sim.handleRequest({
                authHeader: 'Bearer valid-token-renter-1',
                body: {
                    trailerId: 'trailer-zt-tiers',
                    startDate: '2026-12-05',
                    endDate: '2026-12-05',
                    durationHours: 12,
                    cautionAmount: 1,
                    price: 1
                }
            });
            assert.strictEqual(res12h.status, 200);
            const bk12h = sim.getBookings().find(b => b.id === res12h.body.bookingId);
            assert.strictEqual(bk12h.rental_price, 20);
            assert.strictEqual(bk12h.duration_hours, 12);
            assert.strictEqual(bk12h.total_price, 24.90); // 20 + 4.90
            assert.strictEqual(sim.getLastStripeSession().line_items[0].unit_amount, 2000);

            // Cas 2 : Location de 3 jours (2026-12-10 au 2026-12-12) -> 45 + 30 = 75 CHF + 4.90 CHF = 79.90 CHF
            const res3d = await sim.handleRequest({
                authHeader: 'Bearer valid-token-renter-1',
                body: {
                    trailerId: 'trailer-zt-tiers',
                    startDate: '2026-12-10',
                    endDate: '2026-12-12',
                    cautionAmount: 200
                }
            });
            assert.strictEqual(res3d.status, 200);
            const bk3d = sim.getBookings().find(b => b.id === res3d.body.bookingId);
            assert.strictEqual(bk3d.rental_price, 75);
            assert.strictEqual(bk3d.total_price, 79.90);
            assert.strictEqual(sim.getLastStripeSession().line_items[0].unit_amount, 7500);

            // Cas 3 : Rejet 400 si durationHours est envoyé sur une réservation multi-jours
            const resInvalidMulti = await sim.handleRequest({
                authHeader: 'Bearer valid-token-renter-1',
                body: {
                    trailerId: 'trailer-zt-tiers',
                    startDate: '2026-12-15',
                    endDate: '2026-12-16',
                    durationHours: 12,
                    cautionAmount: 200
                }
            });
            assert.strictEqual(resInvalidMulti.status, 400);

            // Cas 4 : Rejet 400 si durationHours ne correspond à aucun palier configuré sur la remorque (ex: 6h)
            const resInvalidHour = await sim.handleRequest({
                authHeader: 'Bearer valid-token-renter-1',
                body: {
                    trailerId: 'trailer-zt-tiers',
                    startDate: '2026-12-18',
                    endDate: '2026-12-18',
                    durationHours: 6,
                    cautionAmount: 200
                }
            });
            assert.strictEqual(resInvalidHour.status, 400);
        });

        it('R5-4: Contrat PDF (generateRentalContractPdf) et solde propriétaire (calculateOwnerBalance) respectent les tarifs dégressifs et horaires', async () => {
            const contractsCode = fs.readFileSync(path.join(jsDir, 'contracts.js'), 'utf8');
            const trailersCode = fs.readFileSync(path.join(jsDir, 'trailers.js'), 'utf8');

            // 1. Vérification calculateOwnerBalance dans trailers.js
            const trailersSandbox = {
                window: {},
                document: { addEventListener: () => {}, getElementById: () => null, querySelectorAll: () => [] },
                console,
                Date,
                Math,
                Number,
                String,
                Array,
                Map,
                Set,
                Object,
                parseInt,
                parseFloat,
                isNaN
            };
            vm.createContext(trailersSandbox);
            vm.runInContext(trailersCode, trailersSandbox);

            const sampleTrailer = {
                id: 'tr-bal-1',
                price: 30,
                pricing_tiers: [
                    { unit: 'hours', duration: 12, price: 20 },
                    { unit: 'days', duration: 2, price: 45 }
                ]
            };

            const bookings = [
                // Location 1 : 3 jours avec palier 2j=45 + 1j=30 => 75 CHF brut => 60 CHF net (80%)
                {
                    id: 'b1',
                    status: 'paye',
                    start_date: '2026-05-01',
                    end_date: '2026-05-03',
                    total_price: 79.90,
                    trailers: sampleTrailer
                },
                // Location 2 : forfait 12h = 20 CHF brut => 16 CHF net (80%)
                {
                    id: 'b2',
                    status: 'paye',
                    start_date: '2026-05-10',
                    end_date: '2026-05-10',
                    duration_hours: 12,
                    rental_price: 20,
                    total_price: 24.90,
                    trailers: sampleTrailer
                }
            ];

            const balStandard = trailersSandbox.window.calculateOwnerBalance(bookings, [], false, new Date('2026-06-01'));
            assert.strictEqual(balStandard.totalNetEarnings, 76.00); // (75 + 20) * 0.80 = 76.00 CHF

            const balPro = trailersSandbox.window.calculateOwnerBalance(bookings, [], true, new Date('2026-06-01'));
            assert.strictEqual(balPro.totalNetEarnings, 95.00); // (75 + 20) * 1.00 = 95.00 CHF
            assert.strictEqual(balPro.canWithdraw, true);

            // 2. Vérification contrat PDF via RengerContracts
            const contractsSandbox = { window: {}, self: {}, document: {}, console, Date, Math, Number, String, Array, Map, Object, parseInt, parseFloat, isNaN };
            contractsSandbox.self = contractsSandbox.window;
            vm.createContext(contractsSandbox);
            vm.runInContext(contractsCode, contractsSandbox);
            const RengerContracts = contractsSandbox.RengerContracts || contractsSandbox.window.RengerContracts;
            assert.ok(RengerContracts && typeof RengerContracts.generateRentalContractPdf === 'function');

            const pdfDoc = RengerContracts.generateRentalContractPdf(bookings[0]);
            const allText = pdfDoc.records
                .filter(op => op.op === 'text')
                .map(op => String(op.text))
                .join(' | ');
            assert.ok(allText.includes('75.00 CHF'), 'Le PDF doit afficher le sous-total dégressif de 75.00 CHF');
            assert.ok(allText.includes('Forfait 2 jours (45 CHF)'), 'Le PDF doit mentionner la formule dégressive appliquée');
        });

        it('R5-5: Normalisation des paliers propriétaire (normalizePricingTiers) et badge catalogue (getPricingTiersBadgeText)', () => {
            const { ctx } = createBookingSandbox();

            const normalized = JSON.parse(JSON.stringify(ctx.normalizePricingTiers([
                { unit: 'days', duration: '7', price: '150' },
                { unit: 'hours', duration: '12', price: '18' },
                { unit: 'days', duration: '2', price: '45' },
                { unit: 'hours', duration: '12', price: '25' }, // doublon 12h plus cher après -> garde le moins cher (18)
                { unit: 'days', duration: '-1', price: '10' },  // invalide
                { unit: 'days', duration: '3', price: '0' },    // invalide
                { unit: 'hours', duration: '96', price: '40' }  // > 72h invalide
            ])));

            assert.strictEqual(normalized.length, 3);
            assert.deepStrictEqual(normalized[0], { unit: 'hours', duration: 12, price: 18 });
            assert.deepStrictEqual(normalized[1], { unit: 'days', duration: 2, price: 45 });
            assert.deepStrictEqual(normalized[2], { unit: 'days', duration: 7, price: 150 });

            assert.strictEqual(
                ctx.getPricingTiersBadgeText({ price: 30, pricing_tiers: normalized }),
                'Dès 18 CHF • Tarifs dégressifs'
            );
            assert.strictEqual(
                ctx.getPricingTiersBadgeText({ price: 30, pricing_tiers: [{ unit: 'days', duration: 2, price: 45 }] }),
                'Tarifs dégressifs'
            );
            assert.strictEqual(
                ctx.getPricingTiersBadgeText({ price: 30, pricing_tiers: [] }),
                ''
            );
        });

        it('R5-6: Bascule calendrier 1 jour (12h) -> 3 jours -> 1 jour réinitialise selectedDurationHours', async () => {
            const { ctx, getEl, getFlatpickrConfig } = createBookingSandbox();
            const trailer = {
                id: 'tr-switch-1',
                owner_id: 'owner-switch',
                title: 'Remorque Switch',
                price: 30,
                caution: 200,
                category: 'utilitaire',
                pricing_tiers: [
                    { unit: 'hours', duration: 12, price: 20 },
                    { unit: 'days', duration: 2, price: 45 }
                ]
            };

            await ctx.openTrailerDetail(trailer);
            const fpCfg = getFlatpickrConfig();
            assert.ok(fpCfg && typeof fpCfg.onChange === 'function');

            // 1. Sélection de 1 jour + formule 12h
            const d1 = new Date(2026, 6, 10, 12, 0, 0);
            fpCfg.onChange([d1, d1]);
            ctx.selectBookingHourlyTier(12);
            assert.strictEqual(ctx.window.selectedDurationHours, 12);
            assert.strictEqual(getEl('total-rental-price').innerText, '20 CHF');

            // 2. Passage à 3 jours -> selectedDurationHours remis à null et sélecteur horaire masqué
            const d3 = new Date(2026, 6, 12, 12, 0, 0);
            fpCfg.onChange([d1, d3]);
            assert.strictEqual(ctx.window.selectedDurationHours, null);
            assert.ok(getEl('hourly-tier-selector').classList.contains('hidden'));
            assert.strictEqual(getEl('total-rental-price').innerText, '75 CHF');

            // 3. Retour à 1 jour -> tarif journée complète (30 CHF) par défaut
            fpCfg.onChange([d1, d1]);
            assert.strictEqual(ctx.window.selectedDurationHours, null);
            assert.ok(!getEl('hourly-tier-selector').classList.contains('hidden'));
            assert.strictEqual(getEl('total-rental-price').innerText, '30 CHF');
        });

        it('R5-7: Cohérence des revenus dégressifs / horaires dans planning.js, stats.js, stripe-payout et email.ts', async () => {
            const planningMod = await import(path.join(jsDir, 'planning.js'));
            const RengerPlanning = planningMod.default || planningMod;
            const statsMod = await import(path.join(jsDir, 'stats.js'));
            const RengerStats = statsMod.default || statsMod;

            const tieredBooking = {
                start_date: '2026-06-01',
                end_date: '2026-06-02', // 2 jours
                total_price: 49.90,
                trailers: {
                    price: 30,
                    pricing_tiers: [{ unit: 'days', duration: 2, price: 45 }]
                }
            };

            const stdEarn = RengerPlanning.calculateBookingEarnings(tieredBooking, false);
            assert.strictEqual(stdEarn.baseRental, 45);
            assert.strictEqual(stdEarn.netEarnings, 36);

            const proEarn = RengerPlanning.calculateBookingEarnings(tieredBooking, true);
            assert.strictEqual(proEarn.baseRental, 45);
            assert.strictEqual(proEarn.netEarnings, 45);

            const dailyEff = RengerStats.getBookingDailyPrice(tieredBooking, '2026-06-01', '2026-06-02');
            assert.strictEqual(dailyEff, 22.5); // 45 CHF / 2 jours

            const hourlyBooking = {
                start_date: '2026-06-05',
                end_date: '2026-06-05',
                duration_hours: 12,
                total_price: 24.90,
                trailers: {
                    price: 30,
                    pricing_tiers: [{ unit: 'hours', duration: 12, price: 20 }]
                }
            };
            const hourlyEarn = RengerPlanning.calculateBookingEarnings(hourlyBooking, false);
            assert.strictEqual(hourlyEarn.baseRental, 20);
            assert.strictEqual(hourlyEarn.netEarnings, 16);
            assert.strictEqual(RengerStats.getBookingDailyPrice(hourlyBooking, '2026-06-05', '2026-06-05'), 20);

            const payoutSrc = fs.readFileSync(path.join(projectRoot, 'supabase/functions/stripe-payout/index.ts'), 'utf8');
            assert.ok(payoutSrc.includes('calculateTieredRentalPrice(rec.trailers, days, rec.duration_hours)'));

            const emailSrc = fs.readFileSync(path.join(projectRoot, 'supabase/functions/stripe-webhook/email.ts'), 'utf8');
            assert.ok(emailSrc.includes('booking.rental_price'));
            assert.ok(emailSrc.includes('pricing_tiers'));
        });
    });
});




