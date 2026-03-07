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

/**
 * Analyseert de route, berekent de rijrichting en voorspelt het traject.
 */
export function analyzeTrajectory(parsedData, targetStationCode) {
    if (!parsedData.routeCodes.length || !parsedData.timestamp) {
        return { journey: null, parsedMessage: parsedData };
    }
    
    const { distanceMatrix, pathData, stationCoords } = getState();
    let routeCodes = [...parsedData.routeCodes];

    // --- FASE 4 & 5: Route Voorspelling ---
    const isCargoTrain = parsedData.cargo !== null;
    const shouldExtrapolate = parsedData.extrapolate || isCargoTrain;

    if (shouldExtrapolate && routeCodes.length >= 2) {
        const startCode = routeCodes[0];
        const endCode = routeCodes[routeCodes.length - 1];
        const msg = parsedData.originalMessage.toLowerCase();
        
        const startCoord = stationCoords[startCode];
        const endCoord = stationCoords[endCode];
        
        if (startCoord && endCoord && startCoord.lon !== undefined && endCoord.lon !== undefined) {
            // OOSTWAARTS
            if (Number(endCoord.lon) > Number(startCoord.lon)) {
                if (!routeCodes.includes('BH')) routeCodes.push('BH');
            } 
            // WESTWAARTS (Vanuit Bentheim of oost-Nederland naar de bestemming)
            else {
                let destination = null;

                // 1. Pon autotrein
                // 1. Pon autotrein
                if (msg.includes('pon') || msg.includes('auto')) {
                    destination = 'AMF'; 
                }
                // 2. CD Cargo Staaltrein / Schroot naar Amsterdam Westhaven (AWH)
                // 2. CD Cargo Staaltrein / Schroot naar Amsterdam Westhaven (AWH)
                else if ((msg.includes('staal') && msg.includes('cd cargo')) || msg.includes('schroot') || msg.includes('cd-cargo')) {
                    destination = 'AWH'; // Aangepast van ASW naar AWH
                    destination = 'AWH'; // Aangepast van ASW naar AWH
                }
                // 3. Reguliere Staaltrein / Shimmens naar Beverwijk Hoogovens
                // 3. Reguliere Staaltrein / Shimmens naar Beverwijk Hoogovens
                else if (msg.includes('staal') || msg.includes('shimmens')) {
                    destination = 'BVHC';
                }
                // 4. Kąty shuttle naar Moerdijk (MDK)
                // 4. Kąty shuttle naar Moerdijk (MDK)
                else if (msg.includes('kąty') || msg.includes('katy') || msg.includes('clip')) {
                    destination = 'MDK'; 
                }
                // 5. KLK Kolb naar Delden
                // 5. KLK Kolb naar Delden
                else if (msg.includes('klk') || msg.includes('servo')) {
                    destination = 'DDN';
                }
                // 6. Malmö shuttle naar Coevorden
                // 6. Malmö shuttle naar Coevorden
                else if (msg.includes('malmö') || msg.includes('malmo')) {
                    destination = 'COV';
                }
                // 7. Tilburg Shuttles (Rzepin, Chengdu, Nanjing)
                // 7. Tilburg Shuttles (Rzepin, Chengdu, Nanjing)
                else if (msg.includes('rzepin') || msg.includes('chengdu') || msg.includes('nanjing') || msg.includes('tilburg')) {
                    destination = 'TB';
                }
                // 8. Sloehaven (Nosta/Nostra, Kolen, Erts) -> Nu naar SLOE
                // 8. Sloehaven (Nosta/Nostra, Kolen, Erts) -> Nu naar SLOE
                else if (msg.includes('kolen') || msg.includes('erts') || msg.includes('nosta') || msg.includes('nostra') || msg.includes('sloe')) {
                    if (!routeCodes.includes('TB')) routeCodes.push('TB');
                    destination = 'SLOE'; // Aangepast van SHL naar SLOE!
                    destination = 'SLOE'; // Aangepast van SHL naar SLOE!
                }
                // 9. Europoort / Maasvlakte Shuttles
                // 9. Europoort / Maasvlakte Shuttles
                else if (msg.includes('lovosice') || msg.includes('poznań') || msg.includes('poznan')) {
                    destination = 'ERP'; 
                    destination = 'ERP'; 
                }
                else if (msg.includes('magdeburg') || msg.includes('pcc')) {
                    destination = 'MVT'; 
                    destination = 'MVT'; 
                }
                // 10. Overige vloeistoffen en containers -> Kijfhoek -> Nu naar KFH
                // 10. Overige vloeistoffen en containers -> Kijfhoek -> Nu naar KFH
                else if (msg.includes('zonnebloem') || msg.includes('biodiesel') || msg.includes('lotos') || msg.includes('brwinów') || msg.includes('brwinow') || msg.includes('brinow') || parsedData.cargo === 'container' || parsedData.cargo === 'trailer') {
                    destination = 'KFH'; // Aangepast van KHF naar KFH!
                    destination = 'KFH'; // Aangepast van KHF naar KFH!
                }

                if (destination && !routeCodes.includes(destination)) routeCodes.push(destination);
            }
        }
    }

    let trajectoryInfo = findFullTrajectory(routeCodes);
    
    // --- DE VEILIGHEIDS-FALLBACK (Geruisloze terugval als de traject-lijn mist) ---
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
            waitTime: 0
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