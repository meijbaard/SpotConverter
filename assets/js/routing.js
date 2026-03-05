// routing.js
import { getState, getStationByCode } from './state.js';

export function findFullTrajectory(routeCodes) {
    if (routeCodes.length < 1) return null;
    const startCode = routeCodes[0];
    const endCode = routeCodes[routeCodes.length - 1];
    const isSubArray = (arr, sub) => arr.join(',').includes(sub.join(','));
    const trajectories = getState().trajectories;

    // Eerst zoeken naar een directe match op één enkel traject
    for (const name in trajectories) {
        const traject = trajectories[name];
        if (isSubArray(traject, routeCodes)) {
            const startIndex = traject.indexOf(startCode);
            const endIndex = traject.indexOf(endCode);
            if (startIndex <= endIndex) return { name, direction: 'forward', stations: traject.slice(startIndex, endIndex + 1) };
        }
        const reversed = [...traject].reverse();
        if (isSubArray(reversed, routeCodes)) {
            const startIndex = reversed.indexOf(startCode);
            const endIndex = reversed.indexOf(endCode);
             if (startIndex <= endIndex) return { name, direction: 'backward', stations: reversed.slice(startIndex, endIndex + 1) };
        }
    }

    // Complexe routeherkenning via knooppunt Amersfoort
    const hub = "AMF";
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
    return null;
}

export function analyzeTrajectory(parsedData, targetStationCode) {
    if (!parsedData.routeCodes.length || !parsedData.timestamp) {
        return { journey: null, parsedMessage: parsedData };
    }
    
    const trajectoryInfo = findFullTrajectory(parsedData.routeCodes);
    if (!trajectoryInfo) {
        return { journey: null, parsedMessage: parsedData };
    }
    
    const { name, direction, stations: journeyStations } = trajectoryInfo;
    const [startHours, startMinutes] = parsedData.timestamp.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(startHours, startMinutes, 0, 0);

    // --- FASE 2: Geografische Richtingsbepaling ---
    const { distanceMatrix, pathData, stationCoords } = getState();
    
    let directionKey = 'WEST'; // Standaard fallback
    const startCode = journeyStations[0];
    const endCode = journeyStations[journeyStations.length - 1];
    
    const startCoord = stationCoords[startCode];
    const endCoord = stationCoords[endCode];
    
    if (startCoord && endCoord && startCoord.lon !== undefined && endCoord.lon !== undefined) {
        // Wiskundige bepaling:
        // Longitude (lengtegraad) neemt toe naar het oosten, en af naar het westen.
        if (Number(endCoord.lon) > Number(startCoord.lon)) {
            directionKey = 'OOST';
        } else {
            directionKey = 'WEST';
        }
    } else {
        // Veiligheids-fallback naar de oude logica als OSM-coördinaten ontbreken
        if (name.includes('Bentheimroute')) {
            directionKey = (direction === 'forward') ? 'WEST' : 'OOST';
        } else {
            const amfIndexInJourney = journeyStations.indexOf('AMF');
            directionKey = (amfIndexInJourney > 0) ? 'OOST' : 'WEST';
        }
    }

    // Stel de tijdlijn samen met initiële rijtijden
    let journey = [];
    let lastTime = new Date(startDate.getTime());
    let lastStationCode = journeyStations[0];
    
    for (let i = 0; i < journeyStations.length; i++) {
        const stationCode = journeyStations[i];
        let idealTime = new Date(lastTime.getTime());
        
        if (i > 0) {
            const distance = distanceMatrix[lastStationCode]?.[stationCode] || 0;
            const travelMinutes = Math.round((distance / 80) * 60); // Aanname: 80 km/u
            idealTime.setMinutes(idealTime.getMinutes() + travelMinutes);
        }
        
        journey.push({
            code: stationCode,
            name: getStationByCode(stationCode)?.name_long || stationCode,
            idealTime: idealTime,
            finalTime: idealTime,
            waitTime: 0
        });
        
        lastTime = idealTime;
        lastStationCode = stationCode;
    }

    // Bereken eventuele wachttijden op basis van goederenpaden
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
        }
    }
    
    // Propageer de vertraging vanaf het wachtstation
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
    
    // Formatteer de datums naar leesbare tijden voor de weergave
    const finalJourney = journey.map(s => ({
        ...s,
        time: s.finalTime.toTimeString().substring(0, 5)
    }));

    return { journey: finalJourney, parsedMessage: parsedData };
}