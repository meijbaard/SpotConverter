# SpotConverter Pro

SpotConverter Pro is een geavanceerde webapplicatie, specifiek ontworpen voor en door treinspotters en -enthousiastelingen. Het primaire doel van deze tool is om de vaak cryptische en met jargon doorspekte WhatsApp-berichten over treinwaarnemingen te transformeren in heldere, gestructureerde en direct bruikbare informatie.

Waar een simpel spotbericht vaak alleen direct nuttig is voor de ontvanger, ontgrendelt deze tool de onderliggende data. De tool analyseert de inhoud van een spot-bericht, herkent routes op basis van vooraf gedefinieerde spoortrajecten en berekent een geschatte passage-tijd voor een door de gebruiker gekozen station, waardoor je sneller en beter kunt anticiperen op naderende treinen.

De applicatie is ontworpen met gebruiksgemak als kernprincipe. Het werkt volledig in de browser en vereist geen installatie. Alle benodigde data, zoals stationslijsten, afstanden, en treinpatronen, wordt dynamisch ingeladen vanaf een centrale, openbare locatie (GitHub). Dit garandeert dat elke gebruiker altijd met de meest actuele informatie werkt.

[**Bekijk hier de live versie**](https://www.markeijbaard.nl/spotconverter/)

---

### 🗂️ Inhoudsopgave

* [✨ Features](#-features)
* [🚀 Hoe te Gebruiken](#-hoe-te-gebruiken)
* [🔧 Data & Configuratie](#-data--configuratie)
* [🗺️ OSM-stationvalidatie](#️-osm-stationvalidatie)
* [💾 Bronvermeldingen](#-bronvermeldingen)
* [🤝 Bijdragen](#-bijdragen)
* [📄 Licentie](#-licentie)

---

### ✨ Features

* **Multi-Tab Interface:** De functionaliteit is nu opgesplitst in drie duidelijke tabs: "Spot Analyse", "Heatmap" en "Patronen", voor een helder en georganiseerd overzicht.
* **Verbeterde Route-Analyse:** De kern van de tool. Herkent niet alleen routes binnen één traject, maar kan nu ook complexe, doorgaande reizen over meerdere trajecten (bijv. Kijfhoek naar Duitsland via Amersfoort) correct combineren dankzij de verbeterde logica.
* **Dynamische Passage-berekening:** Berekent een geschatte aankomsttijd voor elk willekeurig station in de keuzelijst, gebaseerd op een uitgebreide afstandsmatrix en de data uit de goederenpaden.
* **Dynamische Heatmap:** De heatmap-tab laadt data van GitHub en kan per station en per dag worden bekeken voor een visueel overzicht van de drukste uren.
* **Dynamische Patronen:** De patronen-tab laadt en toont nu alle bekende treinpatronen direct uit het `treinpatronen.json` bestand.
* **Verrijking van Jargon:** Functioneert als een "vertaler" voor spotters-jargon. Veelvoorkomende afkortingen worden automatisch herkend en voorzien van een duidelijke tooltip met de volledige betekenis.
* **Volledig Dynamisch Data Inladen:** Haalt alle benodigde data (stations, afstanden, heatmaps, patronen, en nu ook de spoortrajecten) direct van een centrale GitHub-locatie.
* **Moderne Interface:** Een duidelijke en functionele stijl met een focus op leesbaarheid en een intuïtieve gebruikerservaring.

---

### 🚀 Hoe te Gebruiken

1. **Open de Applicatie:** Start de tool door het `station_converter.html` bestand te openen in een moderne webbrowser zoals Chrome, Firefox, of Edge. Een internetverbinding is nodig om de meest recente data van GitHub te laden.
2. **Navigeer door de Tabs:** Gebruik de knoppen bovenaan om te wisselen tussen de drie hoofdsecties:
   * **Spot Analyse:** De kernfunctionaliteit voor het analyseren van berichten.
   * **Heatmap:** Bekijk de passagefrequentie per uur voor een geselecteerd station.
   * **Patronen:** Krijg een overzicht van alle bekende, terugkerende treinroutes.
3. **Plak het Bericht:** Kopieer een spot-bericht en plak dit in het tekstveld "Plak je WhatsApp bericht hier:". De tool begint onmiddellijk met de analyse.
4. **Kies je Doelstation:** In de dropdown-lijst "Bereken passage voor:" kun je het station selecteren waarvoor je een passage-tijd wilt weten. Standaard staat deze op "Baarn".
5. **Bekijk de Resultaten:** De resultaten verschijnen direct en worden live bijgewerkt in de verschillende blokken:
   * **Verwerkt Bericht:** De originele tekst, verrijkt met gemarkeerde, volledige stationsnamen en tooltips voor jargon.
   * **Analyse:** Een duidelijke conclusie over de rijrichting en of de trein het gekozen station passeert, inclusief een berekende aankomsttijd.
   * **Geparsede Data:** Een uitklapbaar blok met de technische data (in JSON-formaat) die de tool heeft geëxtraheerd.

---

### 🔧 Data & Configuratie

De tool laadt alle data extern om de kernlogica gescheiden te houden van de informatie, wat aanpassingen eenvoudig maakt. De volgende bestanden worden gebruikt:

* **`stations.csv`**: Bevat de stationscodes (`code`) en volledige namen (`name_long`), inclusief Nederlandse en Duitse afkortingen.
* **`afstanden.csv`**: Een matrix met de afstanden in kilometers tussen stations. Deze wordt continu uitgebreid voor hogere nauwkeurigheid.
* **`goederenpaden.csv`**: Definieert de vaste passage-minuten voor goederentreinen op specifieke stations en rijrichtingen.
* **`heatmap_treinpassages.json`**: Bevat de data voor de heatmap, met het aantal passages per uur per station.
* **`treinpatronen.json`**: Een lijst met bekende, terugkerende treinroutes, inclusief beschrijvingen en gemiddelde wachttijden.
* **`trajecten.json`**: De ruggengraat van de routeherkenning. Dit bestand bevat de definities van de hoofd-spoortrajecten als lijsten van stationscodes. Door dit bestand aan te passen, kan de routeherkenning eenvoudig worden uitgebreid of gecorrigeerd.

---

### 🗺️ OSM-stationvalidatie

Naast de webapplicatie bevat dit project een hulpscript `osm_station_check.py` dat alle stations uit `trajecten.json` controleert in **OpenStreetMap (Nominatim)**. Het script:

- Zoekt per station naar de juiste coördinaten (lat/lon).
- Schrijft tussentijds resultaten weg (**checkpointing**).
- Kan een run hervatten met `--resume`.

#### Installatie

~~~bash
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install --upgrade pip
pip install pandas requests tqdm
~~~

#### Gebruik (één regel)

~~~bash
curl -L -o stations.csv 'https://raw.githubusercontent.com/meijbaard/SpotConverter/refs/heads/main/stations.csv' && python3 osm_station_check.py --trajecten 'https://raw.githubusercontent.com/meijbaard/SpotConverter/refs/heads/main/trajecten.json' --stations stations.csv --out out_osm --sleep 0.8 --resume
~~~

- `--sleep 0.8` voldoet aan de Nominatim usage policy (pas aan als nodig, bijv. `1.0` of `1.2` bij rate limits).
- De resultaten worden opgeslagen in `out_osm/`:
  - `osm_stations_found.csv`
  - `osm_stations_not_found.csv`
  - `osm_stations_coords.json` (code → coördinaten)

---

### 💾 Bronvermeldingen

Voor de data die deze tool aandrijft, is dankbaar gebruik gemaakt van diverse open en publieke bronnen:

* **Open Data van Rijdende Treinen:** De basislijst met treinstations, hun officiële namen en de afstanden tussen stations zijn afkomstig van OpenData.
* **Aanvullende Afkortingen:** De stationsdata is verrijkt met een zeer complete lijst van spotters-afkortingen, verzameld en onderhouden door Nico Spilt op zijn website.
* **Treinposities.nl:** De functionaliteit om direct informatie over vervoerders en specifieke locomotieven op te zoeken wordt mogelijk gemaakt door de uitgebreide database van [treinposities.nl](https://treinposities.nl/).
* **Spoorkaart Nederland:** De trajecten in `trajecten.json` zijn gebaseerd op de officiële [spoorkaart van ProRail](https://www.prorail.nl/siteassets/homepage/reizen/documenten/pr_spoorkaart_nl2024_web.pdf).
* **Duitse Stationsafkortingen:** De afkortingen voor Duitse stations zijn mede mogelijk gemaakt door de uitgebreide lijst op [michaeldittrich.de](https://www.michaeldittrich.de/abkuerzungen/index.php).

---

### 🤝 Bijdragen

Bijdragen die de tool verbeteren zijn altijd welkom. Heb je een idee voor een nieuwe feature, een correctie op een traject, of een uitbreiding van de data? Voel je vrij om een issue aan te maken op de GitHub-repository of dien direct een pull request in.

---

### 📄 Licentie

Dit project wordt beschikbaar gesteld onder de MIT Licentie.  
Copyright © 2025 Mark Eijbaard.
