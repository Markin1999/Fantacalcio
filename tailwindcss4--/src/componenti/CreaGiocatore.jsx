import { useState } from "react";
import { useNavigate } from "react-router-dom";

const squadreDisponibili = [
  "Udinese",
  "Roma",
  "Como",
  "Milan",
  "Genoa",
  "Inter",
  "Torino",
  "Fiorentina",
  "Juventus",
  "Bologna",
];

const ruoliDisponibili = ["DC/CC", "DC", "CC", "A", "CC/A"];

function creaGiocatore() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    player: "",
    squad: squadreDisponibili[0],
    pos: ruoliDisponibili[0],
    partite: "0",
    minuti: "0",
    goal: "0",
    assist: "0",
    rigori: "0",
    gialli: "0",
    rossi: "0",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    try {
      const res = await fetch("http://127.0.0.1:5000/addUser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error("Errore durante il salvataggio");
      alert("Giocatore salvato con successo!");
      navigate("/");
    } catch (err) {
      alert("Errore: " + err.message);
    }
  };

  return (
    <div className="h-screen w-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-2xl">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
          📋 Crea un nuovo giocatore
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="player" className="block font-semibold mb-1">
              Nome giocatore
            </label>
            <input
              id="player"
              name="player"
              className="w-full p-2 border border-gray-300 rounded-md"
              value={form.player}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label htmlFor="squad" className="block font-semibold mb-1">
              Squadra
            </label>
            <select
              id="squad"
              name="squad"
              className="w-full p-2 border border-gray-300 rounded-md"
              value={form.squad}
              onChange={handleChange}
              required
            >
              {squadreDisponibili.map((squad) => (
                <option key={squad} value={squad}>
                  {squad}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="pos" className="block font-semibold mb-1">
              Ruolo
            </label>
            <select
              id="pos"
              name="pos"
              className="w-full p-2 border border-gray-300 rounded-md"
              value={form.pos}
              onChange={handleChange}
            >
              {ruoliDisponibili.map((ruolo) => (
                <option key={ruolo} value={ruolo}>
                  {ruolo}
                </option>
              ))}
            </select>
          </div>

          {[
            { id: "partite", label: "Partite giocate" },
            { id: "minuti", label: "Minuti giocati" },
            { id: "goal", label: "Goal" },
            { id: "assist", label: "Assist" },
            { id: "rigori", label: "Rigori" },
            { id: "gialli", label: "Gialli" },
            { id: "rossi", label: "Rossi" },
          ].map(({ id, label }) => (
            <div key={id}>
              <label htmlFor={id} className="block font-semibold mb-1">
                {label}
              </label>
              <input
                id={id}
                name={id}
                type="number"
                className="w-full p-2 border border-gray-300 rounded-md"
                value={form[id]}
                onChange={handleChange}
              />
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col md:flex-row justify-between gap-3">
          <button
            className="w-full md:w-auto px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition"
            onClick={() => navigate("/")}
          >
            🔙 Chiudi
          </button>
          <button
            className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
            onClick={handleSubmit}
          >
            💾 Salva giocatore
          </button>
        </div>
      </div>
    </div>
  );
}

export default creaGiocatore;
