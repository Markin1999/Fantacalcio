//Serve per costruire il percorso assoluto del file CSV, così funziona ovunque, anche se avvii da una cartella diversa.
import path from "path";
//Serve per leggere il file CSV, così posso trasformarlo in un array di oggetti
import { fileURLToPath } from "url";
//Serve per ottenere il percorso della cartella corrente, così posso leggere il file CSV da lì.
import { dirname } from "path";
import { readCsv } from "../utils/csvReader.js";
//Serve per scrivere il file CSV, così posso esportare i dati trasformati
import { writeFile } from "fs/promises";
//Serve per trasformare l'oggetto in un CSV
import Papa from "papaparse";

const { unparse } = Papa;

import { stringify } from "csv-stringify/sync";

import fs from "fs";

// Per compatibilità con ESM (equivalente di __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

//Funzione che legge il file CSV e restituisce un array di oggetti

export async function getPlayers(_, res) {
  try {
    //Trova il percorso assoluto del file
    const file = path.resolve(__dirname, "../data/database.csv");
    const rows = await readCsv(file);

    console.log("csv letto");

    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ error: "Errore nel leggere il file CSV" });
  }
}

//funzione che aggiunge un file al csv

//Funzione che unisce valori all'interno di un oggetto CSV
export async function unioneCsvValue(rows) {
  try {
    const playerStats = {};

    for (const row of rows) {
      // Costruisco una chiave unica per ogni giocatore e squadra
      const key = `${row.Player}__${row.Team}`;
      // Se la chiave non esiste, la creo, quindi creo un oggetto giocatore unico
      if (!playerStats[key]) {
        playerStats[key] = {
          Player: row.Player,
          Team: row.Team,
          count: 0, // partite giocate
          totals: {}, // somma per ogni statistica numerica
        };
      }

      playerStats[key].count++;

      // Somma tutte le statistiche numeriche
      for (const col in row) {
        if (
          //Controllo se il valore numerico è un numero
          col !== "Player" &&
          col !== "Team" &&
          col !== "Date" &&
          !isNaN(parseFloat(row[col])) //row[col] serve a leggere nell'oggetto tramite il nome della colonna
        ) {
          //Nel caso in cui il valore sia stato inserito la prima volta, lo inizializzo a 0, altrimenti sommo il valore con quello precedente
          const val = parseFloat(row[col]) || 0;
          playerStats[key].totals[col] =
            (playerStats[key].totals[col] || 0) + val;
        }
      }
      // Crea il risultato finale (uno per giocatore)

      //Iniziamo andando a trasformare l'oggetto in un array di oggetti semplificato
      const result = Object.values(playerStats).map((entry) => {
        // Per ogni giocatore, creo un oggetto con le statistiche totali e le medie
        const merged = {
          Player: entry.Player,
          Team: entry.Team,
        };

        //Per ogni oggetto in totals, creo le statistiche totali e le medie
        for (const col in entry.totals) {
          if (col === "Goals" || col === "Total Shoot" || col === "Assists") {
            // Aggiunge la statistica come numero intero.
            merged[col] = Math.round(entry.totals[col]);
          } else {
            // Medie sulle 38 giornate
            merged[`${col} per 38`] = +(entry.totals[col] / 38).toFixed(2);
          }
        }

        return merged;
      });

      // Crea CSV
      //Converte i dati in formato CSV (stringa)
      const csv = unparse(result);
      //Trova il percorso completo dove salvare il file
      const outputPath = path.resolve("./output/player_summary.csv");
      //Scrive il CSV sul disco
      await writeFile(outputPath, csv, "utf-8");
      console.log("✅ File CSV creato in:", outputPath);
    }
  } catch (err) {
    console.error("❌ Errore lettura CSV:", err.message, "\nDettagli:", err);
  }
}

// deletePlayer.js (ES modules)

export async function deletePlayerFromCsv(req, res) {
  const playerId = req.params.id;
  try {
    const filepath = path.resolve(__dirname, "../data/database.csv");

    // 1. Leggi il CSV
    const rows = await readCsv(filepath);

    // 2. Scarta eventuali header duplicati e il giocatore da eliminare
    const filtered = rows
      .filter((row) => row.id !== "id") // header ripetuto?
      .filter((row) => String(row.id) !== String(playerId));

    // 2. Rimuove l'ID esistenti e aggiunge uno numerico incrementale
    let counter = 1;
    const filteredRows = filtered.map(({ id, ...rest }) => ({
      id: counter++, // nuovo id semplice
      ...rest,
    }));

    // 3. Ricrea il CSV
    const nuovoCsv = unparse(filteredRows, {
      columns: [
        "id",
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
      ],
    });

    // 4. Scrittura atomica
    fs.writeFileSync(filepath, nuovoCsv, "utf8");

    res
      .status(200)
      .json({ message: `Giocatore ${playerId} eliminato con successo` });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Errore durante l'eliminazione del giocatore" });
    console.error(
      "Errore durante l'eliminazione del giocatore:",
      error.message
    );
  }

  console.log(`Giocatore ${playerId} eliminato con successo.`);
}

// ─────
export async function addPlayerToCsv(req, res) {
  const filePath = path.resolve(__dirname, "../data/database.csv");

  const nuovoGiocatore = { ...req.body };

  try {
    const rows = await readCsv(filePath);

    const columns = [
      "id",
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
    ];

    // 1. Calcola l'ID più alto esistente
    const lastId = rows
      .filter((r) => /^\d+$/.test(r.id))
      .reduce((max, r) => Math.max(max, Number(r.id)), 0);

    // 2. Assegna un nuovo ID
    nuovoGiocatore.id = String(lastId + 1);

    // 3. Normalizza tutti i dati per garantire coerenza con le colonne
    const normalizedRows = [...rows, nuovoGiocatore].map((r) => {
      const result = {};
      columns.forEach((col) => {
        result[col] = r[col] ?? "";
      });
      return result;
    });

    // 4. Genera CSV come stringa
    const outCsv = stringify(normalizedRows, {
      header: true,
      columns,
    });

    // 5. Scrive il file CSV aggiornato
    fs.writeFileSync(filePath, outCsv, "utf8");

    // 6. Risposta al client
    res.status(201).json({
      message: "Giocatore aggiunto con successo",
      id: nuovoGiocatore.id,
    });

    console.log(
      `✅ Nuovo giocatore ${nuovoGiocatore.player} (ID ${nuovoGiocatore.id}) inserito nel CSV.`
    );
  } catch (err) {
    console.error("Errore durante la scrittura nel CSV:", err);
    res.status(500).json({ error: "Errore durante l'aggiunta del giocatore" });
  }
}
