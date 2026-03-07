// api.js
import { updateState } from './state.js';

// We gebruiken een relatief pad ('.') zodat hij altijd lokaal zoekt 
// tijdens het ontwikkelen, en later ook correct werkt op GitHub Pages.
const BASE_URL = '.';

export async function initializeData() {
    try {
        await Promise.all([
            loadStations(),
            loadAfstanden(),
            loadGoederenpaden(),
            loadHeatmap(),
            loadPatterns(),
            loadTrajectories(),
            loadMaterieel(),
            loadCoords() 
        ]);
        return true;
    } catch (error) {
        console.error("Fout tijdens het laden van de initiële data:", error);
        throw error;
    }
}

async function fetchJSON(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Netwerkfout: ${response.status} - ${response.statusText}`);
    return await response.json();
}

async function fetchText(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Netwerkfout: ${response.status} - ${response.statusText}`);
    return await response.text();
}

async function loadStations() {
    const csv = await fetchText(`${BASE_URL}/stations.csv`);
    const [headerLine, ...lines] = csv.trim().split("\n");
    const headers = headerLine.split(",").map(h => h.trim().replace(/"/g, ""));
    
    const stations = lines.map(line => {
        const values = line.split(",");
        let stationObj = {};
        headers.forEach((header, index) => {
            stationObj[header] = (values[index] || "").trim().replace(/"/g, "");
        });
        return stationObj;
    });
    
    stations.sort((a, b) => (b.code?.length || 0) - (a.code?.length || 0));
    updateState('stations', stations);
}

async function loadAfstanden() {
    const csv = await fetchText(`${BASE_URL}/afstanden.csv`);
    const lines = csv.trim().split("\n");
    const headers = lines[0].split(",").map(h => h.trim().toUpperCase());
    
    let distanceMatrix = {};
    lines.slice(1).forEach(line => {
        const values = line.split(",");
        const stationCode = values[0].trim().toUpperCase();
        distanceMatrix[stationCode] = {};
        
        headers.slice(1).forEach((header, index) => {
            distanceMatrix[stationCode][header.trim().toUpperCase()] = Number(values[index + 1] || 0);
        });
    });
    updateState('distanceMatrix', distanceMatrix);
}

async function loadGoederenpaden() {
    const csv = await fetchText(`${BASE_URL}/goederenpaden.csv`);
    const lines = csv.trim().split("\n");
    const headers = lines.shift().split(",").map(h => h.replace(/"/g, "").trim());
    
    const idxStation = headers.indexOf("stationscode");
    const idxRichting = headers.indexOf("rijrichting");
    const idxPaden = headers.indexOf("pad_minuten");
    
    let pathData = {};
    lines.forEach(line => {
        const values = line.split(",").map(v => v.replace(/"/g, "").trim());
        const station = values[idxStation];
        const richting = values[idxRichting];
        const paden = values[idxPaden].split(";").map(Number);
        
        if (!pathData[station]) pathData[station] = {};
        pathData[station][richting] = paden;
    });
    updateState('pathData', pathData);
}

async function loadHeatmap() {
    const data = await fetchJSON(`${BASE_URL}/heatmap_treinpassages.json`);
    updateState('heatmapData', data);
}

async function loadPatterns() {
    const data = await fetchJSON(`${BASE_URL}/treinpatronen.json`);
    updateState('trainPatterns', data);
}

async function loadTrajectories() {
    // Cache Buster toegevoegd: dwingt de browser altijd de échte, verse versie op te halen
    const data = await fetchJSON(`${BASE_URL}/trajecten.json?t=${new Date().getTime()}`);
    updateState('trajectories', data);
}

async function loadMaterieel() {
    try {
        const data = await fetchJSON(`materieel.json`);
        updateState('materieelDatabase', data);
    } catch (error) {
        console.warn("Kon materieel.json niet laden. Er wordt teruggevallen op de lege database.", error);
    }
}

async function loadCoords() {
    try {
        const data = await fetchJSON(`${BASE_URL}/afstanden_check/out_osm/osm_stations_coords.json`);
        updateState('stationCoords', data);
    } catch (error) {
        console.warn("Kon geografische coördinaten niet laden, er wordt teruggevallen op de oude logica.", error);
        updateState('stationCoords', {});
    }
}