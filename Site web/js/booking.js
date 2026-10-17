// ==========================================
// 5. RÉSERVATION, BLOCAGE DATES & PAIEMENT
// ==========================================
/**
 * Échappe une chaîne pour prévenir les failles XSS
 */
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
if (typeof window !== 'undefined') {
    window.escapeHtml = escapeHtml;
}

// ==========================================
// TARIFS PAR DURÉE & DÉGRESSIFS (HELPERS)
// ==========================================
let selectedDurationHours = null;
try {
    if (typeof window !== 'undefined') {
        Object.defineProperty(window, 'selectedDurationHours', {
            get() { return selectedDurationHours; },
            set(v) { selectedDurationHours = v !== null && v !== undefined && v !== '' ? Number(v) : null; },
            configurable: true
        });
    }
} catch (e) {}

function normalizePricingTiers(rawTiers) {
    let parsed = rawTiers;
    if (typeof parsed === 'string') {
        const trimmed = parsed.trim();
        if (!trimmed) return [];
        try {
            parsed = JSON.parse(trimmed);
        } catch (e) {
            return [];
        }
    }
    if (!Array.isArray(parsed)) return [];

    const dedupMap = new Map();
    for (const item of parsed) {
        if (!item || typeof item !== 'object') continue;
        const rawUnit = String(item.unit || '').toLowerCase().trim();
        let unit = null;
        if (rawUnit === 'hour' || rawUnit === 'hours' || rawUnit === 'h' || rawUnit === 'heure' || rawUnit === 'heures') {
            unit = 'hours';
        } else if (rawUnit === 'day' || rawUnit === 'days' || rawUnit === 'j' || rawUnit === 'jour' || rawUnit === 'jours' || rawUnit === 'd') {
            unit = 'days';
        }
        if (!unit) continue;

        const duration = parseInt(item.duration ?? item.value ?? item.count, 10);
        const price = Math.round(Number(item.price) * 100) / 100;
        if (!Number.isFinite(duration) || duration <= 0 || duration > 365) continue;
        if (unit === 'hours' && duration > 72) continue;
        if (!Number.isFinite(price) || price <= 0 || price > 50000) continue;

        const key = `${unit}:${duration}`;
        const existing = dedupMap.get(key);
        if (!existing || price < existing.price) {
            dedupMap.set(key, { unit, duration, price });
        }
    }

    const result = Array.from(dedupMap.values());
    result.sort((a, b) => {
        if (a.unit !== b.unit) return a.unit === 'hours' ? -1 : 1;
        return a.duration - b.duration;
    });
    return result;
}

function getPricingTiersBadgeText(trailer) {
    if (!trailer) return '';
    const tiers = normalizePricingTiers(trailer.pricing_tiers);
    if (tiers.length === 0) return '';
    const basePrice = Number(trailer.price) || Infinity;
    const minTierPrice = Math.min(...tiers.map(t => t.price));
    if (Number.isFinite(minTierPrice) && minTierPrice < basePrice) {
        const priceStr = Number.isInteger(minTierPrice) ? String(minTierPrice) : minTierPrice.toFixed(2);
        return `Dès ${priceStr} CHF • Tarifs dégressifs`;
    }
    return 'Tarifs dégressifs';
}

function formatPricingTierChip(tier) {
    if (!tier || typeof tier !== 'object') return '';
    const dur = parseInt(tier.duration, 10);
    const price = Number(tier.price);
    if (!Number.isFinite(dur) || !Number.isFinite(price)) return '';
    const priceStr = Number.isInteger(price) ? String(price) : price.toFixed(2);
    if (tier.unit === 'hours') {
        return `${dur}h : ${priceStr} CHF`;
    }
    return `${dur} jour${dur > 1 ? 's' : ''} : ${priceStr} CHF`;
}

function formatPricingTiersSummary(rawTiers, maxItems = 4) {
    const tiers = normalizePricingTiers(rawTiers);
    if (tiers.length === 0) return '';
    const visible = tiers.slice(0, maxItems).map(formatPricingTierChip).filter(Boolean);
    if (tiers.length > maxItems) {
        visible.push(`+${tiers.length - maxItems}`);
    }
    return visible.join(' • ');
}

function calculateTieredRentalPrice(trailerOrBasePrice, diffDays = 1, durationHours = null) {
    const isObj = trailerOrBasePrice && typeof trailerOrBasePrice === 'object';
    const baseDailyPrice = Math.max(0, Number(isObj ? trailerOrBasePrice.price : trailerOrBasePrice) || 0);
    const tiers = isObj ? normalizePricingTiers(trailerOrBasePrice.pricing_tiers) : [];
    const safeDays = Math.max(1, parseInt(diffDays, 10) || 1);
    const requestedHours = durationHours !== null && durationHours !== undefined && durationHours !== ''
        ? parseInt(durationHours, 10)
        : null;

    if (safeDays === 1 && requestedHours && requestedHours > 0) {
        const hourTier = tiers.find(t => t.unit === 'hours' && t.duration === requestedHours);
        if (hourTier) {
            const p = Math.round(hourTier.price * 100) / 100;
            return {
                rentalPrice: p,
                label: `Forfait ${hourTier.duration}h × ${hourTier.price} CHF`,
                shortLabel: `${hourTier.duration}h`,
                hasCustomTierApplied: true,
                mode: 'hours',
                durationHours: hourTier.duration,
                durationDays: 1,
                breakdown: [{ count: 1, unit: 'hours', duration: hourTier.duration, unitPrice: hourTier.price, subtotal: p }]
            };
        }
    }

    const dayTiersMap = new Map();
    dayTiersMap.set(1, baseDailyPrice);
    for (const t of tiers) {
        if (t.unit === 'days' && t.duration >= 1 && t.duration <= safeDays) {
            const existing = dayTiersMap.get(t.duration);
            if (existing === undefined || t.price < existing) {
                dayTiersMap.set(t.duration, t.price);
            }
        }
    }

    const hasAnyMultiDayOrCustomDayTier = tiers.some(t => t.unit === 'days' && t.duration <= safeDays && (t.duration > 1 || t.price !== baseDailyPrice));
    if (!hasAnyMultiDayOrCustomDayTier) {
        const linearTotal = Math.round(safeDays * baseDailyPrice * 100) / 100;
        return {
            rentalPrice: linearTotal,
            label: `${safeDays} jour${safeDays > 1 ? 's' : ''} × ${baseDailyPrice} CHF / jour`,
            shortLabel: `${safeDays} jour${safeDays > 1 ? 's' : ''}`,
            hasCustomTierApplied: false,
            mode: 'days',
            durationHours: null,
            durationDays: safeDays,
            breakdown: [{ count: safeDays, unit: 'days', duration: 1, unitPrice: baseDailyPrice, subtotal: linearTotal }]
        };
    }

    const availableDayTiers = Array.from(dayTiersMap.entries())
        .map(([duration, price]) => ({ duration, price }))
        .sort((a, b) => b.duration - a.duration);

    const dp = new Array(safeDays + 1).fill(Infinity);
    const choice = new Array(safeDays + 1).fill(null);
    dp[0] = 0;

    for (let d = 1; d <= safeDays; d++) {
        for (const tier of availableDayTiers) {
            if (tier.duration <= d) {
                const candidate = Math.round((dp[d - tier.duration] + tier.price) * 100) / 100;
                if (candidate < dp[d]) {
                    dp[d] = candidate;
                    choice[d] = tier;
                }
            }
        }
    }

    const countsByDuration = new Map();
    let rem = safeDays;
    while (rem > 0 && choice[rem]) {
        const chosen = choice[rem];
        countsByDuration.set(chosen.duration, {
            tier: chosen,
            count: (countsByDuration.get(chosen.duration)?.count || 0) + 1
        });
        rem -= chosen.duration;
    }

    const breakdown = Array.from(countsByDuration.values())
        .sort((a, b) => b.tier.duration - a.tier.duration)
        .map(({ tier, count }) => ({
            count,
            unit: 'days',
            duration: tier.duration,
            unitPrice: tier.price,
            subtotal: Math.round(count * tier.price * 100) / 100
        }));

    const linearPrice = Math.round(safeDays * baseDailyPrice * 100) / 100;
    const bestPrice = Math.round(dp[safeDays] * 100) / 100;
    const usedNonLinear = breakdown.some(b => b.duration > 1 || b.unitPrice !== baseDailyPrice);

    let label;
    if (!usedNonLinear) {
        label = `${safeDays} jour${safeDays > 1 ? 's' : ''} × ${baseDailyPrice} CHF / jour`;
    } else {
        const parts = breakdown.map(b => {
            if (b.duration === 1) {
                return `${b.count} jour${b.count > 1 ? 's' : ''} × ${b.unitPrice} CHF`;
            }
            if (b.count === 1) {
                return `Forfait ${b.duration} jours (${b.unitPrice} CHF)`;
            }
            return `${b.count} × forfait ${b.duration} jours (${b.unitPrice} CHF)`;
        });
        label = parts.join(' + ');
    }

    return {
        rentalPrice: bestPrice,
        label,
        shortLabel: `${safeDays} jour${safeDays > 1 ? 's' : ''}`,
        hasCustomTierApplied: usedNonLinear || bestPrice !== linearPrice,
        mode: 'days',
        durationHours: null,
        durationDays: safeDays,
        breakdown
    };
}

function renderDetailPricingTiers(trailer) {
    const container = document.getElementById('detail-pricing-tiers');
    const wrapper = document.getElementById('detail-pricing-tiers-wrapper');
    if (!container) return;
    container.innerHTML = '';
    const tiers = normalizePricingTiers(trailer?.pricing_tiers);
    if (tiers.length === 0) {
        if (container.classList) container.classList.add('hidden');
        if (wrapper && wrapper.classList) wrapper.classList.add('hidden');
        return;
    }
    if (container.classList) container.classList.remove('hidden');
    if (wrapper && wrapper.classList) wrapper.classList.remove('hidden');

    tiers.forEach(tier => {
        const chip = document.createElement('span');
        chip.className = 'pricing-tier-detail-chip inline-flex items-center gap-1 bg-white dark:bg-stone-800 border border-terracotta-200 dark:border-stone-700 text-terracotta-700 dark:text-terracotta-400 text-xs font-bold px-2.5 py-1 rounded-lg shadow-2xs';
        chip.textContent = formatPricingTierChip(tier);
        container.appendChild(chip);
    });
}

function renderHourlyTierSelector(trailer, diffDays, isOwnerNow) {
    const selectorBox = document.getElementById('hourly-tier-selector');
    const optionsContainer = document.getElementById('hourly-tier-options');
    if (!selectorBox || !optionsContainer) return;

    const tiers = normalizePricingTiers(trailer?.pricing_tiers);
    const hourTiers = tiers.filter(t => t.unit === 'hours');

    if (isOwnerNow || diffDays !== 1 || hourTiers.length === 0) {
        selectedDurationHours = null;
        if (selectorBox.classList) selectorBox.classList.add('hidden');
        optionsContainer.innerHTML = '';
        return;
    }

    // Validate current selectedDurationHours still exists on this trailer
    if (selectedDurationHours !== null && !hourTiers.some(t => t.duration === Number(selectedDurationHours))) {
        selectedDurationHours = null;
    }

    if (selectorBox.classList) selectorBox.classList.remove('hidden');
    optionsContainer.innerHTML = '';

    // Option 1..N : forfaits horaires
    hourTiers.forEach(tier => {
        const isSelected = Number(selectedDurationHours) === tier.duration;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.setAttribute('data-duration-hours', String(tier.duration));
        btn.className = isSelected
            ? 'hourly-tier-option-btn px-3 py-2 rounded-xl text-xs font-bold border-2 border-terracotta-500 bg-terracotta-500 text-white shadow-sm transition'
            : 'hourly-tier-option-btn px-3 py-2 rounded-xl text-xs font-bold border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:border-terracotta-400 transition';
        btn.textContent = `${tier.duration}h — ${tier.price} CHF`;
        btn.onclick = () => selectBookingHourlyTier(tier.duration);
        optionsContainer.appendChild(btn);
    });

    // Option journée complète (24h / 1 jour)
    const isFullDaySelected = selectedDurationHours === null;
    const dayTier = tiers.find(t => t.unit === 'days' && t.duration === 1);
    const dayPrice = dayTier ? dayTier.price : Number(trailer?.price || 0);
    const fullDayBtn = document.createElement('button');
    fullDayBtn.type = 'button';
    fullDayBtn.setAttribute('data-duration-hours', '');
    fullDayBtn.className = isFullDaySelected
        ? 'hourly-tier-option-btn px-3 py-2 rounded-xl text-xs font-bold border-2 border-terracotta-500 bg-terracotta-500 text-white shadow-sm transition'
        : 'hourly-tier-option-btn px-3 py-2 rounded-xl text-xs font-bold border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:border-terracotta-400 transition';
    fullDayBtn.textContent = `Journée — ${dayPrice} CHF`;
    fullDayBtn.onclick = () => selectBookingHourlyTier(null);
    optionsContainer.appendChild(fullDayBtn);
}

function selectBookingHourlyTier(hours) {
    selectedDurationHours = (hours !== null && hours !== undefined && hours !== '' && Number(hours) > 0)
        ? Number(hours)
        : null;
    if (!currentTrailer || !selectedStartDate || !selectedEndDate) return;
    const utcStart = Date.UTC(selectedStartDate.getFullYear(), selectedStartDate.getMonth(), selectedStartDate.getDate());
    const utcEnd = Date.UTC(selectedEndDate.getFullYear(), selectedEndDate.getMonth(), selectedEndDate.getDate());
    const diffDays = Math.round(Math.abs(utcEnd - utcStart) / (1000 * 60 * 60 * 24)) + 1;
    const isOwnerNow = !!(currentUser && currentTrailer && currentUser.id === currentTrailer.owner_id);
    renderHourlyTierSelector(currentTrailer, diffDays, isOwnerNow);
    updateBookingSummaryUI();
}

function updateBookingSummaryUI() {
    if (!currentTrailer || !selectedStartDate || !selectedEndDate) return;
    const utcStart = Date.UTC(selectedStartDate.getFullYear(), selectedStartDate.getMonth(), selectedStartDate.getDate());
    const utcEnd = Date.UTC(selectedEndDate.getFullYear(), selectedEndDate.getMonth(), selectedEndDate.getDate());
    const diffTime = Math.abs(utcEnd - utcStart);
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const effectiveHours = diffDays === 1 ? selectedDurationHours : null;
    const pricingCalc = calculateTieredRentalPrice(currentTrailer, diffDays, effectiveHours);
    const rentalPrice = pricingCalc.rentalPrice;
    const serviceFee = calculateRengerServiceFee(rentalPrice);
    const totalWithFee = rentalPrice + serviceFee;
    const caution = getTrailerCaution(currentTrailer);

    const daysEl = document.getElementById('total-days');
    if (daysEl) daysEl.innerText = diffDays;
    const pluralEl = document.getElementById('total-days-plural');
    if (pluralEl) pluralEl.innerText = diffDays > 1 ? 's' : '';

    const detailEl = document.getElementById('booking-pricing-detail');
    if (detailEl) {
        if (pricingCalc.hasCustomTierApplied) {
            detailEl.textContent = pricingCalc.label;
            if (detailEl.classList) detailEl.classList.remove('hidden');
        } else {
            detailEl.textContent = '';
            if (detailEl.classList) detailEl.classList.add('hidden');
        }
    }

    const rentalPriceEl = document.getElementById('total-rental-price');
    if (rentalPriceEl) rentalPriceEl.innerText = `${rentalPrice} CHF`;

    const serviceFeeEl = document.getElementById('service-fee-price');
    if (serviceFeeEl) serviceFeeEl.innerText = `${serviceFee.toFixed(2)} CHF`;

    const cautionEl = document.getElementById('caution-amount');
    if (cautionEl) cautionEl.innerText = `${caution} CHF`;

    const cautionExpEl = document.getElementById('caution-explain-amount');
    if (cautionExpEl) cautionExpEl.innerText = `${caution} CHF`;

    const isOwnerNow = !!(currentUser && currentTrailer && currentUser.id === currentTrailer.owner_id);
    const totalPriceEl = document.getElementById('total-price');
    if (totalPriceEl) totalPriceEl.innerText = isOwnerNow ? "0 CHF" : `${totalWithFee.toFixed(2)} CHF`;

    const bookingSummary = document.getElementById('booking-summary');
    if (bookingSummary && bookingSummary.classList) bookingSummary.classList.remove('hidden');
}

if (typeof window !== 'undefined') {
    window.normalizePricingTiers = normalizePricingTiers;
    window.getPricingTiersBadgeText = getPricingTiersBadgeText;
    window.formatPricingTierChip = formatPricingTierChip;
    window.formatPricingTiersSummary = formatPricingTiersSummary;
    window.calculateTieredRentalPrice = calculateTieredRentalPrice;
    window.renderDetailPricingTiers = renderDetailPricingTiers;
    window.renderHourlyTierSelector = renderHourlyTierSelector;
    window.selectBookingHourlyTier = selectBookingHourlyTier;
    window.updateBookingSummaryUI = updateBookingSummaryUI;
}

async function openTrailerDetail(trailer) {
    if (!trailer) return;
    if (typeof logClick === 'function') logClick(trailer.id);
    // MPA : hors de la fiche détail, on navigue vers remorque.html?id=... (la page recharge l'annonce)
    if (!document.getElementById('detail-page')) {
        if (trailer.id) window.location.href = 'remorque.html?id=' + encodeURIComponent(trailer.id);
        return;
    }
    currentTrailer = trailer;
    
    // Increment views_count asynchronously using RPC to bypass RLS for non-owners
    if (trailer && trailer.id) {
        supabaseClient.rpc('increment_views', { trailer_id: trailer.id })
            .then(() => {})
            .catch(e => console.error('Error incrementing views:', e));
    }

    // Reset des dates et de la durée horaire à chaque ouverture pour repartir d'un état propre
    selectedStartDate = null;
    selectedEndDate = null;
    if (typeof selectedDurationHours !== 'undefined') selectedDurationHours = null;
    document.getElementById('detail-title').innerText = trailer.title;
    document.getElementById('detail-price').innerText = trailer.price;
    if (typeof renderDetailPricingTiers === 'function') renderDetailPricingTiers(trailer);
    document.getElementById('detail-socket').innerText = trailer.socket;
    document.getElementById('detail-payload').innerText = trailer.payload + " kg";
    const permitEl = document.getElementById('detail-permit');
    if (permitEl) {
        const payloadNum = parseInt(trailer?.payload, 10) || 0;
        const isBeRequired = (payloadNum > 750) || trailer?.category === 'cheval' || trailer?.category === 'voiture';
        permitEl.textContent = isBeRequired ? 'Permis BE requis' : 'Permis B suffisant';
    }

    // Badges d'état de l'annonce (Boost, Vérifié, Propriétaire)
    const isBoosted = !!(trailer?.is_boosted || (trailer?.boost_end_date && new Date(trailer.boost_end_date) > new Date()));
    const boostBadge = document.getElementById('detail-boost-badge');
    if (boostBadge && boostBadge.classList) {
        if (isBoosted) boostBadge.classList.remove('hidden');
        else boostBadge.classList.add('hidden');
    }
    const isVerified = !!(trailer?.is_verified || trailer?.verified);
    const verifiedBadge = document.getElementById('detail-verified-badge');
    if (verifiedBadge && verifiedBadge.classList) {
        if (isVerified) verifiedBadge.classList.remove('hidden');
        else verifiedBadge.classList.add('hidden');
    }
    const ownerBadge = document.getElementById('detail-owner-badge');
    if (ownerBadge && ownerBadge.classList) {
        if (currentUser && currentUser.id === trailer?.owner_id) ownerBadge.classList.remove('hidden');
        else ownerBadge.classList.add('hidden');
    }

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
            if (!schemaData.offers) {
                schemaData.offers = { "@type": "Offer", "priceCurrency": "CHF", "availability": "https://schema.org/InStock" };
            }
            if (trailer.price) {
                schemaData.offers.price = trailer.price.toString();
            }
            schemaData.offers.url = window.location.href;
            if (trailer.image_url) {
                schemaData.image = trailer.image_url;
            }
            if (trailer.rating_avg && trailer.rating_count) {
                schemaData.aggregateRating = {
                    "@type": "AggregateRating",
                    "ratingValue": Number(trailer.rating_avg).toFixed(1),
                    "reviewCount": trailer.rating_count.toString(),
                    "bestRating": "5",
                    "worstRating": "1"
                };
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
    const hourlySelectorEl = document.getElementById('hourly-tier-selector');
    if (hourlySelectorEl && hourlySelectorEl.classList) hourlySelectorEl.classList.add('hidden');
    const pricingDetailEl = document.getElementById('booking-pricing-detail');
    if (pricingDetailEl && pricingDetailEl.classList) pricingDetailEl.classList.add('hidden');

        // 1. Réinitialisation des zones à chaque clic sur une annonce
    const equipContainer = document.getElementById('detail-equipments');
    const equipTitle = document.getElementById('equipments-title');
    const upsellContainer = document.getElementById('detail-upsells');
    const upsellTitle = document.getElementById('upsells-title');

    if (equipContainer) equipContainer.innerHTML = '';
    if (upsellContainer) upsellContainer.innerHTML = '';
    if (equipTitle) equipTitle.classList.add('hidden');
    if (upsellTitle) upsellTitle.classList.add('hidden');

    const safeEscape = (typeof escapeHtml === 'function') ? escapeHtml : function(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    };

    /// 2. Affichage des équipements (Sécurisé contre les XSS)
    let equipList = trailer.equipments;
    if (typeof equipList === 'string') {
        try { equipList = JSON.parse(equipList); } catch (e) { equipList = equipList.split(',').map(s => s.trim()).filter(Boolean); }
    }
    if (Array.isArray(equipList) && equipList.length > 0) {
        if (equipTitle) equipTitle.classList.remove('hidden');
        equipList.forEach(eq => {
            const span = document.createElement('span');
            span.className = "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 px-3 py-1.5 rounded-lg text-sm font-semibold capitalize inline-flex items-center gap-1.5";
            span.innerHTML = `<svg class="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg><span>${safeEscape(eq)}</span>`;
            if (equipContainer) equipContainer.appendChild(span);
        });
    }

    // 3. Affichage des Upsells (Sécurisé contre les XSS)
    let upsellList = trailer.upsells;
    if (typeof upsellList === 'string') {
        try { upsellList = JSON.parse(upsellList); } catch (e) { upsellList = upsellList.split(',').map(s => s.trim()).filter(Boolean); }
    }
    if (Array.isArray(upsellList) && upsellList.length > 0) {
        if (upsellTitle) upsellTitle.classList.remove('hidden');
        upsellList.forEach(up => {
            let upIconSvg = `<svg class="w-4 h-4 text-terracotta-500 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>`;
            let upText = up;
            let upPrice = "";
            if (up === "livraison") {
                upIconSvg = `<svg class="w-4 h-4 text-terracotta-500 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8h4.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h4"/></svg>`;
                upText = "Livraison";
                upPrice = "+25 CHF";
            }
            if (up === "diable") {
                upIconSvg = `<svg class="w-4 h-4 text-terracotta-500 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>`;
                upText = "Prêt d'un diable";
                upPrice = "+10 CHF/j";
            }

            // Création de la structure ligne par ligne sans innerHTML
            const div = document.createElement('div');
            div.className = "flex justify-between items-center bg-terracotta-50 dark:bg-stone-800 border border-terracotta-100 dark:border-stone-700 p-3 rounded-xl";
            
            const spanTitle = document.createElement('span');
            spanTitle.className = "font-bold text-terracotta-700 dark:text-terracotta-400 capitalize inline-flex items-center gap-1.5";
            spanTitle.innerHTML = `${upIconSvg}<span>${safeEscape(upText)}</span>`;

            const spanPrice = document.createElement('span');
            spanPrice.className = "text-terracotta-600 dark:text-terracotta-400 font-bold text-sm";
            spanPrice.textContent = upPrice;

            div.appendChild(spanTitle);
            div.appendChild(spanPrice);
            if (upsellContainer) upsellContainer.appendChild(div);
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

    const disabledDates = Array.isArray(bookings) ? bookings
        .filter(b => b && b.start_date && b.end_date)
        .map(b => ({
            from: b.start_date,
            to: b.end_date
        })) : [];

    // GESTION DU PROPRIÉTAIRE VS LOCATAIRE
    const isOwner = currentUser && currentUser.id === trailer.owner_id;
    const actionBtn = document.getElementById('action-btn');
    const priceHeader = document.getElementById('booking-header');

    if (isOwner) {
        // Mode Propriétaire
        if (priceHeader) priceHeader.classList.add('hidden');
        if (actionBtn) {
            actionBtn.innerText = "Bloquer ces dates";
            actionBtn.onclick = blockOwnerDates;
            actionBtn.className = "w-full bg-stone-800 hover:bg-stone-900 dark:bg-stone-100 dark:hover:bg-white dark:text-stone-900 text-white font-bold py-4 rounded-2xl shadow-xl transition transform active:scale-95 text-lg mb-4";
        }
    } else {
        // Mode Locataire
        if (priceHeader) priceHeader.classList.remove('hidden');
        if (actionBtn) {
            actionBtn.innerText = "Réserver";
            actionBtn.onclick = submitBooking;
            actionBtn.className = "w-full bg-terracotta-500 hover:bg-terracotta-600 text-white font-bold py-4 rounded-2xl shadow-xl transition transform active:scale-95 text-lg mb-3";
        }
    }

    // Initialisation immédiate des montants de caution pour cette remorque
    const initialCaution = getTrailerCaution(trailer);
    const cautionAmountEl = document.getElementById('caution-amount');
    if (cautionAmountEl) cautionAmountEl.innerText = `${initialCaution} CHF`;
    const cautionExplainEl = document.getElementById('caution-explain-amount');
    if (cautionExplainEl) cautionExplainEl.innerText = `${initialCaution} CHF`;

    if (bookingCalendar && typeof bookingCalendar.destroy === 'function') {
        bookingCalendar.destroy();
    }
    
    if (typeof flatpickr !== 'undefined') {
        const fpLocale = (flatpickr.l10ns && flatpickr.l10ns.fr) ? flatpickr.l10ns.fr : undefined;
        bookingCalendar = flatpickr("#booking-dates", {
            mode: "range",
            minDate: "today",
            locale: fpLocale || "fr",
            disable: disabledDates,
            onClose: function(selectedDates, dateStr, instance) {
                if (selectedDates && selectedDates.length === 1) {
                    instance.setDate([selectedDates[0], selectedDates[0]], true);
                }
            },
            onChange: function(selectedDates) {
                if (!currentTrailer) return;
                if (selectedDates.length === 2) {
                    selectedStartDate = selectedDates[0];
                    selectedEndDate = selectedDates[1];
                    
                    // Normalisation UTC minuit pour immuniser contre les décalages DST (changement d'heure)
                    const utcStart = Date.UTC(selectedStartDate.getFullYear(), selectedStartDate.getMonth(), selectedStartDate.getDate());
                    const utcEnd = Date.UTC(selectedEndDate.getFullYear(), selectedEndDate.getMonth(), selectedEndDate.getDate());
                    const diffTime = Math.abs(utcEnd - utcStart);
                    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1; 
                    const isOwnerNow = !!(currentUser && currentTrailer && currentUser.id === currentTrailer.owner_id) || isOwner;

                    if (typeof renderHourlyTierSelector === 'function') renderHourlyTierSelector(currentTrailer, diffDays, isOwnerNow);
                    if (typeof updateBookingSummaryUI === 'function') updateBookingSummaryUI();
                    updateChatButtonState();
                } else {
                    selectedStartDate = null;
                    selectedEndDate = null;
                    if (typeof selectedDurationHours !== 'undefined') selectedDurationHours = null;
                    const hourlyEl = document.getElementById('hourly-tier-selector');
                    if (hourlyEl && hourlyEl.classList) hourlyEl.classList.add('hidden');
                    const detailEl = document.getElementById('booking-pricing-detail');
                    if (detailEl && detailEl.classList) detailEl.classList.add('hidden');
                    const bookingSummary = document.getElementById('booking-summary');
                    if (bookingSummary) bookingSummary.classList.add('hidden');
                    updateChatButtonState();
                }
            }
        });
        if (typeof window !== 'undefined') {
            window.bookingCalendar = bookingCalendar;
        }
    }

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
    if (selectedStartDate > selectedEndDate) {
        return showToast("La date de fin doit être postérieure à la date de début.", "error");
    }
    const today = new Date();
    const utcToday = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    const utcStart = Date.UTC(selectedStartDate.getFullYear(), selectedStartDate.getMonth(), selectedStartDate.getDate());
    if (utcStart < utcToday) {
        return showToast("La date de début ne peut pas être dans le passé.", "error");
    }

    const actionBtn = document.getElementById('action-btn');
    if (actionBtn) actionBtn.disabled = true;

    const formatISO = (typeof formatDateToLocalISO === 'function')
        ? formatDateToLocalISO
        : (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const newBooking = {
        trailer_id: currentTrailer.id,
        renter_id: currentUser.id,
        owner_id: currentTrailer.owner_id,
        start_date: formatISO(selectedStartDate),
        end_date: formatISO(selectedEndDate),
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
    if (trailer.deposit_amount && !isNaN(parseInt(trailer.deposit_amount, 10)) && parseInt(trailer.deposit_amount, 10) > 0) {
        return parseInt(trailer.deposit_amount, 10);
    }
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
        if (typeof openAuthModal === 'function') openAuthModal();
        return;
    }
    if (!currentTrailer || !currentTrailer.id) {
        return showToast("Remorque introuvable.", "error");
    }
    if (currentUser.id === currentTrailer.owner_id) {
        return showToast("Vous ne pouvez pas louer votre propre remorque.", "error");
    }
    if (!selectedStartDate || !selectedEndDate) {
        return showToast("Veuillez sélectionner vos dates sur le calendrier.", "error");
    }
    if (selectedStartDate > selectedEndDate) {
        return showToast("La date de fin doit être postérieure à la date de début.", "error");
    }
    const today = new Date();
    const utcToday = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    const utcStart = Date.UTC(selectedStartDate.getFullYear(), selectedStartDate.getMonth(), selectedStartDate.getDate());
    if (utcStart < utcToday) {
        return showToast("La date de début ne peut pas être dans le passé.", "error");
    }

    // Calculer les montants détaillés pour la modale (avec normalisation UTC minuit contre les décalages DST)
    const utcEnd = Date.UTC(selectedEndDate.getFullYear(), selectedEndDate.getMonth(), selectedEndDate.getDate());
    const diffTime = Math.abs(utcEnd - utcStart);
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
    const effectiveHours = diffDays === 1 ? selectedDurationHours : null;
    const pricingCalc = calculateTieredRentalPrice(currentTrailer, diffDays, effectiveHours);
    const rentalPrice = pricingCalc.rentalPrice;
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
    if (daysEl) {
        daysEl.textContent = pricingCalc.mode === 'hours'
            ? `${pricingCalc.durationHours}h (1 jour)`
            : `${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    }

    // Lignes séparées : Location, Frais Renger, Caution
    const rentalCalcEl = document.getElementById('confirm-rental-calc');
    if (rentalCalcEl) rentalCalcEl.textContent = pricingCalc.label;

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
    const modal = document.getElementById('booking-confirm-modal');
    if (modal) modal.classList.remove('hidden');
}

function closeBookingConfirmModal() {
    const modal = document.getElementById('booking-confirm-modal');
    if (modal) modal.classList.add('hidden');
}

// Verrou d'exécution pour éviter les doubles réservations Stripe
let isProcessingBooking = false;
try {
    if (typeof window !== 'undefined') {
        Object.defineProperty(window, 'isProcessingBooking', {
            get() { return isProcessingBooking; },
            set(v) { isProcessingBooking = v; },
            configurable: true
        });
    }
} catch (e) {}

// Lance la vraie transaction Stripe (appelée depuis le bouton "Confirmer et payer")
async function processBooking() {
    if (isProcessingBooking) return;
    if (!currentUser) {
        showToast("Vous devez être connecté pour réserver.", "error");
        if (typeof openAuthModal === 'function') openAuthModal();
        return;
    }
    if (currentTrailer && currentUser.id === currentTrailer.owner_id) {
        return showToast("Vous ne pouvez pas louer votre propre remorque.", "error");
    }
    if (!currentTrailer || !currentTrailer.id) {
        return showToast("Remorque introuvable.", "error");
    }
    if (!selectedStartDate || !selectedEndDate) {
        return showToast("Veuillez sélectionner vos dates sur le calendrier.", "error");
    }
    if (selectedStartDate > selectedEndDate) {
        return showToast("La date de fin doit être postérieure à la date de début.", "error");
    }
    const today = new Date();
    const utcToday = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    const utcStart = Date.UTC(selectedStartDate.getFullYear(), selectedStartDate.getMonth(), selectedStartDate.getDate());
    if (utcStart < utcToday) {
        return showToast("La date de début ne peut pas être dans le passé.", "error");
    }

    isProcessingBooking = true;

    try {
        closeBookingConfirmModal();
        if (typeof window !== 'undefined' && window.showStripeLoading) window.showStripeLoading();
        showToast("Création de votre réservation sécurisée...", "info");

        const cautionAmount = getTrailerCaution(currentTrailer);
        const formatISO = (typeof formatDateToLocalISO === 'function')
            ? formatDateToLocalISO
            : (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        const utcEnd = Date.UTC(selectedEndDate.getFullYear(), selectedEndDate.getMonth(), selectedEndDate.getDate());
        const diffDays = Math.round(Math.abs(utcEnd - utcStart) / (1000 * 60 * 60 * 24)) + 1;

        const checkoutPayload = {
            trailerId: currentTrailer.id,
            startDate: formatISO(selectedStartDate),
            endDate: formatISO(selectedEndDate),
            cautionAmount: cautionAmount
        };
        if (diffDays === 1 && selectedDurationHours && Number(selectedDurationHours) > 0) {
            checkoutPayload.durationHours = Number(selectedDurationHours);
        }

        const callEdge = (typeof callEdgeFunction === 'function')
            ? callEdgeFunction
            : (typeof window !== 'undefined' && typeof window.callEdgeFunction === 'function' ? window.callEdgeFunction : null);

        let stripeData;
        if (callEdge) {
            stripeData = await callEdge('stripe-checkout', checkoutPayload);
        } else if (supabaseClient && supabaseClient.functions && typeof supabaseClient.functions.invoke === 'function') {
            const { data, error } = await supabaseClient.functions.invoke('stripe-checkout', {
                body: checkoutPayload
            });
            if (error) throw error;
            stripeData = data;
        } else {
            throw new Error("Fonction d'appel Edge introuvable.");
        }
        
        if (!stripeData) {
            throw new Error("Réponse vide du serveur de paiement.");
        }

        if (stripeData.bookingId) {
            try {
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem('pending_booking_id', stripeData.bookingId);
                }
            } catch (e) {
                console.warn("Impossible d'enregistrer pending_booking_id dans localStorage:", e);
            }
        }

        if (stripeData.url) {
            window.location.href = stripeData.url; 
        } else {
            if (typeof window !== 'undefined' && window.hideStripeLoading) window.hideStripeLoading();
            showToast("Erreur de paiement : " + (stripeData.error || stripeData.message || "Lien de paiement introuvable."), "error");
        }
    } catch (err) {
        if (typeof window !== 'undefined' && window.hideStripeLoading) window.hideStripeLoading();
        showToast("Erreur de réservation : " + err.message, "error");
    } finally {
        isProcessingBooking = false;
    }
}

async function checkPaymentStatus() {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');

    // Lecture du bookingId depuis l'URL (transmis par stripe-checkout Edge Function)
    // ou en fallback depuis localStorage si l'URL ne le contient pas
    let storedBookingId = null;
    try {
        if (typeof localStorage !== 'undefined') {
            storedBookingId = localStorage.getItem('pending_booking_id');
        }
    } catch (e) {}
    const bookingId = urlParams.get('booking_id') || storedBookingId;

    if (paymentStatus === 'success' && bookingId) {
        // Nettoyage immédiat de l'URL et du localStorage
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem('pending_booking_id');
            }
        } catch (e) {}
        try {
            const cleanParams = new URLSearchParams(window.location.search);
            cleanParams.delete('payment');
            cleanParams.delete('booking_id');
            const cleanSearch = cleanParams.toString();
            const cleanUrl = window.location.pathname + (cleanSearch ? `?${cleanSearch}` : '');
            window.history.replaceState({}, document.title, cleanUrl);
        } catch (e) {}

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

            if (booking.status === 'paye' || booking.status === 'paid' || booking.status === 'confirmed') {
                showToast("Réservation confirmée ! Redirection vers vos réservations...", "success");
                setTimeout(async () => {
                    if (typeof openProfile === 'function') {
                        await openProfile();
                    } else if (typeof window !== 'undefined') {
                        window.location.href = 'profil.html';
                    }
                }, 3000);
                return;
            }
        }

        // Délai dépassé : le webhook n'a pas encore répondu
        showToast("Paiement en cours de traitement bancaire. Votre réservation sera confirmée dès validation.", "info");
        setTimeout(async () => {
            if (typeof openProfile === 'function') {
                await openProfile();
            } else if (typeof window !== 'undefined') {
                window.location.href = 'profil.html';
            }
        }, 3000);

    } else if (paymentStatus === 'cancel') {
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem('pending_booking_id');
            }
        } catch (e) {}
        try {
            const cleanParams = new URLSearchParams(window.location.search);
            cleanParams.delete('payment');
            cleanParams.delete('booking_id');
            const cleanSearch = cleanParams.toString();
            const cleanUrl = window.location.pathname + (cleanSearch ? `?${cleanSearch}` : '');
            window.history.replaceState({}, document.title, cleanUrl);
        } catch (e) {}
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

function handleBoostModalBackdrop(event) {
    if (event.target === document.getElementById('boost-modal')) {
        closeBoostModal();
    }
}
window.handleBoostModalBackdrop = handleBoostModalBackdrop;

async function handlePurchaseBoost() {
    if (!currentUser) {
        showToast("Vous devez être connecté.", "error");
        if (typeof openAuthModal === 'function') openAuthModal('login');
        return;
    }
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
        
        if (error) {
            let errorMsg = error.message;
            try {
                if (error.context && typeof error.context.json === 'function') {
                    const errBody = await error.context.json();
                    if (errBody && errBody.error) errorMsg = errBody.error;
                }
            } catch (_) {}
            throw new Error(errorMsg || "Erreur lors de l'initialisation du paiement.");
        }
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
        if (typeof openAuthModal === 'function') openAuthModal('login');
        return;
    }
    try {
        // Prévention des doublons : vérifier si l'utilisateur est déjà PRO
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('is_pro')
            .eq('id', currentUser.id)
            .maybeSingle();

        if (profile?.is_pro) {
            showToast("Vous bénéficiez déjà d'un abonnement Renger PRO actif.", "info");
            handleOpenStripePortal();
            return;
        }

        if (window.showStripeLoading) window.showStripeLoading();
        showToast("Redirection vers le paiement sécurisé...", "info");
        const { data, error } = await supabaseClient.functions.invoke('stripe-pro-checkout', {
            body: { user_id: currentUser.id, plan: plan }
        });

        if (error) {
            let errorMsg = error.message;
            try {
                if (error.context && typeof error.context.json === 'function') {
                    const errBody = await error.context.json();
                    if (errBody && errBody.error) errorMsg = errBody.error;
                }
            } catch (_) {}
            if (window.hideStripeLoading) window.hideStripeLoading();
            throw new Error(errorMsg || "Erreur lors de l'initialisation de l'abonnement.");
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

async function handleOpenStripePortal() {
    if (!currentUser) {
        showToast("Vous devez être connecté.", "error");
        if (typeof openAuthModal === 'function') openAuthModal('login');
        return;
    }
    try {
        if (window.showStripeLoading) window.showStripeLoading();
        showToast("Ouverture de votre espace abonnement...", "info");
        const { data, error } = await supabaseClient.functions.invoke('stripe-portal');

        if (error) {
            let errorMsg = error.message;
            let unpacked = false;
            const unpackedStatus = error.context?.status || error.status || null;
            try {
                if (error.context && typeof error.context.json === 'function') {
                    const errorBody = await error.context.json();
                    if (errorBody) {
                        if (errorBody.error) {
                            errorMsg = errorBody.error;
                            unpacked = true;
                        } else if (errorBody.message) {
                            errorMsg = errorBody.message;
                            unpacked = true;
                        }
                    }
                }
            } catch (_) {}
            if (window.hideStripeLoading) window.hideStripeLoading();

            const isDeployError = (
                error.name === 'FunctionsFetchError' ||
                error.name === 'FunctionsRelayError' ||
                unpackedStatus === 404 ||
                error.status === 404 ||
                (error.context && error.context.status === 404) ||
                (typeof errorMsg === 'string' && (
                    errorMsg.includes('Failed to send a request') ||
                    errorMsg.includes('FunctionsFetchError') ||
                    errorMsg.includes('Function not found') ||
                    errorMsg.includes('not found') ||
                    errorMsg.includes('404')
                )) ||
                (error.message && (
                    error.message.includes('Failed to send a request') ||
                    error.message.includes('FunctionsFetchError') ||
                    error.message.includes('Function not found') ||
                    error.message.includes('not found') ||
                    error.message.includes('404') ||
                    (error.message.includes('non-2xx') && (unpackedStatus === 404 || !unpacked))
                ))
            );

            if (isDeployError) {
                errorMsg = "Le portail Stripe n'est pas encore déployé sur Supabase. Veuillez déployer la fonction stripe-portal depuis votre tableau de bord Supabase.";
            }

            throw new Error(errorMsg || "Impossible d'accéder au portail de facturation.");
        }
        if (data && data.url) {
            window.location.href = data.url;
        } else {
            if (window.hideStripeLoading) window.hideStripeLoading();
            showToast("Impossible d'ouvrir le portail de facturation.", "error");
        }
    } catch (err) {
        if (window.hideStripeLoading) window.hideStripeLoading();
        console.error("Erreur portail Stripe:", err);
        let errorMsg = err.message || "";
        if (
            err.name === 'FunctionsFetchError' ||
            err.name === 'FunctionsRelayError' ||
            err.status === 404 ||
            (err.context && err.context.status === 404) ||
            errorMsg.includes('Failed to send a request') ||
            errorMsg.includes('FunctionsFetchError') ||
            errorMsg.includes('Function not found') ||
            errorMsg.includes('not found') ||
            errorMsg.includes('404') ||
            errorMsg.includes('non-2xx')
        ) {
            errorMsg = "Le portail Stripe n'est pas encore déployé sur Supabase. Veuillez déployer la fonction stripe-portal depuis votre tableau de bord Supabase.";
        }
        showToast(errorMsg || "Erreur lors de l'accès au portail.", "error");
    }
}
window.handleOpenStripePortal = handleOpenStripePortal;

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
                if (b.trailer_id === trailer.id && (b.status === 'paye' || b.status === 'paid' || b.status === 'confirmed') && bEnd < todayStr) {
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
                <p class="text-sm text-stone-500 dark:text-stone-400">Paiement sécurisé en cours de chargement...</p>
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
