import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { laadTestData } from './helpers/data.mjs';
import { parseMessage } from '../assets/js/parser.js';
import { analyzeTrajectory } from '../assets/js/routing.js';

before(() => laadTestData());

function route(msg) {
    const analysis = analyzeTrajectory(parseMessage(msg), null);
    return analysis.journey ? analysis.journey.map(s => s.code) : null;
}

test('enkel traject: Amf richting Maasvlakte via de Gooilijn', () => {
    const codes = route('10:30 Amf ri Mvt');
    assert.ok(codes, 'route gevonden');
    assert.equal(codes[0], 'AMF');
    assert.equal(codes.at(-1), 'MVT');
    assert.ok(codes.includes('HVS'), 'via Hilversum');
    assert.ok(codes.includes('RTD'), 'via Rotterdam');
});

test('over knooppunt AMF: Bentheimroute naar Gooilijn', () => {
    const codes = route('13:07 Bh ri Asd RFO 193 150 met keteltrein');
    assert.ok(codes);
    assert.equal(codes[0], 'BH');
    assert.equal(codes.at(-1), 'ASD');
    assert.ok(codes.includes('AMF'), 'via Amersfoort');
});

test('omgekeerde richting: Asd terug naar Rheine', () => {
    const codes = route('09:00 Asd ri rh');
    assert.ok(codes);
    assert.equal(codes[0], 'ASD');
    assert.equal(codes.at(-1), 'RHEINE');
});

test('Spoorwegmuseum: UTM naar Amersfoort via Blauwkapel', () => {
    const codes = route('10:30 UTM ri Amf');
    assert.deepEqual(codes, ['UTM', 'BLOA', 'BHV', 'DLD', 'SDN', 'AMFVA', 'AMF']);
});

test('Spoorwegmuseum: UTM naar Utrecht Centraal', () => {
    const codes = route('10:30 UTM ri Ut');
    assert.deepEqual(codes, ['UTM', 'BLOA', 'UTO', 'UTOA', 'UT']);
});

test('drie trajecten: UTM naar Apeldoorn via Amersfoort', () => {
    const codes = route("Utm 11:15 mat '24 ri apd");
    assert.ok(codes);
    assert.equal(codes[0], 'UTM');
    assert.equal(codes.at(-1), 'APD');
    assert.ok(codes.includes('AMF'), 'via Amersfoort');
});

test('UTM naar Hilversum niet via Blauwkapel-Hollandsche Rading (verbinding vervallen)', () => {
    const codes = route('10:30 UTM ri Hvs');
    assert.ok(codes);
    assert.equal(codes[0], 'UTM');
    assert.equal(codes.at(-1), 'HVS');
    assert.ok(!codes.includes('HOR'), 'niet via Hollandsche Rading');
    assert.ok(codes.includes('BRN'), 'via Baarn');
});

test('UTM naar Baarn via de Soestlijn', () => {
    const codes = route('10:30 UTM ri Brn');
    assert.ok(codes);
    assert.ok(codes.includes('ST'), 'via Soest');
    assert.equal(codes.at(-1), 'BRN');
});

test('UTM naar Utrecht blijft via Overvecht werken, met kopmaken op Blauwkapel', () => {
    const analysis = analyzeTrajectory(parseMessage('10:30 UTM ri Ut'), null);
    assert.deepEqual(analysis.journey.map(s => s.code), ['UTM', 'BLOA', 'UTO', 'UTOA', 'UT']);
    const bloa = analysis.journey.find(s => s.code === 'BLOA');
    assert.equal(bloa.kopmaken, true, 'maakt kop op Blauwkapel');
});

test('UTM naar Amersfoort maakt geen kop', () => {
    const analysis = analyzeTrajectory(parseMessage('10:30 UTM ri Amf'), null);
    assert.ok(analysis.journey.every(s => !s.kopmaken));
});

test('Hilversum naar Utrecht blijft via Hollandsche Rading werken', () => {
    const codes = route('10:30 Hvs ri Ut');
    assert.deepEqual(codes, ['HVS', 'HVSP', 'HOR', 'UTO', 'UT']);
});

test('landelijk: Amsterdam naar Utrecht op eigen baanvak', () => {
    const codes = route('09:00 Asd ri Ut');
    assert.deepEqual(codes, ['ASD', 'ASA', 'DVD', 'ASB', 'ASHD', 'AC', 'BKL', 'MAS', 'UTZL', 'UT']);
});

test('landelijk: Zwolle naar Groningen', () => {
    const codes = route('09:00 Zl ri Gn');
    assert.equal(codes[0], 'ZL');
    assert.equal(codes.at(-1), 'GN');
    assert.ok(codes.includes('ASN'), 'via Assen');
});

test('landelijk meertraject: Leeuwarden naar Den Haag Centraal', () => {
    const codes = route('09:00 Lw ri Gvc');
    assert.ok(codes);
    assert.equal(codes[0], 'LW');
    assert.equal(codes.at(-1), 'GVC');
});

test('landelijk: Oss (code O) via voluit getypte naam', () => {
    const codes = route('09:00 Oss ri Ht');
    assert.ok(codes);
    assert.equal(codes[0], 'O');
    assert.equal(codes.at(-1), 'HT');
});

test('richting Utrecht-corridor zuidwaarts: Amf naar Den Bosch', () => {
    const codes = route('10:30 Amf ri Ht');
    assert.ok(codes);
    assert.equal(codes[0], 'AMF');
    assert.equal(codes.at(-1), 'HT');
    assert.ok(codes.includes('UT'), 'via Utrecht');
});

test('doorgaand goederenverkeer mijdt de diesellijn via Raalte (via Deventer/Dvge)', () => {
    const codes = route('13:00 Hgl ri Zl 189 024');
    assert.ok(codes);
    assert.ok(!codes.includes('RAT'), 'niet via Raalte');
    assert.ok(codes.includes('DVGE'), 'via Deventer goederenemplacement');
    assert.equal(codes.at(-1), 'ZL');
});

test('spot op de Raalte-lijn zelf blijft gewoon werken', () => {
    const codes = route('13:00 Rat ri Zl');
    assert.deepEqual(codes, ['RAT', 'HNO', 'ZL']);
});

test('museumrit mag wel de kortste route via Raalte nemen', () => {
    const codes = route("13:00 Hgl ri Zl Mat '54");
    assert.ok(codes);
    assert.ok(codes.includes('RAT'), 'via Raalte (kortste route)');
    assert.equal(codes.at(-1), 'ZL');
});

test('onzin levert geen route op', () => {
    assert.equal(route('hallo dit is geen spotbericht'), null);
});

test('journey heeft oplopende tijden', () => {
    const analysis = analyzeTrajectory(parseMessage('10:30 Amf ri Mvt'), null);
    const times = analysis.journey.map(s => s.time);
    const sorted = [...times].sort();
    assert.deepEqual(times, sorted, 'tijden lopen op');
});
