/**
 * Renger Analytics PRO — Cockpit & Statistiques Propriétaire
 * Gestion des KPIs, graphiques interactifs (Chart.js), filtres dynamiques et export
 * Sécurité : Zéro-Confiance, RLS Supabase, Sanitization XSS
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.RengerStats = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {

    // --- ÉTAT GLOBAL DE LA PAGE ---
    let currentUser = null;
    let userProfile = null;
    let userTrailers = [];
    let userBookings = [];
    let userImpressions = [];
    let userClicks = [];

    let currentPeriod = '30d'; // '7d' | '30d' | 'year' | 'all'
    let currentTrailerId = 'all'; // 'all' ou ID numérique
    let currentSearchQuery = '';
    let currentSortField = 'revenue';
    let currentSortAsc = false;

    // Instances Chart.js
    let trendChart = null;
    let doughnutChart = null;
    let comparisonChart = null;
    let funnelChart = null;

    let isThemeObserverAttached = false;
    let isAuthListenerAttached = false;

    // --- UTILITAIRES & NORMALISATION DES DATES ---
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
        return val.toLocaleString('fr-CH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }) + ' CHF';
    }

    function formatNumber(num) {
        const val = Number(num) || 0;
        return val.toLocaleString('fr-CH');
    }

    function isDarkMode() {
        return typeof document !== 'undefined' &&
            document.documentElement.classList.contains('dark');
    }

    function getSupabaseClient() {
        if (typeof window !== 'undefined' && window.supabaseClient) {
            return window.supabaseClient;
        }
        if (typeof supabaseClient !== 'undefined') {
            return supabaseClient;
        }
        return null;
    }

    // Normalise n'importe quelle date (Date, ISO string YYYY-MM-DD, timestamp)
    // à minuit local (00:00:00.000) pour garantir une arithmétique de calendrier exacte
    function normalizeToDateOnly(d) {
        if (!d) return null;
        if (d instanceof Date) {
            if (isNaN(d.getTime())) return null;
            return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
        }
        if (typeof d === 'string') {
            const parts = d.split('T')[0].split(' ')[0].split('-');
            if (parts.length === 3) {
                const yr = parseInt(parts[0], 10);
                const mo = parseInt(parts[1], 10) - 1;
                const dy = parseInt(parts[2], 10);
                if (!isNaN(yr) && !isNaN(mo) && !isNaN(dy)) {
                    return new Date(yr, mo, dy, 0, 0, 0, 0);
                }
            }
        }
        const dt = new Date(d);
        if (isNaN(dt.getTime())) return null;
        return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 0, 0, 0, 0);
    }

    // Formate une date normalisée en chaîne clé stable YYYY-MM-DD
    function formatDateKey(d) {
        const dt = normalizeToDateOnly(d);
        if (!dt) return '';
        const yr = dt.getFullYear();
        const mo = String(dt.getMonth() + 1).padStart(2, '0');
        const dy = String(dt.getDate()).padStart(2, '0');
        return `${yr}-${mo}-${dy}`;
    }

    // Calcul du prix journalier avec fallbacks cohérents
    function getBookingDailyPrice(booking, bStart, bEnd) {
        if (!booking) return 0;
        if (booking.trailers && Number(booking.trailers.price) > 0) {
            return Number(booking.trailers.price);
        }
        if (Number(booking.daily_price) > 0) {
            return Number(booking.daily_price);
        }
        if (Number(booking.total_price) > 0) {
            const s = normalizeToDateOnly(bStart);
            const e = normalizeToDateOnly(bEnd);
            const days = (s && e) ? Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1) : 1;
            return Number(booking.total_price) / days;
        }
        return 0;
    }

    // --- CALCUL DES INTERVALLES TEMPORELS ---
    function getPeriodDateRange(period) {
        const now = new Date();
        const today = normalizeToDateOnly(now);

        let start = new Date(today);
        let end = new Date(today);

        if (period === '7d') {
            start.setDate(start.getDate() - 6);
        } else if (period === '30d') {
            start.setDate(start.getDate() - 29);
        } else if (period === 'year') {
            start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
            end = new Date(now.getFullYear(), 11, 31, 0, 0, 0, 0);
        } else if (period === 'all') {
            // Trouver la date la plus ancienne parmi remorques et réservations
            let earliestTime = start.getTime();
            userTrailers.forEach(t => {
                if (t.created_at) {
                    const dt = normalizeToDateOnly(t.created_at);
                    if (dt && dt.getTime() < earliestTime) earliestTime = dt.getTime();
                }
            });
            userBookings.forEach(b => {
                if (b.start_date) {
                    const dt = normalizeToDateOnly(b.start_date);
                    if (dt && dt.getTime() < earliestTime) earliestTime = dt.getTime();
                }
            });
            start = new Date(earliestTime);

            // Pour fin : fin d'année courante ou fin de la réservation la plus lointaine
            let latestTime = new Date(now.getFullYear(), 11, 31, 0, 0, 0, 0).getTime();
            userBookings.forEach(b => {
                if (b.end_date) {
                    const dt = normalizeToDateOnly(b.end_date);
                    if (dt && dt.getTime() > latestTime) latestTime = dt.getTime();
                }
            });
            end = new Date(latestTime);
        }

        return { start, end };
    }

    // Calcul du chevauchement exact en jours entre deux plages de dates
    function calculateOverlapDays(startA, endA, startB, endB) {
        const sA = normalizeToDateOnly(startA);
        const eA = normalizeToDateOnly(endA);
        const sB = normalizeToDateOnly(startB);
        const eB = normalizeToDateOnly(endB);

        if (!sA || !eA || !sB || !eB) return 0;

        const overlapStart = Math.max(sA.getTime(), sB.getTime());
        const overlapEnd = Math.min(eA.getTime(), eB.getTime());

        if (overlapEnd < overlapStart) return 0;
        return Math.round((overlapEnd - overlapStart) / 86400000) + 1;
    }

    // --- INITIALISATION PRINCIPALE & AUTH LISTENER ---
    function setupAuthListener(client) {
        if (isAuthListenerAttached || !client || !client.auth) return;
        isAuthListenerAttached = true;
        client.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
                await initStatsPage();
            }
        });
    }

    async function initStatsPage() {
        const loadingState = document.getElementById('stats-loading-state');
        const upsellContainer = document.getElementById('stats-upsell-container');
        const dashboardContainer = document.getElementById('stats-dashboard-container');

        if (!loadingState || !dashboardContainer) return;

        const client = getSupabaseClient();
        if (!client) {
            // Client Supabase non initialisé
            loadingState.classList.add('hidden');
            if (upsellContainer) upsellContainer.classList.remove('hidden');
            dashboardContainer.classList.add('hidden');
            return;
        }

        // Brancher l'écouteur d'authentification pour synchroniser automatiquement les sessions
        setupAuthListener(client);

        try {
            // 1. Récupération de l'utilisateur authentifié
            const { data: { user }, error: userError } = await client.auth.getUser();

            if (userError || !user) {
                currentUser = null;
                userProfile = null;
                userTrailers = [];
                userBookings = [];
                loadingState.classList.add('hidden');
                if (upsellContainer) upsellContainer.classList.remove('hidden');
                dashboardContainer.classList.add('hidden');
                return;
            }

            currentUser = user;

            // 2. Vérification du statut PRO
            const { data: profile } = await client
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .maybeSingle();

            userProfile = profile;

            if (!profile || !profile.is_pro) {
                // Utilisateur connecté mais pas abonné PRO -> Écran d'upsell
                userTrailers = [];
                userBookings = [];
                loadingState.classList.add('hidden');
                if (upsellContainer) upsellContainer.classList.remove('hidden');
                dashboardContainer.classList.add('hidden');
                return;
            }

            // Utilisateur connecté ET PRO -> Chargement des données de flotte
            await fetchAllUserData(client, user.id);

            // Remplir le sélecteur de remorques
            populateTrailerSelector();

            // Mettre à jour l'affichage
            recomputeAndRender();

            // Afficher le cockpit
            loadingState.classList.add('hidden');
            if (upsellContainer) upsellContainer.classList.add('hidden');
            dashboardContainer.classList.remove('hidden');

            // Écouteur de changement de thème pour re-styler les charts
            attachThemeObserver();

        } catch (err) {
            console.error('Erreur lors du chargement de stats.html:', err);
            loadingState.classList.add('hidden');
            if (upsellContainer) upsellContainer.classList.remove('hidden');
            dashboardContainer.classList.add('hidden');
        }
    }

    // --- RÉCUPÉRATION DES DONNÉES SUPABASE ---
    async function fetchAllUserData(client, userId) {
        // 1. Annonces de l'utilisateur
        const { data: trailers } = await client
            .from('trailers')
            .select('*')
            .eq('owner_id', userId)
            .order('id', { ascending: false });

        userTrailers = (trailers || []).filter(t => t.is_active !== false);
        const trailerIds = userTrailers.map(t => t.id);

        if (trailerIds.length === 0) {
            userBookings = [];
            userImpressions = [];
            userClicks = [];
            return;
        }

        // 2. Réservations confirmées/payées
        const { data: bookings } = await client
            .from('bookings')
            .select('*, trailers(*)')
            .eq('owner_id', userId)
            .in('status', ['paid', 'confirmed', 'paye'])
            .order('start_date', { ascending: true });

        userBookings = bookings || [];

        // 3. Impressions (Vues dans la grille)
        try {
            const { data: impressions } = await client
                .from('impressions')
                .select('id, trailer_id, created_at')
                .in('trailer_id', trailerIds);
            userImpressions = impressions || [];
        } catch (e) {
            userImpressions = [];
        }

        // 4. Clics (Consultation de fiche)
        try {
            const { data: clicks } = await client
                .from('clicks')
                .select('id, trailer_id, created_at')
                .in('trailer_id', trailerIds);
            userClicks = clicks || [];
        } catch (e) {
            userClicks = [];
        }
    }

    // --- PEUPLEMENT DU SÉLECTEUR DE REMORQUES ---
    function populateTrailerSelector() {
        const selector = document.getElementById('stats-trailer-select');
        if (!selector) return;

        selector.innerHTML = `<option value="all">Toutes mes remorques (${userTrailers.length} active${userTrailers.length > 1 ? 's' : ''})</option>`;

        userTrailers.forEach(t => {
            const opt = document.createElement('option');
            opt.value = String(t.id);
            const cityText = t.location_city ? ` (${t.location_city})` : '';
            opt.textContent = `${t.title || 'Remorque #' + t.id}${cityText} — ${t.price} CHF/j`;
            selector.appendChild(opt);
        });

        // Garantir que currentTrailerId pointe vers une option existante
        const exists = Array.from(selector.options).some(o => o.value === String(currentTrailerId));
        if (!exists) {
            currentTrailerId = 'all';
        }
        selector.value = currentTrailerId;
    }

    // --- CALCUL CONSOLIDÉ DES STATISTIQUES SELON LES FILTRES ---
    function calculateStatistics() {
        const { start: pStart, end: pEnd } = getPeriodDateRange(currentPeriod);
        const isAllHistory = currentPeriod === 'all';

        // Filtrer les remorques pertinentes
        const targetTrailers = currentTrailerId === 'all'
            ? userTrailers
            : userTrailers.filter(t => String(t.id) === String(currentTrailerId));

        const targetTrailerIds = new Set(targetTrailers.map(t => String(t.id)));

        // 1. Filtrer les réservations avec chevauchement temporel
        const filteredBookings = userBookings.filter(b => {
            if (!targetTrailerIds.has(String(b.trailer_id))) return false;
            if (!b.start_date || !b.end_date) return false;

            const bStart = normalizeToDateOnly(b.start_date);
            const bEnd = normalizeToDateOnly(b.end_date);
            if (!bStart || !bEnd) return false;

            if (isAllHistory) return true;
            // Overlap avec la période sélectionnée
            return calculateOverlapDays(bStart, bEnd, pStart, pEnd) > 0;
        });

        // 2. Calcul du CA net et des jours loués sur la période
        let totalNetRevenue = 0;
        let totalRentedDays = 0;
        let totalProSavings = 0;

        const trailerStatsMap = new Map();
        targetTrailers.forEach(t => {
            trailerStatsMap.set(String(t.id), {
                trailer: t,
                revenue: 0,
                rentedDays: 0,
                bookingsCount: 0,
                proSavings: 0
            });
        });

        filteredBookings.forEach(b => {
            const bStart = normalizeToDateOnly(b.start_date);
            const bEnd = normalizeToDateOnly(b.end_date);
            if (!bStart || !bEnd) return;

            const daysInPeriod = isAllHistory
                ? Math.round((bEnd.getTime() - bStart.getTime()) / 86400000) + 1
                : calculateOverlapDays(bStart, bEnd, pStart, pEnd);

            if (daysInPeriod <= 0) return;

            const dailyPrice = getBookingDailyPrice(b, bStart, bEnd);
            const revenue = daysInPeriod * dailyPrice;
            const savings = revenue * 0.20; // 20% de commission économisée grâce à l'offre PRO

            totalNetRevenue += revenue;
            totalRentedDays += daysInPeriod;
            totalProSavings += savings;

            const stat = trailerStatsMap.get(String(b.trailer_id));
            if (stat) {
                stat.revenue += revenue;
                stat.rentedDays += daysInPeriod;
                stat.bookingsCount += 1;
                stat.proSavings += savings;
            }
        });

        // 3. Calcul du taux d'occupation sur la période exacte
        const periodDurationDays = Math.max(1, Math.round((pEnd.getTime() - pStart.getTime()) / 86400000) + 1);
        const fleetSize = targetTrailers.length;
        const totalAvailableDays = fleetSize * periodDurationDays;
        const occupancyRate = totalAvailableDays > 0
            ? Math.min(100, (totalRentedDays / totalAvailableDays) * 100)
            : 0;

        // 4. Impressions et clics
        const filteredImpressions = userImpressions.filter(imp => {
            if (!targetTrailerIds.has(String(imp.trailer_id))) return false;
            if (isAllHistory) return true;
            const impDate = normalizeToDateOnly(imp.created_at);
            return impDate && impDate.getTime() >= pStart.getTime() && impDate.getTime() <= pEnd.getTime();
        });

        const filteredClicks = userClicks.filter(clk => {
            if (!targetTrailerIds.has(String(clk.trailer_id))) return false;
            if (isAllHistory) return true;
            const clkDate = normalizeToDateOnly(clk.created_at);
            return clkDate && clkDate.getTime() >= pStart.getTime() && clkDate.getTime() <= pEnd.getTime();
        });

        const impressionsCount = filteredImpressions.length;
        const clicksCount = filteredClicks.length;
        const bookingsCount = filteredBookings.length;
        const conversionRate = clicksCount > 0
            ? ((bookingsCount / clicksCount) * 100)
            : 0;

        const avgBasket = bookingsCount > 0
            ? (totalNetRevenue / bookingsCount)
            : 0;

        return {
            pStart,
            pEnd,
            targetTrailers,
            filteredBookings,
            totalNetRevenue,
            totalRentedDays,
            totalAvailableDays,
            occupancyRate,
            bookingsCount,
            totalProSavings,
            impressionsCount,
            clicksCount,
            conversionRate,
            avgBasket,
            trailerStatsMap,
            periodDurationDays
        };
    }

    // --- RECALCUL ET RENDU GLOBAL ---
    function recomputeAndRender() {
        const stats = calculateStatistics();

        // 1. Rendu des Top KPI Cards
        renderKpis(stats);

        // 2. Rendu des Graphiques Chart.js
        renderTrendChart(stats);
        renderOccupancyDoughnutChart(stats);
        renderTrailerComparisonChart(stats);
        renderConversionFunnelChart(stats);

        // 3. Rendu du Tableau détaillé
        renderDetailedTable(stats);
    }

    // --- RENDU DES KPIS ---
    function renderKpis(stats) {
        const elNetRevenue = document.getElementById('kpi-net-earnings');
        const elOccupancy = document.getElementById('kpi-occupancy-rate');
        const elRentedDays = document.getElementById('kpi-rented-days-count');
        const elTotalDays = document.getElementById('kpi-total-available-days');
        const elBookings = document.getElementById('kpi-total-bookings');
        const elAvgBasket = document.getElementById('kpi-avg-basket');
        const elConversion = document.getElementById('kpi-conversion-rate');
        const elClicks = document.getElementById('kpi-clicks-count');
        const elImpressions = document.getElementById('kpi-impressions-count');
        const elRoiCounter = document.getElementById('kpi-roi-counter');
        const elDonutRented = document.getElementById('donut-rented-label');
        const elDonutFree = document.getElementById('donut-free-label');
        const elFunnelImp = document.getElementById('funnel-imp-count');
        const elFunnelClk = document.getElementById('funnel-clk-count');
        const elFunnelBk = document.getElementById('funnel-bk-count');

        if (elNetRevenue) elNetRevenue.textContent = formatChf(stats.totalNetRevenue);
        if (elOccupancy) elOccupancy.textContent = stats.occupancyRate.toFixed(1) + '%';
        if (elRentedDays) elRentedDays.textContent = formatNumber(stats.totalRentedDays);
        if (elTotalDays) elTotalDays.textContent = formatNumber(stats.totalAvailableDays);
        if (elBookings) elBookings.textContent = formatNumber(stats.bookingsCount);
        if (elAvgBasket) elAvgBasket.textContent = formatChf(stats.avgBasket);
        if (elConversion) elConversion.textContent = stats.conversionRate.toFixed(1) + '%';
        if (elClicks) elClicks.textContent = formatNumber(stats.clicksCount);
        if (elImpressions) elImpressions.textContent = formatNumber(stats.impressionsCount);
        if (elRoiCounter) elRoiCounter.textContent = '+' + formatChf(stats.totalProSavings);

        if (elDonutRented) elDonutRented.textContent = stats.totalRentedDays + ' j';
        if (elDonutFree) {
            const freeDays = Math.max(0, stats.totalAvailableDays - stats.totalRentedDays);
            elDonutFree.textContent = freeDays + ' j';
        }

        if (elFunnelImp) elFunnelImp.textContent = formatNumber(stats.impressionsCount);
        if (elFunnelClk) elFunnelClk.textContent = formatNumber(stats.clicksCount);
        if (elFunnelBk) elFunnelBk.textContent = formatNumber(stats.bookingsCount);
    }

    // --- CHARTS CONFIG & DARK MODE ---
    function getChartTheme() {
        const dark = isDarkMode();
        return {
            textColor: dark ? '#d6d3d1' : '#57534e',
            gridColor: dark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.06)',
            tooltipBg: dark ? '#1c1917' : '#ffffff',
            tooltipText: dark ? '#f5f5f4' : '#1c1917',
            tooltipBorder: dark ? '#44403c' : '#e7e5e4',
            terracotta: '#d85110',
            terracottaBg: 'rgba(216, 81, 16, 0.15)',
            secondaryBar: dark ? '#78716c' : '#a8a29e',
            emerald: '#059669',
            blue: '#2563eb'
        };
    }

    // --- GRAPHIQUE 1 : ÉVOLUTION CA & VOLUME ---
    function renderTrendChart(stats) {
        const ctx = document.getElementById('revenueTrendChart');
        if (!ctx || typeof Chart === 'undefined') return;

        if (typeof Chart !== 'undefined' && Chart.getChart) {
            const existing = Chart.getChart(ctx);
            if (existing) existing.destroy();
        }
        if (trendChart) {
            trendChart.destroy();
            trendChart = null;
        }

        const theme = getChartTheme();
        const { labels, revenueData, bookingsData } = aggregateTrendData(stats);

        trendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'CA Net (CHF)',
                        data: revenueData,
                        borderColor: theme.terracotta,
                        backgroundColor: theme.terracottaBg,
                        borderWidth: 2.5,
                        pointBackgroundColor: theme.terracotta,
                        pointHoverRadius: 6,
                        tension: 0.35,
                        fill: true,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Réservations',
                        data: bookingsData,
                        borderColor: theme.secondaryBar,
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        borderDash: [4, 4],
                        pointBackgroundColor: theme.secondaryBar,
                        pointRadius: 3,
                        tension: 0.2,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: theme.tooltipBg,
                        titleColor: theme.tooltipText,
                        bodyColor: theme.tooltipText,
                        borderColor: theme.tooltipBorder,
                        borderWidth: 1,
                        padding: 10,
                        boxPadding: 4,
                        callbacks: {
                            label: function (context) {
                                if (context.datasetIndex === 0) {
                                    return ` CA Net : ${Number(context.raw).toFixed(2)} CHF`;
                                }
                                return ` Réservations : ${context.raw}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: theme.gridColor },
                        ticks: { color: theme.textColor, font: { size: 10, weight: '600' } }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        grid: { color: theme.gridColor },
                        ticks: {
                            color: theme.textColor,
                            callback: value => value + ' CHF',
                            font: { size: 10 }
                        },
                        beginAtZero: true
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        grid: { drawOnChartArea: false },
                        ticks: {
                            color: theme.textColor,
                            stepSize: 1,
                            font: { size: 10 }
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    function aggregateTrendData(stats) {
        const labels = [];
        const revenueMap = new Map();
        const bookingsMap = new Map();

        if (currentPeriod === '7d' || currentPeriod === '30d') {
            // Agrégation par jour
            const dayCount = currentPeriod === '7d' ? 7 : 30;
            const now = new Date();
            for (let i = dayCount - 1; i >= 0; i--) {
                const d = new Date(now);
                d.setDate(d.getDate() - i);
                const dt = normalizeToDateOnly(d);
                const key = formatDateKey(dt);
                const label = dt.toLocaleDateString('fr-CH', { day: 'numeric', month: 'short' });
                labels.push(label);
                revenueMap.set(key, 0);
                bookingsMap.set(key, 0);
            }

            stats.filteredBookings.forEach(b => {
                const bStart = normalizeToDateOnly(b.start_date);
                const bEnd = normalizeToDateOnly(b.end_date);
                if (!bStart || !bEnd) return;

                const dailyPrice = getBookingDailyPrice(b, bStart, bEnd);

                let cur = new Date(bStart);
                while (cur.getTime() <= bEnd.getTime()) {
                    const key = formatDateKey(cur);
                    if (revenueMap.has(key)) {
                        revenueMap.set(key, revenueMap.get(key) + dailyPrice);
                    }
                    cur.setDate(cur.getDate() + 1);
                }

                // Compter la réservation au jour de début s'il est dans la fenêtre,
                // ou au premier jour de la fenêtre sélectionnée si elle a démarré avant
                let startKey = formatDateKey(bStart);
                if (!bookingsMap.has(startKey)) {
                    const firstKey = formatDateKey(stats.pStart);
                    if (bookingsMap.has(firstKey)) {
                        startKey = firstKey;
                    }
                }
                if (bookingsMap.has(startKey)) {
                    bookingsMap.set(startKey, bookingsMap.get(startKey) + 1);
                }
            });

            return {
                labels,
                revenueData: Array.from(revenueMap.values()),
                bookingsData: Array.from(bookingsMap.values())
            };

        } else {
            // Agrégation par mois (Année ou Tout l'historique)
            const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
            const curYear = new Date().getFullYear();

            for (let m = 0; m < 12; m++) {
                labels.push(months[m]);
                revenueMap.set(m, 0);
                bookingsMap.set(m, 0);
            }

            stats.filteredBookings.forEach(b => {
                const bStart = normalizeToDateOnly(b.start_date);
                const bEnd = normalizeToDateOnly(b.end_date);
                if (!bStart || !bEnd) return;

                const dailyPrice = getBookingDailyPrice(b, bStart, bEnd);

                let cur = new Date(bStart);
                while (cur.getTime() <= bEnd.getTime()) {
                    if (currentPeriod === 'all' || cur.getFullYear() === curYear) {
                        const m = cur.getMonth();
                        if (revenueMap.has(m)) {
                            revenueMap.set(m, revenueMap.get(m) + dailyPrice);
                        }
                    }
                    cur.setDate(cur.getDate() + 1);
                }

                if (currentPeriod === 'all' || bStart.getFullYear() === curYear) {
                    const m = bStart.getMonth();
                    if (bookingsMap.has(m)) {
                        bookingsMap.set(m, bookingsMap.get(m) + 1);
                    }
                }
            });

            return {
                labels,
                revenueData: Array.from(revenueMap.values()),
                bookingsData: Array.from(bookingsMap.values())
            };
        }
    }

    // --- GRAPHIQUE 2 : COMPARATIF PAR REMORQUE ---
    function renderTrailerComparisonChart(stats) {
        const ctx = document.getElementById('trailerComparisonChart');
        if (!ctx || typeof Chart === 'undefined') return;

        if (typeof Chart !== 'undefined' && Chart.getChart) {
            const existing = Chart.getChart(ctx);
            if (existing) existing.destroy();
        }
        if (comparisonChart) {
            comparisonChart.destroy();
            comparisonChart = null;
        }

        const theme = getChartTheme();

        const labels = [];
        const revenues = [];
        const days = [];

        stats.trailerStatsMap.forEach(s => {
            const shortTitle = s.trailer.title
                ? (s.trailer.title.length > 18 ? s.trailer.title.substring(0, 16) + '…' : s.trailer.title)
                : 'Remorque #' + s.trailer.id;
            labels.push(shortTitle);
            revenues.push(s.revenue);
            days.push(s.rentedDays);
        });

        if (labels.length === 0) {
            labels.push('Aucune remorque');
            revenues.push(0);
            days.push(0);
        }

        comparisonChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'CA Net (CHF)',
                        data: revenues,
                        backgroundColor: theme.terracotta,
                        borderRadius: 8,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Jours loués',
                        data: days,
                        backgroundColor: theme.secondaryBar,
                        borderRadius: 8,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: theme.textColor, font: { size: 10, weight: 'bold' } }
                    },
                    tooltip: {
                        backgroundColor: theme.tooltipBg,
                        titleColor: theme.tooltipText,
                        bodyColor: theme.tooltipText,
                        borderColor: theme.tooltipBorder,
                        borderWidth: 1,
                        padding: 10
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: theme.textColor, font: { size: 10, weight: 'bold' } }
                    },
                    y: {
                        type: 'linear',
                        position: 'left',
                        grid: { color: theme.gridColor },
                        ticks: { color: theme.textColor, callback: v => v + ' CHF', font: { size: 10 } },
                        beginAtZero: true
                    },
                    y1: {
                        type: 'linear',
                        position: 'right',
                        grid: { drawOnChartArea: false },
                        ticks: { color: theme.textColor, stepSize: 1, callback: v => v + ' j', font: { size: 10 } },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // --- GRAPHIQUE 3 : DONUT OCCUPATION ---
    function renderOccupancyDoughnutChart(stats) {
        const ctx = document.getElementById('occupancyDoughnutChart');
        if (!ctx || typeof Chart === 'undefined') return;

        if (typeof Chart !== 'undefined' && Chart.getChart) {
            const existing = Chart.getChart(ctx);
            if (existing) existing.destroy();
        }
        if (doughnutChart) {
            doughnutChart.destroy();
            doughnutChart = null;
        }

        const theme = getChartTheme();
        const rented = stats.totalRentedDays;
        const free = Math.max(0, stats.totalAvailableDays - stats.totalRentedDays);

        doughnutChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Jours Loués', 'Jours Disponibles'],
                datasets: [{
                    data: [rented, free === 0 && rented === 0 ? 1 : free],
                    backgroundColor: [theme.terracotta, isDarkMode() ? '#44403c' : '#e7e5e4'],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '72%',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: theme.tooltipBg,
                        titleColor: theme.tooltipText,
                        bodyColor: theme.tooltipText,
                        borderColor: theme.tooltipBorder,
                        borderWidth: 1,
                        callbacks: {
                            label: function (context) {
                                if (rented === 0 && stats.totalAvailableDays === 0) {
                                    return ` ${context.label} : 0 jour`;
                                }
                                return ` ${context.label} : ${context.raw} jour${context.raw > 1 ? 's' : ''}`;
                            }
                        }
                    }
                }
            }
        });
    }

    // --- GRAPHIQUE 4 : ENTONNOIR DE CONVERSION ---
    function renderConversionFunnelChart(stats) {
        const ctx = document.getElementById('conversionFunnelChart');
        if (!ctx || typeof Chart === 'undefined') return;

        if (typeof Chart !== 'undefined' && Chart.getChart) {
            const existing = Chart.getChart(ctx);
            if (existing) existing.destroy();
        }
        if (funnelChart) {
            funnelChart.destroy();
            funnelChart = null;
        }

        const theme = getChartTheme();

        funnelChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['1. Vues Grille', '2. Fiches Détail', '3. Réservations'],
                datasets: [{
                    label: 'Volume',
                    data: [stats.impressionsCount, stats.clicksCount, stats.bookingsCount],
                    backgroundColor: [
                        theme.secondaryBar,
                        theme.blue,
                        theme.emerald
                    ],
                    borderRadius: 8,
                    barThickness: 28
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: theme.tooltipBg,
                        titleColor: theme.tooltipText,
                        bodyColor: theme.tooltipText,
                        borderColor: theme.tooltipBorder,
                        borderWidth: 1,
                        padding: 10
                    }
                },
                scales: {
                    x: {
                        grid: { color: theme.gridColor },
                        ticks: { color: theme.textColor, font: { size: 10 } },
                        beginAtZero: true
                    },
                    y: {
                        grid: { display: false },
                        ticks: { color: theme.textColor, font: { size: 11, weight: 'bold' } }
                    }
                }
            }
        });
    }

    // --- TABLEAU RÉCAPITULATIF DÉTAILLÉ AVEC TRI ---
    function renderDetailedTable(stats) {
        const tbody = document.getElementById('stats-table-body');
        if (!tbody) return;

        let rows = Array.from(stats.trailerStatsMap.values());

        // Filtrage textuel local
        if (currentSearchQuery.trim()) {
            const q = currentSearchQuery.toLowerCase();
            rows = rows.filter(r => {
                const title = (r.trailer.title || '').toLowerCase();
                const city = (r.trailer.location_city || '').toLowerCase();
                return title.includes(q) || city.includes(q);
            });
        }

        // Tri
        rows.sort((a, b) => {
            let valA, valB;
            if (currentSortField === 'title') {
                valA = (a.trailer.title || '').toLowerCase();
                valB = (b.trailer.title || '').toLowerCase();
                return currentSortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
            } else if (currentSortField === 'price') {
                valA = Number(a.trailer.price) || 0;
                valB = Number(b.trailer.price) || 0;
            } else if (currentSortField === 'bookings') {
                valA = a.bookingsCount;
                valB = b.bookingsCount;
            } else if (currentSortField === 'days') {
                valA = a.rentedDays;
                valB = b.rentedDays;
            } else if (currentSortField === 'occupancy') {
                valA = stats.periodDurationDays > 0 ? (a.rentedDays / stats.periodDurationDays) : 0;
                valB = stats.periodDurationDays > 0 ? (b.rentedDays / stats.periodDurationDays) : 0;
            } else if (currentSortField === 'savings') {
                valA = a.proSavings;
                valB = b.proSavings;
            } else {
                // revenue par défaut
                valA = a.revenue;
                valB = b.revenue;
            }

            return currentSortAsc ? valA - valB : valB - valA;
        });

        if (rows.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-8 text-stone-400 italic">
                        Aucune annonce ne correspond aux filtres sélectionnés.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = '';
        rows.forEach(item => {
            const t = item.trailer;
            const occupancyPct = stats.periodDurationDays > 0
                ? Math.min(100, (item.rentedDays / stats.periodDurationDays) * 100).toFixed(1)
                : '0.0';

            const photoUrl = (t.photos && t.photos.length > 0) ? t.photos[0] : 'Logo_Renger.jpg';
            const tr = document.createElement('tr');
            tr.className = "hover:bg-stone-50 dark:hover:bg-stone-850/50 transition";

            tr.innerHTML = `
                <td class="py-3.5 px-4 font-medium text-stone-900 dark:text-white flex items-center gap-3">
                    <img src="${escapeHtml(photoUrl)}" alt="Remorque" class="w-10 h-10 rounded-xl object-cover border border-stone-200 dark:border-stone-700 flex-shrink-0" onerror="this.src='Logo_Renger.jpg'">
                    <div class="min-w-0">
                        <div class="font-bold text-xs truncate max-w-[180px] sm:max-w-xs text-stone-900 dark:text-white" title="${escapeHtml(t.title || '')}">${escapeHtml(t.title || 'Remorque #' + t.id)}</div>
                        <div class="text-[11px] text-stone-400 truncate">📍 ${escapeHtml(t.location_city || 'Suisse')}</div>
                    </div>
                </td>
                <td class="py-3.5 px-4 font-semibold text-stone-700 dark:text-stone-300 whitespace-nowrap">
                    ${Number(t.price || 0).toFixed(2)} CHF
                </td>
                <td class="py-3.5 px-4 text-center font-bold text-stone-800 dark:text-stone-200 whitespace-nowrap">
                    ${item.bookingsCount}
                </td>
                <td class="py-3.5 px-4 text-center font-semibold text-stone-600 dark:text-stone-400 whitespace-nowrap">
                    ${item.rentedDays} j
                </td>
                <td class="py-3.5 px-4 text-center whitespace-nowrap">
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${Number(occupancyPct) > 50 ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'}">
                        ${occupancyPct}%
                    </span>
                </td>
                <td class="py-3.5 px-4 text-right font-extrabold text-stone-900 dark:text-white whitespace-nowrap">
                    ${item.revenue.toFixed(2)} CHF
                </td>
                <td class="py-3.5 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                    +${item.proSavings.toFixed(2)} CHF
                </td>
                <td class="py-3.5 px-4 text-center whitespace-nowrap">
                    <a href="remorque.html?id=${encodeURIComponent(t.id)}" target="_blank" class="text-terracotta-500 hover:text-terracotta-600 font-bold hover:underline" title="Voir l'annonce">
                        Voir ↗
                    </a>
                </td>
            `;

            tbody.appendChild(tr);
        });
    }

    // --- TRI ET RECHERCHE DU TABLEAU ---
    function sortStatsTable(field) {
        if (currentSortField === field) {
            currentSortAsc = !currentSortAsc;
        } else {
            currentSortField = field;
            currentSortAsc = false;
        }

        // Mettre à jour les icônes d'en-tête
        const fields = ['title', 'price', 'bookings', 'days', 'occupancy', 'revenue', 'savings'];
        fields.forEach(f => {
            const iconEl = document.getElementById(`sort-icon-${f}`);
            if (iconEl) {
                if (f === currentSortField) {
                    iconEl.textContent = currentSortAsc ? '▲' : '▼';
                    iconEl.className = 'text-terracotta-500 text-[10px]';
                } else {
                    iconEl.textContent = '⇅';
                    iconEl.className = 'text-stone-400 text-[10px]';
                }
            }
        });

        const stats = calculateStatistics();
        renderDetailedTable(stats);
    }

    function filterStatsTable(query) {
        currentSearchQuery = query || '';
        const stats = calculateStatistics();
        renderDetailedTable(stats);
    }

    // --- FILTRES DE PÉRIODE ET REMORQUE ---
    function setPeriodFilter(period) {
        currentPeriod = period;

        const btns = document.querySelectorAll('#stats-period-filters .period-btn');
        btns.forEach(btn => {
            const p = btn.getAttribute('data-period');
            if (p === period) {
                btn.className = "period-btn px-3.5 py-1.5 text-xs font-bold rounded-lg transition bg-white dark:bg-stone-800 text-terracotta-600 dark:text-terracotta-400 shadow-sm";
            } else {
                btn.className = "period-btn px-3.5 py-1.5 text-xs font-bold rounded-lg transition text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white";
            }
        });

        recomputeAndRender();
    }

    function onTrailerFilterChange(trailerId) {
        currentTrailerId = trailerId;
        recomputeAndRender();
    }

    // --- RAFRAÎCHISSEMENT DES STATS ---
    async function refreshStats() {
        const spinner = document.getElementById('refresh-spinner');
        if (spinner) spinner.classList.add('animate-spin');

        const client = getSupabaseClient();
        if (client && currentUser) {
            await fetchAllUserData(client, currentUser.id);
            recomputeAndRender();
        }

        if (spinner) {
            setTimeout(() => {
                spinner.classList.remove('animate-spin');
            }, 400);
        }

        if (typeof showToast === 'function') {
            showToast('Statistiques Renger PRO actualisées', 'success');
        }
    }

    // --- EXPORT CSV ---
    function exportStatsToCsv() {
        const stats = calculateStatistics();
        const rows = Array.from(stats.trailerStatsMap.values());

        const csvHeader = [
            'ID Remorque',
            'Titre',
            'Ville',
            'Tarif Journalier CHF',
            'Reservations Confirmees',
            'Jours Loues',
            'Taux Occupation %',
            'CA Net CHF (PRO 100%)',
            'Economie Commission PRO CHF (20%)'
        ];

        const csvRows = [csvHeader.join(';')];

        rows.forEach(r => {
            const t = r.trailer;
            const occupancyPct = stats.periodDurationDays > 0
                ? Math.min(100, (r.rentedDays / stats.periodDurationDays) * 100).toFixed(1)
                : '0.0';

            const line = [
                t.id,
                `"${(t.title || '').replace(/"/g, '""')}"`,
                `"${(t.location_city || '').replace(/"/g, '""')}"`,
                Number(t.price || 0).toFixed(2),
                r.bookingsCount,
                r.rentedDays,
                occupancyPct,
                r.revenue.toFixed(2),
                r.proSavings.toFixed(2)
            ];
            csvRows.push(line.join(';'));
        });

        // Totaux
        csvRows.push([
            'TOTAL',
            '"Flotte consolidée"',
            '""',
            '""',
            stats.bookingsCount,
            stats.totalRentedDays,
            stats.occupancyRate.toFixed(1),
            stats.totalNetRevenue.toFixed(2),
            stats.totalProSavings.toFixed(2)
        ].join(';'));

        const csvContent = '\uFEFF' + csvRows.join('\r\n'); // BOM UTF-8 pour Excel
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `renger-analytics-pro-${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    // --- OBSERVATEUR DE THÈME (DARK MODE TOGGLE) ---
    function attachThemeObserver() {
        if (isThemeObserverAttached || typeof document === 'undefined') return;
        isThemeObserverAttached = true;

        const observer = new MutationObserver(mutations => {
            for (const m of mutations) {
                if (m.attributeName === 'class') {
                    // Le thème clair/sombre a changé -> redessiner les charts
                    const stats = calculateStatistics();
                    renderTrendChart(stats);
                    renderOccupancyDoughnutChart(stats);
                    renderTrailerComparisonChart(stats);
                    renderConversionFunnelChart(stats);
                    break;
                }
            }
        });

        observer.observe(document.documentElement, { attributes: true });
    }

    // Lancement automatique au chargement
    if (typeof window !== 'undefined') {
        window.initStatsPage = initStatsPage;
        window.setPeriodFilter = setPeriodFilter;
        window.onTrailerFilterChange = onTrailerFilterChange;
        window.sortStatsTable = sortStatsTable;
        window.filterStatsTable = filterStatsTable;
        window.refreshStats = refreshStats;
        window.exportStatsToCsv = exportStatsToCsv;

        window.addEventListener('DOMContentLoaded', () => {
            initStatsPage();
        });
    }

    return {
        initStatsPage,
        calculateStatistics,
        setPeriodFilter,
        onTrailerFilterChange,
        sortStatsTable,
        filterStatsTable,
        refreshStats,
        exportStatsToCsv,
        escapeHtml,
        formatChf,
        calculateOverlapDays,
        normalizeToDateOnly,
        formatDateKey,
        getBookingDailyPrice,
        getPeriodDateRange
    };
}));
