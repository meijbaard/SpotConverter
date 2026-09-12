# Deze site verhuizen naar de homeserver

Weg bij GitHub Pages, uitgeleverd door een nginx-container op de eigen server.
GitHub blijft de bouwstraat: Actions bouwt de site en publiceert een kant-en-klaar
image naar GHCR, de server haalt dat op. De server hoeft geen Ruby, geen Node en
geen broncode te kennen.

`markeijbaard.nl` heeft deze route op 11 september 2026 afgelegd. Alles wat daar
misging staat hieronder al verwerkt — lees vooral het hoofdstuk **Valkuilen**
vóór je begint, want twee ervan kosten je anders een avond.

---

## Wat je invult

| | `tijmenopstoom2` | `SpotConverter` |
|---|---|---|
| Domein | `tijmenopstoom.nl` + `www.tijmenopstoom.nl` | `spotconverter.markeijbaard.nl` |
| Image | `ghcr.io/meijbaard/tijmenopstoom-nl` | `ghcr.io/meijbaard/spotconverter` |
| Container | `tijmenopstoom-site` | `spotconverter-site` |
| Map op de server | `~/docker/tijmenopstoom-nl` | `~/docker/spotconverter` |
| Build | Jekyll → `_site` (**variant A**) | geen build, de repo ís de site (**variant B**) |
| Stand nu | TransIP-parkeerpagina "Bezet!"; de DNS wijst nergens heen, de site is nooit live geweest op dit domein | DNS wijst al naar `45.142.234.147`, maar NPM kent de naam niet en stuurt door naar `homeserver.eijbaard.nl` — **de site is nu stuk** |

Hieronder heet dat `<DOMEIN>`, `<IMAGE>`, `<CONTAINER>` en `<MAP>`. `<PAKKET>` is
het laatste stuk van `<IMAGE>` — dus `tijmenopstoom-nl` of `spotconverter`.

> [!note] Stand voor SpotConverter, 12 september 2026
> Hoofdstuk 1 is uitgevoerd in deze repo: `docker/nginx.conf`, `Dockerfile`,
> `.dockerignore` en de job `image` in `.github/workflows/pages.yml` staan
> klaar. Hoofdstuk 2 staat klaar in `homemachines/spotconverter/`. Er is één
> ding bij gekomen dat hier nog niet stond: `docker/smoketest.sh`, dat het
> gebouwde image start en nakijkt vóór het naar GHCR gaat — zie de toelichting
> onder **Valkuilen 5**. Wat er nog moet gebeuren is hoofdstuk 3, en dat begint
> met pushen.

---

## 1. In deze repo

### 1a. `docker/nginx.conf`

Voor beide varianten identiek. De `www`-regel alleen als het domein een
`www`-variant heeft; bij een subdomein laat je dat serverblok weg.

```nginx
# Deze configuratie belandt in /etc/nginx/conf.d/default.conf en draait dus
# binnen het http-blok van het nginx-image.
#
# TLS en HSTS komen van Nginx Proxy Manager; deze container luistert alleen op
# poort 80 binnen proxy-network en is niet rechtstreeks vanaf internet bereikbaar.

# Zonder deze regels staat in elke logregel het interne adres van de proxy.
set_real_ip_from 172.16.0.0/12;
set_real_ip_from 192.168.0.0/16;
real_ip_header   X-Real-IP;

# Cache-Control via een map in plaats van add_header per location: een
# add_header in een location schakelt álle add_headers van het serverblok uit.
# Geen 'immutable' op css/js, want die bestandsnamen bevatten geen versie —
# een terugkerende bezoeker zou na een restyling de oude stylesheet houden.
map $uri $site_cache {
    default                 "public, max-age=0, must-revalidate";
    ~^/assets/(css|js)/     "public, max-age=604800";
    ~^/assets/              "public, max-age=2592000";
}

gzip            on;
gzip_vary       on;
gzip_min_length 1024;
gzip_proxied    any;
gzip_comp_level 6;
gzip_types      text/plain text/css text/xml application/xml application/xml+rss
                application/atom+xml application/javascript application/json
                image/svg+xml application/manifest+json;

# Alleen bij een domein met www:
server {
    listen 80;
    server_name www.<DOMEIN>;
    return 301 https://<DOMEIN>$request_uri;
}

server {
    listen 80 default_server;
    server_name _;

    root  /usr/share/nginx/html;
    index index.html;

    server_tokens off;
    charset utf-8;

    # Zonder deze twee bouwt nginx bij een mapredirect een absolute URL met zijn
    # eigen containernaam erin, en belandt de bezoeker op http://<CONTAINER>/pad/.
    absolute_redirect off;
    port_in_redirect  off;

    add_header Cache-Control          $site_cache                      always;
    add_header X-Content-Type-Options nosniff                          always;
    add_header X-Frame-Options        SAMEORIGIN                       always;
    add_header Referrer-Policy        strict-origin-when-cross-origin  always;
    add_header Permissions-Policy     "geolocation=(), microphone=(), camera=()" always;

    # Voor Uptime Kuma. Staat los van de site, zodat een controle elke minuut
    # niet in de statistieken of het toegangslogboek terechtkomt.
    location = /healthz {
        access_log off;
        default_type text/plain;
        return 200 "ok\n";
    }

    location / {
        try_files $uri $uri/ $uri.html =404;
    }

    error_page 404 /404.html;
    location = /404.html {
        internal;
    }

    # .well-known blijft er bewust buiten: daar loopt de certificaatcontrole over.
    location ~ /\.(?!well-known) {
        deny all;
    }
}
```

### 1b. `Dockerfile`

**Zet er geen `RUN` in.** Zonder `RUN` hoeft buildx niets uit te voeren en kan
het image voor meerdere architecturen tegelijk worden samengesteld zónder
emulatie. De controle op de nginx-configuratie verhuist naar de workflow.

Variant A (Jekyll — Actions bouwt eerst `_site`):

```dockerfile
FROM nginx:1.30.4-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY _site/ /usr/share/nginx/html/
EXPOSE 80
```

Variant B (geen build — de repo is de site):

```dockerfile
FROM nginx:1.30.4-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY . /usr/share/nginx/html/
EXPOSE 80
```

### 1c. `.dockerignore`

Variant A:

```
*
!_site
!docker
```

Variant B — hier moet je juist opsommen wat er *niet* in de container hoort,
anders publiceer je je workflows en je git-geschiedenis mee:

```
.git
.github
.claude
node_modules
tests
*.md
Dockerfile
.dockerignore
```

`docker/` kan hier **niet** in die lijst: die map moet in de buildcontext blijven,
want de `COPY` van `nginx.conf` haalt hem daaruit. Gevolg is wel dat
`COPY . /usr/share/nginx/html/` hem mee de webroot in neemt en je je eigen
serverconfiguratie zou uitleveren. Zet daarom bij variant B dit blok in
`docker/nginx.conf`, naast de andere locations:

```nginx
    # Alleen variant B: de buildcontext is de hele repo, dus deze map staat ook
    # in de webroot. Niet uitleveren.
    location ^~ /docker/ {
        deny all;
    }
```

Loop na de eerste build even na wat erin zit:

```bash
docker run --rm <IMAGE>:main ls -a /usr/share/nginx/html
```

### 1d. De workflow

Laat de bestaande Pages-publicatie gewoon staan — dat is je terugweg — en zet er
een tweede publicatiedoel naast. Belangrijk: **twee losse jobs**, allebei met
`needs: build`. Zet je het image-werk in de Pages-job, dan houdt een hapering bij
het register ook de nog-live site tegen.

```yaml
permissions:
  contents: read        # rechten per job, niet op workflowniveau

jobs:
  # ... bestaande build-job ...
  #
  # Variant A: laat de build-job het resultaat ook als gewoon artefact uploaden,
  # naast het pages-artefact:
  #
  #   - name: Artefact voor het container-image
  #     uses: actions/upload-artifact@v4
  #     with:
  #       name: site
  #       path: ./_site
  #       retention-days: 1
  #       if-no-files-found: error

  image:
    needs: build
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      # Alleen variant A — bij variant B staat de site al in de checkout:
      - name: Gebouwde site ophalen
        uses: actions/download-artifact@v4
        with:
          name: site
          path: ./_site

      - name: Nginx-configuratie controleren
        # Native op de runner, dus zonder emulatie. Vangt een tikfout in
        # nginx.conf vóór er een kapot image gepubliceerd wordt.
        run: |
          docker run --rm \
            -v "$PWD/docker/nginx.conf:/etc/nginx/conf.d/default.conf:ro" \
            nginx:1.30.4-alpine nginx -t

      - name: Buildx klaarzetten
        uses: docker/setup-buildx-action@v3

      - name: Inloggen bij GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Imagenaam en tags bepalen
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: <IMAGE>
          # 'main' is de tag die de server volgt; 'sha-<commit>' blijft staan en
          # is waar je op terugvalt als een publicatie stukgaat.
          tags: |
            type=raw,value=main
            type=sha

      - name: Image bouwen en publiceren
        uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          # De runner is amd64, de homeserver arm64. Zonder deze regel krijg je
          # een image dat op de server meteen afslaat met "exec format error".
          platforms: linux/amd64,linux/arm64
```

### 1e. Alleen bij Jekyll (variant A)

Zet `Dockerfile` en `docker/` in de `exclude:` van `_config.yml`, anders worden
ze mee in `_site` gekopieerd en staan ze publiek op de site:

```yaml
exclude:
  - Dockerfile
  - docker/
```

En controleer `url:`. In `tijmenopstoom2` staat daar nog
`https://tijmenopstoom.github.io`, terwijl `CNAME` het eigen domein claimt. Dat
moet het domein worden waar de site straks draait, anders wijzen alle canonical-
URL's, de sitemap en de feed naar het verkeerde adres:

```yaml
url: "https://tijmenopstoom.nl"
```

---

## 2. Op de homeserver

Drie bestanden in `<MAP>` in de repo `homemachines`. Kijk voor een uitgewerkt
voorbeeld in `homemachines/markeijbaard-nl/` — dat is dezelfde opzet.

### 2a. `docker-compose.yml`

```yaml
services:
  site:
    image: <IMAGE>:${SITE_TAG:-main}
    container_name: <CONTAINER>
    restart: unless-stopped
    init: true

    # De container serveert alleen bestanden. De drie tmpfs-mounts zijn wat
    # nginx zelf nodig heeft: zijn pid-bestand en de tijdelijke mappen.
    read_only: true
    tmpfs:
      - /var/cache/nginx
      - /var/run
      - /tmp
    security_opt:
      - no-new-privileges:true

    # Geen ports: alleen bereikbaar via Nginx Proxy Manager.
    networks:
      - proxy-network

    healthcheck:
      test: ["CMD-SHELL", "wget -q -O /dev/null http://127.0.0.1/healthz || exit 1"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s

    logging:
      driver: json-file
      options: { max-size: "10m", max-file: "3" }

    labels:
      # Watchtower blijft hiervan af: deploy.sh haalt een publicatie binnen tien
      # minuten op, terwijl Watchtower pas om 04:00 langskomt.
      - "com.centurylinklabs.watchtower.enable=false"

networks:
  proxy-network:
    external: true
```

### 2b. `deploy.sh`

Kopieer `homemachines/markeijbaard-nl/deploy.sh` en pas `REF` en `CONTAINER`
aan. Het script haalt het image op, herstart alleen als er werkelijk iets nieuws
is, en eindigt pas op "Klaar!" als de container zich gezond meldt — anders op
exitcode 1, zodat cron een mail stuurt.

### 2c. `npm-advanced.conf`

```nginx
resolver 127.0.0.11 valid=10s ipv6=off;
set $site_upstream http://<CONTAINER>:80;

location / {
    proxy_pass          $site_upstream;
    proxy_http_version  1.1;
    proxy_set_header    Host              $host;
    proxy_set_header    X-Real-IP         $remote_addr;
    proxy_set_header    X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header    X-Forwarded-Proto $scheme;
    proxy_intercept_errors off;
}
```

En `.gitignore` in `<MAP>`, zodat alleen deze bestanden in git komen:

```
*
!.gitignore
!docker-compose.yml
!deploy.sh
!npm-advanced.conf
!README.md
```

---

## 3. Live zetten

1. **Pushen en wachten tot de run groen is.** Controleer daarna dat het image
   voor beide architecturen is gepubliceerd — dit is de stap die je overslaat en
   waar je een half uur mee kwijt bent:

   ```bash
   TOKEN=$(curl -s "https://ghcr.io/token?scope=repository:meijbaard/<PAKKET>:pull&service=ghcr.io" | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
   curl -s -H "Authorization: Bearer $TOKEN" \
        -H "Accept: application/vnd.oci.image.index.v1+json" \
        https://ghcr.io/v2/meijbaard/<PAKKET>/manifests/main
   ```

   Je wilt een `manifests`-lijst zien met `amd64` én `arm64`. Krijg je één
   enkel manifest, dan is de build single-arch en start de container straks niet.
   Het pakket staat vanzelf op publiek zolang de repo openbaar is.

2. **Container starten:**

   ```bash
   cd <MAP> && docker compose up -d && docker compose ps
   docker exec <CONTAINER> wget -qO- http://127.0.0.1/healthz
   docker exec <CONTAINER> wget -qO- http://127.0.0.1/ | head -20
   ```

3. **Proxy host in NPM:** scheme `http`, forward hostname `<CONTAINER>`, poort
   `80`, Cache Assets **uit**, Block Common Exploits aan, Websockets uit,
   certificaat aanvragen met Force SSL en HTTP/2. In het tabblad *Advanced* de
   inhoud van `npm-advanced.conf`. Meteen daarna:

   ```bash
   docker exec nginx-proxy-manager nginx -t
   ```

   Meldt hij `duplicate location "/"`, haal dan het `location`-blok uit Advanced
   en laat alleen de `resolver`- en `set`-regel staan.

4. **Fail2Ban herstarten.** Niet overslaan — zie Valkuilen.

   ```bash
   sudo systemctl restart fail2ban
   sudo fail2ban-client get npm-forbidden logpath | grep -c proxy-host
   ```

5. **DNS.** Voor `tijmenopstoom.nl` bij TransIP een A-record naar
   `45.142.234.147` en `www` als CNAME naar het kale domein; de parkeerpagina
   verdwijnt daarmee. Voor `spotconverter.markeijbaard.nl` staat de DNS al goed
   — daar is stap 3 genoeg om hem weer in de lucht te krijgen.

   Vraag het certificaat in NPM pas aan als de DNS is doorgekomen; de controle
   van Let's Encrypt moet bij deze server uitkomen.

6. **AdGuard-rewrite** voor het domein naar `192.168.188.140`. Zonder die staat
   de site vanaf je eigen wifi op zwart: de Fritz!Box kent geen hairpin NAT.

7. **Cron**, en dezelfde regel in de tijdentabel van `KENNISBANK.md` §5b:

   ```
   */10 * * * * <MAP>/deploy.sh >> <MAP>/deploy.log 2>&1
   ```

8. **Uptime Kuma**: HTTP-monitor op `https://<DOMEIN>/healthz`, 2 pogingen,
   certificaatmelding aan.

9. **Laat GitHub Pages een week meedraaien.** Gaat alles goed, dan pas de
   Pages-job, het `CNAME`-bestand en Pages in de repo-instellingen weg. Tot dat
   moment is terugvallen één DNS-wijziging.

---

## Valkuilen

**1. Het image moet arm64 kunnen.** De runner van Actions is amd64, de
homeserver is arm64. Zonder `platforms: linux/amd64,linux/arm64` krijg je een
image dat op de server meteen omvalt met
`[FATAL tini] exec /docker-entrypoint.sh failed: Exec format error`, in een
eindeloze herstartlus. Die melding wijst dus naar de architectuur, niet naar het
startscript en niet naar `read_only`.

**2. Een nieuwe proxy host wordt niet vanzelf bewaakt.** De jails
`npm-forbidden`, `npm-auth` en de twee umami-jails lezen
`proxy-host-*_access.log`. Fail2Ban vertaalt dat patroon één keer naar een lijst
bestanden, bij het starten van de jail. Een proxy host die je daarna aanmaakt
schrijft naar een nieuw logbestand dat buiten die lijst valt — en blijft dus
onbewaakt, zonder dat iets daarover klaagt. Herstart Fail2Ban na het toevoegen.
Krijg je meteen daarna *Failed to access socket path*, dan is de socket er nog
niet: even wachten en opnieuw vragen. Pas als `systemctl status fail2ban`
**failed** zegt is er echt iets mis.

**3. Zet de containernaam niet rechtstreeks in de proxy.** NPM stopt de naam in
een `proxy_pass`, en nginx zoekt die op bij het opstarten. Staat de container
dan stil, dan start nginx helemaal niet en liggen *alle* sites op de server
plat. Dat gebeurde op 28 augustus 2026. Met de resolver en de variabele uit
`npm-advanced.conf` kost een stilstaande container hooguit die ene site.

**4. `docker compose up -d` haalt geen nieuw image op.** De tag `main` staat na
de eerste keer lokaal en verandert niet vanzelf. Zonder `docker compose pull`
start je gewoon opnieuw hetzelfde image — ook als er allang een nieuwe versie in
GHCR ligt. `deploy.sh` doet die pull; met de hand doe je hem zelf.

**5. `nginx -t` ziet de stille fouten niet.** Een configuratie kan foutloos
laden en tóch de verkeerde site uitleveren: een `types`-blok binnen een
serverblok vervangt de hele mime-tabel (alles wordt `application/octet-stream`
en de browser downloadt je voorpagina in plaats van hem te tonen), een te brede
regel in `.dockerignore` laat een databestand wegvallen, en bij variant B staat
je broncode zomaar in de webroot. Start het image daarom één keer op de runner
en controleer het met echte verzoeken vóór je publiceert — `docker/smoketest.sh`
in `SpotConverter` is daar een uitgewerkt voorbeeld van. Dat is ook de enige
plek waar je de combinatie `read_only` + tmpfs test zonder de server te raken.

**6. Committen kan struikelen op de YubiKey.** Bij een `git pull --rebase` moet
git de commit opnieuw ondertekenen, en dat aanraakvenster mis je makkelijk;
je krijgt dan `Couldn't sign message: device not found`. Werkt dat tegen:

```bash
git -c commit.gpgsign=false pull --rebase origin main
git commit --amend --no-edit -S
```

De rebase draait dan zonder sleutel, en je zet de handtekening er daarna in één
losse handeling op — dat is precies de handeling die wel betrouwbaar werkt.

---

## Terugvallen

**Publicatie stuk, server draait.** Zoek bij Packages de `sha-`tag van de laatste
goede build:

```bash
cd <MAP> && echo "SITE_TAG=sha-1a2b3c4" > .env && docker compose up -d
```

Zet `SITE_TAG` daarna weer op `main`, anders blijft de site op die oude versie
staan en lijkt publiceren kapot.

**Server eruit.** Zet de DNS terug naar GitHub Pages. Zolang de Pages-job nog
draait, staat daar een actuele kopie.
