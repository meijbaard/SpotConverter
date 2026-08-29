import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { laadTestData } from './helpers/data.mjs';
import { splitChat, extractObservations, groupTrains, analyseRadar } from '../assets/js/radar.js';

before(() => laadTestData());

// Echte groepsberichten van 29-08-2026, incl. een meertrein-bericht (Dvge)
const CHAT = `[29-08-2026, 10:46:47] ~ Santiago: Nieuwedijk (hon-Dvc)
DBC 193xxx met uc Onnen Ri bh
10:46
[29-08-2026, 11:03:00] ~ Lucas: 11:02 bn/hgl
Rtbc 193er+ Pcc shuttle ri aml
[29-08-2026, 11:23:03] ~ Santiago: Dvge 11:22
RTB 193 515 vertrokken Ri zp
RTB 193xxx met pcc staat Ri spa
En lte 193 567 Ri zp de laatste twee v word afgewacht
[29-08-2026, 11:55:35] ~ Jochem: Om 11:52 RTB Cargo 194 174 met containers door RSN richting Bh`;

test('splitChat: WhatsApp-koppen worden herkend met verzendtijd', () => {
    const msgs = splitChat(CHAT);
    assert.equal(msgs.length, 4);
    assert.equal(msgs[0].verzendTijd, '10:46');
    assert.match(msgs[2].tekst, /193 515/);
});

test('splitChat: tekst zonder koppen valt terug op regelblokken', () => {
    const msgs = splitChat('13:07 Bh ri Asd RFO 193 150\n\n13:20 Hgl ri Dv 186 942');
    assert.equal(msgs.length, 2);
    assert.equal(msgs[0].verzendTijd, null);
});

test('observaties: meertrein-bericht wordt gesplitst met kopregel als context', () => {
    const obs = extractObservations(CHAT);
    assert.equal(obs.length, 6);
    const dvge = obs.filter(o => o.station === 'DVGE');
    assert.equal(dvge.length, 3, 'drie treinen vanaf de Dvge-kopregel');
    assert.ok(dvge.every(o => o.tijd === '11:22'), 'tijd geërfd van de kopregel');
});

test('observaties: vrije-veldlocatie (hon-Dvc) ri Bh start bij Holten', () => {
    const obs = extractObservations(CHAT);
    assert.equal(obs[0].station, 'HON');
    assert.equal(obs[0].tijd, '10:46');
    assert.equal(obs[0].parsed.cargoRaw, 'UC Onnen');
});

test('observaties: bn/hgl ri aml start bij Borne', () => {
    const obs = extractObservations(CHAT);
    assert.equal(obs[1].station, 'BN');
    assert.equal(obs[1].parsed.carrier, 'RTBC');
});

test('groepering: pcc-meldingen en de latere 194 174 worden één trein', () => {
    const treinen = groupTrains(extractObservations(CHAT));
    assert.equal(treinen.length, 4, 'vier treinen: UC Onnen, PCC, 193 515 en LTE 193 567');

    const pcc = treinen.find(t => t.observaties.length > 1);
    assert.ok(pcc, 'PCC-trein met meerdere meldingen');
    assert.equal(pcc.observaties.length, 3);
    assert.equal(pcc.vervoerder, 'RTB');
    assert.equal(pcc.locomotive, '194 174', 'later herkend locnummer vult de trein aan');
    assert.equal(pcc.laatste.station, 'RSN');
});

test('groepering: verschillende locnummers blijven verschillende treinen', () => {
    const treinen = groupTrains(extractObservations(CHAT));
    const nummers = treinen.map(t => t.locSleutel).filter(Boolean).sort();
    assert.deepEqual(nummers, ['193515', '193567', '194174']);
});

test('projectie: de PCC-trein krijgt komende stations richting Bad Bentheim', () => {
    const nu = new Date();
    nu.setHours(11, 55, 0, 0);
    const treinen = analyseRadar(CHAT, nu);
    const pcc = treinen.find(t => t.observaties.length === 3);
    assert.ok(pcc.journey, 'route gevonden vanaf RSN');
    assert.equal(pcc.journey.at(-1).code, 'BH');
    assert.ok(pcc.komend.length > 0, 'komende stations aanwezig');
    assert.ok(pcc.komend[0].overMinuten >= 0);
});

test('projectie: UC Onnen westwaarts zou naar Onnen extrapoleren, oostwaarts naar BH', () => {
    const nu = new Date();
    nu.setHours(10, 50, 0, 0);
    const treinen = analyseRadar(CHAT, nu);
    const uc = treinen.find(t => t.cargoRaw === 'UC Onnen');
    assert.ok(uc, 'UC Onnen herkend');
    assert.equal(uc.journey.at(-1).code, 'BH', 'oostwaarts naar Bad Bentheim');
});
