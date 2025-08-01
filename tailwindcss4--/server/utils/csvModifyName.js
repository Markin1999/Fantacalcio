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

export async function csvModifyName() {
  try {
    // 1. Percorso del file CSV
    const filePath = path.resolve(__dirname, "../data/database.csv");

    // 2. Legge i dati usando il tuo reader personalizzato
    const dati = await readCsv(filePath); // Array di oggetti [{ player: "Marco", squad: "Inter", ... }]

    const mappaChiavi = {
      id: "id",
      ruolo: "R",
      ruoloMantra: "RM",
      nome: "Nome",
      squadra: "Squadra",
      quotazioneAttualeClassic: "Qt.A",
      quotazioneInizialeClassic: "Qt.I",
      differenzaClassic: "Diff.",
      quotazioneAttualeMantra: "Qt.A M",
      quotazioneInizialeMantra: "Qt.I M",
      differenzaMantra: "Diff.M",
      fvmClassic: "FVM",
      fvmMantra: "FVM M",
      partite: "partite",
      minuti: "minuti",
      goal: "goal",
      assist: "assist",
      rigori: "rigori",
      gialli: "gialli",
      rossi: "rossi",
      pv: "Pv",
      mv: "Mv",
      fm: "Fm",
      autogol: "Au",
    };

    const nuoviDati = dati.map((obj) => {
      const nuovoObj = {};
      for (let chiave in obj) {
        const nuovaChiave = mappaChiavi[chiave] || chiave;
        nuovoObj[nuovaChiave] = obj[chiave];
      }
      return nuovoObj;
    });

    // 5. Sovrascrive il file CSV
    fs.writeFileSync(filePath, unparse(nuoviDati), "utf8");

    console.log("CSV aggiornato con nuove colonne ✅");
  } catch (err) {
    console.error("Errore durante la modifica del CSV:", err);
  }
}

csvModifyName();
