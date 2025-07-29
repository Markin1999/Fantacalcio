import { useEffect } from "react";
import "./App.css";
import PlayerDashboard from "./componenti/PlayersDashboard";
import CreaGiocatore from "./componenti/CreaGiocatore";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Supponiamo che tu abbia un array iniziale di utenti
const utenti = []; // Puoi modificarlo con i tuoi dati iniziali

function App() {
  useEffect(() => {
    localStorage.setItem("utentiRegistrati", JSON.stringify(utenti));
  }, []);

  return (
    <div>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PlayerDashboard />} />
          <Route path="/creaGiocatore" element={<CreaGiocatore />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
