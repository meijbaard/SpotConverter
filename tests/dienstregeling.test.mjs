import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { laadTestData } from './helpers/data.mjs';
import { parseMessage } from '../assets/js/parser.js';
import { analyzeTrajectory } from '../assets/js/routing.js';
import { buildDienstregeling, dienstregelingTekst, materieelTekst } from '../assets/js/dienstregeling.js';
import { dienstregelingPdf } from '../assets/js/pdfstaat.js';

before(() => laadTestData());

function staatVan(msg, target = null) {
    const analysis = analyzeTrajectory(parseMessage(msg), target);
    return { analysis, staat: buildDienstregeling(analysis, new Date(2026, 6, 3)) };
}

test('doorkomststaat: eerste rij V, laatste rij A, tussenliggend D', () => {
    const { analysis, staat } = staatVan('13:07 Bh ri Asd RFO 193 150 met keteltrein');
    assert.ok(staat, 'staat gebouwd');

    assert.equal(staat.rijen[0].type, 'V');
    assert.equal(staat.rijen[0].code, 'BH');
    assert.equal(staat.rijen[0].tijd, '13:07');

    const laatste = staat.rijen.at(-1);
    assert.equal(laatste.type, 'A');
    assert.equal(laatste.code, 'ASD');
    assert.equal(laatste.tijd, analysis.journey.at(-1).time);

    assert.ok(staat.rijen.slice(1, -1).every(r => 'VDA'.includes(r.type)));
    assert.ok(staat.rijen.some(r => r.type === 'D'), 'doorkomsten aanwezig');
});

test('doorkomststaat: kopregels bevatten datum, materieel en rijsnelheid', () => {
    const { staat } = staatVan('13:07 Bh ri Asd RFO 193 150 met keteltrein');
    assert.equal(staat.datumRegel, 'DATUM: VRIJDAG 03 JUL 2026');
    assert.match(staat.overzichtRegel, /^\(BH V 13:07 - ASD A \d{2}:\d{2}\)$/);
    assert.match(staat.materieelRegel, /RFO 193 150 met keteltrein/);
    assert.match(staat.snelheidRegel, /80 km\/u/);
    assert.equal(staat.bestandsnaam, 'dienstregeling-bh-asd.pdf');
});

test('doorkomststaat: uitgeschreven stationsnamen in de rijen', () => {
    const { staat } = staatVan('13:07 Bh ri Asd RFO 193 150 met keteltrein');
    const tekst = dienstregelingTekst(staat);
    assert.match(tekst, /Bad Bentheim/);
    assert.match(tekst, /Amersfoort/);
    assert.match(tekst, /V = vertrek/);
});

test('materieeltekst: valt terug op "tractie onbekend"', () => {
    assert.equal(materieelTekst(parseMessage('10:30 Amf ri Mvt')), 'tractie onbekend');
});

test('pdf: geldige structuur met Courier en alle stations', () => {
    const { staat } = staatVan('13:07 Bh ri Asd RFO 193 150 met keteltrein');
    const bytes = dienstregelingPdf(staat);
    const inhoud = Buffer.from(bytes).toString('latin1');

    assert.ok(inhoud.startsWith('%PDF-1.4'));
    assert.ok(inhoud.trimEnd().endsWith('%%EOF'));
    assert.match(inhoud, /\/BaseFont \/Courier/);
    assert.match(inhoud, /Bad Bentheim/);
    assert.match(inhoud, /DIENSTREGELING/);

    // xref-offsets moeten byte-exact naar "N 0 obj" wijzen
    const xrefStart = Number(inhoud.match(/startxref\n(\d+)/)[1]);
    assert.equal(inhoud.slice(xrefStart, xrefStart + 4), 'xref');
    const offsets = [...inhoud.matchAll(/^(\d{10}) 00000 n /gm)].map(m => Number(m[1]));
    offsets.forEach((offset, i) => {
        assert.equal(inhoud.slice(offset, offset + `${i + 1} 0 obj`.length), `${i + 1} 0 obj`);
    });
});

test('pdf: lange route wordt over meerdere pagina\'s verdeeld', () => {
    const { staat } = staatVan('08:00 Lw ri Gvc');
    assert.ok(staat, 'lange route gevonden');
    const inhoud = Buffer.from(dienstregelingPdf(staat)).toString('latin1');
    const paginas = Number(inhoud.match(/\/Count (\d+)/)[1]);
    assert.ok(paginas >= 1);
    assert.equal((inhoud.match(/\/Type \/Page[^s]/g) || []).length, paginas);
});
