#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Valideert trajecten.json tegen de echte spoorgeometrie (spoorkaart.json,
NS Spoorkaart-API). Drie checks per traject:

  1. Ligt elk station op of naast het spoor? (coördinatenfouten zoals de
     eerdere Stroe-dwalingen vallen hier direct doorheen)
  2. Ligt er spoor tussen elk opeenvolgend stationspaar? (het middelpunt van
     de rechte lijn moet in de buurt van spoor liggen)
  3. Klopt de geregistreerde afstand met de hemelsbrede afstand? (een grote
     verhouding wijst op een omweg of een verkeerde stationsvolgorde)

De spoorkaart is gegeneraliseerd; de toleranties zijn daarop afgestemd.
Duitse stations (lon > 6.95) worden overgeslagen — de kaart dekt Nederland.

Gebruik: python3 afstanden_check/valideer_trajecten_geometrie.py [--strikt]
"""
import csv
import json
import math
import os
import sys

BASIS = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(BASIS)

STATION_TOLERANTIE_KM = 1.0   # station tot dichtstbijzijnd spoor
TUSSEN_TOLERANTIE_KM = 2.0    # middelpunt van een paar tot spoor
RATIO_MAX = 2.0               # geregistreerde km / hemelsbreed
LON_MAX = 6.95                # oostgrens van de NL-spoorkaart


def km_afstand(lat1, lon1, lat2, lon2):
    kx = math.cos(math.radians((lat1 + lat2) / 2)) * 111.32
    return math.hypot((lon1 - lon2) * kx, (lat1 - lat2) * 110.6)


class SpoorIndex:
    """Grid-index over de lijnsegmenten voor snelle dichtstbijzijnd-spoor-vragen."""

    CEL = 0.05  # graden

    def __init__(self, lijnen):
        self.grid = {}
        for lijn in lijnen:
            for (x1, y1), (x2, y2) in zip(lijn, lijn[1:]):
                seg = (x1, y1, x2, y2)
                for cx in range(int(min(x1, x2) / self.CEL) - 1, int(max(x1, x2) / self.CEL) + 2):
                    for cy in range(int(min(y1, y2) / self.CEL) - 1, int(max(y1, y2) / self.CEL) + 2):
                        self.grid.setdefault((cx, cy), []).append(seg)

    def afstand_tot_spoor(self, lat, lon):
        beste = float('inf')
        cx, cy = int(lon / self.CEL), int(lat / self.CEL)
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for x1, y1, x2, y2 in self.grid.get((cx + dx, cy + dy), ()):
                    dxs, dys = x2 - x1, y2 - y1
                    noemer = dxs * dxs + dys * dys
                    t = 0 if noemer == 0 else max(0, min(1, ((lon - x1) * dxs + (lat - y1) * dys) / noemer))
                    beste = min(beste, km_afstand(lat, lon, y1 + t * dys, x1 + t * dxs))
        return beste


def main():
    strikt = '--strikt' in sys.argv

    try:
        with open(os.path.join(ROOT, 'spoorkaart.json'), encoding='utf-8') as f:
            spoorkaart = json.load(f)
    except FileNotFoundError:
        print('spoorkaart.json ontbreekt; geometrie-validatie overgeslagen.')
        return
    index = SpoorIndex(spoorkaart['lijnen'])

    with open(os.path.join(ROOT, 'afstanden_check', 'out_osm', 'osm_stations_coords.json'), encoding='utf-8') as f:
        coords = json.load(f)
    with open(os.path.join(ROOT, 'trajecten.json'), encoding='utf-8') as f:
        trajecten = json.load(f)

    afstanden = {}
    with open(os.path.join(ROOT, 'afstanden.csv'), encoding='utf-8') as f:
        rijen = list(csv.reader(f))
        kolommen = [k.strip().upper() for k in rijen[0]]
        for rij in rijen[1:]:
            van = rij[0].strip().upper()
            for i, waarde in enumerate(rij[1:], 1):
                if waarde.strip():
                    afstanden[(van, kolommen[i])] = float(waarde)

    waarschuwingen = []
    for naam, route in trajecten.items():
        punten = []
        for code in route:
            c = coords.get(code)
            if not c or float(c['lon']) > LON_MAX:
                punten.append((code, None, None))
                continue
            punten.append((code, float(c['lat']), float(c['lon'])))

        # 1. station op spoor
        for code, lat, lon in punten:
            if lat is None:
                continue
            d = index.afstand_tot_spoor(lat, lon)
            if d > STATION_TOLERANTIE_KM:
                waarschuwingen.append(f"{naam}: {code} ligt {d:.1f} km van het dichtstbijzijnde spoor")

        # 2 & 3. per opeenvolgend paar; drie steekproefpunten zodat een bocht
        # in het baanvak geen vals alarm geeft
        for (c1, lat1, lon1), (c2, lat2, lon2) in zip(punten, punten[1:]):
            if lat1 is None or lat2 is None:
                continue
            hemelsbreed = km_afstand(lat1, lon1, lat2, lon2)
            tussen = min(
                index.afstand_tot_spoor(lat1 + f * (lat2 - lat1), lon1 + f * (lon2 - lon1))
                for f in (0.25, 0.5, 0.75))
            if hemelsbreed > 3 and tussen > TUSSEN_TOLERANTIE_KM:
                waarschuwingen.append(
                    f"{naam}: tussen {c1} en {c2} ligt geen spoor langs de lijn ({tussen:.1f} km)")
            km = afstanden.get((c1, c2)) or afstanden.get((c2, c1))
            if km and hemelsbreed > 2 and km / hemelsbreed > RATIO_MAX:
                waarschuwingen.append(
                    f"{naam}: afstand {c1}-{c2} is {km:.0f} km maar hemelsbreed {hemelsbreed:.1f} km "
                    f"(x{km / hemelsbreed:.1f}) — omweg of verkeerde volgorde?")

    if waarschuwingen:
        print(f"{len(waarschuwingen)} bevindingen:")
        for w in waarschuwingen:
            print(f"  - {w}")
    else:
        print("Geen bevindingen: alle trajecten sporen met de spoorkaart.")
    if strikt and waarschuwingen:
        sys.exit(1)


if __name__ == '__main__':
    main()
