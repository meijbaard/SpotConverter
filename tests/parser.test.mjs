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

// --- v5.3.0: formaten uit de chatanalyse (14 maanden groepsberichten) ---

test('tijdnotaties: 19.33, 11;45 en 11h23 worden herkend', () => {
    assert.equal(parseMessage('19.33 Amf ri Dv 193 726').timestamp, '19:33');
    assert.equal(parseMessage('11;45 Amf ri Dv 193 726').timestamp, '11:45');
    assert.equal(parseMessage('11h23 Amf ri Dv 193 726').timestamp, '11:23');
});

test('locnummer wordt nooit als tijd gelezen', () => {
    assert.equal(parseMessage('Amf ri Dv 193.150 met ketels').timestamp, null);
});

test('nieuwe locseries: 383, 386, 194 en RFO 1829', () => {
    assert.equal(parseMessage('10:00 Amf ri Bh CDC 383 017 met staaltrein').locomotive, '383 017');
    assert.equal(parseMessage('10:00 Amf ri Bh Metrans 386 034 met containers').locomotive, '386 034');
    assert.equal(parseMessage('11:52 RSN richting Bh RTB Cargo 194 174 met containers').locomotive, '194 174');
    assert.equal(parseMessage('12:15 Wdn ri Dv RFO 1829 met staaltrein').locomotive, '1829');
});

test('NVR-prefix 6193 190 wordt serie 193', () => {
    assert.equal(parseMessage('09:44 Amf ri Bh DPB 6193 190 met keteltrein').locomotive, '193 190');
});

test('onbekend locnummer (193 xxx) en Duitse schrijfwijze (193er)', () => {
    assert.equal(parseMessage('10:46 Hon ri Bh DBC 193xxx met ketels').locomotive, '193 xxx');
    assert.equal(parseMessage('11:02 Bn ri Aml Rtbc 193er met pcc').locomotive, '193');
});

test('dubbele tractie met plus', () => {
    const p = parseMessage('13:15 Hgl ri Dv Rfo 193 901 + 193-947 met keteltrein');
    assert.equal(p.locomotive, '193 901 + 193 947');
});

test('nieuwe vervoerders: Metrans, ERS, ELL en RTB Cargo', () => {
    assert.equal(parseMessage('10:00 Amf ri Bh Metrans 386 034').carrier, 'MTR');
    assert.equal(parseMessage('10:00 Amf ri Bh ERS 189 201 met containers').carrier, 'ERS');
    assert.equal(parseMessage('10:00 Amf ri Bh ELL 193 955 llt').carrier, 'ELL');
});

test('RTB als vervoerder wordt geen station Rotterdam Blaak', () => {
    const p = parseMessage('Om 11:52 RTB Cargo 194 174 met containers door RSN richting Bh');
    assert.equal(p.routeCodes[0], 'RSN');
    assert.equal(p.routeCodes.at(-1), 'BH');
    assert.ok(!p.routeCodes.includes('RTB'));
});

test('voluit geschreven richting: ri Hengelo en richting Bh', () => {
    const p = parseMessage('11:00 Wdn ri Hengelo 186 942 met containers');
    assert.deepEqual(p.routeCodes, ['WDN', 'HGL']);
});

test('ric als richtingswoord', () => {
    const p = parseMessage('12:02 door Ut ric Tbi 193 726 met ketels');
    assert.equal(p.hasDirectionMarker, true);
    assert.ok(p.routeCodes.includes('TBI'));
});

test('nieuwe ladingen: graan, gas, kalk en unit cargo', () => {
    assert.equal(parseMessage('10:00 Amf ri Bh LTE 193 933 met graantrein').cargo, 'graan');
    assert.equal(parseMessage('10:00 Amf ri Bh 193 321 met gasketels').cargo, 'gas');
    assert.equal(parseMessage('10:00 Amf ri Bh 193 321 met kalktrein').cargo, 'kalk');
    assert.equal(parseMessage('10:46 Hon ri Bh DBC 193 034 met uc Onnen').cargo, 'uc');
});

test('UC Onnen krijgt een eigen naam in het groepsbericht', () => {
    assert.equal(parseMessage('10:46 Hon ri Bh DBC 193 034 met uc Onnen').cargoRaw, 'UC Onnen');
});

test('spottersalias Amfge en ri NL', () => {
    assert.ok(parseMessage('15:24 aankomst Amfge 6418 met buffers').routeCodes.includes('AMFGA'));
    const nl = parseMessage('17:31 Salzbergen 193 321 met staaltrein ri NL');
    assert.equal(nl.routeCodes.at(-1), 'BH');
});

test('vrije-veldlocatie: Nieuwedijk (hon-Dvc) ri Bh start bij Holten', () => {
    const p = parseMessage('Nieuwedijk (hon-Dvc) DBC 193xxx met uc Onnen Ri bh 10:46');
    assert.equal(p.routeCodes[0], 'HON');
    assert.ok(!p.routeCodes.includes('DVC'));
    assert.equal(p.timestamp, '10:46');
});

test('vrije-veldlocatie: bn/hgl ri aml start bij Borne', () => {
    const p = parseMessage('11:02 bn/hgl Rtbc 193er+ Pcc shuttle ri aml');
    assert.equal(p.routeCodes[0], 'BN');
    assert.ok(!p.routeCodes.includes('HGL'));
});

test('paar áchter ri blijft gewoon twee richtingen (Asd/Zd)', () => {
    const p = parseMessage('10:00 Amf. ri Asd/Zd');
    assert.ok(p.routeCodes.includes('ASD'));
    assert.ok(p.routeCodes.includes('ZD'));
});
