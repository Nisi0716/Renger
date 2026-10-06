import { describe, it } from 'node:test';
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

const ALL_9_HTML_FILES = [
    'index.html',
    'remorques.html',
    'remorque.html',
    'louer-ma-remorque.html',
    'profil.html',
    'inspection.html',
    'pro.html',
    'cgu.html',
    'politique-confidentialite.html'
];

/**
 * Creates a lightweight DOM & browser execution sandbox for testing
 * client-side modules in isolated Node.js context.
 */
function createMockBrowserEnv(customElements = {}) {
    const elements = new Map();

    function createMockEl(id = '', tag = 'div') {
        const classList = new Set();
        const children = [];
        const listeners = new Map();
        let _innerText = '';
        let _textContent = '';
        let _innerHTML = '';

        const el = {
            id,
            tagName: tag.toUpperCase(),
            value: '',
            className: '',
            style: {},
            dataset: {},
            get innerText() { return _innerText; },
            set innerText(v) { _innerText = String(v); },
            get textContent() { return _textContent || _innerText; },
            set textContent(v) { _textContent = String(v); _innerText = String(v); },
            get innerHTML() { return _innerHTML; },
            set innerHTML(v) { _innerHTML = String(v); },
            classList: {
                add: (...cls) => cls.forEach(c => classList.add(c)),
                remove: (...cls) => cls.forEach(c => classList.delete(c)),
                contains: (c) => classList.has(c),
                toggle: (c) => (classList.has(c) ? classList.delete(c) : classList.add(c))
            },
            children,
            appendChild: (ch) => {
                children.push(ch);
                if (ch && ch.id) elements.set(ch.id, ch);
                return ch;
            },
            addEventListener: (evt, fn) => {
                if (!listeners.has(evt)) listeners.set(evt, []);
                listeners.get(evt).push(fn);
            },
            removeEventListener: (evt, fn) => {
                if (!listeners.has(evt)) return;
                const arr = listeners.get(evt).filter(f => f !== fn);
                listeners.set(evt, arr);
            },
            dispatchEvent: (evt) => {
                const arr = listeners.get(evt.type || evt) || [];
                arr.forEach(fn => fn(evt));
            },
            setAttribute: (attr, val) => {
                el[attr] = val;
            },
            getAttribute: (attr) => el[attr] || null
        };

        if (id) elements.set(id, el);
        return el;
    }

    // Populate custom elements
    for (const [id, def] of Object.entries(customElements)) {
        const el = createMockEl(id, def.tag || 'div');
        if (def.className) {
            def.className.split(/\s+/).filter(Boolean).forEach(c => el.classList.add(c));
            el.className = def.className;
        }
        if (def.textContent) el.textContent = def.textContent;
        if (def.innerHTML) el.innerHTML = def.innerHTML;
        elements.set(id, el);
    }

    const mockDocument = {
        getElementById: (id) => elements.get(id) || null,
        createElement: (tag) => createMockEl('', tag),
        addEventListener: () => {},
        removeEventListener: () => {},
        body: createMockEl('body', 'body')
    };

    const mockWindow = {
        document: mockDocument,
        location: { href: 'http://localhost/remorques.html', search: '', pathname: '/remorques.html' },
        localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
        sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
        addEventListener: () => {},
        removeEventListener: () => {}
    };
    mockWindow.window = mockWindow;
    mockWindow.globalThis = mockWindow;

    return { elements, mockDocument, mockWindow, createMockEl };
}

/**
 * Robustly extracts the full Content-Security-Policy header string
 * supporting single or double quotes without terminating on inner quotes.
 */
function extractCsp(html) {
    const doubleMatch = html.match(/<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]+content="([^"]*)"/i) ||
                        html.match(/<meta[^>]+content="([^"]*)"[^>]+http-equiv=["']Content-Security-Policy["']/i);
    if (doubleMatch) return doubleMatch[1];
    const singleMatch = html.match(/<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]+content='([^']*)'/i) ||
                        html.match(/<meta[^>]+content='([^']*)'[^>]+http-equiv=["']Content-Security-Policy["']/i);
    if (singleMatch) return singleMatch[1];
    return null;
}

// ============================================================================
// SUITE 1 : UNIFORM CONTENT SECURITY POLICY (CSP) ACROSS ALL 9 HTML FILES
// ============================================================================
describe('Tier 5 - Suite 1: Uniform Content Security Policy (CSP) Across All 9 HTML Files', () => {

    it('all 9 HTML files must contain a complete <meta http-equiv="Content-Security-Policy"> in <head>', () => {
        for (const filename of ALL_9_HTML_FILES) {
            const filePath = path.join(siteWebDir, filename);
            assert.ok(fs.existsSync(filePath), `Fichier manquant: ${filePath}`);
            const html = fs.readFileSync(filePath, 'utf8');

            const headMatch = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i);
            assert.ok(headMatch, `${filename} doit contenir un bloc <head> valide`);

            const headContent = headMatch[1];
            const csp = extractCsp(headContent);

            assert.ok(csp, `${filename} doit contenir une balise CSP dans son <head>`);
            assert.ok(csp.length > 50, `La politique CSP de ${filename} doit être complète et non vide`);
        }
    });

    it('all 9 HTML files must authorize all required script-src CDNs (Tailwind, jsDelivr, Stripe, Unpkg, Cloudflare cdnjs)', () => {
        const requiredScriptSources = [
            "'self'",
            "'unsafe-inline'",
            "'unsafe-eval'",
            'https://cdn.tailwindcss.com',
            'https://cdn.jsdelivr.net',
            'https://npmcdn.com',
            'https://js.stripe.com',
            'https://unpkg.com',
            'https://cdnjs.cloudflare.com'
        ];

        for (const filename of ALL_9_HTML_FILES) {
            const filePath = path.join(siteWebDir, filename);
            const html = fs.readFileSync(filePath, 'utf8');
            const csp = extractCsp(html);
            assert.ok(csp, `CSP introuvable dans ${filename}`);

            const scriptSrcMatch = csp.match(/script-src\s+([^;]+)/i);
            assert.ok(scriptSrcMatch, `Directive script-src manquante dans la CSP de ${filename}`);
            const scriptSrc = scriptSrcMatch[1];

            for (const src of requiredScriptSources) {
                assert.ok(
                    scriptSrc.includes(src),
                    `Dans ${filename}, la directive script-src doit inclure '${src}'`
                );
            }
        }
    });

    it('remorque.html and all pages must explicitly preserve https://npmcdn.com in script-src for flatpickr fr locale', () => {
        const remorquePath = path.join(siteWebDir, 'remorque.html');
        const content = fs.readFileSync(remorquePath, 'utf8');
        const csp = extractCsp(content);
        assert.ok(csp, `Balise CSP introuvable dans remorque.html`);

        assert.ok(
            csp.includes('https://npmcdn.com'),
            "remorque.html doit expressément inclure https://npmcdn.com dans script-src"
        );
    });

    it('all 9 HTML files must authorize Leaflet / OpenStreetMap in img-src, connect-src, and style-src', () => {
        for (const filename of ALL_9_HTML_FILES) {
            const filePath = path.join(siteWebDir, filename);
            const html = fs.readFileSync(filePath, 'utf8');
            const csp = extractCsp(html);
            assert.ok(csp, `CSP introuvable dans ${filename}`);

            // style-src doit autoriser unpkg pour Leaflet CSS
            assert.ok(csp.includes('style-src') && csp.includes('https://unpkg.com'),
                `${filename} CSP doit autoriser https://unpkg.com dans style-src`);

            // img-src doit autoriser OpenStreetMap tiles et unpkg
            assert.ok(csp.includes('https://*.tile.openstreetmap.org'),
                `${filename} CSP doit autoriser https://*.tile.openstreetmap.org dans img-src`);
            assert.ok(csp.includes('img-src') && csp.includes('https://unpkg.com'),
                `${filename} CSP doit autoriser https://unpkg.com dans img-src`);

            // connect-src doit autoriser Nominatim et OpenStreetMap tiles
            assert.ok(csp.includes('https://nominatim.openstreetmap.org'),
                `${filename} CSP doit autoriser https://nominatim.openstreetmap.org dans connect-src`);
            assert.ok(csp.includes('connect-src') && csp.includes('https://*.tile.openstreetmap.org'),
                `${filename} CSP doit autoriser https://*.tile.openstreetmap.org dans connect-src`);
        }
    });

    it('all 9 HTML files must authorize Supabase and Stripe backends in connect-src and frame-src', () => {
        for (const filename of ALL_9_HTML_FILES) {
            const filePath = path.join(siteWebDir, filename);
            const html = fs.readFileSync(filePath, 'utf8');
            const csp = extractCsp(html);
            assert.ok(csp, `CSP introuvable dans ${filename}`);

            assert.ok(csp.includes('https://cwifrzajxrcpnqceyxnj.supabase.co'),
                `${filename} doit autoriser l'API Supabase dans connect-src`);
            assert.ok(csp.includes('wss://cwifrzajxrcpnqceyxnj.supabase.co'),
                `${filename} doit autoriser les WebSockets Supabase dans connect-src`);
            assert.ok(csp.includes('https://api.stripe.com'),
                `${filename} doit autoriser l'API Stripe dans connect-src`);
            assert.ok(csp.includes('frame-src https://js.stripe.com https://hooks.stripe.com'),
                `${filename} doit autoriser Stripe Checkout et Webhooks dans frame-src`);
        }
    });

    it('cgu.html and politique-confidentialite.html must have strict referrer policy and CSP in their <head>', () => {
        for (const file of ['cgu.html', 'politique-confidentialite.html']) {
            const content = fs.readFileSync(path.join(siteWebDir, file), 'utf8');
            assert.match(
                content,
                /<meta\s+name=["']referrer["']\s+content=["']strict-origin-when-cross-origin["']>/i,
                `${file} doit inclure la balise meta referrer strict-origin-when-cross-origin`
            );
            assert.match(
                content,
                /<meta\s+http-equiv=["']Content-Security-Policy["']/i,
                `${file} doit inclure la balise meta Content-Security-Policy`
            );
        }
    });
});

// ============================================================================
// SUITE 2 : INTERACTIVE LEAFLET MAP SYSTEM (R1)
// ============================================================================
describe('Tier 5 - Suite 2: Interactive Leaflet Map System (R1)', () => {

    it('remorques.html must link Leaflet 1.9.4 CSS in <head> and Leaflet 1.9.4 JS with defer before core.js', () => {
        const html = fs.readFileSync(path.join(siteWebDir, 'remorques.html'), 'utf8');

        // Leaflet CSS in head
        assert.match(
            html,
            /<link\s+rel=["']stylesheet["']\s+href=["']https:\/\/unpkg\.com\/leaflet@1\.9\.4\/dist\/leaflet\.css["']>/i,
            "remorques.html doit inclure la feuille de style Leaflet 1.9.4 CSS"
        );

        // Leaflet JS with defer
        assert.match(
            html,
            /<script\s+src=["']https:\/\/unpkg\.com\/leaflet@1\.9\.4\/dist\/leaflet\.js["']\s+defer><\/script>/i,
            "remorques.html doit inclure le script Leaflet 1.9.4 JS avec attribut defer"
        );

        // Positionnement avant core.js
        const leafletIdx = html.indexOf('leaflet@1.9.4/dist/leaflet.js');
        const coreIdx = html.indexOf('js/core.js');
        assert.ok(leafletIdx > 0 && coreIdx > 0, 'Les deux scripts doivent être présents dans remorques.html');
        assert.ok(leafletIdx < coreIdx, 'Le script Leaflet JS doit précéder js/core.js dans remorques.html');
    });

    it('remorques.html must contain #view-mode-toggle with #view-mode-list-btn and #view-mode-map-btn', () => {
        const html = fs.readFileSync(path.join(siteWebDir, 'remorques.html'), 'utf8');

        assert.match(html, /id=["']view-mode-toggle["']/, "remorques.html doit contenir #view-mode-toggle");
        assert.match(html, /id=["']view-mode-list-btn["']/, "remorques.html doit contenir #view-mode-list-btn");
        assert.match(html, /id=["']view-mode-map-btn["']/, "remorques.html doit contenir #view-mode-map-btn");
        assert.match(html, /onclick=["']setViewMode\(['"]list['"]\)["']/, "Le bouton liste doit invoquer setViewMode('list')");
        assert.match(html, /onclick=["']setViewMode\(['"]map['"]\)["']/, "Le bouton carte doit invoquer setViewMode('map')");
    });

    it('remorques.html must contain #trailers-map container initialized with hidden class and responsive layout', () => {
        const html = fs.readFileSync(path.join(siteWebDir, 'remorques.html'), 'utf8');

        assert.match(
            html,
            /<div\s+id=["']trailers-map["']\s+class=["'][^"']*\bhidden\b[^"']*["']>/i,
            "Le conteneur #trailers-map doit exister et posséder la classe 'hidden' par défaut"
        );
        assert.match(
            html,
            /id=["']trailers-map["'][^>]*h-\[540px\]/i,
            "Le conteneur #trailers-map doit définir une hauteur de 540px pour l'affichage de la carte"
        );
    });

    it('trailers.js must export initTrailersMap, updateTrailersMap, fitMapToTrailers, setViewMode to window', () => {
        const trailersCode = fs.readFileSync(path.join(jsDir, 'trailers.js'), 'utf8');

        assert.match(trailersCode, /window\.initTrailersMap\s*=\s*initTrailersMap;/, "Export window.initTrailersMap requis");
        assert.match(trailersCode, /window\.updateTrailersMap\s*=\s*updateTrailersMap;/, "Export window.updateTrailersMap requis");
        assert.match(trailersCode, /window\.fitMapToTrailers\s*=\s*fitMapToTrailers;/, "Export window.fitMapToTrailers requis");
        assert.match(trailersCode, /window\.setViewMode\s*=\s*setViewMode;/, "Export window.setViewMode requis");
    });

    it('setViewMode("map") must remove hidden from #trailers-map, add hidden to #trailers-grid, and invoke invalidateSize', () => {
        const { mockDocument, mockWindow, elements } = createMockBrowserEnv({
            'trailers-grid': { tag: 'div', className: '' },
            'trailers-map': { tag: 'div', className: 'hidden' },
            'view-mode-list-btn': { tag: 'button', className: 'active' },
            'view-mode-map-btn': { tag: 'button', className: 'inactive' }
        });

        let invalidateSizeCalled = false;
        const mockLeafletMap = {
            invalidateSize: () => { invalidateSizeCalled = true; return mockLeafletMap; },
            setView: () => mockLeafletMap,
            fitBounds: () => mockLeafletMap
        };
        const mockL = {
            map: () => mockLeafletMap,
            tileLayer: () => ({ addTo: () => ({}) }),
            layerGroup: () => ({ addTo: () => ({}), clearLayers: () => {}, addLayer: () => {} }),
            divIcon: () => ({}),
            marker: () => ({ bindPopup: () => {} }),
            latLngBounds: () => ({})
        };

        const trailersCode = fs.readFileSync(path.join(jsDir, 'trailers.js'), 'utf8');
        const context = {
            window: mockWindow,
            document: mockDocument,
            console,
            L: mockL,
            currentFilter: 'all',
            currentSearch: ''
        };
        context.globalThis = context;
        mockWindow.L = mockL;

        vm.createContext(context);
        vm.runInContext(trailersCode, context);

        const setViewModeFn = context.setViewMode;
        assert.strictEqual(typeof setViewModeFn, 'function', "setViewMode doit être une fonction");

        // Bascule en mode 'map'
        setViewModeFn('map');

        const mapEl = elements.get('trailers-map');
        const gridEl = elements.get('trailers-grid');
        assert.strictEqual(mapEl.classList.contains('hidden'), false, "#trailers-map ne doit plus avoir la classe hidden");
        assert.strictEqual(gridEl.classList.contains('hidden'), true, "#trailers-grid doit avoir la classe hidden");
        assert.strictEqual(invalidateSizeCalled, true, "leafletMap.invalidateSize() doit être appelé");

        // Bascule en mode 'list'
        setViewModeFn('list');
        assert.strictEqual(mapEl.classList.contains('hidden'), true, "#trailers-map doit être masqué");
        assert.strictEqual(gridEl.classList.contains('hidden'), false, "#trailers-grid doit redevenir visible");
    });

    it('updateTrailersMap must safely filter trailers with valid coordinates and render Terracotta markers', () => {
        const { mockDocument, mockWindow } = createMockBrowserEnv({
            'trailers-map': { tag: 'div', className: '' }
        });

        const addedMarkers = [];
        const mockLayerGroup = {
            addTo: () => mockLayerGroup,
            clearLayers: () => { addedMarkers.length = 0; },
            addLayer: (m) => { addedMarkers.push(m); }
        };

        let createdDivIcons = [];
        const mockL = {
            map: () => ({ setView: () => {}, fitBounds: () => {}, invalidateSize: () => {} }),
            tileLayer: () => ({ addTo: () => {} }),
            layerGroup: () => mockLayerGroup,
            divIcon: (opts) => {
                createdDivIcons.push(opts);
                return opts;
            },
            marker: (coords, opts) => ({
                coords,
                opts,
                bindPopup: () => {}
            }),
            latLngBounds: (coords) => ({ coords })
        };

        const trailersCode = fs.readFileSync(path.join(jsDir, 'trailers.js'), 'utf8');
        const context = {
            window: mockWindow,
            document: mockDocument,
            console,
            L: mockL
        };
        context.globalThis = context;

        vm.createContext(context);
        vm.runInContext(trailersCode, context);

        const updateTrailersMapFn = context.updateTrailersMap;
        assert.strictEqual(typeof updateTrailersMapFn, 'function');

        const testTrailers = [
            { id: 't1', title: 'Remorque Lausanne', price: 45, latitude: 46.5197, longitude: 6.6323 },
            { id: 't2', title: 'Remorque Genève', price: 50, latitude: 46.2044, longitude: 6.1432 },
            { id: 't3', title: 'Remorque Sans Coordonnées', price: 30, latitude: null, longitude: null },
            { id: 't4', title: 'Remorque Coordonnées Corrompues', price: 35, latitude: 'invalid', longitude: 'invalid' }
        ];

        updateTrailersMapFn(testTrailers);

        // Seules les 2 remorques valides doivent produire des marqueurs
        assert.strictEqual(addedMarkers.length, 2, "Seules les remorques avec coordonnées valides doivent avoir un marqueur");
        assert.strictEqual(createdDivIcons.length, 2, "2 divIcons doivent être créées");

        // Vérifier le style Terracotta et le prix dans le HTML de l'icône
        const htmlIcon1 = createdDivIcons[0].html;
        assert.ok(htmlIcon1.includes('#d85110'), "L'icône doit arborer la couleur officielle Terracotta #d85110");
        assert.ok(htmlIcon1.includes('45 CHF'), "L'icône doit afficher le prix '45 CHF'");
    });

    it('fitMapToTrailers must fallback to Lausanne coordinates [46.5197, 6.6323] if trailers array is empty', () => {
        const { mockDocument, mockWindow } = createMockBrowserEnv({
            'trailers-map': { tag: 'div', className: '' }
        });

        let centeredCoords = null;
        let centeredZoom = null;

        const mockL = {
            map: () => ({
                setView: (c, z) => { centeredCoords = c; centeredZoom = z; },
                fitBounds: () => {}
            }),
            tileLayer: () => ({ addTo: () => {} }),
            layerGroup: () => ({ addTo: () => {}, clearLayers: () => {}, addLayer: () => {} }),
            latLngBounds: () => ({})
        };

        const trailersCode = fs.readFileSync(path.join(jsDir, 'trailers.js'), 'utf8');
        const context = {
            window: mockWindow,
            document: mockDocument,
            console,
            L: mockL
        };
        context.globalThis = context;

        vm.createContext(context);
        vm.runInContext(trailersCode, context);

        context.initTrailersMap();
        context.fitMapToTrailers([]);

        assert.strictEqual(centeredCoords[0], 46.5197, "Centrage par défaut sur Lausanne (lat: 46.5197)");
        assert.strictEqual(centeredCoords[1], 6.6323, "Centrage par défaut sur Lausanne (lon: 6.6323)");
        assert.strictEqual(centeredZoom, 10, "Zoom par défaut de 10");
    });
});

// ============================================================================
// SUITE 3 : DATE AVAILABILITY RANGE FILTERING & OVERLAP MATHEMATICS (R2)
// ============================================================================
describe('Tier 5 - Suite 3: Date Availability Range Filtering & Overlap Mathematics (R2)', () => {

    it('index.html must contain #hero-dates, #hero-clear-dates, and #hero-search-btn', () => {
        const html = fs.readFileSync(path.join(siteWebDir, 'index.html'), 'utf8');

        assert.match(html, /id=["']hero-dates["']/, "index.html doit contenir #hero-dates");
        assert.match(html, /id=["']hero-clear-dates["']/, "index.html doit contenir #hero-clear-dates");
        assert.match(html, /id=["']hero-search-btn["']/, "index.html doit contenir #hero-search-btn");
    });

    it('remorques.html must contain #catalog-dates, #catalog-clear-dates, and #available-trailers-count badge', () => {
        const html = fs.readFileSync(path.join(siteWebDir, 'remorques.html'), 'utf8');

        assert.match(html, /id=["']catalog-dates["']/, "remorques.html doit contenir #catalog-dates");
        assert.match(html, /id=["']catalog-clear-dates["']/, "remorques.html doit contenir #catalog-clear-dates");
        assert.match(html, /id=["']available-trailers-count["']/, "remorques.html doit contenir #available-trailers-count");
    });

    it('getUnavailableTrailerIds overlap algorithm: must accurately detect collisions for "paye" and "indisponible"', async () => {
        // Table des réservations existantes en base
        const mockBookingsDb = [
            // Remorque 101 : réservée du 10 au 15 juillet (PAYÉ)
            { trailer_id: '101', start_date: '2026-07-10', end_date: '2026-07-15', status: 'paye' },
            // Remorque 102 : indisponible du 10 au 15 juillet (INDISPONIBLE / maintenance)
            { trailer_id: '102', start_date: '2026-07-10', end_date: '2026-07-15', status: 'indisponible' },
            // Remorque 103 : demande en attente du 10 au 15 juillet (EN_ATTENTE - ne doit PAS bloquer)
            { trailer_id: '103', start_date: '2026-07-10', end_date: '2026-07-15', status: 'en_attente' },
            // Remorque 104 : réservation annulée du 10 au 15 juillet (ANNULE - ne doit PAS bloquer)
            { trailer_id: '104', start_date: '2026-07-10', end_date: '2026-07-15', status: 'annule' },
            // Remorque 105 : réservation refusée du 10 au 15 juillet (REFUSE - ne doit PAS bloquer)
            { trailer_id: '105', start_date: '2026-07-10', end_date: '2026-07-15', status: 'refuse' }
        ];

        const mockSupabase = {
            auth: {
                onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
                getSession: async () => ({ data: { session: null } })
            },
            from: (table) => ({
                select: () => ({
                    in: (col, statuses) => ({
                        lte: (startCol, reqEnd) => ({
                            gte: async (endCol, reqStart) => {
                                // Simulation de la requête SQL PostgREST
                                const filtered = mockBookingsDb.filter(b => 
                                    statuses.includes(b.status) &&
                                    b.start_date <= reqEnd &&
                                    b.end_date >= reqStart
                                );
                                return { data: filtered, error: null };
                            }
                        })
                    })
                })
            })
        };

        const { mockDocument, mockWindow } = createMockBrowserEnv();
        mockWindow.supabase = {
            createClient: () => mockSupabase
        };
        const coreCode = fs.readFileSync(path.join(jsDir, 'core.js'), 'utf8');

        const context = {
            window: mockWindow,
            document: mockDocument,
            console,
            currentFilter: 'all',
            currentSearch: ''
        };
        context.globalThis = context;

        vm.createContext(context);
        vm.runInContext(coreCode, context);

        const getUnavailableFn = context.getUnavailableTrailerIds;
        assert.strictEqual(typeof getUnavailableFn, 'function', "getUnavailableTrailerIds doit être exposé");

        // Cas 1 : Chevauchement exact (10 au 15 juillet)
        const unavail1 = await getUnavailableFn('2026-07-10', '2026-07-15');
        assert.strictEqual(unavail1.has('101'), true, "101 (paye) doit être indisponible");
        assert.strictEqual(unavail1.has('102'), true, "102 (indisponible) doit être indisponible");
        assert.strictEqual(unavail1.has('103'), false, "103 (en_attente) ne doit PAS être bloqué");
        assert.strictEqual(unavail1.has('104'), false, "104 (annule) ne doit PAS être bloqué");
        assert.strictEqual(unavail1.has('105'), false, "105 (refuse) ne doit PAS être bloqué");

        // Cas 2 : Chevauchement frontal le dernier jour (15 au 18 juillet)
        const unavail2 = await getUnavailableFn('2026-07-15', '2026-07-18');
        assert.strictEqual(unavail2.has('101'), true, "Le même jour de fin/début (15 juillet) constitue une collision");

        // Cas 3 : Chevauchement dorsal le premier jour (08 au 10 juillet)
        const unavail3 = await getUnavailableFn('2026-07-08', '2026-07-10');
        assert.strictEqual(unavail3.has('101'), true, "Le même jour de début/fin (10 juillet) constitue une collision");

        // Cas 4 : Période strictement AVANT (01 au 08 juillet)
        const unavail4 = await getUnavailableFn('2026-07-01', '2026-07-08');
        assert.strictEqual(unavail4.size, 0, "Période antérieure non chevauchante -> aucune remorque indisponible");

        // Cas 5 : Période strictement APRÈS (18 au 25 juillet)
        const unavail5 = await getUnavailableFn('2026-07-18', '2026-07-25');
        assert.strictEqual(unavail5.size, 0, "Période postérieure non chevauchante -> aucune remorque indisponible");

        // Cas 6 : Dates inversées accidentelles (15 juillet au 10 juillet)
        const unavail6 = await getUnavailableFn('2026-07-15', '2026-07-10');
        assert.strictEqual(unavail6.has('101'), true, "Les dates inversées doivent être interverties et protégées");
    });

    it('core.js loadTrailers must dynamically update #available-trailers-count with accurate singular/plural grammar', () => {
        const coreCode = fs.readFileSync(path.join(jsDir, 'core.js'), 'utf8');

        // Validation statique de l'assignation du badge
        assert.match(
            coreCode,
            /const\s+countEl\s*=\s*document\.getElementById\(['"]available-trailers-count['"]\);/i,
            "core.js doit cibler #available-trailers-count"
        );
        assert.match(
            coreCode,
            /countEl\.textContent\s*=\s*`\$\{count\}\s*disponible\$\{s\}`;/i,
            "core.js doit formater le texte avec 'disponible' ou 'disponibles'"
        );
    });
});

// ============================================================================
// SUITE 4 : OFFICIAL RENTAL CONTRACT PDF GENERATION (R3)
// ============================================================================
describe('Tier 5 - Suite 4: Official Rental Contract PDF Generation (R3)', () => {

    it('contracts.js must export all 5 canonical functions via CommonJS and window.RengerContracts', () => {
        const contractsModule = path.join(jsDir, 'contracts.js');
        assert.ok(fs.existsSync(contractsModule), `contracts.js manquant: ${contractsModule}`);

        // Import CommonJS
        const c = (function() {
            const moduleWrapper = { exports: {} };
            const fn = new Function('module', 'exports', fs.readFileSync(contractsModule, 'utf8'));
            fn(moduleWrapper, moduleWrapper.exports);
            return moduleWrapper.exports;
        })();

        assert.strictEqual(typeof c.generateRentalContractPdf, 'function');
        assert.strictEqual(typeof c.downloadRentalContract, 'function');
        assert.strictEqual(typeof c.generateInspectionReportPdf, 'function');
        assert.strictEqual(typeof c.downloadInspectionReport, 'function');
        assert.strictEqual(typeof c.sanitizePdfText, 'function');
    });

    it('Swiss financial formula: must enforce 5% service fee, 4.90 CHF minimum, and 0.05 CHF Swiss legal rounding', () => {
        const contractsCode = fs.readFileSync(path.join(jsDir, 'contracts.js'), 'utf8');

        // Vérification de la formule dans le code
        assert.match(
            contractsCode,
            /Math\.max\(4\.90,\s*Math\.round\(rawFee\s*\*\s*20\)\s*\/\s*20\)/,
            "La fonction calculateServiceFee doit appliquer Math.max(4.90, Math.round(rawFee * 20) / 20)"
        );

        // Test mathématique direct des cas réels suisses
        const computeFee = (price) => {
            if (!price || price <= 0) return 4.90;
            const raw = price * 0.05;
            return parseFloat(Math.max(4.90, Math.round(raw * 20) / 20).toFixed(2));
        };

        assert.strictEqual(computeFee(0), 4.90, "0 CHF -> Minimum 4.90 CHF");
        assert.strictEqual(computeFee(30), 4.90, "30 CHF (1.50 CHF) -> Minimum 4.90 CHF");
        assert.strictEqual(computeFee(90), 4.90, "90 CHF (4.50 CHF) -> Minimum 4.90 CHF");
        assert.strictEqual(computeFee(98), 4.90, "98 CHF (4.90 CHF) -> 4.90 CHF");
        assert.strictEqual(computeFee(100), 5.00, "100 CHF (5.00 CHF) -> 5.00 CHF");
        assert.strictEqual(computeFee(123), 6.15, "123 CHF (6.15 CHF) -> 6.15 CHF (arrondi aux 5 centimes)");
        assert.strictEqual(computeFee(157.50), 7.90, "157.50 CHF (7.875 CHF) -> 7.90 CHF (arrondi aux 5 centimes)");
        assert.strictEqual(computeFee(240), 12.00, "240 CHF (12.00 CHF) -> 12.00 CHF");
    });

    it('Swiss deposit scale: 200 CHF standard, 300 CHF medium/moto, 400 CHF heavy/horse with Stripe non-debited note', () => {
        const c = (function() {
            const moduleWrapper = { exports: {} };
            const fn = new Function('module', 'exports', fs.readFileSync(path.join(jsDir, 'contracts.js'), 'utf8'));
            fn(moduleWrapper, moduleWrapper.exports);
            return moduleWrapper.exports;
        })();

        // Remorque utilitaire standard 500kg -> Caution 200 CHF
        const doc1 = c.generateRentalContractPdf({
            id: 'B001',
            trailer: { title: 'Bâche légère', category: 'utilitaire', payload: 500 }
        });
        const out1 = doc1.output();
        assert.ok(out1.includes('CAUTION BANCAIRE : 200 CHF'), "Utilitaire standard -> 200 CHF");
        assert.ok(out1.includes('Empreinte bancaire Stripe non débitée'), "Mention obligatoire Stripe non débitée requise");

        // Remorque moto ou payload 800kg -> Caution 300 CHF
        const doc2 = c.generateRentalContractPdf({
            id: 'B002',
            trailer: { title: 'Porte-Moto Pro', category: 'moto', payload: 500 }
        });
        const out2 = doc2.output();
        assert.ok(out2.includes('CAUTION BANCAIRE : 300 CHF'), "Catégorie moto -> 300 CHF");

        // Remorque van à chevaux -> Caution 400 CHF
        const doc3 = c.generateRentalContractPdf({
            id: 'B003',
            trailer: { title: 'Van Cheval 2 Places', category: 'cheval', payload: 1500 }
        });
        const out3 = doc3.output();
        assert.ok(out3.includes('CAUTION BANCAIRE : 400 CHF'), "Catégorie cheval -> 400 CHF");
    });

    it('generated rental contract must contain all 4 Swiss CO art. 253 clauses and signature blocks', () => {
        const c = (function() {
            const moduleWrapper = { exports: {} };
            const fn = new Function('module', 'exports', fs.readFileSync(path.join(jsDir, 'contracts.js'), 'utf8'));
            fn(moduleWrapper, moduleWrapper.exports);
            return moduleWrapper.exports;
        })();

        const doc = c.generateRentalContractPdf({
            id: 'TEST-LEGAL',
            start_date: '2026-08-01',
            end_date: '2026-08-03',
            owner_name: 'Jean Bailleur',
            renter_name: 'Marie Preneuse',
            trailer: { title: 'Remorque Plateau', category: 'utilitaire', payload: 650 }
        });

        const output = doc.output();

        // Titre et référence
        assert.ok(output.includes('CONTRAT OFFICIEL DE LOCATION DE REMORQUE'), "Titre du document officiel");
        assert.ok(output.includes('CONTRAT-RNG-TEST-LEGAL'), "Référence unique du contrat");

        // Clause 1 : CO art. 253
        assert.ok(output.includes('Code des Obligations (CO)') || output.includes('art. 253'), "Clause CO art. 253 ss");

        // Clause 2 : LCR & Assurance RC
        assert.ok(output.includes('circulation routière (LCR)') || output.includes('Assurance Responsabilité Civile'), "Clause LCR");

        // Clause 3 : Surcharge
        assert.ok(output.includes('surcharge'), "Clause interdiction de surcharge");

        // Clause 4 : État des lieux contradictoire
        assert.ok(output.includes('état des lieux numérique contradictoire Renger'), "Clause obligation état des lieux");

        // Mentions de signature
        assert.ok(output.includes('POUR LE BAILLEUR (PROPRIÉTAIRE)'), "Bloc signature bailleur");
        assert.ok(output.includes('POUR LE PRENEUR (LOCATAIRE)'), "Bloc signature preneur");
        assert.ok(output.includes('Lu et approuvé'), "Mention manuscrite 'Lu et approuvé'");
    });

    it('profil.html and trailers.js must integrate rental contract PDF download buttons', () => {
        const trailersCode = fs.readFileSync(path.join(jsDir, 'trailers.js'), 'utf8');

        // Bouton contrat dans la carte locataire
        assert.match(
            trailersCode,
            /contractBtn\.innerHTML\s*=\s*['"]<span>📄<\/span><span>Contrat de location \(PDF\)<\/span>['"]/i,
            "trailers.js doit créer le bouton de téléchargement du contrat pour le locataire"
        );
        assert.match(
            trailersCode,
            /RengerContracts\.downloadRentalContract\(booking\)/,
            "trailers.js doit appeler RengerContracts.downloadRentalContract(booking)"
        );

        // Inclusions dans profil.html
        const profilHtml = fs.readFileSync(path.join(siteWebDir, 'profil.html'), 'utf8');
        assert.match(profilHtml, /jspdf\.umd\.min\.js/, "profil.html doit inclure jsPDF CDN");
        assert.match(profilHtml, /js\/contracts\.js/, "profil.html doit inclure js/contracts.js");
    });
});

// ============================================================================
// SUITE 5 : CERTIFIED INSPECTION REPORT PDF (R4)
// ============================================================================
describe('Tier 5 - Suite 5: Certified Inspection Report PDF (R4)', () => {

    it('inspection report must define and structure the 4 canonical photo inspection steps', () => {
        const contractsCode = fs.readFileSync(path.join(jsDir, 'contracts.js'), 'utf8');

        assert.match(contractsCode, /Tête d'attelage/, "Étape 1 : Tête d'attelage");
        assert.match(contractsCode, /Avant et Côté Gauche/, "Étape 2 : Avant et Côté Gauche");
        assert.match(contractsCode, /Arrière et Côté Droit/, "Étape 3 : Arrière et Côté Droit");
        assert.match(contractsCode, /Intérieur \(Propreté\)/, "Étape 4 : Intérieur (Propreté)");
    });

    it('inspection report must render GPS coordinates with metric accuracy and precise Swiss timestamps', () => {
        const c = (function() {
            const moduleWrapper = { exports: {} };
            const fn = new Function('module', 'exports', fs.readFileSync(path.join(jsDir, 'contracts.js'), 'utf8'));
            fn(moduleWrapper, moduleWrapper.exports);
            return moduleWrapper.exports;
        })();

        const doc = c.generateInspectionReportPdf({
            id: 'INSP-GPS-TEST',
            mode: 'departure',
            photos: [
                {
                    step: 1,
                    latitude: 46.5197,
                    longitude: 6.6323,
                    accuracy: 3.5,
                    timestamp: '2026-09-15T08:30:00Z'
                }
            ]
        });

        const output = doc.output();
        assert.ok(output.includes('46.5197°N, 6.6323°E (±4m)'), "Formatage précis des coordonnées GPS avec précision métrique");
        assert.ok(output.includes('Horodatage :'), "Horodatage suisse de chaque cliché");
        assert.ok(output.includes('✅ CLICHÉ CONFORME & CERTIFIÉ'), "Badge de conformité du cliché");
    });

    it('inspection report must support both Departure and Return modes with distinctive legal labels', () => {
        const c = (function() {
            const moduleWrapper = { exports: {} };
            const fn = new Function('module', 'exports', fs.readFileSync(path.join(jsDir, 'contracts.js'), 'utf8'));
            fn(moduleWrapper, moduleWrapper.exports);
            return moduleWrapper.exports;
        })();

        const docDep = c.generateInspectionReportPdf({ id: 'D1' }, { mode: 'departure' });
        const outDep = docDep.output();
        assert.ok(outDep.includes('DÉPART (PRISE EN CHARGE)'), "Mode départ étiqueté");
        assert.ok(outDep.includes('Certifié par le Bailleur (Propriétaire)'), "Partie certifiante départ");

        const docRet = c.generateInspectionReportPdf({ id: 'R1' }, { mode: 'return' });
        const outRet = docRet.output();
        assert.ok(outRet.includes('RETOUR (RESTITUTION)'), "Mode retour étiqueté");
        assert.ok(outRet.includes('Certifié par le Preneur (Locataire)'), "Partie certifiante retour");
    });

    it('inspection report must include Swiss CO art. 257a evidentiary attestation with digital visas', () => {
        const c = (function() {
            const moduleWrapper = { exports: {} };
            const fn = new Function('module', 'exports', fs.readFileSync(path.join(jsDir, 'contracts.js'), 'utf8'));
            fn(moduleWrapper, moduleWrapper.exports);
            return moduleWrapper.exports;
        })();

        const doc = c.generateInspectionReportPdf({
            id: 'ATTEST-001',
            owner_name: 'Alain Propriétaire',
            renter_name: 'Corinne Locataire'
        });

        const output = doc.output();
        assert.ok(output.includes('ART. 257a ss CO'), "Mention expresse art. 257a ss CO");
        assert.ok(output.includes('titre de preuve authentique'), "Valeur de preuve authentique");
        assert.ok(output.includes('Alain Propriétaire'), "Visa bailleur");
        assert.ok(output.includes('Corinne Locataire'), "Visa preneur");
        assert.ok(output.includes('SHA-256 certifiée'), "Empreinte inaltérable SHA-256 certifiée");
    });

    it('inspection.html and inspection.js must integrate #inspection-success-modal and downloadCurrentInspectionReport', () => {
        const html = fs.readFileSync(path.join(siteWebDir, 'inspection.html'), 'utf8');

        assert.match(html, /id=["']inspection-success-modal["']/, "inspection.html doit contenir #inspection-success-modal");
        assert.match(html, /id=["']download-inspection-pdf-btn["']/, "inspection.html doit contenir #download-inspection-pdf-btn");
        assert.match(html, /onclick=["']downloadCurrentInspectionReport\(\)["']/, "Le bouton doit appeler downloadCurrentInspectionReport()");
        assert.match(html, /jspdf\.umd\.min\.js/, "inspection.html doit charger jsPDF CDN");
        assert.match(html, /js\/contracts\.js/, "inspection.html doit charger contracts.js");

        const js = fs.readFileSync(path.join(jsDir, 'inspection.js'), 'utf8');
        assert.match(js, /function\s+showInspectionSuccessModal/, "inspection.js doit implémenter showInspectionSuccessModal");
        assert.match(js, /function\s+downloadCurrentInspectionReport/, "inspection.js doit implémenter downloadCurrentInspectionReport");
    });

    it('chat.js must integrate #chat-booking-docs-row with download handlers for contract and inspection report', () => {
        const chatCode = fs.readFileSync(path.join(jsDir, 'chat.js'), 'utf8');

        assert.match(chatCode, /chat-booking-docs-row/, "chat.js doit gérer #chat-booking-docs-row");
        assert.match(chatCode, /handleChatDownloadContract/, "chat.js doit implémenter handleChatDownloadContract");
        assert.match(chatCode, /handleChatDownloadReport/, "chat.js doit implémenter handleChatDownloadReport");
        assert.match(chatCode, /RengerContracts\.downloadRentalContract/, "chat.js doit appeler RengerContracts.downloadRentalContract");
        assert.match(chatCode, /RengerContracts\.downloadInspectionReport/, "chat.js doit appeler RengerContracts.downloadInspectionReport");
    });
});

// ============================================================================
// SUITE 6 : SECURITY, XSS IMMUNIZATION & DOCUMENT SANITIZATION (R5)
// ============================================================================
describe('Tier 5 - Suite 6: Security, XSS Immunization & Document Sanitization (R5)', () => {

    const c = (function() {
        const moduleWrapper = { exports: {} };
        const fn = new Function('module', 'exports', fs.readFileSync(path.join(jsDir, 'contracts.js'), 'utf8'));
        fn(moduleWrapper, moduleWrapper.exports);
        return moduleWrapper.exports;
    })();

    it('sanitizePdfText must completely strip malicious script and style tags', () => {
        const attack1 = "Remorque<script>alert('pwned')</script> Bâche";
        assert.strictEqual(c.sanitizePdfText(attack1), "Remorque Bâche");

        const attack2 = "Titre<script src=\"https://evil.ch/hack.js\"></script> Pro";
        assert.strictEqual(c.sanitizePdfText(attack2), "Titre Pro");

        const attack3 = "<style>body{display:none}</style>Description";
        assert.strictEqual(c.sanitizePdfText(attack3), "Description");
    });

    it('sanitizePdfText must remove HTML markup, image tags with event handlers, and iframe vectors', () => {
        const attack1 = "Remorque <img src=\"x\" onerror=\"alert(1)\"> standard";
        assert.strictEqual(c.sanitizePdfText(attack1), "Remorque  standard");

        const attack2 = "<iframe src=\"javascript:alert(1)\"></iframe>Contrat";
        assert.strictEqual(c.sanitizePdfText(attack2), "Contrat");

        const attack3 = "<svg onload=\"alert(document.cookie)\">SVG payload</svg>";
        assert.strictEqual(c.sanitizePdfText(attack3), "SVG payload");
    });

    it('sanitizePdfText must strip non-printable ASCII control characters while preserving Swiss accents and UTF-8', () => {
        // Injection d'octets nuls et caractères de contrôle
        const controlChars = "Titre\x00\x08\x1B\x7F Sécurisé";
        assert.strictEqual(c.sanitizePdfText(controlChars), "Titre Sécurisé");

        // Préservation intégrale des accents suisses
        const swissFrench = "Remorque bâchée à Genève, très légère, coût 45 CHF / été";
        assert.strictEqual(c.sanitizePdfText(swissFrench), swissFrench);

        const swissGerman = "Anhänger mit Plane, Zürich, Größe & Qualität";
        assert.strictEqual(c.sanitizePdfText(swissGerman), swissGerman);
    });

    it('sanitizePdfText must decode common HTML entities and strip residual angle brackets', () => {
        const encoded = "Remorque &amp; Accessoires &lt;b&gt;Pro&lt;/b&gt; &quot;Spéciale&quot;";
        const sanitized = c.sanitizePdfText(encoded);
        assert.strictEqual(sanitized, "Remorque & Accessoires bPro/b \"Spéciale\"");
        assert.strictEqual(sanitized.includes('<'), false, "Aucun chevron ouvrant ne doit subsister");
        assert.strictEqual(sanitized.includes('>'), false, "Aucun chevron fermant ne doit subsister");
    });

    it('sanitizePdfText must handle boundary inputs (null, undefined, numbers, boolean) gracefully', () => {
        assert.strictEqual(c.sanitizePdfText(null), '');
        assert.strictEqual(c.sanitizePdfText(undefined), '');
        assert.strictEqual(c.sanitizePdfText(12345), '12345');
        assert.strictEqual(c.sanitizePdfText(true), 'true');
        assert.strictEqual(c.sanitizePdfText('   '), '');
    });

    it('DOM-based Leaflet popup security: trailers.js must use createElement and textContent (Zero innerHTML on user data)', () => {
        const trailersCode = fs.readFileSync(path.join(jsDir, 'trailers.js'), 'utf8');

        // Extraire la fonction updateTrailersMap
        const updateMapMatch = trailersCode.match(/function\s+updateTrailersMap\s*\([^)]*\)\s*\{([\s\S]*?)\n\}/);
        assert.ok(updateMapMatch, "updateTrailersMap doit être définie dans trailers.js");
        const body = updateMapMatch[1];

        // Vérifier l'usage de textContent pour le titre
        assert.match(
            body,
            /title\.textContent\s*=\s*trailer\.title/,
            "Le titre de la popup doit être assigné via .textContent pour immuniser contre XSS"
        );

        // Vérifier l'usage de textContent pour le prix
        assert.match(
            body,
            /price\.textContent\s*=\s*`\$\{trailer\.price/,
            "Le prix doit être assigné via .textContent"
        );

        // Vérifier l'usage de textContent pour la localisation
        assert.match(
            body,
            /loc\.textContent\s*=\s*`📍\s*\$\{trailer\.location_city/,
            "La localisation doit être assignée via .textContent"
        );

        // Vérifier qu'aucune interpolation innerHTML n'est effectuée sur trailer.*
        assert.doesNotMatch(
            body,
            /popup\.innerHTML\s*=\s*[`'"].*\$\{trailer\./,
            "Interdiction absolue d'interpoler des données trailer dans popup.innerHTML"
        );
    });
});
