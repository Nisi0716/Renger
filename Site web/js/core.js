// ==========================================
// 1. INITIALISATION & TRADUCTIONS
// ==========================================
const supabaseUrl = 'https://cwifrzajxrcpnqceyxnj.supabase.co';
const supabaseKey = 'sb_publishable_b8sieHW3SGLka8GSxRfr_w_eM3wtyYc';
const supabaseClient = window.supabase ? window.supabase.createClient(supabaseUrl, supabaseKey) : null;

// Variables d'état globales (déclarées en amont pour éviter tout ReferenceError TDZ)
let currentUser = null;
let currentTrailer = null; 
let bookingCalendar = null; 
let selectedStartDate = null;
let selectedEndDate = null;
let videoStream = null;
let currentFilter = 'all'; // Filtre actif sur la page des annonces
let currentStartDate = null; // Date de début du filtre de disponibilité (YYYY-MM-DD)
let currentEndDate = null; // Date de fin du filtre de disponibilité (YYYY-MM-DD)
try {
    Object.defineProperty(window, 'currentStartDate', {
        get() { return currentStartDate; },
        set(v) { currentStartDate = v; },
        configurable: true
    });
    Object.defineProperty(window, 'currentEndDate', {
        get() { return currentEndDate; },
        set(v) { currentEndDate = v; },
        configurable: true
    });
} catch (e) {}
let toastTimer = null; // Timer d'annulation pour éviter la collision des notifications toast
let activeChatPartnerId = null; // ID du destinataire de la conversation active
let currentBookingContext = null; // Contexte de réservation pour la transaction active

// Configuration et client Supabase
var supabase = supabaseClient;
window.supabase = window.supabase || {};
window.supabaseClient = supabaseClient;
if (supabaseClient) {
    window.supabase.auth = supabaseClient.auth;
}

// ==========================================
// ÉCOUTEUR GLOBAL D'AUTHENTIFICATION (OAUTH & SESSIONS)
// ==========================================
if (supabaseClient) {
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        try {
            currentUser = session?.user || null;
            window.currentUser = currentUser;

            // Auto-création du profil pour les retours OAuth (Google)
            if (currentUser && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
                if (typeof ensureProfileExists === 'function') {
                    ensureProfileExists(currentUser);
                }
            }

            // Notification de l'interface modulaire
            if (typeof updateUserMenu === 'function') {
                updateUserMenu(session?.user || null);
            }

            // Rafraîchissement automatique des données profil/settings dès résolution auth
            if (currentUser && typeof window !== 'undefined' && window.location.pathname.includes('profil.html')) {
                const params = new URLSearchParams(window.location.search || '');
                if (params.get('p') === 'settings-page' && typeof loadProfileSettings === 'function') {
                    loadProfileSettings();
                } else if (typeof loadProfileData === 'function') {
                    loadProfileData();
                }
            }
        } catch (err) {
            console.warn("Erreur dans onAuthStateChange:", err);
        }
    });
}

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

// --- Domaines d'emails autorisés (anti-comptes temporaires / spam) ---
const ALLOWED_EMAIL_DOMAINS = [
    // Google
    'gmail.com', 'googlemail.com',
    // Microsoft
    'outlook.com', 'hotmail.com', 'live.com', 'msn.com', 'hotmail.fr', 'outlook.fr',
    // Apple
    'icloud.com', 'me.com', 'mac.com',
    // Yahoo
    'yahoo.com', 'yahoo.fr', 'ymail.com',
    // Suisse
    'bluewin.ch', 'swissonline.ch',
    // Proton
    'proton.me', 'protonmail.com', 'pm.me'
];

function isAllowedEmailDomain(email) {
    if (!email || typeof email !== 'string') return false;
    const parts = email.trim().toLowerCase().split('@');
    if (parts.length !== 2) return false;
    const domain = parts[1];
    return ALLOWED_EMAIL_DOMAINS.includes(domain);
}

function evaluatePasswordConditions(password) {
    const pwd = password || '';
    return {
        length: pwd.length >= 8,
        upper: /[A-Z]/.test(pwd),
        lower: /[a-z]/.test(pwd),
        number: /[0-9]/.test(pwd),
        special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(pwd)
    };
}

function validateSignupEmailLive(value) {
    const feedback = document.getElementById('signup-email-feedback');
    if (!feedback) return;
    const email = (value || '').trim().toLowerCase();
    if (!email) {
        feedback.textContent = "Domaines acceptés : Gmail, Outlook, Hotmail, iCloud, Yahoo, Bluewin, Proton";
        feedback.className = "text-[11px] mt-1 text-stone-400";
        return;
    }
    if (email.includes('@')) {
        const parts = email.split('@');
        if (parts[1]) {
            if (isAllowedEmailDomain(email)) {
                feedback.textContent = "✓ Domaine d'e-mail accepté";
                feedback.className = "text-[11px] mt-1 text-green-600 dark:text-green-400 font-medium";
            } else {
                feedback.textContent = "Fournisseur non autorisé. Utilisez Gmail, Outlook, iCloud, Yahoo, Bluewin ou Proton.";
                feedback.className = "text-[11px] mt-1 text-amber-600 dark:text-amber-400 font-medium";
            }
            return;
        }
    }
    feedback.textContent = "Domaines acceptés : Gmail, Outlook, Hotmail, iCloud, Yahoo, Bluewin, Proton";
    feedback.className = "text-[11px] mt-1 text-stone-400";
}

function updatePasswordRuleUI(elId, isMet) {
    const el = document.getElementById(elId);
    if (!el) return;
    const badge = el.querySelector('span');
    if (isMet) {
        el.className = "flex items-center gap-1.5 text-green-600 dark:text-green-400 font-medium transition-colors";
        if (badge) {
            badge.textContent = "✓";
            badge.className = "w-3.5 h-3.5 inline-flex items-center justify-center rounded-full bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400 text-[10px] font-bold";
        }
    } else {
        el.className = "flex items-center gap-1.5 text-stone-400 transition-colors";
        if (badge) {
            badge.textContent = "○";
            badge.className = "w-3.5 h-3.5 inline-flex items-center justify-center rounded-full bg-stone-200 dark:bg-stone-700 text-stone-500 text-[9px] font-bold";
        }
    }
}

function validateSignupPasswordLive(value) {
    const cond = evaluatePasswordConditions(value);
    updatePasswordRuleUI('pwd-rule-length', cond.length);
    updatePasswordRuleUI('pwd-rule-upper', cond.upper);
    updatePasswordRuleUI('pwd-rule-lower', cond.lower);
    updatePasswordRuleUI('pwd-rule-number', cond.number);
    updatePasswordRuleUI('pwd-rule-special', cond.special);
    validateSignupPasswordMatchLive();
}

function validateSignupPasswordMatchLive() {
    const p1 = document.getElementById('signup-password')?.value || '';
    const p2 = document.getElementById('signup-password-confirm')?.value || '';
    const feedback = document.getElementById('signup-password-match-feedback');
    if (!feedback) return;

    if (!p2) {
        feedback.classList.add('hidden');
        return;
    }
    feedback.classList.remove('hidden');
    if (p1 === p2) {
        feedback.textContent = "✓ Les mots de passe correspondent";
        feedback.className = "text-[11px] mt-1 text-green-600 dark:text-green-400 font-medium";
    } else {
        feedback.textContent = "Les mots de passe ne correspondent pas";
        feedback.className = "text-[11px] mt-1 text-red-500 font-medium";
    }
}

window.validateSignupEmailLive = validateSignupEmailLive;
window.validateSignupPasswordLive = validateSignupPasswordLive;
window.validateSignupPasswordMatchLive = validateSignupPasswordMatchLive;

// --- Auth ---

async function handleSignup() {
    if (!supabaseClient) return showToast("Erreur: Supabase non chargé.", "error");

    const username = (document.getElementById('signup-username')?.value || '').trim().toLowerCase();
    const email = (document.getElementById('signup-email')?.value || '').trim();
    const password = document.getElementById('signup-password')?.value || '';
    const confirmPassword = document.getElementById('signup-password-confirm')?.value || '';

    if (!username) return showToast("Veuillez choisir un nom d'utilisateur.", "error");
    if (!validateUsernameFormat(username)) return showToast("Format du nom d'utilisateur invalide (@lettres minuscules, chiffres, . - _).", "error");

    if (!email) return showToast("Veuillez renseigner votre adresse email.", "error");
    if (!isAllowedEmailDomain(email)) {
        return showToast("Adresse email non autorisée. Utilisez un fournisseur fiable (Gmail, Outlook, iCloud, Yahoo, Bluewin, Proton).", "error");
    }

    const cond = evaluatePasswordConditions(password);
    if (!cond.length || !cond.upper || !cond.lower || !cond.number || !cond.special) {
        return showToast("Votre mot de passe doit respecter toutes les exigences de sécurité Renger.", "error");
    }

    if (password !== confirmPassword) {
        return showToast("La confirmation du mot de passe ne correspond pas.", "error");
    }

    const signupBtn = document.getElementById('signup-submit-btn') || document.querySelector('#auth-panel-signup button[onclick*="handleSignup"]');
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
        setTimeout(() => window.location.reload(), 1500);
    } finally {
        if (signupBtn) signupBtn.disabled = false;
    }
}
window.handleSignup = handleSignup;

// Connexion via Google OAuth
async function handleGoogleLogin(event) {
    if (event) {
        if (typeof event.preventDefault === 'function') event.preventDefault();
        if (typeof event.stopPropagation === 'function') event.stopPropagation();
    }
    console.log("[Renger] handleGoogleLogin() déclenché");

    let client = supabaseClient;
    if (!client && window.supabase && typeof window.supabase.createClient === 'function') {
        client = window.supabase.createClient(supabaseUrl, supabaseKey);
    }
    if (!client) {
        alert("Erreur : Impossible de charger le module Supabase. Veuillez recharger la page.");
        return;
    }

    const googleBtn = document.getElementById('google-login-btn') || document.querySelector('button[onclick*="handleGoogleLogin"]');
    if (googleBtn) {
        googleBtn.disabled = true;
        googleBtn.style.opacity = '0.6';
        googleBtn.style.cursor = 'wait';
    }

    try {
        const redirectUrl = window.location.origin + window.location.pathname;
        console.log("[Renger] Lancement OAuth vers :", redirectUrl);

        const { data, error } = await client.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectUrl
            }
        });

        if (error) {
            console.error("[Renger] Erreur Google OAuth:", error);
            alert("Erreur Google : " + error.message);
            if (googleBtn) {
                googleBtn.disabled = false;
                googleBtn.style.opacity = '1';
                googleBtn.style.cursor = 'pointer';
            }
            return;
        }

        if (data?.url) {
            console.log("[Renger] Redirection vers :", data.url);
            window.location.assign(data.url);
        }
    } catch (err) {
        console.error("[Renger] Exception Google OAuth:", err);
        alert("Erreur Google : " + (err.message || err));
        if (googleBtn) {
            googleBtn.disabled = false;
            googleBtn.style.opacity = '1';
            googleBtn.style.cursor = 'pointer';
        }
    }
}
window.handleGoogleLogin = handleGoogleLogin;

// Écouteur global pour intercepter le clic sur le bouton Google
document.addEventListener('click', (e) => {
    const btn = e.target && e.target.closest ? e.target.closest('#google-login-btn, [data-action="google-login"]') : null;
    if (btn) {
        handleGoogleLogin(e);
    }
});


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
            setTimeout(() => window.location.reload(), 500);
        }
    } finally {
        if (loginBtn) loginBtn.disabled = false;
    }
}

async function handleLogout() {
    if (!supabaseClient) return;
    await supabaseClient.auth.signOut();
    currentUser = null;
    if (typeof updateUserMenu === 'function') {
        updateUserMenu(null);
    }
    showWelcomeScreen();
}

async function checkUser() {
    if (!supabaseClient) return;
    const { data: { session } } = await supabaseClient.auth.getSession();
    currentUser = session?.user || null;
    
    if (currentUser) {
        if (typeof ensureProfileExists === 'function') {
            ensureProfileExists(currentUser);
        }
    }
    
    if (typeof updateUserMenu === 'function') {
        updateUserMenu(currentUser);
    }
}
window.handleLogin = handleLogin;
window.handleLogout = handleLogout;
window.checkUser = checkUser;
window.openSettings = openSettings;

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


let userLat = null;
let userLon = null;

function calculateDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

async function requestGeolocationAndSort() {
    if (!navigator.geolocation) {
        showToast("Géolocalisation non supportée par votre navigateur", "error");
        return;
    }
    
    showToast("Recherche de votre position...", "info");
    navigator.geolocation.getCurrentPosition(
        (position) => {
            userLat = position.coords.latitude;
            userLon = position.coords.longitude;
            showToast("Position trouvée ! Tri en cours...", "success");
            loadTrailers(); // reload with sorting
        },
        (error) => {
            showToast("Erreur géolocalisation: " + error.message, "error");
        }
    );
}

// Analytics: Log Impression
async function logImpression(trailerId) {
    if (localStorage.getItem('renger_cookie_consent') !== 'accepted') return;
    if (!supabaseClient) return;
    try {
        await supabaseClient.from('impressions').insert([{ trailer_id: trailerId, user_id: currentUser?.id || null }]);
    } catch(e) {}
}

// Analytics: Log Click
async function logClick(trailerId) {
    if (localStorage.getItem('renger_cookie_consent') !== 'accepted') return;
    if (!supabaseClient) return;
    try {
        await supabaseClient.from('clicks').insert([{ trailer_id: trailerId, user_id: currentUser?.id || null }]);
    } catch(e) {}
}

/**
 * Recherche les identifiants des remorques indisponibles (réservées ou bloquées)
 * pour la plage de dates spécifiée.
 * @param {string} startDateStr - Date de début ISO (YYYY-MM-DD)
 * @param {string} endDateStr - Date de fin ISO (YYYY-MM-DD)
 * @returns {Promise<Set<string>>}
 */
async function getUnavailableTrailerIds(startDateStr, endDateStr) {
    if (!supabaseClient || !startDateStr || !endDateStr) return new Set();
    try {
        let s = String(startDateStr).split('T')[0];
        let e = String(endDateStr).split('T')[0];
        if (s > e) {
            const tmp = s;
            s = e;
            e = tmp;
        }

        const { data: bookings, error } = await supabaseClient
            .from('bookings')
            .select('trailer_id, start_date, end_date, status')
            .in('status', ['paye', 'indisponible'])
            .lte('start_date', e)
            .gte('end_date', s);

        if (error) {
            console.warn("Supabase bookings query error:", error);
            return new Set();
        }

        const unavailable = new Set();
        (bookings || []).forEach(b => {
            if (!b || b.trailer_id == null) return;
            const bStart = (b.start_date || '').split('T')[0].split(' ')[0];
            const bEnd = (b.end_date || '').split('T')[0].split(' ')[0];
            if (bStart && bEnd && bStart <= e && bEnd >= s) {
                unavailable.add(String(b.trailer_id));
            }
        });
        return unavailable;
    } catch (err) {
        console.warn("Erreur vérification disponibilité bookings:", err);
        return new Set();
    }
}
window.getUnavailableTrailerIds = getUnavailableTrailerIds;

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
    let visibleTrailers = (trailers || []).filter(t => t.is_active !== false);
    
    // Feature 1: Geolocation & Boost sorting
    if (userLat && userLon) {
        visibleTrailers.forEach(t => {
            t.distance = calculateDistance(userLat, userLon, t.latitude, t.longitude);
        });
        visibleTrailers.sort((a, b) => {
            const aBoosted = (a.boost_end_date && new Date(a.boost_end_date) > new Date()) ? 1 : 0;
            const bBoosted = (b.boost_end_date && new Date(b.boost_end_date) > new Date()) ? 1 : 0;
            if (aBoosted !== bBoosted) {
                return bBoosted - aBoosted; // Boosted items first
            }
            return a.distance - b.distance;
        });
    } else {
        visibleTrailers.sort((a, b) => {
            const aBoosted = (a.boost_end_date && new Date(a.boost_end_date) > new Date()) ? 1 : 0;
            const bBoosted = (b.boost_end_date && new Date(b.boost_end_date) > new Date()) ? 1 : 0;
            if (aBoosted !== bBoosted) {
                return bBoosted - aBoosted; // Boosted items first
            }
            return 0;
        });
    }
    
    // Feature 2: Analytics Impressions
    visibleTrailers.forEach(t => {
        logImpression(t.id);
    });

    // R2.3: Filtrage par dates de réservation
    if (currentStartDate && currentEndDate) {
        try {
            const unavailableIds = await getUnavailableTrailerIds(currentStartDate, currentEndDate);
            if (unavailableIds && unavailableIds.size > 0) {
                visibleTrailers = visibleTrailers.filter(t => !unavailableIds.has(String(t.id)));
            }
        } catch (err) {
            console.warn("Erreur filtrage réservations:", err);
        }
    }

    // R2.4: Compteur dynamique de remorques disponibles
    const countEl = document.getElementById('available-trailers-count');
    if (countEl) {
        const count = visibleTrailers ? visibleTrailers.length : 0;
        const s = count > 1 ? 's' : '';
        countEl.textContent = `${count} disponible${s}`;
    }

    // R1.3: Synchronisation des marqueurs sur la carte Leaflet
    if (typeof updateTrailersMap === 'function') {
        try {
            updateTrailersMap(visibleTrailers || []);
        } catch (err) {
            console.warn("Erreur mise à jour carte Leaflet:", err);
        }
    }

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

    if (error || !visibleTrailers || visibleTrailers.length === 0) {
        const msg = document.createElement('p');
        msg.className = 'col-span-3 text-center text-stone-400 italic py-12';
        msg.textContent = cleanSearch
            ? `Aucun résultat pour "${cleanSearch}". Essayez un autre terme.`
            : 'Aucune remorque disponible dans cette catégorie pour le moment.';
        grid.appendChild(msg);
        return;
    }

    const fragment = document.createDocumentFragment();
    visibleTrailers.forEach(trailer => {
        const card = document.createElement('div');
        card.className = "bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 overflow-hidden hover:shadow-md cursor-pointer transition";
        card.onclick = () => openTrailerDetail(trailer);

        const imgUrl = trailer.image_url || "https://placehold.co/600x400/f5f5f4/a8a29e?text=Renger";
        const cat = CATEGORY_MAP[trailer.category];
        const isBoosted = trailer.boost_end_date && new Date(trailer.boost_end_date) > new Date();

        // CORRECTION XSS : L'URL n'est plus interpolée dans le HTML, l'élément img est rempli via .src
        card.innerHTML = `
            <div class="h-48 bg-stone-200 dark:bg-stone-700 relative">
                <img class="trailer-card-img w-full h-full object-cover" alt="">
                <div class="absolute top-3 right-3 bg-white dark:bg-stone-900 px-2 py-1 rounded-lg text-sm font-bold shadow dark:text-white"><span class="safe-price"></span> CHF<span class="text-xs font-normal">/j</span></div>
                ${cat ? `<div class="absolute bottom-3 left-3 bg-black/50 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-lg">${cat.emoji} <span class="safe-cat"></span></div>` : ''}
                ${isBoosted ? `<div class="absolute top-3 left-3 bg-gradient-to-r from-terracotta-500 to-amber-500 px-2 py-1 rounded-lg text-xs font-bold text-white shadow">🚀 Sponsorisé</div>` : ''}
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
// 8. PARAMÈTRES DU COMPTE
// ==========================================
function openSettings() {
    if (!currentUser) return;
    const settingsEmail = document.getElementById('settings-email');
    if (settingsEmail) settingsEmail.innerText = currentUser.email;
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

        const returnUrl = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '/profil.html') + '?p=settings-page&stripe=success';
        const refreshUrl = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '/profil.html') + '?p=settings-page&stripe=refresh';

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
            if (typeof loadProfileSettings === 'function') loadProfileSettings();
        }
    } else if (stripeStatus === 'refresh') {
        showToast("Configuration bancaire interrompue. Vous pouvez la reprendre à tout moment.", "info");
        if (currentUser) {
            openSettings();
        }
    }
}

/**
 * Initialise le sélecteur de dates Flatpickr sur la page d'accueil (Hero)
 * et met à jour dynamiquement le lien de redirection vers le catalogue.
 */
function initHeroDateFilter() {
    const inputEl = document.getElementById('hero-dates');
    if (!inputEl) return;
    const searchLink = document.getElementById('hero-search-btn') || document.querySelector('#welcome-screen a[href*="remorques.html"]');
    const clearBtn = document.getElementById('hero-clear-dates');

    if (typeof flatpickr !== 'undefined') {
        try {
            const heroPicker = flatpickr(inputEl, {
                mode: 'range',
                minDate: 'today',
                dateFormat: 'Y-m-d',
                altInput: true,
                altFormat: 'd.m.Y',
                locale: (flatpickr.l10ns && flatpickr.l10ns.fr) ? flatpickr.l10ns.fr : undefined,
                onChange: (selectedDates) => {
                    if (selectedDates && selectedDates.length === 2) {
                        const startStr = formatDateToLocalISO(selectedDates[0]);
                        const endStr = formatDateToLocalISO(selectedDates[1]);
                        if (searchLink) {
                            searchLink.href = `remorques.html?start=${encodeURIComponent(startStr)}&end=${encodeURIComponent(endStr)}`;
                        }
                        if (clearBtn) clearBtn.classList.remove('hidden');
                    }
                }
            });

            if (clearBtn) {
                clearBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    heroPicker.clear();
                    clearBtn.classList.add('hidden');
                    if (searchLink) {
                        searchLink.href = 'remorques.html';
                    }
                });
            }
        } catch (err) {
            console.warn("Erreur Flatpickr hero:", err);
        }
    }
}
window.initHeroDateFilter = initHeroDateFilter;

/**
 * Initialise le sélecteur de dates Flatpickr sur la page catalogue (remorques.html)
 * et synchronise avec les URL searchParams `start` et `end`.
 */
function initCatalogDateFilter() {
    const inputEl = document.getElementById('catalog-dates');
    const clearBtn = document.getElementById('catalog-clear-dates');

    const urlParams = new URLSearchParams(window.location.search);
    const startParam = urlParams.get('start');
    const endParam = urlParams.get('end');
    if (startParam && endParam) {
        currentStartDate = startParam;
        currentEndDate = endParam;
        if (clearBtn) clearBtn.classList.remove('hidden');
    }

    if (!inputEl) return;

    if (typeof flatpickr !== 'undefined') {
        try {
            const pickerConfig = {
                mode: 'range',
                minDate: 'today',
                dateFormat: 'Y-m-d',
                altInput: true,
                altFormat: 'd.m.Y',
                locale: (flatpickr.l10ns && flatpickr.l10ns.fr) ? flatpickr.l10ns.fr : undefined,
                defaultDate: (currentStartDate && currentEndDate) ? [currentStartDate, currentEndDate] : undefined,
                onChange: (selectedDates) => {
                    if (selectedDates && selectedDates.length === 2) {
                        currentStartDate = formatDateToLocalISO(selectedDates[0]);
                        currentEndDate = formatDateToLocalISO(selectedDates[1]);
                        if (clearBtn) clearBtn.classList.remove('hidden');
                        const newUrl = new URL(window.location.href);
                        newUrl.searchParams.set('start', currentStartDate);
                        newUrl.searchParams.set('end', currentEndDate);
                        window.history.replaceState({}, '', newUrl);
                        loadTrailers(currentFilter, currentSearch);
                    }
                }
            };
            const picker = flatpickr(inputEl, pickerConfig);
            window.catalogFlatpickr = picker;
        } catch (err) {
            console.warn("Erreur Flatpickr catalog:", err);
        }
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            currentStartDate = null;
            currentEndDate = null;
            clearBtn.classList.add('hidden');
            if (window.catalogFlatpickr && typeof window.catalogFlatpickr.clear === 'function') {
                window.catalogFlatpickr.clear();
            } else if (inputEl) {
                inputEl.value = '';
            }
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.delete('start');
            newUrl.searchParams.delete('end');
            window.history.replaceState({}, '', newUrl);
            loadTrailers(currentFilter, currentSearch);
        });
    }
}
window.initCatalogDateFilter = initCatalogDateFilter;

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
    
    const urlParams = new URLSearchParams(window.location.search);

    if (urlParams.get('pro_success') === 'true') {
        showToast("👑 Abonnement Renger PRO activé avec succès !", "success");
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('pro_success');
        window.history.replaceState({}, document.title, newUrl.pathname + (newUrl.search ? newUrl.search : ''));
    }
    
    if (urlParams.get('boost_success') === 'true') {
        showToast("🚀 Remorque boostée avec succès !", "success");
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('boost_success');
        window.history.replaceState({}, document.title, newUrl.pathname + (newUrl.search ? newUrl.search : ''));
    }

    // Initialisation sélecteur de dates accueil
    if (document.getElementById('hero-dates')) {
        initHeroDateFilter();
    }
    
    // MPA routing for trailer detail
    if (window.location.pathname.includes('remorque.html')) {
        const id = urlParams.get('id');
        if (id && typeof openTrailerDetail === 'function') {
            supabaseClient.from('trailers').select('*').eq('id', id).single().then(({data}) => {
                if(data) openTrailerDetail(data);
            });
        }
    }

    // MPA routing for inspection
    if (window.location.pathname.includes('inspection.html')) {
        const action = urlParams.get('action');
        if (action === 'start_inspection' && typeof startGuidedInspection === 'function') {
            const step = urlParams.get('step');
            const trailerId = urlParams.get('trailerId');
            const partnerId = urlParams.get('partnerId');
            const bookingId = urlParams.get('bookingId');
            
            if (trailerId) {
                supabaseClient.from('trailers').select('*').eq('id', trailerId).single().then(({data}) => {
                    if (data) currentTrailer = data;
                    if (partnerId) activeChatPartnerId = partnerId;
                    if (bookingId) currentBookingContext = { id: bookingId };
                    startGuidedInspection(step, trailerId, partnerId, bookingId);
                });
            } else {
                if (partnerId) activeChatPartnerId = partnerId;
                if (bookingId) currentBookingContext = { id: bookingId };
                startGuidedInspection(step, trailerId, partnerId, bookingId);
            }
        }
    }
    
    if (window.location.pathname.includes('remorques.html') && typeof loadTrailers === 'function') {
        initCatalogDateFilter();
        const cat = urlParams.get('category');
        if (cat && typeof setFilter === 'function') {
            setFilter(cat);
        } else {
            loadTrailers();
        }
    } else if (typeof loadTrailers === 'function' && !window.location.pathname.includes('remorque.html') && document.getElementById('trailers-grid')) {
        loadTrailers();
    }

    await checkPaymentStatus();
    await checkStripeConnectStatus();
    if (typeof initSellerPageDynamicTools === 'function') {
        initSellerPageDynamicTools();
    }

    // Routing : si l'URL contient ?user=username, ouvrir le profil public
    const userParam = urlParams.get('user');
    if (userParam) {
        if (typeof openPublicProfile === 'function') {
            openPublicProfile(userParam);
        }
    }
    
    // Routing pour la page profil (MPA)
    if (window.location.pathname.includes('profil.html')) {
        const pParam = urlParams.get('p') || 'profile-page';
        if (typeof showPage === 'function') {
            showPage(pParam);
        }
        // Attendre que currentUser soit dfini par checkUser() avant de charger les donnes
        if (pParam === 'settings-page' && typeof loadProfileSettings === 'function') {
            setTimeout(() => loadProfileSettings(), 50); // slight delay to ensure user auth is parsed
        } else if (typeof loadProfileData === 'function') {
            setTimeout(() => loadProfileData(), 50);
        }
    } else {
        // Fallback SPA routing 
        const pParam = urlParams.get('p');
        if (pParam && typeof showPage === 'function') {
            showPage(pParam);
        }
    }
});

