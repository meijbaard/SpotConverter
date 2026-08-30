import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { laadTestData } from './helpers/data.mjs';
import { parseMessage } from '../assets/js/parser.js';
import { analyzeTrajectory } from '../assets/js/routing.js';
import { maakProjectie, treinPositie, kaartSvg } from '../assets/js/kaart.js';
import { vatStationInfoSamen } from '../assets/js/stationinfo.js';

before(() => laadTestData());

test('projectie: alle routepunten vallen binnen de tekenruimte', () => {
    const punten = [
        { lon: 5.37, lat: 52.15 }, { lon: 6.16, lat: 52.26 }, { lon: 7.16, lat: 52.31 }
    ];
    const prj = maakProjectie(punten);
    for (const p of punten) {
        const x = prj.x(p.lon), y = prj.y(p.lat);
        assert.ok(x >= 0 && x <= 100, `x binnen bereik (${x})`);
        assert.ok(y >= 0 && y <= 78, `y binnen bereik (${y})`);
    }
});

test('treinpositie: halverwege twee stations ligt de stip halverwege', () => {
    const t0 = new Date(); t0.setHours(12, 0, 0, 0);
    const t1 = new Date(); t1.setHours(12, 20, 0, 0);
    const nu = new Date(); nu.setHours(12, 10, 0, 0);
    const punten = [
        { lon: 5.0, lat: 52.0, finalTime: t0 },
        { lon: 6.0, lat: 52.4, finalTime: t1 }
    ];
    const pos = treinPositie(punten, nu);
    assert.ok(pos, 'positie gevonden');
    assert.ok(Math.abs(pos.lon - 5.5) < 0.01);
    assert.ok(Math.abs(pos.lat - 52.2) < 0.01);
    assert.equal(treinPositie(punten, new Date(t1.getTime() + 3600000)), null, 'na aankomst geen stip');
});

test('kaartSvg: analyse Bh ri Asd levert een kaart met route en markers', () => {
    const analysis = analyzeTrajectory(parseMessage('13:07 Bh ri Asd RFO 193 150 met keteltrein'), null);
    const svg = kaartSvg(analysis.journey, { targetCode: 'BRN' });
    assert.match(svg, /^<svg/);
    assert.match(svg, /kaart-route/);
    assert.match(svg, /kaart-spot/);
    assert.match(svg, /kaart-doel/, 'doelstation Baarn gemarkeerd');
    assert.match(svg, /kaart-net/, 'achtergrondnet aanwezig (traject-fallback)');
});

test('kaartSvg: geen kaart zonder bruikbare journey', () => {
    assert.equal(kaartSvg(null), '');
    assert.equal(kaartSvg([]), '');
});

// Vastgelegd (ingekort) antwoord van places.ns-mlab.nl voor de samenvatting
const OVFIETS_SAMPLE = [{
    type: 'stationfacility', name: 'OV-fiets',
    locations: [
        { name: 'AMF - OV-fiets - Amersfoort Centraal', open: 'Yes', extra: { rentalBikes: '292' } },
        { name: 'AMF - OV-fiets - Amersfoort Mondriaanplein', open: 'Yes', extra: { rentalBikes: '83' } }
    ]
}];
const FACILITY_SAMPLE = [
    { name: 'Starbucks', stationFacilityType: 'FOOD_AND_DRINK' },
    { name: 'Kiosk', stationFacilityType: 'FOOD_AND_DRINK' },
    { name: 'Bruna', stationFacilityType: 'SHOP' },
    { name: 'SANIFAIR Toilet', stationFacilityType: 'SERVICE' },
    { name: 'Bagagekluizen', stationFacilityType: 'SERVICE' },
    { name: 'Lift', stationFacilityType: 'ASSISTANCE', identifiers: ['lift'] },
    { name: 'Wachtruimte', stationFacilityType: 'SERVICE' }
];

test('stationinfo: samenvatting telt fietsen en herkent voorzieningen', () => {
    const info = vatStationInfoSamen(OVFIETS_SAMPLE, FACILITY_SAMPLE);
    assert.deepEqual(info.ovfiets, { aantal: 375, locaties: 2, open: true });
    assert.deepEqual(info.eten, ['Starbucks', 'Kiosk']);
    assert.equal(info.winkels, 1);
    assert.equal(info.toilet, true);
    assert.equal(info.kluizen, true);
    assert.equal(info.lift, true);
    assert.equal(info.wachtruimte, true);
});

test('stationinfo: lege payloads geven een lege samenvatting', () => {
    const info = vatStationInfoSamen([], []);
    assert.equal(info.ovfiets, null);
    assert.deepEqual(info.eten, []);
});
