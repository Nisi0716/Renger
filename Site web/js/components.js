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
            'public-profile-page': 'profil.html?p=public-profile-page'
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
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    let pageId = 'welcome-screen';
    if (path.includes('remorques.html') || path.includes('remorque.html')) pageId = 'buyer-page';
    else if (path.includes('louer-ma-remorque.html')) pageId = 'seller-page';
    else if (path.includes('profil.html')) {
        pageId = window.location.search.includes('settings') ? 'settings-page' : 'profile-page';
    }
    if (typeof updateMobileNavState === 'function') {
        updateMobileNavState(pageId);
    }
});
