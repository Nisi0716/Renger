// --- 1. INITIALISATION DE SUPABASE ---
const supabaseUrl = 'https://cwifrzajxrcpnqceyxnj.supabase.co';
const supabaseKey = 'sb_publishable_b8sieHW3SGLka8GSxRfr_w_eM3wtyYc';
// CORRECTION ICI : On utilise bien supabaseClient !
const supabaseClient = window.supabase ? window.supabase.createClient(supabaseUrl, supabaseKey) : null;

let currentUser = null;

// --- 2. NAVIGATION ENTRE LES PAGES ---
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

// --- 3. AUTHENTIFICATION ---
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
        // L'utilisateur est connecté, on affiche "Mon Espace" et "Déconnexion"
        container.innerHTML = `
            <div class="flex items-center gap-4">
                <button onclick="openProfile()" class="text-stone-600 font-bold hover:text-terracotta-500 transition">Mon Espace</button>
                <button onclick="handleLogout()" class="text-stone-400 text-sm hover:underline">Déconnexion</button>
            </div>`;
    } else {
        container.innerHTML = `<button onclick="openAuthModal()" class="bg-white border border-stone-200 text-stone-600 font-semibold py-2 px-4 rounded-xl">Se connecter</button>`;
    }
}

// --- 4. CHARGEMENT DES ANNONCES ---
// --- 4. CHARGEMENT DES ANNONCES ---
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
        
        // C'est ICI que la magie opère : On prend ta vraie photo, ou un fond gris Renger par défaut
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

    // 1. Récupération de la photo
    const fileInput = document.getElementById('file-upload');
    const file = fileInput ? fileInput.files[0] : null;
    
    // Image propre par défaut si l'utilisateur ne met pas de photo
    let finalImageUrl = "https://placehold.co/600x400/f5f5f4/a8a29e?text=Renger";

    if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        
        // 2. Upload sur ton disque dur Supabase (Storage)
        const { error: uploadError } = await supabaseClient.storage
            .from('trailers-images')
            .upload(fileName, file);
            
        if (uploadError) {
            alert("Erreur d'envoi de la photo : " + uploadError.message);
            return;
        }
        
        // 3. Récupération du lien public de l'image
        const { data: publicUrlData } = supabaseClient.storage
            .from('trailers-images')
            .getPublicUrl(fileName);
            
        finalImageUrl = publicUrlData.publicUrl;
    }
    
    // 4. Création de l'annonce complète (avec photo ET owner_id)
    const newTrailer = {
        title: document.getElementById('ad-title').value,
        price: parseInt(document.getElementById('ad-price').value),
        payload: parseInt(document.getElementById('ad-payload').value),
        socket: document.querySelector('input[name="prise"]:checked').value,
        owner_id: currentUser.id,
        image_url: finalImageUrl
    };
    
    // 5. Envoi dans la base de données
    const { error } = await supabaseClient.from('trailers').insert([newTrailer]);
    
    if (error) {
        alert("Erreur base de données : " + error.message);
    } else {
        alert("✅ Annonce sauvegardée avec sa photo !");
        document.getElementById('add-trailer-form').reset();
        
        // Remise à zéro de la case photo visuelle
        const previewContainer = document.getElementById('photo-preview-container');
        if (previewContainer) {
            previewContainer.innerHTML = `<span class="text-5xl mb-4">📸</span><span class="font-bold text-stone-700">Cliquez pour ajouter une photo</span>`;
        }
        
        showPage('buyer-page');
        loadTrailers();
    }
}

async function simulateStripeCheckout() {
    if (!currentTrailer) return alert("Veuillez sélectionner une remorque.");
    
    alert("Création du lien de paiement sécurisé via Stripe...");

    try {
        const diffDays = parseInt(document.getElementById('total-days').innerText);
        const totalPrice = diffDays * currentTrailer.price;

        const response = await fetch('https://cwifrzajxrcpnqceyxnj.supabase.co/functions/v1/stripe-checkout', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                // LE BADGE DE SÉCURITÉ OBLIGATOIRE EST ICI :
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

        const data = await response.json();
        
        if (data.url) {
            window.location.href = data.url; 
        } else {
            const errorMsg = data.error || data.message || JSON.stringify(data);
            alert("Erreur Serveur : " + errorMsg);
        }
    } catch (err) {
        alert("Erreur de connexion au serveur : " + err.message);
    }
}

let videoStream = null;
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
function changeLanguage(lang) { localStorage.setItem('renger_lang', lang); }

// --- GESTION DU RETOUR STRIPE ---
function checkPaymentStatus() {
    // On analyse l'URL de la page
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');

    if (paymentStatus === 'success') {
        alert("🎉 Paiement réussi ! L'empreinte bancaire pour la caution est validée et votre réservation est confirmée.");
        // On nettoie l'URL pour ne pas réafficher l'alerte si l'utilisateur rafraîchit la page
        window.history.replaceState({}, document.title, window.location.pathname);
    } else if (paymentStatus === 'cancel') {
        alert("⚠️ Le paiement a été annulé. Aucune somme n'a été bloquée.");
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// --- 5. INITIALISATION ---
document.addEventListener("DOMContentLoaded", () => {
    checkUser();
    loadTrailers();
    checkPaymentStatus(); // <-- La nouvelle ligne magique est ici !
});

// --- 6. SYSTÈME DE RÉSERVATION & CALENDRIER ---
let currentTrailer = null; // Pour mémoriser la remorque qu'on regarde
let bookingCalendar = null; // L'outil calendrier
let selectedStartDate = null;
let selectedEndDate = null;

// On met à jour la fonction d'ouverture pour charger le calendrier
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

    // 1. On va chercher les dates déjà réservées pour cette remorque dans Supabase
    const { data: bookings, error } = await supabaseClient
        .from('bookings')
        .select('start_date, end_date')
        .eq('trailer_id', trailer.id);

    // 2. On formate ces dates pour bloquer le calendrier
    const disabledDates = bookings ? bookings.map(b => ({
        from: b.start_date,
        to: b.end_date
    })) : [];

    // 3. On initialise le calendrier Flatpickr
    if (bookingCalendar) bookingCalendar.destroy(); // On nettoie l'ancien si besoin
    
    bookingCalendar = flatpickr("#booking-dates", {
        mode: "range",
        minDate: "today",
        locale: "fr",
        disable: disabledDates, // Les dates grises !
        onChange: function(selectedDates, dateStr, instance) {
            // Quand l'utilisateur a cliqué sur 2 dates (début et fin)
            if (selectedDates.length === 2) {
                selectedStartDate = selectedDates[0];
                selectedEndDate = selectedDates[1];
                
                // Calcul du nombre de jours (inclusif)
                const diffTime = Math.abs(selectedEndDate - selectedStartDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
                
                // Calcul du prix
                const total = diffDays * currentTrailer.price;
                
                // Mise à jour de l'affichage (Le Devis)
                document.getElementById('total-days').innerText = diffDays;
                document.getElementById('total-price').innerText = total + " CHF";
                document.getElementById('booking-summary').classList.remove('hidden');
            } else {
                document.getElementById('booking-summary').classList.add('hidden');
            }
        }
    });
}

// Fonction pour envoyer la réservation à Supabase
async function submitBooking() {
    if (!currentUser) {
        alert("⚠️ Vous devez être connecté pour réserver.");
        openAuthModal();
        return;
    }
    if (!selectedStartDate || !selectedEndDate) {
        alert("Veuillez sélectionner vos dates sur le calendrier.");
        return;
    }

    const diffDays = parseInt(document.getElementById('total-days').innerText);
    const totalPrice = diffDays * currentTrailer.price;

    const newBooking = {
        trailer_id: currentTrailer.id,
        renter_id: currentUser.id,
        owner_id: currentTrailer.owner_id,
        start_date: selectedStartDate.toISOString().split('T')[0], // Format date SQL
        end_date: selectedEndDate.toISOString().split('T')[0],
        total_price: totalPrice
    };

    const { error } = await supabaseClient.from('bookings').insert([newBooking]);

    if (error) {
        alert("Erreur lors de la réservation : " + error.message);
    } else {
        alert("✅ Réservation bloquée avec succès ! Redirection vers le paiement de la caution...");
        simulateStripeCheckout(); 
        showWelcomeScreen();
    }
}
// --- 7. TABLEAU DE BORD (ESPACE RENGER) ---

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

    // --- CHARGEMENT CÔTÉ CLIENT (Locations) ---
    // On récupère les réservations du locataire ET les infos de la remorque liée
    const { data: myBookings } = await supabaseClient.from('bookings').select('*, trailers(*)').eq('renter_id', currentUser.id);
    const buyerList = document.getElementById('buyer-bookings-list');
    buyerList.innerHTML = '';

    if (myBookings && myBookings.length > 0) {
        myBookings.forEach(booking => {
            const startDate = new Date(booking.start_date);
            const endDate = new Date(booking.end_date);
            
            // Déterminer le statut
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
                    <img src="${booking.trailers.image_url}" class="w-20 h-20 object-cover rounded-xl bg-stone-100">
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

    // --- CHARGEMENT CÔTÉ PROPRIÉTAIRE (Parc et Revenus) ---
    const { data: myTrailers } = await supabaseClient.from('trailers').select('*').eq('owner_id', currentUser.id);
    const { data: sellerBookings } = await supabaseClient.from('bookings').select('*').eq('owner_id', currentUser.id);
    
    // 1. Calcul des revenus du mois en cours (Part propriétaire 80%)
    let monthlyRevenue = 0;
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    if (sellerBookings) {
        sellerBookings.forEach(booking => {
            const bDate = new Date(booking.start_date);
            if (bDate.getMonth() === currentMonth && bDate.getFullYear() === currentYear) {
                // Renger garde 20%, le propriétaire touche 80%
                monthlyRevenue += (booking.total_price * 0.80);
            }
        });
    }
    document.getElementById('seller-monthly-revenue').innerText = monthlyRevenue.toFixed(2) + " CHF";

    // 2. Affichage des remorques et de leur statut
    const sellerList = document.getElementById('seller-trailers-list');
    sellerList.innerHTML = '';

    if (myTrailers && myTrailers.length > 0) {
        myTrailers.forEach(trailer => {
            // Chercher si la remorque est actuellement louée aujourd'hui
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
                        <img src="${trailer.image_url}" class="w-full h-full object-cover">
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