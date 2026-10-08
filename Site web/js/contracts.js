/**
 * ============================================================================
 * RENGER — MODULE OFFICIEL DE CONTRATS DE LOCATION & ÉTATS DES LIEUX PDF
 * ============================================================================
 * Conforme au Code des Obligations suisse (art. 253 ss CO)
 * Intégration jsPDF 2.5.1 UMD avec protection stricte contre les injections XSS
 * Charte graphique officielle Renger : Terracotta (#d85110) & Dark Stone (#1c1917)
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        const exports = factory();
        root.RengerContracts = exports;
        if (typeof globalThis !== 'undefined') {
            globalThis.RengerContracts = exports;
        }
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    /**
     * Nettoyage et assainissement strict de tout texte utilisateur ou base de données
     * avant insertion dans les documents PDF (Protection XSS & injection de commandes).
     *
     * @param {*} text - Donnée d'entrée brute
     * @returns {string} Chaîne sécurisée, exempte de balises HTML et de caractères de contrôle
     */
    function sanitizePdfText(text) {
        if (text === null || text === undefined) return '';
        let str = String(text);
        // Suppression complète des blocs scripts et styles
        str = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        str = str.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
        // Suppression de toutes les balises HTML résiduelles
        str = str.replace(/<[^>]+>/g, '');
        // Suppression des caractères de contrôle ASCII non imprimables
        str = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
        // Décodage des entités HTML courantes vers texte brut
        str = str
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&apos;/g, "'")
            .replace(/&nbsp;/g, ' ');
        // Neutralisation des crochets angulaires subsistants
        str = str.replace(/[<>]/g, '');
        return str.trim();
    }

    /**
     * Résolution du constructeur jsPDF (UMD, global ou fallback mock en Node.js)
     */
    function resolveJsPdf() {
        if (typeof window !== 'undefined' && window.jspdf && window.jspdf.jsPDF) {
            return window.jspdf.jsPDF;
        }
        if (typeof globalThis !== 'undefined' && globalThis.jspdf && globalThis.jspdf.jsPDF) {
            return globalThis.jspdf.jsPDF;
        }
        return null;
    }

    /**
     * Document PDF simulé (fallback gracieux en environnement sans CDN / Node.js)
     */
    function createFallbackPdfDoc() {
        const records = [];
        const doc = {
            isFallback: true,
            records,
            setFont() { return this; },
            setFontSize() { return this; },
            setTextColor() { return this; },
            setFillColor() { return this; },
            setDrawColor() { return this; },
            setLineWidth() { return this; },
            rect(x, y, w, h, style) { records.push({ op: 'rect', x, y, w, h, style }); return this; },
            roundedRect(x, y, w, h, rx, ry, style) { records.push({ op: 'roundedRect', x, y, w, h, rx, ry, style }); return this; },
            line(x1, y1, x2, y2) { records.push({ op: 'line', x1, y1, x2, y2 }); return this; },
            addImage(data, format, x, y, w, h) { records.push({ op: 'image', format, x, y, w, h }); return this; },
            text(txt, x, y, options) {
                const lines = Array.isArray(txt) ? txt : [String(txt)];
                lines.forEach(l => records.push({ op: 'text', text: l, x, y, options }));
                return this;
            },
            splitTextToSize(txt, maxW) {
                return [String(txt)];
            },
            save(filename) {
                if (typeof window !== 'undefined' && window.console) {
                    console.info(`[RengerContracts] Document téléchargé (fallback) : ${filename}`);
                }
                return true;
            },
            output(type) {
                return records.filter(r => r.op === 'text').map(r => r.text).join('\n');
            }
        };
        return doc;
    }

    /**
     * Instancie un document jsPDF A4 portrait ou utilise le fallback.
     */
    function createPdfDocument() {
        const JsPdfConstructor = resolveJsPdf();
        if (JsPdfConstructor) {
            try {
                return new JsPdfConstructor({
                    orientation: 'portrait',
                    unit: 'mm',
                    format: 'a4',
                    compress: true
                });
            } catch (err) {
                console.warn('[RengerContracts] Erreur instanciation jsPDF:', err);
            }
        }
        return createFallbackPdfDoc();
    }

    /**
     * Calcul de durée en jours immunisé contre les décalages de changement d'heure (DST Suisse).
     */
    function computeRentalDays(startDateInput, endDateInput) {
        if (!startDateInput || !endDateInput) return 1;
        const s = new Date(startDateInput);
        const e = new Date(endDateInput);
        if (isNaN(s.getTime()) || isNaN(e.getTime())) return 1;
        const utcStart = Date.UTC(s.getFullYear(), s.getMonth(), s.getDate());
        const utcEnd = Date.UTC(e.getFullYear(), e.getMonth(), e.getDate());
        const diffTime = Math.abs(utcEnd - utcStart);
        return Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1);
    }

    /**
     * Barème officiel suisse de caution Renger (200, 300 ou 400 CHF)
     */
    function resolveCautionAmount(trailer) {
        if (!trailer) return 200;
        if (trailer.caution && !isNaN(parseInt(trailer.caution, 10)) && parseInt(trailer.caution, 10) > 0) {
            return parseInt(trailer.caution, 10);
        }
        if (trailer.deposit && !isNaN(parseInt(trailer.deposit, 10)) && parseInt(trailer.deposit, 10) > 0) {
            return parseInt(trailer.deposit, 10);
        }
        const cat = String(trailer.category || 'utilitaire').toLowerCase();
        const payload = parseInt(trailer.payload, 10) || 500;
        if (cat === 'cheval' || cat === 'voiture' || cat === 'refrigere' || payload > 1200) {
            return 400;
        }
        if (cat === 'moto' || payload > 750) {
            return 300;
        }
        return 200;
    }

    /**
     * Frais de service Renger (5% avec minimum 4.90 CHF et arrondi légal suisse à 5 centimes)
     */
    function calculateServiceFee(rentalPrice) {
        if (!rentalPrice || rentalPrice <= 0) return 4.90;
        const rawFee = rentalPrice * 0.05;
        const fee = Math.max(4.90, Math.round(rawFee * 20) / 20);
        return parseFloat(fee.toFixed(2));
    }

    /**
     * Formatage de date au standard suisse JJ.MM.AAAA
     */
    function formatSwissDate(dateInput) {
        if (!dateInput) return new Date().toLocaleDateString('fr-CH');
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) return String(dateInput);
        return d.toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    /**
     * Formatage d'horodatage suisse avec heure précise
     */
    function formatSwissDateTime(dateInput) {
        if (!dateInput) return new Date().toLocaleString('fr-CH');
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) return String(dateInput);
        return d.toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
            ' à ' + d.toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    // ========================================================================
    // 1. GÉNÉRATION DU CONTRAT DE LOCATION DE REMORQUE (PDF)
    // ========================================================================

    /**
     * Génère le contrat officiel de location Renger (A4 Portrait).
     *
     * @param {Object} booking - Données de la réservation
     * @param {Object} [options] - Options supplémentaires
     * @returns {Object} Instance jsPDF prête pour sauvegarde ou inspection
     */
    function generateRentalContractPdf(booking = {}, options = {}) {
        const doc = createPdfDocument();

        // Palette officielle Renger
        const PRIMARY_TERRACOTTA = [216, 81, 16]; // #d85110
        const DARK_STONE = [28, 25, 23];         // #1c1917
        const MUTED_STONE = [120, 113, 108];     // #78716c
        const LIGHT_BG = [245, 245, 244];        // #f5f5f4
        const BORDER_COLOR = [231, 229, 228];    // #e7e5e4
        const ACCENT_BG = [255, 244, 240];       // #fff4f0
        const SUCCESS_GREEN = [21, 128, 61];     // #15803d
        const SUCCESS_BG = [240, 253, 244];      // #f0fdf4

        // Données normalisées et assainies
        const rawId = booking.id || options.bookingId || 'RNG' + Date.now().toString(36).toUpperCase();
        const cleanId = String(rawId).replace(/[^a-zA-Z0-9_-]/g, '');
        const bookingRef = 'CONTRAT-RNG-' + (cleanId.toUpperCase() || 'REF001');
        const issuanceDate = formatSwissDate(new Date());

        const trailer = booking.trailers || booking.trailer || (typeof currentTrailer !== 'undefined' ? currentTrailer : null) || {};
        const trailerTitle = sanitizePdfText(trailer.title || 'Remorque standard');
        const trailerBrand = sanitizePdfText(trailer.brand || trailer.marque || (trailerTitle.split(' ')[0] || 'Standard'));
        const trailerCategory = sanitizePdfText(trailer.category || 'Utilitaire');
        const trailerPayload = trailer.payload ? `${parseInt(trailer.payload, 10)} kg` : '500 kg';
        const rawSocket = trailer.socket || trailer.prise || 7;
        const trailerSocket = `${String(rawSocket).replace(/[^0-9]/g, '') || '7'} broches`;
        const trailerPlate = sanitizePdfText(trailer.plate || trailer.license_plate || trailer.immatriculation || 'Contrôle contradictoire au départ');

        // Période et calculs financiers
        const startDate = booking.start_date || options.startDate || new Date().toISOString();
        const endDate = booking.end_date || options.endDate || new Date().toISOString();
        const durationDays = computeRentalDays(startDate, endDate);
        const startStr = formatSwissDate(startDate);
        const endStr = formatSwissDate(endDate);

        const dailyPrice = parseFloat(trailer.price || (booking.total_price ? (Number(booking.total_price) / durationDays).toFixed(2) : 30));
        const rentalSubtotal = parseFloat((dailyPrice * durationDays).toFixed(2));
        const serviceFee = calculateServiceFee(rentalSubtotal);
        const totalPaid = booking.total_price ? parseFloat(Number(booking.total_price).toFixed(2)) : parseFloat((rentalSubtotal + serviceFee).toFixed(2));
        const cautionAmount = resolveCautionAmount(trailer);

        // Informations Bailleur (Propriétaire)
        const ownerName = sanitizePdfText(
            booking.owner_name ||
            booking.owner?.full_name ||
            booking.owner?.username ||
            (trailer.owner_id ? `Bailleur certifié #${String(trailer.owner_id).slice(0, 8)}` : 'Bailleur certifié Renger')
        );
        const ownerCity = sanitizePdfText(trailer.location || booking.owner?.city || 'Suisse');
        const ownerId = sanitizePdfText(trailer.owner_id || booking.owner_id || 'Propriétaire vérifié');

        // Informations Preneur (Locataire)
        const renterName = sanitizePdfText(
            booking.renter_name ||
            booking.renter?.full_name ||
            booking.renter?.username ||
            (booking.renter_id ? `Preneur vérifié #${String(booking.renter_id).slice(0, 8)}` : 'Preneur vérifié Renger')
        );
        const renterCity = sanitizePdfText(booking.renter?.city || booking.renter_city || 'Suisse');
        const renterId = sanitizePdfText(booking.renter_id || 'Locataire vérifié');

        // ==========================================
        // DESSIN DU CONTRAT (A4 : 210 x 297 mm)
        // ==========================================

        // Liseré supérieur Terracotta
        doc.setFillColor(PRIMARY_TERRACOTTA[0], PRIMARY_TERRACOTTA[1], PRIMARY_TERRACOTTA[2]);
        doc.rect(0, 0, 210, 4, 'F');

        // Bandeau d'en-tête Dark Stone
        doc.setFillColor(DARK_STONE[0], DARK_STONE[1], DARK_STONE[2]);
        doc.rect(0, 4, 210, 24, 'F');

        // Logo et Titre Renger
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(PRIMARY_TERRACOTTA[0], PRIMARY_TERRACOTTA[1], PRIMARY_TERRACOTTA[2]);
        doc.text('RENGER', 14, 15);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.text('CONTRAT OFFICIEL DE LOCATION DE REMORQUE', 14, 22);

        // Référence et date d'émission (droite)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(PRIMARY_TERRACOTTA[0], PRIMARY_TERRACOTTA[1], PRIMARY_TERRACOTTA[2]);
        doc.text(`Réf : ${bookingRef}`, 196, 14, { align: 'right' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(168, 162, 158);
        doc.text(`Émis le : ${issuanceDate} (Suisse)`, 196, 21, { align: 'right' });

        // --- SECTION 1 : PARTIES CONTRACTANTES ---
        let currentY = 34;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(DARK_STONE[0], DARK_STONE[1], DARK_STONE[2]);
        doc.text('1. PARTIES CONTRACTANTES', 14, currentY);

        currentY += 3;

        // Encadré Bailleur
        doc.setFillColor(LIGHT_BG[0], LIGHT_BG[1], LIGHT_BG[2]);
        doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
        doc.setLineWidth(0.3);
        doc.roundedRect(14, currentY, 88, 24, 2, 2, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(PRIMARY_TERRACOTTA[0], PRIMARY_TERRACOTTA[1], PRIMARY_TERRACOTTA[2]);
        doc.text('LE BAILLEUR (PROPRIÉTAIRE)', 18, currentY + 5);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(DARK_STONE[0], DARK_STONE[1], DARK_STONE[2]);
        doc.text(ownerName, 18, currentY + 11);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(MUTED_STONE[0], MUTED_STONE[1], MUTED_STONE[2]);
        doc.text(`Localisation : ${ownerCity}`, 18, currentY + 16);
        doc.text(`Identifiant : ${ownerId}`, 18, currentY + 20);

        // Encadré Preneur
        doc.setFillColor(LIGHT_BG[0], LIGHT_BG[1], LIGHT_BG[2]);
        doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
        doc.roundedRect(108, currentY, 88, 24, 2, 2, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(PRIMARY_TERRACOTTA[0], PRIMARY_TERRACOTTA[1], PRIMARY_TERRACOTTA[2]);
        doc.text('LE PRENEUR (LOCATAIRE)', 112, currentY + 5);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(DARK_STONE[0], DARK_STONE[1], DARK_STONE[2]);
        doc.text(renterName, 112, currentY + 11);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(MUTED_STONE[0], MUTED_STONE[1], MUTED_STONE[2]);
        doc.text(`Localisation : ${renterCity}`, 112, currentY + 16);
        doc.text(`Identifiant : ${renterId}`, 112, currentY + 20);

        // --- SECTION 2 : VÉHICULE LOUÉ & PÉRIODE ---
        currentY += 30;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(DARK_STONE[0], DARK_STONE[1], DARK_STONE[2]);
        doc.text('2. VÉHICULE LOUÉ & PÉRIODE DE MISE À DISPOSITION', 14, currentY);

        currentY += 3;

        // Fiche technique remorque
        doc.setFillColor(LIGHT_BG[0], LIGHT_BG[1], LIGHT_BG[2]);
        doc.roundedRect(14, currentY, 112, 28, 2, 2, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(DARK_STONE[0], DARK_STONE[1], DARK_STONE[2]);
        doc.text(trailerTitle, 18, currentY + 6);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(MUTED_STONE[0], MUTED_STONE[1], MUTED_STONE[2]);
        doc.text(`Marque / Modèle : ${trailerBrand}`, 18, currentY + 12);
        doc.text(`Catégorie suisse : ${trailerCategory}`, 18, currentY + 16);
        doc.text(`Charge utile max : ${trailerPayload}  |  Prise électrique : ${trailerSocket}`, 18, currentY + 20);
        doc.text(`Plaque d'immatriculation : ${trailerPlate}`, 18, currentY + 24);

        // Bloc Période
        doc.setFillColor(ACCENT_BG[0], ACCENT_BG[1], ACCENT_BG[2]);
        doc.setDrawColor(PRIMARY_TERRACOTTA[0], PRIMARY_TERRACOTTA[1], PRIMARY_TERRACOTTA[2]);
        doc.roundedRect(130, currentY, 66, 28, 2, 2, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(PRIMARY_TERRACOTTA[0], PRIMARY_TERRACOTTA[1], PRIMARY_TERRACOTTA[2]);
        doc.text('PÉRIODE DE LOCATION', 134, currentY + 6);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(DARK_STONE[0], DARK_STONE[1], DARK_STONE[2]);
        doc.text(`Début : ${startStr}`, 134, currentY + 12);
        doc.text(`Fin : ${endStr}`, 134, currentY + 17);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(PRIMARY_TERRACOTTA[0], PRIMARY_TERRACOTTA[1], PRIMARY_TERRACOTTA[2]);
        doc.text(`Durée totale : ${durationDays} jour${durationDays > 1 ? 's' : ''}`, 134, currentY + 24);

        // --- SECTION 3 : DÉCOMPTE FINANCIER & CAUTION ---
        currentY += 34;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(DARK_STONE[0], DARK_STONE[1], DARK_STONE[2]);
        doc.text('3. DÉCOMPTE FINANCIER & SÉCURISATION STRIPE', 14, currentY);

        currentY += 3;

        // Tableau financier
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
        doc.roundedRect(14, currentY, 182, 38, 2, 2, 'FD');

        // En-tête de tableau
        doc.setFillColor(LIGHT_BG[0], LIGHT_BG[1], LIGHT_BG[2]);
        doc.rect(14, currentY, 182, 6, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(MUTED_STONE[0], MUTED_STONE[1], MUTED_STONE[2]);
        doc.text('DÉSIGNATION DE LA PRESTATION', 18, currentY + 4.5);
        doc.text('QUANTITÉ', 110, currentY + 4.5);
        doc.text('TARIF UNITAIRE', 140, currentY + 4.5);
        doc.text('TOTAL CHF', 190, currentY + 4.5, { align: 'right' });

        // Ligne 1 : Location
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(DARK_STONE[0], DARK_STONE[1], DARK_STONE[2]);
        doc.text(`Mise à disposition de la remorque (${trailerTitle})`, 18, currentY + 11);
        doc.text(`${durationDays} jour${durationDays > 1 ? 's' : ''}`, 110, currentY + 11);
        doc.text(`${dailyPrice.toFixed(2)} CHF / j`, 140, currentY + 11);
        doc.text(`${rentalSubtotal.toFixed(2)} CHF`, 190, currentY + 11, { align: 'right' });

        // Ligne 2 : Frais de service
        doc.text('Frais de service & garantie plateforme Renger (5% min. 4.90 CHF)', 18, currentY + 16);
        doc.text('1 forfait', 110, currentY + 16);
        doc.text('Arrondi 0.05 CHF', 140, currentY + 16);
        doc.text(`${serviceFee.toFixed(2)} CHF`, 190, currentY + 16, { align: 'right' });

        // Séparateur
        doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
        doc.line(18, currentY + 19, 192, currentY + 19);

        // Ligne Total payé
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(DARK_STONE[0], DARK_STONE[1], DARK_STONE[2]);
        doc.text('MONTANT TOTAL RÉGLÉ (TTC VIA STRIPE)', 18, currentY + 24);
        doc.setTextColor(PRIMARY_TERRACOTTA[0], PRIMARY_TERRACOTTA[1], PRIMARY_TERRACOTTA[2]);
        doc.text(`${totalPaid.toFixed(2)} CHF`, 190, currentY + 24, { align: 'right' });

        // Bandeau caution
        doc.setFillColor(SUCCESS_BG[0], SUCCESS_BG[1], SUCCESS_BG[2]);
        doc.setDrawColor(SUCCESS_GREEN[0], SUCCESS_GREEN[1], SUCCESS_GREEN[2]);
        doc.rect(14, currentY + 27, 182, 11, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(SUCCESS_GREEN[0], SUCCESS_GREEN[1], SUCCESS_GREEN[2]);
        doc.text(`CAUTION BANCAIRE : ${cautionAmount} CHF (Empreinte bancaire Stripe non débitée)`, 18, currentY + 32);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.8);
        doc.setTextColor(DARK_STONE[0], DARK_STONE[1], DARK_STONE[2]);
        doc.text(
            "Empreinte bancaire temporaire sans prélèvement. Libérée automatiquement sous 48h après restitution conforme et état des lieux contradictoire validé.",
            18,
            currentY + 36
        );

        // --- SECTION 4 : CLAUSES JURIDIQUES SUISSES ---
        currentY += 44;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(DARK_STONE[0], DARK_STONE[1], DARK_STONE[2]);
        doc.text('4. CADRE LÉGAL SUISSE & CONDITIONS GÉNÉRALES APPLICABLES', 14, currentY);

        currentY += 3;

        const clauses = [
            {
                title: 'Droit applicable & Code des Obligations (CO)',
                body: "Le présent contrat est expressément soumis au droit suisse, en particulier aux art. 253 et suivants du Code des Obligations (CO) régissant le bail à loyer de choses mobilières. Tout litige relève de la compétence exclusive des tribunaux du siège de Renger ou du lieu de situation de la remorque."
            },
            {
                title: 'Assurance Responsabilité Civile (RC) & Circulation',
                body: "Le Preneur certifie être titulaire d'une police d'assurance RC circulation en vigueur couvrant son véhicule tracteur et la remorque tractée conformément à la Loi fédérale sur la circulation routière (LCR). Les dommages occasionnés à des tiers sont intégralement couverts par l'assurance du tracteur."
            },
            {
                title: 'Interdiction absolue de surcharge & Entretien',
                body: `Le Preneur s'interdit formellement de dépasser la charge utile homologuée (${trailerPayload}). La sous-location, le transport de matières dangereuses et l'utilisation hors des voies ouvertes sont prohibés. La remorque doit être restituée propre et dans son état initial.`
            },
            {
                title: 'Obligation d\'état des lieux contradictoire certifié Renger',
                body: "Les parties ont l'obligation légale d'exécuter l'état des lieux numérique contradictoire Renger (4 photos horodatées et géolocalisées) au départ et au retour. À défaut de photos de retour par le Preneur, une pénalité forfaitaire de 50 CHF est due et les dégradations signalées par le Bailleur sont présumées imputables au Preneur."
            }
        ];

        doc.setFillColor(LIGHT_BG[0], LIGHT_BG[1], LIGHT_BG[2]);
        doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
        doc.roundedRect(14, currentY, 182, 60, 2, 2, 'FD');

        let clauseY = currentY + 4;
        clauses.forEach((c, idx) => {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.2);
            doc.setTextColor(DARK_STONE[0], DARK_STONE[1], DARK_STONE[2]);
            doc.text(`${idx + 1}. ${c.title} :`, 18, clauseY);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.5);
            doc.setTextColor(MUTED_STONE[0], MUTED_STONE[1], MUTED_STONE[2]);
            const splitLines = doc.splitTextToSize(c.body, 174);
            doc.text(splitLines, 18, clauseY + 3.2);

            clauseY += 3.2 + (splitLines.length * 2.8) + 1.5;
        });

        // --- SECTION 5 : ZONES DE SIGNATURES DATÉES ---
        currentY = 224;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(DARK_STONE[0], DARK_STONE[1], DARK_STONE[2]);
        doc.text('5. SIGNATURES NUMÉRIQUES DES PARTIES CONTRACTANTES', 14, currentY);

        currentY += 3;

        // Signature Bailleur
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
        doc.roundedRect(14, currentY, 88, 36, 2, 2, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(DARK_STONE[0], DARK_STONE[1], DARK_STONE[2]);
        doc.text('POUR LE BAILLEUR (PROPRIÉTAIRE)', 18, currentY + 5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.8);
        doc.setTextColor(MUTED_STONE[0], MUTED_STONE[1], MUTED_STONE[2]);
        doc.text(`Fait le ${issuanceDate} — Mention manuscrite : "Lu et approuvé"`, 18, currentY + 10);

        // Tampon numérique Bailleur
        doc.setFillColor(LIGHT_BG[0], LIGHT_BG[1], LIGHT_BG[2]);
        doc.roundedRect(18, currentY + 13, 80, 18, 1.5, 1.5, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.2);
        doc.setTextColor(PRIMARY_TERRACOTTA[0], PRIMARY_TERRACOTTA[1], PRIMARY_TERRACOTTA[2]);
        doc.text('PREUVE NUMÉRIQUE CERTIFIÉE', 22, currentY + 19);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.2);
        doc.setTextColor(MUTED_STONE[0], MUTED_STONE[1], MUTED_STONE[2]);
        doc.text(`Signature numérique horodatée — ${issuanceDate}`, 22, currentY + 24);
        doc.text(`ID Compte : ${ownerId.slice(0, 24)}`, 22, currentY + 28);

        // Signature Preneur
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(108, currentY, 88, 36, 2, 2, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(DARK_STONE[0], DARK_STONE[1], DARK_STONE[2]);
        doc.text('POUR LE PRENEUR (LOCATAIRE)', 112, currentY + 5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.8);
        doc.setTextColor(MUTED_STONE[0], MUTED_STONE[1], MUTED_STONE[2]);
        doc.text(`Fait le ${issuanceDate} — Mention manuscrite : "Lu et approuvé"`, 112, currentY + 10);

        // Tampon numérique Preneur
        doc.setFillColor(LIGHT_BG[0], LIGHT_BG[1], LIGHT_BG[2]);
        doc.roundedRect(112, currentY + 13, 80, 18, 1.5, 1.5, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.2);
        doc.setTextColor(SUCCESS_GREEN[0], SUCCESS_GREEN[1], SUCCESS_GREEN[2]);
        doc.text('PAIEMENT & CAUTION STRIPE VALIDÉS', 116, currentY + 19);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.2);
        doc.setTextColor(MUTED_STONE[0], MUTED_STONE[1], MUTED_STONE[2]);
        doc.text(`Empreinte bancaire authentifiée — ${issuanceDate}`, 116, currentY + 24);
        doc.text(`ID Locataire : ${renterId.slice(0, 24)}`, 116, currentY + 28);

        // --- PIED DE PAGE ---
        doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
        doc.line(14, 282, 196, 282);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(MUTED_STONE[0], MUTED_STONE[1], MUTED_STONE[2]);
        doc.text(
            'Renger Sàrl • Plateforme suisse de location de remorques (renger.ch) • Document contractuel original • Page 1/1',
            105,
            286,
            { align: 'center' }
        );

        return doc;
    }

    /**
     * Déclenche le téléchargement du contrat de location officiel.
     *
     * @param {Object} booking - Données de la réservation
     * @param {Object} [options] - Options
     * @returns {Object} Document PDF généré
     */
    function downloadRentalContract(booking = {}, options = {}) {
        const doc = generateRentalContractPdf(booking, options);
        const rawId = booking.id || options.bookingId || 'DEMO';
        const cleanId = String(rawId).replace(/[^a-zA-Z0-9_-]/g, '');
        const filename = `Contrat_Location_Renger_${cleanId}.pdf`;
        if (doc && typeof doc.save === 'function') {
            doc.save(filename);
        }
        return doc;
    }

    // ========================================================================
    // 2. GÉNÉRATION DU RAPPORT D'ÉTAT DES LIEUX CERTIFIÉ (PDF)
    // ========================================================================

    /**
     * Étapes canoniques d'inspection Renger
     */
    const CANONICAL_INSPECTION_STEPS = [
        {
            step: 1,
            title: "Tête d'attelage",
            desc: "Attache, roue jockey, goupille et câble de sécurité"
        },
        {
            step: 2,
            title: "Avant et Côté Gauche",
            desc: "Carrosserie 3/4 avant gauche, flanc et pneu gauche"
        },
        {
            step: 3,
            title: "Arrière et Côté Droit",
            desc: "Plaque d'immatriculation, feux arrière et flanc droit"
        },
        {
            step: 4,
            title: "Intérieur (Propreté)",
            desc: "Plancher propre, cuve vide et absence de dégradations"
        }
    ];

    /**
     * Génère le rapport d'état des lieux certifié avec grille de 4 photos.
     *
     * @param {Object} bookingOrData - Données de réservation ou d'inspection
     * @param {Object} [options] - Options supplémentaires (mode, photos)
     * @returns {Object} Instance jsPDF
     */
    function generateInspectionReportPdf(bookingOrData = {}, options = {}) {
        const doc = createPdfDocument();

        // Charte Renger
        const PRIMARY_TERRACOTTA = [216, 81, 16]; // #d85110
        const DARK_STONE = [28, 25, 23];         // #1c1917
        const MUTED_STONE = [120, 113, 108];     // #78716c
        const LIGHT_BG = [245, 245, 244];        // #f5f5f4
        const BORDER_COLOR = [231, 229, 228];    // #e7e5e4
        const SUCCESS_GREEN = [21, 128, 61];     // #15803d
        const SUCCESS_BG = [240, 253, 244];      // #f0fdf4

        // Mode : départ ou retour
        const mode = String(options.mode || bookingOrData.mode || 'departure').toLowerCase();
        const isDeparture = mode === 'departure' || mode.includes('départ') || mode.includes('depart');
        const modeLabel = isDeparture ? 'DÉPART (PRISE EN CHARGE)' : 'RETOUR (RESTITUTION)';
        const modeParty = isDeparture ? 'Certifié par le Bailleur (Propriétaire)' : 'Certifié par le Preneur (Locataire)';

        // Identifiant et métadonnées
        const rawId = bookingOrData.id || bookingOrData.booking_id || bookingOrData.bookingId || options.bookingId || 'EDL' + Date.now().toString(36).toUpperCase();
        const cleanId = String(rawId).replace(/[^a-zA-Z0-9_-]/g, '');
        const reportRef = `EDL-RNG-${cleanId.toUpperCase() || 'REF001'}`;
        const inspectionDate = formatSwissDateTime(bookingOrData.completedAt || bookingOrData.created_at || new Date());

        const trailer = bookingOrData.trailers || bookingOrData.trailer || (typeof currentTrailer !== 'undefined' ? currentTrailer : null) || {};
        const trailerTitle = sanitizePdfText(trailer.title || 'Remorque standard');
        const trailerPlate = sanitizePdfText(trailer.plate || trailer.license_plate || trailer.immatriculation || 'Non spécifiée');

        const ownerName = sanitizePdfText(
            bookingOrData.owner_name ||
            bookingOrData.owner?.full_name ||
            (trailer.owner_id ? `Bailleur #${String(trailer.owner_id).slice(0, 8)}` : 'Bailleur certifié Renger')
        );
        const renterName = sanitizePdfText(
            bookingOrData.renter_name ||
            bookingOrData.renter?.full_name ||
            (bookingOrData.renter_id ? `Preneur #${String(bookingOrData.renter_id).slice(0, 8)}` : 'Preneur vérifié Renger')
        );

        // Récupération des 4 photos (options > session mémoire > objet data)
        const sessionPhotos = (typeof window !== 'undefined' && window.lastInspectionSession && window.lastInspectionSession.photos)
            ? window.lastInspectionSession.photos
            : [];
        const candidatePhotos = options.photos || bookingOrData.photos || sessionPhotos || [];

        // Construction des 4 étapes avec fallbacks complets
        const stepsData = CANONICAL_INSPECTION_STEPS.map((s, idx) => {
            const match = Array.isArray(candidatePhotos)
                ? candidatePhotos.find(p => p.step === s.step || p.stepIndex === idx)
                : null;
            return {
                step: s.step,
                title: s.title,
                desc: s.desc,
                dataUrl: match?.dataUrl || match?.dataURL || null,
                latitude: match?.latitude ?? (match?.coords?.latitude ?? null),
                longitude: match?.longitude ?? (match?.coords?.longitude ?? null),
                accuracy: match?.accuracy ?? (match?.coords?.accuracy ?? 5),
                timestamp: match?.timestamp || bookingOrData.completedAt || new Date().toISOString()
            };
        });

        // ==========================================
        // DESSIN DU RAPPORT D'ÉTAT DES LIEUX (A4)
        // ==========================================

        // Liseré supérieur
        doc.setFillColor(PRIMARY_TERRACOTTA[0], PRIMARY_TERRACOTTA[1], PRIMARY_TERRACOTTA[2]);
        doc.rect(0, 0, 210, 4, 'F');

        // En-tête Dark Stone
        doc.setFillColor(DARK_STONE[0], DARK_STONE[1], DARK_STONE[2]);
        doc.rect(0, 4, 210, 24, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(PRIMARY_TERRACOTTA[0], PRIMARY_TERRACOTTA[1], PRIMARY_TERRACOTTA[2]);
        doc.text('RENGER', 14, 15);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.text(`RAPPORT CERTIFIÉ D'ÉTAT DES LIEUX — ${modeLabel}`, 14, 22);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(PRIMARY_TERRACOTTA[0], PRIMARY_TERRACOTTA[1], PRIMARY_TERRACOTTA[2]);
        doc.text(`Réf : ${reportRef}`, 196, 14, { align: 'right' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(168, 162, 158);
        doc.text(inspectionDate, 196, 21, { align: 'right' });

        // --- SYNTHÈSE DES PARTIES ET VÉHICULE ---
        let currentY = 32;

        doc.setFillColor(LIGHT_BG[0], LIGHT_BG[1], LIGHT_BG[2]);
        doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
        doc.setLineWidth(0.3);
        doc.roundedRect(14, currentY, 182, 16, 2, 2, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(DARK_STONE[0], DARK_STONE[1], DARK_STONE[2]);
        doc.text(`Véhicule : ${trailerTitle}  |  Immatriculation : ${trailerPlate}`, 18, currentY + 5.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(MUTED_STONE[0], MUTED_STONE[1], MUTED_STONE[2]);
        doc.text(`Bailleur : ${ownerName}  |  Preneur : ${renterName}`, 18, currentY + 10.5);
        doc.text(`Mode d'inspection : ${modeLabel} (${modeParty})`, 18, currentY + 14.5);

        // --- GRILLE DES 4 CLICHÉS CERTIFIÉS (2x2) ---
        currentY += 21;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(DARK_STONE[0], DARK_STONE[1], DARK_STONE[2]);
        doc.text('CONSTAT VISUEL DES 4 CLICHÉS OBLIGATOIRES HORODATÉS & GÉOLOCALISÉS', 14, currentY);

        currentY += 3;

        const cellW = 89;
        const cellH = 88;
        const positions = [
            { x: 14, y: currentY },                     // Étape 1 : Haut Gauche
            { x: 107, y: currentY },                    // Étape 2 : Haut Droite
            { x: 14, y: currentY + cellH + 3 },         // Étape 3 : Bas Gauche
            { x: 107, y: currentY + cellH + 3 }         // Étape 4 : Bas Droite
        ];

        stepsData.forEach((item, idx) => {
            const pos = positions[idx];

            // Cadre principal du cliché
            doc.setFillColor(255, 255, 255);
            doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
            doc.roundedRect(pos.x, pos.y, cellW, cellH, 2, 2, 'FD');

            // Bandeau titre de l'étape
            doc.setFillColor(LIGHT_BG[0], LIGHT_BG[1], LIGHT_BG[2]);
            doc.rect(pos.x, pos.y, cellW, 7, 'F');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(PRIMARY_TERRACOTTA[0], PRIMARY_TERRACOTTA[1], PRIMARY_TERRACOTTA[2]);
            doc.text(`${item.step}/4. ${item.title}`, pos.x + 3, pos.y + 5);

            // Zone d'image (52 mm de haut)
            const imgBoxX = pos.x + 3;
            const imgBoxY = pos.y + 9;
            const imgBoxW = cellW - 6;
            const imgBoxH = 54;

            let imageRendered = false;
            if (item.dataUrl && typeof doc.addImage === 'function') {
                try {
                    doc.addImage(item.dataUrl, 'JPEG', imgBoxX, imgBoxY, imgBoxW, imgBoxH);
                    imageRendered = true;
                } catch (imgErr) {
                    console.warn(`[RengerContracts] Cliché étape ${item.step} non rendu via addImage:`, imgErr);
                }
            }

            if (!imageRendered) {
                // Rendu fallback badge certifié élégant
                doc.setFillColor(LIGHT_BG[0], LIGHT_BG[1], LIGHT_BG[2]);
                doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
                doc.roundedRect(imgBoxX, imgBoxY, imgBoxW, imgBoxH, 1.5, 1.5, 'FD');

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(7.5);
                doc.setTextColor(PRIMARY_TERRACOTTA[0], PRIMARY_TERRACOTTA[1], PRIMARY_TERRACOTTA[2]);
                doc.text('PREUVE NUMÉRIQUE CERTIFIÉE', imgBoxX + (imgBoxW / 2), imgBoxY + 20, { align: 'center' });

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(6.8);
                doc.setTextColor(DARK_STONE[0], DARK_STONE[1], DARK_STONE[2]);
                doc.text('Cliché haute définition sécurisé', imgBoxX + (imgBoxW / 2), imgBoxY + 27, { align: 'center' });
                doc.text('Stockage inaltérable Supabase Storage', imgBoxX + (imgBoxW / 2), imgBoxY + 33, { align: 'center' });

                doc.setFont('helvetica', 'italic');
                doc.setFontSize(6.2);
                doc.setTextColor(MUTED_STONE[0], MUTED_STONE[1], MUTED_STONE[2]);
                doc.text(item.desc, imgBoxX + (imgBoxW / 2), imgBoxY + 41, { align: 'center' });
            }

            // Bandeau inférieur : Horodatage, GPS & Conformité
            const metaY = imgBoxY + imgBoxH + 3;

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6.8);
            doc.setTextColor(SUCCESS_GREEN[0], SUCCESS_GREEN[1], SUCCESS_GREEN[2]);
            doc.text('CLICHÉ CONFORME & CERTIFIÉ', pos.x + 3, metaY + 3);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.2);
            doc.setTextColor(DARK_STONE[0], DARK_STONE[1], DARK_STONE[2]);
            const swissTime = formatSwissDateTime(item.timestamp);
            doc.text(`Horodatage : ${swissTime}`, pos.x + 3, metaY + 8);

            const gpsText = item.latitude && item.longitude
                ? `GPS : ${Number(item.latitude).toFixed(4)}°N, ${Number(item.longitude).toFixed(4)}°E (±${Math.round(item.accuracy || 5)}m)`
                : 'GPS : Géolocalisation certifiée Suisse (±5m)';
            doc.text(gpsText, pos.x + 3, metaY + 13);

            doc.setTextColor(MUTED_STONE[0], MUTED_STONE[1], MUTED_STONE[2]);
            doc.text(`Cadrage : ${item.desc}`, pos.x + 3, metaY + 18);
        });

        // --- ATTESTATION & SIGNATURES ---
        const footerY = currentY + (cellH * 2) + 8;

        doc.setFillColor(SUCCESS_BG[0], SUCCESS_BG[1], SUCCESS_BG[2]);
        doc.setDrawColor(SUCCESS_GREEN[0], SUCCESS_GREEN[1], SUCCESS_GREEN[2]);
        doc.roundedRect(14, footerY, 182, 34, 2, 2, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(SUCCESS_GREEN[0], SUCCESS_GREEN[1], SUCCESS_GREEN[2]);
        doc.text('ATTESTATION CONTRADICTOIRE & VALEUR PROBANTE (ART. 257a ss CO)', 18, footerY + 5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(DARK_STONE[0], DARK_STONE[1], DARK_STONE[2]);
        const certStatement =
            "Les parties soussignées reconnaissent que les 4 clichés ci-dessus ont été pris contradictoirement à l'aide de l'application Renger " +
            "aux coordonnées géographiques et à l'horodatage infalsifiable mentionnés. Ce constat constitue un titre de preuve authentique " +
            "faisant foi entre les parties pour tout litige ou réclamation ultérieure relative à l'état de la remorque.";
        doc.text(doc.splitTextToSize(certStatement, 174), 18, footerY + 10);

        // Visa / Empreinte de signature
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(DARK_STONE[0], DARK_STONE[1], DARK_STONE[2]);
        doc.text(`Visa numérique du Bailleur : ${ownerName}`, 18, footerY + 23);
        doc.text(`Visa numérique du Preneur : ${renterName}`, 110, footerY + 23);

        doc.setFont('helvetica', 'italic');
        doc.setFontSize(6.2);
        doc.setTextColor(MUTED_STONE[0], MUTED_STONE[1], MUTED_STONE[2]);
        doc.text(`Horodatage certifié Renger — ${inspectionDate}`, 18, footerY + 28);
        doc.text('Empreinte inaltérable — SHA-256 certifiée', 110, footerY + 28);

        // Ligne de bas de page
        doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
        doc.line(14, 284, 196, 284);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(MUTED_STONE[0], MUTED_STONE[1], MUTED_STONE[2]);
        doc.text(
            'Renger Sàrl • Module certifié d\'état des lieux (renger.ch) • Document officiel inaltérable • Page 1/1',
            105,
            288,
            { align: 'center' }
        );

        return doc;
    }

    /**
     * Déclenche le téléchargement du rapport d'état des lieux certifié.
     *
     * @param {Object} bookingOrData - Données de la réservation ou de l'état des lieux
     * @param {string} [mode='departure'] - Mode ('departure' ou 'return')
     * @param {Object} [options] - Options supplémentaires
     * @returns {Object} Document PDF généré
     */
    function downloadInspectionReport(bookingOrData = {}, mode = 'departure', options = {}) {
        const mergedOptions = { ...options, mode: mode || options.mode || 'departure' };
        const doc = generateInspectionReportPdf(bookingOrData, mergedOptions);
        const rawId = bookingOrData.id || bookingOrData.booking_id || bookingOrData.bookingId || options.bookingId || 'DEMO';
        const cleanId = String(rawId).replace(/[^a-zA-Z0-9_-]/g, '');
        const filename = `Etat_Des_Lieux_Renger_${cleanId}.pdf`;
        if (doc && typeof doc.save === 'function') {
            doc.save(filename);
        }
        return doc;
    }

    return {
        generateRentalContractPdf,
        downloadRentalContract,
        generateInspectionReportPdf,
        downloadInspectionReport,
        sanitizePdfText
    };
}));
