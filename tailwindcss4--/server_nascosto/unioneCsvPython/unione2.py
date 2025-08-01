# Qui andiamo a unire i csv listone con serie A + serie B 2024 2025
import csv
import unicodedata
import os
from datetime import datetime

# Funzione per normalizzare le stringhe (rimuove accenti e converte in minuscolo)
def normalize_name(name):
    if name is None:
        return ''
    name = name.strip()
    name_normalized = ''.join(
        ch for ch in unicodedata.normalize('NFD', name)
        if unicodedata.category(ch) != 'Mn'
    )
    return name_normalized.lower()

# Passo 1: costruiamo la mappa cognome → record statistici dal database (UTF‑8)
surname_map = {}
with open('stats-serieA-2024-2025.csv', newline='', encoding='utf-8') as db_file:
    reader = csv.DictReader(db_file)
    stats_fields = ['partite', 'minuti', 'goal', 'assist', 'rigori', 'gialli', 'rossi']
    for row in reader:
        # Il campo "id" non serve per l'unione
        row.pop('id', None)
        player_norm = normalize_name(row.get('player', ''))
        parts = player_norm.split()
        if not parts:
            continue
        first_name = parts[0]
        last_name = parts[-1]

        record = {
            'first_name': first_name,
            'stats': {field: (row.get(field, '0') or '0') for field in stats_fields}
        }
        surname_map.setdefault(last_name, []).append(record)

# Passo 2: leggiamo il listone "Quotazioni_2025_26.csv" e aggiorniamo solo le colonne già esistenti
output_rows = []
with open('listone_serieAstats.csv', newline='', encoding='utf-8') as quot_file:
    reader = csv.DictReader(quot_file, delimiter=';')
    original_fields = [fn for fn in reader.fieldnames if fn and fn != 'Id'] if reader.fieldnames else []
    stats_fields = ['partite', 'minuti', 'goal', 'assist', 'rigori', 'gialli', 'rossi']

    for row in reader:
        # Rimuoviamo la colonna "Id" del listone, se presente
        row.pop('Id', None)

        nome_field = row.get('Nome', '')
        if not nome_field:
            output_rows.append(row)
            continue

        nome_norm = normalize_name(nome_field)
        parts = nome_norm.split()
        if not parts:
            output_rows.append(row)
            continue

        first_name_quot = parts[0]
        last_name_quot = parts[-1]

        chosen_record = None
        if last_name_quot in surname_map:
            # Corrispondenza esatta nome + cognome, altrimenti prima occorrenza del cognome
            for rec in surname_map[last_name_quot]:
                if rec['first_name'] == first_name_quot:
                    chosen_record = rec
                    break
            if chosen_record is None:
                chosen_record = surname_map[last_name_quot][0]

        # Se troviamo il giocatore, aggiorniamo i campi statistici SOLO se già presenti nel listone
        if chosen_record:
            for field in stats_fields:
                if field in row:
                    row[field] = chosen_record['stats'].get(field, row[field])

        output_rows.append(row)

# Passo 3: aggiungiamo un nuovo ID sequenziale; il listone originale resta intatto
for idx, row in enumerate(output_rows, start=1):
    row['id'] = str(idx)

# Passo 4: salviamo il file arricchito in ./data, separatore ';'
os.makedirs('data', exist_ok=True)
output_filename = f"prova1_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
output_path = os.path.join('data', output_filename)

fieldnames = ['id'] + original_fields  # stesso ordine del listone
with open(output_path, 'w', newline='', encoding='utf-8') as out_file:
    writer = csv.DictWriter(out_file, fieldnames=fieldnames, delimiter=';', quotechar='"', quoting=csv.QUOTE_MINIMAL)
    writer.writeheader()
    writer.writerows(output_rows)

print(f"✅ File creato: {output_filename}")
