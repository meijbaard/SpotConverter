/* ========================================================================
 * SpotConverter Pro — complete rebuild (Mark)
 * ========================================================================
 * - Robust data loader (timeouts + allSettled + overlay failsafe)
 * - WhatsApp parser (time, carrier, locomotive, cargo, station codes)
 * - Trajectory building (uses trajecten.json, HUB=AMF, optional target select)
 * - Timeline with anchor minutes (goederenpaden) + forward/back propagation
 * - Wait-badge shown only on AMF & STO
 * - Heatmap / patronen / station-zoeker hooks
 * - Auto re-run once data finished loading
 * ====================================================================== */

//
// --------------------------- Globals -------------------------------------
//
let stations = [];                 // [{code,name_long,lat,lon}]
let distanceMatrix = {};           // { FROM: { TO: km } }
let trajectories = {};             // { TrajName: [codes...] }
let pathData = {};                 // { CODE: { OOST:[m...], WEST:[m...] } }
let heatmapData = {};              // { Station: { Ma:{ "00":n } } }
let trainPatterns = {};            // { name: { route:[codes], frequentie:... } }
let materieelDatabase = { exact:{}, types:{}, wagons:{}, default:"default-loc.png" };

let debounceMsgTimer = null;
let debounceSearchTimer = null;

const HUB = "AMF";
const WAIT_STATIONS = new Set(["AMF","STO"]);
const DEFAULT_SPEED_KMH = 80;
const FALLBACK_MINUTES_BETWEEN = 5;

// Data endpoints
const RAW_BASE = "https://raw.githubusercontent.com/meijbaard/SpotConverter/main";
const URLS = {
  STATIONS: `${RAW_BASE}/stations.csv`,
  AFSTANDEN: `${RAW_BASE}/afstanden.csv`,
  GOEDERENPADEN: `${RAW_BASE}/goederenpaden.csv`,
  HEATMAP: `${RAW_BASE}/heatmap_treinpassages.json`,
  PATRONEN: `${RAW_BASE}/treinpatronen.json`,
  TRAJECTEN: `${RAW_BASE}/trajecten.json`
};

//
// ----------------------- Small helpers -----------------------------------
//
const $ = (id) => document.getElementById(id);
const fmtTime = (d) => d.toTimeString().slice(0,5);

function unique(arr){ return [...new Set(arr)]; }

function toNumberSafe(v){
  if (v == null || v === "") return NaN;
  return Number(String(v).replace(",", "."));
}

function parseCSV(text){
  const sep = text.includes(";") ? ";" : ",";
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  const head = lines.shift().split(sep).map(s=>s.trim());
  return lines.map(line=>{
    const cols = line.split(sep).map(s=>s.trim());
    const o={}; head.forEach((h,i)=>o[h]=cols[i]??"");
    return o;
  });
}

function minutesBetweenKm(km, speed=DEFAULT_SPEED_KMH){
  if (!km || !isFinite(km)) return FALLBACK_MINUTES_BETWEEN;
  return Math.max(1, Math.round((km / speed)*60));
}

function travelMinutesBetween(from, to){
  const f=(from||"").toUpperCase(), t=(to||"").toUpperCase();
  const km = distanceMatrix[f]?.[t];
  return minutesBetweenKm(km);
}

function getStationByCode(code){
  const c=(code||"").toUpperCase();
  return stations.find(s=>s.code===c);
}

//
// ----------------------- Fetch with timeout ------------------------------
//
const FETCH_TIMEOUT_MS = 12000;

async function fetchWithTimeout(url, opts={}, ms=FETCH_TIMEOUT_MS){
  const ctrl = new AbortController();
  const t = setTimeout(()=>ctrl.abort(), ms);
  try{
    const res = await fetch(url, { ...opts, signal: ctrl.signal, cache:"no-store" });
    return res;
  } finally {
    clearTimeout(t);
  }
}

// Overlay failsafe — spinner nooit eeuwig laten staan
function hideLoader(){
  const o = $("loader-overlay");
  if (o) o.style.display = "none";
}
window.addEventListener("error", hideLoader);
window.addEventListener("unhandledrejection", hideLoader);

//
// ----------------------- Data loaders ------------------------------------
//
async function loadMaterieel(){
  const candidates = [
    "materieel.json",
    "/materieel.json",
    "assets/data/materieel.json",
    "/assets/data/materieel.json"
  ];
  for (const url of candidates){
    try{
      const r = await fetchWithTimeout(url);
      if (r.ok){ materieelDatabase = await r.json(); return; }
    }catch{}
  }
  console.warn("Materieel niet gevonden — gebruik lege database.");
  materieelDatabase = { exact:{}, types:{}, wagons:{}, default:"default-loc.png" };
}

async function loadStations(){
  const r = await fetchWithTimeout(URLS.STATIONS);
  if (!r.ok) throw new Error(`stations.csv: ${r.status}`);
  const rows = parseCSV(await r.text());
  stations = rows.map(x=>({
    code: (x.code || x.CODE || "").toUpperCase(),
    name_long: x.name_long || x.name || x.Naam || x.station || x.code,
    lat: toNumberSafe(x.lat || x.latitude || x.Latitude),
    lon: toNumberSafe(x.lon || x.longitude || x.Longitude)
  })).filter(s=>s.code);
  // sorteer op lengte, voorkomt dat "BR" vóór "BRN" matcht
  stations.sort((a,b)=>(b.code?.length||0)-(a.code?.length||0));
}

async function loadAfstanden(){
  const r = await fetchWithTimeout(URLS.AFSTANDEN);
  if (!r.ok) throw new Error(`afstanden.csv: ${r.status}`);
  const t = await r.text();
  const sep = t.includes(";") ? ";" : ",";
  const lines = t.trim().split(/\r?\n/).filter(Boolean);
  const headers = lines.shift().split(sep).map(s=>s.trim().toUpperCase());

  distanceMatrix = {};
  for (const line of lines){
    const cols = line.split(sep).map(s=>s.trim());
    const from = (cols[0]||"").toUpperCase();
    if (!from) continue;
    distanceMatrix[from] = distanceMatrix[from] || {};
    for (let i=1;i<headers.length;i++){
      const to = headers[i];
      const val = toNumberSafe(cols[i]);
      if (!isNaN(val)) distanceMatrix[from][to]=val;
    }
  }
}

async function loadGoederenpaden(){
  const r = await fetchWithTimeout(URLS.GOEDERENPADEN);
  if (!r.ok) throw new Error(`goederenpaden.csv: ${r.status}`);
  const lines = (await r.text()).trim().split(/\r?\n/).filter(Boolean);
  pathData = {};
  for (const line of lines){ // header tolerant
    const sep = line.includes(";") ? ";" : ",";
    const cols = line.split(sep).map(s=>s.trim());
    if (cols.length<3) continue;
    if (/^station$/i.test(cols[0])) continue; // sla header over
    const st  = (cols[0]||"").toUpperCase();
    const dir = (cols[1]||"").toUpperCase();
    let mins = [];
    if (cols.length===3) mins = cols[2].split(/[,\s]+/).map(Number).filter(Number.isFinite);
    else mins = cols.slice(2).map(Number).filter(Number.isFinite);
    if (!st || !dir || !mins.length) continue;
    pathData[st] = pathData[st] || {};
    pathData[st][dir] = unique(mins).sort((a,b)=>a-b);
  }
}

async function loadHeatmap(){
  const r = await fetchWithTimeout(URLS.HEATMAP);
  if (!r.ok) throw new Error(`heatmap: ${r.status}`);
  heatmapData = await r.json();
}

async function loadPatterns(){
  const r = await fetchWithTimeout(URLS.PATRONEN);
  if (!r.ok) throw new Error(`patronen: ${r.status}`);
  trainPatterns = await r.json();
}

async function loadTrajectories(){
  const r = await fetchWithTimeout(URLS.TRAJECTEN);
  if (!r.ok) throw new Error(`trajecten: ${r.status}`);
  trajectories = await r.json();
}

async function loadData(){
  const overlay = $("loader-overlay");
  if (overlay) overlay.style.display = "flex";

  // kill overlay na 15s anyway
  const kill = setTimeout(hideLoader, 15000);

  try{
    const results = await Promise.allSettled([
      loadMaterieel(),
      loadStations(),
      loadAfstanden(),
      loadGoederenpaden(),
      loadHeatmap(),
      loadPatterns(),
      loadTrajectories()
    ]);

    const failed = results.filter(r=>r.status==="rejected");
    if (failed.length){
      const details = failed.map(f=>f.reason?.message||"onbekend").join(" • ");
      const box = $("journey-output");
      if (box){
        box.insertAdjacentHTML("afterbegin",
          `<div class="p-3 mb-3 rounded bg-yellow-50 border border-yellow-300 text-yellow-800">
            Let op: ${failed.length} dataset(s) niet geladen. Details: ${details}
           </div>`);
      }
    }

    populateStationDropdowns();
    populateHeatmapControls();
    renderPatronen();

    // signal: data loaded
    document.dispatchEvent(new CustomEvent("data-loaded"));
  } catch(e){
    const box = $("journey-output");
    if (box) box.innerHTML = `<p class="text-red-600 font-semibold">Dataladen mislukt: ${e.message}</p>`;
  } finally {
    clearTimeout(kill);
    hideLoader();
  }
}

//
// ----------------------- UI helpers --------------------------------------
//
function populateStationDropdowns(){
  const sel = $("targetStationSelect");
  if (!sel) return;
  sel.innerHTML = "";
  const list = [...stations].sort((a,b)=>(a.name_long||a.code).localeCompare(b.name_long||b.code));
  for (const st of list){
    const o = document.createElement("option");
    o.value = st.code;
    o.textContent = `${st.name_long} (${st.code})`;
    sel.appendChild(o);
  }
  if (stations.some(s=>s.code==="BRN")) sel.value="BRN";
}

function populateHeatmapControls(){
  const s = $("heatmapstation"), d = $("heatmapday");
  if (!s || !d) return;
  s.innerHTML=""; d.innerHTML="";
  const stationList = Object.keys(heatmapData||{}).sort();
  for (const st of stationList){
    const o=document.createElement("option"); o.value=st; o.textContent=st; s.appendChild(o);
  }
  const days=["Ma","Di","Wo","Do","Vr","Za","Zo"];
  for (const day of days){
    const o=document.createElement("option"); o.value=day; o.textContent=day; d.appendChild(o);
  }
  d.value = days[(new Date().getDay()+6)%7];
  s.addEventListener("change", updateHeatmap);
  d.addEventListener("change", updateHeatmap);
  updateHeatmap();
}

function renderPatronen(){
  const out = $("patronen-output");
  if (!out) return;
  if (!Object.keys(trainPatterns||{}).length){
    out.innerHTML = `<p class="text-slate-500">Geen patroondata geladen.</p>`;
    return;
  }
  const html = Object.entries(trainPatterns).map(([name,obj])=>{
    const route = (obj?.route||[]).map(c=>getStationByCode(c)?.name_long||c).join(" → ");
    const freq = obj?.frequentie || obj?.frequency || "–";
    return `<div class="p-4 mb-3 rounded-lg border border-slate-200 bg-white shadow-sm">
      <div class="text-sm text-slate-500">${name}</div>
      <div class="font-semibold text-slate-800">${route || "Onbekende route"}</div>
      <div class="text-xs text-slate-500 mt-1">Frequentie: ${freq}</div>
    </div>`;
  }).join("");
  out.innerHTML = html;
}

function updateHeatmap(){
  const st=$("heatmapstation")?.value, day=$("heatmapday")?.value, out=$("heatmap-output");
  if (!st || !day || !out) return;
  const dayData = heatmapData?.[st]?.[day];
  if (!dayData){ out.innerHTML=`<p class="text-slate-500">Geen data.</p>`; return; }
  const rows = Object.keys(dayData).sort().map(h=>`<tr><td class="px-2 py-1 font-mono text-right">${h}:00</td><td class="px-2 py-1">${dayData[h]}</td></tr>`).join("");
  out.innerHTML = `<table class="min-w-[260px] border border-slate-200 rounded overflow-hidden">
    <thead><tr class="bg-slate-50"><th class="px-2 py-1 text-left">Uur</th><th class="px-2 py-1 text-left">Passages</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function toggleParsedData(){
  const pre = $("parsed-data-output"), btn=$("toggle-data-btn");
  if (!pre) return;
  const show = pre.style.display==="none";
  pre.style.display = show ? "block" : "none";
  if (btn) btn.textContent = show ? "(Verberg)" : "(Toon)";
}

//
// ----------------------- Parser ------------------------------------------
//
function buildLocoRegex(){
  const tokens = [
    ...Object.keys(materieelDatabase.exact||{}),
    ...Object.keys(materieelDatabase.types||{})
  ].filter(Boolean).sort((a,b)=>b.length-a.length).map(t=>t.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"));
  if (!tokens.length) return /\b$a/; // never
  return new RegExp(`\\b(?:${tokens.join("|")})(?:[\\s-]?\\d+)?\\b`,"i");
}

function parseMessage(msg){
  const m = {
    originalMessage: msg,
    timestamp: null,
    routeCodes: [],
    spotLocation: null,
    carrier: null,
    locomotive: null,
    cargo: null
  };

  // tijd
  const t = msg.match(/(\d{1,2}[:.]\d{2})/);
  if (t) m.timestamp = t[1].replace(".", ":");

  // carrier
  const carriers = ['RFO','DBC','HSL','RTB','RTBC','LNS','LOC','TXL','TX','ERS','TCS','PKP','MTR','FLP','RRF','RXP','SBB','CDC','LTE'];
  const c = msg.match(new RegExp(`\\b(${carriers.join("|")})\\b`,"i"));
  if (c) m.carrier = c[1].toUpperCase();

  // locomotive
  const locoR = buildLocoRegex();
  const l = msg.match(locoR);
  if (l) m.locomotive = l[0];

  // cargo
  const cargoRules = [
    { re:/\bketel\w*\b/i, key:"ketel" },
    { re:/\bcontainer\w*\b/i, key:"container" },
    { re:/\btrailer\w*\b/i, key:"trailer" },
    { re:/\b(schuifwand|dichte?)\w*\b/i, key:"dicht" },
    { re:/\bstaal\w*\b/i, key:"staal" }
  ];
  for (const r of cargoRules){ if (r.re.test(msg)){ m.cargo=r.key; break; } }

  // stationcodes in tekstvolgorde
  if (stations.length){
    const pat = new RegExp(`\\b(${stations.map(s=>s.code).join("|")})\\b`,"gi");
    const hits = [...msg.matchAll(pat)].map(x=>x[1].toUpperCase());
    m.routeCodes = unique(hits);
    m.spotLocation = m.routeCodes[0] || null;
  }
  return m;
}

//
// ----------------------- Trajectory building ------------------------------
//
function sliceBetween(list, a, b){
  const ia = list.indexOf(a), ib = list.indexOf(b);
  if (ia===-1 || ib===-1) return null;
  if (ia<=ib) return list.slice(ia, ib+1);
  const rev = [...list].reverse();
  const ra = rev.indexOf(a), rb = rev.indexOf(b);
  if (ra===-1 || rb===-1) return null;
  return rev.slice(ra, rb+1);
}

function findTrajByContains(code){
  for (const [name, arr] of Object.entries(trajectories)){
    if (arr.includes(code)) return { name, stations: arr };
  }
  return null;
}

function findFullTrajectory(routeCodes){
  const known = routeCodes.filter(c=>getStationByCode(c));
  const target = $("targetStationSelect")?.value || null;

  if (!known.length && target) return null;
  if (known.length===1 && target && target!==known[0]) known.push(target);

  if (known.length<2) return null;

  const start = known[0], end = known[known.length-1];
  const tStart = findTrajByContains(start);
  const tEnd   = findTrajByContains(end);

  // zelfde traject
  if (tStart && tEnd && tStart===tEnd){
    const seg = sliceBetween(tStart.stations, start, end);
    if (seg) return { name:tStart.name, stations:seg };
  }

  // koppel via HUB
  if (tStart && tEnd){
    const a = sliceBetween(tStart.stations, start, HUB);
    const b = sliceBetween(tEnd.stations, HUB, end);
    if (a && b) return { name:`${tStart.name} → ${tEnd.name}`, stations:[...a, ...b.slice(1)] };
  }

  // fallback: ad hoc keten
  return { name:"Ad-hoc route", stations: unique([start, ...known.slice(1)]) };
}

function chooseDirectionKey(stationsList){
  try{
    const A = getStationByCode(stationsList[0]);
    const B = getStationByCode(stationsList[stationsList.length-1]);
    if (A && B) return (B.lon > A.lon) ? "OOST" : "WEST";
  }catch{}
  return "OOST";
}

//
// ----------------------- Timeline analysis --------------------------------
//
function analyzeTrajectory(parsed){
  if (!parsed.timestamp) return { journey:null, parsedMessage: parsed };

  const traj = findFullTrajectory(parsed.routeCodes);
  if (!traj) return { journey:null, parsedMessage: parsed };

  // starttijd (vandaag)
  const [HH,MM] = parsed.timestamp.split(":").map(Number);
  const t0 = new Date(); t0.setHours(HH||0, MM||0, 0, 0);

  // 1) ideal
  const ideal = traj.stations.map((code,i)=>{
    if (i===0) return { code, time:new Date(t0) };
    const mins = travelMinutesBetween(traj.stations[i-1], code);
    return { code, time:new Date(ideal[i-1].time.getTime()+mins*60000) };
  });

  // 2) realistic init copy
  const real = ideal.map(s=>({ code:s.code, time:new Date(s.time) }));

  // 3) apply anchors + forward/back propagate
  const dirKey = chooseDirectionKey(traj.stations);

  function applyAnchorAt(idx){
    const code = real[idx].code;
    const minsList = pathData[code]?.[dirKey];
    if (!minsList || !minsList.length) return;

    const cur = real[idx].time;
    const curMin = cur.getMinutes();
    const sorted = [...minsList].sort((a,b)=>a-b);
    let target = sorted.find(m=>curMin<=m);
    const anchored = new Date(cur);
    if (target===undefined){ target=sorted[0]; anchored.setHours(anchored.getHours()+1); }
    anchored.setMinutes(target,0,0);
    real[idx].time = anchored;

    // forward
    for (let j=idx+1;j<real.length;j++){
      const prev = real[j-1].code, curc = real[j].code;
      const m = travelMinutesBetween(prev, curc);
      real[j].time = new Date(real[j-1].time.getTime()+m*60000);
    }
    // backward
    for (let j=idx-1;j>=0;j--){
      const nxt = real[j+1].code, curc = real[j].code;
      const m = travelMinutesBetween(curc, nxt);
      real[j].time = new Date(real[j+1].time.getTime()-m*60000);
    }
  }

  for (let i=0;i<real.length;i++) applyAnchorAt(i);

  // 4) final + wait badge
  const finalJourney = real.map((node, idx)=>{
    const info = getStationByCode(node.code) || { name_long: node.code };
    const wait = Math.max(0, Math.round((node.time - ideal[idx].time)/60000));
    return {
      code: node.code,
      name: info.name_long || node.code,
      time: fmtTime(node.time),
      waitTime: (WAIT_STATIONS.has(node.code) && wait>1) ? wait : 0
    };
  });

  return { name: traj.name, journey: finalJourney, parsedMessage: parsed };
}

//
// ----------------------- Train visuals ------------------------------------
//
function getTrainInfo(parsed){
  const imgs = [];
  const label = parsed.locomotive || "Onbekend";
  if (parsed.locomotive){
    const clean = parsed.locomotive.replace(/[\s-]/g,"");
    const ex = materieelDatabase.exact?.[clean];
    if (ex) imgs.push({ src:`assets/images/${ex}` });
    if (!imgs.length){
      const types = Object.keys(materieelDatabase.types||{}).sort((a,b)=>b.length-a.length);
      for (const t of types){ if (clean.startsWith(t)){ imgs.push({ src:`assets/images/${materieelDatabase.types[t]}` }); break; } }
    }
  }
  if (parsed.cargo){
    const w = materieelDatabase.wagons?.[parsed.cargo];
    if (w) imgs.push({ src:`assets/images/${w}` });
  }
  if (!imgs.length && materieelDatabase.default){
    imgs.push({ src:`assets/images/${materieelDatabase.default}` });
  }
  return { locoLabel:label, images:imgs };
}

//
// ----------------------- Rendering ----------------------------------------
//
function renderTimeline(analysis){
  const { journey } = analysis;
  if (!journey || !journey.length){
    return `<p class="text-slate-500">Plak een spotbericht om het reisoverzicht te genereren.</p>`;
  }
  return `<div class="ns-timeline">
    ${journey.map(st=>`
      <div class="flex items-start gap-3 py-2 border-b border-slate-100">
        <div class="w-16 shrink-0 font-mono text-slate-800">${st.time}</div>
        <div class="grow">
          <div class="font-semibold text-slate-800">${st.name} <span class="text-slate-400">(${st.code})</span></div>
          ${st.waitTime ? `<div class="text-xs text-slate-500 mt-1">wachttijd ~ ${st.waitTime} min</div>` : ``}
        </div>
      </div>
    `).join("")}
  </div>`;
}

function displayResults(analysis){
  const target = $("journey-output");
  const { parsedMessage } = analysis;

  const trainInfo = getTrainInfo(parsedMessage);
  const infoLine = [
    parsedMessage.carrier,
    parsedMessage.locomotive,
    parsedMessage.cargo ? `${parsedMessage.cargo}trein` : null
  ].filter(Boolean).join(" · ");

  const imgs = trainInfo.images.map(i=>`<img src="${i.src}" class="h-10 inline-block align-middle mr-2" alt="materieel">`).join("");

  const header = `
    <div class="flex items-center justify-between mb-4">
      <div>
        <div class="text-slate-500 text-xs uppercase tracking-wide">Spot</div>
        <div class="text-lg font-bold text-slate-800">${infoLine || "Onbekende trein"}</div>
      </div>
      <div class="flex items-center">
        ${imgs}
        <button id="copy-btn" class="ml-3 px-3 py-2 text-xs rounded bg-slate-900 text-white hover:opacity-90">Kopieer Info</button>
      </div>
    </div>`;

  target.innerHTML = header + renderTimeline(analysis);

  const pre = $("parsed-data-output");
  if (pre){
    pre.textContent = JSON.stringify(analysis, (k,v)=>v instanceof Date ? v.toISOString() : v, 2);
  }

  const btn = $("copy-btn");
  if (btn){
    btn.addEventListener("click", ()=>copyJourneyToClipboard(analysis));
  }
}

function copyJourneyToClipboard(analysis){
  const { journey, parsedMessage } = analysis;
  if (!journey || !journey.length) return;
  const first = journey[0], last = journey[journey.length-1];
  const info = [parsedMessage.carrier, parsedMessage.locomotive, parsedMessage.cargo].filter(Boolean).join(" ");
  const text = `${info} | Gespot: ${first.name} (${first.time}) | Verwacht in ${last.name}: ~${last.time}`;
  navigator.clipboard.writeText(text).then(()=>{
    const b=$("copy-btn"); if(!b) return;
    const old=b.textContent; b.textContent="Gekopieerd!"; setTimeout(()=>b.textContent=old,1200);
  });
}

//
// ----------------------- Station search -----------------------------------
//
function debounceProcessMessage(){ clearTimeout(debounceMsgTimer); debounceMsgTimer=setTimeout(processMessage, 350); }
function debounceSearch(){ clearTimeout(debounceSearchTimer); debounceSearchTimer=setTimeout(searchStations, 300); }

function searchStations(){
  const q = ($("stationSearchInput")?.value || "").trim().toLowerCase();
  const list = !q ? [] : stations.filter(s =>
    s.code.toLowerCase().includes(q) || (s.name_long||"").toLowerCase().includes(q)
  );
  const out = $("stationSearchResults");
  if (!out) return;
  if (!list.length){ out.innerHTML=`<p class="text-slate-500">Geen resultaten.</p>`; return; }
  out.innerHTML = list.map(s=>`
    <div class="p-4 rounded-lg border border-slate-200 bg-white shadow-sm">
      <div class="text-sm text-slate-500">${s.code}</div>
      <div class="font-semibold text-slate-800">${s.name_long || s.code}</div>
      ${(Number.isFinite(s.lat)&&Number.isFinite(s.lon))?`<div class="text-xs text-slate-500 mt-1">(${s.lat.toFixed(4)}, ${s.lon.toFixed(4)})</div>`:""}
    </div>
  `).join("");
}

//
// ----------------------- Main processing ----------------------------------
//
function processMessage(){
  const input = ($("whatsappMessage")?.value || "");
  const out = $("journey-output");

  if (!input.trim()){
    out.innerHTML = `<p class="text-slate-500">Plak een spotbericht om het reisoverzicht te genereren.</p>`;
    const pre=$("parsed-data-output"); if(pre) pre.textContent="";
    return;
  }

  if (!stations.length || !Object.keys(trajectories||{}).length){
    out.innerHTML = `<p class="text-slate-500">Data wordt nog geladen… ik analyseer zodra het klaar is.</p>`;
    return;
  }

  const parsed = parseMessage(input);
  const analysis = analyzeTrajectory(parsed);
  displayResults(analysis);
}

//
// ----------------------- Boot --------------------------------------------
//
document.addEventListener("DOMContentLoaded", () => {
  // Tabs (indien aanwezig)
  const tabWrap = $("tab-container");
  if (tabWrap){
    tabWrap.addEventListener("click",(e)=>{
      if (!e.target.classList.contains("tab-btn")) return;
      document.querySelectorAll(".tab-btn").forEach(b=>b.classList.remove("active"));
      e.target.classList.add("active");
      const id = e.target.getAttribute("data-tab");
      document.querySelectorAll("main").forEach(m=>{
        m.id===`tab-${id}` ? m.classList.remove("hidden") : m.classList.add("hidden");
      });
    });
  }

  // Input listeners (ook als inline attribuut ontbreekt)
  const ta = $("whatsappMessage");
  if (ta) ta.addEventListener("input", debounceProcessMessage);

  const searchIn = $("stationSearchInput");
  if (searchIn) searchIn.addEventListener("input", debounceSearch);

  // Re-run once data finished, if user pasted already
  document.addEventListener("data-loaded", ()=>{
    if (($("whatsappMessage")?.value || "").trim()) processMessage();
  });

  // Failsafe re-run
  setTimeout(()=>{
    if (($("whatsappMessage")?.value || "").trim()) processMessage();
  }, 2000);

  // Start loading data
  loadData();
});

// Expose (optional inline handlers)
window.debounceProcessMessage = debounceProcessMessage;
window.processMessage = processMessage;
window.debounceSearch = debounceSearch;
window.searchStations = searchStations;
window.toggleParsedData = toggleParsedData;
window.updateHeatmap = updateHeatmap;
