// app.js
import { initializeData } from './api.js';
import { getState } from './state.js';
import { parseMessage } from './parser.js';
import { analyzeTrajectory } from './routing.js';
import * as UI from './ui.js';

const EXAMPLE_MESSAGE = '13:07 Bh ri Asd RFO 193 150 met keteltrein';

let debounceTimeout = null;
let searchDebounceTimeout = null;

async function initApp() {
    UI.toggleLoader(true);
    try {
        await initializeData();

        // UI initialiseren na succesvol laden
        UI.populateStationDropdowns();
        UI.populateHeatmapDayDropdown();
        UI.updateHeatmap();
        UI.renderPatronen();

        setupEventListeners();
        registerServiceWorker();

        // Lees ?q= URL-parameter in (voor iOS Shortcut-integratie).
        // Let op: URLSearchParams decodeert al, dus NIET nogmaals decoderen.
        const urlParams = new URLSearchParams(window.location.search);
        const sharedText = urlParams.get('q');
        if (sharedText) {
            const messageInput = document.getElementById('whatsappMessage');
            if (messageInput) messageInput.value = sharedText;
        }

        processMessage();
        searchStations();
    } catch (error) {
        UI.showError(`Kon de data niet laden: ${error.message}.`);
    } finally {
        UI.toggleLoader(false);
    }
}

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(err => {
            console.warn('Service worker registratie mislukt:', err);
        });

        // Na een release serveert de oude service worker nog één keer de oude
        // app-shell. Zodra de nieuwe SW het overneemt, laden we de pagina één
        // keer opnieuw zodat iedereen direct op de nieuwste versie zit.
        // Bij een allereerste bezoek (nog geen controller) herladen we niet.
        let hadController = !!navigator.serviceWorker.controller;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!hadController) { hadController = true; return; }
            window.location.reload();
        });
    }
}

// Koppelt alle acties in de HTML aan de JavaScript-logica
function setupEventListeners() {
    const tabContainer = document.getElementById('tab-container');
    if (tabContainer) {
        tabContainer.addEventListener('click', function (e) {
            const btn = e.target.closest('.tab-btn');
            if (!btn) return;
            const tabId = btn.getAttribute('data-tab');
            document.querySelectorAll('.tab-btn').forEach(b => {
                b.classList.toggle('active', b === btn);
                b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
            });
            document.querySelectorAll('.tab-panel').forEach(panel => {
                panel.classList.toggle('hidden', !panel.id.endsWith(tabId));
            });
        });
    }

    const messageInput = document.getElementById('whatsappMessage');
    if (messageInput) {
        messageInput.addEventListener('input', () => {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(processMessage, 350);
        });
    }

    // Plak-knop: één tik om het klembord in te lezen (grote tijdwinst op mobiel)
    const pasteBtn = document.getElementById('paste-btn');
    if (pasteBtn && messageInput) {
        pasteBtn.addEventListener('click', async () => {
            try {
                const text = await navigator.clipboard.readText();
                if (text) {
                    messageInput.value = text;
                    processMessage();
                }
            } catch (e) {
                // Geen toegang tot klembord (browserrestrictie): focus als fallback
                messageInput.focus();
                pasteBtn.textContent = 'Plak handmatig';
                setTimeout(() => { pasteBtn.textContent = '📋 Plak'; }, 2500);
            }
        });
    }

    // Voorbeeld-knop: laat nieuwe gebruikers direct zien wat de tool doet
    const exampleBtn = document.getElementById('example-btn');
    if (exampleBtn && messageInput) {
        exampleBtn.addEventListener('click', () => {
            messageInput.value = EXAMPLE_MESSAGE;
            processMessage();
        });
    }

    const targetStationSelect = document.getElementById('targetStationSelect');
    if (targetStationSelect) {
        targetStationSelect.addEventListener('change', () => {
            UI.saveTargetStation(targetStationSelect.value);
            processMessage();
        });
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
        if (journeyOutput) journeyOutput.innerHTML = '<p class="muted">Plak een spotbericht om het reisoverzicht te genereren.</p>';
        const parsedOutput = document.getElementById('parsed-data-output');
        if (parsedOutput) parsedOutput.textContent = '';
        return;
    }

    const parsedMessage = parseMessage(messageInput);
    const targetStationCode = document.getElementById('targetStationSelect')?.value || null;

    const analysis = analyzeTrajectory(parsedMessage, targetStationCode);
    UI.displayResults(analysis);
}

function searchStations() {
    const query = document.getElementById('stationSearchInput')?.value.toLowerCase().trim();
    const stations = getState().stations;
    if (!stations.length || !query) {
        UI.renderSearchResults([], false);
        return;
    }

    const results = stations.filter(t => {
        const code = t.code || "";
        const name = t.name_long || "";
        return code.toLowerCase().includes(query) || name.toLowerCase().includes(query);
    });

    UI.renderSearchResults(results, true);
}

// Initieer de applicatie zodra de pagina is geladen
document.addEventListener('DOMContentLoaded', initApp);
