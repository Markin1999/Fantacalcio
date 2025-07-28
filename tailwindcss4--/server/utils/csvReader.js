import fs from "fs";
//Serve per leggere i file dal disco, in questo caso il CSV.
import csv from "csv-parser";
//serve per leggere file CSV riga per riga e convertirli in oggetti JavaScript.

export function readCsv(filePath) {
  return new Promise((res, rej) => {
    const rows = [];

    //Dice a Node.js: “Apri questo file CSV e leggilo a flusso, riga per riga”.
    fs.createReadStream(filePath)
      //Collega il flusso del file al parser CSV, che interpreta ogni riga.
      .pipe(csv())
      //Ogni volta che il parser legge una riga, la converte in oggetto e la passa a rows.
      .on("data", (row) => rows.push(row))
      //Quando il file è stato letto tutto, risolviamo la Promise passando l’array completo:
      .on("end", () => res(rows))
      //Se c’è un errore durante la lettura, la Promise viene rifiutata (con reject()).
      .on("error", rej);
  });
}
