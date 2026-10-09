#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Codes ANSI pour un affichage clair dans la console
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const GRAY = '\x1b[90m';

const TIERS = [
    {
        tier: 1,
        id: 'tier1',
        name: 'Tier 1: Syntaxe JS & Intégrité HTML',
        file: 'tier1-syntax-html.test.mjs'
    },
    {
        tier: 2,
        id: 'tier2',
        name: 'Tier 2: Éléments DOM & Contrats Modales',
        file: 'tier2-dom-elements.test.mjs'
    },
    {
        tier: 3,
        id: 'tier3',
        name: 'Tier 3: Logique Métier & Calculs (DST/Caution/Scam/Cookies)',
        file: 'tier3-business-logic.test.mjs'
    },
    {
        tier: 4,
        id: 'tier4',
        name: 'Tier 4: Parcours MPA & Résilience Intégration',
        file: 'tier4-mpa-journeys.test.mjs'
    },
    {
        tier: 5,
        id: 'tier5',
        name: 'Tier 5: Vue Carte, Disponibilités & Contrats PDF',
        file: 'tier5-map-contracts.test.mjs'
    }
];

function parseArguments() {
    const args = process.argv.slice(2);
    let selectedTier = null;

    for (const arg of args) {
        if (arg.startsWith('--tier=')) {
            selectedTier = parseInt(arg.split('=')[1], 10);
        } else if (/^tier[1-5]$/i.test(arg)) {
            selectedTier = parseInt(arg.replace(/tier/i, ''), 10);
        } else if (arg === '-h' || arg === '--help') {
            console.log(`
${BOLD}Renger Automated Test Runner — Node.js 24 Native Test Suite${RESET}

Usage:
  node tests/run-tests.mjs [options]

Options:
  --tier=N         Exécuter uniquement le palier N (1, 2, 3, 4 ou 5)
  tier1..tier5     Raccourci pour exécuter un palier spécifique
  --help, -h       Afficher cette aide

Exemples:
  node tests/run-tests.mjs            # Exécute l'ensemble des 5 paliers
  node tests/run-tests.mjs --tier=1   # Exécute uniquement le Tier 1
  node tests/run-tests.mjs tier5      # Exécute uniquement le Tier 5
`);
            process.exit(0);
        }
    }

    return { selectedTier };
}

function parseTestOutput(stdout, stderr) {
    const combined = (stdout || '') + '\n' + (stderr || '');

    // Extraction des totaux node:test
    const testsMatch = combined.match(/(?:ℹ|#)\s+tests\s+(\d+)/);
    const passMatch = combined.match(/(?:ℹ|#)\s+pass\s+(\d+)/);
    const failMatch = combined.match(/(?:ℹ|#)\s+fail\s+(\d+)/);
    const durationMatch = combined.match(/(?:ℹ|#)\s+duration_ms\s+([\d.]+)/);

    const total = testsMatch ? parseInt(testsMatch[1], 10) : 0;
    const passed = passMatch ? parseInt(passMatch[1], 10) : 0;
    const failed = failMatch ? parseInt(failMatch[1], 10) : 0;
    const durationMs = durationMatch ? parseFloat(durationMatch[1]) : 0;

    // Extraction des échecs détaillés (dédoublonnés)
    const failureDetailsSet = new Set();
    const failureRegex = /✖ ([^\n]+)\s*\(([\d.]+ms)\)[\s\S]*?(?=✖|ℹ|$)/g;
    let match;
    while ((match = failureRegex.exec(combined)) !== null) {
        const testTitle = match[1].trim();
        if (!testTitle.startsWith('Tier')) {
            failureDetailsSet.add(testTitle);
        }
    }
    const failureDetails = Array.from(failureDetailsSet);

    return {
        total,
        passed,
        failed,
        durationMs,
        failureDetails
    };
}

function runTier(tierConfig) {
    const testFilePath = path.join(__dirname, tierConfig.file);
    const startTime = Date.now();

    console.log(`\n${CYAN}════════════════════════════════════════════════════════════════════════════${RESET}`);
    console.log(`${BOLD}${CYAN}▶ Exécution : ${tierConfig.name}${RESET}`);
    console.log(`${GRAY}  Fichier : tests/${tierConfig.file}${RESET}`);
    console.log(`${CYAN}────────────────────────────────────────────────────────────────────────────${RESET}`);

    const result = spawnSync(process.execPath, ['--test', testFilePath], {
        cwd: projectRoot,
        encoding: 'utf8',
        env: { ...process.env, FORCE_COLOR: '1' }
    });

    const elapsed = Date.now() - startTime;
    const output = (result.stdout || '') + (result.stderr || '');
    process.stdout.write(output);

    const parsed = parseTestOutput(result.stdout, result.stderr);
    if (parsed.durationMs === 0) parsed.durationMs = elapsed;

    const isSuccess = result.status === 0;

    return {
        ...tierConfig,
        exitCode: result.status,
        passed: parsed.passed,
        failed: parsed.failed,
        total: parsed.total,
        durationMs: parsed.durationMs,
        isSuccess,
        failureDetails: parsed.failureDetails
    };
}

function printSummaryReport(results) {
    console.log(`\n${BOLD}════════════════════════════════════════════════════════════════════════════${RESET}`);
    console.log(`${BOLD}           RAPPORT RÉCAPITULATIF DE LA SUITE DE TESTS RENGER               ${RESET}`);
    console.log(`${BOLD}════════════════════════════════════════════════════════════════════════════${RESET}\n`);

    console.log(`${BOLD}┌──────┬────────────────────────────────────────┬────────┬────────┬───────┬─────────┬──────────┐${RESET}`);
    console.log(`${BOLD}│ Tier │ Intitulé du Palier                     │ Succès │ Échecs │ Total │ Taux    │ Durée    │${RESET}`);
    console.log(`${BOLD}├──────┼────────────────────────────────────────┼────────┼────────┼───────┼─────────┼──────────┤${RESET}`);

    let grandPassed = 0;
    let grandFailed = 0;
    let grandTotal = 0;
    let grandDuration = 0;

    for (const r of results) {
        grandPassed += r.passed;
        grandFailed += r.failed;
        grandTotal += r.total;
        grandDuration += r.durationMs;

        const tierCol = `T${r.tier}`.padEnd(4);
        const nameCol = r.name.length > 38 ? r.name.substring(0, 35) + '...' : r.name.padEnd(38);
        const passCol = String(r.passed).padStart(6);
        const failCol = String(r.failed).padStart(6);
        const totalCol = String(r.total).padStart(5);
        const rate = r.total > 0 ? Math.round((r.passed / r.total) * 100) : 0;
        const rateCol = `${rate}%`.padStart(7);
        const durCol = `${r.durationMs.toFixed(0)} ms`.padStart(8);

        const statusColor = r.failed === 0 ? GREEN : RED;
        console.log(`│ ${CYAN}${tierCol}${RESET} │ ${nameCol} │ ${GREEN}${passCol}${RESET} │ ${r.failed > 0 ? RED : GRAY}${failCol}${RESET} │ ${totalCol} │ ${statusColor}${rateCol}${RESET} │ ${durCol} │`);
    }

    console.log(`${BOLD}├──────┼────────────────────────────────────────┼────────┼────────┼───────┼─────────┼──────────┤${RESET}`);
    const overallRate = grandTotal > 0 ? Math.round((grandPassed / grandTotal) * 100) : 0;
    const overallColor = grandFailed === 0 ? GREEN : RED;
    const totalLabel = results.length === TIERS.length ? `Ensemble des ${TIERS.length} paliers` : `${results.length} palier(s) sélectionné(s)`;
    console.log(`│ ${BOLD}TOTAL${RESET}│ ${totalLabel.padEnd(38)} │ ${GREEN}${String(grandPassed).padStart(6)}${RESET} │ ${grandFailed > 0 ? RED : GRAY}${String(grandFailed).padStart(6)}${RESET} │ ${String(grandTotal).padStart(5)} │ ${overallColor}${`${overallRate}%`.padStart(7)}${RESET} │ ${`${grandDuration.toFixed(0)} ms`.padStart(8)} │`);
    console.log(`${BOLD}└──────┴────────────────────────────────────────┴────────┴────────┴───────┴─────────┴──────────┘${RESET}\n`);

    // Diagnostic des échecs s'il y en a
    const failedTiers = results.filter(r => r.failed > 0);
    if (failedTiers.length > 0) {
        console.log(`${BOLD}${RED}ANOMALIES DÉTECTÉES EN ATTENTE DE RÉSOLUTION :${RESET}`);
        for (const ft of failedTiers) {
            console.log(`\n  ${BOLD}${YELLOW}[Tier ${ft.tier}] ${ft.name}${RESET}`);
            for (const fail of ft.failureDetails) {
                console.log(`    ${RED}✖${RESET} ${fail}`);
            }
        }
        console.log(`\n${YELLOW}ℹ Diagnostic : Ces échecs indiquent des anomalies dans les tests des paliers sélectionnés.${RESET}`);
    } else {
        console.log(`${BOLD}${GREEN}✔ FÉLICITATIONS : 100% des tests des paliers sélectionnés sont passés avec succès !${RESET}`);
    }

    console.log('');
}

function main() {
    const { selectedTier } = parseArguments();

    const tiersToRun = selectedTier
        ? TIERS.filter(t => t.tier === selectedTier)
        : TIERS;

    if (tiersToRun.length === 0) {
        console.error(`${RED}Erreur : Aucun palier correspondant à --tier=${selectedTier}${RESET}`);
        process.exit(1);
    }

    console.log(`\n${BOLD}${CYAN}Lancement du Test Runner Renger (Node.js 24 Native Engine)...${RESET}`);
    console.log(`${GRAY}Paliers sélectionnés : ${tiersToRun.map(t => 'T' + t.tier).join(', ')}${RESET}`);

    const results = [];
    for (const tierConfig of tiersToRun) {
        const tierResult = runTier(tierConfig);
        results.push(tierResult);
    }

    printSummaryReport(results);

    const hasAnyFailures = results.some(r => r.failed > 0 || r.exitCode !== 0);
    process.exitCode = hasAnyFailures ? 1 : 0;
}

main();
