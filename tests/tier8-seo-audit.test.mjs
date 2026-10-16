import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const siteWebDir = path.join(projectRoot, 'Site web');

describe('Tier 8: Audit SEO, Sitemaps & Données Structurées Renger', () => {

    describe('1. Sitemap XML Validation (Root & Site web/)', () => {
        const rootSitemapPath = path.join(projectRoot, 'sitemap.xml');
        const siteWebSitemapPath = path.join(siteWebDir, 'sitemap.xml');

        it('sitemap.xml doit exister à la racine du projet et dans Site web/', () => {
            assert.ok(fs.existsSync(rootSitemapPath), `sitemap.xml racine introuvable: ${rootSitemapPath}`);
            assert.ok(fs.existsSync(siteWebSitemapPath), `sitemap.xml dans Site web/ introuvable: ${siteWebSitemapPath}`);
        });

        const expectedUrls = [
            'https://renger.ch/',
            'https://renger.ch/index.html',
            'https://renger.ch/remorques.html',
            'https://renger.ch/louer-ma-remorque.html',
            'https://renger.ch/pro.html',
            'https://renger.ch/location-remorque-vaud.html',
            'https://renger.ch/location-remorque-geneve.html',
            'https://renger.ch/location-remorque-valais.html',
            'https://renger.ch/faq.html',
            'https://renger.ch/cgu.html',
            'https://renger.ch/mentions-legales.html',
            'https://renger.ch/politique-confidentialite.html'
        ];

        for (const sitemapPath of [rootSitemapPath, siteWebSitemapPath]) {
            const relPath = path.relative(projectRoot, sitemapPath);

            it(`${relPath} doit respecter la syntaxe XML standard sitemap 0.9`, () => {
                const xml = fs.readFileSync(sitemapPath, 'utf8');
                assert.match(xml, /<\?xml\s+version=["']1\.0["']\s+encoding=["']UTF-8["']\?>/i);
                assert.match(xml, /<urlset\s+xmlns=["']http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9["']>/i);
                assert.match(xml, /<\/urlset>/i);
            });

            it(`${relPath} doit contenir l'ensemble des 11 URLs publiques indexables`, () => {
                const xml = fs.readFileSync(sitemapPath, 'utf8');
                for (const url of expectedUrls) {
                    assert.ok(
                        xml.includes(`<loc>${url}</loc>`),
                        `URL manquante dans ${relPath}: ${url}`
                    );
                }
            });

            it(`${relPath} ne doit contenir aucune URL privée (profil, inspection, stats, syni)`, () => {
                const xml = fs.readFileSync(sitemapPath, 'utf8');
                assert.strictEqual(xml.includes('profil.html'), false, 'profil.html ne doit pas être dans le sitemap');
                assert.strictEqual(xml.includes('inspection.html'), false, 'inspection.html ne doit pas être dans le sitemap');
                assert.strictEqual(xml.includes('stats.html'), false, 'stats.html ne doit pas être dans le sitemap');
                assert.strictEqual(xml.includes('syni.html'), false, 'syni.html ne doit pas être dans le sitemap');
            });

            it(`${relPath} doit définir lastmod, changefreq et priority valides pour chaque URL`, () => {
                const xml = fs.readFileSync(sitemapPath, 'utf8');
                const urlBlocks = xml.match(/<url>[\s\S]*?<\/url>/g) || [];
                assert.strictEqual(urlBlocks.length, expectedUrls.length);

                for (const block of urlBlocks) {
                    assert.match(block, /<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/, 'Format YYYY-MM-DD requis pour lastmod');
                    assert.match(block, /<changefreq>(always|hourly|daily|weekly|monthly|yearly|never)<\/changefreq>/);
                    assert.match(block, /<priority>(0\.\d+|1\.0)<\/priority>/);
                }
            });
        }
    });

    describe('2. Directives Robots.txt (Root & Site web/)', () => {
        const rootRobotsPath = path.join(projectRoot, 'robots.txt');
        const siteWebRobotsPath = path.join(siteWebDir, 'robots.txt');

        for (const robotsPath of [rootRobotsPath, siteWebRobotsPath]) {
            const relPath = path.relative(projectRoot, robotsPath);

            it(`${relPath} doit inclure la directive Sitemap vers https://renger.ch/sitemap.xml`, () => {
                assert.ok(fs.existsSync(robotsPath), `${relPath} introuvable`);
                const content = fs.readFileSync(robotsPath, 'utf8');
                assert.match(content, /Sitemap:\s+https:\/\/renger\.ch\/sitemap\.xml/i);
            });

            it(`${relPath} doit bloquer l'exploration des routes et dossiers privés`, () => {
                const content = fs.readFileSync(robotsPath, 'utf8');
                const disallowedRoutes = [
                    '/profil.html',
                    '/profil',
                    '/inspection.html',
                    '/inspection',
                    '/stats.html',
                    '/stats',
                    '/syni.html',
                    '/syni',
                    '/supabase/',
                    '/tests/'
                ];

                for (const route of disallowedRoutes) {
                    assert.ok(
                        content.includes(`Disallow: ${route}`),
                        `Route privée non bloquée dans ${relPath}: ${route}`
                    );
                }
            });
        }
    });

    describe('3. Protection Zéro-Indexation des Espaces Privés (noindex, nofollow)', () => {
        const privateFiles = ['profil.html', 'inspection.html', 'stats.html', 'syni.html'];

        for (const fileName of privateFiles) {
            it(`${fileName} doit obligatoirement inclure <meta name="robots" content="noindex, nofollow">`, () => {
                const filePath = path.join(siteWebDir, fileName);
                assert.ok(fs.existsSync(filePath), `Fichier introuvable: ${filePath}`);
                const content = fs.readFileSync(filePath, 'utf8');

                assert.match(
                    content,
                    /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex[^"']*["']/i,
                    `${fileName} doit contenir noindex dans sa balise robots`
                );
                assert.match(
                    content,
                    /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*nofollow[^"']*["']/i,
                    `${fileName} doit contenir nofollow dans sa balise robots`
                );
                assert.doesNotMatch(
                    content,
                    /<meta[^>]+name=["']robots["'][^>]+content=["']index,\s*follow["']/i,
                    `${fileName} ne doit PAS contenir index, follow`
                );
            });
        }
    });

    describe('4. Google Search Console Setup & Verification', () => {
        it('index.html doit comporter la balise de vérification google-site-verification', () => {
            const indexPath = path.join(siteWebDir, 'index.html');
            const content = fs.readFileSync(indexPath, 'utf8');
            assert.match(
                content,
                /<meta[^>]+name=["']google-site-verification["'][^>]+content=["'][^"']+["']/i,
                'Balise google-site-verification requise dans index.html'
            );
        });

        it('google-site-verification-template.html doit exister dans Site web/', () => {
            const templatePath = path.join(siteWebDir, 'google-site-verification-template.html');
            assert.ok(fs.existsSync(templatePath), 'Template de validation HTML Google manquant');
            const content = fs.readFileSync(templatePath, 'utf8');
            assert.ok(content.includes('google-site-verification'), 'Contenu de validation manquant');
        });

        it('GOOGLE_SEARCH_CONSOLE_GUIDE.md doit documenter les étapes d\'indexation et soumission', () => {
            const guidePath = path.join(projectRoot, 'GOOGLE_SEARCH_CONSOLE_GUIDE.md');
            assert.ok(fs.existsSync(guidePath), 'Guide Google Search Console manquant');
            const guide = fs.readFileSync(guidePath, 'utf8');
            assert.ok(guide.includes('Google Search Console'), 'Titre GSC manquant');
            assert.ok(guide.includes('sitemap.xml'), 'Mention de soumission sitemap.xml requise');
            assert.ok(guide.includes('renger.ch'), 'Nom de domaine renger.ch requis');
        });
    });

    describe('5. Qualité des Métadonnées On-Page (Titres, Descriptions & OpenGraph)', () => {
        const publicPages = [
            'index.html',
            'remorques.html',
            'remorque.html',
            'louer-ma-remorque.html',
            'pro.html',
            'cgu.html',
            'mentions-legales.html',
            'politique-confidentialite.html',
            'faq.html',
            'location-remorque-vaud.html',
            'location-remorque-geneve.html',
            'location-remorque-valais.html'
        ];

        for (const fileName of publicPages) {
            describe(`Page: ${fileName}`, () => {
                const filePath = path.join(siteWebDir, fileName);
                let content = '';

                it(`doit avoir un titre <title> optimisé (entre 40 et 70 caractères)`, () => {
                    content = fs.readFileSync(filePath, 'utf8');
                    const match = content.match(/<title>([^<]+)<\/title>/i);
                    assert.ok(match, `<title> manquant dans ${fileName}`);
                    const titleText = match[1].trim();
                    assert.ok(
                        titleText.length >= 40 && titleText.length <= 70,
                        `Longueur de titre inadaptée dans ${fileName} (${titleText.length} car.) : "${titleText}"`
                    );
                });

                it(`doit avoir une meta description optimisée (entre 120 et 175 caractères)`, () => {
                    content = fs.readFileSync(filePath, 'utf8');
                    const match = content.match(/<meta[^>]+name=["']description["'][^>]+content="([^"]+)"/i) ||
                                  content.match(/<meta[^>]+name=["']description["'][^>]+content='([^']+)'/i);
                    assert.ok(match, `Meta description manquante dans ${fileName}`);
                    const descText = match[1].trim();
                    assert.ok(
                        descText.length >= 120 && descText.length <= 175,
                        `Longueur de description inadaptée dans ${fileName} (${descText.length} car.) : "${descText}"`
                    );
                });

                it(`doit avoir un lien canonical pointant vers https://renger.ch/${fileName === 'index.html' ? 'index.html' : fileName}`, () => {
                    content = fs.readFileSync(filePath, 'utf8');
                    const expectedCanonical = `https://renger.ch/${fileName}`;
                    assert.ok(
                        content.includes(`href="${expectedCanonical}"`) || content.includes(`href='${expectedCanonical}'`),
                        `Balise canonical incorrecte dans ${fileName}`
                    );
                });

                it(`doit comporter les balises Open Graph complètes avec image PNG/JPG existant sur disque (>= 200x200)`, () => {
                    content = fs.readFileSync(filePath, 'utf8');
                    assert.match(content, /<meta[^>]+property=["']og:title["']/i);
                    assert.match(content, /<meta[^>]+property=["']og:description["']/i);
                    assert.match(content, /<meta[^>]+property=["']og:type["']/i);
                    assert.match(content, /<meta[^>]+property=["']og:url["']/i);
                    const imgMatch = content.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+\.(png|jpg|jpeg))["']/i);
                    assert.ok(imgMatch, `og:image doit être au format PNG ou JPG dans ${fileName}`);
                    const imgUrl = imgMatch[1];
                    const imgFileName = path.basename(imgUrl);
                    const localImgPath = path.join(siteWebDir, imgFileName);
                    assert.ok(fs.existsSync(localImgPath), `L'image og:image '${imgFileName}' doit exister dans Site web/ (${localImgPath})`);

                    const buf = fs.readFileSync(localImgPath);
                    let width = 0, height = 0;
                    if (imgFileName.endsWith('.png')) {
                        width = buf.readUInt32BE(16);
                        height = buf.readUInt32BE(20);
                    } else if (imgFileName.endsWith('.jpg') || imgFileName.endsWith('.jpeg')) {
                        for (let i = 0; i < buf.length - 8; i++) {
                            if (buf[i] === 0xFF && (buf[i+1] === 0xC0 || buf[i+1] === 0xC2)) {
                                height = buf.readUInt16BE(i + 5);
                                width = buf.readUInt16BE(i + 7);
                                break;
                            }
                        }
                    }
                    assert.ok(width >= 200 && height >= 200, `L'image og:image '${imgFileName}' doit mesurer au moins 200x200 pour Facebook/WhatsApp/Twitter (actuel: ${width}x${height})`);
                });

                it(`doit comporter les balises Twitter Cards`, () => {
                    content = fs.readFileSync(filePath, 'utf8');
                    assert.match(content, /<meta[^>]+name=["']twitter:card["']/i);
                    assert.match(content, /<meta[^>]+name=["']twitter:title["']/i);
                    assert.match(content, /<meta[^>]+name=["']twitter:image["']/i);
                });
            });
        }
    });

    describe('6. Validation des Données Structurées Schema.org JSON-LD', () => {
        const pagesWithJsonLd = [
            'index.html',
            'remorques.html',
            'remorque.html',
            'louer-ma-remorque.html',
            'pro.html',
            'cgu.html',
            'mentions-legales.html',
            'politique-confidentialite.html',
            'faq.html',
            'location-remorque-vaud.html',
            'location-remorque-geneve.html',
            'location-remorque-valais.html'
        ];

        for (const fileName of pagesWithJsonLd) {
            it(`${fileName} doit contenir des blocs JSON-LD 100% valides (JSON.parse)`, () => {
                const filePath = path.join(siteWebDir, fileName);
                const content = fs.readFileSync(filePath, 'utf8');
                const scriptMatches = content.match(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi) || [];

                assert.ok(scriptMatches.length > 0, `Aucun bloc JSON-LD trouvé dans ${fileName}`);

                for (const match of scriptMatches) {
                    const rawJson = match.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '').trim();
                    let parsed;
                    assert.doesNotThrow(() => {
                        parsed = JSON.parse(rawJson);
                    }, `Syntaxe JSON invalide dans ${fileName}`);
                    assert.ok(parsed['@context'] === 'https://schema.org' || (parsed['@graph'] && parsed['@context'] === 'https://schema.org'));
                }
            });
        }

        it('index.html JSON-LD doit déclarer AutoRental & LocalBusiness en CHF avec zones de Suisse romande', () => {
            const indexPath = path.join(siteWebDir, 'index.html');
            const content = fs.readFileSync(indexPath, 'utf8');
            const match = content.match(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/i);
            assert.ok(match);

            const json = JSON.parse(match[1]);
            const graph = json['@graph'] || [json];
            const autoRental = graph.find(item => item['@type'] && (item['@type'].includes('AutoRental') || item['@type'] === 'AutoRental'));
            assert.ok(autoRental, 'Entité AutoRental requise');
            assert.strictEqual(autoRental.currenciesAccepted, 'CHF');
            assert.ok(autoRental.areaServed.length >= 4, 'Au moins 4 cantons romands desservis');
        });

        it('index.html JSON-LD doit déclarer une FAQPage avec les 4 questions de l\'accordéon', () => {
            const indexPath = path.join(siteWebDir, 'index.html');
            const content = fs.readFileSync(indexPath, 'utf8');
            const match = content.match(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/i);
            const json = JSON.parse(match[1]);
            const graph = json['@graph'] || [json];
            const faq = graph.find(item => item['@type'] === 'FAQPage');

            assert.ok(faq, 'Entité FAQPage requise');
            assert.strictEqual(faq.mainEntity.length, 4, 'Les 4 questions FAQ doivent être modélisées');
            const questions = faq.mainEntity.map(q => q.name);
            assert.ok(questions.some(q => q.includes('caution')));
            assert.ok(questions.some(q => q.includes('Permis B ou BE')));
            assert.ok(questions.some(q => q.includes('état des lieux')));
            assert.ok(questions.some(q => q.includes('Renger PRO')));
        });

        it('remorques.html JSON-LD doit déclarer ItemList et AggregateOffer en CHF', () => {
            const remorquesPath = path.join(siteWebDir, 'remorques.html');
            const content = fs.readFileSync(remorquesPath, 'utf8');
            const match = content.match(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/i);
            assert.ok(match, 'Bloc JSON-LD requis dans remorques.html');

            const json = JSON.parse(match[1]);
            const graph = json['@graph'] || [json];
            const itemList = graph.find(item => item['@type'] === 'ItemList');
            assert.ok(itemList, 'Entité ItemList requise dans remorques.html');

            const aggregateOfferItem = graph.find(item => (item.offers && item.offers['@type'] === 'AggregateOffer') || item['@type'] === 'AggregateOffer');
            assert.ok(aggregateOfferItem, 'AggregateOffer requis dans remorques.html');
            const offer = aggregateOfferItem.offers || aggregateOfferItem;
            assert.strictEqual(offer.priceCurrency, 'CHF');
            assert.ok(offer.lowPrice, 'lowPrice requis');
            assert.ok(offer.highPrice, 'highPrice requis');
        });
    });

    describe('7. Hubs Locaux SEO Suisse Romande & Intégration js/components.js', () => {
        const hubs = [
            { file: 'location-remorque-vaud.html', canton: 'Vaud', kw: ['Lausanne', 'SAN Vaud', 'Permis B'] },
            { file: 'location-remorque-geneve.html', canton: 'Genève', kw: ['Carouge', 'OCV Genève', 'douane'] },
            { file: 'location-remorque-valais.html', canton: 'Valais', kw: ['Sion', 'SCN Valais', 'montagne'] }
        ];

        for (const hub of hubs) {
            it(`${hub.file} doit exister et contenir les spécificités du Canton de ${hub.canton}`, () => {
                const filePath = path.join(siteWebDir, hub.file);
                assert.ok(fs.existsSync(filePath), `${hub.file} doit exister`);
                const content = fs.readFileSync(filePath, 'utf8');

                for (const kw of hub.kw) {
                    assert.ok(
                        content.toLowerCase().includes(kw.toLowerCase()),
                        `Mot-clé "${kw}" manquant dans ${hub.file}`
                    );
                }
                assert.ok(!content.includes('30 CHF'), `Tarif 30 CHF doit être retiré de ${hub.file}`);
                assert.ok(content.includes('remorques.html'), `Lien vers catalogue requis dans ${hub.file}`);
                assert.ok(content.includes('mentions-legales.html'), `Lien mentions légales requis dans ${hub.file}`);
            });
        }

        it('Site web/js/components.js doit exporter RENGER_SEO_HUBS et injectSeoFooterLinks', async () => {
            const componentsModule = await import('../Site web/js/components.js');
            assert.ok(Array.isArray(componentsModule.RENGER_SEO_HUBS), 'RENGER_SEO_HUBS doit être un tableau');
            assert.strictEqual(componentsModule.RENGER_SEO_HUBS.length, 3, '3 hubs SEO configurés');
            assert.strictEqual(typeof componentsModule.injectSeoFooterLinks, 'function', 'injectSeoFooterLinks doit être une fonction');
        });

        it('Toutes les pages publiques doivent avoir les liens vers les hubs régionaux retirés de leur vue publique', () => {
            const publicPages = [
                'index.html',
                'remorques.html',
                'remorque.html',
                'louer-ma-remorque.html',
                'pro.html',
                'cgu.html',
                'mentions-legales.html',
                'politique-confidentialite.html'
            ];

            for (const fileName of publicPages) {
                const filePath = path.join(siteWebDir, fileName);
                const content = fs.readFileSync(filePath, 'utf8');
                assert.ok(
                    !content.includes('location-remorque-vaud.html'),
                    `${fileName} ne doit pas contenir de lien public vers location-remorque-vaud.html`
                );
                assert.ok(
                    !content.includes('location-remorque-geneve.html'),
                    `${fileName} ne doit pas contenir de lien public vers location-remorque-geneve.html`
                );
                assert.ok(
                    !content.includes('location-remorque-valais.html'),
                    `${fileName} ne doit pas contenir de lien public vers location-remorque-valais.html`
                );
            }
        });
    });
});
