// Laadt de echte databestanden van schijf en vult de app-state,
// zodat parser.js en routing.js in Node getest kunnen worden zoals
// ze in de browser draaien (api.js gebruikt fetch; hier lezen we schijf).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { updateState } from '../../assets/js/state.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

function leesStations() {
    const csv = readFileSync(join(root, 'stations.csv'), 'utf8');
    const [headerLine, ...lines] = csv.trim().split('\n');
    const headers = headerLine.split(',').map(h => h.trim().replace(/"/g, ''));
    const stations = lines.map(line => {
        const values = line.split(',');
        const obj = {};
        headers.forEach((h, i) => { obj[h] = (values[i] || '').trim().replace(/"/g, ''); });
        return obj;
    });
    stations.sort((a, b) => (b.code?.length || 0) - (a.code?.length || 0));
    return stations;
}

function leesAfstanden() {
    const csv = readFileSync(join(root, 'afstanden.csv'), 'utf8');
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toUpperCase());
    const matrix = {};
    lines.slice(1).forEach(line => {
        const values = line.split(',');
        const code = values[0].trim().toUpperCase();
        matrix[code] = {};
        headers.slice(1).forEach((h, i) => {
            matrix[code][h] = Number(values[i + 1] || 0);
        });
    });
    return matrix;
}

export function laadTestData() {
    updateState('stations', leesStations());
    updateState('distanceMatrix', leesAfstanden());
    updateState('trajectories', JSON.parse(readFileSync(join(root, 'trajecten.json'), 'utf8')));
    updateState('stationCoords', JSON.parse(readFileSync(join(root, 'afstanden_check', 'out_osm', 'osm_stations_coords.json'), 'utf8')));
    updateState('extrapolationRules', JSON.parse(readFileSync(join(root, 'extrapolatie.json'), 'utf8')));
    updateState('pathData', {});

    const overgangen = JSON.parse(readFileSync(join(root, 'overgangen.json'), 'utf8'));
    updateState('bannedTurns', overgangen.verboden || []);
    updateState('reversalTurns', overgangen.kopmaken || []);
}
