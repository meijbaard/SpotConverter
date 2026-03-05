// state.js
const state = {
    stations: [],
    distanceMatrix: {},
    trajectories: {},
    pathData: {},
    heatmapData: {},
    trainPatterns: {},
    materieelDatabase: {
        exact: {},
        types: {},
        wagons: {},
        default: "default-loc.png"
    },
    
    // Bewaart de actuele status van de analyse
    currentAnalysis: {
        parsedMessage: null,
        targetStationCode: null,
        journey: null
    }
};

// Functies om de state veilig uit te lezen of aan te passen
export function getState() {
    return state;
}

export function updateState(key, data) {
    if (state.hasOwnProperty(key)) {
        state[key] = data;
    } else {
        console.warn(`Sleutel '${key}' bestaat niet in de state.`);
    }
}

export function getStationByCode(code) {
    if (!code) return null;
    return state.stations.find(station => station.code === code.toUpperCase()) || null;
}