// radar.js — groepsradar: plak meerdere spotberichten (of een stuk groepschat)
// en zie welke treinen er nu onderweg zijn. De radar herkent dat meerdere
// meldingen bij dezelfde trein horen (locnummer, of vervoerder + lading binnen
// een tijdvenster), neemt de laatste waarneming als anker en projecteert de
// verwachte doorkomsten vanaf dat punt.

import { parseMessage } from './parser.js';
import { analyzeTrajectory } from './routing.js';
import { getStationByCode } from './state.js';
import { shortCode } from './message.js';

// WhatsApp-exportkop: [29-08-2026, 11:55:35] Naam: bericht  (seconden optioneel)
const HEADER_RE = /\[(\d{1,2})-(\d{1,2})-(\d{2,4}),?\s+(\d{1,2}):(\d{2})(?::\d{2})?\]\s*[^:\n]*:\s*/g;

// Voegwoorden aan het begin van een regel zijn nooit een stationscode ("En lte ...")
const REGEL_PREFIX = /^(en|ook|daarna|verder|nu|net)\s+/i;

/**
 * Knipt geplakte tekst in losse groepsberichten. Met WhatsApp-koppen wordt de
 * verzendtijd meegenomen als terugvaltijd; zonder koppen telt elke niet-lege
 * regelgroep als één bericht.
 */
export function splitChat(raw) {
    const messages = [];
    HEADER_RE.lastIndex = 0;
    const headers = [...raw.matchAll(HEADER_RE)];
    if (headers.length) {
        headers.forEach((h, i) => {
            const start = h.index + h[0].length;
            const end = i + 1 < headers.length ? headers[i + 1].index : raw.length;
            messages.push({
                verzendTijd: `${h[4].padStart(2, '0')}:${h[5]}`,
                tekst: raw.slice(start, end).trim()
            });
        });
        // Tekst vóór de eerste kop (bijv. een los doorgestuurd bericht)
        const vooraf = raw.slice(0, headers[0].index).trim();
        if (vooraf) messages.unshift({ verzendTijd: null, tekst: vooraf });
    } else {
        for (const blok of raw.split(/\n{2,}/)) {
            if (blok.trim()) messages.push({ verzendTijd: null, tekst: blok.trim() });
        }
    }
    return messages;
}

/**
 * Haalt treinwaarnemingen uit de berichten. Eén bericht kan meerdere treinen
 * bevatten ("Dvge 11:22 / RTB 193 515 ri Zp / RTB 193xxx met pcc ri Spa"):
 * een kopregel met station+tijd geldt dan als context voor de vervolgregels.
 */
export function extractObservations(raw) {
    const observaties = [];
    for (const msg of splitChat(raw)) {
        const regels = msg.tekst.split('\n')
            .map(r => r.trim().replace(REGEL_PREFIX, ''))
            .filter(r => r.length >= 3);
        if (!regels.length) continue;

        // Eén trein in het bericht: alles in één keer parsen, zodat de
        // vrije-veldlocatie "(Hon - Dvc)" en een tijd op een eigen regel
        // gewoon meedoen. Meerdere locregels = meerdere treinen: dan regel
        // voor regel, met de kopregel (station + tijd) als context.
        const treinRegels = regels.filter(r => parseMessage(r).locomotive);
        if (treinRegels.length <= 1) {
            const p = parseMessage(regels.join(' '));
            const isTrein = p.locomotive || p.stock
                || (p.hasDirectionMarker && p.routeCodes.length >= 2 && (p.carrier || p.cargo || p.llt));
            if (isTrein && p.routeCodes.length) {
                if (!p.timestamp) p.timestamp = msg.verzendTijd;
                if (p.timestamp) observaties.push({ parsed: p, tijd: p.timestamp, station: p.routeCodes[0] });
            }
            continue;
        }

        let context = { code: null, tijd: msg.verzendTijd };
        for (const regel of regels) {
            const p = parseMessage(regel);

            const isTrein = p.locomotive || p.stock
                || (p.hasDirectionMarker && p.routeCodes.length >= 1 && (p.carrier || p.cargo));
            if (!isTrein) {
                // Kopregel als "Dvge 11:22": context voor de regels eronder
                if (p.spotLocation && p.routeCodes.length === 1) {
                    context = { code: p.routeCodes[0], tijd: p.timestamp || context.tijd };
                }
                continue;
            }

            // Ontbrekende spotlocatie of tijd uit de context (of verzendtijd) aanvullen
            if (!p.routeCodes.length && context.code) {
                p.routeCodes = [context.code];
                p.spotLocation = getStationByCode(context.code) || { code: context.code };
            } else if (context.code && p.routeCodes.length === 1 && p.hasDirectionMarker) {
                // Alleen een ri-doel herkend: context is de spotlocatie
                if (p.routeCodes[0] !== context.code) {
                    p.routeCodes = [context.code, ...p.routeCodes];
                    p.spotLocation = getStationByCode(context.code) || { code: context.code };
                }
            }
            if (!p.timestamp) p.timestamp = context.tijd;
            if (!p.timestamp || !p.routeCodes.length) continue;

            observaties.push({ parsed: p, tijd: p.timestamp, station: p.routeCodes[0] });
            if (p.routeCodes.length && p.timestamp) {
                context = { code: p.routeCodes[0], tijd: p.timestamp };
            }
        }
    }
    return observaties.sort((a, b) => a.tijd.localeCompare(b.tijd));
}

const minuten = t => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

function locSleutel(locomotive) {
    if (!locomotive) return null;
    const eerste = locomotive.split('+')[0].replace(/[^0-9x]/gi, '').toLowerCase();
    return eerste.includes('x') || eerste.length < 5 ? null : eerste;
}

const vervoerderNorm = c => (c === 'RTBC' ? 'RTB' : c);

function isShuttleNaam(cargoRaw) {
    return cargoRaw ? /shuttle$|^uc /i.test(cargoRaw) : false;
}

/**
 * Groepeert waarnemingen tot treinen. Zelfde locnummer = zelfde trein (tot 6
 * uur ertussen); zonder bruikbaar locnummer ("193 xxx") telt dezelfde
 * vervoerder met dezelfde lading binnen 90 minuten als dezelfde trein. Twee
 * verschillende shuttlenamen worden nooit samengevoegd.
 */
export function groupTrains(observaties) {
    const treinen = [];
    for (const obs of observaties) {
        const p = obs.parsed;
        const sleutel = locSleutel(p.locomotive);
        const vervoerder = vervoerderNorm(p.carrier);
        const t = minuten(obs.tijd);

        const kandidaat = treinen.find(trein => {
            const verschil = t - minuten(trein.laatste.tijd);
            if (verschil < 0 || verschil > 360) return false;
            if (sleutel && trein.locSleutel) return sleutel === trein.locSleutel;
            if (verschil > 90) return false;
            if (!vervoerder || !trein.vervoerder || vervoerder !== trein.vervoerder) return false;
            if (!p.cargo || !trein.cargo || p.cargo !== trein.cargo) return false;
            // Twee expliciet verschillende shuttlenamen: andere trein
            if (isShuttleNaam(p.cargoRaw) && isShuttleNaam(trein.cargoRaw)
                && p.cargoRaw.toLowerCase() !== trein.cargoRaw.toLowerCase()) return false;
            return true;
        });

        if (kandidaat) {
            kandidaat.observaties.push(obs);
            kandidaat.laatste = obs;
            if (sleutel && !kandidaat.locSleutel) {
                kandidaat.locSleutel = sleutel;
                kandidaat.locomotive = p.locomotive;
            }
            if (isShuttleNaam(p.cargoRaw) || (!kandidaat.cargoRaw && p.cargoRaw)) {
                kandidaat.cargoRaw = p.cargoRaw;
            }
            if (!kandidaat.vervoerder && vervoerder) kandidaat.vervoerder = vervoerder;
        } else {
            treinen.push({
                observaties: [obs],
                laatste: obs,
                locSleutel: sleutel,
                locomotive: p.locomotive,
                vervoerder,
                cargo: p.cargo,
                cargoRaw: p.cargoRaw,
                stock: p.stock
            });
        }
    }
    return treinen;
}

/**
 * Projecteert een trein vanaf de laatste waarneming: route + verwachte
 * doorkomsten, plus (bij meerdere meldingen) de afwijking van het model.
 */
export function projectTrain(trein, nu = new Date()) {
    const analysis = analyzeTrajectory(trein.laatste.parsed, null);
    const journey = analysis.journey;

    // Afwijking t.o.v. het model: waar had de vórige waarneming de trein nu voorspeld?
    let driftMinuten = null;
    if (trein.observaties.length >= 2 && journey) {
        const vorige = trein.observaties[trein.observaties.length - 2];
        const modelVanVorige = analyzeTrajectory(vorige.parsed, null).journey;
        const voorspeld = modelVanVorige?.find(s => s.code === trein.laatste.station);
        if (voorspeld) {
            driftMinuten = minuten(trein.laatste.tijd) - minuten(voorspeld.time);
        }
    }

    const komend = (journey || [])
        .slice(1)
        .filter(s => s.finalTime > nu)
        .slice(0, 5)
        .map(s => ({
            code: s.code,
            name: s.name,
            time: s.time,
            overMinuten: Math.round((s.finalTime - nu) / 60000),
            viaPad: s.viaPad
        }));

    return { journey, komend, driftMinuten };
}

/** Volledige radaranalyse: van geplakte tekst naar geprojecteerde treinen. */
export function analyseRadar(raw, nu = new Date()) {
    const treinen = groupTrains(extractObservations(raw));
    return treinen.map(trein => ({ ...trein, ...projectTrain(trein, nu) }));
}

// --- Weergave -----------------------------------------------------------------

const esc = s => String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

export function renderRadar(raw, containerId = 'radar-output') {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!raw || !raw.trim()) {
        container.innerHTML = '<p class="muted">Plak een stuk groepschat (meerdere berichten mag) en tik Analyseer.</p>';
        return;
    }

    const nu = new Date();
    const treinen = analyseRadar(raw, nu);
    if (!treinen.length) {
        container.innerHTML = '<p class="muted">Geen treinen herkend in de geplakte tekst.</p>';
        return;
    }

    container.innerHTML = treinen.map(trein => {
        const titelDelen = [
            trein.vervoerder,
            trein.locomotive || trein.stock || 'tractie onbekend',
            trein.cargoRaw || (trein.cargo ? `${trein.cargo}trein` : null)
        ].filter(Boolean);

        const doel = trein.laatste.parsed.routeCodes.length > 1
            ? ` ri ${shortCode(trein.laatste.parsed.routeCodes[trein.laatste.parsed.routeCodes.length - 1])}` : '';
        const meldingen = trein.observaties.length === 1
            ? '1 melding' : `${trein.observaties.length} meldingen`;
        const drift = (trein.driftMinuten !== null && Math.abs(trein.driftMinuten) >= 3)
            ? ` · loopt ${trein.driftMinuten > 0 ? '+' : ''}${trein.driftMinuten} min op het model` : '';

        const spoor = trein.observaties
            .map(o => `${o.tijd} ${shortCode(o.station)}`)
            .join(' → ');

        let komendHtml;
        if (!trein.journey) {
            komendHtml = '<p class="muted">Geen route te bepalen (richting onbekend).</p>';
        } else if (!trein.komend.length) {
            komendHtml = '<p class="muted">Waarschijnlijk al aangekomen of gepasseerd.</p>';
        } else {
            komendHtml = `<ul class="radar-komend">${trein.komend.map(s => `
                <li><span class="radar-tijd">${s.time}</span> ${esc(s.name)}
                    <span class="countdown">over ${s.overMinuten} min</span></li>`).join('')}
            </ul>`;
        }

        return `
          <div class="segment segment-wit radar-kaart">
            <div class="radar-titel"><strong>${esc(titelDelen.join(' · '))}</strong>${esc(doel)}</div>
            <div class="radar-meta">${meldingen}${drift ? esc(drift) : ''}</div>
            <div class="radar-spoor">${esc(spoor)}</div>
            ${komendHtml}
          </div>`;
    }).join('');
}
