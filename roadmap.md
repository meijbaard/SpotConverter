# 🗺️ SpotConverter — Ontwikkelroadmap

**Stip op de horizon:** SpotConverter werkt voor **elk station in Nederland**. Een spotter plakt een bericht — waar in het land ook gespot — en krijgt een betrouwbare route, doorkomsttijden en een deelbaar groepsbericht.

Deze roadmap beschrijft hoe we daar in drie fasen komen. Elke fase levert zelfstandig waarde op en bouwt technisch voort op de vorige.

Legenda: ✅ gereed · 🔧 in uitvoering · 📋 gepland · 🧊 bewust geparkeerd

---

## Huidige stand (v4.2.0)

De basis staat en is data-gedreven: trajecten, knooppunten, afstanden en extrapolatieregels zijn allemaal configuratie, geen code.

- ✅ Parser voor de "Gouden Formule" (tijd, station, richting, vervoerder, tractie, lading, `llt`, `badl/ladl`, `(opz)`)
- ✅ Routeherkenning over meerdere trajecten via configureerbare knooppunten (`knooppunten.json`: AMF, BLOA, DVGE)
- ✅ Doorkomsttijden op basis van afstanden + vaste goederenpaden (Gooilijn), met betrouwbaarheidsbadges (✓ pad / ± schatting)
- ✅ Groepsbericht-generator met kopieer/deel-knop
- ✅ PWA: offline, installeerbaar, iOS Shortcut-integratie (`?q=`)
- ✅ Afstanden-generator (`afstanden_check/genereer_afstanden.py`): ontbrekende afstanden automatisch uit OSM-coördinaten

**Bekende beperkingen die de fasen hieronder oplossen:**
- Trajecten zijn handmatige, lineaire lijsten; dekking is beperkt tot ± 8 corridors
- Routes met méér dan één overstap op knooppunten worden niet gevonden (max. 2 trajecten per route)
- `kopmaken` wordt herkend door de parser, maar de routering doet er nog niets mee
- Doelstation kiezen = scrollen door 1600+ opties; het groepsbericht staat onderaan een soms lange tijdlijn
- Geen geautomatiseerde tests; regressies worden nu handmatig gevonden

---

## Fase 1 — Vertrouwen & bediening (v4.3)

*Doel: de bestaande functionaliteit sneller, duidelijker en robuuster maken. Geen nieuwe architectuur.*

### UX
- 📋 **Groepsbericht prominenter**: het bericht is hét eindproduct — toon het direct onder de analyse-header (tijdlijn inklapbaar), of maak de kopieerknop sticky op mobiel
- 📋 **Doelstation als zoekveld**: vervang de 1600-opties-dropdown door een combobox met zoeken, recente keuzes en favorieten
- 📋 **Herkenning zichtbaar maken**: toon als chips wat de parser herkende (tijd · station · richting · loc · lading). Vergroot vertrouwen én stuurt spotters richting de Gouden Formule
- 📋 **Betere foutmelding**: bij "geen geldig traject" tonen wélke stations herkend zijn en een suggestie doen ("UTM herkend — bedoelde je ri Ut of ri Amf?")
- 📋 **Tijdlijn-filter**: technische punten (aansluitingen, overloopwissels) standaard inklappen achter "toon alle punten"
- 📋 **Donkere modus** (spotters staan er vaak in de schemering)

### Fundament (voorwaarde voor fase 2)
- 📋 **Testsuite** voor parser en routering (`node --test`, echte spotberichten als fixtures) — vóór de router op de schop gaat
- 📋 **CI-datavalidatie** in GitHub Actions: JSON/CSV-syntax, elk trajectstation heeft coördinaten en afstanden, `genereer_afstanden.py --dry-run` is schoon
- 📋 **Onzekerheid in tijd** herkennen ("vertrek niet afgewacht") en tonen in de betrouwbaarheidsindicatie

---

## Fase 2 — Netwerkroutering & heel Nederland (v5.0)

*Doel: van lineaire lijsten naar een spoorweggraaf, en die graaf meteen landelijk vullen. De architectuurstap en de dekking horen bij elkaar: zodra de routering een netwerk is, is landelijke dekking een dataprobleem, geen codeprobleem.*

### Routering als graaf
- 📋 **Graafmodel**: bouw bij het laden een adjacency-graaf uit de opeenvolgende paren in `trajecten.json` (knopen = stations, kanten = afstanden uit `afstanden.csv`)
- 📋 **Kortste-padroutering** (Dijkstra) vervangt de huidige "eerste traject dat matcht"-logica én de twee-benen-knooppuntlogica. `knooppunten.json` wordt daarmee overbodig — elk gedeeld station is automatisch een knooppunt, en routes over 3+ trajecten werken vanzelf
- 📋 **Tussenstations benutten**: alle herkende codes in het bericht (niet alleen eerste/laatste) als via-punten meenemen — lost ambiguïteit op bij vertakkingen
- 📋 **Kopmaken**: de geparste `kopmaken`-vlag gebruiken om de rijrichting om te draaien op het gemelde station (bijv. Deventer Goederen)
- 📋 **Terugrekenen**: vanaf een spot ook eerdere stations op de route tonen ("waar kwam hij vandaan / waar was hij om 12:40?")
- 📋 **Betrouwbaarheidsscore**: bij meerdere plausibele routes de alternatieven tonen in plaats van er stilzwijgend één te kiezen

### Landelijke dekking
- 📋 **Netwerk genereren uit open data**: het spoornetwerk (baanvakken + stations) automatisch opbouwen uit ProRail open data en/of OpenStreetMap (`railway=rail`), als build-script naast `genereer_afstanden.py`. `trajecten.json` blijft bestaan voor benoemde corridors (weergave, goederenpaden), maar is niet langer de bron van het netwerk
- 📋 **Parser schaalbaar maken**: de huidige 1600-regexes-per-bericht aanpak vervangen door tokenizen + opzoektabel, met contextregels (na "ri", na tijdstip) en bescherming tegen valse treffers van korte codes (G, O, AT, …)
- 📋 **Stationsdata consolideren**: één bron voor code → naam → coördinaten → type (station/aansluiting/emplacement), inclusief spottersaliassen (zoals RH → Rheine) als dataveld in plaats van code
- 📋 **Goederenpaden per corridor uitbreiden** zodra er waarnemingen zijn (community-input; formaat krijgt een `wachtstation`-kolom zodat de hard-gecodeerde AMF/STO-logica verdwijnt)
- 📋 **Heatmap-dekking vergroten** met dezelfde community-waarnemingen

---

## Fase 3 — Community & verdieping (v5.x)

*Doel: van persoonlijk gereedschap naar gereedschap van de groep.*

- 📋 Meerdere spottersgroepen/regio's met eigen voorkeuren (doelstations, corridors)
- 📋 Vervolgspots koppelen: een tweede melding over dezelfde trein bevestigt/corrigeert de voorspelling
- 📋 Optionele live-verrijking via treinposities.nl (link is er al; denk aan actuele positie naast de voorspelling)
- 📋 Spot-geschiedenis op het apparaat (localStorage): "mijn spots van vandaag"
- 📋 Android share-target (delen vanuit WhatsApp direct naar de PWA)

---

## 🧊 Bewust geparkeerd

- **Goederenpaden.csv uitbreiden** — wacht op verzamelde waarnemingen per corridor; geen aanpassingen aan het bestand tot die er zijn (besluit aug 2026)
- **Backend/accounts** — de tool blijft bewust volledig client-side: geen server, geen accounts, geen tracking

---

## 📣 Tips voor spotters (de Gouden Formule)

De tool wordt beter naarmate berichten consistenter zijn. De ideale spot:

> **`[Tijd]` `[Station]` `[ri Richting]` `[Vervoerder]` `[Tractie]` `[Lading]` `[Opmerkingen]`**
>
> Voorbeeld: `10:47 Rsn ri Dv DBC 189 024 met staaltrein`

- Gebruik `ri` of `>` voor de richting
- Meld **kopmaken** expliciet (`11:21 Dvge, maakt kop en vertrekt ri Zp`) — cruciaal voor de route
- Markeer opzendlocs met `(opz)`: `RFO 1837 + 1828 (opz)`
- Wees specifiek over lading (`keteltrein`, `Katy shuttle`) — dat voedt de patroonherkenning
- Vervolgspots zijn goud waard: een tweede melding verderop bevestigt de route
