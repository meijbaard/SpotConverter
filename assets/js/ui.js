// ui.js
import { getState, getStationByCode } from './state.js';
import { buildGroupMessage } from './message.js';

const CARRIER_SLUGS = {
    'RFO':  'RFO',
    'DBC':  'DBC',
    'HSL':  'HSL',
    'RTBC': 'RTBC',
    'RTB':  'RTBC',
    'LNS':  'SRTLNS',
    'TCS':  'TCS',
    'PKP':  'PKPC',
    'MTR':  'MTR',
    'FLP':  'FLP',
    'RRF':  'RRF',
    'RXP':  'Railexperts',
    'SBB':  'SBBC',
    'CDC':  'CDC',
    'LTE':  'LTE',
    'SR':   'Shunter',
    'VR':   'VFR',
};

const TARGET_STORAGE_KEY = 'sc-target-station';

export function populateStationDropdowns() {
    const { stations, heatmapData } = getState();
    const uniqueNames = [...new Set(stations.map(e => e.name_long))].sort((a, b) => a.localeCompare(b));

    const targetSelect = document.getElementById("targetStationSelect");
    if (targetSelect) {
        targetSelect.innerHTML = "";
        const noneOption = document.createElement("option");
        noneOption.value = "";
        noneOption.textContent = "— Geen doelstation —";
        targetSelect.appendChild(noneOption);

        uniqueNames.forEach(name => {
            const station = stations.find(t => t.name_long === name);
            if (station) {
                let option = document.createElement("option");
                option.value = station.code;
                option.textContent = station.name_long;
                targetSelect.appendChild(option);
            }
        });

        // Onthouden keuze herstellen; anders standaard Baarn
        let saved = null;
        try { saved = localStorage.getItem(TARGET_STORAGE_KEY); } catch (e) { /* private mode */ }
        targetSelect.value = (saved !== null) ? saved : "BRN";
        if (targetSelect.selectedIndex === -1) targetSelect.value = "";
    }

    const heatmapSelect = document.getElementById("heatmapstation");
    if (heatmapSelect && heatmapData) {
        heatmapSelect.innerHTML = "";
        Object.keys(heatmapData).sort((a, b) => {
            const nameA = getStationByCode(a)?.name_long || a;
            const nameB = getStationByCode(b)?.name_long || b;
            return nameA.localeCompare(nameB);
        }).forEach(code => {
            const name = getStationByCode(code)?.name_long || code;
            const option = document.createElement("option");
            option.value = code;
            option.textContent = name;
            heatmapSelect.appendChild(option);
        });
        if (Object.keys(heatmapData).includes("BRN")) {
            heatmapSelect.value = "BRN";
        }
    }
}

export function saveTargetStation(code) {
    try { localStorage.setItem(TARGET_STORAGE_KEY, code ?? ""); } catch (e) { /* private mode */ }
}

export function populateHeatmapDayDropdown() {
    const e = document.getElementById("heatmapday");
    if (!e) return;
    const days = ["maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag", "zondag"];
    e.innerHTML = "";
    days.forEach(day => {
        const option = document.createElement("option");
        option.value = day;
        option.textContent = day.charAt(0).toUpperCase() + day.slice(1);
        e.appendChild(option);
    });
    const currentDayIndex = (new Date().getDay() + 6) % 7;
    e.value = days[currentDayIndex];
}

export function renderSearchResults(results, hasQuery) {
    const container = document.getElementById("stationSearchResults");
    if (!container) return;
    if (!hasQuery) {
        container.innerHTML = '<p class="muted">Typ een afkorting of naam om te zoeken.</p>';
        return;
    }
    if (results.length === 0) {
        container.innerHTML = '<p class="muted">Geen stations gevonden.</p>';
        return;
    }
    container.innerHTML = results.map(e => `
        <div class="station-card">
            <h3>${e.name_long || "Onbekend"}</h3>
            <span class="station-code">${e.code || "N/A"}</span>
        </div>`).join("");
}

export function toggleParsedData() {
    let block = document.getElementById("parsed-data-output");
    let btn = document.getElementById("toggle-data-btn");
    if (!block || !btn) return;
    const isHidden = block.style.display === "none" || block.style.display === "";
    block.style.display = isHidden ? "block" : "none";
    btn.textContent = isHidden ? "(Verberg)" : "(Toon)";
}

export function updateHeatmap() {
    const heatmapData = getState().heatmapData;
    const station = document.getElementById("heatmapstation")?.value;
    const day = document.getElementById("heatmapday")?.value;
    const output = document.getElementById("heatmap-output");

    if (!station || !day || !output) return;

    const dayData = heatmapData[station]?.[day];
    if (!dayData) {
        output.innerHTML = '<p class="muted"><em>Geen data voor dit station op deze dag.</em></p>';
        return;
    }

    const allValues = Object.values(heatmapData[station]).flatMap(d => Object.values(d));
    let maxVal = Math.max(...allValues, 1);

    const rows = Object.entries(dayData).sort(([h1], [h2]) => Number(h1) - Number(h2)).map(([hour, count]) => {
        let level = 0;
        if (count >= Math.max(1, 0.7 * maxVal)) level = 3;
        else if (count >= Math.max(1, 0.4 * maxVal)) level = 2;
        else if (count > 0) level = 1;
        return `<tr><th>${hour}:00</th><td class="heatmap-cell" data-level="${level}">${count}</td></tr>`;
    }).join("");

    output.innerHTML = `<table class="heatmap-table"><tr><th>Uur</th><th>Passages</th></tr>${rows}</table>`;
}

export function renderPatronen() {
    const container = document.getElementById("patronen-output");
    const trainPatterns = getState().trainPatterns;
    if (!container || !trainPatterns) return;

    container.innerHTML = Object.values(trainPatterns).map(p => `
        <div class="pattern-block">
            <div class="pattern-name">${p.name}</div>
            <div class="pattern-desc">${p.description}</div>
            <div class="pattern-route">Route: ${p.commonRouteCodes.map(c => getStationByCode(c)?.name_long || c).join(" → ")}</div>
        </div>`).join("");
}

function getTrainInfoImages(parsedMessage) {
    const db = getState().materieelDatabase;
    let images = [];
    const sortedTypes = Object.keys(db.types || {}).sort((a, b) => b.length - a.length);

    // Treinstel/museummaterieel (Plan V, Mat '54, ...) heeft eigen tekening en geen wagons
    if (parsedMessage.stock) {
        const stockImage = db.namen?.[parsedMessage.stock.toLowerCase()];
        if (stockImage) return [{ src: `assets/images/${stockImage}` }];
    }

    if (parsedMessage.locomotive) {
        const locoClean = parsedMessage.locomotive.replace(/[\s-]/g, '');
        let locoImageFile = db.exact?.[locoClean];

        if (locoImageFile) {
            images.push({ src: `assets/images/${locoImageFile}`});
        } else {
            for (const type of sortedTypes) {
                if (locoClean.startsWith(type)) {
                    locoImageFile = db.types[type];
                    images.push({ src: `assets/images/${locoImageFile}`});
                    break;
                }
            }
        }
    }
    if (images.length === 0 && db.default) {
         images.push({ src: `assets/images/${db.default}`});
    }

    if (parsedMessage.cargo && db.wagons?.[parsedMessage.cargo]) {
        for (let i = 0; i < 4; i++) {
            images.push({ src: `assets/images/${db.wagons[parsedMessage.cargo]}`});
        }
    }
    return images;
}

/** Bouwt en koppelt het WhatsApp-berichtblok onder de tijdlijn. */
function setupWhatsAppBlock(analysis) {
    const checkbox = document.getElementById('wa-include-eta');
    const msgEl = document.getElementById('wa-msg');
    const copyBtn = document.getElementById('wa-copy-btn');
    const shareBtn = document.getElementById('wa-share-btn');
    if (!msgEl) return;

    const regenerate = () => {
        const targetCode = document.getElementById('targetStationSelect')?.value || null;
        msgEl.textContent = buildGroupMessage(analysis, {
            includeEta: checkbox ? checkbox.checked : true,
            targetCode
        });
    };
    regenerate();

    if (checkbox) checkbox.addEventListener('change', regenerate);

    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(msgEl.textContent).then(() => {
                copyBtn.textContent = 'Gekopieerd!';
                setTimeout(() => { copyBtn.textContent = 'Kopieer bericht'; }, 2000);
            });
        });
    }

    if (shareBtn) {
        shareBtn.addEventListener('click', async () => {
            const text = msgEl.textContent;
            if (navigator.share) {
                try { await navigator.share({ text }); return; } catch (e) { /* geannuleerd */ }
            } else {
                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
            }
        });
    }
}

export function displayResults(analysis) {
    const rawDataBlock = document.getElementById('parsed-data-output');
    if (rawDataBlock) rawDataBlock.textContent = JSON.stringify(analysis, null, 2);

    const journeyOutput = document.getElementById('journey-output');
    if (!analysis.journey || analysis.journey.length === 0) {
        journeyOutput.innerHTML = '<p class="muted">Geen geldig traject gevonden. Controleer de stationsvolgorde in je bericht.</p>';
        return;
    }

    const images = getTrainInfoImages(analysis.parsedMessage);
    const imagesHtml = images.map(img => `<img src="${img.src}" alt="" onerror="this.style.display='none'" />`).join('');

    let cargoText = "goederentrein";
    if (analysis.parsedMessage.stock) {
        cargoText = "treinstel";
    } else if (analysis.parsedMessage.llt) {
        cargoText = "losse lok (llt)";
    } else if (analysis.parsedMessage.cargo) {
        cargoText = analysis.parsedMessage.cargo.charAt(0).toUpperCase() + analysis.parsedMessage.cargo.slice(1) + 'trein';
    }

    const carrier = analysis.parsedMessage.carrier;
    const locomotive = analysis.parsedMessage.locomotive;

    const carrierSlug = carrier ? CARRIER_SLUGS[carrier] : null;
    const carrierLinkHtml = carrierSlug
        ? `<a href="https://treinposities.nl/materieel/${carrierSlug}" target="_blank" rel="noopener">Info Vervoerder</a>`
        : '';

    const firstLoco = locomotive ? locomotive.split(/\s*\+\s*/)[0].replace(/\s/g, '') : null;
    const locoLinkHtml = firstLoco
        ? `<a href="https://treinposities.nl/?q=${encodeURIComponent(firstLoco)}" target="_blank" rel="noopener">Zoek Locnummer</a>`
        : '';

    // Deep-link naar de tekeningenpagina op Arthur's treinenpagina
    // (afbeeldingen hotlinken mag niet volgens de gebruiksregels; linken naar de pagina wel)
    const arthur = getState().materieelDatabase.arthur;
    let arthurPath = null;
    if (arthur) {
        if (analysis.parsedMessage.stock) {
            arthurPath = arthur.materieel?.[analysis.parsedMessage.stock.toLowerCase()];
        } else if (firstLoco) {
            const serieKeys = Object.keys(arthur.series || {}).sort((a, b) => b.length - a.length);
            const serie = serieKeys.find(s => firstLoco.startsWith(s));
            if (serie) arthurPath = arthur.series[serie];
        }
    }
    const arthurLinkHtml = arthurPath
        ? `<a href="${arthur.base}${arthurPath}" target="_blank" rel="noopener">Tekening (Arthur's treinenpagina)</a>`
        : '';

    const externalLinksHtml = (carrierLinkHtml || locoLinkHtml || arthurLinkHtml)
        ? `<p class="external-links">${carrierLinkHtml}${locoLinkHtml}${arthurLinkHtml}</p>`
        : '';

    const headerHtml = `
      <div class="journey-header">
        <div class="train-info-container">
            <div class="train-visualization">${imagesHtml}</div>
            <div class="train-details">
                <p><strong>${carrier ? `${carrier} ${cargoText}` : (analysis.parsedMessage.stock ? 'Treinstel' : `Onbekende ${cargoText}`)}</strong></p>
                <p>${analysis.parsedMessage.stock ? 'Materieel' : 'Locomotief'}: <strong>${locomotive || analysis.parsedMessage.stock || "Onbekend"}</strong> | Richting ${analysis.journey[analysis.journey.length - 1].name}</p>
                ${externalLinksHtml}
            </div>
        </div>
      </div>
    `;

    let timelineHtml = '<div class="journey-timeline">';
    analysis.journey.forEach((station, index) => {
        const markerClass = (index === 0 || index === analysis.journey.length - 1) ? 'start-end' : 'intermediate';
        const waitTimeHtml = station.waitTime > 0 && (station.code === 'AMF' || station.code === 'STO')
            ? `<div class="timeline-wait">verwachte wachttijd ${station.waitTime} min</div>` : '';
        const kopmakenHtml = station.kopmaken
            ? '<div class="timeline-wait">maakt hier kop</div>' : '';
        const isSpot = index === 0;
        const badge = isSpot
            ? '<span class="badge badge-pad">gespot</span>'
            : (station.viaPad
                ? '<span class="badge badge-pad">✓ pad</span>'
                : '<span class="badge badge-schatting">± schatting</span>');

        timelineHtml += `
            <div class="timeline-station">
                <div class="timeline-time-col">${station.time || '--:--'}</div>
                <div class="timeline-marker-col">
                    <div class="timeline-marker ${markerClass}"></div>
                </div>
                <div class="timeline-station-name-col">
                    <span>${station.name}</span>${badge}
                    ${waitTimeHtml}${kopmakenHtml}
                </div>
            </div>`;
    });
    timelineHtml += '</div>';
    timelineHtml += '<p class="reliability-legend"><span class="badge badge-pad">✓ pad</span> = uitgelijnd op vaste goederenpaden · <span class="badge badge-schatting">± schatting</span> = berekend op afstand/snelheid</p>';

    const waBlockHtml = `
      <div class="wa-block">
        <h3>Bericht voor de groep</h3>
        <label class="wa-option">
          <input type="checkbox" id="wa-include-eta" checked />
          Verwachte doorkomst meenemen (pad via SpotConverter)
        </label>
        <pre id="wa-msg" class="wa-msg"></pre>
        <div class="wa-actions">
          <button id="wa-copy-btn" class="btn" type="button">Kopieer bericht</button>
          <button id="wa-share-btn" class="btn btn-wa" type="button">Deel via WhatsApp</button>
        </div>
      </div>
    `;

    journeyOutput.innerHTML = headerHtml + timelineHtml + waBlockHtml;
    setupWhatsAppBlock(analysis);
}

export function toggleLoader(show) {
    const overlay = document.getElementById("loader-overlay");
    if (overlay) overlay.style.display = show ? "flex" : "none";
}

export function showError(message) {
    const journeyOutput = document.getElementById("journey-output");
    if (!journeyOutput) return;
    journeyOutput.innerHTML = "";
    const p = document.createElement("p");
    p.className = "error";
    p.textContent = message; // textContent: geen HTML-injectie via foutmeldingen
    journeyOutput.appendChild(p);
}
