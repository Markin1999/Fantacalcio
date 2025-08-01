# 📑 README – Linee guida per la generazione di **nuovi valori** nel CSV giocatori

> **Obiettivo:** trasformare il semplice “foglio anagrafico” in un dataset ricco di **metriche
> predittive**, pronto per i modelli di ottimizzazione formazione/rosa.

---

## 1 ▪ Struttura minima del CSV (`database.csv`)

| Colonna originale | Tipo  | Obbl. | Note                                                |
| ----------------- | ----- | ----- | --------------------------------------------------- |
| `id`              | int   | ✔︎    | chiave primaria                                     |
| `Nome`            | str   | ✔︎    | Nome + Cognome                                      |
| `Squadra`         | str   | ✔︎    | denominazione unica (uppercase, no accenti)         |
| `RM`              | int   | ✔︎    | ruolo numerico (1 = POR, 2 = DEF, 3 = MED, 4 = ATT) |
| `Qt.A M`          | float | ✔︎    | quotazione Asta Magic                               |
| `FVM M`           | float | ✔︎    | fantamedia Magic                                    |
| `partite`         | int   | ✔︎    | giocate stagione corrente                           |
| `minuti`          | int   | ✔︎    | minuti totali                                       |
| `goal`            | int   | ✔︎    | gol realizzati                                      |
| `assist`          | int   | ✔︎    | assist                                              |
| `rigori`          | int   | ✔︎    | rigori calciati                                     |
| `gialli`          | int   | ✔︎    | cartellini gialli                                   |
| `rossi`           | int   | ✔︎    | cartellini rossi                                    |

> **Regola di naming:** al salvataggio, rinominare subito in camelCase (`qtAm`, `fvmM`, …).

---

## 2 ▪ Nuove colonne da calcolare

| Nuova colonna  | Formula / descrizione                                           | Scopo                       |
| -------------- | --------------------------------------------------------------- | --------------------------- |
| `goal90`       | `goal / (minuti/90)`                                            | rendimento puro             |
| `assist90`     | `assist / (minuti/90)`                                          |                             |
| `ga90`         | `goal90 + assist90`                                             | gol + assist per 90'        |
| `gialliRate`   | `gialli / minuti`                                               | disciplina                  |
| `rossiRate`    | `rossi / minuti`                                                |                             |
| `points90`     | **tua scoring‑rule** su 90' (es. +3 × gol …)                    | fantapunteggio normalizzato |
| `price`        | `round(fvmM)` **oppure** `qtAm` (scegli UNA logica)             | costo‑credito               |
| `club`         | estratto da `Squadra`                                           | join facile col calendario  |
| `eligible`     | 1 se `minuti ≥ 450` **e** `rossi ≤ 1` **e** `gialliRate ≤ 0,02` | flag                        |
| `formLast3`    | media `points90` negli ultimi 3 match                           | forma breve                 |
| `eloClub`      | ELO aggiornato della squadra                                    | difficoltà calendario       |
| `fixtureDiffN` | media difficoltà prossime **N** gare (1‑5)                      | strength‑of‑schedule        |
| `expPointsN`   | punti attesi somma GWs (vedi § 4)                               | input ottimizzatore         |

---

## 3 ▪ Dataset calendario (`fixtures.csv`)

| Campo     | Tipo  | Obbl.                   |
| --------- | ----- | ----------------------- |
| `gw`      | int   | ✔︎                      |
| `date`    | date  | ✔︎ (UTC)                |
| `home`    | str   | ✔︎                      |
| `away`    | str   | ✔︎                      |
| `eloHome` | float | opz. (calc. on‑the‑fly) |
| `eloAway` | float | opz.                    |

_Normalizza i nomi squadra_ con la stessa funzione usata per `players.csv`.

---

## 4 ▪ Calcolo **punti attesi** (per scaglione di gameweek)

```text
expPoints_gw = points90 × prob_titolare × adj_fixture
```
