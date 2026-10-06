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
 * Isolated sandbox loader for booking.js
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
        'confirm-img': createEl(),
        'confirm-title': createEl(),
        'confirm-dates': createEl(),
        'confirm-days': createEl(),
        'confirm-rental-price': createEl(),
        'confirm-service-fee': createEl(),
        'confirm-caution': createEl(),
        'confirm-caution-price': createEl(),
        'confirm-price': createEl(),
        'confirm-pay-amount': createEl(),
        'confirm-btn-caution': createEl(),
        'booking-confirm-modal': createEl()
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
            fr: { detail_desc: 'Description remorque' }
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
            from: (table) => ({
                select: () => ({
                    eq: () => ({
                        maybeSingle: () => Promise.resolve({ data: null }),
                        eq: () => Promise.resolve({ data: [] }),
                        in: () => Promise.resolve({ data: [] }),
                        then: (fn) => Promise.resolve({ data: [] }).then(fn)
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
        console: {
            log: () => {},
            warn: () => {},
            error: () => {}
        },
        ...customMocks
    };

    vm.createContext(ctx);
    vm.runInContext(bookingCode, ctx);

    return { ctx, domElements, getFlatpickrConfig: () => capturedFlatpickrConfig };
}

/**
 * Isolated sandbox loader for chat.js
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
 * Isolated runner for initTrailerEditMode from louer-ma-remorque.html
 */
function loadEditModeContext(searchString, mockSupabaseData, mockSupabaseError = null) {
    const htmlContent = fs.readFileSync(path.join(siteWebDir, 'louer-ma-remorque.html'), 'utf8');
    const match = htmlContent.match(/(async\s+function\s+initTrailerEditMode\s*\(\)[\s\S]*?)(?=\n\s*if\s*\(document\.readyState)/);
    if (!match) throw new Error("Impossible d'extraire initTrailerEditMode depuis louer-ma-remorque.html");

    const createEl = (tag = 'div') => ({
        tagName: tag.toUpperCase(),
        value: '',
        checked: false,
        dataset: {},
        innerText: '',
        textContent: '',
        childNodes: [],
        querySelector: () => null,
        querySelectorAll: () => []
    });

    const formEl = createEl('form');
    const submitBtn = createEl('button');
    const submitSpan = createEl('span');
    submitSpan.textContent = 'Publier';
    submitBtn.querySelector = () => submitSpan;
    submitBtn.childNodes = [{ nodeType: 1, textContent: 'Publier' }];
    formEl.querySelector = (sel) => sel && sel.includes('submit') ? submitBtn : null;

    const radios = {
        category: {},
        prise: {}
    };
    const checkboxes = {
        equipments: [],
        upsell: []
    };

    const elements = {
        'add-trailer-form': formEl,
        'ad-title': createEl('input'),
        'ad-location': createEl('input'),
        'ad-price': createEl('input'),
        'ad-payload': createEl('input'),
        'ad-desc': createEl('textarea'),
        'ad-description': createEl('textarea')
    };

    const toastMessages = [];

    const ctx = {
        window: {
            location: { search: searchString }
        },
        document: {
            getElementById: (id) => elements[id] || null,
            querySelector: (sel) => {
                const catMatch = sel.match(/input\[name="category"\]\[value="([^"]+)"\]/);
                if (catMatch) {
                    if (!radios.category[catMatch[1]]) radios.category[catMatch[1]] = createEl('input');
                    return radios.category[catMatch[1]];
                }
                const priseMatch = sel.match(/input\[name="prise"\]\[value="([^"]+)"\]/);
                if (priseMatch) {
                    if (!radios.prise[priseMatch[1]]) radios.prise[priseMatch[1]] = createEl('input');
                    return radios.prise[priseMatch[1]];
                }
                const h2Match = sel.match(/h2/);
                if (h2Match) return createEl('h2');
                return null;
            },
            querySelectorAll: (sel) => {
                if (sel.includes('equipments')) return checkboxes.equipments;
                if (sel.includes('upsell')) return checkboxes.upsell;
                return [];
            },
            title: "Publier une annonce - Renger"
        },
        URLSearchParams,
        supabaseClient: {
            from: (table) => ({
                select: () => ({
                    eq: (col, val) => ({
                        single: () => Promise.resolve({
                            data: mockSupabaseData,
                            error: mockSupabaseError
                        })
                    })
                })
            })
        },
        showToast: (msg, type) => { toastMessages.push({ msg, type }); },
        updateSmartPricingFeedback: () => {},
        updateLegalPermitBadge: () => {},
        console: {
            log: () => {},
            warn: () => {},
            error: () => {}
        }
    };

    vm.createContext(ctx);
    vm.runInContext(match[1], ctx);

    return {
        ctx,
        elements,
        radios,
        checkboxes,
        toastMessages,
        submitBtn,
        submitSpan
    };
}

// ────────────────────────────────────────────────────────────────────────────
// SUITE 1 : DST TRANSITIONS & BOUNDARY HOURS STRESS TESTS
// ────────────────────────────────────────────────────────────────────────────

describe('Adversarial Stress Suite 1: DST Transitions & Boundary Hours', () => {

    it('must compute exactly 3 days across all boundary hour permutations during Autumn DST (Oct 24 to Oct 26, 2026)', async () => {
        const { ctx, domElements, getFlatpickrConfig } = loadBookingContext();
        await ctx.openTrailerDetail(ctx.currentTrailer);
        const config = getFlatpickrConfig();
        assert.ok(config && typeof config.onChange === 'function');

        const boundaryHours = [
            { label: '00:00 (Midnight)', h: 0, m: 0 },
            { label: '01:00 (Pre-shift)', h: 1, m: 0 },
            { label: '02:00 (Shift boundary)', h: 2, m: 0 },
            { label: '03:00 (Post-shift)', h: 3, m: 0 },
            { label: '12:00 (Noon)', h: 12, m: 0 },
            { label: '23:59 (End of day)', h: 23, m: 59 }
        ];

        for (const startHr of boundaryHours) {
            for (const endHr of boundaryHours) {
                const startDate = new Date(2026, 9, 24, startHr.h, startHr.m, 0); // Oct 24
                const endDate = new Date(2026, 9, 26, endHr.h, endHr.m, 0);     // Oct 26
                config.onChange([startDate, endDate]);

                const computedDays = parseInt(domElements['total-days'].innerText, 10);
                assert.strictEqual(
                    computedDays,
                    3,
                    `Échec calcul DST Automne (${startHr.label} -> ${endHr.label}) : attendu 3 jours, obtenu ${computedDays}`
                );

                const rentalPrice = parseInt(domElements['total-rental-price'].innerText, 10);
                assert.strictEqual(
                    rentalPrice,
                    90, // 3 * 30 CHF
                    `Prix de location incohérent pour 3 jours : obtenu ${rentalPrice} CHF`
                );
            }
        }
    });

    it('must compute exactly 3 days across all boundary hours during Spring DST (March 28 to March 30, 2026)', async () => {
        const { ctx, domElements, getFlatpickrConfig } = loadBookingContext();
        await ctx.openTrailerDetail(ctx.currentTrailer);
        const config = getFlatpickrConfig();

        const boundaryHours = [
            { label: '00:00', h: 0, m: 0 },
            { label: '01:00', h: 1, m: 0 },
            { label: '02:00', h: 2, m: 0 },
            { label: '23:59', h: 23, m: 59 }
        ];

        for (const startHr of boundaryHours) {
            for (const endHr of boundaryHours) {
                const startDate = new Date(2026, 2, 28, startHr.h, startHr.m); // March 28
                const endDate = new Date(2026, 2, 30, endHr.h, endHr.m);     // March 30
                config.onChange([startDate, endDate]);

                const computedDays = parseInt(domElements['total-days'].innerText, 10);
                assert.strictEqual(
                    computedDays,
                    3,
                    `Échec calcul DST Printemps (${startHr.label} -> ${endHr.label}) : attendu 3 jours, obtenu ${computedDays}`
                );
            }
        }
    });

    it('must calculate multi-week rental durations crossing DST transitions accurately', async () => {
        const { ctx, domElements, getFlatpickrConfig } = loadBookingContext();
        await ctx.openTrailerDetail(ctx.currentTrailer);
        const config = getFlatpickrConfig();

        // 1. 22 jours traversant le passage à l'heure d'hiver (10 au 31 octobre 2026)
        config.onChange([new Date(2026, 9, 10), new Date(2026, 9, 31)]);
        assert.strictEqual(
            parseInt(domElements['total-days'].innerText, 10),
            22,
            "Location de 22 jours traversant le changement d'heure d'automne doit donner exactement 22 jours"
        );

        // 2. 31 jours traversant le passage à l'heure d'hiver (1er au 31 octobre 2026)
        config.onChange([new Date(2026, 9, 1), new Date(2026, 9, 31)]);
        assert.strictEqual(
            parseInt(domElements['total-days'].innerText, 10),
            31,
            "Location de 31 jours traversant le changement d'heure d'automne doit donner exactement 31 jours"
        );

        // 3. 22 jours traversant le passage à l'heure d'été (14 mars au 4 avril 2026)
        config.onChange([new Date(2026, 2, 14), new Date(2026, 3, 4)]);
        assert.strictEqual(
            parseInt(domElements['total-days'].innerText, 10),
            22,
            "Location de 22 jours traversant le changement d'heure de printemps doit donner exactement 22 jours"
        );
    });

    it('must accurately calculate Leap Year (29 Feb) vs Non-Leap Year rentals and year-end boundaries', async () => {
        const { ctx, domElements, getFlatpickrConfig } = loadBookingContext();
        await ctx.openTrailerDetail(ctx.currentTrailer);
        const config = getFlatpickrConfig();

        // Année bissextile 2028 : du 28 février au 1er mars = 3 jours (28 fév, 29 fév, 1er mars)
        config.onChange([new Date(2028, 1, 28), new Date(2028, 2, 1)]);
        assert.strictEqual(
            parseInt(domElements['total-days'].innerText, 10),
            3,
            "En 2028 (année bissextile), du 28 fév au 1er mars doit donner exactement 3 jours"
        );

        // Année bissextile 2028 : location sur le 29 février uniquement = 1 jour
        config.onChange([new Date(2028, 1, 29), new Date(2028, 1, 29)]);
        assert.strictEqual(
            parseInt(domElements['total-days'].innerText, 10),
            1,
            "En 2028, le 29 février seul doit donner 1 jour"
        );

        // Année non bissextile 2026 : du 28 février au 1er mars = 2 jours
        config.onChange([new Date(2026, 1, 28), new Date(2026, 2, 1)]);
        assert.strictEqual(
            parseInt(domElements['total-days'].innerText, 10),
            2,
            "En 2026 (non bissextile), du 28 fév au 1er mars doit donner exactement 2 jours"
        );

        // Transition de fin d'année : du 30 décembre 2026 au 2 janvier 2027 = 4 jours (30, 31, 1, 2)
        config.onChange([new Date(2026, 11, 30), new Date(2027, 0, 2)]);
        assert.strictEqual(
            parseInt(domElements['total-days'].innerText, 10),
            4,
            "Transition du 30 déc au 2 janv doit donner exactement 4 jours"
        );
    });

    it('submitBooking and calendar onChange must calculate strictly identical days and fees', async () => {
        const { ctx, domElements, getFlatpickrConfig } = loadBookingContext();
        await ctx.openTrailerDetail(ctx.currentTrailer);
        const config = getFlatpickrConfig();

        const start = new Date(2026, 9, 24, 1, 0);
        const end = new Date(2026, 9, 26, 23, 59);

        // 1. onChange
        config.onChange([start, end]);
        const onChangeDays = parseInt(domElements['total-days'].innerText, 10);
        const onChangeRental = parseInt(domElements['total-rental-price'].innerText, 10);
        const onChangeFee = parseFloat(domElements['service-fee-price'].innerText);
        const onChangeTotal = parseFloat(domElements['total-price'].innerText);

        // 2. submitBooking
        ctx.submitBooking();
        const submitDays = parseInt(domElements['confirm-days'].textContent, 10);
        const submitRental = parseInt(domElements['confirm-rental-price'].textContent, 10);
        const submitFee = parseFloat(domElements['confirm-service-fee'].textContent);
        const submitTotal = parseFloat(domElements['confirm-price'].textContent);

        assert.strictEqual(submitDays, onChangeDays, "La durée affichée dans la modale de confirmation doit correspondre au calendrier");
        assert.strictEqual(submitRental, onChangeRental, "Le prix de location dans la modale doit correspondre au récapitulatif");
        assert.strictEqual(submitFee, onChangeFee, "Les frais de service doivent être identiques");
        assert.strictEqual(submitTotal, onChangeTotal, "Le montant total doit être rigoureusement identique");
    });
});

// ────────────────────────────────────────────────────────────────────────────
// SUITE 2 : ANTI-SCAM EVASION & FALSE POSITIVE RESISTANCE
// ────────────────────────────────────────────────────────────────────────────

describe('Adversarial Stress Suite 2: Anti-Scam Evasion Attempts & Legitimate Text Preservation', () => {
    const chatCtx = loadChatContext();
    const MASK = '[Information masquée avant réservation]';

    it('must mask complex spaced and international phone number variations', () => {
        const phoneVariants = [
            '0 7 9 1 2 3 4 5 6 7',         // Spaced Swiss mobile (10 digits)
            '07 91 23 45 67',             // Grouped by 2
            '079 123 45 67',              // Standard grouped
            '079.123.45.67',              // Dot separated
            '079-123-45-67',              // Hyphen separated
            '079/123/45/67',              // Slash separated
            '+41 79 123 45 67',           // International plus with spaces
            '+41.79.123.45.67',           // International plus with dots
            '+41-79-123-45-67',           // International plus with hyphens
            '+41/79/123/45/67',           // International plus with slashes
            '0041 79 123 45 67',          // International double zero
            '0041-79-123-45-67',          // International double zero hyphenated
            '0041791234567',              // International continuous
            '+33 6 12 34 56 78',          // French mobile spaced
            '+33.6.12.34.56.78',          // French mobile dotted
            '+49 151 23456789',           // German mobile
            '0791234567'                  // Continuous Swiss mobile
        ];

        for (const phone of phoneVariants) {
            const result = chatCtx.sanitizeMessage(`Contactez-moi au ${phone} pour confirmer.`);
            assert.ok(
                result.includes(MASK),
                `Échec de masquage anti-scam pour le téléphone '${phone}'. Résultat : ${result}`
            );
            assert.doesNotMatch(
                result,
                new RegExp(phone.replace(/[+.]/g, '\\$&')),
                `Le numéro '${phone}' ne doit plus apparaître en clair dans le message`
            );
        }
    });

    it('must mask Swiss and European IBANs under varied formatting and cases', () => {
        const ibanVariants = [
            'CH93 0076 2011 6238 5295 7',          // Swiss spaced
            'CH93-0076-2011-6238-5295-7',          // Swiss hyphenated
            'CH9300762011623852957',              // Swiss compact
            'ch93 0076 2011 6238 5295 7',          // Swiss lowercase
            'FR76 3000 6000 0112 3456 7890 189',  // French IBAN
            'DE89 3704 0044 0532 0130 00'          // German IBAN
        ];

        for (const iban of ibanVariants) {
            const result = chatCtx.sanitizeMessage(`Paiement direct sur IBAN : ${iban}`);
            assert.ok(
                result.includes(MASK),
                `L'IBAN '${iban}' doit être détecté et masqué`
            );
        }
    });

    it('must mask hidden and complex email patterns', () => {
        const emailVariants = [
            'john.doe@example.com',
            'jean-michel.dupont123@bluewin.ch',
            'contact+rental@sub.domain.co.uk',
            'mon_adresse_email@mail.ch'
        ];

        for (const email of emailVariants) {
            const result = chatCtx.sanitizeMessage(`Écrivez à ${email} pour les détails.`);
            assert.ok(
                result.includes(MASK),
                `L'email '${email}' doit être masqué`
            );
            assert.ok(!result.includes(email));
        }
    });

    it('must mask third-party messaging direct links', () => {
        const externalLinks = [
            'wa.me/41791234567',
            'https://wa.me/41791234567',
            't.me/renger_user',
            'https://t.me/scammer_channel',
            'api.whatsapp.com/send?phone=41791234567',
            'instagram.com/direct_owner'
        ];

        for (const link of externalLinks) {
            const result = chatCtx.sanitizeMessage(`Rejoins-moi sur ${link} pour payer en direct`);
            assert.ok(
                result.includes(MASK),
                `Le lien externe '${link}' doit être masqué`
            );
        }
    });

    it('MUST NOT falsely mask legitimate rental descriptions (False Positive Resistance)', () => {
        const legitimatePhrases = [
            'remorque de 750 kg',
            'prise 13 broches',
            'autoroute A1',
            'remorque de 750 kg avec prise 13 broches, sortie autoroute A1',
            'Prise 13 broches et adaptateur 7 broches inclus',
            'Remorque utilitaire double essieu PTAC 1500 kg, charge utile 1150 kg',
            'Dimensions utiles: 250 x 130 x 150 cm',
            'Rendez-vous à 14h devant le numéro 12 de la rue de la Gare',
            'Disponible tous les jours de 08h00 à 19h00',
            'Tarif journalier 35 CHF, caution 200 CHF payée en ligne',
            'Remorque achetée en 2023, pneus neufs et antivol fourni'
        ];

        for (const phrase of legitimatePhrases) {
            const sanitized = chatCtx.sanitizeMessage(phrase);
            assert.strictEqual(
                sanitized,
                phrase,
                `Faux positif anti-scam détecté ! Le texte légitime '${phrase}' a été indûment altéré en '${sanitized}'`
            );
        }
    });

    it('must preserve legitimate text while masking illicit contacts in mixed messages', () => {
        const mixed1 = chatCtx.sanitizeMessage('Bonjour, la remorque de 750 kg m\'intéresse. Appelle-moi au +41 79 123 45 67 merci.');
        assert.strictEqual(
            mixed1,
            `Bonjour, la remorque de 750 kg m'intéresse. Appelle-moi au ${MASK} merci.`
        );

        const mixed2 = chatCtx.sanitizeMessage('Prise 13 broches dispo. Écris à contact@renger.ch pour convenir de l\'heure.');
        assert.strictEqual(
            mixed2,
            `Prise 13 broches dispo. Écris à ${MASK} pour convenir de l'heure.`
        );

        const mixed3 = chatCtx.sanitizeMessage('Sortie autoroute A1, virement sur CH93 0076 2011 6238 5295 7');
        assert.strictEqual(
            mixed3,
            `Sortie autoroute A1, virement sur ${MASK}`
        );
    });
});

// ────────────────────────────────────────────────────────────────────────────
// SUITE 3 : URL QUERY PARSING & MPA EDIT FLOW ROBUSTNESS
// ────────────────────────────────────────────────────────────────────────────

describe('Adversarial Stress Suite 3: URL Query Parsing & MPA Edit Flow Robustness', () => {

    it('must return cleanly without errors when edit query param is absent or empty', async () => {
        const emptyCases = ['', '?edit=', '?other=value', '?edit=&foo=bar'];

        for (const search of emptyCases) {
            const { ctx, elements } = loadEditModeContext(search, null, null);
            await assert.doesNotReject(async () => {
                await ctx.initTrailerEditMode();
            }, `initTrailerEditMode ne doit pas planter sur URL search: '${search}'`);

            assert.strictEqual(
                elements['add-trailer-form'].dataset.editId,
                undefined,
                `dataset.editId ne doit pas être défini pour search: '${search}'`
            );
            assert.strictEqual(
                elements['ad-title'].value,
                '',
                `Le titre ne doit pas être altéré pour search: '${search}'`
            );
        }
    });

    it('must handle malformed, unexpected, or SQL injection edit parameters gracefully', async () => {
        const maliciousCases = [
            '?edit=null',
            '?edit=undefined',
            '?edit=NaN',
            "?edit=' OR '1'='1",
            '?edit=<script>alert(1)</script>',
            '?edit=non-existent-uuid-99999999'
        ];

        for (const search of maliciousCases) {
            const { ctx, elements, toastMessages } = loadEditModeContext(
                search,
                null,
                { message: 'Row not found in trailers table', code: 'PGRST116' }
            );

            await assert.doesNotReject(async () => {
                await ctx.initTrailerEditMode();
            }, `initTrailerEditMode ne doit pas planter sur paramètre malveillant '${search}'`);

            assert.strictEqual(
                elements['add-trailer-form'].dataset.editId,
                undefined,
                "dataset.editId ne doit pas être renseigné si la remorque n'existe pas"
            );
            assert.ok(
                toastMessages.some(t => t.type === 'error'),
                `Un toast d'erreur doit signaler l'impossibilité de charger l'annonce pour '${search}'`
            );
        }
    });

    it('must populate all form fields, update submit button and title when valid edit parameter is provided', async () => {
        const mockTrailer = {
            id: 'trailer-swiss-888',
            title: 'Remorque Bâche Alu 750kg',
            location: 'Lausanne Gare',
            price: 45,
            payload: 750,
            description: 'Idéale pour déménagement et transport encombrants.',
            category: 'utilitaire',
            socket: '13 broches',
            equipments: ['bache', 'antivol', 'sangles'],
            upsells: ['diable']
        };

        const { ctx, elements, radios, submitBtn, submitSpan } = loadEditModeContext(
            '?edit=trailer-swiss-888',
            mockTrailer,
            null
        );

        await ctx.initTrailerEditMode();

        assert.strictEqual(elements['add-trailer-form'].dataset.editId, 'trailer-swiss-888');
        assert.strictEqual(elements['ad-title'].value, 'Remorque Bâche Alu 750kg');
        assert.strictEqual(elements['ad-location'].value, 'Lausanne Gare');
        assert.strictEqual(elements['ad-price'].value, 45);
        assert.strictEqual(elements['ad-payload'].value, 750);
        assert.strictEqual(elements['ad-desc'].value, 'Idéale pour déménagement et transport encombrants.');

        assert.strictEqual(radios.category['utilitaire'].checked, true);
        assert.strictEqual(radios.prise['13 broches'].checked, true);

        assert.strictEqual(ctx.document.title, "Mettre à jour l'annonce - Renger");
        assert.strictEqual(submitSpan.textContent, "Mettre à jour l'annonce");
    });

    it('must safely handle database records with corrupt or malformed JSON equipments without crash', async () => {
        const corruptTrailer = {
            id: 'trailer-corrupt-1',
            title: 'Remorque Test Données Corrompues',
            equipments: '{corrupt json string syntax error',
            upsells: null
        };

        const { ctx } = loadEditModeContext('?edit=trailer-corrupt-1', corruptTrailer, null);

        // La fonction doit attraper l'exception dans son bloc try/catch et ne pas faire crasher l'exécution
        await assert.doesNotReject(async () => {
            await ctx.initTrailerEditMode();
        }, "Le parser JSON de louer-ma-remorque.html doit être blindé contre les chaînes JSON corrompues");
    });
});

// ────────────────────────────────────────────────────────────────────────────
// SUITE 4 : BOOKED DATES FALLBACK & MOCK OFFLINE / ERROR RESPONSES
// ────────────────────────────────────────────────────────────────────────────

describe('Adversarial Stress Suite 4: Booked Dates Fallback & Mock Offline / Error Resilience', () => {

    it('must populate disabledDates when primary view trailer_booked_dates succeeds', async () => {
        let capturedDisable = null;

        const { ctx } = loadBookingContext({
            flatpickr: (sel, cfg) => {
                capturedDisable = cfg.disable;
                return { destroy() {} };
            },
            supabaseClient: {
                rpc: () => Promise.resolve(),
                from: (table) => {
                    if (table === 'trailer_booked_dates') {
                        return {
                            select: () => ({
                                eq: () => Promise.resolve({
                                    data: [
                                        { start_date: '2026-07-01', end_date: '2026-07-05' },
                                        { start_date: '2026-07-10', end_date: '2026-07-12' }
                                    ],
                                    error: null
                                })
                            })
                        };
                    }
                    return {
                        select: () => ({
                            eq: () => ({
                                maybeSingle: () => Promise.resolve({ data: null }),
                                eq: () => Promise.resolve({ data: [] })
                            })
                        })
                    };
                }
            }
        });

        await ctx.openTrailerDetail(ctx.currentTrailer);

        assert.ok(Array.isArray(capturedDisable), "flatpickr.disable doit être un tableau");
        assert.strictEqual(capturedDisable.length, 2);
        assert.strictEqual(capturedDisable[0].from, '2026-07-01');
        assert.strictEqual(capturedDisable[0].to, '2026-07-05');
        assert.strictEqual(capturedDisable[1].from, '2026-07-10');
        assert.strictEqual(capturedDisable[1].to, '2026-07-12');
    });

    it('must gracefully fallback to bookings table when trailer_booked_dates view is missing or errors', async () => {
        let queriedFallbackTable = false;
        let capturedDisable = null;

        const { ctx } = loadBookingContext({
            flatpickr: (sel, cfg) => {
                capturedDisable = cfg.disable;
                return { destroy() {} };
            },
            supabaseClient: {
                rpc: () => Promise.resolve(),
                from: (table) => {
                    if (table === 'trailer_booked_dates') {
                        return {
                            select: () => ({
                                eq: () => Promise.resolve({
                                    data: null,
                                    error: { message: "relation 'trailer_booked_dates' does not exist", code: "42P01" }
                                })
                            })
                        };
                    }
                    if (table === 'bookings') {
                        queriedFallbackTable = true;
                        return {
                            select: () => ({
                                eq: () => ({
                                    in: (col, statuses) => {
                                        assert.strictEqual(col, 'status');
                                        assert.ok(statuses.includes('confirmed'));
                                        return Promise.resolve({
                                            data: [
                                                { start_date: '2026-08-15', end_date: '2026-08-20' }
                                            ],
                                            error: null
                                        });
                                    }
                                })
                            })
                        };
                    }
                    return {
                        select: () => ({
                            eq: () => ({
                                maybeSingle: () => Promise.resolve({ data: null }),
                                eq: () => Promise.resolve({ data: [] })
                            })
                        })
                    };
                }
            }
        });

        await ctx.openTrailerDetail(ctx.currentTrailer);

        assert.strictEqual(queriedFallbackTable, true, "La table de repli 'bookings' doit être interrogée");
        assert.strictEqual(capturedDisable.length, 1);
        assert.strictEqual(capturedDisable[0].from, '2026-08-15');
        assert.strictEqual(capturedDisable[0].to, '2026-08-20');
    });

    it('must initialize calendar cleanly with empty disabledDates when both view and fallback fail (offline/network error)', async () => {
        let capturedDisable = null;

        const { ctx } = loadBookingContext({
            flatpickr: (sel, cfg) => {
                capturedDisable = cfg.disable;
                return { destroy() {} };
            },
            supabaseClient: {
                rpc: () => Promise.resolve(),
                from: (table) => {
                    if (table === 'trailer_booked_dates') {
                        return {
                            select: () => ({
                                eq: () => Promise.reject(new Error("Network offline: view query failed"))
                            })
                        };
                    }
                    if (table === 'bookings') {
                        return {
                            select: () => ({
                                eq: () => ({
                                    in: () => Promise.reject(new Error("Network offline: fallback query failed"))
                                })
                            })
                        };
                    }
                    return {
                        select: () => ({
                            eq: () => ({
                                maybeSingle: () => Promise.resolve({ data: null }),
                                eq: () => Promise.resolve({ data: [] })
                            })
                        })
                    };
                }
            }
        });

        await assert.doesNotReject(async () => {
            await ctx.openTrailerDetail(ctx.currentTrailer);
        }, "openTrailerDetail doit être totalement résilient aux pannes réseau Supabase");

        assert.ok(Array.isArray(capturedDisable), "flatpickr.disable doit être un tableau");
        assert.strictEqual(capturedDisable.length, 0, "En mode hors-ligne, disabledDates doit être une liste vide sans lever d'exception");
    });
});
