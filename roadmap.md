# 🗺️ SpotConverter — Ontwikkelroadmap

**Stip op de horizon:** SpotConverter werkt voor **elk station in Nederland**. Een spotter plakt een bericht — waar in het land ook gespot — en krijgt een betrouwbare route, doorkomsttijden en een deelbaar groepsbericht.

Deze roadmap beschrijft hoe we daar in drie fasen komen. Elke fase levert zelfstandig waarde op en bouwt technisch voort op de vorige.

Legenda: ✅ gereed · 🔧 in uitvoering · 📋 gepland · 🧊 bewust geparkeerd

---

## Huidige stand (v5.0.0)

De basis staat en is data-gedreven: trajecten, afstanden en extrapolatieregels zijn configuratie, geen code. Sinds v5.0.0 vormen de trajecten samen een **landelijke spoorweggraaf**.

- ✅ Parser voor de "Gouden Formule", als tokenizer + opzoektabel (schaalbaar tot alle NL-stations)
- ✅ Netwerkroutering: corridors leidend, kortste pad als vangnet, via-punten uit het bericht
- ✅ Landelijke dekking: 70 trajecten, ± 380 stations (Roodeschool ↔ Vlissingen, Den Helder ↔ Kerkrade)
- ✅ Doorkomsttijden op basis van afstanden + vaste goederenpaden (Gooilijn), met betrouwbaarheidsbadges
- ✅ Groepsbericht-generator; museummaterieel met tekeningen en Arthur-links
- ✅ PWA: offline, installeerbaar, iOS Shortcut-integratie (`?q=`), automatische update na release
- ✅ Datapipeline: coördinaten ophalen, afstanden genereren, samenhang valideren — plus testsuite en CI

**Bekende beperkingen:**
- Doelstation kiezen = scrollen door 1600+ opties; het groepsbericht staat onderaan een soms lange tijdlijn (fase 1)
- Goederenpaden dekken alleen de Gooilijn; alle andere corridors tonen "± schatting" (🧊 geparkeerd)
- Spottersaliassen (RH → Rheine, Oss → O) staan nog in code in plaats van in data

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

### Fundament
- ✅ **Testsuite** voor parser en routering (`npm test`, echte spotberichten als fixtures) — gebouwd vóór de router-verbouwing van v5.0.0
- ✅ **CI-datavalidatie** in GitHub Actions (`valideer_data.py` + testsuite bij elke push)
- 📋 **Onzekerheid in tijd** herkennen ("vertrek niet afgewacht") en tonen in de betrouwbaarheidsindicatie

---

## Fase 2 — Netwerkroutering & heel Nederland (v5.0)

*Doel: van lineaire lijsten naar een spoorweggraaf, en die graaf meteen landelijk vullen. De architectuurstap en de dekking horen bij elkaar: zodra de routering een netwerk is, is landelijke dekking een dataprobleem, geen codeprobleem.*

### Routering als graaf
- ✅ **Graafmodel**: adjacency-graaf uit de opeenvolgende paren in `trajecten.json` (knopen = stations, kanten = afstanden uit `afstanden.csv`)
- ✅ **Kortste-padroutering** (Dijkstra), met corridorvoorkeur: één benoemd traject wint, dan twee trajecten met gedeeld overstapstation (km-gescoord), dan kortste pad. `knooppunten.json` is vervallen — elk gedeeld station is automatisch een knooppunt
- ✅ **Tussenstations benutten**: alle herkende codes tellen als via-punt
- ✅ **Kopmaken**: volgt automatisch uit de graaf — een route Dvge → Zp keert vanzelf; de aparte richtingslogica is niet meer nodig
- 📋 **Terugrekenen**: vanaf een spot ook eerdere stations op de route tonen ("waar kwam hij vandaan / waar was hij om 12:40?")
- 📋 **Betrouwbaarheidsscore**: bij meerdere plausibele routes de alternatieven tonen in plaats van er stilzwijgend één te kiezen

### Landelijke dekking
- ✅ **Landelijk netwerk**: 60 baanvakken van het complete reizigersnet toegevoegd, codes gevalideerd tegen stations.csv, coördinaten (Nominatim) en afstanden automatisch aangevuld. Gekozen voor gevalideerde baanvak-lijsten in `trajecten.json` in plaats van generatie uit ProRail/OSM-brondata: zelfde resultaat, veel beter controleerbaar
- ✅ **Parser schaalbaar**: tokenizer + opzoektabel; woord-codes (EN, OP, NA, G, O, …) matchen alleen exact geschreven
- 📋 **Stationsdata consolideren**: één bron voor code → naam → coördinaten → type, inclusief spottersaliassen (RH → Rheine, Oss → O) als dataveld in plaats van code
- 🧊 **Goederenpaden per corridor uitbreiden** zodra er waarnemingen zijn (geparkeerd; formaat krijgt dan een `wachtstation`-kolom zodat de hard-gecodeerde AMF/STO-logica verdwijnt)
- 📋 **Heatmap-dekking vergroten** met community-waarnemingen

---

## Tussenstap — v5.1 & v5.2

- 📋 **v5.1 — Restyling**: rustige, formele huisstijl (donkergroen met crème, subtiel en netjes), samen met de fase-1-UX-punten (groepsbericht prominenter, doelstation-zoekveld, tijdlijn-filter)
- 📋 **v5.2 — Conflictdetectie met somda.nl-kennis**: onderzoeken of de dienstregelings-/treinnummerkennis van somda.nl bruikbaar is om te signaleren of het berekende pad botst met een andere passerende trein (haalbaarheid: welke data is er, is er een API of export, wat staan de gebruiksvoorwaarden toe)

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
