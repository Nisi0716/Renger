import { describe, test, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const siteWebDir = path.join(projectRoot, 'Site web');
const jsDir = path.join(siteWebDir, 'js');

describe('Tier 1: JavaScript Syntax Validation (node --check)', () => {
    const jsFiles = [
        'core.js',
        'trailers.js',
        'booking.js',
        'chat.js',
        'components.js',
        'inspection.js',
        'tracking.js',
        'stats.js'
    ];

    for (const fileName of jsFiles) {
        it(`should have valid JavaScript syntax with exit code 0 for js/${fileName}`, () => {
            const filePath = path.join(jsDir, fileName);
            assert.ok(fs.existsSync(filePath), `Fichier JS manquant: ${filePath}`);

            const result = spawnSync(process.execPath, ['--check', filePath], {
                encoding: 'utf8',
                cwd: projectRoot
            });

            const errorMsg = result.stderr ? result.stderr.trim() : (result.stdout ? result.stdout.trim() : 'Unknown error');
            assert.strictEqual(
                result.status,
                0,
                `SyntaxError détectée dans ${fileName}:\n${errorMsg}`
            );
        });
    }
});

describe('Tier 1: HTML Structure, Well-Formedness & Artifact Cleanup', () => {
    const htmlFiles = [
        'index.html',
        'remorques.html',
        'remorque.html',
        'louer-ma-remorque.html',
        'profil.html',
        'inspection.html',
        'pro.html',
        'cgu.html',
        'politique-confidentialite.html',
        'stats.html'
    ];

    for (const fileName of htmlFiles) {
        describe(`File: ${fileName}`, () => {
            const filePath = path.join(siteWebDir, fileName);
            let content = '';

            it(`should exist and have standard HTML5 doctype and tags`, () => {
                assert.ok(fs.existsSync(filePath), `Fichier HTML introuvable: ${filePath}`);
                content = fs.readFileSync(filePath, 'utf8');
                assert.ok(content.length > 0, `Le fichier ${fileName} est vide`);
                assert.match(content, /<!DOCTYPE\s+html>/i, `${fileName} doit contenir un DOCTYPE html`);
                assert.match(content, /<html[^>]*>/i, `${fileName} doit contenir une balise ouvrante <html>`);
                assert.match(content, /<\/html>/i, `${fileName} doit contenir une balise fermante </html>`);
                assert.match(content, /<head[^>]*>/i, `${fileName} doit contenir une balise ouvrante <head>`);
                assert.match(content, /<\/head>/i, `${fileName} doit contenir une balise fermante </head>`);
                assert.match(content, /<body[^>]*>/i, `${fileName} doit contenir une balise ouvrante <body>`);
                assert.match(content, /<\/body>/i, `${fileName} doit contenir une balise fermante </body>`);
            });

            it(`must NOT contain raw literal '\\n' text artifacts before </body>`, () => {
                content = fs.readFileSync(filePath, 'utf8');
                // Vérifier qu'il n'y a pas de caractère d'échappement littéral \n (backslash suivi de n) dans le corps HTML
                const hasLiteralBackslashN = /\\n\s*<\/body>/i.test(content) || /\\n\s*$/m.test(content);
                assert.strictEqual(
                    hasLiteralBackslashN,
                    false,
                    `Le fichier ${fileName} contient un artefact textuel littéral '\\n' devant </body>`
                );
            });

            it(`must reference only existing local script files`, () => {
                content = fs.readFileSync(filePath, 'utf8');
                const scriptSrcRegex = /<script[^>]+src=["']([^"']+)["'][^>]*>/gi;
                let match;
                while ((match = scriptSrcRegex.exec(content)) !== null) {
                    const src = match[1];
                    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('//')) {
                        continue; // CDN externe ignoré
                    }
                    const cleanSrc = src.split('?')[0].split('#')[0];
                    const resolvedPath = path.resolve(siteWebDir, cleanSrc);
                    assert.ok(
                        fs.existsSync(resolvedPath),
                        `Dans ${fileName}, le script local '${src}' est introuvable sur le disque (${resolvedPath})`
                    );
                }
            });
        });
    }
});

describe('Tier 1: Tracking Script Presence in Landing Page', () => {
    it(`index.html must include <script src="js/tracking.js"></script>`, () => {
        const indexPath = path.join(siteWebDir, 'index.html');
        const content = fs.readFileSync(indexPath, 'utf8');
        const hasTrackingScript = /<script[^>]+src=["']js\/tracking\.js["'][^>]*><\/script>/i.test(content);
        assert.ok(
            hasTrackingScript,
            `index.html doit inclure <script src="js/tracking.js"></script> pour activer la bannière cookies et le tracking nLPD/RGPD`
        );
    });
});

describe('Tier 1: Tailwind CSS Configuration Integrity', () => {
    it(`index.html tailwind.config must set darkMode: 'class'`, () => {
        const indexPath = path.join(siteWebDir, 'index.html');
        const content = fs.readFileSync(indexPath, 'utf8');

        // Extraire la configuration tailwind.config
        const match = content.match(/tailwind\.config\s*=\s*(\{[\s\S]*?\n\s*\})/);
        assert.ok(match, `index.html doit contenir une définition inline de tailwind.config`);

        const configSnippet = match[1];
        assert.doesNotMatch(
            configSnippet,
            /darkMode\s*:\s*['"]c11lass['"]/i,
            `Typo 'c11lass' détectée dans tailwind.config de index.html (doit être 'class')`
        );
        assert.match(
            configSnippet,
            /darkMode\s*:\s*['"]class['"]/i,
            `tailwind.config dans index.html doit déclarer darkMode: 'class'`
        );
    });
});
