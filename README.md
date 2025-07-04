# SpotConverter

SpotConverter is een eenvoudige webapplicatie, ontworpen voor en door treinspotters. De tool maakt het mogelijk om snel en efficiënt WhatsApp-berichten over treinwaarnemingen te verwerken en te verrijken met duidelijke, leesbare informatie.

De app werkt volledig in je browser en vereist geen installatie.

## ✨ Features

-   **Stationsnamen converteren**: Zet automatisch afkortingen van stations (bijv. `ASD`, `UT`, `GV`) om naar hun volledige naam (bijv. `Amsterdam Centraal`, `Utrecht Centraal`, `Den Haag HS`).
-   **Herkenning van informatie**: Locnummers en specifieke goederentreinbenamingen (zoals 'De IJssel') worden in de tekst geaccentueerd, zodat ze direct opvallen.
-   **Rijrichting suggereren**: Op basis van de herkende stations in het bericht, geeft de app een suggestie voor de rijrichting van de trein (bijv. Oost of West).
-   **Volledig aanpasbaar**: Gebruikers kunnen de lijst met stationsafkortingen en de definities voor rijrichtingen direct in de app aanpassen via eenvoudige JSON-configuraties.
-   **Privacy-vriendelijk**: Alle verwerkingen vinden lokaal in je browser plaats. De ingevoerde berichten worden nergens opgeslagen of verstuurd.

## 🚀 Hoe te gebruiken

Het gebruik van de SpotConverter is heel eenvoudig:

1.  Open het bestand `station_converter.html` in een webbrowser.
2.  Plak het WhatsApp-bericht dat je wilt verwerken in het tekstveld "Plak je WhatsApp bericht hier:".
3.  Klik op de knop **Verwerk Bericht**.
4.  Het verwerkte resultaat, met volledige stationsnamen en gemarkeerde details, verschijnt direct daaronder in de outputsectie.

## 🔧 Configuratie

Je kunt de werking van de app eenvoudig aanpassen via de twee configuratievelden onderaan de pagina:

-   **Stationsafkortingen Configuratie**: Hier kun je de JSON-lijst met stations en hun afkortingen uitbreiden of wijzigen. Zorg ervoor dat je de JSON-structuur met dubbele aanhalingstekens correct aanhoudt.
-   **Rijrichting Configuratie**: Definieer hier welke stations geassocieerd zijn met een bepaalde rijrichting. Als een van deze stations in een bericht wordt gevonden, zal de app de bijbehorende richting suggereren.

## 📄 Licentie

Dit project wordt beschikbaar gesteld onder de **MIT Licentie**. Dit betekent dat je de code vrij mag gebruiken, aanpassen, en verspreiden, zolang de originele licentietekst behouden blijft.

## 🤝 Bijdragen

Bijdragen aan dit project zijn van harte welkom! Heb je een idee voor een verbetering of een nieuwe feature? Maak een *issue* aan of dien een *pull request* in.

## 💾 Brondvermeldingen

Voor de data heb ik gebruik gemaakt van de datasets van @rijdendetreinen https://www.rijdendetreinen.nl/open-data/

Gebruikte datasets:
1. Treinstations
2. Afstanden tussen stations
