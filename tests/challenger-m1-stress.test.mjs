import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const siteWebDir = path.join(projectRoot, 'Site web');

const HTML_FILES = [
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

// Void elements defined by W3C HTML5 specification
const VOID_ELEMENTS = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr'
]);

// SVG elements that can be self-closing in HTML5
const SVG_SELF_CLOSING = new Set([
    'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse', 'use', 'stop'
]);

/**
 * Tokenizer & Parser that checks HTML structure:
 * - Stack of tags (unclosed / mismatched tags)
 * - Attribute quote matching
 * - Duplicate IDs within document
 * - Script & asset references
 */
function parseAndValidateHtml(htmlContent, fileName) {
    const errors = [];
    const ids = [];
    const idSet = new Set();
    const duplicateIds = [];
    const scriptSrcs = [];
    const linkHrefs = [];
    const inlineScripts = [];

    // Strip comments first to avoid false positives inside comments
    let sanitizedHtml = htmlContent.replace(/<!--[\s\S]*?-->/g, (match, offset) => {
        // Return spaces to preserve character offsets
        return ' '.repeat(match.length);
    });

    // Check for inline scripts and styles: extract content and replace body with spaces
    const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
    let scriptMatch;
    while ((scriptMatch = scriptRegex.exec(sanitizedHtml)) !== null) {
        const attrs = scriptMatch[1];
        const code = scriptMatch[2];
        const srcMatch = attrs.match(/src=["']([^"']+)["']/i);
        const typeMatch = attrs.match(/type=["']([^"']+)["']/i);
        const scriptType = typeMatch ? typeMatch[1].toLowerCase() : 'text/javascript';

        if (srcMatch) {
            scriptSrcs.push(srcMatch[1]);
        } else if (code.trim().length > 0) {
            inlineScripts.push({ code, type: scriptType, offset: scriptMatch.index });
        }
    }

    // Mask script and style bodies so tag parsing does not treat JS/CSS as HTML
    let maskedHtml = sanitizedHtml.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (match, attrs, code) => {
        return `<script${attrs}>` + ' '.repeat(code.length) + `</script>`;
    });
    maskedHtml = maskedHtml.replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, (match, attrs, css) => {
        return `<style${attrs}>` + ' '.repeat(css.length) + `</style>`;
    });

    // Stack for tag nesting
    const tagStack = [];
    
    // Tag matching regex
    // Group 1: entire tag content
    const tagRegex = /<([!\/]?[a-zA-Z0-9\-:]+)([^>]*?)(\/?)>/g;
    let match;
    let lastIndex = 0;

    // Check for unclosed opening angle brackets or double brackets: e.g. <<div or <div<
    const brokenTagRegex = /<[^>]*</g;
    const brokenMatches = [...maskedHtml.matchAll(brokenTagRegex)];
    for (const b of brokenMatches) {
        // Check if it's within a tag
        errors.push(`Malformed tag detected near offset ${b.index}: '${b[0].substring(0, 30)}...'`);
    }

    while ((match = tagRegex.exec(maskedHtml)) !== null) {
        const fullTag = match[0];
        const rawTagName = match[1];
        const attrString = match[2];
        const selfClosingSlash = match[3];
        const tagOffset = match.index;

        // Skip DOCTYPE
        if (rawTagName.toLowerCase() === '!doctype') {
            continue;
        }

        // Closing tag: </tag>
        if (rawTagName.startsWith('/')) {
            const closingName = rawTagName.slice(1).toLowerCase();
            if (VOID_ELEMENTS.has(closingName)) {
                errors.push(`Void element <${closingName}> should not have a closing tag </${closingName}> at offset ${tagOffset}`);
                continue;
            }

            if (tagStack.length === 0) {
                errors.push(`Unexpected closing tag </${closingName}> with empty stack at offset ${tagOffset}`);
            } else {
                const last = tagStack.pop();
                if (last.name !== closingName) {
                    errors.push(`Mismatched closing tag: expected </${last.name}> (opened at offset ${last.offset}), but found </${closingName}> at offset ${tagOffset}`);
                }
            }
            continue;
        }

        // Opening tag: <tag ...>
        const tagName = rawTagName.toLowerCase();

        // Validate attribute string quotes
        validateAttributes(attrString, tagName, tagOffset, errors, (attrName, attrVal) => {
            if (attrName === 'id') {
                ids.push(attrVal);
                if (idSet.has(attrVal)) {
                    duplicateIds.push({ id: attrVal, offset: tagOffset });
                } else {
                    idSet.add(attrVal);
                }
            }
            if (tagName === 'link' && attrName === 'href') {
                linkHrefs.push(attrVal);
            }
        });

        // Determine if self-closing or void
        const isVoid = VOID_ELEMENTS.has(tagName);
        const isSelfClosingSvg = SVG_SELF_CLOSING.has(tagName) && selfClosingSlash === '/';

        if (!isVoid && !isSelfClosingSvg) {
            tagStack.push({ name: tagName, offset: tagOffset, fullTag });
        }
    }

    // Check if any tags remained unclosed on stack
    if (tagStack.length > 0) {
        for (const unclosed of tagStack) {
            errors.push(`Unclosed tag <${unclosed.name}> opened at offset ${unclosed.offset}`);
        }
    }

    return {
        fileName,
        errors,
        ids,
        duplicateIds,
        scriptSrcs,
        linkHrefs,
        inlineScripts
    };
}

/**
 * Validate quotes and extract attributes
 */
function validateAttributes(attrString, tagName, tagOffset, errors, onAttribute) {
    if (!attrString || attrString.trim() === '') return;

    // Tokenize attributes: attrName optionally followed by = and value
    const attrRegex = /([a-zA-Z0-9\-_:@.]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
    let match;
    let consumedLength = 0;

    // Check for mismatched quotes or malformed attribute values like foo="bar' or foo="bar
    const unclosedQuoteRegex = /=\s*["'][^"']*$/;
    if (unclosedQuoteRegex.test(attrString)) {
        errors.push(`Unclosed quote in attributes for <${tagName}> at offset ${tagOffset}: ${attrString}`);
    }

    while ((match = attrRegex.exec(attrString)) !== null) {
        const attrName = match[1].toLowerCase();
        const doubleQuoted = match[2];
        const singleQuoted = match[3];
        const unquoted = match[4];

        const value = doubleQuoted !== undefined ? doubleQuoted :
                     (singleQuoted !== undefined ? singleQuoted :
                     (unquoted !== undefined ? unquoted : ''));

        onAttribute(attrName, value);
    }
}

describe('Challenger M1 Stress Test: HTML Parser & Boundary Cases', () => {

    for (const fileName of HTML_FILES) {
        describe(`Stress testing ${fileName}`, () => {
            const filePath = path.join(siteWebDir, fileName);
            let content = '';
            let parseResult = null;

            it(`file ${fileName} must exist and be readable`, () => {
                assert.ok(fs.existsSync(filePath), `Fichier introuvable: ${filePath}`);
                content = fs.readFileSync(filePath, 'utf8');
                assert.ok(content.length > 0, `Fichier vide: ${fileName}`);
            });

            it(`must parse without malformed, mismatched, or unclosed HTML tags`, () => {
                parseResult = parseAndValidateHtml(content, fileName);
                assert.deepStrictEqual(
                    parseResult.errors,
                    [],
                    `Erreurs de syntaxe HTML dans ${fileName}:\n${parseResult.errors.join('\n')}`
                );
            });

            it(`must NOT have duplicate DOM IDs within ${fileName}`, () => {
                if (!parseResult) parseResult = parseAndValidateHtml(content, fileName);
                const duplicateIdsOnly = parseResult.duplicateIds.map(d => d.id);
                assert.deepStrictEqual(
                    duplicateIdsOnly,
                    [],
                    `IDs dupliqués détectés dans ${fileName}: ${duplicateIdsOnly.join(', ')}`
                );
            });

            it(`must have valid mobile viewport meta configuration`, () => {
                const viewportMatch = content.match(/<meta[^>]+name=["']viewport["'][^>]*content=["']([^"']+)["'][^>]*>/i) ||
                                     content.match(/<meta[^>]+content=["']([^"']+)["'][^>]*name=["']viewport["'][^>]*>/i);
                assert.ok(viewportMatch, `${fileName} doit comporter une balise <meta name="viewport">`);
                const viewportContent = viewportMatch[1];
                assert.match(
                    viewportContent,
                    /width\s*=\s*device-width/i,
                    `La balise viewport de ${fileName} doit spécifier 'width=device-width'`
                );
                assert.match(
                    viewportContent,
                    /initial-scale\s*=\s*1(\.0)?/i,
                    `La balise viewport de ${fileName} doit spécifier 'initial-scale=1'`
                );
            });

            it(`must have valid local script references that exist on disk`, () => {
                if (!parseResult) parseResult = parseAndValidateHtml(content, fileName);
                for (const src of parseResult.scriptSrcs) {
                    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('//')) {
                        assert.match(src, /^https?:\/\/.+/i, `URL de script invalide: ${src}`);
                    } else {
                        const cleanSrc = src.split('?')[0].split('#')[0];
                        const resolved = path.resolve(siteWebDir, cleanSrc);
                        assert.ok(
                            fs.existsSync(resolved),
                            `Script local manquant dans ${fileName}: '${src}' résolu en '${resolved}'`
                        );
                    }
                }
            });

            it(`must have valid syntax for all inline script blocks`, () => {
                if (!parseResult) parseResult = parseAndValidateHtml(content, fileName);
                for (const inline of parseResult.inlineScripts) {
                    if (inline.type === 'application/ld+json') {
                        assert.doesNotThrow(() => {
                            JSON.parse(inline.code);
                        }, `Erreur de syntaxe JSON-LD dans le script inline de ${fileName}`);
                    } else {
                        assert.doesNotThrow(() => {
                            new vm.Script(inline.code);
                        }, `Erreur de syntaxe JS dans le script inline de ${fileName}`);
                    }
                }
            });

            it(`must have valid local stylesheet and icon references that exist on disk`, () => {
                if (!parseResult) parseResult = parseAndValidateHtml(content, fileName);
                for (const href of parseResult.linkHrefs) {
                    if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//')) {
                        continue;
                    }
                    const cleanHref = href.split('?')[0].split('#')[0];
                    const resolved = path.resolve(siteWebDir, cleanHref);
                    assert.ok(
                        fs.existsSync(resolved),
                        `Lien local introuvable dans ${fileName}: '${href}' -> '${resolved}'`
                    );
                }
            });

            it(`must have high DOM query performance (10,000 queries < 250ms)`, () => {
                const sampleIds = parseResult.ids.slice(0, 5);
                if (sampleIds.length === 0) return;

                const iterations = 10000;
                const start = performance.now();
                for (let i = 0; i < iterations; i++) {
                    const targetId = sampleIds[i % sampleIds.length];
                    const regex = new RegExp(`id=["']${targetId}["']`, 'i');
                    const found = regex.test(content);
                    if (!found) throw new Error(`Élément #${targetId} non trouvé durant le stress test`);
                }
                const elapsed = performance.now() - start;
                assert.ok(
                    elapsed < 250,
                    `Performance dégradée sur ${fileName}: ${iterations} requêtes ont pris ${elapsed.toFixed(2)}ms (doit être < 250ms)`
                );
            });
        });
    }
});

describe('Challenger M1 Stress Test: Cross-Page Contracts & Edge Cases', () => {

    it('profil.html must satisfy PRO Dashboard DOM contract elements', () => {
        const profilPath = path.join(siteWebDir, 'profil.html');
        const content = fs.readFileSync(profilPath, 'utf8');

        const proIds = [
            'pro-dashboard-container',
            'pro-stats-blur',
            'stat-impressions',
            'stat-clicks',
            'stat-conversion',
            'stat-occupancy',
            'seller-monthly-revenue',
            'inspection-warning-modal'
        ];

        for (const id of proIds) {
            const regex = new RegExp(`id=["']${id}["']`, 'i');
            assert.ok(regex.test(content), `Élément manquant dans profil.html : id="${id}"`);
        }
    });

    it('remorque.html must satisfy Review Modal contract elements', () => {
        const remorquePath = path.join(siteWebDir, 'remorque.html');
        const content = fs.readFileSync(remorquePath, 'utf8');

        assert.ok(/id=["']review-modal["']/i.test(content), `remorque.html doit inclure #review-modal`);
        assert.ok(/id=["']review-modal-subtitle["']/i.test(content), `remorque.html doit inclure #review-modal-subtitle`);
        assert.ok(/id=["']review-submit-btn["']/i.test(content), `remorque.html doit inclure #review-submit-btn`);
        assert.ok(/id=["']modal-star-picker["']/i.test(content), `remorque.html doit inclure #modal-star-picker`);
    });

    it('remorque.html must NOT contain empty <img src=""> attributes', () => {
        const remorquePath = path.join(siteWebDir, 'remorque.html');
        const content = fs.readFileSync(remorquePath, 'utf8');
        const emptyImgMatches = content.match(/<img[^>]*src=["']\s*["'][^>]*>/gi);
        assert.strictEqual(
            emptyImgMatches,
            null,
            `remorque.html contient des balises <img> avec src vide: ${JSON.stringify(emptyImgMatches)}`
        );
    });

    it('all 9 HTML files must direct mobile-nav-settings to profil.html?p=settings-page', () => {
        for (const fileName of HTML_FILES) {
            const filePath = path.join(siteWebDir, fileName);
            const content = fs.readFileSync(filePath, 'utf8');
            const match = content.match(/<a[^>]*id=["']mobile-nav-settings["'][^>]*href=["']([^"']+)["'][^>]*>/i) ||
                          content.match(/<a[^>]*href=["']([^"']+)["'][^>]*id=["']mobile-nav-settings["'][^>]*>/i);
            assert.ok(match, `Balise #mobile-nav-settings manquante dans ${fileName}`);
            assert.strictEqual(
                match[1],
                'profil.html?p=settings-page',
                `Dans ${fileName}, #mobile-nav-settings href = '${match[1]}', attendu: 'profil.html?p=settings-page'`
            );
        }
    });

    it('all 9 HTML files must have ZERO literal \\n text artifacts before </body>', () => {
        for (const fileName of HTML_FILES) {
            const filePath = path.join(siteWebDir, fileName);
            const content = fs.readFileSync(filePath, 'utf8');
            const hasLiteralBackslashN = /\\n\s*<\/body>/i.test(content) || /\\n\s*$/m.test(content);
            assert.strictEqual(
                hasLiteralBackslashN,
                false,
                `${fileName} contient un résidu textuel '\\n' avant </body>`
            );
        }
    });

    it('all local internal <a href="..."> links must point to existing files', () => {
        const linkRegex = /<a[^>]+href=["']([^"'#]+)(?:#[^"']*)?["']/gi;
        const brokenLinks = [];

        for (const fileName of HTML_FILES) {
            const filePath = path.join(siteWebDir, fileName);
            const content = fs.readFileSync(filePath, 'utf8');
            let match;
            while ((match = linkRegex.exec(content)) !== null) {
                const target = match[1];
                if (target.startsWith('http://') || target.startsWith('https://') || target.startsWith('mailto:') || target.startsWith('tel:') || target.startsWith('javascript:')) {
                    continue;
                }
                const cleanTarget = target.split('?')[0];
                if (!cleanTarget) continue;
                const resolved = path.resolve(siteWebDir, cleanTarget);
                if (!fs.existsSync(resolved)) {
                    brokenLinks.push({ from: fileName, link: target, resolved });
                }
            }
        }

        assert.deepStrictEqual(
            brokenLinks,
            [],
            `Liens internes brisés détectés: ${JSON.stringify(brokenLinks, null, 2)}`
        );
    });

    it('all local <img src="..."> tags must resolve to existing files or valid data URIs', () => {
        const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
        const brokenImages = [];

        for (const fileName of HTML_FILES) {
            const filePath = path.join(siteWebDir, fileName);
            const content = fs.readFileSync(filePath, 'utf8');
            let match;
            while ((match = imgRegex.exec(content)) !== null) {
                const src = match[1];
                if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:') || src.startsWith('blob:')) {
                    continue;
                }
                const cleanSrc = src.split('?')[0];
                const resolved = path.resolve(siteWebDir, cleanSrc);
                if (!fs.existsSync(resolved)) {
                    brokenImages.push({ from: fileName, src, resolved });
                }
            }
        }

        assert.deepStrictEqual(
            brokenImages,
            [],
            `Images locales introuvables détectées: ${JSON.stringify(brokenImages, null, 2)}`
        );
    });

    it('remorque.html CSP header must permit npmcdn.com for flatpickr fr locale', () => {
        const remorquePath = path.join(siteWebDir, 'remorque.html');
        const content = fs.readFileSync(remorquePath, 'utf8');
        const cspMatch = content.match(/<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]+content="([^"]*)"/i) ||
                         content.match(/<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]+content='([^']*)'/i);
        assert.ok(cspMatch, `Balise CSP introuvable dans remorque.html`);
        const cspContent = cspMatch[1];
        assert.ok(
            cspContent.includes('https://npmcdn.com'),
            `Directive CSP dans remorque.html doit autoriser https://npmcdn.com dans script-src`
        );
    });
});
