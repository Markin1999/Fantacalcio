import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { readCsv } from "../utils/csvReader.js";
import Papa from "papaparse";

const { unparse } = Papa;

// Per compatibilità con ESM (equivalente di __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function csvModify() {
  try {
    // 1. Percorso del file CSV
    const filePath = path.resolve(__dirname, "../data/database.csv");

    // 2. Legge i dati usando il tuo reader personalizzato
    const dati = await readCsv(filePath); // Array di oggetti [{ player: "Marco", squad: "Inter", ... }]

    // 2. Rimuove l'ID esistente e aggiunge uno numerico incrementale
    let counter = 1;
    const datiConId = dati.map(({ id, ...rest }) => ({
      id: counter++, // nuovo id semplice
      ...rest,
    }));

    // 4. Converte in CSV stringa
    const nuovoCsv = unparse(datiConId, {
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

    // 5. Sovrascrive il file CSV
    fs.writeFileSync(filePath, nuovoCsv, "utf8");

    console.log("CSV aggiornato con ID univoci ✅");
  } catch (err) {
    console.error("Errore durante la modifica del CSV:", err);
  }
}

csvModify();
