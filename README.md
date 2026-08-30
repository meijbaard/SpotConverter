# SpotConverter

![Deploy SpotConverter](https://github.com/meijbaard/SpotConverter/actions/workflows/pages.yml/badge.svg)

Webapp voor treinspotters: plak een WhatsApp-spotbericht en krijg direct de route, geschatte doorkomsttijden, materieelinfo en een deelbaar groepsbericht terug.

**Live:** https://spotconverter.markeijbaard.nl · **Versie:** 5.5.0 · **Licentie:** MIT

```
13:07 Bh ri Asd RFO 193 150 met keteltrein
```
⬇️
> Tijdlijn Bad Bentheim → Amsterdam met doorkomsttijden per station, betrouwbaarheidsbadges, materieelplaatjes en een kant-en-klaar groepsbericht: `13:07 BH ri ASD RFO 193 150 met keteltrein — Verwacht BRN ±15:21 …`

---

## Inhoud

- [Wat kan de tool](#wat-kan-de-tool)
- [Gebruik](#gebruik)
- [Installeren als app (PWA)](#installeren-als-app-pwa)
- [Lokaal ontwikkelen](#lokaal-ontwikkelen)
- [Architectuur](#architectuur)
- [Data & configuratie](#data--configuratie)
- [Datascripts](#datascripts)
- [Deploy](#deploy)
- [Roadmap](#roadmap)
- [Bijdragen](#bijdragen)
- [Bronvermeldingen](#bronvermeldingen)
- [Changelog](#changelog)

---

## Wat kan de tool

- 🔍 **Spot-analyse** — herkent tijd, station, richting, vervoerder, locnummer(s), lading, `llt`, `badl/ladl` en `(opz)` in vrije berichttekst; incl. NVR-prefixen (`6193 190`), onbekende nummers (`193 xxx`), vrije-veldlocaties (`Nieuwedijk (Hon - Dvc)`) en voluit geschreven richtingen
- 📡 **Groepsradar** — plak een stuk groepschat (meerdere berichten): de radar herkent welke meldingen bij dezelfde trein horen, toont per trein de laatste positie, de komende doorkomsten met aftelklok en de afwijking t.o.v. het model
- 🏃 **"Haal ik hem nog?"** — bij een trein die nu onderweg is: per komend station een aftelklok, en met één tik op je locatie de haalbaarheid per fiets of auto (volledig op het apparaat)
- 📋 **Verwachtingsbord** — welke vaste systemen (Katy, PCC, Volvo, Lovosice, …) rijden vandaag doorgaans, met tijdvenster — afgeleid uit 14 maanden groepsspots
- 🗺️ **Routekaart** — elke analyse toont de route op een kaart van het spoornet (inline SVG, geen tiles of libraries), met spot-, doel- en eindpunt en bij een live trein de geschatte actuele positie; de spoorgeometrie komt uit de NS Spoorkaart-API (met schematische fallback)
- 🚉 **Doelstation-info** — live OV-fietsaantallen en voorzieningen (koffie, winkels, toilet, kluizen, lift) van je doelstation, via de publieke NS places-dienst — geen sleutel nodig
- 🚧 **Werkzaamheden-waarschuwing** — loopt de berekende route door een werkgebied (NS-opendata), dan waarschuwen analyse, radar en verwachtingsbord dat omleiding of uitval waarschijnlijk is
- 🛤️ **Landelijke routeherkenning** — de trajecten vormen samen een spoorweggraaf die heel Nederland dekt (70 baanvakken, van Roodeschool tot Vlissingen). Benoemde goederencorridors winnen waar ze de rit dekken; daarbuiten zoekt een kortste-padalgoritme de route over willekeurig veel trajecten (bijv. Leeuwarden → Den Haag)
- ⏱️ **Doorkomsttijden** — berekend uit afstanden (80 km/u) en waar beschikbaar uitgelijnd op vaste goederenpaden, inclusief wachttijden; elke tijd toont ✓ pad of ± schatting
- 🧭 **Route-extrapolatie** — voorspelt de eindbestemming uit lading of shuttlenaam, ook zonder `e.v.` in het bericht
- 💬 **Groepsbericht-generator** — bouwt een bericht volgens de Gouden Formule, optioneel met verwachte doorkomst; kopieer met één tik of deel direct via WhatsApp
- 🚂 **Materieelvisualisatie** — loc- en wagonafbeeldingen op basis van het herkende materieel, met directe links naar treinposities.nl
- 🕐 **Somda-doorkomststaat** — bij elke analyse de dienstregeling rond jouw verwachte doorkomst op het doelstation, via de officiële embedbare feed van [somda.nl](https://somda.nl/feeds/)
- 📄 **Dienstregeling als PDF** — elke analyse levert ook een doorkomststaat in klassieke stijl (Courier, kader, V/D/A per station, materieel en rijsnelheid), te downloaden als PDF — gegenereerd in de browser, zonder externe bibliotheken
- 📊 **Extra's** — stationszoeker, drukte-heatmap en bekende treinpatronen
- 📱 **Offline & installeerbaar** — PWA met service worker; werkt ook langs het spoor met slecht bereik. Volledig client-side: geen account, geen backend, geen tracking

---

## Gebruik

1. Open **https://spotconverter.markeijbaard.nl**
2. Plak je spotbericht (of tik **📋 Plak** voor het klembord, of **Voorbeeld**)
3. Kies optioneel een doelstation — dan zie je de verwachte doorkomsttijd daar; je keuze wordt onthouden
4. Kopieer of deel het gegenereerde groepsbericht

**Wat de tool herkent in `13:07 Bh ri Asd RFO 193 150 met keteltrein`:**

| Onderdeel | Waarde |
|---|---|
| Tijdstip | `13:07` |
| Spotlocatie | `Bh` (Bad Bentheim) |
| Richting | `ri Asd` (Amsterdam Centraal) |
| Vervoerder | `RFO` (RailForceOne) |
| Locomotief | `193 150` |
| Lading | `keteltrein` |

---

## Installeren als app (PWA)

### iPhone

1. Open de site in **Safari** → deelicoon → **"Zet op beginscherm"**

**Siri Shortcut (kopiëren in WhatsApp → direct geanalyseerd):**

1. Opdrachten-app → **+** → voeg toe: *"Haal inhoud van klembord op"* en *"Open URL"*
2. URL: `https://spotconverter.markeijbaard.nl/?q=[Klembord]` (tik "Klembord" als variabele aan)
3. Noem hem "SpotConverter". Gebruik: kopieer een spot in WhatsApp → *"Hey Siri, SpotConverter"* → de analyse staat klaar

### Android

Chrome → menu (⋮) → **"App installeren"**. Een share-target vanuit WhatsApp staat op de [roadmap](roadmap.md).

---

## Lokaal ontwikkelen

Er is geen build-stap; wel is een lokale webserver nodig omdat data via `fetch` wordt geladen:

```bash
python3 -m http.server 8000
```

Open daarna http://localhost:8000.

> 💡 De service worker cachet de app-shell. Zie je een oude versie na een codewijziging, ververs dan twee keer of wis de SW-cache via devtools. Databestanden (CSV/JSON) zijn altijd network-first.

---

## Architectuur

```text
bericht ─→ parser.js ─→ routing.js ─→ ui.js
             │              │            │
       stations.csv   trajecten.json   materieel.json
       (tokenizer +   (spoorweggraaf)  (visualisatie)
        opzoektabel)  afstanden.csv
                      goederenpaden.csv
                      extrapolatie.json
```

```text
/
├── index.html
├── sw.js                   # service worker (offline & caching)
├── assets/
│   ├── css/spotconverter.css   # huisstijl "Perron" (flessengroen + crème)
│   ├── fonts/              # Bricolage Grotesque + Figtree (zelf gehost, woff2)
│   └── js/
│       ├── app.js          # initialisatie & event handling
│       ├── state.js        # centrale state
│       ├── api.js          # data laden (CSV/JSON)
│       ├── parser.js       # berichtparser (incl. spottersaliassen zoals RH → Rheine)
│       ├── routing.js      # routeanalyse & ETA-berekening
│       ├── message.js      # groepsbericht-generator
│       ├── radar.js        # groepsradar (meerdere berichten -> actieve treinen)
│       ├── dienstregeling.js # doorkomststaat (V/D/A-rijen, materieel, snelheid)
│       ├── pdfstaat.js     # PDF-generator (Courier, kader, logo; geen dependencies)
│       └── ui.js           # rendering (incl. somda-doorkomststaat)
├── afstanden_check/        # datascripts (coördinaten, afstanden, validatie)
├── chatmining/             # chatdump -> kandidaat-data-updates (output in .gitignore)
├── tests/                  # node --test suite (parser, routering & dienstregeling)
├── .github/workflows/      # deploy naar Pages + CI (tests & datavalidatie)
├── *.csv / *.json          # datasets (zie hieronder)
├── CNAME                   # spotconverter.markeijbaard.nl
└── .nojekyll
```

Vaste volgorde in de analyse: de parser tokenizet het bericht en zoekt stationscodes op (alle herkende codes tellen als via-punt) → de routering bouwt uit de trajecten een spoorweggraaf en kiest per segment: één benoemd traject als dat kan, anders twee trajecten met gedeeld overstapstation (km-gescoord), anders het kortste pad → tijden worden berekend uit de afstandsmatrix en uitgelijnd op goederenpaden waar die bestaan.

---

## Data & configuratie

Alle kennis zit in data, niet in code:

| Bestand | Inhoud |
|---|---|
| `stations.csv` | Stationscodes en namen (NL + DE), incl. aansluitingen en emplacementen |
| `trajecten.json` | Baanvakken/corridors als geordende stationscodelijsten — samen de landelijke spoorweggraaf; elk gedeeld station is automatisch een knooppunt |
| `overgangen.json` | Verboden doorrijverbindingen (vervallen bogen/aansluitingen), bijv. Blauwkapel → Hollandsche Rading vanaf de museumlijn |
| `afstanden.csv` | Afstandsmatrix in km — grotendeels gegenereerd, zie [Datascripts](#datascripts) |
| `goederenpaden.csv` | Vaste passage-minuten per station en rijrichting (Gooilijn + hele Bentheimroute, afgeleid uit 14 maanden groepsspots) |
| `snelheden.json` | Rekensnelheid per traject (Bentheimroute 60 km/u) en grensoponthoud (BH 15 min), gekalibreerd op de kettinganalyse |
| `extrapolatie.json` | Regels lading/shuttle → voorspelde bestemming |
| `heatmap_treinpassages.json` | Passages per station/dag/uur — gegenereerd uit de groepschat via `chatmining/` |
| `treinpatronen.json` | Bekende systemen met dagen, tijdvensters en frequentie (basis voor het verwachtingsbord) |
| `werkzaamheden.json` | Geplande werkzaamheden (NS-opendata) — automatisch ververst door de werkzaamheden-workflow |
| `spoorkaart.json` | Spoorgeometrie (NS Spoorkaart-API) — maandelijks ververst door de spoorkaart-workflow; ontbreekt hij, dan tekent de kaart lijnen tussen de trajectstations |
| `materieel.json` | Koppeling vervoerder/loctype → afbeelding |

**Nieuw traject toevoegen — drie stappen, geen code:**

1. Voeg de stationscodelijst toe aan `trajecten.json` (deelt het een station met een bestaand traject, dan is het automatisch aangesloten op het netwerk)
2. Draai `python3 afstanden_check/haal_coords.py` (coördinaten voor nieuwe stations) en `python3 afstanden_check/genereer_afstanden.py` (afstanden)
3. Controleer met `python3 afstanden_check/valideer_data.py` en `npm test`

**Nieuwe extrapolatieregel (bijv. een nieuwe shuttle):** voeg een entry toe aan de `west`-lijst in `extrapolatie.json`; de eerste regel die matcht wint.

---

## Datascripts

**`chatmining/analyse_chat.py`** — leest een WhatsApp-groepsexport (`_chat.txt`) en genereert kandidaat-updates voor de datasets: een nieuwe heatmap, padminuten-suggesties voor `goederenpaden.csv`, dag-/uurstatistieken per systeem en een leesbaar rapport. Output in `chatmining/out/` (staat in `.gitignore`); de export zelf en persoonsgegevens komen nooit in de repo. Werkwijze: script draaien, diff beoordelen, gewenste data overnemen, `npm test`.

```bash
python3 chatmining/analyse_chat.py /pad/naar/_chat.txt
```

In `afstanden_check/` (allemaal zonder externe dependencies, tenzij vermeld):

**`valideer_data.py`** — controleert de samenhang van alle databestanden: bestaan alle trajectcodes, zijn er coördinaten en afstanden, is de JSON geldig. Draait ook in CI bij elke push (`.github/workflows/test.yml`), samen met `npm test`.

**`haal_coords.py`** — zoekt coördinaten op voor trajectstations die nog geen coördinaten hebben (Nominatim, met rate limit). Schrijft naar `out_osm/osm_stations_found.csv` en de coords-JSON.

**`genereer_afstanden.py`** — geen dependencies, geen netwerk. Vult ontbrekende afstanden tussen opeenvolgende trajectstations aan (hemelsbreed × 1,2 spoorfactor; handmatig ingevulde waarden blijven altijd staan) en schrijft samengevoegde coördinaten terug naar `out_osm/osm_stations_coords.json` voor de webapp.

```bash
python3 afstanden_check/genereer_afstanden.py --dry-run   # eerst kijken
python3 afstanden_check/genereer_afstanden.py             # dan schrijven
```

**`osm_station_check.py`** — zoekt stations uit `trajecten.json` op in OpenStreetMap (Nominatim) en slaat coördinaten op. Vereist `pip install pandas requests tqdm`; respecteer de rate limit (`--sleep 0.8`).

```bash
python3 osm_station_check.py --trajecten trajecten.json --stations stations.csv --out out_osm --resume
```

Stations die Nominatim niet kent (aansluitingen, emplacementen) staan met handmatig opgezochte coördinaten in `out_osm/osm_stations_not_found_withlatlon.csv`; die winnen bij overlap.

---

## Werkzaamheden (NS-opendata)

`.github/workflows/werkzaamheden.yml` draait vier keer per dag `werkzaamheden/haal_werkzaamheden.py`: dat haalt geplande werkzaamheden op uit de NS Reisinformatie API (`/disruptions?type=MAINTENANCE`), filtert op bekende stations en de komende drie weken, en commit `werkzaamheden.json` alleen bij een inhoudelijke wijziging (de push triggert daarna de Pages-deploy). De app blijft volledig client-side: de API-sleutel staat uitsluitend als GitHub-secret.

**Eenmalige setup:**

1. Maak een gratis account op [apiportal.ns.nl](https://apiportal.ns.nl) en abonneer je op het product **Reisinformatie API**
2. Kopieer de *primary key* en zet hem in de repo als secret: *Settings → Secrets and variables → Actions → New repository secret*, naam `NS_API_KEY`
3. Start de workflow één keer handmatig (*Actions → Werkzaamheden verversen → Run workflow*) om de eerste echte vulling op te halen

Voor de routekaart geldt hetzelfde patroon: `.github/workflows/spoorkaart.yml` haalt maandelijks de spoorgeometrie op (`spoorkaart/haal_spoorkaart.py`) — daarvoor moet het product **Spoorkaart-API** aan dezelfde sleutel gekoppeld zijn. Zonder abonnement meldt de workflow dat en houdt de app de schematische fallback.

Zonder secret slaat de workflow zichzelf netjes over. Parser testen zonder API kan met `python3 werkzaamheden/haal_werkzaamheden.py --zelftest`.

## Deploy

Automatisch via GitHub Actions (`.github/workflows/pages.yml`) naar GitHub Pages met custom domain `spotconverter.markeijbaard.nl` (CNAME + `.nojekyll`). Commit & push naar `main` publiceert.

> ⚠️ Verhoog bij elke release `VERSION` in `sw.js` (en het versienummer in de footer van `index.html`), anders blijven bezoekers op de geprecachte oude app-shell hangen.

---

## Roadmap

De stip op de horizon: **SpotConverter werkt voor elk station in Nederland.** Zie [roadmap.md](roadmap.md) voor de fasen (UX & fundament → netwerkroutering & landelijke dekking → community) en de tips voor spotters.

---

## Bijdragen

Issues en pull requests welkom via [GitHub Issues](https://github.com/meijbaard/SpotConverter/issues). Denk aan: correcties/uitbreidingen van de datasets, routeherkenning, UX en bugfixes. Datawijzigingen zijn laagdrempelig — zie [Data & configuratie](#data--configuratie).

---

## Bronvermeldingen

- **Rijdende Treinen / Open Data** — basislijst stations en afstanden
- **Nico Spilt** — spottersafkortingen
- **[treinposities.nl](https://treinposities.nl/)** — vervoerders- en locomotiefdatabase
- **[ProRail spoorkaart](https://www.prorail.nl/siteassets/homepage/reizen/documenten/pr_spoorkaart_nl2024_web.pdf)** — basis voor trajecten.json
- **[michaeldittrich.de](https://www.michaeldittrich.de/abkuerzungen/index.php)** — Duitse stationsafkortingen
- **[Arthur's Treinenpagina](https://www.arthurstreinenpagina.nl)** — locomotief- en wagonafbeeldingen
- **OpenStreetMap / Nominatim** — stationscoördinaten (© OSM-bijdragers)

---

## Licentie

MIT © 2025–2026 Mark Eijbaard

---

## Changelog

### v5.5.0 — Routekaart & doelstation-info

- 🗺️ **Routekaart** bij elke analyse: het spoornet als inline SVG in de huisstijl (geen kaart-libraries of tiles), route in flessengroen, markers voor spot/doel/eindpunt en een pulserende stip voor de geschatte actuele positie van een live trein. Achtergrondgeometrie uit de NS Spoorkaart-API via de nieuwe maandelijkse workflow (`spoorkaart.yml` + `spoorkaart/haal_spoorkaart.py`); zonder `spoorkaart.json` schakelt de kaart terug naar lijnen tussen de trajectstations
- 🚉 **Doelstation-info**: kies een doelstation en zie live het aantal OV-fietsen, koffie/eten, winkels, toilet, kluizen, wachtruimte en lift — rechtstreeks client-side uit de publieke NS places-dienst (open CORS, geen sleutel), met stille terugval als de dienst niet antwoordt
- Testsuite naar 77 tests (projectie, treinpositie-interpolatie, kaartopbouw, voorzieningen-samenvatting op vastgelegde API-antwoorden)


### v5.4.0 — Werkzaamheden uit NS-opendata

- Nieuw `werkzaamheden.json`: geplande werkzaamheden uit de NS Reisinformatie API, vier keer per dag automatisch ververst door een GitHub Action (`werkzaamheden.yml`); de sleutel staat als repo-secret `NS_API_KEY`, de app blijft client-side zonder secrets
- Loopt een berekende route door een werkgebied binnen het reisvenster, dan toont de **spot-analyse** een waarschuwingsblok ("grote kans op omleiding — tijden gelden alleen zonder omleiding"), krijgt elke geraakte **radar**-trein een 🚧-regel en opent het **verwachtingsbord** met de werkzaamheden van vandaag
- Voorbeeld: bij de werkzaamheden rond Weesp waarschuwt een Bh → Asd-analyse dat de goederentrein waarschijnlijk niet langs Baarn komt
- `haal_werkzaamheden.py` schrijft alleen bij inhoudelijke wijzigingen (geen lege commits/deploys), heeft een `--zelftest` en filtert op bekende stations en de komende 21 dagen
- Testsuite naar 70 tests

### v5.3.0 — Groepsradar & datagedreven voorspellingen

Gebouwd op een analyse van 14 maanden groepschat (25.000+ berichten, jul 2025 – aug 2026). Kernconclusie: shuttles rijden niet op vaste kloktijden, maar wél op vaste padminuten in het uur — en goederentreinen halen op de Twentelijnen ~50–60 km/u, geen 80.

**Nieuw: Groepsradar (tabblad Radar)**
- Plak een stuk groepschat; de radar splitst meertrein-berichten (kopregel "Dvge 11:22" + drie treinregels), herkent dat opeenvolgende meldingen bij dezelfde trein horen (locnummer, of vervoerder + lading binnen 90 min — ook als het nummer pas later gemeld wordt) en toont per trein de komende doorkomsten met aftelklok en de afwijking t.o.v. het model
- Volledig client-side; er wordt niets verstuurd of opgeslagen

**Nieuw: "Haal ik hem nog?" + aftelklok**
- Bij een trein die nu onderweg is telt de tijdlijn per station af; één tik op 📍 vergelijkt de reistijd vanaf je eigen locatie (fiets/auto) met de tijd tot doorkomst

**Nieuw: verwachtingsbord**
- Het Patronen-tabblad opent met "Vandaag verwacht": de vaste systemen die vandaag doorgaans rijden, met tijdvenster — kansen, geen dienstregeling

**Voorspellingen datagedreven**
- `goederenpaden.csv` uitgebreid van alleen de Gooilijn naar de hele Bentheimroute (per richting, gemeten padminuten) — de ✓ pad-badge geldt nu vrijwel corridor-breed
- Nieuw `snelheden.json`: rekensnelheid per traject (Bentheimroute 60 km/u) plus 15 min grensoponthoud Bad Bentheim; de dienstregeling toont de werkelijke gemiddelde snelheid
- `treinpatronen.json` herijkt op gemeten dagen en tijdvensters (Lovosice = zondagstrein, Volvo di–vr avond westwaarts, Pon wo/ma-ochtend) en uitgebreid met Lovosice, Praag, graan en UC Onnen
- `heatmap_treinpassages.json` opnieuw opgebouwd uit 23.800 echte spots (20 stations, per dag en uur)
- Nieuwe extrapolatieregels: Praag-shuttle → Waalhaven, UC Onnen → Haren/Onnen
- Coördinatenfix: Stroe lag door een Nominatim-misser in Engeland, waardoor de oost/west-bepaling bij Stroe-spots verkeerd uitpakte

**Parser**
- Locseries 383, 386, 185/187/182/192/194, 159, 248 en de RFO 1600/1800-serie; NVR-prefixen (`6193 190` → `193 190`); `193 xxx` en `193er`; dubbele tractie
- Vervoerders: Metrans, ERS, ELL, Captrain, DPB/duisport, Freightliner, BLS, TXL, Ecco-Rail, RailAdventure; "RTB Cargo" is niet langer station Rotterdam Blaak
- Tijdnotaties `19.33` / `11;45` / `11h23`; richtingswoord `ric`; voluit geschreven richtingen ("ri Hengelo"); `ri NL` vanuit Duitsland; spottersaliassen Amfge, Amfpon, Kfhz, Odzg, Almbp
- Ladingen: graan, gas, kalk, unit cargo (met naam: UC Onnen, UC Buna Werke), militair, zand, hout
- Vrije-veldlocaties tussen twee stations ("Nieuwedijk (Hon - Dvc)", "Bn/Hgl"): de tijdlijn start bij het eerstvolgende station in de rijrichting

**Chatmining als pijplijn**
- Nieuw `chatmining/analyse_chat.py`: van chatexport naar kandidaat-data-updates, herhaalbaar bij elke nieuwe dump; export en output blijven buiten git
- Testsuite uitgebreid naar 65 tests (nieuwe parserformaten + radar op echte groepsberichten)

### v5.2.0 — Dienstregeling als PDF

- Nieuw segment **Dienstregeling** bij elke analyse: een doorkomststaat in klassieke stijl — Courier-lettertype, kader, het SpotConverter-logo erboven en per station de afkorting, de voluit geschreven naam en **V** (vertrek) / **D** (doorkomst) / **A** (aankomst) met tijd. Wachttijd- en kopmaakstations krijgen een aankomst- én vertrekregel
- De kop toont datum, het traject in één regel, het **materieel als tekst** en de **verwachte rijsnelheid**
- **Download als PDF**: de staat wordt volledig in de browser als PDF opgebouwd (`pdfstaat.js`, ~180 regels, geen externe bibliotheken — Courier is een standaard PDF-font en het logo wordt met dezelfde beziercurven getekend als het merk-SVG); lange routes lopen door op vervolgpagina's

### v5.1.2 — Goederenverkeer mijdt diesel-/regionaallijnen

- Nieuw in `overgangen.json`: een `mijden`-lijst met diesel- en regionaallijnen (Zwolle–Almelo via Raalte, Maaslijn, Achterhoek, noordelijke nevenlijnen, …). Doorgaand goederenverkeer krijgt daar een kilometerstraffactor en kiest de echte goederenroute — Hengelo → Zwolle loopt nu via Deventer goederenemplacement in plaats van via Raalte
- Spots óp zo'n lijn blijven gewoon werken, en **museumritten** (herkend materieel zoals Mat '54 of Plan V) mogen wél de kortste route nemen

### v5.1.1 — Rustiger invoerblok

- Het analyse-segment is één kolom geworden: berichtveld over de volle breedte, daaronder één actierij met de knoppen links en het doelstation als afgeronde keuze rechts — de twee verspringende witte vlakken zijn weg

### v5.1.0 — Huisstijl "Perron" & somda-doorkomststaat

**Nieuwe huisstijl**
- Volledig nieuw ontwerp: flessengroen met warm crème, duidelijk gescheiden afgeronde segmenten, pill-knoppen en een zwevende ronde tabbar op mobiel
- Typografie: Bricolage Grotesque (koppen) + Figtree (interface), zelf gehost als variabele fonts (~97 KB, offline in de precache); Inter en de Google Fonts-koppeling zijn vervallen
- Tijdlijn toont standaard de kernmomenten (spot, wachttijden, kopmaken, doelstation, eindpunt); tussenstations klappen uit met één tik

**Somda-integratie (v5.2-idee, eerste stap)**
- Nieuw segment "Rond jouw doorkomst in …": de doorkomststaat van somda.nl rond de verwachte passagetijd op het doelstation, via hun officiële embedbare afbeeldingsfeed (dagnummer 1 = maandag … 7 = zondag, starttijd 10 min vóór de verwachte doorkomst)
- Volledig client-side, geen login of API-sleutel nodig; bij een onbekend station verdwijnt het blok vanzelf

### v5.0.0 — Landelijke dekking & netwerkroutering

**Routering als spoorweggraaf**
- De trajecten vormen nu één netwerk: knopen = stations, kanten = opeenvolgende stations met hun afstand. Elk gedeeld station is automatisch een knooppunt; `knooppunten.json` is vervallen
- Routekeuze per segment: één benoemd traject als dat kan (corridors + goederenpaden blijven leidend), anders twee trajecten met gedeeld overstapstation op kilometers gescoord, anders kortste pad (Dijkstra) over willekeurig veel trajecten
- Nieuw `overgangen.json`: vervallen verbindingsbogen als data — de routering rijdt er niet meer doorheen (bijv. museumlijn Blauwkapel → richting Hollandsche Rading: UTM naar Hilversum gaat via Amersfoort, naar Baarn via de Soestlijn)
- Alle herkende stationscodes in een bericht tellen als via-punt, niet alleen de eerste en laatste; kopmaak-routes volgen automatisch uit de graaf

**Heel Nederland**
- 60 baanvakken toegevoegd: het complete reizigersnet van Roodeschool tot Vlissingen en van Den Helder tot Kerkrade (70 trajecten totaal, ± 380 stations), alle codes gevalideerd tegen stations.csv, coördinaten en afstanden automatisch aangevuld
- Routes als "Lw ri Gvc" of "Zl ri Gn" werken nu gewoon

**Parser schaalbaar**
- Tokenizer + opzoektabel vervangt ~1700 regexes per bericht; codes die ook een Nederlands woord zijn (EN, OP, NA, WAS, ALS, AF, G, O) matchen alleen exact geschreven — nodig nu élk station meetelt als via-punt
- "Oss" wordt herkend (de officiële code is de losse letter O)

**Fundament**
- Testsuite (`npm test`): 27 tests met echte spotberichten voor parser en routering
- CI-workflow draait tests + datavalidatie bij elke push
- Nieuwe datascripts: `valideer_data.py` (samenhang databestanden) en `haal_coords.py` (coördinaten voor nieuwe stations, zonder dependencies)

### v4.2.3 — Spoorwegmuseum-route doorgetrokken naar Amersfoort & Mat '24

- Spoorwegmuseum-route gesplitst in twee doorgetrokken takken: UTM → Amersfoort en UTM → Utrecht Centraal. Daardoor werken ook routes als UTM → Apeldoorn (via knooppunt AMF naar de Bentheimroute) en UTM → Gooilijn; de routering kan per rit maar één knooppunt aan, dus drie-trajectroutes hebben zulke doorgetrokken lijnen nodig totdat het graafmodel er is (zie roadmap fase 2)
- Parser herkent ook **Mat '24** / **Blokkendoos**, met tekening en Arthur-link

### v4.2.2 — Museummaterieel & links naar Arthur's treinenpagina

- Parser herkent treinstel-/museummaterieel: **Plan V**, **Mat '64**, **Mat '54** en **Hondekop** ("Mat '64" wordt niet langer als loc-serie 6400 gelezen); het groepsbericht neemt de materieelnaam mee als tractie
- Eigen tekening voor Plan V en Mat '54 in de materieelvisualisatie (kleine versies, lokaal conform de [gebruiksregels van Arthur's treinenpagina](https://www.arthurstreinenpagina.nl/info/regelsgebruik.html): niet-commercieel, max. 20 tekeningen, geen hotlinks)
- Nieuwe deep-link **"Tekening (Arthur's treinenpagina)"** bij herkend materieel en herkende loc-series (naar de betreffende cataloguspagina — afbeeldingen direct laden staat de site niet toe)
- Service worker: precache omzeilt nu de HTTP-cache van de browser (`cache: 'reload'`) en data wordt bij de server gevalideerd (`no-cache`) — voorkomt dat een release met verouderde bestanden wordt geprecachet

### v4.2.1 — Directe update na release

- Na een release herlaadt de app automatisch éénmalig zodra de nieuwe service worker actief is; bezoekers zitten daardoor direct op de nieuwste versie in plaats van na een tweede handmatige verversing

### v4.2.0 — Knooppunten, Spoorwegmuseum-route & afstanden-generator

**Routering**
- Knooppunten zijn nu data (`knooppunten.json`: AMF, BLOA, DVGE) in plaats van hard-gecodeerd; doorgaande routes werken over elk geconfigureerd knooppunt
- Spoorwegmuseum-route (UTM ↔ BLOA) aangesloten op de corridor Amersfoort ↔ Utrecht: vanaf Blauwkapel beide richtingen
- Bentheimroute opgeschoond: dubbele alias-stops (Salzbergen ×3, Bad Bentheim ×2) verwijderd — reistijden ± 15 min realistischer

**Parser & bericht**
- Spottersaliassen: `rh` → Rheine (RH is officieel Rheden; ligt op geen traject), `Salzbergen`/`HSAL` → SBG, `HBTH` → BH; het groepsbericht toont de spottersafkorting
- Stationscodes worden regex-veilig ge-escaped (codes als `HRIJ (HRY)` braken de matching; toekomstige codes met metatekens crashten de analyse)
- Foute dubbele code verwijderd: `HR` is nu alleen nog Heerenveen

**Data & tooling**
- Nieuw: `afstanden_check/genereer_afstanden.py` — vult `afstanden.csv` automatisch aan uit OSM-coördinaten (13 ontbrekende trajectparen berekend, o.a. UTM–BLOA en BD–SLOE); handmatige waarden blijven staan
- Handmatige coördinatenlijst uitgebreid (UTM, MDK, SLOE, SLOHST, ZST); samengevoegde coördinaten beschikbaar voor de webapp
- `loadMaterieel` gebruikt nu dezelfde BASE_URL als de overige loaders

### v4.1.0 — Groepsbericht-generator, offline support & grote UX/SEO-revisie

**Nieuw: bericht voor de groep**
- Generator die van elke geanalyseerde spot een groepsregel-conform WhatsApp-bericht maakt volgens de Gouden Formule: `[Tijd] [Station] [ri Richting] [Vervoerder] [Tractie] [Lading]`
- Herkent `llt` (losse lok) en `badl`/`ladl` (belading containertreinen); toont "tractie onbekend" als er geen loc herkend is
- Specifieke shuttlenamen (Kąty, Lovosice, …) worden in het bericht gebruikt in plaats van generiek "shuttle"
- Optionele tweede regel met verwachte doorkomst en wachttijd
- Kopieerknop en directe deelknop naar WhatsApp (native share sheet op mobiel)

**Mobiele UX**
- Plak-knop: klembord inlezen met één tik; navigatie onderin (duimbereik); doelstation echt optioneel en onthouden; voorbeeld-knop

**Betrouwbaarheid & data**
- Betrouwbaarheidsbadges: ✓ pad versus ± schatting
- Extrapolatieregels van code naar `extrapolatie.json`
- Parserfix: locnummers als `189 024` volledig herkend

**Techniek, performance & SEO**
- Tailwind CDN vervangen door eigen stylesheet (~10 KB); service worker (offline); heatmap-kleurniveaus; `?q=`-decodefix; meta/OG/JSON-LD; ARIA-tabs; dead code verwijderd

### v4.0.0 — Nieuwe huisstijl & treinposities.nl-integratie

- Nieuw kleurschema (stijl rijdendetreinen.nl); PWA installeerbaar (manifest + Apple meta-tags); `?q=`-parameter + iOS Shortcut-workflow; directe links naar treinposities.nl met vervoerdersmapping

### v3.2.0 — Geavanceerde westwaartse routevoorspelling & fallbacks

- Shuttle-herkenning op naam incl. typo's; route-extrapolatie zonder `e.v.`; veiligheids-fallback; wagon-mapping hersteld

### v3.1.0

- Trajectberekening herschreven; rijrichting uit coördinaten; wachttijden correct doorgevoerd; verbeterde kopieerfunctie

### v2.9.0

- Deploy naar GitHub Pages op `spotconverter.markeijbaard.nl`; Station Zoeker; verbeterde ETA-logica
