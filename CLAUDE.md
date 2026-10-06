# CLAUDE.md

## Projekt
**DAS DORF** ist eine eigenständige Social-Deduction-App für iPhone/iPad, später Android.

Die verbindlichen Vorgaben stehen in:
- `docs/GAME_DESIGN.md` – Spielregeln und Produktlogik
- `docs/STYLE_GUIDE.md` – UI/UX und visuelle Identität
- `SKILLS.md` – Skills/Plugins, die bei passenden Aufgaben genutzt werden sollen

## Arbeitsweise
- Entscheide technische Architektur, Dateistruktur und Implementierungsreihenfolge selbst sinnvoll.
- Halte die Lösung so einfach wie möglich, aber produktionsreif.
- Erfinde keine neuen Spielregeln oder Designprinzipien.
- Bei echten Widersprüchen in den Spezifikationen: nachfragen. Bei normalen technischen Detailentscheidungen: selbst entscheiden.
- Nutze aktuelle stabile Versionen und offizielle Dokumentation/Skills.
- Baue iPhone und iPad zuerst. Android muss architektonisch möglich bleiben.
- Bevorzuge Expo + React Native + TypeScript und Supabase, sofern kein klarer technischer Grund dagegen spricht.

## Nicht verhandelbare Regeln
- Das eigentliche Spiel passiert zwischen Menschen, nicht auf dem Display.
- Kein Client darf geheime Informationen erhalten, die dieser Spieler nicht sehen darf.
- Keine Rolle darf durch Push-Text, Vibration, Timing oder sichtbare Navigation verraten werden.
- Private Informationen sind PIN-geschützt; die App fällt nach Inaktivität auf ein neutrales Dashboard zurück.
- iPad ist nur optionale öffentliche Dorfanzeige; niemals Voraussetzung.
- Tote Spieler sind aus dem aktiven Spiel raus.
- Ein gestarteter Dorfrat endet immer mit genau einer Verbannung.
- Werbung darf niemals eine aktive Spielhandlung blockieren.
- Keine Pay-to-win-Mechanik.

## Recht / Marke
- `DAS DORF` ist Arbeits-/Produktname, bis Markenprüfung final abgeschlossen ist.
- Keine ARD-, Asmodee- oder „Werwölfe von Düsterwald“-Grafiken, Texte, Sounds, Claims, Quest-Inhalte, Karten oder konkrete UI übernehmen.
- Keine 1:1-Kopie bekannter Rollenbeschreibungen.
- Grundmechaniken von Social Deduction dürfen eigenständig umgesetzt werden.
- Eigene Namen, Texte, Illustrationen, Animationen und Quest-Inhalte verwenden.

## Qualität
- Kritische Game-Engine-Logik automatisiert testen.
- Realtime-, Berechtigungs- und RLS-Logik besonders streng testen.
- Accessibility, Dynamic Type, VoiceOver und Reduce Motion berücksichtigen.
- Keine Secrets committen.
