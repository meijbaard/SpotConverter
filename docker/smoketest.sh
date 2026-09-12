#!/usr/bin/env bash
#
# Rooktest op het gebouwde image: start de container zoals de homeserver hem
# straks draait, en controleert of hij werkelijk uitlevert wat de site nodig
# heeft.
#
#   ./docker/smoketest.sh [image]        standaard: spotconverter:test
#
# Draait in de workflow vóór het publiceren naar GHCR, en is lokaal met Docker
# even goed te gebruiken. `nginx -t` vangt alleen tikfouten; dit vangt de
# stillere fouten: een databestand dat door .dockerignore is weggevallen, een
# types-blok dat de mime-tabel sloopt, een 404-pagina die niet aanslaat,
# broncode die publiek in de webroot staat, of een nginx die niet opstart
# omdat read_only hem ergens de pas afsnijdt.

# Bewust zonder -e, in afwijking van de huisregel voor bash-scripts: dit script
# moet álle controles aflopen en aan het eind melden hoeveel er fout gingen.
# Met -e zou het bij de eerste afwijking stoppen en zie je maar één symptoom.
# Het faalt luid genoeg: exitcode 1 zodra FOUTEN groter dan nul is.
set -uo pipefail

IMAGE="${1:-spotconverter:test}"
NAAM="spotconverter-rooktest-$$"
BASIS=""
FOUTEN=0

rood()  { printf '\033[31m%s\033[0m\n' "$*"; }
groen() { printf '\033[32m%s\033[0m\n' "$*"; }

opruimen() { docker rm -f "$NAAM" >/dev/null 2>&1 || true; }
trap opruimen EXIT

fout() { rood "  FOUT  $*"; FOUTEN=$((FOUTEN + 1)); }
goed() { groen "  ok    $*"; }

# --- container starten ------------------------------------------------------
# Dezelfde beperkingen als in docker-compose.yml op de server. Zonder de drie
# tmpfs-mounts valt nginx onder read_only meteen om, en dat wil je hier weten
# en niet pas op de server.

echo "Rooktest op $IMAGE"
docker run -d --name "$NAAM" -P \
    --read-only \
    --tmpfs /var/cache/nginx --tmpfs /var/run --tmpfs /tmp \
    --security-opt no-new-privileges:true \
    "$IMAGE" >/dev/null || { rood "Kon de container niet starten."; exit 1; }

POORT=$(docker port "$NAAM" 80/tcp | head -1 | sed 's/.*://')
BASIS="http://127.0.0.1:${POORT}"

for _ in $(seq 1 30); do
    curl -fsS --max-time 2 "$BASIS/healthz" >/dev/null 2>&1 && break
    sleep 1
done

if ! curl -fsS --max-time 2 "$BASIS/healthz" >/dev/null 2>&1; then
    rood "De container antwoordde niet binnen 30 seconden. Logboek:"
    docker logs "$NAAM" 2>&1 | tail -30
    exit 1
fi

# --- hulpfuncties -----------------------------------------------------------

# status <pad> <verwachte code>
status() {
    local code
    code=$(curl -s -o /dev/null -w '%{http_code}' "$BASIS$1")
    if [ "$code" = "$2" ]; then goed "$1 → $code"; else fout "$1 → $code, verwacht $2"; fi
}

# header <pad> <headernaam> <verwachte deeltekst>
#
# Bewust een GET met een weggegooide body, geen HEAD: nginx slaat de
# gzip-filter over zodra r->header_only geldt, dus op een HEAD-verzoek zie je
# nooit een Content-Encoding en zou elke gzip-controle hieronder vals alarm
# geven.
header() {
    local waarde
    waarde=$(curl -s -o /dev/null -D - -H 'Accept-Encoding: gzip' "$BASIS$1" \
             | tr -d '\r' | grep -i "^$2:" | head -1 | cut -d' ' -f2-)
    case "$waarde" in
        *"$3"*) goed "$1 · $2: $waarde" ;;
        *)      fout "$1 · $2: '${waarde:-ontbreekt}', verwacht iets met '$3'" ;;
    esac
}

# bevat <pad> <verwachte deeltekst in de body>
#
# Zonder pijp naar grep: die stopt bij de eerste treffer, curl krijgt dan een
# SIGPIPE, en met pipefail zou een geslaagde controle als fout tellen.
bevat() {
    local body
    body=$(curl -s "$BASIS$1")
    case "$body" in
        *"$2"*) goed "$1 bevat '$2'" ;;
        *)      fout "$1 bevat '$2' niet" ;;
    esac
}

# afwezig <pad in de webroot>
afwezig() {
    if docker exec "$NAAM" test -e "/usr/share/nginx/html/$1" 2>/dev/null; then
        fout "$1 staat in de webroot en hoort daar niet"
    else
        goed "$1 staat niet in de webroot"
    fi
}

# --- 1. de pagina's ---------------------------------------------------------

echo; echo "Pagina's"
status /                200
status /index.html      200
status /disclaimer.html 200
status /bronnen.html    200
status /disclaimer      200     # try_files $uri.html — adres zonder extensie
header / content-type text/html

# --- 2. de app-shell --------------------------------------------------------

echo; echo "App-shell"
status /sw.js         200
status /manifest.json 200
header /sw.js cache-control must-revalidate
header /assets/css/spotconverter.css content-type  text/css
header /assets/css/spotconverter.css cache-control max-age=604800
header /assets/js/ui.js content-type     javascript
header /assets/js/ui.js content-encoding gzip
header /assets/images/favicon.svg        cache-control max-age=2592000
header /assets/fonts/figtree-latin.woff2 content-type  font/woff2

# Elk bestand uit PRECACHE_URLS in sw.js moet 200 geven: één 404 laat
# cache.addAll() struikelen en dan installeert de service worker niet.
echo; echo "Precache uit sw.js"
for pad in $(sed -n '/^const PRECACHE_URLS/,/^\];/p' sw.js | grep -oE "'[^']+'" | tr -d "'"); do
    [ "$pad" = "./" ] && pad=""
    status "/$pad" 200
done

# --- 3. de databestanden ----------------------------------------------------

echo; echo "Data"
for bestand in stations.csv afstanden.csv goederenpaden.csv \
               trajecten.json materieel.json overgangen.json snelheden.json \
               treinpatronen.json heatmap_treinpassages.json extrapolatie.json \
               nl_omtrek.json spoorkaart.json werkzaamheden.json; do
    status "/$bestand" 200
done
# Dit bestand valt onder een .gitignore-regel maar staat wél in git; juist
# daarom is het het eerste dat je kwijtraakt bij een schoonmaak.
status /afstanden_check/out_osm/osm_stations_coords.json 200

header /stations.csv    content-type     text/csv
header /stations.csv    content-encoding gzip
header /stations.csv    cache-control    max-age=0
header /spoorkaart.json content-type     application/json
header /spoorkaart.json content-encoding gzip

# --- 4. wat er niet uit mag komen -------------------------------------------

echo; echo "Afscherming"
status /docker/nginx.conf 403
status /docker/           403
header / x-content-type-options nosniff
header / x-frame-options        SAMEORIGIN
header / referrer-policy        strict-origin

echo; echo "Webroot"
for pad in .git .github .dockerignore Dockerfile README.md roadmap.md \
           HOMESERVER-MIGRATIE.md CNAME tests package.json \
           chatmining werkzaamheden spoorkaart \
           afstanden_check/valideer_data.py afstanden_check/__pycache__ \
           afstanden_check/out_osm/osm_stations_found.csv \
           docker/smoketest.sh; do
    afwezig "$pad"
done

# --- 5. de 404-pagina -------------------------------------------------------

echo; echo "404"
status /dit-bestaat-niet 404
bevat  /dit-bestaat-niet "Oeps"

# --- uitslag ----------------------------------------------------------------

echo
if [ "$FOUTEN" -eq 0 ]; then
    groen "Rooktest geslaagd."
    exit 0
fi
rood "Rooktest mislukt: $FOUTEN controle(s) fout."
echo "Webroot ter vergelijking:"
docker exec "$NAAM" ls -a /usr/share/nginx/html
exit 1
