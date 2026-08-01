#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Valideer de samenhang van de databestanden. Exitcode 1 bij fouten.

Checks:
  - trajecten.json: geldige JSON, elke code bestaat in stations.csv,
    geen dubbele codes binnen één traject
  - elk trajectstation heeft coördinaten (waarschuwing) en elke
    opeenvolgende afstand is ingevuld (waarschuwing)
  - overige JSON-databestanden zijn geldige JSON

Gebruik: python3 afstanden_check/valideer_data.py [--strikt]
  --strikt maakt van waarschuwingen fouten (voor CI).
"""
import csv, json, os, sys

BASIS = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(BASIS)

fouten, waarschuwingen = [], []


def laad_json(pad):
    try:
        with open(pad, encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        fouten.append(f"{os.path.basename(pad)}: ongeldige JSON ({e})")
        return None


def main():
    strikt = "--strikt" in sys.argv

    stations = set()
    with open(os.path.join(ROOT, "stations.csv"), encoding="utf-8") as f:
        for r in csv.DictReader(f):
            code = r["code"].strip()
            if code:
                stations.add(code)

    trajecten = laad_json(os.path.join(ROOT, "trajecten.json")) or {}
    coords = laad_json(os.path.join(BASIS, "out_osm", "osm_stations_coords.json")) or {}

    handmatig = set()
    hand_pad = os.path.join(BASIS, "out_osm", "osm_stations_not_found_withlatlon.csv")
    if os.path.exists(hand_pad):
        with open(hand_pad, encoding="utf-8") as f:
            handmatig = {r["code"].strip() for r in csv.DictReader(f)}

    matrix = {}
    with open(os.path.join(ROOT, "afstanden.csv"), encoding="utf-8") as f:
        rows = list(csv.reader(f))
    kolommen = [h.strip().upper() for h in rows[0][1:]]
    for row in rows[1:]:
        matrix[row[0].strip().upper()] = dict(zip(kolommen, row[1:]))

    for naam, route in trajecten.items():
        for code in route:
            if code not in stations:
                fouten.append(f"trajecten.json [{naam}]: code {code} bestaat niet in stations.csv")
            if code not in coords and code not in handmatig:
                waarschuwingen.append(f"[{naam}] {code}: geen coördinaten")
        dubbel = {c for c in route if route.count(c) > 1}
        if dubbel:
            fouten.append(f"trajecten.json [{naam}]: dubbele codes {sorted(dubbel)}")
        for a, b in zip(route, route[1:]):
            km = matrix.get(a, {}).get(b) or matrix.get(b, {}).get(a) or "0"
            if not km.strip() or int(float(km)) == 0:
                waarschuwingen.append(f"[{naam}] {a}-{b}: geen afstand (fallback wordt gebruikt)")

    for bestand in ["extrapolatie.json", "materieel.json", "treinpatronen.json",
                    "heatmap_treinpassages.json", "manifest.json", "overgangen.json"]:
        laad_json(os.path.join(ROOT, bestand))

    overgangen = laad_json(os.path.join(ROOT, "overgangen.json")) or {}
    alle_traject_codes = {c for route in trajecten.values() for c in route}
    for drietal in overgangen.get("verboden", []):
        for code in drietal:
            if code not in alle_traject_codes:
                waarschuwingen.append(f"overgangen.json: {code} ligt op geen enkel traject")

    for w in waarschuwingen:
        print(f"WAARSCHUWING: {w}")
    for f_ in fouten:
        print(f"FOUT: {f_}")
    print(f"\n{len(trajecten)} trajecten, {len(fouten)} fouten, {len(waarschuwingen)} waarschuwingen")

    if fouten or (strikt and waarschuwingen):
        sys.exit(1)


if __name__ == "__main__":
    main()
