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
        cargo: null
    };

    // 1. Tijd extraheren
    const timeMatch = message.match(/(\d{1,2}[:.]\d{2})/g);
    if (timeMatch) parsed.timestamp = timeMatch[0].replace('.', ':');

    // 2. Vervoerder detecteren
    const carriers = ['RFO', 'DBC', 'HSL', 'RTB', 'RTBC', 'LNS', 'SR', 'VR', 'TCS', 'PKP', 'MTR', 'FLP', 'RRF', 'RXP', 'SBB', 'CDC', 'LTE'];
    const carrierRegex = new RegExp(`\\b(${carriers.join('|')})\\b`, 'gi');
    const carrierMatch = message.match(carrierRegex);
    if (carrierMatch) parsed.carrier = carrierMatch[0].toUpperCase();
    
    // 3. Locomotief detecteren
    const locoRegex = /(\b(18|64|186|189|193|2454|4402|9902|9904|10100)[\s-]?\d*\b)/gi;
    const locoMatch = message.match(locoRegex);
    if (locoMatch) parsed.locomotive = locoMatch[0];

    // 4. Lading classificeren
    const cargoMap = {
        'keteltrein': 'ketel', 
        'containertrein': 'container', 
        'trailertrein': 'trailer', 
        'dichtetrein': 'dicht', 
        'schuifwandwagon': 'dicht'
    };
    for (const key in cargoMap) {
        if (new RegExp(`\\b${key}\\b`, 'i').test(message)) {
            parsed.cargo = cargoMap[key];
            break; 
        }
    }

    // 5. Stations in de tekst zoeken via de ingeladen state
    let foundMatches = [];
    const stations = getState().stations;
    
    stations.forEach(station => {
        if (!station.code) return;
        const regex = new RegExp(`\\b(${station.code})\\b`, 'gi');
        let match;
        while ((match = regex.exec(message)) !== null) {
            foundMatches.push({ station, index: match.index });
        }
    });
    
    // Sorteren op de volgorde waarin ze in het bericht staan
    foundMatches.sort((a, b) => a.index - b.index);
    if (foundMatches.length > 0) {
        parsed.spotLocation = foundMatches[0].station;
        parsed.routeCodes = foundMatches.map(m => m.station.code);
    }
    
    return parsed;
}