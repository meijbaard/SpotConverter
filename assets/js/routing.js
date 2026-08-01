// routing.js
import { getState, getStationByCode } from './state.js';

/**
 * Zoekt het volledige traject op basis van een lijst met stationscodes.
 * Werkt zowel voor directe trajecten als complexe routes via knooppunt Amersfoort.
 */
export function findFullTrajectory(routeCodes) {
    if (routeCodes.length < 2) return null;

    const startCode = routeCodes[0];
    const endCode = routeCodes[routeCodes.length - 1];
    const trajectories = getState().trajectories;

    // 1. Zoeken op één enkel traject (checkt of ze op dezelfde lijn liggen)
    for (const name in trajectories) {
        const traject = trajectories[name];
        const startIndex = traject.indexOf(startCode);
        const endIndex = traject.indexOf(endCode);

        if (startIndex !== -1 && endIndex !== -1) {
            if (startIndex < endIndex) {
                return { name, direction: 'forward', stations: traject.slice(startIndex, endIndex + 1) };
            } else if (startIndex > endIndex) {
                return { name, direction: 'backward', stations: traject.slice(endIndex, startIndex + 1).reverse() };
            }
        }
    }

    // 2. Complexe routeherkenning via een knooppunt (over twee trajecten heen).
    // De knooppunten komen uit knooppunten.json; volgorde bepaalt de voorkeur.
    const hubs = getState().hubs;

    for (const hub of hubs) {
        let startTrajInfo = null, endTrajInfo = null;

        for (const name in trajectories) {
            if (trajectories[name].includes(startCode) && trajectories[name].includes(hub)) startTrajInfo = { name, stations: trajectories[name] };
            if (trajectories[name].includes(endCode) && trajectories[name].includes(hub)) endTrajInfo = { name, stations: trajectories[name] };
        }

        if (startTrajInfo && endTrajInfo && startTrajInfo.name !== endTrajInfo.name) {
            let firstLeg, secondLeg, finalDirection, startName = startTrajInfo.name, endName = endTrajInfo.name;

            if (startTrajInfo.stations.indexOf(startCode) < startTrajInfo.stations.indexOf(hub)) {
                firstLeg = startTrajInfo.stations.slice(startTrajInfo.stations.indexOf(startCode), startTrajInfo.stations.indexOf(hub) + 1);
            } else {
                const reversed = [...startTrajInfo.stations].reverse();
                firstLeg = reversed.slice(reversed.indexOf(startCode), reversed.indexOf(hub) + 1);
            }

            if (endTrajInfo.stations.indexOf(hub) < endTrajInfo.stations.indexOf(endCode)) {
                secondLeg = endTrajInfo.stations.slice(endTrajInfo.stations.indexOf(hub) + 1, endTrajInfo.stations.indexOf(endCode) + 1);
                finalDirection = 'forward';
            } else {
                const reversed = [...endTrajInfo.stations].reverse();
                secondLeg = reversed.slice(reversed.indexOf(hub) + 1, reversed.indexOf(endCode) + 1);
                finalDirection = 'backward';
            }
            return { name: `${startName} -> ${endName}`, direction: finalDirection, stations: [...firstLeg, ...secondLeg] };
        }
    }

    return null;
}

/**
 * Evalueert één extrapolatieregel uit extrapolatie.json tegen het bericht.
 * Een regel matcht als één van de aanwezige condities waar is:
 * - anyOf: minstens één term komt voor in het bericht
 * - allOf: uit élke groep komt minstens één term voor
 * - cargoAnyOf: de herkende ladingcategorie zit in de lijst
 */
function matchesRule(rule, msg, cargo) {
    if (rule.anyOf && rule.anyOf.some(term => msg.includes(term))) return true;
    if (rule.cargoAnyOf && cargo && rule.cargoAnyOf.includes(cargo)) return true;
    if (rule.allOf && rule.allOf.every(group => group.some(term => msg.includes(term)))) return true;
    return false;
}

/**
 * Analyseert de route, berekent de rijrichting en voorspelt het traject.
 */
export function analyzeTrajectory(parsedData, targetStationCode) {
    if (!parsedData.routeCodes.length || !parsedData.timestamp) {
        return { journey: null, parsedMessage: parsedData };
    }

    const { distanceMatrix, pathData, stationCoords, extrapolationRules } = getState();
    let routeCodes = [...parsedData.routeCodes];

    // --- Route-extrapolatie op basis van regels in extrapolatie.json ---
    const isCargoTrain = parsedData.cargo !== null;
    const shouldExtrapolate = (parsedData.extrapolate || isCargoTrain) && extrapolationRules;

    if (shouldExtrapolate && routeCodes.length >= 2) {
        const startCode = routeCodes[0];
        const endCode = routeCodes[routeCodes.length - 1];
        const msg = parsedData.originalMessage.toLowerCase();

        const startCoord = stationCoords[startCode];
        const endCoord = stationCoords[endCode];

        if (startCoord && endCoord && startCoord.lon !== undefined && endCoord.lon !== undefined) {
            if (Number(endCoord.lon) > Number(startCoord.lon)) {
                // OOSTWAARTS
                const eastDest = extrapolationRules.east?.append;
                if (eastDest && !routeCodes.includes(eastDest)) routeCodes.push(eastDest);
            } else {
                // WESTWAARTS: eerste regel die matcht bepaalt de bestemming
                const rule = (extrapolationRules.west || []).find(r => matchesRule(r, msg, parsedData.cargo));
                if (rule) {
                    (rule.via || []).forEach(code => {
                        if (!routeCodes.includes(code)) routeCodes.push(code);
                    });
                    if (rule.dest && !routeCodes.includes(rule.dest)) routeCodes.push(rule.dest);
                }
            }
        }
    }

    let trajectoryInfo = findFullTrajectory(routeCodes);

    // --- Veiligheids-fallback: geruisloze terugval als de traject-lijn mist ---
    if (!trajectoryInfo && routeCodes.length > parsedData.routeCodes.length) {
        routeCodes = [...parsedData.routeCodes];
        trajectoryInfo = findFullTrajectory(routeCodes);
    }

    if (!trajectoryInfo) {
        return { journey: null, parsedMessage: parsedData };
    }

    const { name, direction, stations: journeyStations } = trajectoryInfo;
    const [startHours, startMinutes] = parsedData.timestamp.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(startHours, startMinutes, 0, 0);

    let directionKey = 'WEST';
    const finalStartCoord = stationCoords[journeyStations[0]];
    const finalEndCoord = stationCoords[journeyStations[journeyStations.length - 1]];

    if (finalStartCoord && finalEndCoord && finalStartCoord.lon !== undefined && finalEndCoord.lon !== undefined) {
        directionKey = (Number(finalEndCoord.lon) > Number(finalStartCoord.lon)) ? 'OOST' : 'WEST';
    } else {
        if (name.includes('Bentheimroute')) {
            directionKey = (direction === 'forward') ? 'WEST' : 'OOST';
        } else {
            directionKey = (journeyStations.indexOf('AMF') > 0) ? 'OOST' : 'WEST';
        }
    }

    let journey = [];
    let lastTime = new Date(startDate.getTime());
    let lastStationCode = journeyStations[0];

    for (let i = 0; i < journeyStations.length; i++) {
        const stationCode = journeyStations[i];
        let idealTime = new Date(lastTime.getTime());

        if (i > 0) {
            const distance = distanceMatrix[lastStationCode]?.[stationCode] || 0;
            const travelMinutes = distance ? Math.round((distance / 80) * 60) : 5;
            idealTime.setMinutes(idealTime.getMinutes() + travelMinutes);
        }

        journey.push({
            code: stationCode,
            name: getStationByCode(stationCode)?.name_long || stationCode,
            idealTime: idealTime,
            finalTime: idealTime,
            waitTime: 0,
            viaPad: false // wordt true als de tijd op een goederenpad is uitgelijnd
        });

        lastTime = idealTime;
        lastStationCode = stationCode;
    }

    const targetStation = journey.find(s => s.code === targetStationCode);
    let totalDelay = 0;

    if (targetStation) {
        const pathInfo = pathData[targetStation.code]?.[directionKey];
        if (pathInfo?.length) {
            const idealMinutes = targetStation.idealTime.getMinutes();
            let targetMinute = pathInfo.sort((a, b) => a - b).find(m => m >= idealMinutes) ?? (pathInfo[0] + 60);

            const targetTime = new Date(targetStation.idealTime.getTime());
            if (targetMinute >= 60) {
                targetTime.setHours(targetTime.getHours() + 1);
                targetMinute -= 60;
            }
            targetTime.setMinutes(targetMinute, 0, 0);
            totalDelay = Math.round((targetTime - targetStation.idealTime) / 60000);
            targetStation.viaPad = true; // tijd uitgelijnd op goederenpaden.csv
        }
    }

    if (totalDelay > 0) {
        const waitStationCode = directionKey === 'WEST' ? 'AMF' : 'STO';
        const waitStationIndex = journey.findIndex(s => s.code === waitStationCode);

        if (waitStationIndex !== -1) {
            journey[waitStationIndex].waitTime = totalDelay;
            for (let i = waitStationIndex; i < journey.length; i++) {
                journey[i].finalTime = new Date(journey[i].idealTime.getTime() + totalDelay * 60000);
            }
        }
    }

    const finalJourney = journey.map(s => ({
        ...s,
        time: s.finalTime.toTimeString().substring(0, 5)
    }));

    return { journey: finalJourney, parsedMessage: parsedData };
}
