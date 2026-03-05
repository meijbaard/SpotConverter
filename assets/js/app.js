// app.js
import { initializeData } from './api.js';
import { getState } from './state.js';
import { parseMessage } from './parser.js';
import { analyzeTrajectory } from './routing.js';
import * as UI from './ui.js';

let debounceTimeout = null;
let searchDebounceTimeout = null;

async function initApp() {
    UI.toggleLoader(true);
    try {
        await initializeData();
        
        // UI Initialiseren na succesvol laden
        UI.populateStationDropdowns();
        UI.populateHeatmapDayDropdown();
        UI.updateHeatmap();
        UI.renderPatronen();
        
        setupEventListeners();
        
        // Optioneel: direct de initiële staat laden
        processMessage();
        searchStations();
    } catch (error) {
        UI.showError(`Kon de data niet laden: ${error.message}.`);
    } finally {
        UI.toggleLoader(false);
    }
}

// Koppelt alle acties in de HTML aan de JavaScript-logica
function setupEventListeners() {
    const tabContainer = document.getElementById('tab-container');
    if (tabContainer) {
        tabContainer.addEventListener('click', function (e) {
            if (e.target.classList.contains('tab-btn')) {
                const tabId = e.target.getAttribute('data-tab');
                document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                document.querySelectorAll('main').forEach(tab => {
                    tab.id.endsWith(tabId) ? tab.classList.remove('hidden') : tab.classList.add('hidden');
                });
            }
        });
    }

    const messageInput = document.getElementById('whatsappMessage');
    if (messageInput) {
        messageInput.addEventListener('input', () => {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(processMessage, 350);
        });
    }

    const targetStationSelect = document.getElementById('targetStationSelect');
    if (targetStationSelect) {
        targetStationSelect.addEventListener('change', processMessage);
    }

    const stationSearchInput = document.getElementById('stationSearchInput');
    if (stationSearchInput) {
        stationSearchInput.addEventListener('input', () => {
            clearTimeout(searchDebounceTimeout);
            searchDebounceTimeout = setTimeout(searchStations, 300);
        });
    }

    const toggleDataBtn = document.getElementById('toggle-data-btn');
    if (toggleDataBtn) toggleDataBtn.addEventListener('click', UI.toggleParsedData);

    const heatmapStation = document.getElementById('heatmapstation');
    const heatmapDay = document.getElementById('heatmapday');
    if (heatmapStation) heatmapStation.addEventListener('change', UI.updateHeatmap);
    if (heatmapDay) heatmapDay.addEventListener('change', UI.updateHeatmap);
}

function processMessage() {
    const messageInput = document.getElementById('whatsappMessage')?.value;
    if (!messageInput || !messageInput.trim()) {
        const journeyOutput = document.getElementById('journey-output');
        if (journeyOutput) journeyOutput.innerHTML = '<p class="text-slate-500">Plak een spotbericht om het reisoverzicht te genereren.</p>';
        const parsedOutput = document.getElementById('parsed-data-output');
        if (parsedOutput) parsedOutput.textContent = '';
        return;
    }

    const parsedMessage = parseMessage(messageInput);
    const targetStationCode = document.getElementById('targetStationSelect')?.value;
    
    // Voer de berekening uit
    const analysis = analyzeTrajectory(parsedMessage, targetStationCode);
    
    // Stuur de data naar het scherm
    UI.displayResults(analysis, handleCopyJourney);
}

function searchStations() {
    const query = document.getElementById('stationSearchInput')?.value.toLowerCase().trim();
    const stations = getState().stations;
    if (!stations.length || !query) {
        UI.renderSearchResults([]);
        return;
    }

    const results = stations.filter(t => {
        const code = t.code || "";
        const name = t.name_long || "";
        return code.toLowerCase().includes(query) || name.toLowerCase().includes(query);
    });
    
    UI.renderSearchResults(results);
}

function handleCopyJourney(analysis) {
    const { journey, parsedMessage } = analysis;
    if (!journey || journey.length === 0) return;

    const targetStationCode = document.getElementById('targetStationSelect')?.value;
    const targetStation = journey.find(s => s.code === targetStationCode);
    
    const first = journey[0];
    const last = journey[journey.length - 1];
    
    let targetStationText = '';
    if (targetStation && targetStation.code !== first.code && targetStation.code !== last.code) {
        targetStationText = ` | Doorkomst ${targetStation.name}: ~${targetStation.time}`;
    }

    const info = [ parsedMessage.carrier, parsedMessage.locomotive, parsedMessage.cargo ].filter(Boolean).join(' ');
    const textToCopy = `${info} | Gespot: ${first.name} (${first.time})${targetStationText} | Verwacht in ${last.name}: ~${last.time}`;

    navigator.clipboard.writeText(textToCopy).then(() => {
        const btn = document.getElementById('copy-btn');
        if (btn) {
            btn.textContent = 'Gekopieerd!';
            setTimeout(() => { btn.textContent = 'Kopieer Info'; }, 2000);
        }
    });
}

// Initieer de applicatie zodra de pagina is geladen
document.addEventListener('DOMContentLoaded', initApp);