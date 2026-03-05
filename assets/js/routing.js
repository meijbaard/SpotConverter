// routing.js
import { getState, getStationByCode } from './state.js';

export function findFullTrajectory(routeCodes) {
    // We hebben minimaal 2 stations nodig om een richting te kunnen bepalen
    if (routeCodes.length < 2) return null; 

    const startCode = routeCodes[0];
    const endCode = routeCodes[routeCodes.length - 1];
    const trajectories = getState().trajectories;

    // 1. Zoeken op één enkel traject (Slimmer: checkt of ze op dezelfde lijn liggen, ongeacht tussenstations)
    for (const name in trajectories) {
        const traject = trajectories[name];
        const startIndex = traject.indexOf(startCode);
        const endIndex = traject.indexOf(endCode);

        if (startIndex !== -1 && endIndex !== -1) {
            // Beide stations liggen op dit traject!
            if (startIndex < endIndex) {
                return { name, direction: 'forward', stations: traject.slice(startIndex, endIndex + 1) };
            } else if (startIndex > endIndex) {
                // Ze liggen in omgekeerde volgorde op de route, dus draai de array om
                return { name, direction: 'backward', stations: traject.slice(endIndex, startIndex + 1).reverse() };
            }
        }
    }

    // 2. Complexe routeherkenning via knooppunt Amersfoort (Over twee trajecten heen)
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
    
    const { distanceMatrix, pathData, stationCoords } = getState();
    
    // Kopieer de routeCodes zodat we er veilig voorspellingen aan kunnen toevoegen
    let routeCodes = [...parsedData.routeCodes];

    // --- FASE 4: Route Voorspelling (Extrapolatie) ---
    if (parsedData.extrapolate && routeCodes.length >= 2) {
        const startCode = routeCodes[0];
        const endCode = routeCodes[routeCodes.length - 1];
        
        const startCoord = stationCoords[startCode];
        const endCoord = stationCoords[endCode];
        
        if (startCoord && endCoord && startCoord.lon !== undefined && endCoord.lon !== undefined) {
            // Check of de lengtegraad toeneemt (trein rijdt naar het Oosten)
            if (Number(endCoord.lon) > Number(startCoord.lon)) {
                // Regel: Oostwaarts met 'e.v.' betekent vrijwel altijd grens over bij Bad Bentheim
                if (!routeCodes.includes('BH')) {
                    routeCodes.push('BH');
                }
            } else {
                // (Ruimte voor latere Westwaartse voorspellingen, bijv. naar Kijfhoek (KHF) of Amsterdam (ASD) o.b.v. lading/vervoerder)
            }
        }
    }

    // Gebruik nu de (mogelijk aangevulde) routeCodes om de hele lijn te trekken
    const trajectoryInfo = findFullTrajectory(routeCodes);
    if (!trajectoryInfo) {
        return { journey: null, parsedMessage: parsedData };
    }
    
    const { name, direction, stations: journeyStations } = trajectoryInfo;
    const [startHours, startMinutes] = parsedData.timestamp.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(startHours, startMinutes, 0, 0);

    // Bepaal de definitieve rijrichting o.b.v. het volledige (voorspelde) traject
    let directionKey = 'WEST'; 
    const finalStartCode = journeyStations[0];
    const finalEndCode = journeyStations[journeyStations.length - 1];
    
    const finalStartCoord = stationCoords[finalStartCode];
    const finalEndCoord = stationCoords[finalEndCode];
    
    if (finalStartCoord && finalEndCoord && finalStartCoord.lon !== undefined && finalEndCoord.lon !== undefined) {
        if (Number(finalEndCoord.lon) > Number(finalStartCoord.lon)) {
            directionKey = 'OOST';
        } else {
            directionKey = 'WEST';
        }
    } else {
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
            // Valideren of afstand bestaat, anders aanname van 5 min om niet vast te lopen
            const travelMinutes = distance ? Math.round((distance / 80) * 60) : 5; 
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
    
    const finalJourney = journey.map(s => ({
        ...s,
        time: s.finalTime.toTimeString().substring(0, 5)
    }));

    return { journey: finalJourney, parsedMessage: parsedData };
}