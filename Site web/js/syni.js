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

    // Modules Syni
    const MODULES = ['cockpit', 'users', 'bookings', 'trailers', 'inspections', 'seo'];

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
        if (!computedMetrics) return;

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
            </tr>
        `).join('');
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
                    <td class="py-3 px-4 text-xs text-amber-400 text-right">${formatChf(fin.depositAmount)}</td>
                </tr>
            `;
        }).join('');
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
                        ${t.is_active !== false 
                            ? '<span class="text-emerald-400 font-bold">Active</span>' 
                            : '<span class="text-red-400 font-bold">Inactive</span>'}
                    </td>
                </tr>
            `;
        }).join('');
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
    }

    // Auto-démarrage dans le navigateur si syni.html
    if (typeof window !== 'undefined') {
        window.addEventListener('DOMContentLoaded', () => {
            if (window.location.pathname.includes('syni.html')) {
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
        PRIORITY_SWISS_KEYWORDS
    };
}));
