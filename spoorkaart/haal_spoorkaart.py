#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Haalt de spoorgeometrie op uit de NS Spoorkaart-API en schrijft die compact
naar spoorkaart.json. De webapp tekent daarmee de kaartweergave; zolang dit
bestand ontbreekt valt de app terug op rechte lijnen tussen de stations van
trajecten.json.

Gebruik:
  NS_API_KEY=<sleutel> python3 spoorkaart/haal_spoorkaart.py
  python3 spoorkaart/haal_spoorkaart.py --zelftest

Vereist een abonnement op het product "Spoorkaart-API" op https://apiportal.ns.nl
(zelfde sleutel als de werkzaamheden). Zonder abonnement geeft de API 401/403;
de workflow meldt dat dan netjes en slaat de run over.
"""
import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
UIT = ROOT / "spoorkaart.json"
API = "https://gateway.apiportal.ns.nl/Spoorkaart-API/api/v1/spoorkaart"


def compacteer(geojson):
    """GeoJSON -> [[ [lon,lat], ... ], ...]: alleen de lijnen, coördinaten
    afgerond op 5 decimalen (±1 m), opeenvolgende duplicaten weg."""
    lijnen = []
    for feature in geojson.get("features") or []:
        geom = feature.get("geometry") or {}
        if geom.get("type") == "LineString":
            reeksen = [geom.get("coordinates") or []]
        elif geom.get("type") == "MultiLineString":
            reeksen = geom.get("coordinates") or []
        else:
            continue
        for reeks in reeksen:
            lijn = []
            for punt in reeks:
                try:
                    p = [round(float(punt[0]), 5), round(float(punt[1]), 5)]
                except (TypeError, ValueError, IndexError):
                    continue
                if not lijn or lijn[-1] != p:
                    lijn.append(p)
            if len(lijn) >= 2:
                lijnen.append(lijn)
    return lijnen


ZELFTEST = {"features": [
    {"geometry": {"type": "LineString", "coordinates":
        [[5.123456789, 52.1], [5.123456789, 52.1], [5.2, 52.2]]}},
    {"geometry": {"type": "MultiLineString", "coordinates":
        [[[6.0, 52.0], [6.1, 52.05]], [[6.1, 52.05], [6.2, 52.1]]]}},
    {"geometry": {"type": "Point", "coordinates": [5.0, 52.0]}},
    {"geometry": None}
]}


def main():
    if "--zelftest" in sys.argv:
        lijnen = compacteer(ZELFTEST)
        assert len(lijnen) == 3, lijnen
        assert lijnen[0] == [[5.12346, 52.1], [5.2, 52.2]], lijnen[0]
        print("zelftest geslaagd")
        return

    sleutel = os.environ.get("NS_API_KEY", "").strip()
    if not sleutel:
        print("NS_API_KEY ontbreekt; er wordt niets opgehaald.", file=sys.stderr)
        sys.exit(1)

    req = urllib.request.Request(API, headers={
        "Ocp-Apim-Subscription-Key": sleutel,
        "Accept": "application/json"
    })
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.load(resp)
    except urllib.error.HTTPError as e:
        if e.code in (401, 403):
            print(f"::warning::Spoorkaart-API gaf {e.code} — is het product "
                  "'Spoorkaart-API' aan de sleutel gekoppeld op apiportal.ns.nl?")
            sys.exit(0)  # geen abonnement is geen fout; de app heeft een fallback
        raise

    # Het antwoord is GeoJSON, of een envelop met daarin de FeatureCollection
    geojson = data if "features" in data else (data.get("payload") or {})
    lijnen = compacteer(geojson)
    if len(lijnen) < 50:
        print(f"::warning::onverwacht weinig lijnen ({len(lijnen)}); "
              "spoorkaart.json wordt niet overschreven.")
        sys.exit(0)

    uit = {
        "_comment": "Automatisch gegenereerd door spoorkaart/haal_spoorkaart.py (NS Spoorkaart-API). Niet met de hand bewerken.",
        "bron": "NS Spoorkaart-API",
        "opgehaald": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "lijnen": lijnen
    }
    with open(UIT, "w", encoding="utf-8") as f:
        json.dump(uit, f, ensure_ascii=False, separators=(",", ":"))
        f.write("\n")
    print(f"{len(lijnen)} lijnen geschreven naar {UIT.name}")


if __name__ == "__main__":
    main()
