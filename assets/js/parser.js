// parser.js
import { getState } from './state.js';

export function parseMessage(message) {
    const parsed = {
        originalMessage: message, 
        timestamp: null, 
        routeCodes: [], 
        spotLocation: null,
        carrier: null, 
        locomotive: null, 
        cargo: null,
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
    
    const locoRegex = /(\b(18|64|186|189|193|2454|4402|9902|9904|10100)[\s-]?\d*\b)/gi;
    const locoMatch = message.match(locoRegex);
    if (locoMatch) {
        parsed.locomotive = [...new Set(locoMatch)].join(' + ');
        if (/\b(opz|opzending)\b/i.test(message)) {
            parsed.locomotive += ' (opz)';
        }
    }

// 4. Lading classificeren (Nu inclusief specifieke shuttlenamen én veelvoorkomende typo's)
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
            break; 
        }
    }

    if (/(?:^|\s)(ri|richting|>)(?:\s|$)/i.test(message)) parsed.hasDirectionMarker = true;
    if (/(?:^|\s)(e\.v\.|ev|en verder)(?:\s|$)/i.test(message)) parsed.extrapolate = true;
    if (/(kopmaken|maakt kop|draait)/i.test(message)) parsed.kopmaken = true;

    let foundMatches = [];
    const stations = getState().stations;
    const commonWords = ['en', 'in', 'op', 'te', 'de', 'het', 'een', 'met', 'van', 'tot'];
    
    stations.forEach(station => {
        if (!station.code) return;
        let regex;
        if (commonWords.includes(station.code.toLowerCase())) {
            regex = new RegExp(`\\b(${station.code}|${station.code.charAt(0).toUpperCase() + station.code.slice(1).toLowerCase()})\\b`, 'g');
        } else {
            regex = new RegExp(`\\b(${station.code})\\b`, 'gi');
        }
        let match;
        while ((match = regex.exec(message)) !== null) {
            foundMatches.push({ station, index: match.index });
        }
    });
    
    foundMatches.sort((a, b) => a.index - b.index);
    
    if (foundMatches.length > 0) {
        const uniqueRouteCodes = [];
        let lastCode = null;
        foundMatches.forEach(m => {
            if (m.station.code !== lastCode) {
                uniqueRouteCodes.push(m.station.code);
                lastCode = m.station.code;
            }
        });
        parsed.spotLocation = foundMatches[0].station;
        parsed.routeCodes = uniqueRouteCodes;
    }
    
    return parsed;
}