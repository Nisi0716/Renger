import { describe, test, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const siteWebDir = path.join(projectRoot, 'Site web');
const jsDir = path.join(siteWebDir, 'js');

// Importer le module planning en CommonJS / Node
import planningModule from '../Site web/js/planning.js';

describe('Challenger Suite: Rental Planning Manager Logic & Algorithmic Rigor', () => {

    describe('1. Rental Duration & Multi-day Day Range Calculations', () => {
        it('calculateRentalDays: single-day rental must count as 1 full day', () => {
            const days = planningModule.calculateRentalDays('2026-10-15', '2026-10-15');
            assert.strictEqual(days, 1, 'Même jour début et fin = 1 jour plein');
        });

        it('calculateRentalDays: 3-day rental must accurately count 3 days', () => {
            const days = planningModule.calculateRentalDays('2026-10-12', '2026-10-14');
            assert.strictEqual(days, 3, 'Du 12 au 14 inclus = 3 jours');
        });

        it('calculateRentalDays: month boundary crossing (e.g. Oct 30 to Nov 02) must count exactly 4 days', () => {
            const days = planningModule.calculateRentalDays('2026-10-30', '2026-11-02');
            assert.strictEqual(days, 4, '30, 31 oct, 1, 2 nov = 4 jours');
        });

        it('calculateRentalDays: handles inverted dates or corrupt inputs gracefully with fallback', () => {
            const daysInverted = planningModule.calculateRentalDays('2026-10-20', '2026-10-18');
            assert.strictEqual(daysInverted, 3, 'Gère la valeur absolue en jours');

            const daysNull = planningModule.calculateRentalDays(null, null);
            assert.strictEqual(daysNull, 1, 'Fallback propre sur 1 jour minimum');
        });
    });

    describe('2. Multi-day Calendar Overlap & Booking Matching', () => {
        const mockBookings = [
            {
                id: 101,
                trailer_id: 1,
                start_date: '2026-10-12',
                end_date: '2026-10-15',
                status: 'paye',
                total_price: 240,
                trailers: { id: 1, title: 'Remorque Bâche', price: 60 }
            },
            {
                id: 102,
                trailer_id: 2,
                start_date: '2026-10-14',
                end_date: '2026-10-16',
                status: 'indisponible',
                total_price: 0,
                trailers: { id: 2, title: 'Plateau Porte-voiture', price: 100 }
            },
            {
                id: 103,
                trailer_id: 1,
                start_date: '2026-10-20',
                end_date: '2026-10-22',
                status: 'cancelled', // doit être ignoré
                total_price: 180,
                trailers: { id: 1, title: 'Remorque Bâche', price: 60 }
            }
        ];

        it('getBookingsForDate must match all intervening days of a multi-day booking', () => {
            // Du 12 au 15 octobre pour la remorque 101
            assert.strictEqual(planningModule.getBookingsForDate('2026-10-11', mockBookings).length, 0, '11 Oct: avant la réservation');
            
            const b12 = planningModule.getBookingsForDate('2026-10-12', mockBookings);
            assert.strictEqual(b12.length, 1);
            assert.strictEqual(b12[0].id, 101, '12 Oct: jour de début');

            const b13 = planningModule.getBookingsForDate('2026-10-13', mockBookings);
            assert.strictEqual(b13.length, 1);
            assert.strictEqual(b13[0].id, 101, '13 Oct: jour intermédiaire');

            // 14 Oct: chevauchement de la remorque 1 (101) et de la remorque 2 (102 bloquée)
            const b14 = planningModule.getBookingsForDate('2026-10-14', mockBookings);
            assert.strictEqual(b14.length, 2, '14 Oct: deux événements simultanés');

            const b15 = planningModule.getBookingsForDate('2026-10-15', mockBookings);
            assert.strictEqual(b15.length, 2, '15 Oct: remorque 1 (fin) et remorque 2 (milieu)');

            const b16 = planningModule.getBookingsForDate('2026-10-16', mockBookings);
            assert.strictEqual(b16.length, 1, '16 Oct: uniquement remorque 2');
            assert.strictEqual(b16[0].id, 102);

            assert.strictEqual(planningModule.getBookingsForDate('2026-10-17', mockBookings).length, 0, '17 Oct: après les deux réservations');
        });

        it('getBookingsForDate must strictly ignore cancelled, annule, and refuse bookings', () => {
            const b20 = planningModule.getBookingsForDate('2026-10-20', mockBookings);
            assert.strictEqual(b20.length, 0, 'La réservation annulée 103 ne doit pas apparaître');
        });

        it('getBookingsForDate must filter by trailer when trailerFilter is specified', () => {
            // Le 14 octobre : deux remorques sont louées/bloquées
            const bAll = planningModule.getBookingsForDate('2026-10-14', mockBookings, 'all');
            assert.strictEqual(bAll.length, 2);

            const bT1 = planningModule.getBookingsForDate('2026-10-14', mockBookings, '1');
            assert.strictEqual(bT1.length, 1);
            assert.strictEqual(bT1[0].id, 101);

            const bT2 = planningModule.getBookingsForDate('2026-10-14', mockBookings, '2');
            assert.strictEqual(bT2.length, 1);
            assert.strictEqual(bT2[0].id, 102);

            const bT3 = planningModule.getBookingsForDate('2026-10-14', mockBookings, '999');
            assert.strictEqual(bT3.length, 0, 'Remorque inconnue -> liste vide');
        });
    });

    describe('3. Financial Earnings Logic: PRO 100% vs Standard 80%', () => {
        const sampleBooking = {
            id: 201,
            start_date: '2026-10-10',
            end_date: '2026-10-12', // 3 jours
            trailers: { price: 50 },
            total_price: 150
        };

        it('Standard Owner (isPro = false): receives strictly 80% of base rental (20% platform commission)', () => {
            const res = planningModule.calculateBookingEarnings(sampleBooking, false);
            assert.strictEqual(res.diffDays, 3);
            assert.strictEqual(res.baseRental, 150);
            assert.strictEqual(res.netEarnings, 120, '150 CHF * 0.80 = 120.00 CHF');
            assert.strictEqual(res.commissionRate, 0.20);
            assert.strictEqual(res.isPro, false);
            assert.ok(res.rateLabel.includes('80%'));
        });

        it('PRO Owner (isPro = true): receives strictly 100% of base rental (0% platform commission)', () => {
            const res = planningModule.calculateBookingEarnings(sampleBooking, true);
            assert.strictEqual(res.diffDays, 3);
            assert.strictEqual(res.baseRental, 150);
            assert.strictEqual(res.netEarnings, 150, '150 CHF * 1.0 = 150.00 CHF');
            assert.strictEqual(res.commissionRate, 0);
            assert.strictEqual(res.isPro, true);
            assert.ok(res.rateLabel.includes('100%'));
        });

        it('Fallback to total_price if trailers.price is missing', () => {
            const noPriceBooking = {
                id: 202,
                start_date: '2026-10-10',
                end_date: '2026-10-10',
                total_price: 80
            };
            const resPro = planningModule.calculateBookingEarnings(noPriceBooking, true);
            assert.strictEqual(resPro.netEarnings, 80);

            const resStandard = planningModule.calculateBookingEarnings(noPriceBooking, false);
            assert.strictEqual(resStandard.netEarnings, 64, '80 CHF * 0.80 = 64 CHF');
        });
    });

    describe('4. Status Lifecycle & Badge Resolving', () => {
        const refDate = '2026-10-15';

        it('must resolve status: indisponible with lock icon regardless of dates', () => {
            const b = { status: 'indisponible', start_date: '2026-10-10', end_date: '2026-10-20' };
            const info = planningModule.getBookingStatusInfo(b, refDate);
            assert.strictEqual(info.key, 'indisponible');
            assert.strictEqual(info.icon, '🔒');
            assert.ok(info.label.includes('Indisponible'));
        });

        it('must resolve status: termine when reference date is strictly after end_date', () => {
            const b = { status: 'paye', start_date: '2026-10-01', end_date: '2026-10-10' };
            const info = planningModule.getBookingStatusInfo(b, refDate);
            assert.strictEqual(info.key, 'termine');
            assert.strictEqual(info.icon, '⚪');
            assert.strictEqual(info.label, 'Terminé');
        });

        it('must resolve status: en_cours when reference date falls within [start_date, end_date]', () => {
            const b = { status: 'paye', start_date: '2026-10-14', end_date: '2026-10-16' };
            const info = planningModule.getBookingStatusInfo(b, refDate);
            assert.strictEqual(info.key, 'en_cours');
            assert.strictEqual(info.icon, '🔵');
            assert.strictEqual(info.label, 'En cours');
        });

        it('must resolve status: confirme when reference date is strictly before start_date', () => {
            const b = { status: 'confirmed', start_date: '2026-10-20', end_date: '2026-10-25' };
            const info = planningModule.getBookingStatusInfo(b, refDate);
            assert.strictEqual(info.key, 'confirme');
            assert.strictEqual(info.icon, '🟢');
            assert.strictEqual(info.label, 'Confirmé');
        });
    });

    describe('5. Date Formatting in Swiss French Locale', () => {
        it('formatDateToISO: formats date objects to strict local YYYY-MM-DD', () => {
            const d = new Date(2026, 9, 12); // Octobre = index 9
            assert.strictEqual(planningModule.formatDateToISO(d), '2026-10-12');
        });

        it('formatDateFr: formats date string to French readable format', () => {
            assert.strictEqual(planningModule.formatDateFr('2026-10-12'), '12 Octobre 2026');
            assert.strictEqual(planningModule.formatDateFr('2026-01-01'), '1 Janvier 2026');
        });

        it('formatFullDateFr: includes full day of the week', () => {
            // 2026-10-12 est un lundi
            const formatted = planningModule.formatFullDateFr('2026-10-12');
            assert.match(formatted, /^Lundi 12 Octobre 2026/);
        });
    });

    describe('6. Default Status Resolution Relative to Today', () => {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const inThreeDays = new Date(today);
        inThreeDays.setDate(today.getDate() + 3);

        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const threeDaysAgo = new Date(today);
        threeDaysAgo.setDate(today.getDate() - 3);

        it('future booking without reference date defaults to confirme (green)', () => {
            const future = {
                status: 'paid',
                start_date: planningModule.formatDateToISO(tomorrow),
                end_date: planningModule.formatDateToISO(inThreeDays)
            };
            const info = planningModule.getBookingStatusInfo(future);
            assert.strictEqual(info.key, 'confirme');
            assert.strictEqual(info.icon, '🟢');
        });

        it('past booking without reference date defaults to termine (gray)', () => {
            const past = {
                status: 'paid',
                start_date: planningModule.formatDateToISO(threeDaysAgo),
                end_date: planningModule.formatDateToISO(yesterday)
            };
            const info = planningModule.getBookingStatusInfo(past);
            assert.strictEqual(info.key, 'termine');
            assert.strictEqual(info.icon, '⚪');
        });

        it('active booking covering today defaults to en_cours (blue)', () => {
            const active = {
                status: 'paid',
                start_date: planningModule.formatDateToISO(yesterday),
                end_date: planningModule.formatDateToISO(tomorrow)
            };
            const info = planningModule.getBookingStatusInfo(active);
            assert.strictEqual(info.key, 'en_cours');
            assert.strictEqual(info.icon, '🔵');
        });

        it('indisponible booking always resolves to indisponible (lock)', () => {
            const blocked = {
                status: 'indisponible',
                start_date: planningModule.formatDateToISO(threeDaysAgo),
                end_date: planningModule.formatDateToISO(inThreeDays)
            };
            const info = planningModule.getBookingStatusInfo(blocked);
            assert.strictEqual(info.key, 'indisponible');
            assert.strictEqual(info.icon, '🔒');
        });
    });

    describe('7. Security Guardrails: Unblock Dates & Client Rental Protection', () => {
        it('unblockDates must reject and prevent deleting customer bookings with status !== indisponible', async () => {
            let toastMessage = null;
            global.showToast = (msg, type) => { toastMessage = msg; };
            global.confirm = () => true;

            const customerBooking = {
                id: 'cust-999',
                trailer_id: 1,
                status: 'paye',
                renter_id: 'client-user',
                start_date: '2026-10-15',
                end_date: '2026-10-18'
            };

            // Initialiser planning avec une réservation client
            planningModule.init([customerBooking.trailer_id], [customerBooking], false);

            await planningModule.unblockDates('cust-999');

            assert.ok(toastMessage !== null, 'Doit afficher un toast d\'avertissement');
            assert.ok(
                toastMessage.includes('indisponibilité'),
                'Le message doit indiquer que seules les indisponibilités manuelles peuvent être débloquées'
            );
        });
    });

    describe('8. Collision Detection: en_attente and cancelled exclusion', () => {
        const bookings = [
            { id: 1, trailer_id: 't-10', start_date: '2026-10-10', end_date: '2026-10-15', status: 'cancelled' },
            { id: 2, trailer_id: 't-10', start_date: '2026-10-10', end_date: '2026-10-15', status: 'en_attente' },
            { id: 3, trailer_id: 't-10', start_date: '2026-10-10', end_date: '2026-10-15', status: 'refuse' }
        ];

        it('getBookingsForDate excludes cancelled, refuse and en_attente', () => {
            const matched = planningModule.getBookingsForDate('2026-10-12', bookings);
            assert.strictEqual(matched.length, 0, 'Les demandes non confirmées ne doivent pas bloquer le planning');
        });
    });
});

