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

describe('Tier 4: Trailer Publication Payload Structure Contract', () => {
    it('trailers.js handlePublish must preserve user location in newTrailer object payload', () => {
        const trailersCode = fs.readFileSync(path.join(jsDir, 'trailers.js'), 'utf8');

        // Analyse statique du bloc de création newTrailer dans handlePublish
        // Le payload doit inclure location: locationInput (ou location: ...) pour persister l'adresse saisie
        const newTrailerMatch = trailersCode.match(/const\s+newTrailer\s*=\s*\{([\s\S]*?)\};/);
        assert.ok(newTrailerMatch, 'trailers.js doit instancier un objet const newTrailer = { ... }');

        const payloadContent = newTrailerMatch[1];

        assert.match(
            payloadContent,
            /\blocation\s*:\s*/,
            "Anomalie BUG-06 : le payload 'newTrailer' dans trailers.js omet la propriété 'location: locationInput'. Seuls location_city/lat/lon sont renseignés."
        );
        assert.match(
            payloadContent,
            /\blocation_city\s*:\s*/,
            "Le payload 'newTrailer' doit contenir 'location_city'"
        );
        assert.match(
            payloadContent,
            /\blatitude\s*:\s*/,
            "Le payload 'newTrailer' doit contenir 'latitude'"
        );
        assert.match(
            payloadContent,
            /\blongitude\s*:\s*/,
            "Le payload 'newTrailer' doit contenir 'longitude'"
        );
    });
});

describe('Tier 4: MPA Trailer Edit Query Param Flow (louer-ma-remorque.html?edit=...)', () => {
    it('booking.js editTrailer must redirect to louer-ma-remorque.html?edit=${id} in MPA architecture', () => {
        const bookingCode = fs.readFileSync(path.join(jsDir, 'booking.js'), 'utf8');

        // Extraire la fonction editTrailer
        const editTrailerMatch = bookingCode.match(/function\s+editTrailer\s*\([^)]*\)\s*\{([\s\S]*?)\n\}/);
        assert.ok(editTrailerMatch, 'booking.js doit définir la fonction editTrailer()');

        const editTrailerBody = editTrailerMatch[1];

        // En architecture MPA, editTrailer doit naviguer vers louer-ma-remorque.html avec le paramètre ?edit=
        assert.match(
            editTrailerBody,
            /louer-ma-remorque\.html\?edit=/i,
            "editTrailer() doit rediriger vers 'louer-ma-remorque.html?edit=${trailerId}' au lieu de tenter une manipulation de formulaire locale sur profil.html"
        );
    });

    it('louer-ma-remorque.html or trailers.js must handle ?edit= query parameter to populate form', () => {
        const htmlContent = fs.readFileSync(path.join(siteWebDir, 'louer-ma-remorque.html'), 'utf8');
        const trailersCode = fs.readFileSync(path.join(jsDir, 'trailers.js'), 'utf8');

        const combinedCode = htmlContent + '\n' + trailersCode;

        // Vérifier la présence du parsing de l'URL pour le paramètre edit
        const parsesEditParam = /URLSearchParams[\s\S]*?\.get\(['"]edit['"]\)/i.test(combinedCode) ||
                                /urlParams\.get\(['"]edit['"]\)/i.test(combinedCode) ||
                                /searchParams\.get\(['"]edit['"]\)/i.test(combinedCode);

        assert.ok(
            parsesEditParam,
            "louer-ma-remorque.html ou trailers.js doit inspecter le paramètre URL ?edit= pour pré-remplir l'annonce en mode modification"
        );
    });
});

describe('Tier 4: MPA Category Filter Routing Contract', () => {
    it('core.js must invoke setFilter (not undefined filterByCategory) on remorques.html?category=...', () => {
        const coreCode = fs.readFileSync(path.join(jsDir, 'core.js'), 'utf8');

        // Vérifier la section de routage par catégorie dans core.js
        const routingSectionMatch = coreCode.match(/window\.location\.pathname\.includes\(['"]remorques\.html['"]\)[\s\S]*?loadTrailers\(\);/);
        assert.ok(routingSectionMatch, 'core.js doit comporter un bloc de routage pour remorques.html');

        const routingSection = routingSectionMatch[0];

        assert.doesNotMatch(
            routingSection,
            /filterByCategory\s*\(/,
            "Anomalie Feature 13 : core.js fait référence à la fonction inexistante 'filterByCategory' au lieu de 'setFilter'"
        );

        assert.match(
            routingSection,
            /setFilter\s*\(/,
            "core.js doit invoquer setFilter(category) lors de l'accès à remorques.html avec un paramètre ?category=..."
        );
    });
});

describe('Tier 4: Supabase Query Fallback & Offline Resilience', () => {
    it('analytics functions in core.js must not crash when supabaseClient is null', async () => {
        const coreCode = fs.readFileSync(path.join(jsDir, 'core.js'), 'utf8');
        const stub = () => {};

        const ctx = {
            window: { location: { pathname: '/', search: '' }, addEventListener: stub },
            document: { addEventListener: stub, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] },
            localStorage: { getItem: () => null, setItem: stub },
            sessionStorage: { getItem: () => null, setItem: stub },
            supabaseClient: null,
            currentUser: null,
            console: { log: stub, warn: stub, error: stub }
        };

        vm.createContext(ctx);
        vm.runInContext(coreCode, ctx);

        // logImpression et logClick ne doivent lever aucune exception quand supabaseClient est null
        await assert.doesNotReject(async () => {
            await ctx.logImpression('test-trailer-1');
        }, 'logImpression ne doit pas planter quand supabaseClient est null');

        await assert.doesNotReject(async () => {
            await ctx.logClick('test-trailer-1');
        }, 'logClick ne doit pas planter quand supabaseClient est null');
    });

    it('tracking.js startTracking must handle null supabaseClient gracefully', async () => {
        const trackingCode = fs.readFileSync(path.join(jsDir, 'tracking.js'), 'utf8');
        const stub = () => {};

        const ctx = {
            window: { location: { pathname: '/index.html', search: '' } },
            document: { addEventListener: stub, getElementById: () => null, createElement: () => ({ appendChild: stub }), body: { appendChild: stub } },
            localStorage: { getItem: () => 'accepted', setItem: stub },
            sessionStorage: { getItem: () => null, setItem: stub },
            crypto: { randomUUID: () => 'uuid-123' },
            supabaseClient: null,
            console: { log: stub, warn: stub, error: stub }
        };

        vm.createContext(ctx);
        vm.runInContext(trackingCode, ctx);

        await assert.doesNotReject(async () => {
            await ctx.startTracking();
        }, 'startTracking doit retourner immédiatement sans exception quand supabaseClient est null');
    });

    it('booking.js must provide fallback when trailer_booked_dates view is unavailable (Feature 19)', () => {
        const bookingCode = fs.readFileSync(path.join(jsDir, 'booking.js'), 'utf8');

        // Feature 19 : Quand la vue trailer_booked_dates échoue ou est absente sur Supabase,
        // booking.js doit prévoir un repli vers la table 'bookings' directement ou un catch résilient.
        const hasBookedDatesFallback = /from\(['"]trailer_booked_dates['"]\)[\s\S]*?from\(['"]bookings['"]\)/i.test(bookingCode) ||
                                       /trailer_booked_dates[\s\S]*?catch[\s\S]*?bookings/i.test(bookingCode);

        assert.ok(
            hasBookedDatesFallback,
            "Feature 19 : booking.js doit inclure une requête de repli vers la table 'bookings' si la vue 'trailer_booked_dates' est indisponible"
        );
    });
});
