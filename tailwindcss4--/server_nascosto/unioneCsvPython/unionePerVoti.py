"""
Script di arricchimento quote Fantacalcio
========================================

Dato un file di *quotazioni* (ad es. `unione-Completata.csv`) - che può contenere
campi statistici mancanti - e un file di *voti* / statistiche per la stagione (ad es.
`voti_2024_25.csv`), questo script produce un nuovo CSV arricchito con le
statistiche medie:

- **Pv**  =  Voto Pagellante (o altra metrica definita nel file voti)
- **Mv**  =  Media Voto (senza, o con, bonus/malus a seconda del dataset)
- **Fm**  =  Fanta Media
- **Au**  =  Autogoal (o altro campo facoltativo)

Se un giocatore non viene trovato nelle statistiche, i campi rimangono impostati a
"0" (stringa). Le colonne mancanti vengono create automaticamente così da avere
sempre lo stesso schema di output.
"""

# =============================================================
# IMPORT STANDARD LIBRARY
# =============================================================
# (non servono librerie esterne)

import csv                    # lettura/scrittura CSV
import unicodedata            # gestione normalizzazione accenti
import difflib                # fuzzy‑matching nomi
import string                 # per tabella punteggiatura
import os                     # creazione cartelle / path
from datetime import datetime # timestamp nel nome file di output
from typing import Optional, Dict, List

# =============================================================
# COSTANTI E UTILITY
# =============================================================

# tabella di traduzione che rimuove tutta la punteggiatura (string.punctuation)
_punct_tbl = str.maketrans("", "", string.punctuation)


def normalize(txt: str) -> str:
    """Normalizza una stringa per confronti *fuzzy*.

    Operazioni eseguite:
    1. Converte gli accenti (é → e) con unicodedata.
    2. Rimuove tutta la punteggiatura.
    3. Rende la stringa minuscola.
    4. Collassa spazi multipli in uno singolo.
    """
    if not txt:
        return ""

    # 1) rimuove diacritici/accelerazioni mantenendo solo caratteri base
    txt = "".join(
        ch for ch in unicodedata.normalize("NFD", txt) if unicodedata.category(ch) != "Mn"
    )
    # 2‑3‑4) punteggiatura → niente, lower, split+join per spazi multipli
    return " ".join(txt.lower().translate(_punct_tbl).split())


def is_zero(val: Optional[str]) -> bool:
    """True se la stringa rappresenta 0 oppure è vuota/None.

    Alcuni dataset usano la virgola come separatore decimale → la convertiamo a
    punto per `float()`.
    """
    if val is None:
        return True
    # rimuove whitespace, converte virgola in punto, gestisce stringa vuota
    val = val.strip().replace(",", ".")
    if val == "":
        return True
    try:
        return float(val) == 0.0
    except ValueError:
        # non numerico → non è zero ma trattiamo comunque come non zero
        return False

# =============================================================
# PARAMETRI PERSONALIZZABILI
# =============================================================

# Colonne statistiche che vogliamo in output (in maiuscolo)
stats_fields: List[str] = ["Pv", "Mv", "Fm", "Au"]

# File di input (puoi modificarli a piacere)
VOTI_CSV   = "voti_2024_25.csv"       # contenente statistiche/voti
QUOTE_CSV  = "data.csv"  # quotazioni da arricchire
OUTPUT_DIR = "data"                   # directory dove salvare l'output

# =============================================================
# COSTRUZIONE DELLE MAPPE DI LOOKUP
# =============================================================
# Scopo: poter trovare rapidamente le statistiche dato (squadra, cognome) o solo
#        cognome se la squadra non basta.

# Strutture dati globali:
team_map: Dict[str, Dict[str, List[dict]]] = {}  # team → cognome → lista record
global_map: Dict[str, List[dict]] = {}           # cognome → lista record (tutte squadre)


def add_record(rec: dict) -> None:
    """Inserisce un singolo record di statistiche nelle mappe globali."""
    team = rec["team"]
    last = rec["last"]
    # team‑map: per ricerche "intra‑squadra" → pochissimi record e match più precisi
    team_map.setdefault(team, {}).setdefault(last, []).append(rec)
    # global‑map: fallback fuzzy su tutti i record che condividono lo stesso cognome
    global_map.setdefault(last, []).append(rec)


def load_stats_file(path: str) -> None:
    """Legge il CSV statistiche e popola *team_map* e *global_map*.

    Il file `voti` può avere maiuscole/misc e colonne aggiuntive: adattiamo tutto
    con chiavi lowercase per robustezza.
    """
    with open(path, newline="", encoding="utf-8") as f:
        # la maggior parte dei dataset Fantacalcio usa il punto e virgola come separatore
        reader = csv.DictReader(f, delimiter=";")
        for raw in reader:
            # 1) uniforma key → minuscolo, value → stringa non None
            row = {k.lower().strip(): (v or "") for k, v in raw.items()}

            # ---------- ESTRAE NOME COMPLETO ----------
            name_raw = row.get("player") or row.get("nome") or row.get("giocatore")
            if not name_raw:
                continue  # se manca il nome salta la riga
            tokens = normalize(name_raw).split()
            if not tokens:
                continue  # stringa nome vuota dopo normalizzazione
            first, last = tokens[0], tokens[-1]  # nome e cognome (o cognome composto)

            # ---------- ESTRAE SQUADRA ----------
            team_raw = row.get("team") or row.get("squadra") or row.get("squad")
            if not team_raw:
                continue
            team_norm = normalize(team_raw)

            # ---------- COLONNE STATS ----------
            # tutte le colonne nel CSV vengono lette in lowercase; qui rialziamo il
            # case originale (Pv ecc.)
            stats = {f: (row.get(f.lower()) or "0") for f in stats_fields}

            # inserisce il record nelle mappe
            add_record({
                "first": first,   # nome normalizzato (solo primo token)
                "last": last,    # cognome / ultimo token
                "team": team_norm,
                "stats": stats,
            })

# ---- Esecuzione caricamento statistiche ----
load_stats_file(VOTI_CSV)

# =============================================================
# FUNZIONI DI MATCHING GIOCATORE ⇆ STATISTICHE
# =============================================================


def fuzzy_one(target: str, keys: List[str], cutoff: float = 0.78) -> Optional[str]:
    """Ritorna la *migliore* chiave che assomiglia a *target* (difflib)."""
    match = difflib.get_close_matches(target, keys, n=1, cutoff=cutoff)
    return match[0] if match else None


def find_in_map(smap: Dict[str, List[dict]], tokens: List[str]) -> Optional[dict]:
    """Cerca un record in una sotto‑mappa (team‑specifica o globale).

    Logica di matching:
    1. Prova (nome, cognome) e anche (cognome, nome) se il nome è composto.
    2. Se il cognome è presente, restituisce il primo record che inizia con il
       *nome* dato.
    3. Se fallisce, effettua un fuzzy match sul cognome.
    """
    if not tokens:
        return None
    first_token, last_token = tokens[0], tokens[-1]
    # coppie da provare: (nome, cognome) e (cognome, nome) per nomi composti
    pairs = [(first_token, last_token), (last_token, first_token)] if len(tokens) > 1 else [(first_token, last_token)]

    # 1) tentativo diretto
    for first, last in pairs:
        if last in smap:
            # cerca record che inizia con "first" (match parziale per nomi lunghi)
            for rec in smap[last]:
                if rec["first"].startswith(first):
                    return rec
            # se non trovato match preciso, restituisce il primo con quel cognome
            return smap[last][0]

    # 2) tentativo fuzzy sul cognome
    best_last = fuzzy_one(last_token, list(smap.keys()))
    return smap[best_last][0] if best_last else None


def find_record(team_norm: str, name_raw: str) -> Optional[dict]:
    """Trova la riga statistiche che meglio corrisponde a `name_raw` in `team_norm`."""
    tokens = normalize(name_raw).split()

    # a) prima cerca dentro la stessa squadra → evita omonimi tra squadre diverse
    if team_norm and team_norm in team_map:
        rec = find_in_map(team_map[team_norm], tokens)
        if rec:
            return rec

    # b) fallback globale (tutte le squadre)
    return find_in_map(global_map, tokens)

# =============================================================
# ARRICCHIMENTO DEL FILE QUOTAZIONI
# =============================================================

output_rows: List[Dict] = []  # accumula righe pronte per l'output

with open(QUOTE_CSV, newline="", encoding="utf-8") as f_in:
    reader = csv.DictReader(f_in, delimiter=";")

    # header originale (escl. "id" che verrà rigenerato)
    original_fields = [c for c in (reader.fieldnames or []) if c and c.lower() != "id"]

    # assicura la presenza di tutte le colonne statistiche nell'header
    for f in stats_fields:
        if f not in original_fields:
            original_fields.append(f)

    # ------------- ELABORAZIONE DI OGNI RIGA -------------
    for raw in reader:
        row = raw.copy()
        # rimuovi vecchio Id (potrebbe essere numerico non consecutivo)
        row.pop("Id", None)

        # 1) inizializza sempre i campi statistici a stringa "0"
        for f in stats_fields:
            row.setdefault(f, "0")

        # 2) SE i campi Pv / Mv / Fm / Au sono già valorizzati (>0) lasciali com'è.
        # Altrimenti prova a cercare il giocatore nel dataset statistiche.
        need_update = any(is_zero(row.get(f)) for f in stats_fields)

        if need_update:
            team_norm = normalize(row.get("Squadra") or row.get("squadra") or "")
            rec = find_record(team_norm, row.get("Nome") or row.get("nome") or "")

            if rec:
                for f in stats_fields:
                    row[f] = rec["stats"].get(f, row[f])
            # se non trovato → valori restano "0"

        output_rows.append(row)

# =============================================================
# SCRITTURA CSV DI OUTPUT
# =============================================================

# ricrea id incrementale (1..N)
for idx, r in enumerate(output_rows, 1):
    r["id"] = str(idx)

# assicura che la cartella di output esista
os.makedirs(OUTPUT_DIR, exist_ok=True)

# nome file con timestamp → evita sovrascritture
filename = f"quotazioni_enriched_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
filepath = os.path.join(OUTPUT_DIR, filename)

# ordine finale: id + colonne originali (che ora includono anche stats_fields)
fieldnames = ["id"] + original_fields

with open(filepath, "w", newline="", encoding="utf-8") as fo:
    writer = csv.DictWriter(
        fo,
        fieldnames=fieldnames,
        delimiter=";",
        quotechar="\"",
        quoting=csv.QUOTE_MINIMAL,
    )
    writer.writeheader()
    writer.writerows(output_rows)

print(f"✅ File creato: {filepath}")

