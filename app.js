// ==========================================
// 1. INITIALISATION & TRADUCTIONS
// ==========================================
const supabaseUrl = 'https://cwifrzajxrcpnqceyxnj.supabase.co';
const supabaseKey = 'sb_publishable_b8sieHW3SGLka8GSxRfr_w_eM3wtyYc';
const supabaseClient = window.supabase ? window.supabase.createClient(supabaseUrl, supabaseKey) : null;

// ==========================================
// HELPER API SÉCURISÉ (EDGE FUNCTIONS)
// ==========================================
async function callEdgeFunction(functionName, payload = {}) {
    if (!supabaseClient) throw new Error("Client Supabase non initialisé.");
    
    // Récupération de la session active et de son JWT
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
    if (sessionError) throw sessionError;

    // Si l'utilisateur est authentifié, on transmet son access_token, sinon la clé publique
    const token = session?.access_token || supabaseKey;
    
    const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'apikey': supabaseKey
        },
        body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.error || data.message || `Erreur serveur (${response.status})`);
    }
    return data;
}

let currentUser = null;
let currentTrailer = null; 
let bookingCalendar = null; 
let selectedStartDate = null;
let selectedEndDate = null;
let videoStream = null;
let currentFilter = 'all'; // Filtre actif sur la page des annonces
let toastTimer = null; // Timer d'annulation pour éviter la collision des notifications toast
let activeChatPartnerId = null; // ID du destinataire de la conversation active
let currentBookingContext = null; // Contexte de réservation pour la transaction active

/**
 * Formate un objet Date en chaîne SQL standard YYYY-MM-DD
 * en préservant le fuseau horaire local (évite le décalage UTC).
 */
function formatDateToLocalISO(date) {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

const translations = {
    fr: {
        login: "Se connecter", subtitle: "La plateforme de location de remorques entre particuliers. Trouvez la remorque parfaite ou rentabilisez la vôtre.",
        btn_buyer: "Je cherche une remorque", btn_seller: "Je loue ma remorque", back: "← Retour",
        cat_utility: "Utilitaire", cat_horse: "Chevaux", cat_car: "Voiture", recommended: "Recommandées autour de Lausanne",
        trailer_title: "Remorque fermée 750kg", per_day: "/ j", see_details: "Voir les détails",
        socket: "Prise", payload: "Charge Utile", pay_btn: "💳 Payer 70 CHF (Stripe)", photo_btn: "📸 Lancer l'état des lieux",
        publish_title: "Louer ma remorque", publish_subtitle: "Gagnez de l'argent en toute sécurité avec votre équipement.",
        import_title: "Vous avez déjà une annonce ?", import_desc: "Collez le lien de votre annonce Anibis, Tutti ou Leboncoin. Nous créerons votre profil Renger à votre place !",
        or_manual: "OU CRÉER MANUELLEMENT", form_title: "Titre de l'annonce", price_label: "Prix / Jour (CHF)", payload_input: "Charge Utile (kg)",
        socket_label: "Type de prise électrique", equip_label: "Équipements inclus (Gratuit)",
        upsell_title: "Boostez vos revenus 🚀", upsell_desc: "Proposez des options payantes additionnelles à vos locataires.",
        form_submit: "Publier et lier mon compte bancaire", auth_title: "Rejoindre Renger", auth_btn: "Continuer", cancel: "Annuler",
        footer_cgu: "Conditions Générales d'Utilisation (CGU)", theme_btn: "Mode sombre/clair",
        detail_desc: "Cette remorque est idéale pour vos transports. Un état des lieux photographique sera exigé au départ et au retour."
    },
    en: {
        login: "Log in", subtitle: "The peer-to-peer trailer rental platform. Find the perfect trailer or rent yours out.",
        btn_buyer: "I'm looking for a trailer", btn_seller: "I rent out my trailer", back: "← Back",
        cat_utility: "Utility", cat_horse: "Horses", cat_car: "Car", recommended: "Recommended around Lausanne",
        trailer_title: "Closed trailer 750kg", per_day: "/ day", see_details: "See details",
        socket: "Socket", payload: "Payload", pay_btn: "💳 Pay 70 CHF (Stripe)", photo_btn: "📸 Start inspection",
        publish_title: "Rent out my trailer", publish_subtitle: "Earn money safely with your equipment.",
        import_title: "Already have a listing?", import_desc: "Paste your Anibis or Leboncoin link. We'll create your profile for you!",
        or_manual: "OR CREATE MANUALLY", form_title: "Listing Title", price_label: "Price / Day (CHF)", payload_input: "Payload (kg)",
        socket_label: "Socket type", equip_label: "Included equipment (Free)",
        upsell_title: "Boost your income 🚀", upsell_desc: "Offer additional paid options to your renters.",
        form_submit: "Publish & link bank account", auth_title: "Join Renger", auth_btn: "Continue", cancel: "Cancel",
        footer_cgu: "Terms and Conditions (T&C)", theme_btn: "Dark/Light mode",
        detail_desc: "This trailer is ideal for your transport needs. A photographic condition report will be required upon departure and return."
    },
    de: {
        login: "Anmelden", subtitle: "Die Plattform für die private Anhängervermietung. Finden Sie den perfekten Anhänger oder vermieten Sie Ihren.",
        btn_buyer: "Ich suche einen Anhänger", btn_seller: "Ich vermiete meinen Anhänger", back: "← Zurück",
        cat_utility: "Nutzfahrzeug", cat_horse: "Pferde", cat_car: "Auto", recommended: "Empfohlen rund um Lausanne",
        trailer_title: "Geschlossener Anhänger 750kg", per_day: "/ Tag", see_details: "Details ansehen",
        socket: "Stecker", payload: "Nutzlast", pay_btn: "💳 70 CHF bezahlen (Stripe)", photo_btn: "📸 Zustandsprotokoll starten",
        publish_title: "Meinen Anhänger vermieten", publish_subtitle: "Verdienen Sie sicher Geld mit Ihrer Ausrüstung.",
        import_title: "Haben Sie bereits eine Anzeige?", import_desc: "Fügen Sie Ihren Anibis- oder Tutti-Link ein. Wir erstellen Ihr Profil für Sie!",
        or_manual: "ODER MANUELL ERSTELLEN", form_title: "Anzeigentitel", price_label: "Preis / Tag (CHF)", payload_input: "Nutzlast (kg)",
        socket_label: "Steckertyp", equip_label: "Inklusive Ausrüstung (Kostenlos)",
        upsell_title: "Steigern Sie Ihr Einkommen 🚀", upsell_desc: "Bieten Sie Ihren Mietern zusätzliche kostenpflichtige Optionen an.",
        form_submit: "Veröffentlichen & Bankkonto verknüpfen", auth_title: "Renger beitreten", auth_btn: "Weiter", cancel: "Abbrechen",
        footer_cgu: "Allgemeine Geschäftsbedingungen (AGB)", theme_btn: "Dunkel-/Hellmodus",
        detail_desc: "Dieser Anhänger ist ideal für Ihre Transporte. Ein fotografisches Zustandsprotokoll wird bei Abfahrt und Rückkehr verlangt."
    }
};

function changeLanguage(lang) {
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key]) { 
            element.innerText = translations[lang][key]; 
        }
    });
    localStorage.setItem('renger_lang', lang);
}

// ==========================================
// NOTIFICATIONS SYSTÈME (TOAST)
// ==========================================
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast-notification');
    const icon = document.getElementById('toast-icon');
    const text = document.getElementById('toast-message');

    if (!toast || !icon || !text) {
        alert(message);
        return;
    }

    // Réinitialise le timer actif pour éviter les collisions visuelles
    if (toastTimer) {
        clearTimeout(toastTimer);
        toastTimer = null;
    }

    text.innerText = message;
    
    if (type === 'success') {
        toast.className = "fixed top-5 left-1/2 transform -translate-x-1/2 translate-y-0 opacity-100 transition-all duration-500 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl font-bold text-white bg-green-500 pointer-events-none";
        icon.innerText = "🎉";
    } else if (type === 'error') {
        toast.className = "fixed top-5 left-1/2 transform -translate-x-1/2 translate-y-0 opacity-100 transition-all duration-500 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl font-bold text-white bg-red-500 pointer-events-none";
        icon.innerText = "⚠️";
    } else {
        toast.className = "fixed top-5 left-1/2 transform -translate-x-1/2 translate-y-0 opacity-100 transition-all duration-500 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl font-bold text-white bg-stone-800 pointer-events-none";
        icon.innerText = "⏳";
    }

    toastTimer = setTimeout(() => {
        toast.classList.remove('translate-y-0', 'opacity-100');
        toast.classList.add('-translate-y-24', 'opacity-0');
        toastTimer = null;
    }, 3500);
}

// ==========================================
// 2. NAVIGATION & UI
// ==========================================
const pages = ['welcome-screen', 'buyer-page', 'seller-page', 'detail-page', 'inspection-page', 'profile-page', 'settings-page', 'public-profile-page'];

function showPage(pageId) {
    // Extinction propre de la caméra dès qu'on quitte la page d'inspection (évite la fuite matérielle)
    if (pageId !== 'inspection-page' && videoStream) {
        stopCamera();
    }

    pages.forEach(p => {
        const el = document.getElementById(p);
        if (el) el.classList.add('hidden');
    });
    const target = document.getElementById(pageId);
    if (target) target.classList.remove('hidden');
    window.scrollTo(0, 0);
    
    if (pageId === 'inspection-page' && typeof startCamera === 'function') { 
        startCamera(); 
    }

    if (pageId === 'seller-page' && typeof initSellerPageDynamicTools === 'function') {
        initSellerPageDynamicTools();
    }

    // Synchronisation de l'onglet actif dans la navigation mobile
    updateMobileNavState(pageId);
}

function updateMobileNavState(pageId) {
    const navExplore = document.getElementById('mobile-nav-explore');
    const navBookings = document.getElementById('mobile-nav-bookings');
    const navSettings = document.getElementById('mobile-nav-settings');
    if (!navExplore || !navBookings || !navSettings) return;

    const inactiveClass = "mobile-nav-btn flex flex-col items-center gap-1 w-20 text-stone-400 hover:text-terracotta-500 transition-transform active:scale-95";
    const activeClass = "mobile-nav-btn flex flex-col items-center gap-1 w-20 text-terracotta-500 transition-transform active:scale-95";

    navExplore.className = (pageId === 'buyer-page' || pageId === 'welcome-screen' || pageId === 'detail-page' || pageId === 'seller-page') ? activeClass : inactiveClass;
    navBookings.className = (pageId === 'profile-page') ? activeClass : inactiveClass;
    navSettings.className = (pageId === 'settings-page' || pageId === 'public-profile-page') ? activeClass : inactiveClass;
}

function showWelcomeScreen() { showPage('welcome-screen'); }

function openAuthModal() { 
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.remove('hidden');
    showLoginPanel(); // Toujours ouvrir sur le panneau connexion
}

function closeAuthModal() { 
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.add('hidden'); 
}

function handleAuthModalBackdrop(event) {
    if (event.target === document.getElementById('auth-modal')) {
        closeAuthModal();
    }
}

function handleBookingConfirmModalBackdrop(event) {
    if (event.target === document.getElementById('booking-confirm-modal')) {
        closeBookingConfirmModal();
    }
}

// Écouteur global pour fermer la modale active avec la touche Échap
document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;

    const modals = [
        { id: 'review-modal', close: closeReviewModal },
        { id: 'chat-modal', close: closeChatModal },
        { id: 'booking-confirm-modal', close: closeBookingConfirmModal },
        { id: 'auth-modal', close: closeAuthModal }
    ];

    for (const m of modals) {
        const el = document.getElementById(m.id);
        if (el && !el.classList.contains('hidden')) {
            m.close();
            break;
        }
    }
});

function showResetPanel() {
    document.getElementById('auth-panel-login').classList.add('hidden');
    document.getElementById('auth-panel-reset').classList.remove('hidden');
    // Pré-remplir l'email si déjà saisi
    const loginEmail = document.getElementById('login-email').value;
    if (loginEmail) document.getElementById('reset-email').value = loginEmail;
}

function showLoginPanel() {
    document.getElementById('auth-panel-reset').classList.add('hidden');
    document.getElementById('auth-panel-login').classList.remove('hidden');
}

async function handleResetPassword() {
    if (!supabaseClient) return showToast("Erreur: Supabase non chargé.", "error");
    const email = document.getElementById('reset-email').value.trim();
    if (!email) return showToast("Veuillez saisir votre email.", "error");

    const resetBtn = document.querySelector('#auth-panel-reset button[onclick="handleResetPassword()"]');
    if (resetBtn) resetBtn.disabled = true;

    try {
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin
        });
        if (error) {
            showToast("Erreur : " + error.message, "error");
        } else {
            showToast("✉️ Lien envoyé ! Vérifiez votre boîte mail.", "success");
            closeAuthModal();
        }
    } finally {
        if (resetBtn) resetBtn.disabled = false;
    }
}

// Gestion et persistance du mode sombre/clair
function initTheme() {
    const savedTheme = localStorage.getItem('renger_theme');
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
    } else if (savedTheme === 'light') {
        document.documentElement.classList.remove('dark');
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
    }
}

function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('renger_theme', isDark ? 'dark' : 'light');
}

// ==========================================
// 3. AUTHENTIFICATION & HEADER
// ==========================================

// --- Utilitaires profil ---

// Couleur d'avatar déterministe à partir du username
function avatarColor(username) {
    const COLORS = ['#d85110','#2563eb','#16a34a','#9333ea','#0891b2','#dc2626','#d97706','#0d9488'];
    let hash = 0;
    for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash);
    return COLORS[Math.abs(hash) % COLORS.length];
}

// Retourne un élément DOM avatar (photo ou initiale colorée)
function renderAvatar(profile, size = 48) {
    const wrapper = document.createElement('div');
    wrapper.style.width = size + 'px';
    wrapper.style.height = size + 'px';
    wrapper.style.borderRadius = '50%';
    wrapper.style.overflow = 'hidden';
    wrapper.style.flexShrink = '0';

    if (profile?.avatar_url) {
        const img = document.createElement('img');
        img.src = profile.avatar_url;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        wrapper.appendChild(img);
    } else {
        const initial = (profile?.username || '?')[0].toUpperCase();
        const color = avatarColor(profile?.username || '?');
        wrapper.style.background = color;
        wrapper.style.display = 'flex';
        wrapper.style.alignItems = 'center';
        wrapper.style.justifyContent = 'center';
        wrapper.style.color = '#fff';
        wrapper.style.fontWeight = '700';
        wrapper.style.fontSize = Math.round(size * 0.4) + 'px';
        wrapper.textContent = initial;
    }
    return wrapper;
}

// SVG icons pour les badges (stroke style, 16x16)
const BADGE_SVGS = {
    nouveau:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10S2 17.52 2 12c0-2.76 1.12-5.26 2.93-7.07"/><path d="M12 12c0-2.21 1.79-4 4-4"/><path d="M12 12c-2.21 0-4-1.79-4-4"/><line x1="12" y1="2" x2="12" y2="12"/></svg>`,
    proprio:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5L12 3l9 6.5V21a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    multi:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="3.5"/><path d="M21 2l-9.6 9.6"/><path d="M15.5 7.5l3 3"/></svg>`,
    actif:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>`,
    super:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    elite:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"/><line x1="5" y1="20" x2="19" y2="20"/></svg>`,
};

// Calcule les badges selon le profil et le nombre de remorques
function computeBadges(profile, trailersCount) {
    const r = profile?.completed_rentals || 0;
    const t = trailersCount || 0;
    const badges = [];

    // Toujours
    badges.push({ key: 'nouveau', label: 'Nouveau membre', color: '#6b7280' });

    if (t >= 1)  badges.push({ key: 'proprio', label: 'Propriétaire actif', color: '#d85110' });
    if (t >= 3)  badges.push({ key: 'multi',   label: 'Multi-propriétaire', color: '#9333ea' });
    if (r >= 3)  badges.push({ key: 'actif',   label: 'Membre actif',       color: '#2563eb' });
    if (r >= 10 || t >= 5) badges.push({ key: 'super', label: 'Super membre', color: '#d97706' });
    if (r >= 25 || t >= 10) badges.push({ key: 'elite', label: 'Elite Renger', color: '#16a34a' });

    return badges;
}

// Génère un élément DOM de badge avec SVG + label
function renderBadge(badge, compact = false) {
    const el = document.createElement('span');
    el.title = badge.label;
    el.style.color = badge.color;
    el.className = compact
        ? 'inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border'
        : 'inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border';
    el.style.borderColor = badge.color + '55';
    el.style.background = badge.color + '11';

    const icon = document.createElement('span');
    icon.style.width = '14px';
    icon.style.height = '14px';
    icon.style.display = 'inline-block';
    icon.style.flexShrink = '0';
    icon.innerHTML = BADGE_SVGS[badge.key] || '';
    el.appendChild(icon);

    if (!compact) {
        const label = document.createElement('span');
        label.textContent = badge.label;
        el.appendChild(label);
    }
    return el;
}

// Validation format username
function validateUsernameFormat(username) {
    return /^[a-z0-9._-]{1,20}$/.test(username);
}

// Vérification disponibilité username (debounce 400ms)
let usernameCheckTimer = null;
async function checkUsernameAvailability(value) {
    const icon = document.getElementById('username-status-icon');
    const feedback = document.getElementById('username-feedback');
    if (!icon || !feedback) return;

    const username = value.trim().toLowerCase();

    if (!username) {
        icon.innerHTML = '';
        feedback.textContent = 'Lettres minuscules, chiffres, . - _ — 1 à 20 caractères';
        feedback.className = 'text-xs mt-1 text-stone-400';
        return;
    }
    if (!validateUsernameFormat(username)) {
        icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
        feedback.textContent = 'Format invalide — lettres minuscules, chiffres, . - _ uniquement';
        feedback.className = 'text-xs mt-1 text-red-500';
        return;
    }

    // Spinner pendant la vérification
    icon.innerHTML = `<svg class="animate-spin" viewBox="0 0 24 24" fill="none" stroke="#a8a29e" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>`;
    feedback.textContent = 'Vérification...';
    feedback.className = 'text-xs mt-1 text-stone-400';

    clearTimeout(usernameCheckTimer);
    usernameCheckTimer = setTimeout(async () => {
        const { data } = await supabaseClient.from('profiles').select('username').eq('username', username).maybeSingle();
        if (data) {
            icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
            feedback.textContent = '@' + username + ' est déjà pris';
            feedback.className = 'text-xs mt-1 text-red-500';
        } else {
            icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-5"/></svg>`;
            feedback.textContent = '@' + username + ' est disponible !';
            feedback.className = 'text-xs mt-1 text-green-600';
        }
    }, 400);
}

// --- Auth ---

async function handleSignup() {
    if (!supabaseClient) return showToast("Erreur: Supabase non chargé.", "error");
    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const username = (document.getElementById('signup-username')?.value || '').trim().toLowerCase();

    if (!username) return showToast("Veuillez choisir un nom d'utilisateur.", "error");
    if (!validateUsernameFormat(username)) return showToast("Format du nom d'utilisateur invalide.", "error");

    const signupBtn = document.querySelector('#auth-panel-login button[onclick="handleSignup()"]');
    if (signupBtn) signupBtn.disabled = true;

    try {
        // Vérifier unicité une dernière fois avant d'inscrire
        const { data: existing } = await supabaseClient.from('profiles').select('username').eq('username', username).maybeSingle();
        if (existing) return showToast("Ce nom d'utilisateur est déjà pris.", "error");

        const { data: signupData, error } = await supabaseClient.auth.signUp({ email, password });
        if (error) return showToast("Erreur d'inscription : " + error.message, "error");

        // Créer le profil avec le username choisi
        if (signupData?.user) {
            await supabaseClient.from('profiles').insert({
                id: signupData.user.id,
                username: username
            });
        }
        showToast("Inscription réussie ! Bienvenue @" + username, "success");
        closeAuthModal();
        checkUser();
    } finally {
        if (signupBtn) signupBtn.disabled = false;
    }
}

// Connexion via Google OAuth
async function handleGoogleLogin() {
    if (!supabaseClient) return showToast("Erreur: Supabase non chargé.", "error");
    const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin + window.location.pathname
        }
    });
    if (error) showToast("Erreur Google : " + error.message, "error");
    // Supabase redirige vers Google — le retour est géré dans DOMContentLoaded via onAuthStateChange
}

// Crée un profil si l'utilisateur n'en a pas encore (pour les connexions OAuth/Google)
async function ensureProfileExists(user) {
    if (!user || !supabaseClient) return;

    const { data: existing, error: fetchErr } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

    if (existing || fetchErr) return; // Profil déjà présent ou erreur de requête

    // Générer un username depuis l'email Google ou via l'UUID
    let base = (user.email || '').split('@')[0]
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, '_')
        .substring(0, 16);
    if (!base || base.length < 1) base = 'user';

    // Vérifier disponibilité et ajouter un suffixe si nécessaire (max 20 essais)
    let username = base;
    let suffix = 1;
    while (suffix <= 20) {
        const { data: taken } = await supabaseClient
            .from('profiles')
            .select('id')
            .eq('username', username)
            .maybeSingle();
        if (!taken) break;
        username = base.substring(0, 14) + '_' + suffix;
        suffix++;
    }
    if (suffix > 20) {
        username = 'user_' + user.id.replace(/-/g, '').substring(0, 8);
    }

    await supabaseClient.from('profiles').insert({ id: user.id, username });
    showToast("Bienvenue sur Renger ! Votre username : @" + username + " (modifiable dans Paramètres)", "success");
}

async function handleLogin() {
    if (!supabaseClient) return showToast("Erreur: Supabase non chargé.", "error");
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const loginBtn = document.querySelector('#auth-panel-login button[onclick="handleLogin()"]');
    if (loginBtn) loginBtn.disabled = true;

    try {
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) {
            showToast("Erreur de connexion : " + error.message, "error");
        } else {
            closeAuthModal();
            checkUser();
        }
    } finally {
        if (loginBtn) loginBtn.disabled = false;
    }
}

async function handleLogout() {
    if (!supabaseClient) return;
    await supabaseClient.auth.signOut();
    checkUser();
    showWelcomeScreen();
}

async function checkUser() {
    if (!supabaseClient) return;
    const { data: { user } } = await supabaseClient.auth.getUser();
    currentUser = user;
    const container = document.getElementById('user-menu-container');
    if (!container) return;
    
    if (currentUser) {
        // Auto-créer le profil si l'utilisateur vient de se connecter via Google (ou autre OAuth)
        ensureProfileExists(currentUser);

        container.innerHTML = `
            <div class="flex items-center gap-4">
                <button onclick="openProfile()" class="text-stone-600 dark:text-stone-300 font-bold hover:text-terracotta-500 transition hidden md:block">Mon Espace</button>
                <button onclick="openSettings()" class="text-stone-600 dark:text-stone-300 font-bold hover:text-terracotta-500 transition">Paramètres</button>
                <button onclick="handleLogout()" class="text-stone-400 text-sm hover:underline">Déconnexion</button>
            </div>`;
    } else {
        container.innerHTML = `<button onclick="openAuthModal()" class="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-200 font-semibold py-2 px-4 rounded-xl">Se connecter</button>`;
    }
}

// Mapping catégories → emoji+label pour les badges
const CATEGORY_MAP = {
    utilitaire:   { emoji: '📦', label: 'Utilitaire' },
    cheval:       { emoji: '🐴', label: 'Cheval' },
    voiture:      { emoji: '🚗', label: 'Voiture' },
    moto:         { emoji: '🏍️', label: 'Moto' },
    refrigere:    { emoji: '❄️', label: 'Réfrigéré' },
    'porte-velo': { emoji: '🚲', label: 'Porte-vélo' },
    bagage:       { emoji: '🧳', label: 'Bagage de toit' },
};
const FILTER_LABELS = {
    all: 'Recommandées autour de Lausanne',
    ...Object.fromEntries(Object.entries(CATEGORY_MAP).map(([k, v]) => [k, `${v.emoji} ${v.label}s`]))
};

// Affiche des cartes skeleton pendant le chargement
function showSkeletonCards(count = 6) {
    const grid = document.getElementById('trailers-grid');
    if (!grid) return;
    grid.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const sk = document.createElement('div');
        sk.className = 'bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 overflow-hidden animate-pulse';
        sk.innerHTML = `
            <div class="h-48 bg-stone-200 dark:bg-stone-700"></div>
            <div class="p-5">
                <div class="h-5 bg-stone-200 dark:bg-stone-700 rounded-lg mb-3 w-3/4"></div>
                <div class="h-4 bg-stone-100 dark:bg-stone-600 rounded-lg mb-4 w-1/2"></div>
                <div class="h-10 bg-stone-100 dark:bg-stone-600 rounded-xl"></div>
            </div>
        `;
        grid.appendChild(sk);
    }
}

let currentSearch = '';
let searchDebounceTimer = null;

function handleSearch(term) {
    // Désamorçage injection PostgREST : suppression des virgules, parenthèses, crochets et antislashs
    currentSearch = (term || '').replace(/[,()[\]\\"]/g, '').trim();
    // Debounce : on attend 350ms après la dernière frappe avant de requêter
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
        loadTrailers(currentFilter, currentSearch);
    }, 350);
}

async function loadTrailers(filter = currentFilter, search = currentSearch) {
    if (!supabaseClient) return;

    showSkeletonCards(6);

    // Assainissement supplémentaire du terme de recherche
    const cleanSearch = (search || '').replace(/[,()[\]\\"]/g, '').trim();

    let query = supabaseClient.from('trailers').select('*').order('id', { ascending: false });

    if (filter && filter !== 'all') {
        query = query.eq('category', filter);
    }
    if (cleanSearch) {
        // Recherche insensible à la casse dans le titre et la description avec terme assaini
        query = query.or(`title.ilike.%${cleanSearch}%,description.ilike.%${cleanSearch}%`);
    }

    const { data: trailers, error } = await query;

    const grid = document.getElementById('trailers-grid');
    if (!grid) return;
    grid.innerHTML = '';

    // Titre de section dynamique
    const titleEl = document.getElementById('filter-title');
    if (titleEl) {
        if (cleanSearch) {
            titleEl.textContent = `Résultats pour "${cleanSearch}"`;
        } else {
            titleEl.textContent = FILTER_LABELS[filter] || 'Annonces';
        }
    }

    if (error || !trailers || trailers.length === 0) {
        const msg = document.createElement('p');
        msg.className = 'col-span-3 text-center text-stone-400 italic py-12';
        msg.textContent = cleanSearch
            ? `Aucun résultat pour "${cleanSearch}". Essayez un autre terme.`
            : 'Aucune remorque disponible dans cette catégorie pour le moment.';
        grid.appendChild(msg);
        return;
    }

    const fragment = document.createDocumentFragment();
    trailers.forEach(trailer => {
        const card = document.createElement('div');
        card.className = "bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 overflow-hidden hover:shadow-md cursor-pointer transition";
        card.onclick = () => openTrailerDetail(trailer);

        const imgUrl = trailer.image_url || "https://placehold.co/600x400/f5f5f4/a8a29e?text=Renger";
        const cat = CATEGORY_MAP[trailer.category];

        // CORRECTION XSS : L'URL n'est plus interpolée dans le HTML, l'élément img est rempli via .src
        card.innerHTML = `
            <div class="h-48 bg-stone-200 dark:bg-stone-700 relative">
                <img class="trailer-card-img w-full h-full object-cover" alt="">
                <div class="absolute top-3 right-3 bg-white dark:bg-stone-900 px-2 py-1 rounded-lg text-sm font-bold shadow dark:text-white"><span class="safe-price"></span> CHF<span class="text-xs font-normal">/j</span></div>
                ${cat ? `<div class="absolute bottom-3 left-3 bg-black/50 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-lg">${cat.emoji} <span class="safe-cat"></span></div>` : ''}
            </div>
            <div class="p-5">
                <div class="flex justify-between items-start gap-2 mb-1">
                    <h4 class="safe-title font-bold text-lg dark:text-white flex-1 truncate"></h4>
                    <div class="trailer-rating-badge flex-shrink-0"></div>
                </div>
                <p class="text-sm text-stone-500 dark:text-stone-400 mb-4">📍 Vaud</p>
                <button class="w-full bg-terracotta-50 dark:bg-stone-700 text-terracotta-600 dark:text-terracotta-400 font-semibold py-2.5 rounded-xl">Voir les détails</button>
            </div>
        `;

        // Assignation sécurisée des attributs et contenus textuels (aucun risque XSS)
        card.querySelector('.trailer-card-img').src = imgUrl;
        card.querySelector('.safe-title').textContent = trailer.title;
        card.querySelector('.safe-price').textContent = trailer.price;
        if (cat) card.querySelector('.safe-cat').textContent = cat.label;

        // Badge d'évaluation
        const ratingBadgeSlot = card.querySelector('.trailer-rating-badge');
        if (ratingBadgeSlot) {
            ratingBadgeSlot.appendChild(renderRatingBadge(trailer.rating_avg, trailer.rating_count, false));
        }

        fragment.appendChild(card);
    });
    grid.appendChild(fragment);
}

// Gestion des boutons de filtre (état visuel actif + rechargement)
function setFilter(category) {
    currentFilter = category;
    // Réinitialise aussi la recherche textuelle pour éviter les conflits
    currentSearch = '';
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';

    const allFilterIds = ['all', 'utilitaire', 'cheval', 'voiture', 'moto', 'refrigere', 'porte-velo', 'bagage'];
    allFilterIds.forEach(id => {
        const btn = document.getElementById(`filter-${id}`);
        if (!btn) return;
        btn.className = 'flex flex-col items-center justify-center min-w-[90px] h-24 bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 shadow-sm hover:border-terracotta-500 transition focus:outline-none';
    });

    const activeBtn = document.getElementById(`filter-${category}`);
    if (activeBtn) {
        activeBtn.className = 'flex flex-col items-center justify-center min-w-[90px] h-24 bg-terracotta-500 text-white rounded-xl border-2 border-terracotta-500 shadow-sm transition focus:outline-none';
    }

    loadTrailers(category, '');
}

// Tableau en mémoire des fichiers photo en attente de publication
let pendingPhotos = []; // Array de { file: File, objectUrl: string }

/**
 * Appelée quand l'utilisateur sélectionne des fichiers depuis le picker.
 * Ajoute les nouveaux fichiers à pendingPhotos[] dans la limite de 10.
 * Utilise URL.createObjectURL pour un affichage instantané sans surcharger la mémoire en base64.
 */
async function validateImageMagicBytes(file) {
    let buffer;
    if (file.slice && typeof file.arrayBuffer === 'function') {
        buffer = await file.slice(0, 4).arrayBuffer();
    } else {
        buffer = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsArrayBuffer(file.slice ? file.slice(0, 4) : file);
        });
    }
    const bytes = new Uint8Array(buffer);
    const isJpeg = bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF;
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47;
    const isWebp = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46; // RIFF
    return isJpeg || isPng || isWebp;
}

async function handleMultiPhotoSelect(event) {
    const files = Array.from(event.target.files);
    const remaining = 10 - pendingPhotos.length;

    if (files.length > remaining) {
        showToast(`Maximum 10 photos. Vous pouvez encore en ajouter ${remaining}.`, 'error');
    }

    const toAdd = files.slice(0, remaining);

    for (const file of toAdd) {
        // Vérification taille (max 5 Mo par photo)
        if (file.size > 5 * 1024 * 1024) {
            showToast(`"${file.name}" dépasse 5 Mo et a été ignorée.`, 'error');
            continue;
        }
        
        const ext = file.name.split('.').pop().toLowerCase();
        if (['svg', 'html', 'htm'].includes(ext)) {
            showToast(`L'extension de "${file.name}" n'est pas autorisée.`, 'error');
            continue;
        }
        
        const isValid = await validateImageMagicBytes(file);
        if (!isValid) {
            showToast(`Le fichier "${file.name}" n'est pas une image valide.`, 'error');
            continue;
        }

        const objectUrl = URL.createObjectURL(file);
        pendingPhotos.push({ file, objectUrl });
    }

    renderPhotoGrid();

    // Reset l'input pour permettre de sélectionner les mêmes fichiers à nouveau
    event.target.value = '';
}

/**
 * Reconstruit la grille de vignettes avec les photos en attente.
 */
function renderPhotoGrid() {
    const grid = document.getElementById('photo-grid');
    const badge = document.getElementById('photo-count-badge');
    if (!grid) return;

    grid.innerHTML = '';

    // Vignettes des photos déjà sélectionnées
    pendingPhotos.forEach((photo, index) => {
        const tile = document.createElement('div');
        tile.className = 'relative aspect-square rounded-2xl overflow-hidden bg-stone-200 dark:bg-stone-700 group';

        const img = document.createElement('img');
        img.src = photo.objectUrl;
        img.className = 'w-full h-full object-cover';
        img.alt = `Photo ${index + 1}`;

        // Bouton supprimer
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'absolute top-1.5 right-1.5 w-7 h-7 bg-black/60 hover:bg-red-500 text-white rounded-full flex items-center justify-center text-sm font-bold transition opacity-0 group-hover:opacity-100';
        removeBtn.textContent = '×';
        removeBtn.onclick = () => removePhoto(index);

        // Badge "Photo principale" sur la 1ère
        if (index === 0) {
            const badge0 = document.createElement('div');
            badge0.className = 'absolute bottom-1.5 left-1.5 bg-terracotta-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full';
            badge0.textContent = 'Couverture';
            tile.appendChild(badge0);
        }

        tile.appendChild(img);
        tile.appendChild(removeBtn);
        grid.appendChild(tile);
    });

    // Tuile d'ajout (seulement si < 10 photos)
    if (pendingPhotos.length < 10) {
        const addTile = document.createElement('button');
        addTile.type = 'button';
        addTile.id = 'add-photo-tile';
        addTile.className = 'aspect-square rounded-2xl border-2 border-dashed border-stone-300 dark:border-stone-600 flex flex-col items-center justify-center gap-1 hover:bg-stone-50 dark:hover:bg-stone-700 transition text-stone-400 hover:text-terracotta-500 hover:border-terracotta-400';
        addTile.onclick = () => document.getElementById('file-upload').click();
        addTile.innerHTML = `
            <svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
            </svg>
            <span class="text-xs font-semibold">Ajouter</span>
        `;
        grid.appendChild(addTile);
    }

    // Mise à jour du compteur
    if (badge) {
        badge.textContent = `${pendingPhotos.length} / 10`;
        badge.className = pendingPhotos.length > 0
            ? 'text-xs font-bold text-terracotta-600 bg-terracotta-50 dark:bg-stone-700 px-3 py-1 rounded-full'
            : 'text-xs font-bold text-stone-400 bg-stone-100 dark:bg-stone-700 px-3 py-1 rounded-full';
    }
}

/**
 * Retire une photo de pendingPhotos[] par son index et libère l'URL d'objet Blob.
 */
function removePhoto(index) {
    if (pendingPhotos[index]?.objectUrl) {
        URL.revokeObjectURL(pendingPhotos[index].objectUrl);
    }
    pendingPhotos.splice(index, 1);
    renderPhotoGrid();
}

// ==========================================
// OUTILS DYNAMIQUES DE VENTE (SMART PRICING & GÉNÉRATEUR)
// ==========================================

let hasUserEditedDescription = false;
let sellerDynamicToolsInitialized = false;

/**
 * Calcule la fourchette de prix optimale recommandée (en CHF)
 * selon la catégorie et la charge utile de la remorque.
 */
function getSmartPricingRange() {
    const category = document.querySelector('input[name="category"]:checked')?.value || 'utilitaire';
    const payload = parseInt(document.getElementById('ad-payload')?.value, 10) || 500;
    
    let minOptimal = 40;
    let maxOptimal = 60;
    let suggested = 50;

    switch (category) {
        case 'cheval':
            minOptimal = 110;
            maxOptimal = 160;
            suggested = 135;
            break;
        case 'voiture':
            minOptimal = 90;
            maxOptimal = 140;
            suggested = 115;
            break;
        case 'refrigere':
            minOptimal = 100;
            maxOptimal = 160;
            suggested = 130;
            break;
        case 'moto':
            minOptimal = 45;
            maxOptimal = 70;
            suggested = 55;
            break;
        case 'porte-velo':
            minOptimal = 30;
            maxOptimal = 50;
            suggested = 40;
            break;
        case 'utilitaire':
        default:
            if (payload <= 500) {
                minOptimal = 35;
                maxOptimal = 50;
                suggested = 40;
            } else if (payload <= 750) {
                minOptimal = 45;
                maxOptimal = 65;
                suggested = 50;
            } else if (payload <= 1300) {
                minOptimal = 60;
                maxOptimal = 85;
                suggested = 70;
            } else {
                minOptimal = 75;
                maxOptimal = 110;
                suggested = 85;
            }
            break;
    }

    return { minOptimal, maxOptimal, suggested, category, payload };
}

/**
 * Met à jour dynamiquement la jauge visuelle à 3 segments et les conseils de prix.
 */
function updateSmartPricingFeedback() {
    const priceInput = document.getElementById('ad-price');
    const tag = document.getElementById('price-suggested-tag');
    const gaugeLow = document.getElementById('gauge-low');
    const gaugeOpt = document.getElementById('gauge-optimal');
    const gaugeHigh = document.getElementById('gauge-high');
    const box = document.getElementById('pricing-feedback-box');
    const icon = document.getElementById('pricing-feedback-icon');
    const text = document.getElementById('pricing-feedback-text');

    if (!gaugeLow || !gaugeOpt || !gaugeHigh || !box || !text) return;

    const range = getSmartPricingRange();
    if (tag) {
        tag.textContent = `Conseillé : ${range.suggested} CHF`;
    }

    const rawVal = priceInput?.value;
    const price = parseInt(rawVal, 10);

    const lowBase = "h-full w-1/4 rounded-l-full transition-all duration-300";
    const optBase = "h-full w-2/4 transition-all duration-300";
    const highBase = "h-full w-1/4 rounded-r-full transition-all duration-300";

    if (isNaN(price) || price <= 0 || !rawVal) {
        // État neutre par défaut
        gaugeLow.className = `${lowBase} bg-stone-200 dark:bg-stone-700`;
        gaugeOpt.className = `${optBase} bg-stone-200 dark:bg-stone-700`;
        gaugeHigh.className = `${highBase} bg-stone-200 dark:bg-stone-700`;
        box.className = "p-2.5 rounded-xl text-xs flex items-start gap-2 bg-stone-50 dark:bg-stone-900 border border-stone-200/60 dark:border-stone-700 transition-all duration-200 text-stone-600 dark:text-stone-300";
        if (icon) icon.textContent = "💡";
        text.innerHTML = `Fourchette recommandée : <strong class="font-bold text-stone-800 dark:text-white">${range.minOptimal} à ${range.maxOptimal} CHF / jour</strong> (optimal : <strong class="text-terracotta-600 dark:text-terracotta-400 font-bold">${range.suggested} CHF</strong>).`;
        return;
    }

    if (price < range.minOptimal) {
        // Prix en-dessous : Zone économique attractive
        gaugeLow.className = `${lowBase} bg-amber-400 dark:bg-amber-500 shadow-xs`;
        gaugeOpt.className = `${optBase} bg-stone-200 dark:bg-stone-700`;
        gaugeHigh.className = `${highBase} bg-stone-200 dark:bg-stone-700`;
        box.className = "p-2.5 rounded-xl text-xs flex items-start gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-200 transition-all duration-200";
        if (icon) icon.textContent = "📉";
        text.innerHTML = `<strong>Prix attractif (${price} CHF) :</strong> Vous trouverez preneur très vite ! Vous pourriez monter jusqu'à <strong>${range.minOptimal}-${range.maxOptimal} CHF</strong> pour maximiser vos gains.`;
    } else if (price <= range.maxOptimal) {
        // Zone optimale : VERT
        gaugeLow.className = `${lowBase} bg-stone-200 dark:bg-stone-700`;
        gaugeOpt.className = `${optBase} bg-emerald-500 shadow-sm animate-pulse`;
        gaugeHigh.className = `${highBase} bg-stone-200 dark:bg-stone-700`;
        box.className = "p-2.5 rounded-xl text-xs flex items-start gap-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200 transition-all duration-200";
        if (icon) icon.textContent = "🎯";
        text.innerHTML = `<strong>Prix optimal (${price} CHF) !</strong> Les annonces dans la zone verte reçoivent <strong>3x plus de demandes</strong> et maximisent votre rentabilité.`;
    } else if (price <= range.maxOptimal * 1.35) {
        // Au-dessus : ORANGE
        gaugeLow.className = `${lowBase} bg-stone-200 dark:bg-stone-700`;
        gaugeOpt.className = `${optBase} bg-stone-200 dark:bg-stone-700`;
        gaugeHigh.className = `${highBase} bg-orange-400 dark:bg-orange-500 shadow-xs`;
        box.className = "p-2.5 rounded-xl text-xs flex items-start gap-2 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/40 text-orange-900 dark:text-orange-200 transition-all duration-200";
        if (icon) icon.textContent = "⚠️";
        text.innerHTML = `<strong>Prix supérieur à la moyenne (${price} CHF) :</strong> Cela peut freiner les demandes. Une fourchette entre <strong>${range.minOptimal} et ${range.maxOptimal} CHF</strong> favorise une location rapide.`;
    } else {
        // Très au-dessus : ROUGE
        gaugeLow.className = `${lowBase} bg-stone-200 dark:bg-stone-700`;
        gaugeOpt.className = `${optBase} bg-stone-200 dark:bg-stone-700`;
        gaugeHigh.className = `${highBase} bg-rose-500 dark:bg-rose-600 shadow-xs`;
        box.className = "p-2.5 rounded-xl text-xs flex items-start gap-2 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 text-rose-900 dark:text-rose-200 transition-all duration-200";
        if (icon) icon.textContent = "🛑";
        text.innerHTML = `<strong>Prix très élevé (${price} CHF) :</strong> Risque important de peu ou pas de demandes. Un tarif conseillé se situe autour de <strong>${range.suggested} CHF / jour</strong>.`;
    }
}

/**
 * Applique directement le prix conseillé dans le champ de saisie
 */
function applySuggestedPrice() {
    const range = getSmartPricingRange();
    const priceInput = document.getElementById('ad-price');
    if (priceInput) {
        priceInput.value = range.suggested;
        updateSmartPricingFeedback();
    }
}

/**
 * Pédagogie Légale (Réglementation suisse LCR / OAC)
 * Détermine si le permis B est suffisant ou si le permis BE est requis
 * selon la charge utile et le type d'équipement.
 */
function updateLegalPermitBadge() {
    const payload = parseInt(document.getElementById('ad-payload')?.value, 10) || 0;
    const category = document.querySelector('input[name="category"]:checked')?.value || 'utilitaire';
    
    const indicator = document.getElementById('payload-permit-indicator');
    const icon = document.getElementById('permit-icon');
    const label = document.getElementById('permit-label');
    const sublabel = document.getElementById('permit-sublabel');
    const descLegalMention = document.getElementById('desc-legal-mention');

    // Règle LCR / OAC suisse :
    // PTAC / charge utile > 750 kg OU remorque lourde spécifique (van à chevaux, porte-voiture) => Permis BE requis
    const isHeavy = (payload > 750) || category === 'cheval' || category === 'voiture';

    if (indicator && label) {
        if (isHeavy) {
            indicator.className = "mt-2.5 p-2.5 rounded-xl text-xs flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 text-amber-800 dark:text-amber-300 transition-all";
            if (icon) icon.textContent = "🪪";
            label.textContent = "Permis BE requis";
            if (sublabel) {
                sublabel.className = "text-[10px] text-amber-600 dark:text-amber-400 ml-auto font-medium";
                sublabel.textContent = (category === 'cheval' || category === 'voiture')
                    ? "(Équipement lourd > 750 kg)"
                    : "(Charge > 750 kg • Remorque lourde)";
            }
        } else {
            indicator.className = "mt-2.5 p-2.5 rounded-xl text-xs flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 transition-all";
            if (icon) icon.textContent = "🚗";
            label.textContent = "Permis B suffisant";
            if (sublabel) {
                sublabel.className = "text-[10px] text-emerald-600 dark:text-emerald-400 ml-auto font-medium";
                sublabel.textContent = "(Charge ≤ 750 kg • Tout conducteur)";
            }
        }
    }

    if (descLegalMention) {
        if (isHeavy) {
            descLegalMention.innerHTML = `Mention légale requise : <strong class="text-amber-600 dark:text-amber-400 font-bold">Permis BE requis</strong>`;
        } else {
            descLegalMention.innerHTML = `Mention légale incluse : <strong class="text-emerald-600 dark:text-emerald-400 font-bold">Permis B suffisant</strong>`;
        }
    }
}

/**
 * Générateur de description automatique et pédagogie légale intégrée
 */
function generateAutoDescription(force = false) {
    const descTextarea = document.getElementById('ad-desc');
    if (!descTextarea) return;

    if (!force && hasUserEditedDescription && descTextarea.value.trim() !== '') {
        return;
    }

    const title = (document.getElementById('ad-title')?.value || '').trim();
    const category = document.querySelector('input[name="category"]:checked')?.value || 'utilitaire';
    const payload = parseInt(document.getElementById('ad-payload')?.value, 10);
    const prise = document.querySelector('input[name="prise"]:checked')?.value || '7 broches';
    
    const equipmentCheckboxes = document.querySelectorAll('input[name="equipments"]:checked');
    const equipments = Array.from(equipmentCheckboxes).map(cb => cb.value);

    const upsellCheckboxes = document.querySelectorAll('input[name="upsell"]:checked');
    const upsells = Array.from(upsellCheckboxes).map(cb => cb.value);

    // 1. Phrasing catégorie & introduction
    const categoryNames = {
        'utilitaire': 'remorque utilitaire polyvalente',
        'cheval': 'van à chevaux spacieux et sécurisé',
        'voiture': 'remorque porte-voiture robuste',
        'moto': 'remorque porte-moto équipée',
        'refrigere': 'remorque frigorifique sous température dirigée',
        'porte-velo': 'remorque bagagère / porte-vélo pratique'
    };
    const catLabel = categoryNames[category] || 'remorque';

    let intro = title ? `${title}.` : `À louer : superbe ${catLabel}, propre et parfaitement entretenue.`;

    // 2. Charge utile
    let payloadSentence = '';
    if (payload && !isNaN(payload) && payload > 0) {
        payloadSentence = `Cette remorque offre une charge utile de ${payload} kg, idéale pour vos transports et déménagements.`;
    } else {
        payloadSentence = `Idéale pour vos transports, déménagements et trajets en toute sérénité.`;
    }

    // 3. Prise électrique
    let socketSentence = prise === '13 broches'
        ? "Équipée d'une prise électrique 13 broches (feux de recul et alimentation permanente inclus)."
        : "Équipée d'une prise électrique standard 7 broches compatible avec tous les véhicules légers.";

    // 4. Équipements inclus
    const equipLabels = {
        'sangles': "sangles d'arrimage professionnelles",
        'bache': "bâche de protection étanche",
        'treuil': "treuil mécanique renforcé",
        'rames': "rampes de chargement aluminium"
    };
    let equipSentence = '';
    if (equipments.length > 0) {
        const readableEquips = equipments.map(e => equipLabels[e] || e);
        if (readableEquips.length === 1) {
            equipSentence = `Équipement inclus sans supplément : ${readableEquips[0]}.`;
        } else {
            const last = readableEquips.pop();
            equipSentence = `Équipements inclus sans supplément : ${readableEquips.join(', ')} et ${last}.`;
        }
    } else {
        equipSentence = "Matériel révisé régulièrement et prêt à prendre la route immédiatement.";
    }

    // 5. Options facultatives (upsells)
    const upsellLabels = {
        'diable': 'diable de manutention',
        'sangles-pro': 'kit sangles à cliquet pro',
        'antivol': 'antivol de timon haute sécurité',
        'adaptateur': 'adaptateur 7/13 broches'
    };
    let upsellSentence = '';
    if (upsells.length > 0) {
        const readableUpsells = upsells.map(u => upsellLabels[u] || u);
        upsellSentence = `Options disponibles sur demande : ${readableUpsells.join(', ')}.`;
    }

    // 6. Mention Légale Suisse (LCR / OAC)
    const isHeavy = (payload && payload > 750) || category === 'cheval' || category === 'voiture';
    const legalNotice = isHeavy
        ? "⚖️ Réglementation suisse : **Permis BE requis** pour tracter cette remorque (charge utile > 750 kg ou véhicule spécialisé)."
        : "⚖️ Réglementation suisse : **Permis B suffisant** pour tracter cette remorque avec tout véhicule de tourisme (charge utile ≤ 750 kg).";

    // Assemblage final fluide
    const paragraphs = [
        intro,
        [payloadSentence, socketSentence, equipSentence, upsellSentence].filter(Boolean).join(' '),
        legalNotice
    ];

    descTextarea.value = paragraphs.join('\n\n');

    if (force) {
        hasUserEditedDescription = false;
        if (typeof showToast === 'function') {
            showToast("✨ Description automatique générée !", "info");
        }
    }
}

/**
 * Initialise tous les écouteurs d'événements dynamiques du formulaire vendeur.
 */
function initSellerPageDynamicTools() {
    const priceInput = document.getElementById('ad-price');
    const payloadInput = document.getElementById('ad-payload');
    const titleInput = document.getElementById('ad-title');
    const descInput = document.getElementById('ad-desc');

    if (!priceInput || !payloadInput) return;

    // Mise à jour immédiate de la jauge et du permis
    updateSmartPricingFeedback();
    updateLegalPermitBadge();

    // Si la description est vide, pré-remplir automatiquement
    if (descInput && (!descInput.value || descInput.value.trim() === '')) {
        generateAutoDescription(false);
    }

    if (sellerDynamicToolsInitialized) return;
    sellerDynamicToolsInitialized = true;

    // Écouteurs sur le prix
    priceInput.addEventListener('input', () => {
        updateSmartPricingFeedback();
    });

    // Écouteurs sur la charge utile
    payloadInput.addEventListener('input', () => {
        updateSmartPricingFeedback();
        updateLegalPermitBadge();
        generateAutoDescription(false);
    });

    // Écouteurs sur le titre
    if (titleInput) {
        titleInput.addEventListener('input', () => {
            generateAutoDescription(false);
        });
    }

    // Détection de modification manuelle de la description
    if (descInput) {
        descInput.addEventListener('input', () => {
            hasUserEditedDescription = true;
        });
    }

    // Écouteurs sur les catégories (radio)
    document.querySelectorAll('input[name="category"]').forEach(radio => {
        radio.addEventListener('change', () => {
            updateSmartPricingFeedback();
            updateLegalPermitBadge();
            generateAutoDescription(false);
        });
    });

    // Écouteurs sur la prise électrique (radio)
    document.querySelectorAll('input[name="prise"]').forEach(radio => {
        radio.addEventListener('change', () => {
            generateAutoDescription(false);
        });
    });

    // Écouteurs sur les équipements (checkbox)
    document.querySelectorAll('input[name="equipments"]').forEach(cb => {
        cb.addEventListener('change', () => {
            generateAutoDescription(false);
        });
    });

    // Écouteurs sur les upsells (checkbox)
    document.querySelectorAll('input[name="upsell"]').forEach(cb => {
        cb.addEventListener('change', () => {
            generateAutoDescription(false);
        });
    });
}

async function handlePublish(event) {
    event.preventDefault();
    if (!currentUser) {
        showToast("Vous devez être connecté pour publier.", "error");
        openAuthModal();
        return;
    }

    const submitBtn = event.target.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.7';
    }

    const PLACEHOLDER = "https://placehold.co/600x400/f5f5f4/a8a29e?text=Renger";
    let imageUrls = [];

    if (pendingPhotos.length === 0) {
        showToast("Ajoutez au moins une photo pour publier votre annonce.", "error");
        if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = '1'; }
        return;
    }

    showToast("Upload des photos en cours…", "info");

    try {
        // Upload séquentiel de toutes les photos dans le bucket trailers-images
        for (let i = 0; i < pendingPhotos.length; i++) {
            const { file } = pendingPhotos[i];
            const fileExt = file.name.split('.').pop().toLowerCase();
            const fileName = `${currentUser.id}/${Date.now()}_${i}.${fileExt}`;

            const { error: uploadError } = await supabaseClient.storage
                .from('trailers-images')
                .upload(fileName, file, { upsert: false });

            if (uploadError) {
                showToast(`Erreur upload photo ${i + 1} : ${uploadError.message}`, "error");
                return;
            }

            const { data: urlData } = supabaseClient.storage
                .from('trailers-images')
                .getPublicUrl(fileName);

            imageUrls.push(urlData.publicUrl);
        }

        // Récupération des équipements
        const equipmentCheckboxes = document.querySelectorAll('input[name="equipments"]:checked');
        const equipments = Array.from(equipmentCheckboxes).map(cb => cb.value);

        // Récupération des upsells
        const upsellCheckboxes = document.querySelectorAll('input[name="upsell"]:checked');
        const upsells = Array.from(upsellCheckboxes).map(cb => cb.value);

        // Récupération de la catégorie (type de remorque)
        const categoryInput = document.querySelector('input[name="category"]:checked');
        const category = categoryInput ? categoryInput.value : 'utilitaire';

        const priceVal = parseInt(document.getElementById('ad-price').value, 10);
        const payloadVal = parseInt(document.getElementById('ad-payload').value, 10);

        let finalDesc = (document.getElementById('ad-desc')?.value || '').trim();
        const isHeavy = (payloadVal > 750) || category === 'cheval' || category === 'voiture';
        const permitMention = isHeavy ? "**Permis BE requis**" : "**Permis B suffisant**";

        // Garantie légale suisse (LCR / OAC) : la mention doit impérativement figurer dans l'annonce
        if (!finalDesc.includes("Permis B suffisant") && !finalDesc.includes("Permis BE requis")) {
            finalDesc += `\n\n⚖️ Réglementation suisse : ${permitMention}`;
        }

        const newTrailer = {
            title: (document.getElementById('ad-title')?.value || '').trim(),
            description: finalDesc,
            price: isNaN(priceVal) || priceVal < 0 ? 0 : priceVal,
            payload: isNaN(payloadVal) || payloadVal < 0 ? 0 : payloadVal,
            socket: document.querySelector('input[name="prise"]:checked')?.value || '7 broches',
            owner_id: currentUser.id,
            image_url: imageUrls[0] || PLACEHOLDER,  // Photo de couverture (rétrocompatibilité)
            images: imageUrls,                         // Toutes les photos (nouveau champ)
            equipments: equipments,
            upsells: upsells,
            category: category
        };

        const { error } = await supabaseClient.from('trailers').insert([newTrailer]);
        if (error) {
            showToast("Erreur BDD : " + error.message, "error");
        } else {
            const modeElement = document.querySelector('input[name="monetization_mode"]:checked');
            if (modeElement && modeElement.value === 'pro') {
                showToast("✅ Annonce publiée ! Redirection vers Renger PRO...", "success");
                await handleSubscribePro();
                return; // On arrête l'exécution pour la redirection
            }

            showToast("✅ Annonce publiée !", "success");
            document.getElementById('add-trailer-form').reset();
            hasUserEditedDescription = false;
            updateSmartPricingFeedback();
            updateLegalPermitBadge();
            // Nettoyage des Blob URLs
            pendingPhotos.forEach(p => {
                if (p.objectUrl) URL.revokeObjectURL(p.objectUrl);
            });
            pendingPhotos = [];
            renderPhotoGrid();
            showPage('buyer-page');
            loadTrailers();
        }
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
        }
    }
}

// ==========================================
// CAROUSEL DE LA PAGE DÉTAIL
// ==========================================
let detailCarouselPhotos = [];
let currentCarouselIndex = 0;

function initDetailCarousel(photos) {
    detailCarouselPhotos = (Array.isArray(photos) && photos.length > 0)
        ? photos
        : ["https://images.unsplash.com/photo-1594054972175-39db43232140?q=80&w=600&auto=format&fit=crop"];
    currentCarouselIndex = 0;

    const img = document.getElementById('detail-img');
    const prevBtn = document.getElementById('carousel-prev');
    const nextBtn = document.getElementById('carousel-next');
    const dotsContainer = document.getElementById('carousel-dots');
    const counter = document.getElementById('carousel-counter');

    if (img) img.src = detailCarouselPhotos[0];

    const hasMultiple = detailCarouselPhotos.length > 1;

    if (prevBtn) prevBtn.classList.toggle('hidden', !hasMultiple);
    if (nextBtn) nextBtn.classList.toggle('hidden', !hasMultiple);
    if (counter) {
        counter.classList.toggle('hidden', !hasMultiple);
        counter.textContent = `1 / ${detailCarouselPhotos.length}`;
    }

    if (dotsContainer) {
        dotsContainer.classList.toggle('hidden', !hasMultiple);
        dotsContainer.innerHTML = '';
        if (hasMultiple) {
            detailCarouselPhotos.forEach((_, idx) => {
                const dot = document.createElement('button');
                dot.type = 'button';
                dot.className = `h-2.5 rounded-full transition-all duration-200 ${
                    idx === 0 ? 'w-6 bg-white' : 'w-2.5 bg-white/50 hover:bg-white/80'
                }`;
                dot.onclick = (e) => {
                    e.stopPropagation();
                    goToCarouselSlide(idx);
                };
                dotsContainer.appendChild(dot);
            });
        }
    }
}

function changeCarouselSlide(direction) {
    if (detailCarouselPhotos.length <= 1) return;
    let newIndex = currentCarouselIndex + direction;
    if (newIndex < 0) {
        newIndex = detailCarouselPhotos.length - 1;
    } else if (newIndex >= detailCarouselPhotos.length) {
        newIndex = 0;
    }
    goToCarouselSlide(newIndex);
}

function goToCarouselSlide(index) {
    if (index < 0 || index >= detailCarouselPhotos.length) return;
    currentCarouselIndex = index;

    const img = document.getElementById('detail-img');
    if (img) {
        img.src = detailCarouselPhotos[currentCarouselIndex];
    }

    const counter = document.getElementById('carousel-counter');
    if (counter) {
        counter.textContent = `${currentCarouselIndex + 1} / ${detailCarouselPhotos.length}`;
    }

    const dotsContainer = document.getElementById('carousel-dots');
    if (dotsContainer) {
        const dots = dotsContainer.children;
        for (let i = 0; i < dots.length; i++) {
            if (i === currentCarouselIndex) {
                dots[i].className = 'w-6 h-2.5 rounded-full transition-all duration-200 bg-white';
            } else {
                dots[i].className = 'w-2.5 h-2.5 rounded-full transition-all duration-200 bg-white/50 hover:bg-white/80';
            }
        }
    }
}

// Navigation clavier pour le carousel
document.addEventListener('keydown', (e) => {
    const detailPage = document.getElementById('detail-page');
    if (!detailPage || detailPage.classList.contains('hidden')) return;
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

    if (e.key === 'ArrowLeft') {
        changeCarouselSlide(-1);
    } else if (e.key === 'ArrowRight') {
        changeCarouselSlide(1);
    }
});

// ==========================================
// 5. RÉSERVATION, BLOCAGE DATES & PAIEMENT
// ==========================================
async function openTrailerDetail(trailer) {
    currentTrailer = trailer;
    // Reset des dates à chaque ouverture pour repartir d'un état propre
    selectedStartDate = null;
    selectedEndDate = null;
    document.getElementById('detail-title').innerText = trailer.title;
    document.getElementById('detail-price').innerText = trailer.price;
    document.getElementById('detail-socket').innerText = trailer.socket;
    document.getElementById('detail-payload').innerText = trailer.payload + " kg";

    // Affichage de la note moyenne sous le titre
    const ratingContainer = document.getElementById('detail-rating');
    if (ratingContainer) {
        ratingContainer.innerHTML = '';
        ratingContainer.appendChild(renderRatingBadge(trailer.rating_avg, trailer.rating_count, true));
    }

    // Initialisation du carousel (1 ou plusieurs photos)
    const photos = (trailer.images && trailer.images.length > 0)
        ? trailer.images
        : [trailer.image_url || "https://images.unsplash.com/photo-1594054972175-39db43232140?q=80&w=600&auto=format&fit=crop"];
    initDetailCarousel(photos);

    // On affiche la description de la BDD, ou un texte par défaut si elle est vide
    const defaultDesc = translations[localStorage.getItem('renger_lang') || 'fr'].detail_desc;
    document.getElementById('detail-desc').innerText = trailer.description || defaultDesc;
    
    document.getElementById('booking-summary').classList.add('hidden');
    document.getElementById('booking-dates').value = "";

        // 1. Réinitialisation des zones à chaque clic sur une annonce
    const equipContainer = document.getElementById('detail-equipments');
    const equipTitle = document.getElementById('equipments-title');
    const upsellContainer = document.getElementById('detail-upsells');
    const upsellTitle = document.getElementById('upsells-title');

    if (equipContainer) equipContainer.innerHTML = '';
    if (upsellContainer) upsellContainer.innerHTML = '';
    if (equipTitle) equipTitle.classList.add('hidden');
    if (upsellTitle) upsellTitle.classList.add('hidden');

    /// 2. Affichage des équipements (Sécurisé contre les XSS)
    if (trailer.equipments && trailer.equipments.length > 0) {
        equipTitle.classList.remove('hidden');
        trailer.equipments.forEach(eq => {
            const span = document.createElement('span');
            span.className = "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 px-3 py-1.5 rounded-lg text-sm font-semibold capitalize";
            // L'utilisation de textContent désamorce toute tentative d'injection
            span.textContent = "✅ " + eq;
            equipContainer.appendChild(span);
        });
    }

    // 3. Affichage des Upsells (Sécurisé contre les XSS)
    if (trailer.upsells && trailer.upsells.length > 0) {
        upsellTitle.classList.remove('hidden');
        trailer.upsells.forEach(up => {
            let upText = up;
            let upPrice = "";
            if (up === "livraison") { upText = "🚚 Livraison"; upPrice = "+25 CHF"; }
            if (up === "diable") { upText = "🛒 Prêt d'un diable"; upPrice = "+10 CHF/j"; }

            // Création de la structure ligne par ligne sans innerHTML
            const div = document.createElement('div');
            div.className = "flex justify-between items-center bg-terracotta-50 dark:bg-stone-800 border border-terracotta-100 dark:border-stone-700 p-3 rounded-xl";
            
            const spanTitle = document.createElement('span');
            spanTitle.className = "font-bold text-terracotta-700 dark:text-terracotta-400 capitalize";
            spanTitle.textContent = upText;

            const spanPrice = document.createElement('span');
            spanPrice.className = "text-terracotta-600 dark:text-terracotta-400 font-bold text-sm";
            spanPrice.textContent = upPrice;

            div.appendChild(spanTitle);
            div.appendChild(spanPrice);
            upsellContainer.appendChild(div);
        });
    }
    
    showPage('detail-page');
    updateChatButtonState(); // État initial du bouton chat (grisé car pas de dates)

    // On interroge la vue publique contenant uniquement les dates
    const { data: bookings } = await supabaseClient
        .from('trailer_booked_dates')
        .select('start_date, end_date')
        .eq('trailer_id', trailer.id);

    const disabledDates = bookings ? bookings.map(b => ({
        from: b.start_date,
        to: b.end_date
    })) : [];

    // GESTION DU PROPRIÉTAIRE VS LOCATAIRE
    const isOwner = currentUser && currentUser.id === trailer.owner_id;
    const actionBtn = document.getElementById('action-btn');
    const priceHeader = document.getElementById('booking-header');

    if (isOwner) {
        // Mode Propriétaire
        priceHeader.classList.add('hidden');
        actionBtn.innerText = "Bloquer ces dates";
        actionBtn.onclick = blockOwnerDates;
        actionBtn.className = "w-full bg-stone-800 hover:bg-stone-900 dark:bg-stone-100 dark:hover:bg-white dark:text-stone-900 text-white font-bold py-4 rounded-2xl shadow-xl transition transform active:scale-95 text-lg mb-4";
    } else {
        // Mode Locataire
        priceHeader.classList.remove('hidden');
        actionBtn.innerText = "Réserver";
        actionBtn.onclick = submitBooking;
        actionBtn.className = "w-full bg-terracotta-500 hover:bg-terracotta-600 text-white font-bold py-4 rounded-2xl shadow-xl transition transform active:scale-95 text-lg mb-3";
    }

    // Initialisation immédiate des montants de caution pour cette remorque
    const initialCaution = getTrailerCaution(trailer);
    const cautionAmountEl = document.getElementById('caution-amount');
    if (cautionAmountEl) cautionAmountEl.innerText = `${initialCaution} CHF`;
    const cautionExplainEl = document.getElementById('caution-explain-amount');
    if (cautionExplainEl) cautionExplainEl.innerText = `${initialCaution} CHF`;

    if (bookingCalendar) bookingCalendar.destroy();
    
    bookingCalendar = flatpickr("#booking-dates", {
        mode: "range",
        minDate: "today",
        locale: "fr",
        disable: disabledDates,
        onChange: function(selectedDates) {
            if (selectedDates.length === 2) {
                selectedStartDate = selectedDates[0];
                selectedEndDate = selectedDates[1];
                
                const diffTime = Math.abs(selectedEndDate - selectedStartDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
                const rentalPrice = diffDays * currentTrailer.price;
                const serviceFee = calculateRengerServiceFee(rentalPrice);
                const totalWithFee = rentalPrice + serviceFee;
                const caution = getTrailerCaution(currentTrailer);
                
                const daysEl = document.getElementById('total-days');
                if (daysEl) daysEl.innerText = diffDays;
                const pluralEl = document.getElementById('total-days-plural');
                if (pluralEl) pluralEl.innerText = diffDays > 1 ? 's' : '';

                const rentalPriceEl = document.getElementById('total-rental-price');
                if (rentalPriceEl) rentalPriceEl.innerText = `${rentalPrice} CHF`;

                const serviceFeeEl = document.getElementById('service-fee-price');
                if (serviceFeeEl) serviceFeeEl.innerText = `${serviceFee.toFixed(2)} CHF`;

                const cautionEl = document.getElementById('caution-amount');
                if (cautionEl) cautionEl.innerText = `${caution} CHF`;

                const cautionExpEl = document.getElementById('caution-explain-amount');
                if (cautionExpEl) cautionExpEl.innerText = `${caution} CHF`;

                const totalPriceEl = document.getElementById('total-price');
                if (totalPriceEl) totalPriceEl.innerText = isOwner ? "0 CHF" : `${totalWithFee.toFixed(2)} CHF`;

                document.getElementById('booking-summary').classList.remove('hidden');
                updateChatButtonState();
            } else {
                selectedStartDate = null;
                selectedEndDate = null;
                document.getElementById('booking-summary').classList.add('hidden');
                updateChatButtonState();
            }
        }
    });

    // Charger et afficher la carte propriétaire (async, non bloquant)
    if (trailer.owner_id) {
        const ownerCard = document.getElementById('owner-card');
        if (ownerCard) ownerCard.classList.add('hidden');

        const { data: ownerProfile } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', trailer.owner_id)
            .maybeSingle();

        if (ownerProfile && ownerCard) {
            // Avatar
            const avatarEl = document.getElementById('owner-avatar');
            if (avatarEl) {
                avatarEl.innerHTML = '';
                avatarEl.appendChild(renderAvatar(ownerProfile, 48));
            }

            // Username
            const usernameEl = document.getElementById('owner-username');
            if (usernameEl) usernameEl.textContent = '@' + ownerProfile.username;

            // Badges (compact — icône seulement)
            const { data: ownerTrailers } = await supabaseClient
                .from('trailers').select('id').eq('owner_id', trailer.owner_id);
            const badges = computeBadges(ownerProfile, ownerTrailers?.length || 0);
            const badgesEl = document.getElementById('owner-badges');
            if (badgesEl) {
                badgesEl.innerHTML = '';
                badges.slice(0, 3).forEach(b => badgesEl.appendChild(renderBadge(b, true)));
            }

            // Bouton profil public
            const profileBtn = document.getElementById('owner-profile-btn');
            if (profileBtn) profileBtn.onclick = () => openPublicProfile(ownerProfile.username);

            ownerCard.classList.remove('hidden');
        }
    }

    // Réinitialiser et vérifier l'éligibilité pour laisser un avis sur cette remorque
    const promptEl = document.getElementById('detail-review-prompt');
    if (promptEl) promptEl.classList.add('hidden');
    if (currentUser && currentUser.id !== trailer.owner_id) {
        checkUserReviewEligibility(trailer);
    }

    // Charger et afficher la liste des avis clients
    loadTrailerReviews(trailer.id);
}

async function blockOwnerDates() {
    if (!currentUser) return showToast("Vous devez être connecté.", "error");
    if (!currentTrailer || currentUser.id !== currentTrailer.owner_id) {
        return showToast("Action non autorisée : vous n'êtes pas le propriétaire.", "error");
    }
    if (!selectedStartDate || !selectedEndDate) return showToast("Veuillez sélectionner vos dates sur le calendrier.", "error");

    const actionBtn = document.getElementById('action-btn');
    if (actionBtn) actionBtn.disabled = true;

    const newBooking = {
        trailer_id: currentTrailer.id,
        renter_id: currentUser.id,
        owner_id: currentTrailer.owner_id,
        start_date: formatDateToLocalISO(selectedStartDate),
        end_date: formatDateToLocalISO(selectedEndDate),
        total_price: 0,
        status: 'indisponible' // Statut spécial pour bloquer sans payer
    };

    try {
        const { error } = await supabaseClient.from('bookings').insert([newBooking]);
        
        if (error) {
            showToast("Erreur lors du blocage : " + error.message, "error");
        } else {
            showToast("Dates bloquées avec succès !", "success");
            // On recharge la page pour griser les dates instantanément
            openTrailerDetail(currentTrailer); 
        }
    } finally {
        if (actionBtn) actionBtn.disabled = false;
    }
}

// ==========================================
// GESTION DE LA CAUTION & PÉDAGOGIE BANCAIRE
// ==========================================

/**
 * Calcule le montant de la caution selon la catégorie et le gabarit de la remorque
 * (ou utilise le montant personnalisé défini sur la remorque).
 */
function getTrailerCaution(trailer) {
    if (!trailer) return 200;
    if (trailer.caution && !isNaN(parseInt(trailer.caution, 10)) && parseInt(trailer.caution, 10) > 0) {
        return parseInt(trailer.caution, 10);
    }
    if (trailer.deposit && !isNaN(parseInt(trailer.deposit, 10)) && parseInt(trailer.deposit, 10) > 0) {
        return parseInt(trailer.deposit, 10);
    }
    
    // Barème standard suisse
    const cat = trailer.category || 'utilitaire';
    const payload = parseInt(trailer.payload, 10) || 500;

    if (cat === 'cheval' || cat === 'voiture' || cat === 'refrigere' || payload > 1200) {
        return 400; // Remorques lourdes / vans / porte-voitures
    }
    if (cat === 'moto' || payload > 750) {
        return 300; // Remorques moyennes
    }
    return 200; // Utilitaires standards & porte-vélos
}

/**
 * Calcule les frais de traitement Renger sur l'acheteur :
 * 5% du montant de la location avec un minimum garanti de 4.90 CHF.
 */
function calculateRengerServiceFee(rentalPrice) {
    if (!rentalPrice || rentalPrice <= 0) return 4.90;
    const rawFee = rentalPrice * 0.05;
    const fee = Math.max(4.90, Math.round(rawFee * 20) / 20); // Arrondi suisse aux 5 centimes
    return parseFloat(fee.toFixed(2));
}

function openCautionInfoModal() {
    const modal = document.getElementById('caution-info-modal');
    if (modal) modal.classList.remove('hidden');
}

function closeCautionInfoModal() {
    const modal = document.getElementById('caution-info-modal');
    if (modal) modal.classList.add('hidden');
}

// Ouvre la modale de confirmation avec un résumé détaillé et séparé avant de payer
function submitBooking() {
    if (!currentUser) {
        showToast("Vous devez être connecté pour réserver.", "error");
        openAuthModal();
        return;
    }
    if (!selectedStartDate || !selectedEndDate) {
        return showToast("Veuillez sélectionner vos dates sur le calendrier.", "error");
    }

    // Calculer les montants détaillés pour la modale
    const diffTime = Math.abs(selectedEndDate - selectedStartDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    const rentalPrice = diffDays * currentTrailer.price;
    const serviceFee = calculateRengerServiceFee(rentalPrice);
    const totalToPay = rentalPrice + serviceFee;
    const cautionAmount = getTrailerCaution(currentTrailer);

    const fmtDate = (d) => d.toLocaleDateString('fr-CH', { day: 'numeric', month: 'short' });

    // Remplir la modale avec textContent (XSS-safe)
    const imgEl = document.getElementById('confirm-img');
    if (imgEl) imgEl.src = currentTrailer.image_url || "https://placehold.co/600x400/f5f5f4/a8a29e?text=Renger";
    
    const titleEl = document.getElementById('confirm-title');
    if (titleEl) titleEl.textContent = currentTrailer.title;
    
    const datesEl = document.getElementById('confirm-dates');
    if (datesEl) datesEl.textContent = `${fmtDate(selectedStartDate)} → ${fmtDate(selectedEndDate)}`;
    
    const daysEl = document.getElementById('confirm-days');
    if (daysEl) daysEl.textContent = `${diffDays} jour${diffDays > 1 ? 's' : ''}`;

    // Lignes séparées : Location, Frais Renger, Caution
    const rentalCalcEl = document.getElementById('confirm-rental-calc');
    if (rentalCalcEl) rentalCalcEl.textContent = `${diffDays} jour${diffDays > 1 ? 's' : ''} × ${currentTrailer.price} CHF / jour`;

    const rentalPriceEl = document.getElementById('confirm-rental-price');
    if (rentalPriceEl) rentalPriceEl.textContent = `${rentalPrice} CHF`;

    const serviceFeeEl = document.getElementById('confirm-service-fee');
    if (serviceFeeEl) serviceFeeEl.textContent = `${serviceFee.toFixed(2)} CHF`;

    const cautionPriceEl = document.getElementById('confirm-caution-price');
    if (cautionPriceEl) cautionPriceEl.textContent = `${cautionAmount} CHF`;

    const confirmPriceEl = document.getElementById('confirm-price');
    if (confirmPriceEl) confirmPriceEl.textContent = `${totalToPay.toFixed(2)} CHF`;

    const payAmountEl = document.getElementById('confirm-pay-amount');
    if (payAmountEl) payAmountEl.textContent = `${totalToPay.toFixed(2)}`;

    const btnCautionEl = document.getElementById('confirm-btn-caution');
    if (btnCautionEl) btnCautionEl.textContent = `${cautionAmount}`;

    // Afficher la modale
    document.getElementById('booking-confirm-modal').classList.remove('hidden');
}

function closeBookingConfirmModal() {
    document.getElementById('booking-confirm-modal').classList.add('hidden');
}

// Verrou d'exécution pour éviter les doubles réservations Stripe
let isProcessingBooking = false;

// Lance la vraie transaction Stripe (appelée depuis le bouton "Confirmer et payer")
async function processBooking() {
    if (isProcessingBooking) return;
    isProcessingBooking = true;

    closeBookingConfirmModal();
    showToast("Création de votre réservation sécurisée via Stripe...", "info");

    try {
        const cautionAmount = getTrailerCaution(currentTrailer);
        const stripeData = await callEdgeFunction('stripe-checkout', {
            trailerId: currentTrailer.id,
            startDate: formatDateToLocalISO(selectedStartDate),
            endDate: formatDateToLocalISO(selectedEndDate),
            cautionAmount: cautionAmount
        });
        
        if (stripeData.bookingId) {
            localStorage.setItem('pending_booking_id', stripeData.bookingId);
        }

        if (stripeData.url) {
            window.location.href = stripeData.url; 
        } else {
            showToast("Erreur Stripe : " + (stripeData.error || stripeData.message || "Lien de paiement introuvable."), "error");
        }
    } catch (err) {
        showToast("Erreur de réservation : " + err.message, "error");
    } finally {
        isProcessingBooking = false;
    }
}

async function checkPaymentStatus() {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');

    // Lecture du bookingId depuis l'URL (transmis par stripe-checkout Edge Function)
    // ou en fallback depuis localStorage si l'URL ne le contient pas
    const bookingId = urlParams.get('booking_id') || localStorage.getItem('pending_booking_id');

    if (paymentStatus === 'success' && bookingId) {
        // Nettoyage immédiat de l'URL et du localStorage
        localStorage.removeItem('pending_booking_id');
        window.history.replaceState({}, document.title, window.location.pathname);

        showToast("Paiement reçu ! Vérification en cours...", "info");

        // Polling : on attend que le webhook Stripe ait passé le statut à 'paye'
        // Tentatives : toutes les 1.5s, jusqu'à 8 fois (12 secondes max)
        const MAX_ATTEMPTS = 8;
        const POLL_INTERVAL_MS = 1500;

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));

            const { data: booking, error } = await supabaseClient
                .from('bookings')
                .select('id, status')
                .eq('id', bookingId)
                .single();

            if (error || !booking) continue;

            if (booking.status === 'paye') {
                showToast("🎉 Réservation confirmée ! Retrouvez-la dans vos réservations.", "success");
                await openProfile();
                // Forcer l'onglet "Mes locations (Client)"
                switchProfileTab('buyer');
                return;
            }
        }

        // Délai dépassé : le webhook n'a pas encore répondu
        showToast("Paiement en cours de traitement bancaire. Votre réservation sera confirmée dès validation.", "info");
        await openProfile();
        switchProfileTab('buyer');

    } else if (paymentStatus === 'cancel') {
        localStorage.removeItem('pending_booking_id');
        window.history.replaceState({}, document.title, window.location.pathname);
        showToast("Le paiement a été annulé. Votre réservation n'a pas été créée.", "error");
    }
}

// ==========================================
// 6. MODULE CAMÉRA GUIDÉE & GHOSTING (ÉTAT DES LIEUX)
// ==========================================

const INSPECTION_STEPS = [
    {
        step: 1,
        title: "Tête d'attelage",
        instruction: "Cadrez le système d'attache, la roue jockey et le câble de sécurité.",
        overlayId: 'ghost-overlay-1',
        pillId: 'step-pill-1'
    },
    {
        step: 2,
        title: "Avant et Côté Gauche",
        instruction: "Reculez pour cadrer le 3/4 avant gauche, la carrosserie et le pneu gauche.",
        overlayId: 'ghost-overlay-2',
        pillId: 'step-pill-2'
    },
    {
        step: 3,
        title: "Arrière et Côté Droit",
        instruction: "Cadrez l'arrière avec la plaque d'immatriculation, les feux et le flanc droit.",
        overlayId: 'ghost-overlay-3',
        pillId: 'step-pill-3'
    },
    {
        step: 4,
        title: "Intérieur (Propreté)",
        instruction: "Cadrez l'intérieur de la cuve : plancher propre, vide et sans dégradations.",
        overlayId: 'ghost-overlay-4',
        pillId: 'step-pill-4'
    }
];

let inspectionContext = {
    mode: 'departure', // 'departure' (propriétaire) ou 'return' (locataire)
    trailerId: null,
    bookingId: null,
    receiverId: null,
    currentStepIndex: 0,
    isCapturing: false,
    facingMode: 'environment',
    clockInterval: null,
    cachedCoords: null
};

async function startGuidedInspection(mode, trailerId, receiverId, bookingId) {
    if (!currentUser) {
        showToast("Vous devez être connecté pour réaliser un état des lieux.", "error");
        openAuthModal();
        return;
    }

    inspectionContext.mode = mode || 'departure';
    inspectionContext.trailerId = trailerId || (currentTrailer ? currentTrailer.id : null);
    inspectionContext.receiverId = receiverId || activeChatPartnerId;
    inspectionContext.bookingId = bookingId || currentBookingContext?.id;
    inspectionContext.currentStepIndex = 0;
    inspectionContext.isCapturing = false;

    showPage('inspection-page');
    updateInspectionHUD();
    startInspectionClock();
    await startCamera(inspectionContext.facingMode);
    updateGPSStatusBadge();
}

function updateInspectionHUD() {
    const step = INSPECTION_STEPS[inspectionContext.currentStepIndex];
    if (!step) return;

    // Mode texte
    const modeText = document.getElementById('inspection-mode-text');
    if (modeText) {
        modeText.textContent = inspectionContext.mode === 'departure'
            ? 'État des lieux de départ'
            : 'État des lieux de retour';
    }

    // Étape titre et instructions
    const stepTitle = document.getElementById('inspection-step-title');
    if (stepTitle) stepTitle.textContent = `Étape ${step.step} sur 4 : ${step.title}`;

    const stepCounter = document.getElementById('inspection-step-counter');
    if (stepCounter) stepCounter.textContent = `${step.step} / 4`;

    const stepInstruction = document.getElementById('inspection-step-instruction');
    if (stepInstruction) stepInstruction.textContent = step.instruction;

    // Barre de progression
    const progressBar = document.getElementById('inspection-progress-bar');
    if (progressBar) progressBar.style.width = `${(step.step / 4) * 100}%`;

    // Calques ghosting SVG et pastilles
    INSPECTION_STEPS.forEach((s, idx) => {
        const overlay = document.getElementById(s.overlayId);
        if (overlay) {
            if (idx === inspectionContext.currentStepIndex) {
                overlay.classList.remove('hidden');
            } else {
                overlay.classList.add('hidden');
            }
        }

        const pill = document.getElementById(s.pillId);
        if (pill) {
            if (idx < inspectionContext.currentStepIndex) {
                pill.className = 'flex-1 py-1.5 px-2 bg-emerald-950/70 border border-emerald-500 text-emerald-400 rounded-xl text-center text-xs font-bold transition';
                pill.innerHTML = `✓ ${idx + 1}`;
            } else if (idx === inspectionContext.currentStepIndex) {
                pill.className = 'flex-1 py-1.5 px-2 bg-terracotta-500/20 border-2 border-terracotta-500 text-terracotta-400 rounded-xl text-center text-xs font-extrabold transition shadow-sm';
                pill.innerHTML = `${idx + 1}. ${s.title.split(' ')[0]}`;
            } else {
                pill.className = 'flex-1 py-1.5 px-2 bg-stone-900 border border-stone-800 text-stone-500 rounded-xl text-center text-xs font-bold transition';
                pill.innerHTML = `${idx + 1}. ${s.title.split(' ')[0]}`;
            }
        }
    });
}

function startInspectionClock() {
    if (inspectionContext.clockInterval) clearInterval(inspectionContext.clockInterval);
    const clockEl = document.getElementById('camera-clock-badge');
    const updateTime = () => {
        if (clockEl) {
            const now = new Date();
            clockEl.textContent = now.toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        }
    };
    updateTime();
    inspectionContext.clockInterval = setInterval(updateTime, 1000);
}

function stopInspectionClock() {
    if (inspectionContext.clockInterval) {
        clearInterval(inspectionContext.clockInterval);
        inspectionContext.clockInterval = null;
    }
}

async function getCurrentCoordinates() {
    if (!('geolocation' in navigator)) {
        return { latitude: null, longitude: null, accuracy: null, text: 'Non supporté' };
    }
    return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const coords = {
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    accuracy: Math.round(pos.coords.accuracy),
                    text: `${pos.coords.latitude.toFixed(4)}°N, ${pos.coords.longitude.toFixed(4)}°E (±${Math.round(pos.coords.accuracy)}m)`
                };
                inspectionContext.cachedCoords = coords;
                resolve(coords);
            },
            (err) => {
                console.warn("Géolocalisation inaccessible :", err.message);
                resolve({ latitude: null, longitude: null, accuracy: null, text: 'Coordonnées approximatives' });
            },
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
        );
    });
}

async function updateGPSStatusBadge() {
    const gpsText = document.getElementById('camera-gps-text');
    if (!gpsText) return;
    gpsText.textContent = '📍 Recherche GPS...';

    const coords = await getCurrentCoordinates();
    if (coords.latitude) {
        gpsText.textContent = `📍 GPS Précis (±${coords.accuracy}m)`;
    } else {
        gpsText.textContent = '📍 GPS approximatif';
    }
}

async function startCamera(facing = 'environment') {
    stopCamera();
    try {
        videoStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: facing,
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }
        });
        const feed = document.getElementById('camera-feed');
        if (feed) feed.srcObject = videoStream;
    } catch (err) {
        console.warn("Erreur caméra :", err.message);
        showToast("Impossible d'accéder à la caméra.", "error");
    }
}

function stopCamera() {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
    stopInspectionClock();
}

async function switchCamera() {
    inspectionContext.facingMode = inspectionContext.facingMode === 'environment' ? 'user' : 'environment';
    await startCamera(inspectionContext.facingMode);
}

function confirmExitInspection() {
    if (inspectionContext.currentStepIndex > 0 && inspectionContext.currentStepIndex < 4) {
        const exit = confirm("Voulez-vous vraiment quitter l'état des lieux ? Vos photos des étapes déjà validées sont conservées dans la conversation.");
        if (!exit) return;
    }
    stopCamera();
    stopInspectionClock();
    showPage('detail-page');
    openChatModal();
}

function applyInspectionWatermark(ctx, canvasWidth, canvasHeight, stepConfig, coords, date) {
    const bannerHeight = Math.max(68, Math.round(canvasHeight * 0.11));

    // Fond sombre du bandeau légal
    ctx.fillStyle = 'rgba(15, 17, 21, 0.88)';
    ctx.fillRect(0, canvasHeight - bannerHeight, canvasWidth, bannerHeight);

    // Filet supérieur décoratif terracotta
    ctx.fillStyle = '#E05A47';
    ctx.fillRect(0, canvasHeight - bannerHeight, canvasWidth, 3);

    // Typographies adaptatives
    const fontSizeTitle = Math.max(13, Math.round(bannerHeight * 0.28));
    const fontSizeMeta = Math.max(10, Math.round(bannerHeight * 0.21));

    // Ligne 1 : Titre & Étape
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${fontSizeTitle}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    const modeLabel = inspectionContext.mode === 'departure' ? 'DÉPART (PROPRIÉTAIRE)' : 'RETOUR (LOCATAIRE)';
    ctx.fillText(`🛡️ RENGER CERTIFIÉ — ÉTAT DES LIEUX ${modeLabel} | ÉTAPE ${stepConfig.step}/4 : ${stepConfig.title.toUpperCase()}`, 18, canvasHeight - bannerHeight + fontSizeTitle + 10);

    // Ligne 2 : Horodatage & Géolocalisation
    ctx.fillStyle = '#94A3B8';
    ctx.font = `${fontSizeMeta}px monospace`;
    const dateStr = date.toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = date.toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const gpsStr = coords.latitude ? `📍 ${coords.text}` : '📍 GPS non accessible';
    ctx.fillText(`📅 ${dateStr} ${timeStr} CEST  |  ${gpsStr}`, 18, canvasHeight - 12);
}

async function takeGuidedInspectionPhoto() {
    if (inspectionContext.isCapturing) return;
    const feed = document.getElementById('camera-feed');
    if (!feed || !videoStream) {
        return showToast("La caméra n'est pas active.", "error");
    }

    const currentStep = INSPECTION_STEPS[inspectionContext.currentStepIndex];
    if (!currentStep) return;

    inspectionContext.isCapturing = true;

    // 1. Effet Flash visuel
    const flashEl = document.getElementById('camera-flash');
    if (flashEl) {
        flashEl.style.opacity = '1';
        setTimeout(() => { flashEl.style.opacity = '0'; }, 150);
    }

    showToast(`📸 Certification de l'étape ${currentStep.step}/4 en cours...`, "info");

    try {
        // 2. Extraire la photo sur canvas
        const canvas = document.createElement('canvas');
        canvas.width = feed.videoWidth || 1280;
        canvas.height = feed.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(feed, 0, 0, canvas.width, canvas.height);

        // 3. Obtenir géolocalisation et horodatage précis
        const now = new Date();
        const coords = await getCurrentCoordinates();

        // 4. Incruster le filigrane légal inaltérable sur l'image
        applyInspectionWatermark(ctx, canvas.width, canvas.height, currentStep, coords, now);

        // 5. Convertir en Blob JPEG
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.88));
        if (!blob) throw new Error("Échec de la génération de l'image.");

        // 6. Upload dans le bucket PRIVÉ 'inspections'
        const timestamp = Date.now();
        const mode = inspectionContext.mode;
        const trailerId = inspectionContext.trailerId || 'generale';
        const filePath = `${currentUser.id}/${trailerId}/${mode}_step${currentStep.step}_${timestamp}.jpg`;

        if (supabaseClient && currentUser) {
            const { error: uploadError } = await supabaseClient.storage
                .from('inspections')
                .upload(filePath, blob, {
                    contentType: 'image/jpeg',
                    upsert: false
                });

            if (uploadError) {
                console.warn("Upload inspection warning:", uploadError.message);
            }
        }

        // 7. Insérer le message dans la table messages du chat
        const dateStr = now.toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const timeStr = now.toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const modeLabel = mode === 'departure' ? 'départ' : 'retour';
        const content = `📸 [État des lieux de ${modeLabel}] Étape ${currentStep.step}/4 : ${currentStep.title} — Certifié le ${dateStr} à ${timeStr} (${coords.text})`;

        const receiverId = inspectionContext.receiverId || activeChatPartnerId || (currentUser.id === currentTrailer?.owner_id ? null : currentTrailer?.owner_id);

        if (supabaseClient && currentUser) {
            await supabaseClient.from('messages').insert([{
                sender_id: currentUser.id,
                receiver_id: receiverId,
                trailer_id: trailerId,
                content: content,
                image_url: filePath
            }]);
        }

        // 8. Passage à l'étape suivante ou clôture
        if (inspectionContext.currentStepIndex < 3) {
            inspectionContext.currentStepIndex++;
            showToast(`✅ Étape ${currentStep.step}/4 validée ! Passez à l'étape ${inspectionContext.currentStepIndex + 1}.`, "success");
            updateInspectionHUD();
        } else {
            // Toutes les 4 étapes sont validées !
            stopCamera();
            stopInspectionClock();
            showToast("🎉 État des lieux complet certifié (4/4 photos enregistrées) !", "success");
            showPage('detail-page');
            await openChatModal();
        }

    } catch (err) {
        showToast("Erreur lors de la capture : " + err.message, "error");
    } finally {
        inspectionContext.isCapturing = false;
    }
}

// Alias pour compatibilité
async function takePhoto() {
    return takeGuidedInspectionPhoto();
}

// ==========================================
// 7. PROFIL ET TABLEAU DE BORD
// ==========================================
async function openProfile() {
    if (!currentUser) {
        showToast("Vous devez être connecté pour accéder à votre profil.", "error");
        openAuthModal();
        return;
    }
    showPage('profile-page');
    switchProfileTab('buyer');
    await loadProfileData();
}

function switchProfileTab(tab) {
    const buyerTab = document.getElementById('tab-buyer');
    const sellerTab = document.getElementById('tab-seller');
    const buyerSection = document.getElementById('profile-buyer-section');
    const sellerSection = document.getElementById('profile-seller-section');

    if (tab === 'buyer') {
        buyerSection.classList.remove('hidden');
        sellerSection.classList.add('hidden');
        buyerTab.className = "text-terracotta-600 font-bold border-b-2 border-terracotta-600 pb-3 text-lg transition";
        sellerTab.className = "text-stone-400 font-bold hover:text-stone-700 dark:hover:text-stone-300 pb-3 text-lg transition";
    } else {
        buyerSection.classList.add('hidden');
        sellerSection.classList.remove('hidden');
        sellerTab.className = "text-terracotta-600 font-bold border-b-2 border-terracotta-600 pb-3 text-lg transition";
        buyerTab.className = "text-stone-400 font-bold hover:text-stone-700 dark:hover:text-stone-300 pb-3 text-lg transition";
    }
}

/**
 * Génère une carte de réservation pour l'espace locataire.
 */
function createRenterBookingCard(booking, reviewsByBooking, todayStr) {
    const startDate = new Date(booking.start_date);
    const endDate = new Date(booking.end_date);
    const startStr = booking.start_date ? booking.start_date.split('T')[0] : '';
    const endStr = booking.end_date ? booking.end_date.split('T')[0] : '';

    // Badge de statut (texte statique uniquement, zéro donnée utilisateur)
    const statusSpan = document.createElement('span');
    statusSpan.className = 'text-xs font-bold px-2.5 py-1 rounded-md flex-shrink-0';
    if (todayStr >= startStr && todayStr <= endStr) {
        statusSpan.className += ' bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
        statusSpan.textContent = '🔴 En cours';
    } else if (todayStr < startStr) {
        statusSpan.className += ' bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
        statusSpan.textContent = '⏳ À venir';
    } else {
        statusSpan.className += ' bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-300';
        statusSpan.textContent = 'Terminé';
    }

    // Image (attribut .src assigné, pas interpolé dans innerHTML)
    const img = document.createElement('img');
    img.src = booking.trailers?.image_url || 'https://images.unsplash.com/photo-1594054972175-39db43232140?q=80&w=600&auto=format&fit=crop';
    img.className = 'w-20 h-20 object-cover rounded-xl bg-stone-100 dark:bg-stone-700 flex-shrink-0';
    img.alt = '';

    // Titre de la remorque — textContent neutralise toute injection XSS
    const titleEl = document.createElement('h4');
    titleEl.className = 'font-bold text-stone-800 dark:text-white truncate';
    titleEl.textContent = booking.trailers?.title || 'Remorque';

    const titleRow = document.createElement('div');
    titleRow.className = 'flex justify-between items-start mb-1 gap-2';
    titleRow.appendChild(titleEl);
    titleRow.appendChild(statusSpan);

    // Dates (toLocaleDateString retourne une chaîne sûre)
    const datesEl = document.createElement('p');
    datesEl.className = 'text-sm text-stone-500 dark:text-stone-400';
    datesEl.textContent = `Du ${startDate.toLocaleDateString('fr-CH')} au ${endDate.toLocaleDateString('fr-CH')}`;

    // Prix (valeur numérique de la BDD)
    const priceEl = document.createElement('p');
    priceEl.className = 'text-terracotta-600 font-bold mt-2 text-sm';
    priceEl.textContent = `${Number(booking.total_price).toFixed(2)} CHF réglés`;

    const infoDiv = document.createElement('div');
    infoDiv.className = 'flex-1 min-w-0';
    infoDiv.appendChild(titleRow);
    infoDiv.appendChild(datesEl);
    infoDiv.appendChild(priceEl);

    // Actions & Évaluation pour cette réservation
    const actionsRow = document.createElement('div');
    actionsRow.className = 'flex flex-wrap items-center gap-2 mt-3';

    const chatBtn = document.createElement('button');
    chatBtn.type = 'button';
    chatBtn.className = 'text-xs font-bold bg-stone-100 hover:bg-stone-200 dark:bg-stone-700 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-200 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 active:scale-95';
    chatBtn.innerHTML = '<span>💬</span><span>Messagerie & État des lieux</span>';
    chatBtn.onclick = () => openChatForBooking(booking, false);
    actionsRow.appendChild(chatBtn);

    if (booking.trailers) {
        if (reviewsByBooking.has(booking.id)) {
            const rev = reviewsByBooking.get(booking.id);
            const reviewBadge = document.createElement('span');
            reviewBadge.className = 'inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 px-2.5 py-1 rounded-lg';
            reviewBadge.textContent = `⭐ Note ${rev.rating}/5 attribuée`;
            actionsRow.appendChild(reviewBadge);
        } else if (todayStr > endStr) {
            // Bouton pour noter si la location est passée et non encore notée
            const reviewBtn = document.createElement('button');
            reviewBtn.type = 'button';
            reviewBtn.className = 'text-xs font-bold bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 active:scale-95';
            reviewBtn.textContent = '⭐ Donner mon avis';
            reviewBtn.onclick = () => openReviewModal(booking.id, booking.trailers.id, booking.trailers.title);
            actionsRow.appendChild(reviewBtn);
        }
    }
    infoDiv.appendChild(actionsRow);

    const card = document.createElement('div');
    card.className = 'bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 p-5 rounded-2xl shadow-sm flex items-center gap-4';
    card.appendChild(img);
    card.appendChild(infoDiv);
    return card;
}

/**
 * Génère une carte pour l'historique des locations reçues par le propriétaire.
 */
function createSellerRentalHistoryCard(booking, renterProfile, todayStr) {
    const startDate = new Date(booking.start_date);
    const endDate = new Date(booking.end_date);
    const startStr = booking.start_date ? booking.start_date.split('T')[0] : '';
    const endStr = booking.end_date ? booking.end_date.split('T')[0] : '';

    const diffDays = Math.ceil(Math.abs(endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    const baseRental = (booking.trailers && booking.trailers.price) ? (diffDays * Number(booking.trailers.price)) : Number(booking.total_price);
    const netEarnings = (baseRental * 0.80).toFixed(2);

    // Badge statut
    const statusSpan = document.createElement('span');
    statusSpan.className = 'text-xs font-bold px-2.5 py-1 rounded-lg flex-shrink-0';
    if (todayStr >= startStr && todayStr <= endStr) {
        statusSpan.className += ' bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
        statusSpan.textContent = '🔴 En cours';
    } else if (todayStr < startStr) {
        statusSpan.className += ' bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
        statusSpan.textContent = '⏳ À venir';
    } else {
        statusSpan.className += ' bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-300';
        statusSpan.textContent = 'Terminé';
    }

    // Image remorque
    const img = document.createElement('img');
    img.src = booking.trailers?.image_url || 'https://images.unsplash.com/photo-1594054972175-39db43232140?q=80&w=600&auto=format&fit=crop';
    img.className = 'w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl bg-stone-100 dark:bg-stone-700 flex-shrink-0';
    img.alt = '';

    // Titre remorque
    const titleEl = document.createElement('h4');
    titleEl.className = 'font-bold text-stone-800 dark:text-white truncate text-base';
    titleEl.textContent = booking.trailers?.title || 'Remorque';

    // Locataire (Avatar + @username)
    const renterRow = document.createElement('div');
    renterRow.className = 'flex items-center gap-2 mt-1';
    
    if (renterProfile) {
        const avatarEl = renderAvatar(renterProfile, 22);
        const usernameBtn = document.createElement('button');
        usernameBtn.type = 'button';
        usernameBtn.className = 'text-xs font-semibold text-stone-600 dark:text-stone-300 hover:text-terracotta-500 dark:hover:text-terracotta-400 transition truncate max-w-[150px]';
        usernameBtn.textContent = '@' + renterProfile.username;
        usernameBtn.onclick = () => openPublicProfile(renterProfile.username);
        renterRow.appendChild(avatarEl);
        renterRow.appendChild(usernameBtn);
    } else {
        const locataireSpan = document.createElement('span');
        locataireSpan.className = 'text-xs text-stone-400';
        locataireSpan.textContent = '👤 Locataire vérifié';
        renterRow.appendChild(locataireSpan);
    }

    // Dates & durée
    const datesEl = document.createElement('p');
    datesEl.className = 'text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1.5';
    datesEl.textContent = `Du ${startDate.toLocaleDateString('fr-CH')} au ${endDate.toLocaleDateString('fr-CH')} (${diffDays} jour${diffDays > 1 ? 's' : ''})`;

    const chatBtn = document.createElement('button');
    chatBtn.type = 'button';
    chatBtn.className = 'mt-2.5 text-xs font-bold bg-stone-100 hover:bg-stone-200 dark:bg-stone-700 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-200 px-3 py-1.5 rounded-xl transition inline-flex items-center gap-1.5 active:scale-95';
    chatBtn.innerHTML = '<span>💬</span><span>Messagerie & État des lieux</span>';
    chatBtn.onclick = () => openChatForBooking(booking, true);

    const infoDiv = document.createElement('div');
    infoDiv.className = 'flex-1 min-w-0';
    infoDiv.appendChild(titleEl);
    infoDiv.appendChild(renterRow);
    infoDiv.appendChild(datesEl);
    infoDiv.appendChild(chatBtn);

    // Montant net perçu à droite
    const priceDiv = document.createElement('div');
    priceDiv.className = 'text-right flex flex-col items-end justify-center';
    
    const priceAmount = document.createElement('p');
    priceAmount.className = 'font-bold text-base sm:text-lg text-green-600 dark:text-green-400 whitespace-nowrap';
    priceAmount.textContent = `+ ${netEarnings} CHF`;

    const priceSub = document.createElement('p');
    priceSub.className = 'text-[11px] text-stone-400 whitespace-nowrap';
    priceSub.textContent = 'Net perçu (80%)';

    priceDiv.appendChild(priceAmount);
    priceDiv.appendChild(priceSub);

    const card = document.createElement('div');
    card.className = 'bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 p-4 sm:p-5 rounded-2xl shadow-sm flex items-center justify-between gap-4';
    
    const leftContent = document.createElement('div');
    leftContent.className = 'flex items-center gap-4 min-w-0 flex-1';
    leftContent.appendChild(img);
    leftContent.appendChild(infoDiv);

    const rightContent = document.createElement('div');
    rightContent.className = 'flex flex-col items-end gap-2 flex-shrink-0';
    rightContent.appendChild(statusSpan);
    rightContent.appendChild(priceDiv);

    card.appendChild(leftContent);
    card.appendChild(rightContent);

    return card;
}

async function loadProfileData() {
    if (!currentUser) return;
    const today = new Date();
    const todayStr = formatDateToLocalISO(today);

    // Récupération des données
    const { data: myBookings } = await supabaseClient
        .from('bookings')
        .select('*, trailers(*)')
        .eq('renter_id', currentUser.id)
        .eq('status', 'paye')
        .order('start_date', { ascending: false });

    const { data: myTrailers } = await supabaseClient
        .from('trailers')
        .select('*')
        .eq('owner_id', currentUser.id)
        .order('id', { ascending: false });

    const { data: sellerBookings } = await supabaseClient
        .from('bookings')
        .select('*, trailers(*)')
        .eq('owner_id', currentUser.id)
        .eq('status', 'paye')
        .order('start_date', { ascending: false });

    // Récupérer les avis déjà déposés par cet utilisateur
    const { data: myReviews } = await supabaseClient
        .from('reviews')
        .select('booking_id, rating')
        .eq('renter_id', currentUser.id);
    const reviewsByBooking = new Map((myReviews || []).map(r => [r.booking_id, r]));

    // ==========================================
    // 1. SECTION LOCATAIRE (Réservations actives vs passées)
    // ==========================================
    const allRenterBookings = myBookings || [];
    const activeBookings = allRenterBookings.filter(b => {
        const endStr = b.end_date ? b.end_date.split('T')[0] : '';
        return todayStr <= endStr;
    }).sort((a, b) => new Date(a.start_date) - new Date(b.start_date)); // Prochaines d'abord

    const pastBookings = allRenterBookings.filter(b => {
        const endStr = b.end_date ? b.end_date.split('T')[0] : '';
        return todayStr > endStr;
    }); // Les plus récentes d'abord

    // 1.1 Réservations actives et à venir
    const activeCountBadge = document.getElementById('buyer-active-count');
    if (activeCountBadge) activeCountBadge.textContent = activeBookings.length;

    const activeList = document.getElementById('buyer-active-bookings-list');
    if (activeList) {
        activeList.innerHTML = '';
        if (activeBookings.length > 0) {
            const activeFragment = document.createDocumentFragment();
            activeBookings.forEach(booking => {
                activeFragment.appendChild(createRenterBookingCard(booking, reviewsByBooking, todayStr));
            });
            activeList.appendChild(activeFragment);
        } else {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'col-span-1 md:col-span-2 bg-stone-50 dark:bg-stone-800/40 border border-stone-200/60 dark:border-stone-700/60 rounded-2xl p-6 text-center';
            emptyMsg.innerHTML = `
                <p class="text-stone-500 dark:text-stone-400 text-sm font-medium mb-2">Vous n'avez aucune location en cours ou à venir.</p>
                <button onclick="showPage('buyer-page')" class="text-xs font-bold text-terracotta-600 hover:text-terracotta-700 dark:text-terracotta-400 hover:underline">🔍 Trouver une remorque disponible</button>
            `;
            activeList.appendChild(emptyMsg);
        }
    }

    // 1.2 Historique des remorques louées (passées)
    const pastCountBadge = document.getElementById('buyer-past-count');
    if (pastCountBadge) pastCountBadge.textContent = pastBookings.length;

    const pastList = document.getElementById('buyer-past-bookings-list');
    if (pastList) {
        pastList.innerHTML = '';
        if (pastBookings.length > 0) {
            const pastFragment = document.createDocumentFragment();
            pastBookings.forEach(booking => {
                pastFragment.appendChild(createRenterBookingCard(booking, reviewsByBooking, todayStr));
            });
            pastList.appendChild(pastFragment);
        } else {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'col-span-1 md:col-span-2 bg-stone-50 dark:bg-stone-800/40 border border-stone-200/60 dark:border-stone-700/60 rounded-2xl p-6 text-center';
            emptyMsg.innerHTML = `
                <p class="text-stone-400 italic text-sm">Aucune location passée enregistrée pour le moment.</p>
            `;
            pastList.appendChild(emptyMsg);
        }
    }

    // ==========================================
    // 2. SECTION PROPRIÉTAIRE (Flotte + Historique des locations)
    // ==========================================
    
    // 2.1 Calcul des revenus mensuels nets et des commissions perdues historiquement
    let monthlyRevenue = 0;
    let totalLostCommission = 0;
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    if (sellerBookings) {
        sellerBookings.forEach(booking => {
            const sDate = new Date(booking.start_date);
            const eDate = new Date(booking.end_date);
            const days = Math.ceil(Math.abs(eDate - sDate) / (1000 * 60 * 60 * 24)) + 1;
            const baseRental = (booking.trailers && booking.trailers.price) ? (days * Number(booking.trailers.price)) : Number(booking.total_price);
            
            // Calculer la commission historique uniquement sur les locations terminées (20%)
            const endStr = booking.end_date ? booking.end_date.split('T')[0] : '';
            if (todayStr > endStr) {
                totalLostCommission += (baseRental * 0.20);
            }

            // Revenu mensuel
            if (sDate.getMonth() === currentMonth && sDate.getFullYear() === currentYear) {
                monthlyRevenue += (baseRental * 0.80);
            }
        });
    }

    // Affichage de la bannière PRO si l'utilisateur n'est pas PRO (on assume que la table profiles a un champ is_pro, ou que par défaut ils ne le sont pas)
    const proBanner = document.getElementById('pro-banner-container');
    const lostCommEl = document.getElementById('lost-commission-amount');
    
    // Pour simplifier l'accès, on vérifie dynamiquement si l'user est pro via une requête rapide
    if (proBanner && lostCommEl && currentUser) {
        supabaseClient.from('profiles').select('is_pro').eq('id', currentUser.id).maybeSingle().then(({ data }) => {
            if (data && data.is_pro) {
                proBanner.classList.add('hidden');
            } else {
                lostCommEl.textContent = totalLostCommission.toFixed(2) + ' CHF';
                proBanner.classList.remove('hidden');
            }
        });
    }

    const revenueElement = document.getElementById('seller-monthly-revenue');
    if (revenueElement) revenueElement.textContent = monthlyRevenue.toFixed(2) + ' CHF';

    // 2.2 État de ma flotte
    const trailersCountBadge = document.getElementById('seller-trailers-count');
    if (trailersCountBadge) {
        const count = myTrailers?.length || 0;
        trailersCountBadge.textContent = `${count} remorque${count > 1 ? 's' : ''}`;
    }

    const sellerList = document.getElementById('seller-trailers-list');
    if (sellerList) {
        sellerList.innerHTML = '';
        if (myTrailers && myTrailers.length > 0) {
            const sellerFragment = document.createDocumentFragment();
            myTrailers.forEach(trailer => {
                const isRentedNow = sellerBookings
                    ? sellerBookings.some(b => {
                        const bStart = b.start_date ? b.start_date.split('T')[0] : '';
                        const bEnd = b.end_date ? b.end_date.split('T')[0] : '';
                        return b.trailer_id === trailer.id && todayStr >= bStart && todayStr <= bEnd;
                    })
                    : false;

                // Badge de statut (texte statique uniquement)
                const badge = document.createElement('span');
                badge.className = 'absolute top-3 left-3 text-white text-xs font-bold px-3 py-1 rounded-lg shadow-sm';
                if (isRentedNow) {
                    badge.className += ' bg-red-500 animate-pulse';
                    badge.textContent = 'En location actuelle';
                } else {
                    badge.className += ' bg-green-500';
                    badge.textContent = 'Disponible';
                }

                // Image
                const img = document.createElement('img');
                img.src = trailer.image_url || 'https://images.unsplash.com/photo-1594054972175-39db43232140?q=80&w=600&auto=format&fit=crop';
                img.className = 'w-full h-full object-cover';
                img.alt = '';

                const imgWrapper = document.createElement('div');
                imgWrapper.className = 'h-32 bg-stone-200 dark:bg-stone-700 relative';
                imgWrapper.appendChild(badge);
                imgWrapper.appendChild(img);

                // Titre — textContent neutralise toute injection XSS
                const titleEl = document.createElement('h4');
                titleEl.className = 'font-bold text-lg mb-1 dark:text-white truncate';
                titleEl.textContent = trailer.title;

                // Prix (valeur numérique de la BDD)
                const priceEl = document.createElement('p');
                priceEl.className = 'text-stone-500 dark:text-stone-400 text-sm mb-4';
                priceEl.textContent = `Génère ${Number(trailer.price).toFixed(2)} CHF / jour`;

                // Bouton Boost
                const boostBtn = document.createElement('button');
                boostBtn.className = 'w-full bg-stone-100 hover:bg-stone-200 dark:bg-stone-700 dark:hover:bg-stone-600 text-stone-800 dark:text-white font-bold py-2 rounded-xl transition flex items-center justify-center gap-2 border border-stone-200 dark:border-stone-600 active:scale-95';
                boostBtn.innerHTML = '🚀 Booster';
                // Extraction de la ville, ou défaut "votre région"
                const city = (trailer.location && trailer.location.includes(',')) ? trailer.location.split(',')[0] : (trailer.location || 'votre région');
                boostBtn.onclick = () => openBoostModal(trailer.id, city);

                const infoDiv = document.createElement('div');
                infoDiv.className = 'p-4 flex flex-col justify-between h-full';
                const textDiv = document.createElement('div');
                textDiv.appendChild(titleEl);
                textDiv.appendChild(priceEl);
                infoDiv.appendChild(textDiv);
                infoDiv.appendChild(boostBtn);

                const card = document.createElement('div');
                card.className = 'bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl overflow-hidden shadow-sm relative';
                card.appendChild(imgWrapper);
                card.appendChild(infoDiv);
                sellerFragment.appendChild(card);
            });
            sellerList.appendChild(sellerFragment);
        } else {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'col-span-1 md:col-span-2 bg-stone-50 dark:bg-stone-800/40 border border-stone-200/60 dark:border-stone-700/60 rounded-2xl p-6 text-center';
            emptyMsg.innerHTML = `
                <p class="text-stone-500 dark:text-stone-400 text-sm font-medium mb-2">Vous n'avez pas encore publié d'annonce.</p>
                <button onclick="showPage('seller-page')" class="text-xs font-bold text-terracotta-600 hover:text-terracotta-700 dark:text-terracotta-400 hover:underline">➕ Publier ma première remorque</button>
            `;
            sellerList.appendChild(emptyMsg);
        }
    }

    // 2.3 Historique des locations reçues par le propriétaire
    const historyCountBadge = document.getElementById('seller-history-count');
    if (historyCountBadge) {
        const hCount = sellerBookings?.length || 0;
        historyCountBadge.textContent = `${hCount} location${hCount > 1 ? 's' : ''}`;
    }

    const historyList = document.getElementById('seller-history-list');
    if (historyList) {
        historyList.innerHTML = '';
        if (sellerBookings && sellerBookings.length > 0) {
            // Récupérer les profils des locataires pour afficher leur @username et avatar
            const renterIds = [...new Set(sellerBookings.map(b => b.renter_id).filter(Boolean))];
            let renterProfilesMap = new Map();
            if (renterIds.length > 0) {
                const { data: renterProfiles } = await supabaseClient
                    .from('profiles')
                    .select('id, username, avatar_url')
                    .in('id', renterIds);
                renterProfilesMap = new Map((renterProfiles || []).map(p => [p.id, p]));
            }

            const historyFragment = document.createDocumentFragment();
            sellerBookings.forEach(booking => {
                const renterProfile = renterProfilesMap.get(booking.renter_id) || null;
                historyFragment.appendChild(createSellerRentalHistoryCard(booking, renterProfile, todayStr));
            });
            historyList.appendChild(historyFragment);
        } else {
            const emptyHistoryMsg = document.createElement('div');
            emptyHistoryMsg.className = 'bg-stone-50 dark:bg-stone-800/40 border border-stone-200/60 dark:border-stone-700/60 rounded-2xl p-8 text-center';
            emptyHistoryMsg.innerHTML = `
                <p class="text-stone-500 dark:text-stone-300 font-semibold mb-1">Aucune location effectuée pour l'instant</p>
                <p class="text-xs text-stone-400">Dès qu'un client réservera une de vos remorques, l'historique détaillé et les revenus nets apparaîtront ici.</p>
            `;
            historyList.appendChild(emptyHistoryMsg);
        }
    }
}

// ==========================================
// 8. PARAMÈTRES DU COMPTE
// ==========================================
function openSettings() {
    if (!currentUser) return;
    document.getElementById('settings-email').innerText = currentUser.email;
    showPage('settings-page');
    loadProfileSettings(); // Charger le profil dans le formulaire
}

let isSettingUpStripe = false;
async function setupStripePayouts() {
    if (!currentUser || isSettingUpStripe) return;
    isSettingUpStripe = true;
    showToast("Génération du lien sécurisé Stripe...", "info");
    
    try {
        // Récupérer le stripe_account_id actuel si déjà enregistré
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('stripe_account_id')
            .eq('id', currentUser.id)
            .maybeSingle();

        const returnUrl = window.location.origin + window.location.pathname + '?stripe=success';
        const refreshUrl = window.location.origin + window.location.pathname + '?stripe=refresh';

        const data = await callEdgeFunction('stripe-onboarding', {
            email: currentUser.email,
            userId: currentUser.id,
            account: profile?.stripe_account_id || null,
            return_url: returnUrl,
            refresh_url: refreshUrl
        });

        if (data.url) {
            window.location.href = data.url; 
        } else {
            showToast("Erreur Stripe : " + (data.error || "Lien de configuration introuvable"), "error");
        }
    } catch (err) {
        showToast("Erreur Stripe : " + err.message, "error");
    } finally {
        isSettingUpStripe = false;
    }
}

let isDeletingAccount = false;
async function deleteAccount() {
    if (!currentUser || isDeletingAccount) return;
    const confirmDelete = confirm("⚠️ ATTENTION : Voulez-vous vraiment supprimer définitivement votre compte et toutes vos annonces ? Cette action est irréversible.");
    if (!confirmDelete) return;

    isDeletingAccount = true;
    showToast("Suppression en cours...", "info");
    
    try {
        const data = await callEdgeFunction('delete-account');
        if (data.success) {
            alert("Compte supprimé avec succès. À bientôt !");
            handleLogout();
        } else {
            showToast("Erreur de suppression : " + (data.error || "Échec de la suppression"), "error");
        }
    } catch (err) {
        showToast("Erreur de suppression : " + err.message, "error");
    } finally {
        isDeletingAccount = false;
    }
}

async function checkStripeConnectStatus() {
    const urlParams = new URLSearchParams(window.location.search);
    const stripeStatus = urlParams.get('stripe');
    if (!stripeStatus) return;

    // Nettoyer le paramètre 'stripe' de l'URL sans recharger la page
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('stripe');
    window.history.replaceState({}, document.title, newUrl.pathname + (newUrl.search ? newUrl.search : ''));

    if (stripeStatus === 'success') {
        showToast("🎉 Vos coordonnées bancaires ont été enregistrées avec succès !", "success");
        if (currentUser) {
            openSettings();
        }
    } else if (stripeStatus === 'refresh') {
        showToast("Configuration bancaire interrompue. Vous pouvez la reprendre à tout moment.", "info");
        if (currentUser) {
            openSettings();
        }
    }
}

// ==========================================
// 9. DÉMARRAGE DU SITE
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
    // Restaure le thème sombre/clair sauvegardé
    initTheme();

    // Restaure la langue sélectionnée
    const savedLang = localStorage.getItem('renger_lang') || 'fr';
    const langSelector = document.getElementById('lang-selector');
    if (langSelector) langSelector.value = savedLang;
    changeLanguage(savedLang);

    // Initialisation
    await checkUser();
    loadTrailers();
    await checkPaymentStatus();
    await checkStripeConnectStatus();
    if (typeof initSellerPageDynamicTools === 'function') {
        initSellerPageDynamicTools();
    }

    // Routing : si l'URL contient ?user=username, ouvrir le profil public
    const urlParams = new URLSearchParams(window.location.search);
    const userParam = urlParams.get('user');
    if (userParam) {
        openPublicProfile(userParam);
    }
});

// ==========================================
// 10. PROFILS PUBLICS & SETTINGS PROFIL
// ==========================================

// Ouvre la page profil public d'un utilisateur via son username
async function openPublicProfile(username) {
    if (!supabaseClient) return;

    showPage('public-profile-page');

    // Bouton retour : adapte selon le contexte
    const backBtn = document.getElementById('public-profile-back-btn');
    if (backBtn) backBtn.onclick = () => history.length > 1 ? history.back() : showPage('buyer-page');

    // Charger le profil
    const { data: profile, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('username', username)
        .maybeSingle();

    if (error || !profile) {
        showToast("Profil introuvable.", "error");
        showPage('buyer-page');
        return;
    }

    // Charger ses remorques
    const { data: trailers } = await supabaseClient
        .from('trailers')
        .select('*')
        .eq('owner_id', profile.id)
        .order('id', { ascending: false });

    const trailersCount = trailers?.length || 0;
    const badges = computeBadges(profile, trailersCount);

    // --- Remplir l'en-tête ---
    // Avatar
    const avatarContainer = document.getElementById('public-profile-avatar');
    if (avatarContainer) {
        avatarContainer.innerHTML = '';
        avatarContainer.appendChild(renderAvatar(profile, 80));
    }

    // Username
    const usernameEl = document.getElementById('public-profile-username');
    if (usernameEl) usernameEl.textContent = '@' + profile.username;

    // Membre depuis
    const sinceEl = document.getElementById('public-profile-since');
    if (sinceEl) {
        const since = new Date(profile.created_at).toLocaleDateString('fr-CH', { month: 'long', year: 'numeric' });
        sinceEl.textContent = 'Membre depuis ' + since;
    }

    // Badges
    const badgesEl = document.getElementById('public-profile-badges');
    if (badgesEl) {
        badgesEl.innerHTML = '';
        badges.forEach(b => badgesEl.appendChild(renderBadge(b, false)));
    }

    // --- Évaluation globale du propriétaire ---
    const ratingContainer = document.getElementById('public-profile-rating');
    if (ratingContainer) {
        ratingContainer.innerHTML = '';
        const trailerIds = (trailers || []).map(t => t.id);
        if (trailerIds.length > 0) {
            const { data: ownerReviews } = await supabaseClient
                .from('reviews')
                .select('rating')
                .in('trailer_id', trailerIds);

            const count = ownerReviews?.length || 0;
            if (count > 0) {
                const sum = ownerReviews.reduce((acc, r) => acc + r.rating, 0);
                const avg = (sum / count).toFixed(1);
                const stars = renderStarSVGs(avg, "w-5 h-5");
                const textInfo = document.createElement('div');
                textInfo.className = 'flex items-center gap-2 text-sm';
                textInfo.innerHTML = `<span class="font-bold text-stone-900 dark:text-white text-base">${avg} / 5</span> <span class="text-stone-400">(${count} avis au total)</span>`;
                ratingContainer.appendChild(stars);
                ratingContainer.appendChild(textInfo);
            } else {
                ratingContainer.innerHTML = `
                    <span class="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 px-3 py-1 rounded-full">
                        ★ Nouveau propriétaire (aucun avis pour le moment)
                    </span>
                `;
            }
        } else {
            ratingContainer.innerHTML = `
                <span class="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 px-3 py-1 rounded-full">
                    ★ Nouveau propriétaire
                </span>
            `;
        }
    }

    // --- Remorques ---
    const titleEl = document.getElementById('public-profile-trailers-title');
    if (titleEl) {
        titleEl.textContent = trailersCount > 0
            ? `${trailersCount} remorque${trailersCount > 1 ? 's' : ''} en location`
            : 'Aucune remorque pour le moment';
    }

    const grid = document.getElementById('public-profile-trailers');
    if (!grid) return;
    grid.innerHTML = '';

    if (!trailers || trailersCount === 0) {
        const msg = document.createElement('p');
        msg.className = 'col-span-3 text-center text-stone-400 italic py-8';
        msg.textContent = 'Ce membre n\'a pas encore publié d\'annonce.';
        grid.appendChild(msg);
        return;
    }

    const fragment = document.createDocumentFragment();
    trailers.forEach(trailer => {
        const card = document.createElement('div');
        card.className = 'bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 overflow-hidden hover:shadow-md cursor-pointer transition';
        card.onclick = () => openTrailerDetail(trailer);
        const imgUrl = trailer.image_url || 'https://placehold.co/600x400/f5f5f4/a8a29e?text=Renger';
        const cat = CATEGORY_MAP[trailer.category];
        card.innerHTML = `
            <div class="h-40 bg-stone-200 dark:bg-stone-700 relative">
                <img class="public-trailer-img w-full h-full object-cover" alt="">
                <div class="absolute top-3 right-3 bg-white dark:bg-stone-900 px-2 py-1 rounded-lg text-sm font-bold shadow dark:text-white"><span class="safe-price"></span> CHF<span class="text-xs font-normal">/j</span></div>
                ${cat ? `<div class="absolute bottom-3 left-3 bg-black/50 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-lg">${cat.emoji} <span class="safe-cat"></span></div>` : ''}
            </div>
            <div class="p-4">
                <div class="flex justify-between items-start gap-2 mb-3">
                    <h4 class="safe-title font-bold text-base dark:text-white flex-1 truncate"></h4>
                    <div class="trailer-rating-badge flex-shrink-0"></div>
                </div>
                <button class="w-full bg-terracotta-50 dark:bg-stone-700 text-terracotta-600 dark:text-terracotta-400 font-semibold py-2 rounded-xl text-sm">Voir les détails</button>
            </div>
        `;
        card.querySelector('.public-trailer-img').src = imgUrl;
        card.querySelector('.safe-title').textContent = trailer.title;
        card.querySelector('.safe-price').textContent = trailer.price;
        if (cat) card.querySelector('.safe-cat').textContent = cat.label;

        const ratingBadgeSlot = card.querySelector('.trailer-rating-badge');
        if (ratingBadgeSlot) {
            ratingBadgeSlot.appendChild(renderRatingBadge(trailer.rating_avg, trailer.rating_count, false));
        }

        fragment.appendChild(card);
    });
    grid.appendChild(fragment);

    // Mettre à jour l'URL sans recharger la page (pour le partage de lien)
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('user', username);
    history.pushState({ user: username }, '', newUrl.toString());
}

// Charge et affiche le profil dans la page settings
async function loadProfileSettings() {
    if (!supabaseClient || !currentUser) return;

    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

    if (!profile) return;

    // Avatar
    const avatarPreview = document.getElementById('settings-avatar-preview');
    if (avatarPreview) {
        avatarPreview.innerHTML = '';
        avatarPreview.appendChild(renderAvatar(profile, 80));
    }

    // Username
    const usernameInput = document.getElementById('settings-username');
    if (usernameInput) usernameInput.value = profile.username || '';

    // Info cooldown changement username
    const info = document.getElementById('settings-username-info');
    if (info && profile.last_username_change) {
        const lastChange = new Date(profile.last_username_change);
        const nextAllowed = new Date(lastChange.getTime() + 30 * 24 * 60 * 60 * 1000);
        const now = new Date();
        if (now < nextAllowed) {
            if (usernameInput) usernameInput.disabled = true;
            info.textContent = 'Prochain changement possible le ' + nextAllowed.toLocaleDateString('fr-CH');
            info.className = 'text-xs mt-1 text-amber-500';
        } else {
            if (usernameInput) usernameInput.disabled = false;
            info.textContent = 'Vous pouvez modifier votre nom d\'utilisateur (1 fois par mois)';
            info.className = 'text-xs mt-1 text-stone-400';
        }
    } else if (info) {
        info.textContent = 'Vous pouvez modifier votre nom d\'utilisateur (1 fois par mois)';
        info.className = 'text-xs mt-1 text-stone-400';
    }

    // Statut Stripe Connect
    const stripeBadge = document.getElementById('settings-stripe-status-badge');
    const stripeBtnText = document.getElementById('settings-stripe-btn-text');
    if (profile.stripe_account_id) {
        if (stripeBadge) {
            stripeBadge.innerHTML = `<span class="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-xs px-2.5 py-1 rounded-full font-bold inline-flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                COMPTE CONFIGURÉ
            </span>`;
        }
        if (stripeBtnText) {
            stripeBtnText.textContent = "Modifier mes coordonnées bancaires";
        }
    } else {
        if (stripeBadge) {
            stripeBadge.innerHTML = `<span class="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 text-xs px-2.5 py-1 rounded-full font-bold inline-flex">
                À CONFIGURER
            </span>`;
        }
        if (stripeBtnText) {
            stripeBtnText.textContent = "Configurer mes versements sécurisés";
        }
    }
}

// Sauvegarde les modifications de profil (username)
async function handleSaveProfile() {
    if (!supabaseClient || !currentUser) return showToast("Vous devez être connecté.", "error");

    const newUsername = (document.getElementById('settings-username')?.value || '').trim().toLowerCase();
    if (!newUsername) return showToast("Le nom d'utilisateur ne peut pas être vide.", "error");
    if (!validateUsernameFormat(newUsername)) return showToast("Format du nom d'utilisateur invalide.", "error");

    const saveBtn = document.querySelector('button[onclick="handleSaveProfile()"]');
    if (saveBtn) saveBtn.disabled = true;

    try {
        // Récupérer le profil actuel pour vérifier le cooldown
        const { data: profile } = await supabaseClient.from('profiles').select('*').eq('id', currentUser.id).maybeSingle();

        if (profile?.last_username_change) {
            const lastChange = new Date(profile.last_username_change);
            const nextAllowed = new Date(lastChange.getTime() + 30 * 24 * 60 * 60 * 1000);
            if (new Date() < nextAllowed) {
                return showToast("Vous ne pouvez changer votre username qu'une fois par mois.", "error");
            }
        }

        // Vérifier unicité si username a changé
        if (newUsername !== profile?.username) {
            const { data: existing } = await supabaseClient.from('profiles').select('username').eq('username', newUsername).maybeSingle();
            if (existing) return showToast("Ce nom d'utilisateur est déjà pris.", "error");
        }

        const updateData = { username: newUsername };
        if (newUsername !== profile?.username) updateData.last_username_change = new Date().toISOString();

        const { error } = await supabaseClient.from('profiles').update(updateData).eq('id', currentUser.id);
        if (error) return showToast("Erreur : " + error.message, "error");

        showToast("✅ Profil sauvegardé !", "success");
        loadProfileSettings(); // Rafraîchir l'affichage
    } finally {
        if (saveBtn) saveBtn.disabled = false;
    }
}

// Upload de l'avatar vers Supabase Storage
async function handleAvatarUpload(event) {
    if (!supabaseClient || !currentUser) return;
    const file = event.target.files[0];
    if (!file) return;

    // Vérifier taille (max 2 Mo)
    if (file.size > 2 * 1024 * 1024) return showToast("Image trop lourde (max 2 Mo).", "error");

    const ext = file.name.split('.').pop().toLowerCase();
    if (['svg', 'html', 'htm'].includes(ext)) {
        return showToast("L'extension de l'image n'est pas autorisée.", "error");
    }
    
    const isValid = await validateImageMagicBytes(file);
    if (!isValid) {
        return showToast("Le fichier n'est pas une image valide.", "error");
    }

    const filePath = `${currentUser.id}/avatar.${ext}`;

    showToast("Upload en cours...", "info");

    const { error: uploadError } = await supabaseClient.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

    if (uploadError) return showToast("Erreur d'upload : " + uploadError.message, "error");

    // Récupérer l'URL publique
    const { data: urlData } = supabaseClient.storage.from('avatars').getPublicUrl(filePath);
    const avatarUrl = urlData.publicUrl + '?t=' + Date.now(); // Cache-busting

    // Mettre à jour le profil
    await supabaseClient.from('profiles').update({ avatar_url: avatarUrl }).eq('id', currentUser.id);

    // Rafraîchir l'aperçu
    const preview = document.getElementById('settings-avatar-preview');
    if (preview) {
        preview.innerHTML = '';
        preview.appendChild(renderAvatar({ avatar_url: avatarUrl }, 80));
    }
    showToast("✅ Photo de profil mise à jour !", "success");
}

// Mise à jour du mot de passe de l'utilisateur connecté
async function handleChangePassword(event) {
    if (event) event.preventDefault();
    if (!supabaseClient || !currentUser) return showToast("Vous devez être connecté pour modifier votre mot de passe.", "error");

    const newPasswordInput = document.getElementById('settings-new-password');
    const confirmPasswordInput = document.getElementById('settings-confirm-password');
    const submitBtn = document.getElementById('settings-change-password-btn');

    const newPassword = newPasswordInput ? newPasswordInput.value : '';
    const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : '';

    if (!newPassword || newPassword.length < 8) {
        return showToast("Le nouveau mot de passe doit comporter au moins 8 caractères.", "error");
    }

    if (newPassword !== confirmPassword) {
        return showToast("Les deux mots de passe saisis ne correspondent pas.", "error");
    }

    if (submitBtn) submitBtn.disabled = true;

    try {
        const { error } = await supabaseClient.auth.updateUser({
            password: newPassword
        });

        if (error) {
            showToast("Erreur : " + error.message, "error");
        } else {
            showToast("🔒 Mot de passe modifié avec succès !", "success");
            if (newPasswordInput) newPasswordInput.value = '';
            if (confirmPasswordInput) confirmPasswordInput.value = '';
        }
    } catch (err) {
        showToast("Erreur : " + err.message, "error");
    } finally {
        if (submitBtn) submitBtn.disabled = false;
    }
}

// ==========================================
// 9. SYSTÈME DE CHAT PRÉ-RÉSERVATION
// ==========================================

/**
 * Active ou grise le bouton #chat-btn selon l'état de la session et des dates.
 * Conditions : currentUser actif ET selectedStartDate ET selectedEndDate définis.
 * Le propriétaire de l'annonce n'a pas besoin de poser une question à lui-même.
 */
function updateChatButtonState() {
    const chatBtn = document.getElementById('chat-btn');
    if (!chatBtn) return;

    const isOwner = currentUser && currentTrailer && currentUser.id === currentTrailer.owner_id;
    const canChat = !isOwner && currentUser && selectedStartDate && selectedEndDate;

    if (canChat) {
        chatBtn.disabled = false;
        chatBtn.className = "w-full mt-3 flex items-center justify-center gap-2 border-2 border-terracotta-400 text-terracotta-600 dark:text-terracotta-400 font-semibold py-3 rounded-2xl transition hover:bg-terracotta-50 dark:hover:bg-stone-700 cursor-pointer";
        chatBtn.title = "Poser une question au propriétaire";
    } else {
        chatBtn.disabled = true;
        chatBtn.className = "w-full mt-3 flex items-center justify-center gap-2 border-2 border-stone-200 dark:border-stone-700 text-stone-400 font-semibold py-3 rounded-2xl transition cursor-not-allowed opacity-60";
        if (!currentUser) {
            chatBtn.title = "Connectez-vous pour poser une question";
        } else if (!selectedStartDate || !selectedEndDate) {
            chatBtn.title = "Sélectionnez vos dates pour débloquer le chat";
        } else if (isOwner) {
            chatBtn.title = "Vous êtes le propriétaire de cette annonce";
        }
    }

    // Masquer le bouton si le user est propriétaire (inutile pour lui)
    if (isOwner) {
        chatBtn.classList.add('hidden');
    } else {
        chatBtn.classList.remove('hidden');
    }
}

/**
 * Filtre anti-contournement de plateforme.
 * Remplace les emails et les suites de chiffres (>8 caractères consécutifs, i.e. téléphones)
 * par un placeholder neutre.
 */
function sanitizeMessage(text) {
    const MASK = '[Information masquée avant réservation]';
    // Email
    text = text.replace(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, MASK);
    // Suites de chiffres > 8 caractères (numéros de téléphone, IBAN partiel, etc.)
    // On autorise les séparateurs courants (espace, point, tiret) entre groupes
    text = text.replace(/(\d[\s.\-]?){9,}/g, MASK);
    return text;
}

/**
 * Ouvre la modale de chat depuis une carte de réservation
 */
async function openChatForBooking(booking, isOwnerView = false) {
    if (!currentUser || !booking) return;

    currentBookingContext = booking;
    currentTrailer = booking.trailers || currentTrailer;
    activeChatPartnerId = isOwnerView ? booking.renter_id : (booking.owner_id || booking.trailers?.owner_id);

    await openChatModal();
}

/**
 * Ouvre la modale de chat et charge l'historique depuis Supabase.
 */
async function openChatModal(trailer = null, partnerId = null, booking = null) {
    if (!currentUser) {
        showToast("Vous devez être connecté pour ouvrir la messagerie.", "error");
        openAuthModal();
        return;
    }

    if (trailer) currentTrailer = trailer;
    if (partnerId) activeChatPartnerId = partnerId;
    if (booking) currentBookingContext = booking;

    if (!currentTrailer) return;

    // Si le partenaire n'est pas encore défini (ex: ouvert depuis la page détail par le locataire)
    if (!activeChatPartnerId) {
        activeChatPartnerId = (currentUser.id === currentTrailer.owner_id) ? null : currentTrailer.owner_id;
    }

    const modal = document.getElementById('chat-modal');
    if (!modal) return;
    modal.classList.remove('hidden');

    // Mettre à jour le sous-titre avec le nom de la remorque et le rôle
    const subtitle = document.getElementById('chat-modal-subtitle');
    if (subtitle) {
        const isOwner = (currentUser.id === currentTrailer.owner_id);
        subtitle.textContent = `${currentTrailer.title || 'Remorque'} • ${isOwner ? 'Discussion avec le locataire' : 'Discussion avec le propriétaire'}`;
    }

    // Mise à jour du compteur de caractères (assignation unique oninput)
    const input = document.getElementById('chat-input');
    if (input) {
        input.value = '';
        input.oninput = () => {
            const counter = document.getElementById('chat-char-count');
            if (counter) counter.textContent = input.value.length;
        };
        const counter = document.getElementById('chat-char-count');
        if (counter) counter.textContent = '0';
    }

    await loadChatMessages();
}

let currentChatMessages = [];

/**
 * Charge et affiche les messages du fil de conversation
 * entre currentUser et son interlocuteur pour currentTrailer.
 */
async function loadChatMessages() {
    const container = document.getElementById('chat-messages');
    if (!container || !currentTrailer) return;

    container.innerHTML = '<p class="text-center text-sm text-stone-400 italic py-4">Chargement des messages...</p>';

    let query = supabaseClient
        .from('messages')
        .select('id, sender_id, receiver_id, content, image_url, created_at')
        .eq('trailer_id', currentTrailer.id);

    if (activeChatPartnerId) {
        query = query.or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${activeChatPartnerId}),and(sender_id.eq.${activeChatPartnerId},receiver_id.eq.${currentUser.id})`);
    } else {
        query = query.or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`);
    }

    const { data: messages, error } = await query.order('created_at', { ascending: true });

    if (error) {
        container.innerHTML = '<p class="text-center text-sm text-red-400 py-4">Erreur lors du chargement des messages.</p>';
        return;
    }

    currentChatMessages = messages || [];
    await renderChatMessages(currentChatMessages);
    updateChatInspectionBar(currentChatMessages);
}

const signedUrlCache = new Map();

/**
 * Génère ou récupère en cache l'URL signée pour une photo dans le bucket privé 'inspections'
 */
async function resolveInspectionImageUrl(filePath) {
    if (!filePath) return null;
    if (filePath.startsWith('http')) return filePath;

    const cached = signedUrlCache.get(filePath);
    if (cached && cached.expires > Date.now()) {
        return cached.url;
    }

    try {
        const { data, error } = await supabaseClient.storage
            .from('inspections')
            .createSignedUrl(filePath, 3600);

        if (error || !data?.signedUrl) {
            return null;
        }

        signedUrlCache.set(filePath, {
            url: data.signedUrl,
            expires: Date.now() + 3500 * 1000
        });
        return data.signedUrl;
    } catch (e) {
        return null;
    }
}

/**
 * Affiche les bulles de messages dans le conteneur avec support des photos certifiées.
 */
async function renderChatMessages(messages) {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    container.innerHTML = '';

    if (messages.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'text-center text-sm text-stone-400 italic py-8';
        empty.textContent = 'Aucun message. Posez votre première question ou lancez l\'état des lieux !';
        container.appendChild(empty);
        return;
    }

    for (const msg of messages) {
        const isMine = msg.sender_id === currentUser.id;
        const wrapper = document.createElement('div');
        wrapper.className = 'flex ' + (isMine ? 'justify-end' : 'justify-start');

        const bubble = document.createElement('div');
        bubble.className = 'max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ' +
            (isMine
                ? 'bg-terracotta-500 text-white rounded-br-sm'
                : 'bg-stone-100 dark:bg-stone-700 text-stone-800 dark:text-stone-100 rounded-bl-sm');

        // Si le message contient une photo d'état des lieux
        if (msg.image_url) {
            const imgContainer = document.createElement('div');
            imgContainer.className = 'mb-2 rounded-xl overflow-hidden border border-black/15 dark:border-white/15 relative group bg-black/20';

            const img = document.createElement('img');
            img.className = 'w-full max-h-56 object-cover rounded-xl cursor-pointer hover:opacity-95 transition';
            img.alt = "Photo d'état des lieux certifiée";
            img.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="180"><rect width="100%" height="100%" fill="%23222"/><text x="50%" y="50%" fill="%23888" font-size="12" font-family="sans-serif" text-anchor="middle" dy=".3em">Chargement photo sécurisée...</text></svg>';

            resolveInspectionImageUrl(msg.image_url).then(url => {
                if (url) {
                    img.src = url;
                    img.onclick = () => window.open(url, '_blank');
                }
            });

            const badge = document.createElement('div');
            badge.className = 'absolute top-2 left-2 bg-black/75 backdrop-blur text-[10px] font-bold text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-500/30 flex items-center gap-1 shadow-sm';
            badge.innerHTML = '<span>🛡️</span><span>Preuve Certifiée</span>';

            imgContainer.appendChild(img);
            imgContainer.appendChild(badge);
            bubble.appendChild(imgContainer);
        }

        const text = document.createElement('p');
        text.className = 'whitespace-pre-wrap break-words';
        text.textContent = msg.content;

        const time = document.createElement('p');
        time.className = 'text-[10px] mt-1.5 ' + (isMine ? 'text-terracotta-200 text-right' : 'text-stone-400');
        const d = new Date(msg.created_at);
        time.textContent = d.toLocaleDateString('fr-CH', { day: 'numeric', month: 'short' }) +
            ' ' + d.toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' });

        bubble.appendChild(text);
        bubble.appendChild(time);
        wrapper.appendChild(bubble);
        container.appendChild(wrapper);
    }

    container.scrollTop = container.scrollHeight;
}

/**
 * Met à jour le bandeau asymétrique d'état des lieux dans le chat
 */
function updateChatInspectionBar(messages) {
    const inspectionBar = document.getElementById('chat-inspection-bar');
    const ownerActions = document.getElementById('chat-owner-actions');
    const renterActions = document.getElementById('chat-renter-actions');
    if (!inspectionBar || !ownerActions || !renterActions || !currentUser || !currentTrailer) return;

    let departureCount = 0;
    let returnCount = 0;

    messages.forEach(msg => {
        if (msg.image_url) {
            const content = (msg.content || '').toLowerCase();
            if (content.includes('départ') || content.includes('depart')) {
                departureCount++;
            } else if (content.includes('retour')) {
                returnCount++;
            }
        }
    });

    departureCount = Math.min(4, departureCount);
    returnCount = Math.min(4, returnCount);

    inspectionBar.classList.remove('hidden');
    inspectionBar.classList.add('flex');

    const isOwner = (currentUser.id === currentTrailer.owner_id);

    if (isOwner) {
        ownerActions.classList.remove('hidden');
        renterActions.classList.add('hidden');

        const stepBadge = document.getElementById('chat-owner-step-badge');
        if (stepBadge) {
            stepBadge.textContent = `${departureCount} / 4 photo(s)`;
            stepBadge.className = departureCount === 4
                ? 'text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                : 'text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
        }

        const unlockBtn = document.getElementById('chat-owner-unlock-btn');
        const unlockHint = document.getElementById('chat-owner-unlock-hint');
        const inspectionBtn = document.getElementById('chat-owner-inspection-btn');

        if (inspectionBtn) {
            inspectionBtn.innerHTML = departureCount === 4
                ? '<span>✅ Départ validé (4/4)</span>'
                : `<span>📸 État des lieux départ (${departureCount}/4)</span>`;
        }

        if (departureCount >= 4) {
            if (unlockBtn) {
                unlockBtn.disabled = false;
                unlockBtn.className = 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition shadow-md';
                unlockBtn.innerHTML = '<span>🔓 Déverrouiller mes fonds</span>';
            }
            if (unlockHint) {
                unlockHint.textContent = '✅ État des lieux complet certifié. Vous pouvez déverrouiller vos fonds (80% net).';
                unlockHint.className = 'text-[11px] text-emerald-600 dark:text-emerald-400 font-medium';
            }
        } else {
            if (unlockBtn) {
                unlockBtn.disabled = true;
                unlockBtn.className = 'bg-stone-200 text-stone-400 dark:bg-stone-800 dark:text-stone-500 text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-not-allowed transition shadow-sm';
                unlockBtn.innerHTML = '<span>🔒 Déverrouiller mes fonds</span>';
            }
            if (unlockHint) {
                unlockHint.textContent = `⚠️ 4 photos de départ requises pour déverrouiller vos fonds Stripe (${departureCount}/4 effectuées).`;
                unlockHint.className = 'text-[11px] text-amber-600 dark:text-amber-400 italic';
            }
        }
    } else {
        // Mode Locataire
        ownerActions.classList.add('hidden');
        renterActions.classList.remove('hidden');

        const stepBadge = document.getElementById('chat-renter-step-badge');
        if (stepBadge) {
            stepBadge.textContent = `${returnCount} / 4 photo(s)`;
            stepBadge.className = returnCount === 4
                ? 'text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                : 'text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
        }

        const inspectionBtn = document.getElementById('chat-renter-inspection-btn');
        if (inspectionBtn) {
            inspectionBtn.innerHTML = returnCount === 4
                ? '<span>✅ Retour validé (4/4)</span>'
                : `<span>📸 État des lieux retour (${returnCount}/4)</span>`;
        }

        const closeHint = document.getElementById('chat-renter-close-hint');
        if (closeHint) {
            if (returnCount >= 4) {
                closeHint.textContent = '✅ 4 photos enregistrées. Vous pouvez clôturer sereinement la location.';
                closeHint.className = 'text-[11px] text-emerald-600 dark:text-emerald-400 font-medium';
            } else {
                closeHint.textContent = `⚠️ Attention : sans photos de retour (${returnCount}/4), 50 CHF de pénalité sont facturés à la clôture.`;
                closeHint.className = 'text-[11px] text-amber-600 dark:text-amber-400';
            }
        }
    }
}

function getDeparturePhotosCount() {
    let count = 0;
    currentChatMessages.forEach(msg => {
        if (msg.image_url) {
            const content = (msg.content || '').toLowerCase();
            if (content.includes('départ') || content.includes('depart')) count++;
        }
    });
    return Math.min(4, count);
}

function getReturnPhotosCount() {
    let count = 0;
    currentChatMessages.forEach(msg => {
        if (msg.image_url) {
            const content = (msg.content || '').toLowerCase();
            if (content.includes('retour')) count++;
        }
    });
    return Math.min(4, count);
}

/**
 * Déclenche l'état des lieux de départ par le propriétaire
 */
function startOwnerInspection() {
    closeChatModal();
    startGuidedInspection('departure', currentTrailer.id, activeChatPartnerId, currentBookingContext?.id);
}

/**
 * Déclenche l'état des lieux de retour par le locataire
 */
function startRenterInspection() {
    closeChatModal();
    startGuidedInspection('return', currentTrailer.id, activeChatPartnerId, currentBookingContext?.id);
}

/**
 * Déverrouillage des fonds Stripe par le propriétaire (bloqué tant que 4/4 non fait)
 */
async function handleUnlockStripeFunds() {
    const departureCount = getDeparturePhotosCount();
    if (departureCount < 4) {
        return showToast("⚠️ Vous devez réaliser l'état des lieux de départ complet (4 photos) pour déverrouiller vos fonds.", "error");
    }

    showToast("🎉 Vérification validée ! Vos fonds Stripe (80% net) sont déverrouillés.", "success");

    if (supabaseClient && currentUser && currentTrailer) {
        const receiverId = activeChatPartnerId || (currentUser.id === currentTrailer.owner_id ? null : currentTrailer.owner_id);
        await supabaseClient.from('messages').insert([{
            sender_id: currentUser.id,
            receiver_id: receiverId,
            trailer_id: currentTrailer.id,
            content: "🔓 [Fonds Déverrouillés] Le propriétaire a certifié l'état des lieux de départ (4/4 photos). Les fonds Stripe sont débloqués."
        }]);
        await loadChatMessages();
    }
}

/**
 * Gestion de la clôture par le locataire
 */
function handleRenterCloseRental() {
    const returnCount = getReturnPhotosCount();
    if (returnCount < 4) {
        // Afficher la modale d'avertissement stricte
        const warningModal = document.getElementById('inspection-warning-modal');
        if (warningModal) warningModal.classList.remove('hidden');
    } else {
        if (confirm("Confirmez-vous la fin de la location ? L'état des lieux de retour (4/4 photos certifiées) a bien été validé.")) {
            finishRentalSuccessfully(false);
        }
    }
}

function closeInspectionWarningModal() {
    const warningModal = document.getElementById('inspection-warning-modal');
    if (warningModal) warningModal.classList.add('hidden');
}

function handleWarningModalBackdrop(event) {
    if (event.target === document.getElementById('inspection-warning-modal')) {
        closeInspectionWarningModal();
    }
}

function startInspectionFromWarning() {
    closeInspectionWarningModal();
    startRenterInspection();
}

async function confirmCloseWithoutInspection() {
    const confirmed = confirm("⚠️ DERNIÈRE CONFIRMATION :\n\nEn clôturant sans photos de retour, vous acceptez la facturation de 50 CHF de pénalité et êtes présumé responsable de tout dommage déclaré.\n\nVoulez-vous vraiment continuer ?");
    if (!confirmed) return;

    closeInspectionWarningModal();
    showToast("Clôture effectuée avec pénalité forfaitaire de 50 CHF.", "info");

    if (supabaseClient && currentUser && currentTrailer) {
        const receiverId = activeChatPartnerId || (currentUser.id === currentTrailer.owner_id ? null : currentTrailer.owner_id);
        await supabaseClient.from('messages').insert([{
            sender_id: currentUser.id,
            receiver_id: receiverId,
            trailer_id: currentTrailer.id,
            content: "⚠️ [Clôture sans photos] Le locataire a clôturé la location sans état des lieux de retour. Pénalité de 50 CHF appliquée."
        }]);
    }

    finishRentalSuccessfully(true);
}

function finishRentalSuccessfully(hadPenalty = false) {
    closeChatModal();
    if (hadPenalty) {
        showToast("Location clôturée (pénalité 50 CHF enregistrée). Merci de laisser un avis !", "info");
    } else {
        showToast("🎉 Location clôturée avec succès ! Merci de prendre soin de la communauté.", "success");
    }

    if (currentBookingContext && currentTrailer) {
        openReviewModal(currentBookingContext.id, currentTrailer.id, currentTrailer.title);
    }
}

/**
 * Envoie un message dans la table `messages`.
 * Le contenu est filtré par sanitizeMessage avant envoi.
 */
async function sendChatMessage() {
    if (!currentUser || !currentTrailer) return;

    const input = document.getElementById('chat-input');
    if (!input) return;

    const rawText = input.value.trim();
    if (!rawText) return showToast('Écrivez un message avant d\'envoyer.', 'error');

    const sanitized = sanitizeMessage(rawText);
    const sendBtn = document.getElementById('chat-send-btn');
    if (sendBtn) sendBtn.disabled = true;

    const receiverId = activeChatPartnerId || (currentUser.id === currentTrailer.owner_id ? null : currentTrailer.owner_id);

    const { error } = await supabaseClient.from('messages').insert([{
        sender_id: currentUser.id,
        receiver_id: receiverId,
        trailer_id: currentTrailer.id,
        content: sanitized
    }]);

    if (sendBtn) sendBtn.disabled = false;

    if (error) {
        showToast('Erreur lors de l\'envoi : ' + error.message, 'error');
        return;
    }

    input.value = '';
    const counter = document.getElementById('chat-char-count');
    if (counter) counter.textContent = '0';

    await loadChatMessages();
}

/**
 * Ferme la modale de chat.
 */
function closeChatModal() {
    const modal = document.getElementById('chat-modal');
    if (modal) modal.classList.add('hidden');
    const input = document.getElementById('chat-input');
    if (input) input.value = '';
}

/**
 * Ferme la modale si l'utilisateur clique sur le fond opaque.
 */
function handleChatModalBackdrop(event) {
    if (event.target === document.getElementById('chat-modal')) {
        closeChatModal();
    }
}

/**
 * Envoi du message avec Ctrl+Entrée (ou Cmd+Entrée sur Mac).
 */
function handleChatKeydown(event) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        sendChatMessage();
    }
}


// ==========================================
// 10. SYSTÈME D'ÉVALUATIONS & D'AVIS (ÉTOILES)
// ==========================================

let currentReviewBookingId = null;
let currentReviewTrailerId = null;
let selectedModalRating = 0;

const RATING_DESCRIPTIONS = {
    1: "1/5 — Décevant",
    2: "2/5 — Passable",
    3: "3/5 — Bien",
    4: "4/5 — Très bien",
    5: "5/5 — Excellent !"
};

/**
 * Génère le badge visuel de notation (ex: ★ 4.8 (12) ou ★ Nouveau)
 */
function renderRatingBadge(ratingAvg, ratingCount, isDetailed = false) {
    const container = document.createElement('div');
    const count = parseInt(ratingCount) || 0;
    const avg = parseFloat(ratingAvg) || 0;

    if (count > 0) {
        if (isDetailed) {
            container.className = 'inline-flex items-center gap-2 text-base font-bold text-stone-900 dark:text-white';
            container.innerHTML = `
                <span class="text-amber-500 text-lg">★</span>
                <span>${avg.toFixed(1)}</span>
                <span class="text-stone-400 font-normal text-sm">(${count} avis)</span>
            `;
        } else {
            container.className = 'inline-flex items-center gap-1 text-xs font-bold text-stone-800 dark:text-stone-200';
            container.innerHTML = `
                <span class="text-amber-500">★</span>
                <span>${avg.toFixed(1)}</span>
                <span class="text-stone-400 font-normal">(${count})</span>
            `;
        }
    } else {
        container.className = 'inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-md';
        container.innerHTML = `★ Nouveau`;
    }
    return container;
}

/**
 * Génère un groupe de 5 étoiles SVG pleines / vides
 */
function renderStarSVGs(rating, sizeClass = "w-4 h-4") {
    const wrapper = document.createElement('div');
    wrapper.className = 'flex items-center gap-0.5';
    const roundedRating = Math.round(Number(rating) || 0);

    for (let i = 1; i <= 5; i++) {
        const isFilled = i <= roundedRating;
        const star = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        star.setAttribute("class", `${sizeClass} ${isFilled ? 'text-amber-400 fill-amber-400' : 'text-stone-200 dark:text-stone-700 fill-stone-200 dark:fill-stone-700'}`);
        star.setAttribute("viewBox", "0 0 24 24");
        star.innerHTML = '<path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>';
        wrapper.appendChild(star);
    }
    return wrapper;
}

/**
 * Vérifie si le currentUser a une réservation payée sur cette remorque non encore notée
 */
async function checkUserReviewEligibility(trailer) {
    if (!currentUser || !trailer) return;

    const { data: userBookings, error } = await supabaseClient
        .from('bookings')
        .select('id, status')
        .eq('trailer_id', trailer.id)
        .eq('renter_id', currentUser.id)
        .eq('status', 'paye');

    if (error || !userBookings || userBookings.length === 0) return;

    const bookingIds = userBookings.map(b => b.id);
    const { data: existingReviews } = await supabaseClient
        .from('reviews')
        .select('booking_id')
        .in('booking_id', bookingIds);

    const reviewedIds = new Set((existingReviews || []).map(r => r.booking_id));
    const unreviewedBooking = userBookings.find(b => !reviewedIds.has(b.id));

    const promptEl = document.getElementById('detail-review-prompt');
    if (unreviewedBooking && promptEl) {
        promptEl.classList.remove('hidden');
        const btn = document.getElementById('detail-review-prompt-btn');
        if (btn) {
            btn.onclick = () => openReviewModal(unreviewedBooking.id, trailer.id, trailer.title);
        }
    }
}

/**
 * Charge et affiche les avis d'une remorque dans detail-reviews-list
 */
async function loadTrailerReviews(trailerId) {
    const list = document.getElementById('detail-reviews-list');
    const badge = document.getElementById('detail-reviews-count-badge');
    if (!list) return;

    list.innerHTML = '<p class="text-sm text-stone-400 italic">Chargement des avis...</p>';

    const { data: reviews, error } = await supabaseClient
        .from('reviews')
        .select('id, rating, comment, created_at, renter_id')
        .eq('trailer_id', trailerId)
        .order('created_at', { ascending: false });

    if (error || !reviews) {
        list.innerHTML = '<p class="text-sm text-stone-400 italic">Impossible de charger les avis.</p>';
        return;
    }

    if (badge) badge.textContent = reviews.length;

    if (reviews.length === 0) {
        list.innerHTML = `
            <div class="bg-stone-50 dark:bg-stone-800/50 rounded-2xl p-6 text-center border border-stone-100 dark:border-stone-700">
                <p class="text-stone-500 dark:text-stone-300 text-sm font-semibold mb-1">Cette remorque n'a pas encore reçu d'avis.</p>
                <p class="text-xs text-stone-400">Soyez le premier locataire à partager votre expérience après réservation !</p>
            </div>
        `;
        return;
    }

    // Récupérer les profils des locataires ayant laissé un avis
    const renterIds = [...new Set(reviews.map(r => r.renter_id))];
    const { data: profiles } = await supabaseClient
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', renterIds);
    const profilesMap = new Map((profiles || []).map(p => [p.id, p]));

    list.innerHTML = '';
    const fragment = document.createDocumentFragment();
    reviews.forEach(rev => {
        const profile = profilesMap.get(rev.renter_id) || { username: 'Locataire', avatar_url: null };
        const card = document.createElement('div');
        card.className = 'bg-stone-50 dark:bg-stone-800/60 border border-stone-200/70 dark:border-stone-700 rounded-2xl p-5';

        // En-tête avis (avatar + username + date + étoiles)
        const header = document.createElement('div');
        header.className = 'flex items-center justify-between gap-3 mb-3';

        const userRow = document.createElement('div');
        userRow.className = 'flex items-center gap-3';

        const avatar = renderAvatar(profile, 40);
        userRow.appendChild(avatar);

        const nameDateDiv = document.createElement('div');
        const usernameEl = document.createElement('p');
        usernameEl.className = 'font-bold text-stone-800 dark:text-white text-sm';
        usernameEl.textContent = '@' + profile.username;

        const dateEl = document.createElement('p');
        dateEl.className = 'text-[11px] text-stone-400';
        const d = new Date(rev.created_at);
        dateEl.textContent = d.toLocaleDateString('fr-CH', { day: 'numeric', month: 'long', year: 'numeric' });

        nameDateDiv.appendChild(usernameEl);
        nameDateDiv.appendChild(dateEl);
        userRow.appendChild(nameDateDiv);

        const stars = renderStarSVGs(rev.rating, "w-4 h-4");

        header.appendChild(userRow);
        header.appendChild(stars);
        card.appendChild(header);

        // Commentaire (si présent)
        if (rev.comment) {
            const commentEl = document.createElement('p');
            commentEl.className = 'text-sm text-stone-600 dark:text-stone-300 leading-relaxed pl-13';
            commentEl.textContent = rev.comment; // textContent = XSS-safe
            card.appendChild(commentEl);
        }

        fragment.appendChild(card);
    });
    list.appendChild(fragment);
}

/**
 * Ouvre la modale d'évaluation pour une réservation
 */
function openReviewModal(bookingId, trailerId, trailerTitle) {
    if (!currentUser) {
        showToast("Vous devez être connecté pour noter.", "error");
        openAuthModal();
        return;
    }

    currentReviewBookingId = bookingId;
    currentReviewTrailerId = trailerId;
    selectedModalRating = 0;

    const modal = document.getElementById('review-modal');
    if (!modal) return;

    const subtitle = document.getElementById('review-modal-subtitle');
    if (subtitle) subtitle.textContent = trailerTitle || "Location de remorque";

    const commentInput = document.getElementById('review-comment-input');
    if (commentInput) commentInput.value = '';

    updateModalStarDisplay(0);
    const label = document.getElementById('modal-rating-label');
    if (label) {
        label.textContent = "Sélectionnez une note";
        label.className = "text-sm font-semibold text-stone-400 mt-2 h-5";
    }

    modal.classList.remove('hidden');
}

/**
 * Ferme la modale d'évaluation
 */
function closeReviewModal() {
    const modal = document.getElementById('review-modal');
    if (modal) modal.classList.add('hidden');
    currentReviewBookingId = null;
    currentReviewTrailerId = null;
    selectedModalRating = 0;
}

function handleReviewModalBackdrop(event) {
    if (event.target === document.getElementById('review-modal')) {
        closeReviewModal();
    }
}

function previewModalRating(rating) {
    updateModalStarDisplay(rating);
    const label = document.getElementById('modal-rating-label');
    if (label) {
        label.textContent = RATING_DESCRIPTIONS[rating] || "";
        label.className = "text-sm font-bold text-terracotta-600 dark:text-terracotta-400 mt-2 h-5";
    }
}

function resetModalRatingPreview() {
    updateModalStarDisplay(selectedModalRating);
    const label = document.getElementById('modal-rating-label');
    if (label) {
        if (selectedModalRating > 0) {
            label.textContent = RATING_DESCRIPTIONS[selectedModalRating] || "";
            label.className = "text-sm font-bold text-terracotta-600 dark:text-terracotta-400 mt-2 h-5";
        } else {
            label.textContent = "Sélectionnez une note";
            label.className = "text-sm font-semibold text-stone-400 mt-2 h-5";
        }
    }
}

function setModalRating(rating) {
    selectedModalRating = rating;
    updateModalStarDisplay(rating);
    const label = document.getElementById('modal-rating-label');
    if (label) {
        label.textContent = RATING_DESCRIPTIONS[rating] || "";
        label.className = "text-sm font-bold text-terracotta-600 dark:text-terracotta-400 mt-2 h-5";
    }
}

function updateModalStarDisplay(rating) {
    const buttons = document.querySelectorAll('.modal-star-btn');
    buttons.forEach((btn, index) => {
        if (index < rating) {
            btn.className = 'modal-star-btn p-1 text-amber-400 fill-amber-400 hover:scale-110 transition-transform';
        } else {
            btn.className = 'modal-star-btn p-1 text-stone-300 dark:text-stone-600 fill-stone-300 dark:fill-stone-600 hover:scale-110 transition-transform';
        }
    });
}

/**
 * Soumission de l'avis vers Supabase
 */
async function submitReview() {
    if (!currentUser) return showToast("Vous devez être connecté.", "error");
    if (!selectedModalRating || selectedModalRating < 1 || selectedModalRating > 5) {
        return showToast("Veuillez sélectionner une note entre 1 et 5 étoiles.", "error");
    }
    if (!currentReviewBookingId || !currentReviewTrailerId) {
        return showToast("Réservation introuvable.", "error");
    }

    const commentInput = document.getElementById('review-comment-input');
    const comment = commentInput ? commentInput.value.trim() : "";
    const submitBtn = document.getElementById('review-submit-btn');
    if (submitBtn) submitBtn.disabled = true;

    try {
        const { error } = await supabaseClient.from('reviews').insert([{
            trailer_id: currentReviewTrailerId,
            renter_id: currentUser.id,
            booking_id: currentReviewBookingId,
            rating: selectedModalRating,
            comment: comment || null
        }]);

        if (error) {
            showToast("Erreur lors de la publication : " + error.message, "error");
            return;
        }

        showToast("🎉 Merci pour votre évaluation !", "success");
        const trailerIdToRefresh = currentReviewTrailerId;
        closeReviewModal();

        // Rafraîchir les données de la remorque et la vue
        const detailPage = document.getElementById('detail-page');
        if (detailPage && !detailPage.classList.contains('hidden') && currentTrailer && currentTrailer.id === trailerIdToRefresh) {
            const { data: updatedTrailer } = await supabaseClient
                .from('trailers')
                .select('*')
                .eq('id', trailerIdToRefresh)
                .single();
            if (updatedTrailer) {
                currentTrailer = updatedTrailer;
                openTrailerDetail(updatedTrailer);
            }
        }

        const profilePage = document.getElementById('profile-page');
        if (profilePage && !profilePage.classList.contains('hidden')) {
            loadProfileData();
        }

        // Recharger le catalogue en arrière-plan
        loadTrailers();
    } finally {
        if (submitBtn) submitBtn.disabled = false;
    }
}
// ==========================================
// Renger PRO & BOOST
// ==========================================

let currentBoostTrailerId = null;

function openBoostModal(trailerId, city) {
    currentBoostTrailerId = trailerId;
    const modal = document.getElementById('boost-modal');
    const cityEl = document.getElementById('boost-modal-city');
    if (cityEl) cityEl.textContent = city;
    if (modal) modal.classList.remove('hidden');
}

function closeBoostModal() {
    currentBoostTrailerId = null;
    const modal = document.getElementById('boost-modal');
    if (modal) modal.classList.add('hidden');
}

async function handlePurchaseBoost() {
    if (!currentUser) return;
    if (!currentBoostTrailerId) return;
    const planEl = document.querySelector('input[name="boost_plan"]:checked');
    if (!planEl) return;

    const btn = document.getElementById('purchase-boost-btn');
    if (btn) btn.disabled = true;

    try {
        showToast("Création du paiement...", "info");
        const { data, error } = await supabaseClient.functions.invoke('stripe-boost-checkout', {
            body: { trailer_id: currentBoostTrailerId, plan: planEl.value }
        });
        
        if (error) throw error;
        if (data && data.url) {
            window.location.href = data.url;
        } else {
            showToast("Erreur lors de l'initialisation du paiement.", "error");
        }
    } catch (err) {
        showToast(err.message, "error");
    } finally {
        if (btn) btn.disabled = false;
    }
}

async function handleSubscribePro() {
    if (!currentUser) {
        showToast("Vous devez être connecté.", "error");
        return;
    }
    try {
        showToast("Redirection vers Stripe...", "info");
        const { data, error } = await supabaseClient.functions.invoke('stripe-pro-checkout', {
            body: { user_id: currentUser.id }
        });

        if (error) throw error;
        if (data && data.url) {
            window.location.href = data.url;
        } else {
            showToast("Erreur lors de l'initialisation de l'abonnement.", "error");
        }
    } catch (err) {
        showToast(err.message, "error");
    }
}
