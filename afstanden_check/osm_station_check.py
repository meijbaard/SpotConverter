# osm_station_check.py
#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Zoek stations uit trajecten.json op in OpenStreetMap (Nominatim),
gebruik makend van stations.csv (code -> naam). Schrijft FOUND/NOT_FOUND
resultaten weg en ondersteunt resume/checkpoint.

Voorbeeld:
  python3 osm_station_check.py \
    --trajecten https://raw.githubusercontent.com/meijbaard/SpotConverter/refs/heads/main/trajecten.json \
    --stations stations.csv \
    --out out_osm \
    --sleep 0.8 \
    --resume

Vereist:
  - Python 3.8+
  - pip install pandas requests tqdm
"""

import argparse
import json
import os
import sys
import time
from typing import Optional, Tuple, Dict, Any, Iterable

import pandas as pd
import requests
from tqdm import tqdm

# === USER AGENT (Nominatim policy): zonder e-mail, met duidelijke projectverwijzing ===
USER_AGENT = "Spotconverter/1.0 (+https://github.com/meijbaard/SpotConverter)"

# ----------------------------- Helpers -----------------------------

def read_trajecten(src: str) -> Dict[str, list]:
    """Lees trajecten.json vanaf URL of lokaal pad."""
    if src.startswith("http://") or src.startswith("https://"):
        r = requests.get(src, timeout=30, headers={"User-Agent": USER_AGENT})
        r.raise_for_status()
        return r.json()
    with open(src, "r", encoding="utf-8") as f:
        return json.load(f)

def read_stations_csv(path: str) -> pd.DataFrame:
    """
    Lees stations.csv (comma-delimited).
    Verwacht minimaal kolom 'code'; optioneel: name_long, name_medium, name_short, country.
    """
    df = pd.read_csv(path, sep=",", encoding="utf-8")
    df.columns = [c.strip() for c in df.columns]
    if "code" not in df.columns:
        raise ValueError("stations.csv mist verplichte kolom 'code'")
    return df

def best_name(row: pd.Series) -> str:
    """
    Kies beste naamkolom voor OSM-zoekopdracht.
    Robuust als row[col] onverwacht een Series kan zijn.
    """
    def _first_nonempty(val):
        if isinstance(val, pd.Series):
            for v in val:
                if pd.notna(v) and str(v).strip():
                    return str(v).strip()
            return ""
        return str(val).strip() if pd.notna(val) and str(val).strip() else ""

    for col in ["name_long", "name_medium", "name_short"]:
        if col in row.index:
            v = _first_nonempty(row[col])
            if v:
                return v
    code_val = row.get("code")
    return str(code_val).strip() if pd.notna(code_val) else ""

def country_hint(row: pd.Series) -> Optional[str]:
    """
    Landhint uit stations.csv naar Nominatim-landnaam mappen.
    """
    def _pick(val):
        if isinstance(val, pd.Series):
            for v in val:
                s = str(v).strip().upper()
                if s:
                    return s
            return ""
        return str(val).strip().upper() if pd.notna(val) else ""

    if "country" in row.index:
        c = _pick(row["country"])
        mapping = {
            "NL": "Netherlands",
            "NLD": "Netherlands",
            "D": "Germany",
            "DE": "Germany",
            "GERMANY": "Germany",
            "BE": "Belgium",
            "BEL": "Belgium",
            "F": "France",
            "FR": "France",
        }
        return mapping.get(c, None)
    return None

def nominatim_query(q: str, country: Optional[str] = None, retries: int = 3, backoff: float = 2.0) -> Optional[Dict[str, Any]]:
    """Query Nominatim met simpele retry/backoff."""
    base = "https://nominatim.openstreetmap.org/search"
    headers = {"User-Agent": USER_AGENT}
    params = {"q": q, "format": "json", "limit": 1}
    if country:
        params["country"] = country

    for attempt in range(1, retries + 1):
        try:
            resp = requests.get(base, headers=headers, params=params, timeout=30)
            if resp.status_code == 429:
                time.sleep(backoff * attempt)
                continue
            resp.raise_for_status()
            data = resp.json()
            return data[0] if data else None
        except requests.RequestException:
            if attempt == retries:
                return None
            time.sleep(backoff * attempt)
    return None

def find_station_in_osm(name: str, country: Optional[str]) -> Optional[Tuple[float, float, Dict[str, Any]]]:
    """
    Probeer meerdere zoekstrings voor betere trefkans:
      1) '{name} station'  2) 'Station {name}'  3) '{name}'
    """
    candidates = [f"{name} station", f"Station {name}", name]
    for q in candidates:
        hit = nominatim_query(q, country=country)
        if hit and "lat" in hit and "lon" in hit:
            try:
                lat = float(hit["lat"])
                lon = float(hit["lon"])
                return lat, lon, hit
            except (TypeError, ValueError):
                continue
    return None

def unique_codes_from_trajecten(trajecten: Dict[str, Iterable[str]]) -> list:
    return sorted({s for route in trajecten.values() for s in route})

def init_found_df() -> pd.DataFrame:
    cols = ["code","name_query","country_hint","lat","lon","osm_id","osm_type",
            "display_name","class","type","status"]
    return pd.DataFrame(columns=cols)

def init_not_df() -> pd.DataFrame:
    cols = ["code","name_query","country_hint","status","reason"]
    return pd.DataFrame(columns=cols)

def load_existing_results(found_path: str, not_path: str):
    """Lees bestaande resultaten (voor resume)."""
    df_found = pd.read_csv(found_path, encoding="utf-8") if os.path.exists(found_path) else init_found_df()
    df_not   = pd.read_csv(not_path,   encoding="utf-8") if os.path.exists(not_path)   else init_not_df()
    # Zorg dat kolommen kloppen
    if list(df_found.columns) != list(init_found_df().columns):
        df_found = df_found.reindex(columns=init_found_df().columns)
    if list(df_not.columns) != list(init_not_df().columns):
        df_not = df_not.reindex(columns=init_not_df().columns)
    return df_found, df_not

def safe_append_row(df: pd.DataFrame, row_dict: Dict[str, Any]) -> pd.DataFrame:
    """Voeg één rij toe zonder concat (vermijdt FutureWarning)."""
    # Zorg dat alle kolommen aanwezig zijn; mis je er? zet ze op None
    for col in df.columns:
        if col not in row_dict:
            row_dict[col] = None
    df.loc[len(df)] = row_dict
    return df

def write_outputs(df_found: pd.DataFrame, df_not: pd.DataFrame, json_path: str, found_path: str, not_path: str):
    """Schrijf CSV + JSON (checkpoint)."""
    df_found.to_csv(found_path, index=False, encoding="utf-8")
    df_not.to_csv(not_path, index=False, encoding="utf-8")

    coords_map = {
        r["code"]: {"lat": float(r["lat"]), "lon": float(r["lon"])}
        for _, r in df_found.iterrows()
        if pd.notna(r.get("lat")) and pd.notna(r.get("lon"))
    }
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(coords_map, f, ensure_ascii=False, indent=2)

# ------------------------------- Main -------------------------------

def main():
    ap = argparse.ArgumentParser(description="Zoek stations uit trajecten.json op in OpenStreetMap (Nominatim).")
    ap.add_argument("--trajecten", required=True, help="URL of pad naar trajecten.json")
    ap.add_argument("--stations", required=True, help="Pad naar stations.csv (comma-separated)")
    ap.add_argument("--out", default="out_osm", help="Uitvoermap (default: out_osm)")
    ap.add_argument("--sleep", type=float, default=0.8, help="Wachttijd in seconden tussen requests (default: 0.8)")
    ap.add_argument("--resume", action="store_true", help="Hervat en sla reeds verwerkte stations over")
    args = ap.parse_args()

    os.makedirs(args.out, exist_ok=True)

    found_path = os.path.join(args.out, "osm_stations_found.csv")
    not_path   = os.path.join(args.out, "osm_stations_not_found.csv")
    json_path  = os.path.join(args.out, "osm_stations_coords.json")

    trajecten = read_trajecten(args.trajecten)
    df_st     = read_stations_csv(args.stations)

    print("=== Sanity check ===")
    print("stations.csv kolommen:", ", ".join(df_st.columns))
    codes = unique_codes_from_trajecten(trajecten)
    print("Unieke stationcodes uit trajecten.json:", len(codes))
    print("====================\n")

    df_idx = df_st.set_index("code", drop=False)

    df_found, df_not = load_existing_results(found_path, not_path)
    processed = set()
    if args.resume:
        processed.update(df_found["code"].dropna().astype(str).tolist())
        processed.update(df_not["code"].dropna().astype(str).tolist())
        if processed:
            print(f"Resume actief: sla {len(processed)} reeds verwerkte stations over.")

    to_process = [c for c in codes if c not in processed]
    print(f"Te zoeken stations (nu te doen): {len(to_process)}")

    for code in tqdm(to_process, desc="Zoeken in OSM"):
        if code not in df_idx.index:
            df_not = safe_append_row(df_not, {
                "code": code,
                "name_query": "",
                "country_hint": "",
                "status": "NOT_FOUND",
                "reason": "code not in stations.csv",
            })
            write_outputs(df_found, df_not, json_path, found_path, not_path)
            continue

        row = df_idx.loc[code]
        name = best_name(row)
        country = country_hint(row)

        hit = find_station_in_osm(name, country)
        time.sleep(args.sleep)
        if hit is None:
            hit = find_station_in_osm(name, None)
            time.sleep(args.sleep)

        if hit is None:
            df_not = safe_append_row(df_not, {
                "code": code,
                "name_query": name,
                "country_hint": country or "",
                "status": "NOT_FOUND",
                "reason": "",
            })
        else:
            lat, lon, meta = hit
            df_found = safe_append_row(df_found, {
                "code": code,
                "name_query": name,
                "country_hint": country or "",
                "lat": lat,
                "lon": lon,
                "osm_id": meta.get("osm_id", ""),
                "osm_type": meta.get("osm_type", ""),
                "display_name": meta.get("display_name", ""),
                "class": meta.get("class", ""),
                "type": meta.get("type", ""),
                "status": "FOUND",
            })

        # Checkpoint na elke lookup
        write_outputs(df_found, df_not, json_path, found_path, not_path)

    print("\n=== RESULTAAT ===")
    print(f"Gevonden: {len(df_found)}")
    print(f"Niet gevonden: {len(df_not)}")
    if not df_found.empty:
        print(f"CSV met gevonden stations: {found_path}")
        print(f"JSON code→coördinaten:   {json_path}")
    if not df_not.empty:
        print(f"CSV met niet gevonden:   {not_path}")

if __name__ == "__main__":
    main()
