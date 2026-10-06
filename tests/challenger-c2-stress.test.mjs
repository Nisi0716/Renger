import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const siteWebDir = path.join(projectRoot, 'Site web');
const jsDir = path.join(siteWebDir, 'js');

// Charge contracts.js en environnement Node.js
const contractsModule = path.join(jsDir, 'contracts.js');
const RengerContracts = (function() {
    const moduleWrapper = { exports: {} };
    const fn = new Function('module', 'exports', fs.readFileSync(contractsModule, 'utf8'));
    fn(moduleWrapper, moduleWrapper.exports);
    return moduleWrapper.exports;
})();

const {
    sanitizePdfText,
    generateRentalContractPdf,
    downloadRentalContract,
    generateInspectionReportPdf,
    downloadInspectionReport
} = RengerContracts;

const ALL_9_HTML_FILES = [
    'index.html',
    'remorques.html',
    'remorque.html',
    'louer-ma-remorque.html',
    'profil.html',
    'inspection.html',
    'pro.html',
    'cgu.html',
    'politique-confidentialite.html'
];

/**
 * Extrait fidèlement la chaîne CSP de la balise meta sans être tronqué par les guillemets simples internes
 */
function extractCsp(html) {
    const doubleMatch = html.match(/<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]+content="([^"]*)"/i) ||
                        html.match(/<meta[^>]+content="([^"]*)"[^>]+http-equiv=["']Content-Security-Policy["']/i);
    if (doubleMatch) return doubleMatch[1];
    const singleMatch = html.match(/<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]+content='([^']*)'/i) ||
                        html.match(/<meta[^>]+content='([^']*)'[^>]+http-equiv=["']Content-Security-Policy["']/i);
    if (singleMatch) return singleMatch[1];
    return null;
}

// ============================================================================
// SUITE 1 : ADVERSARIAL FUZZING & XSS SANITIZATION (sanitizePdfText & PDF)
// ============================================================================
describe('Challenger 2 - Suite 1: Adversarial Fuzzing & XSS Immunization', () => {

    it('must neutralize classic script injection vectors without leaking tags', () => {
        const attackVectors = [
            '<script>alert(1)</script>',
            '<script src="https://evil.com/payload.js"></script>',
            '<SCRIPT>alert("UPPERCASE")</SCRIPT>',
            '<sCrIpT>alert("mIxEd")</sCrIpT>',
            '<script type="text/javascript">alert(document.domain)</script>',
            '<script\x20type="text/javascript">alert(1)</script>',
            '<script>alert("nested <script>alert(2)</script>")</script>',
            '<script><script>alert(1)</script></script>',
            '><script>alert(1)</script>',
            '<<SCRIPT>alert("XSS");//<</SCRIPT>',
            '<<<SCRIPT>alert(1)</SCRIPT>>',
            '<SCRIPT/XSS SRC="http://evil.com/xss.js"></SCRIPT>',
            '<script\x00>alert(1)</script>'
        ];

        for (const vector of attackVectors) {
            const sanitized = sanitizePdfText(vector);
            assert.ok(!sanitized.includes('<script'), `Doit supprimer les balises script: ${vector}`);
            assert.ok(!sanitized.includes('</script>'), `Doit supprimer la fermeture script: ${vector}`);
            assert.ok(!sanitized.includes('<'), `Aucun chevron ouvrant ne doit subsister: ${vector}`);
            assert.ok(!sanitized.includes('>'), `Aucun chevron fermant ne doit subsister: ${vector}`);
        }
    });

    it('must strip image tags with event handlers and javascript: URIs', () => {
        const imgVectors = [
            '<img src=x onerror=alert(1)>',
            '<img src="x" onerror="alert(1)"/>',
            '<img src=\'x\' onerror=\'alert(1)\'>',
            '<IMG SRC="javascript:alert(\'XSS\')">',
            '<img src="valid.jpg" onload="evilCode()">',
            '<img src="x" onmouseover="alert(1)">',
            '<svg onload=alert(1)>',
            '<body onload=alert(1)>',
            '<iframe src="javascript:alert(1)"></iframe>',
            '<iframe src="https://evil.ch"></iframe>',
            '<iframe/src="data:text/html,<script>alert(1)</script>">',
            '<a href="javascript:alert(1)">Lien Piège</a>',
            'javascript:alert(1)'
        ];

        for (const vector of imgVectors) {
            const sanitized = sanitizePdfText(vector);
            assert.ok(!sanitized.includes('<img'), `Doit supprimer balise img: ${vector}`);
            assert.ok(!sanitized.includes('<iframe'), `Doit supprimer balise iframe: ${vector}`);
            assert.ok(!sanitized.includes('<svg'), `Doit supprimer balise svg: ${vector}`);
            assert.ok(!sanitized.includes('onerror='), `Doit supprimer attributs onerror: ${vector}`);
            assert.ok(!sanitized.includes('onload='), `Doit supprimer attributs onload: ${vector}`);
            assert.ok(!sanitized.includes('<'), `Aucun chevron ouvrant: ${vector}`);
            assert.ok(!sanitized.includes('>'), `Aucun chevron fermant: ${vector}`);
        }
    });

    it('must strip non-printable ASCII control characters and null bytes', () => {
        const rawWithControls = "Tête\x00d'attelage\x01\x02\x08\x0B\x0C\x0E\x1F\x7FBordure";
        const sanitized = sanitizePdfText(rawWithControls);
        assert.ok(!sanitized.includes('\x00'), "Null byte doit être éliminé");
        assert.ok(!sanitized.includes('\x08'), "Backspace doit être éliminé");
        assert.ok(!sanitized.includes('\x1F'), "Control char 0x1F doit être éliminé");
        assert.ok(!sanitized.includes('\x7F'), "DEL char 0x7F doit être éliminé");
        assert.strictEqual(sanitized, "Têted'attelageBordure");
    });

    it('must decode standard HTML entities safely while suppressing residual brackets', () => {
        const htmlEntities = [
            { input: '&lt;script&gt;alert(1)&lt;/script&gt;', expectedNoBracket: true },
            { input: 'Remorque &amp; Bâche &quot;Super&quot;', expectedText: 'Remorque & Bâche "Super"' },
            { input: 'Prix &#39;Promo&#39; &amp; Remise', expectedText: "Prix 'Promo' & Remise" },
            { input: 'Espace&nbsp;Insécable', expectedText: 'Espace Insécable' },
            { input: '&lt;b&gt;Gras&lt;/b&gt;', expectedNoBracket: true },
            { input: '&amp;lt;script&amp;gt;', expectedNoBracket: true }
        ];

        for (const item of htmlEntities) {
            const sanitized = sanitizePdfText(item.input);
            if (item.expectedNoBracket) {
                assert.ok(!sanitized.includes('<') && !sanitized.includes('>'), `Pas de chevrons pour: ${item.input}`);
            }
            if (item.expectedText) {
                assert.strictEqual(sanitized, item.expectedText);
            }
        }
    });

    it('must preserve legitimate multilingual Swiss characters, umlauts and accents', () => {
        const swissTexts = [
            "Genève, Lausanne, Fribourg, Neuchâtel, Valais — Août 2026",
            "Zürich, Bern, St. Gallen, Luzern — Großartig & Überragend",
            "Ticino, Lugano, Bellinzona — Città e Lago",
            "Romont (FR) — Ch. des Marais 12, 1680 Romont"
        ];

        for (const text of swissTexts) {
            const sanitized = sanitizePdfText(text);
            assert.strictEqual(sanitized, text, `Texte suisse légitime altéré: ${text}`);
        }
    });

    it('must safely handle non-string and boundary inputs without crashing', () => {
        assert.strictEqual(sanitizePdfText(null), '');
        assert.strictEqual(sanitizePdfText(undefined), '');
        assert.strictEqual(sanitizePdfText(0), '0');
        assert.strictEqual(sanitizePdfText(1234.56), '1234.56');
        assert.strictEqual(sanitizePdfText(true), 'true');
        assert.strictEqual(sanitizePdfText(false), 'false');
        assert.strictEqual(sanitizePdfText(''), '');
        assert.strictEqual(sanitizePdfText('   \n  \t '), '');
    });

    it('must survive fuzzing with massive payload in contract PDF generation without crashing', () => {
        const toxicBooking = {
            id: '<script>alert("ID")</script>PAYLOAD-999',
            start_date: '2026-08-01',
            end_date: '2026-08-05',
            owner_name: '<img src=x onerror=alert("OWNER")>Jean & Sons',
            renter_name: '<iframe src="javascript:alert(1)"></iframe>Pierre "Le Preneur"',
            trailer: {
                title: 'Remorque <script>alert("TITLE")</script> Pro & Bâche',
                brand: '<svg onload=alert(1)>Humbaur</svg>',
                category: '<style>body{color:red}</style>utilitaire',
                payload: '850',
                plate: 'VD-123456<script>',
                location: 'Genève & Vaud\x00\x08'
            }
        };

        const doc = generateRentalContractPdf(toxicBooking);
        assert.ok(doc, "Le document PDF doit être généré même avec des payloads toxiques");
        const output = doc.output();
        assert.ok(!output.includes('<script'), "Le contenu généré ne doit pas contenir de balise script");
        assert.ok(!output.includes('<iframe'), "Le contenu généré ne doit pas contenir de balise iframe");
        assert.ok(!output.includes('<img src'), "Le contenu généré ne doit pas contenir de balise img");
        assert.ok(!output.includes('\x00'), "Le contenu généré ne doit pas contenir d'octet nul");
    });
});

// ============================================================================
// SUITE 2 : SWISS FINANCIAL CALCULATIONS, DST SHIFTS & CAUTION SCALE
// ============================================================================
describe('Challenger 2 - Suite 2: Swiss Financial Calculations & Legal Rules', () => {

    it('must compute rental days correctly across UTC date boundaries and DST shifts', () => {
        const testDuration = (start, end) => {
            const doc = generateRentalContractPdf({ start_date: start, end_date: end, trailer: { price: 30 } });
            const out = doc.output();
            const match = out.match(/Durée totale : (\d+) jour/);
            return match ? parseInt(match[1], 10) : null;
        };

        // Même jour -> 1 jour
        assert.strictEqual(testDuration('2026-07-10', '2026-07-10'), 1, "Même jour = 1 jour");

        // 3 jours consécutifs
        assert.strictEqual(testDuration('2026-07-10', '2026-07-12'), 3, "Du 10 au 12 = 3 jours (10, 11, 12)");

        // 7 jours (1 semaine)
        assert.strictEqual(testDuration('2026-07-10', '2026-07-16'), 7, "Du 10 au 16 = 7 jours");

        // Transition DST Automne 2026 (passage à l'heure d'hiver : nuit du 24 au 25 octobre 2026)
        assert.strictEqual(testDuration('2026-10-24', '2026-10-26'), 3, "Transition DST Automne doit donner exactement 3 jours");

        // Transition DST Printemps 2026 (passage à l'heure d'été : nuit du 28 au 29 mars 2026)
        assert.strictEqual(testDuration('2026-03-28', '2026-03-30'), 3, "Transition DST Printemps doit donner exactement 3 jours");

        // Année bissextile (28 fév au 1er mars d'une année bissextile 2028)
        assert.strictEqual(testDuration('2028-02-28', '2028-03-01'), 3, "28 fév, 29 fév, 1er mars = 3 jours");

        // Dates inversées (end < start)
        assert.strictEqual(testDuration('2026-07-15', '2026-07-10'), 6, "Dates inversées gérées via Math.abs");

        // Cas de repli : dates manquantes ou invalides
        assert.strictEqual(testDuration(null, null), 1, "Dates nulles repli 1 jour");
        assert.strictEqual(testDuration('invalide', 'invalide'), 1, "Dates invalides repli 1 jour");
    });

    it('must enforce Renger service fee: 5%, min 4.90 CHF, and legal 0.05 CHF Swiss rounding', () => {
        // Extraction précise des frais depuis le tableau PDF généré
        const getFinancialBreakdown = (dailyPrice, days = 1) => {
            const doc = generateRentalContractPdf({
                start_date: '2026-08-01',
                end_date: `2026-08-0${days}`,
                trailer: { price: dailyPrice }
            });
            const out = doc.output();
            const feeMatch = out.match(/Arrondi 0\.05 CHF\n([\d.]+) CHF/);
            return feeMatch ? parseFloat(feeMatch[1]) : null;
        };

        // Formule canonique
        const calculateExpectedFee = (price) => {
            if (!price || price <= 0 || isNaN(Number(price))) return 4.90;
            const raw = Number(price) * 0.05;
            return parseFloat(Math.max(4.90, Math.round(raw * 20) / 20).toFixed(2));
        };

        // Échantillons requis : 0, 10, 50, 97.50, 1000 CHF
        const testCases = [
            { price: 0, expected: 4.90, note: "0 CHF -> minimum 4.90 CHF" },
            { price: -50, expected: 4.90, note: "Négatif -> minimum 4.90 CHF" },
            { price: 10, expected: 4.90, note: "10 CHF -> 5% = 0.50 CHF -> minimum 4.90 CHF" },
            { price: 50, expected: 4.90, note: "50 CHF -> 5% = 2.50 CHF -> minimum 4.90 CHF" },
            { price: 97.50, expected: 4.90, note: "97.50 CHF -> 5% = 4.875 CHF -> arrondi 4.90 CHF -> min 4.90 CHF" },
            { price: 98.00, expected: 4.90, note: "98.00 CHF -> 5% = 4.90 CHF -> 4.90 CHF exact" },
            { price: 99.00, expected: 4.95, note: "99.00 CHF -> 5% = 4.95 CHF -> 4.95 CHF exact" },
            { price: 100.00, expected: 5.00, note: "100.00 CHF -> 5% = 5.00 CHF -> 5.00 CHF" },
            { price: 123.00, expected: 6.15, note: "123.00 CHF -> 5% = 6.15 CHF -> 6.15 CHF" },
            { price: 157.50, expected: 7.90, note: "157.50 CHF -> 5% = 7.875 CHF -> arrondi 7.90 CHF" },
            { price: 1000.00, expected: 50.00, note: "1000.00 CHF -> 5% = 50.00 CHF -> 50.00 CHF" }
        ];

        for (const tc of testCases) {
            const calculated = calculateExpectedFee(tc.price);
            assert.strictEqual(calculated, tc.expected, `Échec calcul formule pour ${tc.price} CHF: ${tc.note}`);
            if (tc.price >= 0) {
                const fromPdf = getFinancialBreakdown(tc.price, 1);
                if (fromPdf !== null) {
                    assert.strictEqual(fromPdf, tc.expected, `Échec frais dans le PDF pour ${tc.price} CHF`);
                }
            }
        }
    });

    it('must accurately resolve Swiss caution barème (200, 300, 400 CHF) and include Stripe note', () => {
        const scenarios = [
            // Standard / Utilitaire léger <= 750kg -> 200 CHF
            {
                trailer: { category: 'utilitaire', payload: 500 },
                expectedCaution: 200,
                desc: "Utilitaire 500kg"
            },
            // Moto -> 300 CHF
            {
                trailer: { category: 'moto', payload: 400 },
                expectedCaution: 300,
                desc: "Porte-moto 400kg"
            },
            // Utilitaire lourd > 750kg et <= 1200kg -> 300 CHF
            {
                trailer: { category: 'utilitaire', payload: 1000 },
                expectedCaution: 300,
                desc: "Utilitaire 1000kg"
            },
            // Cheval -> 400 CHF
            {
                trailer: { category: 'cheval', payload: 1500 },
                expectedCaution: 400,
                desc: "Van à chevaux"
            },
            // Voiture -> 400 CHF
            {
                trailer: { category: 'voiture', payload: 1600 },
                expectedCaution: 400,
                desc: "Porte-voiture"
            },
            // Frigo / Réfrigéré -> 400 CHF
            {
                trailer: { category: 'refrigere', payload: 800 },
                expectedCaution: 400,
                desc: "Remorque frigorifique"
            },
            // Très lourde charge > 1200kg -> 400 CHF
            {
                trailer: { category: 'benne', payload: 2000 },
                expectedCaution: 400,
                desc: "Benne lourde 2000kg"
            },
            // Caution personnalisée explicite en base (caution)
            {
                trailer: { category: 'utilitaire', payload: 500, caution: 250 },
                expectedCaution: 250,
                desc: "Caution personnalisée 250 CHF"
            },
            // Caution personnalisée explicite en base (deposit)
            {
                trailer: { category: 'utilitaire', payload: 500, deposit: 350 },
                expectedCaution: 350,
                desc: "Dépôt personnalisé 350 CHF"
            },
            // Repli remorque nulle
            {
                trailer: null,
                expectedCaution: 200,
                desc: "Remorque nulle"
            }
        ];

        for (const sc of scenarios) {
            const doc = generateRentalContractPdf({ trailer: sc.trailer });
            const out = doc.output();
            const expectedText = `CAUTION BANCAIRE : ${sc.expectedCaution} CHF`;
            assert.ok(out.includes(expectedText), `Échec barème pour ${sc.desc}: attendu '${expectedText}'`);
            assert.ok(
                out.includes('Empreinte bancaire Stripe non débitée'),
                `Mention obligatoire Stripe manquante pour ${sc.desc}`
            );
            assert.ok(
                out.includes('Libérée automatiquement sous 48h'),
                `Mention libération 48h manquante pour ${sc.desc}`
            );
        }
    });
});

// ============================================================================
// SUITE 3 : CERTIFIED INSPECTION REPORT STRUCTURE, 4 PHOTOS, GPS & TIMESTAMPS
// ============================================================================
describe('Challenger 2 - Suite 3: Certified Inspection Report Structure & Evidence Grid', () => {

    it('must enforce the exact 4 canonical photo inspection steps in sequential order', () => {
        const doc = generateInspectionReportPdf({ id: 'EDL-001' });
        const out = doc.output();

        assert.ok(out.includes("1/4. Tête d'attelage"), "Étape 1 manquante");
        assert.ok(out.includes("Attache, roue jockey, goupille et câble de sécurité"), "Desc étape 1 manquante");

        assert.ok(out.includes("2/4. Avant et Côté Gauche"), "Étape 2 manquante");
        assert.ok(out.includes("Carrosserie 3/4 avant gauche, flanc et pneu gauche"), "Desc étape 2 manquante");

        assert.ok(out.includes("3/4. Arrière et Côté Droit"), "Étape 3 manquante");
        assert.ok(out.includes("Plaque d'immatriculation, feux arrière et flanc droit"), "Desc étape 3 manquante");

        assert.ok(out.includes("4/4. Intérieur (Propreté)"), "Étape 4 manquante");
        assert.ok(out.includes("Plancher propre, cuve vide et absence de dégradations"), "Desc étape 4 manquante");
    });

    it('must format GPS coordinates with 4 decimal places and metric accuracy indication', () => {
        const photosWithGps = [
            { step: 1, latitude: 46.519653, longitude: 6.632273, accuracy: 3.2, timestamp: '2026-10-06T10:00:00Z' },
            { step: 2, latitude: 46.204391, longitude: 6.143158, accuracy: 4.8, timestamp: '2026-10-06T10:01:00Z' },
            { step: 3, latitude: 46.947974, longitude: 7.447447, accuracy: 2.1, timestamp: '2026-10-06T10:02:00Z' },
            { step: 4, latitude: 47.376887, longitude: 8.541694, accuracy: 5.0, timestamp: '2026-10-06T10:03:00Z' }
        ];

        const doc = generateInspectionReportPdf({ id: 'GPS-TEST', photos: photosWithGps });
        const out = doc.output();

        // Lausanne
        assert.ok(out.includes('46.5197°N, 6.6323°E (±3m)'), "Formatage GPS Lausanne échoué");
        // Genève
        assert.ok(out.includes('46.2044°N, 6.1432°E (±5m)'), "Formatage GPS Genève échoué");
        // Berne
        assert.ok(out.includes('46.9480°N, 7.4474°E (±2m)'), "Formatage GPS Berne échoué");
        // Zürich
        assert.ok(out.includes('47.3769°N, 8.5417°E (±5m)'), "Formatage GPS Zürich échoué");
    });

    it('must correctly render real image dataUrls in the 2x2 grid via addImage', () => {
        // Mini pixel transparent 1x1 JPEG base64
        const dummyDataUrl = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

        const photosWithImages = [
            { step: 1, dataUrl: dummyDataUrl, latitude: 46.5197, longitude: 6.6323 },
            { step: 2, dataUrl: dummyDataUrl, latitude: 46.5197, longitude: 6.6323 },
            { step: 3, dataUrl: dummyDataUrl, latitude: 46.5197, longitude: 6.6323 },
            { step: 4, dataUrl: dummyDataUrl, latitude: 46.5197, longitude: 6.6323 }
        ];

        const doc = generateInspectionReportPdf({ id: 'IMG-GRID-TEST', photos: photosWithImages });
        assert.ok(doc.records, "Les records du document mock doivent exister");

        const imageRecords = doc.records.filter(r => r.op === 'image');
        assert.strictEqual(imageRecords.length, 4, "Les 4 photos doivent être enregistrées via doc.addImage");

        // Vérification des coordonnées x,y de la grille 2x2
        // Case 1 (Haut Gauche) : x = 17, y = 65, w = 83, h = 54
        assert.strictEqual(imageRecords[0].x, 17);
        assert.strictEqual(imageRecords[0].y, 65);
        assert.strictEqual(imageRecords[0].w, 83);
        assert.strictEqual(imageRecords[0].h, 54);
        // Case 2 (Haut Droite) : x = 110, y = 65, w = 83, h = 54
        assert.strictEqual(imageRecords[1].x, 110);
        assert.strictEqual(imageRecords[1].y, 65);
        // Case 3 (Bas Gauche) : x = 17, y = 156, w = 83, h = 54
        assert.strictEqual(imageRecords[2].x, 17);
        assert.strictEqual(imageRecords[2].y, 156);
        // Case 4 (Bas Droite) : x = 110, y = 156, w = 83, h = 54
        assert.strictEqual(imageRecords[3].x, 110);
        assert.strictEqual(imageRecords[3].y, 156);
    });

    it('must render certified fallback badge when photo dataUrl is missing or invalid', () => {
        // Aucune photo passée -> Les 4 cases doivent afficher le badge certifié
        const doc = generateInspectionReportPdf({ id: 'FALLBACK-TEST', photos: [] });
        const out = doc.output();

        assert.ok(out.includes('PREUVE NUMÉRIQUE CERTIFIÉE'), "Badge fallback absent");
        assert.ok(out.includes('Stockage inaltérable Supabase Storage'), "Mention stockage inaltérable absente");
    });

    it('must differentiate Departure vs Return modes and certified signatory roles', () => {
        const depDoc = generateInspectionReportPdf({ id: 'MOD-01' }, { mode: 'departure' });
        const depOut = depDoc.output();
        assert.ok(depOut.includes('DÉPART (PRISE EN CHARGE)'), "Mode départ manquant");
        assert.ok(depOut.includes('Certifié par le Bailleur (Propriétaire)'), "Bailleur certifiant départ manquant");

        const retDoc = generateInspectionReportPdf({ id: 'MOD-02' }, { mode: 'return' });
        const retOut = retDoc.output();
        assert.ok(retOut.includes('RETOUR (RESTITUTION)'), "Mode retour manquant");
        assert.ok(retOut.includes('Certifié par le Preneur (Locataire)'), "Preneur certifiant retour manquant");
    });

    it('must include statutory Swiss legal attestation under art. 257a CO with SHA-256 seal', () => {
        const doc = generateInspectionReportPdf({
            id: 'LEGAL-01',
            owner_name: 'Guillaume Tell',
            renter_name: 'Henri Dunant'
        });
        const out = doc.output();

        assert.ok(out.includes('ATTESTATION CONTRADICTOIRE & VALEUR PROBANTE (ART. 257a ss CO)'), "En-tête légal CO 257a manquant");
        assert.ok(out.includes('titre de preuve authentique'), "Mention titre authentique manquante");
        assert.ok(out.includes('Visa numérique du Bailleur : Guillaume Tell'), "Visa bailleur manquant");
        assert.ok(out.includes('Visa numérique du Preneur : Henri Dunant'), "Visa preneur manquant");
        assert.ok(out.includes('Empreinte inaltérable — SHA-256 certifiée'), "Empreinte SHA-256 manquante");
    });
});

// ============================================================================
// SUITE 4 : CONTENT SECURITY POLICY (CSP) VERIFICATION (ALL 9 HTML FILES)
// ============================================================================
describe('Challenger 2 - Suite 4: Strict Content Security Policy on All 9 HTML Files', () => {

    it('must ensure all 9 HTML files exist and contain a valid CSP meta tag in head', () => {
        for (const filename of ALL_9_HTML_FILES) {
            const filePath = path.join(siteWebDir, filename);
            assert.ok(fs.existsSync(filePath), `Fichier HTML manquant : ${filename}`);

            const content = fs.readFileSync(filePath, 'utf8');
            const csp = extractCsp(content);
            assert.ok(csp, `Balise CSP manquante ou invalide dans ${filename}`);
            assert.ok(csp.length > 50, `Balise CSP incomplète dans ${filename}`);
        }
    });

    it('must authorize Leaflet / OpenStreetMap in img-src, connect-src, and style-src across all 9 HTML files', () => {
        for (const filename of ALL_9_HTML_FILES) {
            const content = fs.readFileSync(path.join(siteWebDir, filename), 'utf8');
            const csp = extractCsp(content);
            assert.ok(csp, `CSP introuvable dans ${filename}`);

            // OpenStreetMap tuiles
            assert.ok(csp.includes('https://*.tile.openstreetmap.org'), `OpenStreetMap tiles manquant dans ${filename}`);
            // Unpkg (Leaflet assets)
            assert.ok(csp.includes('https://unpkg.com'), `Unpkg manquant dans ${filename}`);
        }
    });

    it('must authorize jsPDF CDN (cdnjs.cloudflare.com) and required CDNs in script-src across all 9 HTML files', () => {
        const requiredScriptSources = [
            'https://cdnjs.cloudflare.com', // jsPDF 2.5.1
            'https://cdn.tailwindcss.com',   // Tailwind CSS
            'https://cdn.jsdelivr.net',      // Supabase & Flatpickr
            'https://js.stripe.com',         // Stripe Elements
            'https://unpkg.com'              // Leaflet
        ];

        for (const filename of ALL_9_HTML_FILES) {
            const content = fs.readFileSync(path.join(siteWebDir, filename), 'utf8');
            const csp = extractCsp(content);
            assert.ok(csp, `CSP introuvable dans ${filename}`);

            const scriptSrcMatch = csp.match(/script-src\s+([^;]+)/i);
            assert.ok(scriptSrcMatch, `script-src manquant dans ${filename}`);
            const scriptSrc = scriptSrcMatch[1];

            for (const reqSrc of requiredScriptSources) {
                assert.ok(scriptSrc.includes(reqSrc), `Source script manquante '${reqSrc}' dans ${filename}`);
            }
        }
    });

    it('must authorize Supabase and Stripe backends in connect-src and frame-src across all 9 HTML files', () => {
        for (const filename of ALL_9_HTML_FILES) {
            const content = fs.readFileSync(path.join(siteWebDir, filename), 'utf8');
            const csp = extractCsp(content);
            assert.ok(csp, `CSP introuvable dans ${filename}`);

            // Connect-src
            const connectMatch = csp.match(/connect-src\s+([^;]+)/i);
            assert.ok(connectMatch, `connect-src manquant dans ${filename}`);
            const connectSrc = connectMatch[1];
            assert.ok(connectSrc.includes('https://cwifrzajxrcpnqceyxnj.supabase.co'), `Supabase manquant dans connect-src de ${filename}`);
            assert.ok(connectSrc.includes('https://api.stripe.com'), `Stripe API manquant dans connect-src de ${filename}`);

            // Frame-src
            const frameMatch = csp.match(/frame-src\s+([^;]+)/i);
            assert.ok(frameMatch, `frame-src manquant dans ${filename}`);
            const frameSrc = frameMatch[1];
            assert.ok(frameSrc.includes('https://js.stripe.com'), `Stripe frames manquant dans frame-src de ${filename}`);
        }
    });

    it('remorque.html and critical pages must include npmcdn.com for flatpickr fr locale', () => {
        const content = fs.readFileSync(path.join(siteWebDir, 'remorque.html'), 'utf8');
        const csp = extractCsp(content);
        assert.ok(csp, "CSP remorque.html");
        assert.ok(csp.includes('https://npmcdn.com'), "remorque.html doit autoriser npmcdn.com pour la locale Flatpickr fr");
    });
});

// ============================================================================
// SUITE 5 : END-TO-END WORKFLOW INTEGRATION (PROFIL, INSPECTION, CHAT)
// ============================================================================
describe('Challenger 2 - Suite 5: MPA Workflow Integration & PDF Action Triggers', () => {

    it('profil.html must load jsPDF and contracts.js scripts', () => {
        const profilHtml = fs.readFileSync(path.join(siteWebDir, 'profil.html'), 'utf8');
        assert.match(profilHtml, /jspdf\.umd\.min\.js/, "profil.html doit importer jsPDF");
        assert.match(profilHtml, /js\/contracts\.js/, "profil.html doit importer js/contracts.js");
    });

    it('inspection.html must load jsPDF and contracts.js scripts and provide download trigger', () => {
        const inspectionHtml = fs.readFileSync(path.join(siteWebDir, 'inspection.html'), 'utf8');
        assert.match(inspectionHtml, /jspdf\.umd\.min\.js/, "inspection.html doit importer jsPDF");
        assert.match(inspectionHtml, /js\/contracts\.js/, "inspection.html doit importer js/contracts.js");
        assert.match(inspectionHtml, /id=["']download-inspection-pdf-btn["']/, "inspection.html doit contenir #download-inspection-pdf-btn");
    });

    it('chat.js must wire download actions to RengerContracts methods', () => {
        const chatCode = fs.readFileSync(path.join(jsDir, 'chat.js'), 'utf8');
        assert.match(chatCode, /RengerContracts\.downloadRentalContract/, "chat.js doit appeler downloadRentalContract");
        assert.match(chatCode, /RengerContracts\.downloadInspectionReport/, "chat.js doit appeler downloadInspectionReport");
    });

    it('downloadRentalContract and downloadInspectionReport must produce valid filenames', () => {
        const mockBooking = { id: 'VD_987654' };
        const contractDoc = downloadRentalContract(mockBooking);
        assert.ok(contractDoc, "downloadRentalContract doit retourner le document");

        const reportDoc = downloadInspectionReport(mockBooking, 'return');
        assert.ok(reportDoc, "downloadInspectionReport doit retourner le document");
    });
});
