/* =========================================================================
 * SpotConverter Pro – volledige herbouw
 * - Backprop tijdlijn ankerpunten (goederenpaden)
 * - Loc-herkenning: meest specifieke match
 * - Lading-herkenning: robuust
 * - Station-zoeker, Heatmap, Patronen
 * ========================================================================= */

//
// --------------------------- Globale staat -------------------------------
//
let stations = [];                 // [{ code, name_long, lat, lon, ... }, ...]
let distanceMatrix = {};           // { FROM: { TO: km, ... }, ... }
let trajectories = {};             // { "Naam": ["AMF","BRN",...], ... }
let pathData = {};                 // { STATION: { OOST: [minuten], WEST: [minuten] }, ... }
let heatmapData = {};              // { STATION: { "Ma": { "00": n, ... }, ... } }
let trainPatterns = {};            // { patternName: {...}, ... }
let materieelDatabase = {          // geladen uit /materieel.json
  exact: {}, types: {}, wagons: {}, default: "default-loc.png"
};

let parsedMessage = null;
let debounceTimeout = null, searchDebounceTimeout = null;

// CDN/raw data (zoals je huidige repo)
const RAW_BASE = "https://raw.githubusercontent.com/meijbaard/SpotConverter/main";
const URLS = {
  STATIONS: `${RAW_BASE}/stations.csv`,
  AFSTANDEN: `${RAW_BASE}/afstanden.csv`,
  GOEDERENPADEN: `${RAW_BASE}/goederenpaden.csv`,
  HEATMAP: `${RAW_BASE}/heatmap_treinpassages.json`,
  PATRONEN: `${RAW_BASE}/treinpatronen.json`,
  TRAJECTEN: `${RAW_BASE}/trajecten.json`,
  MATERIEEL: `materieel.json`
};

// Alleen hier tonen we expliciete wachttijd
const WAIT_STATIONS = new Set(["AMF", "STO"]);

// fallback rij-snelheid (km/h) voor tijdschatting
const DEFAULT_SPEED_KMH = 80;
const FALLBACK_MINUTES_BETWEEN = 5;

//
// --------------------------- Utilities -----------------------------------
//
const by = (id) => document.getElementById(id);
const fmtTime = (date) => date.toTimeString().slice(0,5);

function parseCSV(text) {
  // Robuuste CSV: ondersteunt ; of , als scheiding
  const sep = text.includes(";") ? ";" : ",";
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  const header = lines.shift().split(sep).map(s => s.trim());
  return lines.map(line => {
    const cols = line.split(sep).map(s => s.trim());
    const o = {};
    header.forEach((h, i) => { o[h] = cols[i] ?? ""; });
    return o;
  });
}

function toNumberSafe(x) {
  // ondersteunt "12,3" en "12.3"
  if (x == null || x === "") return NaN;
  return Number(String(x).replace(",", "."));
}

function getStationByCode(code) {
  const c = (code || "").toUpperCase();
  return stations.find(s => s.code === c);
}

function minutesBetweenKm(km, speedKmh=DEFAULT_SPEED_KMH) {
  if (!km || !isFinite(km)) return FALLBACK_MINUTES_BETWEEN;
  return Math.max(1, Math.round((km / speedKmh) * 60));
}

function travelMinutesBetween(fromCode, toCode) {
  const f = (fromCode||"").toUpperCase(), t = (toCode||"").toUpperCase();
  const km = distanceMatrix[f]?.[t];
  if (km == null) return FALLBACK_MINUTES_BETWEEN;
  return minutesBetweenKm(km);
}

function unique(arr) { return [...new Set(arr)]; }

//
// --------------------------- Data laden ----------------------------------
//
async function loadMaterieel() {
  try {
    const res = await fetch(URLS.MATERIEEL);
    if (!res.ok) throw new Error(res.statusText);
    materieelDatabase = await res.json();
  } catch (e) {
    console.warn("Materieel niet gevonden, gebruik lege database", e);
    materieelDatabase = { exact:{}, types:{}, wagons:{}, default:"default-loc.png" };
  }
}

async function loadStations() {
  const res = await fetch(URLS.STATIONS);
  if (!res.ok) throw new Error(`stations.csv: ${res.statusText}`);
  const rows = parseCSV(await res.text());

  // verwacht minimaal: code, name_long (val terug op name)
  stations = rows.map(r => ({
    code: (r.code || r.CODE || "").toUpperCase(),
    name_long: r.name_long || r.name || r.naam || r.Naam || r.station || r.STATION || r.code,
    lat: toNumberSafe(r.lat || r.latitude || r.Latitude),
    lon: toNumberSafe(r.lon || r.longitude || r.Longitude)
  })).filter(s => s.code);

  // handig voor code-detectie (langste eerst voorkomt 'BR' vóór 'BRN')
  stations.sort((a,b) => (b.code?.length||0) - (a.code?.length||0));
}

async function loadAfstanden() {
  const res = await fetch(URLS.AFSTANDEN);
  if (!res.ok) throw new Error(`afstanden.csv: ${res.statusText}`);
  const text = await res.text();
  const sep = text.includes(";") ? ";" : ",";
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  const headers = lines.shift().split(sep).map(s => s.trim().toUpperCase()); // [ "FROM","AMF","BRN",... ] of [ "STATION","AMF",... ]

  distanceMatrix = {};
  for (const line of lines) {
    const cols = line.split(sep).map(s => s.trim());
    const from = (cols[0]||"").toUpperCase();
    if (!from) continue;
    distanceMatrix[from] = distanceMatrix[from] || {};
    for (let i = 1; i < headers.length; i++) {
      const to = headers[i].toUpperCase();
      const val = toNumberSafe(cols[i]);
      if (!isNaN(val)) distanceMatrix[from][to] = val;
    }
  }
}

async function loadGoederenpaden() {
  const res = await fetch(URLS.GOEDERENPADEN);
  if (!res.ok) throw new Error(`goederenpaden.csv: ${res.statusText}`);
  const text = await res.text();
  const lines = text.trim().split(/\r?\n/).filter(Boolean);

  // Probeer beide vormen:
  // a) station;richting;0,15,30,45
  // b) station,richting,0,15,30,45
  // c) station;richting;0;15;30;45
  pathData = {};
  for (const line of lines.slice(1)) { // sla header over
    const sep = line.includes(";") ? ";" : ",";
    const cols = line.split(sep).map(s => s.trim());
    if (cols.length < 3) continue;
    const st = (cols[0]||"").toUpperCase();
    const dir = (cols[1]||"").toUpperCase(); // "OOST" / "WEST" (verwacht)
    let mins = [];
    if (cols.length === 3 && /[0-9]/.test(cols[2])) {
      // derde kolom kan "0,15,30,45" of "0 15 30 45" zijn
      mins = cols[2].split(/[,\s]+/).map(n => Number(n)).filter(n => Number.isFinite(n));
    } else {
      mins = cols.slice(2).map(n => Number(n)).filter(n => Number.isFinite(n));
    }
    if (!st || !dir || mins.length === 0) continue;
    pathData[st] = pathData[st] || {};
    pathData[st][dir] = unique(mins).sort((a,b)=>a-b);
  }
}

async function loadHeatmap() {
  const res = await fetch(URLS.HEATMAP);
  if (!res.ok) throw new Error(`heatmap_treinpassages.json: ${res.statusText}`);
  heatmapData = await res.json();
}

async function loadPatterns() {
  const res = await fetch(URLS.PATRONEN);
  if (!res.ok) throw new Error(`treinpatronen.json: ${res.statusText}`);
  trainPatterns = await res.json();
}

async function loadTrajectories() {
  const res = await fetch(URLS.TRAJECTEN);
  if (!res.ok) throw new Error(`trajecten.json: ${res.statusText}`);
  trajectories = await res.json();
}

async function loadData() {
  const loader = by("loader");
  if (loader) loader.style.display = "block";
  try {
    await Promise.all([
      loadMaterieel(),
      loadStations(),
      loadAfstanden(),
      loadGoederenpaden(),
      loadHeatmap(),
      loadPatterns(),
      loadTrajectories()
    ]);
    populateStationDropdowns();
    populateHeatmapControls();
    renderPatronen();
  } catch (err) {
    console.error(err);
    by("journey-output").innerHTML =
      `<p class="text-red-600 font-semibold">Kon de data niet laden: ${err.message}.</p>`;
  } finally {
    if (loader) loader.style.display = "none";
  }
}

//
// --------------------------- UI helpers ----------------------------------
//
function populateStationDropdowns() {
  const targetSel = by("targetStationSelect");
  if (!targetSel) return;
  targetSel.innerHTML = "";
  // simpele alfabetische lijst op full name
  const opts = [...stations]
    .sort((a,b) => (a.name_long || a.code).localeCompare(b.name_long || b.code));
  for (const st of opts) {
    const o = document.createElement("option");
    o.value = st.code;
    o.textContent = `${st.name_long} (${st.code})`;
    targetSel.appendChild(o);
  }
  // kleine UX: zet BRN als default als aanwezig
  const hasBRN = stations.some(s => s.code === "BRN");
  if (hasBRN) targetSel.value = "BRN";
}

function populateHeatmapControls() {
  const selStation = by("heatmapstation");
  const selDay = by("heatmapday");
  if (!selStation || !selDay) return;

  selStation.innerHTML = "";
  const list = Object.keys(heatmapData).sort();
  for (const s of list) {
    const o = document.createElement("option");
    o.value = s;
    o.textContent = s;
    selStation.appendChild(o);
  }

  // dagen NL volgorde
  const days = ["Ma","Di","Wo","Do","Vr","Za","Zo"];
  selDay.innerHTML = "";
  for (const d of days) {
    const o = document.createElement("option");
    o.value = d;
    o.textContent = d;
    selDay.appendChild(o);
  }

  // default op huidige dag (ma=0)
  const todayIdx = (new Date().getDay() + 6) % 7;
  selDay.value = days[todayIdx];

  // event listeners
  selStation.addEventListener("change", updateHeatmap);
  selDay.addEventListener("change", updateHeatmap);
  updateHeatmap();
}

function toggleParsedData() {
  const pre = by("parsed-data-output");
  const btn = by("toggle-data-btn");
  const showing = pre.style.display !== "none";
  pre.style.display = showing ? "none" : "block";
  if (btn) btn.textContent = showing ? "(Toon)" : "(Verberg)";
}

function debounceProcessMessage() {
  clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(processMessage, 350);
}

function debounceSearch() {
  clearTimeout(searchDebounceTimeout);
  searchDebounceTimeout = setTimeout(searchStations, 300);
}

//
// ---------------------- Parser: message → onderdelen ----------------------
//
function buildLocoRegex() {
  // Combineer exact + type keys, langste eerst (186 vóór 18)
  const tokens = [
    ...Object.keys(materieelDatabase.exact || {}),
    ...Object.keys(materieelDatabase.types || {})
  ].filter(Boolean).sort((a,b) => b.length - a.length)
   .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

  // Match token, optioneel gevolgd door spatie/streep+cijfers (bijv. "186-123")
  if (!tokens.length) return /\b$a/; // never
  return new RegExp(`\\b(?:${tokens.join("|")})(?:[\\s-]?\\d+)?\\b`, "i");
}

function parseMessage(message) {
  const parsed = {
    originalMessage: message,
    timestamp: null,
    routeCodes: [],
    spotLocation: null,
    carrier: null,
    locomotive: null,
    cargo: null
  };

  // Tijd (neem eerste hh:mm of h.mm)
  const timeMatch = message.match(/(\d{1,2}[:.]\d{2})/);
  if (timeMatch) parsed.timestamp = timeMatch[1].replace(".", ":");

  // Carrier-codes (setje meest voorkomende)
  const carriers = ['RFO','DBC','HSL','RTB','RTBC','LNS','LOC','TXL','TX','ERS',
                    'TCS','PKP','MTR','FLP','RRF','RXP','SBB','CDC','LTE'];
  const carrierRegex = new RegExp(`\\b(${carriers.join("|")})\\b`, "i");
  const cMatch = message.match(carrierRegex);
  if (cMatch) parsed.carrier = cMatch[1].toUpperCase();

  // Locomotief (meest specifieke)
  const locoRegex = buildLocoRegex();
  const lMatch = message.match(locoRegex);
  if (lMatch) parsed.locomotive = lMatch[0];

  // Lading (robuust op stam)
  const cargoRules = [
    { re: /\bketel\w*\b/i, key: 'ketel' },
    { re: /\bcontainer\w*\b/i, key: 'container' },
    { re: /\btrailer\w*\b/i, key: 'trailer' },
    { re: /\b(schuifwand|dichte?)\w*\b/i, key: 'dicht' },
    { re: /\bstaal\w*\b/i, key: 'staal' }
  ];
  for (const rule of cargoRules) {
    if (rule.re.test(message)) { parsed.cargo = rule.key; break; }
  }

  // Routecodes (alle bekende stations-codes in tekstvolgorde)
  if (stations.length) {
    const codePattern = new RegExp(`\\b(${stations.map(s=>s.code).join("|")})\\b`, "gi");
    const matches = [...message.matchAll(codePattern)].map(m => m[1].toUpperCase());
    parsed.routeCodes = unique(matches);
    // spotlocatie = eerste code in tekst die als station bekend is
    parsed.spotLocation = parsed.routeCodes[0] || null;
  }

  return parsed;
}

//
// -------------- Traject-constructie vanuit route-codes --------------------
//
function findTrajectoryContaining(code) {
  for (const [name, list] of Object.entries(trajectories)) {
    if (list.includes(code)) return { name, stations: list };
  }
  return null;
}

function sliceBetween(list, a, b) {
  const ia = list.indexOf(a), ib = list.indexOf(b);
  if (ia === -1 || ib === -1) return null;
  if (ia <= ib) return list.slice(ia, ib+1);
  const rev = [...list].reverse();
  const ra = rev.indexOf(a), rb = rev.indexOf(b);
  if (ra === -1 || rb === -1) return null;
  return rev.slice(ra, rb+1);
}

// Hub voor traject-koppeling (Amersfoort Aansluiting)
const HUB = "AMF";

function findFullTrajectory(routeCodes) {
  if (!routeCodes || routeCodes.length < 2) return null;

  const known = routeCodes.filter(c => getStationByCode(c));
  if (known.length < 2) return null;

  const startCode = known[0];
  const endCode = known[known.length - 1];

  const startTraj = findTrajectoryContaining(startCode);
  const endTraj   = findTrajectoryContaining(endCode);

  // Zelfde traject?
  if (startTraj && startTraj === endTraj) {
    const seg = sliceBetween(startTraj.stations, startCode, endCode);
    if (seg) return { name: startTraj.name, direction: (startTraj.stations.indexOf(startCode) <= startTraj.stations.indexOf(endCode)) ? "FORWARD" : "BACKWARD", stations: seg };
  }

  // Verschillende trajecten: koppel via HUB
  if (startTraj && endTraj) {
    const first = sliceBetween(startTraj.stations, startCode, HUB);
    const second = sliceBetween(endTraj.stations, HUB, endCode);
    if (first && second) {
      // richting is approx. richting van second segment
      const dir = (endTraj.stations.indexOf(HUB) <= endTraj.stations.indexOf(endCode)) ? "FORWARD" : "BACKWARD";
      return { name: `${startTraj.name} → ${endTraj.name}`, direction: dir, stations: [...first, ...second.slice(1)] };
    }
  }

  // Fallback: probeer in elk geval een minimale keten door alle bekende codes te verbinden
  const chain = unique(known);
  return { name: "Ad-hoc route", direction: "FORWARD", stations: chain };
}

//
// -------------------------- Tijdlijn analyse ------------------------------
//
function chooseDirectionKey(trajectoryInfo) {
  // Goederenpaden bevatten vaak 'OOST'/'WEST'. We leiden dit af van
  // de geografische ligging (oostelijker eindpunt → OOST).
  try {
    const stFirst = getStationByCode(trajectoryInfo.stations[0]);
    const stLast  = getStationByCode(trajectoryInfo.stations[trajectoryInfo.stations.length - 1]);
    if (stFirst && stLast) {
      return (stLast.lon > stFirst.lon) ? "OOST" : "WEST";
    }
  } catch {}
  return "OOST";
}

function analyzeTrajectory(parsedData) {
  if (!parsedData.timestamp || !parsedData.routeCodes.length) {
    return { journey: null, parsedMessage: parsedData };
  }

  const trajectoryInfo = findFullTrajectory(parsedData.routeCodes);
  if (!trajectoryInfo) return { journey: null, parsedMessage: parsedData };

  const { name, stations: journeyStations } = trajectoryInfo;

  // starttijd op vandaag
  const [HH, MM] = parsedData.timestamp.split(":").map(Number);
  const start = new Date();
  start.setHours(HH || 0, MM || 0, 0, 0);

  // 1) Ideale tijdlijn (alleen rijtijd)
  const idealJourney = journeyStations.map((code, i) => {
    if (i === 0) return { code, time: new Date(start) };
    const mins = travelMinutesBetween(journeyStations[i-1], code);
    const t = new Date(idealJourney[i-1].time.getTime() + mins*60000);
    return { code, time: t };
  });

  // 2) Realistische tijdlijn initieel = kopie
  const realisticJourney = idealJourney.map(s => ({ code: s.code, time: new Date(s.time) }));

  // 3) Ankerpunten toepassen (goederenpaden) + back/forward propagate
  const dirKey = chooseDirectionKey(trajectoryInfo);

  function applyAnchorAt(index) {
    const st = realisticJourney[index];
    const code = st.code;
    const minsList = pathData[code]?.[dirKey];
    if (!minsList || !minsList.length) return false;

    // kies dichtstbijzijnde volgende minuut op/na de huidige minuut
    const curMin = st.time.getMinutes();
    let target = minsList.find(m => curMin <= m);
    const anchored = new Date(st.time);
    if (target === undefined) {
      target = minsList[0];
      anchored.setHours(anchored.getHours() + 1);
    }
    anchored.setMinutes(target, 0, 0);
    st.time = anchored;

    // FORWARD: na anker: pure rijtijd
    for (let j = index + 1; j < realisticJourney.length; j++) {
      const prev = realisticJourney[j-1].code;
      const cur  = realisticJourney[j].code;
      const mins = travelMinutesBetween(prev, cur);
      realisticJourney[j].time = new Date(realisticJourney[j-1].time.getTime() + mins*60000);
    }
    // BACKWARD: vóór anker: pure rijtijd (terugrekenen)
    for (let j = index - 1; j >= 0; j--) {
      const next = realisticJourney[j+1].code;
      const cur  = realisticJourney[j].code;
      const mins = travelMinutesBetween(cur, next);
      realisticJourney[j].time = new Date(realisticJourney[j+1].time.getTime() - mins*60000);
    }
    return true;
  }

  // loop door alle stations; als er pad-minuten zijn → anker
  for (let i = 0; i < realisticJourney.length; i++) {
    applyAnchorAt(i);
  }

  // 4) Eindreeks + wachttijd-badge alleen op AMF/STO
  const finalJourney = realisticJourney.map((node, idx) => {
    const info = getStationByCode(node.code) || { name_long: node.code };
    const wait = Math.max(0, Math.round((node.time - idealJourney[idx].time)/60000));
    return {
      code: node.code,
      name: info.name_long || node.code,
      time: fmtTime(node.time),
      waitTime: WAIT_STATIONS.has(node.code) && wait > 1 ? wait : 0
    };
  });

  return { name, journey: finalJourney, parsedMessage: parsedData };
}

//
// --------------------------- Materieel info --------------------------------
//
function getTrainInfo(parsedMessage) {
  let images = [];
  let locoLabel = parsedMessage.locomotive || "Onbekend";

  // 1) exact match op '1234' / '9902' etc.
  if (parsedMessage.locomotive) {
    const clean = parsedMessage.locomotive.replace(/[\s-]/g, "");
    const exactImg = materieelDatabase.exact?.[clean];
    if (exactImg) images.push({ src: `assets/images/${exactImg}` });

    // 2) type match (langste eerst)
    if (images.length === 0) {
      const types = Object.keys(materieelDatabase.types || {}).sort((a,b)=>b.length-a.length);
      for (const t of types) {
        if (clean.startsWith(t)) {
          images.push({ src: `assets/images/${materieelDatabase.types[t]}` });
          break;
        }
      }
    }
  }

  // Wagon (lading) afbeelding
  if (parsedMessage.cargo) {
    const wagonFile = materieelDatabase.wagons?.[parsedMessage.cargo];
    if (wagonFile) images.push({ src: `assets/images/${wagonFile}` });
  }

  // fallback
  if (images.length === 0 && materieelDatabase.default) {
    images.push({ src: `assets/images/${materieelDatabase.default}` });
  }

  return { locoLabel, images };
}

//
// --------------------------- Rendering ------------------------------------
//
function renderTimeline(analysis) {
  const { journey } = analysis;
  if (!journey || journey.length === 0) {
    return `<p class="text-slate-500">Plak een spotbericht om het reisoverzicht te genereren.</p>`;
  }
  const rows = journey.map(st => `
    <div class="flex items-start gap-3 py-2 border-b border-slate-100">
      <div class="w-16 shrink-0 font-mono text-slate-800">${st.time}</div>
      <div class="grow">
        <div class="font-semibold text-slate-800">${st.name} <span class="text-slate-400">(${st.code})</span></div>
        ${st.waitTime ? `<div class="text-xs text-slate-500 mt-1">wachttijd ~ ${st.waitTime} min</div>` : ``}
      </div>
    </div>
  `).join("");
  return `<div class="ns-timeline">${rows}</div>`;
}

function displayResults(analysis) {
  const target = by("journey-output");
  const { parsedMessage } = analysis;

  const trainInfo = getTrainInfo(parsedMessage);
  const infoLine = [
    parsedMessage.carrier,
    parsedMessage.locomotive,
    parsedMessage.cargo ? `${parsedMessage.cargo}trein` : null
  ].filter(Boolean).join(" · ");

  const imagesHtml = trainInfo.images.map(img =>
    `<img src="${img.src}" class="h-10 inline-block align-middle mr-2" alt="materieel">`
  ).join("");

  const headerHtml = `
    <div class="flex items-center justify-between mb-4">
      <div>
        <div class="text-slate-500 text-xs uppercase tracking-wide">Spot</div>
        <div class="text-lg font-bold text-slate-800">${infoLine || "Onbekende trein"}</div>
      </div>
      <div class="flex items-center">
        ${imagesHtml}
        <button id="copy-btn" class="ml-3 px-3 py-2 text-xs rounded bg-slate-900 text-white hover:opacity-90">Kopieer Info</button>
      </div>
    </div>
  `;

  const timelineHtml = renderTimeline(analysis);
  target.innerHTML = headerHtml + timelineHtml;

  // parsed-data (debug)
  const parsedBox = by("parsed-data-output");
  if (parsedBox) {
    parsedBox.textContent = JSON.stringify(analysis, (k,v)=>v instanceof Date ? v.toISOString() : v, 2);
  }

  // copy knop
  const btn = by("copy-btn");
  if (btn) {
    btn.addEventListener("click", () => copyJourneyToClipboard(analysis));
  }
}

function copyJourneyToClipboard(analysis) {
  const { journey, parsedMessage } = analysis;
  if (!journey || journey.length < 1) return;
  const first = journey[0], last = journey[journey.length - 1];
  const info = [ parsedMessage.carrier, parsedMessage.locomotive, parsedMessage.cargo ].filter(Boolean).join(" ");
  const text = `${info} | Gespot: ${first.name} (${first.time}) | Verwacht in ${last.name}: ~${last.time}`;
  navigator.clipboard.writeText(text).then(() => {
    const btn = by('copy-btn');
    if (!btn) return;
    const old = btn.textContent;
    btn.textContent = 'Gekopieerd!';
    setTimeout(()=>{ btn.textContent = old; }, 1500);
  });
}

//
// --------------------- Station-zoeker / Heatmap / Patronen ----------------
//
function searchStations() {
  const q = (by("stationSearchInput")?.value || "").trim().toLowerCase();
  const results = !q ? [] : stations.filter(s =>
    s.code.toLowerCase().includes(q) || (s.name_long||"").toLowerCase().includes(q)
  );
  renderSearchResults(results);
}

function renderSearchResults(list) {
  const out = by("stationSearchResults");
  if (!out) return;
  if (!list.length) { out.innerHTML = `<p class="text-slate-500">Geen resultaten.</p>`; return; }

  out.innerHTML = list.map(s => `
    <div class="p-4 rounded-lg border border-slate-200 bg-white shadow-sm">
      <div class="text-sm text-slate-500">${s.code}</div>
      <div class="font-semibold text-slate-800">${s.name_long || s.code}</div>
      ${(Number.isFinite(s.lat) && Number.isFinite(s.lon)) ? `<div class="text-xs text-slate-500 mt-1">(${s.lat.toFixed(4)}, ${s.lon.toFixed(4)})</div>` : ``}
    </div>
  `).join("");
}

function updateHeatmap() {
  const st = by("heatmapstation")?.value;
  const day = by("heatmapday")?.value;
  const out = by("heatmap-output");
  if (!st || !day || !out) return;
  out.innerHTML = renderHeatmap(st, day);
}

function renderHeatmap(station, dayName) {
  const dayData = heatmapData?.[station]?.[dayName];
  if (!dayData) return `<p class="text-slate-500">Geen heatmap-data voor ${station} (${dayName}).</p>`;
  const rows = Object.keys(dayData).sort().map(hh => `
    <tr><td class="px-2 py-1 text-right font-mono">${hh}:00</td><td class="px-2 py-1">${dayData[hh]}</td></tr>
  `).join("");
  return `
    <table class="min-w-[260px] border border-slate-200 rounded overflow-hidden">
      <thead><tr class="bg-slate-50"><th class="px-2 py-1 text-left">Uur</th><th class="px-2 py-1 text-left">Passages</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderPatronen() {
  const out = by("patronen-output");
  if (!out || !Object.keys(trainPatterns||{}).length) return;

  const html = Object.entries(trainPatterns).map(([name, obj]) => {
    const route = (obj?.route || []).map(c => getStationByCode(c)?.name_long || c).join(" → ");
    const freq  = obj?.frequentie || obj?.frequency || "–";
    return `
      <div class="p-4 mb-3 rounded-lg border border-slate-200 bg-white shadow-sm">
        <div class="text-sm text-slate-500">${name}</div>
        <div class="font-semibold text-slate-800">${route || "Onbekende route"}</div>
        <div class="text-xs text-slate-500 mt-1">Frequentie: ${freq}</div>
      </div>
    `;
  }).join("");

  out.innerHTML = html;
}

//
// --------------------------- Hoofdactie -----------------------------------
//
function processMessage() {
  const input = by("whatsappMessage")?.value || "";
  if (!input.trim()) {
    by("journey-output").innerHTML = `<p class="text-slate-500">Plak een spotbericht om het reisoverzicht te genereren.</p>`;
    const pre = by("parsed-data-output"); if (pre) pre.textContent = "";
    return;
  }
  parsedMessage = parseMessage(input);
  const analysis = analyzeTrajectory(parsedMessage);
  displayResults(analysis);
}

//
// --------------------------- Tabs & init ----------------------------------
//
document.addEventListener("DOMContentLoaded", () => {
  // Tabs
  const tabContainer = by("tab-container");
  if (tabContainer) {
    tabContainer.addEventListener("click", (e) => {
      if (!e.target.classList.contains("tab-btn")) return;
      const tabId = e.target.getAttribute("data-tab");
      // activeren
      document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
      e.target.classList.add("active");
      // tonen/verbergen
      document.querySelectorAll("main").forEach(tab => {
        tab.id === `tab-${tabId}` ? tab.classList.remove("hidden") : tab.classList.add("hidden");
      });
    });
  }

  // Heatmap dropdown listeners zitten in populateHeatmapControls()

  // Data laden
  loadData();
});

// Expose voor inline HTML-handlers
window.debounceProcessMessage = debounceProcessMessage;
window.processMessage = processMessage;
window.debounceSearch = debounceSearch;
window.searchStations = searchStations;
window.toggleParsedData = toggleParsedData;
window.updateHeatmap = updateHeatmap;
