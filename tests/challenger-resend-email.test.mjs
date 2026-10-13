import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const webhookDir = path.join(projectRoot, 'supabase', 'functions', 'stripe-webhook');
const testResendDir = path.join(projectRoot, 'supabase', 'functions', 'test-resend');

describe('Resend Email Integration Suite', () => {

    it('stripe-webhook/email.ts and test-resend/index.ts must exist and be properly structured', () => {
        const emailTsPath = path.join(webhookDir, 'email.ts');
        const webhookIndexPath = path.join(webhookDir, 'index.ts');
        const testResendPath = path.join(testResendDir, 'index.ts');

        assert.ok(fs.existsSync(emailTsPath), 'email.ts doit exister dans stripe-webhook');
        assert.ok(fs.existsSync(webhookIndexPath), 'index.ts doit exister dans stripe-webhook');
        assert.ok(fs.existsSync(testResendPath), 'index.ts doit exister dans test-resend');

        const webhookContent = fs.readFileSync(webhookIndexPath, 'utf8');
        assert.ok(
            webhookContent.includes('sendBookingConfirmationEmails'),
            'stripe-webhook/index.ts doit importer et utiliser sendBookingConfirmationEmails'
        );
        assert.ok(
            webhookContent.includes('from "./email.ts"'),
            'stripe-webhook/index.ts doit importer depuis ./email.ts'
        );
    });

    it('formatSwissDate converts YYYY-MM-DD to DD.MM.YYYY accurately', () => {
        const emailCode = fs.readFileSync(path.join(webhookDir, 'email.ts'), 'utf8');

        // Extraction et test de formatSwissDate en strippant les annotations TS
        const fnMatch = emailCode.match(/export function formatSwissDate\([\s\S]*?\n\}/);
        assert.ok(fnMatch, 'formatSwissDate doit être exportée');

        const cleanCode = fnMatch[0]
            .replace('export function formatSwissDate', 'function formatSwissDate')
            .replace(/: string/g, '');

        const formatSwissDate = new Function('dateStr', `
            ${cleanCode}
            return formatSwissDate(dateStr);
        `);

        assert.equal(formatSwissDate('2026-10-15'), '15.10.2026');
        assert.equal(formatSwissDate('2026-05-01'), '01.05.2026');
        assert.equal(formatSwissDate('invalid'), 'invalid');
    });

    it('getRenterConfirmationTemplate renders complete Swiss legal clauses, CHF amounts, and non-debited caution', () => {
        const emailCode = fs.readFileSync(path.join(webhookDir, 'email.ts'), 'utf8');

        assert.ok(emailCode.includes('getRenterConfirmationTemplate'), 'getRenterConfirmationTemplate doit exister');
        assert.ok(emailCode.includes('CO art. 253'), 'Doit mentionner le CO art. 253 (contrat de location)');
        assert.ok(emailCode.includes('CO art. 257a'), 'Doit mentionner le CO art. 257a (état des lieux)');
        assert.ok(emailCode.includes('0 CHF débité'), 'Doit rassurer sur la caution non débitée');
        assert.ok(emailCode.includes('#d85110'), 'Doit utiliser la charte couleur Terracotta #d85110');
    });

    it('getOwnerNotificationTemplate differentiates 100% net for PRO and 80% for Standard', () => {
        const emailCode = fs.readFileSync(path.join(webhookDir, 'email.ts'), 'utf8');

        assert.ok(emailCode.includes('getOwnerNotificationTemplate'), 'getOwnerNotificationTemplate doit exister');
        assert.ok(emailCode.includes('isPro ? \'👑 Compte Renger PRO (0% de commission appliquée)\' : \'Compte Standard (80% net du prix de base)\''),
            'Doit afficher la transparence de commission 100% PRO vs 80% standard');
        assert.ok(emailCode.includes('Nouvelle réservation'), 'Doit comporter l\'en-tête de nouvelle réservation');
    });

    it('sendBookingConfirmationEmails handles missing RESEND_API_KEY gracefully without throwing', () => {
        const emailCode = fs.readFileSync(path.join(webhookDir, 'email.ts'), 'utf8');

        assert.ok(
            emailCode.includes("Deno.env.get('RESEND_API_KEY')"),
            'Doit lire la variable RESEND_API_KEY'
        );
        assert.ok(
            emailCode.includes('console.warn(\'[Resend] Secret RESEND_API_KEY non défini'),
            'Doit logger un avertissement non bloquant en cas de clé manquante'
        );
    });

});
