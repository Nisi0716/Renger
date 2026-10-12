/**
 * planning.js — Gestionnaire de Planning des Locations Renger
 * Permet aux propriétaires de visualiser quand leurs remorques sont louées,
 * par qui, avec quel revenu net, et de bloquer/débloquer des dates manuellement.
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.RengerPlanning = factory();
        // Alias canoniques
        root.initPlanning = root.RengerPlanning.init;
        root.renderPlanningCalendar = root.RengerPlanning.renderCalendar;
        root.filterPlanning = root.RengerPlanning.filterByTrailer;
        root.openChatWithBooking = root.RengerPlanning.openChatWithBooking;
        root.downloadRentalContract = root.RengerPlanning.downloadRentalContract;
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // État local du module
    let currentTrailers = [];
    let currentBookings = [];
    let isProUser = false;
    let selectedTrailerId = 'all';
    let currentYear = new Date().getFullYear();
    let currentMonth = new Date().getMonth(); // 0-indexed (0 = Janvier)
    let selectedDateStr = null;
    let activeTab = 'trailers'; // 'trailers' | 'planning' | 'bookings'

    const MONTH_NAMES_FR = [
        'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];

    const DAY_NAMES_FR = [
        'Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'
    ];

    /**
     * Formate un objet Date en chaîne ISO locale YYYY-MM-DD
     */
    function formatDateToISO(date) {
        if (!date) return '';
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Formate une date en chaîne lisible en français (ex: 12 Octobre 2026)
     */
    function formatDateFr(dateInput) {
        if (!dateInput) return '';
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) return String(dateInput);
        return `${d.getDate()} ${MONTH_NAMES_FR[d.getMonth()]} ${d.getFullYear()}`;
    }

    /**
     * Formate une date complète avec le jour de la semaine (ex: Lundi 12 Octobre 2026)
     */
    function formatFullDateFr(dateInput) {
        if (!dateInput) return '';
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) return String(dateInput);
        return `${DAY_NAMES_FR[d.getDay()]} ${d.getDate()} ${MONTH_NAMES_FR[d.getMonth()]} ${d.getFullYear()}`;
    }

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

    /**
     * Calcule la durée d'une location en jours pleins (début et fin inclus)
     */
    function calculateRentalDays(startDate, endDate) {
        const s = new Date(startDate);
        const e = new Date(endDate);
        if (isNaN(s.getTime()) || isNaN(e.getTime())) return 1;
        const diffMs = Math.abs(e - s);
        return Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);
    }

    /**
     * Calcule les gains nets du propriétaire selon son statut PRO ou Standard
     */
    function calculateBookingEarnings(booking, isPro) {
        const diffDays = calculateRentalDays(booking.start_date, booking.end_date);
        const trailerPrice = (booking.trailers && booking.trailers.price)
            ? Number(booking.trailers.price)
            : 0;
        const baseRental = trailerPrice > 0
            ? (diffDays * trailerPrice)
            : (Number(booking.total_price) || 0);

        if (isPro) {
            return {
                diffDays,
                baseRental,
                netEarnings: baseRental * 1.0,
                commissionRate: 0,
                isPro: true,
                rateLabel: '100% net (0% commission PRO)'
            };
        }
        return {
            diffDays,
            baseRental,
            netEarnings: baseRental * 0.80,
            commissionRate: 0.20,
            isPro: false,
            rateLabel: '80% net (20% commission plateforme déduite)'
        };
    }

    /**
     * Détermine les libellés, classes et icônes d'un statut de réservation
     */
    function getBookingStatusInfo(booking, referenceDateStr) {
        if (!booking) {
            return {
                key: 'inconnu',
                label: 'Inconnu',
                shortLabel: '?',
                icon: '⚪',
                pillClass: 'bg-stone-100 text-stone-700 border-stone-200 dark:bg-stone-700 dark:text-stone-300',
                badgeClass: 'bg-stone-100 text-stone-700 border-stone-200 dark:bg-stone-700 dark:text-stone-300'
            };
        }

        if (booking.status === 'indisponible') {
            return {
                key: 'indisponible',
                label: 'Indisponible (bloqué)',
                shortLabel: 'Bloqué',
                icon: '🔒',
                pillClass: 'bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700/60',
                badgeClass: 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
            };
        }

        const ref = referenceDateStr || formatDateToISO(new Date());
        const s = booking.start_date ? booking.start_date.split('T')[0] : '';
        const e = booking.end_date ? booking.end_date.split('T')[0] : '';

        if (ref > e) {
            return {
                key: 'termine',
                label: 'Terminé',
                shortLabel: 'Terminé',
                icon: '⚪',
                pillClass: 'bg-stone-100 dark:bg-stone-700/60 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-600',
                badgeClass: 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-600'
            };
        }

        if (ref >= s && ref <= e) {
            return {
                key: 'en_cours',
                label: 'En cours',
                shortLabel: 'En cours',
                icon: '🔵',
                pillClass: 'bg-blue-100 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-700/60',
                badgeClass: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
            };
        }

        return {
            key: 'confirme',
            label: 'Confirmé',
            shortLabel: 'Confirmé',
            icon: '🟢',
            pillClass: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-700/60',
            badgeClass: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700'
        };
    }

    /**
     * Filtre les réservations couvrant une date donnée (multi-jours inclus)
     */
    function getBookingsForDate(dateStr, bookings, trailerFilter = 'all') {
        if (!Array.isArray(bookings) || !dateStr) return [];
        return bookings.filter(b => {
            if (!b) return false;
            if (trailerFilter && trailerFilter !== 'all' && String(b.trailer_id) !== String(trailerFilter)) {
                return false;
            }
            if (b.status === 'cancelled' || b.status === 'annule' || b.status === 'refuse' || b.status === 'en_attente') {
                return false;
            }
            const s = b.start_date ? b.start_date.split('T')[0] : '';
            const e = b.end_date ? b.end_date.split('T')[0] : '';
            return Boolean(s && e && dateStr >= s && dateStr <= e);
        });
    }

    /**
     * Initialise le module de planning avec les données de flotte et de réservations
     */
    function init(trailers = [], bookings = [], isPro = false) {
        currentTrailers = Array.isArray(trailers) ? trailers : [];
        currentBookings = Array.isArray(bookings) ? bookings : [];
        isProUser = (typeof isPro === 'boolean')
            ? isPro
            : !!(typeof window !== 'undefined' && window.currentUserProfile && window.currentUserProfile.is_pro);

        // Peupler le filtre de remorque et le sélecteur de blocage
        populateTrailerSelectors();

        // Initialiser la date sur aujourd'hui si non définie
        const today = new Date();
        if (currentYear === undefined || currentMonth === undefined) {
            currentYear = today.getFullYear();
            currentMonth = today.getMonth();
        }

        renderCalendar();
    }

    /**
     * Remplissage dynamique des listes déroulantes de remorques
     */
    function populateTrailerSelectors() {
        if (typeof document === 'undefined') return;

        // 1. Filtre toolbar planning
        const filterSelect = document.getElementById('planning-trailer-filter');
        if (filterSelect) {
            const previousVal = filterSelect.value || selectedTrailerId || 'all';
            filterSelect.innerHTML = '<option value="all">🚗 Toutes mes remorques</option>';
            currentTrailers.forEach(t => {
                const opt = document.createElement('option');
                opt.value = String(t.id);
                opt.textContent = `${t.title || 'Remorque #' + t.id}`;
                filterSelect.appendChild(opt);
            });
            // Restaurer la valeur précédente si toujours valide
            if ([...filterSelect.options].some(o => o.value === previousVal)) {
                filterSelect.value = previousVal;
                selectedTrailerId = previousVal;
            } else {
                filterSelect.value = 'all';
                selectedTrailerId = 'all';
            }
        }

        // 2. Modale de blocage de dates
        const blockSelect = document.getElementById('block-trailer-select');
        if (blockSelect) {
            blockSelect.innerHTML = '<option value="">Sélectionner une remorque...</option>';
            currentTrailers.forEach(t => {
                const opt = document.createElement('option');
                opt.value = String(t.id);
                opt.textContent = `${t.title || 'Remorque #' + t.id}`;
                blockSelect.appendChild(opt);
            });
        }
    }

    /**
     * Bascule entre les onglets de l'espace propriétaire :
     * - 'trailers' : Mes annonces & flotte (#seller-trailers-container)
     * - 'planning' : Planning des locations (#seller-planning-section)
     * - 'bookings' : Locations reçues (#seller-bookings-container)
     */
    function switchTab(tabName) {
        if (typeof document === 'undefined') return;

        const canonical = (tabName === 'fleet' ? 'trailers' : (tabName === 'history' ? 'bookings' : tabName)) || 'trailers';
        activeTab = canonical;

        const trailersContainer = document.getElementById('seller-trailers-container');
        const planningSection = document.getElementById('seller-planning-section');
        const bookingsContainer = document.getElementById('seller-bookings-container');

        const btnTrailers = document.getElementById('tab-btn-trailers');
        const btnPlanning = document.getElementById('tab-btn-planning');
        const btnBookings = document.getElementById('tab-btn-bookings');

        const setActiveBtnStyle = (btn, isActive) => {
            if (!btn) return;
            if (isActive) {
                btn.className = 'tab-seller-btn inline-flex items-center gap-2 py-3 px-4 font-bold text-sm border-b-2 border-terracotta-500 text-terracotta-600 dark:text-terracotta-400 transition whitespace-nowrap';
            } else {
                btn.className = 'tab-seller-btn inline-flex items-center gap-2 py-3 px-4 font-bold text-sm border-b-2 border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 transition whitespace-nowrap';
            }
        };

        if (canonical === 'trailers') {
            trailersContainer?.classList.remove('hidden');
            planningSection?.classList.add('hidden');
            bookingsContainer?.classList.add('hidden');
            setActiveBtnStyle(btnTrailers, true);
            setActiveBtnStyle(btnPlanning, false);
            setActiveBtnStyle(btnBookings, false);
        } else if (canonical === 'planning') {
            trailersContainer?.classList.add('hidden');
            planningSection?.classList.remove('hidden');
            bookingsContainer?.classList.add('hidden');
            setActiveBtnStyle(btnTrailers, false);
            setActiveBtnStyle(btnPlanning, true);
            setActiveBtnStyle(btnBookings, false);
            renderCalendar();
        } else if (canonical === 'bookings') {
            trailersContainer?.classList.add('hidden');
            planningSection?.classList.add('hidden');
            bookingsContainer?.classList.remove('hidden');
            setActiveBtnStyle(btnTrailers, false);
            setActiveBtnStyle(btnPlanning, false);
            setActiveBtnStyle(btnBookings, true);
        }
    }

    /**
     * Rendu interactif de la grille de calendrier
     */
    function renderCalendar(year, month) {
        if (typeof document === 'undefined') return;

        if (typeof year === 'number') currentYear = year;
        if (typeof month === 'number') currentMonth = month;

        // Normalisation de l'année/mois
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        } else if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }

        // Mise à jour de l'étiquette du mois
        const monthLabelText = `${MONTH_NAMES_FR[currentMonth]} ${currentYear}`;
        const monthLabel = document.getElementById('planning-month-label');
        if (monthLabel) monthLabel.textContent = monthLabelText;

        const currentMonthHidden = document.getElementById('planning-current-month');
        if (currentMonthHidden) currentMonthHidden.textContent = monthLabelText;

        const grid = document.getElementById('planning-calendar-grid');
        if (!grid) return;
        grid.innerHTML = '';

        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const firstDayRaw = new Date(currentYear, currentMonth, 1).getDay();
        // Lundi = 0, Dimanche = 6
        const firstDayOffset = (firstDayRaw === 0 ? 7 : firstDayRaw) - 1;

        const todayStr = formatDateToISO(new Date());

        // 1. Cases vides de décalage avant le 1er du mois
        for (let i = 0; i < firstDayOffset; i++) {
            const pad = document.createElement('div');
            pad.className = 'min-h-[70px] sm:min-h-[95px] rounded-xl sm:rounded-2xl bg-stone-50/50 dark:bg-stone-900/20 border border-dashed border-stone-200/40 dark:border-stone-800/40 p-1 sm:p-2 opacity-30 select-none';
            grid.appendChild(pad);
        }

        // 2. Cases des jours du mois (1 à daysInMonth)
        for (let day = 1; day <= daysInMonth; day++) {
            const dStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = (dStr === todayStr);

            const dayBookings = getBookingsForDate(dStr, currentBookings, selectedTrailerId);

            const cell = document.createElement('div');
            cell.className = `planning-calendar-cell min-h-[70px] sm:min-h-[95px] rounded-xl sm:rounded-2xl border p-1.5 sm:p-2 transition flex flex-col justify-between cursor-pointer select-none group ${
                isToday
                    ? 'border-terracotta-500 bg-terracotta-50/30 dark:bg-terracotta-950/20 shadow-sm ring-1 ring-terracotta-500/50'
                    : 'border-stone-200 dark:border-stone-700/80 bg-white dark:bg-stone-800 hover:border-terracotta-400 dark:hover:border-terracotta-600 hover:shadow-md'
            }`;
            cell.dataset.date = dStr;
            cell.onclick = () => showDayDetails(dStr);

            // En-tête de cellule : Numéro du jour + compte mobile
            const topRow = document.createElement('div');
            topRow.className = 'flex items-center justify-between mb-1';

            const dayNum = document.createElement('span');
            dayNum.className = `text-xs font-bold ${
                isToday
                    ? 'w-5 h-5 rounded-full bg-terracotta-500 text-white flex items-center justify-center text-[11px] shadow-sm'
                    : 'text-stone-700 dark:text-stone-300 group-hover:text-terracotta-600 dark:group-hover:text-terracotta-400'
            }`;
            dayNum.textContent = day;
            topRow.appendChild(dayNum);

            if (dayBookings.length > 0) {
                const countBadge = document.createElement('span');
                countBadge.className = 'text-[10px] font-extrabold text-stone-400 dark:text-stone-500 sm:hidden';
                countBadge.textContent = dayBookings.length;
                topRow.appendChild(countBadge);
            }
            cell.appendChild(topRow);

            // Corps de cellule : Pastilles des réservations
            const pillsCont = document.createElement('div');
            pillsCont.className = 'space-y-1 overflow-hidden flex-1';

            const maxVisible = 2;
            const visibleBookings = dayBookings.slice(0, maxVisible);
            visibleBookings.forEach(b => {
                const pill = createBookingPill(b, dStr);
                pillsCont.appendChild(pill);
            });

            if (dayBookings.length > maxVisible) {
                const moreEl = document.createElement('div');
                moreEl.className = 'text-[9px] sm:text-[10px] font-bold text-stone-500 dark:text-stone-400 truncate px-1';
                moreEl.textContent = `+${dayBookings.length - maxVisible} autre${dayBookings.length - maxVisible > 1 ? 's' : ''}`;
                pillsCont.appendChild(moreEl);
            }

            cell.appendChild(pillsCont);
            grid.appendChild(cell);
        }
    }

    /**
     * Crée une pastille visuelle pour la grille du calendrier
     */
    function createBookingPill(booking, dateStr) {
        const trailer = booking.trailers || currentTrailers.find(t => String(t.id) === String(booking.trailer_id)) || {};
        const trailerTitle = trailer.title || `Remorque #${booking.trailer_id || ''}`;
        const statusInfo = getBookingStatusInfo(booking);

        const pill = document.createElement('div');
        pill.className = `w-full text-left truncate text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded-md transition flex items-center gap-1 border ${statusInfo.pillClass}`;
        pill.title = `${statusInfo.label} — ${trailerTitle}`;

        const iconSpan = document.createElement('span');
        iconSpan.className = 'text-[10px] flex-shrink-0';
        iconSpan.textContent = statusInfo.icon;
        pill.appendChild(iconSpan);

        const textSpan = document.createElement('span');
        textSpan.className = 'truncate';
        textSpan.textContent = trailerTitle;
        pill.appendChild(textSpan);

        return pill;
    }

    /**
     * Filtrage de l'affichage par remorque
     */
    function filterByTrailer(trailerId) {
        selectedTrailerId = trailerId || 'all';
        renderCalendar();
    }

    /**
     * Navigation au mois précédent
     */
    function prevMonth() {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        renderCalendar();
    }

    /**
     * Navigation au mois suivant
     */
    function nextMonth() {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        renderCalendar();
    }

    /**
     * Revenir sur le mois courant (Aujourd'hui)
     */
    function goToToday() {
        const today = new Date();
        currentYear = today.getFullYear();
        currentMonth = today.getMonth();
        renderCalendar();
    }

    /**
     * Affiche la modale de détails pour la date cliquée
     */
    function showDayDetails(dateStr) {
        if (typeof document === 'undefined') return;
        selectedDateStr = dateStr;

        const modal = document.getElementById('planning-day-modal');
        if (!modal) return;

        const titleEl = document.getElementById('planning-day-modal-title');
        const subtitleEl = document.getElementById('planning-day-modal-subtitle');
        const listEl = document.getElementById('planning-day-events-list');

        if (titleEl) titleEl.textContent = formatFullDateFr(dateStr);

        const dayBookings = getBookingsForDate(dateStr, currentBookings, selectedTrailerId);

        if (subtitleEl) {
            if (dayBookings.length === 0) {
                subtitleEl.textContent = 'Aucune réservation ou blocage prévu sur cette journée.';
            } else {
                subtitleEl.textContent = `${dayBookings.length} événement${dayBookings.length > 1 ? 's' : ''} (location${dayBookings.length > 1 ? 's' : ''} ou période bloquée).`;
            }
        }

        if (listEl) {
            listEl.innerHTML = '';

            if (dayBookings.length === 0) {
                // État vide élégant
                const emptyCard = document.createElement('div');
                emptyCard.className = 'bg-stone-50 dark:bg-stone-900/60 rounded-2xl p-6 text-center border border-stone-200/60 dark:border-stone-700/60';
                emptyCard.innerHTML = `
                    <div class="text-3xl mb-2">✨</div>
                    <p class="font-bold text-stone-800 dark:text-white text-sm mb-1">Journée entièrement disponible</p>
                    <p class="text-xs text-stone-500 dark:text-stone-400 mb-4">Toutes vos remorques peuvent être réservées par les locataires à cette date.</p>
                    <button onclick="if (window.RengerPlanning) window.RengerPlanning.openBlockDatesFromDay()" class="inline-flex items-center gap-1.5 bg-stone-900 hover:bg-black dark:bg-stone-100 dark:hover:bg-white dark:text-stone-900 text-white font-bold py-2 px-3.5 rounded-xl text-xs transition active:scale-95 shadow-sm">
                        <span>🔒</span><span>Bloquer cette journée</span>
                    </button>
                `;
                listEl.appendChild(emptyCard);
            } else {
                dayBookings.forEach(booking => {
                    const card = createDayBookingDetailCard(booking);
                    listEl.appendChild(card);
                });
            }
        }

        modal.classList.remove('hidden');
    }

    /**
     * Ferme la modale de détails du jour
     */
    function closeDayModal() {
        if (typeof document === 'undefined') return;
        selectedDateStr = null;
        const modal = document.getElementById('planning-day-modal');
        modal?.classList.add('hidden');
    }

    /**
     * Construit une carte de détail d'une réservation pour la modale du jour
     */
    function createDayBookingDetailCard(booking) {
        const trailer = booking.trailers || currentTrailers.find(t => String(t.id) === String(booking.trailer_id)) || {};
        const trailerTitle = trailer.title || `Remorque #${booking.trailer_id || ''}`;
        const trailerImg = trailer.image_url || 'https://images.unsplash.com/photo-1594054972175-39db43232140?q=80&w=600&auto=format&fit=crop';
        const isBlocked = (booking.status === 'indisponible');

        const card = document.createElement('div');
        card.className = 'bg-stone-50 dark:bg-stone-900 rounded-2xl p-4 sm:p-5 border border-stone-200/80 dark:border-stone-700/80 shadow-sm space-y-3.5';

        // Cas 1 : Période bloquée manuellement par le propriétaire
        if (isBlocked) {
            card.innerHTML = `
                <div class="flex items-start justify-between gap-3">
                    <div class="flex items-center gap-3">
                        <img src="${escapeHtml(trailerImg)}" alt="" class="w-12 h-12 object-cover rounded-xl bg-stone-200 dark:bg-stone-800 flex-shrink-0">
                        <div>
                            <h4 class="font-extrabold text-stone-900 dark:text-white text-sm sm:text-base">${escapeHtml(trailerTitle)}</h4>
                            <p class="text-xs text-stone-500 dark:text-stone-400">Du ${formatDateFr(booking.start_date)} au ${formatDateFr(booking.end_date)}</p>
                        </div>
                    </div>
                    <span class="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                        🔒 Indisponible
                    </span>
                </div>
                <div class="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl p-3 text-xs text-amber-900 dark:text-amber-200 font-medium flex items-center gap-2">
                    <span>⚠️</span>
                    <span>🔒 Période indisponible (Maintenance / Usage personnel)</span>
                </div>
                <div class="pt-1 flex justify-end">
                    <button onclick="if (window.RengerPlanning) window.RengerPlanning.unblockDates('${escapeHtml(booking.id)}')" class="inline-flex items-center gap-1.5 bg-red-100 hover:bg-red-200 dark:bg-red-900/40 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 font-bold py-2 px-3.5 rounded-xl text-xs transition active:scale-95 border border-red-200 dark:border-red-800">
                        <span>🔓</span><span>Débloquer ces dates</span>
                    </button>
                </div>
            `;
            return card;
        }

        // Cas 2 : Réservation client confirmée ou passée
        const earnings = calculateBookingEarnings(booking, isProUser);
        const statusInfo = getBookingStatusInfo(booking);

        // Nom du locataire, avatar et initiales
        const prof = booking.renter_profile || {};
        const renterFullName = prof.full_name || booking.renter_name || '';
        const renterUsername = prof.username ? `@${prof.username}` : '';
        const renterDisplayName = renterFullName
            ? (renterUsername ? `${renterFullName} (${renterUsername})` : renterFullName)
            : (renterUsername || 'Client locataire');
        const renterInitial = (renterFullName || prof.username || renterDisplayName)
            .replace(/^@/, '')
            .charAt(0)
            .toUpperCase() || 'L';
        const renterAvatar = prof.avatar_url;

        card.innerHTML = `
            <div class="flex items-start justify-between gap-3">
                <div class="flex items-center gap-3 min-w-0">
                    <img src="${escapeHtml(trailerImg)}" alt="" class="w-12 h-12 sm:w-14 sm:h-14 object-cover rounded-xl bg-stone-200 dark:bg-stone-800 flex-shrink-0">
                    <div class="min-w-0">
                        <h4 class="font-extrabold text-stone-900 dark:text-white text-sm sm:text-base truncate">${escapeHtml(trailerTitle)}</h4>
                        <div class="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                            ${renterAvatar
                                ? `<img src="${escapeHtml(renterAvatar)}" alt="" class="w-5 h-5 rounded-full object-cover border border-stone-200 dark:border-stone-700 flex-shrink-0">`
                                : `<div class="w-5 h-5 rounded-full bg-terracotta-100 dark:bg-terracotta-900/40 text-terracotta-600 dark:text-terracotta-300 font-bold flex items-center justify-center text-[10px] flex-shrink-0">${escapeHtml(renterInitial)}</div>`
                            }
                            <span class="font-semibold text-stone-700 dark:text-stone-300 truncate" title="${escapeHtml(renterDisplayName)}">${escapeHtml(renterDisplayName)}</span>
                        </div>
                    </div>
                </div>
                <span class="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg flex-shrink-0 ${statusInfo.badgeClass}">
                    ${statusInfo.icon} ${statusInfo.label}
                </span>
            </div>

            <!-- Détails de période & Net perçu -->
            <div class="grid grid-cols-2 gap-2 text-xs pt-1">
                <div class="bg-white dark:bg-stone-800 p-2.5 rounded-xl border border-stone-200/60 dark:border-stone-700/60">
                    <p class="text-stone-400 text-[10px] uppercase font-bold tracking-wider">Période</p>
                    <p class="font-bold text-stone-800 dark:text-white mt-0.5">
                        ${formatDateFr(booking.start_date)} au ${formatDateFr(booking.end_date)}
                    </p>
                    <p class="text-[11px] text-stone-500 dark:text-stone-400">(${earnings.diffDays} jour${earnings.diffDays > 1 ? 's' : ''})</p>
                </div>
                <div class="bg-white dark:bg-stone-800 p-2.5 rounded-xl border border-stone-200/60 dark:border-stone-700/60">
                    <p class="text-stone-400 text-[10px] uppercase font-bold tracking-wider">Revenu Net</p>
                    <p class="font-bold text-terracotta-600 dark:text-terracotta-400 text-sm mt-0.5">
                        ${earnings.netEarnings.toFixed(2)} CHF
                    </p>
                    <p class="text-[10px] text-stone-500 dark:text-stone-400 truncate" title="${escapeHtml(earnings.rateLabel)}">
                        ${earnings.isPro ? '👑 100% net (0% com. PRO)' : '80% net (20% commission déduite)'}
                    </p>
                </div>
            </div>

            <!-- Boutons d'action : Chat & Contrat -->
            <div class="flex items-center gap-2 pt-1">
                <button onclick="if (window.RengerPlanning) window.RengerPlanning.openChatWithBooking('${escapeHtml(booking.id)}')" class="flex-1 inline-flex items-center justify-center gap-1.5 bg-stone-900 hover:bg-black dark:bg-stone-100 dark:hover:bg-white dark:text-stone-900 text-white font-bold py-2.5 px-3 rounded-xl text-xs transition active:scale-95 shadow-sm">
                    <span>💬</span><span>Messagerie</span>
                </button>
                <button onclick="if (window.RengerPlanning) window.RengerPlanning.downloadRentalContract('${escapeHtml(booking.id)}')" class="flex-1 inline-flex items-center justify-center gap-1.5 bg-stone-200 hover:bg-stone-300 dark:bg-stone-700 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-200 font-bold py-2.5 px-3 rounded-xl text-xs transition active:scale-95">
                    <span>📄</span><span>Contrat PDF</span>
                </button>
            </div>
        `;

        return card;
    }

    /**
     * Ouvre la modale de blocage de dates
     */
    function openBlockDatesModal(defaultDateStr) {
        if (typeof document === 'undefined') return;

        const modal = document.getElementById('modal-block-dates');
        if (!modal) return;

        const startInput = document.getElementById('block-start-date');
        const endInput = document.getElementById('block-end-date');
        const trailerSelect = document.getElementById('block-trailer-select');

        // Pré-remplir la date si explicitement passée ou utiliser aujourd'hui (sans fuite d'état)
        const initialDate = defaultDateStr || formatDateToISO(new Date());
        if (startInput) startInput.value = initialDate;
        if (endInput) endInput.value = initialDate;

        // Pré-sélectionner la remorque si le filtre est actif sur une remorque spécifique
        if (trailerSelect && selectedTrailerId && selectedTrailerId !== 'all') {
            trailerSelect.value = selectedTrailerId;
        }

        modal.classList.remove('hidden');
    }

    /**
     * Ouvre le blocage depuis la modale du jour courant
     */
    function openBlockDatesFromDay() {
        const targetDate = selectedDateStr;
        closeDayModal();
        openBlockDatesModal(targetDate);
    }

    /**
     * Ferme la modale de blocage de dates
     */
    function closeBlockDatesModal() {
        if (typeof document === 'undefined') return;
        const modal = document.getElementById('modal-block-dates');
        modal?.classList.add('hidden');
    }

    /**
     * Soumet le blocage manuel de dates dans Supabase
     */
    async function submitBlockDates() {
        if (typeof document === 'undefined') return;

        const trailerSelect = document.getElementById('block-trailer-select');
        const startInput = document.getElementById('block-start-date');
        const endInput = document.getElementById('block-end-date');
        const reasonSelect = document.getElementById('block-reason-select');

        const trailerId = trailerSelect?.value;
        const startDate = startInput?.value;
        const endDate = endInput?.value;
        const reason = reasonSelect?.value || 'maintenance';

        if (!trailerId) {
            if (typeof showToast === 'function') showToast('Veuillez sélectionner une remorque.', 'error');
            return;
        }
        if (!startDate || !endDate) {
            if (typeof showToast === 'function') showToast('Veuillez renseigner la date de début et de fin.', 'error');
            return;
        }
        if (startDate > endDate) {
            if (typeof showToast === 'function') showToast('La date de début ne peut pas être postérieure à la date de fin.', 'error');
            return;
        }

        // Vérification de collision préventive côté client
        const collision = currentBookings.some(b => {
            if (String(b.trailer_id) !== String(trailerId)) return false;
            if (b.status === 'cancelled' || b.status === 'annule' || b.status === 'refuse' || b.status === 'en_attente') return false;
            const bStart = b.start_date ? b.start_date.split('T')[0] : '';
            const bEnd = b.end_date ? b.end_date.split('T')[0] : '';
            if (!bStart || !bEnd) return false;
            return (startDate <= bEnd && endDate >= bStart);
        });

        if (collision) {
            if (typeof showToast === 'function') {
                showToast('Cette remorque fait déjà l\'objet d\'une réservation ou d\'un blocage sur cette période.', 'error');
            }
            return;
        }

        const user = (typeof currentUser !== 'undefined' && currentUser)
            ? currentUser
            : (typeof supabaseClient !== 'undefined' && supabaseClient?.auth ? (await supabaseClient.auth.getUser())?.data?.user : null);

        if (!user) {
            if (typeof showToast === 'function') showToast('Vous devez être connecté pour bloquer des dates.', 'error');
            return;
        }

        const selectedTrailer = currentTrailers.find(t => String(t.id) === String(trailerId));
        const effectiveTrailerId = selectedTrailer ? selectedTrailer.id : trailerId;
        const effectiveOwnerId = selectedTrailer?.owner_id || user.id;

        const newBlock = {
            trailer_id: effectiveTrailerId,
            renter_id: user.id,
            owner_id: effectiveOwnerId,
            start_date: startDate,
            end_date: endDate,
            total_price: 0,
            status: 'indisponible'
        };

        const confirmBtn = document.getElementById('btn-confirm-block-dates');
        if (confirmBtn) {
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<span>⏳ Enregistrement...</span>';
        }

        try {
            if (typeof supabaseClient !== 'undefined' && supabaseClient) {
                const { data, error } = await supabaseClient
                    .from('bookings')
                    .insert([newBlock])
                    .select('*, trailers(*)');

                if (error) {
                    if (typeof showToast === 'function') {
                        showToast(`Erreur lors du blocage : ${error.message}`, 'error');
                    }
                    return;
                }

                const inserted = (data && data[0]) ? data[0] : newBlock;
                if (!inserted.trailers && selectedTrailer) {
                    inserted.trailers = selectedTrailer;
                }
                currentBookings.push(inserted);
            } else {
                // Repli sans Supabase (tests)
                newBlock.id = Date.now();
                if (selectedTrailer) newBlock.trailers = selectedTrailer;
                currentBookings.push(newBlock);
            }

            if (typeof showToast === 'function') {
                showToast('Dates bloquées avec succès !', 'success');
            }

            closeBlockDatesModal();
            renderCalendar();

            // Rafraîchir les données globales du profil si la fonction existe
            if (typeof loadProfileData === 'function') {
                try {
                    await loadProfileData();
                } catch (_) {
                    // Tolérance aux erreurs éventuelles de rafraîchissement
                }
            }
        } catch (err) {
            if (typeof showToast === 'function') {
                showToast(`Erreur inattendue : ${err.message}`, 'error');
            }
        } finally {
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = '<span>🔒 Confirmer le blocage</span>';
            }
        }
    }

    /**
     * Débloque une période précédemment marquée indisponible
     */
    async function unblockDates(bookingId) {
        if (!bookingId) return;

        const targetBooking = currentBookings.find(b => String(b.id) === String(bookingId));
        if (targetBooking && targetBooking.status !== 'indisponible') {
            if (typeof showToast === 'function') {
                showToast('Seules les périodes d\'indisponibilité manuelle peuvent être débloquées.', 'error');
            }
            return;
        }

        if (typeof confirm === 'function' && !confirm('Voulez-vous vraiment débloquer ces dates et rouvrir la disponibilité ?')) {
            return;
        }

        try {
            if (typeof supabaseClient !== 'undefined' && supabaseClient) {
                const { error } = await supabaseClient
                    .from('bookings')
                    .delete()
                    .eq('id', bookingId)
                    .eq('status', 'indisponible');

                if (error) {
                    if (typeof showToast === 'function') {
                        showToast(`Erreur lors du déblocage : ${error.message}`, 'error');
                    }
                    return;
                }
            }

            // Mise à jour de la mémoire locale
            currentBookings = currentBookings.filter(b => String(b.id) !== String(bookingId));

            if (typeof showToast === 'function') {
                showToast('Dates débloquées avec succès !', 'success');
            }

            closeDayModal();
            renderCalendar();

            if (typeof loadProfileData === 'function') {
                try {
                    await loadProfileData();
                } catch (_) {}
            }
        } catch (err) {
            if (typeof showToast === 'function') {
                showToast(`Erreur lors du déblocage : ${err.message}`, 'error');
            }
        }
    }

    /**
     * Ouvre la messagerie instantanée avec le locataire d'une réservation donnée
     */
    function openChatWithBooking(bookingId) {
        const booking = currentBookings.find(b => String(b.id) === String(bookingId));
        if (!booking) {
            if (typeof showToast === 'function') showToast('Réservation introuvable.', 'error');
            return;
        }

        if (!booking.trailers) {
            booking.trailers = currentTrailers.find(t => String(t.id) === String(booking.trailer_id)) || null;
        }

        closeDayModal();

        if (typeof openChatForBooking === 'function') {
            openChatForBooking(booking, true);
        } else if (typeof openChatModal === 'function') {
            openChatModal(booking.trailers || null, booking.renter_id || null, booking);
        } else {
            if (typeof showToast === 'function') showToast('Messagerie indisponible pour cette réservation.', 'error');
        }
    }

    /**
     * Télécharge le contrat officiel PDF de location pour une réservation donnée
     */
    function downloadRentalContract(bookingId) {
        const booking = currentBookings.find(b => String(b.id) === String(bookingId));
        if (!booking) {
            if (typeof showToast === 'function') showToast('Réservation introuvable.', 'error');
            return;
        }

        if (booking.status === 'indisponible') {
            if (typeof showToast === 'function') showToast('Pas de contrat pour une période bloquée manuellement.', 'info');
            return;
        }

        if (!booking.trailers) {
            booking.trailers = currentTrailers.find(t => String(t.id) === String(booking.trailer_id)) || null;
        }

        if (typeof window !== 'undefined' && window.RengerContracts && typeof window.RengerContracts.downloadRentalContract === 'function') {
            window.RengerContracts.downloadRentalContract(booking);
        } else {
            if (typeof showToast === 'function') showToast('Module de contrats officiel indisponible.', 'error');
        }
    }

    return {
        init,
        renderCalendar,
        filterByTrailer,
        showDayDetails,
        submitBlockDates,
        unblockDates,
        switchTab,
        openBlockDatesModal,
        closeBlockDatesModal,
        openBlockDatesFromDay,
        closeDayModal,
        prevMonth,
        nextMonth,
        goToToday,
        openChatWithBooking,
        downloadRentalContract,
        // Helpers purs pour les tests unitaires
        calculateRentalDays,
        calculateBookingEarnings,
        getBookingStatusInfo,
        getBookingsForDate,
        formatDateToISO,
        formatDateFr,
        formatFullDateFr
    };
}));
