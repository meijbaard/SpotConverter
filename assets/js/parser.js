// parser.js
import { getState } from './state.js';

// Opzoektabel code -> station, éénmalig opgebouwd per stations-lijst.
// Vervangt het per-bericht compileren van ~1700 regexes; dezelfde
// voorrangsregel als getStationByCode (eerste match in de gesorteerde lijst).
let lookupCache = null;
let lookupSource = null;

function getStationLookup(stations) {
    if (lookupCache && lookupSource === stations) return lookupCache;
    const map = new Map();
    for (const station of stations) {
        if (!station.code) continue;
        const key = station.code.toLowerCase();
        if (!map.has(key)) map.set(key, station);
    }
    lookupCache = map;
    lookupSource = stations;
    return map;
}

export function parseMessage(message) {
    const parsed = {
        originalMessage: message,
        timestamp: null,
        routeCodes: [],
        spotLocation: null,
        carrier: null,
        locomotive: null,
        cargo: null,
        cargoRaw: null,            // het letterlijk herkende ladingwoord (voor berichtgeneratie)
        llt: false,                // losse lok
        stock: null,               // herkend treinstel/museummaterieel (Plan V, Mat '54, ...)
        belading: null,            // badl / ladl (containertreinen)
        hasDirectionMarker: false,
        extrapolate: false,
        kopmaken: false
    };

    // Tijdnotaties in het wild: 13:07, 19.33, 11;45, 11h23 — uren en minuten
    // gevalideerd zodat locnummers (193.150) nooit als tijd gelezen worden
    const timeMatch = message.match(/\b([01]?\d|2[0-3])[:.;hu]([0-5]\d)\b/);
    if (timeMatch) parsed.timestamp = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;

    // Vervoerders zoals de groep ze schrijft; voluit geschreven namen worden
    // naar de gangbare afkorting herleid
    const carrierWords = {
        'RFO': 'RFO', 'DBC': 'DBC', 'HSL': 'HSL', 'RTB': 'RTB', 'RTBC': 'RTBC',
        'LNS': 'LNS', 'LINEAS': 'LNS', 'SR': 'SR', 'VR': 'VR', 'TCS': 'TCS',
        'PKP': 'PKP', 'MTR': 'MTR', 'METRANS': 'MTR', 'FLP': 'FLP', 'RRF': 'RRF',
        'RXP': 'RXP', 'SBB': 'SBB', 'CDC': 'CDC', 'LTE': 'LTE', 'ERS': 'ERS',
        'ELL': 'ELL', 'CAPTRAIN': 'CT', 'DPB': 'DPB', 'DUISPORT': 'DPB',
        'FREIGHTLINER': 'FL', 'BLS': 'BLS', 'TXL': 'TXL', 'ECCO': 'ECCO',
        'RAILADVENTURE': 'RADV'
    };
    const carrierRegex = new RegExp(`\\b(${Object.keys(carrierWords).join('|')})\\b`, 'gi');
    const carrierMatch = message.match(carrierRegex);
    if (carrierMatch) parsed.carrier = carrierWords[carrierMatch[0].toUpperCase()];

    // Treinstel-/museummaterieel eerst herkennen en uit de tekst halen,
    // anders leest de loc-detectie "Mat '64" als serie 6400
    const stockPatterns = [
        [/\bplan\s*v\b/i, 'Plan V'],
        [/\bmat\s*['’]?\s*64\b/i, "Mat '64"],
        [/\bmat\s*['’]?\s*54\b/i, "Mat '54"],
        [/\bmat\s*['’]?\s*24\b/i, "Mat '24"],
        [/\bhondekop\b/i, 'Hondekop'],
        [/\bblokkendoos\b/i, "Mat '24"]
    ];
    let messageVoorLoco = message;
    for (const [regex, naam] of stockPatterns) {
        if (regex.test(message)) {
            parsed.stock = naam;
            messageVoorLoco = messageVoorLoco.replace(regex, '');
            break;
        }
    }

    // Locherkenning: langste typenummers eerst (anders kaapt 18 de series 186/189).
    // Ondersteunt ook NVR-prefixen (6193 190 -> 193 190), onbekende nummers
    // ('193 xxx') en de Duitse schrijfwijze '193er'.
    const locoRegex = /\b(10100|990[234]|6193|7193|618[69]|4402|2454|1[678]\d\d|64\d\d|38[36]|18[25679]|19[234]|248|159)(?:[\s\-.]?(\d{3}|xxx))?(er)?\b/gi;
    const nvrPrefix = { '6193': '193', '7193': '193', '6186': '186', '6189': '189' };
    const locos = [];
    for (const m of messageVoorLoco.matchAll(locoRegex)) {
        const serie = nvrPrefix[m[1]] || m[1];
        const nummer = m[2] ? m[2].toLowerCase() : null;
        locos.push(nummer ? `${serie} ${nummer}` : serie);
    }
    if (locos.length) {
        parsed.locomotive = [...new Set(locos)].join(' + ');
        if (/\b(opz|opzending)\b/i.test(message)) {
            parsed.locomotive += ' (opz)';
        }
    }

    // Losse lok (llt) en beladingsstatus (badl/ladl)
    if (/\b(llt|losse\s*lok)\b/i.test(message)) parsed.llt = true;
    const beladingMatch = message.match(/\b(badl|ladl)\b/i);
    if (beladingMatch) parsed.belading = beladingMatch[0].toLowerCase();

    // Lading classificeren (inclusief specifieke shuttlenamen én veelvoorkomende typo's)
    const cargoMap = {
        'keteltrein': 'ketel', 'ketels': 'ketel', 'ketel': 'ketel',
        'zonnebloemolie': 'ketel', 'biodiesel': 'ketel', 'styreen': 'ketel',
        'containertrein': 'container', 'containers': 'container', 'shuttle': 'container',
        'trailertrein': 'trailer', 'trailers': 'trailer',
        'dichtetrein': 'dicht', 'schuifwandwagon': 'dicht', 'dicht': 'dicht',
        'aluminium': 'dicht', 'aluminiumoxidetrein': 'dicht',
        'eanos': 'bulk', 'eanos\'en': 'bulk', 'ertstrein': 'bulk',
        'staaltrein': 'bulk', 'kolentrein': 'bulk', 'staal': 'bulk',
        'schroot': 'bulk', 'shimmens': 'bulk', 'auto': 'auto',
        'zandtrein': 'bulk', 'zand': 'bulk', 'grindtrein': 'bulk', 'grind': 'bulk',
        'houttrein': 'bulk', 'hout': 'bulk',
        'graantrein': 'graan', 'graanwagens': 'graan', 'graan': 'graan', 'eridon': 'graan',
        'gastrein': 'gas', 'gasketels': 'gas', 'gasketelwagens': 'gas', 'lpg': 'gas',
        'kalktrein': 'kalk', 'kalkwagens': 'kalk', 'kalk': 'kalk',
        'unit cargo': 'uc', 'uc': 'uc',
        'militaire': 'militair', 'militair': 'militair', 'defensie': 'militair',
        // Namen direct als trigger voor extrapolatie:
        'lovosice': 'container', 'magdeburg': 'container', 'poznań': 'container',
        'poznan': 'container', 'pcc': 'container', 'rzepin': 'container',
        'chengdu': 'container', 'nanjing': 'container', 'katy': 'container',
        'kąty': 'container', 'nosta': 'container', 'nostra': 'container',
        'brwinów': 'container', 'brwinow': 'container', 'brinow': 'container',
        'praag': 'container', 'praha': 'container', 'melnik': 'container',
        'volvo': 'container', 'pon': 'auto',
        'lotos': 'ketel'
    };

    for (const key in cargoMap) {
        if (new RegExp(`\\b${key}\\b`, 'i').test(message)) {
            parsed.cargo = cargoMap[key];
            parsed.cargoRaw = key;
            break;
        }
    }

    // Specifieke shuttlenaam heeft voorrang op generiek 'shuttle' in het gegenereerde bericht
    const shuttleNames = ['lovosice', 'magdeburg', 'poznań', 'poznan', 'pcc', 'rzepin', 'chengdu', 'nanjing', 'kąty', 'katy', 'nosta', 'brwinów', 'brwinow', 'praag', 'praha'];
    for (const name of shuttleNames) {
        if (new RegExp(`\\b${name}\\b`, 'i').test(message)) {
            parsed.cargoRaw = `${name.charAt(0).toUpperCase() + name.slice(1)} shuttle`;
            break;
        }
    }
    // Unit-cargotreinen dragen de naam van hun herkomst/bestemming (UC Onnen)
    if (/\bonnen\b/i.test(message)) parsed.cargoRaw = 'UC Onnen';
    else if (/\bbuna\b/i.test(message)) parsed.cargoRaw = 'UC Buna Werke';

    if (/(?:^|\s)(ri|ric|richting|>)(?:\s|$|\.)/i.test(message)) parsed.hasDirectionMarker = true;
    if (/(?:^|\s)(e\.v\.|ev|en verder)(?:\s|$)/i.test(message)) parsed.extrapolate = true;
    if (/(kopmaken|maakt kop|draait)/i.test(message)) parsed.kopmaken = true;

    let foundMatches = [];
    const stations = getState().stations;
    // Codes die ook een gewoon Nederlands woord zijn, matchen alleen als ze
    // exact als code geschreven staan (EN of En, niet 'en' in lopende tekst)
    const commonWords = ['en', 'in', 'op', 'te', 'de', 'het', 'een', 'met', 'van', 'tot', 'na', 'was', 'als', 'af', 'g', 'o'];
    const lookup = getStationLookup(stations);

    // Voluit getypte namen (ri Hengelo, ri Almelo) en spottersafkortingen
    // voor emplacementen en aansluitingen; 'nl' alleen exact als NL geschreven
    // ("ri NL" vanuit Duitsland = de grens over richting Bad Bentheim)
    const tokenAliases = {
        'oss': 'O',
        'hengelo': 'HGL', 'almelo': 'AML', 'deventer': 'DV', 'apeldoorn': 'APD',
        'amersfoort': 'AMF', 'zutphen': 'ZP', 'oldenzaal': 'ODZ', 'hilversum': 'HVS',
        'baarn': 'BRN', 'stroe': 'STO', 'wierden': 'WDN', 'rijssen': 'RSN',
        'borne': 'BN', 'holten': 'HON', 'bentheim': 'BH',
        'amfge': 'AMFGA', 'amfpon': 'AMF', 'kfhz': 'KFH', 'odzg': 'ODZ',
        'almbp': 'AML', 'dvg': 'DVGE', 'nl': 'BH'
    };
    const hoofdletterAliases = ['nl']; // alleen als NL/Nl geschreven, niet in lopende tekst

    // Vervoerdersafkortingen die óók een stationscode zijn (RTB = Rotterdam
    // Blaak): niet als station lezen wanneer er een locserie of 'Cargo' op volgt
    const carrierTokens = new Set(Object.keys(carrierWords));
    const locoSeries = new Set(['383', '386', '185', '186', '187', '189', '192', '193', '194',
        '248', '159', '182', '6193', '7193', '6186', '6189', '2454', '4402', '9902', '9903', '9904', '10100']);

    const probeer = (text, index) => {
        const alias = tokenAliases[text.toLowerCase()];
        if (alias && hoofdletterAliases.includes(text.toLowerCase())
            && text !== text.toUpperCase() && text !== text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()) return;
        const station = lookup.get((alias || text).toLowerCase());
        if (!station) return;
        if (!alias && commonWords.includes(station.code.toLowerCase())) {
            const cap = station.code.charAt(0).toUpperCase() + station.code.slice(1).toLowerCase();
            if (text !== station.code && text !== cap) return;
        }
        foundMatches.push({ station, index });
    };

    // Bericht in tokens knippen; codes met een spatie erin (zoals 'BLP BNK')
    // worden als tokenpaar geprobeerd
    const tokenRegex = /[A-Za-z0-9À-ÿ]+/g;
    const tokens = [];
    let tokenMatch;
    while ((tokenMatch = tokenRegex.exec(message)) !== null) {
        tokens.push({ text: tokenMatch[0], index: tokenMatch.index });
    }
    tokens.forEach((token, i) => {
        const next = tokens[i + 1];
        if (carrierTokens.has(token.text.toUpperCase()) && next
            && (locoSeries.has(next.text) || /^cargo$/i.test(next.text) || /^\d{3}/.test(next.text))) {
            return; // vervoerder, geen station
        }
        // 'UC' is bijna altijd unit cargo; alleen aan het begin van het bericht
        // kan het het raccordement Unitcentre (Waalhaven) zijn
        if (token.text.toUpperCase() === 'UC' && token.index > 0) return;
        probeer(token.text, token.index);
        if (next) probeer(`${token.text} ${next.text}`, token.index);
    });

    foundMatches.sort((a, b) => a.index - b.index);

    if (foundMatches.length > 0) {
        // Spottersafkortingen en pseudo-codes naar de interne code uit trajecten.json.
        // 'RH' is officieel Rheden, maar wordt in de groep voor Rheine gebruikt;
        // Rheden ligt op geen enkel traject, dus dit botst in de praktijk niet.
        const codeAliases = {
            'RH': 'RHEINE',
            'SALZBERGEN': 'SBG',
            'HSAL': 'SBG',
            'HBTH': 'BH'
        };
        const uniqueRouteCodes = [];
        let lastCode = null;
        foundMatches.forEach(m => {
            const code = codeAliases[m.station.code] || m.station.code;
            if (code !== lastCode) {
                uniqueRouteCodes.push(code);
                lastCode = code;
            }
        });
        parsed.spotLocation = foundMatches[0].station;
        parsed.routeCodes = uniqueRouteCodes;

        // Vrije-veldlocatie tussen twee stations ("Nieuwedijk (Hon - Dvc)",
        // "Bn/Hgl") vóór het richtingsdeel: houd van het paar het station aan
        // dat het dichtst bij het ri-doel ligt, zodat de tijdlijn begint bij
        // het eerstvolgende station dat de trein bereikt.
        const riIndex = message.search(/\b(ri|ric|richting)\b/i);
        const pairMatch = message.match(/\(?\b[A-Za-zÀ-ÿ]{2,10}\s*[-–/]\s*[A-Za-zÀ-ÿ]{2,10}\b\)?/);
        if (riIndex !== -1 && pairMatch && pairMatch.index < riIndex && parsed.routeCodes.length >= 3
            && foundMatches.length >= 2) {
            const inPaar = m => m.index >= pairMatch.index && m.index < pairMatch.index + pairMatch[0].length;
            const codeVan = m => codeAliases[m.station.code] || m.station.code;
            if (inPaar(foundMatches[0]) && inPaar(foundMatches[1])
                && codeVan(foundMatches[0]) === parsed.routeCodes[0]
                && codeVan(foundMatches[1]) === parsed.routeCodes[1]) {
                const coords = getState().stationCoords || {};
                const doel = coords[parsed.routeCodes[parsed.routeCodes.length - 1]];
                const ca = coords[parsed.routeCodes[0]];
                const cb = coords[parsed.routeCodes[1]];
                if (doel && ca && cb) {
                    const afstand2 = c => (Number(c.lat) - Number(doel.lat)) ** 2 + (Number(c.lon) - Number(doel.lon)) ** 2;
                    const houdTweede = afstand2(cb) < afstand2(ca);
                    parsed.routeCodes.splice(houdTweede ? 0 : 1, 1);
                    parsed.spotLocation = foundMatches[houdTweede ? 1 : 0].station;
                }
            }
        }
    }

    return parsed;
}
