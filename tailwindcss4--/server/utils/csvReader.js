import fs from "fs";
import csv from "csv-parser";

/**
 * Legge un CSV e restituisce un array di record
 * @param {string} filePath percorso assoluto del CSV
 * @returns {Promise<Array<object>>}
 */
export function readCsv(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];

    fs.createReadStream(filePath)
      .pipe(
        csv({
          separator: ",", // <-- separatore giusto
          mapHeaders: ({ header }) => header.trim(), // rimuove spazi dai nomi colonna
        })
      )
      .on("data", (row) => {
        // converto l'id in numero (facoltativo ma comodo)
        if (row.id !== undefined) row.id = Number(row.id);

        rows.push(row);
      })
      .on("end", () => resolve(rows))
      .on("error", reject);
  });
}
