SpotConverter Pro

SpotConverter Pro is een geavanceerde webapplicatie, specifiek ontworpen voor en door treinspotters en -enthousiastelingen. Het primaire doel van deze tool is om de vaak cryptische en met jargon doorspekte WhatsApp-berichten over treinwaarnemingen te transformeren in heldere, gestructureerde en direct bruikbare informatie. De tool analyseert de inhoud van een spot-bericht, herkent routes op basis van vooraf gedefinieerde spoortrajecten en berekent een geschatte passage-tijd voor een door de gebruiker gekozen station, waardoor je sneller kunt anticiperen op naderende treinen.

De applicatie werkt volledig lokaal in de browser en vereist geen enkele installatie. Alle benodigde data, zoals stations- en afstandslijsten, wordt dynamisch ingeladen vanaf een centrale locatie, wat het onderhoud eenvoudig en efficiënt maakt.
Inhoudsopgave

    ✨ Geavanceerde Features

    🚀 Hoe te Gebruiken

    🔧 Configuratie & Data

    💾 Bronvermeldingen

    🤝 Bijdragen

    📄 Licentie

**✨ Geavanceerde Features
**
    Intelligente Route-Analyse: De kern van de tool. Het herkent de gereden route door gespotte stations te matchen met bekende, ingebouwde spoortrajecten. De logica is flexibel en kan een route herkennen, zelfs als tussenliggende, minder relevante stations in het spot-bericht worden overgeslagen.

    Combineren van Trajecten: De tool kan complexe, doorgaande reizen begrijpen die meerdere gedefinieerde trajecten overspannen. Het herkent knooppunten (zoals Amersfoort) en kan trajecten zoals Duitsland-Amersfoort en Amersfoort-Amsterdam naadloos aan elkaar "knopen" tot één logische, doorgaande route.

    Dynamische Passage-berekening: Berekent een geschatte aankomsttijd voor elk willekeurig station in de keuzelijst. Dit gebeurt op basis van een uitgebreide afstandsmatrix en een instelbare gemiddelde snelheid, wat een realistische voorspelling oplevert. De tool houdt hierbij rekening met het eerstgenoemde station in de spot als startpunt van de berekening.

    Automatische Verwerking: Voor een soepele gebruikerservaring start de analyse direct bij het plakken of typen van een bericht in het invoerveld. Een ingebouwd 'debounce'-mechanisme zorgt ervoor dat de berekening pas wordt uitgevoerd als de gebruiker even stopt met typen, wat onnodige verwerking voorkomt.

    Verrijking van Jargon: De tool functioneert als een "vertaler" voor spotters-jargon. Veelvoorkomende afkortingen zoals LLT (Losse loc trein), Badl (Beladen aan de loc), of V (Vertrek) worden automatisch herkend en voorzien van een duidelijke tooltip met de volledige betekenis.

    Dynamisch Data Inladen: Om de tool onderhoudsvriendelijk en altijd actueel te houden, haalt het de stations- en afstandsdata direct van een centrale GitHub-locatie via CSV-bestanden. Aanpassingen in deze bestanden zijn direct zichtbaar in de tool, zonder dat de code aangepast hoeft te worden.

    Slimme Afkorting-herkenning: Om foutieve herkenning van veelvoorkomende Nederlandse woorden (zoals 'en' of 'de') te voorkomen, hanteert de tool een slimme logica. Afkortingen die kunnen conflicteren, worden alleen herkend als ze met een hoofdletter worden geschreven (bijv. EN voor Enschede), terwijl unieke afkortingen (zoals Amf) ongeacht hoofdlettergebruik worden herkend.

    Moderne Interface: De vormgeving is geïnspireerd op de duidelijke en functionele stijl van rijdendetreinen.nl, met een focus op leesbaarheid en een intuïtieve gebruikerservaring.

**🚀 Hoe te Gebruiken
**
    Open de Applicatie: Start de tool door het station_converter.html bestand te openen in een moderne webbrowser zoals Chrome, Firefox, of Edge.

    Plak het Bericht: Kopieer een spot-bericht uit WhatsApp en plak dit in het tekstveld "Plak je WhatsApp bericht hier:". De tool begint onmiddellijk met de analyse.

    Kies je Doelstation: In de dropdown-lijst "Bereken passage voor:" kun je het station selecteren waarvoor je een passage-tijd wilt weten. Standaard staat deze op "Baarn", maar elk station uit de lijst is selecteerbaar.

    Bekijk de Resultaten: De resultaten verschijnen direct in drie overzichtelijke blokken:

        Verwerkt Bericht: De originele tekst, maar dan verrijkt met volledige stationsnamen en tooltips voor jargon.

        Passage Inschatting: Een duidelijke conclusie of de trein het gekozen station passeert, inclusief een berekende aankomsttijd.

        Geparsede Data: Een uitklapbaar blok met de technische data (in JSON-formaat) die de tool heeft geëxtraheerd, handig voor debugging en analyse.

**🔧 Configuratie & Data
**
De tool is ontworpen om flexibel en onderhoudsvriendelijk te zijn door data extern in te laden.
_stations.csv
_
Dit bestand is de ruggengraat van de stationsherkenning. Het bevat alle relevante stations en hun afkortingen. Voor een correcte werking moet het minimaal de volgende kolommen bevatten:

    code: De unieke afkorting van het station (bijv. AMF).

    name_long: De volledige, officiële naam van het station (bijv. Amersfoort Centraal).

_afstanden.csv
_
Dit bestand functioneert als een afstandsmatrix voor het berekenen van reistijden. De structuur is als volgt:

    De eerste kolom bevat de stationsafkortingen van de beginpunten.

    De eerste rij (header) bevat de stationsafkortingen van de eindpunten.

    De cellen op het snijpunt van een rij en kolom bevatten de exacte afstand in kilometers.

**Ingebouwde Trajecten
**
De belangrijkste en meest voorspelbare spoorroutes zijn voor de betrouwbaarheid direct in de JavaScript-code gedefinieerd. Dit stelt de tool in staat om complexe routes te herkennen en te combineren. Deze lijst kan in de code eenvoudig worden aangepast of uitgebreid met nieuwe trajecten.

💾 **Bronvermeldingen**

Voor de data heb ik gebruik gemaakt van de datasets van @rijdendetreinen https://www.rijdendetreinen.nl/open-data/
Gebruikte datasets:

    Treinstations

    Afstanden tussen stations

De stationsdata is aangevuld met afkortingen van https://www.nicospilt.com/verkortingen_tabel.htm

🤝 **Bijdragen**

Bijdragen die de tool verbeteren zijn altijd welkom. Heb je een idee voor een nieuwe feature, een correctie op een traject, of een uitbreiding van de afstandsmatrix? Voel je vrij om een issue aan te maken om het te bespreken, of dien direct een pull request in met je voorgestelde wijzigingen.

📄 **Licentie**

Dit project wordt beschikbaar gesteld onder de MIT Licentie. Dit betekent dat je de code vrij mag gebruiken, aanpassen, en verspreiden voor zowel commerciële als niet-commerciële doeleinden, zolang de originele licentietekst en auteursvermelding behouden blijven in de code.
