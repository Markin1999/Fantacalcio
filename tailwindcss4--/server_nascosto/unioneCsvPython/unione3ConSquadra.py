#Per trovare piu giocatori corrispondenti nella ricerca del nome lo facciamo attraverso la ricerca per la squadra
import csv
import unicodedata
import difflib
import string
import os
from datetime import datetime
from typing import Optional, Dict, List

# =============================================================
# Utility comuni
# =============================================================

_punct_tbl = str.maketrans("", "", string.punctuation)


def normalize(txt: str) -> str:
    """Rimuove accenti, punteggiatura inutile, spazi multipli; lowercase."""
    if not txt:
        return ""
    txt = "".join(ch for ch in unicodedata.normalize("NFD", txt) if unicodedata.category(ch) != "Mn")
    return " ".join(txt.lower().translate(_punct_tbl).split())


def is_zero(val: Optional[str]) -> bool:
    if val is None:
        return True
    val = val.strip().replace(",", ".")
    if val == "":
        return True
    try:
        return float(val) == 0.0
    except ValueError:
        return False

# =============================================================
# Campi di interesse
# =============================================================

stats_fields: List[str] = [
    "Pv","Mv","Fm","Au"
]


# =============================================================
# Lettura file STATISTICHE → mappe
# =============================================================

team_map: Dict[str, Dict[str, List[dict]]] = {}
global_map: Dict[str, List[dict]] = {}


def add_record(rec: dict):
    team = rec["team"]
    last = rec["last"]
    team_map.setdefault(team, {}).setdefault(last, []).append(rec)
    global_map.setdefault(last, []).append(rec)


def load_stats_file(path: str):
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for raw in reader:
            row = {k.lower().strip(): (v or "") for k, v in raw.items()}

            # ------- nome completo --------
            name_raw = row.get("player") or row.get("nome") or row.get("giocatore")
            if not name_raw:
                continue
            tokens = normalize(name_raw).split()
            if not tokens:
                continue
            first, last = tokens[0], tokens[-1]

            # ------- squadra --------
            team_raw = row.get("team") or row.get("squadra") or row.get("squad")
            if not team_raw:
                continue
            team_norm = normalize(team_raw)

            # ------- stats --------
            stats = {f: row.get(f, row.get(f.capitalize(), "0")) or "0" for f in stats_fields}

            add_record({"first": first, "last": last, "team": team_norm, "stats": stats})

# carica il csv delle statistiche
load_stats_file("voti_2024_25.csv")

# =============================================================
# Funzioni di matching
# =============================================================

def fuzzy_one(target: str, keys: List[str], cutoff=0.78) -> Optional[str]:
    m = difflib.get_close_matches(target, keys, n=1, cutoff=cutoff)
    return m[0] if m else None


def find_in_map(smap: Dict[str, List[dict]], tokens: List[str]) -> Optional[dict]:
    if not tokens:
        return None
    ft, lt = tokens[0], tokens[-1]
    pairs = [(ft, lt), (lt, ft)] if len(tokens) > 1 else [(ft, lt)]

    for fn, ln in pairs:
        if ln in smap:
            for rec in smap[ln]:
                if rec["first"].startswith(fn):
                    return rec
            return smap[ln][0]

    best_ln = fuzzy_one(lt, list(smap.keys()))
    if best_ln:
        return smap[best_ln][0]
    return None


def find_record(team_norm: str, name_raw: str) -> Optional[dict]:
    tokens = normalize(name_raw).split()
    if team_norm in team_map:
        rec = find_in_map(team_map[team_norm], tokens)
        if rec:
            return rec
    return find_in_map(global_map, tokens)

# =============================================================
#  Elabora DATABASE da arricchire
# =============================================================

output_rows: List[Dict] = []

with open("unione-Completata.csv", newline="", encoding="utf-8") as f_in:
    reader = csv.DictReader(f_in, delimiter=";")
    original_fields = [c for c in reader.fieldnames if c and c.lower() != "id"] if reader.fieldnames else []

    for raw in reader:
        row = raw.copy()
        row.pop("Id", None)

        # Skip se partite/minuti non zero
        if not (is_zero(row.get("partite")) and is_zero(row.get("minuti"))):
            output_rows.append(row)
            continue

        team_norm = normalize(row.get("Squadra") or row.get("squadra") or "")
        record = find_record(team_norm, row.get("Nome") or row.get("nome") or "")

        # garantisce colonne stats
        for f in stats_fields:
            row.setdefault(f, "0")

        if record:
            for f in stats_fields:
                row[f] = record["stats"].get(f, row[f])

        output_rows.append(row)

# =============================================================
#  Export
# =============================================================

for idx, r in enumerate(output_rows, 1):
    r["id"] = str(idx)

os.makedirs("data", exist_ok=True)
filename = f"quotazioni_enriched_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
fieldnames = ["id"] + original_fields + [f for f in stats_fields if f not in original_fields]

with open(os.path.join("data", filename), "w", newline="", encoding="utf-8") as fo:
    writer = csv.DictWriter(fo, fieldnames=fieldnames, delimiter=";", quotechar="\"", quoting=csv.QUOTE_MINIMAL)
    writer.writeheader()
    writer.writerows(output_rows)

print(f"✅ File creato: {filename}")
