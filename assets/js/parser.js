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
        // --- VLAGGEN VOOR FASE 3 & 4 ---
        hasDirectionMarker: false, 
        extrapolate: false,        
        kopmaken: false            
    };

    // 1. Tijd extraheren
    const timeMatch = message.match(/(\d{1,2}[:.]\d{2})/g);
    if (timeMatch) parsed.timestamp = timeMatch[0].replace('.', ':');

    // 2. Vervoerder detecteren
    const carriers = ['RFO', 'DBC', 'HSL', 'RTB', 'RTBC', 'LNS', 'SR', 'VR', 'TCS', 'PKP', 'MTR', 'FLP', 'RRF', 'RXP', 'SBB', 'CDC', 'LTE'];
    const carrierRegex = new RegExp(`\\b(${carriers.join('|')})\\b`, 'gi');
    const carrierMatch = message.match(carrierRegex);
    if (carrierMatch) parsed.carrier = carrierMatch[0].toUpperCase();
    
    // 3. Meervoudige tractie & opzending detecteren
    const locoRegex = /(\b(18|64|186|189|193|2454|4402|9902|9904|10100)[\s-]?\d*\b)/gi;
    const locoMatch = message.match(locoRegex);
    if (locoMatch) {
        parsed.locomotive = [...new Set(locoMatch)].join(' + ');
        if (/\b(opz|opzending)\b/i.test(message)) {
            parsed.locomotive += ' (opz)';
        }
    }

    // 4. Lading classificeren
    const cargoMap = {
        'keteltrein': 'ketel', 'ketels': 'ketel', 'ketel': 'ketel',
        'containertrein': 'container', 'containers': 'container',
        'trailertrein': 'trailer', 'trailers': 'trailer',
        'dichtetrein': 'dicht', 'schuifwandwagon': 'dicht', 'dicht': 'dicht',
        'eanos': 'bulk', 'eanos\'en': 'bulk', 'ertstrein': 'bulk', 'staaltrein': 'bulk', 'kolentrein': 'bulk'
    };
    for (const key in cargoMap) {
        if (new RegExp(`\\b${key}\\b`, 'i').test(message)) {
            parsed.cargo = cargoMap[key];
            break; 
        }
    }

    // 5. Context & Preposities detecteren
    if (/\b(ri|richting|>)\b/i.test(message)) {
        parsed.hasDirectionMarker = true;
    }
    if (/\b(e\.v\.|ev|en verder)\b/i.test(message)) {
        parsed.extrapolate = true;
    }
    if (/\b(kopmaken|maakt kop|draait)\b/i.test(message)) {
        parsed.kopmaken = true;
    }

    // 6. Stations zoeken met uitsluiting van valse positieven
    let foundMatches = [];
    const stations = getState().stations;
    
    // Woorden die in normaal taalgebruik voorkomen, moeten case-sensitive gecheckt worden
    const commonWords = ['en', 'in', 'op', 'te', 'de', 'het', 'een', 'met', 'van', 'tot'];
    
    stations.forEach(station => {
        if (!station.code) return;
        
        let regex;
        if (commonWords.includes(station.code.toLowerCase())) {
            // Als de code overeenkomt met een veelvoorkomend woord, eisen we dat het begint met een hoofdletter (bijv. 'En' in plaats van 'en')
            regex = new RegExp(`\\b(${station.code}|${station.code.charAt(0).toUpperCase() + station.code.slice(1).toLowerCase()})\\b`, 'g');
        } else {
            // Anders zoeken we case-insensitive
            regex = new RegExp(`\\b(${station.code})\\b`, 'gi');
        }

        let match;
        while ((match = regex.exec(message)) !== null) {
            foundMatches.push({ station, index: match.index });
        }
    });
    
    // Sorteer op volgorde van verschijnen in de tekst
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