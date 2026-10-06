# Offene Entscheidungen / Interpretationen der Spezifikation

`GAME_DESIGN.md` bleibt Source of Truth. Die Spezifikation enthält keine Widersprüche, die ein Starten verhindert hätten,
aber einige **Lücken**, die für eine lauffähige Engine geschlossen werden mussten. Alle Zahlen liegen zentral in
`packages/engine/src/rules.ts` (Startwerte für Playtests); Interpretationen sind hier gesammelt und sollen im
Playtest bestätigt oder geändert werden. Nichts davon wurde stillschweigend als „Regel" festgeschrieben.

## Phase 6 (v0.7): Startwerte und echte offene Entscheidungen
Umgesetzt laut GAME_DESIGN.md §24. **Noch zu entscheiden / im Playtest zu prüfen:**
1. Beobachter: Mindestspielerzahl (Startwert 8), Gewicht (1), nur ein Fenster pro Nacht, Fensterlänge 10 s, Lebenszeichen-Toleranz 2,5 s.
2. Jäger bleibt trotz „ab 8 verfügbar" standardmäßig deaktiviert (Konfiguration `enabled`).
3. Heil-Fenster 40 s, Fallback bei Zeitablauf = „nicht eingreifen"; Verhalten der Alchemistin in Nächten ohne Rudelopfer (Kill-Intervall).
4. Momentdauer 20 s; `day_start`-Tag (3) und `noRoleChance` (0,5); maximale Vergaben je Rolle (Standard unbegrenzt), `maxLivingHolders` 1.
5. Quest-Freischaltung ohne möglichen Empfänger: entfällt (kein Ersatz).
6. Öffentliche Aufdeckung beim Ausscheiden ersetzt den alten MVP-Default (§20) – im Playtest validieren.
7. Jenseits-Nachrichten: Moderationsmethode (keine KI-Moderation geplant) offen; nicht umgesetzt.
8. Klang-Assets/Lizenz: nur Hook vorhanden.
9. Konto-/E-Mail-Verifizierungs-UI für das optionale dauerhafte Profil (Datenmodell + RPC vorbereitet); Altersuntergrenze (5) und Aufbewahrung der Fotos (12 h nach Spielende bzw. 2 Tage ohne Ende).
10. Host-Rollenmodi (aus/möglich/garantiert): Engine + Spalte `rooms.role_modes` vorhanden, noch keine UI und kein Setter-RPC.
11. Sonderaktionen laufen als einheitlicher Nacht-PIN-Bereich statt als eigene Phase innerhalb des Verdachtsmoments.

## Reward Director (GAME_DESIGN §25) – entschieden, als Playtest-Defaults
Bestätigt und umgesetzt: Mindestspielerzahlen (Späher ab 4 mit 1 Nutzung, Alchemistin/Fährtenleser ab 5, Beobachter/Jäger ab 8), Host darf mit Warnung abweichen, Kleingruppen-Vergabe bei ≥4 Lebenden, reservierter Slot für die erste Quest-Rolle, Phasengrenzen (Tag 2/4) und Faktoren (2/1) – alles konfigurierbare **Playtest-/Tuningwerte**, keine endgültige Balance. Das Budget ist eine Obergrenze, kein Ziel.
- Noch ohne Oberfläche: Anzeige der Host-Balance-Warnungen (Texte via `warningText`, Host-Setup-UI fehlt).
- Folge der Reservierung: Gibt es in einer Partie nie eine erfolgreiche Quest, vergeben Rollen-Momente höchstens `maxLaterSpecials − 1` Rollen (bei 4–7 Spielern also keine).
- Bei 4 Spielern sind bis zu 2 Sonderrollen möglich (zufällige Startrolle + Quest-Rolle); das ist Obergrenze, nicht Ziel.

## Entschieden (in GAME_DESIGN.md v0.6 festgeschrieben)
- **Spielerzahl 4–14.** Rudel: 4→1, 5→1, 6→1, 7→2, 8→2, 9→2, 10→3, 11→3, 12→3, 13→4, 14→4. **Kleingruppen 4–6**: Balance offen; Kill-Frequenz (`nightKillInterval`, Standard jede Nacht), Rollenpool und Informationsmechaniken je Spielerzahl konfigurierbar (eigenes Größenband `tiny`); keine neue Sonderregel. Bei 4–5 Spielern sind aktuell keine Sonderrollen erlaubt (Mindestspielerzahl der Rollen ≥ 6).
- **Grenzgänger standardmäßig deaktiviert**, vollständig implementiert und konfigurierbar (inkl. `borderwalkerReplacesWolf`); wird später separat getestet.
- **Balancing ist vorerst abgeschlossen.** Die Bot-Simulation (`docs/balance/`) ist nur ein technischer Baseline-Test; die Bots haben kaum Deduktion, die absoluten Siegquoten sind kein Balancing-Ergebnis. Keine Anpassung aufgrund der Simulationsergebnisse.

- **Dorfrat**: freie reale Diskussion → Gruppe eröffnet die digitale Abstimmung bewusst → jeder wählt direkt jeden anderen Lebenden → alle Stimmen gesperrt → 3‑2‑1‑ZEIGT! → erst dann das Ergebnis → Gleichstand entscheidet der Dorfsprecher. **Keine Nominierung, keine Verteidigungsphase, kein hartes Zeitlimit** (weder Diskussion noch Abstimmung). Ein ausgefallenes Gerät blockiert nie (Mehrheit + 60 s Karenz oder Host-Notfall). Immer genau eine Verbannung (ohne gültige Stimmen: Zufall).
- **Abendmodus**: Engine führt zeitlich (Richtwert 8 min, danach 3 min Gnadenfrist, dann automatische Eröffnung der Abstimmung), bricht die Diskussion nie abrupt ab; die Gruppe kann früher per Mehrheit eröffnen.
- **Quest-Belohnungen**: Abschließen allein belohnt nie; nur ausdrücklich konfigurierte Quests (`q-wissen-1` Hinweis, `q-koordination-1` Rollen-Moment) bei Erfolg (alle Lebenden bestätigen vor Ablauf der Zeit). Ereignis-Belohnungen vorbereitet, ungenutzt.
- **Grenzgänger** im Rudel = vollständiges Rudelmitglied (Kanal, Ziel, zählt als Wolf). **Rudelstärke**: Er ersetzt einen Wolf-Platz (`borderwalkerReplacesWolf`); Tabellenwert = Maximum, bei Dorfwahl ist das Rudel einen kleiner.
- **Rudelgröße** siehe oben (Startwerte, nicht final).
- **Sonderrollen datengetrieben** (`Rules.roles`). Startwerte: Fährtenleser 2 Nutzungen; Alchemistin nur ein Trank pro Nacht (`maxAbilitiesPerNight: 1`); Jäger technisch vorhanden, **standardmäßig deaktiviert**; Schattenwolf ab 9 Spielern.
- **Kein Dynamic Difficulty Balancing**: Vergabe nur aus vorab erlaubten Pools/Kombinationen/Freischaltzeitpunkten; Parteistärke fließt nirgends ein (Test).
- **Regeln**: ≤5 Lebende → keine neuen Sonderrollen; Späher + Fährtenleser nie gemeinsam bei 6–10 Spielern (je Partie gezählt, nicht nur lebende Träger), ab 11 erlaubt; 6 Spieler als Balancefall (1 Wolf, ≤1 Startrolle, ≤1 später, keine Informationskombination).
- **Rollen-Momente vereinfacht**: pro Moment eine Wahrscheinlichkeit `noRoleChance`; der Impuls erscheint bei jedem Moment. Startwerte: Quest 30 %, nach erstem Dorfrat 50 %, Tag 3 50 % „keine Rolle".
- **Nacht-/Timing-Schutz** bleibt: feste Nachtlänge, feste Fenster, identische Impulse/Haptik/Push.

## Weiterhin offen / Annahmen (bitte prüfen)
1. **„Erfolgreiche Erfüllung" einer Quest** = alle Lebenden bestätigen vor Ablauf der Zeit (Startwert, je Quest anpassbar).
2. **Kombinationslimit** zählt je Partie (auch ausgeschiedene Träger), nicht nur „aktive/lebende".
3. **Rudelziel**: Mehrheit der Rudelstimmen, bei Gleichstand/ohne Vorschlag zufälliges zulässiges Ziel; änderbar bis Nachtende.
4. **Nacht fix** (kein vorzeitiges Ende); Jäger-Schuss (falls aktiviert) im festen Ergebnisfenster, öffentlich sichtbar.
5. **Dorfsprecher-Wahl** am ersten Tag und nach Ausscheiden des Sprechers (Gleichstand: Zufall).
6. **Phasenwechsel im Klassik-Modus**: alle bestätigt oder Mehrheit + 60 s Karenz; Host kann im Notfall erzwingen.
7. **Abendmodus**: ein Dorfrat pro Tag, Eröffnung spätestens zur geplanten Zeit; Nacht zum geplanten Zeitpunkt (früher per Mehrheit); Zeitplanung nach Worst-Case-Rundenzahl.
8. **Gleichzeitiger Sieg beider Seiten** (niemand lebt): Dorf hat Vorrang. Dorfanzeige = eigener Raumzugang, kein Spielerplatz. Ausgeschiedene sehen nur ihre eigene Privatsicht, keine Chats.

Aktuelle Zahlen/Tabellen: `npm run balance:table`. Simulationen: `npm run simulate` (siehe `docs/BALANCE_SIMULATION.md` nach einem Lauf).

## Bewusst nicht umgesetzt (außerhalb des MVP-Umfangs / benötigt Accounts)
- Werbe-SDK und In-App-Käufe (RevenueCat/StoreKit): Regeln sind in `apps/mobile/src/logic/ads.ts` getestet, `rooms.ad_free` existiert; Anbindung braucht Store-Accounts.
- Eigene Illustrationen/Sounds/Musik: Aktuell reduzierte, selbst erstellte SVG-Grafiken. Finale Artwork/Audio vor Release erstellen/lizenzieren.
- Markenprüfung für „DAS DORF" steht aus (siehe CLAUDE.md).
- Fremdsprachen: UI-Texte zentral in `apps/mobile/src/ui/strings.ts` (nur Deutsch).
