import { describe, test, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const siteWebDir = path.join(projectRoot, 'Site web');
const jsDir = path.join(siteWebDir, 'js');

/**
 * Calcul Zero-Loss exact basé sur Stripe balance_transaction.fee
 */
function calculateZeroLossRefund({ totalPaidCentimes, stripeFeeCentimes, isOwner }) {
    if (isOwner) {
        // Le locataire reçoit 100% de ce qu'il a payé (le propriétaire assume les coûts)
        return totalPaidCentimes;
    }
    // Règle Zero-Loss : Montant payé moins frais exacts Stripe non restitués
    return Math.max(0, totalPaidCentimes - stripeFeeCentimes);
}

describe('Politique d\'annulation à l\'équilibre ("Zero-Loss") Renger', () => {

    describe('1. Formule financière Zero-Loss & Stripe fees', () => {
        it('Propriétaire annule : doit rembourser 100% du montant payé au locataire', () => {
            const refund = calculateZeroLossRefund({
                totalPaidCentimes: 10490, // 104.90 CHF
                stripeFeeCentimes: 187,   // 1.87 CHF
                isOwner: true,
            });
            assert.equal(refund, 10490, 'Remboursement à 100% pour annulation propriétaire');
        });

        it('Locataire annule : remboursement égal à totalPaid - stripeFee (Zero-Loss parfait)', () => {
            // Exemple : Location à 60.00 CHF + frais = 64.90 CHF (6490 cts)
            // Frais réels Stripe retenus par Stripe = 1.95 CHF (195 cts)
            // Remboursement locataire = 6490 - 195 = 6295 cts (62.95 CHF)
            const refund = calculateZeroLossRefund({
                totalPaidCentimes: 6490,
                stripeFeeCentimes: 195,
                isOwner: false,
            });
            assert.equal(refund, 6295);
            // Vérification de l'équilibre financier pour Renger :
            const rSoldeNet = (6490 - refund) - 195;
            assert.equal(rSoldeNet, 0, 'Renger ne fait ni bénéfice ni perte (0 centime de reste)');
        });

        it('Garantit que le remboursement n\'est jamais négatif', () => {
            const refund = calculateZeroLossRefund({
                totalPaidCentimes: 100,
                stripeFeeCentimes: 150,
                isOwner: false,
            });
            assert.equal(refund, 0);
        });
    });

    describe('2. Intégrité de l\'interface utilisateur (profil.html)', () => {
        const profilHtml = fs.readFileSync(path.join(siteWebDir, 'profil.html'), 'utf8');

        it('profil.html doit cibler #buyer-bookings-list dans Mes locations', () => {
            assert.ok(profilHtml.includes('id="buyer-bookings-list"'));
        });

        it('profil.html doit contenir la modale #cancel-booking-modal avec ses composants', () => {
            assert.ok(profilHtml.includes('id="cancel-booking-modal"'));
            assert.ok(profilHtml.includes('id="cancel-booking-confirm-btn"'));
            assert.ok(profilHtml.includes('id="cancel-modal-policy-text"'));
            assert.ok(profilHtml.includes('id="cancel-modal-dates"'));
            assert.ok(profilHtml.includes('id="cancel-modal-time-badge"'));
        });

        it('profil.html doit comporter le message d\'avertissement Zero-Loss exact requis', () => {
            assert.ok(
                profilHtml.includes("Annulation libre : Vous serez remboursé du montant total de la location, déduction faite des frais de transaction bancaire incompressibles prélevés par Stripe (environ 3%)."),
                "Le texte d'avertissement Zero-Loss exact est requis dans la modale"
            );
        });
    });

    describe('3. Logique frontend et affichage conditionnel (trailers.js)', () => {
        const trailersJs = fs.readFileSync(path.join(jsDir, 'trailers.js'), 'utf8');

        it('trailers.js doit afficher le bouton "Annuler la réservation" pour les réservations payées et futures', () => {
            assert.ok(trailersJs.includes('Annuler la réservation'));
            assert.ok(trailersJs.includes("openCancelBookingModal(booking, false)"));
        });

        it('trailers.js doit afficher le badge "Annulée" pour les réservations au statut annule', () => {
            assert.ok(trailersJs.includes("booking.status === 'annule'"));
            assert.ok(trailersJs.includes('Annulée'));
        });

        it('trailers.js doit inclure le message d\'avertissement Zero-Loss exact requis', () => {
            assert.ok(
                trailersJs.includes("Annulation libre : Vous serez remboursé du montant total de la location, déduction faite des frais de transaction bancaire incompressibles prélevés par Stripe (environ 3%)."),
                "Message Zero-Loss requis manquant dans trailers.js"
            );
        });

        it('trailers.js doit implémenter l\'indicateur de chargement spinner et showToast', () => {
            assert.ok(trailersJs.includes('animate-spin'));
            assert.ok(trailersJs.includes('showToast'));
        });

        it('trailers.js doit appeler /functions/v1/cancel-booking en transmettant uniquement bookingId (Zero Trust)', () => {
            assert.ok(trailersJs.includes('/functions/v1/cancel-booking'));
            assert.ok(trailersJs.includes('JSON.stringify({ bookingId: booking.id })'));
        });
    });

    describe('4. Cerveau Financier & Sécurité Edge Function (cancel-booking/index.ts)', () => {
        const edgeFnCode = fs.readFileSync(path.join(projectRoot, 'supabase/functions/cancel-booking/index.ts'), 'utf8');

        it('cancel-booking doit initialiser supabaseAdmin avec SERVICE_ROLE_KEY', () => {
            assert.ok(edgeFnCode.includes('SERVICE_ROLE_KEY') || edgeFnCode.includes('SUPABASE_SERVICE_ROLE_KEY'));
            assert.ok(edgeFnCode.includes('createClient(supabaseUrl, serviceRoleKey)'));
        });

        it('cancel-booking doit extraire les frais réels via expand latest_charge.balance_transaction', () => {
            assert.ok(edgeFnCode.includes("expand: ['latest_charge.balance_transaction']"));
            assert.ok(edgeFnCode.includes('balanceTransaction.fee'));
        });

        it('cancel-booking doit appliquer la déduction des frais réels Stripe pour le locataire', () => {
            assert.ok(edgeFnCode.includes('totalPaidCentimes - stripeFeeCentimes'));
        });

        it('cancel-booking doit rembourser à 100% si le propriétaire annule', () => {
            assert.ok(edgeFnCode.includes('refundAmountCentimes = totalPaidCentimes'));
        });

        it('cancel-booking doit exécuter stripe.refunds.create et mettre à jour le statut en base de données', () => {
            assert.ok(edgeFnCode.includes('stripe.refunds.create'));
            assert.ok(edgeFnCode.includes("status: 'annule'"));
            assert.ok(edgeFnCode.includes(".from('bookings')"));
        });

        it('cancel-booking doit implémenter le Rate Limiting anti-DoS financier', () => {
            assert.ok(edgeFnCode.includes('cancel_booking_attempt'));
            assert.ok(edgeFnCode.includes('status: 429'));
        });
    });

    describe('5. Base de données et vue calendrier Flatpickr', () => {
        const migrationSql = fs.readFileSync(path.join(projectRoot, 'supabase/migrations/20260402000000_cancellation_policy.sql'), 'utf8');

        it('La migration SQL doit redéfinir trailer_booked_dates en excluant status = annule', () => {
            assert.ok(migrationSql.includes('trailer_booked_dates'));
            assert.ok(migrationSql.includes("status != 'annule'") || migrationSql.includes("status <> 'annule'"));
        });

        it('La migration SQL doit inclure stripe_fee et stripe_payment_intent_id', () => {
            assert.ok(migrationSql.includes('stripe_fee'));
            assert.ok(migrationSql.includes('stripe_payment_intent_id'));
        });

        it('La migration SQL doit durcir les RLS pour interdire les mises à jour directes par le client', () => {
            assert.ok(migrationSql.includes('FOR UPDATE'));
            assert.ok(migrationSql.includes('USING (false)'));
        });
    });
});
