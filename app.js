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
// 2. NAVIGATION
// ==========================================
const pages = ['welcome-screen', 'buyer-page', 'seller-page', 'detail-page', 'inspection-page', 'profile-page'];

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
}
function closeAuthModal() { 
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.add('hidden'); 
}
function changeLanguage(lang) { localStorage.setItem('renger_lang', lang); }

// ==========================================
// 3. AUTHENTIFICATION
// ==========================================
async function handleSignup() {
    if (!supabaseClient) return alert("Erreur: Supabase non chargé.");
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const { error } = await supabaseClient.auth.signUp({ email, password });
    if (error) alert("Erreur d'inscription : " + error.message);
    else alert("✅ Inscription réussie !");
}

async function handleLogin() {
    if (!supabaseClient) return alert("Erreur: Supabase non chargé.");
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) alert("Erreur de connexion : " + error.message);
    else {
        closeAuthModal();
        checkUser();
    }
}

async function handleLogout() {
    if (!supabaseClient) return;
    await supabaseClient.auth.signOut();
    checkUser();
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
                <button onclick="openProfile()" class="text-stone-600 font-bold hover:text-terracotta-500 transition">Mon Espace</button>
                <button onclick="handleLogout()" class="text-stone-400 text-sm hover:underline">Déconnexion</button>
            </div>`;
    } else {
        container.innerHTML = `<button onclick="openAuthModal()" class="bg-white border border-stone-200 text-stone-600 font-semibold py-2 px-4 rounded-xl">Se connecter</button>`;
    }
}

// ==========================================
// 4. ANNONCES (AFFICHAGE ET CRÉATION)
// ==========================================
async function loadTrailers() {
    if (!supabaseClient) return;
    const { data: trailers, error } = await supabaseClient.from('trailers').select('*').order('id', { ascending: false });
    if (error) return;

    const grid = document.getElementById('trailers-grid');
    if (!grid) return;
    grid.innerHTML = ''; 
    
    if (!trailers || trailers.length === 0) return;

    trailers.forEach(trailer => {
        const card = document.createElement('div');
        card.className = "bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden hover:shadow-md cursor-pointer";
        card.onclick = () => openTrailerDetail(trailer);
        
        const imgUrl = trailer.image_url || "https://placehold.co/600x400/f5f5f4/a8a29e?text=Renger";
        
        card.innerHTML = `
            <div class="h-48 bg-stone-200 relative">
                <img src="${imgUrl}" class="w-full h-full object-cover">
                <div class="absolute top-3 right-3 bg-white px-2 py-1 rounded-lg text-sm font-bold shadow">${trailer.price} CHF<span class="text-xs font-normal">/j</span></div>
            </div>
            <div class="p-5">
                <h4 class="font-bold text-lg mb-1">${trailer.title}</h4>
                <p class="text-sm text-stone-500 mb-4">📍 Vaud</p>
                <button class="w-full bg-terracotta-50 text-terracotta-600 font-semibold py-2.5 rounded-xl">Voir les détails</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

async function handlePublish(event) {
    event.preventDefault();
    if (!currentUser) {
        alert("⚠️ Vous devez être connecté pour publier.");
        openAuthModal();
        return;
    }

    const fileInput = document.getElementById('file-upload');
    const file = fileInput ? fileInput.files[0] : null;
    let finalImageUrl = "https://placehold.co/600x400/f5f5f4/a8a29e?text=Renger";

    if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabaseClient.storage.from('trailers-images').upload(fileName, file);
        if (uploadError) return alert("Erreur photo : " + uploadError.message);
        
        const { data: publicUrlData } = supabaseClient.storage.from('trailers-images').getPublicUrl(fileName);
        finalImageUrl = publicUrlData.publicUrl;
    }
    
    const newTrailer = {
        title: document.getElementById('ad-title').value,
        price: parseInt(document.getElementById('ad-price').value),
        payload: parseInt(document.getElementById('ad-payload').value),
        socket: document.querySelector('input[name="prise"]:checked').value,
        owner_id: currentUser.id,
        image_url: finalImageUrl
    };
    
    const { error } = await supabaseClient.from('trailers').insert([newTrailer]);
    if (error) alert("Erreur BDD : " + error.message);
    else {
        alert("✅ Annonce sauvegardée !");
        document.getElementById('add-trailer-form').reset();
        showPage('buyer-page');
        loadTrailers();
    }
}

// ==========================================
// 5. RÉSERVATION & PAIEMENT STRIPE
// ==========================================
async function openTrailerDetail(trailer) {
    currentTrailer = trailer;
    document.getElementById('detail-title').innerText = trailer.title;
    document.getElementById('detail-price').innerText = trailer.price;
    document.getElementById('detail-socket').innerText = trailer.socket;
    document.getElementById('detail-payload').innerText = trailer.payload + " kg";
    document.getElementById('detail-img').src = trailer.image_url || "https://images.unsplash.com/photo-1594054972175-39db43232140?q=80&w=600&auto=format&fit=crop";
    
    document.getElementById('booking-summary').classList.add('hidden');
    document.getElementById('booking-dates').value = "";
    
    showPage('detail-page');

    const { data: bookings } = await supabaseClient.from('bookings').select('start_date, end_date').eq('trailer_id', trailer.id);

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
    if (!currentUser) return alert("⚠️ Vous devez être connecté pour réserver.");
    if (!selectedStartDate || !selectedEndDate) return alert("Veuillez sélectionner vos dates sur le calendrier.");

    alert("Création du lien de paiement sécurisé via Stripe...");

    const diffDays = parseInt(document.getElementById('total-days').innerText);
    const totalPrice = diffDays * currentTrailer.price;

    const newBooking = {
        trailer_id: currentTrailer.id,
        renter_id: currentUser.id,
        owner_id: currentTrailer.owner_id,
        start_date: selectedStartDate.toISOString().split('T')[0],
        end_date: selectedEndDate.toISOString().split('T')[0],
        total_price: totalPrice,
        status: 'en_attente'
    };

    const { data, error } = await supabaseClient.from('bookings').insert([newBooking]).select();
    if (error) return alert("Erreur d'enregistrement : " + error.message);

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
            alert("Erreur Stripe : " + (stripeData.error || stripeData.message));
        }
    } catch (err) {
        alert("Erreur de connexion au serveur de paiement.");
    }
}

async function checkPaymentStatus() {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const pendingBookingId = localStorage.getItem('pending_booking_id');

    if (paymentStatus === 'success' && pendingBookingId) {
        await supabaseClient.from('bookings').update({ status: 'paye' }).eq('id', pendingBookingId);
        localStorage.removeItem('pending_booking_id'); 
        alert("🎉 Paiement réussi ! La réservation est maintenant confirmée sur votre Profil.");
        window.history.replaceState({}, document.title, window.location.pathname);
    } else if (paymentStatus === 'cancel') {
        alert("⚠️ Le paiement a été annulé.");
        localStorage.removeItem('pending_booking_id');
        window.history.replaceState({}, document.title, window.location.pathname);
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
    } catch (err) { alert("Erreur caméra."); showPage('detail-page'); }
}

function stopCamera() { 
    if (videoStream) { videoStream.getTracks().forEach(track => track.stop()); videoStream = null; } 
}
function takePhoto() { alert("Photo enregistrée !"); stopCamera(); showPage('detail-page'); }

// ==========================================
// 7. PROFIL ET TABLEAU DE BORD
// ==========================================
async function openProfile() {
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
        sellerTab.className = "text-stone-400 font-bold hover:text-stone-700 pb-3 text-lg transition";
    } else {
        buyerSection.classList.add('hidden');
        sellerSection.classList.remove('hidden');
        sellerTab.className = "text-terracotta-600 font-bold border-b-2 border-terracotta-600 pb-3 text-lg transition";
        buyerTab.className = "text-stone-400 font-bold hover:text-stone-700 pb-3 text-lg transition";
    }
}

async function loadProfileData() {
    if (!currentUser) return;
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
                        <img src="${booking.trailers.image_url || 'https://images.unsplash.com/photo-1594054972175-39db43232140?q=80&w=600&auto=format&fit=crop'}" class="w-20 h-20 object-cover rounded-xl bg-stone-100">
                        <div class="flex-1">
                            <div class="flex justify-between items-start mb-1">
                                <h4 class="font-bold text-stone-800">${booking.trailers.title}</h4>
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
    if(revenueElement) revenueElement.innerText = monthlyRevenue.toFixed(2) + " CHF";

    const sellerList = document.getElementById('seller-trailers-list');
    if(sellerList) {
        sellerList.innerHTML = '';
        if (myTrailers && myTrailers.length > 0) {
            myTrailers.forEach(trailer => {
                let isRentedNow = false;
                if (sellerBookings) {
                    isRentedNow = sellerBookings.some(b => b.trailer_id === trailer.id && today >= new Date(b.start_date) && today <= new Date(b.end_date));
                }

                const statusBadge = isRentedNow 
                    ? '<span class="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-lg shadow-sm animate-pulse">En location actuelle</span>' 
                    : '<span class="absolute top-3 left-3 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-lg shadow-sm">Disponible</span>';

                sellerList.innerHTML += `
                    <div class="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm relative">
                        ${statusBadge}
                        <div class="h-32 bg-stone-200">
                            <img src="${trailer.image_url || 'https://images.unsplash.com/photo-1594054972175-39db43232140?q=80&w=600&auto=format&fit=crop'}" class="w-full h-full object-cover">
                        </div>
                        <div class="p-4">
                            <h4 class="font-bold text-lg mb-1">${trailer.title}</h4>
                            <p class="text-stone-500 text-sm mb-3">Génère ${trailer.price} CHF / jour</p>
                        </div>
                    </div>
                `;
            });
        } else {
            sellerList.innerHTML = `<p class="text-stone-400 italic">Vous n'avez pas encore publié de remorque.</p>`;
        }
    }
}

// ==========================================
// 8. DÉMARRAGE DU SITE
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    checkUser();
    loadTrailers();
    checkPaymentStatus(); 
});