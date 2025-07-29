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
import { get } from "http";
const { unparse } = Papa;
import { createObjectCsvWriter } from "csv-writer";
import fs from "fs";
import { parse } from "csv-parse";
import { stringify } from "csv-stringify";

// Per compatibilità con ESM (equivalente di __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

//Funzione che legge il file CSV e restituisce un array di oggetti

export async function getPlayers(_, res) {
  try {
    //Trova il percorso assoluto del file
    const file = path.resolve(__dirname, "../data/database.csv");
    const rows = await readCsv(file);

    const rowsNoEmpty = rows.filter(
      (row) => row.Name !== "Player" && row.Name !== "player"
    );

    res.status(200).json(rowsNoEmpty);
  } catch (err) {
    res.status(500).json({ error: "Errore nel leggere il file CSV" });
  }
}

//funzione che aggiunge un file al csv

export async function addPlayerToCsv(req, res) {
  const filePath = path.resolve(__dirname, "../data/database.csv");

  // Dati da inserire

  const nuovoGiocatore = req.body;

  // Crea un writer per il CSV e lo appende alla fine del file esistente
  const csvWriter = createObjectCsvWriter({
    path: filePath,
    header: [
      { id: "player", title: "player" },
      { id: "squad", title: "squad" },
      { id: "pos", title: "pos" },
      { id: "partite", title: "partite" },
      { id: "minuti", title: "minuti" },
      { id: "goal", title: "goal" },
      { id: "assist", title: "assist" },
      { id: "rigori", title: "rigori" },
      { id: "gialli", title: "gialli" },
      { id: "rossi", title: "rossi" },
    ],
    append: true, // 👈 Aggiunge alla fine del CSV, non sovrascrive
  });

  try {
    await csvWriter.writeRecords([nuovoGiocatore]);
    res.status(201).json({ message: "Giocatore aggiunto con successo" });
    console.log("Nuovo giocatore aggiunto al CSV.");
  } catch (err) {
    res.status(500).json({ error: "Errore durante l'aggiunta del giocatore" });
    console.error("Errore durante la scrittura nel CSV:", err);
  }
}

// Eliminazione da CSV confrontando player e squad
export async function deletePlayerFromCsv(req, res) {
  const filePath = path.resolve(__dirname, "../data/database.csv");
  const { player, squad } = req.body;

  if (!player || !squad) {
    return res.status(400).json({ error: "player e squad sono obbligatori" });
  }

  const rows = [];

  // 1. Legge tutte le righe del CSV
  fs.createReadStream(filePath)
    .pipe(parse({ columns: true }))
    .on("data", (row) => {
      // Mantiene solo i giocatori diversi da quello da eliminare
      if (row.player !== player && row.squad !== squad) {
        rows.push(row);
      }
    })
    .on("end", () => {
      // 2. Scrive il nuovo array filtrato nel CSV
      stringify(rows, { header: true }, (err, output) => {
        if (err) {
          console.error("Errore nello stringify:", err);
          return res
            .status(500)
            .json({ error: "Errore durante la scrittura del CSV" });
        }

        fs.writeFile(filePath, output, (err) => {
          if (err) {
            console.error("Errore nella scrittura del file:", err);
            return res
              .status(500)
              .json({ error: "Errore nella riscrittura del CSV" });
          }

          res.status(200).json({ message: "Giocatore eliminato con successo" });
          console.log(`Giocatore ${player} (${squad}) eliminato dal CSV.`);
        });
      });
    })
    .on("error", (err) => {
      console.error("Errore nella lettura del CSV:", err);
      res.status(500).json({ error: "Errore nella lettura del CSV" });
    });
}

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
