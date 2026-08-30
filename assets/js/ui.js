// ui.js
import { getState, getStationByCode } from './state.js';
import { werkzaamhedenOpRoute } from './routing.js';
import { kaartSegmentHtml } from './kaart.js';
import { renderStationInfo } from './stationinfo.js';
import { buildGroupMessage } from './message.js';
import { buildDienstregeling, dienstregelingTekst } from './dienstregeling.js';
import { downloadDienstregelingPdf } from './pdfstaat.js';

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

/** "t/m ma 31 aug 05:00" — compacte weergave van een werkzaamheden-einde. */
export function werkzaamhedenTot(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return '';
    const dag = d.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' });
    const tijd = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    return `t/m ${dag} ${tijd}`;
}

const escHtml = s => String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

/** Waarschuwingsblokje voor werkzaamheden die een route of dag raken. */
export function werkzaamhedenHtml(lijst, { context = 'route' } = {}) {
    if (!lijst.length) return '';
    const items = lijst.map(w => {
        const tot = werkzaamhedenTot(w.tot);
        const gevolg = w.gevolg ? ` — ${escHtml(w.gevolg)}` : '';
        return `<li><strong>${escHtml(w.titel)}</strong>${tot ? ` (${tot})` : ''}${gevolg}</li>`;
    }).join('');
    const uitleg = context === 'route'
        ? 'Grote kans dat de trein wordt omgeleid of niet rijdt; de tijden hieronder gelden alleen zonder omleiding.'
        : 'Systemen over dit gebied rijden vandaag waarschijnlijk om, of niet.';
    return `
      <div class="segment werkzaamheden-block" role="alert">
        <div class="werkzaamheden-kop">🚧 Werkzaamheden op ${context === 'route' ? 'deze route' : 'de corridor'}</div>
        <ul class="werkzaamheden-lijst">${items}</ul>
        <p class="werkzaamheden-uitleg">${uitleg} <span class="werkzaamheden-bron">Bron: NS-opendata.</span></p>
      </div>`;
}

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

const DAGNAMEN = ["maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag", "zondag"];

/** Verwachtingsbord: welke bekende systemen rijden vandaag doorgaans? */
export function renderVerwachtingsbord() {
    const container = document.getElementById("verwachtingsbord-output");
    const trainPatterns = getState().trainPatterns;
    if (!container || !trainPatterns) return;

    const vandaag = DAGNAMEN[(new Date().getDay() + 6) % 7];
    const verwacht = Object.values(trainPatterns)
        .filter(p => Array.isArray(p.frequentDays) && p.frequentDays.includes(vandaag))
        .sort((a, b) => (b.frequency || 0) - (a.frequency || 0));

    // Werkzaamheden die vandaag actief zijn: het bord is dan minder zeker
    const nu = new Date();
    const dagStart = new Date(nu); dagStart.setHours(0, 0, 0, 0);
    const dagEind = new Date(nu); dagEind.setHours(23, 59, 59, 0);
    const vandaagWerk = (getState().werkzaamheden || []).filter(w => {
        const van = w.van ? new Date(w.van) : null;
        const tot = w.tot ? new Date(w.tot) : null;
        return (!van || van <= dagEind) && (!tot || tot >= dagStart);
    });
    const werkHtml = werkzaamhedenHtml(vandaagWerk, { context: 'dag' });

    if (!verwacht.length) {
        container.innerHTML = werkHtml + '<p class="muted">Geen vaste systemen bekend voor vandaag.</p>';
        return;
    }

    const rijen = verwacht.map(p => {
        const vensters = (p.vensters || []).map(v =>
            `${v.van}–${v.tot}${v.richting ? ` ${v.richting}waarts` : ''}`).join(' · ');
        return `<li class="bord-rij">
            <span class="bord-venster">${vensters || 'tijden wisselen'}</span>
            <span class="bord-naam"><strong>${p.name}</strong>${p.carrier ? ` · ${p.carrier}` : ''}</span>
        </li>`;
    }).join('');

    container.innerHTML = werkHtml + `
        <ul class="bord-lijst">${rijen}</ul>
        <p class="somda-bron">Op basis van 14 maanden groepsspots — kansen, geen dienstregeling.</p>`;
}

export function renderPatronen() {
    const container = document.getElementById("patronen-output");
    const trainPatterns = getState().trainPatterns;
    if (!container || !trainPatterns) return;

    container.innerHTML = Object.values(trainPatterns).filter(p => p.name).map(p => {
        const dagen = Array.isArray(p.frequentDays) ? p.frequentDays.join(', ') : '';
        return `
        <div class="pattern-block">
            <div class="pattern-name">${p.name}</div>
            <div class="pattern-desc">${p.description}</div>
            <div class="pattern-route">Route: ${p.commonRouteCodes.map(c => getStationByCode(c)?.name_long || c).join(" → ")}</div>
            ${dagen ? `<div class="pattern-route">Vooral op: ${dagen}</div>` : ''}
        </div>`;
    }).join("");

    renderVerwachtingsbord();
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

    const cargoNamen = { 'uc': 'unit cargo-trein', 'militair': 'militaire trein' };
    let cargoText = "goederentrein";
    if (analysis.parsedMessage.stock) {
        cargoText = "treinstel";
    } else if (analysis.parsedMessage.llt) {
        cargoText = "losse lok (llt)";
    } else if (analysis.parsedMessage.cargo) {
        cargoText = cargoNamen[analysis.parsedMessage.cargo]
            || analysis.parsedMessage.cargo.charAt(0).toUpperCase() + analysis.parsedMessage.cargo.slice(1) + 'trein';
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
      <div class="segment segment-wit journey-header">
        <div class="train-info-container">
            <div class="train-visualization">${imagesHtml}</div>
            <div class="train-details">
                <p><strong>${carrier ? `${carrier} ${cargoText}` : (analysis.parsedMessage.stock ? 'Treinstel' : `Onbekende ${cargoText}`)}</strong></p>
                <p>${analysis.parsedMessage.stock ? 'Materieel' : 'Locomotief'}: <strong>${locomotive || analysis.parsedMessage.stock || "Onbekend"}</strong> · richting ${analysis.journey[analysis.journey.length - 1].name}</p>
                ${externalLinksHtml}
            </div>
        </div>
      </div>
    `;

    // Kernmomenten blijven altijd zichtbaar; overige tussenstations klappen in
    const targetCode = document.getElementById('targetStationSelect')?.value || null;
    const laatste = analysis.journey.length - 1;
    const isKern = (station, index) =>
        index === 0 || index === laatste || station.code === targetCode
        || station.waitTime > 0 || station.kopmaken;
    const aantalTussen = analysis.journey.filter((s, i) => !isKern(s, i)).length;
    const inklappen = aantalTussen >= 4;

    // Live: de spot is van korter dan zes uur geleden en de trein is nog
    // onderweg — dan tellen we per station af en kan de onderschepping
    const nu = new Date();
    const eersteTijd = analysis.journey[0].finalTime;
    const laatsteTijd = analysis.journey[laatste].finalTime;
    const isLive = eersteTijd && laatsteTijd
        && (nu - eersteTijd) < 6 * 3600000 && (nu - eersteTijd) > -15 * 60000
        && (laatsteTijd - nu) > -30 * 60000;

    let timelineHtml = `<div class="journey-timeline${inklappen ? ' ingeklapt' : ''}" id="journey-timeline">`;
    analysis.journey.forEach((station, index) => {
        const markerClass = (index === 0 || index === laatste) ? 'start-end' : 'intermediate';
        const waitLabel = station.grens
            ? `grensoponthoud ±${station.waitTime} min`
            : `verwachte wachttijd ${station.waitTime} min`;
        const waitTimeHtml = station.waitTime > 0
            ? `<div class="timeline-wait">${waitLabel}</div>` : '';
        const kopmakenHtml = station.kopmaken
            ? '<div class="timeline-wait">maakt hier kop</div>' : '';
        const isSpot = index === 0;
        const badge = isSpot
            ? '<span class="badge badge-pad">gespot</span>'
            : (station.viaPad
                ? '<span class="badge badge-pad">✓ pad</span>'
                : '<span class="badge badge-schatting">±</span>');
        const overMin = (isLive && index > 0 && station.finalTime > nu)
            ? Math.round((station.finalTime - nu) / 60000) : null;
        const countdownHtml = overMin !== null
            ? `<span class="countdown">over ${overMin} min</span>` : '';
        const tussenClass = (inklappen && !isKern(station, index)) ? ' timeline-tussen' : '';

        timelineHtml += `
            <div class="timeline-station${tussenClass}">
                <div class="timeline-time-col">${station.time || '--:--'}</div>
                <div class="timeline-marker-col">
                    <div class="timeline-marker ${markerClass}"></div>
                </div>
                <div class="timeline-station-name-col">
                    <span>${station.name}</span>${badge}${countdownHtml}
                    ${waitTimeHtml}${kopmakenHtml}
                </div>
            </div>`;
    });
    timelineHtml += '</div>';
    if (inklappen) {
        timelineHtml += `<div class="timeline-toggle"><button id="timeline-toggle-btn" type="button">▾ toon ${aantalTussen} tussenstations</button></div>`;
    }
    const timelineSegment = `
      <div class="segment segment-wit">
        <h2 class="segment-titel">Verwachte doorkomst</h2>
        ${timelineHtml}
        <p class="reliability-legend"><span class="badge badge-pad">✓ pad</span> = uitgelijnd op vaste goederenpaden · <span class="badge badge-schatting">±</span> = berekend op afstand/snelheid</p>
      </div>
    `;

    // Onderschepping: alleen bij een trein die nu onderweg is
    const onderscheppingHtml = isLive ? `
      <div class="segment segment-groen onderschepping-block">
        <h2 class="segment-titel">Haal ik hem nog?</h2>
        <p class="somda-bron">Op basis van je locatie en de verwachte doorkomsten hieronder.</p>
        <button id="onderschepping-btn" class="btn" type="button">📍 Check vanaf mijn locatie</button>
        <div id="onderschepping-output"></div>
      </div>` : '';

    const somdaHtml = buildSomdaBlock(analysis, targetCode);

    // Dienstregeling in doorkomststaat-stijl (Courier, kader, logo erboven)
    const staat = buildDienstregeling(analysis);
    const staatHtml = staat ? `
      <div class="segment segment-wit staat-block">
        <h2 class="segment-titel">Dienstregeling</h2>
        <div class="staat-kader-wrap">
          <div class="staat-vel">
            <div class="staat-merk">
              <span class="logo-dot">
                <svg class="brand-logo" viewBox="0 0 100 35" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M 5 15 C 5 5, 15 5, 25 15 S 45 35, 55 25 C 65 15, 75 15, 85 25" stroke="currentColor" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M 75 15 C 75 5, 85 5, 95 15" stroke="currentColor" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </span>
              <span class="staat-merknaam">SpotConverter</span>
            </div>
            <div class="staat-titel">DIENSTREGELING</div>
            <pre id="staat-pre" class="staat-kader"></pre>
          </div>
        </div>
        <div class="staat-acties">
          <button id="staat-pdf-btn" class="btn" type="button">Download als PDF</button>
        </div>
      </div>
    ` : '';

    const waBlockHtml = `
      <div class="segment segment-groen wa-block">
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

    const werkzaamheden = werkzaamhedenOpRoute(analysis.journey);
    const werkzaamhedenBlok = werkzaamhedenHtml(werkzaamheden, { context: 'route' });
    const kaartBlok = kaartSegmentHtml(analysis.journey, targetCode);
    const stationInfoBlok = '<div id="stationinfo-block"></div>';

    journeyOutput.innerHTML = headerHtml + werkzaamhedenBlok + kaartBlok + timelineSegment
        + onderscheppingHtml + stationInfoBlok + staatHtml + somdaHtml + waBlockHtml;
    setupWhatsAppBlock(analysis);
    setupDienstregelingBlock(staat);
    setupTimelineToggle(aantalTussen);
    if (isLive) setupOnderschepping(analysis);
    renderStationInfo(targetCode);
}

// Reissnelheden voor de haalbaarheidsschatting (incl. wegzetten/lopen)
const ONDERSCHEPPING_MODI = [
    { naam: 'fiets', kmU: 16, bufferMin: 2 },
    { naam: 'auto', kmU: 42, bufferMin: 4 }
];

function haversineKm(lat1, lon1, lat2, lon2) {
    const r = Math.PI / 180;
    const a = Math.sin((lat2 - lat1) * r / 2) ** 2
        + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin((lon2 - lon1) * r / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(a));
}

/**
 * "Haal ik hem nog?" — vergelijkt per komend station de reistijd vanaf de
 * eigen locatie (fiets/auto, hemelsbreed × 1,3 wegfactor) met de tijd tot de
 * verwachte doorkomst. Volledig op het apparaat; de locatie verlaat de browser niet.
 */
function setupOnderschepping(analysis) {
    const btn = document.getElementById('onderschepping-btn');
    const output = document.getElementById('onderschepping-output');
    if (!btn || !output) return;

    btn.addEventListener('click', () => {
        if (!navigator.geolocation) {
            output.innerHTML = '<p class="muted">Locatiebepaling is niet beschikbaar in deze browser.</p>';
            return;
        }
        btn.disabled = true;
        btn.textContent = 'Locatie bepalen…';
        navigator.geolocation.getCurrentPosition(pos => {
            btn.disabled = false;
            btn.textContent = '📍 Check vanaf mijn locatie';
            const { latitude, longitude } = pos.coords;
            const coords = getState().stationCoords || {};
            const nu = new Date();

            const opties = analysis.journey
                .filter((s, i) => i > 0 && s.finalTime > nu && coords[s.code])
                .map(s => {
                    const c = coords[s.code];
                    const km = haversineKm(latitude, longitude, Number(c.lat), Number(c.lon)) * 1.3;
                    const overMin = (s.finalTime - nu) / 60000;
                    const modi = ONDERSCHEPPING_MODI
                        .filter(m => (km / m.kmU) * 60 + m.bufferMin <= overMin)
                        .map(m => m.naam);
                    return { s, km, overMin, modi };
                })
                .sort((a, b) => a.km - b.km)
                .slice(0, 5);

            if (!opties.length) {
                output.innerHTML = '<p class="muted">Geen komende stations met bekende locatie gevonden.</p>';
                return;
            }
            output.innerHTML = `<ul class="onderschepping-lijst">${opties.map(o => {
                const oordeel = o.modi.length
                    ? `<span class="badge badge-pad">haalbaar per ${o.modi.join(' of ')}</span>`
                    : '<span class="badge badge-schatting">niet haalbaar</span>';
                return `<li><strong>${o.s.name}</strong> · ${o.km.toFixed(1)} km ·
                    doorkomst ${o.s.time} (over ${Math.round(o.overMin)} min) ${oordeel}</li>`;
            }).join('')}</ul>
            <p class="somda-bron">Afstand hemelsbreed × 1,3; fiets ±16 km/u, auto ±42 km/u. Kom veilig en blijf van het spoor.</p>`;
        }, () => {
            btn.disabled = false;
            btn.textContent = '📍 Check vanaf mijn locatie';
            output.innerHTML = '<p class="muted">Locatie niet beschikbaar — sta locatietoegang toe en probeer opnieuw.</p>';
        }, { enableHighAccuracy: true, timeout: 8000 });
    });
}

/** Vult het dienstregeling-voorbeeld en koppelt de PDF-download. */
function setupDienstregelingBlock(staat) {
    if (!staat) return;
    const pre = document.getElementById('staat-pre');
    if (pre) pre.textContent = dienstregelingTekst(staat);
    const btn = document.getElementById('staat-pdf-btn');
    if (btn) btn.addEventListener('click', () => downloadDienstregelingPdf(staat));
}

/**
 * Somda-doorkomststaat rond de verwachte doorkomst op het doelstation
 * (of anders het eindstation). Gebruikt de officiële embedbare
 * afbeeldingsfeed van somda.nl; dagnummer: 1 = maandag ... 7 = zondag.
 */
function buildSomdaBlock(analysis, targetCode) {
    const journey = analysis.journey;
    const station = (targetCode && journey.find((s, i) => i > 0 && s.code === targetCode))
        || journey[journey.length - 1];
    if (!station || !station.finalTime) return '';

    const start = new Date(station.finalTime.getTime() - 10 * 60000);
    const dag = ((start.getDay() + 6) % 7) + 1;
    const tijd = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
    const code = station.code.toLowerCase();
    const url = `https://somda.nl/feeds/image/${encodeURIComponent(code)}/${dag}/${tijd}/?limit=8&fg-color=22302a&bg-color=ffffff`;

    return `
      <div class="segment segment-groen somda-block">
        <h2 class="segment-titel">Rond jouw doorkomst in ${station.name}</h2>
        <div class="somda-img-wrap">
          <img src="${url}" alt="Doorkomststaat ${station.name} rond ${station.time} (bron: somda.nl)"
               loading="lazy" onerror="this.closest('.somda-block').style.display='none'" />
        </div>
        <p class="somda-bron">Dienstregeling rond ±${station.time} · bron: <a href="https://somda.nl/doorkomststaat/" target="_blank" rel="noopener">somda.nl</a></p>
      </div>
    `;
}

function setupTimelineToggle(aantalTussen) {
    const btn = document.getElementById('timeline-toggle-btn');
    const timeline = document.getElementById('journey-timeline');
    if (!btn || !timeline) return;
    btn.addEventListener('click', () => {
        const ingeklapt = timeline.classList.toggle('ingeklapt');
        btn.textContent = ingeklapt ? `▾ toon ${aantalTussen} tussenstations` : '▴ verberg tussenstations';
    });
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
