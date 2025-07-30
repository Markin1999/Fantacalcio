# Qui andiamo a unire i csv listone + serie A 2024 2025. Listone rimarra cosi com'è andando ad aggiungere per ogni giocatore le stats quindi partite, ecc... da  serie a 2024 2025

import csv
import unicodedata
import os
from datetime import datetime

# Funzione per normalizzare le stringhe (rimuove accenti e converte in minuscolo)
def normalize_name(name):
    if name is None:
        return ''
    name = name.strip()
    # Separazione dei caratteri accentati dal carattere base
    name_normalized = ''.join(
        ch for ch in unicodedata.normalize('NFD', name)
        if unicodedata.category(ch) != 'Mn'
    )
    return name_normalized.lower()

# Passo 1: Leggi database.csv (UTF-8) e crea una mappa "cognome -> elenco di righe"
surname_map = {}
with open('database.csv', 'r', encoding='utf-8') as db_file:
    reader = csv.DictReader(db_file)
    for row in reader:
        # Rimuovi la colonna 'id' se presente
        row.pop('id', None)
        # Normalizza il nome del giocatore e separa nome e cognome
        player_name = row.get('player', '')
        player_norm = normalize_name(player_name)
        parts = player_norm.split()
        if not parts:
            continue  # salta la riga se il nome non è disponibile
        first_name = parts[0]
        last_name = parts[-1]
        # Assicura che i campi statistici siano presenti, usa '0' se mancanti o vuoti
        stats_fields = ['partite', 'minuti', 'goal', 'assist', 'rigori', 'gialli', 'rossi']
        for field in stats_fields:
            if field not in row or row[field] is None or row[field].strip() == '':
                row[field] = '0'
        # Crea un record con il nome normalizzato e i valori statistici
        record = {
            'first_name': first_name,
            'stats': {field: row[field] for field in stats_fields}
        }
        # Aggiungi il record alla lista del cognome nella mappa
        surname_map.setdefault(last_name, []).append(record)

# Passo 2: Leggi Quotazioni_2025_26.csv (delimitato da ';') e arricchisci i dati con le statistiche
output_rows = []
with open('Quotazioni_2025_26.csv', 'r', encoding='utf-8') as quot_file:
    reader = csv.DictReader(quot_file, delimiter=';')
    # Determina le colonne originali (escludendo 'Id')
    original_fields = [fn for fn in reader.fieldnames if fn and fn != 'Id'] if reader.fieldnames else []
    for row in reader:
        # Rimuovi la colonna 'Id' se presente
        row.pop('Id', None)
        # Inizializza i campi statistici aggiuntivi a '0'
        stats_fields = ['partite', 'minuti', 'goal', 'assist', 'rigori', 'gialli', 'rossi']
        for field in stats_fields:
            row[field] = '0'
        # Verifica il campo Nome
        nome_field = row.get('Nome', '')
        if nome_field is None or nome_field.strip() == '':
            # Se il nome è assente o vuoto, lascia i campi statistici a 0 e passa oltre
            output_rows.append(row)
            continue
        # Normalizza il contenuto di Nome e ottieni cognome e nome proprio
        nome_norm = normalize_name(nome_field)
        parts = nome_norm.split()
        if not parts:
            output_rows.append(row)
            continue
        first_name_quot = parts[0]
        last_name_quot = parts[-1]
        # Cerca il cognome nella mappa
        if last_name_quot in surname_map:
            records = surname_map[last_name_quot]
            chosen_record = None
            # Cerca corrispondenza esatta sul nome proprio
            for rec in records:
                if rec['first_name'] == first_name_quot:
                    chosen_record = rec
                    break
            if chosen_record is None and records:
                # Nessuna corrispondenza esatta trovata, usa la prima riga del gruppo
                chosen_record = records[0]
            if chosen_record:
                # Estrai i valori statistici dal record scelto
                for field, value in chosen_record['stats'].items():
                    # Usa '0' se il campo è mancante o vuoto, altrimenti il valore effettivo
                    if value is None or (isinstance(value, str) and value.strip() == ''):
                        row[field] = '0'
                    else:
                        row[field] = str(value)
        # Aggiungi la riga (arricchita o con zeri) all'elenco di output
        output_rows.append(row)

# Passo 3: Aggiungi un nuovo ID sequenziale a partire da 1 per ogni riga di output
for idx, row in enumerate(output_rows, start=1):
    row['id'] = str(idx)

# Passo 4: Scrivi il nuovo file CSV con il separatore ';' e nome file specificato
os.makedirs('data', exist_ok=True)  # assicura che la cartella data esista
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
output_filename = f"quotazioni_enriched_{timestamp}.csv"
output_path = os.path.join('data', output_filename)
# Prepara l'ordine delle colonne per il file di output
stats_fields = ['partite', 'minuti', 'goal', 'assist', 'rigori', 'gialli', 'rossi']
# Se abbiamo le colonne originali dal file Quotazioni, usale nell'ordine originale
if original_fields:
    fieldnames = ['id'] + original_fields + stats_fields
else:
    # In caso non siano state determinate (ad es. file vuoto), definisci manualmente
    fieldnames = ['id', 'R', 'RM', 'Nome', 'Squadra', 'Qt.A', 'Qt.I', 'Diff.', 
                  'Qt.A M', 'Qt.I M', 'Diff.M', 'FVM', 'FVM M'] + stats_fields

# Scrivi il CSV arricchito
with open(output_path, 'w', newline='', encoding='utf-8') as out_file:
    writer = csv.DictWriter(out_file, fieldnames=fieldnames, delimiter=';', quotechar='"', quoting=csv.QUOTE_MINIMAL)
    writer.writeheader()
    writer.writerows(output_rows)

# Stampa il messaggio di conferma
print(f"✅ File creato: {output_filename}")
