---
author_profile: false
permalink: /spotconverter/
show_navigation: false
layout: dashboard
title: SpotConverter
---

<html lang="nl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SpotConverter Pro</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    /* Stijlen voor een moderne en overzichtelijke gebruikersinterface */
    body {
      font-family: 'Inter', sans-serif;
      background-color: #f8fafc; /* bg-slate-50 */
      color: #334155; /* text-slate-700 */
    }
    :root {
      --accent-color: #06b6d4; /* cyan-500 */
    }
    .highlight-station {
      background-color: #cffafe; /* cyan-100 */
      color: #0e7490; /* cyan-800 */
      padding: 0.1rem 0.4rem;
      border-radius: 0.25rem;
      font-weight: 600;
    }
    .highlight-abbr {
      background-color: #f1f5f9; /* slate-100 */
      color: #475569; /* slate-600 */
      padding: 0.1rem 0.4rem;
      border-radius: 0.25rem;
      font-weight: 500;
      cursor: help;
      border-bottom: 2px dotted #94a3b8; /* slate-400 */
    }
    .highlight-estimation {
      background-color: var(--accent-color);
      color: white;
      padding: 0.2rem 0.5rem;
      border-radius: 0.375rem;
      font-weight: 700;
    }
    #loader-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(248, 250, 252, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      flex-direction: column;
      gap: 1rem;
      backdrop-filter: blur(4px);
    }
    .spinner {
      border: 5px solid #e2e8f0; /* slate-200 */
      border-top: 5px solid var(--accent-color);
      border-radius: 50%;
      width: 50px;
      height: 50px;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .tab-btn.active {
        border-color: #e2e8f0;
        border-bottom-color: white;
        color: var(--accent-color);
        font-weight: 700;
        transform: translateY(1px);
    }
    .pattern-block {
      background: #f0f9ff; /* sky-50 */
      border: 1px solid #bae6fd; /* sky-200 */
      border-radius: 0.7rem;
      padding: 1rem 1.25rem;
      margin-bottom: 1rem;
    }
    .pattern-name {
      font-size: 1.1rem;
      font-weight: 700;
      color: #0369a1; /* sky-700 */
    }
    .pattern-route {
      color: #0e7490; /* cyan-800 */
      font-weight: 500;
      margin-top: 0.2rem;
    }
    .pattern-notes {
      color: #475569; /* slate-600 */
      margin-top: 0.3rem;
      font-size: 0.97rem;
    }
    .wait-time-warning {
      background-color: #fef9c3; /* yellow-100 */
      color: #854d0e; /* yellow-800 */
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      border-left: 4px solid #facc15; /* yellow-400 */
      font-size: 0.95rem;
    }
    .heatmap-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 1rem;
    }
    .heatmap-table th,
    .heatmap-table td {
      padding: 0.45rem 0.7rem;
      text-align: center;
      border-bottom: 1px solid #e2e8f0; /* slate-200 */
    }
    .heatmap-table th {
        font-weight: 600;
        background-color: #f1f5f9; /* slate-100 */
    }
    .heatmap-cell[data-level='3'] { background: #06b6d4; color: white; font-weight: bold; }
    .heatmap-cell[data-level='2'] { background: #67e8f9; color: #155e75; }
    .heatmap-cell[data-level='1'] { background: #cffafe; color: #164e63; }
    .heatmap-cell[data-level='0'] { background: #f8fafc; color: #94a3b8; }
  </style>
</head>
<body class="py-8 md:py-12">
  <div id="loader-overlay">
    <div class="spinner"></div>
    <p class="text-lg font-semibold text-slate-600">Data laden vanaf GitHub...</p>
  </div>
  <div class="max-w-5xl mx-auto px-4 space-y-8 md:space-y-10">
    <header class="bg-white p-6 md:p-8 rounded-xl shadow-lg text-center">
      <div class="flex justify-center items-center mb-4">
        <svg width="60" height="60" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="var(--accent-color)">
          <path d="M 20 80 C 10 80 10 70 20 70 L 80 70 C 90 70 90 80 80 80 Z" fill="#475569" />
          <rect x="25" y="30" width="50" height="40" rx="5" fill="var(--accent-color)" />
          <rect x="35" y="20" width="30" height="10" rx="3" fill="#64748b" />
          <circle cx="37" cy="70" r="10" fill="white" stroke="#475569" stroke-width="4" />
          <circle cx="63" cy="70" r="10" fill="white" stroke="#475569" stroke-width="4" />
          <rect x="60" y="40" width="10" height="15" fill="white" rx="2" />
        </svg>
      </div>
      <h1 class="text-3xl md:text-4xl font-bold text-slate-800">SpotConverter Pro</h1>
      <p class="mt-3 text-base md:text-lg text-slate-600 max-w-2xl mx-auto">
        Analyseer WhatsApp-berichten van treinspotters. Plak een bericht en zie direct de volledige
        stationsnamen, jargon en een geschatte passage-tijd.
      </p>
    </header>

    <!-- Tabs -->
    <div id="tab-container" class="flex justify-center -mb-px">
      <button class="tab-btn px-6 py-3 rounded-t-lg font-semibold text-slate-600 bg-white border border-b-0 border-slate-200 active" data-tab="spot">Spot Analyse</button>
      <button class="tab-btn px-6 py-3 rounded-t-lg font-semibold text-slate-600 bg-white border border-b-0 border-slate-200" data-tab="zoeker">Station Zoeker</button>
      <button class="tab-btn px-6 py-3 rounded-t-lg font-semibold text-slate-600 bg-white border border-b-0 border-slate-200" data-tab="heatmap">Heatmap</button>
      <button class="tab-btn px-6 py-3 rounded-t-lg font-semibold text-slate-600 bg-white border border-b-0 border-slate-200" data-tab="patronen">Patronen</button>
    </div>

    <!-- Tab Content: Spot Analyse -->
    <main class="bg-white p-6 md:p-8 rounded-xl rounded-tl-none shadow-lg" id="tab-spot">
      <div class="grid md:grid-cols-2 gap-8">
        <div>
          <label for="whatsappMessage" class="block text-base font-semibold text-slate-700 mb-2">Plak je WhatsApp bericht hier:</label>
          <textarea id="whatsappMessage" class="form-input w-full h-36 border rounded-lg p-3 shadow-sm" placeholder="Bijv. 14:00 Hgl ri Amf" oninput="debounceProcessMessage()"></textarea>
        </div>
        <div>
          <label for="targetStationSelect" class="block text-base font-semibold text-slate-700 mb-2">Bereken passage voor:</label>
          <select id="targetStationSelect" class="form-input w-full border rounded-lg p-3 shadow-sm bg-white" onchange="processMessage()"></select>
        </div>
      </div>
      <div class="mt-8 space-y-6">
        <div>
          <h2 class="text-xl font-bold text-slate-800 mb-2">Verwerkt Bericht:</h2>
          <div id="output" class="p-4 bg-slate-50 rounded-lg min-h-[60px] border border-slate-200 leading-relaxed"></div>
        </div>
        <div>
          <div class="flex justify-between items-center mb-2">
            <h2 class="text-xl font-bold text-slate-800">Analyse:</h2>
            <button id="copy-analysis-btn" onclick="copyAnalysisToClipboard()" class="px-3 py-1 text-sm font-semibold text-cyan-700 bg-cyan-100 rounded-md hover:bg-cyan-200 transition disabled:opacity-50 disabled:cursor-not-allowed" disabled>Kopieer Analyse</button>
          </div>
          <div id="estimation-output" class="p-4 bg-cyan-50 border-l-4 border-cyan-400 rounded-r-lg min-h-[60px] space-y-2"></div>
        </div>
        <div>
          <h2 class="text-xl font-bold text-slate-800 mb-2">Patroonherkenning:</h2>
          <div id="pattern-output" class="p-4 bg-white border border-sky-200 rounded-lg"></div>
        </div>
        <div>
          <div class="flex justify-between items-center mb-2">
            <h2 class="text-xl font-bold text-slate-800">Geparsede Data (voor analyse)</h2>
            <button id="toggle-data-btn" onclick="toggleParsedData()" class="text-sm font-semibold text-slate-500 hover:text-slate-800 transition">(Toon)</button>
          </div>
          <pre id="parsed-data-output" class="p-4 bg-slate-800 text-white text-xs rounded-lg overflow-x-auto" style="display: none"></pre>
        </div>
      </div>
    </main>

    <!-- Tab Content: Station Zoeker -->
    <main class="bg-white p-6 md:p-8 rounded-xl rounded-tl-none shadow-lg hidden" id="tab-zoeker">
      <h2 class="text-2xl font-bold text-slate-800 mb-4">Zoek Station</h2>
      <div class="mb-6">
        <input type="text" id="stationSearchInput" class="form-input w-full max-w-lg mx-auto block border rounded-lg p-3 shadow-sm" placeholder="Zoek op afkorting of naam..." oninput="debounceSearch()">
      </div>
      <div id="noResultsMessage" class="hidden text-center py-10 text-slate-500">
        <p class="text-lg font-semibold">Geen stations gevonden</p>
        <p>Probeer een andere zoekterm.</p>
      </div>
      <div id="stationSearchResults" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <!-- Resultaten worden hier dynamisch ingevoegd -->
      </div>
    </main>

    <!-- Tab Content: Heatmap -->
    <main class="bg-white p-6 md:p-8 rounded-xl rounded-tl-none shadow-lg hidden" id="tab-heatmap">
      <div class="max-w-lg mx-auto">
        <div class="grid grid-cols-2 gap-4 mb-6">
            <div>
                <label for="heatmapstation" class="block text-base font-semibold text-slate-700 mb-2">Selecteer station:</label>
                <select id="heatmapstation" class="form-input w-full border rounded-lg p-3 shadow-sm bg-white"></select>
            </div>
            <div>
                <label for="heatmapday" class="block text-base font-semibold text-slate-700 mb-2">Selecteer dag:</label>
                <select id="heatmapday" class="form-input w-full border rounded-lg p-3 shadow-sm bg-white"></select>
            </div>
        </div>
        <div id="heatmap-output"></div>
      </div>
    </main>

    <!-- Tab Content: Patronen -->
    <main class="bg-white p-6 md:p-8 rounded-xl rounded-tl-none shadow-lg hidden" id="tab-patronen">
      <h2 class="text-2xl font-bold text-slate-800 mb-4">Terugkerende Treinpatronen</h2>
      <div id="patronen-output"></div>
    </main>

    <footer class="text-center text-sm text-slate-500 mt-12 space-y-1">
        <p>Versie 2.5.1</p>
        <p>Copyright &copy; 2025 Mark Eijbaard. MIT licentie.</p>
        <p><a href="https://github.com/meijbaard/SpotConverter/issues" target="_blank" class="text-cyan-600 hover:underline">Meld een probleem of wens</a></p>
    </footer>
  </div>
  <script>
    // --- Global Variables ---
    let stations = [],
      distanceMatrix = {},
      trajectories = {},
      pathData = {},
      parsedMessage = null,
      debounceTimeout = null,
      searchDebounceTimeout = null,
      heatmapData = {},
      trainPatterns = {};

    const spotterAbbr = {
        'A': 'Aankomst', 'V': 'Vertrek', 'D': 'Doorrijden',
        'LSP': 'Linkerspoor', 'LLSP': 'Linker-linkerspoor', 'MSP': 'Middenspoor',
        'RSP': 'Rechterspoor', 'RRSP': 'Rechter-rechterspoor',
        'NVR': 'Niet voor reizigers', 'LM': 'Leeg materieel', 'LLT': 'Losse loc trein',
        'SMS': 'Samenstelling', 'GE': 'Goederenemplacement', 
        'Badl': 'Beladen aan de loc',
        'Ladl': 'Leeg aan de loc'
    };
    const conflictingAbbrs = ['EN', 'DE', 'D', 'A', 'V', 'OP', 'ALS'];
    
    const carrierUrlMap = {
        'RFO': 'RFO', 'DBC': 'DBC', 'HSL': 'HSL', 'RTB': 'RTB',
        'RTBC': 'RTBC', 'LNS': 'Lineas', 'SR': 'SR', 'VR': 'VR',
        'TCS': 'TCS', 'PKP': 'PKP', 'MTR': 'Metrans',
        'FLP': 'FLP', 'RRF': 'Rail_Rush', 'RXP': 'RailExperts',
        'SBB': 'SBB', 'CDC': 'CDC', 'LTE': 'LTE'
    };

    // --- Helper function to get station data by code ---
    function getStationByCode(code) {
        if (!code) return null;
        return stations.find(s => s.code === code.toUpperCase());
    }

    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // --- Debounce Functions ---
    function debounceProcessMessage() {
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(processMessage, 350);
    }

    function debounceSearch() {
        clearTimeout(searchDebounceTimeout);
        searchDebounceTimeout = setTimeout(searchStations, 300);
    }

    // --- Data Loading Functions ---
    async function loadData() {
        const loader = document.getElementById('loader-overlay');
        loader.style.display = 'flex';
        try {
            await Promise.all([
                loadStations(),
                loadAfstanden(),
                loadHeatmap(),
                loadPatterns(),
                loadGoederenpaden(),
                loadTrajectories()
            ]);
            
            populateStationDropdowns();
            populateHeatmapDayDropdown();
            updateHeatmap();
            document.getElementById('patronen-output').innerHTML = renderPatronen();
            processMessage();
            searchStations(); // Initial search to show all stations
        } catch (error) {
            console.error("Error loading initial data:", error);
            document.getElementById('output').innerHTML = `<p class="text-red-600 font-bold">Kon de data van GitHub niet laden: ${error.message}. Probeer de pagina te vernieuwen.</p>`;
        } finally {
            loader.style.display = 'none';
        }
    }

    async function loadStations() {
      let res = await fetch('https://raw.githubusercontent.com/meijbaard/SpotConverter/main/stations.csv');
      if (!res.ok) throw new Error(`Failed to load stations.csv: ${res.statusText}`);
      let text = await res.text();
      let [header, ...rows] = text.trim().split('\n');
      
      let cols = header.split(',').map(h => h.trim().replace(/"/g, ''));
      
      stations = rows.map(row => {
          const values = row.split(',');
          let obj = {};
          cols.forEach((col, index) => {
              obj[col] = (values[index] || '').trim().replace(/"/g, '');
          });
          return obj;
      });

      // Sorteer stations met langere codes eerst voor nauwkeuriger parsen
      stations.sort((a, b) => (b.code?.length || 0) - (a.code?.length || 0));
    }

    async function loadAfstanden() {
      let res = await fetch('https://raw.githubusercontent.com/meijbaard/SpotConverter/main/afstanden.csv');
      if (!res.ok) throw new Error(`Failed to load afstanden.csv: ${res.statusText}`);
      let text = await res.text();
      let lines = text.trim().split('\n');
      let headers = lines[0].split(',').map(h => h.trim().toUpperCase());
      distanceMatrix = {};
      lines.slice(1).forEach(l => {
        let vals = l.split(',');
        let from = vals[0].trim().toUpperCase();
        distanceMatrix[from] = {};
        headers.slice(1).forEach((to, i) => {
          distanceMatrix[from][to.trim().toUpperCase()] = Number(vals[i + 1] || 0);
        });
      });
    }

    async function loadGoederenpaden() {
        let res = await fetch('https://raw.githubusercontent.com/meijbaard/SpotConverter/main/goederenpaden.csv');
        if (!res.ok) throw new Error(`Failed to load goederenpaden.csv: ${res.statusText}`);
        let text = await res.text();
        let lines = text.trim().split('\n');
        let headers = lines.shift().split(',').map(h => h.replace(/"/g, '').trim());
        const stationCodeIndex = headers.indexOf('stationscode');
        const directionIndex = headers.indexOf('rijrichting');
        const pathMinutesIndex = headers.indexOf('pad_minuten');
        pathData = {};
        lines.forEach(line => {
            const values = line.split(',').map(v => v.replace(/"/g, '').trim());
            const stationCode = values[stationCodeIndex];
            const direction = values[directionIndex];
            const pathMinutes = values[pathMinutesIndex].split(';').map(Number);
            
            if (!pathData[stationCode]) {
                pathData[stationCode] = {};
            }
            pathData[stationCode][direction] = pathMinutes;
        });
    }

    async function loadHeatmap() {
      let res = await fetch('https://raw.githubusercontent.com/meijbaard/SpotConverter/main/heatmap_treinpassages.json');
      if (!res.ok) throw new Error(`Failed to load heatmap_treinpassages.json: ${res.statusText}`);
      heatmapData = await res.json();
    }

    async function loadPatterns() {
      let res = await fetch('https://raw.githubusercontent.com/meijbaard/SpotConverter/main/treinpatronen.json');
      if (!res.ok) throw new Error(`Failed to load treinpatronen.json: ${res.statusText}`);
      trainPatterns = await res.json();
    }

    async function loadTrajectories() {
      let res = await fetch('https://raw.githubusercontent.com/meijbaard/SpotConverter/main/trajecten.json');
      if (!res.ok) throw new Error(`Failed to load trajecten.json: ${res.statusText}`);
      trajectories = await res.json();
    }

    // --- UI Population Functions ---
    function populateStationDropdowns() {
      const stationNames = [...new Set(stations.map(s => s.name_long))].sort((a,b) => a.localeCompare(b));
      
      const targetSelect = document.getElementById('targetStationSelect');
      targetSelect.innerHTML = '';
      
      stationNames.forEach(name => {
          const station = stations.find(s => s.name_long === name);
          if (station) {
              let o = document.createElement('option');
              o.value = station.code;
              o.textContent = station.name_long;
              targetSelect.appendChild(o);
          }
      });

      targetSelect.value = 'BRN'; 

      const heatmapSelect = document.getElementById('heatmapstation');
      heatmapSelect.innerHTML = '';
      Object.keys(heatmapData).sort((a,b) => (getStationByCode(a)?.name_long || a).localeCompare(getStationByCode(b)?.name_long || b)).forEach(code => {
        const naam = getStationByCode(code)?.name_long || code;
        const option = document.createElement('option');
        option.value = code;
        option.textContent = naam;
        heatmapSelect.appendChild(option);
      });
      if (Object.keys(heatmapData).includes('BRN')) heatmapSelect.value = 'BRN';
    }

    function populateHeatmapDayDropdown() {
        const daySelect = document.getElementById('heatmapday');
        const days = ["maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag", "zondag"];
        daySelect.innerHTML = '';
        days.forEach(day => {
            const option = document.createElement('option');
            option.value = day;
            option.textContent = day.charAt(0).toUpperCase() + day.slice(1);
            daySelect.appendChild(option);
        });
        const currentDayIndex = (new Date().getDay() + 6) % 7; // Monday is 0
        daySelect.value = days[currentDayIndex];
    }

    // --- Station Zoeker Logic ---
    function searchStations() {
        const searchTerm = document.getElementById('stationSearchInput').value.toLowerCase().trim();
        
        if (!stations.length) return;

        const results = stations.filter(s => {
            const code = s.code || '';
            const name = s.name_long || '';
            return code.toLowerCase().includes(searchTerm) || name.toLowerCase().includes(searchTerm);
        });

        renderSearchResults(results);
    }

    function renderSearchResults(results) {
        const resultsContainer = document.getElementById('stationSearchResults');
        const noResultsMessage = document.getElementById('noResultsMessage');

        if (results.length === 0) {
            resultsContainer.innerHTML = '';
            noResultsMessage.classList.remove('hidden');
            return;
        }
        
        noResultsMessage.classList.add('hidden');
        
        const html = results.map(station => `
            <div class="bg-white p-4 rounded-lg shadow-md border border-slate-200">
                <div class="flex justify-between items-start">
                    <h3 class="text-lg font-bold text-cyan-800">${station.name_long || 'Onbekend'}</h3>
                    <span class="text-sm font-semibold bg-cyan-100 text-cyan-800 px-2 py-1 rounded-full">${station.code || 'N/A'}</span>
                </div>
                <div class="mt-3 text-sm space-y-1 text-slate-600">
                    <p><strong>Korte naam:</strong> ${station.name_short || '-'}</p>
                    <p><strong>UIC:</strong> ${station.uic || '-'}</p>
                    <p><strong>Type:</strong> ${station.type || '-'}</p>
                    <p><strong>Land:</strong> ${station.country || '-'}</p>
                </div>
            </div>
        `).join('');

        resultsContainer.innerHTML = html;
    }


    // --- Main Processing Logic ---
    function processMessage() {
        const messageInput = document.getElementById('whatsappMessage').value;
        const targetSelect = document.getElementById('targetStationSelect');
        const targetStationCode = targetSelect.value;
        const targetStationName = targetSelect.options[targetSelect.selectedIndex].text;
        const copyBtn = document.getElementById('copy-analysis-btn');

        if (!messageInput.trim()) {
            document.getElementById('output').innerHTML = '';
            document.getElementById('estimation-output').innerHTML = '';
            document.getElementById('pattern-output').innerHTML = '';
            document.getElementById('parsed-data-output').textContent = '';
            copyBtn.disabled = true;
            return;
        }

        parsedMessage = parseMessage(messageInput);
        const analysis = analyzeTrajectory(parsedMessage, targetStationName, targetStationCode);
        const outputHtml = createHighlightedMessage(parsedMessage.originalMessage, parsedMessage.foundMatches);
        
        displayResults(outputHtml, analysis, parsedMessage);
        document.getElementById('pattern-output').innerHTML = showPatternInSpotTab(parsedMessage);
        copyBtn.disabled = !analysis.summaryText;
    }

    function parseMessage(message) {
        const parsed = {
            originalMessage: message,
            timestamp: null,
            route: [],
            routeCodes: [],
            foundMatches: [],
            spotLocation: null,
            carrier: null,
            locomotive: null,
            cargo: null
        };

        const timeMatch = message.match(/(\d{1,2}[:.]\d{2})/g);
        if (timeMatch) parsed.timestamp = timeMatch[0].replace('.', ':');
        
        const carriers = ['RFO', 'DBC', 'HSL', 'RTB', 'RTBC', 'LNS', 'SR', 'VR', 'TCS', 'PKP', 'MTR', 'FLP', 'RRF', 'RXP', 'SBB', 'CDC', 'LTE', 'DPB', 'MEDWAY', 'NSI', 'RADVE', 'EUR', 'Lotos', 'Captrain'];
        const carrierRegex = new RegExp(`\\b(${carriers.join('|')})\\b`, 'gi');
        const carrierMatch = message.match(carrierRegex);
        if (carrierMatch) {
            parsed.carrier = carrierMatch[0].toUpperCase();
        }

        const messageWithoutTime = message.replace(/(\d{1,2}[:.]\d{2})/g, '');
        const locoRegex = /\b(\d{2,3}[\s-]?\d{3}|\b[1-9]\d{3}\b|\b[Gg]\d{4}|\b[Vv]\d{3,4}|\bPB\d{2})\b/g;
        const locoMatch = messageWithoutTime.match(locoRegex);
        if (locoMatch) {
            parsed.locomotive = locoMatch[0];
        }

        const cargoMap = {
            'ketel': 'Keteltrein', 'staal': 'Staaltrein', 'container': 'Containertrein',
            'auto': 'Autotrein', 'pon': 'Pon Autotrein', 'blg': 'BLG Autotrein',
            'graan': 'Graantrein', 'hout': 'Houttrein', 'rongen': 'Rongenwagens',
            'kalk': 'Kalktrein', 'werk': 'Werktrein', 'katy': 'Katy Shuttle',
            'praag': 'Praag Shuttle', 'rzepin': 'Rzepin Shuttle', 'nosta': 'Nosta Shuttle',
            'lovosice': 'Lovosice Shuttle', 'brwinow': 'Brwinów Shuttle', 'busto': 'Busto Shuttle'
        };

        for (const key in cargoMap) {
            const regex = new RegExp(`\\b${key}\\b`, 'i');
            if (regex.test(message)) {
                parsed.cargo = cargoMap[key];
                break; 
            }
        }
        
        stations.forEach(station => {
            if (!station.code || spotterAbbr.hasOwnProperty(station.code)) return;
            
            const isConflicting = conflictingAbbrs.includes(station.code.toUpperCase());
            const regexFlags = isConflicting ? 'g' : 'gi';
            const regex = new RegExp(`\\b(${escapeRegExp(station.code)})\\b(?!-)`, regexFlags);
            
            let match;
            while ((match = regex.exec(message)) !== null) {
                if (!parsed.foundMatches.some(m => m.index === match.index)) {
                    parsed.foundMatches.push({ station: station, index: match.index, text: match[1] });
                }
            }
        });
        parsed.foundMatches.sort((a, b) => a.index - b.index);

        if (parsed.foundMatches.length === 0) return parsed;

        parsed.spotLocation = getStationByCode(parsed.foundMatches[0].station.code);
        
        parsed.route = parsed.foundMatches.map(m => m.station.name_long);
        parsed.routeCodes = parsed.foundMatches.map(m => m.station.code);
        
        const directionRegex = /\s(?:ri|richting|naar|>)\s+([a-zA-Z]{2,5})\b/i;
        const directionMatch = message.match(directionRegex);
        if (directionMatch) {
            const destAbbr = directionMatch[1].toUpperCase();
            const destinationStation = getStationByCode(destAbbr);
            if (destinationStation && !parsed.routeCodes.includes(destinationStation.code)) {
                parsed.route.push(destinationStation.name_long);
                parsed.routeCodes.push(destinationStation.code);
            }
        }

        return parsed;
    }

    function analyzeTrajectory(parsedData, targetStationName, targetStationCode) {
        let passageHtml = "Geen route herkend in het bericht.";
        let timeHtml = "Geen station of tijdstip gevonden om een berekening te maken.";
        let trainInfoHtml = '';
        let linksHtml = '';
        let summaryText = '';

        if (parsedData.carrier || parsedData.locomotive || parsedData.cargo) {
            let infoParts = [];
            if (parsedData.carrier) infoParts.push(`Vervoerder: <strong>${parsedData.carrier}</strong>`);
            if (parsedData.locomotive) infoParts.push(`Tractie: <strong>${parsedData.locomotive}</strong>`);
            if (parsedData.cargo) infoParts.push(`Lading: <strong>${parsedData.cargo}</strong>`);
            trainInfoHtml = `<div>${infoParts.join(' | ')}</div>`;

            let linkParts = [];
            if (parsedData.carrier && carrierUrlMap[parsedData.carrier]) {
                linkParts.push(`<a href="https://treinposities.nl/materieel/${carrierUrlMap[parsedData.carrier]}" target="_blank" class="text-cyan-700 font-semibold hover:underline">Info Vervoerder</a>`);
            }
            if (parsedData.locomotive) {
                const cleanLoco = parsedData.locomotive.replace(/\s|-/g, '');
                linkParts.push(`<a href="https://treinposities.nl/?q=${cleanLoco}" target="_blank" class="text-cyan-700 font-semibold hover:underline">Zoek Locnummer</a>`);
            }
            if(linkParts.length > 0) {
                linksHtml = `<div class="mt-1 text-sm">${linkParts.join(' | ')}</div>`;
            }
        }

        const trajectoryAnalysis = findTrajectoryForRoute(parsedData.routeCodes);
        parsedData.trajectoryAnalysis = trajectoryAnalysis;
        
        if (trajectoryAnalysis && parsedData.routeCodes.length > 0) {
            const firstStation = parsedData.routeCodes[0];
            const lastStation = parsedData.routeCodes[parsedData.routeCodes.length - 1];
            const passesTarget = doesTrajectoryPassStation(trajectoryAnalysis, firstStation, lastStation, targetStationCode);
            
            let generalDirection = "Onbekend";
            let directionKey = "";
            if (trajectoryAnalysis.direction === 'forward' || (trajectoryAnalysis.name.includes('->') && trajectoryAnalysis.finalLegDirection === 'forward')) {
                generalDirection = trajectoryAnalysis.name.includes('Bentheimroute') ? 'Oostwaarts' : 'Westwaarts';
                directionKey = 'WEST';
            } else {
                generalDirection = trajectoryAnalysis.name.includes('Bentheimroute') ? 'Westwaarts' : 'Oostwaarts';
                directionKey = 'OOST';
            }
            passageHtml = `Rijrichting: 🚂 <strong>${generalDirection}</strong> | Passage ${targetStationName}: <strong>${passesTarget ? '✅ Ja' : '❌ Nee'}</strong>`;
            
            if (passesTarget) {
                if (parsedData.spotLocation && parsedData.timestamp && targetStationCode) {
                    const firstSpottedStationName = parsedData.spotLocation.name_long;
                    let arrivalTime;
                    let timeBlurb = "";

                    const distance = distanceMatrix[parsedData.spotLocation.code]?.[targetStationCode];
                    let roughArrivalDate;
                    if (distance !== undefined) {
                        const averageSpeedKmH = 80;
                        const travelMinutes = Math.round((distance / averageSpeedKmH) * 60);
                        const [hours, minutes] = parsedData.timestamp.split(':').map(Number);
                        roughArrivalDate = new Date();
                        roughArrivalDate.setHours(hours, minutes, 0, 0);
                        roughArrivalDate.setMinutes(roughArrivalDate.getMinutes() + travelMinutes);
                    }

                    if (!roughArrivalDate) {
                         timeHtml = `<p>Geen afstandsdata gevonden tussen <span class="font-bold">${firstSpottedStationName}</span> en <span class="font-bold">${targetStationName}</span>.</p>`;
                    } else {
                        const pathInfo = pathData[targetStationCode]?.[directionKey];

                        if (pathInfo && pathInfo.length === 2) {
                            timeBlurb = " (volgens goederenpad)";
                            let arrivalDate = new Date(roughArrivalDate.getTime());
                            const [minute1, minute2] = pathInfo.sort((a,b) => a-b);
                            const currentMinutes = arrivalDate.getMinutes();

                            if (currentMinutes <= minute1) arrivalDate.setMinutes(minute1);
                            else if (currentMinutes <= minute2) arrivalDate.setMinutes(minute2);
                            else {
                                arrivalDate.setHours(arrivalDate.getHours() + 1);
                                arrivalDate.setMinutes(minute1);
                            }
                            arrivalDate.setSeconds(0, 0);
                            arrivalTime = arrivalDate.toTimeString().substring(0, 5);
                        } else {
                            timeBlurb = " (ruwe schatting)";
                            arrivalTime = roughArrivalDate.toTimeString().substring(0, 5);
                        }
                        
                        timeHtml = `⏰ Geschatte doorkomsttijd in <span class="font-bold">${targetStationName}</span>${timeBlurb}: <strong class="highlight-estimation">${arrivalTime}</strong> <br> <span class="text-sm text-slate-500">(vanaf ${firstSpottedStationName})</span>`;

                        // Build summary for clipboard
                        let summaryParts = [];
                        if(parsedData.carrier) summaryParts.push(parsedData.carrier);
                        if(parsedData.locomotive) summaryParts.push(parsedData.locomotive);
                        if(parsedData.cargo) summaryParts.push(parsedData.cargo);
                        summaryParts.push(`| Gespot: ${firstSpottedStationName} (${parsedData.timestamp})`);
                        summaryParts.push(`| Verwacht in ${targetStationName}: ~${arrivalTime}`);
                        summaryText = summaryParts.join(' ');
                    }
                }
            } else {
                timeHtml = `<p>Tijdsberekening niet van toepassing.</p>`;
            }
        } else if (parsedData.route.length > 1) {
            passageHtml = "Kan geen bekend traject matchen met de gespotte route.";
        }
        
        return { passageHtml, timeHtml, trainInfoHtml, linksHtml, summaryText };
    }

    function findTrajectoryForRoute(routeCodes) {
        if (routeCodes.length < 1) return null;

        const findLCSLength = (arr, sub) => {
            let i = 0, j = 0;
            while (i < arr.length && j < sub.length) {
                if (arr[i] === sub[j]) j++;
                i++;
            }
            return j;
        };

        let bestMatch = { name: null, direction: null, score: 0 };

        for (const name in trajectories) {
            const traject = trajectories[name];
            const reversedTraject = [...traject].reverse();

            let forwardScore = findLCSLength(traject, routeCodes);
            if (forwardScore > bestMatch.score) {
                bestMatch = { name, direction: 'forward', score: forwardScore };
            }

            let backwardScore = findLCSLength(reversedTraject, routeCodes);
            if (backwardScore > bestMatch.score) {
                bestMatch = { name, direction: 'backward', score: backwardScore };
            }
        }

        if (bestMatch.score === routeCodes.length) {
            return { name: bestMatch.name, direction: bestMatch.direction };
        }

        if (routeCodes.length >= 2) {
            const startCode = routeCodes[0];
            const endCode = routeCodes[routeCodes.length - 1];
            const hub = "AMF";
            let startTrajectName = null;
            let endTrajectName = null;

            for (const name in trajectories) {
                if (!startTrajectName && trajectories[name].includes(startCode)) {
                    startTrajectName = name;
                }
                if (!endTrajectName && trajectories[name].includes(endCode)) {
                    endTrajectName = name;
                }
            }

            if (startTrajectName && endTrajectName && startTrajectName !== endTrajectName) {
                const startTraj = trajectories[startTrajectName];
                const endTraj = trajectories[endTrajectName];
                if (startTraj.includes(hub) && endTraj.includes(hub)) {
                    const validStartToHub = findLCSLength(startTraj, [startCode, hub]) === 2 || findLCSLength([...startTraj].reverse(), [startCode, hub]) === 2;
                    const validHubToEnd = findLCSLength(endTraj, [hub, endCode]) === 2 || findLCSLength([...endTraj].reverse(), [hub, endCode]) === 2;

                    if (validStartToHub && validHubToEnd) {
                        const finalLegDirection = findLCSLength(endTraj, [hub, endCode]) === 2 ? 'forward' : 'backward';
                        return {
                            name: `${startTrajectName} -> ${endTrajectName}`,
                            finalLegDirection: finalLegDirection
                        };
                    }
                }
            }
        }
        
        if (bestMatch.score > 0) {
            return { name: bestMatch.name, direction: bestMatch.direction };
        }

        return null;
    }

    function doesTrajectoryPassStation(trajectoryAnalysis, startCode, endCode, targetStationCode) {
        if (!trajectoryAnalysis || !targetStationCode) return false;

        const hub = "AMF";
        const trajectNames = trajectoryAnalysis.name.split(' -> ');

        const isBetween = (line, p1, p2, target) => {
            const idx1 = line.indexOf(p1);
            const idx2 = line.indexOf(p2);
            const idxTarget = line.indexOf(target);
            if (idx1 === -1 || idx2 === -1 || idxTarget === -1) return false;
            return (idxTarget >= Math.min(idx1, idx2) && idxTarget <= Math.max(idx1, idx2));
        };

        if (trajectNames.length === 1) {
            const line = trajectories[trajectNames[0]];
            const reversedLine = [...line].reverse();
            return isBetween(line, startCode, endCode, targetStationCode) || isBetween(reversedLine, startCode, endCode, targetStationCode);
        }

        if (trajectNames.length === 2) {
            const firstLegLine = trajectories[trajectNames[0]];
            const reversedFirstLeg = [...firstLegLine].reverse();
            if (isBetween(firstLegLine, startCode, hub, targetStationCode) || isBetween(reversedFirstLeg, startCode, hub, targetStationCode)) {
                return true;
            }
            
            const secondLegLine = trajectories[trajectNames[1]];
            const reversedSecondLeg = [...secondLegLine].reverse();
            if (isBetween(secondLegLine, hub, endCode, targetStationCode) || isBetween(reversedSecondLeg, hub, endCode, targetStationCode)) {
                return true;
            }
        }

        return false;
    }


    // --- Rendering and UI Functions ---
    function createHighlightedMessage(originalMessage, foundMatches) {
        let processedMessage = originalMessage;

        foundMatches.forEach(match => {
            processedMessage = processedMessage.replace(new RegExp(`\\b${escapeRegExp(match.text)}\\b(?![-<])`, 'g'), `<span class="highlight-station">${match.station.name_long}</span>`);
        });

        for (const abbr in spotterAbbr) {
            const regex = new RegExp(`\\b${escapeRegExp(abbr)}\\b(?![-<])`, 'gi');
            processedMessage = processedMessage.replace(regex, (foundText) => {
                return `<span class="highlight-abbr" title="${spotterAbbr[abbr]}">${foundText}</span>`;
            });
        }
        return processedMessage;
    }

    function displayResults(outputHtml, analysis, parsedData) {
        document.getElementById('output').innerHTML = outputHtml;
        document.getElementById('estimation-output').innerHTML = `
            ${analysis.trainInfoHtml || ''}
            ${analysis.linksHtml || ''}
            <div>${analysis.passageHtml}</div>
            <div>${analysis.timeHtml}</div>
        `;
        document.getElementById('parsed-data-output').textContent = JSON.stringify(parsedData, null, 2);
    }
    
    function toggleParsedData() {
      let pre = document.getElementById('parsed-data-output');
      let btn = document.getElementById('toggle-data-btn');
      const isHidden = pre.style.display === 'none';
      pre.style.display = isHidden ? 'block' : 'none';
      btn.textContent = isHidden ? '(Verberg)' : '(Toon)';
    }

    function copyAnalysisToClipboard() {
        const targetStationSelect = document.getElementById('targetStationSelect');
        const targetStationName = targetStationSelect.options[targetStationSelect.selectedIndex].text;
        const targetStationCode = targetStationSelect.value;

        if (!parsedMessage) return;

        const analysis = analyzeTrajectory(parsedMessage, targetStationName, targetStationCode);
        
        if (!analysis.summaryText) return;

        const tempTextArea = document.createElement('textarea');
        tempTextArea.style.position = 'fixed';
        tempTextArea.style.top = '-9999px';
        tempTextArea.style.left = '-9999px';
        
        tempTextArea.value = analysis.summaryText;
        document.body.appendChild(tempTextArea);
        
        tempTextArea.focus();
        tempTextArea.select();

        try {
            const successful = document.execCommand('copy');
            const copyBtn = document.getElementById('copy-analysis-btn');
            if (successful) {
                copyBtn.textContent = 'Gekopieerd!';
            } else {
                copyBtn.textContent = 'Kopiëren mislukt';
            }
            setTimeout(() => {
                copyBtn.textContent = 'Kopieer Analyse';
            }, 1500);
        } catch (err) {
            console.error('Fallback: Kopiëren is mislukt', err);
            const copyBtn = document.getElementById('copy-analysis-btn');
            copyBtn.textContent = 'Fout!';
             setTimeout(() => {
                copyBtn.textContent = 'Kopieer Analyse';
            }, 1500);
        }
        
        document.body.removeChild(tempTextArea);
    }

    function updateHeatmap() {
        const stationCode = document.getElementById('heatmapstation').value;
        const day = document.getElementById('heatmapday').value;
        document.getElementById('heatmap-output').innerHTML = renderHeatmap(stationCode, day);
    }

    function renderHeatmap(stationCode, day) {
        const stationDayData = heatmapData[stationCode]?.[day];
        if (!stationDayData) return '<em>Geen data voor dit station op deze dag.</em>';
        
        const allValues = Object.values(heatmapData[stationCode]).flatMap(dayData => Object.values(dayData));
        let max = Math.max(...allValues);
        if (max === 0) max = 1;

        let rows = Object.entries(stationDayData)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([uur, count]) => {
            let level = 0;
            if (count >= Math.max(1, max * 0.7)) level = 3;
            else if (count >= Math.max(1, max * 0.4)) level = 2;
            else if (count > 0) level = 1;
            return `<tr><th>${uur}:00</th><td class="heatmap-cell" data-level="${level}">${count}</td></tr>`;
            })
            .join('');
        return `<table class="heatmap-table"><tr><th>Uur</th><th>Passages</th></tr>${rows}</table>`;
    }

    function renderPatronen() {
      return Object.values(trainPatterns || {})
        .map(
          pattern => `<div class="pattern-block">
          <div class="pattern-name">${pattern.name}</div>
          <div class="mt-1">${pattern.description}</div>
          <div class="pattern-route">Route: ${pattern.commonRouteCodes.map(code => getStationByCode(code)?.name_long || code).join(' → ')}</div>
          ${pattern.avgPassTimes && Object.keys(pattern.avgPassTimes).length ? `<div class="mt-1">Gem. passages: ${Object.entries(pattern.avgPassTimes).map(([k, v]) => `${getStationByCode(k)?.name_long || k}: ${v}`).join(', ')}</div>` : ''}
          ${pattern.frequentDays && pattern.frequentDays.length ? `<div class="mt-1">Dagen: ${pattern.frequentDays.join(', ')} (Frequentie: ${pattern.frequency})</div>` : ''}
          <div class="pattern-notes mt-2">${pattern.notes || ''}</div>
        </div>`
        )
        .join('');
    }

    function showPatternInSpotTab(parsed) {
        if (!trainPatterns || !parsed || (!parsed.routeCodes.length && !parsed.cargo)) {
            return `<strong>Geen vast patroon herkend.</strong><br>Dit lijkt een losse of onbekende spot.`;
        }

        let bestMatch = null;
        let maxOverlap = 0;

        for (const patternKey in trainPatterns) {
            const pattern = trainPatterns[patternKey];
            const cargoMatch = parsed.cargo && pattern.name.toLowerCase().includes(parsed.cargo.toLowerCase().split(' ')[0]);
            const routeOverlap = pattern.commonRouteCodes.filter(code => parsed.routeCodes.includes(code)).length;
            
            let currentScore = 0;
            if (cargoMatch) currentScore += 5; // Strong weight for cargo match
            currentScore += routeOverlap;

            if (currentScore > maxOverlap) {
                maxOverlap = currentScore;
                bestMatch = pattern;
            }
        }

        if (bestMatch && maxOverlap > 1) { // Require a reasonable score to show a match
            let waitTimeHtml = '';
            if (bestMatch.avgWaitTimes && Object.keys(bestMatch.avgWaitTimes).length > 0) {
                const waitTimeInfo = Object.entries(bestMatch.avgWaitTimes)
                    .map(([stationCode, minutes]) => `${getStationByCode(stationCode)?.name_long || stationCode} (${minutes} min)`)
                    .join(', ');
                waitTimeHtml = `<div class="wait-time-warning mt-3">⚠️ Let op: Dit patroon heeft bekende wachttijden bij: ${waitTimeInfo}.</div>`;
            }

            return `<strong>Herkenning patroon:</strong>
            <div class="pattern-block mt-2">
              <div class="pattern-name">${bestMatch.name}</div>
              <div class="mt-1">${bestMatch.description}</div>
              <div class="pattern-route">Route: ${bestMatch.commonRouteCodes.map(code => getStationByCode(code)?.name_long || code).join(' → ')}</div>
              ${bestMatch.notes ? `<div class="pattern-notes mt-2">${bestMatch.notes}</div>` : ''}
            </div>
            ${waitTimeHtml}`;
        } else {
            return `<strong>Geen vast patroon herkend.</strong><br>Dit lijkt een losse of onbekende spot.`;
        }
    }

    // --- Event Listeners and Initialization ---
    document.addEventListener('DOMContentLoaded', function () {
      const tabContainer = document.getElementById('tab-container');
      tabContainer.addEventListener('click', function (e) {
          if (e.target.classList.contains('tab-btn')) {
              const tabId = e.target.getAttribute('data-tab');
              document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
              e.target.classList.add('active');
              document.querySelectorAll('main').forEach(tab => {
                  tab.id === 'tab-' + tabId ? tab.classList.remove('hidden') : tab.classList.add('hidden');
              });
          }
      });
      document.getElementById('heatmapstation').addEventListener('change', updateHeatmap);
      document.getElementById('heatmapday').addEventListener('change', updateHeatmap);
      loadData();
    });
  </script>
</body>
</html>
