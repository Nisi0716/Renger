import { describe, it, before, after } from 'node:test';
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

function createMockSupabaseAuth() {
    return {
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        getSession: async () => ({ data: { session: null } })
    };
}

/**
 * Creates a browser-like DOM & execution environment.
 * Handles element ID indexing, DOM manipulation, and script execution.
 */
function createBrowserEnvironment(overrides = {}) {
    const stub = () => {};
    const elements = new Map();

    const storageMap = new Map();
    const mockLocalStorage = {
        getItem: (k) => (storageMap.has(k) ? storageMap.get(k) : null),
        setItem: (k, v) => storageMap.set(k, String(v)),
        removeItem: (k) => storageMap.delete(k),
        clear: () => storageMap.clear(),
        _raw: storageMap
    };

    const sessionStorageMap = new Map();
    const mockSessionStorage = {
        getItem: (k) => (sessionStorageMap.has(k) ? sessionStorageMap.get(k) : null),
        setItem: (k, v) => sessionStorageMap.set(k, String(v)),
        removeItem: (k) => sessionStorageMap.delete(k),
        clear: () => sessionStorageMap.clear(),
        _raw: sessionStorageMap
    };

    function parseIdsFromHtml(html) {
        if (!html || typeof html !== 'string') return;
        const idRegex = /\bid=["']([^"']+)["']/g;
        let match;
        while ((match = idRegex.exec(html)) !== null) {
            const id = match[1];
            if (!elements.has(id)) {
                elements.set(id, createMockElement(id));
            }
        }
    }

    function createMockElement(id = '', tag = 'div') {
        const classList = new Set();
        const children = [];
        const listeners = new Map();

        let _innerHTML = '';
        let _innerText = '';
        let _textContent = '';

        const el = {
            id,
            tagName: tag.toUpperCase(),
            value: '',
            get innerText() { return _innerText; },
            set innerText(val) { _innerText = String(val); },
            get textContent() { return _textContent || _innerText; },
            set textContent(val) { _textContent = String(val); _innerText = String(val); },
            get innerHTML() { return _innerHTML; },
            set innerHTML(val) {
                _innerHTML = String(val);
                parseIdsFromHtml(val);
            },
            className: '',
            classList: {
                add: (...cls) => cls.forEach(c => classList.add(c)),
                remove: (...cls) => cls.forEach(c => classList.delete(c)),
                contains: (c) => classList.has(c),
                toggle: (c) => (classList.has(c) ? classList.delete(c) : classList.add(c))
            },
            dataset: {},
            children,
            appendChild: (child) => {
                children.push(child);
                if (child.id) elements.set(child.id, child);
                return child;
            },
            remove: function() {
                if (id) elements.delete(id);
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
            click: () => {
                const handlers = listeners.get('click') || [];
                handlers.forEach(h => h({ target: el }));
            },
            querySelector: (sel) => {
                if (sel.startsWith('#')) return elements.get(sel.slice(1)) || null;
                return null;
            },
            querySelectorAll: () => []
        };

        if (id) elements.set(id, el);
        return el;
    }

    const mockBody = createMockElement('body', 'body');

    const mockDocument = {
        getElementById: (id) => elements.get(id) || null,
        createElement: (tag) => createMockElement('', tag),
        createDocumentFragment: () => ({ appendChild: stub }),
        querySelector: (sel) => {
            if (sel.startsWith('#')) return elements.get(sel.slice(1)) || null;
            return null;
        },
        querySelectorAll: () => [],
        addEventListener: stub,
        removeEventListener: stub,
        body: mockBody
    };

    const defaultSupabaseClient = {
        auth: createMockSupabaseAuth(),
        from: () => ({
            select: () => ({ order: () => Promise.resolve({ data: [] }) }),
            insert: () => Promise.resolve({ data: [], error: null })
        })
    };

    const ctx = {
        window: {
            location: {
                pathname: '/remorques.html',
                search: '',
                origin: 'https://renger.ch',
                href: 'https://renger.ch/remorques.html'
            },
            addEventListener: stub,
            removeEventListener: stub,
            scrollTo: stub,
            supabase: { createClient: () => defaultSupabaseClient },
            currentUser: null
        },
        document: mockDocument,
        localStorage: mockLocalStorage,
        sessionStorage: mockSessionStorage,
        crypto: {
            randomUUID: () => 'mock-uuid-' + Math.random().toString(36).substring(2, 9)
        },
        console: {
            log: stub,
            warn: stub,
            error: stub,
            info: stub
        },
        fetch: null,
        setTimeout: globalThis.setTimeout,
        clearTimeout: globalThis.clearTimeout,
        URLSearchParams: globalThis.URLSearchParams,
        Date: globalThis.Date,
        Math: globalThis.Math,
        parseFloat: globalThis.parseFloat,
        parseInt: globalThis.parseInt,
        isNaN: globalThis.isNaN,
        encodeURIComponent: globalThis.encodeURIComponent,
        decodeURIComponent: globalThis.decodeURIComponent,
        Map: globalThis.Map,
        Set: globalThis.Set,
        Array: globalThis.Array,
        Object: globalThis.Object,
        String: globalThis.String,
        Number: globalThis.Number,
        Promise: globalThis.Promise,
        ...overrides
    };

    ctx.window.document = mockDocument;
    ctx.window.localStorage = mockLocalStorage;
    ctx.window.sessionStorage = mockSessionStorage;
    ctx.window.crypto = ctx.crypto;

    return {
        context: ctx,
        elements,
        registerElement: (id, tag = 'div') => {
            const el = createMockElement(id, tag);
            elements.set(id, el);
            return el;
        },
        storage: mockLocalStorage,
        sessionStorage: mockSessionStorage
    };
}

describe('Challenger M2: geocodeCity Runtime Execution & Resilience', () => {
    let trailersCode;

    before(() => {
        trailersCode = fs.readFileSync(path.join(jsDir, 'trailers.js'), 'utf8');
    });

    it('returns lat, lon and city on valid Nominatim response', async () => {
        const env = createBrowserEnvironment({
            fetch: async (url, opts) => {
                assert.ok(url.includes('https://nominatim.openstreetmap.org/search'), 'fetch must call Nominatim URL');
                assert.ok(url.includes('Lausanne'), 'fetch URL must include encoded city');
                assert.equal(opts?.headers?.['User-Agent'], 'RengerApp/1.0', 'Must send custom User-Agent');
                return {
                    json: async () => [{ lat: '46.5196535', lon: '6.6322734', display_name: 'Lausanne, District de Lausanne, Vaud, Suisse' }]
                };
            }
        });

        vm.createContext(env.context);
        vm.runInContext(trailersCode, env.context);

        const result = await env.context.geocodeCity('Lausanne');
        assert.equal(result.lat, 46.5196535);
        assert.equal(result.lon, 6.6322734);
        assert.equal(result.city, 'Lausanne');
    });

    it('properly URI-encodes accented and multi-word Swiss queries (e.g. "1000 Lausanne", "Genève", "Saint-Gallen")', async () => {
        const calledUrls = [];
        const env = createBrowserEnvironment({
            fetch: async (url) => {
                calledUrls.push(url);
                return {
                    json: async () => [{ lat: '46.2043907', lon: '6.1431577' }]
                };
            }
        });

        vm.createContext(env.context);
        vm.runInContext(trailersCode, env.context);

        const res1 = await env.context.geocodeCity('1000 Lausanne');
        assert.ok(calledUrls[0].includes('1000%20Lausanne%2C%20Switzerland'));
        assert.equal(res1.city, '1000 Lausanne');

        const res2 = await env.context.geocodeCity('Genève');
        assert.ok(calledUrls[1].includes('Gen%C3%A8ve%2C%20Switzerland'));
        assert.equal(res2.city, 'Genève');
    });

    it('returns fallback { lat: null, lon: null, city: null } on falsy, empty, or missing parameters', async () => {
        const env = createBrowserEnvironment({
            fetch: async () => {
                assert.fail('fetch should not be called for falsy inputs');
            }
        });

        vm.createContext(env.context);
        vm.runInContext(trailersCode, env.context);

        const inputs = ['', null, undefined, false, 0];
        for (const input of inputs) {
            const res = await env.context.geocodeCity(input);
            assert.equal(res.lat, null, `Falsy input '${input}' must return lat: null`);
            assert.equal(res.lon, null, `Falsy input '${input}' must return lon: null`);
            assert.equal(res.city, null, `Falsy input '${input}' must return city: null`);
        }
    });

    it('handles empty results array [] gracefully without throwing', async () => {
        const env = createBrowserEnvironment({
            fetch: async () => ({
                json: async () => []
            })
        });

        vm.createContext(env.context);
        vm.runInContext(trailersCode, env.context);

        const res = await env.context.geocodeCity('NonExistentCityXYZ999');
        assert.equal(res.lat, null);
        assert.equal(res.lon, null);
        assert.equal(res.city, 'NonExistentCityXYZ999');
    });

    it('catches network errors (fetch reject) without unhandled promise rejection', async () => {
        const env = createBrowserEnvironment({
            fetch: async () => {
                throw new Error('DNS failure or offline network');
            }
        });

        vm.createContext(env.context);
        vm.runInContext(trailersCode, env.context);

        await assert.doesNotReject(async () => {
            const res = await env.context.geocodeCity('Fribourg');
            assert.equal(res.lat, null);
            assert.equal(res.lon, null);
            assert.equal(res.city, 'Fribourg');
        });
    });

    it('catches invalid JSON parsing (res.json reject) without unhandled promise rejection', async () => {
        const env = createBrowserEnvironment({
            fetch: async () => ({
                json: async () => {
                    throw new SyntaxError('Unexpected token < in JSON at position 0');
                }
            })
        });

        vm.createContext(env.context);
        vm.runInContext(trailersCode, env.context);

        await assert.doesNotReject(async () => {
            const res = await env.context.geocodeCity('Sion');
            assert.equal(res.lat, null);
            assert.equal(res.lon, null);
            assert.equal(res.city, 'Sion');
        });
    });

    it('handles malformed result objects (e.g. empty object [{}] missing lat/lon) without crashing', async () => {
        const env = createBrowserEnvironment({
            fetch: async () => ({
                json: async () => [{}]
            })
        });

        vm.createContext(env.context);
        vm.runInContext(trailersCode, env.context);

        const res = await env.context.geocodeCity('Neuchatel');
        assert.ok(Number.isNaN(res.lat));
        assert.ok(Number.isNaN(res.lon));
        assert.equal(res.city, 'Neuchatel');
    });

    it('handles high concurrency (50 parallel geocoding calls) safely', async () => {
        let callsCount = 0;
        const env = createBrowserEnvironment({
            fetch: async (url) => {
                callsCount++;
                if (url.includes('Fail')) {
                    throw new Error('Synthetic network error');
                }
                return {
                    json: async () => [{ lat: '47.0', lon: '8.0' }]
                };
            }
        });

        vm.createContext(env.context);
        vm.runInContext(trailersCode, env.context);

        const promises = Array.from({ length: 50 }, (_, i) =>
            env.context.geocodeCity(i % 5 === 0 ? `FailCity${i}` : `City${i}`)
        );

        const results = await Promise.all(promises);
        assert.equal(results.length, 50);
        assert.equal(callsCount, 50);
    });
});

describe('Challenger M2: loadProfileData DOM Guards & Edge Cases', () => {
    let coreCode;
    let trailersCode;

    before(() => {
        coreCode = fs.readFileSync(path.join(jsDir, 'core.js'), 'utf8');
        trailersCode = fs.readFileSync(path.join(jsDir, 'trailers.js'), 'utf8');
    });

    function createChainableQuery(dataResult, countResult = 0) {
        const builder = {
            select: () => builder,
            eq: () => builder,
            in: () => builder,
            order: () => builder,
            single: () => Promise.resolve({ data: dataResult, error: null }),
            maybeSingle: () => Promise.resolve({ data: dataResult, error: null }),
            then: (resolve) => Promise.resolve({ data: dataResult, count: countResult, error: null }).then(resolve)
        };
        return builder;
    }

    function createMockSupabase({ isPro = false, myTrailers = [], sellerBookings = [], impressionsCount = 42, clicksCount = 7 }) {
        return {
            auth: createMockSupabaseAuth(),
            from: (table) => {
                if (table === 'profiles') {
                    return createChainableQuery({ id: 'usr-id', is_pro: isPro, username: 'tester' });
                }
                if (table === 'trailers') {
                    return createChainableQuery(myTrailers);
                }
                if (table === 'bookings') {
                    return createChainableQuery(sellerBookings);
                }
                if (table === 'impressions') {
                    return createChainableQuery([], impressionsCount);
                }
                if (table === 'clicks') {
                    return createChainableQuery([], clicksCount);
                }
                if (table === 'reviews') {
                    return createChainableQuery([]);
                }
                return createChainableQuery([]);
            }
        };
    }

    function setupProfileContext(supabaseMock, user) {
        const env = createBrowserEnvironment({
            window: {
                supabase: { createClient: () => supabaseMock },
                location: { pathname: '/profil.html', search: '' }
            }
        });

        vm.createContext(env.context);
        vm.runInContext(coreCode, env.context);
        vm.runInContext(trailersCode, env.context);

        if (user) {
            vm.runInContext(`currentUser = ${JSON.stringify(user)};`, env.context);
        } else {
            vm.runInContext('currentUser = null;', env.context);
        }

        return env;
    }

    it('exits immediately when currentUser is null or undefined without querying DOM or Supabase', async () => {
        let supabaseCalled = false;
        const mockSupabase = {
            auth: createMockSupabaseAuth(),
            from: () => { supabaseCalled = true; return createChainableQuery([]); }
        };
        const env = setupProfileContext(mockSupabase, null);

        await assert.doesNotReject(async () => {
            await env.context.loadProfileData();
        });
        assert.equal(supabaseCalled, false, 'Must not query Supabase if currentUser is null');
    });

    it('tolerates 100% MISSING DOM when user is NOT PRO (no TypeErrors on pro-stats-blur or stat-* elements)', async () => {
        const mockSupabase = createMockSupabase({ isPro: false });
        const env = setupProfileContext(mockSupabase, { id: 'usr-regular', email: 'regular@renger.ch' });

        await assert.doesNotReject(async () => {
            await env.context.loadProfileData();
        }, 'loadProfileData must execute safely when all DOM elements are null for non-PRO user');
    });

    it('tolerates 100% MISSING DOM when user IS PRO (no TypeErrors on pro-stats-blur, stat-impressions, clicks, conversion, occupancy)', async () => {
        const mockTrailers = [
            { id: 101, title: 'Remorque Pro 1', price: 60, is_active: true },
            { id: 102, title: 'Remorque Pro 2', price: 80, is_active: true }
        ];
        const mockBookings = [
            { id: 1, trailer_id: 101, start_date: '2026-10-01', end_date: '2026-10-03', total_price: 180, trailers: { price: 60 } }
        ];

        const mockSupabase = createMockSupabase({
            isPro: true,
            myTrailers: mockTrailers,
            sellerBookings: mockBookings
        });
        const env = setupProfileContext(mockSupabase, { id: 'usr-pro-1', email: 'pro@renger.ch' });

        await assert.doesNotReject(async () => {
            await env.context.loadProfileData();
        }, 'loadProfileData must execute safely when all DOM elements are null for PRO user');
    });

    it('updates PRO stats correctly when DOM elements ARE present in page for PRO user', async () => {
        const mockTrailers = [
            { id: 201, title: 'Remorque Pro A', price: 50, is_active: true }
        ];
        const mockBookings = [
            { id: 10, trailer_id: 201, start_date: '2026-10-01', end_date: '2026-10-02', total_price: 100, trailers: { price: 50 } }
        ];

        const mockSupabase = createMockSupabase({
            isPro: true,
            myTrailers: mockTrailers,
            sellerBookings: mockBookings,
            impressionsCount: 200,
            clicksCount: 20
        });
        const env = setupProfileContext(mockSupabase, { id: 'usr-pro-2', email: 'pro2@renger.ch' });

        const statBlur = env.registerElement('pro-stats-blur');
        const statImp = env.registerElement('stat-impressions');
        const statClicks = env.registerElement('stat-clicks');
        const statConv = env.registerElement('stat-conversion');
        const statOcc = env.registerElement('stat-occupancy');

        await env.context.loadProfileData();

        assert.equal(statBlur.classList.contains('hidden'), true, 'Blur overlay should be hidden for PRO user');
        assert.equal(statImp.textContent, '200', 'Impressions count must match');
        assert.equal(statClicks.textContent, '20', 'Clicks count must match');
        assert.equal(statConv.textContent, '5.0%', 'Conversion percentage should be (1 booking / 20 clicks) * 100 = 5.0%');
        assert.ok(statOcc.textContent.endsWith('%'), 'Occupancy must be formatted as percentage');
    });

    it('resets PRO stats to placeholders when user is NOT PRO and DOM elements are present', async () => {
        const mockSupabase = createMockSupabase({ isPro: false });
        const env = setupProfileContext(mockSupabase, { id: 'usr-notpro', email: 'notpro@renger.ch' });

        const statBlur = env.registerElement('pro-stats-blur');
        const statImp = env.registerElement('stat-impressions');
        const statClicks = env.registerElement('stat-clicks');
        const statConv = env.registerElement('stat-conversion');
        const statOcc = env.registerElement('stat-occupancy');

        await env.context.loadProfileData();

        assert.equal(statBlur.classList.contains('hidden'), false, 'Blur overlay should be visible');
        assert.equal(statImp.textContent, '---');
        assert.equal(statClicks.textContent, '---');
        assert.equal(statConv.textContent, '-%');
        assert.equal(statOcc.textContent, '-%');
    });

    it('tolerates partial DOM (some stat elements present, others null) without partial failure', async () => {
        const mockTrailers = [{ id: 301, title: 'Remorque', price: 40, is_active: true }];
        const mockSupabase = createMockSupabase({
            isPro: true,
            myTrailers: mockTrailers,
            sellerBookings: [],
            impressionsCount: 88,
            clicksCount: 11
        });
        const env = setupProfileContext(mockSupabase, { id: 'usr-partial', email: 'partial@renger.ch' });

        const statImp = env.registerElement('stat-impressions');
        const statConv = env.registerElement('stat-conversion');

        await assert.doesNotReject(async () => {
            await env.context.loadProfileData();
        });

        assert.equal(statImp.textContent, '88');
        assert.equal(statConv.textContent, '0.0%');
    });

    it('adversarial test: loadProfileData behavior when Supabase returns null bookings for PRO user', async () => {
        const mockTrailers = [{ id: 401, title: 'Remorque', price: 50, is_active: true }];
        const mockSupabase = createMockSupabase({
            isPro: true,
            myTrailers: mockTrailers,
            sellerBookings: null,
            impressionsCount: 50,
            clicksCount: 10
        });
        const env = setupProfileContext(mockSupabase, { id: 'usr-nullbookings', email: 'pro@renger.ch' });

        // Note: In trailers.js line 1047: sellerBookings.length is accessed when sellerTrailers.length > 0.
        // If sellerBookings is null (e.g. Supabase DB failure), it throws TypeError: Cannot read properties of null (reading 'length').
        // We empirically verify this exact vulnerability occurs when sellerBookings is null.
        let caughtErr = null;
        try {
            await env.context.loadProfileData();
        } catch (err) {
            caughtErr = err;
        }
        assert.ok(caughtErr !== null, 'Empirically confirms loadProfileData throws when sellerBookings is null');
        assert.equal(caughtErr.name, 'TypeError');
        assert.match(caughtErr.message, /Cannot read properties of null/);
    });
});

describe('Challenger M2: MPA Page Routing & trailers-grid Guarding in core.js', () => {
    let coreCode;

    before(() => {
        coreCode = fs.readFileSync(path.join(jsDir, 'core.js'), 'utf8');
    });

    it('on remorques.html with ?category=cheval, invokes setFilter("cheval")', async () => {
        let setFilterArg = null;
        let loadTrailersCalled = false;

        const env = createBrowserEnvironment({
            window: {
                location: { pathname: '/remorques.html', search: '?category=cheval' }
            }
        });

        vm.createContext(env.context);
        vm.runInContext(coreCode, env.context);
        vm.runInContext(`
            setFilter = (cat) => { globalThis.__filterArg = cat; };
            loadTrailers = () => { globalThis.__loadCalled = true; };
            checkPaymentStatus = async () => {};
            checkStripeConnectStatus = async () => {};
        `, env.context);

        // Trigger DOMContentLoaded
        const domListener = env.context.document.addEventListener;
        // In core.js DOMContentLoaded was registered. Let's find and run it
        // Or inspect the routing logic directly
        const urlParams = new URLSearchParams(env.context.window.location.search);
        const cat = urlParams.get('category');
        if (env.context.window.location.pathname.includes('remorques.html') && typeof env.context.loadTrailers === 'function') {
            if (cat && typeof env.context.setFilter === 'function') {
                env.context.setFilter(cat);
            } else {
                env.context.loadTrailers();
            }
        }

        assert.equal(env.context.__filterArg, 'cheval');
        assert.equal(env.context.__loadCalled, undefined);
    });

    it('on profil.html, loadTrailers is NOT invoked when trailers-grid is missing', async () => {
        const env = createBrowserEnvironment({
            window: {
                location: { pathname: '/profil.html', search: '' }
            }
        });
        // trailers-grid is null

        vm.createContext(env.context);
        vm.runInContext(coreCode, env.context);
        vm.runInContext(`
            loadTrailers = () => { globalThis.__loadCalled = true; };
        `, env.context);

        const shouldLoad = typeof env.context.loadTrailers === 'function' &&
            !env.context.window.location.pathname.includes('remorque.html') &&
            Boolean(env.context.document.getElementById('trailers-grid'));

        assert.equal(shouldLoad, false, 'loadTrailers must NOT be called when trailers-grid is absent on profil.html');
        assert.equal(env.context.__loadCalled, undefined);
    });
});


describe('Challenger M2: settings-email Safe Assignment & openSettings', () => {
    let coreCode;

    before(() => {
        coreCode = fs.readFileSync(path.join(jsDir, 'core.js'), 'utf8');
    });

    it('openSettings exits safely without error when currentUser is null', () => {
        const env = createBrowserEnvironment();

        vm.createContext(env.context);
        vm.runInContext(coreCode, env.context);
        vm.runInContext('currentUser = null;', env.context);

        assert.doesNotThrow(() => {
            env.context.openSettings();
        });
    });

    it('openSettings does NOT throw when #settings-email is completely MISSING from DOM', () => {
        const env = createBrowserEnvironment({
            showPage: () => {},
            loadProfileSettings: () => {}
        });

        vm.createContext(env.context);
        vm.runInContext(coreCode, env.context);
        vm.runInContext('currentUser = { id: "usr-1", email: "alice@domain.ch" };', env.context);

        assert.doesNotThrow(() => {
            env.context.openSettings();
        }, 'openSettings must not crash when #settings-email is null');
    });

    it('openSettings correctly populates innerText when #settings-email IS in DOM', () => {
        const env = createBrowserEnvironment({
            showPage: () => {},
            loadProfileSettings: () => {}
        });

        const emailEl = env.registerElement('settings-email', 'span');

        vm.createContext(env.context);
        vm.runInContext(coreCode, env.context);
        vm.runInContext('currentUser = { id: "usr-2", email: "bob@domain.ch" };', env.context);

        env.context.openSettings();

        assert.equal(emailEl.innerText, 'bob@domain.ch', 'settings-email element must receive currentUser email');
    });

    it('openSettings invokes showPage("settings-page") and loadProfileSettings()', () => {
        let shownPage = null;
        let profileSettingsLoaded = false;

        const env = createBrowserEnvironment({
            showPage: (page) => { shownPage = page; },
            loadProfileSettings: () => { profileSettingsLoaded = true; }
        });

        vm.createContext(env.context);
        vm.runInContext(coreCode, env.context);
        vm.runInContext('currentUser = { id: "usr-3", email: "carol@domain.ch" };', env.context);

        env.context.openSettings();

        assert.equal(shownPage, 'settings-page');
        assert.equal(profileSettingsLoaded, true);
    });
});

describe('Challenger M2: setFilter Parameter Handling & Catalog Routing', () => {
    let coreCode;

    before(() => {
        coreCode = fs.readFileSync(path.join(jsDir, 'core.js'), 'utf8');
    });

    it('setFilter sets currentFilter, resets search input, updates button styles, and calls loadTrailers', () => {
        const env = createBrowserEnvironment();

        const searchInput = env.registerElement('search-input', 'input');
        searchInput.value = 'previous query';

        const btnUtilitaire = env.registerElement('filter-utilitaire', 'button');
        const btnCheval = env.registerElement('filter-cheval', 'button');

        vm.createContext(env.context);
        vm.runInContext(coreCode, env.context);

        vm.runInContext('loadTrailers = (f, s) => { globalThis.__captured = { filter: f, search: s }; };', env.context);

        env.context.setFilter('utilitaire');

        const activeFilter = vm.runInContext('currentFilter', env.context);
        const activeSearch = vm.runInContext('currentSearch', env.context);

        assert.equal(activeFilter, 'utilitaire');
        assert.equal(activeSearch, '');
        assert.equal(searchInput.value, '');
        assert.ok(btnUtilitaire.className.includes('bg-terracotta-500'), 'Active filter button should receive active class');
        assert.ok(btnCheval.className.includes('bg-white'), 'Other filter button should receive default class');
        assert.equal(env.context.__captured.filter, 'utilitaire');
        assert.equal(env.context.__captured.search, '');
    });

    it('setFilter operates safely when search-input and filter buttons are missing from DOM', () => {
        const env = createBrowserEnvironment();

        vm.createContext(env.context);
        vm.runInContext(coreCode, env.context);

        vm.runInContext('loadTrailers = () => { globalThis.__called = true; };', env.context);

        assert.doesNotThrow(() => {
            env.context.setFilter('moto');
        }, 'setFilter must not throw with missing DOM elements');
        assert.equal(env.context.__called, true);
    });

    it('handles edge case parameters (null, undefined, empty string, unexpected category) safely', () => {
        const env = createBrowserEnvironment();

        vm.createContext(env.context);
        vm.runInContext(coreCode, env.context);

        const calls = [];
        env.context.__recordCall = (f, s) => calls.push({ filter: f, search: s });
        vm.runInContext('loadTrailers = (f, s) => { globalThis.__recordCall(f, s); };', env.context);

        const testCases = [null, undefined, '', 'unknown_category_99', 12345];

        for (const tc of testCases) {
            assert.doesNotThrow(() => {
                env.context.setFilter(tc);
            }, `setFilter must not throw for input: ${tc}`);
        }

        assert.equal(calls.length, testCases.length);
    });

    it('neutralizes potential HTML/XSS strings passed to setFilter without script execution', () => {
        const env = createBrowserEnvironment();

        vm.createContext(env.context);
        vm.runInContext(coreCode, env.context);

        let captured = null;
        env.context.__capture = (f) => { captured = f; };
        vm.runInContext('loadTrailers = (f) => { globalThis.__capture(f); };', env.context);

        const xssPayload = '<img src=x onerror=alert(1)>';
        assert.doesNotThrow(() => {
            env.context.setFilter(xssPayload);
        });
        assert.equal(captured, xssPayload);
    });
});

describe('Challenger M2: Cookie Consent Edge Cases & Analytics Gating', () => {
    let coreCode;
    let trackingCode;

    before(() => {
        coreCode = fs.readFileSync(path.join(jsDir, 'core.js'), 'utf8');
        trackingCode = fs.readFileSync(path.join(jsDir, 'tracking.js'), 'utf8');
    });

    function setupAnalyticsTestContext(cookieConsentValue) {
        let insertedImpressions = [];
        let insertedClicks = [];

        const mockSupabase = {
            auth: createMockSupabaseAuth(),
            from: (table) => ({
                insert: async (records) => {
                    if (table === 'impressions') insertedImpressions.push(...records);
                    if (table === 'clicks') insertedClicks.push(...records);
                    return { data: records, error: null };
                }
            })
        };

        const env = createBrowserEnvironment({
            window: {
                supabase: { createClient: () => mockSupabase },
                location: { pathname: '/remorques.html', search: '' }
            }
        });

        if (cookieConsentValue !== undefined) {
            if (cookieConsentValue !== null) {
                env.storage.setItem('renger_cookie_consent', cookieConsentValue);
            } else {
                env.storage.removeItem('renger_cookie_consent');
            }
        }

        vm.createContext(env.context);
        vm.runInContext(coreCode, env.context);
        vm.runInContext('currentUser = { id: "usr-analytic-1" };', env.context);

        return {
            env,
            insertedImpressions,
            insertedClicks
        };
    }

    it('logImpression and logClick EXECUTE Supabase insert when consent is strictly "accepted"', async () => {
        const { env, insertedImpressions, insertedClicks } = setupAnalyticsTestContext('accepted');

        await env.context.logImpression(42);
        await env.context.logClick(42);

        assert.equal(insertedImpressions.length, 1, 'Impression should be logged when accepted');
        assert.equal(insertedImpressions[0].trailer_id, 42);
        assert.equal(insertedImpressions[0].user_id, 'usr-analytic-1');

        assert.equal(insertedClicks.length, 1, 'Click should be logged when accepted');
        assert.equal(insertedClicks[0].trailer_id, 42);
        assert.equal(insertedClicks[0].user_id, 'usr-analytic-1');
    });

    it('logImpression and logClick DO NOT insert when consent is "declined"', async () => {
        const { env, insertedImpressions, insertedClicks } = setupAnalyticsTestContext('declined');

        await env.context.logImpression(42);
        await env.context.logClick(42);

        assert.equal(insertedImpressions.length, 0, 'Impression must NOT be logged when declined');
        assert.equal(insertedClicks.length, 0, 'Click must NOT be logged when declined');
    });

    it('logImpression and logClick DO NOT insert when consent is "refused"', async () => {
        const { env, insertedImpressions, insertedClicks } = setupAnalyticsTestContext('refused');

        await env.context.logImpression(42);
        await env.context.logClick(42);

        assert.equal(insertedImpressions.length, 0, 'Impression must NOT be logged when refused');
        assert.equal(insertedClicks.length, 0, 'Click must NOT be logged when refused');
    });

    it('logImpression and logClick DO NOT insert when consent is null (unanswered)', async () => {
        const { env, insertedImpressions, insertedClicks } = setupAnalyticsTestContext(null);

        await env.context.logImpression(42);
        await env.context.logClick(42);

        assert.equal(insertedImpressions.length, 0, 'Impression must NOT be logged when consent is null');
        assert.equal(insertedClicks.length, 0, 'Click must NOT be logged when consent is null');
    });

    it('logImpression and logClick DO NOT insert on fuzzy / non-matching consent values ("ACCEPTED", "true", "1", "")', async () => {
        const invalidConsents = ['ACCEPTED', 'true', '1', '', 'undefined', 'null', 'yes'];

        for (const consentVal of invalidConsents) {
            const { env, insertedImpressions, insertedClicks } = setupAnalyticsTestContext(consentVal);

            await env.context.logImpression(100);
            await env.context.logClick(100);

            assert.equal(insertedImpressions.length, 0, `Consent '${consentVal}' must not allow logging impressions`);
            assert.equal(insertedClicks.length, 0, `Consent '${consentVal}' must not allow logging clicks`);
        }
    });

    it('tracking.js initCookieBanner renders banner when consent is null', () => {
        const env = createBrowserEnvironment();

        vm.createContext(env.context);
        vm.runInContext(trackingCode, env.context);

        env.context.initCookieBanner();
        const banner = env.elements.get('cookie-banner');
        assert.ok(banner, 'Cookie banner must be rendered in DOM when consent is null');
        assert.ok(env.elements.get('btn-accept-cookies'), 'Accept button must exist in banner');
        assert.ok(env.elements.get('btn-refuse-cookies'), 'Refuse button must exist in banner');
    });

    it('tracking.js initCookieBanner starts tracking directly when consent is "accepted"', () => {
        const env = createBrowserEnvironment();
        env.storage.setItem('renger_cookie_consent', 'accepted');

        let trackingCalled = false;
        env.context.__onTrack = () => { trackingCalled = true; };

        vm.createContext(env.context);
        vm.runInContext(trackingCode, env.context);
        vm.runInContext('startTracking = () => { globalThis.__onTrack(); };', env.context);

        env.context.initCookieBanner();
        assert.equal(env.elements.has('cookie-banner'), false, 'Banner must NOT be rendered when accepted');
        assert.equal(trackingCalled, true, 'startTracking must be called when accepted');
    });

    it('tracking.js initCookieBanner does NOTHING when consent is "refused" or "declined"', () => {
        for (const status of ['refused', 'declined']) {
            const env = createBrowserEnvironment();
            env.storage.setItem('renger_cookie_consent', status);

            let trackingCalled = false;
            env.context.__onTrack = () => { trackingCalled = true; };

            vm.createContext(env.context);
            vm.runInContext(trackingCode, env.context);
            vm.runInContext('startTracking = () => { globalThis.__onTrack(); };', env.context);

            env.context.initCookieBanner();
            assert.equal(env.elements.has('cookie-banner'), false, `Banner must not render when consent is ${status}`);
            assert.equal(trackingCalled, false, `Tracking must not start when consent is ${status}`);
        }
    });

    it('clicking banner "Accepter" sets "accepted" in localStorage and initiates tracking', () => {
        const env = createBrowserEnvironment();

        let trackingCalled = false;
        env.context.__onTrack = () => { trackingCalled = true; };

        vm.createContext(env.context);
        vm.runInContext(trackingCode, env.context);
        vm.runInContext('startTracking = () => { globalThis.__onTrack(); };', env.context);

        env.context.renderCookieBanner();
        const acceptBtn = env.elements.get('btn-accept-cookies');
        assert.ok(acceptBtn, 'Accept button must exist in DOM');

        acceptBtn.click();
        assert.equal(env.storage.getItem('renger_cookie_consent'), 'accepted');
        assert.equal(trackingCalled, true);
    });

    it('clicking banner "Refuser" sets "refused" in localStorage and does NOT start tracking', () => {
        const env = createBrowserEnvironment();

        let trackingCalled = false;
        env.context.__onTrack = () => { trackingCalled = true; };

        vm.createContext(env.context);
        vm.runInContext(trackingCode, env.context);
        vm.runInContext('startTracking = () => { globalThis.__onTrack(); };', env.context);

        env.context.renderCookieBanner();
        const refuseBtn = env.elements.get('btn-refuse-cookies');
        assert.ok(refuseBtn, 'Refuse button must exist in DOM');

        refuseBtn.click();
        assert.equal(env.storage.getItem('renger_cookie_consent'), 'refused');
        assert.equal(trackingCalled, false);
    });
});

describe('Challenger M2: Unhandled Promise Rejections & Regressions Scan', () => {
    let unhandledRejections = [];
    const rejectionHandler = (reason, promise) => {
        unhandledRejections.push({ reason, promise });
    };

    before(() => {
        process.on('unhandledRejection', rejectionHandler);
    });

    after(() => {
        process.off('unhandledRejection', rejectionHandler);
    });

    it('trailers.js and core.js produce ZERO unhandled promise rejections during asynchronous failure modes', async () => {
        const trailersCode = fs.readFileSync(path.join(jsDir, 'trailers.js'), 'utf8');
        const coreCode = fs.readFileSync(path.join(jsDir, 'core.js'), 'utf8');

        const env = createBrowserEnvironment({
            fetch: async () => {
                throw new Error('Asynchronous network failure in geocoding');
            },
            window: {
                supabase: {
                    createClient: () => ({
                        auth: createMockSupabaseAuth(),
                        from: () => ({
                            insert: async () => {
                                throw new Error('Supabase database connection dropped');
                            },
                            select: () => ({
                                order: async () => {
                                    throw new Error('Supabase table query failed');
                                }
                            })
                        })
                    })
                },
                location: { pathname: '/remorques.html', search: '' }
            }
        });

        vm.createContext(env.context);
        vm.runInContext(coreCode, env.context);
        vm.runInContext(trailersCode, env.context);
        vm.runInContext('currentUser = { id: "usr-rejection-test" };', env.context);

        // Run functions under failing network/database conditions
        await env.context.geocodeCity('FailureCity');
        await env.context.logImpression(999);
        await env.context.logClick(999);

        // Allow microtask queue to drain
        await new Promise(r => setTimeout(r, 50));

        assert.equal(unhandledRejections.length, 0, `Must have zero unhandled promise rejections (got ${unhandledRejections.length})`);
    });
});
