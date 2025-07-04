# SpotConverter Pro #
SpotConverter Pro is een geavanceerde webapplicatie, specifiek ontworpen voor en door treinspotters en -enthousiastelingen. Het primaire doel van deze tool is om de vaak cryptische en met jargon doorspekte WhatsApp-berichten over treinwaarnemingen te transformeren in heldere, gestructureerde en direct bruikbare informatie. Waar een simpel spotbericht vaak alleen direct nuttig is voor de ontvanger, ontgrendelt deze tool de onderliggende data. De tool analyseert de inhoud van een spot-bericht, herkent routes op basis van vooraf gedefinieerde spoortrajecten en berekent een geschatte passage-tijd voor een door de gebruiker gekozen station, waardoor je sneller en beter kunt anticiperen op naderende treinen.

De applicatie is ontworpen met gebruiksgemak en toegankelijkheid als kernprincipes. Het werkt volledig lokaal in de browser en vereist geen enkele installatie of configuratie van software. Alle benodigde data, zoals stations- en afstandslijsten, wordt dynamisch ingeladen vanaf een centrale, openbare locatie (GitHub), wat het onderhoud eenvoudig en efficiënt maakt. Dit garandeert dat elke gebruiker altijd met de meest actuele informatie werkt.

## 🗂️ Inhoudsopgave

- **[✨ Geavanceerde Features](https://github.com/meijbaard/SpotConverter?tab=readme-ov-file#-geavanceerde-features-1)**
- **[🚀 Hoe te Gebruiken](https://github.com/meijbaard/SpotConverter?tab=readme-ov-file#-hoe-te-gebruiken-1)**
- **[🔧 Configuratie & Data](https://github.com/meijbaard/SpotConverter?tab=readme-ov-file#-configuratie--data-1)**
- **[💾 Bronvermeldingen](https://github.com/meijbaard/SpotConverter?tab=readme-ov-file#-bronvermeldingen-1)**
- **[🤝 Bijdragen](https://github.com/meijbaard/SpotConverter?tab=readme-ov-file#-bijdragen-1)**
- **[📄 Licentie](https://github.com/meijbaard/SpotConverter?tab=readme-ov-file#-licentie-1)**

## ✨ Geavanceerde Features ##

- Intelligente Route-Analyse: De kern van de tool. Het herkent de gereden route niet door simpelweg stations te matchen, maar door de gespotte locaties te plotten op bekende, ingebouwde spoortrajecten. De logica is flexibel en kan een correcte route afleiden, zelfs als tussenliggende, minder relevante stations in het spot-bericht worden overgeslagen. Dit betekent dat een bericht als "14:00 Bh ri Asd" correct wordt geïnterpreteerd als een reis over de hoofdassen.
- Combineren van Trajecten: De tool kan complexe, doorgaande reizen begrijpen die meerdere gedefinieerde trajecten overspannen. Het herkent centrale knooppunten (zoals Amersfoort) en kan trajecten zoals Duitsland-Amersfoort en Amersfoort-Amsterdam naadloos aan elkaar "knopen" tot één logische, doorgaande route. Dit voorkomt foute conclusies en maakt de passage-inschatting veel betrouwbaarder.
- Dynamische Passage-berekening: De tool berekent een geschatte aankomsttijd voor elk willekeurig station in de keuzelijst. Dit gebeurt op basis van een uitgebreide afstandsmatrix en een instelbare gemiddelde snelheid voor goederentreinen (standaard 80 km/u). De tool houdt hierbij correct rekening met het eerstgenoemde station in de spot als het startpunt van de berekening, wat een realistische voorspelling oplevert.
- Automatische Verwerking: Voor een soepele en snelle gebruikerservaring start de analyse direct bij het plakken of typen van een bericht in het invoerveld. Een ingebouwd 'debounce'-mechanisme zorgt ervoor dat de berekening pas wordt uitgevoerd als de gebruiker even stopt met typen. Dit voorkomt onnodige verwerking bij elke toetsaanslag en zorgt voor een responsieve interface.
- Verrijking van Jargon: De tool functioneert als een "vertaler" voor spotters-jargon. Veelvoorkomende afkortingen zoals LLT (Losse loc trein), Badl (Beladen aan de loc), of V (Vertrek) worden automatisch herkend en in de uitvoer visueel gemarkeerd. Door met de muis over de afkorting te bewegen, verschijnt een duidelijke tooltip met de volledige betekenis.
- Dynamisch Data Inladen: Om de tool onderhoudsvriendelijk en altijd actueel te houden, haalt het de stations- en afstandsdata direct van een centrale GitHub-locatie via CSV-bestanden. Wanneer een station wordt toegevoegd of een afstand wordt gecorrigeerd in de online bestanden, is deze wijziging direct en zonder code-aanpassingen beschikbaar voor alle gebruikers.
- Slimme Afkorting-herkenning: Om foutieve herkenning van veelvoorkomende Nederlandse woorden (zoals 'en' of 'de') die overeenkomen met stationscodes te voorkomen, hanteert de tool een slimme logica. Afkortingen die kunnen conflicteren, worden alleen herkend als ze met een hoofdletter worden geschreven (bijv. EN voor Enschede), terwijl unieke afkortingen (zoals Amf) ongeacht hoofdlettergebruik worden herkend.
- Moderne Interface: De vormgeving is geïnspireerd op de duidelijke en functionele stijl van rijdendetreinen.nl, met een focus op leesbaarheid en een intuïtieve gebruikerservaring. Kleuren, lettertypes en layout zijn gekozen om de informatie helder en rustig te presenteren.

## 🚀 Hoe te Gebruiken ##
1. Download de tool door op station_converter.html te klikken in GitHub en in de header boven de code te klikken op "Download raw file". Dit heeft een icoontje met een pijl naar beneden. Of via het releases kopje in het scherm rechts. Hiermee download je alle bestanden.
2. Open de Applicatie: Start de tool door het station_converter.html bestand te openen in een moderne webbrowser zoals Chrome, Firefox, of Edge. Er is geen internetverbinding nodig voor de basisfuncties, maar wel voor het laden van de meest recente stations- en afstandsdata van GitHub.
3. Plak het Bericht: Kopieer een spot-bericht uit een WhatsApp-groep (bijvoorbeeld 14:51 Rtd ri Wd, LLT) en plak dit in het tekstveld "Plak je WhatsApp bericht hier:". De tool begint onmiddellijk met de analyse van de tekst.
4.  Kies je Doelstation: In de dropdown-lijst "Bereken passage voor:" kun je het station selecteren waarvoor je een passage-tijd wilt weten. Standaard staat deze op "Baarn", maar elk station uit de geladen lijst is selecteerbaar. De berekening wordt automatisch bijgewerkt wanneer je een ander station kiest.
5. Bekijk de Resultaten: De resultaten verschijnen direct en worden live bijgewerkt in drie overzichtelijke blokken:
    - Verwerkt Bericht: De originele tekst, maar dan verrijkt met gemarkeerde, volledige stationsnamen en tooltips voor jargon. Dit maakt de spot in één oogopslag leesbaar.
    - Passage Inschatting: Een duidelijke conclusie of de trein het gekozen station passeert, inclusief een berekende aankomsttijd met een marge. Hier staat ook op basis van welk traject de conclusie is getrokken.
    - Geparsede Data: Een uitklapbaar blok met de technische data (in JSON-formaat) die de tool heeft geëxtraheerd. Dit is handig voor debugging, analyse, of om te begrijpen hoe de tool tot zijn conclusie is gekomen.

## 🔧 Configuratie & Data ##

De tool is ontworpen om flexibel en onderhoudsvriendelijk te zijn door data extern in te laden. Dit betekent dat de kernlogica gescheiden is van de data, wat aanpassingen eenvoudig maakt.

_stations.csv_

Dit bestand is de ruggengraat van de stationsherkenning. Het bevat alle relevante stations en hun afkortingen. Voor een correcte werking moet het minimaal de volgende kolommen bevatten, gescheiden door komma's:
- code: De unieke afkorting van het station die in spotberichten wordt gebruikt (bijv. AMF).
- name_long: De volledige, officiële naam van het station die in de uitvoer wordt getoond (bijv. Amersfoort Centraal).

_afstanden.csv_

Dit bestand functioneert als een afstandsmatrix voor het berekenen van reistijden. De structuur is cruciaal voor de correcte werking:
- De eerste kolom (de "rij-header") bevat de stationsafkortingen van de beginpunten.
- De eerste rij (de "kolom-header") bevat de stationsafkortingen van de eindpunten.
- De cellen op het snijpunt van een rij en kolom bevatten de exacte afstand in kilometers tussen die twee stations. De tool zoekt de waarde op door de rij van het startstation en de kolom van het doelstation te kruisen.

### Ingebouwde Trajecten

De belangrijkste en meest voorspelbare spoorroutes zijn voor de betrouwbaarheid direct in de JavaScript-code gedefinieerd als arrays van stationsafkortingen. Dit stelt de tool in staat om complexe routes te herkennen en te combineren. Deze lijst kan in de code eenvoudig worden aangepast of uitgebreid met nieuwe trajecten om de herkenning nog nauwkeuriger te maken.

## 💾 Bronvermeldingen

Voor de data die deze tool aandrijft, is dankbaar gebruik gemaakt van de open datasets van Rijdende Treinen (@rijdendetreinen) en de uitgebreide kennis van Nico Spilt.

**Open Data van Rijdende Treinen:**
- De basislijst met Treinstations en hun officiële namen is afkomstig van [OpenData.](https://www.rijdendetreinen.nl/open-data)
- De afstanden tussen stations, die de basis vormen voor de reistijd-inschattingen, zijn eveneens via dit platform verkregen.

**Aanvullende Afkortingen:**
- De stationsdata is verrijkt met een zeer complete lijst van spotters-afkortingen, verzameld en onderhouden door Nico Spilt op zijn [website.](https://www.nicospilt.com/verkortingen_tabel.htm)

De combinatie van deze bronnen maakt de herkenning en analyse van de tool robuust en betrouwbaar.

## 🤝 Bijdragen

Bijdragen die de tool verbeteren zijn altijd welkom. De kracht van dit project zit in de community-kennis. Heb je een idee voor een nieuwe feature, een correctie op een traject, of een uitbreiding van de afstandsmatrix? Voel je vrij om een issue aan te maken op de GitHub-repository om het te bespreken, of, als je bekend bent met Git, dien direct een pull request in met je voorgestelde wijzigingen.

## 📄 Licentie

Dit project wordt beschikbaar gesteld onder de MIT Licentie. Dit betekent dat je de code vrij mag gebruiken, aanpassen, en verspreiden voor zowel commerciële als niet-commerciële doeleinden, zolang de originele licentietekst en auteursvermelding behouden blijven in de code. Het moedigt open samenwerking en hergebruik aan, met minimale restricties.
