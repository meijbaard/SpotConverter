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

    const timeMatch = message.match(/(\d{1,2}[:.]\d{2})/g);
    if (timeMatch) parsed.timestamp = timeMatch[0].replace('.', ':');

    const carriers = ['RFO', 'DBC', 'HSL', 'RTB', 'RTBC', 'LNS', 'SR', 'VR', 'TCS', 'PKP', 'MTR', 'FLP', 'RRF', 'RXP', 'SBB', 'CDC', 'LTE'];
    const carrierRegex = new RegExp(`\\b(${carriers.join('|')})\\b`, 'gi');
    const carrierMatch = message.match(carrierRegex);
    if (carrierMatch) parsed.carrier = carrierMatch[0].toUpperCase();

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

    // Langste typenummers eerst, anders 'kaapt' 18 de series 186/189 (bug: '189 024' werd '189')
    const locoRegex = /(\b(10100|9902|9904|4402|2454|186|189|193|64|18)[\s-]?\d*\b)/gi;
    const locoMatch = messageVoorLoco.match(locoRegex);
    if (locoMatch) {
        parsed.locomotive = [...new Set(locoMatch)].join(' + ');
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
        // Namen direct als trigger voor extrapolatie:
        'lovosice': 'container', 'magdeburg': 'container', 'poznań': 'container',
        'poznan': 'container', 'pcc': 'container', 'rzepin': 'container',
        'chengdu': 'container', 'nanjing': 'container', 'katy': 'container',
        'kąty': 'container', 'nosta': 'container', 'nostra': 'container',
        'brwinów': 'container', 'brwinow': 'container', 'brinow': 'container',
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
    const shuttleNames = ['lovosice', 'magdeburg', 'poznań', 'poznan', 'pcc', 'rzepin', 'chengdu', 'nanjing', 'kąty', 'katy', 'nosta', 'brwinów', 'brwinow'];
    for (const name of shuttleNames) {
        if (new RegExp(`\\b${name}\\b`, 'i').test(message)) {
            parsed.cargoRaw = `${name.charAt(0).toUpperCase() + name.slice(1)} shuttle`;
            break;
        }
    }

    if (/(?:^|\s)(ri|richting|>)(?:\s|$)/i.test(message)) parsed.hasDirectionMarker = true;
    if (/(?:^|\s)(e\.v\.|ev|en verder)(?:\s|$)/i.test(message)) parsed.extrapolate = true;
    if (/(kopmaken|maakt kop|draait)/i.test(message)) parsed.kopmaken = true;

    let foundMatches = [];
    const stations = getState().stations;
    // Codes die ook een gewoon Nederlands woord zijn, matchen alleen als ze
    // exact als code geschreven staan (EN of En, niet 'en' in lopende tekst)
    const commonWords = ['en', 'in', 'op', 'te', 'de', 'het', 'een', 'met', 'van', 'tot', 'na', 'was', 'als', 'af', 'g', 'o'];
    const lookup = getStationLookup(stations);

    // Voluit getypte namen voor stations met een onbruikbaar korte code
    const tokenAliases = { 'oss': 'O' };

    const probeer = (text, index) => {
        const alias = tokenAliases[text.toLowerCase()];
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
        probeer(token.text, token.index);
        if (i + 1 < tokens.length) probeer(`${token.text} ${tokens[i + 1].text}`, token.index);
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
    }

    return parsed;
}
