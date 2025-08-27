# SpotConverter Pro

![Deploy SpotConverter](https://github.com/meijbaard/SpotConverter/actions/workflows/pages.yml/badge.svg)

SpotConverter Pro is een geavanceerde webapplicatie, specifiek ontworpen voor en door treinspotters en -enthousiastelingen. Het primaire doel van deze tool is om de vaak cryptische en met jargon doorspekte WhatsApp-berichten over treinwaarnemingen te transformeren in heldere, gestructureerde en direct bruikbare informatie.

Waar een simpel spotbericht vaak alleen direct nuttig is voor de ontvanger, ontgrendelt deze tool de onderliggende data. De tool analyseert de inhoud van een spot-bericht, herkent routes op basis van vooraf gedefinierde spoortrajecten en berekent een geschatte passage-tijd voor een door de gebruiker gekozen station, waardoor je sneller en beter kunt anticiperen op naderende treinen.

De applicatie is ontworpen met gebruiksgemak als kernprincipe. Het werkt volledig in de browser en vereist geen installatie. Alle benodigde data, zoals stationslijsten, afstanden, en treinpatronen, wordt dynamisch ingeladen vanaf een centrale, openbare locatie (GitHub). Dit garandeert dat elke gebruiker altijd met de meest actuele informatie werkt.

Live: **https://spotconverter.markeijbaard.nl** Versie: **3.1.0** · Licentie: **MIT**

---

## 🗂️ Inhoud
- [✨ Features](#-features)
- [🚀 Snel starten](#-snel-starten)
- [🛠️ Local development](#️-local-development)
- [🔧 Data & configuratie](#-data--configuratie)
- [🗺️ OSM-stationvalidatie](#️-osm-stationvalidatie)
- [📦 Deploy (GitHub Pages)](#-deploy-github-pages)
- [🤝 Bijdragen](#-bijdragen)
- [📄 Licentie](#-licentie)
- [📝 Changelog](#-changelog)

---

## ✨ Features

* **Multi-Tab Interface:** De functionaliteit is nu opgesplitst in drie duidelijke tabs: "Spot Analyse", "Heatmap" en "Patronen", voor een helder en georganiseerd overzicht.
* **Verbeterde Route-Analyse:** De kern van de tool. Herkent niet alleen routes binnen één traject, maar kan nu ook complexe, doorgaande reizen over meerdere trajecten (bijv. Kijfhoek naar Duitsland via Amersfoort) correct combineren dankzij de verbeterde logica.
* **Dynamische Passage-berekening:** Berekent een geschatte aankomsttijd voor elk willekeurig station in de keuzelijst, gebaseerd op een uitgebreide afstandsmatrix en de data uit de goederenpaden.
* **Dynamische Heatmap:** De heatmap-tab laadt data van GitHub en kan per station en per dag worden bekeken voor een visueel overzicht van de drukste uren.
* **Dynamische Patronen:** De patronen-tab laadt en toont nu alle bekende treinpatronen direct uit het `treinpatronen.json` bestand.
* **Verrijking van Jargon:** Functioneert als een "vertaler" voor spotters-jargon. Veelvoorkomende afkortingen worden automatisch herkend en voorzien van een duidelijke tooltip met de volledige betekenis.
* **Volledig Dynamisch Data Inladen:** Haalt alle benodigde data (stations, afstanden, heatmaps, patronen, en nu ook de spoortrajecten) direct van een centrale GitHub-locatie.
* **Moderne Interface:** Een duidelijke en functionele stijl met een focus op leesbaarheid en een intuïtieve gebruikerservaring.

---

## 🚀 Snel starten

1.  Ga naar **https://spotconverter.markeijbaard.nl**.
2.  Plak je spotbericht bij **Spot Analyse**.
3.  Kies **“Bereken passage voor”** → bekijk ETA, richting en analyse.
4.  Gebruik **Station Zoeker**, **Heatmap** of **Patronen** voor extra context.

---

## 🛠️ Local development

Omdat data vanaf GitHub wordt opgehaald, test je via een klein webservertje (CORS):

```bash
# in de root van dit repo
python3 -m http.server 8000
# open daarna: http://localhost:8000
```

**Projectstructuur**

```text
/
├─ index.html
├─ assets/
│  ├─ css/spotconverter.css
│  └─ js/spotconverter.js
├─ CNAME                      # spotconverter.markeijbaard.nl
└─ .nojekyll                  # leeg, zorgt dat Pages geen Jekyll draait
```

---

## 🔧 Data & Configuratie

De tool laadt alle data extern om de kernlogica gescheiden te houden van de informatie, wat aanpassingen eenvoudig maakt. De volgende bestanden worden gebruikt:

* **`stations.csv`**: Bevat de stationscodes (`code`) en volledige namen (`name_long`), inclusief Nederlandse en Duitse afkortingen.
* **`afstanden.csv`**: Een matrix met de afstanden in kilometers tussen stations. Deze wordt continu uitgebreid voor hogere naukeurigheid.
* **`goederenpaden.csv`**: Definieert de vaste passage-minuten voor goederentreinen op specifieke stations en rijrichtingen.
* **`heatmap_treinpassages.json`**: Bevat de data voor de heatmap, met het aantal passages per uur per station.
* **`treinpatronen.json`**: Een lijst met bekende, terugkerende treinroutes, inclusief beschrijvingen en gemiddelde wachttijden.
* **`trajecten.json`**: De ruggengraat van de routeherkenning. Dit bestand bevat de definities van de hoofd-spoortrajecten als lijsten van stationscodes. Door dit bestand aan te passen, kan de routeherkenning eenvoudig worden uitgebreid of gecorrigeerd.

---

## 🗺️ OSM-stationvalidatie

Het hulpscript `osm_station_check.py` controleert stations uit `trajecten.json` via **OpenStreetMap (Nominatim)** en slaat coördinaten op.

**Installatie**
```bash
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install --upgrade pip
pip install pandas requests tqdm
```

**Één-regelige run**
```bash
curl -L -o stations.csv '[https://raw.githubusercontent.com/meijbaard/SpotConverter/refs/heads/main/stations.csv](https://raw.githubusercontent.com/meijbaard/SpotConverter/refs/heads/main/stations.csv)' \
  && python3 osm_station_check.py --trajecten '[https://raw.githubusercontent.com/meijbaard/SpotConverter/refs/heads/main/trajecten.json](https://raw.githubusercontent.com/meijbaard/SpotConverter/refs/heads/main/trajecten.json)' \
  --stations stations.csv --out out_osm --sleep 0.8 --resume
```

Uitvoer:
- `out_osm/osm_stations_found.csv`
- `out_osm/osm_stations_not_found.csv`
- `out_osm/osm_stations_coords.json` (code → lat/lon)

**Let op:** respecteer Nominatim’s rate limits (`--sleep 0.8` of hoger).

---

## 📦 Deploy (GitHub Pages)

Deze repo is ingesteld op Pages via **GitHub Actions**.

1.  Zorg dat deze bestanden aanwezig zijn:
    - `CNAME` met: `spotconverter.markeijbaard.nl`
    - `.nojekyll` (leeg)
    - `.github/workflows/pages.yml` (workflow die naar Pages deployt)
2.  **Settings → Pages**
    - **Source**: *GitHub Actions*
    - **Custom domain**: `spotconverter.markeijbaard.nl`
    - **Enforce HTTPS** aanvinken zodra beschikbaar
3.  Commit & push → de workflow publiceert automatisch.

---

## 💾 Bronvermeldingen

Voor de data die deze tool aandrijft, is dankbaar gebruik gemaakt van diverse open en publieke bronnen:

* **Open Data van Rijdende Treinen:** De basislijst met treinstations, hun officiële namen en de afstanden tussen stations zijn afkomstig van OpenData.
* **Aanvullende Afkortingen:** De stationsdata is verrijkt met een zeer complete lijst van spotters-afkortingen, verzameld en onderhouden door Nico Spilt op zijn website.
* **Treinposities.nl:** De functionaliteit om direct informatie over vervoerders en specifieke locomotieven op te zoeken wordt mogelijk gemaakt door de uitgebreide database van [treinposities.nl](https://treinposities.nl/).
* **Spoorkaart Nederland:** De trajecten in `trajecten.json` zijn gebaseerd op de officiële [spoorkaart van ProRail](https://www.prorail.nl/siteassets/homepage/reizen/documenten/pr_spoorkaart_nl2024_web.pdf).
* **Duitse Stationsafkortingen:** De afkortingen voor Duitse stations zijn mede mogelijk gemaakt door de uitgebreide lijst op [michaeldittrich.de](https://www.michaeldittrich.de/abkuerzungen/index.php).
* **Locomotief Afbeeldingen:** De afbeeldingen van de diverse locomotieven en wagons zijn met dank aan de uitgebreide collectie op [Arthur's Treinenpagina](https://www.arthurstreinenpagina.nl).

---

## 🤝 Bijdragen

[Issues en PR’s zijn welkom:](https://github.com/meijbaard/SpotConverter/issues)  
Draag bij met:
- uitbreidingen/correcties aan `trajecten.json` en datasets,
- verbeteringen aan UI/UX of performance,
- bugfixes en tests.

---

## 📄 Licentie

MIT © 2025 Mark Eijbaard

---

## 📝 Changelog

### 3.1.0
- **Fundamentele Logica Gecorrigeerd:** De kernlogica voor het berekenen van trajecten (`analyzeTrajectory`) is volledig herschreven.
  - De rijrichting (OOST/WEST) wordt nu correct bepaald op basis van het traject, wat de juiste wachttijden en wachtstations (Amersfoort/Stroe) garandeert.
  - Wachttijden worden nu correct berekend en doorgevoerd naar alle volgende stations in de tijdlijn.
- **Verbeterde Kopieerfunctie:** De "Kopieer Info" knop neemt nu ook de doorkomsttijd van het geselecteerde doelstation op in de gekopieerde tekst.
- **UI/UX Finesse:** De layout van de resultaten-header is verbeterd, zodat de treininformatie niet langer tegen de kopieerknop aanloopt.
- **Bronvermeldingen Bijgewerkt:** Credits voor locomotiefafbeeldingen toegevoegd.

### 2.9.0
- Repo losgetrokken en via GitHub Pages gedeployed op `spotconverter.markeijbaard.nl`.
- **Station Zoeker** toegevoegd; ETA-logica en trajectcombinaties verbeterd.
- UI-tweaks, stabiliteit en documentatie opgefrist.