// ==========================================
// OUTILS DYNAMIQUES DE VENTE (SMART PRICING & GÉNÉRATEUR)
// ==========================================

let hasUserEditedDescription = false;
let sellerDynamicToolsInitialized = false;

/**
 * Calcule la fourchette de prix optimale recommandée (en CHF)
 * selon la catégorie et la charge utile de la remorque.
 */
function getSmartPricingRange() {
    const category = document.querySelector('input[name="category"]:checked')?.value || 'utilitaire';
    const payload = parseInt(document.getElementById('ad-payload')?.value, 10) || 500;
    
    let minOptimal = 40;
    let maxOptimal = 60;
    let suggested = 50;

    switch (category) {
        case 'cheval':
            minOptimal = 110;
            maxOptimal = 160;
            suggested = 135;
            break;
        case 'voiture':
            minOptimal = 90;
            maxOptimal = 140;
            suggested = 115;
            break;
        case 'refrigere':
            minOptimal = 100;
            maxOptimal = 160;
            suggested = 130;
            break;
        case 'moto':
            minOptimal = 45;
            maxOptimal = 70;
            suggested = 55;
            break;
        case 'porte-velo':
            minOptimal = 30;
            maxOptimal = 50;
            suggested = 40;
            break;
        case 'utilitaire':
        default:
            if (payload <= 500) {
                minOptimal = 35;
                maxOptimal = 50;
                suggested = 40;
            } else if (payload <= 750) {
                minOptimal = 45;
                maxOptimal = 65;
                suggested = 50;
            } else if (payload <= 1300) {
                minOptimal = 60;
                maxOptimal = 85;
                suggested = 70;
            } else {
                minOptimal = 75;
                maxOptimal = 110;
                suggested = 85;
            }
            break;
    }

    return { minOptimal, maxOptimal, suggested, category, payload };
}

/**
 * Met à jour dynamiquement la jauge visuelle à 3 segments et les conseils de prix.
 */
function updateSmartPricingFeedback() {
    const priceInput = document.getElementById('ad-price');
    const tag = document.getElementById('price-suggested-tag');
    const gaugeLow = document.getElementById('gauge-low');
    const gaugeOpt = document.getElementById('gauge-optimal');
    const gaugeHigh = document.getElementById('gauge-high');
    const box = document.getElementById('pricing-feedback-box');
    const icon = document.getElementById('pricing-feedback-icon');
    const text = document.getElementById('pricing-feedback-text');

    if (!gaugeLow || !gaugeOpt || !gaugeHigh || !box || !text) return;

    const range = getSmartPricingRange();
    if (tag) {
        tag.textContent = `Conseillé : ${range.suggested} CHF`;
    }

    const rawVal = priceInput?.value;
    const price = parseInt(rawVal, 10);

    const lowBase = "h-full w-1/4 rounded-l-full transition-all duration-300";
    const optBase = "h-full w-2/4 transition-all duration-300";
    const highBase = "h-full w-1/4 rounded-r-full transition-all duration-300";

    if (isNaN(price) || price <= 0 || !rawVal) {
        // État neutre par défaut
        gaugeLow.className = `${lowBase} bg-stone-200 dark:bg-stone-700`;
        gaugeOpt.className = `${optBase} bg-stone-200 dark:bg-stone-700`;
        gaugeHigh.className = `${highBase} bg-stone-200 dark:bg-stone-700`;
        box.className = "p-2.5 rounded-xl text-xs flex items-start gap-2 bg-stone-50 dark:bg-stone-900 border border-stone-200/60 dark:border-stone-700 transition-all duration-200 text-stone-600 dark:text-stone-300";
        if (icon) icon.textContent = "💡";
        text.innerHTML = `Fourchette recommandée : <strong class="font-bold text-stone-800 dark:text-white">${range.minOptimal} à ${range.maxOptimal} CHF / jour</strong> (optimal : <strong class="text-terracotta-600 dark:text-terracotta-400 font-bold">${range.suggested} CHF</strong>).`;
        return;
    }

    if (price < range.minOptimal) {
        // Prix en-dessous : Zone économique attractive
        gaugeLow.className = `${lowBase} bg-amber-400 dark:bg-amber-500 shadow-xs`;
        gaugeOpt.className = `${optBase} bg-stone-200 dark:bg-stone-700`;
        gaugeHigh.className = `${highBase} bg-stone-200 dark:bg-stone-700`;
        box.className = "p-2.5 rounded-xl text-xs flex items-start gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-200 transition-all duration-200";
        if (icon) icon.textContent = "📉";
        text.innerHTML = `<strong>Prix attractif (${price} CHF) :</strong> Vous trouverez preneur très vite ! Vous pourriez monter jusqu'à <strong>${range.minOptimal}-${range.maxOptimal} CHF</strong> pour maximiser vos gains.`;
    } else if (price <= range.maxOptimal) {
        // Zone optimale : VERT
        gaugeLow.className = `${lowBase} bg-stone-200 dark:bg-stone-700`;
        gaugeOpt.className = `${optBase} bg-emerald-500 shadow-sm animate-pulse`;
        gaugeHigh.className = `${highBase} bg-stone-200 dark:bg-stone-700`;
        box.className = "p-2.5 rounded-xl text-xs flex items-start gap-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200 transition-all duration-200";
        if (icon) icon.textContent = "🎯";
        text.innerHTML = `<strong>Prix optimal (${price} CHF) !</strong> Les annonces dans la zone verte reçoivent <strong>3x plus de demandes</strong> et maximisent votre rentabilité.`;
    } else if (price <= range.maxOptimal * 1.35) {
        // Au-dessus : ORANGE
        gaugeLow.className = `${lowBase} bg-stone-200 dark:bg-stone-700`;
        gaugeOpt.className = `${optBase} bg-stone-200 dark:bg-stone-700`;
        gaugeHigh.className = `${highBase} bg-orange-400 dark:bg-orange-500 shadow-xs`;
        box.className = "p-2.5 rounded-xl text-xs flex items-start gap-2 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/40 text-orange-900 dark:text-orange-200 transition-all duration-200";
        if (icon) icon.textContent = "⚠️";
        text.innerHTML = `<strong>Prix supérieur à la moyenne (${price} CHF) :</strong> Cela peut freiner les demandes. Une fourchette entre <strong>${range.minOptimal} et ${range.maxOptimal} CHF</strong> favorise une location rapide.`;
    } else {
        // Très au-dessus : ROUGE
        gaugeLow.className = `${lowBase} bg-stone-200 dark:bg-stone-700`;
        gaugeOpt.className = `${optBase} bg-stone-200 dark:bg-stone-700`;
        gaugeHigh.className = `${highBase} bg-rose-500 dark:bg-rose-600 shadow-xs`;
        box.className = "p-2.5 rounded-xl text-xs flex items-start gap-2 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 text-rose-900 dark:text-rose-200 transition-all duration-200";
        if (icon) icon.textContent = "🛑";
        text.innerHTML = `<strong>Prix très élevé (${price} CHF) :</strong> Risque important de peu ou pas de demandes. Un tarif conseillé se situe autour de <strong>${range.suggested} CHF / jour</strong>.`;
    }
}

/**
 * Applique directement le prix conseillé dans le champ de saisie
 */
function applySuggestedPrice() {
    const range = getSmartPricingRange();
    const priceInput = document.getElementById('ad-price');
    if (priceInput) {
        priceInput.value = range.suggested;
        updateSmartPricingFeedback();
    }
}

/**
 * Pédagogie Légale (Réglementation suisse LCR / OAC)
 * Détermine si le permis B est suffisant ou si le permis BE est requis
 * selon la charge utile et le type d'équipement.
 */
function updateLegalPermitBadge() {
    const payload = parseInt(document.getElementById('ad-payload')?.value, 10) || 0;
    const category = document.querySelector('input[name="category"]:checked')?.value || 'utilitaire';
    
    const indicator = document.getElementById('payload-permit-indicator');
    const icon = document.getElementById('permit-icon');
    const label = document.getElementById('permit-label');
    const sublabel = document.getElementById('permit-sublabel');
    const descLegalMention = document.getElementById('desc-legal-mention');

    // Règle LCR / OAC suisse :
    // PTAC / charge utile > 750 kg OU remorque lourde spécifique (van à chevaux, porte-voiture) => Permis BE requis
    const isHeavy = (payload > 750) || category === 'cheval' || category === 'voiture';

    if (indicator && label) {
        if (isHeavy) {
            indicator.className = "mt-2.5 p-2.5 rounded-xl text-xs flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 text-amber-800 dark:text-amber-300 transition-all";
            if (icon) icon.textContent = "🪪";
            label.textContent = "Permis BE requis";
            if (sublabel) {
                sublabel.className = "text-[10px] text-amber-600 dark:text-amber-400 ml-auto font-medium";
                sublabel.textContent = (category === 'cheval' || category === 'voiture')
                    ? "(Équipement lourd > 750 kg)"
                    : "(Charge > 750 kg • Remorque lourde)";
            }
        } else {
            indicator.className = "mt-2.5 p-2.5 rounded-xl text-xs flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 transition-all";
            if (icon) icon.textContent = "🚗";
            label.textContent = "Permis B suffisant";
            if (sublabel) {
                sublabel.className = "text-[10px] text-emerald-600 dark:text-emerald-400 ml-auto font-medium";
                sublabel.textContent = "(Charge ≤ 750 kg • Tout conducteur)";
            }
        }
    }

    if (descLegalMention) {
        if (isHeavy) {
            descLegalMention.innerHTML = `Mention légale requise : <strong class="text-amber-600 dark:text-amber-400 font-bold">Permis BE requis</strong>`;
        } else {
            descLegalMention.innerHTML = `Mention légale incluse : <strong class="text-emerald-600 dark:text-emerald-400 font-bold">Permis B suffisant</strong>`;
        }
    }
}

/**
 * Générateur de description automatique et pédagogie légale intégrée
 */
function generateAutoDescription(force = false) {
    const descTextarea = document.getElementById('ad-desc');
    if (!descTextarea) return;

    if (!force && hasUserEditedDescription && descTextarea.value.trim() !== '') {
        return;
    }

    const title = (document.getElementById('ad-title')?.value || '').trim();
    const category = document.querySelector('input[name="category"]:checked')?.value || 'utilitaire';
    const payload = parseInt(document.getElementById('ad-payload')?.value, 10);
    const prise = document.querySelector('input[name="prise"]:checked')?.value || '7 broches';
    
    const equipmentCheckboxes = document.querySelectorAll('input[name="equipments"]:checked');
    const equipments = Array.from(equipmentCheckboxes).map(cb => cb.value);

    const upsellCheckboxes = document.querySelectorAll('input[name="upsell"]:checked');
    const upsells = Array.from(upsellCheckboxes).map(cb => cb.value);

    // 1. Phrasing catégorie & introduction
    const categoryNames = {
        'utilitaire': 'remorque utilitaire polyvalente',
        'cheval': 'van à chevaux spacieux et sécurisé',
        'voiture': 'remorque porte-voiture robuste',
        'moto': 'remorque porte-moto équipée',
        'refrigere': 'remorque frigorifique sous température dirigée',
        'porte-velo': 'remorque bagagère / porte-vélo pratique'
    };
    const catLabel = categoryNames[category] || 'remorque';

    let intro = title ? `${title}.` : `À louer : superbe ${catLabel}, propre et parfaitement entretenue.`;

    // 2. Charge utile
    let payloadSentence = '';
    if (payload && !isNaN(payload) && payload > 0) {
        payloadSentence = `Cette remorque offre une charge utile de ${payload} kg, idéale pour vos transports et déménagements.`;
    } else {
        payloadSentence = `Idéale pour vos transports, déménagements et trajets en toute sérénité.`;
    }

    // 3. Prise électrique
    let socketSentence = prise === '13 broches'
        ? "Équipée d'une prise électrique 13 broches (feux de recul et alimentation permanente inclus)."
        : "Équipée d'une prise électrique standard 7 broches compatible avec tous les véhicules légers.";

    // 4. Équipements inclus
    const equipLabels = {
        'sangles': "sangles d'arrimage professionnelles",
        'bache': "bâche de protection étanche",
        'treuil': "treuil mécanique renforcé",
        'rames': "rampes de chargement aluminium"
    };
    let equipSentence = '';
    if (equipments.length > 0) {
        const readableEquips = equipments.map(e => equipLabels[e] || e);
        if (readableEquips.length === 1) {
            equipSentence = `Équipement inclus sans supplément : ${readableEquips[0]}.`;
        } else {
            const last = readableEquips.pop();
            equipSentence = `Équipements inclus sans supplément : ${readableEquips.join(', ')} et ${last}.`;
        }
    } else {
        equipSentence = "Matériel révisé régulièrement et prêt à prendre la route immédiatement.";
    }

    // 5. Options facultatives (upsells)
    const upsellLabels = {
        'diable': 'diable de manutention',
        'sangles-pro': 'kit sangles à cliquet pro',
        'antivol': 'antivol de timon haute sécurité',
        'adaptateur': 'adaptateur 7/13 broches'
    };
    let upsellSentence = '';
    if (upsells.length > 0) {
        const readableUpsells = upsells.map(u => upsellLabels[u] || u);
        upsellSentence = `Options disponibles sur demande : ${readableUpsells.join(', ')}.`;
    }

    // 6. Mention Légale Suisse (LCR / OAC)
    const isHeavy = (payload && payload > 750) || category === 'cheval' || category === 'voiture';
    const legalNotice = isHeavy
        ? "⚖️ Réglementation suisse : **Permis BE requis** pour tracter cette remorque (charge utile > 750 kg ou véhicule spécialisé)."
        : "⚖️ Réglementation suisse : **Permis B suffisant** pour tracter cette remorque avec tout véhicule de tourisme (charge utile ≤ 750 kg).";

    // Assemblage final fluide
    const paragraphs = [
        intro,
        [payloadSentence, socketSentence, equipSentence, upsellSentence].filter(Boolean).join(' '),
        legalNotice
    ];

    descTextarea.value = paragraphs.join('\n\n');

    if (force) {
        hasUserEditedDescription = false;
        if (typeof showToast === 'function') {
            showToast("✨ Description automatique générée !", "info");
        }
    }
}

/**
 * Initialise tous les écouteurs d'événements dynamiques du formulaire vendeur.
 */
function initSellerPageDynamicTools() {
    const priceInput = document.getElementById('ad-price');
    const payloadInput = document.getElementById('ad-payload');
    const titleInput = document.getElementById('ad-title');
    const descInput = document.getElementById('ad-desc');

    if (!priceInput || !payloadInput) return;

    // Mise à jour immédiate de la jauge et du permis
    updateSmartPricingFeedback();
    updateLegalPermitBadge();

    // Si la description est vide, pré-remplir automatiquement
    if (descInput && (!descInput.value || descInput.value.trim() === '')) {
        generateAutoDescription(false);
    }

    if (sellerDynamicToolsInitialized) return;
    sellerDynamicToolsInitialized = true;

    // Écouteurs sur le prix
    priceInput.addEventListener('input', () => {
        updateSmartPricingFeedback();
    });

    // Écouteurs sur la charge utile
    payloadInput.addEventListener('input', () => {
        updateSmartPricingFeedback();
        updateLegalPermitBadge();
        generateAutoDescription(false);
    });

    // Écouteurs sur le titre
    if (titleInput) {
        titleInput.addEventListener('input', () => {
            generateAutoDescription(false);
        });
    }

    // Détection de modification manuelle de la description
    if (descInput) {
        descInput.addEventListener('input', () => {
            hasUserEditedDescription = true;
        });
    }

    // Écouteurs sur les catégories (radio)
    document.querySelectorAll('input[name="category"]').forEach(radio => {
        radio.addEventListener('change', () => {
            updateSmartPricingFeedback();
            updateLegalPermitBadge();
            generateAutoDescription(false);
        });
    });

    // Écouteurs sur la prise électrique (radio)
    document.querySelectorAll('input[name="prise"]').forEach(radio => {
        radio.addEventListener('change', () => {
            generateAutoDescription(false);
        });
    });

    // Écouteurs sur les équipements (checkbox)
    document.querySelectorAll('input[name="equipments"]').forEach(cb => {
        cb.addEventListener('change', () => {
            generateAutoDescription(false);
        });
    });

    // Écouteurs sur les upsells (checkbox)
    document.querySelectorAll('input[name="upsell"]').forEach(cb => {
        cb.addEventListener('change', () => {
            generateAutoDescription(false);
        });
    });
}

async function handlePublish(event) {
    event.preventDefault();
    if (!currentUser) {
        showToast("Vous devez être connecté pour publier.", "error");
        openAuthModal();
        return;
    }

    const submitBtn = event.target.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.7';
    }

    const form = document.getElementById('add-trailer-form');
    const editId = form.dataset.editId;

    const PLACEHOLDER = "https://placehold.co/600x400/f5f5f4/a8a29e?text=Renger";
    let imageUrls = [];

    if (pendingPhotos.length === 0 && !editId) {
        showToast("Ajoutez au moins une photo pour publier votre annonce.", "error");
        if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = '1'; }
        return;
    }

    if (pendingPhotos.length > 0) {
        showToast("Upload des photos en cours…", "info");
    }

    try {
        // Upload séquentiel de toutes les photos dans le bucket trailers-images
        for (let i = 0; i < pendingPhotos.length; i++) {
            const { file } = pendingPhotos[i];
            const fileExt = file.name.split('.').pop().toLowerCase();
            const fileName = `${currentUser.id}/${Date.now()}_${i}.${fileExt}`;

            const { error: uploadError } = await supabaseClient.storage
                .from('trailers-images')
                .upload(fileName, file, { upsert: false });

            if (uploadError) {
                showToast(`Erreur upload photo ${i + 1} : ${uploadError.message}`, "error");
                return;
            }

            const { data: urlData } = supabaseClient.storage
                .from('trailers-images')
                .getPublicUrl(fileName);

            imageUrls.push(urlData.publicUrl);
        }

        // Récupération des équipements
        const equipmentCheckboxes = document.querySelectorAll('input[name="equipments"]:checked');
        const equipments = Array.from(equipmentCheckboxes).map(cb => cb.value);

        // Récupération des upsells
        const upsellCheckboxes = document.querySelectorAll('input[name="upsell"]:checked');
        const upsells = Array.from(upsellCheckboxes).map(cb => cb.value);

        // Récupération de la catégorie (type de remorque)
        const categoryInput = document.querySelector('input[name="category"]:checked');
        const category = categoryInput ? categoryInput.value : 'utilitaire';

        const priceVal = parseInt(document.getElementById('ad-price').value, 10);
        const payloadVal = parseInt(document.getElementById('ad-payload').value, 10);

        let finalDesc = (document.getElementById('ad-desc')?.value || '').trim();
        const isHeavy = (payloadVal > 750) || category === 'cheval' || category === 'voiture';
        const permitMention = isHeavy ? "**Permis BE requis**" : "**Permis B suffisant**";

        // Garantie légale suisse (LCR / OAC) : la mention doit impérativement figurer dans l'annonce
        if (!finalDesc.includes("Permis B suffisant") && !finalDesc.includes("Permis BE requis")) {
            finalDesc += `\n\n⚖️ Réglementation suisse : ${permitMention}`;
        }

        const newTrailer = {
            title: (document.getElementById('ad-title')?.value || '').trim(),
            description: finalDesc,
            price: isNaN(priceVal) || priceVal < 0 ? 0 : priceVal,
            payload: isNaN(payloadVal) || payloadVal < 0 ? 0 : payloadVal,
            socket: document.querySelector('input[name="prise"]:checked')?.value || '7 broches',
            owner_id: currentUser.id,
            equipments: equipments,
            upsells: upsells,
            category: category
        };

        if (imageUrls.length > 0) {
            newTrailer.image_url = imageUrls[0];
            newTrailer.images = imageUrls;
        } else if (!editId) {
            newTrailer.image_url = PLACEHOLDER;
            newTrailer.images = [PLACEHOLDER];
        }

        let error = null;
        if (editId) {
            const res = await supabaseClient.from('trailers').update(newTrailer).eq('id', editId);
            error = res.error;
        } else {
            const res = await supabaseClient.from('trailers').insert([newTrailer]);
            error = res.error;
        }

        if (error) {
            showToast("Erreur BDD : " + error.message, "error");
        } else {
            if (!editId) {
                const modeElement = document.querySelector('input[name="monetization_mode"]:checked');
                if (modeElement && modeElement.value === 'pro') {
                    showToast("✅ Annonce publiée ! Redirection vers Renger PRO...", "success");
                    await handleSubscribePro();
                    return; // On arrête l'exécution pour la redirection
                }
            }

            showToast(editId ? "✅ Annonce modifiée !" : "✅ Annonce publiée !", "success");
            document.getElementById('add-trailer-form').reset();
            delete form.dataset.editId;
            if (submitBtn && submitBtn.dataset.originalText) {
                submitBtn.innerHTML = submitBtn.dataset.originalText;
                delete submitBtn.dataset.originalText;
            }

            hasUserEditedDescription = false;
            updateSmartPricingFeedback();
            updateLegalPermitBadge();
            // Nettoyage des Blob URLs
            pendingPhotos.forEach(p => {
                if (p.objectUrl) URL.revokeObjectURL(p.objectUrl);
            });
            pendingPhotos = [];
            renderPhotoGrid();
            showPage('buyer-page');
            loadTrailers();
        }
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
        }
    }
}


// ==========================================
// CAROUSEL DE LA PAGE DÉTAIL
// ==========================================
let detailCarouselPhotos = [];
let currentCarouselIndex = 0;

function initDetailCarousel(photos) {
    detailCarouselPhotos = (Array.isArray(photos) && photos.length > 0)
        ? photos
        : ["https://images.unsplash.com/photo-1594054972175-39db43232140?q=80&w=600&auto=format&fit=crop"];
    currentCarouselIndex = 0;

    const img = document.getElementById('detail-img');
    const prevBtn = document.getElementById('carousel-prev');
    const nextBtn = document.getElementById('carousel-next');
    const dotsContainer = document.getElementById('carousel-dots');
    const counter = document.getElementById('carousel-counter');

    if (img) img.src = detailCarouselPhotos[0];

    const hasMultiple = detailCarouselPhotos.length > 1;

    if (prevBtn) prevBtn.classList.toggle('hidden', !hasMultiple);
    if (nextBtn) nextBtn.classList.toggle('hidden', !hasMultiple);
    if (counter) {
        counter.classList.toggle('hidden', !hasMultiple);
        counter.textContent = `1 / ${detailCarouselPhotos.length}`;
    }

    if (dotsContainer) {
        dotsContainer.classList.toggle('hidden', !hasMultiple);
        dotsContainer.innerHTML = '';
        if (hasMultiple) {
            detailCarouselPhotos.forEach((_, idx) => {
                const dot = document.createElement('button');
                dot.type = 'button';
                dot.className = `h-2.5 rounded-full transition-all duration-200 ${
                    idx === 0 ? 'w-6 bg-white' : 'w-2.5 bg-white/50 hover:bg-white/80'
                }`;
                dot.onclick = (e) => {
                    e.stopPropagation();
                    goToCarouselSlide(idx);
                };
                dotsContainer.appendChild(dot);
            });
        }
    }
}

function changeCarouselSlide(direction) {
    if (detailCarouselPhotos.length <= 1) return;
    let newIndex = currentCarouselIndex + direction;
    if (newIndex < 0) {
        newIndex = detailCarouselPhotos.length - 1;
    } else if (newIndex >= detailCarouselPhotos.length) {
        newIndex = 0;
    }
    goToCarouselSlide(newIndex);
}

function goToCarouselSlide(index) {
    if (index < 0 || index >= detailCarouselPhotos.length) return;
    currentCarouselIndex = index;

    const img = document.getElementById('detail-img');
    if (img) {
        img.src = detailCarouselPhotos[currentCarouselIndex];
    }

    const counter = document.getElementById('carousel-counter');
    if (counter) {
        counter.textContent = `${currentCarouselIndex + 1} / ${detailCarouselPhotos.length}`;
    }

    const dotsContainer = document.getElementById('carousel-dots');
    if (dotsContainer) {
        const dots = dotsContainer.children;
        for (let i = 0; i < dots.length; i++) {
            if (i === currentCarouselIndex) {
                dots[i].className = 'w-6 h-2.5 rounded-full transition-all duration-200 bg-white';
            } else {
                dots[i].className = 'w-2.5 h-2.5 rounded-full transition-all duration-200 bg-white/50 hover:bg-white/80';
            }
        }
    }
}

// Navigation clavier pour le carousel
document.addEventListener('keydown', (e) => {
    const detailPage = document.getElementById('detail-page');
    if (!detailPage || detailPage.classList.contains('hidden')) return;
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

    if (e.key === 'ArrowLeft') {
        changeCarouselSlide(-1);
    } else if (e.key === 'ArrowRight') {
        changeCarouselSlide(1);
    }
});

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
    const manageSection = document.getElementById('manage-trailer-section');
    if (manageSection) manageSection.classList.add('hidden');

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

/**
 * Génère une carte de réservation pour l'espace locataire.
 */
function createRenterBookingCard(booking, reviewsByBooking, todayStr) {
    const startDate = new Date(booking.start_date);
    const endDate = new Date(booking.end_date);
    const startStr = booking.start_date ? booking.start_date.split('T')[0] : '';
    const endStr = booking.end_date ? booking.end_date.split('T')[0] : '';

    // Badge de statut (texte statique uniquement, zéro donnée utilisateur)
    const statusSpan = document.createElement('span');
    statusSpan.className = 'text-xs font-bold px-2.5 py-1 rounded-md flex-shrink-0';
    if (todayStr >= startStr && todayStr <= endStr) {
        statusSpan.className += ' bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
        statusSpan.textContent = '🔴 En cours';
    } else if (todayStr < startStr) {
        statusSpan.className += ' bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
        statusSpan.textContent = '⏳ À venir';
    } else {
        statusSpan.className += ' bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-300';
        statusSpan.textContent = 'Terminé';
    }

    // Image (attribut .src assigné, pas interpolé dans innerHTML)
    const img = document.createElement('img');
    img.src = booking.trailers?.image_url || 'https://images.unsplash.com/photo-1594054972175-39db43232140?q=80&w=600&auto=format&fit=crop';
    img.className = 'w-20 h-20 object-cover rounded-xl bg-stone-100 dark:bg-stone-700 flex-shrink-0';
    img.alt = '';

    // Titre de la remorque — textContent neutralise toute injection XSS
    const titleEl = document.createElement('h4');
    titleEl.className = 'font-bold text-stone-800 dark:text-white truncate';
    titleEl.textContent = booking.trailers?.title || 'Remorque';

    const titleRow = document.createElement('div');
    titleRow.className = 'flex justify-between items-start mb-1 gap-2';
    titleRow.appendChild(titleEl);
    titleRow.appendChild(statusSpan);

    // Dates (toLocaleDateString retourne une chaîne sûre)
    const datesEl = document.createElement('p');
    datesEl.className = 'text-sm text-stone-500 dark:text-stone-400';
    datesEl.textContent = `Du ${startDate.toLocaleDateString('fr-CH')} au ${endDate.toLocaleDateString('fr-CH')}`;

    // Prix (valeur numérique de la BDD)
    const priceEl = document.createElement('p');
    priceEl.className = 'text-terracotta-600 font-bold mt-2 text-sm';
    priceEl.textContent = `${Number(booking.total_price).toFixed(2)} CHF réglés`;

    const infoDiv = document.createElement('div');
    infoDiv.className = 'flex-1 min-w-0';
    infoDiv.appendChild(titleRow);
    infoDiv.appendChild(datesEl);
    infoDiv.appendChild(priceEl);

    // Actions & Évaluation pour cette réservation
    const actionsRow = document.createElement('div');
    actionsRow.className = 'flex flex-wrap items-center gap-2 mt-3';

    const chatBtn = document.createElement('button');
    chatBtn.type = 'button';
    chatBtn.className = 'text-xs font-bold bg-stone-100 hover:bg-stone-200 dark:bg-stone-700 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-200 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 active:scale-95';
    chatBtn.innerHTML = '<span>💬</span><span>Messagerie & État des lieux</span>';
    chatBtn.onclick = () => openChatForBooking(booking, false);
    actionsRow.appendChild(chatBtn);

    if (booking.trailers) {
        if (reviewsByBooking.has(booking.id)) {
            const rev = reviewsByBooking.get(booking.id);
            const reviewBadge = document.createElement('span');
            reviewBadge.className = 'inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 px-2.5 py-1 rounded-lg';
            reviewBadge.textContent = `⭐ Note ${rev.rating}/5 attribuée`;
            actionsRow.appendChild(reviewBadge);
        } else if (todayStr > endStr) {
            // Bouton pour noter si la location est passée et non encore notée
            const reviewBtn = document.createElement('button');
            reviewBtn.type = 'button';
            reviewBtn.className = 'text-xs font-bold bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 active:scale-95';
            reviewBtn.textContent = '⭐ Donner mon avis';
            reviewBtn.onclick = () => openReviewModal(booking.id, booking.trailers.id, booking.trailers.title);
            actionsRow.appendChild(reviewBtn);
        }
    }
    infoDiv.appendChild(actionsRow);

    const card = document.createElement('div');
    card.className = 'bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 p-5 rounded-2xl shadow-sm flex items-center gap-4';
    card.appendChild(img);
    card.appendChild(infoDiv);
    return card;
}

/**
 * Génère une carte pour l'historique des locations reçues par le propriétaire.
 */
function createSellerRentalHistoryCard(booking, renterProfile, todayStr) {
    const startDate = new Date(booking.start_date);
    const endDate = new Date(booking.end_date);
    const startStr = booking.start_date ? booking.start_date.split('T')[0] : '';
    const endStr = booking.end_date ? booking.end_date.split('T')[0] : '';

    const diffDays = Math.ceil(Math.abs(endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    const baseRental = (booking.trailers && booking.trailers.price) ? (diffDays * Number(booking.trailers.price)) : Number(booking.total_price);
    const netEarnings = (baseRental * 0.80).toFixed(2);

    // Badge statut
    const statusSpan = document.createElement('span');
    statusSpan.className = 'text-xs font-bold px-2.5 py-1 rounded-lg flex-shrink-0';
    if (todayStr >= startStr && todayStr <= endStr) {
        statusSpan.className += ' bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
        statusSpan.textContent = '🔴 En cours';
    } else if (todayStr < startStr) {
        statusSpan.className += ' bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
        statusSpan.textContent = '⏳ À venir';
    } else {
        statusSpan.className += ' bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-300';
        statusSpan.textContent = 'Terminé';
    }

    // Image remorque
    const img = document.createElement('img');
    img.src = booking.trailers?.image_url || 'https://images.unsplash.com/photo-1594054972175-39db43232140?q=80&w=600&auto=format&fit=crop';
    img.className = 'w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl bg-stone-100 dark:bg-stone-700 flex-shrink-0';
    img.alt = '';

    // Titre remorque
    const titleEl = document.createElement('h4');
    titleEl.className = 'font-bold text-stone-800 dark:text-white truncate text-base';
    titleEl.textContent = booking.trailers?.title || 'Remorque';

    // Locataire (Avatar + @username)
    const renterRow = document.createElement('div');
    renterRow.className = 'flex items-center gap-2 mt-1';
    
    if (renterProfile) {
        const avatarEl = renderAvatar(renterProfile, 22);
        const usernameBtn = document.createElement('button');
        usernameBtn.type = 'button';
        usernameBtn.className = 'text-xs font-semibold text-stone-600 dark:text-stone-300 hover:text-terracotta-500 dark:hover:text-terracotta-400 transition truncate max-w-[150px]';
        usernameBtn.textContent = '@' + renterProfile.username;
        usernameBtn.onclick = () => openPublicProfile(renterProfile.username);
        renterRow.appendChild(avatarEl);
        renterRow.appendChild(usernameBtn);
    } else {
        const locataireSpan = document.createElement('span');
        locataireSpan.className = 'text-xs text-stone-400';
        locataireSpan.textContent = '👤 Locataire vérifié';
        renterRow.appendChild(locataireSpan);
    }

    // Dates & durée
    const datesEl = document.createElement('p');
    datesEl.className = 'text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1.5';
    datesEl.textContent = `Du ${startDate.toLocaleDateString('fr-CH')} au ${endDate.toLocaleDateString('fr-CH')} (${diffDays} jour${diffDays > 1 ? 's' : ''})`;

    const chatBtn = document.createElement('button');
    chatBtn.type = 'button';
    chatBtn.className = 'mt-2.5 text-xs font-bold bg-stone-100 hover:bg-stone-200 dark:bg-stone-700 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-200 px-3 py-1.5 rounded-xl transition inline-flex items-center gap-1.5 active:scale-95';
    chatBtn.innerHTML = '<span>💬</span><span>Messagerie & État des lieux</span>';
    chatBtn.onclick = () => openChatForBooking(booking, true);

    const infoDiv = document.createElement('div');
    infoDiv.className = 'flex-1 min-w-0';
    infoDiv.appendChild(titleEl);
    infoDiv.appendChild(renterRow);
    infoDiv.appendChild(datesEl);
    infoDiv.appendChild(chatBtn);

    // Montant net perçu à droite
    const priceDiv = document.createElement('div');
    priceDiv.className = 'text-right flex flex-col items-end justify-center';
    
    const priceAmount = document.createElement('p');
    priceAmount.className = 'font-bold text-base sm:text-lg text-green-600 dark:text-green-400 whitespace-nowrap';
    priceAmount.textContent = `+ ${netEarnings} CHF`;

    const priceSub = document.createElement('p');
    priceSub.className = 'text-[11px] text-stone-400 whitespace-nowrap';
    priceSub.textContent = 'Net perçu (80%)';

    priceDiv.appendChild(priceAmount);
    priceDiv.appendChild(priceSub);

    const card = document.createElement('div');
    card.className = 'bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 p-4 sm:p-5 rounded-2xl shadow-sm flex items-center justify-between gap-4';
    
    const leftContent = document.createElement('div');
    leftContent.className = 'flex items-center gap-4 min-w-0 flex-1';
    leftContent.appendChild(img);
    leftContent.appendChild(infoDiv);

    const rightContent = document.createElement('div');
    rightContent.className = 'flex flex-col items-end gap-2 flex-shrink-0';
    rightContent.appendChild(statusSpan);
    rightContent.appendChild(priceDiv);

    card.appendChild(leftContent);
    card.appendChild(rightContent);

    return card;
}

async function loadProfileData() {
    if (!currentUser) return;
    const today = new Date();
    const todayStr = formatDateToLocalISO(today);

    // Récupération des données
    const { data: myBookings } = await supabaseClient
        .from('bookings')
        .select('*, trailers(*)')
        .eq('renter_id', currentUser.id)
        .eq('status', 'paye')
        .order('start_date', { ascending: false });

    const { data: myTrailersRaw } = await supabaseClient
        .from('trailers')
        .select('*')
        .eq('owner_id', currentUser.id)
        .order('id', { ascending: false });
    const myTrailers = (myTrailersRaw || []).filter(t => t.is_active !== false);

    const { data: sellerBookings } = await supabaseClient
        .from('bookings')
        .select('*, trailers(*)')
        .eq('owner_id', currentUser.id)
        .eq('status', 'paye')
        .order('start_date', { ascending: false });
    cachedSellerBookings = sellerBookings || [];

    // Récupérer les avis déjà déposés par cet utilisateur
    const { data: myReviews } = await supabaseClient
        .from('reviews')
        .select('booking_id, rating')
        .eq('renter_id', currentUser.id);
    const reviewsByBooking = new Map((myReviews || []).map(r => [r.booking_id, r]));

    // ==========================================
    // 1. SECTION LOCATAIRE (Réservations actives vs passées)
    // ==========================================
    const allRenterBookings = myBookings || [];
    const activeBookings = allRenterBookings.filter(b => {
        const endStr = b.end_date ? b.end_date.split('T')[0] : '';
        return todayStr <= endStr;
    }).sort((a, b) => new Date(a.start_date) - new Date(b.start_date)); // Prochaines d'abord

    const pastBookings = allRenterBookings.filter(b => {
        const endStr = b.end_date ? b.end_date.split('T')[0] : '';
        return todayStr > endStr;
    }); // Les plus récentes d'abord

    // 1.1 Réservations actives et à venir
    const activeCountBadge = document.getElementById('buyer-active-count');
    if (activeCountBadge) activeCountBadge.textContent = activeBookings.length;

    const activeList = document.getElementById('buyer-active-bookings-list');
    if (activeList) {
        activeList.innerHTML = '';
        if (activeBookings.length > 0) {
            const activeFragment = document.createDocumentFragment();
            activeBookings.forEach(booking => {
                activeFragment.appendChild(createRenterBookingCard(booking, reviewsByBooking, todayStr));
            });
            activeList.appendChild(activeFragment);
        } else {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'col-span-1 md:col-span-2 bg-stone-50 dark:bg-stone-800/40 border border-stone-200/60 dark:border-stone-700/60 rounded-2xl p-6 text-center';
            emptyMsg.innerHTML = `
                <p class="text-stone-500 dark:text-stone-400 text-sm font-medium mb-2">Vous n'avez aucune location en cours ou à venir.</p>
                <button onclick="showPage('buyer-page')" class="text-xs font-bold text-terracotta-600 hover:text-terracotta-700 dark:text-terracotta-400 hover:underline">🔍 Trouver une remorque disponible</button>
            `;
            activeList.appendChild(emptyMsg);
        }
    }

    // 1.2 Historique des remorques louées (passées)
    const pastCountBadge = document.getElementById('buyer-past-count');
    if (pastCountBadge) pastCountBadge.textContent = pastBookings.length;

    const pastList = document.getElementById('buyer-past-bookings-list');
    if (pastList) {
        pastList.innerHTML = '';
        if (pastBookings.length > 0) {
            const pastFragment = document.createDocumentFragment();
            pastBookings.forEach(booking => {
                pastFragment.appendChild(createRenterBookingCard(booking, reviewsByBooking, todayStr));
            });
            pastList.appendChild(pastFragment);
        } else {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'col-span-1 md:col-span-2 bg-stone-50 dark:bg-stone-800/40 border border-stone-200/60 dark:border-stone-700/60 rounded-2xl p-6 text-center';
            emptyMsg.innerHTML = `
                <p class="text-stone-400 italic text-sm">Aucune location passée enregistrée pour le moment.</p>
            `;
            pastList.appendChild(emptyMsg);
        }
    }

    // ==========================================
    // 2. SECTION PROPRIÉTAIRE (Flotte + Historique des locations)
    // ==========================================
    
    // 2.1 Calcul des revenus mensuels nets et des commissions perdues historiquement
    let monthlyRevenue = 0;
    let totalLostCommission = 0;
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    if (sellerBookings) {
        sellerBookings.forEach(booking => {
            const sDate = new Date(booking.start_date);
            const eDate = new Date(booking.end_date);
            const days = Math.ceil(Math.abs(eDate - sDate) / (1000 * 60 * 60 * 24)) + 1;
            const baseRental = (booking.trailers && booking.trailers.price) ? (days * Number(booking.trailers.price)) : Number(booking.total_price);
            
            // Calculer la commission historique uniquement sur les locations terminées (20%)
            const endStr = booking.end_date ? booking.end_date.split('T')[0] : '';
            if (todayStr > endStr) {
                totalLostCommission += (baseRental * 0.20);
            }

            // Revenu mensuel
            if (sDate.getMonth() === currentMonth && sDate.getFullYear() === currentYear) {
                monthlyRevenue += (baseRental * 0.80);
            }
        });
    }

    // Affichage de la bannière PRO si l'utilisateur n'est pas PRO (on assume que la table profiles a un champ is_pro, ou que par défaut ils ne le sont pas)
    const proBanner = document.getElementById('pro-banner-container');
    const lostCommEl = document.getElementById('lost-commission-amount');
    
    // Pour simplifier l'accès, on vérifie dynamiquement si l'user est pro via une requête rapide
    if (proBanner && lostCommEl && currentUser) {
        supabaseClient.from('profiles').select('is_pro').eq('id', currentUser.id).maybeSingle().then(({ data }) => {
            if (data && data.is_pro) {
                proBanner.classList.add('hidden');
            } else {
                lostCommEl.textContent = totalLostCommission.toFixed(2) + ' CHF';
                proBanner.classList.remove('hidden');
            }
        });
    }

    const revenueElement = document.getElementById('seller-monthly-revenue');
    if (revenueElement) revenueElement.textContent = monthlyRevenue.toFixed(2) + ' CHF';

    // 2.2 État de ma flotte
    const trailersCountBadge = document.getElementById('seller-trailers-count');
    if (trailersCountBadge) {
        const count = myTrailers?.length || 0;
        trailersCountBadge.textContent = `${count} remorque${count > 1 ? 's' : ''}`;
    }

    const sellerList = document.getElementById('seller-trailers-list');
    if (sellerList) {
        sellerList.innerHTML = '';
        if (myTrailers && myTrailers.length > 0) {
            const sellerFragment = document.createDocumentFragment();
            myTrailers.forEach(trailer => {
                const isRentedNow = sellerBookings
                    ? sellerBookings.some(b => {
                        const bStart = b.start_date ? b.start_date.split('T')[0] : '';
                        const bEnd = b.end_date ? b.end_date.split('T')[0] : '';
                        return b.trailer_id === trailer.id && todayStr >= bStart && todayStr <= bEnd;
                    })
                    : false;

                // Badge de statut (texte statique uniquement)
                const badge = document.createElement('span');
                badge.className = 'absolute top-3 left-3 text-white text-xs font-bold px-3 py-1 rounded-lg shadow-sm';
                if (isRentedNow) {
                    badge.className += ' bg-red-500 animate-pulse';
                    badge.textContent = 'En location actuelle';
                } else {
                    badge.className += ' bg-green-500';
                    badge.textContent = 'Disponible';
                }

                // Image
                const img = document.createElement('img');
                img.src = trailer.image_url || 'https://images.unsplash.com/photo-1594054972175-39db43232140?q=80&w=600&auto=format&fit=crop';
                img.className = 'w-full h-full object-cover';
                img.alt = '';

                const imgWrapper = document.createElement('div');
                imgWrapper.className = 'h-32 bg-stone-200 dark:bg-stone-700 relative';
                imgWrapper.appendChild(badge);
                imgWrapper.appendChild(img);

                // Titre — textContent neutralise toute injection XSS
                const titleEl = document.createElement('h4');
                titleEl.className = 'font-bold text-lg mb-1 dark:text-white truncate';
                titleEl.textContent = trailer.title;

                // Prix (valeur numérique de la BDD)
                const priceEl = document.createElement('p');
                priceEl.className = 'text-stone-500 dark:text-stone-400 text-sm mb-4';
                priceEl.textContent = `Génère ${Number(trailer.price).toFixed(2)} CHF / jour`;

                // Extract city
                const city = (trailer.location && trailer.location.includes(',')) ? trailer.location.split(',')[0] : (trailer.location || 'votre région');
                
                const infoDiv = document.createElement('div');
                infoDiv.className = 'p-4 flex flex-col justify-between h-full';
                const textDiv = document.createElement('div');
                textDiv.appendChild(titleEl);
                textDiv.appendChild(priceEl);
                
                const manageBtn = document.createElement('div');
                manageBtn.className = 'w-full mt-2 bg-stone-100 dark:bg-stone-700 group-hover:bg-terracotta-50 dark:group-hover:bg-terracotta-900/40 group-hover:text-terracotta-600 dark:group-hover:text-terracotta-400 text-stone-700 dark:text-stone-200 text-xs font-bold py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm';
                manageBtn.innerHTML = '<span>⚙️</span><span>Gérer l\'annonce (Modifier, Booster…)</span>';
                textDiv.appendChild(manageBtn);
                
                infoDiv.appendChild(textDiv);

                const card = document.createElement('div');
                card.className = 'bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl overflow-hidden shadow-sm relative cursor-pointer hover:border-terracotta-500 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all group';
                card.onclick = (e) => {
                    e.preventDefault();
                    openManageTrailer(trailer, city);
                };
                card.appendChild(imgWrapper);
                card.appendChild(infoDiv);
                sellerFragment.appendChild(card);
            });
            sellerList.appendChild(sellerFragment);
        } else {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'col-span-1 md:col-span-2 bg-stone-50 dark:bg-stone-800/40 border border-stone-200/60 dark:border-stone-700/60 rounded-2xl p-6 text-center';
            emptyMsg.innerHTML = `
                <p class="text-stone-500 dark:text-stone-400 text-sm font-medium mb-2">Vous n'avez pas encore publié d'annonce.</p>
                <button onclick="showPage('seller-page')" class="text-xs font-bold text-terracotta-600 hover:text-terracotta-700 dark:text-terracotta-400 hover:underline">➕ Publier ma première remorque</button>
            `;
            sellerList.appendChild(emptyMsg);
        }
    }

    // 2.3 Historique des locations reçues par le propriétaire
    const historyCountBadge = document.getElementById('seller-history-count');
    if (historyCountBadge) {
        const hCount = sellerBookings?.length || 0;
        historyCountBadge.textContent = `${hCount} location${hCount > 1 ? 's' : ''}`;
    }

    const historyList = document.getElementById('seller-history-list');
    if (historyList) {
        historyList.innerHTML = '';
        if (sellerBookings && sellerBookings.length > 0) {
            // Récupérer les profils des locataires pour afficher leur @username et avatar
            const renterIds = [...new Set(sellerBookings.map(b => b.renter_id).filter(Boolean))];
            let renterProfilesMap = new Map();
            if (renterIds.length > 0) {
                const { data: renterProfiles } = await supabaseClient
                    .from('profiles')
                    .select('id, username, avatar_url')
                    .in('id', renterIds);
                renterProfilesMap = new Map((renterProfiles || []).map(p => [p.id, p]));
            }

            const historyFragment = document.createDocumentFragment();
            sellerBookings.forEach(booking => {
                const renterProfile = renterProfilesMap.get(booking.renter_id) || null;
                historyFragment.appendChild(createSellerRentalHistoryCard(booking, renterProfile, todayStr));
            });
            historyList.appendChild(historyFragment);
        } else {
            const emptyHistoryMsg = document.createElement('div');
            emptyHistoryMsg.className = 'bg-stone-50 dark:bg-stone-800/40 border border-stone-200/60 dark:border-stone-700/60 rounded-2xl p-8 text-center';
            emptyHistoryMsg.innerHTML = `
                <p class="text-stone-500 dark:text-stone-300 font-semibold mb-1">Aucune location effectuée pour l'instant</p>
                <p class="text-xs text-stone-400">Dès qu'un client réservera une de vos remorques, l'historique détaillé et les revenus nets apparaîtront ici.</p>
            `;
            historyList.appendChild(emptyHistoryMsg);
        }
    }
}

// ==========================================
// 10. PROFILS PUBLICS & SETTINGS PROFIL
// ==========================================

// Ouvre la page profil public d'un utilisateur via son username
async function openPublicProfile(username) {
    if (!supabaseClient) return;

    showPage('public-profile-page');

    // Bouton retour : adapte selon le contexte
    const backBtn = document.getElementById('public-profile-back-btn');
    if (backBtn) backBtn.onclick = () => history.length > 1 ? history.back() : showPage('buyer-page');

    // Charger le profil
    const { data: profile, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('username', username)
        .maybeSingle();

    if (error || !profile) {
        showToast("Profil introuvable.", "error");
        showPage('buyer-page');
        return;
    }

    // Charger ses remorques
    const { data: trailers } = await supabaseClient
        .from('trailers')
        .select('*')
        .eq('owner_id', profile.id)
        .eq('is_active', true)
        .order('id', { ascending: false });

    const trailersCount = trailers?.length || 0;
    const badges = computeBadges(profile, trailersCount);

    // --- Remplir l'en-tête ---
    // Avatar
    const avatarContainer = document.getElementById('public-profile-avatar');
    if (avatarContainer) {
        avatarContainer.innerHTML = '';
        avatarContainer.appendChild(renderAvatar(profile, 80));
    }

    // Username
    const usernameEl = document.getElementById('public-profile-username');
    if (usernameEl) usernameEl.textContent = '@' + profile.username;

    // Membre depuis
    const sinceEl = document.getElementById('public-profile-since');
    if (sinceEl) {
        const since = new Date(profile.created_at).toLocaleDateString('fr-CH', { month: 'long', year: 'numeric' });
        sinceEl.textContent = 'Membre depuis ' + since;
    }

    // Badges
    const badgesEl = document.getElementById('public-profile-badges');
    if (badgesEl) {
        badgesEl.innerHTML = '';
        badges.forEach(b => badgesEl.appendChild(renderBadge(b, false)));
    }

    // --- Évaluation globale du propriétaire ---
    const ratingContainer = document.getElementById('public-profile-rating');
    if (ratingContainer) {
        ratingContainer.innerHTML = '';
        const trailerIds = (trailers || []).map(t => t.id);
        if (trailerIds.length > 0) {
            const { data: ownerReviews } = await supabaseClient
                .from('reviews')
                .select('rating')
                .in('trailer_id', trailerIds);

            const count = ownerReviews?.length || 0;
            if (count > 0) {
                const sum = ownerReviews.reduce((acc, r) => acc + r.rating, 0);
                const avg = (sum / count).toFixed(1);
                const stars = renderStarSVGs(avg, "w-5 h-5");
                const textInfo = document.createElement('div');
                textInfo.className = 'flex items-center gap-2 text-sm';
                textInfo.innerHTML = `<span class="font-bold text-stone-900 dark:text-white text-base">${avg} / 5</span> <span class="text-stone-400">(${count} avis au total)</span>`;
                ratingContainer.appendChild(stars);
                ratingContainer.appendChild(textInfo);
            } else {
                ratingContainer.innerHTML = `
                    <span class="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 px-3 py-1 rounded-full">
                        ★ Nouveau propriétaire (aucun avis pour le moment)
                    </span>
                `;
            }
        } else {
            ratingContainer.innerHTML = `
                <span class="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 px-3 py-1 rounded-full">
                    ★ Nouveau propriétaire
                </span>
            `;
        }
    }

    // --- Remorques ---
    const titleEl = document.getElementById('public-profile-trailers-title');
    if (titleEl) {
        titleEl.textContent = trailersCount > 0
            ? `${trailersCount} remorque${trailersCount > 1 ? 's' : ''} en location`
            : 'Aucune remorque pour le moment';
    }

    const grid = document.getElementById('public-profile-trailers');
    if (!grid) return;
    grid.innerHTML = '';

    if (!trailers || trailersCount === 0) {
        const msg = document.createElement('p');
        msg.className = 'col-span-3 text-center text-stone-400 italic py-8';
        msg.textContent = 'Ce membre n\'a pas encore publié d\'annonce.';
        grid.appendChild(msg);
        return;
    }

    const fragment = document.createDocumentFragment();
    trailers.forEach(trailer => {
        const card = document.createElement('div');
        card.className = 'bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 overflow-hidden hover:shadow-md cursor-pointer transition';
        card.onclick = () => openTrailerDetail(trailer);
        const imgUrl = trailer.image_url || 'https://placehold.co/600x400/f5f5f4/a8a29e?text=Renger';
        const cat = CATEGORY_MAP[trailer.category];
        card.innerHTML = `
            <div class="h-40 bg-stone-200 dark:bg-stone-700 relative">
                <img class="public-trailer-img w-full h-full object-cover" alt="">
                <div class="absolute top-3 right-3 bg-white dark:bg-stone-900 px-2 py-1 rounded-lg text-sm font-bold shadow dark:text-white"><span class="safe-price"></span> CHF<span class="text-xs font-normal">/j</span></div>
                ${cat ? `<div class="absolute bottom-3 left-3 bg-black/50 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-lg">${cat.emoji} <span class="safe-cat"></span></div>` : ''}
            </div>
            <div class="p-4">
                <div class="flex justify-between items-start gap-2 mb-3">
                    <h4 class="safe-title font-bold text-base dark:text-white flex-1 truncate"></h4>
                    <div class="trailer-rating-badge flex-shrink-0"></div>
                </div>
                <button class="w-full bg-terracotta-50 dark:bg-stone-700 text-terracotta-600 dark:text-terracotta-400 font-semibold py-2 rounded-xl text-sm">Voir les détails</button>
            </div>
        `;
        card.querySelector('.public-trailer-img').src = imgUrl;
        card.querySelector('.safe-title').textContent = trailer.title;
        card.querySelector('.safe-price').textContent = trailer.price;
        if (cat) card.querySelector('.safe-cat').textContent = cat.label;

        const ratingBadgeSlot = card.querySelector('.trailer-rating-badge');
        if (ratingBadgeSlot) {
            ratingBadgeSlot.appendChild(renderRatingBadge(trailer.rating_avg, trailer.rating_count, false));
        }

        fragment.appendChild(card);
    });
    grid.appendChild(fragment);

    // Mettre à jour l'URL sans recharger la page (pour le partage de lien)
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('user', username);
    history.pushState({ user: username }, '', newUrl.toString());
}

// Charge et affiche le profil dans la page settings
async function loadProfileSettings() {
    if (!supabaseClient || !currentUser) return;

    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

    if (!profile) return;

    // Avatar
    const avatarPreview = document.getElementById('settings-avatar-preview');
    if (avatarPreview) {
        avatarPreview.innerHTML = '';
        avatarPreview.appendChild(renderAvatar(profile, 80));
    }

    // Username
    const usernameInput = document.getElementById('settings-username');
    if (usernameInput) usernameInput.value = profile.username || '';

    // Info cooldown changement username
    const info = document.getElementById('settings-username-info');
    if (info && profile.last_username_change) {
        const lastChange = new Date(profile.last_username_change);
        const nextAllowed = new Date(lastChange.getTime() + 30 * 24 * 60 * 60 * 1000);
        const now = new Date();
        if (now < nextAllowed) {
            if (usernameInput) usernameInput.disabled = true;
            info.textContent = 'Prochain changement possible le ' + nextAllowed.toLocaleDateString('fr-CH');
            info.className = 'text-xs mt-1 text-amber-500';
        } else {
            if (usernameInput) usernameInput.disabled = false;
            info.textContent = 'Vous pouvez modifier votre nom d\'utilisateur (1 fois par mois)';
            info.className = 'text-xs mt-1 text-stone-400';
        }
    } else if (info) {
        info.textContent = 'Vous pouvez modifier votre nom d\'utilisateur (1 fois par mois)';
        info.className = 'text-xs mt-1 text-stone-400';
    }

    // Statut Stripe Connect
    const stripeBadge = document.getElementById('settings-stripe-status-badge');
    const stripeBtnText = document.getElementById('settings-stripe-btn-text');
    if (profile.stripe_account_id) {
        if (stripeBadge) {
            stripeBadge.innerHTML = `<span class="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-xs px-2.5 py-1 rounded-full font-bold inline-flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                COMPTE CONFIGURÉ
            </span>`;
        }
        if (stripeBtnText) {
            stripeBtnText.textContent = "Modifier mes coordonnées bancaires";
        }
    } else {
        if (stripeBadge) {
            stripeBadge.innerHTML = `<span class="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 text-xs px-2.5 py-1 rounded-full font-bold inline-flex">
                À CONFIGURER
            </span>`;
        }
        if (stripeBtnText) {
            stripeBtnText.textContent = "Configurer mes versements sécurisés";
        }
    }
}

// Sauvegarde les modifications de profil (username)
async function handleSaveProfile() {
    if (!supabaseClient || !currentUser) return showToast("Vous devez être connecté.", "error");

    const newUsername = (document.getElementById('settings-username')?.value || '').trim().toLowerCase();
    if (!newUsername) return showToast("Le nom d'utilisateur ne peut pas être vide.", "error");
    if (!validateUsernameFormat(newUsername)) return showToast("Format du nom d'utilisateur invalide.", "error");

    const saveBtn = document.querySelector('button[onclick="handleSaveProfile()"]');
    if (saveBtn) saveBtn.disabled = true;

    try {
        // Récupérer le profil actuel pour vérifier le cooldown
        const { data: profile } = await supabaseClient.from('profiles').select('*').eq('id', currentUser.id).maybeSingle();

        if (profile?.last_username_change) {
            const lastChange = new Date(profile.last_username_change);
            const nextAllowed = new Date(lastChange.getTime() + 30 * 24 * 60 * 60 * 1000);
            if (new Date() < nextAllowed) {
                return showToast("Vous ne pouvez changer votre username qu'une fois par mois.", "error");
            }
        }

        // Vérifier unicité si username a changé
        if (newUsername !== profile?.username) {
            const { data: existing } = await supabaseClient.from('profiles').select('username').eq('username', newUsername).maybeSingle();
            if (existing) return showToast("Ce nom d'utilisateur est déjà pris.", "error");
        }

        const updateData = { username: newUsername };
        if (newUsername !== profile?.username) updateData.last_username_change = new Date().toISOString();

        const { error } = await supabaseClient.from('profiles').update(updateData).eq('id', currentUser.id);
        if (error) return showToast("Erreur : " + error.message, "error");

        showToast("✅ Profil sauvegardé !", "success");
        loadProfileSettings(); // Rafraîchir l'affichage
    } finally {
        if (saveBtn) saveBtn.disabled = false;
    }
}

// Upload de l'avatar vers Supabase Storage
async function handleAvatarUpload(event) {
    if (!supabaseClient || !currentUser) return;
    const file = event.target.files[0];
    if (!file) return;

    // Vérifier taille (max 2 Mo)
    if (file.size > 2 * 1024 * 1024) return showToast("Image trop lourde (max 2 Mo).", "error");

    const ext = file.name.split('.').pop().toLowerCase();
    if (['svg', 'html', 'htm'].includes(ext)) {
        return showToast("L'extension de l'image n'est pas autorisée.", "error");
    }
    
    const isValid = await validateImageMagicBytes(file);
    if (!isValid) {
        return showToast("Le fichier n'est pas une image valide.", "error");
    }

    const filePath = `${currentUser.id}/avatar.${ext}`;

    showToast("Upload en cours...", "info");

    const { error: uploadError } = await supabaseClient.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

    if (uploadError) return showToast("Erreur d'upload : " + uploadError.message, "error");

    // Récupérer l'URL publique
    const { data: urlData } = supabaseClient.storage.from('avatars').getPublicUrl(filePath);
    const avatarUrl = urlData.publicUrl + '?t=' + Date.now(); // Cache-busting

    // Mettre à jour le profil
    await supabaseClient.from('profiles').update({ avatar_url: avatarUrl }).eq('id', currentUser.id);

    // Rafraîchir l'aperçu
    const preview = document.getElementById('settings-avatar-preview');
    if (preview) {
        preview.innerHTML = '';
        preview.appendChild(renderAvatar({ avatar_url: avatarUrl }, 80));
    }
    showToast("✅ Photo de profil mise à jour !", "success");
}

// Mise à jour du mot de passe de l'utilisateur connecté
async function handleChangePassword(event) {
    if (event) event.preventDefault();
    if (!supabaseClient || !currentUser) return showToast("Vous devez être connecté pour modifier votre mot de passe.", "error");

    const newPasswordInput = document.getElementById('settings-new-password');
    const confirmPasswordInput = document.getElementById('settings-confirm-password');
    const submitBtn = document.getElementById('settings-change-password-btn');

    const newPassword = newPasswordInput ? newPasswordInput.value : '';
    const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : '';

    if (!newPassword || newPassword.length < 8) {
        return showToast("Le nouveau mot de passe doit comporter au moins 8 caractères.", "error");
    }

    if (newPassword !== confirmPassword) {
        return showToast("Les deux mots de passe saisis ne correspondent pas.", "error");
    }

    if (submitBtn) submitBtn.disabled = true;

    try {
        const { error } = await supabaseClient.auth.updateUser({
            password: newPassword
        });

        if (error) {
            showToast("Erreur : " + error.message, "error");
        } else {
            showToast("🔒 Mot de passe modifié avec succès !", "success");
            if (newPasswordInput) newPasswordInput.value = '';
            if (confirmPasswordInput) confirmPasswordInput.value = '';
        }
    } catch (err) {
        showToast("Erreur : " + err.message, "error");
    } finally {
        if (submitBtn) submitBtn.disabled = false;
    }
}

// Exports globaux pour la navigation modulaire et les handlers HTML inline
window.openProfile = openProfile;
window.switchProfileTab = switchProfileTab;
window.loadProfileData = loadProfileData;

