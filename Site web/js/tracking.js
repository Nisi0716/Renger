// ==========================================
// TRACKING & COOKIES (RGPD / nLPD)
// ==========================================

const COOKIE_CONSENT_KEY = 'renger_cookie_consent';

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
    banner.className = 'fixed bottom-0 left-0 w-full bg-stone-900 text-stone-300 p-4 md:p-6 shadow-2xl z-[100] flex flex-col md:flex-row items-center justify-between gap-4 border-t border-stone-800';
    
    banner.innerHTML = `
        <div class="text-sm">
            <h4 class="text-white font-bold mb-1">Confidentialité & Cookies (nLPD/RGPD)</h4>
            <p>Nous utilisons des cookies analytiques internes sécurisés pour mesurer l'audience et améliorer la plateforme. Aucune donnée n'est vendue à des tiers.</p>
        </div>
        <div class="flex items-center gap-3 flex-shrink-0 w-full md:w-auto">
            <button id="btn-refuse-cookies" class="flex-1 md:flex-none px-4 py-2 text-stone-400 hover:text-white font-medium transition">Refuser</button>
            <button id="btn-accept-cookies" class="flex-1 md:flex-none px-6 py-2 bg-terracotta-500 hover:bg-terracotta-600 text-white font-bold rounded-xl transition">Accepter</button>
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

