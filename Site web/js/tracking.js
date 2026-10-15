// ==========================================
// TRACKING & COOKIES (RGPD / nLPD)
// ==========================================

const COOKIE_CONSENT_KEY = 'renger_cookie_consent';
const COOKIE_SESSION_REFUSED_KEY = 'renger_cookie_session_refused';

function initCookieBanner() {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
        renderCookieBanner();
    } else if (consent === 'accepted') {
        startTracking();
    }
}

function renderCookieBanner() {
    // Si la bannière existe déjà, on ne fait rien
    if (document.getElementById('cookie-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'cookie-banner';
    banner.className = 'fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-md bg-stone-900/95 text-stone-200 p-5 md:p-6 shadow-2xl z-[100] rounded-3xl border border-stone-700/80 backdrop-blur-md flex flex-col gap-4';
    
    banner.innerHTML = `
        <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-2xl bg-terracotta-500/10 border border-terracotta-500/30 flex items-center justify-center flex-shrink-0">
                <svg class="w-5 h-5 text-terracotta-500" viewBox="0 0 24 24" fill="currentColor"><path d="M10 2h4v8h8v4h-8v8h-4v-8H2v-4h8V2z"/></svg>
            </div>
            <div>
                <h4 class="text-white font-extrabold text-base tracking-tight flex items-center gap-1.5">
                    Confidentialité & Expérience
                </h4>
                <p class="text-xs text-stone-300 mt-1 leading-relaxed">
                    Pour vous proposer les remorques les plus proches et optimiser votre expérience, nous utilisons des cookies analytiques internes 100% sécurisés.
                </p>
            </div>
        </div>

        <!-- Engagements suisses réassurance -->
        <div class="bg-stone-800/60 rounded-2xl p-3 border border-stone-700/50 space-y-1.5 text-[11px] text-stone-300">
            <div class="flex items-center gap-2">
                <svg class="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                <span>Calcul des remorques disponibles à proximité</span>
            </div>
            <div class="flex items-center gap-2">
                <svg class="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                <span>Hébergement sécurisé en Suisse (nLPD)</span>
            </div>
            <div class="flex items-center gap-2">
                <svg class="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                <span>Zéro revente de données & Zéro publicité</span>
            </div>
        </div>

        <!-- Boutons d'action : Hiérarchie persuasive légale -->
        <div class="flex flex-col items-center gap-2 pt-1 w-full">
            <button id="btn-accept-cookies" class="w-full py-3.5 px-6 bg-terracotta-500 hover:bg-terracotta-600 active:scale-95 text-white font-extrabold rounded-2xl shadow-lg shadow-terracotta-500/25 transition-all text-sm flex items-center justify-center gap-2">
                <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                <span>Accepter & Continuer</span>
            </button>
            <button id="btn-refuse-cookies" class="text-xs text-stone-400 hover:text-stone-200 transition-colors py-1.5 underline underline-offset-4 decoration-stone-600 hover:decoration-stone-300">
                Continuer sans accepter
            </button>
        </div>
    `;

    document.body.appendChild(banner);

    document.getElementById('btn-accept-cookies').addEventListener('click', () => {
        localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
        banner.remove();
        startTracking();
    });

    document.getElementById('btn-refuse-cookies').addEventListener('click', () => {
        localStorage.setItem(COOKIE_CONSENT_KEY, 'refused');
        if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem(COOKIE_SESSION_REFUSED_KEY, 'true');
        }
        banner.remove();
    });
}

async function startTracking() {
    // Vérification de la variable globale supabaseClient (déclarée dans core.js)
    if (typeof supabaseClient === 'undefined') return;

    let sessionId = sessionStorage.getItem('renger_session_id');
    if (!sessionId) {
        sessionId = crypto.randomUUID();
        sessionStorage.setItem('renger_session_id', sessionId);
    }

    // Tracker la vue de page actuelle
    try {
        const userId = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.id : null;
        await supabaseClient.from('analytics_events').insert([{
            event_name: 'page_view',
            page_url: window.location.pathname + window.location.search,
            session_id: sessionId,
            user_id: userId
        }]);
    } catch (e) {
        console.warn('Erreur tracking:', e.message);
    }
}

// Initialisation au chargement
document.addEventListener('DOMContentLoaded', initCookieBanner);


// ==========================================
// COLLECTE DES RECHERCHES DU CATALOGUE (alimente Syni Copilot)
// ==========================================
// Minimisation (nLPD/RGPD) : uniquement si consentement "accepted", aucun user_id,
// texte tronqué à 80 caractères, une même recherche n'est pas réenregistrée dans les 30 s.
const SEARCH_VALID_CATEGORIES = ['all', 'utilitaire', 'cheval', 'voiture', 'moto', 'refrigere', 'porte-velo', 'bagage'];
let lastTrackedSearchSignature = '';
let lastTrackedSearchAt = 0;

function buildSearchEventPayload({ category, searchText, hasDates, trailers }) {
    const cat = SEARCH_VALID_CATEGORIES.includes(category) ? category : 'all';
    const text = String(searchText || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    const prices = (Array.isArray(trailers) ? trailers : [])
        .map(t => Number(t && t.price))
        .filter(p => Number.isFinite(p) && p >= 0 && p <= 100000);
    const round2 = (n) => Math.round(n * 100) / 100;
    return {
        category: cat,
        search_text: text || null,
        has_dates: !!hasDates,
        results_count: Math.min(10000, Array.isArray(trailers) ? trailers.length : 0),
        results_avg_price: prices.length ? round2(prices.reduce((a, b) => a + b, 0) / prices.length) : null,
        results_min_price: prices.length ? round2(Math.min(...prices)) : null,
        results_max_price: prices.length ? round2(Math.max(...prices)) : null
    };
}

async function trackSearch(params) {
    try {
        if (typeof supabaseClient === 'undefined' || !supabaseClient) return false;
        if (localStorage.getItem(COOKIE_CONSENT_KEY) !== 'accepted') return false;

        const payload = buildSearchEventPayload(params || {});
        // Une navigation "toutes catégories" sans texte ni dates n'est pas une recherche active
        if (payload.category === 'all' && !payload.search_text && !payload.has_dates) return false;

        const signature = JSON.stringify([payload.category, payload.search_text, payload.has_dates]);
        const now = Date.now();
        if (signature === lastTrackedSearchSignature && now - lastTrackedSearchAt < 30000) return false;
        lastTrackedSearchSignature = signature;
        lastTrackedSearchAt = now;

        payload.session_id = sessionStorage.getItem('renger_session_id') || null;
        const { error } = await supabaseClient.from('search_events').insert([payload]);
        return !error;
    } catch (e) {
        return false;
    }
}

if (typeof window !== 'undefined') {
    window.trackSearch = trackSearch;
    window.buildSearchEventPayload = buildSearchEventPayload;
}
