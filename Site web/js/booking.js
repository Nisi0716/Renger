// ==========================================
// 5. RÉSERVATION, BLOCAGE DATES & PAIEMENT
// ==========================================
async function openTrailerDetail(trailer) {
    if (trailer && typeof logClick === 'function') logClick(trailer.id);
    // MPA : hors de la fiche détail, on navigue vers remorque.html?id=... (la page recharge l'annonce)
    if (!document.getElementById('detail-page')) {
        if (trailer && trailer.id) window.location.href = 'remorque.html?id=' + encodeURIComponent(trailer.id);
        return;
    }
    currentTrailer = trailer;
    
    // Increment views_count asynchronously using RPC to bypass RLS for non-owners
    if (trailer && trailer.id) {
        supabaseClient.rpc('increment_views', { trailer_id: trailer.id })
            .then(() => {})
            .catch(e => console.error('Error incrementing views:', e));
    }

    // Reset des dates à chaque ouverture pour repartir d'un état propre
    selectedStartDate = null;
    selectedEndDate = null;
    document.getElementById('detail-title').innerText = trailer.title;
    document.getElementById('detail-price').innerText = trailer.price;
    document.getElementById('detail-socket').innerText = trailer.socket;
    document.getElementById('detail-payload').innerText = trailer.payload + " kg";

    // Mise à jour dynamique des métadonnées SEO
    document.title = trailer.title + " - Location sur Renger";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
        metaDesc.setAttribute("content", trailer.description ? trailer.description.substring(0, 150) + "..." : `Louez ${trailer.title} sur Renger.`);
    }

    // Mise à jour du JSON-LD structuré
    const schemaScript = document.getElementById('schema-trailer');
    if (schemaScript) {
        try {
            const schemaData = JSON.parse(schemaScript.textContent);
            schemaData.name = trailer.title;
            schemaData.description = trailer.description || `Location de ${trailer.title}`;
            if (schemaData.offers) {
                schemaData.offers.price = trailer.price;
            }
            if (trailer.image_url) {
                schemaData.image = trailer.image_url;
            }
            schemaScript.textContent = JSON.stringify(schemaData);
        } catch (e) {
            console.error("Erreur parsing JSON-LD", e);
        }
    }

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
    
    // MPA : on est déjà sur remorque.html, on affiche la section détail
        if (typeof showPage === 'function') {
            showPage('detail-page');
        } else {
            document.getElementById('detail-page').classList.remove('hidden');
        }
    updateChatButtonState(); // État initial du bouton chat (grisé car pas de dates)

    // On interroge la vue publique contenant uniquement les dates (avec repli résilient vers bookings)
    let bookings = null;
    try {
        const { data, error } = await supabaseClient
            .from('trailer_booked_dates')
            .select('start_date, end_date')
            .eq('trailer_id', trailer.id);
        if (error) throw error;
        bookings = data;
    } catch (err) {
        console.warn("Vue trailer_booked_dates indisponible, repli vers la table bookings:", err);
        try {
            const { data: fallbackData } = await supabaseClient
                .from('bookings')
                .select('start_date, end_date')
                .eq('trailer_id', trailer.id)
                .in('status', ['confirmed', 'paid', 'active', 'paye', 'indisponible']);
            bookings = fallbackData;
        } catch (fallbackErr) {
            console.warn("Erreur requête repli bookings:", fallbackErr);
        }
    }

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
                
                // Normalisation UTC minuit pour immuniser contre les décalages DST (changement d'heure)
                const utcStart = Date.UTC(selectedStartDate.getFullYear(), selectedStartDate.getMonth(), selectedStartDate.getDate());
                const utcEnd = Date.UTC(selectedEndDate.getFullYear(), selectedEndDate.getMonth(), selectedEndDate.getDate());
                const diffTime = Math.abs(utcEnd - utcStart);
                const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1; 
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
                .from('trailers').select('id').eq('owner_id', trailer.owner_id).eq('is_active', true);
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

    // Calculer les montants détaillés pour la modale (avec normalisation UTC minuit contre les décalages DST)
    const utcStart = Date.UTC(selectedStartDate.getFullYear(), selectedStartDate.getMonth(), selectedStartDate.getDate());
    const utcEnd = Date.UTC(selectedEndDate.getFullYear(), selectedEndDate.getMonth(), selectedEndDate.getDate());
    const diffTime = Math.abs(utcEnd - utcStart);
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
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
    if (window.showStripeLoading) window.showStripeLoading();
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
            if (window.hideStripeLoading) window.hideStripeLoading();
            showToast("Erreur Stripe : " + (stripeData.error || stripeData.message || "Lien de paiement introuvable."), "error");
        }
    } catch (err) {
        if (window.hideStripeLoading) window.hideStripeLoading();
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
                showToast("🎉 Réservation confirmée ! Redirection vers vos réservations...", "success");
                setTimeout(async () => {
                    await openProfile();
                }, 3000);
                return;
            }
        }

        // Délai dépassé : le webhook n'a pas encore répondu
        showToast("Paiement en cours de traitement bancaire. Votre réservation sera confirmée dès validation.", "info");
        setTimeout(async () => {
            await openProfile();
        }, 3000);

    } else if (paymentStatus === 'cancel') {
        localStorage.removeItem('pending_booking_id');
        window.history.replaceState({}, document.title, window.location.pathname);
        showToast("Le paiement a été annulé. Votre réservation n'a pas été créée.", "error");
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
        if (window.showStripeLoading) window.showStripeLoading();
        showToast("Création du paiement...", "info");
        const { data, error } = await supabaseClient.functions.invoke('stripe-boost-checkout', {
            body: { trailer_id: currentBoostTrailerId, plan: planEl.value }
        });
        
        if (error) throw error;
        if (data && data.url) {
            window.location.href = data.url;
        } else {
            if (window.hideStripeLoading) window.hideStripeLoading();
            showToast("Erreur lors de l'initialisation du paiement.", "error");
        }
    } catch (err) {
        if (window.hideStripeLoading) window.hideStripeLoading();
        showToast(err.message, "error");
    } finally {
        if (btn) btn.disabled = false;
    }
}

async function handleSubscribePro(plan = 'monthly') {
    if (!currentUser) {
        showToast("Vous devez être connecté.", "error");
        return;
    }
    try {
        if (window.showStripeLoading) window.showStripeLoading();
        showToast("Redirection vers Stripe...", "info");
        const { data, error } = await supabaseClient.functions.invoke('stripe-pro-checkout', {
            body: { user_id: currentUser.id, plan: plan }
        });

        if (error) {
            if (window.hideStripeLoading) window.hideStripeLoading();
            throw error;
        }
        if (data && data.url) {
            window.location.href = data.url;
        } else {
            if (window.hideStripeLoading) window.hideStripeLoading();
            showToast("Erreur lors de l'initialisation de l'abonnement.", "error");
        }
    } catch (err) {
        if (window.hideStripeLoading) window.hideStripeLoading();
        showToast(err.message, "error");
    }
}

// --- GESTION DE L'ANNONCE ---
let currentManagedTrailer = null;
let currentManagedCity = null;
let cachedSellerBookings = [];

function openManageTrailer(trailer, city) {
    if (!trailer) return;
    try {
        currentManagedTrailer = trailer;
        currentManagedCity = city || (trailer.location && trailer.location.includes(',') ? trailer.location.split(',')[0] : (trailer.location || 'votre région'));

        // Calculer les stats de cette remorque spécifique
        let totalRevenue = 0;
        let totalRentals = 0;

        const bookingsToCount = (typeof cachedSellerBookings !== 'undefined' && Array.isArray(cachedSellerBookings)) ? cachedSellerBookings : [];
        if (bookingsToCount.length > 0) {
            const todayStr = new Date().toISOString().split('T')[0];
            bookingsToCount.forEach(b => {
                const bEnd = b.end_date ? b.end_date.split('T')[0] : '';
                if (b.trailer_id === trailer.id && b.status === 'paye' && bEnd < todayStr) {
                    totalRevenue += Number(b.total_price || 0);
                    totalRentals += 1;
                }
            });
        }

        // Remplir les données dans l'interface
        const titleEl = document.getElementById('manage-trailer-title');
        if (titleEl) titleEl.textContent = trailer.title || 'Mon annonce';
        
        const revEl = document.getElementById('manage-trailer-revenue');
        if (revEl) revEl.textContent = totalRevenue.toFixed(2) + ' CHF';
        
        const rentEl = document.getElementById('manage-trailer-rentals');
        if (rentEl) rentEl.textContent = totalRentals;
        
        const viewsEl = document.getElementById('manage-trailer-views');
        if (viewsEl) viewsEl.textContent = trailer.views_count || 0;

        // Basculer l'affichage vers la section de gestion
        const sellerSection = document.getElementById('profile-seller-section');
        if (sellerSection) sellerSection.classList.add('hidden');
        
        const manageSection = document.getElementById('manage-trailer-section');
        if (manageSection) {
            manageSection.classList.remove('hidden');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    } catch (err) {
        console.error('Erreur openManageTrailer:', err);
        showToast("Impossible d'ouvrir la gestion de l'annonce : " + err.message, "error");
    }
}

function closeManageTrailer() {
    currentManagedTrailer = null;
    currentManagedCity = null;
    const manageSection = document.getElementById('manage-trailer-section');
    if (manageSection) manageSection.classList.add('hidden');
    const sellerSection = document.getElementById('profile-seller-section');
    if (sellerSection) sellerSection.classList.remove('hidden');
}

function boostManagedTrailer() {
    if (currentManagedTrailer && currentManagedCity) {
        openBoostModal(currentManagedTrailer.id, currentManagedCity);
    }
}

function editTrailer(id) {
    const targetId = id || (currentManagedTrailer ? currentManagedTrailer.id : null);
    if (!targetId) return;
    if (typeof closeManageTrailer === 'function') closeManageTrailer();
    window.location.href = `louer-ma-remorque.html?edit=${targetId}`;
}

async function archiveTrailer() {
    if (!currentManagedTrailer) return;
    if (!confirm('Êtes-vous sûr de vouloir archiver / supprimer cette annonce ?')) return;

    try {
        const { error } = await supabaseClient
            .from('trailers')
            .update({ is_active: false })
            .eq('id', currentManagedTrailer.id);

        if (error) throw error;
        
        showToast('Annonce archivée avec succès !');
        closeManageTrailer();
        // Rafraîchir les données du profil
        await loadProfileData();
    } catch (err) {
        console.error('Erreur archiveTrailer:', err);
        alert('Erreur lors de l\'archivage de l\'annonce.');
    }
}

window.showStripeLoading = function() {
    let loader = document.getElementById('stripe-loader');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'stripe-loader';
        loader.className = 'fixed inset-0 bg-stone-900/80 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center hidden';
        loader.innerHTML = `
            <style>
                @keyframes sand-flow {
                    0% { transform: rotate(0deg); }
                    40% { transform: rotate(180deg); }
                    100% { transform: rotate(180deg); }
                }
                .hourglass-svg {
                    animation: sand-flow 3s ease-in-out infinite;
                }
            </style>
            <div class="bg-white dark:bg-stone-800 p-8 rounded-3xl shadow-2xl flex flex-col items-center border border-terracotta-500/20">
                <svg class="hourglass-svg w-16 h-16 text-terracotta-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 4h16v2a6 6 0 01-6 6v0a6 6 0 016 6v2H4v-2a6 6 0 016-6v0a6 6 0 01-6-6V4z" />
                </svg>
                <h3 class="text-xl font-bold text-stone-800 dark:text-white mb-2">Connexion sécurisée</h3>
                <p class="text-sm text-stone-500 dark:text-stone-400">Génération du lien Stripe en cours...</p>
            </div>
        `;
        document.body.appendChild(loader);
    }
    loader.classList.remove('hidden');
};

window.hideStripeLoading = function() {
    const loader = document.getElementById('stripe-loader');
    if (loader) loader.classList.add('hidden');
};
