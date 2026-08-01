#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Genereer/actualiseer afstanden.csv op basis van trajecten.json en de
OSM-coördinaten uit out_osm/osm_stations_coords.json.

Werkwijze:
  - De converter gebruikt alleen afstanden tussen OPEENVOLGENDE stations op
    een traject. Dit script loopt alle trajecten langs en vult voor elk
    opeenvolgend paar de afstand in.
  - Bestaande waarden (> 0) in afstanden.csv worden NOOIT overschreven:
    die zijn handmatig geverifieerd. Alleen ontbrekende paren worden
    berekend als hemelsbrede afstand x 1,2 (spoorfactor), afgerond op
    hele kilometers (minimaal 1).
  - Coördinaten komen uit twee bronnen: out_osm/osm_stations_coords.json
    (van osm_station_check.py) en de handmatig aangevulde
    out_osm/osm_stations_not_found_withlatlon.csv (die wint bij overlap).
    Het samengevoegde resultaat wordt teruggeschreven naar de JSON, want
    de webapp leest alleen dat bestand.
  - Stations zonder coördinaten worden gerapporteerd; draai daarvoor
    osm_station_check.py of vul ze aan in de handmatige CSV.

Gebruik (vanuit de repo-root of vanuit afstanden_check/):
  python3 afstanden_check/genereer_afstanden.py
  python3 afstanden_check/genereer_afstanden.py --dry-run

Geen netwerktoegang nodig; alles komt uit lokale bestanden.
"""

import argparse
import csv
import json
import math
import os
import sys

SPOORFACTOR = 1.2  # hemelsbreed -> praktische spoorafstand


def haversine_km(a, b):
    lat1, lon1, lat2, lon2 = map(math.radians, [a["lat"], a["lon"], b["lat"], b["lon"]])
    dlat, dlon = lat2 - lat1, lon2 - lon1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 6371.0 * 2 * math.asin(math.sqrt(h))


def lees_matrix(pad):
    """Lees afstanden.csv als {van: {naar: km}} plus de kolomvolgorde."""
    matrix = {}
    if not os.path.exists(pad):
        return matrix, []
    with open(pad, encoding="utf-8") as f:
        rows = list(csv.reader(f))
    header = [h.strip().upper() for h in rows[0][1:]]
    for row in rows[1:]:
        code = row[0].strip().upper()
        matrix[code] = {}
        for i, kolom in enumerate(header):
            try:
                matrix[code][kolom] = int(row[i + 1])
            except (ValueError, IndexError):
                matrix[code][kolom] = 0
    return matrix, header


def main():
    ap = argparse.ArgumentParser(description="Genereer afstanden.csv uit trajecten.json + OSM-coördinaten.")
    basis = os.path.dirname(os.path.abspath(__file__))
    root = os.path.dirname(basis)
    ap.add_argument("--trajecten", default=os.path.join(root, "trajecten.json"))
    ap.add_argument("--coords", default=os.path.join(basis, "out_osm", "osm_stations_coords.json"))
    ap.add_argument("--handmatig", default=os.path.join(basis, "out_osm", "osm_stations_not_found_withlatlon.csv"),
                    help="CSV met handmatig aangevulde coördinaten (code,...,lat,lon)")
    ap.add_argument("--afstanden", default=os.path.join(root, "afstanden.csv"))
    ap.add_argument("--dry-run", action="store_true", help="Toon wat er zou veranderen zonder te schrijven")
    args = ap.parse_args()

    with open(args.trajecten, encoding="utf-8") as f:
        trajecten = json.load(f)
    with open(args.coords, encoding="utf-8") as f:
        coords = json.load(f)

    # Handmatige coördinaten er overheen leggen (die zijn gecureerd en winnen)
    handmatig = 0
    if os.path.exists(args.handmatig):
        with open(args.handmatig, encoding="utf-8") as f:
            for rij in csv.DictReader(f):
                try:
                    coords[rij["code"].strip()] = {"lat": float(rij["lat"]), "lon": float(rij["lon"])}
                    handmatig += 1
                except (KeyError, TypeError, ValueError):
                    continue

    oud, oude_header = lees_matrix(args.afstanden)

    # Alle stations: bestaande matrix + alles wat op een traject ligt
    traject_codes = {code for route in trajecten.values() for code in route}
    stations = sorted(set(oude_header) | traject_codes)

    # Opeenvolgende paren per traject
    paren = set()
    for route in trajecten.values():
        for a, b in zip(route, route[1:]):
            paren.add((a, b))

    nieuw, zonder_coords, al_bekend = [], set(), 0
    matrix = {a: dict(oud.get(a, {})) for a in stations}

    for a, b in sorted(paren):
        bestaand = oud.get(a, {}).get(b, 0) or oud.get(b, {}).get(a, 0)
        if bestaand:
            # Symmetrie garanderen voor handmatig ingevulde waarden
            matrix[a][b] = matrix[b][a] = bestaand
            al_bekend += 1
            continue
        if a not in coords or b not in coords:
            zonder_coords.update(c for c in (a, b) if c not in coords)
            continue
        km = max(1, round(haversine_km(coords[a], coords[b]) * SPOORFACTOR))
        matrix[a][b] = matrix[b][a] = km
        nieuw.append((a, b, km))

    print(f"Handmatige coördinaten:  {handmatig} (uit {os.path.basename(args.handmatig)})")
    print(f"Trajectparen totaal:     {len(paren)}")
    print(f"Al ingevuld (behouden):  {al_bekend}")
    print(f"Nieuw berekend:          {len(nieuw)}")
    for a, b, km in nieuw:
        print(f"  {a} - {b}: {km} km")
    if zonder_coords:
        print(f"Zonder coördinaten ({len(zonder_coords)}): {', '.join(sorted(zonder_coords))}")
        print("  -> draai osm_station_check.py of vul ze handmatig aan in de coördinaten-JSON.")
    niet_op_traject = sorted(set(oude_header) - traject_codes)
    if niet_op_traject:
        print(f"In matrix maar op geen traject ({len(niet_op_traject)}): {', '.join(niet_op_traject)}")

    if args.dry_run:
        print("\nDry-run: er is niets weggeschreven.")
        return

    with open(args.afstanden, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["Stations"] + stations)
        for a in stations:
            w.writerow([a] + [matrix.get(a, {}).get(b, 0) for b in stations])
    print(f"\nGeschreven: {args.afstanden} ({len(stations)} x {len(stations)})")

    # Samengevoegde coördinaten terugschrijven zodat de webapp ze ook heeft
    with open(args.coords, "w", encoding="utf-8") as f:
        json.dump(coords, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"Geschreven: {args.coords} ({len(coords)} stations)")


if __name__ == "__main__":
    main()
