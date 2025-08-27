// --- Global Variables ---
let stations = [], distanceMatrix = {}, trajectories = {}, pathData = {}, parsedMessage = null, debounceTimeout = null, searchDebounceTimeout = null, heatmapData = {}, trainPatterns = {}, materieelDatabase = {};

// --- Helper Functions & Data Loading ---
async function loadData(){const e=document.getElementById("loader-overlay");e.style.display="flex";try{await Promise.all([loadStations(),loadAfstanden(),loadHeatmap(),loadPatterns(),loadGoederenpaden(),loadTrajectories(),loadMaterieel()]),populateStationDropdowns(),populateHeatmapDayDropdown(),updateHeatmap(),document.getElementById("patronen-output")&&renderPatronen(),processMessage(),searchStations()}catch(t){console.error("Error loading initial data:",t),document.getElementById("journey-output").innerHTML=`<p class="text-red-600 font-bold">Kon de data niet laden: ${t.message}.</p>`}finally{e.style.display="none"}}
async function loadMaterieel(){try{let e=await fetch("materieel.json");if(!e.ok)throw new Error(`Failed to load materieel.json: ${e.statusText}`);materieelDatabase=await e.json()}catch(e){console.error("Could not load materieel.json. Using empty database.",e),materieelDatabase={exact:{},types:{},wagons:{},default:"default-loc.png"}}}
function getStationByCode(e){return stations.find(t=>t.code===e?.toUpperCase())}
function debounceProcessMessage(){clearTimeout(debounceTimeout),debounceTimeout=setTimeout(processMessage,350)}
function debounceSearch(){clearTimeout(searchDebounceTimeout),searchDebounceTimeout=setTimeout(searchStations,300)}
async function loadStations(){let e=await fetch("https://raw.githubusercontent.com/meijbaard/SpotConverter/main/stations.csv");if(!e.ok)throw new Error(`Failed to load stations.csv: ${e.statusText}`);let t=await e.text(),[a,...s]=t.trim().split("\n"),o=a.split(",").map(e=>e.trim().replace(/"/g,""));stations=s.map(e=>{const t=e.split(",");let a={};return o.forEach((e,s)=>{a[e]=(t[s]||"").trim().replace(/"/g,"")}),a}),stations.sort((e,t)=>(t.code?.length||0)-(e.code?.length||0))}
async function loadAfstanden(){let e=await fetch("https://raw.githubusercontent.com/meijbaard/SpotConverter/main/afstanden.csv");if(!e.ok)throw new Error(`Failed to load afstanden.csv: ${e.statusText}`);let t=await e.text(),a=t.trim().split("\n"),s=a[0].split(",").map(e=>e.trim().toUpperCase());distanceMatrix={},a.slice(1).forEach(t=>{let a=t.split(","),o=a[0].trim().toUpperCase();distanceMatrix[o]={},s.slice(1).forEach((e,t)=>{distanceMatrix[o][e.trim().toUpperCase()]=Number(a[t+1]||0)})})}
async function loadGoederenpaden(){let e=await fetch("https://raw.githubusercontent.com/meijbaard/SpotConverter/main/goederenpaden.csv");if(!e.ok)throw new Error(`Failed to load goederenpaden.csv: ${e.statusText}`);let t=await e.text(),a=t.trim().split("\n"),s=a.shift().split(",").map(e=>e.replace(/"/g,"").trim()),o=s.indexOf("stationscode"),n=s.indexOf("rijrichting"),i=s.indexOf("pad_minuten");pathData={},a.forEach(t=>{const a=t.split(",").map(e=>e.replace(/"/g,"").trim()),s=a[o],l=a[n],r=a[i].split(";").map(Number);pathData[s]||(pathData[s]={}),pathData[s][l]=r})}
async function loadHeatmap(){let e=await fetch("https://raw.githubusercontent.com/meijbaard/SpotConverter/main/heatmap_treinpassages.json");if(!e.ok)throw new Error(`Failed to load heatmap_treinpassages.json: ${e.statusText}`);heatmapData=await e.json()}
async function loadPatterns(){let e=await fetch("https://raw.githubusercontent.com/meijbaard/SpotConverter/main/treinpatronen.json");if(!e.ok)throw new Error(`Failed to load treinpatronen.json: ${e.statusText}`);trainPatterns=await e.json()}
async function loadTrajectories(){let e=await fetch("https://raw.githubusercontent.com/meijbaard/SpotConverter/main/trajecten.json");if(!e.ok)throw new Error(`Failed to load trajecten.json: ${e.statusText}`);trajectories=await e.json()}
function populateStationDropdowns(){const e=[...new Set(stations.map(e=>e.name_long))].sort((e,t)=>e.localeCompare(t)),t=document.getElementById("targetStationSelect");t.innerHTML="",e.forEach(e=>{const a=stations.find(t=>t.name_long===e);if(a){let e=document.createElement("option");e.value=a.code,e.textContent=a.name_long,t.appendChild(e)}}),t.value="BRN";const a=document.getElementById("heatmapstation");a&&(a.innerHTML="",Object.keys(heatmapData).sort((e,t)=>(getStationByCode(e)?.name_long||e).localeCompare(getStationByCode(t)?.name_long||t)).forEach(e=>{const t=getStationByCode(e)?.name_long||e,s=document.createElement("option");s.value=e,s.textContent=t,a.appendChild(s)}),Object.keys(heatmapData).includes("BRN")&&(a.value="BRN"))}
function populateHeatmapDayDropdown(){const e=document.getElementById("heatmapday");if(!e)return;const t=["maandag","dinsdag","woensdag","donderdag","vrijdag","zaterdag","zondag"];e.innerHTML="",t.forEach(t=>{const a=document.createElement("option");a.value=t,a.textContent=t.charAt(0).toUpperCase()+t.slice(1),e.appendChild(a)});const a=(new Date().getDay()+6)%7;e.value=t[a]}
function searchStations(){const e=document.getElementById("stationSearchInput").value.toLowerCase().trim();if(!stations.length)return;const t=stations.filter(t=>{const a=t.code||"",s=t.name_long||"";return a.toLowerCase().includes(e)||s.toLowerCase().includes(e)});renderSearchResults(t)}
function renderSearchResults(e){const t=document.getElementById("stationSearchResults");if(!t)return;if(0===e.length)return void(t.innerHTML="");const a=e.map(e=>`\n        <div class="bg-white p-4 rounded-lg shadow-md border border-slate-200">\n            <div class="flex justify-between items-start">\n                <h3 class="text-lg font-bold text-cyan-800">${e.name_long||"Onbekend"}</h3>\n                <span class="text-sm font-semibold bg-cyan-100 text-cyan-800 px-2 py-1 rounded-full">${e.code||"N/A"}</span>\n            </div>\n        </div>`).join("");t.innerHTML=a}
function toggleParsedData(){let e=document.getElementById("parsed-data-output"),t=document.getElementById("toggle-data-btn");if(!e||!t)return;const a="none"===e.style.display;e.style.display=a?"block":"none",t.textContent=a?"(Verberg)":"(Toon)"}
function updateHeatmap(){const e=document.getElementById("heatmapstation"),t=document.getElementById("heatmapday");e&&t&&(document.getElementById("heatmap-output").innerHTML=renderHeatmap(e.value,t.value))}
function renderHeatmap(e,t){const a=heatmapData[e]?.[t];if(!a)return"<em>Geen data voor dit station op deze dag.</em>";const s=Object.values(heatmapData[e]).flatMap(e=>Object.values(e));let o=Math.max(...s);0===o&&(o=1);let n=Object.entries(a).sort(([e],[t])=>Number(e)-Number(t)).map(([e,t])=>{let a=0;return t>=Math.max(1,.7*o)?a=3:t>=Math.max(1,.4*o)?a=2:t>0&&(a=1),`<tr><th>${e}:00</th><td class="heatmap-cell" data-level="${a}">${t}</td></tr>`}).join("");return`<table class="heatmap-table"><tr><th>Uur</th><th>Passages</th></tr>${n}</table>`}
function renderPatronen(){const e=document.getElementById("patronen-output");e&&(e.innerHTML=Object.values(trainPatterns||{}).map(e=>`<div class="pattern-block">\n      <div class="pattern-name">${e.name}</div>\n      <div class="mt-1">${e.description}</div>\n      <div class="pattern-route">Route: ${e.commonRouteCodes.map(e=>getStationByCode(e)?.name_long||e).join(" → ")}</div>\n      </div>`).join(""))}

// --- Main Processing Logic ---
function processMessage() {
    const messageInput = document.getElementById('whatsappMessage').value;
    if (!messageInput.trim()) {
        document.getElementById('journey-output').innerHTML = '<p class="text-slate-500">Plak een spotbericht om het reisoverzicht te genereren.</p>';
        document.getElementById('parsed-data-output').textContent = '';
        return;
    }
    parsedMessage = parseMessage(messageInput);
    const targetStationCode = document.getElementById('targetStationSelect').value;
    const analysis = analyzeTrajectory(parsedMessage, targetStationCode);
    displayResults(analysis);
}

function parseMessage(message) {
    const parsed = {
        originalMessage: message, timestamp: null, routeCodes: [], spotLocation: null,
        carrier: null, locomotive: null, cargo: null
    };
    const timeMatch = message.match(/(\d{1,2}[:.]\d{2})/g);
    if (timeMatch) parsed.timestamp = timeMatch[0].replace('.', ':');
    const carriers = ['RFO', 'DBC', 'HSL', 'RTB', 'RTBC', 'LNS', 'SR', 'VR', 'TCS', 'PKP', 'MTR', 'FLP', 'RRF', 'RXP', 'SBB', 'CDC', 'LTE'];
    const carrierRegex = new RegExp(`\\b(${carriers.join('|')})\\b`, 'gi');
    const carrierMatch = message.match(carrierRegex);
    if (carrierMatch) parsed.carrier = carrierMatch[0].toUpperCase();
    
    const locoRegex = /(\b(18|64|186|189|193|2454|4402|9902|9904|10100)[\s-]?\d*\b)/gi;
    const locoMatch = message.match(locoRegex);
    if (locoMatch) parsed.locomotive = locoMatch[0];

    const cargoMap = {'keteltrein': 'ketel', 'containertrein': 'container', 'trailertrein': 'trailer', 'dichtetrein': 'dicht', 'schuifwandwagon': 'dicht'};
    for (const key in cargoMap) {
        if (new RegExp(`\\b${key}\\b`, 'i').test(message)) {
            parsed.cargo = cargoMap[key];
            break; 
        }
    }
    let foundMatches = [];
    stations.forEach(station => {
        if (!station.code) return;
        const regex = new RegExp(`\\b(${station.code})\\b`, 'gi');
        let match;
        while ((match = regex.exec(message)) !== null) {
            foundMatches.push({ station, index: match.index });
        }
    });
    foundMatches.sort((a, b) => a.index - b.index);
    if (foundMatches.length > 0) {
        parsed.spotLocation = foundMatches[0].station;
        parsed.routeCodes = foundMatches.map(m => m.station.code);
    }
    return parsed;
}

function findFullTrajectory(routeCodes) {
    if (routeCodes.length < 1) return null;
    const startCode = routeCodes[0];
    const endCode = routeCodes[routeCodes.length - 1];
    const isSubArray = (arr, sub) => arr.join(',').includes(sub.join(','));

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

function analyzeTrajectory(parsedData, targetStationCode) {
    // Stap 0: Controleer basisgegevens en vind het traject
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

    // Stap 1: Bepaal de correcte rijrichting (WEST = NL in, OOST = NL uit)
    let directionKey;
    if (name.includes('Bentheimroute')) {
        // Voor de Bentheimroute is 'forward' (van Bh naar Amf) per definitie richting WEST (Nederland in).
        directionKey = (direction === 'forward') ? 'WEST' : 'OOST';
    } else {
        // Voor andere routes: 'richting Amersfoort' is OOST, 'weg van Amersfoort' is WEST.
        // We bepalen dit door te kijken of Amersfoort verderop in de route ligt.
        const amfIndexInJourney = journeyStations.indexOf('AMF');
        if (amfIndexInJourney > 0) { // AMF is een bestemming verderop, niet het startpunt.
            directionKey = 'OOST';
        } else { // AMF is het startpunt (index 0) of niet aanwezig in de route.
            directionKey = 'WEST';
        }
    }

    // Stap 2 (Stap A in analyse): Bereken een "ideale" tijdlijn zonder wachttijden
    let journey = [];
    let lastTime = new Date(startDate.getTime());
    let lastStationCode = journeyStations[0];
    
    for (let i = 0; i < journeyStations.length; i++) {
        const stationCode = journeyStations[i];
        let idealTime = new Date(lastTime.getTime());
        
        if (i > 0) {
            const distance = distanceMatrix[lastStationCode]?.[stationCode] || 0;
            const travelMinutes = Math.round((distance / 80) * 60); // 80 km/u gemiddeld
            idealTime.setMinutes(idealTime.getMinutes() + travelMinutes);
        }
        
        // Initialiseer met ideale tijd, wachttijd op 0.
        journey.push({
            code: stationCode,
            name: getStationByCode(stationCode)?.name_long || stationCode,
            idealTime: idealTime,
            finalTime: idealTime, // finalTime is voor nu gelijk aan idealTime
            waitTime: 0
        });
        
        lastTime = idealTime;
        lastStationCode = stationCode;
    }

    // Stap 3 (Stap B in analyse): Bepaal de benodigde vertraging op basis van het doelstation
    const targetStation = journey.find(s => s.code === targetStationCode);
    let totalDelay = 0;
    
    if (targetStation) {
        const pathInfo = pathData[targetStation.code]?.[directionKey];
        if (pathInfo?.length) {
            const idealMinutes = targetStation.idealTime.getMinutes();
            // Vind het eerstvolgende beschikbare "pad" (minuut van het uur)
            let targetMinute = pathInfo.sort((a, b) => a - b).find(m => m >= idealMinutes) ?? (pathInfo[0] + 60);
            
            const targetTime = new Date(targetStation.idealTime.getTime());
            if (targetMinute >= 60) {
                targetTime.setHours(targetTime.getHours() + 1);
                targetMinute -= 60;
            }
            targetTime.setMinutes(targetMinute, 0, 0);
            
            // De vertraging is het verschil tussen de geplande en de ideale aankomsttijd
            totalDelay = Math.round((targetTime - targetStation.idealTime) / 60000);
        }
    }
    
    // Stap 4 (Stap C, D, E in analyse): Wijs wachttijd toe en propageer de vertraging correct
    if (totalDelay > 0) {
        const waitStationCode = directionKey === 'WEST' ? 'AMF' : 'STO';
        const waitStationIndex = journey.findIndex(s => s.code === waitStationCode);

        if (waitStationIndex !== -1) {
            // Stap C: Sla de berekende wachttijd op bij het juiste wachtstation.
            journey[waitStationIndex].waitTime = totalDelay;

            // Stap D: Pas de `finalTime` aan voor HET WACHTSTATION en ALLE VOLGENDE stations.
            for (let i = waitStationIndex; i < journey.length; i++) {
                journey[i].finalTime = new Date(journey[i].idealTime.getTime() + totalDelay * 60000);
            }
        }
    }
    
    // Stap 5: Formatteer de resultaten voor weergave
    const finalJourney = journey.map(s => ({
        ...s,
        time: s.finalTime.toTimeString().substring(0, 5)
    }));

    return { journey: finalJourney, parsedMessage: parsedData };
}

function getTrainInfo(parsedMessage) {
    let locoNumber = parsedMessage.locomotive || "Onbekend";
    let images = [];
    const sortedTypes = Object.keys(materieelDatabase.types).sort((a, b) => b.length - a.length);

    if (parsedMessage.locomotive) {
        const locoClean = parsedMessage.locomotive.replace(/[\s-]/g, '');
        let locoImageFile = materieelDatabase.exact[locoClean];
        
        if (locoImageFile) {
            images.push({ src: `assets/images/${locoImageFile}`});
        } else {
            for (const type of sortedTypes) {
                if (locoClean.startsWith(type)) {
                    locoImageFile = materieelDatabase.types[type];
                    images.push({ src: `assets/images/${locoImageFile}`});
                    break;
                }
            }
        }
    }
    if (images.length === 0) {
         images.push({ src: `assets/images/${materieelDatabase.default}`});
    }

    if (parsedMessage.cargo && materieelDatabase.wagons[parsedMessage.cargo]) {
        for (let i = 0; i < 4; i++) {
            images.push({ src: `assets/images/${materieelDatabase.wagons[parsedMessage.cargo]}`});
        }
    }
    
    return { number: locoNumber, images };
}


function displayResults(analysis) {
    document.getElementById('parsed-data-output').textContent = JSON.stringify(analysis, null, 2);
    const journeyOutput = document.getElementById('journey-output');

    if (!analysis.journey || analysis.journey.length === 0) {
        journeyOutput.innerHTML = `<p class="text-slate-500">Geen geldig traject gevonden. Controleer de stationsvolgorde in je bericht.</p>`;
        return;
    }

    const trainInfo = getTrainInfo(analysis.parsedMessage);
    const imagesHtml = trainInfo.images.map(img => `<img src="${img.src}" onerror="this.style.display='none'" />`).join('');
    
    let cargoText = "goederentrein";
    if (analysis.parsedMessage.cargo) {
        cargoText = analysis.parsedMessage.cargo.charAt(0).toUpperCase() + analysis.parsedMessage.cargo.slice(1) + 'trein';
    }

    const headerHtml = `
      <div class="journey-header">
        <div class="train-info-container">
            <div class="train-visualization">${imagesHtml}</div>
            <div class="train-details">
                <p class="text-sm"><strong>${analysis.parsedMessage.carrier || 'Onbekende'} ${cargoText}</strong></p>
                <p class="text-sm">Locomotief: <strong>${trainInfo.number}</strong> | Richting ${analysis.journey[analysis.journey.length - 1].name}</p>
            </div>
        </div>
        <button id="copy-btn" class="copy-btn">Kopieer Info</button>
      </div>
    `;

    let timelineHtml = '<div class="journey-timeline">';
    analysis.journey.forEach((station, index) => {
        let markerClass = (index === 0 || index === analysis.journey.length - 1) ? 'start-end' : 'intermediate';
        let waitTimeHtml = station.waitTime > 0 && (station.code === 'AMF' || station.code === 'STO') ? `<div style="color: red; font-size: 0.8rem;">verwachte wachttijd ${station.waitTime} min</div>` : '';
        
        timelineHtml += `
            <div class="timeline-station">
                <div class="timeline-time-col">${station.time || '--:--'}</div>
                <div class="timeline-marker-col">
                    <div class="timeline-marker ${markerClass}"></div>
                </div>
                <div class="timeline-station-name-col">
                    <span>${station.name}</span>
                    ${waitTimeHtml}
                </div>
            </div>`;
    });
    timelineHtml += '</div>';
    journeyOutput.innerHTML = headerHtml + timelineHtml;
    
    document.getElementById('copy-btn').addEventListener('click', () => copyJourneyToClipboard(analysis));
}

function copyJourneyToClipboard(analysis) {
    const { journey, parsedMessage } = analysis;
    if (!journey || journey.length === 0) return;

    // Haal het geselecteerde doelstation op
    const targetStationCode = document.getElementById('targetStationSelect').value;
    const targetStation = journey.find(s => s.code === targetStationCode);
    
    const first = journey[0];
    const last = journey[journey.length - 1];
    
    let targetStationText = '';
    // Voeg de doorkomsttijd toe, tenzij het doelstation het begin- of eindpunt is
    if (targetStation && targetStation.code !== first.code && targetStation.code !== last.code) {
        targetStationText = ` | Doorkomst ${targetStation.name}: ~${targetStation.time}`;
    }

    const info = [ parsedMessage.carrier, parsedMessage.locomotive, parsedMessage.cargo ].filter(Boolean).join(' ');
    
    // Stel de definitieve tekst samen
    const textToCopy = `${info} | Gespot: ${first.name} (${first.time})${targetStationText} | Verwacht in ${last.name}: ~${last.time}`;

    navigator.clipboard.writeText(textToCopy).then(() => {
        const btn = document.getElementById('copy-btn');
        btn.textContent = 'Gekopieerd!';
        setTimeout(() => { btn.textContent = 'Kopieer Info'; }, 2000);
    });
}


// --- Event Listeners and Initialization ---
document.addEventListener('DOMContentLoaded', function () {
  const tabContainer = document.getElementById('tab-container');
  tabContainer.addEventListener('click', function (e) {
      if (e.target.classList.contains('tab-btn')) {
          const tabId = e.target.getAttribute('data-tab');
          document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
          e.target.classList.add('active');
          document.querySelectorAll('main').forEach(tab => {
              tab.id.endsWith(tabId) ? tab.classList.remove('hidden') : tab.classList.add('hidden');
          });
      }
  });
  const heatmapStation = document.getElementById('heatmapstation');
  if (heatmapStation) {
    heatmapStation.addEventListener('change', updateHeatmap);
    document.getElementById('heatmapday').addEventListener('change', updateHeatmap);
  }
  loadData();
});