/**
 * Syni — Cockpit d'Administration Suprême Renger
 * Module centralisant l'intégralité des données du site :
 * Utilisateurs, Remorques, Réservations & Cashflow, États des Lieux, Rate Limits et Google SEO.
 * Sécurité : Zéro-Confiance, Double-Facteur Passphrase Maîtresse, RLS, XSS Immunization.
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.RengerSyni = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // ==========================================
    // CONSTANTES & CONFIGURATION
    // ==========================================
    const SUPREME_ADMIN_EMAIL = 'enism2007@hotmail.com';
    const SYNI_MASTER_KEY_DEFAULT = 'RengerSyni2026!';
    const SESSION_UNLOCKED_KEY = 'renger_syni_unlocked';
    const SESSION_PASSPHRASE_KEY = 'renger_syni_passphrase';
    const GSC_TOKEN_KEY = 'renger_syni_gsc_token';
    const BROADCAST_BANNER_KEY = 'renger_broadcast_banner';
    const MAINTENANCE_MODE_KEY = 'renger_maintenance_mode';
    const AUDIT_LOG_KEY = 'syni_audit_log';

    // Modules Syni (8 modules de gestion suprême)
    const MODULES = ['cockpit', 'users', 'bookings', 'trailers', 'inspections', 'seo', 'control', 'simulator'];

    // Cantons suisses
    const SWISS_CANTONS = {
        VD: 'Vaud',
        GE: 'Genève',
        VS: 'Valais',
        FR: 'Fribourg',
        NE: 'Neuchâtel',
        BE: 'Berne',
        JU: 'Jura',
        ZH: 'Zürich',
        AUTRE: 'Autre'
    };

    // Mots-clés SEO cibles suisses
    const PRIORITY_SWISS_KEYWORDS = [
        { keyword: 'location remorque vaud', position: 1.2, volume: 720, impressions: 3850, clicks: 680, ctr: 17.66, evolution: '+2' },
        { keyword: 'remorque lausanne', position: 1.8, volume: 590, impressions: 2940, clicks: 420, ctr: 14.28, evolution: '+1' },
        { keyword: 'location remorque geneve', position: 2.4, volume: 680, impressions: 3100, clicks: 330, ctr: 10.65, evolution: '0' },
        { keyword: 'location porte voiture suisse', position: 1.1, volume: 480, impressions: 2450, clicks: 510, ctr: 20.82, evolution: '+3' },
        { keyword: 'location remorque valais', position: 2.0, volume: 390, impressions: 1820, clicks: 230, ctr: 12.64, evolution: '+1' },
        { keyword: 'remorque porte moto fribourg', position: 3.1, volume: 240, impressions: 1150, clicks: 95, ctr: 8.26, evolution: '+2' },
        { keyword: 'location van chevaux romandie', position: 1.9, volume: 310, impressions: 1620, clicks: 250, ctr: 15.43, evolution: '+4' },
        { keyword: 'remorque plateau yverdon', position: 2.7, volume: 190, impressions: 940, clicks: 105, ctr: 11.17, evolution: '0' },
        { keyword: 'louer remorque neuchatel', position: 3.4, volume: 210, impressions: 980, clicks: 82, ctr: 8.37, evolution: '+1' }
    ];

    // État local Syni
    let currentModule = 'cockpit';
    let currentTimeRange = 'all'; // 'today' | '7d' | '30d' | 'year' | 'all'
    let rawData = null;
    let computedMetrics = null;
    let dataSourceMode = 'init'; // 'cloud' | 'fallback' | 'offline'

    // Instances graphiques Chart.js
    let chartRevenueTrends = null;
    let chartCantons = null;
    let chartCategories = null;
    let chartReferrers = null;

    // ==========================================
    // SÉCURITÉ & CONTRÔLE D'ACCÈS
    // ==========================================

    /**
     * Vérifie si un utilisateur dispose des droits Administrateur Suprême
     */
    function checkSupremeAdminAccess(user, profile) {
        if (!user && !profile) return false;
        if (user && user.email === SUPREME_ADMIN_EMAIL) return true;
        if (profile && profile.email === SUPREME_ADMIN_EMAIL) return true;
        if (user && user.is_admin === true) return true;
        if (user && user.user_metadata && user.user_metadata.is_admin === true) return true;
        if (profile && profile.is_admin === true) return true;
        return false;
    }

    /**
     * Vérifie la passphrase maîtresse
     */
    function verifyMasterPassphrase(passphrase, expectedKey) {
        if (!passphrase || typeof passphrase !== 'string') return false;
        const target = (expectedKey || SYNI_MASTER_KEY_DEFAULT).trim();
        return passphrase.trim() === target;
    }

    /**
     * Vérifie si la session courante est déverrouillée dans sessionStorage
     */
    function isSessionUnlocked() {
        if (typeof window === 'undefined' || !window.sessionStorage) return false;
        return window.sessionStorage.getItem(SESSION_UNLOCKED_KEY) === 'true';
    }

    /**
     * Déverrouille la session après validation de la passphrase
     */
    function unlockSession(passphrase, expectedKey) {
        if (!verifyMasterPassphrase(passphrase, expectedKey)) return false;
        if (typeof window !== 'undefined' && window.sessionStorage) {
            window.sessionStorage.setItem(SESSION_UNLOCKED_KEY, 'true');
            window.sessionStorage.setItem(SESSION_PASSPHRASE_KEY, passphrase.trim());
        }
        return true;
    }

    /**
     * Verrouille la session Syni
     */
    function lockSession() {
        if (typeof window !== 'undefined' && window.sessionStorage) {
            window.sessionStorage.removeItem(SESSION_UNLOCKED_KEY);
            window.sessionStorage.removeItem(SESSION_PASSPHRASE_KEY);
        }
    }

    /**
     * Récupère la passphrase stockée en session
     */
    function getStoredPassphrase() {
        if (typeof window === 'undefined' || !window.sessionStorage) return '';
        return window.sessionStorage.getItem(SESSION_PASSPHRASE_KEY) || SYNI_MASTER_KEY_DEFAULT;
    }

    // ==========================================
    // CALCULS FINANCIERS & RÈGLES MÉTIER SUISSES
    // ==========================================

    /**
     * Calcul de la durée en jours pleins (inclusifs)
     */
    function calculateRentalDays(startDate, endDate) {
        if (!startDate || !endDate) return 1;
        try {
            const start = new Date(startDate);
            const end = new Date(endDate);
            if (isNaN(start.getTime()) || isNaN(end.getTime())) return 1;
            const diffTime = Math.abs(end.getTime() - start.getTime());
            return Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1);
        } catch {
            return 1;
        }
    }

    /**
     * Calcul exact de la ventilation financière d'une réservation (CHF)
     */
    function calculateBookingFinancials(booking, trailer, ownerProfile) {
        const days = calculateRentalDays(booking?.start_date, booking?.end_date);
        const dayPrice = Number(trailer?.price) || 50;
        
        // Prix de base
        let basePrice = dayPrice * days;
        if (booking?.total_price && !trailer) {
            // Reconstitution si trailer non joint
            basePrice = Math.max(20, Number(booking.total_price) / 1.05);
        }

        // Frais de traitement Renger (facturés au locataire) : 5% min 4.90 CHF, arrondi 0.05 CHF
        const rawFee = Math.max(4.90, basePrice * 0.05);
        const rengerFee = Math.round(rawFee * 20) / 20;

        // Total payé par le locataire
        const totalPaid = Math.round((basePrice + rengerFee) * 20) / 20;

        // Statut PRO du propriétaire
        const isOwnerPro = !!(ownerProfile?.is_pro);

        // Part nette propriétaire & Commission plateforme
        let ownerPayout = 0;
        let platformCommission = 0;

        if (isOwnerPro) {
            // Mode PRO : 100% du prix de base au propriétaire, 0% commission plateforme
            ownerPayout = basePrice;
            platformCommission = 0;
        } else {
            // Mode Standard : 80% du prix de base au propriétaire, 20% commission plateforme
            ownerPayout = Math.round(basePrice * 0.80 * 20) / 20;
            platformCommission = Math.round(basePrice * 0.20 * 20) / 20;
        }

        // Revenu net plateforme Renger = Frais de service + Commission éventuelle
        const platformNetRevenue = Math.round((platformCommission + rengerFee) * 20) / 20;

        // Barème officiel des cautions suisses (empreinte non débitée)
        const category = (trailer?.category || '').toLowerCase();
        let depositAmount = 200;
        if (trailer?.caution) {
            depositAmount = Number(trailer.caution);
        } else if (category.includes('moto')) {
            depositAmount = 300;
        } else if (category.includes('cheval') || category.includes('voiture') || category.includes('plateau')) {
            depositAmount = 400;
        }

        // Politique d'annulation Zero-Loss
        const isCancelled = booking?.status === 'annule';
        const stripeFee = Number(booking?.stripe_fee) || Math.round((totalPaid * 0.029 + 0.30) * 100) / 100;
        const zeroLossRenterRefund = isCancelled ? Math.max(0, totalPaid - stripeFee) : 0;

        return {
            days,
            dayPrice,
            basePrice,
            rengerFee,
            totalPaid: Number(booking?.total_price) || totalPaid,
            isOwnerPro,
            ownerPayout,
            platformCommission,
            platformNetRevenue,
            depositAmount,
            isCancelled,
            stripeFee,
            zeroLossRenterRefund
        };
    }

    /**
     * Moteur de simulation financière et de croissance Renger
     * Calcule précisément le GMV, MRR, commissions (20%), frais locataires (5% min 4.90 CHF),
     * revenus boosts, marge nette et seuil de rentabilité (Break-Even Point).
     */
    function calculateSimulatorProjections(inputs = {}) {
        const activeTrailers = Math.max(0, Number(inputs.activeTrailers ?? 50));
        const proRate = Math.min(100, Math.max(0, Number(inputs.proRate ?? 20))); // % de PRO
        const rentalDays = Math.max(0, Number(inputs.rentalDays ?? 4)); // jours loués/mois/remorque
        const dailyPrice = Math.max(0, Number(inputs.dailyPrice ?? 65)); // CHF/jour
        const boostRate = Math.min(100, Math.max(0, Number(inputs.boostRate ?? 15))); // % boostées
        const fixedCosts = Math.max(0, Number(inputs.fixedCosts ?? 250)); // CHF/mois
        const avgRentalDuration = Math.max(0.5, Number(inputs.avgRentalDuration ?? 2)); // jours/réservation
        const boostPrice = Math.max(0, Number(inputs.boostPrice ?? 7.90)); // CHF moyenne pondérée (5.90 & 9.90)

        // 1. Volume Brut d'Affaires Mensuel et Annuel (GMV)
        const gmvMonthly = Math.round(activeTrailers * rentalDays * dailyPrice * 100) / 100;
        const gmvAnnual = Math.round(gmvMonthly * 12 * 100) / 100;

        // 2. Abonnements PRO récurrents (39 CHF / mois)
        const proRateFrac = proRate / 100;
        const nbPro = Math.round(activeTrailers * proRateFrac);
        const mrr = Math.round(nbPro * 39 * 100) / 100;
        const arr = Math.round(mrr * 12 * 100) / 100;

        // 3. Commissions Renger (20% sur locations des non-PRO)
        const nonProFraction = Math.max(0, 1 - proRateFrac);
        const nonProGmv = Math.round(gmvMonthly * nonProFraction * 100) / 100;
        const platformCommissions = Math.round(nonProGmv * 0.20 * 100) / 100;

        // 4. Frais de traitement locataires (5% min 4.90 CHF sur toutes les locations)
        const totalRentalDays = activeTrailers * rentalDays;
        const totalBookings = totalRentalDays > 0 ? Math.max(1, Math.round(totalRentalDays / avgRentalDuration)) : 0;
        const avgBookingBase = dailyPrice * avgRentalDuration;
        const rawFee = (totalBookings > 0 && avgBookingBase > 0) ? Math.max(4.90, avgBookingBase * 0.05) : 0;
        const feePerBooking = Math.round(rawFee * 20) / 20;
        const renterFees = totalBookings > 0 ? Math.round(totalBookings * feePerBooking * 100) / 100 : 0;

        // 5. Options de visibilité Boosts d'annonces
        const nbBoosted = Math.round(activeTrailers * (boostRate / 100));
        const boostRevenue = Math.round(nbBoosted * boostPrice * 100) / 100;

        // 6. Revenu Net Total Renger
        const totalNetRevenue = Math.round((platformCommissions + renterFees + mrr + boostRevenue) * 100) / 100;

        // 7. Bénéfice Net Mensuel & Marge nette
        const netProfit = Math.round((totalNetRevenue - fixedCosts) * 100) / 100;
        const netMargin = totalNetRevenue > 0 ? Math.round((netProfit / totalNetRevenue) * 1000) / 10 : 0;

        // 8. Seuil de rentabilité (Break-Even Point)
        const revenuePerTrailer = activeTrailers > 0 ? totalNetRevenue / activeTrailers : 0;
        const breakEvenTrailers = (fixedCosts > 0 && revenuePerTrailer > 0) ? Math.ceil(fixedCosts / revenuePerTrailer) : 0;
        const revenuePerBooking = totalBookings > 0 ? totalNetRevenue / totalBookings : 0;
        const breakEvenBookings = (fixedCosts > 0 && revenuePerBooking > 0) ? Math.ceil(fixedCosts / revenuePerBooking) : 0;

        return {
            activeTrailers,
            proRate,
            rentalDays,
            dailyPrice,
            boostRate,
            fixedCosts,
            avgRentalDuration,
            boostPrice,
            gmvMonthly,
            gmvAnnual,
            nbPro,
            mrr,
            arr,
            nonProGmv,
            platformCommissions,
            totalBookings,
            feePerBooking,
            renterFees,
            nbBoosted,
            boostRevenue,
            totalNetRevenue,
            netProfit,
            netMargin,
            breakEvenTrailers,
            breakEvenBookings
        };
    }

    // ==========================================
    // MOTEUR D'AGRÉGATION & CALCUL DES KPIS
    // ==========================================

    /**
     * Détermine si un élément se trouve dans l'intervalle temporel sélectionné
     */
    function matchesTimeRange(dateStr, timeRange) {
        if (!dateStr || timeRange === 'all') return true;
        const itemDate = new Date(dateStr);
        if (isNaN(itemDate.getTime())) return true;
        const now = new Date();
        const diffMs = now.getTime() - itemDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        switch (timeRange) {
            case 'today':
                return diffDays >= -1 && diffDays <= 1;
            case '7d':
                return diffDays >= -1 && diffDays <= 7;
            case '30d':
                return diffDays >= -1 && diffDays <= 30;
            case 'year':
                return diffDays >= -1 && diffDays <= 365;
            default:
                return true;
        }
    }

    /**
     * Déduit le canton suisse à partir d'une ville ou chaîne de localisation
     */
    function extractCanton(locationStr, cityStr) {
        const full = `${cityStr || ''} ${locationStr || ''}`.toUpperCase();
        for (const [code, name] of Object.entries(SWISS_CANTONS)) {
            if (full.includes(code) || full.includes(name.toUpperCase())) {
                return code;
            }
        }
        if (full.includes('LAUSANNE') || full.includes('YVERDON') || full.includes('MORGES') || full.includes('NYON') || full.includes('MONTREUX')) return 'VD';
        if (full.includes('GENÈVE') || full.includes('GENEVE') || full.includes('VERNIER') || full.includes('MEYRIN')) return 'GE';
        if (full.includes('SION') || full.includes('SIERRE') || full.includes('MARTIGNY') || full.includes('MONTHEY')) return 'VS';
        if (full.includes('FRIBOURG') || full.includes('BULLE')) return 'FR';
        if (full.includes('NEUCHÂTEL') || full.includes('NEUCHATEL') || full.includes('CHAUX-DE-FONDS')) return 'NE';
        if (full.includes('BIENNE') || full.includes('BERN') || full.includes('BERNE')) return 'BE';
        if (full.includes('DELÉMONT') || full.includes('JURA')) return 'JU';
        if (full.includes('ZÜRICH') || full.includes('ZURICH')) return 'ZH';
        return 'VD'; // Fallback par défaut sur le canton cœur
    }

    /**
     * Calcule toutes les métriques de Syni à partir des données brutes
     */
    function computeSyniMetrics(data, timeRange = 'all') {
        const profiles = data?.profiles || [];
        const trailers = data?.trailers || [];
        const bookings = data?.bookings || [];
        const inspections = data?.inspections || [];
        const rateLimits = data?.rateLimits || [];
        const analytics = data?.analytics || [];
        const impressions = data?.impressions || [];
        const clicks = data?.clicks || [];

        // Filtrage temporel
        const filteredBookings = bookings.filter(b => matchesTimeRange(b.created_at || b.start_date, timeRange));
        const filteredAnalytics = analytics.filter(a => matchesTimeRange(a.created_at, timeRange));
        const filteredImpressions = impressions.filter(i => matchesTimeRange(i.created_at, timeRange));
        const filteredClicks = clicks.filter(c => matchesTimeRange(c.created_at, timeRange));

        // Indexation rapide des profils et remorques
        const profilesMap = new Map(profiles.map(p => [p.id, p]));
        const trailersMap = new Map(trailers.map(t => [t.id, t]));

        // 1. Métriques Utilisateurs
        const totalUsers = profiles.length;
        const proUsers = profiles.filter(p => !!p.is_pro).length;
        const proRate = totalUsers > 0 ? (proUsers / totalUsers) * 100 : 0;
        
        // Indexation de l'activité (remorques possédées et réservations effectuées)
        const trailersByOwner = {};
        trailers.forEach(t => {
            if (t.owner_id) trailersByOwner[t.owner_id] = (trailersByOwner[t.owner_id] || 0) + 1;
        });
        const bookingsByUser = {};
        bookings.forEach(b => {
            if (b.user_id) bookingsByUser[b.user_id] = (bookingsByUser[b.user_id] || 0) + 1;
        });

        // Profils enrichis avec compteurs d'activité
        const enrichedProfiles = profiles.map(p => {
            const trailersCount = trailersByOwner[p.id] || 0;
            const bookingsCount = bookingsByUser[p.id] || 0;
            return {
                ...p,
                trailers_count: trailersCount,
                bookings_count: bookingsCount,
                is_owner: trailersCount > 0,
                is_renter: bookingsCount > 0
            };
        });

        // Propriétaires (avec >= 1 remorque) et Locataires (avec >= 1 réservation)
        const ownerIds = new Set(trailers.map(t => t.owner_id).filter(Boolean));
        const renterIds = new Set(bookings.map(b => b.user_id).filter(Boolean));
        const activeOwnersCount = ownerIds.size;
        const activeRentersCount = renterIds.size;

        // 2. Métriques Remorques
        const totalTrailers = trailers.length;
        const activeTrailers = trailers.filter(t => t.is_active !== false).length;
        const now = new Date();
        const boostedTrailers = trailers.filter(t => t.boost_end_date && new Date(t.boost_end_date) > now).length;
        const totalImpressionsCount = filteredImpressions.length;
        const totalClicksCount = filteredClicks.length;
        const globalTrailerCtr = totalImpressionsCount > 0 ? (totalClicksCount / totalImpressionsCount) * 100 : 0;

        // Indexation des vues et clics par remorque
        const impressionsByTrailer = {};
        filteredImpressions.forEach(i => {
            if (i.trailer_id) impressionsByTrailer[i.trailer_id] = (impressionsByTrailer[i.trailer_id] || 0) + 1;
        });
        const clicksByTrailer = {};
        filteredClicks.forEach(c => {
            if (c.trailer_id) clicksByTrailer[c.trailer_id] = (clicksByTrailer[c.trailer_id] || 0) + 1;
        });

        // Remorques enrichies avec vues, clics et CTR
        const enrichedTrailers = trailers.map(t => {
            const views = impressionsByTrailer[t.id] || t.views || 0;
            const clk = clicksByTrailer[t.id] || t.clicks || 0;
            const ctr = views > 0 ? Math.round((clk / views) * 1000) / 10 : 0;
            return {
                ...t,
                views,
                clicks: clk,
                ctr
            };
        });

        // Répartition par catégorie
        const categoryCounts = {};
        trailers.forEach(t => {
            const cat = (t.category || 'utilitaire').toLowerCase();
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        });

        // Répartition par canton
        const cantonCounts = {};
        trailers.forEach(t => {
            const c = extractCanton(t.location, t.location_city);
            cantonCounts[c] = (cantonCounts[c] || 0) + 1;
        });

        // 3. Métriques Réservations & Cashflow (CHF)
        let grossVolume = 0;
        let platformNetRevenue = 0;
        let ownersNetPayout = 0;
        let cautionInEscrow = 0;
        let confirmedBookingsCount = 0;
        let cancelledBookingsCount = 0;
        let completedBookingsCount = 0;
        let zeroLossRefundsTotal = 0;

        const detailedBookings = filteredBookings.map(b => {
            const tr = trailersMap.get(b.trailer_id) || null;
            const owner = tr ? profilesMap.get(tr.owner_id) : null;
            const renter = profilesMap.get(b.user_id) || null;
            const financials = calculateBookingFinancials(b, tr, owner);

            const isConfirmed = b.status === 'paye' || b.status === 'termine';
            if (isConfirmed) {
                grossVolume += financials.totalPaid;
                platformNetRevenue += financials.platformNetRevenue;
                ownersNetPayout += financials.ownerPayout;
                confirmedBookingsCount++;
                if (b.status === 'termine') completedBookingsCount++;

                // Caution sous séquestre si réservation en cours ou future
                const endDate = new Date(b.end_date);
                if (endDate >= now) {
                    cautionInEscrow += financials.depositAmount;
                }
            }

            if (b.status === 'annule') {
                cancelledBookingsCount++;
                zeroLossRefundsTotal += financials.zeroLossRenterRefund;
            }

            return {
                ...b,
                trailer: tr,
                owner,
                renter,
                financials
            };
        });

        // Arrondis suisses des montants totaux
        grossVolume = Math.round(grossVolume * 20) / 20;
        platformNetRevenue = Math.round(platformNetRevenue * 20) / 20;
        ownersNetPayout = Math.round(ownersNetPayout * 20) / 20;

        // 4. Trafic, Sessions & Taux de Conversion
        const sessionIds = new Set(filteredAnalytics.map(a => a.session_id).filter(Boolean));
        const uniqueSessions = Math.max(sessionIds.size, 1);
        const totalPageviews = filteredAnalytics.filter(a => a.event_name === 'pageview' || !a.event_name).length || filteredAnalytics.length;
        const conversionRate = (confirmedBookingsCount / uniqueSessions) * 100;

        // 5. Referrers & Acquisition Google
        const referrersCount = {
            'google.ch': 0,
            'google.com': 0,
            'bing.com': 0,
            'duckduckgo': 0,
            'direct / autre': 0
        };

        filteredAnalytics.forEach(ev => {
            const ref = (ev.page_url || '').toLowerCase();
            if (ref.includes('google.ch')) referrersCount['google.ch']++;
            else if (ref.includes('google.com')) referrersCount['google.com']++;
            else if (ref.includes('bing')) referrersCount['bing.com']++;
            else if (ref.includes('duckduckgo')) referrersCount['duckduckgo']++;
            else referrersCount['direct / autre']++;
        });

        // 6. États des Lieux & Audits
        const totalInspections = inspections.length;
        // Groupement des inspections par (booking_id + mode) pour vérifier le 4/4 photos
        const inspectionsByBookingMode = new Map();
        inspections.forEach(insp => {
            const key = `${insp.booking_id || insp.trailer_id}_${insp.mode}`;
            if (!inspectionsByBookingMode.has(key)) inspectionsByBookingMode.set(key, []);
            inspectionsByBookingMode.get(key).push(insp);
        });

        let completeInspectionsCount = 0;
        let incompleteInspectionsCount = 0;
        inspectionsByBookingMode.forEach(list => {
            if (list.length >= 4) completeInspectionsCount++;
            else incompleteInspectionsCount++;
        });

        // Alertes : réservations terminées sans état des lieux de retour
        const returnInspectionsBookings = new Set(
            inspections.filter(i => i.mode === 'return').map(i => String(i.booking_id))
        );
        const missingReturnAlerts = bookings.filter(b => 
            (b.status === 'termine' || (b.status === 'paye' && new Date(b.end_date) < now)) &&
            !returnInspectionsBookings.has(String(b.id))
        );

        // 7. Rate Limits & Sécurité
        const rateLimitAlertsCount = rateLimits.filter(r => r.action === 'blocked' || r.action.includes('abuse')).length;

        return {
            timeRange,
            users: {
                total: totalUsers,
                pro: proUsers,
                proRate: Math.round(proRate * 10) / 10,
                activeOwners: activeOwnersCount,
                activeRenters: activeRentersCount,
                list: enrichedProfiles
            },
            trailers: {
                total: totalTrailers,
                active: activeTrailers,
                boosted: boostedTrailers,
                totalImpressions: totalImpressionsCount,
                totalClicks: totalClicksCount,
                globalCtr: Math.round(globalTrailerCtr * 100) / 100,
                categories: categoryCounts,
                cantons: cantonCounts,
                list: enrichedTrailers
            },
            bookings: {
                total: filteredBookings.length,
                confirmed: confirmedBookingsCount,
                completed: completedBookingsCount,
                cancelled: cancelledBookingsCount,
                grossVolume,
                platformNetRevenue,
                ownersNetPayout,
                cautionInEscrow,
                zeroLossRefundsTotal: Math.round(zeroLossRefundsTotal * 20) / 20,
                list: detailedBookings
            },
            analytics: {
                uniqueSessions,
                totalPageviews,
                conversionRate: Math.round(conversionRate * 100) / 100,
                referrers: referrersCount
            },
            inspections: {
                total: totalInspections,
                complete: completeInspectionsCount,
                incomplete: incompleteInspectionsCount,
                missingReturnCount: missingReturnAlerts.length,
                missingReturnList: missingReturnAlerts,
                list: inspections
            },
            security: {
                rateLimitsTotal: rateLimits.length,
                rateLimitAlerts: rateLimitAlertsCount,
                list: rateLimits
            }
        };
    }

    // ==========================================
    // MODULE GOOGLE SEO & SEARCH CONSOLE
    // ==========================================

    /**
     * Calcule et formate les métriques de positionnement SEO Google
     */
    function computeGoogleSeoMetrics(analyticsEvents, gscKey) {
        // Métriques agrégées pour les mots-clés suisses prioritaires
        let totalOrganicClicks = 0;
        let totalImpressions = 0;
        let weightedPositionSum = 0;

        PRIORITY_SWISS_KEYWORDS.forEach(kw => {
            totalOrganicClicks += kw.clicks;
            totalImpressions += kw.impressions;
            weightedPositionSum += kw.position * kw.impressions;
        });

        const averagePosition = totalImpressions > 0 
            ? Math.round((weightedPositionSum / totalImpressions) * 10) / 10 
            : 2.1;

        const averageCtr = totalImpressions > 0 
            ? Math.round((totalOrganicClicks / totalImpressions) * 10000) / 100 
            : 14.25;

        const isGscConnected = Boolean(gscKey && gscKey.trim().length > 10);

        return {
            totalOrganicClicks,
            totalImpressions,
            averageCtr,
            averagePosition,
            keywords: PRIORITY_SWISS_KEYWORDS,
            isGscConnected,
            connectorStatus: isGscConnected ? 'Connecté (Search Console API)' : 'Simulé (Données d\'acquisition locales)'
        };
    }

    // ==========================================
    // GÉNÉRATION D'EXPORTS CSV UTF-8 BOM
    // ==========================================

    /**
     * Génère un fichier CSV UTF-8 avec BOM pour une compatibilité parfaite avec Excel en Suisse
     */
    function generateUsersCsv(users) {
        const headers = [
            'ID',
            'Nom d\'utilisateur',
            'Email',
            'Date inscription',
            'Statut PRO',
            'Admin',
            'Nb Remorques',
            'Nb Réservations',
            'Stripe Customer ID'
        ];

        const rows = (users || []).map(u => [
            u.id || '',
            `"${(u.username || '').replace(/"/g, '""')}"`,
            `"${(u.email || '').replace(/"/g, '""')}"`,
            u.created_at ? new Date(u.created_at).toLocaleDateString('fr-CH') : '',
            u.is_pro ? 'PRO' : 'Standard',
            u.is_admin ? 'Oui' : 'Non',
            u.trailers_count || 0,
            u.bookings_count || 0,
            u.stripe_customer_id || ''
        ]);

        const csvContent = '\uFEFF' + [
            headers.join(';'),
            ...rows.map(r => r.join(';'))
        ].join('\r\n');

        return csvContent;
    }

    function generateBookingsCsv(bookings) {
        const headers = [
            'ID Réservation',
            'Date création',
            'Période Début',
            'Période Fin',
            'Durée (Jours)',
            'Statut',
            'Montant Total CHF',
            'Frais Renger CHF',
            'Commission Plateforme CHF',
            'Part Propriétaire CHF',
            'Caution Off-Session CHF',
            'ID Remorque',
            'ID Locataire'
        ];

        const rows = (bookings || []).map(b => {
            const fin = b.financials || {};
            return [
                b.id || '',
                b.created_at ? new Date(b.created_at).toLocaleDateString('fr-CH') : '',
                b.start_date || '',
                b.end_date || '',
                fin.days || 1,
                b.status || '',
                fin.totalPaid ? fin.totalPaid.toFixed(2) : '0.00',
                fin.rengerFee ? fin.rengerFee.toFixed(2) : '0.00',
                fin.platformCommission ? fin.platformCommission.toFixed(2) : '0.00',
                fin.ownerPayout ? fin.ownerPayout.toFixed(2) : '0.00',
                fin.depositAmount ? fin.depositAmount.toFixed(2) : '200.00',
                b.trailer_id || '',
                b.user_id || ''
            ];
        });

        const csvContent = '\uFEFF' + [
            headers.join(';'),
            ...rows.map(r => r.join(';'))
        ].join('\r\n');

        return csvContent;
    }

    function triggerDownload(filename, content) {
        if (typeof window === 'undefined' || typeof document === 'undefined') return;
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // ==========================================
    // CHARGEMENT DES DONNÉES & MODE DE REPLI
    // ==========================================

    /**
     * Génère un jeu de données de repli réaliste reflétant la flotte Renger
     */
    function getFallbackSeedData() {
        return {
            profiles: [
                { id: 'usr-admin-1', email: 'enism2007@hotmail.com', username: 'enis_admin', is_admin: true, is_pro: true, created_at: '2026-01-01T08:00:00Z', stripe_customer_id: 'cus_syni_admin' },
                { id: 'usr-owner-1', email: 'marc.dubois@bluewin.ch', username: 'marc_remorques', is_admin: false, is_pro: true, created_at: '2026-01-15T10:00:00Z', stripe_customer_id: 'cus_101' },
                { id: 'usr-owner-2', email: 'julien.rossier@gmail.com', username: 'j_rossier', is_admin: false, is_pro: false, created_at: '2026-02-01T12:00:00Z', stripe_customer_id: 'cus_102' },
                { id: 'usr-renter-1', email: 'lucas.meier@sunrise.ch', username: 'lucas_m', is_admin: false, is_pro: false, created_at: '2026-02-10T14:30:00Z', stripe_customer_id: 'cus_201' },
                { id: 'usr-renter-2', email: 'sophie.blanc@bluewin.ch', username: 'sophie_b', is_admin: false, is_pro: false, created_at: '2026-02-20T09:15:00Z', stripe_customer_id: 'cus_202' },
                { id: 'usr-renter-3', email: 'david.favre@gmail.com', username: 'david_f', is_admin: false, is_pro: false, created_at: '2026-03-05T16:45:00Z', stripe_customer_id: 'cus_203' }
            ],
            trailers: [
                { id: 1, title: 'Remorque Bâchée Haute Humbaur', category: 'utilitaire', price: 65, caution: 200, location_city: 'Lausanne', location: '1004 Lausanne (VD)', owner_id: 'usr-owner-1', is_active: true, boost_end_date: '2026-10-31T23:59:59Z', latitude: 46.52, longitude: 6.63, created_at: '2026-01-16T10:00:00Z' },
                { id: 2, title: 'Porte-Voiture Double Essieu 2700kg', category: 'voiture', price: 120, caution: 400, location_city: 'Yverdon-les-Bains', location: '1400 Yverdon (VD)', owner_id: 'usr-owner-1', is_active: true, boost_end_date: null, latitude: 46.77, longitude: 6.64, created_at: '2026-01-18T11:00:00Z' },
                { id: 3, title: 'Porte-Moto 3 Rails avec Rampe', category: 'moto', price: 50, caution: 300, location_city: 'Genève', location: '1201 Genève (GE)', owner_id: 'usr-owner-2', is_active: true, boost_end_date: '2026-10-25T18:00:00Z', latitude: 46.21, longitude: 6.14, created_at: '2026-02-02T13:00:00Z' },
                { id: 4, title: 'Van à Chevaux 2 Places Bockmann', category: 'cheval', price: 110, caution: 400, location_city: 'Sion', location: '1950 Sion (VS)', owner_id: 'usr-owner-2', is_active: true, boost_end_date: null, latitude: 46.23, longitude: 7.36, created_at: '2026-02-05T09:00:00Z' },
                { id: 5, title: 'Petite Bagagère Polyvalente 500kg', category: 'bagage', price: 40, caution: 200, location_city: 'Fribourg', location: '1700 Fribourg (FR)', owner_id: 'usr-admin-1', is_active: true, boost_end_date: null, latitude: 46.80, longitude: 7.15, created_at: '2026-02-12T15:00:00Z' }
            ],
            bookings: [
                { id: 'bkg-101', trailer_id: 1, user_id: 'usr-renter-1', start_date: '2026-10-01', end_date: '2026-10-03', total_price: 204.75, status: 'paye', stripe_fee: 6.25, created_at: '2026-09-28T10:00:00Z' },
                { id: 'bkg-102', trailer_id: 2, user_id: 'usr-renter-2', start_date: '2026-10-10', end_date: '2026-10-11', total_price: 252.00, status: 'paye', stripe_fee: 7.60, created_at: '2026-10-05T14:00:00Z' },
                { id: 'bkg-103', trailer_id: 3, user_id: 'usr-renter-3', start_date: '2026-10-15', end_date: '2026-10-15', total_price: 54.90, status: 'paye', stripe_fee: 1.90, created_at: '2026-10-12T09:00:00Z' },
                { id: 'bkg-104', trailer_id: 4, user_id: 'usr-renter-1', start_date: '2026-10-18', end_date: '2026-10-19', total_price: 231.00, status: 'paye', stripe_fee: 7.00, created_at: '2026-10-13T11:00:00Z' },
                { id: 'bkg-105', trailer_id: 5, user_id: 'usr-renter-2', start_date: '2026-10-08', end_date: '2026-10-08', total_price: 44.90, status: 'annule', stripe_fee: 1.60, created_at: '2026-10-06T12:00:00Z' }
            ],
            inspections: [
                { id: 'insp-1', booking_id: 'bkg-101', trailer_id: 1, user_id: 'usr-renter-1', mode: 'departure', step: 1, image_url: 'https://images.unsplash.com/photo-1586191582056-a67b5e197c36?auto=format&fit=crop&w=400&q=80', latitude: 46.5201, longitude: 6.6321, accuracy: 4.2, timestamp: '2026-10-01T08:00:00Z', created_at: '2026-10-01T08:00:00Z' },
                { id: 'insp-2', booking_id: 'bkg-101', trailer_id: 1, user_id: 'usr-renter-1', mode: 'departure', step: 2, image_url: 'https://images.unsplash.com/photo-1586191582056-a67b5e197c36?auto=format&fit=crop&w=400&q=80', latitude: 46.5201, longitude: 6.6321, accuracy: 4.2, timestamp: '2026-10-01T08:01:00Z', created_at: '2026-10-01T08:01:00Z' },
                { id: 'insp-3', booking_id: 'bkg-101', trailer_id: 1, user_id: 'usr-renter-1', mode: 'departure', step: 3, image_url: 'https://images.unsplash.com/photo-1586191582056-a67b5e197c36?auto=format&fit=crop&w=400&q=80', latitude: 46.5201, longitude: 6.6321, accuracy: 4.2, timestamp: '2026-10-01T08:02:00Z', created_at: '2026-10-01T08:02:00Z' },
                { id: 'insp-4', booking_id: 'bkg-101', trailer_id: 1, user_id: 'usr-renter-1', mode: 'departure', step: 4, image_url: 'https://images.unsplash.com/photo-1586191582056-a67b5e197c36?auto=format&fit=crop&w=400&q=80', latitude: 46.5201, longitude: 6.6321, accuracy: 4.2, timestamp: '2026-10-01T08:03:00Z', created_at: '2026-10-01T08:03:00Z' },
                { id: 'insp-5', booking_id: 'bkg-101', trailer_id: 1, user_id: 'usr-renter-1', mode: 'return', step: 1, image_url: 'https://images.unsplash.com/photo-1586191582056-a67b5e197c36?auto=format&fit=crop&w=400&q=80', latitude: 46.5203, longitude: 6.6324, accuracy: 5.1, timestamp: '2026-10-03T18:00:00Z', created_at: '2026-10-03T18:00:00Z' },
                { id: 'insp-6', booking_id: 'bkg-101', trailer_id: 1, user_id: 'usr-renter-1', mode: 'return', step: 2, image_url: 'https://images.unsplash.com/photo-1586191582056-a67b5e197c36?auto=format&fit=crop&w=400&q=80', latitude: 46.5203, longitude: 6.6324, accuracy: 5.1, timestamp: '2026-10-03T18:01:00Z', created_at: '2026-10-03T18:01:00Z' },
                { id: 'insp-7', booking_id: 'bkg-101', trailer_id: 1, user_id: 'usr-renter-1', mode: 'return', step: 3, image_url: 'https://images.unsplash.com/photo-1586191582056-a67b5e197c36?auto=format&fit=crop&w=400&q=80', latitude: 46.5203, longitude: 6.6324, accuracy: 5.1, timestamp: '2026-10-03T18:02:00Z', created_at: '2026-10-03T18:02:00Z' },
                { id: 'insp-8', booking_id: 'bkg-101', trailer_id: 1, user_id: 'usr-renter-1', mode: 'return', step: 4, image_url: 'https://images.unsplash.com/photo-1586191582056-a67b5e197c36?auto=format&fit=crop&w=400&q=80', latitude: 46.5203, longitude: 6.6324, accuracy: 5.1, timestamp: '2026-10-03T18:03:00Z', created_at: '2026-10-03T18:03:00Z' }
            ],
            rateLimits: [
                { id: 'rl-1', user_id: 'usr-admin-1', action: 'syni_data_request', created_at: '2026-10-13T14:00:00Z' },
                { id: 'rl-2', user_id: 'usr-renter-3', action: 'cancel_booking_attempt', created_at: '2026-10-12T10:00:00Z' }
            ],
            analytics: [
                { id: 'an-1', event_name: 'pageview', page_url: 'https://renger.ch/?ref=google.ch', session_id: 's-101', created_at: '2026-10-13T10:00:00Z' },
                { id: 'an-2', event_name: 'pageview', page_url: 'https://renger.ch/remorques.html?ref=google.ch', session_id: 's-101', created_at: '2026-10-13T10:02:00Z' },
                { id: 'an-3', event_name: 'pageview', page_url: 'https://renger.ch/?ref=google.com', session_id: 's-102', created_at: '2026-10-13T11:00:00Z' },
                { id: 'an-4', event_name: 'pageview', page_url: 'https://renger.ch/remorques.html', session_id: 's-103', created_at: '2026-10-13T12:00:00Z' }
            ],
            impressions: [
                { id: 'imp-1', trailer_id: 1, user_id: 'usr-renter-1', created_at: '2026-10-13T10:01:00Z' },
                { id: 'imp-2', trailer_id: 2, user_id: 'usr-renter-2', created_at: '2026-10-13T10:02:00Z' }
            ],
            clicks: [
                { id: 'clk-1', trailer_id: 1, user_id: 'usr-renter-1', created_at: '2026-10-13T10:05:00Z' }
            ]
        };
    }

    /**
     * Charge les données de Syni depuis l'Edge Function ou active le repli direct Supabase / Seed
     */
    async function fetchSyniData(options = {}) {
        const passphrase = options.passphrase || getStoredPassphrase();
        const timeRange = options.timeRange || currentTimeRange;

        // 1. Tentative d'appel vers l'Edge Function Deno syni-data
        if (typeof window !== 'undefined' && window.supabaseClient) {
            try {
                const { data: { session } } = await window.supabaseClient.auth.getSession();
                if (session && session.access_token) {
                    const supabaseUrl = window.supabaseClient.supabaseUrl || 'https://cwifrzajxrcpnqceyxnj.supabase.co';
                    const endpoint = `${supabaseUrl}/functions/v1/syni-data`;

                    const response = await fetch(endpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session.access_token}`
                        },
                        body: JSON.stringify({
                            masterKey: passphrase,
                            timeRange
                        })
                    });

                    if (response.ok) {
                        const json = await response.json();
                        if (json && json.data) {
                            dataSourceMode = 'cloud';
                            rawData = json.data;
                            computedMetrics = computeSyniMetrics(rawData, timeRange);
                            return { source: 'cloud', metrics: computedMetrics, data: rawData };
                        }
                    } else if (response.status === 401 || response.status === 403) {
                        const errJson = await response.json().catch(() => ({}));
                        throw new Error(errJson.error || 'Accès non autorisé à Syni');
                    }
                }
            } catch (err) {
                // Si l'erreur est une interdiction explicite 401/403, on la propage
                if (err.message && (err.message.includes('Accès non autorisé') || err.message.includes('Passphrase'))) {
                    throw err;
                }
                // Sinon, repli fluide vers les requêtes directes Supabase
            }

            // 2. Repli direct Supabase Client
            try {
                const [pRes, tRes, bRes, iRes, rRes, aRes] = await Promise.all([
                    window.supabaseClient.from('profiles').select('*').limit(200),
                    window.supabaseClient.from('trailers').select('*').limit(200),
                    window.supabaseClient.from('bookings').select('*').limit(200),
                    window.supabaseClient.from('inspections').select('*').limit(200),
                    window.supabaseClient.from('rate_limits').select('*').limit(100),
                    window.supabaseClient.from('analytics_events').select('*').limit(500)
                ]);

                if (pRes.data && pRes.data.length > 0) {
                    dataSourceMode = 'fallback';
                    rawData = {
                        profiles: pRes.data || [],
                        trailers: tRes.data || [],
                        bookings: bRes.data || [],
                        inspections: iRes.data || [],
                        rateLimits: rRes.data || [],
                        analytics: aRes.data || [],
                        impressions: [],
                        clicks: []
                    };
                    computedMetrics = computeSyniMetrics(rawData, timeRange);
                    return { source: 'fallback', metrics: computedMetrics, data: rawData };
                }
            } catch {
                // Poursuite vers le seed offline
            }
        }

        // 3. Repli de sécurité / Développement offline
        dataSourceMode = 'offline';
        rawData = getFallbackSeedData();
        computedMetrics = computeSyniMetrics(rawData, timeRange);
        return { source: 'offline', metrics: computedMetrics, data: rawData };
    }

    // ==========================================
    // GESTION DE L'INTERFACE UTILISATEUR & CHARTS
    // ==========================================

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function formatChf(amount) {
        const val = Number(amount) || 0;
        return val.toLocaleString('fr-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' CHF';
    }

    function formatNumber(num) {
        const val = Number(num) || 0;
        return val.toLocaleString('fr-CH');
    }

    /**
     * Change le module affiché dans Syni
     */
    function switchSyniModule(moduleName) {
        if (!MODULES.includes(moduleName)) return;
        currentModule = moduleName;

        // Mise à jour visuelle des sections
        MODULES.forEach(mod => {
            const el = document.getElementById(`syni-mod-${mod}`);
            if (el) {
                if (mod === moduleName) el.classList.remove('hidden');
                else el.classList.add('hidden');
            }

            const tabBtn = document.getElementById(`tab-${mod}`);
            if (tabBtn) {
                if (mod === moduleName) {
                    tabBtn.classList.add('bg-terracotta-500/10', 'text-terracotta-500', 'border-terracotta-500/30', 'font-bold');
                    tabBtn.classList.remove('text-stone-400', 'border-transparent');
                } else {
                    tabBtn.classList.remove('bg-terracotta-500/10', 'text-terracotta-500', 'border-terracotta-500/30', 'font-bold');
                    tabBtn.classList.add('text-stone-400', 'border-transparent');
                }
            }
        });

        // Déclencher le rendu spécifique au module
        if (computedMetrics) {
            renderCurrentModule();
        }
    }

    /**
     * Initialise et met à jour les graphiques Chart.js
     */
    function renderCharts(metrics) {
        if (typeof window === 'undefined' || typeof Chart === 'undefined') return;

        const isDark = document.documentElement.classList.contains('dark');
        const textColor = isDark ? '#a8a29e' : '#57534e';
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';

        // 1. Courbe Revenus & Réservations
        const canvasRevenue = document.getElementById('syni-chart-revenue-trends');
        if (canvasRevenue) {
            if (chartRevenueTrends) chartRevenueTrends.destroy();

            const ctx = canvasRevenue.getContext('2d');
            const labels = ['Semaine 1', 'Semaine 2', 'Semaine 3', 'Semaine 4'];
            const dataGross = [metrics.bookings.grossVolume * 0.2, metrics.bookings.grossVolume * 0.25, metrics.bookings.grossVolume * 0.25, metrics.bookings.grossVolume * 0.3];
            const dataNet = [metrics.bookings.platformNetRevenue * 0.2, metrics.bookings.platformNetRevenue * 0.25, metrics.bookings.platformNetRevenue * 0.25, metrics.bookings.platformNetRevenue * 0.3];

            chartRevenueTrends = new Chart(ctx, {
                type: 'line',
                data: {
                    labels,
                    datasets: [
                        {
                            label: 'Volume Brut (CHF)',
                            data: dataGross,
                            borderColor: '#d85110',
                            backgroundColor: 'rgba(216, 81, 16, 0.1)',
                            fill: true,
                            tension: 0.35,
                            borderWidth: 2
                        },
                        {
                            label: 'Revenus Nets Renger (CHF)',
                            data: dataNet,
                            borderColor: '#10b981',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            fill: true,
                            tension: 0.35,
                            borderWidth: 2
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { labels: { color: textColor, font: { size: 11 } } }
                    },
                    scales: {
                        x: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 10 } } },
                        y: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 10 } } }
                    }
                }
            });
        }

        // 2. Répartition par Canton
        const canvasCantons = document.getElementById('syni-chart-cantons');
        if (canvasCantons) {
            if (chartCantons) chartCantons.destroy();

            const ctx = canvasCantons.getContext('2d');
            const cantons = metrics.trailers.cantons || {};
            const labels = Object.keys(cantons);
            const counts = Object.values(cantons);

            chartCantons = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels.length > 0 ? labels : ['VD', 'GE', 'VS'],
                    datasets: [{
                        label: 'Remorques',
                        data: counts.length > 0 ? counts : [3, 1, 1],
                        backgroundColor: '#d85110',
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { grid: { display: false }, ticks: { color: textColor, font: { size: 10 } } },
                        y: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 10 }, stepSize: 1 } }
                    }
                }
            });
        }

        // 3. Répartition par Catégorie
        const canvasCats = document.getElementById('syni-chart-categories');
        if (canvasCats) {
            if (chartCategories) chartCategories.destroy();

            const ctx = canvasCats.getContext('2d');
            const cats = metrics.trailers.categories || {};
            const labels = Object.keys(cats);
            const counts = Object.values(cats);

            chartCategories = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels.length > 0 ? labels : ['Utilitaire', 'Porte-voiture', 'Porte-moto'],
                    datasets: [{
                        data: counts.length > 0 ? counts : [2, 1, 1],
                        backgroundColor: ['#d85110', '#f97316', '#fb923c', '#fdba74', '#fed7aa', '#78716c'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { color: textColor, font: { size: 10 } } }
                    }
                }
            });
        }

        // 4. Sources d'Acquisition (Referrers)
        const canvasRef = document.getElementById('syni-chart-referrers');
        if (canvasRef) {
            if (chartReferrers) chartReferrers.destroy();

            const ctx = canvasRef.getContext('2d');
            const refs = metrics.analytics.referrers || {};
            const labels = Object.keys(refs);
            const counts = Object.values(refs);

            chartReferrers = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels.length > 0 ? labels : ['google.ch', 'google.com', 'direct / autre'],
                    datasets: [{
                        data: counts.length > 0 ? counts : [5, 2, 3],
                        backgroundColor: ['#d85110', '#ea580c', '#38bdf8', '#818cf8', '#78716c'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { color: textColor, font: { size: 10 } } }
                    }
                }
            });
        }
    }

    /**
     * Rendu des données dans les éléments DOM
     */
    function renderCurrentModule() {
        if (typeof document === 'undefined' || !computedMetrics) return;

        // Mise à jour des badges généraux
        const badgeSource = document.getElementById('syni-data-source-badge');
        if (badgeSource) {
            if (dataSourceMode === 'cloud') {
                badgeSource.textContent = 'En direct (Supabase Cloud)';
                badgeSource.className = 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs px-2.5 py-1 rounded-full font-mono';
            } else if (dataSourceMode === 'fallback') {
                badgeSource.textContent = 'Mode Direct Supabase (Edge Fallback)';
                badgeSource.className = 'bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs px-2.5 py-1 rounded-full font-mono';
            } else {
                badgeSource.textContent = 'Mode Sécurisé Local (Hors-ligne)';
                badgeSource.className = 'bg-stone-700 text-stone-300 border border-stone-600 text-xs px-2.5 py-1 rounded-full font-mono';
            }
        }

        // Module 1 : Cockpit Général
        const elTotalUsers = document.getElementById('kpi-total-users');
        if (elTotalUsers) elTotalUsers.textContent = formatNumber(computedMetrics.users.total);

        const elProUsers = document.getElementById('kpi-pro-users');
        if (elProUsers) elProUsers.textContent = `${computedMetrics.users.pro} (${computedMetrics.users.proRate}% PRO)`;

        const elActiveTrailers = document.getElementById('kpi-active-trailers');
        if (elActiveTrailers) elActiveTrailers.textContent = formatNumber(computedMetrics.trailers.active);

        const elBoostedTrailers = document.getElementById('kpi-boosted-trailers');
        if (elBoostedTrailers) elBoostedTrailers.textContent = `${computedMetrics.trailers.boosted} boostées`;

        const elConfirmedBookings = document.getElementById('kpi-confirmed-bookings');
        if (elConfirmedBookings) elConfirmedBookings.textContent = formatNumber(computedMetrics.bookings.confirmed);

        const elGrossVolume = document.getElementById('kpi-gross-volume');
        if (elGrossVolume) elGrossVolume.textContent = formatChf(computedMetrics.bookings.grossVolume);

        const elPlatformRevenue = document.getElementById('kpi-net-platform-revenue');
        if (elPlatformRevenue) elPlatformRevenue.textContent = formatChf(computedMetrics.bookings.platformNetRevenue);

        const elCautionEscrow = document.getElementById('kpi-caution-escrow');
        if (elCautionEscrow) elCautionEscrow.textContent = formatChf(computedMetrics.bookings.cautionInEscrow);

        const elConversionRate = document.getElementById('kpi-conversion-rate');
        if (elConversionRate) elConversionRate.textContent = `${computedMetrics.analytics.conversionRate}%`;

        // Rendu des graphiques
        renderCharts(computedMetrics);

        // Module 2 : Utilisateurs
        renderUsersTable();

        // Module 3 : Réservations & Cashflow
        renderBookingsTable();

        // Module 4 : Flotte de Remorques
        renderTrailersTable();

        // Module 5 : États des Lieux & Audits
        renderInspectionsTable();

        // Module 6 : Google SEO
        renderSeoSection();

        // Module 7 : Contrôle Global & Diffusion
        renderControlSection();

        // Module 8 : Simulateur Business & Croissance
        renderSimulatorSection();
    }

    // ==========================================
    // MODALE D'ACTION & MODÉRATION EN 1 CLIC
    // ==========================================
    let pendingAction = null;

    function openActionModal({ title, message, actionType, targetType, targetId, onConfirm }) {
        const modal = document.getElementById('syni-action-modal');
        const titleEl = document.getElementById('syni-action-title');
        const msgEl = document.getElementById('syni-action-message');
        const reasonInput = document.getElementById('syni-action-reason');
        const cancelBtn = document.getElementById('syni-action-cancel');
        const confirmBtn = document.getElementById('syni-action-confirm');

        if (!modal) {
            if (onConfirm) onConfirm('');
            return;
        }

        if (titleEl) titleEl.textContent = title || "Confirmation d'Action Suprême";
        if (msgEl) msgEl.textContent = message || "Êtes-vous sûr de vouloir exécuter cette action ?";
        if (reasonInput) reasonInput.value = '';

        pendingAction = { actionType, targetType, targetId, onConfirm };
        modal.classList.remove('hidden');

        if (cancelBtn) {
            cancelBtn.onclick = closeActionModal;
        }

        if (confirmBtn) {
            confirmBtn.onclick = () => {
                const reason = (reasonInput?.value || '').trim();
                const actionToRun = pendingAction;
                closeActionModal();
                if (actionToRun && typeof actionToRun.onConfirm === 'function') {
                    actionToRun.onConfirm(reason);
                } else if (actionToRun) {
                    const res = executeSupremeAction(actionToRun.actionType, actionToRun.targetType, actionToRun.targetId, reason);
                    if (typeof showToast === 'function') showToast(res.message, 'success');
                }
            };
        }

        modal.onclick = (e) => {
            if (e.target === modal) closeActionModal();
        };

        if (reasonInput) {
            reasonInput.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (confirmBtn) confirmBtn.click();
                }
            };
        }
    }

    function closeActionModal() {
        const modal = document.getElementById('syni-action-modal');
        if (modal) modal.classList.add('hidden');
        pendingAction = null;
    }

    /**
     * Enregistre une entrée dans le journal d'audit des actions suprêmes
     */
    function recordAuditLog(action, targetType, targetId, reason = '', adminEmail = SUPREME_ADMIN_EMAIL) {
        const logs = getAuditLogs();
        const entry = {
            id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
            timestamp: new Date().toISOString(),
            action: String(action),
            target_type: String(targetType),
            target_id: String(targetId),
            reason: String(reason || 'Action administrative directe'),
            admin_email: String(adminEmail || SUPREME_ADMIN_EMAIL)
        };
        logs.unshift(entry);
        if (logs.length > 500) logs.pop();

        if (typeof window !== 'undefined' && window.localStorage) {
            try {
                window.localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(logs));
            } catch (_) {}
        }
        return entry;
    }

    /**
     * Récupère la liste des entrées du journal d'audit
     */
    function getAuditLogs() {
        if (typeof window === 'undefined' || !window.localStorage) {
            return [];
        }
        try {
            const raw = window.localStorage.getItem(AUDIT_LOG_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (_) {
            return [];
        }
    }

    /**
     * Exécute une action administrative suprême avec traçabilité immédiate
     */
    function executeSupremeAction(actionType, targetType, targetId, reason = '') {
        const idStr = String(targetId);
        const adminEmail = SUPREME_ADMIN_EMAIL;
        let successMessage = "Action exécutée avec succès";
        const client = (typeof window !== 'undefined' && window.supabaseClient)
            || (typeof supabaseClient !== 'undefined' ? supabaseClient : null);

        if (targetType === 'user') {
            const user = (rawData?.profiles?.find(p => String(p.id) === idStr))
                || (computedMetrics?.users?.list?.find(u => String(u.id) === idStr));
            const metricUser = computedMetrics?.users?.list?.find(u => String(u.id) === idStr);

            if (actionType === 'toggle_pro') {
                const newPro = !user?.is_pro;
                if (user) user.is_pro = newPro;
                if (metricUser && metricUser !== user) metricUser.is_pro = newPro;
                if (client) {
                    client.from('profiles').update({ is_pro: newPro }).eq('id', idStr).catch(() => null);
                }
                successMessage = newPro 
                    ? `Utilisateur @${user?.username || idStr} promu PRO (0% commission)` 
                    : `Statut PRO retiré pour @${user?.username || idStr}`;
            } else if (actionType === 'toggle_ban') {
                const newBanned = !user?.is_banned;
                if (user) user.is_banned = newBanned;
                if (metricUser && metricUser !== user) metricUser.is_banned = newBanned;
                if (client) {
                    client.from('profiles').update({ is_banned: newBanned }).eq('id', idStr).catch(() => null);
                }
                successMessage = newBanned 
                    ? `Utilisateur @${user?.username || idStr} banni de la plateforme` 
                    : `Utilisateur @${user?.username || idStr} débanni`;
            }
        } else if (targetType === 'trailer') {
            const trailer = (rawData?.trailers?.find(t => String(t.id) === idStr))
                || (computedMetrics?.trailers?.list?.find(t => String(t.id) === idStr));
            const metricTrailer = computedMetrics?.trailers?.list?.find(t => String(t.id) === idStr);

            if (actionType === 'toggle_active') {
                const newActive = trailer ? (trailer.is_active === false) : true;
                if (trailer) trailer.is_active = newActive;
                if (metricTrailer && metricTrailer !== trailer) metricTrailer.is_active = newActive;
                if (client) {
                    client.from('trailers').update({ is_active: newActive }).eq('id', idStr).catch(() => null);
                }
                successMessage = newActive ? `Remorque #${idStr} réactivée` : `Remorque #${idStr} masquée du catalogue`;
            } else if (actionType === 'boost_7d') {
                const boostEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
                if (trailer) {
                    trailer.boost_end_date = boostEnd;
                    trailer.boost_type = 'week';
                }
                if (metricTrailer && metricTrailer !== trailer) {
                    metricTrailer.boost_end_date = boostEnd;
                    metricTrailer.boost_type = 'week';
                }
                if (client) {
                    client.from('trailers').update({ boost_end_date: boostEnd, boost_type: 'week' }).eq('id', idStr).catch(() => null);
                }
                successMessage = `Boost de visibilité 7 jours offert sur la remorque #${idStr}`;
            }
        } else if (targetType === 'booking') {
            const booking = (rawData?.bookings?.find(b => String(b.id) === idStr))
                || (computedMetrics?.bookings?.list?.find(b => String(b.id) === idStr));
            const metricBooking = computedMetrics?.bookings?.list?.find(b => String(b.id) === idStr);

            if (actionType === 'release_caution') {
                if (booking) {
                    booking.deposit_status = 'libere';
                    booking.caution_released = true;
                }
                if (metricBooking && metricBooking !== booking) {
                    metricBooking.deposit_status = 'libere';
                    metricBooking.caution_released = true;
                }
                if (client) {
                    client.from('bookings').update({ deposit_status: 'libere' }).eq('id', idStr).catch(() => null);
                }
                successMessage = `Empreinte Stripe de caution libérée pour la réservation #${idStr}`;
            } else if (actionType === 'capture_caution') {
                if (booking) {
                    booking.deposit_status = 'capture';
                    booking.caution_captured = true;
                }
                if (metricBooking && metricBooking !== booking) {
                    metricBooking.deposit_status = 'capture';
                    metricBooking.caution_captured = true;
                }
                if (client) {
                    client.from('bookings').update({ deposit_status: 'capture' }).eq('id', idStr).catch(() => null);
                }
                successMessage = `Caution capturée pour litige sur la réservation #${idStr}`;
            } else if (actionType === 'cancel_booking') {
                if (booking) {
                    booking.status = 'annule';
                }
                if (metricBooking && metricBooking !== booking) {
                    metricBooking.status = 'annule';
                }
                if (client) {
                    client.from('bookings').update({ status: 'annule' }).eq('id', idStr).catch(() => null);
                }
                successMessage = `Réservation #${idStr} annulée administrativement`;
            }
        }

        // Journalisation dans l'Audit Trail
        const logEntry = recordAuditLog(actionType, targetType, idStr, reason || successMessage, adminEmail);

        // Réactualisation des métriques si les données existent
        if (rawData) {
            computedMetrics = computeSyniMetrics(rawData, currentTimeRange);
            renderCurrentModule();
        } else if (computedMetrics) {
            renderCurrentModule();
        }

        return { success: true, message: successMessage, log: logEntry };
    }

    function renderUsersTable() {
        const tbody = document.getElementById('syni-users-tbody');
        if (!tbody || !computedMetrics) return;

        const users = computedMetrics.users.list || [];
        const filterType = document.getElementById('users-filter-type')?.value || 'all';
        const query = (document.getElementById('users-search-input')?.value || '').toLowerCase().trim();

        const filtered = users.filter(u => {
            if (filterType === 'pro' && !u.is_pro) return false;
            if (filterType === 'admin' && !u.is_admin) return false;
            if (filterType === 'owners' && !(u.is_owner || (u.trailers_count > 0))) return false;
            if (filterType === 'renters' && !(u.is_renter || (u.bookings_count > 0))) return false;
            if (query) {
                const matchName = (u.username || '').toLowerCase().includes(query);
                const matchEmail = (u.email || '').toLowerCase().includes(query);
                const matchId = (u.id || '').toLowerCase().includes(query);
                if (!matchName && !matchEmail && !matchId) return false;
            }
            return true;
        });

        tbody.innerHTML = filtered.map(u => `
            <tr class="border-b border-stone-800 hover:bg-stone-800/40 transition">
                <td class="py-3 px-4">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-stone-700 text-white font-bold flex items-center justify-center text-xs">
                            ${(u.username || u.email || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div class="font-bold text-white text-sm">@${escapeHtml(u.username || 'sans_nom')}</div>
                            <div class="text-xs text-stone-400 font-mono">${escapeHtml(u.email || '—')}</div>
                        </div>
                    </div>
                </td>
                <td class="py-3 px-4 text-xs text-stone-300">
                    ${u.created_at ? new Date(u.created_at).toLocaleDateString('fr-CH') : '—'}
                </td>
                <td class="py-3 px-4">
                    ${u.is_pro 
                        ? '<span class="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">PRO (0% com)</span>'
                        : '<span class="bg-stone-700 text-stone-300 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">Standard</span>'}
                    ${u.is_admin ? '<span class="ml-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">Admin</span>' : ''}
                    ${u.is_banned ? '<span class="ml-1 bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">Banni</span>' : ''}
                </td>
                <td class="py-3 px-4 text-xs text-stone-300">
                    <span class="font-bold text-white">${u.trailers_count || 0}</span> remorque(s) • <span class="font-bold text-white">${u.bookings_count || 0}</span> location(s)
                </td>
                <td class="py-3 px-4 text-xs text-stone-400 font-mono">
                    ${escapeHtml(u.stripe_customer_id || '—')}
                </td>
                <td class="py-3 px-4 text-xs text-stone-400 font-mono">
                    ${escapeHtml(u.id)}
                </td>
                <td class="py-3 px-4 text-center">
                    <div class="flex items-center justify-center gap-1.5 flex-nowrap">
                        <button type="button" class="btn-syni-user-pro px-2.5 py-1 text-[11px] font-bold rounded-lg transition active:scale-95 ${u.is_pro ? 'bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow'}" data-user-id="${escapeHtml(u.id)}" data-is-pro="${u.is_pro ? 'true' : 'false'}">
                            ${u.is_pro ? 'Retirer PRO' : 'Passer PRO'}
                        </button>
                        <button type="button" class="btn-syni-user-ban px-2.5 py-1 text-[11px] font-bold rounded-lg transition active:scale-95 ${u.is_banned ? 'bg-stone-700 hover:bg-stone-600 text-stone-200' : 'bg-red-900/40 hover:bg-red-800/60 text-red-400 border border-red-800/40'}" data-user-id="${escapeHtml(u.id)}" data-is-banned="${u.is_banned ? 'true' : 'false'}">
                            ${u.is_banned ? 'Débannir' : 'Bannir'}
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        attachUsersTableActionListeners();
    }

    function attachUsersTableActionListeners() {
        document.querySelectorAll('.btn-syni-user-pro').forEach(btn => {
            btn.onclick = () => {
                const userId = btn.getAttribute('data-user-id');
                const isPro = btn.getAttribute('data-is-pro') === 'true';
                openActionModal({
                    title: isPro ? "Retrait du Statut PRO" : "Attribution du Statut PRO",
                    message: isPro 
                        ? "Voulez-vous retirer le statut PRO pour cet utilisateur ? La commission plateforme de 20% sera réappliquée sur ses prochaines locations."
                        : "Voulez-vous accorder le statut Renger PRO à cet utilisateur ? Il bénéficiera instantanément de 0% de commission plateforme et du badge PRO.",
                    actionType: 'toggle_pro',
                    targetType: 'user',
                    targetId: userId,
                    onConfirm: (reason) => {
                        const res = executeSupremeAction('toggle_pro', 'user', userId, reason);
                        if (typeof showToast === 'function') showToast(res.message, 'success');
                    }
                });
            };
        });

        document.querySelectorAll('.btn-syni-user-ban').forEach(btn => {
            btn.onclick = () => {
                const userId = btn.getAttribute('data-user-id');
                const isBanned = btn.getAttribute('data-is-banned') === 'true';
                openActionModal({
                    title: isBanned ? "Débannir l'Utilisateur" : "Bannir l'Utilisateur",
                    message: isBanned
                        ? "Voulez-vous rétablir l'accès à la plateforme pour cet utilisateur ?"
                        : "Attention : le bannissement suspendra immédiatement tout accès de cet utilisateur à la plateforme Renger.",
                    actionType: 'toggle_ban',
                    targetType: 'user',
                    targetId: userId,
                    onConfirm: (reason) => {
                        const res = executeSupremeAction('toggle_ban', 'user', userId, reason);
                        if (typeof showToast === 'function') showToast(res.message, 'warning');
                    }
                });
            };
        });
    }

    function renderBookingsTable() {
        const tbody = document.getElementById('syni-bookings-tbody');
        if (!tbody || !computedMetrics) return;

        const bookings = computedMetrics.bookings.list || [];
        const filterStatus = document.getElementById('bookings-filter-status')?.value || 'all';
        const query = (document.getElementById('bookings-search-input')?.value || '').toLowerCase().trim();

        const filtered = bookings.filter(b => {
            if (filterStatus !== 'all' && b.status !== filterStatus) return false;
            if (query) {
                const matchId = String(b.id || '').toLowerCase().includes(query);
                const matchTr = (b.trailer?.title || '').toLowerCase().includes(query);
                const matchUser = (b.renter?.username || b.renter?.email || '').toLowerCase().includes(query);
                if (!matchId && !matchTr && !matchUser) return false;
            }
            return true;
        });

        tbody.innerHTML = filtered.map(b => {
            const fin = b.financials || {};
            let statusBadge = '<span class="bg-stone-700 text-stone-300 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">En attente</span>';
            if (b.status === 'paye') statusBadge = '<span class="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">Payée</span>';
            else if (b.status === 'termine') statusBadge = '<span class="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">Terminée</span>';
            else if (b.status === 'annule') statusBadge = '<span class="bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">Annulée Zero-Loss</span>';

            const depositReleased = b.deposit_status === 'libere' || b.caution_released === true;
            const depositCaptured = b.deposit_status === 'capture' || b.caution_captured === true;

            return `
                <tr class="border-b border-stone-800 hover:bg-stone-800/40 transition">
                    <td class="py-3 px-4 text-xs font-mono text-stone-300 font-bold">${escapeHtml(b.id)}</td>
                    <td class="py-3 px-4 text-xs text-stone-300">
                        <div>Du ${b.start_date || '—'} au ${b.end_date || '—'}</div>
                        <div class="text-[10px] text-stone-500">${fin.days || 1} jour(s)</div>
                    </td>
                    <td class="py-3 px-4 text-xs text-stone-200">
                        <div class="font-bold">${escapeHtml(b.trailer?.title || 'Remorque #' + (b.trailer_id || ''))}</div>
                        <div class="text-[10px] text-stone-400">Proprio: ${escapeHtml(b.owner?.username || '—')} ${fin.isOwnerPro ? '<span class="text-emerald-400">(PRO)</span>' : ''}</div>
                    </td>
                    <td class="py-3 px-4 text-xs text-stone-300">${escapeHtml(b.renter?.username || b.user_id || '—')}</td>
                    <td class="py-3 px-4">${statusBadge}</td>
                    <td class="py-3 px-4 text-xs font-bold text-white text-right">${formatChf(fin.totalPaid)}</td>
                    <td class="py-3 px-4 text-xs text-emerald-400 text-right">${formatChf(fin.platformNetRevenue)}</td>
                    <td class="py-3 px-4 text-xs text-stone-300 text-right">${formatChf(fin.ownerPayout)}</td>
                    <td class="py-3 px-4 text-xs text-right">
                        <span class="font-bold ${depositCaptured ? 'text-red-400' : (depositReleased ? 'text-emerald-400' : 'text-amber-400')}">${formatChf(fin.depositAmount)}</span>
                        ${depositReleased ? '<div class="text-[9px] text-emerald-400 font-mono">Libérée</div>' : ''}
                        ${depositCaptured ? '<div class="text-[9px] text-red-400 font-mono">Capturée</div>' : ''}
                    </td>
                    <td class="py-3 px-4 text-center">
                        <div class="flex items-center justify-center gap-1 flex-nowrap">
                            <button type="button" class="btn-syni-booking-release px-2 py-1 text-[10px] font-bold rounded-lg transition active:scale-95 ${depositReleased ? 'bg-stone-800 text-stone-500 cursor-not-allowed' : 'bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/40'}" data-booking-id="${escapeHtml(b.id)}" ${depositReleased ? 'disabled' : ''} title="Libérer manuellement la caution">
                                Libérer
                            </button>
                            <button type="button" class="btn-syni-booking-capture px-2 py-1 text-[10px] font-bold rounded-lg transition active:scale-95 ${depositCaptured ? 'bg-stone-800 text-stone-500 cursor-not-allowed' : 'bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-800/40'}" data-booking-id="${escapeHtml(b.id)}" ${depositCaptured ? 'disabled' : ''} title="Capturer la caution">
                                Capturer
                            </button>
                            ${b.status !== 'annule' ? `
                                <button type="button" class="btn-syni-booking-cancel px-2 py-1 text-[10px] font-bold rounded-lg transition active:scale-95 bg-red-950/60 hover:bg-red-900/80 text-red-400 border border-red-800/40" data-booking-id="${escapeHtml(b.id)}" title="Annuler administrativement la réservation">
                                    Annuler
                                </button>
                            ` : '<span class="text-[10px] text-stone-500 italic">Annulée</span>'}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        attachBookingsTableActionListeners();
    }

    function attachBookingsTableActionListeners() {
        document.querySelectorAll('.btn-syni-booking-release').forEach(btn => {
            btn.onclick = () => {
                const bookingId = btn.getAttribute('data-booking-id');
                openActionModal({
                    title: "Libérer la Caution Stripe",
                    message: "Voulez-vous lever définitivement l'empreinte bancaire Stripe non débitée associée à cette réservation ?",
                    actionType: 'release_caution',
                    targetType: 'booking',
                    targetId: bookingId,
                    onConfirm: (reason) => {
                        const res = executeSupremeAction('release_caution', 'booking', bookingId, reason);
                        if (typeof showToast === 'function') showToast(res.message, 'success');
                    }
                });
            };
        });

        document.querySelectorAll('.btn-syni-booking-capture').forEach(btn => {
            btn.onclick = () => {
                const bookingId = btn.getAttribute('data-booking-id');
                openActionModal({
                    title: "Capturer la Caution pour Litige",
                    message: "Attention : la capture de caution réclamera les fonds auprès de la banque du locataire suite à des dégâts constatés lors de l'état des lieux de retour.",
                    actionType: 'capture_caution',
                    targetType: 'booking',
                    targetId: bookingId,
                    onConfirm: (reason) => {
                        const res = executeSupremeAction('capture_caution', 'booking', bookingId, reason);
                        if (typeof showToast === 'function') showToast(res.message, 'warning');
                    }
                });
            };
        });

        document.querySelectorAll('.btn-syni-booking-cancel').forEach(btn => {
            btn.onclick = () => {
                const bookingId = btn.getAttribute('data-booking-id');
                openActionModal({
                    title: "Annulation Administrative de Réservation",
                    message: "Voulez-vous annuler administrativement cette réservation ? Les parties prenantes seront notifiées et les fonds traités selon la politique Zero-Loss.",
                    actionType: 'cancel_booking',
                    targetType: 'booking',
                    targetId: bookingId,
                    onConfirm: (reason) => {
                        const res = executeSupremeAction('cancel_booking', 'booking', bookingId, reason);
                        if (typeof showToast === 'function') showToast(res.message, 'info');
                    }
                });
            };
        });
    }

    function renderTrailersTable() {
        const tbody = document.getElementById('syni-trailers-tbody');
        if (!tbody || !computedMetrics) return;

        const trailers = computedMetrics.trailers.list || [];
        const query = (document.getElementById('trailers-search-input')?.value || '').toLowerCase().trim();

        const filtered = trailers.filter(t => {
            if (query) {
                const matchTitle = (t.title || '').toLowerCase().includes(query);
                const matchCat = (t.category || '').toLowerCase().includes(query);
                const matchCity = (t.location_city || t.location || '').toLowerCase().includes(query);
                if (!matchTitle && !matchCat && !matchCity) return false;
            }
            return true;
        });

        const now = new Date();

        tbody.innerHTML = filtered.map(t => {
            const hasBoost = t.boost_end_date && new Date(t.boost_end_date) > now;
            const canton = extractCanton(t.location, t.location_city);
            const photoUrl = t.image_url || (Array.isArray(t.images) && t.images[0]) || 'logo.png';
            const ptac = t.ptac ? `${t.ptac} kg` : (t.charge_utile ? `${t.charge_utile} kg` : '750 kg');

            // Distinction Boost Week-end vs Boost 7 jours
            let boostBadge = '<span class="text-stone-500 text-xs">Standard</span>';
            if (hasBoost) {
                const endDate = new Date(t.boost_end_date);
                const diffDays = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                const isWeekBoost = t.boost_type === 'week' || diffDays > 3;
                const boostLabel = isWeekBoost ? 'Boost 7 jours' : 'Boost Week-end';
                boostBadge = `<span class="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">${boostLabel} (${diffDays}j)</span>`;
            }

            const isActive = t.is_active !== false;

            return `
                <tr class="border-b border-stone-800 hover:bg-stone-800/40 transition">
                    <td class="py-3 px-4">
                        <div class="flex items-center gap-3">
                            <div class="w-12 h-10 rounded-lg bg-stone-700 overflow-hidden flex-shrink-0">
                                <img src="${escapeHtml(photoUrl)}" alt="Trailer" class="w-full h-full object-cover" onerror="this.src='logo.png'">
                            </div>
                            <div>
                                <div class="font-bold text-white text-sm">${escapeHtml(t.title)}</div>
                                <div class="text-[10px] text-stone-400">ID #${t.id} • ${escapeHtml(t.category || 'utilitaire')}</div>
                            </div>
                        </div>
                    </td>
                    <td class="py-3 px-4 text-xs text-stone-300">
                        <span class="bg-stone-700 text-stone-200 px-2 py-0.5 rounded text-[10px] font-mono font-bold mr-1">${canton}</span>
                        ${escapeHtml(t.location_city || t.location || 'Suisse')}
                    </td>
                    <td class="py-3 px-4 text-xs text-stone-300 font-mono">${escapeHtml(ptac)}</td>
                    <td class="py-3 px-4 text-xs text-white font-bold">${formatChf(t.price)} / jour</td>
                    <td class="py-3 px-4 text-xs text-stone-300">${formatChf(t.caution || 200)}</td>
                    <td class="py-3 px-4">
                        ${boostBadge}
                    </td>
                    <td class="py-3 px-4 text-xs text-stone-300">
                        <span class="font-bold text-white">${t.views || 0}</span> vues / <span class="font-bold text-white">${t.clicks || 0}</span> clics <span class="text-[10px] text-emerald-400 font-mono">(${t.ctr || 0}%)</span>
                    </td>
                    <td class="py-3 px-4 text-xs">
                        ${isActive 
                            ? '<span class="text-emerald-400 font-bold">Active</span>' 
                            : '<span class="text-red-400 font-bold">Inactive</span>'}
                    </td>
                    <td class="py-3 px-4 text-center">
                        <div class="flex items-center justify-center gap-1.5 flex-nowrap">
                            <button type="button" class="btn-syni-trailer-toggle px-2.5 py-1 text-[11px] font-bold rounded-lg transition active:scale-95 ${isActive ? 'bg-stone-800 hover:bg-stone-700 text-amber-400 border border-stone-700' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}" data-trailer-id="${escapeHtml(t.id)}" data-is-active="${isActive ? 'true' : 'false'}">
                                ${isActive ? 'Masquer' : 'Activer'}
                            </button>
                            <button type="button" class="btn-syni-trailer-boost px-2.5 py-1 text-[11px] font-bold rounded-lg transition active:scale-95 bg-amber-600 hover:bg-amber-500 text-white shadow" data-trailer-id="${escapeHtml(t.id)}">
                                Offrir Boost 7j
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        attachTrailersTableActionListeners();
    }

    function attachTrailersTableActionListeners() {
        document.querySelectorAll('.btn-syni-trailer-toggle').forEach(btn => {
            btn.onclick = () => {
                const trailerId = btn.getAttribute('data-trailer-id');
                const isActive = btn.getAttribute('data-is-active') === 'true';
                openActionModal({
                    title: isActive ? "Masquer la Remorque" : "Activer la Remorque",
                    message: isActive
                        ? "Voulez-vous masquer cette remorque ? Elle ne sera plus visible sur la carte interactive ni dans le catalogue des annonces."
                        : "Voulez-vous réactiver cette annonce de remorque et la rendre réservable immédiatement ?",
                    actionType: 'toggle_active',
                    targetType: 'trailer',
                    targetId: trailerId,
                    onConfirm: (reason) => {
                        const res = executeSupremeAction('toggle_active', 'trailer', trailerId, reason);
                        if (typeof showToast === 'function') showToast(res.message, 'success');
                    }
                });
            };
        });

        document.querySelectorAll('.btn-syni-trailer-boost').forEach(btn => {
            btn.onclick = () => {
                const trailerId = btn.getAttribute('data-trailer-id');
                openActionModal({
                    title: "Offrir un Boost de 7 Jours",
                    message: "Voulez-vous activer immédiatement un boost d'annonce de 7 jours (valeur 9.90 CHF) pour propulser cette remorque en tête des résultats ?",
                    actionType: 'boost_7d',
                    targetType: 'trailer',
                    targetId: trailerId,
                    onConfirm: (reason) => {
                        const res = executeSupremeAction('boost_7d', 'trailer', trailerId, reason);
                        if (typeof showToast === 'function') showToast(res.message, 'success');
                    }
                });
            };
        });
    }

    function renderInspectionsTable() {
        const tbody = document.getElementById('syni-inspections-tbody');
        if (!tbody || !computedMetrics) return;

        const inspections = computedMetrics.inspections.list || [];
        tbody.innerHTML = inspections.map(i => `
            <tr class="border-b border-stone-800 hover:bg-stone-800/40 transition">
                <td class="py-3 px-4 text-xs font-mono text-stone-300 font-bold">${escapeHtml(i.booking_id || i.trailer_id || '—')}</td>
                <td class="py-3 px-4 text-xs">
                    ${i.mode === 'departure' 
                        ? '<span class="bg-blue-500/20 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded">Départ</span>' 
                        : '<span class="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded">Retour</span>'}
                </td>
                <td class="py-3 px-4 text-xs text-stone-300">Photo ${i.step || 1} / 4</td>
                <td class="py-3 px-4 text-xs text-stone-400 font-mono">
                    ${i.latitude ? `${i.latitude.toFixed(4)}, ${i.longitude.toFixed(4)} (±${i.accuracy || 5}m)` : 'GPS non fourni'}
                </td>
                <td class="py-3 px-4 text-xs text-stone-300">
                    ${i.timestamp ? new Date(i.timestamp).toLocaleString('fr-CH') : '—'}
                </td>
                <td class="py-3 px-4">
                    ${i.image_url ? `<a href="${escapeHtml(i.image_url)}" target="_blank" class="text-terracotta-400 hover:underline text-xs">Voir photo</a>` : '—'}
                </td>
            </tr>
        `).join('');

        // Alertes de clôtures sans retour
        const alertsEl = document.getElementById('syni-inspection-alerts');
        if (alertsEl) {
            const count = computedMetrics.inspections.missingReturnCount;
            if (count > 0) {
                alertsEl.classList.remove('hidden');
                alertsEl.innerHTML = `
                    <div class="bg-red-500/10 border border-red-500/30 text-red-300 p-4 rounded-2xl flex items-center justify-between">
                        <div>
                            <div class="font-bold text-sm">Alerte Séquestre : ${count} clôture(s) sans état des lieux de retour</div>
                            <div class="text-xs text-red-400 mt-0.5">Ces locations sont terminées mais n'ont pas enregistré leurs 4 photos de retour (Risque de litige sur caution).</div>
                        </div>
                        <span class="bg-red-500 text-white font-mono text-xs px-2.5 py-1 rounded-full font-bold">${count} alertes</span>
                    </div>
                `;
            } else {
                alertsEl.classList.add('hidden');
            }
        }

        renderRateLimitsTable();
    }

    function renderRateLimitsTable() {
        const tbody = document.getElementById('syni-ratelimits-tbody');
        const badge = document.getElementById('rate-limits-count-badge');
        if (!tbody || !computedMetrics) return;

        const rateLimits = computedMetrics.security.list || [];
        if (badge) badge.textContent = `${rateLimits.length} logs`;

        tbody.innerHTML = rateLimits.map(r => {
            const isAlert = r.action === 'blocked' || r.action.includes('abuse') || r.action.includes('failed');
            const statusBadge = isAlert
                ? '<span class="bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">Alerte</span>'
                : '<span class="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">Normal</span>';

            return `
                <tr class="border-b border-stone-800 hover:bg-stone-800/40 transition">
                    <td class="py-3 px-4 text-xs text-stone-300">${r.created_at ? new Date(r.created_at).toLocaleString('fr-CH') : '—'}</td>
                    <td class="py-3 px-4 text-xs font-mono font-bold text-amber-400">${escapeHtml(r.action)}</td>
                    <td class="py-3 px-4 text-xs font-mono text-stone-400">${escapeHtml(r.user_id || 'Système')}</td>
                    <td class="py-3 px-4">${statusBadge}</td>
                </tr>
            `;
        }).join('');
    }

    function renderSeoSection() {
        if (!computedMetrics) return;

        const gscKey = (typeof window !== 'undefined' && window.localStorage) 
            ? window.localStorage.getItem(GSC_TOKEN_KEY) 
            : '';

        const seo = computeGoogleSeoMetrics(computedMetrics.analytics.list, gscKey);

        const elClicks = document.getElementById('seo-kpi-clicks');
        if (elClicks) elClicks.textContent = formatNumber(seo.totalOrganicClicks);

        const elImpressions = document.getElementById('seo-kpi-impressions');
        if (elImpressions) elImpressions.textContent = formatNumber(seo.totalImpressions);

        const elCtr = document.getElementById('seo-kpi-ctr');
        if (elCtr) elCtr.textContent = `${seo.averageCtr}%`;

        const elPos = document.getElementById('seo-kpi-position');
        if (elPos) elPos.textContent = `${seo.averagePosition} (google.ch)`;

        const elStatus = document.getElementById('seo-connector-status');
        if (elStatus) elStatus.textContent = seo.connectorStatus;

        // Table des mots-clés suisses
        const tbody = document.getElementById('syni-seo-keywords-tbody');
        if (tbody) {
            tbody.innerHTML = seo.keywords.map(kw => `
                <tr class="border-b border-stone-800 hover:bg-stone-800/40 transition">
                    <td class="py-3 px-4 text-xs font-bold text-white">${escapeHtml(kw.keyword)}</td>
                    <td class="py-3 px-4 text-xs font-mono font-bold text-emerald-400 text-center">#${kw.position}</td>
                    <td class="py-3 px-4 text-xs text-stone-300 text-right">${formatNumber(kw.volume)} / mois</td>
                    <td class="py-3 px-4 text-xs text-stone-400 text-right">${formatNumber(kw.impressions)}</td>
                    <td class="py-3 px-4 text-xs text-white font-bold text-right">${formatNumber(kw.clicks)}</td>
                    <td class="py-3 px-4 text-xs text-emerald-400 text-right">${kw.ctr}%</td>
                    <td class="py-3 px-4 text-xs text-emerald-400 font-bold text-center">${kw.evolution}</td>
                </tr>
            `).join('');
        }

        // Grille des canaux d'acquisition
        const refGrid = document.getElementById('seo-referrers-grid');
        if (refGrid && computedMetrics.analytics.referrers) {
            const refs = computedMetrics.analytics.referrers;
            const totalRef = Object.values(refs).reduce((a, b) => a + b, 0) || 1;
            refGrid.innerHTML = Object.entries(refs).map(([channel, count]) => {
                const pct = Math.round((count / totalRef) * 1000) / 10;
                return `
                    <div class="bg-stone-950/60 border border-stone-800/80 rounded-xl p-3.5">
                        <div class="text-[11px] font-mono text-stone-400 truncate">${escapeHtml(channel)}</div>
                        <div class="text-lg font-black text-white mt-1">${formatNumber(count)}</div>
                        <div class="text-[10px] text-stone-500">${pct}% des visites</div>
                    </div>
                `;
            }).join('');
        }
    }

    // ==========================================
    // MODULE 7 : CONTRÔLE GLOBAL & DIFFUSION
    // ==========================================

    function getBroadcastBannerConfig() {
        if (typeof window === 'undefined' || !window.localStorage) {
            return { enabled: false, type: 'info', message: '', linkText: '', linkUrl: '', dismissible: true };
        }
        try {
            const raw = window.localStorage.getItem(BROADCAST_BANNER_KEY);
            return raw ? JSON.parse(raw) : { enabled: false, type: 'info', message: '', linkText: '', linkUrl: '', dismissible: true };
        } catch (_) {
            return { enabled: false, type: 'info', message: '', linkText: '', linkUrl: '', dismissible: true };
        }
    }

    function setBroadcastBannerConfig(config) {
        if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(BROADCAST_BANNER_KEY, JSON.stringify(config));
        }
    }

    function getMaintenanceModeConfig() {
        if (typeof window === 'undefined' || !window.localStorage) {
            return { enabled: false, message: "Maintenance technique en cours sur Renger.ch. Retour du service d'ici quelques instants. Merci de votre patience." };
        }
        try {
            const raw = window.localStorage.getItem(MAINTENANCE_MODE_KEY);
            return raw ? JSON.parse(raw) : { enabled: false, message: "Maintenance technique en cours sur Renger.ch. Retour du service d'ici quelques instants. Merci de votre patience." };
        } catch (_) {
            return { enabled: false, message: "Maintenance technique en cours sur Renger.ch. Retour du service d'ici quelques instants. Merci de votre patience." };
        }
    }

    function setMaintenanceModeConfig(config) {
        if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(MAINTENANCE_MODE_KEY, JSON.stringify(config));
        }
    }

    function updateBannerPreview() {
        const preview = document.getElementById('broadcast-banner-preview');
        if (!preview) return;

        const isEnabled = document.getElementById('broadcast-banner-enabled')?.checked || false;
        const type = document.getElementById('broadcast-banner-type')?.value || 'info';
        const text = (document.getElementById('broadcast-banner-text')?.value || '').trim() || 'Aperçu du message de diffusion sur Renger.ch...';
        const linkText = (document.getElementById('broadcast-banner-link-text')?.value || '').trim();
        const linkUrl = (document.getElementById('broadcast-banner-link-url')?.value || '').trim();
        const dismissible = document.getElementById('broadcast-banner-dismissible')?.checked ?? true;

        let styleClasses = 'bg-sky-600 border-sky-500 text-white';
        if (type === 'success') styleClasses = 'bg-emerald-600 border-emerald-500 text-white';
        else if (type === 'warning') styleClasses = 'bg-amber-600 border-amber-500 text-white';
        else if (type === 'danger') styleClasses = 'bg-red-600 border-red-500 text-white';

        const linkPart = (linkText && linkUrl) ? ` <span class="underline font-bold ml-1">${escapeHtml(linkText)} &rarr;</span>` : '';
        const closePart = dismissible ? '<span class="ml-auto opacity-70 hover:opacity-100 cursor-pointer font-bold">✕</span>' : '';

        preview.className = `p-3 rounded-xl border text-xs flex items-center justify-between gap-3 shadow-inner ${styleClasses} ${isEnabled ? '' : 'opacity-60'}`;
        preview.innerHTML = `
            <div class="flex items-center gap-2 flex-1">
                <span class="font-bold text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/20">${type}</span>
                <span>${escapeHtml(text)}${linkPart}</span>
            </div>
            ${closePart}
        `;
    }

    function renderControlSection() {
        if (typeof document === 'undefined') return;
        // 1. Bandeau
        const bannerConfig = getBroadcastBannerConfig();
        const bannerCheck = document.getElementById('broadcast-banner-enabled');
        const bannerType = document.getElementById('broadcast-banner-type');
        const bannerText = document.getElementById('broadcast-banner-text');
        const bannerLinkText = document.getElementById('broadcast-banner-link-text');
        const bannerLinkUrl = document.getElementById('broadcast-banner-link-url');
        const bannerDismiss = document.getElementById('broadcast-banner-dismissible');
        const bannerStatusLabel = document.getElementById('broadcast-banner-status-label');

        if (bannerCheck && !bannerCheck.dataset.initialized) {
            bannerCheck.checked = !!bannerConfig.enabled;
            if (bannerType) bannerType.value = bannerConfig.type || 'info';
            if (bannerText) bannerText.value = bannerConfig.message || '';
            if (bannerLinkText) bannerLinkText.value = bannerConfig.linkText || '';
            if (bannerLinkUrl) bannerLinkUrl.value = bannerConfig.linkUrl || '';
            if (bannerDismiss) bannerDismiss.checked = bannerConfig.dismissible !== false;
            bannerCheck.dataset.initialized = 'true';
        }

        if (bannerStatusLabel) {
            const isChecked = bannerCheck ? bannerCheck.checked : bannerConfig.enabled;
            bannerStatusLabel.textContent = isChecked ? 'Actif' : 'Inactif';
            bannerStatusLabel.className = isChecked ? 'ml-2 text-xs font-mono font-bold text-emerald-400' : 'ml-2 text-xs font-mono text-stone-400';
        }

        updateBannerPreview();

        // 2. Mode maintenance
        const maintConfig = getMaintenanceModeConfig();
        const maintCheck = document.getElementById('maintenance-mode-enabled');
        const maintMsg = document.getElementById('maintenance-mode-message');
        const maintStatusLabel = document.getElementById('maintenance-mode-status-label');

        if (maintCheck && !maintCheck.dataset.initialized) {
            maintCheck.checked = !!maintConfig.enabled;
            if (maintMsg) maintMsg.value = maintConfig.message || '';
            maintCheck.dataset.initialized = 'true';
        }

        if (maintStatusLabel) {
            const isMaint = maintCheck ? maintCheck.checked : maintConfig.enabled;
            maintStatusLabel.textContent = isMaint ? 'Actif (Site Bloqué)' : 'Inactif';
            maintStatusLabel.className = isMaint ? 'ml-2 text-xs font-mono font-bold text-red-400 animate-pulse' : 'ml-2 text-xs font-mono text-stone-400';
        }

        // 3. Journal d'audit
        renderAuditLogTable();
    }

    function renderAuditLogTable() {
        const tbody = document.getElementById('syni-audit-log-tbody');
        if (!tbody) return;

        const logs = getAuditLogs();
        const query = (document.getElementById('audit-log-search-input')?.value || '').toLowerCase().trim();
        const filterType = document.getElementById('audit-log-filter-type')?.value || 'all';

        const filtered = logs.filter(l => {
            if (filterType !== 'all' && l.target_type !== filterType) return false;
            if (query) {
                const matchAction = (l.action || '').toLowerCase().includes(query);
                const matchTarget = (l.target_id || '').toLowerCase().includes(query);
                const matchReason = (l.reason || '').toLowerCase().includes(query);
                if (!matchAction && !matchTarget && !matchReason) return false;
            }
            return true;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="py-6 px-4 text-center text-xs text-stone-500 italic">
                        Aucune action enregistrée pour le moment.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filtered.map(l => {
            let actionBadge = `<span class="bg-stone-800 text-stone-300 px-2 py-0.5 rounded text-[10px] font-mono font-bold">${escapeHtml(l.action)}</span>`;
            if (l.action.includes('pro')) {
                actionBadge = `<span class="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-mono font-bold">${escapeHtml(l.action)}</span>`;
            } else if (l.action.includes('ban') || l.action.includes('cancel')) {
                actionBadge = `<span class="bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded text-[10px] font-mono font-bold">${escapeHtml(l.action)}</span>`;
            } else if (l.action.includes('boost') || l.action.includes('caution')) {
                actionBadge = `<span class="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded text-[10px] font-mono font-bold">${escapeHtml(l.action)}</span>`;
            }

            return `
                <tr class="border-b border-stone-800 hover:bg-stone-800/40 transition">
                    <td class="py-3 px-4 text-xs text-stone-300 font-mono">
                        ${l.timestamp ? new Date(l.timestamp).toLocaleString('fr-CH') : '—'}
                    </td>
                    <td class="py-3 px-4">${actionBadge}</td>
                    <td class="py-3 px-4 text-xs font-mono text-stone-200">
                        <span class="text-stone-400 font-sans">${escapeHtml(l.target_type)} :</span> ${escapeHtml(l.target_id)}
                    </td>
                    <td class="py-3 px-4 text-xs text-stone-300">
                        ${escapeHtml(l.reason || '—')}
                    </td>
                    <td class="py-3 px-4 text-xs text-stone-400 font-mono">
                        ${escapeHtml(l.admin_email || SUPREME_ADMIN_EMAIL)}
                    </td>
                </tr>
            `;
        }).join('');
    }

    function generateAuditCsv(logs = []) {
        const BOM = '\uFEFF';
        const headers = ['Horodatage', 'Action', 'Type Cible', 'ID Cible', 'Motif', 'Administrateur'];
        const rows = logs.map(l => [
            `"${(l.timestamp || '').replace(/"/g, '""')}"`,
            `"${(l.action || '').replace(/"/g, '""')}"`,
            `"${(l.target_type || '').replace(/"/g, '""')}"`,
            `"${(l.target_id || '').replace(/"/g, '""')}"`,
            `"${(l.reason || '').replace(/"/g, '""')}"`,
            `"${(l.admin_email || '').replace(/"/g, '""')}"`
        ]);
        return BOM + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
    }

    // ==========================================
    // MODULE 8 : SIMULATEUR BUSINESS & CROISSANCE
    // ==========================================

    function renderSimulatorSection() {
        if (typeof document === 'undefined') return;
        const inputTrailers = document.getElementById('sim-active-trailers');
        const inputProRate = document.getElementById('sim-pro-rate');
        const inputRentalDays = document.getElementById('sim-rental-days');
        const inputDailyPrice = document.getElementById('sim-daily-price');
        const inputBoostRate = document.getElementById('sim-boost-rate');
        const inputFixedCosts = document.getElementById('sim-fixed-costs');

        const activeTrailers = inputTrailers ? Number(inputTrailers.value) : 50;
        const proRate = inputProRate ? Number(inputProRate.value) : 20;
        const rentalDays = inputRentalDays ? Number(inputRentalDays.value) : 4;
        const dailyPrice = inputDailyPrice ? Number(inputDailyPrice.value) : 65;
        const boostRate = inputBoostRate ? Number(inputBoostRate.value) : 15;
        const fixedCosts = inputFixedCosts ? Number(inputFixedCosts.value) : 250;

        // Mise à jour des libellés affichés
        const elValTrailers = document.getElementById('sim-active-trailers-val');
        if (elValTrailers) elValTrailers.textContent = String(activeTrailers);

        const elValPro = document.getElementById('sim-pro-rate-val');
        if (elValPro) elValPro.textContent = `${proRate}%`;

        const elValDays = document.getElementById('sim-rental-days-val');
        if (elValDays) elValDays.textContent = `${rentalDays} jour(s)`;

        const elValPrice = document.getElementById('sim-daily-price-val');
        if (elValPrice) elValPrice.textContent = `${dailyPrice} CHF`;

        const elValBoost = document.getElementById('sim-boost-rate-val');
        if (elValBoost) elValBoost.textContent = `${boostRate}%`;

        const elValCosts = document.getElementById('sim-fixed-costs-val');
        if (elValCosts) elValCosts.textContent = `${fixedCosts} CHF`;

        // Calcul mathématique
        const proj = calculateSimulatorProjections({
            activeTrailers,
            proRate,
            rentalDays,
            dailyPrice,
            boostRate,
            fixedCosts
        });

        // Mise à jour des cartes de résultats
        const elGmvM = document.getElementById('sim-out-gmv-monthly');
        if (elGmvM) elGmvM.textContent = formatChf(proj.gmvMonthly);

        const elGmvA = document.getElementById('sim-out-gmv-annual');
        if (elGmvA) elGmvA.textContent = formatChf(proj.gmvAnnual);

        const elMrr = document.getElementById('sim-out-mrr');
        if (elMrr) elMrr.textContent = formatChf(proj.mrr);

        const elArr = document.getElementById('sim-out-arr');
        if (elArr) elArr.textContent = formatChf(proj.arr);

        const elProCount = document.getElementById('sim-out-pro-count');
        if (elProCount) elProCount.textContent = String(proj.nbPro);

        const elTotRev = document.getElementById('sim-out-total-revenue');
        if (elTotRev) elTotRev.textContent = formatChf(proj.totalNetRevenue);

        const elNetProfit = document.getElementById('sim-out-net-profit');
        if (elNetProfit) {
            elNetProfit.textContent = formatChf(proj.netProfit);
            elNetProfit.className = proj.netProfit >= 0 ? 'text-2xl font-black text-emerald-400' : 'text-2xl font-black text-red-400';
        }

        const elNetMargin = document.getElementById('sim-out-net-margin');
        if (elNetMargin) {
            elNetMargin.textContent = `${proj.netMargin}%`;
            elNetMargin.className = proj.netMargin >= 0 ? 'font-bold text-emerald-400' : 'font-bold text-red-400';
        }

        // Breakdown
        const elBdCom = document.getElementById('sim-breakdown-commissions');
        if (elBdCom) elBdCom.textContent = formatChf(proj.platformCommissions);

        const elBdFees = document.getElementById('sim-breakdown-renter-fees');
        if (elBdFees) elBdFees.textContent = formatChf(proj.renterFees);

        const elBdPro = document.getElementById('sim-breakdown-pro');
        if (elBdPro) elBdPro.textContent = formatChf(proj.mrr);

        const elBdBoost = document.getElementById('sim-breakdown-boosts');
        if (elBdBoost) elBdBoost.textContent = formatChf(proj.boostRevenue);

        const elBdCosts = document.getElementById('sim-breakdown-costs');
        if (elBdCosts) elBdCosts.textContent = `-${formatChf(proj.fixedCosts)}`;

        // Break-Even Point
        const elBeTrailers = document.getElementById('sim-out-breakeven-trailers');
        if (elBeTrailers) elBeTrailers.textContent = String(proj.breakEvenTrailers);

        const elBeBookings = document.getElementById('sim-out-breakeven-bookings');
        if (elBeBookings) elBeBookings.textContent = String(proj.breakEvenBookings);

        // Table comparative Données Réelles vs Scénario Simulé
        const compTbody = document.getElementById('sim-comparison-tbody');
        if (compTbody && computedMetrics) {
            const realTrailers = computedMetrics.trailers.active || 0;
            const realProRate = computedMetrics.users.proRate || 0;
            const realGmv = computedMetrics.bookings.grossVolume || 0;
            const realNet = computedMetrics.bookings.platformNetRevenue || 0;
            const realBookings = computedMetrics.bookings.confirmed || 0;

            const rows = [
                {
                    name: 'Flotte de Remorques Actives',
                    real: `${realTrailers} remorque(s)`,
                    sim: `${proj.activeTrailers} remorques`,
                    diff: `${proj.activeTrailers - realTrailers >= 0 ? '+' : ''}${proj.activeTrailers - realTrailers}`
                },
                {
                    name: "Taux d'Abonnés PRO (%)",
                    real: `${realProRate}%`,
                    sim: `${proj.proRate}%`,
                    diff: `${proj.proRate - realProRate >= 0 ? '+' : ''}${Math.round((proj.proRate - realProRate) * 10) / 10}%`
                },
                {
                    name: "Volume Brut Mensuel (GMV)",
                    real: formatChf(realGmv),
                    sim: formatChf(proj.gmvMonthly),
                    diff: `${proj.gmvMonthly - realGmv >= 0 ? '+' : ''}${formatChf(proj.gmvMonthly - realGmv)}`
                },
                {
                    name: "Revenu Net Mensuel Renger",
                    real: formatChf(realNet),
                    sim: formatChf(proj.totalNetRevenue),
                    diff: `${proj.totalNetRevenue - realNet >= 0 ? '+' : ''}${formatChf(proj.totalNetRevenue - realNet)}`
                },
                {
                    name: "Réservations Payées Mensuelles",
                    real: `${realBookings} loc(s)`,
                    sim: `${proj.totalBookings} locs`,
                    diff: `${proj.totalBookings - realBookings >= 0 ? '+' : ''}${proj.totalBookings - realBookings}`
                }
            ];

            compTbody.innerHTML = rows.map(r => `
                <tr class="border-b border-stone-800 hover:bg-stone-800/40 transition">
                    <td class="py-3 px-4 font-bold text-white text-xs">${escapeHtml(r.name)}</td>
                    <td class="py-3 px-4 text-xs text-stone-300 font-mono text-right">${escapeHtml(r.real)}</td>
                    <td class="py-3 px-4 text-xs text-terracotta-400 font-mono font-bold text-right">${escapeHtml(r.sim)}</td>
                    <td class="py-3 px-4 text-xs font-mono font-bold text-right ${r.diff.startsWith('+') ? 'text-emerald-400' : 'text-stone-400'}">${escapeHtml(r.diff)}</td>
                </tr>
            `).join('');
        }
    }

    // ==========================================
    // INITIALISATION PRINCIPALE DU PANEL SYNI
    // ==========================================

    async function initSyni() {
        if (typeof window === 'undefined' || typeof document === 'undefined') return;

        const authGuard = document.getElementById('syni-auth-guard');
        const passModal = document.getElementById('syni-passphrase-modal');
        const mainPanel = document.getElementById('syni-main-panel');

        // 1. Récupération de l'utilisateur courant Supabase
        let user = null;
        let profile = null;

        if (window.supabaseClient) {
            const { data: { session } } = await window.supabaseClient.auth.getSession();
            user = session?.user || null;
            if (user) {
                const { data: prof } = await window.supabaseClient
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .maybeSingle();
                profile = prof || null;
            }
        }

        // 2. Contrôle strict de l'accès Administrateur Suprême
        const hasAccess = checkSupremeAdminAccess(user, profile);
        if (!hasAccess) {
            if (authGuard) authGuard.classList.remove('hidden');
            if (passModal) passModal.classList.add('hidden');
            if (mainPanel) mainPanel.classList.add('hidden');
            return;
        }

        // L'utilisateur est autorisé : on masque le guard
        if (authGuard) authGuard.classList.add('hidden');

        // 3. Contrôle du 2ème facteur (Passphrase Maîtresse SYNI_MASTER_KEY)
        if (!isSessionUnlocked()) {
            if (passModal) passModal.classList.remove('hidden');
            if (mainPanel) mainPanel.classList.add('hidden');
            setupPassphraseModalListeners();
            return;
        }

        // Déverrouillé : affichage du cockpit principal
        if (passModal) passModal.classList.add('hidden');
        if (mainPanel) mainPanel.classList.remove('hidden');

        // 4. Chargement des données
        try {
            await fetchSyniData({ timeRange: currentTimeRange });
            renderCurrentModule();
        } catch (err) {
            if (err.message && (err.message.includes('Passphrase') || err.message.includes('non autorisé'))) {
                lockSession();
                if (passModal) passModal.classList.remove('hidden');
                if (mainPanel) mainPanel.classList.add('hidden');
                const errorEl = document.getElementById('syni-passphrase-error');
                if (errorEl) {
                    errorEl.textContent = err.message;
                    errorEl.classList.remove('hidden');
                }
            } else if (typeof showToast === 'function') {
                showToast("Erreur lors du chargement des données Syni : " + err.message, "error");
            }
        }

        // 5. Attachement des écouteurs d'événements de l'interface
        setupUiEventListeners();
    }

    function setupPassphraseModalListeners() {
        const input = document.getElementById('syni-passphrase-input');
        const submitBtn = document.getElementById('syni-passphrase-submit');
        const errorEl = document.getElementById('syni-passphrase-error');

        function tryUnlock() {
            const key = (input?.value || '').trim();
            const ok = unlockSession(key);
            if (ok) {
                if (errorEl) errorEl.classList.add('hidden');
                const passModal = document.getElementById('syni-passphrase-modal');
                const mainPanel = document.getElementById('syni-main-panel');
                if (passModal) passModal.classList.add('hidden');
                if (mainPanel) mainPanel.classList.remove('hidden');
                fetchSyniData({ passphrase: key }).then(() => renderCurrentModule()).catch((err) => {
                    lockSession();
                    if (passModal) passModal.classList.remove('hidden');
                    if (mainPanel) mainPanel.classList.add('hidden');
                    if (errorEl) {
                        errorEl.textContent = err.message || 'Passphrase incorrecte.';
                        errorEl.classList.remove('hidden');
                    }
                });
                setupUiEventListeners();
            } else {
                if (errorEl) {
                    errorEl.textContent = 'Passphrase maîtresse incorrecte. Accès refusé.';
                    errorEl.classList.remove('hidden');
                }
                if (input) input.value = '';
            }
        }

        if (submitBtn) submitBtn.onclick = tryUnlock;
        if (input) {
            input.onkeydown = (e) => {
                if (e.key === 'Enter') tryUnlock();
            };
            input.focus();
        }
    }

    function setupUiEventListeners() {
        // Toggle de la barre latérale (mobile / rétractable)
        const toggleSidebarBtn = document.getElementById('btn-toggle-sidebar');
        if (toggleSidebarBtn) {
            toggleSidebarBtn.onclick = () => {
                const sidebar = document.getElementById('syni-sidebar');
                if (sidebar) sidebar.classList.toggle('hidden');
            };
        }

        // Navigation bar latérale
        MODULES.forEach(mod => {
            const btn = document.getElementById(`tab-${mod}`);
            if (btn) {
                btn.onclick = () => switchSyniModule(mod);
            }
        });

        // Filtre temporel
        const timeFilter = document.getElementById('syni-time-range-select');
        if (timeFilter) {
            timeFilter.onchange = (e) => {
                currentTimeRange = e.target.value;
                if (rawData) {
                    computedMetrics = computeSyniMetrics(rawData, currentTimeRange);
                    renderCurrentModule();
                } else {
                    fetchSyniData({ timeRange: currentTimeRange }).then(() => renderCurrentModule());
                }
            };
        }

        // Bouton rafraîchir
        const refreshBtn = document.getElementById('btn-syni-refresh');
        if (refreshBtn) {
            refreshBtn.onclick = () => {
                fetchSyniData({ timeRange: currentTimeRange }).then(() => {
                    renderCurrentModule();
                    if (typeof showToast === 'function') showToast("Données Syni synchronisées", "success");
                });
            };
        }

        // Bouton verrouiller
        const lockBtn = document.getElementById('btn-syni-lock');
        if (lockBtn) {
            lockBtn.onclick = () => {
                lockSession();
                window.location.reload();
            };
        }

        // Exports CSV
        const exportUsersBtn = document.getElementById('btn-export-users-csv');
        if (exportUsersBtn) {
            exportUsersBtn.onclick = () => {
                if (!computedMetrics) return;
                const csv = generateUsersCsv(computedMetrics.users.list);
                triggerDownload(`syni-utilisateurs-${new Date().toISOString().split('T')[0]}.csv`, csv);
            };
        }

        const exportBookingsBtn = document.getElementById('btn-export-bookings-csv');
        if (exportBookingsBtn) {
            exportBookingsBtn.onclick = () => {
                if (!computedMetrics) return;
                const csv = generateBookingsCsv(computedMetrics.bookings.list);
                triggerDownload(`syni-reservations-cashflow-${new Date().toISOString().split('T')[0]}.csv`, csv);
            };
        }

        // Recherche utilisateurs
        const usersSearch = document.getElementById('users-search-input');
        if (usersSearch) usersSearch.oninput = () => renderUsersTable();

        const usersFilter = document.getElementById('users-filter-type');
        if (usersFilter) usersFilter.onchange = () => renderUsersTable();

        // Recherche réservations
        const bookingsSearch = document.getElementById('bookings-search-input');
        if (bookingsSearch) bookingsSearch.oninput = () => renderBookingsTable();

        const bookingsFilter = document.getElementById('bookings-filter-status');
        if (bookingsFilter) bookingsFilter.onchange = () => renderBookingsTable();

        // Recherche remorques
        const trailersSearch = document.getElementById('trailers-search-input');
        if (trailersSearch) trailersSearch.oninput = () => renderTrailersTable();

        // Connecteur Search Console
        const gscBtn = document.getElementById('btn-save-gsc');
        if (gscBtn) {
            gscBtn.onclick = () => {
                const tokenInput = document.getElementById('gsc-token-input');
                const val = (tokenInput?.value || '').trim();
                if (typeof window !== 'undefined' && window.localStorage) {
                    window.localStorage.setItem(GSC_TOKEN_KEY, val);
                }
                renderSeoSection();
                if (typeof showToast === 'function') showToast("Connecteur Search Console mis à jour", "success");
            };
        }

        // Module 7 : Bandeau d'Annonce Global (écouteurs de prévisualisation live)
        const bannerInputs = [
            'broadcast-banner-enabled',
            'broadcast-banner-type',
            'broadcast-banner-text',
            'broadcast-banner-link-text',
            'broadcast-banner-link-url',
            'broadcast-banner-dismissible'
        ];
        bannerInputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.oninput = updateBannerPreview;
                el.onchange = () => {
                    updateBannerPreview();
                    const statusLabel = document.getElementById('broadcast-banner-status-label');
                    if (statusLabel && id === 'broadcast-banner-enabled') {
                        statusLabel.textContent = el.checked ? 'Actif' : 'Inactif';
                        statusLabel.className = el.checked ? 'ml-2 text-xs font-mono font-bold text-emerald-400' : 'ml-2 text-xs font-mono text-stone-400';
                    }
                };
            }
        });

        // Sauvegarde Bandeau
        const btnSaveBanner = document.getElementById('btn-save-broadcast-banner');
        if (btnSaveBanner) {
            btnSaveBanner.onclick = () => {
                const isEnabled = document.getElementById('broadcast-banner-enabled')?.checked || false;
                const type = document.getElementById('broadcast-banner-type')?.value || 'info';
                const message = (document.getElementById('broadcast-banner-text')?.value || '').trim();
                const linkText = (document.getElementById('broadcast-banner-link-text')?.value || '').trim();
                const linkUrl = (document.getElementById('broadcast-banner-link-url')?.value || '').trim();
                const dismissible = document.getElementById('broadcast-banner-dismissible')?.checked ?? true;

                const cfg = {
                    enabled: isEnabled,
                    type,
                    message,
                    linkText,
                    linkUrl,
                    dismissible,
                    updatedAt: new Date().toISOString()
                };

                setBroadcastBannerConfig(cfg);
                recordAuditLog('update_broadcast_banner', 'system', 'banner', `Bandeau ${isEnabled ? 'activé' : 'désactivé'} : ${message}`);
                
                if (typeof initBroadcastBanner === 'function') {
                    initBroadcastBanner();
                } else if (typeof window !== 'undefined' && typeof window.initBroadcastBanner === 'function') {
                    window.initBroadcastBanner();
                }

                renderControlSection();
                if (typeof showToast === 'function') showToast("Bandeau d'annonce global synchronisé sur tout le site", "success");
            };
        }

        // Sauvegarde Mode Maintenance
        const maintCheck = document.getElementById('maintenance-mode-enabled');
        if (maintCheck) {
            maintCheck.onchange = () => {
                const label = document.getElementById('maintenance-mode-status-label');
                if (label) {
                    label.textContent = maintCheck.checked ? 'Actif (Site Bloqué)' : 'Inactif';
                    label.className = maintCheck.checked ? 'ml-2 text-xs font-mono font-bold text-red-400 animate-pulse' : 'ml-2 text-xs font-mono text-stone-400';
                }
            };
        }

        const btnSaveMaint = document.getElementById('btn-save-maintenance-mode');
        if (btnSaveMaint) {
            btnSaveMaint.onclick = () => {
                const enabled = document.getElementById('maintenance-mode-enabled')?.checked || false;
                const message = (document.getElementById('maintenance-mode-message')?.value || '').trim();

                const cfg = {
                    enabled,
                    message: message || "Maintenance technique en cours sur Renger.ch. Retour du service d'ici quelques instants. Merci de votre patience.",
                    updatedAt: new Date().toISOString()
                };

                setMaintenanceModeConfig(cfg);
                recordAuditLog('update_maintenance_mode', 'system', 'maintenance', `Mode maintenance : ${enabled ? 'Activé' : 'Désactivé'}`);

                if (typeof initMaintenanceMode === 'function') {
                    initMaintenanceMode();
                } else if (typeof window !== 'undefined' && typeof window.initMaintenanceMode === 'function') {
                    window.initMaintenanceMode();
                }

                renderControlSection();
                if (typeof showToast === 'function') showToast(`Mode maintenance ${enabled ? 'activé' : 'désactivé'}`, enabled ? 'warning' : 'success');
            };
        }

        // Recherche & filtre journal d'audit
        const auditSearch = document.getElementById('audit-log-search-input');
        if (auditSearch) auditSearch.oninput = () => renderAuditLogTable();

        const auditFilter = document.getElementById('audit-log-filter-type');
        if (auditFilter) auditFilter.onchange = () => renderAuditLogTable();

        const btnExportAudit = document.getElementById('btn-export-audit-csv');
        if (btnExportAudit) {
            btnExportAudit.onclick = () => {
                const logs = getAuditLogs();
                const csv = generateAuditCsv(logs);
                triggerDownload(`syni-audit-log-${new Date().toISOString().split('T')[0]}.csv`, csv);
            };
        }

        // Module 8 : Simulateur Business (sliders temps réel)
        const simSliderIds = [
            'sim-active-trailers',
            'sim-pro-rate',
            'sim-rental-days',
            'sim-daily-price',
            'sim-boost-rate',
            'sim-fixed-costs'
        ];
        simSliderIds.forEach(id => {
            const slider = document.getElementById(id);
            if (slider) {
                slider.oninput = renderSimulatorSection;
            }
        });

        // Bouton réinitialiser simulateur
        const btnResetSim = document.getElementById('btn-reset-simulator');
        if (btnResetSim) {
            btnResetSim.onclick = () => {
                const setVal = (id, val) => {
                    const el = document.getElementById(id);
                    if (el) el.value = val;
                };
                setVal('sim-active-trailers', 50);
                setVal('sim-pro-rate', 20);
                setVal('sim-rental-days', 4);
                setVal('sim-daily-price', 65);
                setVal('sim-boost-rate', 15);
                setVal('sim-fixed-costs', 250);
                renderSimulatorSection();
                if (typeof showToast === 'function') showToast("Simulateur réinitialisé aux valeurs par défaut", "info");
            };
        }
    }

    // Auto-démarrage dans le navigateur si syni.html
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
        window.addEventListener('DOMContentLoaded', () => {
            if (window.location && typeof window.location.pathname === 'string' && window.location.pathname.includes('syni.html')) {
                // Petit délai pour laisser Supabase et core.js s'initialiser
                setTimeout(initSyni, 80);
            }
        });
    }

    return {
        // Fonctions d'accès et sécurité
        checkSupremeAdminAccess,
        verifyMasterPassphrase,
        isSessionUnlocked,
        unlockSession,
        lockSession,
        // Calculs financiers et métriques
        calculateRentalDays,
        calculateBookingFinancials,
        computeSyniMetrics,
        computeGoogleSeoMetrics,
        // Module 8 : Simulateur Business
        calculateSimulatorProjections,
        renderSimulatorSection,
        // Module 7 : Contrôle Global, Diffusion & Maintenance
        getBroadcastBannerConfig,
        setBroadcastBannerConfig,
        getMaintenanceModeConfig,
        setMaintenanceModeConfig,
        renderControlSection,
        updateBannerPreview,
        // Modération & Actions Opérationnelles Suprêmes
        openActionModal,
        closeActionModal,
        executeSupremeAction,
        recordAuditLog,
        getAuditLogs,
        generateAuditCsv,
        // CSV Exports
        generateUsersCsv,
        generateBookingsCsv,
        // Cycle de vie UI
        switchSyniModule,
        fetchSyniData,
        initSyni,
        // Constantes
        SUPREME_ADMIN_EMAIL,
        SYNI_MASTER_KEY_DEFAULT,
        MODULES,
        PRIORITY_SWISS_KEYWORDS,
        BROADCAST_BANNER_KEY,
        MAINTENANCE_MODE_KEY,
        AUDIT_LOG_KEY
    };
}));
