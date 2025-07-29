import { useState, useEffect, useMemo } from "react";
import {
  Trash,
  Search,
  RefreshCcw,
  Clock,
  Target,
  Handshake,
  PenTool,
  AlertTriangle,
  AlertCircle,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

function normalizeText(text) {
  return text
    .normalize("NFD") // divide lettere da accenti
    .replace(/[\u0300-\u036f]/g, "") // rimuove accenti
    .toLowerCase();
}

const PlayerDashboard = () => {
  /** Stato */
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState("Tutti");
  const [squadFilter, setSquadFilter] = useState("Tutte");

  const navigate = useNavigate();

  /** Fetch iniziale */
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const res = await fetch("http://127.0.0.1:5000/api/players");
        if (!res.ok) throw new Error("Risposta non valida");
        const data = await res.json();
        setPlayers(data);
        console.log(data);
      } catch (err) {
        setError("Errore nel recupero dati: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPlayers();
  }, []);

  function handleAggiungiGiocatore() {
    navigate("/creaGiocatore");
  }

  /** Collezioni uniche per i menu a tendina */
  const squads = useMemo(
    () => ["Tutte", ...new Set(players.map((p) => p.squad))],
    [players]
  );
  const positions = useMemo(
    () => ["Tutti", ...new Set(players.map((p) => p.pos))],
    [players]
  );

  /** Filtra in base a search + filtri dropdown */
  const filtered = useMemo(() => {
    return players.filter(
      (p) =>
        (squadFilter === "Tutte" || p.squad === squadFilter) &&
        (posFilter === "Tutti" || p.pos === posFilter) &&
        normalizeText(p.player).includes(normalizeText(search))
    );
  }, [players, search, posFilter, squadFilter]);

  /** UI stato caricamento / errore */
  if (loading)
    return (
      <div className="flex items-center justify-center h-screen text-lg">
        Caricamento…
      </div>
    );
  if (error)
    return (
      <div className="text-red-600 flex justify-center mt-10">{error}</div>
    );

  const handleDelete = async () => {
    console.log("Eliminazione giocatore con ID:");
  };

  /** Render principale */
  return (
    <div className="h-screen w-screen bg-gray-100">
      {/* Navbar */}
      <nav className="bg-white w-full shadow sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row gap-3 md:gap-6 items-center">
          {/* Search */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Search className="w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Cerca giocatore…"
              className="w-full md:w-64 p-2 border rounded focus:outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Squadra */}
          <select
            className="p-2 border rounded focus:outline-none"
            value={squadFilter}
            onChange={(e) => setSquadFilter(e.target.value)}
          >
            {squads.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>

          {/* Posizione */}
          <select
            className="p-2 border rounded focus:outline-none"
            value={posFilter}
            onChange={(e) => setPosFilter(e.target.value)}
          >
            {positions.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>

          {/* Reset */}
          <button
            className="flex items-center gap-1 p-2 border rounded hover:bg-gray-50"
            onClick={() => {
              setSearch("");
              setPosFilter("Tutti");
              setSquadFilter("Tutte");
            }}
          >
            <RefreshCcw className="w-4 h-4" /> Reset
          </button>

          {/* 👉 Nuovo pulsante: Aggiungi Giocatore */}
          <button
            className="flex items-center gap-1 p-2 border rounded bg-blue-600 text-black hover:bg-blue-700 transition"
            onClick={handleAggiungiGiocatore} // <- Funzione da definire tu
          >
            ➕ Aggiungi Giocatore
          </button>

          {/* Contatore */}
          <span className="ml-auto text-sm text-gray-500">
            {filtered.length} / {players.length} giocatori
          </span>
        </div>
      </nav>

      {/* Cards */}
      <div className="w-[80%] mx-auto px-4 py-6 grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => (
          <div
            key={p.index}
            className="relative bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all"
          >
            {/* Header gradiente */}
            <div className="h-20 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-t-2xl flex items-center justify-between px-4">
              <h2 className="text-white text-lg font-bold truncate max-w-[70%]">
                {p.player}
              </h2>
              <span className="text-white text-sm whitespace-nowrap">
                {p.squad}
              </span>
            </div>

            {/* Contenuto */}
            <div className="p-4">
              <button
                onClick={() => handleDelete(p.index)}
                className="absolute bottom-3 right-3 text-red-500 hover:text-red-700 transition"
                title="Elimina giocatore"
              >
                <Trash className="w-5 h-5" />
              </button>
              {/* Posizione & Partite */}
              <div className="flex justify-between mb-3 text-xs font-medium">
                <span className="bg-gray-200 px-2 py-1 rounded-full">
                  {p.pos}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" /> {p.partite} partite
                </span>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <Stat
                  icon={<Clock className="w-4 h-4" />}
                  label="Minuti"
                  value={p.minuti}
                />
                <Stat
                  icon={<Target className="w-4 h-4" />}
                  label="Goal"
                  value={p.goal}
                />
                <Stat
                  icon={<Handshake className="w-4 h-4" />}
                  label="Assist"
                  value={p.assist}
                />
                <Stat
                  icon={<PenTool className="w-4 h-4" />}
                  label="Rigori"
                  value={p.rigori}
                />
                <Stat
                  icon={<AlertTriangle className="w-4 h-4 text-yellow-500" />}
                  label="Gialli"
                  value={p.gialli}
                />
                <Stat
                  icon={<AlertCircle className="w-4 h-4 text-red-500" />}
                  label="Rossi"
                  value={p.rossi}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Stat – sottocomponente per una singola statistica
 */
const Stat = ({ icon, label, value }) => (
  <div className="flex items-center gap-2">
    {icon}
    <span className="font-medium">{label}:</span>
    <span>{value}</span>
  </div>
);

export default PlayerDashboard;
