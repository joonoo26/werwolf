# Offene Entscheidungen / Interpretationen der Spezifikation

`GAME_DESIGN.md` bleibt Source of Truth. Die Spezifikation enthält keine Widersprüche, die ein Starten verhindert hätten,
aber einige **Lücken**, die für eine lauffähige Engine geschlossen werden mussten. Alle Zahlen liegen zentral in
`packages/engine/src/rules.ts` (Startwerte für Playtests); Interpretationen sind hier gesammelt und sollen im
Playtest bestätigt oder geändert werden. Nichts davon wurde stillschweigend als „Regel" festgeschrieben.

## Interpretationen (bitte prüfen)
1. **Rudelgröße**: `max(2, round(n / 3.5))` (6–7 → 2, 9–11 → 3, 13–14 → 4). Spielerzahl 6–14.
2. **Grenzgänger** zählt nach Wahl „Rudel" für Siegbedingungen und Rudelrechte als Rudelmitglied. Ohne Wahl bis zur ersten Nacht bleibt er im Dorf.
3. **Rudelziel**: Jedes lebende Rudelmitglied schlägt ein Ziel vor (auch tagsüber, änderbar bis Nachtende); Mehrheit entscheidet, bei Gleichstand/ohne Vorschlag wählt der Server zufällig ein zulässiges Ziel. Ungültige Stimmen (Ziel verbannt) verfallen.
4. **Nachtlänge fix** (kein vorzeitiges Ende), damit Timing keine Rollen verrät.
5. **Späher**: 2 Nutzungen. **Fährtenleser**: Gruppe aus 3, 3 Nutzungen. **Alchemistin**: je ein Schutz- und ein Angriffstrank, beide auch in derselben Nacht; Schutz blockiert den Rudelangriff, nicht den Angriffstrank. **Wächter**: nicht dieselbe Person zwei Nächte in Folge (Selbstschutz erlaubt). **Schattenwolf**: einmal pro Spiel; macht alle Informationsergebnisse dieser Nacht „unklar" (die Nutzung des Informanten ist verbraucht).
6. **Jäger**: letzter Schuss auf eine lebende Person. Der Schuss gilt im Ergebnisfenster (Ergebnisanzeige des Dorfrats bzw. Morgen) und wird erst am Ende des Fensters wirksam, damit Zeitpunkt/UI nichts verraten. Der Schuss selbst ist öffentlich sichtbar (unvermeidlich).
7. **Dorfsprecher-Wahl**: öffentliche Wahl am ersten Tag und immer, wenn der Dorfsprecher ausgeschieden ist (Stimmen für andere; Gleichstand zufällig). Sprecher entscheidet Gleichstand im Dorfrat unter den Gleichplatzierten.
8. **Dorfrat-Ablauf**: Nominierung (jeder nennt eine andere Person) → die bis zu 3 meistgenannten (inkl. Gleichstand an der Grenze; ohne Nennung alle Lebenden) sind Kandidaten → Verteidigung → verbindliche Stimme (nicht für sich selbst) → 3‑2‑1‑ZEIGT! → Ergebnis (nur Zählung, nie wer wie gewählt hat). Nur ein Kandidat → direkt verbannt. Ohne gültige Stimmen oder Entscheidung: Zufall, damit **immer genau eine Verbannung** entsteht.
9. **Phasenwechsel im Klassik-Modus**: alle Lebenden bestätigt ⇒ weiter; Mehrheit + 60 s Karenz ⇒ weiter; Host kann im Notfall erzwingen. Gleiches gilt für „Bereit für Dorfrat".
10. **Abendmodus**: Pro Tag genau ein Dorfrat; startet automatisch zum spätesten Zeitpunkt, wenn niemand ihn vorher startet. Nacht zum geplanten Zeitpunkt (früher per Mehrheit). Zeitplanung: verbleibende Zeit / Rundenzahl im ungünstigsten Fall bis zur Rudel-Siegbedingung. Wird die Zieldauer überschritten, läuft das Spiel mit Mindesttageslänge weiter.
11. **Quests**: Der Server startet Quests im Tag (nie parallel zu Dorfrat/Nacht; laufende Quest wird abgeschlossen). „Fertig" bestätigen alle selbst; die Quest endet bei Zeitablauf oder wenn alle fertig sind. Belohnungen (`role`/`hint`) werden bei **Abschluss** vergeben, nicht nach „Erfolg". „Hinweis" = zusätzlicher Dorfimpuls.
12. **Rollen-Direktor**: Richtwerte nach §14 (Start 0–1 / 0–2 / 1–2, später max. 1 / 2 / 3), Informationsbudget (Späher 2, Fährtenleser 1), kein neuer Rolleneintrag im Finale (≤ 5 Lebende) oder bei fast entschiedener Partie. Auslöser: Start, Quest-Belohnung, nach dem ersten Dorfrat, Tagesbeginn ab Tag 2.
13. **Gleichzeitiger Sieg beider Seiten** (niemand lebt): Dorf hat Vorrang.
14. **Dorfanzeige** ist ein eigener Raum-Zugang (`join_display`), kein Spielerplatz.
15. **Ausgeschiedene** sehen weiter ihre eigene Privatsicht (nötig für den letzten Schuss), aber keine Chats.

## Bewusst nicht umgesetzt (außerhalb des MVP-Umfangs / benötigt Accounts)
- Werbe-SDK und In-App-Käufe (RevenueCat/StoreKit): Regeln sind in `apps/mobile/src/logic/ads.ts` getestet, `rooms.ad_free` existiert; Anbindung braucht Store-Accounts.
- Eigene Illustrationen/Sounds/Musik: Aktuell reduzierte, selbst erstellte SVG-Grafiken. Finale Artwork/Audio vor Release erstellen/lizenzieren.
- Markenprüfung für „DAS DORF" steht aus (siehe CLAUDE.md).
- Fremdsprachen: UI-Texte zentral in `apps/mobile/src/ui/strings.ts` (nur Deutsch).
