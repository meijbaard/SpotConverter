import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { laadTestData } from './helpers/data.mjs';
import { parseMessage } from '../assets/js/parser.js';

before(() => laadTestData());

test('gouden formule: tijd, station, richting, vervoerder, loc, lading', () => {
    const p = parseMessage('13:07 Bh ri Asd RFO 193 150 met keteltrein');
    assert.equal(p.timestamp, '13:07');
    assert.deepEqual(p.routeCodes, ['BH', 'ASD']);
    assert.equal(p.carrier, 'RFO');
    assert.equal(p.locomotive, '193 150');
    assert.equal(p.cargo, 'ketel');
    assert.equal(p.hasDirectionMarker, true);
});

test('tijd na station en kleine letters', () => {
    const p = parseMessage('utm 11:15 ri Amf');
    assert.equal(p.timestamp, '11:15');
    assert.deepEqual(p.routeCodes, ['UTM', 'AMF']);
});

test('spottersalias: rh wordt Rheine (RHEINE)', () => {
    const p = parseMessage('10:30 rh ri Amf 189 024');
    assert.deepEqual(p.routeCodes, ['RHEINE', 'AMF']);
    assert.equal(p.locomotive, '189 024');
});

test('voluit geschreven Salzbergen wordt SBG', () => {
    const p = parseMessage('10:30 Salzbergen ri Amf');
    assert.deepEqual(p.routeCodes, ['SBG', 'AMF']);
});

test('locnummer 189 024 wordt niet gekaapt door serie 18', () => {
    const p = parseMessage('12:00 Amf ri Dv 189 024');
    assert.equal(p.locomotive, '189 024');
});

test('losse lok en belading', () => {
    assert.equal(parseMessage('10:00 Amf ri Ut llt 193 726').llt, true);
    assert.equal(parseMessage('10:00 Amf ri Asd shuttle badl 193 726').belading, 'badl');
});

test("museummaterieel: Plan V, Mat '54, Mat '64, Mat '24, Hondekop", () => {
    assert.equal(parseMessage('11:15 utm ri Amf Plan V').stock, 'Plan V');
    assert.equal(parseMessage("11:15 utm ri Ut Mat '54").stock, "Mat '54");
    assert.equal(parseMessage('11:15 utm ri Amf mat 64').stock, "Mat '64");
    assert.equal(parseMessage("Utm 11:15 mat '24 ri apd").stock, "Mat '24");
    assert.equal(parseMessage('11:15 utm ri Amf hondekop').stock, 'Hondekop');
});

test("Mat '64 wordt niet als loc-serie 6400 gelezen", () => {
    const p = parseMessage('12:00 utm ri Amf mat 64');
    assert.equal(p.locomotive, null);
});

test('kopmaken en extrapolatie-markers', () => {
    assert.equal(parseMessage('11:21 Dvge maakt kop en vertrekt ri Zp').kopmaken, true);
    assert.equal(parseMessage('10:00 Amf ri Asd e.v. 193 726').extrapolate, true);
});

test('shuttlenaam voor het groepsbericht', () => {
    const p = parseMessage('10:00 Amf ri Bkl Katy shuttle 193 726');
    assert.equal(p.cargo, 'container');
    assert.match(p.cargoRaw, /shuttle/i);
});

test('stopwoorden worden geen stationscode', () => {
    const p = parseMessage('10:00 trein staat op en in de wacht bij Amf');
    assert.ok(!p.routeCodes.includes('EN'));
    assert.ok(!p.routeCodes.includes('OP'));
    assert.ok(p.routeCodes.includes('AMF'));
});

test('korte woord-codes matchen alleen exact geschreven (g, o, na, als)', () => {
    const p = parseMessage('10:00 hij ging na aankomst als eerste weg o zo snel bij Amf');
    assert.deepEqual(p.routeCodes, ['AMF']);
});

test('codes blijven herkend achter leestekens en schuine strepen', () => {
    const p = parseMessage('10:00 Amf. ri Asd/Zd');
    assert.ok(p.routeCodes.includes('AMF'));
    assert.ok(p.routeCodes.includes('ASD'));
});
