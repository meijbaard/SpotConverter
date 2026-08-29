// pdfstaat.js — schrijft de doorkomststaat als PDF, zonder externe
// bibliotheken. Courier is een van de veertien standaard PDF-fonts en hoeft
// dus niet ingesloten te worden; alle tekst past binnen WinAnsi (latin-1).
// Het SpotConverter-logo wordt met dezelfde beziercurven getekend als het
// merk-SVG in index.html.

import { dienstregelingRijRegels } from './dienstregeling.js';

const PAGINA_B = 595.28;   // A4 in punten
const PAGINA_H = 841.89;
const MARGE = 56;
const KADER_PAD = 14;
const FONTGROOTTE = 9;
const REGEL_H = 13;

// Huisstijlkleuren als PDF-kleuroperanden (0..1)
const GROEN = '0.169 0.361 0.271';
const CREME = '0.980 0.973 0.949';
const INKT = '0.133 0.188 0.165';
const GEDIMD = '0.482 0.525 0.494';

const n2 = x => (Math.round(x * 100) / 100).toString();

/** Tekst veilig maken voor een PDF-string: escapes en WinAnsi (latin-1). */
function pdfTekst(str) {
    return String(str)
        .split('')
        .map(ch => (ch.charCodeAt(0) > 255 ? '?' : ch))
        .join('')
        .replace(/\\/g, '\\\\')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)');
}

function tekstOp(x, y, tekst, { font = 'F1', grootte = FONTGROOTTE, kleur = INKT } = {}) {
    return `${kleur} rg BT /${font} ${n2(grootte)} Tf ${n2(x)} ${n2(y)} Td (${pdfTekst(tekst)}) Tj ET\n`;
}

/** Het merk: groene cirkel met de crème golf uit het SVG-logo, plus woordmerk. */
function logoOps(cx, cy) {
    const r = 20;
    const k = 0.5523 * r;
    let ops = `${GROEN} rg\n`;
    ops += `${n2(cx + r)} ${n2(cy)} m\n`;
    ops += `${n2(cx + r)} ${n2(cy + k)} ${n2(cx + k)} ${n2(cy + r)} ${n2(cx)} ${n2(cy + r)} c\n`;
    ops += `${n2(cx - k)} ${n2(cy + r)} ${n2(cx - r)} ${n2(cy + k)} ${n2(cx - r)} ${n2(cy)} c\n`;
    ops += `${n2(cx - r)} ${n2(cy - k)} ${n2(cx - k)} ${n2(cy - r)} ${n2(cx)} ${n2(cy - r)} c\n`;
    ops += `${n2(cx + k)} ${n2(cy - r)} ${n2(cx + r)} ${n2(cy - k)} ${n2(cx + r)} ${n2(cy)} c\n`;
    ops += 'f\n';

    // Golf uit het SVG (viewBox 0 0 100 35), geschaald in de cirkel
    const s = 0.24;
    const tx = x => cx - 12 + s * x;
    const ty = y => cy + s * (17.5 - y);
    ops += `${CREME} RG ${n2(8 * s)} w 1 J 1 j\n`;
    ops += `${n2(tx(5))} ${n2(ty(15))} m\n`;
    ops += `${n2(tx(5))} ${n2(ty(5))} ${n2(tx(15))} ${n2(ty(5))} ${n2(tx(25))} ${n2(ty(15))} c\n`;
    ops += `${n2(tx(35))} ${n2(ty(25))} ${n2(tx(45))} ${n2(ty(35))} ${n2(tx(55))} ${n2(ty(25))} c\n`;
    ops += `${n2(tx(65))} ${n2(ty(15))} ${n2(tx(75))} ${n2(ty(15))} ${n2(tx(85))} ${n2(ty(25))} c\n`;
    ops += 'S\n';
    ops += `${n2(tx(75))} ${n2(ty(15))} m\n`;
    ops += `${n2(tx(75))} ${n2(ty(5))} ${n2(tx(85))} ${n2(ty(5))} ${n2(tx(95))} ${n2(ty(15))} c\n`;
    ops += 'S\n';

    ops += tekstOp(cx + r + 12, cy - 5.5, 'SpotConverter', { font: 'F2', grootte: 15 });
    return ops;
}

/** Eén pagina: kader met regels, plus (op pagina 1) logo en titel. */
function paginaOps(regels, { eerstePagina, titel }) {
    let ops = '';
    let kaderTop = PAGINA_H - MARGE;

    if (eerstePagina) {
        const cy = PAGINA_H - MARGE - 20;
        ops += logoOps(MARGE + 20, cy);
        ops += tekstOp(MARGE, cy - 20 - 24, titel, { font: 'F2', grootte: 10.5 });
        kaderTop = cy - 20 - 40;
    }

    const kaderHoogte = 2 * KADER_PAD + regels.length * REGEL_H;
    const kaderBodem = kaderTop - kaderHoogte;
    ops += `${INKT} RG 1 w ${n2(MARGE)} ${n2(kaderBodem)} ${n2(PAGINA_B - 2 * MARGE)} ${n2(kaderHoogte)} re S\n`;

    regels.forEach((regel, i) => {
        if (!regel.t) return;
        const y = kaderTop - KADER_PAD - FONTGROOTTE - i * REGEL_H + 2;
        ops += tekstOp(MARGE + KADER_PAD, y, regel.t, { font: regel.vet ? 'F2' : 'F1' });
    });

    ops += tekstOp(MARGE, kaderBodem - 16, 'Berekend door SpotConverter · spotconverter.markeijbaard.nl',
        { grootte: 7.5, kleur: GEDIMD });
    return ops;
}

/** Assembleert het PDF-bestand (xref-offsets zijn byte-exact: alles is latin-1). */
function pdfBestand(paginaStreams) {
    const objecten = [
        '<< /Type /Catalog /Pages 2 0 R >>',
        '', // Pages: ingevuld zodra de paginanummers bekend zijn
        '<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>',
        '<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold /Encoding /WinAnsiEncoding >>'
    ];
    const paginaNummers = [];
    paginaStreams.forEach(stream => {
        const paginaNr = objecten.length + 1;
        paginaNummers.push(paginaNr);
        objecten.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n2(PAGINA_B)} ${n2(PAGINA_H)}] `
            + `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${paginaNr + 1} 0 R >>`);
        objecten.push(`<< /Length ${stream.length} >>\nstream\n${stream}endstream`);
    });
    objecten[1] = `<< /Type /Pages /Kids [${paginaNummers.map(nr => `${nr} 0 R`).join(' ')}] /Count ${paginaStreams.length} >>`;

    let pdf = '%PDF-1.4\n';
    const offsets = [];
    objecten.forEach((inhoud, i) => {
        offsets.push(pdf.length);
        pdf += `${i + 1} 0 obj\n${inhoud}\nendobj\n`;
    });

    const xrefStart = pdf.length;
    pdf += `xref\n0 ${objecten.length + 1}\n0000000000 65535 f \n`;
    offsets.forEach(offset => {
        pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${objecten.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

    const bytes = new Uint8Array(pdf.length);
    for (let i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 0xff;
    return bytes;
}

/** Bouwt de PDF-bytes voor een doorkomststaat. */
export function dienstregelingPdf(staat) {
    const regels = [
        { t: staat.datumRegel, vet: true },
        { t: '' },
        { t: staat.overzichtRegel },
        { t: staat.materieelRegel },
        { t: staat.snelheidRegel },
        { t: '' },
        ...dienstregelingRijRegels(staat).map(t => ({ t })),
        { t: '' },
        { t: staat.legendaRegel }
    ];

    // Pagineren: pagina 1 begint onder logo en titel, vervolgpagina's bovenaan
    const capaciteit = eerste => {
        const kaderTop = PAGINA_H - MARGE - (eerste ? 80 : 0);
        return Math.floor((kaderTop - MARGE - 24 - 2 * KADER_PAD) / REGEL_H);
    };

    const streams = [];
    let rest = regels;
    while (rest.length) {
        const eerstePagina = streams.length === 0;
        const deel = rest.slice(0, capaciteit(eerstePagina));
        rest = rest.slice(deel.length);
        streams.push(paginaOps(deel, { eerstePagina, titel: 'DIENSTREGELING' }));
    }

    return pdfBestand(streams);
}

/** Genereert de PDF en biedt hem als download aan. */
export function downloadDienstregelingPdf(staat) {
    const blob = new Blob([dienstregelingPdf(staat)], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = staat.bestandsnaam;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
}
