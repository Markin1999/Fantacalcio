// Aggiornamento: menù filtri con sezione a tendina
import { useState, useEffect, useMemo } from "react";
import {
  Trash,
  Search,
  RefreshCcw,
  ChevronDown,
  ChevronUp,
  Filter,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const normalizeText = (text = "") =>
  String(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const PlayerDashboard = () => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [rmFilter, setRmFilter] = useState("Tutti");
  const [squadFilter, setSquadFilter] = useState("Tutte");
  const [minGoals, setMinGoals] = useState(0);
  const [minAssist, setMinAssist] = useState(0);
  const [minFM, setMinFM] = useState(0);
  const [minFVM, setMinFVM] = useState(0);

  const [showAdvanced, setShowAdvanced] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("http://127.0.0.1:5000/api/players");
        if (!res.ok) throw new Error("Risposta non valida");
        const raw = await res.json();

        setPlayers(
          raw.map((r) => ({
            id: r.id,
            rm: r.ruoloMantra,
            ruolo: r.ruolo,
            nome: r.nome,
            squadra: r.squadra,
            quotazioneAttualeClassic: r.quotazioneAttualeClassic,
            fvmClassic: r.fvmClassic,
            fm: r.fm,
            pv: r.pv,
            qtAM: r.qtAM,
            fvmM: r.fvmM,
            partite: r.partite,
            minuti: r.minuti,
            goal: r.goal,
            assist: r.assist,
            rigori: r.rigori,
            gialli: r.gialli,
            rossi: r.rossi,
            autogol: r.autogol,
          }))
        );
      } catch (err) {
        setError("Errore nel recupero dati: " + err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const squads = useMemo(
    () => ["Tutte", ...new Set(players.map((p) => p.squadra))],
    [players]
  );
  const ruoliRM = useMemo(
    () => ["Tutti", ...new Set(players.map((p) => p.ruolo))],
    [players]
  );

  const filtered = useMemo(
    () =>
      players.filter(
        (p) =>
          (squadFilter === "Tutte" || p.squadra === squadFilter) &&
          (rmFilter === "Tutti" || p.ruolo === rmFilter) &&
          normalizeText(p.nome).includes(normalizeText(search)) &&
          p.goal >= minGoals &&
          p.assist >= minAssist &&
          p.fm >= minFM &&
          p.fvmClassic >= minFVM
      ),
    [players, search, rmFilter, squadFilter, minGoals, minAssist, minFM, minFVM]
  );

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`http://127.0.0.1:5000/deleteUser/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Errore durante l'eliminazione");
      alert("Giocatore eliminato con successo!");
      setTimeout(() => location.reload(), 500);
    } catch (err) {
      alert("Errore: " + err.message);
    }
  };

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

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Cerca giocatore…"
                className="p-2 border rounded focus:outline-none"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              className="p-2 border rounded"
              value={squadFilter}
              onChange={(e) => setSquadFilter(e.target.value)}
            >
              {squads.map((s) => (
                <option key={`squad-${s}`}>{s}</option>
              ))}
            </select>

            <select
              className="p-2 border rounded"
              value={rmFilter}
              onChange={(e) => setRmFilter(e.target.value)}
            >
              {ruoliRM.map((r) => (
                <option key={`r-${r}`}>{r}</option>
              ))}
            </select>

            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1 p-2 border rounded bg-gray-100 hover:bg-gray-200"
            >
              <Filter className="w-4 h-4" />
              {showAdvanced ? "Nascondi filtri" : "Altri filtri"}
              {showAdvanced ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            <button
              className="p-2 border rounded bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => navigate("/creaGiocatore")}
            >
              ➕ Aggiungi
            </button>
          </div>

          {showAdvanced && (
            <div className="mt-4 flex flex-wrap gap-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex flex-col">
                <label className="text-xs text-gray-500">Min. Goal</label>
                <input
                  type="number"
                  value={minGoals}
                  onChange={(e) => setMinGoals(+e.target.value)}
                  className="w-24 p-2 border rounded"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-xs text-gray-500">Min. Assist</label>
                <input
                  type="number"
                  value={minAssist}
                  onChange={(e) => setMinAssist(+e.target.value)}
                  className="w-24 p-2 border rounded"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-xs text-gray-500">Min. FM</label>
                <input
                  type="number"
                  value={minFM}
                  onChange={(e) => setMinFM(+e.target.value)}
                  className="w-24 p-2 border rounded"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-xs text-gray-500">Min. FVM</label>
                <input
                  type="number"
                  value={minFVM}
                  onChange={(e) => setMinFVM(+e.target.value)}
                  className="w-24 p-2 border rounded"
                />
              </div>
              <button
                onClick={() => {
                  setSearch("");
                  setRmFilter("Tutti");
                  setSquadFilter("Tutte");
                  setMinGoals(0);
                  setMinAssist(0);
                  setMinFM(0);
                  setMinFVM(0);
                }}
                className="self-end p-2 border rounded bg-gray-200 hover:bg-gray-300"
              >
                Reset
              </button>
            </div>
          )}

          <div className="mt-2 text-sm text-gray-600">
            {filtered.length} / {players.length} giocatori trovati
          </div>
        </div>
      </nav>

      <div className="w-[90%] mx-auto px-4 py-6 grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => {
          const ruoloColor =
            {
              PORTIERE: "from-blue-600 to-blue-400",
              DIFENSORE: "from-green-600 to-green-400",
              CENTROCAMPISTA: "from-yellow-600 to-yellow-400",
              ATTACCANTE: "from-red-600 to-red-400",
            }[p.ruolo?.toUpperCase()] || "from-slate-600 to-slate-400";

          const stats = [
            { label: "🎯 FantaVoto", value: p.fvmClassic },
            { label: "📊 FantaMedia", value: p.fm },
            { label: "📝 Partite a voto", value: p.pv },
            { label: "⚽ Goal", value: p.goal },
            { label: "🎯 Assist", value: p.assist },
            { label: "🅿️ Rigori", value: p.rigori },
            { label: "🟨 Gialli", value: p.gialli },
            { label: "🟥 Rossi", value: p.rossi },
            { label: "💣 Autogol", value: p.autogol },
          ];

          return (
            <div
              key={p.id}
              className="relative bg-gradient-to-br from-slate-100 to-white rounded-2xl shadow-lg hover:shadow-2xl transition-all overflow-hidden border border-gray-200"
            >
              <div
                className={`h-28 bg-gradient-to-r ${ruoloColor} rounded-t-2xl px-4 py-2 flex flex-col justify-between relative`}
              >
                <span className="absolute top-2 right-2 text-yellow-300 text-base font-bold bg-black/30 px-2 py-1 rounded">
                  {p.quotazioneAttualeClassic}
                </span>
                <span className="text-white text-xs font-semibold bg-black/20 px-2 py-0.5 rounded self-start">
                  {p.ruolo?.toUpperCase()}
                </span>
                <h2 className="text-white text-lg font-extrabold truncate">
                  {p.nome}
                </h2>
                <p className="text-white text-xs italic truncate">
                  {p.squadra}
                </p>
              </div>

              <div className="p-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  {stats.map((stat) => (
                    <Stat
                      key={`${p.id}-${stat.label}`}
                      label={stat.label}
                      value={stat.value}
                    />
                  ))}
                </div>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="absolute bottom-3 right-3 text-red-500 hover:text-red-700 transition"
                  title="Elimina giocatore"
                >
                  <Trash className="w-5 h-5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Stat = ({ icon, label, value }) => (
  <div className="flex items-center gap-2">
    {icon}
    <span className="font-medium">{label}:</span>
    <span>{value}</span>
  </div>
);

export default PlayerDashboard;
