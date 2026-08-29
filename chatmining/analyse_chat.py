#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Chatmining: leidt uit een WhatsApp-groepsexport (_chat.txt) kandidaat-updates
af voor de SpotConverter-datasets. De export zelf en persoonsgegevens komen
nooit in de output; alles is geaggregeerd.

Output (in chatmining/out/, staat in .gitignore):
  - report.txt                     leesbaar overzicht van alle statistieken
  - heatmap_treinpassages.json     passages per station/dag/uur (drop-in vervanger)
  - goederenpaden_suggestie.csv    gedetecteerde padminuten per station/richting
  - patronen_stats.json            dag- en uurverdeling per herkend systeem

Gebruik: python3 chatmining/analyse_chat.py /pad/naar/_chat.txt
Daarna:  diff beoordelen, gewenste bestanden overnemen, npm test draaien.
"""
import csv
import json
import re
import statistics
import sys
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(__file__).resolve().parent / "out"

DAGEN = ["maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag", "zondag"]

# Corridorstations waarvoor padminuten en heatmap worden afgeleid
CORRIDOR = ["AMF", "STO", "APD", "TWL", "DV", "DVGE", "RSN", "WDN", "AML",
            "HGL", "ODZ", "BH", "BRN", "HVS", "ASDM", "WP", "NDB", "BN", "HON", "DVC"]

# Bekende systemen: naam -> zoektermen (kleine letters)
SYSTEMEN = {
    "katy": ["katy", "kąty"], "rzepin": ["rzepin"], "pcc": ["pcc"],
    "volvo": ["volvo"], "poznan": ["poznan", "poznań"], "lovosice": ["lovosice"],
    "brwinow": ["brwinow", "brwinów"], "praag": ["praag", "praha"],
    "pon": [" pon "], "uc-onnen": ["onnen"], "graan": ["graan"],
}

MSG_RE = re.compile(r"^\[(\d{2}-\d{2}-\d{4}), (\d{2}:\d{2}:\d{2})\] ([^:]+): (.*)$")
TIME_RE = re.compile(r"\b([01]?[0-9]|2[0-3])[:.;hu]([0-5][0-9])\b")
TOKEN_RE = re.compile(r"[A-Za-zÀ-ÿ]+")
LOC_RE = re.compile(r"\b(6193|7193|6186|383|386|185|186|187|189|192|193|194|248|159|182|1[678][0-9]{2}|6[45][0-9]{2})[ \-.]?([0-9]{3})\b")
RI_RE = re.compile(r"\b(?:ri|ric|richting)\.?\s+([A-Za-zÀ-ÿ]{2,12})", re.I)

ALIAS = {"RHEINE": "RHEINE", "SALZBERGEN": "SBG", "HENGELO": "HGL", "ALMELO": "AML",
         "DEVENTER": "DV", "APELDOORN": "APD", "AMERSFOORT": "AMF", "ZUTPHEN": "ZP",
         "AMFGE": "AMFGA", "AMFPON": "AMF", "KFHZ": "KFH", "ODZG": "ODZ"}

SKIP_TOKENS = {"RI", "RIC", "EV", "LTE", "RTB", "RTBC", "UC", "RES", "EN", "OP",
               "NA", "WAS", "ALS", "AF", "DE", "MET", "VAN", "HET", "EEN"}


def lees_stations():
    codes = {}
    with open(ROOT / "stations.csv", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            code = row["code"].strip().upper()
            if code:
                codes[code] = row["name_medium"]
    return codes


def lees_coords():
    pad = ROOT / "afstanden_check" / "out_osm" / "osm_stations_coords.json"
    with open(pad, encoding="utf-8") as f:
        return json.load(f)


# 'ri Bad Bentheim' / 'ri NL' vanuit Duitsland: doel dat niet als code herleidbaar is
RICHTING_ALIAS = dict(ALIAS, **{"BAD": "BH", "BENTHEIM": "BH", "NL": "BH",
                                "RHEINE": "RHEINE", "SALZBERGEN": "SBG"})


def richting(text, spot, codes, coords):
    """OOST/WEST op basis van de lengtegraad van het ri-doel t.o.v. het spotstation."""
    m = RI_RE.search(text)
    if not m:
        return None
    doel = m.group(1).upper()
    doel = RICHTING_ALIAS.get(doel, doel)
    if doel not in codes:
        return None
    lon_spot = coords.get(spot, {}).get("lon")
    lon_doel = coords.get(doel, {}).get("lon")
    if lon_spot is None or lon_doel is None or doel == spot:
        return None
    return "OOST" if float(lon_doel) > float(lon_spot) else "WEST"


def lees_chat(pad):
    """Berichten inlezen; systeem- en verwijderberichten worden overgeslagen."""
    msgs, cur = [], None
    with open(pad, encoding="utf-8") as f:
        for line in f:
            line = line.rstrip("\r\n").replace("‎", "").replace(" ", " ")
            m = MSG_RE.match(line)
            if m:
                if cur:
                    msgs.append(cur)
                d, t, _sender, text = m.groups()
                cur = {"dt": datetime.strptime(f"{d} {t}", "%d-%m-%Y %H:%M:%S"), "text": text}
            elif cur:
                cur["text"] += " " + line.strip()
    if cur:
        msgs.append(cur)

    def systeembericht(t):
        tl = t.lower()
        return ("bericht is verwijderd" in tl or "toegevoegd" in tl or "weggegaan" in tl
                or "beveiligingscode" in tl or tl.strip() == "afbeelding weggelaten")

    return [m for m in msgs if not systeembericht(m["text"]) and len(m["text"]) > 3]


def vind_station(text, codes):
    for tok in TOKEN_RE.findall(text)[:8]:
        tu = tok.upper()
        if tu in SKIP_TOKENS:
            continue
        if tu in ALIAS:
            return ALIAS[tu]
        if tu in codes and len(tu) >= 2:
            return tu
    return None


def spot_tijd(m):
    """Tijd uit het bericht zelf; terugvallen op de verzendtijd."""
    tm = TIME_RE.search(m["text"])
    if not tm:
        return m["dt"]
    dt = m["dt"].replace(hour=int(tm.group(1)), minute=int(tm.group(2)), second=0)
    # Spottijd hoort vóór (of vlak na) de verzendtijd te liggen; anders ruis
    if dt > m["dt"] + timedelta(minutes=10) or m["dt"] - dt > timedelta(hours=3):
        return m["dt"]
    return dt


def clusters(hist, minimum):
    """Vat een minuut-histogram samen tot padminuten: pieken >= minimum,
    aangrenzende minuten (jitter) samengevoegd op de zwaarste minuut."""
    pieken = sorted(mi for mi, n in hist.items() if n >= minimum)
    resultaat = []
    for mi in pieken:
        if resultaat and (mi - resultaat[-1]) <= 2:
            if hist[mi] > hist[resultaat[-1]]:
                resultaat[-1] = mi
            continue
        resultaat.append(mi)
    return resultaat


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    chatpad = sys.argv[1]
    codes = lees_stations()
    coords = lees_coords()
    msgs = lees_chat(chatpad)
    OUT.mkdir(exist_ok=True)

    heatmap = defaultdict(lambda: defaultdict(Counter))       # station -> dag -> uur
    minuten = defaultdict(lambda: {"OOST": Counter(), "WEST": Counter()})
    sys_dagen = defaultdict(Counter)
    sys_uren = defaultdict(Counter)
    sys_richting = defaultdict(Counter)
    obs = defaultdict(list)                                    # (datum, loc) -> [(tijd, station)]

    for m in msgs:
        st = vind_station(m["text"], codes)
        if not st:
            continue
        t = spot_tijd(m)
        dag = DAGEN[t.weekday()]
        if st in CORRIDOR:
            heatmap[st][dag][t.hour] += 1

        kant = richting(m["text"], st, codes, coords)
        tm = TIME_RE.search(m["text"])
        if tm and st in CORRIDOR and kant:
            minuten[st][kant][int(tm.group(2))] += 1

        tl = " " + m["text"].lower() + " "
        for naam, termen in SYSTEMEN.items():
            if any(term in tl for term in termen):
                sys_dagen[naam][dag] += 1
                sys_uren[naam][t.hour] += 1
                if kant:
                    sys_richting[naam][kant.lower()] += 1

        lm = LOC_RE.search(m["text"])
        if lm:
            obs[(t.date(), lm.group(1) + lm.group(2))].append((t, st))

    # Kettinganalyse: rijtijden per baanvak
    paren = defaultdict(list)
    for lst in obs.values():
        lst = sorted(set(lst))
        for (t1, s1), (t2, s2) in zip(lst, lst[1:]):
            d = (t2 - t1).total_seconds() / 60
            if s1 != s2 and 1 <= d <= 100:
                paren[(s1, s2)].append(d)

    # --- heatmap_treinpassages.json ---
    heatmap_uit = {}
    for st in sorted(heatmap, key=lambda s: -sum(sum(d.values()) for d in heatmap[s].values())):
        heatmap_uit[st] = {dag: {str(u): heatmap[st][dag].get(u, 0) for u in range(24)}
                           for dag in DAGEN}
    with open(OUT / "heatmap_treinpassages.json", "w", encoding="utf-8") as f:
        json.dump(heatmap_uit, f, ensure_ascii=False, indent=1)

    # --- goederenpaden_suggestie.csv ---
    with open(OUT / "goederenpaden_suggestie.csv", "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f, quoting=csv.QUOTE_ALL)
        w.writerow(["stationscode", "rijrichting", "pad_minuten", "waarnemingen"])
        for st in CORRIDOR:
            for kant in ("OOST", "WEST"):
                hist = minuten[st][kant]
                n = sum(hist.values())
                if n < 40:
                    continue
                drempel = max(8, 0.6 * max(hist.values()))
                pad = clusters(hist, drempel)
                if pad:
                    w.writerow([st, kant, ";".join(f"{mi:02d}" for mi in pad), n])

    # --- patronen_stats.json ---
    patronen = {}
    for naam in SYSTEMEN:
        totaal = sum(sys_dagen[naam].values())
        if not totaal:
            continue
        patronen[naam] = {
            "waarnemingen": totaal,
            "dagen": {d: sys_dagen[naam].get(d, 0) for d in DAGEN},
            "uren": {str(u): sys_uren[naam].get(u, 0) for u in range(24)},
            "richting": dict(sys_richting[naam]),
        }
    with open(OUT / "patronen_stats.json", "w", encoding="utf-8") as f:
        json.dump(patronen, f, ensure_ascii=False, indent=1)

    # --- report.txt ---
    with open(OUT / "report.txt", "w", encoding="utf-8") as f:
        f.write(f"Chatmining-rapport — {len(msgs)} bruikbare berichten\n")
        f.write(f"Periode: {msgs[0]['dt']:%d-%m-%Y} t/m {msgs[-1]['dt']:%d-%m-%Y}\n\n")
        f.write("Baanvak-rijtijden (mediaan, minuten, >= 8 waarnemingen):\n")
        for (s1, s2), ds in sorted(paren.items(), key=lambda kv: -len(kv[1])):
            if len(ds) >= 8:
                f.write(f"  {s1:6s} -> {s2:6s} n={len(ds):3d} mediaan={statistics.median(ds):5.1f} min\n")
        f.write("\nPadminuten per station (OOST | WEST, top-6 minuten):\n")
        for st in CORRIDOR:
            o, wst = minuten[st]["OOST"], minuten[st]["WEST"]
            if sum(o.values()) + sum(wst.values()) < 40:
                continue
            f.write(f"  {st:5s} O({sum(o.values()):4d}): {o.most_common(6)}\n")
            f.write(f"  {'':5s} W({sum(wst.values()):4d}): {wst.most_common(6)}\n")
        f.write("\nSystemen (dagverdeling ma..zo):\n")
        for naam, p in sorted(patronen.items(), key=lambda kv: -kv[1]["waarnemingen"]):
            dagen = " ".join(f"{p['dagen'][d]:4d}" for d in DAGEN)
            f.write(f"  {naam:10s} n={p['waarnemingen']:5d}  {dagen}\n")

    print(f"Klaar. Output in {OUT}/ — beoordeel de diff voordat je iets overneemt.")


if __name__ == "__main__":
    main()
