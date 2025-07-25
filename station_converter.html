---
permalink: /spotconverter/
layout: spotconverter
title: SpotConverter
author_profile: false
---

<html lang="nl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SpotConverter Pro</title>
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Google Fonts (Inter) -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        /* Aangepaste stijlen voor een moderne look */
        body { 
            font-family: 'Inter', sans-serif; 
            background-color: #f8fafc; /* bg-slate-50 */
            color: #334155; /* text-slate-700 */
        }
        
        /* Accentkleur voor focus en highlights */
        :root {
            --accent-color: #06b6d4; /* cyan-500 */
        }

        /* Stijlen voor input velden */
        .form-input {
            border-color: #cbd5e1; /* border-slate-300 */
            transition: all 0.2s ease-in-out;
        }
        .form-input:focus {
            border-color: var(--accent-color);
            box-shadow: 0 0 0 2px rgba(6, 182, 212, 0.2);
            outline: none;
        }

        /* Highlight stijlen */
        .highlight-station { 
            background-color: #cffafe; /* cyan-100 */
            color: #0e7490; /* cyan-800 */
            padding: 0.1rem 0.4rem; 
            border-radius: 0.25rem; 
            font-weight: 600; 
        }
        .highlight-abbr { 
            background-color: #f1f5f9; /* slate-100 */
            color: #475569; /* slate-600 */
            padding: 0.1rem 0.4rem; 
            border-radius: 0.25rem; 
            font-weight: 500;
            cursor: help;
            border-bottom: 2px dotted #94a3b8; /* slate-400 */
        }
        .highlight-estimation { 
            background-color: var(--accent-color);
            color: white;
            padding: 0.2rem 0.5rem; 
            border-radius: 0.375rem; 
            font-weight: 700; 
        }

        /* Laad-animatie */
        #loader-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(248, 250, 252, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            flex-direction: column;
            gap: 1rem;
            backdrop-filter: blur(4px);
        }
        .spinner {
            border: 5px solid #e2e8f0; /* slate-200 */
            border-top: 5px solid var(--accent-color);
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body class="py-8 md:py-12">

    <!-- Laad-overlay -->
    <div id="loader-overlay">
        <div class="spinner"></div>
        <p class="text-lg font-semibold text-slate-600">Data laden vanaf GitHub...</p>
    </div>

    <div class="max-w-5xl mx-auto px-4 space-y-8 md:space-y-10">
        
        <!-- Header met Logo -->
        <header class="bg-white p-6 md:p-8 rounded-xl shadow-lg text-center">
            <div class="flex justify-center items-center mb-4">
                <svg width="60" height="60" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="var(--accent-color)">
                    <path d="M 20 80 C 10 80 10 70 20 70 L 80 70 C 90 70 90 80 80 80 Z" fill="#475569"/>
                    <rect x="25" y="30" width="50" height="40" rx="5" fill="var(--accent-color)"/>
                    <rect x="35" y="20" width="30" height="10" rx="3" fill="#64748b"/>
                    <circle cx="37" cy="70" r="10" fill="white" stroke="#475569" stroke-width="4"/>
                    <circle cx="63" cy="70" r="10" fill="white" stroke="#475569" stroke-width="4"/>
                    <rect x="60" y="40" width="10" height="15" fill="white" rx="2"/>
                </svg>
            </div>
            <h1 class="text-3xl md:text-4xl font-bold text-slate-800">SpotConverter Pro</h1>
            <p class="mt-3 text-base md:text-lg text-slate-600 max-w-2xl mx-auto">
                Analyseer WhatsApp-berichten van treinspotters. Plak een bericht en zie direct de volledige stationsnamen, jargon en een geschatte passage-tijd.
            </p>
        </header>

        <!-- Converter Tool -->
        <main class="bg-white p-6 md:p-8 rounded-xl shadow-lg">
            <div class="grid md:grid-cols-2 gap-8">
                <!-- Input -->
                <div>
                    <label for="whatsappMessage" class="block text-base font-semibold text-slate-700 mb-2">Plak je WhatsApp bericht hier:</label>
                    <textarea id="whatsappMessage" class="form-input w-full h-36 border rounded-lg p-3 shadow-sm" placeholder="Bijv. 14:00 Hgl ri Amf" oninput="debounceProcessMessage()"></textarea>
                </div>
                <!-- Instellingen -->
                <div>
                    <label for="targetStationSelect" class="block text-base font-semibold text-slate-700 mb-2">Bereken passage voor:</label>
                    <select id="targetStationSelect" class="form-input w-full border rounded-lg p-3 shadow-sm bg-white" onchange="processMessage()"></select>
                </div>
            </div>
            
            <!-- Output secties -->
            <div class="mt-8 space-y-6">
                <div>
                    <h2 class="text-xl font-bold text-slate-800 mb-2">Verwerkt Bericht:</h2>
                    <div id="output" class="p-4 bg-slate-50 rounded-lg min-h-[60px] border border-slate-200 leading-relaxed"></div>
                </div>
                <div>
                    <h2 class="text-xl font-bold text-slate-800 mb-2">Analyse:</h2>
                    <div id="estimation-output" class="p-4 bg-cyan-50 border-l-4 border-cyan-400 rounded-r-lg min-h-[60px] space-y-2"></div>
                </div>
                <div>
                    <div class="flex justify-between items-center mb-2">
                        <h2 class="text-xl font-bold text-slate-800">Geparsede Data (voor analyse)</h2>
                        <button id="toggle-data-btn" onclick="toggleParsedData()" class="text-sm font-semibold text-slate-500 hover:text-slate-800 transition">(Toon)</button>
                    </div>
                    <pre id="parsed-data-output" class="p-4 bg-slate-800 text-white text-xs rounded-lg overflow-x-auto" style="display: none;"></pre>
                </div>
            </div>
        </main>
        
        <!-- Informatie sectie -->
        <footer class="bg-white p-6 md:p-8 rounded-xl shadow-lg">
            <h2 class="text-2xl font-bold text-slate-800 mb-4">Terugkerende Treinpatronen</h2>
            <div class="space-y-6 text-slate-600">
                <div class="p-4 border border-slate-200 rounded-lg">
                    <h4 class="font-semibold text-lg text-slate-800">1. De "Katy Shuttle" (RFO)</h4>
                    <p class="mt-1">Deze shuttle verbindt Knooppunt Kijfhoek met Polen en is een frequente verschijning op de Bentheimroute.</p>
                </div>
                <div class="p-4 border border-slate-200 rounded-lg">
                    <h4 class="font-semibold text-lg text-slate-800">2. De "PCC Shuttle" (RTB Cargo)</h4>
                    <p class="mt-1">Deze shuttle verbindt de Rotterdamse haven met Polen en is een vaste gast op het spoor.</p>
                </div>
                <div class="p-4 border border-slate-200 rounded-lg">
                    <h4 class="font-semibold text-lg text-slate-800">3. De "Volvo Trein" (Lineas)</h4>
                    <p class="mt-1">Een vaste shuttle tussen Gent (België) en Zweden, die vaak via Deventer en Zutphen rijdt.</p>
                </div>
            </div>
            <!-- Versienummer toegevoegd -->
            <div class="text-right text-xs text-slate-400 mt-6">
                Versie 1.9
            </div>
        </footer>

    </div>

    <script>
        // --- Globale variabelen en Constanten ---
        let stationData = [], distanceData = {}, trajectories = {}, pathData = {}, debounceTimer;
        
        const spotterAbbr = {
            'A': 'Aankomst', 'V': 'Vertrek', 'D': 'Doorrijden',
            'LSP': 'Linkerspoor', 'LLSP': 'Linker-linkerspoor', 'MSP': 'Middenspoor',
            'RSP': 'Rechterspoor', 'RRSP': 'Rechter-rechterspoor',
            'NVR': 'Niet voor reizigers', 'LM': 'Leeg materieel', 'LLT': 'Losse loc trein',
            'SMS': 'Samenstelling', 'GE': 'Goederenemplacement', 
            'Badl': 'Beladen aan de loc',
            'Ladl': 'Leeg aan de loc'
        };
        const conflictingAbbrs = ['EN', 'DE', 'D', 'A', 'V', 'OP', 'ALS'];

        /**
         * Escapes characters in a string that have a special meaning in regular expressions.
         * @param {string} string The string to escape.
         * @returns {string} The escaped string.
         */
        function escapeRegExp(string) {
            // $& means the whole matched string
            return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }

        // --- Data Laden ---
        async function loadExternalData() {
            const loader = document.getElementById('loader-overlay');
            loader.style.display = 'flex';

            try {
                const [stationResponse, distanceResponse, pathResponse] = await Promise.all([
                    fetch('https://raw.githubusercontent.com/meijbaard/SpotConverter/main/stations.csv'),
                    fetch('https://raw.githubusercontent.com/meijbaard/SpotConverter/main/afstanden.csv'),
                    fetch('https://raw.githubusercontent.com/meijbaard/SpotConverter/main/goederenpaden.csv')
                ]);

                if (!stationResponse.ok) throw new Error(`Fout bij laden stations.csv: ${stationResponse.statusText}`);
                if (!distanceResponse.ok) throw new Error(`Fout bij laden afstanden.csv: ${distanceResponse.statusText}`);
                if (!pathResponse.ok) throw new Error(`Fout bij laden goederenpaden.csv: ${pathResponse.statusText}`);

                const stationCsvText = await stationResponse.text();
                const distanceCsvText = await distanceResponse.text();
                const pathCsvText = await pathResponse.text();
                
                // Parse stations
                const stationLines = stationCsvText.trim().split('\n');
                const stationHeaders = stationLines.shift().split(',').map(h => h.trim());
                const codeIndex = stationHeaders.indexOf('code');
                const nameLongIndex = stationHeaders.indexOf('name_long');
                if (codeIndex === -1 || nameLongIndex === -1) throw new Error("Kolommen 'code' en 'name_long' niet gevonden in stations.csv");
                
                stationData = stationLines.map(line => {
                    const values = line.split(',');
                    return { afkorting: values[codeIndex].trim().toUpperCase(), naam: values[nameLongIndex].trim().replace(/"/g, '') };
                });
                stationData.sort((a, b) => b.afkorting.length - a.afkorting.length);
                populateStationDropdown();

                // Parse afstanden
                const distanceLines = distanceCsvText.trim().split('\n');
                const distanceHeaders = distanceLines.shift().split(',').map(h => h.trim().toUpperCase());
                distanceData = {};
                distanceLines.forEach(line => {
                    const values = line.split(',');
                    const rowStationCode = values.shift().trim().toUpperCase();
                    distanceData[rowStationCode] = {};
                    values.forEach((dist, index) => {
                        const colStationCode = distanceHeaders[index + 1];
                        if (colStationCode) {
                            distanceData[rowStationCode][colStationCode] = parseFloat(dist);
                        }
                    });
                });
                
                // Parse goederenpaden
                const pathLines = pathCsvText.trim().split('\n');
                const pathHeaders = pathLines.shift().split(',').map(h => h.replace(/"/g, '').trim());
                const stationCodeIndex = pathHeaders.indexOf('stationscode');
                const directionIndex = pathHeaders.indexOf('rijrichting');
                const pathMinutesIndex = pathHeaders.indexOf('pad_minuten');
                pathData = {};
                pathLines.forEach(line => {
                    const values = line.split(',').map(v => v.replace(/"/g, '').trim());
                    const stationCode = values[stationCodeIndex];
                    const direction = values[directionIndex];
                    const pathMinutes = values[pathMinutesIndex].split(';').map(Number);
                    
                    if (!pathData[stationCode]) {
                        pathData[stationCode] = {};
                    }
                    pathData[stationCode][direction] = pathMinutes;
                });

                // Definieer trajecten
                trajectories = {
                    "Duitsland-Amersfoort": ["RHEINE", "SALZBERGEN", "BH", "ODZ", "HGLO", "HGL", "BN", "AMRI", "AML", "WDN", "RSN", "HON", "DVC", "DV", "TWL", "APDO", "APD", "STO", "BNVA", "BNV", "AMF"],
                    "Amersfoort-Amsterdam": ["AMF", "AMA", "BRNA", "BRN", "HVS", "HVSM", "BSMZ", "NDB", "WP", "DMN", "ASSP", "ASDM", "ASD", "AWH"],
                    "Amersfoort-Rotterdam": ["AMF", "AMA", "BRNA", "BRN", "HVS", "HVSM", "BSMZ", "NDB", "WP", "DMNZ", "DVA", "ASB", "BKL", "WD", "GD", "RTN", "RTD"]
                };

            } catch (error) {
                console.error("Kon externe data niet laden:", error);
                document.getElementById('output').innerHTML = `<p class="text-red-600 font-bold">Kon de data van GitHub niet laden: ${error.message}. Probeer de pagina te vernieuwen.</p>`;
            } finally {
                loader.style.display = 'none';
            }
        }
        
        // --- UI Functies ---
        function populateStationDropdown() {
            const select = document.getElementById('targetStationSelect');
            select.innerHTML = '';
            [...stationData].sort((a,b) => a.naam.localeCompare(b.naam)).forEach(station => {
                const option = document.createElement('option');
                option.value = station.naam;
                option.textContent = station.naam;
                if (station.naam === "Baarn") option.selected = true;
                select.appendChild(option);
            });
        }

        function toggleParsedData() {
            const dataOutput = document.getElementById('parsed-data-output');
            const toggleBtn = document.getElementById('toggle-data-btn');
            const isHidden = dataOutput.style.display === 'none';
            dataOutput.style.display = isHidden ? 'block' : 'none';
            toggleBtn.textContent = isHidden ? '(Verberg)' : '(Toon)';
        }

        function clearOutputFields() {
            document.getElementById('output').innerHTML = '';
            document.getElementById('estimation-output').innerHTML = '';
            document.getElementById('parsed-data-output').textContent = '';
        }

        // --- Hoofdfunctie ---
        function processMessage() {
            const messageInput = document.getElementById('whatsappMessage').value;
            const targetStationName = document.getElementById('targetStationSelect').value;

            if (!messageInput.trim()) {
                clearOutputFields();
                return;
            }

            const parsedData = parseMessage(messageInput);
            const analysis = analyzeTrajectory(parsedData, targetStationName);
            const outputHtml = createHighlightedMessage(parsedData.originalMessage, parsedData.foundMatches);
            displayResults(outputHtml, analysis, parsedData);
        }

        // --- Opgesplitste Functies ---

        function parseMessage(message) {
            const parsed = {
                originalMessage: message,
                timestamp: null,
                route: [],
                routeCodes: [],
                foundMatches: [],
                spotLocation: null,
                destination: null
            };

            const timeMatch = message.match(/(\d{1,2}[:.]\d{2})/g);
            if (timeMatch) parsed.timestamp = timeMatch[0].replace('.', ':');
            
            stationData.forEach(station => {
                if (spotterAbbr.hasOwnProperty(station.afkorting)) return;
                
                const isConflicting = conflictingAbbrs.includes(station.afkorting.toUpperCase());
                const regexFlags = isConflicting ? 'g' : 'gi';
                const regex = new RegExp(`\\b(${escapeRegExp(station.afkorting)})\\b(?!-)`, regexFlags);
                
                let match;
                while ((match = regex.exec(message)) !== null) {
                    if (!parsed.foundMatches.some(m => m.index === match.index)) {
                        parsed.foundMatches.push({ station: station, index: match.index, text: match[1] });
                    }
                }
            });
            parsed.foundMatches.sort((a, b) => a.index - b.index);

            if (parsed.foundMatches.length === 0) return parsed;

            parsed.spotLocation = parsed.foundMatches[0].station.afkorting;

            const directionMatch = message.match(/\sri\s+([a-zA-Z]+)/i);
            if (directionMatch) {
                const destAbbr = directionMatch[1].toUpperCase();
                const destinationStation = stationData.find(s => s.afkorting === destAbbr);
                if (destinationStation) {
                    parsed.destination = destinationStation.afkorting;
                }
            }

            if (parsed.spotLocation && parsed.destination) {
                parsed.routeCodes = [parsed.spotLocation, parsed.destination];
                const spotStation = stationData.find(s => s.afkorting === parsed.spotLocation);
                const destStation = stationData.find(s => s.afkorting === parsed.destination);
                if (spotStation && destStation) {
                    parsed.route = [spotStation.naam, destStation.naam];
                }
            } else {
                parsed.route = parsed.foundMatches.map(m => m.station.naam);
                parsed.routeCodes = parsed.foundMatches.map(m => m.station.afkorting);
            }

            return parsed;
        }

        function createHighlightedMessage(originalMessage, foundMatches) {
            let processedMessage = originalMessage;

            foundMatches.forEach(match => {
                processedMessage = processedMessage.replace(new RegExp(`\\b${escapeRegExp(match.text)}\\b(?![-<])`, 'g'), `<span class="highlight-station">${match.station.naam}</span>`);
            });

            for (const abbr in spotterAbbr) {
                const regex = new RegExp(`\\b${escapeRegExp(abbr)}\\b(?![-<])`, 'gi');
                processedMessage = processedMessage.replace(regex, (foundText) => {
                    return `<span class="highlight-abbr" title="${spotterAbbr[abbr]}">${foundText}</span>`;
                });
            }
            return processedMessage;
        }

        function analyzeTrajectory(parsedData, targetStationName) {
            const targetStationCode = stationData.find(s => s.naam === targetStationName)?.afkorting;
            let passageHtml = "Geen route herkend in het bericht.";
            let timeHtml = "Geen station of tijdstip gevonden om een berekening te maken.";

            const trajectoryAnalysis = findTrajectoryForRoute(parsedData.routeCodes);
            parsedData.trajectoryAnalysis = trajectoryAnalysis;
            
            if (trajectoryAnalysis) {
                const passesTarget = doesTrajectoryPassStation(trajectoryAnalysis, parsedData.routeCodes[0], parsedData.routeCodes[1], targetStationCode);
                
                let generalDirection = "Onbekend";
                let directionKey = "";
                if (trajectoryAnalysis.direction === 'forward') {
                    if (trajectoryAnalysis.name.includes('Duitsland-Amersfoort')) {
                        generalDirection = 'Nederland in';
                        directionKey = 'WEST';
                    } else {
                        generalDirection = 'Westwaarts';
                        directionKey = 'WEST';
                    }
                } else {
                    if (trajectoryAnalysis.name.includes('Duitsland-Amersfoort')) {
                        generalDirection = 'Nederland uit';
                        directionKey = 'OOST';
                    } else {
                        generalDirection = 'Oostwaarts';
                        directionKey = 'OOST';
                    }
                }
                passageHtml = `Rijrichting: 🚂 <strong>${generalDirection}</strong> | Passage ${targetStationName}: <strong>${passesTarget ? '✅ Ja' : '❌ Nee'}</strong>`;
                
                if (passesTarget) {
                    if (parsedData.spotLocation && parsedData.timestamp && targetStationCode) {
                        const firstSpottedStationName = stationData.find(s => s.afkorting === parsedData.spotLocation)?.naam || parsedData.spotLocation;
                        let arrivalTime;
                        let timeBlurb = "";

                        const distance = distanceData[parsedData.spotLocation]?.[targetStationCode];
                        let roughArrivalDate;
                        if (distance !== undefined) {
                            const averageSpeedKmH = 80;
                            const travelMinutes = Math.round((distance / averageSpeedKmH) * 60);
                            const [hours, minutes] = parsedData.timestamp.split(':').map(Number);
                            roughArrivalDate = new Date();
                            roughArrivalDate.setHours(hours, minutes, 0, 0);
                            roughArrivalDate.setMinutes(roughArrivalDate.getMinutes() + travelMinutes);
                        }

                        if (!roughArrivalDate) {
                             timeHtml = `<p>Geen afstandsdata gevonden tussen <span class="font-bold">${firstSpottedStationName}</span> en <span class="font-bold">${targetStationName}</span>.</p>`;
                        } else {
                            const pathInfo = pathData[targetStationCode]?.[directionKey];

                            if (pathInfo && pathInfo.length === 2) {
                                timeBlurb = " (volgens goederenpad)";
                                let arrivalDate = new Date(roughArrivalDate.getTime());
                                const [minute1, minute2] = pathInfo.sort((a,b) => a-b);
                                const currentMinutes = arrivalDate.getMinutes();

                                if (currentMinutes <= minute1) {
                                    arrivalDate.setMinutes(minute1);
                                } else if (currentMinutes <= minute2) {
                                    arrivalDate.setMinutes(minute2);
                                } else {
                                    arrivalDate.setHours(arrivalDate.getHours() + 1);
                                    arrivalDate.setMinutes(minute1);
                                }
                                arrivalDate.setSeconds(0, 0);
                                arrivalTime = arrivalDate.toTimeString().substring(0, 5);
                            } else {
                                timeBlurb = " (ruwe schatting)";
                                arrivalTime = roughArrivalDate.toTimeString().substring(0, 5);
                            }
                            
                            timeHtml = `⏰ Geschatte doorkomsttijd in <span class="font-bold">${targetStationName}</span>${timeBlurb}: <strong class="highlight-estimation">${arrivalTime}</strong> <br> <span class="text-sm text-slate-500">(vanaf ${firstSpottedStationName})</span>`;
                        }
                    } else {
                        timeHtml = "Geen station of tijdstip gevonden om een berekening te maken.";
                    }
                } else {
                    timeHtml = `<p>Tijdsberekening niet van toepassing.</p>`;
                }
            } else if (parsedData.route.length > 1) {
                passageHtml = "Kan geen bekend traject matchen met de gespotte route.";
            }
            
            return { passageHtml, timeHtml };
        }

        function displayResults(outputHtml, analysis, parsedData) {
            document.getElementById('output').innerHTML = outputHtml;
            document.getElementById('estimation-output').innerHTML = `<div>${analysis.passageHtml}</div><div>${analysis.timeHtml}</div>`;
            document.getElementById('parsed-data-output').textContent = JSON.stringify(parsedData, null, 2);
        }

        // --- Hulpfuncties ---

        function findTrajectoryForRoute(routeCodes) {
            if (routeCodes.length < 2) return null;
            const startCode = routeCodes[0];
            const endCode = routeCodes[1];

            const isSubsequence = (sub, main) => {
                let i = 0, j = 0;
                while (i < main.length && j < sub.length) {
                    if (main[i] === sub[j]) j++;
                    i++;
                }
                return j === sub.length;
            };

            for (const name in trajectories) {
                const traject = trajectories[name];
                if (isSubsequence(routeCodes, traject)) return { name: name, direction: 'forward' };
                if (isSubsequence(routeCodes, [...traject].reverse())) return { name: name, direction: 'backward' };
            }

            const hub = "AMF";
            let startTrajectName = null;
            let endTrajectName = null;

            for (const name in trajectories) {
                if (trajectories[name].includes(startCode)) startTrajectName = name;
                if (trajectories[name].includes(endCode)) endTrajectName = name;
            }

            if (startTrajectName && endTrajectName && startTrajectName !== endTrajectName) {
                const startTraj = trajectories[startTrajectName];
                const endTraj = trajectories[endTrajectName];

                if (startTraj.includes(hub) && endTraj.includes(hub)) {
                    const validStartToHub = isSubsequence([startCode, hub], startTraj) || isSubsequence([startCode, hub], [...startTraj].reverse());
                    const validHubToEnd = isSubsequence([hub, endCode], endTraj) || isSubsequence([hub, endCode], [...endTraj].reverse());

                    if (validStartToHub && validHubToEnd) {
                        const finalLegDirection = isSubsequence([hub, endCode], endTraj) ? 'forward' : 'backward';
                        return {
                            name: `${startTrajectName} -> ${endTrajectName}`,
                            direction: finalLegDirection
                        };
                    }
                }
            }

            return null;
        }

        function doesTrajectoryPassStation(trajectoryAnalysis, startCode, endCode, targetStationCode) {
            if (!trajectoryAnalysis || !targetStationCode) return false;

            const hub = "AMF";
            const trajectNames = trajectoryAnalysis.name.split(' -> ');

            const isBetween = (line, p1, p2, target) => {
                const idx1 = line.indexOf(p1);
                const idx2 = line.indexOf(p2);
                const idxTarget = line.indexOf(target);
                if (idx1 === -1 || idx2 === -1 || idxTarget === -1) return false;
                return (idxTarget >= Math.min(idx1, idx2) && idxTarget <= Math.max(idx1, idx2));
            };

            if (trajectNames.length === 1) {
                const line = trajectories[trajectNames[0]];
                return isBetween(line, startCode, endCode, targetStationCode);
            }

            if (trajectNames.length === 2) {
                const firstLegLine = trajectories[trajectNames[0]];
                if (isBetween(firstLegLine, startCode, hub, targetStationCode)) {
                    return true;
                }
                
                const secondLegLine = trajectories[trajectNames[1]];
                if (isBetween(secondLegLine, hub, endCode, targetStationCode)) {
                    return true;
                }
            }

            return false;
        }


        function debounceProcessMessage() {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(processMessage, 300);
        }

        // --- Initialisatie ---
        window.onload = loadExternalData;
    </script>
</body>
</html>
