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
            <div class="w-10 h-10 rounded-2xl bg-terracotta-500/10 border border-terracotta-500/30 flex items-center justify-center text-xl flex-shrink-0">
                🇨🇭
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
                <span class="text-emerald-400 font-bold">✓</span>
                <span>Calcul des remorques disponibles à proximité</span>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-emerald-400 font-bold">✓</span>
                <span>Hébergement sécurisé en Suisse (nLPD)</span>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-emerald-400 font-bold">✓</span>
                <span>Zéro revente de données & Zéro publicité</span>
            </div>
        </div>

        <!-- Boutons d'action : Hiérarchie persuasive légale -->
        <div class="flex flex-col items-center gap-2 pt-1 w-full">
            <button id="btn-accept-cookies" class="w-full py-3.5 px-6 bg-terracotta-500 hover:bg-terracotta-600 active:scale-95 text-white font-extrabold rounded-2xl shadow-lg shadow-terracotta-500/25 transition-all text-sm flex items-center justify-center gap-2">
                <span>🛡️</span>
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

