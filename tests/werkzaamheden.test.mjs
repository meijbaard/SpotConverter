import { test, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { laadTestData } from './helpers/data.mjs';
import { updateState } from '../assets/js/state.js';
import { parseMessage } from '../assets/js/parser.js';
import { analyzeTrajectory, werkzaamhedenOpRoute } from '../assets/js/routing.js';

before(() => laadTestData());

const iso = (dagenOffset, uur) => {
    const d = new Date();
    d.setDate(d.getDate() + dagenOffset);
    d.setHours(uur, 0, 0, 0);
    return d.toISOString();
};

const WEESP = {
    id: 'test-weesp', type: 'MAINTENANCE', titel: 'Werkzaamheden rond Weesp',
    van: iso(-1, 1), tot: iso(1, 5),
    stations: ['ASDM', 'DMN', 'WP', 'NDB', 'BSMZ', 'AMF'],
    gevolg: 'geen treinverkeer mogelijk'
};

beforeEach(() => updateState('werkzaamheden', [WEESP]));

function journeyVan(msg) {
    return analyzeTrajectory(parseMessage(msg), null).journey;
}

test('route door het werkgebied (Bh ri Asd via Weesp) matcht', () => {
    const journey = journeyVan('13:07 Bh ri Asd RFO 193 150 met keteltrein');
    const raak = werkzaamhedenOpRoute(journey);
    assert.equal(raak.length, 1);
    assert.equal(raak[0].titel, 'Werkzaamheden rond Weesp');
});

test('route buiten het werkgebied (Amf ri Ht) matcht niet', () => {
    const journey = journeyVan('13:07 Amf ri Ht RFO 193 150 met keteltrein');
    assert.equal(werkzaamhedenOpRoute(journey).length, 0);
});

test('verlopen werkzaamheden matchen niet', () => {
    updateState('werkzaamheden', [{ ...WEESP, van: iso(-9, 1), tot: iso(-7, 5) }]);
    const journey = journeyVan('13:07 Bh ri Asd RFO 193 150 met keteltrein');
    assert.equal(werkzaamhedenOpRoute(journey).length, 0);
});

test('toekomstige werkzaamheden buiten de reis matchen niet', () => {
    updateState('werkzaamheden', [{ ...WEESP, van: iso(7, 1), tot: iso(9, 5) }]);
    const journey = journeyVan('13:07 Bh ri Asd RFO 193 150 met keteltrein');
    assert.equal(werkzaamhedenOpRoute(journey).length, 0);
});

test('route die alleen een randstation aandoet (Amf ri Apd) matcht niet', () => {
    // Amf staat wél in het Weesp-werkgebied, maar de Bentheimroute zelf niet:
    // één gedeeld station is geen geraakte route
    const journey = journeyVan('13:07 Amf ri Apd RFO 193 150 met keteltrein');
    assert.equal(werkzaamhedenOpRoute(journey).length, 0);
});

test('lege of ontbrekende lijst geeft lege uitkomst', () => {
    updateState('werkzaamheden', []);
    const journey = journeyVan('13:07 Bh ri Asd RFO 193 150 met keteltrein');
    assert.deepEqual(werkzaamhedenOpRoute(journey), []);
    assert.deepEqual(werkzaamhedenOpRoute(null), []);
});
