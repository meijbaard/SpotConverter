// ui.js
import { getState, getStationByCode } from './state.js';

export function populateStationDropdowns() {
    const { stations, heatmapData } = getState();
    const uniqueNames = [...new Set(stations.map(e => e.name_long))].sort((a, b) => a.localeCompare(b));
    
    const targetSelect = document.getElementById("targetStationSelect");
    if (targetSelect) {
        targetSelect.innerHTML = "";
        uniqueNames.forEach(name => {
            const station = stations.find(t => t.name_long === name);
            if (station) {
                let option = document.createElement("option");
                option.value = station.code;
                option.textContent = station.name_long;
                targetSelect.appendChild(option);
            }
        });
        targetSelect.value = "BRN"; // Standaardwaarde
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

export function renderSearchResults(results) {
    const container = document.getElementById("stationSearchResults");
    if (!container) return;
    if (results.length === 0) {
        container.innerHTML = "";
        return;
    }
    container.innerHTML = results.map(e => `
        <div class="bg-white p-4 rounded-lg shadow-md border border-slate-200">
            <div class="flex justify-between items-start">
                <h3 class="text-lg font-bold text-cyan-800">${e.name_long || "Onbekend"}</h3>
                <span class="text-sm font-semibold bg-cyan-100 text-cyan-800 px-2 py-1 rounded-full">${e.code || "N/A"}</span>
            </div>
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
        output.innerHTML = "<em>Geen data voor dit station op deze dag.</em>";
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
            <div class="mt-1">${p.description}</div>
            <div class="pattern-route">Route: ${p.commonRouteCodes.map(c => getStationByCode(c)?.name_long || c).join(" → ")}</div>
        </div>`).join("");
}

function getTrainInfoImages(parsedMessage) {
    const db = getState().materieelDatabase;
    let images = [];
    const sortedTypes = Object.keys(db.types || {}).sort((a, b) => b.length - a.length);

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

export function displayResults(analysis, copyCallback) {
    const rawDataBlock = document.getElementById('parsed-data-output');
    if (rawDataBlock) rawDataBlock.textContent = JSON.stringify(analysis, null, 2);
    
    const journeyOutput = document.getElementById('journey-output');
    if (!analysis.journey || analysis.journey.length === 0) {
        journeyOutput.innerHTML = '<p class="text-slate-500">Geen geldig traject gevonden. Controleer de stationsvolgorde in je bericht.</p>';
        return;
    }

    const images = getTrainInfoImages(analysis.parsedMessage);
    const imagesHtml = images.map(img => `<img src="${img.src}" onerror="this.style.display='none'" />`).join('');
    
    let cargoText = "goederentrein";
    if (analysis.parsedMessage.cargo) {
        cargoText = analysis.parsedMessage.cargo.charAt(0).toUpperCase() + analysis.parsedMessage.cargo.slice(1) + 'trein';
    }

    const headerHtml = `
      <div class="journey-header">
        <div class="train-info-container">
            <div class="train-visualization">${imagesHtml}</div>
            <div class="train-details">
                <p class="text-sm"><strong>${analysis.parsedMessage.carrier || 'Onbekende'} ${cargoText}</strong></p>
                <p class="text-sm">Locomotief: <strong>${analysis.parsedMessage.locomotive || "Onbekend"}</strong> | Richting ${analysis.journey[analysis.journey.length - 1].name}</p>
            </div>
        </div>
        <button id="copy-btn" class="copy-btn">Kopieer Info</button>
      </div>
    `;

    let timelineHtml = '<div class="journey-timeline">';
    analysis.journey.forEach((station, index) => {
        let markerClass = (index === 0 || index === analysis.journey.length - 1) ? 'start-end' : 'intermediate';
        let waitTimeHtml = station.waitTime > 0 && (station.code === 'AMF' || station.code === 'STO') ? `<div style="color: red; font-size: 0.8rem;">verwachte wachttijd ${station.waitTime} min</div>` : '';
        
        timelineHtml += `
            <div class="timeline-station">
                <div class="timeline-time-col">${station.time || '--:--'}</div>
                <div class="timeline-marker-col">
                    <div class="timeline-marker ${markerClass}"></div>
                </div>
                <div class="timeline-station-name-col">
                    <span>${station.name}</span>
                    ${waitTimeHtml}
                </div>
            </div>`;
    });
    timelineHtml += '</div>';
    journeyOutput.innerHTML = headerHtml + timelineHtml;
    
    document.getElementById('copy-btn').addEventListener('click', () => copyCallback(analysis));
}

export function toggleLoader(show) {
    const overlay = document.getElementById("loader-overlay");
    if (overlay) overlay.style.display = show ? "flex" : "none";
}

export function showError(message) {
    const journeyOutput = document.getElementById("journey-output");
    if (journeyOutput) journeyOutput.innerHTML = `<p class="text-red-600 font-bold">${message}</p>`;
}