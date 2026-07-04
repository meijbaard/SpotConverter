// message.js — genereert een groepsregel-conform WhatsApp-bericht op basis van de analyse.
//
// Groepsregels waar dit bericht aan voldoet:
// - Gouden Formule: [Tijd] [Station] [Richting] [Vervoerder] [Tractie] [Lading]
// - Afkortingen van plaatsnamen hebben de voorkeur
// - "tractie onbekend" als er geen loc herkend is
// - "llt" voor een losse lok, badl/ladl bij containertreinen indien gemeld
// - Geen emoji's, geen aannames in de kernmelding
// - Verwachte doorkomst is optioneel en expliciet gemarkeerd als pad-berekening

const SITE = 'spotconverter.markeijbaard.nl';

/**
 * Bouwt het spotbericht. `includeEta` voegt een tweede regel toe met de
 * verwachte doorkomst volgens het berekende goederenpad.
 */
export function buildGroupMessage(analysis, { includeEta = true, targetCode = null } = {}) {
    const p = analysis.parsedMessage;
    if (!p || !p.timestamp || !p.spotLocation) return '';

    const parts = [];
    if (p.timestamp) parts.push(p.timestamp);
    if (p.spotLocation?.code) parts.push(p.spotLocation.code);
    if (p.routeCodes.length > 1) parts.push(`ri ${p.routeCodes[1]}`);
    if (p.carrier) parts.push(p.carrier);
    parts.push(p.locomotive || 'tractie onbekend');

    if (p.llt) {
        parts.push('llt');
    } else if (p.cargoRaw) {
        let lading = `met ${p.cargoRaw}`;
        if (p.belading && p.cargo === 'container') lading += ` (${p.belading})`;
        parts.push(lading);
    }

    let message = parts.join(' ');

    if (includeEta && analysis.journey?.length > 1) {
        const journey = analysis.journey;
        const target = (targetCode && journey.find(s => s.code === targetCode && s.code !== journey[0].code))
            || journey[journey.length - 1];

        if (target && target.code !== journey[0].code) {
            let etaLine = `Verwacht ${target.code} ±${target.time}`;
            const waitStation = journey.find(s => s.waitTime > 0);
            if (waitStation) {
                etaLine += `, na ±${waitStation.waitTime} min wachttijd ${waitStation.code}`;
            }
            etaLine += ` (pad via ${SITE})`;
            message += `\n${etaLine}`;
        }
    }

    return message;
}
