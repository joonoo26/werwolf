# Balance-Simulation (20.000 Partien je Zelle)

Bot-Verhaltensmodell: siehe `packages/engine/sim/policy.ts` (stark vereinfacht, symmetrisch; **kein Ersatz für Playtests**). Klassisch-Modus, Quest-Erfolg 50 %, Jäger deaktiviert.

## 6 Spieler

| Konfiguration | Dorf | Rudel | Ø Runden | ≤1 Runde | ≤2 Runden | Ø Lebende am Ende | Ø Rudel zu Beginn |
|---|---|---|---|---|---|---|---|
| 1 ohne Sonderrollen | 33.4 % | 66.6 % | 1.84 | 16.5 % | 100.0 % | 2.66 | 1.00 |
| 2 aktueller Rollen-Direktor | 40.4 % | 59.6 % | 1.83 | 16.9 % | 100.0 % | 2.74 | 1.00 |
| 3 Grenzgänger → Dorf (hypothetisch: Rolle erst ab 8 erlaubt) | 32.6 % | 67.4 % | 1.84 | 16.3 % | 100.0 % | 2.65 | 1.00 |
| 4 Grenzgänger → Rudel (hypothetisch: Rolle erst ab 8 erlaubt) | 6.9 % | 93.1 % | 1.33 | 66.7 % | 100.0 % | 3.40 | 2.00 |
| 3b Grenzgänger → Dorf (ohne Wolf-Ersatz) (hypothetisch: Rolle erst ab 8 erlaubt) | 32.8 % | 67.2 % | 1.84 | 16.3 % | 100.0 % | 2.66 | 1.00 |
| 4b Grenzgänger → Rudel (ohne Wolf-Ersatz) (hypothetisch: Rolle erst ab 8 erlaubt) | 6.8 % | 93.2 % | 1.33 | 66.7 % | 100.0 % | 3.40 | 2.00 |

Einfluss im aktuellen Rollen-Direktor (Dorf-Siegquote, wenn die Rolle in der Partie vorkam):

| Fall | Partien | Dorf-Siegquote |
|---|---|---|
| keine Sonderrolle | 9833 | 33.6 % |
| mindestens eine Sonderrolle | 10167 | 46.9 % |
| scout | 3356 | 48.3 % |
| tracker | 6811 | 46.2 % |

## 7 Spieler

| Konfiguration | Dorf | Rudel | Ø Runden | ≤1 Runde | ≤2 Runden | Ø Lebende am Ende | Ø Rudel zu Beginn |
|---|---|---|---|---|---|---|---|
| 1 ohne Sonderrollen | 26.2 % | 73.8 % | 2.46 | 0.0 % | 54.2 % | 3.08 | 2.00 |
| 2 aktueller Rollen-Direktor | 28.8 % | 71.2 % | 2.54 | 0.0 % | 47.5 % | 2.99 | 2.00 |
| 3 Grenzgänger → Dorf (hypothetisch: Rolle erst ab 8 erlaubt) | 28.4 % | 71.6 % | 2.58 | 13.9 % | 28.4 % | 2.85 | 1.00 |
| 4 Grenzgänger → Rudel (hypothetisch: Rolle erst ab 8 erlaubt) | 23.4 % | 76.6 % | 2.57 | 0.0 % | 42.6 % | 2.85 | 2.00 |
| 3b Grenzgänger → Dorf (ohne Wolf-Ersatz) (hypothetisch: Rolle erst ab 8 erlaubt) | 4.9 % | 95.1 % | 2.26 | 0.0 % | 73.7 % | 3.47 | 2.00 |
| 4b Grenzgänger → Rudel (ohne Wolf-Ersatz) (hypothetisch: Rolle erst ab 8 erlaubt) | 4.2 % | 95.8 % | 1.49 | 59.6 % | 91.4 % | 5.02 | 3.00 |

Einfluss im aktuellen Rollen-Direktor (Dorf-Siegquote, wenn die Rolle in der Partie vorkam):

| Fall | Partien | Dorf-Siegquote |
|---|---|---|
| keine Sonderrolle | 4720 | 21.7 % |
| mindestens eine Sonderrolle | 15280 | 30.9 % |
| guardian | 10270 | 27.6 % |
| scout | 3419 | 45.7 % |
| tracker | 6945 | 33.3 % |

## 8 Spieler

| Konfiguration | Dorf | Rudel | Ø Runden | ≤1 Runde | ≤2 Runden | Ø Lebende am Ende | Ø Rudel zu Beginn |
|---|---|---|---|---|---|---|---|
| 1 ohne Sonderrollen | 17.7 % | 82.3 % | 2.61 | 0.0 % | 38.9 % | 2.95 | 2.00 |
| 2 aktueller Rollen-Direktor | 32.7 % | 67.3 % | 2.60 | 1.7 % | 45.3 % | 3.29 | 1.87 |
| 3 Grenzgänger → Dorf | 62.4 % | 37.6 % | 2.56 | 12.8 % | 31.4 % | 3.51 | 1.00 |
| 4 Grenzgänger → Rudel | 10.9 % | 89.1 % | 2.57 | 0.0 % | 42.8 % | 2.96 | 2.00 |
| 3b Grenzgänger → Dorf (ohne Wolf-Ersatz) | 6.2 % | 93.8 % | 2.46 | 0.0 % | 53.6 % | 3.13 | 2.00 |
| 4b Grenzgänger → Rudel (ohne Wolf-Ersatz) | 1.9 % | 98.1 % | 1.48 | 62.5 % | 89.2 % | 5.05 | 3.00 |

Einfluss im aktuellen Rollen-Direktor (Dorf-Siegquote, wenn die Rolle in der Partie vorkam):

| Fall | Partien | Dorf-Siegquote |
|---|---|---|
| keine Sonderrolle | 2368 | 15.5 % |
| mindestens eine Sonderrolle | 17632 | 35.0 % |
| alchemist | 8648 | 31.4 % |
| borderwalker | 2516 | 58.2 % |
| guardian | 10584 | 33.7 % |
| scout | 3515 | 42.6 % |
| tracker | 7133 | 41.4 % |

## 9 Spieler

| Konfiguration | Dorf | Rudel | Ø Runden | ≤1 Runde | ≤2 Runden | Ø Lebende am Ende | Ø Rudel zu Beginn |
|---|---|---|---|---|---|---|---|
| 1 ohne Sonderrollen | 10.4 % | 89.6 % | 3.55 | 0.0 % | 2.7 % | 2.89 | 2.00 |
| 2 aktueller Rollen-Direktor | 44.2 % | 55.8 % | 3.43 | 1.3 % | 8.1 % | 3.22 | 1.89 |
| 3 Grenzgänger → Dorf | 55.4 % | 44.6 % | 3.11 | 11.1 % | 22.1 % | 3.77 | 1.00 |
| 4 Grenzgänger → Rudel | 21.9 % | 78.1 % | 3.30 | 0.0 % | 5.4 % | 3.40 | 2.00 |
| 3b Grenzgänger → Dorf (ohne Wolf-Ersatz) | 16.9 % | 83.1 % | 3.45 | 0.0 % | 5.7 % | 3.10 | 2.00 |
| 4b Grenzgänger → Rudel (ohne Wolf-Ersatz) | 7.8 % | 92.2 % | 2.72 | 0.0 % | 47.4 % | 4.57 | 3.00 |

Einfluss im aktuellen Rollen-Direktor (Dorf-Siegquote, wenn die Rolle in der Partie vorkam):

| Fall | Partien | Dorf-Siegquote |
|---|---|---|
| keine Sonderrolle | 2466 | 30.1 % |
| mindestens eine Sonderrolle | 17534 | 46.1 % |
| alchemist | 7348 | 43.0 % |
| borderwalker | 2224 | 67.2 % |
| guardian | 9219 | 42.9 % |
| scout | 3150 | 53.6 % |
| shadowwolf | 4275 | 41.6 % |
| tracker | 6167 | 59.3 % |

## 10 Spieler

| Konfiguration | Dorf | Rudel | Ø Runden | ≤1 Runde | ≤2 Runden | Ø Lebende am Ende | Ø Rudel zu Beginn |
|---|---|---|---|---|---|---|---|
| 1 ohne Sonderrollen | 8.1 % | 91.9 % | 2.79 | 0.0 % | 46.6 % | 4.50 | 3.00 |
| 2 aktueller Rollen-Direktor | 16.5 % | 83.5 % | 3.07 | 0.0 % | 32.6 % | 4.23 | 2.88 |
| 3 Grenzgänger → Dorf | 16.2 % | 83.8 % | 3.48 | 0.0 % | 2.2 % | 3.20 | 2.00 |
| 4 Grenzgänger → Rudel | 7.0 % | 93.0 % | 2.73 | 0.0 % | 46.9 % | 4.61 | 3.00 |
| 3b Grenzgänger → Dorf (ohne Wolf-Ersatz) | 4.2 % | 95.9 % | 2.64 | 0.0 % | 49.1 % | 4.76 | 3.00 |
| 4b Grenzgänger → Rudel (ohne Wolf-Ersatz) | 0.5 % | 99.5 % | 1.54 | 60.0 % | 87.3 % | 6.92 | 4.00 |

Einfluss im aktuellen Rollen-Direktor (Dorf-Siegquote, wenn die Rolle in der Partie vorkam):

| Fall | Partien | Dorf-Siegquote |
|---|---|---|
| keine Sonderrolle | 1722 | 2.3 % |
| mindestens eine Sonderrolle | 18278 | 17.9 % |
| alchemist | 8895 | 18.1 % |
| borderwalker | 2305 | 34.5 % |
| guardian | 10972 | 19.6 % |
| scout | 3721 | 21.7 % |
| shadowwolf | 5187 | 17.4 % |
| tracker | 7285 | 24.2 % |

## 12 Spieler

| Konfiguration | Dorf | Rudel | Ø Runden | ≤1 Runde | ≤2 Runden | Ø Lebende am Ende | Ø Rudel zu Beginn |
|---|---|---|---|---|---|---|---|
| 1 ohne Sonderrollen | 12.3 % | 87.8 % | 3.99 | 0.0 % | 0.0 % | 4.15 | 3.00 |
| 2 aktueller Rollen-Direktor | 30.9 % | 69.1 % | 4.36 | 0.0 % | 0.2 % | 3.92 | 2.84 |
| 3 Grenzgänger → Dorf | 23.3 % | 76.7 % | 4.37 | 0.0 % | 1.4 % | 3.50 | 2.00 |
| 4 Grenzgänger → Rudel | 4.7 % | 95.3 % | 3.79 | 0.0 % | 0.0 % | 4.47 | 3.00 |
| 3b Grenzgänger → Dorf (ohne Wolf-Ersatz) | 7.7 % | 92.3 % | 3.97 | 0.0 % | 0.0 % | 4.13 | 3.00 |
| 4b Grenzgänger → Rudel (ohne Wolf-Ersatz) | 1.3 % | 98.7 % | 2.92 | 0.0 % | 36.1 % | 6.17 | 4.00 |

Einfluss im aktuellen Rollen-Direktor (Dorf-Siegquote, wenn die Rolle in der Partie vorkam):

| Fall | Partien | Dorf-Siegquote |
|---|---|---|
| keine Sonderrolle | 0 | – |
| mindestens eine Sonderrolle | 20000 | 30.9 % |
| alchemist | 10786 | 29.2 % |
| borderwalker | 3123 | 43.9 % |
| guardian | 13370 | 31.2 % |
| scout | 6566 | 39.8 % |
| shadowwolf | 6478 | 25.0 % |
| tracker | 10798 | 41.2 % |

## 14 Spieler

| Konfiguration | Dorf | Rudel | Ø Runden | ≤1 Runde | ≤2 Runden | Ø Lebende am Ende | Ø Rudel zu Beginn |
|---|---|---|---|---|---|---|---|
| 1 ohne Sonderrollen | 5.4 % | 94.6 % | 4.19 | 0.0 % | 0.0 % | 5.67 | 4.00 |
| 2 aktueller Rollen-Direktor | 19.5 % | 80.5 % | 4.93 | 0.0 % | 0.0 % | 4.75 | 3.84 |
| 3 Grenzgänger → Dorf | 11.7 % | 88.3 % | 5.06 | 0.0 % | 0.0 % | 3.99 | 3.00 |
| 4 Grenzgänger → Rudel | 3.0 % | 97.0 % | 4.01 | 0.0 % | 0.0 % | 6.01 | 4.00 |
| 3b Grenzgänger → Dorf (ohne Wolf-Ersatz) | 5.2 % | 94.8 % | 4.40 | 0.0 % | 0.0 % | 5.24 | 4.00 |
| 4b Grenzgänger → Rudel (ohne Wolf-Ersatz) | 0.5 % | 99.5 % | 2.80 | 0.0 % | 52.6 % | 8.40 | 5.00 |

Einfluss im aktuellen Rollen-Direktor (Dorf-Siegquote, wenn die Rolle in der Partie vorkam):

| Fall | Partien | Dorf-Siegquote |
|---|---|---|
| keine Sonderrolle | 0 | – |
| mindestens eine Sonderrolle | 20000 | 19.5 % |
| alchemist | 11108 | 18.6 % |
| borderwalker | 3203 | 28.5 % |
| guardian | 13574 | 20.4 % |
| scout | 6819 | 27.1 % |
| shadowwolf | 6900 | 15.8 % |
| tracker | 11088 | 26.4 % |
