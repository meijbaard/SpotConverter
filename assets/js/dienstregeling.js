// dienstregeling.js — bouwt uit de analyse een doorkomststaat in de stijl van
// klassieke dienstregelingen: per station de afkorting, de voluit geschreven
// naam en V (vertrek) / D (doorkomst) / A (aankomst) met tijd. Bij wachttijd
// en kopmaken krijgt het station een A- én een V-regel.

import { KOPMAAK_MINUTEN, REKEN_SNELHEID_KMU } from './routing.js';
import { shortCode } from './message.js';

const HHMM = d => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

function datumTekst(datum) {
    const weekdag = datum.toLocaleDateString('nl-NL', { weekday: 'long' });
    const maand = datum.toLocaleDateString('nl-NL', { month: 'short' }).replace('.', '');
    return `${weekdag} ${String(datum.getDate()).padStart(2, '0')} ${maand} ${datum.getFullYear()}`.toUpperCase();
}

/** Materieel als tekst, volgens dezelfde regels als het groepsbericht. */
export function materieelTekst(p) {
    const parts = [];
    if (p.carrier) parts.push(p.carrier);
    parts.push(p.locomotive || p.stock || 'tractie onbekend');
    if (p.llt) {
        parts.push('llt (losse loc)');
    } else if (p.cargoRaw) {
        let lading = `met ${p.cargoRaw}`;
        if (p.belading && p.cargo === 'container') lading += ` (${p.belading})`;
        parts.push(lading);
    }
    return parts.join(' ');
}

/**
 * Bouwt de doorkomststaat: kopregels plus rijen { code, naam, type, tijd }.
 * Geeft null terug als er geen berekende reis is.
 */
export function buildDienstregeling(analysis, datum = new Date()) {
    const journey = analysis.journey;
    if (!journey || journey.length < 2) return null;

    const laatste = journey.length - 1;
    const rijen = [];

    // Toelichtingen tussen haakjes horen niet in een klassieke staat en
    // maken de naamkolom onnodig breed ("Oosterdoksluis (brug tussen ...)")
    const kortNaam = naam => {
        const kaal = naam.replace(/\s*\(.*\)\s*$/, '');
        return kaal.length > 30 ? kaal.slice(0, 29) + '…' : kaal;
    };

    journey.forEach((station, i) => {
        const basis = { code: shortCode(station.code), naam: kortNaam(station.name) };
        if (i === 0) {
            rijen.push({ ...basis, type: 'V', tijd: HHMM(station.finalTime) });
        } else if (i === laatste) {
            rijen.push({ ...basis, type: 'A', tijd: HHMM(station.finalTime) });
        } else if (station.waitTime > 0) {
            // finalTime is het vertrek (na de wachttijd); de aankomst ligt ervoor
            const aankomst = new Date(station.finalTime.getTime() - station.waitTime * 60000);
            rijen.push({ ...basis, type: 'A', tijd: HHMM(aankomst) });
            rijen.push({ ...basis, type: 'V', tijd: HHMM(station.finalTime) });
        } else if (station.kopmaken) {
            const vertrek = new Date(station.finalTime.getTime() + KOPMAAK_MINUTEN * 60000);
            rijen.push({ ...basis, type: 'A', tijd: HHMM(station.finalTime) });
            rijen.push({ ...basis, type: 'V', tijd: HHMM(vertrek) });
        } else {
            rijen.push({ ...basis, type: 'D', tijd: HHMM(station.finalTime) });
        }
    });

    const eerste = rijen[0];
    const eind = rijen[rijen.length - 1];

    return {
        datumRegel: `DATUM: ${datumTekst(datum)}`,
        overzichtRegel: `(${eerste.code} V ${eerste.tijd} - ${eind.code} A ${eind.tijd})`,
        materieelRegel: `MATERIEEL   : ${materieelTekst(analysis.parsedMessage)}`,
        snelheidRegel: `RIJSNELHEID : ±${analysis.avgSpeedKmu || REKEN_SNELHEID_KMU} km/u (verwacht)`,
        legendaRegel: 'V = vertrek · D = doorkomst · A = aankomst',
        bronRegel: 'Berekend door SpotConverter · spotconverter.markeijbaard.nl',
        rijen,
        bestandsnaam: `dienstregeling-${eerste.code.toLowerCase()}-${eind.code.toLowerCase()}.pdf`
    };
}

/** De stationsrijen als uitgelijnde monospace-regels (voor voorbeeld en PDF). */
export function dienstregelingRijRegels(staat) {
    const codeBreedte = Math.max(4, ...staat.rijen.map(r => r.code.length));
    const naamBreedte = Math.max(...staat.rijen.map(r => r.naam.length));
    return staat.rijen.map(r =>
        `${r.code.padEnd(codeBreedte + 2)}${r.naam.padEnd(naamBreedte + 2)}${r.type} ${r.tijd}`
    );
}

/** Volledige staat als platte tekst (het voorbeeld op de pagina). */
export function dienstregelingTekst(staat) {
    return [
        staat.datumRegel,
        '',
        staat.overzichtRegel,
        staat.materieelRegel,
        staat.snelheidRegel,
        '',
        ...dienstregelingRijRegels(staat),
        '',
        staat.legendaRegel
    ].join('\n');
}
