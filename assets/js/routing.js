// routing.js
import { getState, getStationByCode } from './state.js';

// --- Spoorweggraaf -----------------------------------------------------------
// De trajecten in trajecten.json worden bij het eerste gebruik omgezet naar een
// netwerk: knopen = stations, kanten = opeenvolgende stations met hun afstand.
// Elk gedeeld station is daardoor automatisch een knooppunt en routes over
// willekeurig veel trajecten worden met een kortste-padzoektocht gevonden.

let graphCache = null;
let graphSource = null;

const FALLBACK_EDGE_KM = 4; // aanname als de afstand van een baanvak ontbreekt

function buildGraph() {
    const { trajectories, distanceMatrix } = getState();
    if (graphCache && graphSource === trajectories) return graphCache;

    const adj = new Map();        // code -> Map(buurcode -> km)
    const edgeTraject = new Map(); // "A|B" -> trajectnaam (voor weergave)

    for (const name in trajectories) {
        const route = trajectories[name];
        for (let i = 0; i < route.length - 1; i++) {
            const a = route[i], b = route[i + 1];
            if (a === b) continue;
            const km = distanceMatrix[a]?.[b] || distanceMatrix[b]?.[a] || 0;
            const gewicht = km > 0 ? km : FALLBACK_EDGE_KM;
            if (!adj.has(a)) adj.set(a, new Map());
            if (!adj.has(b)) adj.set(b, new Map());
            if (!adj.get(a).has(b)) adj.get(a).set(b, gewicht);
            if (!adj.get(b).has(a)) adj.get(b).set(a, gewicht);
            if (!edgeTraject.has(`${a}|${b}`)) edgeTraject.set(`${a}|${b}`, name);
            if (!edgeTraject.has(`${b}|${a}`)) edgeTraject.set(`${b}|${a}`, name);
        }
    }

    graphCache = { adj, edgeTraject };
    graphSource = trajectories;
    return graphCache;
}

/**
 * Verboden doorrijverbindingen uit overgangen.json (bijv. de vervallen
 * verbindingsboog bij Blauwkapel): de drie stations mogen niet in deze
 * volgorde — of omgekeerd — na elkaar gepasseerd worden.
 */
function verbodenSet() {
    const set = new Set();
    for (const [a, b, c] of getState().bannedTurns || []) {
        set.add(`${a}|${b}|${c}`);
        set.add(`${c}|${b}|${a}`);
    }
    return set;
}

function heeftVerbodenOvergang(stations, verboden) {
    for (let i = 0; i < stations.length - 2; i++) {
        if (verboden.has(`${stations[i]}|${stations[i + 1]}|${stations[i + 2]}`)) return true;
    }
    return false;
}

/** Dijkstra: kortste pad (in km) tussen twee stationscodes, of null. */
function shortestPath(adj, from, to) {
    if (from === to) return [from];
    const verboden = verbodenSet();
    const dist = new Map([[from, 0]]);
    const prev = new Map();
    const todo = new Set([from]);
    const done = new Set();

    while (todo.size) {
        let current = null, best = Infinity;
        for (const node of todo) {
            const d = dist.get(node);
            if (d < best) { best = d; current = node; }
        }
        todo.delete(current);
        if (current === to) break;
        done.add(current);

        for (const [buur, w] of adj.get(current) || []) {
            if (done.has(buur)) continue;
            const vorige = prev.get(current);
            if (vorige && verboden.has(`${vorige}|${current}|${buur}`)) continue;
            const d = dist.get(current) + w;
            if (d < (dist.get(buur) ?? Infinity)) {
                dist.set(buur, d);
                prev.set(buur, current);
                todo.add(buur);
            }
        }
    }

    if (!prev.has(to)) return null;
    const pad = [to];
    while (pad[0] !== from) pad.unshift(prev.get(pad[0]));
    return pad;
}

/**
 * Segment langs één benoemd traject (eerste traject dat beide codes bevat).
 * Benoemde corridors zijn de domeinwaarheid — daar horen de goederenpaden
 * bij — dus die winnen van het kortste pad zolang ze het segment dekken.
 */
function trajectSlice(a, b) {
    const trajectories = getState().trajectories;
    const verboden = verbodenSet();
    for (const name in trajectories) {
        const route = trajectories[name];
        const ia = route.indexOf(a);
        const ib = route.indexOf(b);
        if (ia !== -1 && ib !== -1 && ia !== ib) {
            const stations = ia < ib
                ? route.slice(ia, ib + 1)
                : route.slice(ib, ia + 1).reverse();
            if (heeftVerbodenOvergang(stations, verboden)) continue;
            return { stations, name };
        }
    }
    return null;
}

function padKm(stations) {
    const { distanceMatrix } = getState();
    let km = 0;
    for (let i = 0; i < stations.length - 1; i++) {
        km += distanceMatrix[stations[i]]?.[stations[i + 1]]
            || distanceMatrix[stations[i + 1]]?.[stations[i]]
            || FALLBACK_EDGE_KM;
    }
    return km;
}

function sliceBinnen(route, a, b) {
    const ia = route.indexOf(a);
    const ib = route.indexOf(b);
    return ia < ib ? route.slice(ia, ib + 1) : route.slice(ib, ia + 1).reverse();
}

/**
 * Route over precies twee benoemde trajecten met een gedeeld overstapstation.
 * Alle kandidaat-knooppunten worden op totale kilometers gescoord, zodat bijv.
 * Bad Bentheim -> Amsterdam netjes de Bentheimroute + Gooilijn volgt en een
 * museumrit naar Hilversum de fysiek kortere lijn via Hollandsche Rading kiest.
 */
function tweeTrajectRoute(a, b) {
    const trajectories = getState().trajectories;
    const verboden = verbodenSet();
    let beste = null;

    for (const n1 in trajectories) {
        const r1 = trajectories[n1];
        if (!r1.includes(a)) continue;
        for (const n2 in trajectories) {
            if (n2 === n1) continue;
            const r2 = trajectories[n2];
            if (!r2.includes(b)) continue;
            for (const hub of r1) {
                if (hub === a || hub === b || !r2.includes(hub)) continue;
                const stations = [...sliceBinnen(r1, a, hub), ...sliceBinnen(r2, hub, b).slice(1)];
                if (heeftVerbodenOvergang(stations, verboden)) continue;
                // Geen station twee keer aandoen: dat zou een keer-/kopmaakroute zijn
                if (new Set(stations).size !== stations.length) continue;
                const km = padKm(stations);
                if (!beste || km < beste.km) beste = { stations, km, namen: [n1, n2] };
            }
        }
    }
    return beste;
}

/**
 * Zoekt de route op basis van de herkende stationscodes.
 * Alle herkende codes doen mee als via-punt (in berichtvolgorde); codes die
 * niet in het netwerk liggen worden overgeslagen. Per segment geldt: eerst
 * een benoemd traject proberen, anders het kortste pad door het netwerk.
 * Het resultaat behoudt de vorm { name, direction, stations }.
 */
export function findFullTrajectory(routeCodes) {
    if (routeCodes.length < 2) return null;

    const { adj, edgeTraject } = buildGraph();
    const punten = routeCodes.filter(code => adj.has(code));
    if (punten.length < 2) return null;

    let stations = [punten[0]];
    const namen = [];
    for (let i = 0; i < punten.length - 1; i++) {
        // Voorkeursvolgorde: één benoemd traject, dan twee trajecten met
        // gedeeld overstapstation (km-gescoord), dan kortste pad door de graaf
        const slice = trajectSlice(punten[i], punten[i + 1]);
        let segment, segmentNamen;
        if (slice) {
            segment = slice.stations;
            segmentNamen = [slice.name];
        } else {
            const twee = tweeTrajectRoute(punten[i], punten[i + 1]);
            segment = twee ? twee.stations : shortestPath(adj, punten[i], punten[i + 1]);
            segmentNamen = twee ? twee.namen : [];
        }
        if (!segment) return null;
        for (const naam of segmentNamen) {
            if (namen[namen.length - 1] !== naam) namen.push(naam);
        }
        stations = stations.concat(segment.slice(1));
    }

    // Trajectnamen van kortste-padsegmenten aanvullen voor de weergave
    if (!namen.length) {
        for (let i = 0; i < stations.length - 1; i++) {
            const naam = edgeTraject.get(`${stations[i]}|${stations[i + 1]}`);
            if (naam && namen[namen.length - 1] !== naam) namen.push(naam);
        }
    }

    return { name: namen.join(' -> ') || 'route', direction: 'forward', stations };
}

/**
 * Evalueert één extrapolatieregel uit extrapolatie.json tegen het bericht.
 * Een regel matcht als één van de aanwezige condities waar is:
 * - anyOf: minstens één term komt voor in het bericht
 * - allOf: uit élke groep komt minstens één term voor
 * - cargoAnyOf: de herkende ladingcategorie zit in de lijst
 */
function matchesRule(rule, msg, cargo) {
    if (rule.anyOf && rule.anyOf.some(term => msg.includes(term))) return true;
    if (rule.cargoAnyOf && cargo && rule.cargoAnyOf.includes(cargo)) return true;
    if (rule.allOf && rule.allOf.every(group => group.some(term => msg.includes(term)))) return true;
    return false;
}

/**
 * Analyseert de route, berekent de rijrichting en voorspelt het traject.
 */
export function analyzeTrajectory(parsedData, targetStationCode) {
    if (!parsedData.routeCodes.length || !parsedData.timestamp) {
        return { journey: null, parsedMessage: parsedData };
    }

    const { distanceMatrix, pathData, stationCoords, extrapolationRules } = getState();
    let routeCodes = [...parsedData.routeCodes];

    // --- Route-extrapolatie op basis van regels in extrapolatie.json ---
    const isCargoTrain = parsedData.cargo !== null;
    const shouldExtrapolate = (parsedData.extrapolate || isCargoTrain) && extrapolationRules;

    if (shouldExtrapolate && routeCodes.length >= 2) {
        const startCode = routeCodes[0];
        const endCode = routeCodes[routeCodes.length - 1];
        const msg = parsedData.originalMessage.toLowerCase();

        const startCoord = stationCoords[startCode];
        const endCoord = stationCoords[endCode];

        if (startCoord && endCoord && startCoord.lon !== undefined && endCoord.lon !== undefined) {
            if (Number(endCoord.lon) > Number(startCoord.lon)) {
                // OOSTWAARTS
                const eastDest = extrapolationRules.east?.append;
                if (eastDest && !routeCodes.includes(eastDest)) routeCodes.push(eastDest);
            } else {
                // WESTWAARTS: eerste regel die matcht bepaalt de bestemming
                const rule = (extrapolationRules.west || []).find(r => matchesRule(r, msg, parsedData.cargo));
                if (rule) {
                    (rule.via || []).forEach(code => {
                        if (!routeCodes.includes(code)) routeCodes.push(code);
                    });
                    if (rule.dest && !routeCodes.includes(rule.dest)) routeCodes.push(rule.dest);
                }
            }
        }
    }

    let trajectoryInfo = findFullTrajectory(routeCodes);

    // --- Veiligheids-fallback: geruisloze terugval als de traject-lijn mist ---
    if (!trajectoryInfo && routeCodes.length > parsedData.routeCodes.length) {
        routeCodes = [...parsedData.routeCodes];
        trajectoryInfo = findFullTrajectory(routeCodes);
    }

    if (!trajectoryInfo) {
        return { journey: null, parsedMessage: parsedData };
    }

    const { name, direction, stations: journeyStations } = trajectoryInfo;
    const [startHours, startMinutes] = parsedData.timestamp.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(startHours, startMinutes, 0, 0);

    let directionKey = 'WEST';
    const finalStartCoord = stationCoords[journeyStations[0]];
    const finalEndCoord = stationCoords[journeyStations[journeyStations.length - 1]];

    if (finalStartCoord && finalEndCoord && finalStartCoord.lon !== undefined && finalEndCoord.lon !== undefined) {
        directionKey = (Number(finalEndCoord.lon) > Number(finalStartCoord.lon)) ? 'OOST' : 'WEST';
    } else {
        if (name.includes('Bentheimroute')) {
            directionKey = (direction === 'forward') ? 'WEST' : 'OOST';
        } else {
            directionKey = (journeyStations.indexOf('AMF') > 0) ? 'OOST' : 'WEST';
        }
    }

    // Kopmaak-stations op deze route (uit overgangen.json): daar keert de
    // trein van rijrichting, wat extra tijd kost en in de tijdlijn zichtbaar is
    const KOPMAAK_MINUTEN = 5;
    const reversals = new Set();
    for (const [a, b, c] of getState().reversalTurns || []) {
        reversals.add(`${a}|${b}|${c}`);
        reversals.add(`${c}|${b}|${a}`);
    }

    let journey = [];
    let lastTime = new Date(startDate.getTime());
    let lastStationCode = journeyStations[0];

    for (let i = 0; i < journeyStations.length; i++) {
        const stationCode = journeyStations[i];
        let idealTime = new Date(lastTime.getTime());

        if (i > 0) {
            const distance = distanceMatrix[lastStationCode]?.[stationCode]
                || distanceMatrix[stationCode]?.[lastStationCode] || 0;
            const travelMinutes = distance ? Math.round((distance / 80) * 60) : 5;
            idealTime.setMinutes(idealTime.getMinutes() + travelMinutes);
        }

        const maaktKop = i > 0 && i < journeyStations.length - 1
            && reversals.has(`${journeyStations[i - 1]}|${stationCode}|${journeyStations[i + 1]}`);

        journey.push({
            code: stationCode,
            name: getStationByCode(stationCode)?.name_long || stationCode,
            idealTime: idealTime,
            finalTime: idealTime,
            waitTime: 0,
            kopmaken: maaktKop,
            viaPad: false // wordt true als de tijd op een goederenpad is uitgelijnd
        });

        lastTime = new Date(idealTime.getTime());
        if (maaktKop) lastTime.setMinutes(lastTime.getMinutes() + KOPMAAK_MINUTEN);
        lastStationCode = stationCode;
    }

    const targetStation = journey.find(s => s.code === targetStationCode);
    let totalDelay = 0;

    if (targetStation) {
        const pathInfo = pathData[targetStation.code]?.[directionKey];
        if (pathInfo?.length) {
            const idealMinutes = targetStation.idealTime.getMinutes();
            let targetMinute = pathInfo.sort((a, b) => a - b).find(m => m >= idealMinutes) ?? (pathInfo[0] + 60);

            const targetTime = new Date(targetStation.idealTime.getTime());
            if (targetMinute >= 60) {
                targetTime.setHours(targetTime.getHours() + 1);
                targetMinute -= 60;
            }
            targetTime.setMinutes(targetMinute, 0, 0);
            totalDelay = Math.round((targetTime - targetStation.idealTime) / 60000);
            targetStation.viaPad = true; // tijd uitgelijnd op goederenpaden.csv
        }
    }

    if (totalDelay > 0) {
        const waitStationCode = directionKey === 'WEST' ? 'AMF' : 'STO';
        const waitStationIndex = journey.findIndex(s => s.code === waitStationCode);

        if (waitStationIndex !== -1) {
            journey[waitStationIndex].waitTime = totalDelay;
            for (let i = waitStationIndex; i < journey.length; i++) {
                journey[i].finalTime = new Date(journey[i].idealTime.getTime() + totalDelay * 60000);
            }
        }
    }

    const finalJourney = journey.map(s => ({
        ...s,
        time: s.finalTime.toTimeString().substring(0, 5)
    }));

    return { journey: finalJourney, parsedMessage: parsedData };
}
