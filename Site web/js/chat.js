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
 * Filtre anti-contournement de plateforme et durcissement anti-scam.
 * Masque les adresses email, les identifiants de messagerie externe (WhatsApp, Telegram),
 * les numéros IBAN suisses et internationaux, et les numéros de téléphone.
 */
function sanitizeMessage(text) {
    if (!text) return text;
    const MASK = '[Information masquée avant réservation]';

    // 1. Adresses email
    text = text.replace(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, MASK);

    // 2. Liens externes vers messageries tierces (WhatsApp, Telegram, etc.)
    text = text.replace(/(?:https?:\/\/)?(?:wa\.me|t\.me|telegram\.me|api\.whatsapp\.com|instagram\.com)\/[a-zA-Z0-9_+\-]+/gi, MASK);

    // 3. IBAN suisse et international (ex: CH93 0076 2011 6238 5295 7)
    text = text.replace(/\b[A-Za-z]{2}\d{2}(?:[\s\-]?[0-9A-Za-z]{4}){3,6}(?:[\s\-]?[0-9A-Za-z]{1,4})?\b/g, MASK);

    // 4. Numéros de téléphone (avec ou sans indicatif international + ou 00, avec séparateurs éventuels)
    text = text.replace(/(?:(?:\+|00)\s*)?(?:\d[\s./\-]?){8,}\d/g, MASK);

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
    if (typeof startGuidedInspection === 'undefined') {
        const url = new URL('inspection.html', window.location.href);
        url.searchParams.set('action', 'start_inspection');
        url.searchParams.set('step', 'departure');
        if (typeof currentTrailer !== 'undefined' && currentTrailer?.id) url.searchParams.set('trailerId', currentTrailer.id);
        if (typeof activeChatPartnerId !== 'undefined' && activeChatPartnerId) url.searchParams.set('partnerId', activeChatPartnerId);
        if (typeof currentBookingContext !== 'undefined' && currentBookingContext?.id) url.searchParams.set('bookingId', currentBookingContext.id);
        window.location.href = url.toString();
    } else {
        const tId = (typeof currentTrailer !== 'undefined' && currentTrailer) ? currentTrailer.id : null;
        const pId = (typeof activeChatPartnerId !== 'undefined') ? activeChatPartnerId : null;
        const bId = (typeof currentBookingContext !== 'undefined' && currentBookingContext) ? currentBookingContext.id : null;
        startGuidedInspection('departure', tId, pId, bId);
    }
}

/**
 * Déclenche l'état des lieux de retour par le locataire
 */
function startRenterInspection() {
    closeChatModal();
    if (typeof startGuidedInspection === 'undefined') {
        const url = new URL('inspection.html', window.location.href);
        url.searchParams.set('action', 'start_inspection');
        url.searchParams.set('step', 'return');
        if (typeof currentTrailer !== 'undefined' && currentTrailer?.id) url.searchParams.set('trailerId', currentTrailer.id);
        if (typeof activeChatPartnerId !== 'undefined' && activeChatPartnerId) url.searchParams.set('partnerId', activeChatPartnerId);
        if (typeof currentBookingContext !== 'undefined' && currentBookingContext?.id) url.searchParams.set('bookingId', currentBookingContext.id);
        window.location.href = url.toString();
    } else {
        const tId = (typeof currentTrailer !== 'undefined' && currentTrailer) ? currentTrailer.id : null;
        const pId = (typeof activeChatPartnerId !== 'undefined') ? activeChatPartnerId : null;
        const bId = (typeof currentBookingContext !== 'undefined' && currentBookingContext) ? currentBookingContext.id : null;
        startGuidedInspection('return', tId, pId, bId);
    }
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
    if (sanitized !== rawText) {
        showToast('⚠️ Coordonnées masquées : pour votre sécurité, restez sur Renger.', 'info');
    }

    const directPayRegex = /(?:twint\s*(?:direct|en\s*direct|hors\s*site)|paiement\s*(?:en\s*espèces|en\s*liquide|cash|de\s*la\s*main\s*à\s*la\s*main)|payer\s*(?:en\s*espèces|en\s*liquide|cash))/i;
    if (directPayRegex.test(rawText)) {
        showToast('⚠️ Sollicitation hors-plateforme détectée : les paiements en cash ou TWINT direct ne sont pas couverts.', 'warning');
    }

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


