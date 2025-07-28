//Serve per costruire il percorso assoluto del file CSV, così funziona ovunque, anche se avvii da una cartella diversa.
import path from "path";
import { readCsv } from "../utils/csvReader.js";

export async function getPlayers(_, res) {
  try {
    //Trova il percorso assoluto del file
    const file = path.resolve("./data/database.csv");
    const rows = await readCsv(file);
    res.json(rows);

    console.log(rows);
  } catch (err) {
    res.status(500).json({ message: "Errore lettura CSV", err });
  }
}
