// ==========================================
// 1. INITIALISATION & TRADUCTIONS
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

const translations = {
    fr: {
        login: "Se connecter", subtitle: "Le Airbnb de la remorque. Trouvez la remorque parfaite ou rentabilisez la vôtre.",
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
        login: "Log in", subtitle: "The Airbnb for trailers. Find the perfect trailer or rent yours out.",
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
        login: "Anmelden", subtitle: "Das Airbnb für Anhänger. Finden Sie den perfekten Anhänger oder vermieten Sie Ihren.",
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
const pages = ['welcome-screen', 'buyer-page', 'seller-page', 'detail-page', 'inspection-page', 'profile-page', 'settings-page'];

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
function toggleTheme() {
    document.documentElement.classList.toggle('dark');
}

// ==========================================
// 3. AUTHENTIFICATION & HEADER
// ==========================================
async function handleSignup() {
    if (!supabaseClient) return showToast("Erreur: Supabase non chargé.", "error");
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const { error } = await supabaseClient.auth.signUp({ email, password });
    if (error) showToast("Erreur d'inscription : " + error.message, "error");
    else showToast("Inscription réussie !", "success");
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
        card.className = "bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 overflow-hidden hover:shadow-md cursor-pointer transition";
        card.onclick = () => openTrailerDetail(trailer);
        
        const imgUrl = trailer.image_url || "https://placehold.co/600x400/f5f5f4/a8a29e?text=Renger";
        
        card.innerHTML = `
            <div class="h-48 bg-stone-200 dark:bg-stone-700 relative">
                <img src="${imgUrl}" class="w-full h-full object-cover">
                <div class="absolute top-3 right-3 bg-white dark:bg-stone-900 px-2 py-1 rounded-lg text-sm font-bold shadow dark:text-white">${trailer.price} CHF<span class="text-xs font-normal">/j</span></div>
            </div>
            <div class="p-5">
                <h4 class="font-bold text-lg mb-1 dark:text-white">${trailer.title}</h4>
                <p class="text-sm text-stone-500 dark:text-stone-400 mb-4">📍 Vaud</p>
                <button class="w-full bg-terracotta-50 dark:bg-stone-700 text-terracotta-600 dark:text-terracotta-400 font-semibold py-2.5 rounded-xl">Voir les détails</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

function previewImage(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const container = document.getElementById('photo-preview-container');
            if(container) {
                container.innerHTML = `<img src="${e.target.result}" class="w-full h-full object-cover rounded-3xl absolute inset-0">`;
            }
        }
        reader.readAsDataURL(file);
    }
}

async function handlePublish(event) {
    event.preventDefault();
    if (!currentUser) {
        showToast("Vous devez être connecté pour publier.", "error");
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
        if (uploadError) return showToast("Erreur photo : " + uploadError.message, "error");
        
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
    if (error) showToast("Erreur BDD : " + error.message, "error");
    else {
        showToast("Annonce sauvegardée !", "success");
        document.getElementById('add-trailer-form').reset();
        document.getElementById('photo-preview-container').innerHTML = `<span class="text-5xl mb-4">📸</span><span class="font-bold text-stone-700 dark:text-stone-300">Cliquez pour ajouter une photo</span>`;
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
    if (!currentUser) return showToast("Vous devez être connecté pour réserver.", "error");
    if (!selectedStartDate || !selectedEndDate) return showToast("Veuillez sélectionner vos dates sur le calendrier.", "error");

    showToast("Création du lien de paiement sécurisé via Stripe...", "info");

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
    if (error) return showToast("Erreur d'enregistrement : " + error.message, "error");

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
                ownerStripeId: "acct_12345", 
                customerEmail: currentUser.email
            })
        });

        const stripeData = await response.json();
        
        if (stripeData.url) {
            window.location.href = stripeData.url; 
        } else {
            showToast("Erreur Stripe : " + (stripeData.error || stripeData.message), "error");
        }
    } catch (err) {
        showToast("Erreur de connexion au serveur de paiement.", "error");
    }
}

async function checkPaymentStatus() {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const pendingBookingId = localStorage.getItem('pending_booking_id');

    if (paymentStatus === 'success' && pendingBookingId) {
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
function takePhoto() { showToast("Photo enregistrée !", "success"); stopCamera(); showPage('detail-page'); }

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
                    statusHtml = '<span class="bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-300 text-xs font-bold px-2 py-1 rounded-md">Terminé</span>';
                }

                buyerList.innerHTML += `
                    <div class="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 p-5 rounded-2xl shadow-sm flex items-center gap-4">
                        <img src="${booking.trailers.image_url || 'https://images.unsplash.com/photo-1594054972175-39db43232140?q=80&w=600&auto=format&fit=crop'}" class="w-20 h-20 object-cover rounded-xl bg-stone-100 dark:bg-stone-700">
                        <div class="flex-1">
                            <div class="flex justify-between items-start mb-1">
                                <h4 class="font-bold text-stone-800 dark:text-white">${booking.trailers.title}</h4>
                                ${statusHtml}
                            </div>
                            <p class="text-sm text-stone-500 dark:text-stone-400">Du ${startDate.toLocaleDateString('fr-CH')} au ${endDate.toLocaleDateString('fr-CH')}</p>
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
                    <div class="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl overflow-hidden shadow-sm relative">
                        ${statusBadge}
                        <div class="h-32 bg-stone-200 dark:bg-stone-700">
                            <img src="${trailer.image_url || 'https://images.unsplash.com/photo-1594054972175-39db43232140?q=80&w=600&auto=format&fit=crop'}" class="w-full h-full object-cover">
                        </div>
                        <div class="p-4">
                            <h4 class="font-bold text-lg mb-1 dark:text-white">${trailer.title}</h4>
                            <p class="text-stone-500 dark:text-stone-400 text-sm mb-3">Génère ${trailer.price} CHF / jour</p>
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
// 8. PARAMÈTRES DU COMPTE
// ==========================================
function openSettings() {
    if (!currentUser) return;
    document.getElementById('settings-email').innerText = currentUser.email;
    showPage('settings-page');
}

async function setupStripePayouts() {
    if (!currentUser) return;
    showToast("Génération du lien sécurisé Stripe...", "info");
    
    try {
        const response = await fetch('https://cwifrzajxrcpnqceyxnj.supabase.co/functions/v1/stripe-onboarding', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: currentUser.email })
        });
        const data = await response.json();
        if (data.url) window.location.href = data.url; 
        else showToast("Erreur Stripe : " + data.error, "error");
    } catch (err) {
        showToast("Erreur de connexion au serveur.", "error");
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
            alert("Compte supprimé avec succès. À bientôt !");
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
});