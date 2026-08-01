#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Haal coördinaten op voor trajectstations die nog niet in de coords-JSON of
handmatige CSV staan. Stdlib-only variant van osm_station_check.py; schrijft
compatibel weg naar out_osm/osm_stations_found.csv en de coords-JSON zodat de
bestaande pipeline consistent blijft. Respecteert de Nominatim rate limit."""
import csv, json, os, sys, time, urllib.parse, urllib.request

BASIS = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(BASIS)
OUT = os.path.join(BASIS, "out_osm")
UA = "Spotconverter/1.0 (+https://github.com/meijbaard/SpotConverter)"
LANDEN = {"NL": "nl", "D": "de", "B": "be", "F": "fr"}


def nominatim(q, country):
    params = {"q": q, "format": "json", "limit": 1}
    if country:
        params["countrycodes"] = country
    url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    for poging in range(3):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                data = json.load(r)
            return data[0] if data else None
        except Exception:
            time.sleep(2 * (poging + 1))
    return None


def main():
    trajecten = json.load(open(os.path.join(ROOT, "trajecten.json"), encoding="utf-8"))
    codes = sorted({c for route in trajecten.values() for c in route})

    coords = json.load(open(os.path.join(OUT, "osm_stations_coords.json"), encoding="utf-8"))
    handmatig = set()
    with open(os.path.join(OUT, "osm_stations_not_found_withlatlon.csv"), encoding="utf-8") as f:
        for r in csv.DictReader(f):
            handmatig.add(r["code"].strip())

    stations = {}
    with open(os.path.join(ROOT, "stations.csv"), encoding="utf-8") as f:
        for r in csv.DictReader(f):
            code = r["code"].strip()
            if code and code not in stations:
                stations[code] = (r["name_long"].strip(), LANDEN.get(r["country"].strip().upper()))

    todo = [c for c in codes if c not in coords and c not in handmatig]
    print(f"Op te halen: {len(todo)} van {len(codes)} trajectstations", flush=True)

    gevonden, mislukt = [], []
    for i, code in enumerate(todo, 1):
        naam, land = stations.get(code, (code, None))
        hit = None
        for q in (f"{naam} station", f"Station {naam}", naam):
            hit = nominatim(q, land)
            time.sleep(0.9)
            if hit:
                break
        if hit:
            coords[code] = {"lat": float(hit["lat"]), "lon": float(hit["lon"])}
            gevonden.append((code, naam, land or "", hit))
            print(f"[{i}/{len(todo)}] {code} OK", flush=True)
        else:
            mislukt.append((code, naam))
            print(f"[{i}/{len(todo)}] {code} NIET GEVONDEN ({naam})", flush=True)

    # found.csv aanvullen zodat een toekomstige osm_station_check --resume
    # deze codes overslaat en de JSON-herbouw ze behoudt
    with open(os.path.join(OUT, "osm_stations_found.csv"), "a", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        for code, naam, land, hit in gevonden:
            w.writerow([code, naam, land, hit["lat"], hit["lon"], hit.get("osm_id", ""),
                        hit.get("osm_type", ""), hit.get("display_name", ""),
                        hit.get("class", ""), hit.get("type", ""), "FOUND"])

    with open(os.path.join(OUT, "osm_stations_coords.json"), "w", encoding="utf-8") as f:
        json.dump(coords, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"\nKlaar: {len(gevonden)} gevonden, {len(mislukt)} mislukt", flush=True)
    if mislukt:
        print("Mislukt:", ", ".join(c for c, _ in mislukt), flush=True)


if __name__ == "__main__":
    main()
