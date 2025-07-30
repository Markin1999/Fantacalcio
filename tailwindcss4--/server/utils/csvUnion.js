import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { readCsv } from "../utils/csvReader.js";
import Papa from "papaparse";

const { unparse } = Papa;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Rimuove accenti e prende l’ultima parola (= cognome) */
const getSurname = (fullName = "") =>
  fullName
    .trim()
    .normalize("NFD") // toglie accenti (é → e)
    .replace(/[\u0300-\u036f]/g, "")
    .split(/\s+/)
    .at(-1)
    .toLowerCase();

export async function csvUnion() {
  try {
    // 1. Percorsi dei CSV
    const filePath1 = path.resolve(__dirname, "../data/database.csv");
    const filePath2 = path.resolve(__dirname, "../data/Quotazioni_2025_26.csv");

    // 2. Lettura
    const dati = await readCsv(filePath1); // stats storiche
    const quotazioni = await readCsv(filePath2, ";"); // lista fantasia (separatore ;)
    // 3. Rimozione ID
    const datiSenzaId = dati.map(({ id, ...rest }) => rest);
    const quotazioniSenzaId = quotazioni.map(({ Id, ...rest }) => rest);

    // 4. Costruisco mappa cognome → array di righe stats
    const statsBySurname = new Map();
    for (const row of datiSenzaId) {
      const sn = getSurname(row.player);
      if (!sn) continue;
      const bucket = statsBySurname.get(sn) ?? [];
      bucket.push(row);
      statsBySurname.set(sn, bucket);
    }

    // 4. Unione
    const normalize = (text = "") =>
      text
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

    const colonneStats = [
      "partite",
      "minuti",
      "goal",
      "assist",
      "rigori",
      "gialli",
      "rossi",
    ];

    const quotazioniConStats = quotazioniSenzaId.map((qRow) => {
      if (!qRow.Nome) {
        console.warn("⚠️  Riga senza campo 'Nome':", qRow);
        // oppure: return la riga originale + zeri
        return {
          ...qRow,
          ...colonneStats.reduce((acc, key) => {
            acc[key] = 0;
            return acc;
          }, {}),
        };
      }

      const cognomeQ = getSurname(qRow.Nome);
      const nomeQ = normalize(qRow.Nome.split(" ")[0]);
      const bucket = statsBySurname.get(cognomeQ);

      let statsValues = {};

      if (bucket) {
        const match =
          bucket.find((b) => {
            const nomeB = normalize(b.player.split(" ")[0]);
            return nomeB === nomeQ;
          }) || bucket[0];

        statsValues = colonneStats.reduce((acc, key) => {
          acc[key] = match[key] ?? 0;
          return acc;
        }, {});
      } else {
        statsValues = colonneStats.reduce((acc, key) => {
          acc[key] = 0;
          return acc;
        }, {});
      }

      return {
        ...qRow,
        ...statsValues,
      };
    });

    // 6. Scrittura CSV unificato  →  salva con nome univoco
    const csvOut = unparse(quotazioniConStats, { delimiter: ";" });

    // Genera un timestamp compatto: es. 20250729_143015
    const timestamp = new Date()
      .toISOString() // 2025-07-29T14:30:15.123Z
      .slice(0, 19) // 2025-07-29T14:30:15
      .replace(/[-:T]/g, ""); // 20250729_143015
    const fileName = `quotazioni_enriched_${timestamp}.csv`;

    // Percorso finale dentro /data
    const outPath = path.resolve(__dirname, "../data", fileName);

    // Scrivi il file (crea sempre un nuovo CSV)
    fs.writeFileSync(outPath, csvOut, "utf8");
    console.log(`✅  File creato: ${fileName}`);
  } catch (err) {
    console.error("Errore durante la modifica del CSV:", err);
  }
}

csvUnion();
