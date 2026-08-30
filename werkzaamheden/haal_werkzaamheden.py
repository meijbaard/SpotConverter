#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Haalt geplande werkzaamheden op uit de NS-opendata (reisinformatie-api,
endpoint /disruptions, type MAINTENANCE) en schrijft ze compact naar
werkzaamheden.json in de repo-root. De webapp waarschuwt daarmee wanneer een
berekende route door een werkgebied loopt en het standaardtraject dus
onwaarschijnlijk is.

Gebruik:
  NS_API_KEY=<sleutel> python3 werkzaamheden/haal_werkzaamheden.py
  python3 werkzaamheden/haal_werkzaamheden.py --zelftest   # parser testen zonder API

De sleutel is gratis aan te maken op https://apiportal.ns.nl (product
"Reisinformatie API"). In CI staat hij als GitHub-secret NS_API_KEY; hij komt
nooit in de repo of in de webapp terecht.
"""
import json
import os
import sys
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
UIT = ROOT / "werkzaamheden.json"
API = "https://gateway.apiportal.ns.nl/reisinformatie-api/api/v3/disruptions?type=MAINTENANCE"
MAX_DAGEN_VOORUIT = 21  # werkzaamheden verder weg zijn voor spotters nog niet relevant


def bekende_stations():
    import csv
    codes = set()
    with open(ROOT / "stations.csv", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            code = (row.get("code") or "").strip().upper()
            if code:
                codes.add(code)
    return codes


import re


def iso_norm(s):
    """NS levert offsets zonder dubbele punt (+0200); Safari's Date-parser
    vereist +02:00, dus normaliseren voordat het in de JSON komt."""
    if not s:
        return s
    return re.sub(r"([+-]\d{2})(\d{2})$", r"\1:\2", s)


def parse_disruptions(data, codes, nu=None):
    """Zet het NS-antwoord om naar compacte entries. Defensief: velden die
    ontbreken of van vorm veranderen leiden hooguit tot een overgeslagen entry."""
    nu = nu or datetime.now(timezone.utc)
    horizon = nu + timedelta(days=MAX_DAGEN_VOORUIT)
    entries = []
    for d in data if isinstance(data, list) else []:
        try:
            if str(d.get("type", "")).upper() not in ("MAINTENANCE", "DISRUPTION"):
                continue
            titel = d.get("title") or "Werkzaamheden"
            start = d.get("start")
            eind = d.get("end")

            stations = set()
            gevolgen = []
            for sectie in d.get("publicationSections") or []:
                for st in (sectie.get("section") or {}).get("stations") or []:
                    code = (st.get("stationCode") or "").strip().upper()
                    if code in codes:
                        stations.add(code)
                gevolg = (sectie.get("consequence") or {}).get("description")
                if gevolg and gevolg not in gevolgen:
                    gevolgen.append(gevolg)

            # Tijdvensters: neem het vroegste begin en laatste einde mee
            for ts in d.get("timespans") or []:
                if ts.get("start") and (not start or ts["start"] < start):
                    start = ts["start"]
                if ts.get("end") and (not eind or ts["end"] > eind):
                    eind = ts["end"]

            if not stations or not start:
                continue
            # 'Aangepaste internationale dienstregeling' beschrijft de omweg
            # van een reizigersdienst (bijv. IC Berlijn), niet gestremde
            # infrastructuur — dat zou elke route langs die dienst onterecht
            # laten waarschuwen
            gevolg = gevolgen[0] if gevolgen else None
            if gevolg and "internationale dienstregeling" in gevolg.lower():
                continue
            begin_dt = datetime.fromisoformat(start)
            eind_dt = datetime.fromisoformat(eind) if eind else None
            if begin_dt > horizon:
                continue
            if eind_dt and eind_dt < nu:
                continue

            entries.append({
                "id": d.get("id"),
                "type": str(d.get("type", "MAINTENANCE")).upper(),
                "titel": titel,
                "van": iso_norm(start),
                "tot": iso_norm(eind),
                "stations": sorted(stations),
                "gevolg": gevolg
            })
        except Exception as e:  # één rare entry mag de rest niet blokkeren
            print(f"waarschuwing: entry overgeslagen ({e})", file=sys.stderr)
    entries.sort(key=lambda w: w["van"])
    return entries


ZELFTEST_DATA = [
    {
        "id": "test-weesp", "type": "MAINTENANCE",
        "title": "Amsterdam Muiderpoort - Weesp - Hilversum",
        "start": "2026-08-29T01:00:00+0200", "end": "2026-08-31T05:00:00+0200",
        "publicationSections": [{
            "section": {"stations": [
                {"stationCode": "ASDM", "name": "Amsterdam Muiderpoort"},
                {"stationCode": "WP", "name": "Weesp"},
                {"stationCode": "HVS", "name": "Hilversum"},
                {"stationCode": "XXNEP", "name": "Bestaat niet"}
            ]},
            "consequence": {"description": "geen treinverkeer mogelijk"}
        }],
        "timespans": []
    },
    {"id": "kapot", "type": "MAINTENANCE"},  # ontbrekende velden -> overslaan
    {"id": "verleden", "type": "MAINTENANCE", "title": "Oud",
     "start": "2020-01-01T00:00:00+01:00", "end": "2020-01-02T00:00:00+01:00",
     "publicationSections": [{"section": {"stations": [{"stationCode": "WP"}]}}]},
    {"id": "int", "type": "MAINTENANCE", "title": "Amsterdam - Hannover - Berlin.",
     "start": "2026-08-29T04:00:00+0200", "end": "2026-08-30T20:01:00+0200",
     "publicationSections": [{
         "section": {"stations": [{"stationCode": "BH"}, {"stationCode": "HGL"}]},
         "consequence": {"description": "aangepaste internationale dienstregeling"}}]}
]


def main():
    codes = bekende_stations()

    if "--zelftest" in sys.argv:
        nu = datetime.fromisoformat("2026-08-30T12:00:00+02:00")
        entries = parse_disruptions(ZELFTEST_DATA, codes, nu=nu)
        assert len(entries) == 1, f"verwacht 1 entry, kreeg {len(entries)}"
        assert entries[0]["stations"] == ["ASDM", "HVS", "WP"], entries[0]["stations"]
        assert entries[0]["gevolg"] == "geen treinverkeer mogelijk"
        assert entries[0]["van"].endswith("+02:00"), entries[0]["van"]
        assert entries[0]["tot"].endswith("+02:00"), entries[0]["tot"]
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
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.load(resp)

    entries = parse_disruptions(data, codes)

    # Alleen schrijven bij inhoudelijke wijziging, anders commit en redeployt
    # de workflow bij elke run zonder dat er iets veranderd is
    if UIT.exists():
        try:
            with open(UIT, encoding="utf-8") as f:
                if json.load(f).get("werkzaamheden") == entries:
                    print("geen wijzigingen")
                    return
        except Exception:
            pass

    uit = {
        "_comment": "Automatisch gegenereerd door werkzaamheden/haal_werkzaamheden.py (GitHub Action, NS-opendata). Niet met de hand bewerken.",
        "bron": "NS Reisinformatie API (disruptions, type MAINTENANCE)",
        "opgehaald": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "werkzaamheden": entries
    }
    with open(UIT, "w", encoding="utf-8") as f:
        json.dump(uit, f, ensure_ascii=False, indent=1)
        f.write("\n")
    print(f"{len(entries)} werkzaamheden geschreven naar {UIT.name}")


if __name__ == "__main__":
    main()
