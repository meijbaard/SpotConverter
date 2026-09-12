# SpotConverter — publicatie-image
#
# Variant B uit HOMESERVER-MIGRATIE.md: er is geen build-stap, de repo ís de
# site. Wat hier in de webroot belandt is dus precies wat er na .dockerignore
# van de buildcontext overblijft — zie dat bestand voor wat er niet in mag.
#
# Versie bewust vastgezet: geen 'latest' op de server, conform de serverregels.
#
# Dit bestand bevat met opzet geen RUN-instructie. Daardoor hoeft buildx niets
# uit te voeren en kan het image voor amd64 en arm64 tegelijk worden
# samengesteld zonder emulatie. De nginx-configuratie wordt in de workflow
# gecontroleerd, in aparte stappen die wel native draaien.
FROM nginx:1.30.4-alpine

# Eigen serverblok in plaats van de standaard default.conf van het image.
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# De site zelf. docker/ komt hier onvermijdelijk in mee (die map moet in de
# buildcontext blijven voor de COPY hierboven); nginx.conf weert hem met een
# deny-regel uit de uitlevering.
COPY . /usr/share/nginx/html/

LABEL org.opencontainers.image.title="SpotConverter" \
      org.opencontainers.image.description="Webapp voor treinspotters: WhatsApp-spotberichten naar route, materieel en doorkomsttijden" \
      org.opencontainers.image.source="https://github.com/meijbaard/SpotConverter" \
      org.opencontainers.image.url="https://spotconverter.markeijbaard.nl" \
      org.opencontainers.image.licenses="MIT"

EXPOSE 80
