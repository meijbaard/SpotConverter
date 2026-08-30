// stationinfo.js — voorzieningen en OV-fiets van het gekozen doelstation.
// Bron: places.ns-mlab.nl (de publieke places-backend van de NS-app): geen
// sleutel nodig, CORS open, https. Faalt de dienst, dan verdwijnt het blok
// geruisloos — de rest van de app merkt er niets van.

import { getStationByCode } from './state.js';

const BASIS = 'https://places.ns-mlab.nl/api/v2';
const cache = new Map();          // stationscode -> samenvatting (per sessie)
let laatsteAanvraag = 0;          // race-guard bij snel wisselen van doelstation

async function haalJson(url) {
    const resp = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.json();
}

/**
 * Vat de payload van beide endpoints samen tot wat een spotter wil weten:
 * hoeveel OV-fietsen staan er, en is er koffie/eten, een toilet, kluizen.
 * Pure functie, zodat hij testbaar is met vastgelegde API-antwoorden.
 */
export function vatStationInfoSamen(ovfietsPayload, voorzieningenPayload) {
    const info = { ovfiets: null, eten: [], winkels: 0, toilet: false,
                   kluizen: false, lift: false, wachtruimte: false };

    let fietsen = 0, fietsLocaties = 0, open = false;
    for (const plek of ovfietsPayload || []) {
        for (const loc of plek.locations || []) {
            fietsLocaties++;
            const n = Number((loc.extra || {}).rentalBikes);
            if (!isNaN(n)) fietsen += n;
            if (loc.open === 'Yes') open = true;
        }
    }
    if (fietsLocaties) info.ovfiets = { aantal: fietsen, locaties: fietsLocaties, open };

    for (const v of voorzieningenPayload || []) {
        const naam = v.name || '';
        const type = v.stationFacilityType || '';
        if (type === 'FOOD_AND_DRINK') {
            if (info.eten.length < 4 && !info.eten.includes(naam)) info.eten.push(naam);
        } else if (type === 'SHOP') {
            info.winkels++;
        } else if (/toilet/i.test(naam)) {
            info.toilet = true;
        } else if (/kluizen/i.test(naam)) {
            info.kluizen = true;
        } else if ((v.identifiers || []).includes('lift')) {
            info.lift = true;
        } else if (/wachtruimte/i.test(naam)) {
            info.wachtruimte = true;
        }
    }
    return info;
}

function infoHtml(code, info) {
    const naam = getStationByCode(code)?.name_long || code;
    const regels = [];
    if (info.ovfiets) {
        const status = info.ovfiets.open ? '' : ' (nu gesloten)';
        const spreiding = info.ovfiets.locaties > 1 ? ` op ${info.ovfiets.locaties} plekken` : '';
        regels.push(`🚲 <strong>${info.ovfiets.aantal} OV-fietsen</strong>${spreiding}${status}`);
    }
    if (info.eten.length) regels.push(`☕ ${info.eten.join(' · ')}`);
    if (info.winkels) regels.push(`🛒 ${info.winkels} winkel${info.winkels > 1 ? 's' : ''}`);
    const overig = [info.toilet && '🚻 toilet', info.kluizen && '🔒 kluizen',
                    info.wachtruimte && '🪑 wachtruimte', info.lift && '♿ lift']
        .filter(Boolean).join(' · ');
    if (overig) regels.push(overig);
    if (!regels.length) return '';

    return `
        <h2 class="segment-titel">Op ${naam}</h2>
        <ul class="stationinfo-lijst">${regels.map(r => `<li>${r}</li>`).join('')}</ul>
        <p class="somda-bron">Actuele stand · bron: NS (places)</p>`;
}

/**
 * Vult #stationinfo-block asynchroon voor het doelstation. Wordt aangeroepen
 * na elke analyse; het blok blijft leeg bij fouten of een leeg antwoord.
 */
export async function renderStationInfo(code) {
    const container = document.getElementById('stationinfo-block');
    if (!container) return;
    if (!code) { container.innerHTML = ''; return; }

    const aanvraag = ++laatsteAanvraag;
    if (cache.has(code)) {
        container.innerHTML = cache.get(code);
        return;
    }
    container.innerHTML = '';

    try {
        const [ovfiets, voorzieningen] = await Promise.all([
            haalJson(`${BASIS}/ovfiets?station_code=${encodeURIComponent(code)}`),
            haalJson(`${BASIS}/places?station_code=${encodeURIComponent(code)}&type=stationfacility`)
        ]);
        const info = vatStationInfoSamen(ovfiets.payload, voorzieningen.payload);
        const html = infoHtml(code, info);
        const blok = html ? `<div class="segment segment-groen stationinfo-segment">${html}</div>` : '';
        cache.set(code, blok);
        if (aanvraag === laatsteAanvraag) container.innerHTML = blok;
    } catch (e) {
        if (aanvraag === laatsteAanvraag) container.innerHTML = '';
    }
}
