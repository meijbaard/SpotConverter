// kaart.js — routekaart als inline SVG, zonder externe bibliotheken of tiles.
// Achtergrond: de echte spoorgeometrie uit spoorkaart.json (NS Spoorkaart-API);
// zolang dat bestand ontbreekt worden rechte lijnen tussen de trajectstations
// getekend. Daaroverheen: de berekende route, de spot-/doel-/eindpunten en —
// bij een trein die nu onderweg is — de geschatte actuele positie.

import { getState, getStationByCode } from './state.js';

// Vaste tekenruimte; de projectie schaalt de route hierin met wat marge
const VB_B = 100, VB_H = 78;

/** Alle achtergrondlijnen als [[lon,lat],...] — NS-geometrie of traject-fallback. */
function netwerkLijnen() {
    const { spoorkaart, trajectories, stationCoords } = getState();
    if (spoorkaart?.lijnen?.length) return spoorkaart.lijnen;

    const lijnen = [];
    for (const naam in trajectories || {}) {
        let lijn = [];
        for (const code of trajectories[naam]) {
            const c = stationCoords[code];
            if (c && c.lon !== undefined) {
                lijn.push([Number(c.lon), Number(c.lat)]);
            } else if (lijn.length >= 2) {
                lijnen.push(lijn); lijn = [];
            } else {
                lijn = [];
            }
        }
        if (lijn.length >= 2) lijnen.push(lijn);
    }
    return lijnen;
}

/** Routecoördinaten uit de journey (stations zonder coördinaten overslaan). */
function routeCoords(journey) {
    const coords = getState().stationCoords || {};
    return journey
        .map(s => ({ s, c: coords[s.code] }))
        .filter(x => x.c && x.c.lon !== undefined)
        .map(x => ({ code: x.s.code, name: x.s.name, finalTime: x.s.finalTime,
                     lon: Number(x.c.lon), lat: Number(x.c.lat) }));
}

/**
 * Projectie: equirectangulair met breedtegraadcorrectie, passend gemaakt op
 * de route (met marge) binnen de viewBox. Geeft ook een schaalbare lijndikte.
 */
export function maakProjectie(punten, marge = 0.18) {
    const lats = punten.map(p => p.lat), lons = punten.map(p => p.lon);
    const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const kx = Math.cos(midLat * Math.PI / 180);

    let minX = Math.min(...lons) * kx, maxX = Math.max(...lons) * kx;
    let minY = -Math.max(...lats), maxY = -Math.min(...lats);
    const spanX = Math.max(maxX - minX, 0.05), spanY = Math.max(maxY - minY, 0.05);
    minX -= spanX * marge; maxX += spanX * marge;
    minY -= spanY * marge; maxY += spanY * marge;

    const schaal = Math.min(VB_B / (maxX - minX), VB_H / (maxY - minY));
    const offX = (VB_B - (maxX - minX) * schaal) / 2;
    const offY = (VB_H - (maxY - minY) * schaal) / 2;

    return {
        x: lon => (lon * kx - minX) * schaal + offX,
        y: lat => (-lat - minY) * schaal + offY,
        schaal
    };
}

/**
 * Geschatte actuele positie op de route: lineair tussen het laatst
 * gepasseerde en het eerstvolgende station. Null buiten het reisvenster.
 */
export function treinPositie(punten, nu = new Date()) {
    for (let i = 0; i < punten.length - 1; i++) {
        const a = punten[i], b = punten[i + 1];
        if (!a.finalTime || !b.finalTime) continue;
        if (nu >= a.finalTime && nu <= b.finalTime) {
            const duur = b.finalTime - a.finalTime;
            const f = duur > 0 ? (nu - a.finalTime) / duur : 0;
            return { lon: a.lon + (b.lon - a.lon) * f, lat: a.lat + (b.lat - a.lat) * f };
        }
    }
    return null;
}

function pad(lijn, prj) {
    return lijn.map((p, i) => `${i ? 'L' : 'M'}${prj.x(p[0]).toFixed(2)} ${prj.y(p[1]).toFixed(2)}`).join('');
}

/** Bouwt de SVG-kaart voor een analyse; lege string als er te weinig data is. */
export function kaartSvg(journey, { targetCode = null, nu = new Date() } = {}) {
    if (!journey || journey.length < 2) return '';
    const route = routeCoords(journey);
    if (route.length < 2) return '';

    const prj = maakProjectie(route);
    const binnen = p => {
        const x = prj.x(p[0]), y = prj.y(p[1]);
        return x > -25 && x < VB_B + 25 && y > -25 && y < VB_H + 25;
    };

    // Landomtrek (gevuld) als geografische referentie, daaroverheen het spoornet
    let omtrekPaden = '';
    for (const ring of getState().nlOmtrek?.lijnen || []) {
        if (!ring.some(binnen)) continue;
        omtrekPaden += `<path d="${pad(ring, prj)}Z"/>`;
    }

    // Achtergrondnet: alleen lijnen die (deels) in beeld zijn
    let netPaden = '';
    for (const lijn of netwerkLijnen()) {
        if (!lijn.some(binnen)) continue;
        netPaden += `<path d="${pad(lijn, prj)}"/>`;
    }

    const routePad = pad(route.map(p => [p.lon, p.lat]), prj);

    // Plaatsnamen: spot, doel en eindpunt altijd; grotere stations op de route
    // erbij zolang labels elkaar niet verdringen
    const labelPunten = route.filter((p, i) => {
        if (i === 0 || i === route.length - 1) return true;
        if (targetCode && p.code === targetCode) return true;
        const type = getStationByCode(p.code)?.type || '';
        return /knooppunt|intercity/i.test(type);
    });
    let labels = '';
    let vorige = null;
    for (const p of labelPunten) {
        const x = prj.x(p.lon), y = prj.y(p.lat);
        if (vorige && Math.hypot(x - vorige[0], y - vorige[1]) < 11) continue;
        vorige = [x, y];
        const naam = getStationByCode(p.code)?.name_short || p.code;
        labels += `<text class="kaart-label" x="${(x + 1.8).toFixed(2)}" y="${(y - 1.6).toFixed(2)}">${naam}</text>`;
    }

    // Markeringen: spot (start), doelstation, eindpunt
    const punt = (p, klasse, straal) =>
        `<circle class="${klasse}" cx="${prj.x(p.lon).toFixed(2)}" cy="${prj.y(p.lat).toFixed(2)}" r="${straal}"/>`;
    let markers = punt(route[0], 'kaart-spot', 1.7) + punt(route[route.length - 1], 'kaart-eind', 1.7);
    const doel = targetCode && route.find((p, i) => i > 0 && p.code === targetCode);
    if (doel) markers += punt(doel, 'kaart-doel', 1.6);

    const positie = treinPositie(route, nu);
    const treinDot = positie
        ? `<circle class="kaart-trein" cx="${prj.x(positie.lon).toFixed(2)}" cy="${prj.y(positie.lat).toFixed(2)}" r="2.1"/>`
        : '';

    return `<svg class="kaart-svg" viewBox="0 0 ${VB_B} ${VB_H}" xmlns="http://www.w3.org/2000/svg"
                 role="img" aria-label="Route op de kaart">
        <g class="kaart-omtrek">${omtrekPaden}</g>
        <g class="kaart-net">${netPaden}</g>
        <path class="kaart-route" d="${routePad}"/>
        ${markers}${treinDot}
        <g class="kaart-labels">${labels}</g>
    </svg>`;
}

/** Kaartsegment voor de analyseweergave (lege string zonder bruikbare kaart). */
export function kaartSegmentHtml(journey, targetCode) {
    const svg = kaartSvg(journey, { targetCode });
    if (!svg) return '';
    const bron = getState().spoorkaart?.lijnen?.length
        ? 'spoorgeometrie: NS Spoorkaart-API'
        : 'schematische lijnen tussen stations';
    return `
      <div class="segment segment-wit kaart-block">
        <h2 class="segment-titel">Route op de kaart</h2>
        ${svg}
        <p class="kaart-legenda">
          <span class="kaart-leg kaart-leg-spot">●</span> gespot ·
          <span class="kaart-leg kaart-leg-doel">●</span> doelstation ·
          <span class="kaart-leg kaart-leg-eind">●</span> eindpunt ·
          <span class="kaart-leg kaart-leg-trein">●</span> nu (schatting) —
          <span class="kaart-bron">${bron}</span>
        </p>
      </div>`;
}
