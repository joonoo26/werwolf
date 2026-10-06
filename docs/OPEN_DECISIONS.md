# Offene Entscheidungen / Interpretationen der Spezifikation

`GAME_DESIGN.md` bleibt Source of Truth. Die Spezifikation enthält keine Widersprüche, die ein Starten verhindert hätten,
aber einige **Lücken**, die für eine lauffähige Engine geschlossen werden mussten. Alle Zahlen liegen zentral in
`packages/engine/src/rules.ts` (Startwerte für Playtests); Interpretationen sind hier gesammelt und sollen im
Playtest bestätigt oder geändert werden. Nichts davon wurde stillschweigend als „Regel" festgeschrieben.

## Entschieden (in GAME_DESIGN.md v0.4 festgeschrieben)
- **Dorfrat ohne Nominierung**: Jeder Lebende wählt direkt jeden anderen Lebenden → alle Stimmen gesperrt → 3‑2‑1‑ZEIGT! → erst dann das digitale Ergebnis → Gleichstand entscheidet der Dorfsprecher. Immer genau eine Verbannung (ohne gültige Stimmen oder Entscheidung: Zufall).
- **Quest-Belohnungen**: Abschließen allein belohnt nie. Nur ausdrücklich konfigurierte Quests (`QuestDef.reward`) lösen bei Erfolg Hinweis/Ereignis/Rollen-Moment aus. Aktuell konfiguriert: `q-wissen-1` (Hinweis), `q-koordination-1` (Rollen-Moment); Ereignis-Belohnungen sind vorbereitet, aber keine Quest nutzt sie.
- **Grenzgänger im Rudel** = vollständiges Rudelmitglied inkl. Kanal/Ziel/Wolf-Zählung.
- **Sonderrollen datengetrieben** (`Rules.roles`): Wirkung (`abilities`), Häufigkeit (`weight`), Aktivierung (`enabled`, `minPlayers`, `unlock`) konfigurierbar. Nichts davon ist Produktregel.
- **Kein Dynamic Difficulty Balancing**: Rollenvergabe nur aus vorab erlaubten Pools/Kombinationen/Freischaltzeitpunkten; Stärke der Parteien fließt nirgends ein (Test vorhanden).
- **Rollen-Timing**: Start oder später an vorab definierten Momenten. Der Impuls erscheint bei jedem Moment unabhängig davon, ob etwas vergeben wird (`momentChance` vs. `grantChance`).
- **Nacht-/Timing-Schutz** bleibt: feste Nachtlänge, feste Fenster, identische Impulse/Haptik/Push.
- **Rudelgröße** ist ein zentral konfigurierbarer Startwert (`wolvesByPlayers`), nicht final.

## Weiterhin offen / Annahmen (bitte prüfen)
1. **Verteidigungsphase entfällt**: Ohne Nominierung gibt es keine Kandidaten mehr, daher läuft der Dorfrat direkt als Abstimmung (Dauer 180 s). Falls eine eigene Verteidigungsrunde gewünscht ist, bitte sagen.
2. **„Erfolgreiche Erfüllung" einer Quest** = alle Lebenden bestätigen vor Ablauf der Zeit (Startwert, je Quest anpassbar).
3. **Finale-Regel** („im Finale keine neue Rolle", aus §14 übernommen): zustandsabhängig (Zahl Lebender ≤ 5), aber nicht stärkebasiert; abschaltbar mit `finaleAlive: 0`. Bitte bestätigen oder streichen.
4. **Kombinationslimit** Späher + Fährtenleser: höchstens eine Rolle der Gruppe bei 6–10 Spielern, zwei ab 11 (vorab definiert, kein Stärkevergleich).
5. **Rudelziel**: Mehrheit der Rudelstimmen, bei Gleichstand/ohne Vorschlag zufälliges zulässiges Ziel; änderbar bis Nachtende.
6. **Nacht fix** (kein vorzeitiges Ende) und **Jäger-Schuss** im festen Ergebnisfenster (wirksam am Fensterende); der Schuss selbst ist öffentlich sichtbar.
7. **Dorfsprecher-Wahl** am ersten Tag und nach Ausscheiden des Sprechers (Gleichstand: Zufall).
8. **Phasenwechsel im Klassik-Modus**: alle bestätigt oder Mehrheit + 60 s Karenz; Host kann im Notfall erzwingen.
9. **Abendmodus**: ein Dorfrat pro Tag, automatischer Start zur spätesten Zeit; Nacht zum geplanten Zeitpunkt (früher per Mehrheit); Zeitplanung nach Worst-Case-Rundenzahl.
10. **Gleichzeitiger Sieg beider Seiten** (niemand lebt): Dorf hat Vorrang. Dorfanzeige = eigener Raumzugang, kein Spielerplatz. Ausgeschiedene sehen nur ihre eigene Privatsicht (für den letzten Schuss), keine Chats.

Aktuelle Zahlen/Tabellen: `npm run balance:table`.

## Bewusst nicht umgesetzt (außerhalb des MVP-Umfangs / benötigt Accounts)
- Werbe-SDK und In-App-Käufe (RevenueCat/StoreKit): Regeln sind in `apps/mobile/src/logic/ads.ts` getestet, `rooms.ad_free` existiert; Anbindung braucht Store-Accounts.
- Eigene Illustrationen/Sounds/Musik: Aktuell reduzierte, selbst erstellte SVG-Grafiken. Finale Artwork/Audio vor Release erstellen/lizenzieren.
- Markenprüfung für „DAS DORF" steht aus (siehe CLAUDE.md).
- Fremdsprachen: UI-Texte zentral in `apps/mobile/src/ui/strings.ts` (nur Deutsch).
