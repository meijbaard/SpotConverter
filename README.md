# SpotConverter

![Deploy SpotConverter](https://github.com/meijbaard/SpotConverter/actions/workflows/pages.yml/badge.svg)

Webapp voor treinspotters: plak een WhatsApp-spotbericht en krijg direct de route, geschatte doorkomsttijden, materieelinfo en een deelbaar groepsbericht terug.

**Live:** https://spotconverter.markeijbaard.nl · **Versie:** 4.2.2 · **Licentie:** MIT

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

- 🔍 **Spot-analyse** — herkent tijd, station, richting, vervoerder, locnummer(s), lading, `llt`, `badl/ladl` en `(opz)` in vrije berichttekst
- 🛤️ **Routeherkenning** — vindt het traject, ook over meerdere trajecten heen via knooppunten (bijv. Bad Bentheim → Rotterdam via Amersfoort, of Spoorwegmuseum → Amersfoort/Utrecht via Blauwkapel)
- ⏱️ **Doorkomsttijden** — berekend uit afstanden (80 km/u) en waar beschikbaar uitgelijnd op vaste goederenpaden, inclusief wachttijden; elke tijd toont ✓ pad of ± schatting
- 🧭 **Route-extrapolatie** — voorspelt de eindbestemming uit lading of shuttlenaam, ook zonder `e.v.` in het bericht
- 💬 **Groepsbericht-generator** — bouwt een bericht volgens de Gouden Formule, optioneel met verwachte doorkomst; kopieer met één tik of deel direct via WhatsApp
- 🚂 **Materieelvisualisatie** — loc- en wagonafbeeldingen op basis van het herkende materieel, met directe links naar treinposities.nl
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
       (codeherkenning) knooppunten.json (visualisatie)
                        afstanden.csv
                        goederenpaden.csv
                        extrapolatie.json
```

```text
/
├── index.html
├── sw.js                   # service worker (offline & caching)
├── assets/
│   ├── css/spotconverter.css
│   └── js/
│       ├── app.js          # initialisatie & event handling
│       ├── state.js        # centrale state
│       ├── api.js          # data laden (CSV/JSON)
│       ├── parser.js       # berichtparser (incl. spottersaliassen zoals RH → Rheine)
│       ├── routing.js      # routeanalyse & ETA-berekening
│       ├── message.js      # groepsbericht-generator
│       └── ui.js           # rendering
├── afstanden_check/        # datascripts (OSM-coördinaten, afstanden-generator)
├── *.csv / *.json          # datasets (zie hieronder)
├── CNAME                   # spotconverter.markeijbaard.nl
└── .nojekyll
```

Vaste volgorde in de analyse: de parser haalt alle stationscodes uit het bericht → de routering zoekt een traject dat eerste en laatste code bevat (of stitcht twee trajecten via een knooppunt) → tijden worden berekend uit de afstandsmatrix en uitgelijnd op goederenpaden waar die bestaan.

---

## Data & configuratie

Alle kennis zit in data, niet in code:

| Bestand | Inhoud |
|---|---|
| `stations.csv` | Stationscodes en namen (NL + DE), incl. aansluitingen en emplacementen |
| `trajecten.json` | Spoortrajecten als geordende stationscodelijsten |
| `knooppunten.json` | Stations waar trajecten op elkaar aansluiten (AMF, BLOA, DVGE); volgorde bepaalt voorkeur |
| `afstanden.csv` | Afstandsmatrix in km — grotendeels gegenereerd, zie [Datascripts](#datascripts) |
| `goederenpaden.csv` | Vaste passage-minuten per station en rijrichting (nu: Gooilijn) |
| `extrapolatie.json` | Regels lading/shuttle → voorspelde bestemming |
| `heatmap_treinpassages.json` | Passages per uur per station |
| `treinpatronen.json` | Bekende terugkerende treinroutes |
| `materieel.json` | Koppeling vervoerder/loctype → afbeelding |

**Nieuw traject toevoegen — drie stappen, geen code:**

1. Voeg de stationscodelijst toe aan `trajecten.json`
2. Sluit het traject aan op het bestaande netwerk? Zet het gedeelde station in `knooppunten.json`
3. Draai de afstanden-generator (hieronder) om `afstanden.csv` en de coördinaten bij te werken

**Nieuwe extrapolatieregel (bijv. een nieuwe shuttle):** voeg een entry toe aan de `west`-lijst in `extrapolatie.json`; de eerste regel die matcht wint.

---

## Datascripts

In `afstanden_check/`:

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
