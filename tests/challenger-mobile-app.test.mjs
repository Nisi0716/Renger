import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const APP_DIR = path.resolve(__dirname, '../../App');
const WWW_DIR = path.join(APP_DIR, 'www');
const RengerMobile = require(path.join(APP_DIR, 'src/mobile-bridge.js'));
const { EXCLUDED_FILES } = require(path.join(APP_DIR, 'sync-app.js'));

function readPngDimensions(filePath) {
    const buf = fs.readFileSync(filePath);
    assert.equal(buf[0], 0x89);
    assert.equal(buf[1], 0x50);
    assert.equal(buf[2], 0x4E);
    assert.equal(buf[3], 0x47);
    return {
        width: buf.readUInt32BE(16),
        height: buf.readUInt32BE(20)
    };
}

describe('Challenger Suite: Renger Mobile App (iOS App Store & Google Play / Capacitor)', () => {

    it('1. Dossier App/ isolé et configuration Capacitor ch.renger.app valide', () => {
        assert.ok(fs.existsSync(APP_DIR), 'Le dossier /Users/enismedjiti/Documents/Renger/App doit exister');
        const capConfig = JSON.parse(fs.readFileSync(path.join(APP_DIR, 'capacitor.config.json'), 'utf-8'));
        assert.equal(capConfig.appId, 'ch.renger.app');
        assert.equal(capConfig.appName, 'Renger');
        assert.equal(capConfig.webDir, 'www');
        assert.equal(capConfig.backgroundColor, '#1c1917');
    });

    it('2. Conformité Store stricte : exclusion de syni.html et js/syni.js dans www, iOS et Android', () => {
        const targets = [
            WWW_DIR,
            path.join(APP_DIR, 'ios/App/App/public'),
            path.join(APP_DIR, 'android/app/src/main/assets/public')
        ];
        for (const dir of targets) {
            assert.ok(fs.existsSync(dir), `Dossier ${dir} manquant`);
            for (const file of EXCLUDED_FILES) {
                assert.equal(fs.existsSync(path.join(dir, file)), false, `${file} ne doit jamais être dans ${dir}`);
            }
        }
    });

    it('3. Adaptation Safe Area (Notch / Dynamic Island) et injection mobile-bridge.js sur toutes les pages HTML', () => {
        const htmlFiles = fs.readdirSync(WWW_DIR).filter(f => f.endsWith('.html'));
        assert.ok(htmlFiles.length >= 11);
        for (const f of htmlFiles) {
            const html = fs.readFileSync(path.join(WWW_DIR, f), 'utf-8');
            assert.match(html, /viewport-fit=cover/, `${f} doit inclure viewport-fit=cover`);
            assert.match(html, /js\/mobile-bridge\.js/, `${f} doit charger js/mobile-bridge.js`);
            assert.match(html, /capacitor:\/\/localhost/, `${f} doit autoriser capacitor://localhost dans la CSP`);
        }
    });

    it('4. Barre de navigation inférieure native à 4 onglets (Explorer, Mes réservations, Messages, Profil)', () => {
        assert.equal(RengerMobile.MOBILE_TABS.length, 4);
        assert.deepEqual(
            RengerMobile.MOBILE_TABS.map(t => t.id),
            ['mobile-nav-explore', 'mobile-nav-bookings', 'mobile-nav-messages', 'mobile-nav-settings']
        );
        const indexHtml = fs.readFileSync(path.join(WWW_DIR, 'index.html'), 'utf-8');
        assert.match(indexHtml, /id="mobile-nav-explore"/);
        assert.match(indexHtml, /id="mobile-nav-bookings"/);
        assert.match(indexHtml, /id="mobile-nav-messages"/);
        assert.match(indexHtml, /id="mobile-nav-settings"/);
    });

    it('5. Pont matériel natif : Caméra, GPS CO art. 257a, Haptics, Stripe Browser et Push Notifications', async () => {
        assert.equal(typeof RengerMobile.triggerHaptic, 'function');
        assert.equal(typeof RengerMobile.getNativeCoordinates, 'function');
        assert.equal(typeof RengerMobile.captureNativePhoto, 'function');
        assert.equal(typeof RengerMobile.openStripeCheckout, 'function');
        assert.equal(typeof RengerMobile.initPushNotifications, 'function');

        assert.equal(RengerMobile.isStripeUrl('https://checkout.stripe.com/c/pay/cs_test_123'), true);
        assert.equal(RengerMobile.isStripeUrl('https://evil.com/checkout.stripe.com'), false);
    });

    it('6. Projets natifs iOS (Xcode Info.plist) & Android (AndroidManifest.xml) et icônes Store 1024x1024 / 512x512', () => {
        const plist = fs.readFileSync(path.join(APP_DIR, 'ios/App/App/Info.plist'), 'utf-8');
        assert.match(plist, /NSCameraUsageDescription/);
        assert.match(plist, /NSLocationWhenInUseUsageDescription/);
        assert.match(plist, /ITSAppUsesNonExemptEncryption/);

        const manifest = fs.readFileSync(path.join(APP_DIR, 'android/app/src/main/AndroidManifest.xml'), 'utf-8');
        assert.match(manifest, /android\.permission\.CAMERA/);
        assert.match(manifest, /android\.permission\.ACCESS_FINE_LOCATION/);

        assert.deepEqual(
            readPngDimensions(path.join(APP_DIR, 'resources/appstore-icon-1024.png')),
            { width: 1024, height: 1024 }
        );
        assert.deepEqual(
            readPngDimensions(path.join(APP_DIR, 'resources/playstore-icon-512.png')),
            { width: 512, height: 512 }
        );
    });

    it('7. Câblage Stripe Checkout natif dans App/www/js/booking.js et core.js & origines Capacitor sécurisées dans les Edge Functions', () => {
        const bookingJs = fs.readFileSync(path.join(WWW_DIR, 'js/booking.js'), 'utf-8');
        assert.match(bookingJs, /RengerMobile\.openStripeCheckout\(stripeData\.url\)/);
        assert.match(bookingJs, /RengerMobile\.openStripeCheckout\(data\.url\)/);

        const coreJs = fs.readFileSync(path.join(WWW_DIR, 'js/core.js'), 'utf-8');
        assert.match(coreJs, /RengerMobile\.openStripeCheckout\(data\.url\)/);
        assert.match(coreJs, /RengerMobile\.getPublicAppOrigin/);

        const edgeFunctions = ['stripe-checkout', 'stripe-pro-checkout', 'stripe-boost-checkout', 'stripe-portal'];
        for (const fnName of edgeFunctions) {
            const fnCode = fs.readFileSync(path.resolve(__dirname, `../supabase/functions/${fnName}/index.ts`), 'utf-8');
            assert.match(fnCode, /renger\|capacitor/, `${fnName} doit filtrer les schémas Capacitor renger:// et capacitor://`);
        }
    });

    it('8. Neutralisation complète des accès secrets Syni (Cmd+Shift+S, 5 clics footer et #settings-syni-card) dans App/www', () => {
        const componentsJs = fs.readFileSync(path.join(WWW_DIR, 'js/components.js'), 'utf-8');
        assert.equal(/window\.location\.href\s*=\s*['"]syni\.html['"]/.test(componentsJs), false);

        const trailersJs = fs.readFileSync(path.join(WWW_DIR, 'js/trailers.js'), 'utf-8');
        assert.equal(/syniCard\.classList\.remove\(['"]hidden['"]\)/.test(trailersJs), false);

        const profilHtml = fs.readFileSync(path.join(WWW_DIR, 'profil.html'), 'utf-8');
        assert.equal(/href=["']syni\.html["']/i.test(profilHtml), false);
    });

    it('9. Conversion JPEG native (Magic Bytes 0xFF 0xD8 0xFF) et masquage de la Bottom Tab Bar sur #inspection-page', async () => {
        const file = RengerMobile.dataUrlToJpegFile('data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/', 'step1.jpg');
        assert.ok(file);
        const buf = await file.slice(0, 4).arrayBuffer();
        const bytes = new Uint8Array(buf);
        assert.equal(bytes[0], 0xFF);
        assert.equal(bytes[1], 0xD8);
        assert.equal(bytes[2], 0xFF);

        const styleCss = fs.readFileSync(path.join(WWW_DIR, 'style.css'), 'utf-8');
        assert.match(styleCss, /html\.renger-mobile-app #inspection-page/);
    });
});
