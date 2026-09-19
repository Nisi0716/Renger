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

    setTimeout(() => {
        toast.classList.remove('translate-y-0', 'opacity-100');
        toast.classList.add('-translate-y-24', 'opacity-0');
    }, 3500);
}

// ==========================================
// 2. NAVIGATION & UI
// ==========================================
const pages = ['welcome-screen', 'buyer-page', 'seller-page', 'detail-page', 'inspection-page', 'profile-page', 'settings-page', 'public-profile-page'];

function showPage(pageId) {
    pages.forEach(p => {
        const el = document.getElementById(p);
        if (el) el.classList.add('hidden');
    });
    const target = document.getElementById(pageId);
    if (target) target.classList.remove('hidden');
    window.scrollTo(0, 0);
    
    if(pageId === 'inspection-page' && typeof startCamera === 'function') { 
        startCamera(); 
    }
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
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin
    });
    if (error) {
        showToast("Erreur : " + error.message, "error");
    } else {
        showToast("✉️ Lien envoyé ! Vérifiez votre boîte mail.", "success");
        closeAuthModal();
    }
}
function toggleTheme() {
    document.documentElement.classList.toggle('dark');
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

    const { data: existing } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

    if (existing) return; // Profil déjà présent

    // Générer un username depuis l'email Google ou via l'UUID
    let base = (user.email || '').split('@')[0]
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, '_')
        .substring(0, 16);
    if (!base || base.length < 1) base = 'user';

    // Vérifier disponibilité et ajouter un suffixe si nécessaire
    let username = base;
    let suffix = 1;
    while (true) {
        const { data: taken } = await supabaseClient
            .from('profiles')
            .select('id')
            .eq('username', username)
            .maybeSingle();
        if (!taken) break;
        username = base.substring(0, 14) + '_' + suffix;
        suffix++;
        if (suffix > 99) { username = 'user_' + user.id.replace(/-/g, '').substring(0, 8); break; }
    }

    await supabaseClient.from('profiles').insert({ id: user.id, username });
    showToast("Bienvenue sur Renger ! Votre username : @" + username + " (modifiable dans Paramètres)", "success");
}

async function handleLogin() {
    if (!supabaseClient) return showToast("Erreur: Supabase non chargé.", "error");
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) showToast("Erreur de connexion : " + error.message, "error");
    else {
        closeAuthModal();
        checkUser();
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

        grid.appendChild(card);
    });
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
let pendingPhotos = []; // Array de { file: File, dataUrl: string }

/**
 * Appelée quand l'utilisateur sélectionne des fichiers depuis le picker.
 * Ajoute les nouveaux fichiers à pendingPhotos[] dans la limite de 10.
 */
function handleMultiPhotoSelect(event) {
    const files = Array.from(event.target.files);
    const remaining = 10 - pendingPhotos.length;

    if (files.length > remaining) {
        showToast(`Maximum 10 photos. Vous pouvez encore en ajouter ${remaining}.`, 'error');
    }

    const toAdd = files.slice(0, remaining);
    let loaded = 0;

    toAdd.forEach(file => {
        // Vérification taille (max 5 Mo par photo)
        if (file.size > 5 * 1024 * 1024) {
            showToast(`"${file.name}" dépasse 5 Mo et a été ignorée.`, 'error');
            loaded++;
            if (loaded === toAdd.length) renderPhotoGrid();
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            pendingPhotos.push({ file, dataUrl: e.target.result });
            loaded++;
            if (loaded === toAdd.length) renderPhotoGrid();
        };
        reader.readAsDataURL(file);
    });

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
        img.src = photo.dataUrl;
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
 * Retire une photo de pendingPhotos[] par son index et re-render la grille.
 */
function removePhoto(index) {
    pendingPhotos.splice(index, 1);
    renderPhotoGrid();
}

async function handlePublish(event) {
    event.preventDefault();
    if (!currentUser) {
        showToast("Vous devez être connecté pour publier.", "error");
        openAuthModal();
        return;
    }

    const PLACEHOLDER = "https://placehold.co/600x400/f5f5f4/a8a29e?text=Renger";
    let imageUrls = [];

    if (pendingPhotos.length === 0) {
        showToast("Ajoutez au moins une photo pour publier votre annonce.", "error");
        return;
    }

    showToast("Upload des photos en cours…", "info");

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

    const newTrailer = {
        title: document.getElementById('ad-title').value,
        description: document.getElementById('ad-desc').value,
        price: parseInt(document.getElementById('ad-price').value),
        payload: parseInt(document.getElementById('ad-payload').value),
        socket: document.querySelector('input[name="prise"]:checked').value,
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
        showToast("✅ Annonce publiée !", "success");
        document.getElementById('add-trailer-form').reset();
        // Reset photos
        pendingPhotos = [];
        renderPhotoGrid();
        showPage('buyer-page');
        loadTrailers();
    }
}

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
        actionBtn.className = "w-full bg-terracotta-500 hover:bg-terracotta-600 text-white font-bold py-4 rounded-2xl shadow-xl transition transform active:scale-95 text-lg mb-4";
    }

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
                const total = diffDays * currentTrailer.price;
                
                document.getElementById('total-days').innerText = diffDays;
                document.getElementById('total-price').innerText = isOwner ? "0 CHF" : total + " CHF";
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

    const formatSQLDate = (date) => {
        const tzOffset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - tzOffset).toISOString().split('T')[0];
    };

    const newBooking = {
        trailer_id: currentTrailer.id,
        renter_id: currentUser.id,
        owner_id: currentTrailer.owner_id,
        start_date: formatSQLDate(selectedStartDate),
        end_date: formatSQLDate(selectedEndDate),
        total_price: 0,
        status: 'indisponible' // Statut spécial pour bloquer sans payer
    };

    const { error } = await supabaseClient.from('bookings').insert([newBooking]);
    
    if (error) {
        showToast("Erreur lors du blocage : " + error.message, "error");
    } else {
        showToast("Dates bloquées avec succès !", "success");
        // On recharge la page pour griser les dates instantanément
        openTrailerDetail(currentTrailer); 
    }
}

// Ouvre la modale de confirmation avec un résumé avant de payer
function submitBooking() {
    if (!currentUser) {
        showToast("Vous devez être connecté pour réserver.", "error");
        openAuthModal();
        return;
    }
    if (!selectedStartDate || !selectedEndDate) {
        return showToast("Veuillez sélectionner vos dates sur le calendrier.", "error");
    }

    // Calculer les infos pour la modale
    const diffTime = Math.abs(selectedEndDate - selectedStartDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    const totalEstim = diffDays * currentTrailer.price;

    const fmtDate = (d) => d.toLocaleDateString('fr-CH', { day: 'numeric', month: 'short' });

    // Remplir la modale avec textContent (XSS-safe)
    document.getElementById('confirm-img').src = currentTrailer.image_url || "https://placehold.co/600x400/f5f5f4/a8a29e?text=Renger";
    document.getElementById('confirm-title').textContent = currentTrailer.title;
    document.getElementById('confirm-dates').textContent = `${fmtDate(selectedStartDate)} → ${fmtDate(selectedEndDate)}`;
    document.getElementById('confirm-days').textContent = `${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    document.getElementById('confirm-price').textContent = `${totalEstim} CHF`;

    // Afficher la modale
    document.getElementById('booking-confirm-modal').classList.remove('hidden');
}

function closeBookingConfirmModal() {
    document.getElementById('booking-confirm-modal').classList.add('hidden');
}

// Lance la vraie transaction Stripe (appelée depuis le bouton "Confirmer et payer")
async function processBooking() {
    closeBookingConfirmModal();

    showToast("Création de votre réservation sécurisée via Stripe...", "info");

    const formatSQLDate = (date) => {
        const tzOffset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - tzOffset).toISOString().split('T')[0];
    };

    try {
        const stripeData = await callEdgeFunction('stripe-checkout', {
            trailerId: currentTrailer.id,
            startDate: formatSQLDate(selectedStartDate),
            endDate: formatSQLDate(selectedEndDate)
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

        // Délai dépassé : le webhook n'a pas encore répondu mais on affiche quand même
        // le profil avec un message informatif
        showToast("Paiement validé. Votre réservation apparaîtra dans quelques instants.", "success");
        await openProfile();
        switchProfileTab('buyer');

    } else if (paymentStatus === 'cancel') {
        localStorage.removeItem('pending_booking_id');
        window.history.replaceState({}, document.title, window.location.pathname);
        showToast("Le paiement a été annulé. Votre réservation n'a pas été créée.", "error");
    }
}

// ==========================================
// 6. MODULE CAMÉRA (ÉTAT DES LIEUX)
// ==========================================
async function startCamera() {
    try {
        videoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        const feed = document.getElementById('camera-feed');
        if (feed) feed.srcObject = videoStream;
    } catch (err) { showToast("Erreur caméra.", "error"); showPage('detail-page'); }
}

function stopCamera() { 
    if (videoStream) { videoStream.getTracks().forEach(track => track.stop()); videoStream = null; } 
}
async function takePhoto() {
    const feed = document.getElementById('camera-feed');
    if (!feed || !videoStream) {
        showToast("Caméra indisponible.", "error");
        return;
    }

    try {
        showToast("Capture et certification de l'état des lieux...", "info");

        // 1. Création d'un canvas pour extraire l'image instantanée du flux vidéo
        const canvas = document.createElement('canvas');
        canvas.width = feed.videoWidth || 1280;
        canvas.height = feed.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(feed, 0, 0, canvas.width, canvas.height);

        // 2. Conversion en Blob image/jpeg
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85));
        if (!blob) throw new Error("Échec de la conversion de l'image.");

        // 3. Upload vers le bucket Supabase sécurisé 'inspections'
        if (supabaseClient && currentUser) {
            const trailerId = currentTrailer ? currentTrailer.id : 'generale';
            const timestamp = Date.now();
            const filePath = `${currentUser.id}/${trailerId}_${timestamp}.jpg`;

            const { error: uploadError } = await supabaseClient.storage
                .from('inspections')
                .upload(filePath, blob, {
                    contentType: 'image/jpeg',
                    upsert: false
                });

            if (uploadError) {
                console.warn("Avertissement stockage inspection :", uploadError.message);
                showToast("Photo capturée (attention : " + uploadError.message + ")", "info");
            } else {
                showToast("📸 État des lieux photographique certifié et sauvegardé !", "success");
            }
        } else {
            showToast("Photo capturée localement. Connectez-vous pour certifier en ligne.", "info");
        }
    } catch (err) {
        showToast("Erreur lors de la capture : " + err.message, "error");
    } finally {
        stopCamera();
        showPage('detail-page');
    }
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

async function loadProfileData() {
    if (!currentUser) return;
    const today = new Date();

    const { data: myBookings } = await supabaseClient.from('bookings').select('*, trailers(*)').eq('renter_id', currentUser.id).eq('status', 'paye');
    const { data: myTrailers } = await supabaseClient.from('trailers').select('*').eq('owner_id', currentUser.id);
    const { data: sellerBookings } = await supabaseClient.from('bookings').select('*').eq('owner_id', currentUser.id).eq('status', 'paye');

    // Récupérer les avis déjà déposés par cet utilisateur
    const { data: myReviews } = await supabaseClient
        .from('reviews')
        .select('booking_id, rating')
        .eq('renter_id', currentUser.id);
    const reviewsByBooking = new Map((myReviews || []).map(r => [r.booking_id, r]));

    // ---- Section Locataire ----
    const buyerList = document.getElementById('buyer-bookings-list');
    if (buyerList) {
        buyerList.innerHTML = '';
        if (myBookings && myBookings.length > 0) {
            myBookings.forEach(booking => {
                const startDate = new Date(booking.start_date);
                const endDate = new Date(booking.end_date);

                // Badge de statut (texte statique uniquement, zéro donnée utilisateur)
                const statusSpan = document.createElement('span');
                statusSpan.className = 'text-xs font-bold px-2 py-1 rounded-md';
                if (today >= startDate && today <= endDate) {
                    statusSpan.className += ' bg-green-100 text-green-700';
                    statusSpan.textContent = '🔴 En cours';
                } else if (today < startDate) {
                    statusSpan.className += ' bg-blue-100 text-blue-700';
                    statusSpan.textContent = '⏳ À venir';
                } else {
                    statusSpan.className += ' bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-300';
                    statusSpan.textContent = 'Terminé';
                }

                // Image (attribut .src assigné, pas interpolé dans innerHTML)
                const img = document.createElement('img');
                img.src = booking.trailers.image_url || 'https://images.unsplash.com/photo-1594054972175-39db43232140?q=80&w=600&auto=format&fit=crop';
                img.className = 'w-20 h-20 object-cover rounded-xl bg-stone-100 dark:bg-stone-700';
                img.alt = '';

                // Titre de la remorque — textContent neutralise toute injection XSS
                const titleEl = document.createElement('h4');
                titleEl.className = 'font-bold text-stone-800 dark:text-white';
                titleEl.textContent = booking.trailers.title;

                const titleRow = document.createElement('div');
                titleRow.className = 'flex justify-between items-start mb-1';
                titleRow.appendChild(titleEl);
                titleRow.appendChild(statusSpan);

                // Dates (toLocaleDateString retourne une chaîne sûre)
                const datesEl = document.createElement('p');
                datesEl.className = 'text-sm text-stone-500 dark:text-stone-400';
                datesEl.textContent = `Du ${startDate.toLocaleDateString('fr-CH')} au ${endDate.toLocaleDateString('fr-CH')}`;

                // Prix (valeur numérique de la BDD)
                const priceEl = document.createElement('p');
                priceEl.className = 'text-terracotta-600 font-bold mt-2';
                priceEl.textContent = `${Number(booking.total_price).toFixed(2)} CHF réglés`;

                const infoDiv = document.createElement('div');
                infoDiv.className = 'flex-1';
                infoDiv.appendChild(titleRow);
                infoDiv.appendChild(datesEl);
                infoDiv.appendChild(priceEl);

                // Gestion de l'évaluation pour cette réservation
                if (reviewsByBooking.has(booking.id)) {
                    const rev = reviewsByBooking.get(booking.id);
                    const reviewBadge = document.createElement('span');
                    reviewBadge.className = 'inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 px-2.5 py-1 rounded-lg mt-2';
                    reviewBadge.textContent = `⭐ Note ${rev.rating}/5 attribuée`;
                    infoDiv.appendChild(reviewBadge);
                } else {
                    const reviewBtn = document.createElement('button');
                    reviewBtn.type = 'button';
                    reviewBtn.className = 'mt-2 text-xs font-bold bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 active:scale-95';
                    reviewBtn.textContent = '⭐ Donner mon avis';
                    reviewBtn.onclick = () => openReviewModal(booking.id, booking.trailers.id, booking.trailers.title);
                    infoDiv.appendChild(reviewBtn);
                }

                const card = document.createElement('div');
                card.className = 'bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 p-5 rounded-2xl shadow-sm flex items-center gap-4';
                card.appendChild(img);
                card.appendChild(infoDiv);
                buyerList.appendChild(card);
            });
        } else {
            const emptyMsg = document.createElement('p');
            emptyMsg.className = 'text-stone-400 italic';
            emptyMsg.textContent = "Vous n'avez aucune réservation en cours.";
            buyerList.appendChild(emptyMsg);
        }
    }

    // ---- Calcul des revenus mensuels ----
    let monthlyRevenue = 0;
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    if (sellerBookings) {
        sellerBookings.forEach(booking => {
            const bDate = new Date(booking.start_date);
            if (bDate.getMonth() === currentMonth && bDate.getFullYear() === currentYear) {
                monthlyRevenue += (booking.total_price * 0.80);
            }
        });
    }

    const revenueElement = document.getElementById('seller-monthly-revenue');
    if (revenueElement) revenueElement.textContent = monthlyRevenue.toFixed(2) + ' CHF';

    // ---- Section Propriétaire ----
    const sellerList = document.getElementById('seller-trailers-list');
    if (sellerList) {
        sellerList.innerHTML = '';
        if (myTrailers && myTrailers.length > 0) {
            myTrailers.forEach(trailer => {
                const isRentedNow = sellerBookings
                    ? sellerBookings.some(b => b.trailer_id === trailer.id && today >= new Date(b.start_date) && today <= new Date(b.end_date))
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
                titleEl.className = 'font-bold text-lg mb-1 dark:text-white';
                titleEl.textContent = trailer.title;

                // Prix (valeur numérique de la BDD)
                const priceEl = document.createElement('p');
                priceEl.className = 'text-stone-500 dark:text-stone-400 text-sm mb-3';
                priceEl.textContent = `Génère ${Number(trailer.price).toFixed(2)} CHF / jour`;

                const infoDiv = document.createElement('div');
                infoDiv.className = 'p-4';
                infoDiv.appendChild(titleEl);
                infoDiv.appendChild(priceEl);

                const card = document.createElement('div');
                card.className = 'bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl overflow-hidden shadow-sm relative';
                card.appendChild(imgWrapper);
                card.appendChild(infoDiv);
                sellerList.appendChild(card);
            });
        } else {
            const emptyMsg = document.createElement('p');
            emptyMsg.className = 'text-stone-400 italic';
            emptyMsg.textContent = "Vous n'avez pas encore publié de remorque.";
            sellerList.appendChild(emptyMsg);
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

async function setupStripePayouts() {
    if (!currentUser) return;
    showToast("Génération du lien sécurisé Stripe...", "info");
    
    try {
        const data = await callEdgeFunction('stripe-onboarding');
        if (data.url) {
            window.location.href = data.url; 
        } else {
            showToast("Erreur Stripe : " + (data.error || "Lien de configuration introuvable"), "error");
        }
    } catch (err) {
        showToast("Erreur Stripe : " + err.message, "error");
    }
}

async function deleteAccount() {
    if (!currentUser) return;
    const confirmDelete = confirm("⚠️ ATTENTION : Voulez-vous vraiment supprimer définitivement votre compte et toutes vos annonces ? Cette action est irréversible.");
    if (!confirmDelete) return;

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
    }
}

// ==========================================
// 9. DÉMARRAGE DU SITE
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
    // Restaure la langue sélectionnée
    const savedLang = localStorage.getItem('renger_lang') || 'fr';
    const langSelector = document.getElementById('lang-selector');
    if (langSelector) langSelector.value = savedLang;
    changeLanguage(savedLang);

    // Initialisation
    await checkUser();
    loadTrailers();
    await checkPaymentStatus();

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

        grid.appendChild(card);
    });

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
}

// Sauvegarde les modifications de profil (username)
async function handleSaveProfile() {
    if (!supabaseClient || !currentUser) return showToast("Vous devez être connecté.", "error");

    const newUsername = (document.getElementById('settings-username')?.value || '').trim().toLowerCase();
    if (!newUsername) return showToast("Le nom d'utilisateur ne peut pas être vide.", "error");
    if (!validateUsernameFormat(newUsername)) return showToast("Format du nom d'utilisateur invalide.", "error");

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
}

// Upload de l'avatar vers Supabase Storage
async function handleAvatarUpload(event) {
    if (!supabaseClient || !currentUser) return;
    const file = event.target.files[0];
    if (!file) return;

    // Vérifier taille (max 2 Mo)
    if (file.size > 2 * 1024 * 1024) return showToast("Image trop lourde (max 2 Mo).", "error");

    const ext = file.name.split('.').pop().toLowerCase();
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
 * Ouvre la modale de chat et charge l'historique depuis Supabase.
 */
async function openChatModal() {
    if (!currentUser || !currentTrailer) return;

    const modal = document.getElementById('chat-modal');
    if (!modal) return;
    modal.classList.remove('hidden');

    // Mettre à jour le sous-titre avec le nom de la remorque
    const subtitle = document.getElementById('chat-modal-subtitle');
    if (subtitle) subtitle.textContent = currentTrailer.title || 'Remorque';

    // Mise à jour du compteur de caractères
    const input = document.getElementById('chat-input');
    if (input) {
        input.value = '';
        input.addEventListener('input', () => {
            const counter = document.getElementById('chat-char-count');
            if (counter) counter.textContent = input.value.length;
        }, { once: false });
        // Réinitialiser le compteur
        const counter = document.getElementById('chat-char-count');
        if (counter) counter.textContent = '0';
    }

    await loadChatMessages();
}

/**
 * Charge et affiche les messages du fil de conversation
 * entre currentUser et le propriétaire de currentTrailer.
 */
async function loadChatMessages() {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    container.innerHTML = '<p class="text-center text-sm text-stone-400 italic py-4">Chargement...</p>';

    const { data: messages, error } = await supabaseClient
        .from('messages')
        .select('id, sender_id, receiver_id, content, created_at')
        .eq('trailer_id', currentTrailer.id)
        .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
        .order('created_at', { ascending: true });

    if (error) {
        container.innerHTML = '<p class="text-center text-sm text-red-400 py-4">Erreur lors du chargement des messages.</p>';
        return;
    }

    renderChatMessages(messages || []);
}

/**
 * Affiche les bulles de messages dans le conteneur.
 * Bulles terracotta pour les messages envoyés, stone pour les reçus.
 */
function renderChatMessages(messages) {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    container.innerHTML = '';

    if (messages.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'text-center text-sm text-stone-400 italic py-8';
        empty.textContent = 'Aucun message. Posez votre première question !';
        container.appendChild(empty);
        return;
    }

    messages.forEach(msg => {
        const isMine = msg.sender_id === currentUser.id;
        const wrapper = document.createElement('div');
        wrapper.className = 'flex ' + (isMine ? 'justify-end' : 'justify-start');

        const bubble = document.createElement('div');
        bubble.className = 'max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ' +
            (isMine
                ? 'bg-terracotta-500 text-white rounded-br-sm'
                : 'bg-stone-100 dark:bg-stone-700 text-stone-800 dark:text-stone-100 rounded-bl-sm');

        const text = document.createElement('p');
        text.textContent = msg.content; // textContent = XSS-safe

        const time = document.createElement('p');
        time.className = 'text-[10px] mt-1 ' + (isMine ? 'text-terracotta-200 text-right' : 'text-stone-400');
        const d = new Date(msg.created_at);
        time.textContent = d.toLocaleDateString('fr-CH', { day: 'numeric', month: 'short' }) +
            ' ' + d.toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' });

        bubble.appendChild(text);
        bubble.appendChild(time);
        wrapper.appendChild(bubble);
        container.appendChild(wrapper);
    });

    // Auto-scroll vers le bas
    container.scrollTop = container.scrollHeight;
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

    // Désactiver temporairement pour éviter les doubles envois
    if (sendBtn) sendBtn.disabled = true;

    const { error } = await supabaseClient.from('messages').insert([{
        sender_id: currentUser.id,
        receiver_id: currentTrailer.owner_id,
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

    // Rechargement de la conversation
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

        list.appendChild(card);
    });
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

    const { error } = await supabaseClient.from('reviews').insert([{
        trailer_id: currentReviewTrailerId,
        renter_id: currentUser.id,
        booking_id: currentReviewBookingId,
        rating: selectedModalRating,
        comment: comment || null
    }]);

    if (submitBtn) submitBtn.disabled = false;

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
}