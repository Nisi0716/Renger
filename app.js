// ==========================================
// 1. INITIALISATION
// ==========================================
const supabaseUrl = 'https://cwifrzajxrcpnqceyxnj.supabase.co';
const supabaseKey = 'sb_publishable_b8sieHW3SGLka8GSxRfr_w_eM3wtyYc';
const supabaseClient = window.supabase ? window.supabase.createClient(supabaseUrl, supabaseKey) : null;

let currentUser = null;
let currentTrailer = null; 
let bookingCalendar = null; 
let selectedStartDate = null;
let selectedEndDate = null;
let videoStream = null;

// ==========================================
// NOTIFICATIONS SYSTÈME (TOAST)
// ==========================================
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast-notification');
    const icon = document.getElementById('toast-icon');
    const text = document.getElementById('toast-message');

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
// 2. NAVIGATION SÉCURISÉE
// ==========================================
const pages = ['welcome-screen', 'buyer-page', 'seller-page', 'detail-page', 'inspection-page', 'profile-page', 'settings-page'];

function showPage(pageId) {
    const target = document.getElementById(pageId);
    
    // Le "système anti-crash" : Si la page n'existe pas, on arrête tout pour ne pas geler l'écran.
    if (!target) {
        console.error("Erreur de navigation : la page " + pageId + " n'existe pas dans le HTML.");
        return;
    }

    pages.forEach(p => {
        const el = document.getElementById(p);
        if (el) el.classList.add('hidden');
    });
    
    target.classList.remove('hidden');
    window.scrollTo(0, 0);
    
    if(pageId === 'inspection-page' && typeof startCamera === 'function') { 
        startCamera(); 
    }
}

function showWelcomeScreen() { showPage('welcome-screen'); }
function openAuthModal() { 
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.remove('hidden'); 
}
function closeAuthModal() { 
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.add('hidden'); 
}
function changeLanguage(lang) { localStorage.setItem('renger_lang', lang); }

// ==========================================
// 3. AUTHENTIFICATION & HEADER
// ==========================================
async function handleSignup() {
    if (!supabaseClient) return showToast("Erreur de serveur", "error");
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const { error } = await supabaseClient.auth.signUp({ email, password });
    if (error) showToast("Erreur : " + error.message, "error");
    else showToast("✅ Inscription réussie !", "success");
}

async function handleLogin() {
    if (!supabaseClient) return showToast("Erreur de serveur", "error");
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) showToast("Erreur : " + error.message, "error");
    else {
        closeAuthModal();
        checkUser();
        showToast("Content de vous revoir !", "success");
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
        container.innerHTML = `
            <div class="flex items-center gap-4">
                <button onclick="openProfile()" class="text-stone-600 dark:text-stone-300 font-bold hover:text-terracotta-500 transition hidden md:block">Mon Espace</button>
                <button onclick="openSettings()" class="text-stone-600 dark:text-stone-300 font-bold hover:text-terracotta-500 transition">Paramètres</button>
                <button onclick="handleLogout()" class="text-stone-400 text-sm hover:underline">Déconnexion</button>
            </div>`;
    } else {
        container.innerHTML = `<button onclick="openAuthModal()" class="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-200 font-semibold py-2 px-4 rounded-xl shadow-sm transition hover:text-terracotta-500">Se connecter</button>`;
    }
}

// ==========================================
// 4. CHARGEMENT DES ANNONCES 
// ==========================================
async function loadTrailers() {
    if (!supabaseClient) return;
    const grid = document.getElementById('trailers-grid');
    if (!grid) return;
    
    grid.innerHTML = `
        ${[1, 2, 3].map(() => `
        <div class="bg-white dark:bg-stone-800 rounded-3xl shadow-sm border border-stone-100 dark:border-stone-700 overflow-hidden animate-pulse">
            <div class="h-48 bg-stone-200 dark:bg-stone-700 w-full"></div>
            <div class="p-5">
                <div class="h-5 bg-stone-200 dark:bg-stone-700 rounded w-3/4 mb-3"></div>
                <div class="h-4 bg-stone-200 dark:bg-stone-700 rounded w-1/2 mb-5"></div>
                <div class="h-10 bg-stone-100 dark:bg-stone-700 rounded-xl w-full"></div>
            </div>
        </div>`).join('')}
    `;

    const { data: trailers, error } = await supabaseClient.from('trailers').select('*').order('id', { ascending: false });
    
    grid.innerHTML = ''; 
    
    if (error || !trailers || trailers.length === 0) {
        grid.innerHTML = '<p class="text-stone-500 text-center w-full col-span-full">Aucune remorque disponible pour le moment.</p>';
        return;
    }

    trailers.forEach(trailer => {
        const card = document.createElement('div');
        card.className = "bg-white dark:bg-stone-800 rounded-3xl shadow-sm border border-stone-100 dark:border-stone-700 overflow-hidden hover:shadow-lg transition cursor-pointer group";
        card.onclick = () => openTrailerDetail(trailer);
        
        const imgUrl = trailer.image_url || "https://images.unsplash.com/photo-1594054972175-39db43232140?q=80&w=600&auto=format&fit=crop";
        
        card.innerHTML = `
            <div class="h-48 bg-stone-200 dark:bg-stone-700 relative overflow-hidden">
                <img src="${imgUrl}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500">
                <div class="absolute top-3 right-3 bg-white/90 dark:bg-stone-900/90 backdrop-blur-sm px-3 py-1.5 rounded-xl text-sm font-bold text-stone-900 dark:text-white shadow-sm">
                    ${trailer.price} CHF<span class="text-xs font-normal text-stone-500 dark:text-stone-400">/j</span>
                </div>
                <div class="absolute top-3 left-3 bg-white/90 dark:bg-stone-900/90 backdrop-blur-sm px-2 py-1 rounded-lg shadow-sm">
                    <span class="text-xs font-bold text-stone-800 dark:text-white flex items-center gap-1">⭐ 4.9</span>
                </div>
            </div>
            <div class="p-5">
                <h4 class="font-bold text-lg mb-1 text-stone-800 dark:text-white truncate">${trailer.title}</h4>
                <p class="text-sm text-stone-500 dark:text-stone-400 mb-4 flex items-center gap-1">
                    📍 Lausanne <span class="bg-stone-100 dark:bg-stone-700 px-2 py-0.5 rounded text-xs ml-2">Pro</span>
                </p>
            </div>
        `;
        grid.appendChild(card);
    });
}

// ==========================================
// 5. RÉSERVATION & PAIEMENT STRIPE
// ==========================================
async function openTrailerDetail(trailer) {
    currentTrailer = trailer;
    document.getElementById('detail-title').innerText = trailer.title;
    document.getElementById('detail-price').innerText = trailer.price;
    document.getElementById('detail-socket').innerText = trailer.socket || "13 broches";
    document.getElementById('detail-payload').innerText = trailer.payload + " kg";
    document.getElementById('detail-img').src = trailer.image_url || "https://images.unsplash.com/photo-1594054972175-39db43232140?q=80&w=600&auto=format&fit=crop";
    
    document.getElementById('booking-summary').classList.add('hidden');
    document.getElementById('booking-dates').value = "";
    
    showPage('detail-page');

    if(!supabaseClient) return;

    const { data: bookings } = await supabaseClient
        .from('bookings')
        .select('start_date, end_date')
        .eq('trailer_id', trailer.id)
        .eq('status', 'paye');

    const disabledDates = bookings ? bookings.map(b => ({
        from: b.start_date,
        to: b.end_date
    })) : [];

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
                document.getElementById('total-price').innerText = total + " CHF";
                document.getElementById('booking-summary').classList.remove('hidden');
            } else {
                document.getElementById('booking-summary').classList.add('hidden');
            }
        }
    });
}

async function submitBooking() {
    if (!currentUser) {
        showToast("Veuillez vous connecter pour réserver.", "info");
        return openAuthModal();
    }
    if (!selectedStartDate || !selectedEndDate) return showToast("Sélectionnez vos dates d'abord", "error");

    showToast("Création du lien sécurisé Stripe...", "info");

    const diffDays = parseInt(document.getElementById('total-days').innerText);
    const totalPrice = diffDays * currentTrailer.price;

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
        total_price: totalPrice,
        status: 'en_attente'
    };

    const { data, error } = await supabaseClient.from('bookings').insert([newBooking]).select();
    if (error) return showToast("Erreur d'enregistrement", "error");

    localStorage.setItem('pending_booking_id', data[0].id);

    try {
        const response = await fetch('https://cwifrzajxrcpnqceyxnj.supabase.co/functions/v1/stripe-checkout', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + supabaseKey
            },
            body: JSON.stringify({
                trailerTitle: currentTrailer.title,
                basePrice: totalPrice,
                payload: parseInt(currentTrailer.payload),
                upsellsTotal: 0, 
                ownerStripeId: "acct_12345" 
            })
        });

        const stripeData = await response.json();
        
        if (stripeData.url) {
            window.location.href = stripeData.url; 
        } else {
            showToast("Erreur Stripe : " + (stripeData.error || stripeData.message), "error");
        }
    } catch (err) {
        showToast("Erreur réseau vers le serveur de paiement.", "error");
    }
}

async function checkPaymentStatus() {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const pendingBookingId = localStorage.getItem('pending_booking_id');

    if (paymentStatus === 'success' && pendingBookingId && supabaseClient) {
        await supabaseClient.from('bookings').update({ status: 'paye' }).eq('id', pendingBookingId);
        localStorage.removeItem('pending_booking_id'); 
        
        window.history.replaceState({}, document.title, window.location.pathname);
        showToast("Paiement réussi ! Votre réservation est confirmée.", "success");
        openProfile();

    } else if (paymentStatus === 'cancel') {
        localStorage.removeItem('pending_booking_id');
        window.history.replaceState({}, document.title, window.location.pathname);
        showToast("Le paiement a été annulé.", "error");
    }
}

// ==========================================
// 6. MODULE CAMÉRA
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
function takePhoto() { showToast("Photo enregistrée !", "success"); stopCamera(); showPage('detail-page'); }

// ==========================================
// 7. PROFIL ET TABLEAU DE BORD
// ==========================================
async function openProfile() {
    if (!currentUser) {
        showToast("Connectez-vous pour voir vos réservations", "info");
        return openAuthModal();
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
    if (!currentUser || !supabaseClient) return;
    const today = new Date();

    const { data: myBookings } = await supabaseClient.from('bookings').select('*, trailers(*)').eq('renter_id', currentUser.id).eq('status', 'paye');
    const { data: myTrailers } = await supabaseClient.from('trailers').select('*').eq('owner_id', currentUser.id);
    const { data: sellerBookings } = await supabaseClient.from('bookings').select('*').eq('owner_id', currentUser.id).eq('status', 'paye');

    const buyerList = document.getElementById('buyer-bookings-list');
    if(buyerList) {
        buyerList.innerHTML = '';
        if (myBookings && myBookings.length > 0) {
            myBookings.forEach(booking => {
                const startDate = new Date(booking.start_date);
                const endDate = new Date(booking.end_date);
                
                let statusHtml = '';
                if (today >= startDate && today <= endDate) {
                    statusHtml = '<span class="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-md">🔴 En cours</span>';
                } else if (today < startDate) {
                    statusHtml = '<span class="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-md">⏳ À venir</span>';
                } else {
                    statusHtml = '<span class="bg-stone-100 text-stone-500 text-xs font-bold px-2 py-1 rounded-md">Terminé</span>';
                }

                buyerList.innerHTML += `
                    <div class="bg-white border border-stone-200 p-5 rounded-2xl shadow-sm flex items-center gap-4">
                        <img src="${booking.trailers?.image_url || 'https://images.unsplash.com/photo-1594054972175-39db43232140?q=80&w=600&auto=format&fit=crop'}" class="w-20 h-20 object-cover rounded-xl bg-stone-100">
                        <div class="flex-1">
                            <div class="flex justify-between items-start mb-1">
                                <h4 class="font-bold text-stone-800">${booking.trailers?.title || 'Remorque Renger'}</h4>
                                ${statusHtml}
                            </div>
                            <p class="text-sm text-stone-500">Du ${startDate.toLocaleDateString('fr-CH')} au ${endDate.toLocaleDateString('fr-CH')}</p>
                            <p class="text-terracotta-600 font-bold mt-2">${booking.total_price} CHF réglés</p>
                        </div>
                    </div>
                `;
            });
        } else {
            buyerList.innerHTML = `<p class="text-stone-400 italic">Vous n'avez aucune réservation en cours.</p>`;
        }
    }
}

// ==========================================
// 8. PARAMÈTRES DU COMPTE (NOUVEAU)
// ==========================================
function openSettings() {
    // Sécurité: Rediriger si on essaie d'ouvrir les paramètres sans être connecté
    if (!currentUser) {
        showToast("Veuillez vous connecter pour accéder aux paramètres", "info");
        return openAuthModal();
    }
    
    document.getElementById('settings-email').innerText = currentUser.email;
    showPage('settings-page');
}

async function setupStripePayouts() {
    if (!currentUser) return;
    
    showToast("Création de votre espace sécurisé...", "info");

    try {
        const response = await fetch('https://cwifrzajxrcpnqceyxnj.supabase.co/functions/v1/stripe-onboarding', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + supabaseKey
            },
            body: JSON.stringify({ email: currentUser.email })
        });
        
        const data = await response.json();
        
        if (data.url) {
            window.location.href = data.url; 
        } else {
            console.error("Erreur détaillée du serveur :", data);
            showToast("Erreur Stripe : " + (data.error || data.message || "Erreur inconnue"), "error");
        }
    } catch (err) {
        console.error("Erreur réseau :", err);
        showToast("Impossible de joindre le serveur", "error");
    }
}

async function deleteAccount() {
    if (!currentUser) return;
    const confirmDelete = confirm("⚠️ ATTENTION : Voulez-vous vraiment supprimer définitivement votre compte et toutes vos annonces ? Cette action est irréversible.");
    if (!confirmDelete) return;

    showToast("Suppression en cours...", "info");
    
    try {
        const response = await fetch('https://cwifrzajxrcpnqceyxnj.supabase.co/functions/v1/delete-account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.id })
        });
        const data = await response.json();
        if (data.success) {
            showToast("Compte supprimé. À bientôt !", "success");
            handleLogout();
        } else {
            showToast("Erreur de suppression : " + data.error, "error");
        }
    } catch (err) {
        showToast("Erreur de connexion au serveur.", "error");
    }
}

// ==========================================
// 9. DÉMARRAGE DU SITE
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    checkUser();
    loadTrailers();
    checkPaymentStatus(); 
});

// ==========================================
// GESTION DU MODE SOMBRE
// ==========================================
function toggleTheme() {
    const html = document.documentElement;
    html.classList.toggle('dark');
    const isDark = html.classList.contains('dark');
    
    localStorage.setItem('renger_theme', isDark ? 'dark' : 'light');
    document.getElementById('theme-icon').innerHTML = isDark 
        ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>' 
        : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>';
}

function initTheme() {
    const savedTheme = localStorage.getItem('renger_theme');
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
        const icon = document.getElementById('theme-icon');
        if (icon) icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>';
    }
}