document.addEventListener('DOMContentLoaded', () => {
    // -----------------------------------------------------
    // 1. GESTION DU THÈME SOMBRE
    // -----------------------------------------------------
    const themeToggle = document.getElementById('themeToggle');
    const htmlElement = document.documentElement;
    const sunIcon = document.getElementById('sunIcon');
    const moonIcon = document.getElementById('moonIcon');

    function applyTheme(isDark) {
        if (isDark) {
            htmlElement.classList.add('dark');
            sunIcon.classList.remove('hidden');
            moonIcon.classList.add('hidden');
        } else {
            htmlElement.classList.remove('dark');
            sunIcon.classList.add('hidden');
            moonIcon.classList.remove('hidden');
        }
        if (window.updateChartTheme) window.updateChartTheme(isDark);
    }

    const initialDark = localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    applyTheme(initialDark);

    themeToggle.addEventListener('click', () => {
        const isDark = !htmlElement.classList.contains('dark');
        localStorage.theme = isDark ? 'dark' : 'light';
        applyTheme(isDark);
    });

    // -----------------------------------------------------
    // 2. IMPORTATION ET PARSING DES DONNÉES
    // -----------------------------------------------------
    const pasteArea = document.getElementById('pasteArea');
    const fileInput = document.getElementById('fileInput');
    const importView = document.getElementById('importView');
    const dashboardView = document.getElementById('dashboardView');
    const resetBtn = document.getElementById('resetBtn');
    const errorMsg = document.getElementById('errorMsg');
    const headerSubtitle = document.getElementById('headerSubtitle');

    let chartEvoInstance = null;
    let chartDistInstance = null;
    let gridInstance = null;

    // Coller depuis Google Sheets
    pasteArea.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        if (val) {
            // Un copier-coller de Google Sheets est séparé par des tabulations (\t)
            processCSV(val, '\t');
        }
    });

    // Importer un fichier CSV
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(event) {
            // On laisse PapaParse deviner le séparateur (, ou ;)
            processCSV(event.target.result);
        };
        reader.readAsText(file);
    });

    // Revenir en arrière
    resetBtn.addEventListener('click', () => {
        dashboardView.classList.add('hidden');
        dashboardView.classList.remove('opacity-100');
        resetBtn.classList.add('hidden');
        importView.classList.remove('hidden');
        pasteArea.value = '';
        fileInput.value = '';
        errorMsg.classList.add('hidden');
        headerSubtitle.textContent = "Importez vos données pour commencer";
    });

    function processCSV(csvText, delimiter = "") {
        Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            delimiter: delimiter,
            complete: function(results) {
                if (results.data && results.data.length > 0 && Object.keys(results.data[0]).length > 1) {
                    errorMsg.classList.add('hidden');
                    buildDashboard(results.data);
                } else {
                    errorMsg.classList.remove('hidden');
                }
            },
            error: function() {
                errorMsg.classList.remove('hidden');
            }
        });
    }

    // -----------------------------------------------------
    // 3. LOGIQUE INTELLIGENTE DU DASHBOARD
    // -----------------------------------------------------
    function buildDashboard(data) {
        const columns = Object.keys(data[0]);
        const numericKeys = [];
        const categoricalKeys = [];

        // Analyse des colonnes pour deviner le type de données
        columns.forEach(col => {
            let numCount = 0;
            const sampleSize = Math.min(10, data.length);
            for (let i = 0; i < sampleSize; i++) {
                // Nettoyage de la chaîne (ex: "1 500,50 €" -> "1500.50")
                let valStr = (data[i][col] || '').toString();
                // Enlève les espaces, lettres, symboles monétaires, remplace virgule par point
                let cleanVal = valStr.replace(/\s/g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
                
                if (cleanVal !== '' && !isNaN(cleanVal)) {
                    numCount++;
                }
            }
            // Si la majorité des lignes testées ressemblent à des nombres, c'est numérique
            if (numCount > sampleSize / 2) {
                numericKeys.push(col);
            } else {
                categoricalKeys.push(col);
            }
        });

        // Choix des axes
        const xAxisKey = categoricalKeys.length > 0 ? categoricalKeys[0] : columns[0];
        const categoryKey = categoricalKeys.length > 1 ? categoricalKeys[1] : xAxisKey;

        // Conversion des données brutes en nombres pour les colonnes numériques
        const cleanData = data.map(row => {
            const cleanRow = { ...row };
            numericKeys.forEach(k => {
                let valStr = (row[k] || '').toString();
                let cleanVal = valStr.replace(/\s/g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
                cleanRow[k] = (cleanVal !== '' && !isNaN(cleanVal)) ? parseFloat(cleanVal) : 0;
            });
            return cleanRow;
        });

        // Transition UI
        importView.classList.add('hidden');
        dashboardView.classList.remove('hidden');
        // Petit délai pour l'animation d'opacité
        setTimeout(() => dashboardView.classList.add('opacity-100'), 50);
        
        resetBtn.classList.remove('hidden');
        headerSubtitle.textContent = `${cleanData.length} lignes analysées avec succès`;

        // Mise à jour des titres de section en fonction des colonnes détectées
        document.getElementById('evoTitle').textContent = `Évolution (par ${xAxisKey})`;
        document.getElementById('distTitle').textContent = `Répartition (par ${categoryKey})`;

        // Rendu des composants
        renderKPIs(cleanData, numericKeys);
        renderCharts(cleanData, xAxisKey, categoryKey, numericKeys);
        renderTable(cleanData, columns);
    }

    function renderKPIs(data, numericKeys) {
        const kpiContainer = document.getElementById('kpiContainer');
        kpiContainer.innerHTML = ''; 

        // KPI 1 : Comptage
        createKPICard(kpiContainer, "Nombre d'enregistrements", data.length);

        // KPI 2 & 3 : Sommes (si colonnes numériques trouvées)
        if (numericKeys.length > 0) {
            const sum1 = data.reduce((sum, row) => sum + (row[numericKeys[0]] || 0), 0);
            createKPICard(kpiContainer, `Total : ${numericKeys[0]}`, sum1);
        }
        if (numericKeys.length > 1) {
            const sum2 = data.reduce((sum, row) => sum + (row[numericKeys[1]] || 0), 0);
            createKPICard(kpiContainer, `Total : ${numericKeys[1]}`, sum2);
        }
    }

    function createKPICard(container, title, value) {
        // Formatage pour la lisibilité (ex: 15000.5 -> 15 000,50)
        let displayValue = value;
        if (typeof value === 'number') {
            displayValue = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(value);
        }
        
        const div = document.createElement('div');
        div.className = 'bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col';
        div.innerHTML = `
            <span class="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">${title}</span>
            <span class="text-3xl font-bold mt-2 text-gray-900 dark:text-white">${displayValue}</span>
        `;
        container.appendChild(div);
    }

    function renderCharts(data, xAxisKey, categoryKey, numericKeys) {
        const getIsDark = () => document.documentElement.classList.contains('dark');
        const chartForeColor = () => getIsDark() ? '#94a3b8' : '#64748b';
        const strokeColor = () => getIsDark() ? '#1e293b' : '#fff';

        // -------- GRAPHIQUE ÉVOLUTION (Axe X) --------
        const aggregatedEvo = {};
        data.forEach(row => {
            const xVal = row[xAxisKey] || 'N/A';
            if (!aggregatedEvo[xVal]) {
                aggregatedEvo[xVal] = {};
                numericKeys.forEach(k => aggregatedEvo[xVal][k] = 0);
            }
            numericKeys.forEach(k => aggregatedEvo[xVal][k] += (row[k] || 0));
        });

        const xCategories = Object.keys(aggregatedEvo);
        // On limite à 3 séries max pour la lisibilité
        const seriesEvo = numericKeys.slice(0, 3).map(key => ({
            name: key,
            data: xCategories.map(x => Number(aggregatedEvo[x][key].toFixed(2)))
        }));

        const optionsEvo = {
            series: seriesEvo.length > 0 ? seriesEvo : [{ name: 'Enregistrements', data: xCategories.map(() => 1) }],
            chart: { type: 'bar', height: 350, toolbar: { show: false }, foreColor: chartForeColor(), background: 'transparent' },
            plotOptions: { bar: { borderRadius: 4, columnWidth: '50%' } },
            dataLabels: { enabled: false },
            xaxis: { categories: xCategories, tooltip: { enabled: false } },
            theme: { mode: getIsDark() ? 'dark' : 'light' },
            colors: ['#3b82f6', '#10b981', '#f59e0b']
        };

        if (chartEvoInstance) chartEvoInstance.destroy();
        chartEvoInstance = new ApexCharts(document.querySelector("#chartEvolution"), optionsEvo);
        chartEvoInstance.render();

        // -------- GRAPHIQUE RÉPARTITION (Camembert) --------
        const aggregatedDist = {};
        const primaryNumKey = numericKeys.length > 0 ? numericKeys[0] : null;

        data.forEach(row => {
            const catVal = row[categoryKey] || 'N/A';
            if (!aggregatedDist[catVal]) aggregatedDist[catVal] = 0;
            // Si on a des nombres, on somme la première colonne, sinon on compte les occurrences
            aggregatedDist[catVal] += primaryNumKey ? (row[primaryNumKey] || 0) : 1;
        });

        // On trie et on garde les 10 plus gros pour ne pas casser le camembert
        const sortedDistEntries = Object.entries(aggregatedDist)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
            
        const optionsDist = {
            series: sortedDistEntries.map(e => Number(e[1].toFixed(2))),
            labels: sortedDistEntries.map(e => e[0]),
            chart: { type: 'donut', height: 350, foreColor: chartForeColor(), background: 'transparent' },
            theme: { mode: getIsDark() ? 'dark' : 'light' },
            stroke: { show: true, colors: [strokeColor()] },
            dataLabels: { enabled: true, formatter: function (val) { return val.toFixed(1) + "%" } },
            legend: { position: 'bottom' },
            tooltip: { y: { formatter: function(val) { return new Intl.NumberFormat('fr-FR').format(val) } } }
        };

        if (chartDistInstance) chartDistInstance.destroy();
        chartDistInstance = new ApexCharts(document.querySelector("#chartDistribution"), optionsDist);
        chartDistInstance.render();

        // Stocker en global pour la màj du thème
        window.updateChartTheme = function(isDark) {
            if (!chartEvoInstance || !chartDistInstance) return;
            const mode = isDark ? 'dark' : 'light';
            const foreColor = isDark ? '#94a3b8' : '#64748b';
            const stroke = isDark ? '#1e293b' : '#fff';
            
            chartEvoInstance.updateOptions({ theme: { mode }, chart: { foreColor } });
            chartDistInstance.updateOptions({ theme: { mode }, chart: { foreColor }, stroke: { colors: [stroke] } });
        };
    }

    function renderTable(data, columns) {
        const tableContainer = document.getElementById("dataTableContainer");
        tableContainer.innerHTML = ''; 

        if (gridInstance) {
            gridInstance = null; 
        }

        gridInstance = new gridjs.Grid({
            columns: columns,
            data: data.map(row => columns.map(col => row[col])),
            search: true,
            sort: true,
            pagination: { enabled: true, limit: 8 },
            resizable: true,
            style: {
                table: { width: '100%' }
            },
            language: {
                search: { placeholder: 'Rechercher...' },
                pagination: { previous: 'Précédent', next: 'Suivant', showing: 'Affichage', results: () => 'résultats' }
            }
        });
        
        gridInstance.render(tableContainer);
    }
});
