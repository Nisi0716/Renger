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
    cachedCoords: null,
    geoWatchId: null,
    pendingUploads: []
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
    inspectionContext.capturedPhotos = [];
    inspectionContext.pendingUploads = [];

    showPage('inspection-page');
    updateInspectionHUD();
    startInspectionClock();
    startGPSTracking();
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
                pill.innerHTML = `<span class="inline-flex items-center justify-center gap-1"><svg class="w-3 h-3 shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg><span>${idx + 1}</span></span>`;
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

function startGPSTracking() {
    if (!('geolocation' in navigator)) return;
    if (inspectionContext.geoWatchId !== null) return;
    try {
        inspectionContext.geoWatchId = navigator.geolocation.watchPosition(
            (pos) => {
                const coords = {
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    accuracy: Math.round(pos.coords.accuracy),
                    text: `${pos.coords.latitude.toFixed(4)}°N, ${pos.coords.longitude.toFixed(4)}°E (±${Math.round(pos.coords.accuracy)}m)`
                };
                inspectionContext.cachedCoords = coords;
                const gpsText = document.getElementById('camera-gps-text');
                if (gpsText) {
                    gpsText.textContent = `GPS Précis (±${coords.accuracy}m)`;
                }
            },
            (err) => {
                console.warn("watchPosition warning:", err.message);
            },
            { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 }
        );
    } catch (e) {
        console.warn("watchPosition error:", e);
    }
}

function stopGPSTracking() {
    if (inspectionContext.geoWatchId !== null && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(inspectionContext.geoWatchId);
        inspectionContext.geoWatchId = null;
    }
}

async function getCurrentCoordinates(forceFresh = false) {
    if (!forceFresh && inspectionContext.cachedCoords && inspectionContext.cachedCoords.latitude) {
        return inspectionContext.cachedCoords;
    }
    if (!('geolocation' in navigator)) {
        return { latitude: null, longitude: null, accuracy: null, text: 'Non supporté' };
    }
    return new Promise((resolve) => {
        let hasResolved = false;
        const timer = setTimeout(() => {
            if (!hasResolved) {
                hasResolved = true;
                resolve(inspectionContext.cachedCoords || { latitude: null, longitude: null, accuracy: null, text: 'Coordonnées approximatives' });
            }
        }, 2000);

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                if (hasResolved) return;
                hasResolved = true;
                clearTimeout(timer);
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
                if (hasResolved) return;
                hasResolved = true;
                clearTimeout(timer);
                console.warn("Géolocalisation inaccessible :", err.message);
                resolve(inspectionContext.cachedCoords || { latitude: null, longitude: null, accuracy: null, text: 'Coordonnées approximatives' });
            },
            { enableHighAccuracy: true, timeout: 2000, maximumAge: 60000 }
        );
    });
}

async function updateGPSStatusBadge() {
    const gpsText = document.getElementById('camera-gps-text');
    if (!gpsText) return;
    gpsText.textContent = 'Recherche GPS...';

    const coords = await getCurrentCoordinates();
    if (coords.latitude) {
        gpsText.textContent = `GPS Précis (±${coords.accuracy}m)`;
    } else {
        gpsText.textContent = 'GPS approximatif';
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
    stopGPSTracking();
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
    const modeLabel = inspectionContext.mode === 'departure' ? 'DÉPART' : 'RETOUR';
    ctx.fillText(`CONSTAT CONTRADICTOIRE — ÉTAT DES LIEUX ${modeLabel} | ÉTAPE ${stepConfig.step}/4 : ${stepConfig.title.toUpperCase()}`, 18, canvasHeight - bannerHeight + fontSizeTitle + 10);

    // Ligne 2 : Horodatage, Géolocalisation & Mention légale
    ctx.fillStyle = '#94A3B8';
    ctx.font = `${fontSizeMeta}px monospace`;
    const dateStr = date.toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = date.toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const gpsStr = coords.latitude ? coords.text : 'GPS non accessible';
    ctx.fillText(`${dateStr} ${timeStr} CEST  |  ${gpsStr}  |  Renger tiers technique (non responsable)`, 18, canvasHeight - 12);
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

    // 1. Déclenchement flash visuel immédiat (effet instantané et réactif)
    const flashEl = document.getElementById('camera-flash');
    if (flashEl) {
        flashEl.style.opacity = '1';
        setTimeout(() => { flashEl.style.opacity = '0'; }, 100);
    }

    try {
        // 2. Extraire la photo sur canvas avec dimension optimisée (max 1280px pour réactivité maximale)
        const canvas = document.createElement('canvas');
        const maxDimension = 1280;
        let cWidth = feed.videoWidth || 1280;
        let cHeight = feed.videoHeight || 720;
        if (cWidth > maxDimension || cHeight > maxDimension) {
            if (cWidth >= cHeight) {
                cHeight = Math.round((cHeight * maxDimension) / cWidth);
                cWidth = maxDimension;
            } else {
                cWidth = Math.round((cWidth * maxDimension) / cHeight);
                cHeight = maxDimension;
            }
        }
        canvas.width = cWidth;
        canvas.height = cHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(feed, 0, 0, canvas.width, canvas.height);

        // 3. Obtenir géolocalisation (instantanée grâce au cache / watchPosition) et date
        const now = new Date();
        const coords = await getCurrentCoordinates();

        // 4. Incruster le filigrane légal inaltérable sur l'image
        applyInspectionWatermark(ctx, canvas.width, canvas.height, currentStep, coords, now);

        // 5. Extraire DataURL immédiatement pour mémoire et PDF (ultra-rapide à 1280px)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);

        const photoRecord = {
            step: currentStep.step,
            title: currentStep.title,
            desc: currentStep.instruction,
            dataUrl: dataUrl,
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy,
            timestamp: now.toISOString(),
            image_url: null
        };

        if (!inspectionContext.capturedPhotos) {
            inspectionContext.capturedPhotos = [];
        }
        inspectionContext.capturedPhotos.push(photoRecord);

        const isFinalStep = inspectionContext.currentStepIndex >= 3;
        const stepNum = currentStep.step;

        // 6. Passage IMMÉDIAT à l'étape suivante (Transition instantanée sans bloquer l'utilisateur)
        if (!isFinalStep) {
            inspectionContext.currentStepIndex++;
            updateInspectionHUD();
            showToast(`Étape ${stepNum}/4 validée ! Passez à l'étape ${inspectionContext.currentStepIndex + 1}.`, "success");
            inspectionContext.isCapturing = false;
        }

        // 7. Enregistrement en tâche de fond asynchrone (Storage & BDD sans ralentir la prise de vue)
        const uploadTask = (async () => {
            try {
                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.82));
                if (!blob) return;

                const timestamp = Date.now();
                const mode = inspectionContext.mode;
                const trailerId = inspectionContext.trailerId || 'generale';
                const filePath = `${currentUser?.id || 'public'}/${trailerId}/${mode}_step${stepNum}_${timestamp}.jpg`;
                photoRecord.image_url = filePath;

                if (supabaseClient && currentUser) {
                    const { error: uploadError } = await supabaseClient.storage
                        .from('inspections')
                        .upload(filePath, blob, {
                            contentType: 'image/jpeg',
                            upsert: false
                        });

                    if (uploadError) {
                        console.warn(`[Inspection] Erreur upload étape ${stepNum}:`, uploadError.message);
                    }

                    const dateStr = now.toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
                    const timeStr = now.toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                    const modeLabel = mode === 'departure' ? 'départ' : 'retour';
                    const content = `[État des lieux de ${modeLabel}] Étape ${stepNum}/4 : ${currentStep.title} — Enregistré le ${dateStr} à ${timeStr} (${coords.text})`;
                    const receiverId = inspectionContext.receiverId || activeChatPartnerId || (currentUser.id === currentTrailer?.owner_id ? null : currentTrailer?.owner_id);

                    // Inserts parallélisés dans messages et inspections
                    await Promise.allSettled([
                        supabaseClient.from('messages').insert([{
                            sender_id: currentUser.id,
                            receiver_id: receiverId,
                            trailer_id: trailerId,
                            content: content,
                            image_url: filePath
                        }]),
                        supabaseClient.from('inspections').insert([{
                            trailer_id: trailerId,
                            user_id: currentUser.id,
                            mode: mode,
                            step: stepNum,
                            image_url: filePath,
                            latitude: coords.latitude,
                            longitude: coords.longitude,
                            accuracy: coords.accuracy,
                            timestamp: now.toISOString()
                        }])
                    ]);
                }
            } catch (bgErr) {
                console.warn(`[Inspection] Tâche de fond étape ${stepNum} warning:`, bgErr);
            }
        })();

        if (!inspectionContext.pendingUploads) {
            inspectionContext.pendingUploads = [];
        }
        inspectionContext.pendingUploads.push(uploadTask);

        // 8. Clôture lors de la 4ème et dernière photo
        if (isFinalStep) {
            stopCamera();
            stopInspectionClock();
            stopGPSTracking();

            showToast("Finalisation de l'enregistrement...", "info");

            // On attend que les uploads en arrière-plan se finalisent
            try {
                await Promise.allSettled(inspectionContext.pendingUploads);
            } catch (waitErr) {
                console.warn("[Inspection] Erreur attente uploads:", waitErr);
            }

            showToast("État des lieux complet enregistré (4/4 photos) !", "success");

            const completedSession = {
                id: inspectionContext.bookingId || inspectionContext.trailerId || 'EDL' + Date.now().toString(36),
                booking_id: inspectionContext.bookingId,
                trailer_id: inspectionContext.trailerId,
                mode: inspectionContext.mode,
                receiver_id: inspectionContext.receiverId,
                completedAt: now.toISOString(),
                photos: inspectionContext.capturedPhotos ? [...inspectionContext.capturedPhotos] : []
            };

            if (typeof window !== 'undefined') {
                window.lastInspectionSession = completedSession;
            }

            showInspectionSuccessModal(completedSession);
            inspectionContext.isCapturing = false;
        }

    } catch (err) {
        showToast("Erreur lors de la capture : " + err.message, "error");
        inspectionContext.isCapturing = false;
    }
}

/**
 * Affiche la modale de succès avec accès immédiat au téléchargement du rapport certifié.
 */
function showInspectionSuccessModal(sessionData) {
    const modal = document.getElementById('inspection-success-modal');
    if (modal) {
        modal.classList.remove('hidden');
    } else {
        if (typeof window !== 'undefined' && window.RengerContracts && typeof window.RengerContracts.downloadInspectionReport === 'function') {
            window.RengerContracts.downloadInspectionReport(sessionData, sessionData.mode);
        }
        showPage('detail-page');
        if (typeof openChatModal === 'function') {
            openChatModal();
        }
    }
}

/**
 * Ferme la modale de succès et redirige vers la messagerie.
 */
function closeInspectionSuccessModal() {
    const modal = document.getElementById('inspection-success-modal');
    if (modal) modal.classList.add('hidden');
    showPage('detail-page');
    if (typeof openChatModal === 'function') {
        openChatModal();
    }
}

/**
 * Gère le clic extérieur sur l'arrière-plan de la modale de succès.
 */
function handleSuccessModalBackdrop(event) {
    if (event.target && event.target.id === 'inspection-success-modal') {
        closeInspectionSuccessModal();
    }
}

/**
 * Déclenche le téléchargement du rapport d'état des lieux certifié (PDF).
 */
function downloadCurrentInspectionReport() {
    const sessionData = (typeof window !== 'undefined' && window.lastInspectionSession)
        ? window.lastInspectionSession
        : {
            booking_id: inspectionContext.bookingId,
            trailer_id: inspectionContext.trailerId,
            mode: inspectionContext.mode,
            photos: inspectionContext.capturedPhotos || []
        };
    if (typeof window !== 'undefined' && window.RengerContracts && typeof window.RengerContracts.downloadInspectionReport === 'function') {
        window.RengerContracts.downloadInspectionReport(sessionData, inspectionContext.mode);
        showToast("Téléchargement du rapport d'état des lieux certifié lancé !", "success");
    } else {
        showToast("Génération du rapport en cours...", "info");
    }
}

if (typeof window !== 'undefined') {
    window.showInspectionSuccessModal = showInspectionSuccessModal;
    window.closeInspectionSuccessModal = closeInspectionSuccessModal;
    window.handleSuccessModalBackdrop = handleSuccessModalBackdrop;
    window.downloadCurrentInspectionReport = downloadCurrentInspectionReport;
}

// Alias pour compatibilité
async function takePhoto() {
    return takeGuidedInspectionPhoto();
}

