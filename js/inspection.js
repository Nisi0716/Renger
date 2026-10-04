// ==========================================
// 6. MODULE CAMÉRA GUIDÉE & GHOSTING (ÉTAT DES LIEUX)
// ==========================================

const INSPECTION_STEPS = [
    {
        step: 1,
        title: "Tête d'attelage",
        instruction: "Cadrez le système d'attache, la roue jockey et le câble de sécurité.",
        overlayId: 'ghost-overlay-1',
        pillId: 'step-pill-1'
    },
    {
        step: 2,
        title: "Avant et Côté Gauche",
        instruction: "Reculez pour cadrer le 3/4 avant gauche, la carrosserie et le pneu gauche.",
        overlayId: 'ghost-overlay-2',
        pillId: 'step-pill-2'
    },
    {
        step: 3,
        title: "Arrière et Côté Droit",
        instruction: "Cadrez l'arrière avec la plaque d'immatriculation, les feux et le flanc droit.",
        overlayId: 'ghost-overlay-3',
        pillId: 'step-pill-3'
    },
    {
        step: 4,
        title: "Intérieur (Propreté)",
        instruction: "Cadrez l'intérieur de la cuve : plancher propre, vide et sans dégradations.",
        overlayId: 'ghost-overlay-4',
        pillId: 'step-pill-4'
    }
];

let inspectionContext = {
    mode: 'departure', // 'departure' (propriétaire) ou 'return' (locataire)
    trailerId: null,
    bookingId: null,
    receiverId: null,
    currentStepIndex: 0,
    isCapturing: false,
    facingMode: 'environment',
    clockInterval: null,
    cachedCoords: null
};

async function startGuidedInspection(mode, trailerId, receiverId, bookingId) {
    if (!currentUser) {
        showToast("Vous devez être connecté pour réaliser un état des lieux.", "error");
        openAuthModal();
        return;
    }

    inspectionContext.mode = mode || 'departure';
    inspectionContext.trailerId = trailerId || (currentTrailer ? currentTrailer.id : null);
    inspectionContext.receiverId = receiverId || activeChatPartnerId;
    inspectionContext.bookingId = bookingId || currentBookingContext?.id;
    inspectionContext.currentStepIndex = 0;
    inspectionContext.isCapturing = false;

    showPage('inspection-page');
    updateInspectionHUD();
    startInspectionClock();
    await startCamera(inspectionContext.facingMode);
    updateGPSStatusBadge();
}

function updateInspectionHUD() {
    const step = INSPECTION_STEPS[inspectionContext.currentStepIndex];
    if (!step) return;

    // Mode texte
    const modeText = document.getElementById('inspection-mode-text');
    if (modeText) {
        modeText.textContent = inspectionContext.mode === 'departure'
            ? 'État des lieux de départ'
            : 'État des lieux de retour';
    }

    // Étape titre et instructions
    const stepTitle = document.getElementById('inspection-step-title');
    if (stepTitle) stepTitle.textContent = `Étape ${step.step} sur 4 : ${step.title}`;

    const stepCounter = document.getElementById('inspection-step-counter');
    if (stepCounter) stepCounter.textContent = `${step.step} / 4`;

    const stepInstruction = document.getElementById('inspection-step-instruction');
    if (stepInstruction) stepInstruction.textContent = step.instruction;

    // Barre de progression
    const progressBar = document.getElementById('inspection-progress-bar');
    if (progressBar) progressBar.style.width = `${(step.step / 4) * 100}%`;

    // Calques ghosting SVG et pastilles
    INSPECTION_STEPS.forEach((s, idx) => {
        const overlay = document.getElementById(s.overlayId);
        if (overlay) {
            if (idx === inspectionContext.currentStepIndex) {
                overlay.classList.remove('hidden');
            } else {
                overlay.classList.add('hidden');
            }
        }

        const pill = document.getElementById(s.pillId);
        if (pill) {
            if (idx < inspectionContext.currentStepIndex) {
                pill.className = 'flex-1 py-1.5 px-2 bg-emerald-950/70 border border-emerald-500 text-emerald-400 rounded-xl text-center text-xs font-bold transition';
                pill.innerHTML = `✓ ${idx + 1}`;
            } else if (idx === inspectionContext.currentStepIndex) {
                pill.className = 'flex-1 py-1.5 px-2 bg-terracotta-500/20 border-2 border-terracotta-500 text-terracotta-400 rounded-xl text-center text-xs font-extrabold transition shadow-sm';
                pill.innerHTML = `${idx + 1}. ${s.title.split(' ')[0]}`;
            } else {
                pill.className = 'flex-1 py-1.5 px-2 bg-stone-900 border border-stone-800 text-stone-500 rounded-xl text-center text-xs font-bold transition';
                pill.innerHTML = `${idx + 1}. ${s.title.split(' ')[0]}`;
            }
        }
    });
}

function startInspectionClock() {
    if (inspectionContext.clockInterval) clearInterval(inspectionContext.clockInterval);
    const clockEl = document.getElementById('camera-clock-badge');
    const updateTime = () => {
        if (clockEl) {
            const now = new Date();
            clockEl.textContent = now.toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        }
    };
    updateTime();
    inspectionContext.clockInterval = setInterval(updateTime, 1000);
}

function stopInspectionClock() {
    if (inspectionContext.clockInterval) {
        clearInterval(inspectionContext.clockInterval);
        inspectionContext.clockInterval = null;
    }
}

async function getCurrentCoordinates() {
    if (!('geolocation' in navigator)) {
        return { latitude: null, longitude: null, accuracy: null, text: 'Non supporté' };
    }
    return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const coords = {
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    accuracy: Math.round(pos.coords.accuracy),
                    text: `${pos.coords.latitude.toFixed(4)}°N, ${pos.coords.longitude.toFixed(4)}°E (±${Math.round(pos.coords.accuracy)}m)`
                };
                inspectionContext.cachedCoords = coords;
                resolve(coords);
            },
            (err) => {
                console.warn("Géolocalisation inaccessible :", err.message);
                resolve({ latitude: null, longitude: null, accuracy: null, text: 'Coordonnées approximatives' });
            },
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
        );
    });
}

async function updateGPSStatusBadge() {
    const gpsText = document.getElementById('camera-gps-text');
    if (!gpsText) return;
    gpsText.textContent = '📍 Recherche GPS...';

    const coords = await getCurrentCoordinates();
    if (coords.latitude) {
        gpsText.textContent = `📍 GPS Précis (±${coords.accuracy}m)`;
    } else {
        gpsText.textContent = '📍 GPS approximatif';
    }
}

async function startCamera(facing = 'environment') {
    stopCamera();
    try {
        videoStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: facing,
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }
        });
        const feed = document.getElementById('camera-feed');
        if (feed) feed.srcObject = videoStream;
    } catch (err) {
        console.warn("Erreur caméra :", err.message);
        showToast("Impossible d'accéder à la caméra.", "error");
    }
}

function stopCamera() {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
    stopInspectionClock();
}

async function switchCamera() {
    inspectionContext.facingMode = inspectionContext.facingMode === 'environment' ? 'user' : 'environment';
    await startCamera(inspectionContext.facingMode);
}

function confirmExitInspection() {
    if (inspectionContext.currentStepIndex > 0 && inspectionContext.currentStepIndex < 4) {
        const exit = confirm("Voulez-vous vraiment quitter l'état des lieux ? Vos photos des étapes déjà validées sont conservées dans la conversation.");
        if (!exit) return;
    }
    stopCamera();
    stopInspectionClock();
    showPage('detail-page');
    openChatModal();
}

function applyInspectionWatermark(ctx, canvasWidth, canvasHeight, stepConfig, coords, date) {
    const bannerHeight = Math.max(68, Math.round(canvasHeight * 0.11));

    // Fond sombre du bandeau légal
    ctx.fillStyle = 'rgba(15, 17, 21, 0.88)';
    ctx.fillRect(0, canvasHeight - bannerHeight, canvasWidth, bannerHeight);

    // Filet supérieur décoratif terracotta
    ctx.fillStyle = '#E05A47';
    ctx.fillRect(0, canvasHeight - bannerHeight, canvasWidth, 3);

    // Typographies adaptatives
    const fontSizeTitle = Math.max(13, Math.round(bannerHeight * 0.28));
    const fontSizeMeta = Math.max(10, Math.round(bannerHeight * 0.21));

    // Ligne 1 : Titre & Étape
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${fontSizeTitle}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    const modeLabel = inspectionContext.mode === 'departure' ? 'DÉPART (PROPRIÉTAIRE)' : 'RETOUR (LOCATAIRE)';
    ctx.fillText(`🛡️ RENGER CERTIFIÉ — ÉTAT DES LIEUX ${modeLabel} | ÉTAPE ${stepConfig.step}/4 : ${stepConfig.title.toUpperCase()}`, 18, canvasHeight - bannerHeight + fontSizeTitle + 10);

    // Ligne 2 : Horodatage & Géolocalisation
    ctx.fillStyle = '#94A3B8';
    ctx.font = `${fontSizeMeta}px monospace`;
    const dateStr = date.toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = date.toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const gpsStr = coords.latitude ? `📍 ${coords.text}` : '📍 GPS non accessible';
    ctx.fillText(`📅 ${dateStr} ${timeStr} CEST  |  ${gpsStr}`, 18, canvasHeight - 12);
}

async function takeGuidedInspectionPhoto() {
    if (inspectionContext.isCapturing) return;
    const feed = document.getElementById('camera-feed');
    if (!feed || !videoStream) {
        return showToast("La caméra n'est pas active.", "error");
    }

    const currentStep = INSPECTION_STEPS[inspectionContext.currentStepIndex];
    if (!currentStep) return;

    inspectionContext.isCapturing = true;

    // 1. Effet Flash visuel
    const flashEl = document.getElementById('camera-flash');
    if (flashEl) {
        flashEl.style.opacity = '1';
        setTimeout(() => { flashEl.style.opacity = '0'; }, 150);
    }

    showToast(`📸 Certification de l'étape ${currentStep.step}/4 en cours...`, "info");

    try {
        // 2. Extraire la photo sur canvas
        const canvas = document.createElement('canvas');
        canvas.width = feed.videoWidth || 1280;
        canvas.height = feed.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(feed, 0, 0, canvas.width, canvas.height);

        // 3. Obtenir géolocalisation et horodatage précis
        const now = new Date();
        const coords = await getCurrentCoordinates();

        // 4. Incruster le filigrane légal inaltérable sur l'image
        applyInspectionWatermark(ctx, canvas.width, canvas.height, currentStep, coords, now);

        // 5. Convertir en Blob JPEG
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.88));
        if (!blob) throw new Error("Échec de la génération de l'image.");

        // 6. Upload dans le bucket PRIVÉ 'inspections'
        const timestamp = Date.now();
        const mode = inspectionContext.mode;
        const trailerId = inspectionContext.trailerId || 'generale';
        const filePath = `${currentUser.id}/${trailerId}/${mode}_step${currentStep.step}_${timestamp}.jpg`;

        if (supabaseClient && currentUser) {
            const { error: uploadError } = await supabaseClient.storage
                .from('inspections')
                .upload(filePath, blob, {
                    contentType: 'image/jpeg',
                    upsert: false
                });

            if (uploadError) {
                console.warn("Upload inspection warning:", uploadError.message);
            }
        }

        // 7. Insérer le message dans la table messages du chat
        const dateStr = now.toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const timeStr = now.toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const modeLabel = mode === 'departure' ? 'départ' : 'retour';
        const content = `📸 [État des lieux de ${modeLabel}] Étape ${currentStep.step}/4 : ${currentStep.title} — Certifié le ${dateStr} à ${timeStr} (${coords.text})`;

        const receiverId = inspectionContext.receiverId || activeChatPartnerId || (currentUser.id === currentTrailer?.owner_id ? null : currentTrailer?.owner_id);

        if (supabaseClient && currentUser) {
            await supabaseClient.from('messages').insert([{
                sender_id: currentUser.id,
                receiver_id: receiverId,
                trailer_id: trailerId,
                content: content,
                image_url: filePath
            }]);
        }

        // 8. Passage à l'étape suivante ou clôture
        if (inspectionContext.currentStepIndex < 3) {
            inspectionContext.currentStepIndex++;
            showToast(`✅ Étape ${currentStep.step}/4 validée ! Passez à l'étape ${inspectionContext.currentStepIndex + 1}.`, "success");
            updateInspectionHUD();
        } else {
            // Toutes les 4 étapes sont validées !
            stopCamera();
            stopInspectionClock();
            showToast("🎉 État des lieux complet certifié (4/4 photos enregistrées) !", "success");
            showPage('detail-page');
            await openChatModal();
        }

    } catch (err) {
        showToast("Erreur lors de la capture : " + err.message, "error");
    } finally {
        inspectionContext.isCapturing = false;
    }
}

// Alias pour compatibilité
async function takePhoto() {
    return takeGuidedInspectionPhoto();
}

