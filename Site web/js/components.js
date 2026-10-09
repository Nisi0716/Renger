// ==========================================
// 2. NAVIGATION & UI
// ==========================================
const pages = ['welcome-screen', 'buyer-page', 'seller-page', 'detail-page', 'inspection-page', 'profile-page', 'settings-page', 'public-profile-page'];

function showPage(pageId) {
    // Extinction propre de la caméra dès qu'on quitte la page d'inspection (évite la fuite matérielle)
    if (pageId !== 'inspection-page' && typeof videoStream !== 'undefined' && videoStream) {
        if (typeof stopCamera === 'function') stopCamera();
    }

    const target = document.getElementById(pageId);
    if (target) {
        pages.forEach(p => {
            const el = document.getElementById(p);
            if (el) el.classList.add('hidden');
        });
        target.classList.remove('hidden');
        window.scrollTo(0, 0);
        
        if (pageId === 'inspection-page' && typeof startCamera === 'function') { 
            startCamera(); 
        }

        if (pageId === 'seller-page' && typeof initSellerPageDynamicTools === 'function') {
            initSellerPageDynamicTools();
        }

        // Synchronisation de l'onglet actif dans la navigation mobile
        if (typeof updateMobileNavState === 'function') {
            updateMobileNavState(pageId);
        }
    } else {
        const pageMap = {
            'welcome-screen': 'index.html',
            'buyer-page': 'remorques.html',
            'seller-page': 'louer-ma-remorque.html',
            'detail-page': 'remorque.html',
            'inspection-page': 'inspection.html',
            'profile-page': 'profil.html?p=profile-page',
            'settings-page': 'profil.html?p=settings-page',
            'public-profile-page': 'profil.html?p=public-profile-page',
            'stats-page': 'stats.html'
        };
        if (pageMap[pageId]) {
            window.location.href = pageMap[pageId];
        }
    }
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



// ==========================================
// GESTION DU MENU UTILISATEUR & AUTHENTIFICATION UI
// ==========================================
function updateUserMenu(user) {
    const container = document.getElementById('user-menu-container');
    if (!container) return;

    if (user) {
        // Extraction du nom : full_name Google ou première partie de l'adresse email
        const displayName = user.user_metadata?.full_name || 
                            user.user_metadata?.name || 
                            (user.email ? user.email.split('@')[0] : 'Utilisateur');

        container.innerHTML = `
            <div class="flex items-center gap-3 sm:gap-4">
                <a href="profil.html" class="flex items-center gap-2 text-stone-700 dark:text-stone-200 hover:text-terracotta-500 font-semibold text-sm transition group" title="Accéder à Mon Espace">
                    <span class="w-8 h-8 rounded-full bg-terracotta-50 dark:bg-stone-800 text-terracotta-600 flex items-center justify-center font-bold text-xs border border-terracotta-200 dark:border-stone-700 group-hover:scale-105 transition-transform">
                        👤
                    </span>
                    <span class="hidden md:inline" id="user-display-name"></span>
                </a>
                <a href="profil.html?p=settings-page" class="text-stone-500 dark:text-stone-400 font-medium text-sm hover:text-terracotta-500 transition hidden lg:block">Paramètres</a>
                <button onclick="handleLogout()" class="text-stone-400 hover:text-red-500 text-sm font-medium transition hover:underline">Déconnexion</button>
            </div>
        `;
        const nameEl = document.getElementById('user-display-name');
        if (nameEl) nameEl.textContent = displayName;
    } else {
        container.innerHTML = `
            <button onclick="openAuthModal()" class="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-200 hover:text-terracotta-500 font-semibold py-2 px-4 rounded-xl shadow-sm transition">
                <span data-i18n="login">Se connecter</span>
            </button>
        `;
    }
}

function switchAuthTab(tab) {
    const loginPanel = document.getElementById('auth-panel-login');
    const signupPanel = document.getElementById('auth-panel-signup');
    const resetPanel = document.getElementById('auth-panel-reset');
    const tabsContainer = document.getElementById('auth-modal-tabs');
    const tabLoginBtn = document.getElementById('auth-tab-login');
    const tabSignupBtn = document.getElementById('auth-tab-signup');

    if (resetPanel) resetPanel.classList.add('hidden');
    if (tabsContainer) tabsContainer.classList.remove('hidden');

    if (tab === 'signup') {
        if (loginPanel) loginPanel.classList.add('hidden');
        if (signupPanel) signupPanel.classList.remove('hidden');
        if (tabSignupBtn) {
            tabSignupBtn.className = "flex-1 py-2 text-sm font-bold rounded-xl transition bg-white dark:bg-stone-800 text-stone-900 dark:text-white shadow-sm";
        }
        if (tabLoginBtn) {
            tabLoginBtn.className = "flex-1 py-2 text-sm font-bold rounded-xl transition text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-white";
        }
    } else {
        if (signupPanel) signupPanel.classList.add('hidden');
        if (loginPanel) loginPanel.classList.remove('hidden');
        if (tabLoginBtn) {
            tabLoginBtn.className = "flex-1 py-2 text-sm font-bold rounded-xl transition bg-white dark:bg-stone-800 text-stone-900 dark:text-white shadow-sm";
        }
        if (tabSignupBtn) {
            tabSignupBtn.className = "flex-1 py-2 text-sm font-bold rounded-xl transition text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-white";
        }
    }
}
window.switchAuthTab = switchAuthTab;

function openAuthModal(defaultTab = 'login') { 
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.remove('hidden');
    switchAuthTab(defaultTab);
}

function closeAuthModal() { 
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.add('hidden'); 
}
window.updateUserMenu = updateUserMenu;
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;


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

// Écouteur global pour fermer la modale active avec la touche Échap et navigation clavier
document.addEventListener('keydown', (event) => {
    const onboardingModal = document.getElementById('onboarding-modal');
    const isOnboardingOpen = onboardingModal && !onboardingModal.classList.contains('hidden');

    if (event.key === 'Escape') {
        const modals = [
            { id: 'review-modal', close: closeReviewModal },
            { id: 'chat-modal', close: closeChatModal },
            { id: 'booking-confirm-modal', close: closeBookingConfirmModal },
            { id: 'auth-modal', close: closeAuthModal },
            { id: 'onboarding-modal', close: skipOnboarding }
        ];

        for (const m of modals) {
            const el = document.getElementById(m.id);
            if (el && !el.classList.contains('hidden')) {
                m.close();
                break;
            }
        }
        return;
    }

    if (isOnboardingOpen && typeof onboardingState !== 'undefined' && onboardingState.track) {
        if (event.key === 'ArrowRight') {
            nextOnboardingStep();
        } else if (event.key === 'ArrowLeft') {
            prevOnboardingStep();
        }
    }
});

function showResetPanel() {
    const tabsContainer = document.getElementById('auth-modal-tabs');
    if (tabsContainer) tabsContainer.classList.add('hidden');
    const loginPanel = document.getElementById('auth-panel-login');
    if (loginPanel) loginPanel.classList.add('hidden');
    const signupPanel = document.getElementById('auth-panel-signup');
    if (signupPanel) signupPanel.classList.add('hidden');
    const resetPanel = document.getElementById('auth-panel-reset');
    if (resetPanel) resetPanel.classList.remove('hidden');

    // Pré-remplir l'email si déjà saisi
    const emailVal = document.getElementById('login-email')?.value || document.getElementById('signup-email')?.value;
    if (emailVal) {
        const resetEl = document.getElementById('reset-email');
        if (resetEl) resetEl.value = emailVal;
    }
}

function showLoginPanel() {
    switchAuthTab('login');
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
function initPageUIState() {
    if (typeof window === 'undefined') return;
    const path = (window.location && window.location.pathname) || '';
    const search = (window.location && window.location.search) || '';
    let pageId = 'welcome-screen';
    if (path.includes('remorques.html') || path.includes('remorque.html')) pageId = 'buyer-page';
    else if (path.includes('louer-ma-remorque.html')) pageId = 'seller-page';
    else if (path.includes('profil.html')) {
        pageId = search.includes('settings') ? 'settings-page' : 'profile-page';
    }
    if (typeof updateMobileNavState === 'function') {
        updateMobileNavState(pageId);
    }
    checkAndTriggerOnboarding();
}

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPageUIState);
    } else {
        initPageUIState();
    }
}


// Aliases & fallbacks for backwards compatibility
function showWelcomeScreen() {
    window.location.href = 'index.html';
}
function subscribePro() {
    if (typeof handleSubscribePro === 'function') {
        handleSubscribePro();
    }
}

// Initialisation immédiate du menu utilisateur si l'état auth a déjà été résolu
if (typeof currentUser !== 'undefined' && currentUser) {
    updateUserMenu(currentUser);
}

// ==========================================
// GUIDE NOUVEAUX UTILISATEURS (ONBOARDING)
// ==========================================
const ONBOARDING_TRACKS = {
    renter: {
        title: "Guide Locataire",
        badge: "🚗 Je cherche une remorque (Locataire)",
        steps: [
            {
                number: 1,
                emoji: "🔍",
                title: "1. Recherche par canton & permis (B vs BE)",
                description: "Explorez les remorques disponibles dans votre région (Vaud, Genève, Valais, etc.). Chaque annonce précise explicitement si votre permis de conduire voiture standard (catégorie B, pour les remorques ≤ 750 kg ou ensembles ≤ 3'500 kg) suffit, ou si le permis remorque (BE) est requis.",
                tip: "💡 <strong>Astuce Suisse :</strong> Filtrez par canton ou activez la vue carte Leaflet pour voir instantanément les remorques les plus proches de chez vous."
            },
            {
                number: 2,
                emoji: "💳",
                title: "2. Réservation & caution non débitée",
                description: "Réservez vos dates en toute sérénité. Votre paiement est sécurisé par Stripe. La caution légale (de 200 à 400 CHF selon le gabarit de la remorque) fait l'objet d'une simple empreinte bancaire non débitée : aucun centime n'est prélevé de votre compte bancaire.",
                tip: "🔒 <strong>Zéro avance :</strong> L'empreinte bancaire Stripe est libérée automatiquement après restitution conforme de la remorque."
            },
            {
                number: 3,
                emoji: "📸",
                title: "3. État des lieux photo 4/4 géolocalisé au départ et au retour",
                description: "Au départ comme au retour de la location, prenez 4 photos guidées (avant, arrière, côté gauche, côté droit). Vos clichés sont certifiés avec coordonnées GPS et horodatage suisse infalsifiable pour vous protéger à 100% contre tout litige injustifié.",
                tip: "📄 <strong>Protection juridique :</strong> Votre contrat de bail suisse (CO art. 253) et votre rapport d'état des lieux (CO art. 257a) sont téléchargeables en PDF certifié à tout moment."
            }
        ]
    },
    owner: {
        title: "Guide Propriétaire",
        badge: "🚜 Je loue ma remorque (Propriétaire)",
        steps: [
            {
                number: 1,
                emoji: "📝",
                title: "1. Publication d'annonce en 2 minutes",
                description: "Déposez votre remorque en quelques clics : photos, dimensions utiles, PTAC, charge utile et tarif journalier. Notre système vous suggère un tarif optimisé en fonction du marché suisse local pour rentabiliser immédiatement votre équipement.",
                tip: "💡 <strong>Mise en ligne instantanée :</strong> Votre remorque apparaît dès publication auprès des locataires de votre région."
            },
            {
                number: 2,
                emoji: "🏦",
                title: "2. Liaison bancaire Stripe Connect pour les virements",
                description: "Renseignez votre IBAN suisse dans vos Paramètres grâce à notre intégration Stripe Connect certifiée. À chaque location réalisée, vos gains (80% net, ou 100% avec Renger PRO) sont transférés automatiquement sur votre compte bancaire sans aucune démarche manuelle.",
                tip: "⚡ <strong>Virements 100% automatisés :</strong> Stripe gère la conformité bancaire et effectue vos virements directement."
            },
            {
                number: 3,
                emoji: "👑",
                title: "3. Validation de l'état des lieux & 0% commission avec le mode PRO",
                description: "La validation de l'état des lieux photo de départ débloque la réservation et sécurise vos fonds. Pour maximiser vos revenus, passez au mode Renger PRO (39 CHF/mois) pour conserver 100% de vos gains (0% de commission) et débloquer le cockpit Renger Analytics PRO.",
                tip: "🚀 <strong>Rentabilité maximale :</strong> Avec Renger PRO, votre abonnement est amorti dès deux locations par mois !"
            }
        ]
    }
};

let onboardingState = {
    track: null,
    step: 0
};

function ensureOnboardingModalExists() {
    let modal = document.getElementById('onboarding-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'onboarding-modal';
        modal.className = 'hidden fixed inset-0 bg-stone-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto';
        modal.onclick = handleOnboardingBackdrop;
        modal.innerHTML = `
        <div class="bg-white dark:bg-stone-800 rounded-3xl shadow-2xl max-w-xl w-full p-6 sm:p-8 relative border border-stone-200 dark:border-stone-700 my-auto" onclick="event.stopPropagation()">
            <button id="onboarding-skip-btn" onclick="skipOnboarding()" class="absolute top-5 right-5 text-xs font-bold text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 bg-stone-100 hover:bg-stone-200 dark:bg-stone-700 dark:hover:bg-stone-600 px-3 py-1.5 rounded-full transition flex items-center gap-1.5 active:scale-95" aria-label="Passer le guide">
                <span>Passer le guide</span>
                <span class="text-sm">✕</span>
            </button>
            <div id="onboarding-content"></div>
            <div id="onboarding-footer" class="mt-8 pt-4 border-t border-stone-100 dark:border-stone-700 flex items-center justify-between gap-4">
                <button id="onboarding-prev-btn" onclick="prevOnboardingStep()" class="text-sm font-bold text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 px-4 py-2 rounded-xl transition hidden">
                    ← Précédent
                </button>
                <div id="onboarding-dots" class="flex items-center gap-2 mx-auto"></div>
                <button id="onboarding-next-btn" onclick="nextOnboardingStep()" class="bg-terracotta-500 hover:bg-terracotta-600 text-white text-sm font-bold px-6 py-2.5 rounded-xl transition shadow-md active:scale-95 hidden">
                    Suivant →
                </button>
            </div>
        </div>`;
        document.body.appendChild(modal);
    }
    return modal;
}

function renderOnboardingStep() {
    const content = document.getElementById('onboarding-content');
    const prevBtn = document.getElementById('onboarding-prev-btn');
    const nextBtn = document.getElementById('onboarding-next-btn');
    const dots = document.getElementById('onboarding-dots');
    if (!content) return;

    if (onboardingState.step === 0 || !onboardingState.track) {
        if (prevBtn) prevBtn.classList.add('hidden');
        if (nextBtn) nextBtn.classList.add('hidden');
        if (dots) dots.innerHTML = '';

        content.innerHTML = `
            <div class="text-center mb-6">
                <div class="w-16 h-16 rounded-2xl bg-terracotta-50 dark:bg-stone-700 text-terracotta-500 text-3xl flex items-center justify-center mx-auto mb-3 shadow-inner">
                    👋
                </div>
                <h3 class="text-2xl font-black text-stone-900 dark:text-white tracking-tight">Bienvenue sur Renger !</h3>
                <p class="text-stone-500 dark:text-stone-400 text-sm mt-1.5">Découvrez comment utiliser Renger pas-à-pas en moins d'une minute.</p>
                <p class="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mt-2">Choisissez votre profil pour commencer :</p>
            </div>

            <div class="space-y-3.5">
                <button type="button" id="onboarding-choice-renter" onclick="selectOnboardingTrack('renter')" class="w-full text-left p-5 rounded-2xl border-2 border-stone-200 dark:border-stone-700 hover:border-terracotta-500 dark:hover:border-terracotta-500 bg-stone-50/50 dark:bg-stone-900/50 hover:bg-terracotta-50/30 dark:hover:bg-terracotta-950/20 transition group">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-110 transition-transform shadow-xs">
                            🚗
                        </div>
                        <div class="flex-1">
                            <div class="flex items-center justify-between">
                                <h4 class="font-extrabold text-stone-900 dark:text-white group-hover:text-terracotta-500 transition-colors">🚗 Je cherche une remorque (Locataire)</h4>
                                <span class="text-terracotta-500 font-bold text-lg group-hover:translate-x-1 transition-transform">→</span>
                            </div>
                            <p class="text-xs text-stone-500 dark:text-stone-400 mt-1">Recherche par canton & permis (B vs BE), réservation avec caution non débitée et état des lieux photo 4/4 géolocalisé.</p>
                        </div>
                    </div>
                </button>

                <button type="button" id="onboarding-choice-owner" onclick="selectOnboardingTrack('owner')" class="w-full text-left p-5 rounded-2xl border-2 border-stone-200 dark:border-stone-700 hover:border-terracotta-500 dark:hover:border-terracotta-500 bg-stone-50/50 dark:bg-stone-900/50 hover:bg-terracotta-50/30 dark:hover:bg-terracotta-950/20 transition group">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-110 transition-transform shadow-xs">
                            🚜
                        </div>
                        <div class="flex-1">
                            <div class="flex items-center justify-between">
                                <h4 class="font-extrabold text-stone-900 dark:text-white group-hover:text-terracotta-500 transition-colors">🚜 Je loue ma remorque (Propriétaire)</h4>
                                <span class="text-terracotta-500 font-bold text-lg group-hover:translate-x-1 transition-transform">→</span>
                            </div>
                            <p class="text-xs text-stone-500 dark:text-stone-400 mt-1">Publication d'annonce en 2 min, liaison bancaire Stripe Connect pour les virements et 0% de commission avec le mode PRO.</p>
                        </div>
                    </div>
                </button>
            </div>
        `;
        return;
    }

    const trackData = ONBOARDING_TRACKS[onboardingState.track];
    if (!trackData) return;
    const currentStepIndex = onboardingState.step - 1;
    const stepInfo = trackData.steps[currentStepIndex];
    if (!stepInfo) return;

    if (prevBtn) {
        prevBtn.classList.remove('hidden');
        prevBtn.textContent = onboardingState.step === 1 ? '← Changer de profil' : '← Précédent';
    }
    if (nextBtn) {
        nextBtn.classList.remove('hidden');
        nextBtn.textContent = onboardingState.step === 3 ? 'Terminer et explorer 🎉' : 'Suivant →';
    }

    if (dots) {
        dots.innerHTML = trackData.steps.map((s, idx) => `
            <button onclick="goToOnboardingStep(${idx + 1})" class="h-2 rounded-full transition-all ${idx === currentStepIndex ? 'w-6 bg-terracotta-500' : 'w-2 bg-stone-200 dark:bg-stone-700 hover:bg-stone-400'}" aria-label="Étape ${idx + 1}"></button>
        `).join('');
    }

    const actionCtaHtml = onboardingState.step === 3 ? `
        <div class="pt-2">
            ${onboardingState.track === 'renter' ? `
                <a href="remorques.html" onclick="completeOnboarding()" class="flex items-center justify-center gap-2 w-full py-3 px-4 bg-terracotta-500 hover:bg-terracotta-600 text-white font-bold rounded-xl shadow-md transition text-sm active:scale-95">
                    <span>🔍 Trouver une remorque disponible</span>
                    <span>→</span>
                </a>
            ` : `
                <a href="louer-ma-remorque.html" onclick="completeOnboarding()" class="flex items-center justify-center gap-2 w-full py-3 px-4 bg-terracotta-500 hover:bg-terracotta-600 text-white font-bold rounded-xl shadow-md transition text-sm active:scale-95">
                    <span>➕ Publier une annonce en 2 min</span>
                    <span>→</span>
                </a>
            `}
        </div>
    ` : '';

    content.innerHTML = `
        <div class="mb-5">
            <div class="flex items-center justify-between mb-3">
                <span class="text-xs font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-300">
                    ${trackData.badge} • Étape ${onboardingState.step}/3
                </span>
                <button type="button" onclick="selectOnboardingTrack('${onboardingState.track === 'renter' ? 'owner' : 'renter'}')" class="text-xs text-terracotta-600 dark:text-terracotta-400 hover:underline font-bold transition">
                    Basculer côté ${onboardingState.track === 'renter' ? 'Propriétaire 🚜' : 'Locataire 🚗'}
                </button>
            </div>
            <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-2xl bg-terracotta-500/10 text-terracotta-500 text-2xl flex items-center justify-center flex-shrink-0 shadow-inner">
                    ${stepInfo.emoji}
                </div>
                <div>
                    <h3 class="text-xl font-black text-stone-900 dark:text-white">${stepInfo.title}</h3>
                </div>
            </div>
        </div>

        <div class="space-y-4">
            <p class="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">${stepInfo.description}</p>
            <div class="bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-700 rounded-2xl p-4 text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                ${stepInfo.tip}
            </div>
            ${actionCtaHtml}
        </div>
    `;
}

function selectOnboardingTrack(role) {
    if (role !== 'renter' && role !== 'owner') return;
    onboardingState.track = role;
    onboardingState.step = 1;
    renderOnboardingStep();
}

function nextOnboardingStep() {
    if (onboardingState.step === 0) return;
    if (onboardingState.step < 3) {
        onboardingState.step += 1;
        renderOnboardingStep();
    } else {
        completeOnboarding();
    }
}

function prevOnboardingStep() {
    if (onboardingState.step <= 1) {
        onboardingState.step = 0;
        onboardingState.track = null;
        renderOnboardingStep();
    } else {
        onboardingState.step -= 1;
        renderOnboardingStep();
    }
}

function goToOnboardingStep(stepNumber) {
    if (onboardingState.track && stepNumber >= 1 && stepNumber <= 3) {
        onboardingState.step = stepNumber;
        renderOnboardingStep();
    }
}

function openOnboardingModal(preferredTrack = null) {
    ensureOnboardingModalExists();
    const modal = document.getElementById('onboarding-modal');
    if (!modal) return;
    if (preferredTrack && (preferredTrack === 'renter' || preferredTrack === 'owner')) {
        onboardingState.track = preferredTrack;
        onboardingState.step = 1;
    } else {
        onboardingState.track = null;
        onboardingState.step = 0;
    }
    renderOnboardingStep();
    modal.classList.remove('hidden');
}

function closeOnboardingModal(markCompleted = false) {
    const modal = document.getElementById('onboarding-modal');
    if (modal) modal.classList.add('hidden');
    if (markCompleted) {
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('renger_onboarding_completed', 'true');
            }
        } catch (_) {}
    }
}

function skipOnboarding() {
    closeOnboardingModal(true);
    if (typeof showToast === 'function') {
        showToast("Guide ignoré. Vous pouvez le retrouver à tout moment dans vos Paramètres.", "info");
    }
}

function completeOnboarding() {
    closeOnboardingModal(true);
    if (typeof showToast === 'function') {
        showToast("Guide terminé ! Bonne route avec Renger.", "success");
    }
}

function handleOnboardingBackdrop(event) {
    if (event.target === document.getElementById('onboarding-modal')) {
        skipOnboarding();
    }
}

function checkAndTriggerOnboarding() {
    try {
        if (typeof window === 'undefined' || !window.localStorage) return;
        const completed = localStorage.getItem('renger_onboarding_completed');
        if (completed) return;

        const path = (window.location && window.location.pathname) || '';
        const search = (window.location && window.location.search) || '';
        if (path.includes('inspection.html') || search.includes('stripe=') || search.includes('code=') || search.includes('token=')) {
            return;
        }

        setTimeout(() => {
            if (!localStorage.getItem('renger_onboarding_completed')) {
                openOnboardingModal();
            }
        }, 700);
    } catch (_) {}
}

if (typeof window !== 'undefined') {
    window.openOnboardingModal = openOnboardingModal;
    window.closeOnboardingModal = closeOnboardingModal;
    window.skipOnboarding = skipOnboarding;
    window.completeOnboarding = completeOnboarding;
    window.selectOnboardingTrack = selectOnboardingTrack;
    window.nextOnboardingStep = nextOnboardingStep;
    window.prevOnboardingStep = prevOnboardingStep;
    window.goToOnboardingStep = goToOnboardingStep;
    window.handleOnboardingBackdrop = handleOnboardingBackdrop;
    window.checkAndTriggerOnboarding = checkAndTriggerOnboarding;
    window.ONBOARDING_TRACKS = ONBOARDING_TRACKS;
}
