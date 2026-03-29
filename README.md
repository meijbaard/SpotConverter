# SpotConverter Pro

![Deploy SpotConverter](https://github.com/meijbaard/SpotConverter/actions/workflows/pages.yml/badge.svg)

SpotConverter Pro is een webapplicatie voor treinspotters. Plak een WhatsApp-spotbericht en de tool analyseert automatisch de route, berekent geschatte doorkomsttijden, toont het materieel en linkt direct door naar externe bronnen zoals treinposities.nl.

Live: **https://spotconverter.markeijbaard.nl** · Versie: **4.0.0** · Licentie: **MIT**

---

## Inhoud

- [Features](#features)
- [Gebruik](#gebruik)
- [WhatsApp-integratie](#whatsapp-integratie)
- [Snel starten](#snel-starten)
- [Local development](#local-development)
- [Data & configuratie](#data--configuratie)
- [OSM-stationvalidatie](#osm-stationvalidatie)
- [Deploy (GitHub Pages)](#deploy-github-pages)
- [Bijdragen](#bijdragen)
- [Bronvermeldingen](#bronvermeldingen)
- [Licentie](#licentie)
- [Changelog](#changelog)

---

## Features

- **Spot Analyse** — Plak een WhatsApp-spotbericht en krijg direct een overzicht van de route, het materieel, de rijrichting en de geschatte doorkomsttijden per station.
- **Vervoerder & locnummer links** — Directe links naar [treinposities.nl](https://treinposities.nl/) voor meer info over de vervoerder of een specifiek locnummer.
- **Complexe routeherkenning** — Herkent doorgaande routes over meerdere trajecten (bijv. Bad Bentheim → Rotterdam via Amersfoort).
- **Automatische route-extrapolatie** — Detecteert het type lading of shuttlenaam en voorspelt de eindbestemming, ook als de spotter geen `e.v.` heeft vermeld.
- **Goederenpadberekening** — Schat doorkomsttijden op basis van vaste goederenpaden, inclusief wachttijden op Amersfoort en Stroe.
- **Materieelvisualisatie** — Toont een afbeelding van de locomotief en wagons op basis van het herkende materieel.
- **Station Zoeker** — Zoek stations op naam of afkorting.
- **Heatmap** — Visualiseer de drukte per station en per dag op basis van historische passages.
- **Treinpatronen** — Bekijk bekende, terugkerende treinroutes.
- **Volledig client-side** — Geen installatie, geen account, geen backend. Alles draait in de browser.

---

## Gebruik

### Spotbericht analyseren

1. Ga naar **https://spotconverter.markeijbaard.nl**
2. Plak je WhatsApp-spotbericht in het invoerveld onder **Spot Analyse**
3. Kies optioneel een doelstation voor extra context
4. De route, tijdlijn en materieelinfo verschijnen direct

**Voorbeeldbericht:**
```
13:07 Bh ri Asd RFO 193 150 met keteltrein
```

**Wat de tool herkent:**
- Tijdstip: `13:07`
- Spotlocatie: `Bh` (Baarn)
- Richting: `ri Asd` (richting Amsterdam)
- Vervoerder: `RFO` (RailForceOne)
- Locomotief: `193 150`
- Lading: `keteltrein`

### Vervoerder en locnummer opzoeken

Wanneer een vervoerder en/of locnummer herkend wordt, verschijnen er direct twee links in de resultaten:

- **Info Vervoerder** → opent de vervoerderspagina op treinposities.nl
- **Zoek Locnummer** → zoekt het locnummer op in de treinposities.nl database

---

## WhatsApp-integratie op iPhone

SpotConverter ondersteunt twee manieren om sneller te werken vanuit WhatsApp op iOS: installeren als app op je homescreen, en een Siri Shortcut die de stap van kopiëren-en-plakken overslaat.

### Stap 1 — Installeer SpotConverter als app op je homescreen

SpotConverter is een Progressive Web App (PWA). Op iPhone kun je hem installeren zodat hij net als een gewone app opent, zonder adresbalk.

1. Open **https://spotconverter.markeijbaard.nl** in **Safari** (niet Chrome of Firefox)
2. Tik op het **deelicoon** onderaan — het vierkantje met de pijl omhoog
3. Scroll in het menu naar beneden en kies **"Zet op beginscherm"**
4. Pas de naam aan naar `SpotConverter` en tik op **"Voeg toe"**

De app verschijnt nu op je homescreen met een eigen icoon en opent volledig schermvullend, zonder browser-interface.

---

### Stap 2 — Maak een iOS Shortcut voor direct openen vanuit WhatsApp

Met deze Shortcut hoef je alleen het spotbericht te kopiëren in WhatsApp. De Shortcut opent SpotConverter automatisch met het bericht al ingevuld.

**Shortcut aanmaken:**

1. Open de **Opdrachten**-app (Shortcuts) op je iPhone
2. Tik op **+** rechtsboven om een nieuwe opdracht te maken
3. Voeg de volgende stappen toe:

| Stap | Actie |
|------|-------|
| 1 | Zoek op **"Klembord"** → voeg **"Haal inhoud van klembord op"** toe |
| 2 | Zoek op **"URL"** → voeg **"Open URL"** toe |
| 3 | Zet als URL: `https://spotconverter.markeijbaard.nl/?q=[Klembord]` |

> Tik in het URL-veld op **"Klembord"** om de variabele in te voegen — typ het niet handmatig.

4. Tik op de naam bovenin en noem de opdracht **"SpotConverter"**
5. Tik op het deelicoon en kies **"Voeg toe aan beginscherm"** voor een snelkoppeling

**Gebruik:**

1. Houd in WhatsApp een spotbericht ingedrukt → tik op **"Kopieer"**
2. Open de Shortcut (via homescreen of Siri: *"Hey Siri, SpotConverter"*)
3. SpotConverter opent direct met het bericht al ingevuld en geanalyseerd

---

> **Android:** Op Android kun je SpotConverter eveneens als PWA installeren via Chrome (drie puntjes → "App installeren"). Een deelknoop-integratie vanuit WhatsApp staat op de roadmap.

---

## Snel starten

1. Ga naar **https://spotconverter.markeijbaard.nl**
2. Plak je spotbericht bij **Spot Analyse**
3. Kies een doelstation voor een geschatte doorkomsttijd
4. Gebruik **Station Zoeker**, **Heatmap** of **Patronen** voor extra context

---

## Local development

Omdat data via relatieve paden wordt ingeladen, heb je een lokale webserver nodig om CORS-problemen te voorkomen:

```bash
# in de root van dit repo
python3 -m http.server 8000
# open daarna: http://localhost:8000
```

**Projectstructuur**

```text
/
├── index.html
├── assets/
│   ├── css/
│   │   └── spotconverter.css
│   └── js/
│       ├── app.js          # initialisatie & event handling
│       ├── state.js        # centrale state
│       ├── api.js          # data laden (CSV/JSON)
│       ├── parser.js       # berichtparser
│       ├── routing.js      # routeanalyse & ETA-berekening
│       └── ui.js           # rendering
├── stations.csv
├── afstanden.csv
├── goederenpaden.csv
├── heatmap_treinpassages.json
├── treinpatronen.json
├── trajecten.json
├── materieel.json
├── CNAME                   # spotconverter.markeijbaard.nl
└── .nojekyll
```

---

## Data & configuratie

| Bestand | Inhoud |
|---|---|
| `stations.csv` | Stationscodes en volledige namen (NL + DE) |
| `afstanden.csv` | Afstandsmatrix in kilometers tussen stations |
| `goederenpaden.csv` | Vaste passage-minuten per station en rijrichting |
| `heatmap_treinpassages.json` | Aantal passages per uur per station |
| `treinpatronen.json` | Bekende terugkerende treinroutes |
| `trajecten.json` | Definities van spoortrajecten als stationscodelijsten |
| `materieel.json` | Koppeling van vervoerders/loctypen aan afbeeldingen |

Wil je een nieuw traject toevoegen? Voeg een entry toe aan `trajecten.json` met een geordende lijst van stationscodes. De routeherkenning pikt dit automatisch op.

---

## OSM-stationvalidatie

Het hulpscript `osm_station_check.py` controleert stations uit `trajecten.json` via OpenStreetMap (Nominatim) en slaat coördinaten op.

**Installatie**
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install pandas requests tqdm
```

**Run**
```bash
python3 osm_station_check.py \
  --trajecten trajecten.json \
  --stations stations.csv \
  --out out_osm \
  --sleep 0.8 \
  --resume
```

Uitvoer:
- `out_osm/osm_stations_found.csv`
- `out_osm/osm_stations_not_found.csv`
- `out_osm/osm_stations_coords.json`

Respecteer de Nominatim rate limit: gebruik `--sleep 0.8` of hoger.

---

## Deploy (GitHub Pages)

Deze repo deployt automatisch via GitHub Actions.

1. Zorg dat aanwezig zijn:
   - `CNAME` met inhoud: `spotconverter.markeijbaard.nl`
   - `.nojekyll` (leeg bestand)
   - `.github/workflows/pages.yml`
2. Ga naar **Settings → Pages**
   - Source: *GitHub Actions*
   - Custom domain: `spotconverter.markeijbaard.nl`
   - Enforce HTTPS aanvinken
3. Commit & push — de workflow publiceert automatisch

---

## Bijdragen

Issues en pull requests zijn welkom via [github.com/meijbaard/SpotConverter/issues](https://github.com/meijbaard/SpotConverter/issues).

Bijdragen kunnen zijn:
- Uitbreidingen of correcties aan `trajecten.json` en andere datasets
- Verbeteringen aan routeherkenning of ETA-berekening
- UI/UX verbeteringen
- Bugfixes

---

## Bronvermeldingen

- **Rijdende Treinen / Open Data** — basislijst met treinstations en afstanden
- **Nico Spilt** — uitgebreide lijst van spotters-afkortingen
- **[treinposities.nl](https://treinposities.nl/)** — database voor vervoerders en locomotieven
- **[ProRail spoorkaart](https://www.prorail.nl/siteassets/homepage/reizen/documenten/pr_spoorkaart_nl2024_web.pdf)** — basis voor trajecten.json
- **[michaeldittrich.de](https://www.michaeldittrich.de/abkuerzungen/index.php)** — Duitse stationsafkortingen
- **[Arthur's Treinenpagina](https://www.arthurstreinenpagina.nl)** — locomotief- en wagonafbeeldingen

---

## Licentie

MIT © 2025 Mark Eijbaard

---

## Changelog

### v4.0.0 — Nieuwe huisstijl & treinposities.nl-integratie

**Visueel:**
- Volledig nieuw kleurschema gebaseerd op de stijl van rijdendetreinen.nl: witte header, lichtblauwe accenten, lichtblauwe invoerkaart
- Verwijdering van alle NS-huisstijlkleuren (blauw #003369 en geel #FFC700)
- Kopieerknop heeft nu een blauwe stijl die past bij het nieuwe thema
- Logo-kleur aangepast naar accent-blauw

**iOS-integratie:**
- SpotConverter is nu een installeerbare PWA (manifest.json + Apple meta-tags)
- URL-parameter `?q=` toegevoegd: open SpotConverter met een vooringevuld bericht via een link
- iOS Shortcut workflow gedocumenteerd: kopieer in WhatsApp → Shortcut opent SpotConverter direct met analyse

**Functionaliteit:**
- Directe links naar treinposities.nl toegevoegd in de resultaten:
  - **Info Vervoerder** — opent de vervoerderspagina
  - **Zoek Locnummer** — zoekt het locnummer op
- Mapping van alle herkende vervoerderscodes (RFO, DBC, HSL, RTBC, LNS, TCS, PKP, MTR, FLP, RRF, RXP, SBB, CDC, LTE, SR, VR) naar de juiste treinposities.nl-slugs

---

### v3.2.0 — Geavanceerde westwaartse routevoorspelling & fallbacks

- **Slimme cargo & shuttle herkenning** — parser herkent specifieke shuttles op naam (Lovosice, Kąty, Nosta, Brwinów, PCC) en corrigeert veelvoorkomende typfouten
- **Automatische route-extrapolatie** — voorspelt eindbestemming (Moerdijk, Sloehaven, Europoort, Maasvlakte, Amsterdam Westhaven) ook zonder `e.v.` in het bericht
- **Veiligheids-fallback** — bij een onbekend pad valt de engine stil terug op de bekende route
- **Cache buster** — dwingt browsers altijd de meest recente databestanden in te laden
- **Wagon-mapping hersteld** — categorie `bulk` (staal, kolen, schroot) krijgt het juiste wagonicoon

### v3.1.0

- Kernlogica voor trajectberekening volledig herschreven
- Rijrichting (OOST/WEST) nu correct bepaald op basis van coördinaten
- Wachttijden correct doorgevoerd naar alle volgende stations
- Verbeterde kopieerfunctie met doorkomsttijd doelstation
- UI-verbeteringen aan de resultaten-header

### v2.9.0

- Repo via GitHub Pages gedeployed op `spotconverter.markeijbaard.nl`
- Station Zoeker toegevoegd
- ETA-logica en trajectcombinaties verbeterd
