#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fbref_serie_a_totali.py  –  v1.5  (luglio 2025)

Estrae la tabella “Player Standard Stats” Serie A 2024‑25 da FBref e salva
un CSV con i **totali** di partite, minuti, gol, assist, rigori calciati,
ammonizioni e espulsioni.  Ruoli tradotti in sigle italiane.

Licenza MIT.  Requisiti: pandas, requests, lxml (o html5lib).
"""

from __future__ import annotations

import sys
import time
from io import StringIO
from typing import Final

import pandas as pd
import requests
from requests.exceptions import HTTPError, RequestException, Timeout

# ---------------------------------------------------------------------------#
# CONFIGURAZIONE                                                             #
# ---------------------------------------------------------------------------#
SEASON_TAG: Final[str] = "serie_a_24_25"
TABLE_ID:   Final[str] = "stats_standard"
TABLE_NAME: Final[str] = "player_standard_stats"
FBREF_URL:  Final[str] = (
    "https://fbref.com/en/comps/18/stats/Serie-B-Stats"
)
OUTPUT_CSV: Final[str] = f"{SEASON_TAG}_{TABLE_NAME}_totali.csv"

HEADERS: Final[dict[str, str]] = {
    "User-Agent": (
        "fbref-stats-scraper/1.5 (+https://github.com/yourname) Python/3.11"
    )
}
REQUEST_TIMEOUT: Final[int] = 10
RATE_LIMIT:      Final[float] = 7.5  # sec  (≈ 8 req/min)

# Mappa ruoli FBref → abbreviazioni italiane
POS_MAP: Final[dict[str, str]] = {
    "GK": "P",   # Portiere
    "DF": "DC",  # Difensore centrale (generico)
    "MF": "CC",  # Centrocampista centrale
    "FW": "A",   # Attaccante
    # Aggiungi qui altri mapping se necessario
}

# ---------------------------------------------------------------------------#
def throttle(prev: float | None) -> float:
    """Garanzia rate‑limit: max 8 req/min."""
    now = time.time()
    if prev is not None:
        wait = RATE_LIMIT - (now - prev)
        if wait > 0:
            time.sleep(wait)
    return time.time()


def die(msg: str, exc: Exception | None = None) -> None:
    print(f"ERRORE: {msg}", file=sys.stderr)
    if exc:
        print(f"Dettagli: {exc}", file=sys.stderr)
    sys.exit(1)


def translate_pos(pos_field: str) -> str:
    """Converte “GK,DF” → “P/DC” secondo POS_MAP."""
    parts = [p.strip() for p in str(pos_field).split(",")]
    return "/".join(POS_MAP.get(p, p) for p in parts)


# ---------------------------------------------------------------------------#
def main() -> None:
    print("‑ Scarico tabella…")
    last_req: float | None = None

    # 1) HTTP GET
    try:
        last_req = throttle(last_req)
        resp = requests.get(FBREF_URL, headers=HEADERS, timeout=REQUEST_TIMEOUT)
        resp.raise_for_status()
    except Timeout:
        die("Timeout durante la richiesta a FBref.")
    except HTTPError as err:
        die(f"HTTP {resp.status_code} nella richiesta a FBref.", err)
    except RequestException as err:
        die("Errore di rete durante la richiesta a FBref.", err)

    html = resp.text.replace("<!--", "").replace("-->", "")

    # 2) Estrai tabella
    try:
        tables = pd.read_html(StringIO(html), attrs={"id": TABLE_ID})
        if not tables:
            raise ValueError("Tabella non trovata.")
        df = tables[0]
    except Exception as err:
        die("Impossibile parse‑are la tabella richiesta.", err)

    # 3) Header → ultimo livello
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(-1)

    # 4) Rimuovi duplicati
    df = df.loc[:, ~df.columns.duplicated()]

    # 5) Mapping colonne
    col_map: Final[dict[str, str]] = {
        "Player": "player",
        "Squad": "squad",
        "Pos": "pos",
        "MP": "partite",
        "Min": "minuti",
        "Gls": "goal",
        "Ast": "assist",
        "PKatt": "rigori",
        "CrdY": "gialli",
        "CrdR": "rossi",
    }
    missing = [c for c in col_map if c not in df.columns]
    if missing:
        die(
            "Colonne mancanti: "
            + ", ".join(missing)
            + "\nHeader disponibile: "
            + ", ".join(df.columns)
        )

    df = df[list(col_map)].rename(columns=col_map)

    # 6) Traduci ruoli
    df["pos"] = df["pos"].apply(translate_pos)

    # 7) Converte numerici
    for col in ["partite", "minuti", "goal", "assist", "rigori", "gialli", "rossi"]:
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

    # 8) Esporta CSV
    out_cols = [
        "player",
        "squad",
        "pos",
        "partite",
        "minuti",
        "goal",
        "assist",
        "rigori",
        "gialli",
        "rossi",
    ]
    try:
        df[out_cols].to_csv(OUTPUT_CSV, index=False)
        print(f"✓ CSV creato: {OUTPUT_CSV}")
    except Exception as err:
        die("Errore di scrittura del CSV.", err)


if __name__ == "__main__":
    main()
