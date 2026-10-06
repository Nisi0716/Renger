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

/**
 * Creates an isolated mock DOM environment for deep unit and adversarial testing.
 */
function createMockDOM(customElements = {}) {
    const elements = new Map();

    function createMockElement(id = '', tagName = 'DIV') {
        const classList = new Set();
        const children = [];
        const listeners = new Map();
        let _innerText = '';
        let _textContent = '';
        let _innerHTML = '';
        const attributes = new Map();

        const el = {
            id,
            tagName: tagName.toUpperCase(),
            value: '',
            style: {},
            dataset: {},
            get className() { return Array.from(classList).join(' '); },
            set className(val) {
                classList.clear();
                (val || '').split(/\s+/).filter(Boolean).forEach(c => classList.add(c));
            },
            get innerText() { return _innerText; },
            set innerText(v) { _innerText = String(v); _textContent = String(v); },
            get textContent() { return _textContent; },
            set textContent(v) { _textContent = String(v); _innerText = String(v); },
            get innerHTML() { return _innerHTML; },
            set innerHTML(v) { _innerHTML = String(v); },
            classList: {
                add: (...cls) => cls.forEach(c => c && classList.add(c)),
                remove: (...cls) => cls.forEach(c => classList.delete(c)),
                contains: (c) => classList.has(c),
                toggle: (c) => (classList.has(c) ? classList.delete(c) : classList.add(c))
            },
            get href() { return attributes.get('href') || ''; },
            set href(val) { attributes.set('href', String(val)); },
            children,
            appendChild: (child) => {
                children.push(child);
                if (child && child.id) elements.set(child.id, child);
                return child;
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
            querySelector: (sel) => {
                const subEl = createMockElement('', 'DIV');
                subEl.src = '';
                return subEl;
            },
            setAttribute: (attr, val) => { attributes.set(attr, String(val)); },
            getAttribute: (attr) => attributes.get(attr) || null
        };

        if (id) elements.set(id, el);
        return el;
    }

    for (const [id, def] of Object.entries(customElements)) {
        const el = createMockElement(id, def.tag || 'DIV');
        if (def.className) el.className = def.className;
        if (def.textContent) el.textContent = def.textContent;
        if (def.innerHTML) el.innerHTML = def.innerHTML;
        elements.set(id, el);
    }

    const mockDocument = {
        getElementById: (id) => elements.get(id) || null,
        createElement: (tag) => createMockElement('', tag),
        createDocumentFragment: () => createMockElement('', 'FRAGMENT'),
        addEventListener: () => {},
        removeEventListener: () => {},
        body: createMockElement('body', 'BODY')
    };

    const mockStorage = {
        _store: new Map(),
        getItem: (k) => mockStorage._store.get(k) || null,
        setItem: (k, v) => mockStorage._store.set(k, String(v)),
        removeItem: (k) => mockStorage._store.delete(k),
        clear: () => mockStorage._store.clear()
    };

    const mockWindow = {
        document: mockDocument,
        location: { href: 'http://localhost/remorques.html', search: '', pathname: '/remorques.html' },
        localStorage: mockStorage,
        sessionStorage: mockStorage,
        URL,
        URLSearchParams,
        addEventListener: () => {},
        removeEventListener: () => {},
        history: { replaceState: () => {} }
    };
    mockWindow.window = mockWindow;
    mockWindow.globalThis = mockWindow;

    return { elements, mockDocument, mockWindow, mockStorage, createMockElement };
}

// ============================================================================
// SUITE 1 : EMPIRICAL AUDIT OF DOM & SCRIPT ASSETS IN remorques.html (R1 & R2)
// ============================================================================
describe('Challenger 1 Deep Stress: DOM Structure & Resource Linkage in remorques.html', () => {

    const remorquesPath = path.join(siteWebDir, 'remorques.html');
    const html = fs.readFileSync(remorquesPath, 'utf8');

    it('must contain all required R1 DOM elements with exact IDs and expected classes', () => {
        // #view-mode-toggle
        assert.match(html, /<div[^>]+id=["']view-mode-toggle["']/i, "Element #view-mode-toggle must exist in remorques.html");

        // #view-mode-list-btn & #view-mode-map-btn
        assert.match(html, /<button[^>]+id=["']view-mode-list-btn["'][^>]*onclick=["']setViewMode\(['"]list['"]\)["']/i,
            "#view-mode-list-btn must exist and trigger setViewMode('list')");
        assert.match(html, /<button[^>]+id=["']view-mode-map-btn["'][^>]*onclick=["']setViewMode\(['"]map['"]\)["']/i,
            "#view-mode-map-btn must exist and trigger setViewMode('map')");

        // #trailers-map container
        const mapMatch = html.match(/<div[^>]+id=["']trailers-map["'][^>]*class=["']([^"']*)["']/i);
        assert.ok(mapMatch, "#trailers-map container must exist");
        const mapClasses = mapMatch[1];
        assert.ok(mapClasses.includes('hidden'), "#trailers-map must initially have the 'hidden' class");
        assert.ok(mapClasses.includes('h-[540px]'), "#trailers-map must specify height h-[540px]");

        // #trailers-grid
        assert.match(html, /<div[^>]+id=["']trailers-grid["']/i, "#trailers-grid container must exist");
    });

    it('must contain all required R2 DOM elements in remorques.html', () => {
        // Date range inputs
        assert.match(html, /<input[^>]+id=["']catalog-dates["']/i, "#catalog-dates input must exist");
        assert.match(html, /<button[^>]+id=["']catalog-clear-dates["']/i, "#catalog-clear-dates button must exist");

        // Counter badge
        assert.match(html, /<span[^>]+id=["']available-trailers-count["']/i, "#available-trailers-count badge must exist");
    });

    it('must link Leaflet 1.9.4 CSS in <head> and Leaflet 1.9.4 JS with defer before core.js', () => {
        // CSS in head
        assert.match(html, /<link[^>]+href=["']https:\/\/unpkg\.com\/leaflet@1\.9\.4\/dist\/leaflet\.css["']/i,
            "Leaflet CSS CDN must be loaded");

        // JS script
        assert.match(html, /<script[^>]+src=["']https:\/\/unpkg\.com\/leaflet@1\.9\.4\/dist\/leaflet\.js["'][^>]*defer/i,
            "Leaflet JS CDN must have defer attribute");

        const leafletPos = html.indexOf('leaflet@1.9.4/dist/leaflet.js');
        const corePos = html.indexOf('js/core.js');
        const trailersPos = html.indexOf('js/trailers.js');

        assert.ok(leafletPos > 0, "Leaflet JS script tag must be present");
        assert.ok(corePos > 0, "core.js script tag must be present");
        assert.ok(trailersPos > 0, "trailers.js script tag must be present");
        assert.ok(leafletPos < corePos, "Leaflet JS must be positioned before core.js");
        assert.ok(leafletPos < trailersPos, "Leaflet JS must be positioned before trailers.js");
    });
});

// ============================================================================
// SUITE 2 : ADVERSARIAL STRESS-TESTING OF LEAFLET MAP LOGIC IN trailers.js (R1)
// ============================================================================
describe('Challenger 1 Deep Stress: Leaflet Map Logic & XSS Immunization (trailers.js)', () => {

    const trailersCode = fs.readFileSync(path.join(jsDir, 'trailers.js'), 'utf8');

    function createTrailersRuntime(domElements = {}) {
        const { mockDocument, mockWindow, elements } = createMockDOM({
            'trailers-grid': { tag: 'div', className: 'grid' },
            'trailers-map': { tag: 'div', className: 'hidden w-full h-[540px]' },
            'view-mode-list-btn': { tag: 'button', className: 'active' },
            'view-mode-map-btn': { tag: 'button', className: 'inactive' },
            ...domElements
        });

        const mapCalls = {
            setView: [],
            fitBounds: [],
            invalidateSizeCount: 0
        };

        const addedMarkers = [];
        const createdDivIcons = [];

        const mockLeafletMap = {
            setView: (center, zoom) => {
                mapCalls.setView.push({ center, zoom });
                return mockLeafletMap;
            },
            fitBounds: (bounds, options) => {
                mapCalls.fitBounds.push({ bounds, options });
                return mockLeafletMap;
            },
            invalidateSize: () => {
                mapCalls.invalidateSizeCount++;
                return mockLeafletMap;
            }
        };

        const mockLayerGroup = {
            addTo: () => mockLayerGroup,
            clearLayers: () => { addedMarkers.length = 0; },
            addLayer: (marker) => { addedMarkers.push(marker); }
        };

        const mockL = {
            map: () => mockLeafletMap,
            tileLayer: () => ({ addTo: () => ({}) }),
            layerGroup: () => mockLayerGroup,
            divIcon: (opts) => {
                createdDivIcons.push(opts);
                return opts;
            },
            marker: (coords, opts) => {
                const markerObj = {
                    coords,
                    opts,
                    popupContent: null,
                    bindPopup: (content) => { markerObj.popupContent = content; }
                };
                return markerObj;
            },
            latLngBounds: (coordsArray) => ({ bounds: coordsArray })
        };

        const context = {
            window: mockWindow,
            document: mockDocument,
            console: { warn: () => {}, log: () => {}, error: () => {} },
            L: mockL,
            currentFilter: 'all',
            currentSearch: ''
        };
        context.globalThis = context;
        mockWindow.L = mockL;

        vm.createContext(context);
        vm.runInContext(trailersCode, context);

        return {
            context,
            elements,
            mapCalls,
            addedMarkers,
            createdDivIcons,
            mockLeafletMap,
            mockL
        };
    }

    it('setViewMode must toggle classes, invoke invalidateSize, and endure rapid switching', () => {
        const { context, elements, mapCalls } = createTrailersRuntime();

        // Mode Carte
        context.setViewMode('map');
        const mapEl = elements.get('trailers-map');
        const gridEl = elements.get('trailers-grid');

        assert.strictEqual(mapEl.classList.contains('hidden'), false, "Map must NOT have 'hidden' after setViewMode('map')");
        assert.strictEqual(gridEl.classList.contains('hidden'), true, "Grid MUST have 'hidden' after setViewMode('map')");
        assert.strictEqual(mapCalls.invalidateSizeCount, 1, "invalidateSize() must be called once on map view switch");

        // Mode Liste
        context.setViewMode('list');
        assert.strictEqual(mapEl.classList.contains('hidden'), true, "Map MUST have 'hidden' after setViewMode('list')");
        assert.strictEqual(gridEl.classList.contains('hidden'), false, "Grid must NOT have 'hidden' after setViewMode('list')");

        // Stress: 50 toggles back and forth
        for (let i = 0; i < 50; i++) {
            context.setViewMode(i % 2 === 0 ? 'map' : 'list');
        }
        assert.strictEqual(mapCalls.invalidateSizeCount, 26, "invalidateSize() called correctly on every map switch");
    });

    it('updateTrailersMap must filter invalid/corrupt coordinates and produce Terracotta markers', () => {
        const { context, addedMarkers, createdDivIcons } = createTrailersRuntime();

        const testCorpus = [
            { id: 1, title: 'Valid Lausanne', latitude: 46.5197, longitude: 6.6323, price: 40 },
            { id: 2, title: 'Valid Geneva String', latitude: '46.2044', longitude: '6.1432', price: 65 },
            { id: 3, title: 'Null coords', latitude: null, longitude: null, price: 50 },
            { id: 4, title: 'Undefined coords', price: 50 },
            { id: 5, title: 'NaN coords', latitude: NaN, longitude: 6.0, price: 50 },
            { id: 6, title: 'String non-numeric', latitude: 'N/A', longitude: 'bad', price: 50 },
            { id: 7, title: 'Negative Valid', latitude: -12.34, longitude: -45.67, price: 30 }
        ];

        context.updateTrailersMap(testCorpus);

        // Valid trailers: 1, 2, 7 (3 markers)
        assert.strictEqual(addedMarkers.length, 3, "Only trailers with valid numerical coordinates must produce markers");
        assert.strictEqual(createdDivIcons.length, 3, "Exactly 3 divIcons created");

        // Terracotta color check
        createdDivIcons.forEach(icon => {
            assert.ok(icon.html.includes('#d85110'), "Marker icon must feature Terracotta color #d85110");
            assert.ok(icon.html.includes('CHF'), "Marker icon must display CHF price");
        });
    });

    it('Popup construction: zero XSS injection via title, price, location or images', () => {
        const { context, addedMarkers } = createTrailersRuntime();

        const xssPayloads = [
            {
                id: 'evil1',
                title: '<script>alert("XSS_TITLE")</script>',
                location_city: '<img src=x onerror=alert("XSS_CITY")>',
                price: '<b onmouseover=alert("XSS_PRICE")>999</b>',
                latitude: 46.52,
                longitude: 6.63
            },
            {
                id: 'evil2"><svg/onload=alert(document.cookie)>',
                title: '"><iframe src="javascript:alert(1)"></iframe>',
                location_city: 'Lausanne',
                price: 50,
                latitude: 46.53,
                longitude: 6.64
            }
        ];

        context.updateTrailersMap(xssPayloads);
        assert.strictEqual(addedMarkers.length, 2, "2 markers created");

        // Inspect created popup elements
        for (const marker of addedMarkers) {
            const popupEl = marker.popupContent;
            assert.ok(popupEl, "Marker must have bound popup element");
            assert.strictEqual(typeof popupEl, 'object', "Popup must be a DOM element object, not raw HTML string");

            // Verify innerHTML was not contaminated by unsanitized raw injection
            assert.strictEqual(popupEl.innerHTML.includes('<script>'), false, "Popup must NOT contain literal script tags");
            assert.strictEqual(popupEl.innerHTML.includes('<iframe'), false, "Popup must NOT contain literal iframe tags");
            assert.strictEqual(popupEl.innerHTML.includes('onerror='), false, "Popup must NOT contain event handlers");
            assert.strictEqual(popupEl.innerHTML.includes('onload='), false, "Popup must NOT contain onload handlers");
        }
    });

    it('fitMapToTrailers boundary conditions: empty, single, multiple trailers', () => {
        const { context, mapCalls } = createTrailersRuntime();

        context.initTrailersMap();

        // 1. Empty list -> Lausanne fallback
        context.fitMapToTrailers([]);
        const lastSetView1 = mapCalls.setView[mapCalls.setView.length - 1];
        assert.strictEqual(lastSetView1.center[0], 46.5197, "Fallback center lat must be 46.5197");
        assert.strictEqual(lastSetView1.center[1], 6.6323, "Fallback center lon must be 6.6323");
        assert.strictEqual(lastSetView1.zoom, 10, "Fallback zoom must be 10");

        // 2. Single trailer -> setView with zoom 13
        context.fitMapToTrailers([{ latitude: 47.3769, longitude: 8.5417 }]);
        const lastSetView2 = mapCalls.setView[mapCalls.setView.length - 1];
        assert.strictEqual(lastSetView2.center[0], 47.3769, "Single trailer lat must be 47.3769");
        assert.strictEqual(lastSetView2.center[1], 8.5417, "Single trailer lon must be 8.5417");
        assert.strictEqual(lastSetView2.zoom, 13, "Single trailer must use zoom 13");

        // 3. Multiple trailers -> fitBounds with padding [40, 40]
        context.fitMapToTrailers([
            { latitude: 46.5, longitude: 6.6 },
            { latitude: 46.2, longitude: 6.1 }
        ]);
        const lastFitBounds = mapCalls.fitBounds[mapCalls.fitBounds.length - 1];
        assert.ok(lastFitBounds, "Multiple trailers must call fitBounds");
        assert.deepStrictEqual(Array.from(lastFitBounds.options.padding), [40, 40], "Padding must be [40, 40]");
        assert.strictEqual(lastFitBounds.options.maxZoom, 14, "maxZoom must be 14");
    });
});

// ============================================================================
// SUITE 3 : EMPIRICAL ADVERSARIAL STRESS ON DATE FILTERING (core.js) (R2)
// ============================================================================
describe('Challenger 1 Deep Stress: Date Availability Filtering & Overlap Calculus (core.js)', () => {

    const coreCode = fs.readFileSync(path.join(jsDir, 'core.js'), 'utf8');

    function createCoreRuntime(bookingsDb = []) {
        let lastQuery = null;

        const mockSupabase = {
            auth: {
                onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
                getSession: async () => ({ data: { session: null } })
            },
            from: (table) => ({
                select: (cols) => ({
                    in: (statusCol, statuses) => ({
                        lte: (startCol, reqEnd) => ({
                            gte: async (endCol, reqStart) => {
                                lastQuery = { table, cols, statuses, reqStart, reqEnd };
                                const matched = bookingsDb.filter(b =>
                                    statuses.includes(b.status) &&
                                    b.start_date <= reqEnd &&
                                    b.end_date >= reqStart
                                );
                                return { data: matched, error: null };
                            }
                        })
                    }),
                    order: () => ({
                        eq: () => ({ or: async () => ({ data: [], error: null }) })
                    })
                })
            })
        };

        const { mockDocument, mockWindow, elements } = createMockDOM({
            'available-trailers-count': { tag: 'span', textContent: '' },
            'trailers-grid': { tag: 'div' }
        });
        mockWindow.supabase = {
            createClient: () => mockSupabase
        };

        const context = {
            window: mockWindow,
            document: mockDocument,
            console: { warn: () => {}, log: () => {}, error: () => {} },
            currentFilter: 'all',
            currentSearch: ''
        };
        context.globalThis = context;

        vm.createContext(context);
        vm.runInContext(coreCode, context);

        return {
            context,
            elements,
            getLastQuery: () => lastQuery
        };
    }

    it('Status Filtering: ONLY "paye" and "indisponible" must block, all other statuses must NOT block', async () => {
        const statusesToTest = [
            { status: 'paye', shouldBlock: true },
            { status: 'indisponible', shouldBlock: true },
            { status: 'en_attente', shouldBlock: false },
            { status: 'annule', shouldBlock: false },
            { status: 'refuse', shouldBlock: false },
            { status: 'demande', shouldBlock: false },
            { status: 'brouillon', shouldBlock: false },
            { status: 'termine', shouldBlock: false },
            { status: 'rembourse', shouldBlock: false }
        ];

        const mockDb = statusesToTest.map((item, index) => ({
            trailer_id: `trailer_${index}_${item.status}`,
            start_date: '2026-08-10',
            end_date: '2026-08-15',
            status: item.status
        }));

        const { context, getLastQuery } = createCoreRuntime(mockDb);
        const getUnavailableFn = context.getUnavailableTrailerIds;

        const blockedSet = await getUnavailableFn('2026-08-10', '2026-08-15');
        const query = getLastQuery();

        // Check query sent to Supabase
        assert.deepStrictEqual(Array.from(query.statuses), ['paye', 'indisponible'], "Supabase query must strictly filter by ['paye', 'indisponible']");

        // Verify each individual status effect
        for (const item of statusesToTest) {
            const expectedId = `trailer_${statusesToTest.indexOf(item)}_${item.status}`;
            const isBlocked = blockedSet.has(expectedId);
            assert.strictEqual(
                isBlocked,
                item.shouldBlock,
                `Status '${item.status}' blocked status was ${isBlocked}, expected ${item.shouldBlock}`
            );
        }
    });

    it('Boundary Condition 1: Same-day bookings collisions and non-collisions', async () => {
        const mockDb = [
            // Single-day booking on Aug 10
            { trailer_id: 't_sameday', start_date: '2026-08-10', end_date: '2026-08-10', status: 'paye' }
        ];

        const { context } = createCoreRuntime(mockDb);
        const fn = context.getUnavailableTrailerIds;

        // Exact match same day
        const res1 = await fn('2026-08-10', '2026-08-10');
        assert.strictEqual(res1.has('t_sameday'), true, "Same-day booking requested on that exact day must collide");

        // Range spanning across the same day
        const res2 = await fn('2026-08-08', '2026-08-12');
        assert.strictEqual(res2.has('t_sameday'), true, "Range enclosing same-day booking must collide");

        // Same day before
        const res3 = await fn('2026-08-09', '2026-08-09');
        assert.strictEqual(res3.has('t_sameday'), false, "Day before must not collide");

        // Same day after
        const res4 = await fn('2026-08-11', '2026-08-11');
        assert.strictEqual(res4.has('t_sameday'), false, "Day after must not collide");
    });

    it('Boundary Condition 2: Adjacent non-overlapping & abutting boundary collisions', async () => {
        const mockDb = [
            { trailer_id: 't_mid', start_date: '2026-08-10', end_date: '2026-08-15', status: 'paye' }
        ];

        const { context } = createCoreRuntime(mockDb);
        const fn = context.getUnavailableTrailerIds;

        // Abutting on end date (starts on 2026-08-15) -> Collides on Aug 15
        const abuttingEnd = await fn('2026-08-15', '2026-08-20');
        assert.strictEqual(abuttingEnd.has('t_mid'), true, "Start date matching existing end date is a collision");

        // Abutting on start date (ends on 2026-08-10) -> Collides on Aug 10
        const abuttingStart = await fn('2026-08-05', '2026-08-10');
        assert.strictEqual(abuttingStart.has('t_mid'), true, "End date matching existing start date is a collision");

        // Strictly adjacent before (ends on Aug 9) -> NO collision
        const strictlyBefore = await fn('2026-08-01', '2026-08-09');
        assert.strictEqual(strictlyBefore.has('t_mid'), false, "Strictly prior interval must not collide");

        // Strictly adjacent after (starts on Aug 16) -> NO collision
        const strictlyAfter = await fn('2026-08-16', '2026-08-22');
        assert.strictEqual(strictlyAfter.has('t_mid'), false, "Strictly posterior interval must not collide");
    });

    it('Boundary Condition 3: Inverted dates handling (start > end)', async () => {
        const mockDb = [
            { trailer_id: 't_invert', start_date: '2026-08-12', end_date: '2026-08-14', status: 'paye' }
        ];

        const { context } = createCoreRuntime(mockDb);
        const fn = context.getUnavailableTrailerIds;

        // Inverted: start = Aug 20, end = Aug 10
        const res = await fn('2026-08-20', '2026-08-10');
        assert.strictEqual(res.has('t_invert'), true, "Inverted dates must swap and collide with active booking");
    });

    it('Boundary Condition 4: Multi-month and cross-year bookings', async () => {
        const mockDb = [
            // Long booking across June to September
            { trailer_id: 't_summer', start_date: '2026-06-15', end_date: '2026-09-15', status: 'indisponible' },
            // Cross-year booking
            { trailer_id: 't_newyear', start_date: '2026-12-25', end_date: '2027-01-05', status: 'paye' }
        ];

        const { context } = createCoreRuntime(mockDb);
        const fn = context.getUnavailableTrailerIds;

        // Within summer booking
        const summerTest = await fn('2026-07-01', '2026-07-05');
        assert.strictEqual(summerTest.has('t_summer'), true, "Interval completely within summer booking must collide");

        // Winter booking crossing year boundary
        const winterTest = await fn('2026-12-31', '2027-01-02');
        assert.strictEqual(winterTest.has('t_newyear'), true, "Cross-year interval must collide");

        // Spring interval (no collision)
        const springTest = await fn('2026-04-01', '2026-04-10');
        assert.strictEqual(springTest.size, 0, "Non-overlapping interval must be empty");
    });

    it('Boundary Condition 5: Timestamps attached to date strings in database', async () => {
        const mockDb = [
            { trailer_id: 't_iso', start_date: '2026-08-10T14:30:00.000Z', end_date: '2026-08-15 18:00:00', status: 'paye' }
        ];

        const { context } = createCoreRuntime(mockDb);
        const fn = context.getUnavailableTrailerIds;

        const res = await fn('2026-08-12', '2026-08-14');
        assert.strictEqual(res.has('t_iso'), true, "Database dates with time components must be parsed cleanly and collide");
    });

    it('Available count badge formatting: singular and plural agreement', () => {
        const { elements } = createCoreRuntime();
        const countEl = elements.get('available-trailers-count');

        // Test the exact grammar logic from core.js:
        // const s = count > 1 ? 's' : '';
        // countEl.textContent = `${count} disponible${s}`;

        function updateCount(count) {
            const s = count > 1 ? 's' : '';
            countEl.textContent = `${count} disponible${s}`;
        }

        updateCount(0);
        assert.strictEqual(countEl.textContent, '0 disponible', "0 must be singular: '0 disponible'");

        updateCount(1);
        assert.strictEqual(countEl.textContent, '1 disponible', "1 must be singular: '1 disponible'");

        updateCount(2);
        assert.strictEqual(countEl.textContent, '2 disponibles', "2 must be plural: '2 disponibles'");

        updateCount(42);
        assert.strictEqual(countEl.textContent, '42 disponibles', "42 must be plural: '42 disponibles'");
    });
});

// ============================================================================
// SUITE 4 : ADVERSARIAL RESILIENCE, URL FLOW & loadTrailers INTEGRATION
// ============================================================================
describe('Challenger 1 Deep Stress: URL Query Flow, Corrupt DB Data & loadTrailers Integration', () => {

    const coreCode = fs.readFileSync(path.join(jsDir, 'core.js'), 'utf8');

    it('Corrupt database records handling: null IDs, missing dates, query errors', async () => {
        let shouldFailQuery = false;
        const mockDb = [
            { trailer_id: null, start_date: '2026-08-10', end_date: '2026-08-15', status: 'paye' },
            { trailer_id: undefined, start_date: '2026-08-10', end_date: '2026-08-15', status: 'paye' },
            { trailer_id: 't_null_dates', start_date: null, end_date: null, status: 'paye' },
            { trailer_id: 't_inverted_in_db', start_date: '2026-08-20', end_date: '2026-08-10', status: 'paye' },
            { trailer_id: 't_valid_one', start_date: '2026-08-10', end_date: '2026-08-15', status: 'paye' }
        ];

        const mockSupabase = {
            auth: {
                onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
                getSession: async () => ({ data: { session: null } })
            },
            from: (table) => ({
                select: () => ({
                    in: () => ({
                        lte: () => ({
                            gte: async () => {
                                if (shouldFailQuery) {
                                    return { data: null, error: { message: "Simulated PostgREST network failure" } };
                                }
                                return { data: mockDb, error: null };
                            }
                        })
                    })
                })
            })
        };

        const { mockDocument, mockWindow } = createMockDOM();
        mockWindow.supabase = { createClient: () => mockSupabase };
        const context = {
            window: mockWindow,
            document: mockDocument,
            console: { warn: () => {}, log: () => {}, error: () => {} },
            URL,
            URLSearchParams,
            localStorage: mockWindow.localStorage
        };
        context.globalThis = context;
        vm.createContext(context);
        vm.runInContext(coreCode, context);

        const fn = context.getUnavailableTrailerIds;

        // 1. Should safely ignore corrupt rows and return valid blocked ID
        const res1 = await fn('2026-08-12', '2026-08-14');
        assert.ok(typeof res1.has === 'function', "Must return a Set");
        assert.strictEqual(res1.has('t_valid_one'), true, "Valid collision row must be detected");
        assert.strictEqual(res1.has('null'), false, "Null trailer_id must not be added");
        assert.strictEqual(res1.has('undefined'), false, "Undefined trailer_id must not be added");

        // 2. Query failure should gracefully return empty Set without throwing
        shouldFailQuery = true;
        const res2 = await fn('2026-08-12', '2026-08-14');
        assert.ok(typeof res2.has === 'function', "Must return a Set on DB query error");
        assert.strictEqual(res2.size, 0, "Must return empty set on DB error");

        // 3. Falsy parameters should return empty set immediately
        const res3 = await fn(null, null);
        assert.strictEqual(res3.size, 0, "Null dates must return empty Set");
        const res4 = await fn(undefined, '2026-08-14');
        assert.strictEqual(res4.size, 0, "Undefined start date must return empty Set");
    });

    it('Hero Date Filter (index.html): selecting range updates search link and clear button', () => {
        const { mockDocument, mockWindow, elements } = createMockDOM({
            'hero-dates': { tag: 'input' },
            'hero-search-btn': { tag: 'a' },
            'hero-clear-dates': { tag: 'button', className: 'hidden' }
        });

        const searchBtn = elements.get('hero-search-btn');
        const clearBtn = elements.get('hero-clear-dates');
        const heroInput = elements.get('hero-dates');
        searchBtn.setAttribute('href', 'remorques.html');

        let flatpickrConfig = null;
        let cleared = false;
        const mockFlatpickrInstance = {
            clear: () => { cleared = true; }
        };

        const mockFlatpickr = (el, cfg) => {
            flatpickrConfig = cfg;
            return mockFlatpickrInstance;
        };
        mockFlatpickr.l10ns = { fr: {} };

        const context = {
            window: mockWindow,
            document: mockDocument,
            console: { warn: () => {}, log: () => {} },
            flatpickr: mockFlatpickr,
            URL,
            URLSearchParams,
            localStorage: mockWindow.localStorage
        };
        context.globalThis = context;
        mockWindow.flatpickr = mockFlatpickr;

        vm.createContext(context);
        vm.runInContext(coreCode, context);

        context.initHeroDateFilter();

        assert.ok(flatpickrConfig, "flatpickr must be configured on hero input");
        assert.strictEqual(flatpickrConfig.mode, 'range', "Mode must be 'range'");

        // Simulate user picking 2026-08-10 to 2026-08-15
        const date1 = new Date(2026, 7, 10);
        const date2 = new Date(2026, 7, 15);
        flatpickrConfig.onChange([date1, date2]);

        // Verify search button URL updated
        const targetHref = searchBtn.getAttribute('href') || searchBtn.href;
        assert.ok(targetHref.includes('start=2026-08-10'), "Search button href must contain start=2026-08-10");
        assert.ok(targetHref.includes('end=2026-08-15'), "Search button href must contain end=2026-08-15");
        assert.strictEqual(clearBtn.classList.contains('hidden'), false, "Clear button must be revealed");

        // Simulate clicking clear
        clearBtn.dispatchEvent({ type: 'click', stopPropagation: () => {} });
        assert.strictEqual(cleared, true, "Flatpickr clear() must be called");
        assert.strictEqual(clearBtn.classList.contains('hidden'), true, "Clear button must be hidden again");
        const resetHref = searchBtn.getAttribute('href') || searchBtn.href;
        assert.strictEqual(resetHref, 'remorques.html', "Search button href must be reset to 'remorques.html'");
    });

    it('Catalog Date Filter (remorques.html): parses start & end from URL query, initializes dates', () => {
        const { mockDocument, mockWindow, elements } = createMockDOM({
            'catalog-dates': { tag: 'input' },
            'catalog-clear-dates': { tag: 'button', className: 'hidden' }
        });

        // Set URL search params: ?start=2026-09-01&end=2026-09-07
        mockWindow.location = {
            href: 'http://localhost/remorques.html?start=2026-09-01&end=2026-09-07',
            search: '?start=2026-09-01&end=2026-09-07',
            pathname: '/remorques.html'
        };

        const clearBtn = elements.get('catalog-clear-dates');
        let capturedConfig = null;
        let catalogCleared = false;
        const mockPicker = {
            clear: () => { catalogCleared = true; }
        };

        const mockFlatpickr = (el, cfg) => {
            capturedConfig = cfg;
            return mockPicker;
        };
        mockFlatpickr.l10ns = { fr: {} };

        const context = {
            window: mockWindow,
            document: mockDocument,
            console: { warn: () => {}, log: () => {} },
            flatpickr: mockFlatpickr,
            currentFilter: 'all',
            currentSearch: '',
            URL,
            URLSearchParams,
            localStorage: mockWindow.localStorage
        };
        context.globalThis = context;
        mockWindow.flatpickr = mockFlatpickr;

        vm.createContext(context);
        vm.runInContext(coreCode, context);

        context.initCatalogDateFilter();

        // Check extracted params
        assert.strictEqual(mockWindow.currentStartDate, '2026-09-01', "currentStartDate must match URL start param");
        assert.strictEqual(mockWindow.currentEndDate, '2026-09-07', "currentEndDate must match URL end param");
        assert.strictEqual(clearBtn.classList.contains('hidden'), false, "Clear button must be visible when params present");
        assert.ok(capturedConfig, "Flatpickr must be initialized");
        assert.deepStrictEqual(Array.from(capturedConfig.defaultDate), ['2026-09-01', '2026-09-07'], "Default dates must match query params");
    });

    it('loadTrailers End-to-End: filters unavailable trailers, updates available count, syncs map', async () => {
        const mockTrailers = [
            { id: 1, title: 'Remorque A', is_active: true, price: 40, latitude: 46.5, longitude: 6.6 },
            { id: 2, title: 'Remorque B (Booked)', is_active: true, price: 50, latitude: 46.2, longitude: 6.1 },
            { id: 3, title: 'Remorque C', is_active: true, price: 60, latitude: 47.3, longitude: 8.5 },
            { id: 4, title: 'Remorque D (Inactive)', is_active: false, price: 70, latitude: 46.9, longitude: 7.4 }
        ];

        let mapUpdatedWith = null;

        const mockSupabase = {
            auth: {
                onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
                getSession: async () => ({ data: { session: null } })
            },
            from: (table) => {
                if (table === 'trailers') {
                    return {
                        select: () => ({
                            order: () => ({
                                eq: () => ({ data: mockTrailers, error: null }),
                                or: () => ({ data: mockTrailers, error: null }),
                                then: (cb) => Promise.resolve({ data: mockTrailers, error: null }).then(cb)
                            })
                        })
                    };
                }
                if (table === 'bookings') {
                    return {
                        select: () => ({
                            in: () => ({
                                lte: () => ({
                                    gte: async () => {
                                        // Trailer 2 is booked
                                        return {
                                            data: [{ trailer_id: '2', start_date: '2026-08-10', end_date: '2026-08-15', status: 'paye' }],
                                            error: null
                                        };
                                    }
                                })
                            })
                        })
                    };
                }
                return { select: () => ({}) };
            }
        };

        const { mockDocument, mockWindow, elements, createMockElement } = createMockDOM({
            'available-trailers-count': { tag: 'span', textContent: '' },
            'trailers-grid': { tag: 'div' }
        });
        mockWindow.supabase = { createClient: () => mockSupabase };

        const context = {
            window: mockWindow,
            document: mockDocument,
            console: { warn: () => {}, log: () => {}, error: () => {} },
            updateTrailersMap: (trailers) => { mapUpdatedWith = trailers; },
            currentFilter: 'all',
            currentSearch: '',
            currentStartDate: '2026-08-10',
            currentEndDate: '2026-08-15',
            showSkeletonCards: () => {},
            renderRatingBadge: () => createMockElement('', 'SPAN'),
            URL,
            URLSearchParams,
            localStorage: mockWindow.localStorage
        };
        context.globalThis = context;
        mockWindow.updateTrailersMap = context.updateTrailersMap;

        vm.createContext(context);
        vm.runInContext(coreCode, context);

        mockWindow.currentStartDate = '2026-08-10';
        mockWindow.currentEndDate = '2026-08-15';

        await context.loadTrailers('all', '');

        // Trailer 4 is inactive -> excluded (3 remaining active)
        // Trailer 2 is booked -> excluded (2 remaining visible: 1 and 3)
        const countBadge = elements.get('available-trailers-count');
        assert.strictEqual(countBadge.textContent, '2 disponibles', "Badge must display '2 disponibles'");

        // Leaflet map should have received exactly trailers 1 and 3
        assert.ok(mapUpdatedWith, "updateTrailersMap must have been called");
        assert.strictEqual(mapUpdatedWith.length, 2, "Map must receive exactly 2 available trailers");
        const visibleIds = mapUpdatedWith.map(t => t.id);
        assert.ok(visibleIds.includes(1), "Trailer 1 must be visible");
        assert.ok(visibleIds.includes(3), "Trailer 3 must be visible");
        assert.strictEqual(visibleIds.includes(2), false, "Trailer 2 (booked) must NOT be passed to map");
        assert.strictEqual(visibleIds.includes(4), false, "Trailer 4 (inactive) must NOT be passed to map");
    });
});

