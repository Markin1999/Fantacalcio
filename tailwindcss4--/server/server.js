import express, { json } from "express";
import cors from "cors";
import {
  addPlayerToCsv,
  deletePlayerFromCsv,
  getPlayers,
} from "./controllers/csvController.js";

const app = express();

app.use(json());
app.use(cors());

app.get("/api/players", getPlayers);
app.post("/addUser", addPlayerToCsv);
app.delete("/deleteUser/:id", deletePlayerFromCsv);

app.listen(5000, "127.0.0.1", () => {
  console.log("Server avviato su http://127.0.0.1:5000");
});
