# DAS DORF – GAME DESIGN
**Version 0.4 – kompakte Source of Truth** (Änderungen ggü. 0.3: Dorfrat ohne Nominierung, Quest-Belohnungen, Grenzgänger, konfigurierbare Sonderrollen, Rollen-Direktor ohne Ausgleichslogik, Rollen-Timing, Nacht-Timing, Rudelgröße)

## 1. Kernidee
Werwolf/Social Deduction als echtes Multiplayer-Spiel ohne separaten Spielleiter.

Die App übernimmt Rollen, geheime Informationen, Chats, Phasen, Abstimmungen und Quests.  
Reden, Bluffen, Zeigen, Verdächtigen und Diskutieren passiert im echten Raum.

## 2. Parteien
### Dorf
Gewinnt sofort, wenn kein lebender Wolf mehr existiert.

### Rudel
Gewinnt sofort, wenn die Zahl lebender Wölfe mindestens so groß ist wie die Zahl aller übrigen lebenden Spieler.

## 3. Zwei Modi

### Klassisch
Keine feste Gesamtdauer.

`Tag → Dorfrat → Verbannung → bereit für Nacht → Nacht → Morgen → bereit für Tag`

Die lebenden Spieler bestätigen den Phasenwechsel. Das Spiel darf bei einem ausgefallenen Gerät nicht blockieren; der technische Host kann im Notfall fortsetzen.

### Abendmodus
Gewählte Zieldauer, z. B. 2–5 Stunden.

Die Engine verteilt Tage, Quests, Dorfräte und Nächte sinnvoll über die Zeit.  
Öffentlich sichtbar: aktuelle Phase und Countdown zur nächsten Nacht.

Wenn vorher eine Siegbedingung erreicht wird, endet das Spiel sofort.

## 4. Lobby
1. Host erstellt Raum.
2. Raumcode + QR-Code.
3. Jeder tritt mit Name bei, setzt persönlichen PIN und drückt `Bereit`.
4. Spielstart erst, wenn alle vorgesehenen Spieler verbunden und bereit sind.
5. Der Host wird danach normaler Spieler und kann jede Rolle bekommen.

Der Host hat nur technische Notfallrechte und darf nie Rollen oder geheime Entscheidungen anderer sehen.

## 5. Öffentliches Dashboard
Für alle lebenden Spieler grundsätzlich identisch.

Zeigt nur öffentliche Informationen:
- Phase / Tag
- Countdown oder Bereitschaft
- lebende / ausgeschiedene Spieler
- aktuelle Quest
- Dorfrat-Status
- öffentliche Chronik
- Nachrichten-Zugang
- PIN-geschützter Privatbereich

Das Dashboard darf niemals eine geheime Rolle verraten.

## 6. iPad-Dorfanzeige
Optionales Display ohne Spielerplatz.

Zeigt dieselben öffentlichen Informationen wie die Handys, nur größer und atmosphärischer.  
Keine geheimen Informationen, keine notwendige Interaktion, keine Werbung während der Partie.

## 7. Dorfrat
Ein offiziell gestarteter Dorfrat endet **immer mit genau einer Verbannung**.

Ablauf:
1. Diskussion im Raum
2. **Keine Nominierungsphase.** Jeder lebende Spieler wählt verbindlich in der App direkt jeden anderen wählbaren lebenden Spieler (nicht sich selbst).
3. Wenn alle Stimmen gesperrt sind, zeigen alle gleichzeitig im Raum auf ihre gewählte Person.
4. Die App/iPad inszeniert: `3 – 2 – 1 – ZEIGT!`
5. Erst danach wird das digitale Ergebnis gezeigt.
6. Gewählter Spieler scheidet sofort aus.

Die digitale Stimme verhindert nachträgliches Anpassen an das sichtbare Zeigen.

### Gleichstand
Zu Beginn wird ein öffentlicher **Dorfsprecher** gewählt (funktional der klassische Hauptmann).

Bei Gleichstand entscheidet der Dorfsprecher zwischen den gleichplatzierten Kandidaten.  
Scheidet er aus, wird ein neuer Dorfsprecher bestimmt.

## 8. Dorfrat im Abendmodus
Jeder lebende Spieler kann geheim `Bereit für Dorfrat` setzen oder zurücknehmen.

Andere sehen weder Namen noch Zwischenstand.

Bei ausreichender Mehrheit wird öffentlich:
`Das Dorf ist bereit für einen Dorfrat.`

Der Rat kann dann bewusst nach dem Essen / Gespräch gestartet werden.  
Einmal gestartet: kein Abbruch.

## 9. Nacht
In der Nacht handeln Rudel und aktuell aktive Sonderrollen.

### Rudel
- Die Rudelgröße je Spielerzahl ist **kein finaler Wert**; sie ist zentral konfigurierbar und wird per Simulation und Playtests balanciert (Spielerzahl × Wolfszahl × Sonderrollen).
- lebende Wölfe kennen einander
- eigener unsichtbarer Rudelchat
- Ziel kann während des Tages vorbereitet und geändert werden
- spätestens zur Nacht muss ein gültiges Ziel feststehen
- ausgeschiedene Wölfe verlieren sofort alle Rudelrechte

Wird das vorbereitete Ziel vorher verbannt, muss das Rudel neu wählen.

### Nacht-Timing (Timing-Schutz)
Keine Rolle und keine Aktion darf durch unterschiedlich lange Wartezeiten, Push-Timing oder Haptik erkennbar werden: Die Nacht hat eine für alle gleiche, feste Länge (kein vorzeitiges Ende, wenn „alle Handelnden fertig" sind), Zeitfenster für letzte Aktionen sind für alle gleich lang, Push-Texte/-Zeitpunkte und Haptik sind für alle identisch.

## 10. Private Kommunikation
Jeder lebende Spieler kann lebende Spieler privat anschreiben.

Rudelmitglieder haben zusätzlich einen geheimen gemeinsamen Kanal.  
Es gibt keinen sichtbaren Menüpunkt „Wolfschat“.

Push-Mitteilungen sind immer neutral, z. B.:
`Im Dorf gibt es eine neue Nachricht.`

Nie:
`Neue Nachricht im Wolfschat`
oder eine Rollenbezeichnung.

## 11. PIN / Geheimhaltung
Beim Join setzt jeder Spieler einen PIN.

PIN schützt:
- Rolle
- Sonderfähigkeiten
- geheime Informationen
- private Chats
- Rudelbereich

Nach kurzer Inaktivität Rückkehr zum neutralen Dashboard.

## 12. Tote / Verbannte
Ausgeschiedene Spieler sind im MVP aus dem aktiven Spiel raus.

Sie:
- stimmen nicht mehr ab
- chatten nicht mehr spielrelevant
- lösen keinen Dorfrat aus
- beeinflussen keine Quests
- benutzen keine Fähigkeiten

Sie dürfen den öffentlichen Status weiter sehen.

Kein Geister-/Jenseitsmodus im MVP.

## 13. Rollen-System: bewusst variabel
Die Partie soll **nicht jedes Mal mit denselben Sonderrollen starten**.

Die Engine erstellt anhand von Spielerzahl, Modus und Spielstand einen gewichteten Rollen-Pool.

Eine Partie kann:
- ohne Sonderrolle starten
- mit 1 Sonderrolle starten
- bei größeren Gruppen mit 2 starten
- weitere Rollen erst später freischalten

Dadurch wissen erfahrene Spieler nie sicher, welche Fähigkeiten gerade existieren.

### Rollen dürfen zu unterschiedlichen Zeitpunkten entstehen
Rollen können bei Spielstart oder später entstehen. Manche Rollen sind **ausschließlich Startrollen**. Spätere Freischaltungen sind an **vorher definierte** Ereignisse, Quests oder Phasen gekoppelt, z. B.:
- direkt beim Start
- nach einer ausdrücklich dafür konfigurierten Quest (bei erfolgreicher Erfüllung)
- nach dem ersten Dorfrat
- zu einem vorab definierten Tagesbeginn

Alle erhalten gleichzeitig einen neutralen Dorfimpuls. Nur der ausgewählte Spieler sieht die geheime Rolleninformation.

**Der Impuls verrät nie, ob tatsächlich eine Rolle vergeben wurde:** Er erscheint bei jedem vorab definierten Rollen-Moment, unabhängig davon, ob dabei eine Rolle vergeben wird (Moment und Vergabe sind getrennte, konfigurierbare Wahrscheinlichkeiten).

## 14. Rollen-Direktor / Balance
Zufall ja – aber **gewichteter Zufall innerhalb vorab erlaubter Rollen-Pools, Kombinationen und Freischaltzeitpunkte**.

**Kein verstecktes Dynamic Difficulty Balancing:** Die Engine vergibt nie spontan eine starke Gegenrolle, nur um eine Partie auszugleichen. Die aktuelle Stärke einer Partei (Zahl lebender Wölfe/Dorfbewohner, Informationsvorteil, Partieverlauf) fließt in keine Rollenentscheidung ein. Spieler sollen nicht das Gefühl bekommen, dass das System das Ergebnis korrigiert.

Vorab konfiguriert werden (alles datengetrieben, siehe `packages/engine/src/rules.ts`):
- welche Rollen aktiviert sind, ihr Gewicht (Häufigkeit) und die Mindestspielerzahl
- ob eine Rolle nur Startrolle ist bzw. zu welchen Auslösern/ab welchem Tag sie freigeschaltet werden darf
- erlaubte Kombinationen (z. B. höchstens eine Rolle aus einer Gruppe starker Informationsrollen)
- Anzahl Sonderrollen beim Start und Obergrenze für spätere Vergabe je Gruppengröße
- die Rudelgröße je Spielerzahl

Regeln:
- jede Sonderrolle höchstens einmal pro Partie
- in kleinen Gruppen weniger Sonderrollen
- im Finale (konfigurierbare Zahl lebender Spieler) keine neue Rolle mehr einführen
- Rollen mit Fraktionswahl nur zu Spielbeginn

Richtwert:
- 6–7 Spieler: 0–1 Sonderrolle zu Beginn, max. 1 weitere
- 8–10 Spieler: 0–2 zu Beginn, 1–2 weitere möglich
- 11–14 Spieler: 1–2 zu Beginn, 1–3 weitere möglich

Diese Werte sind Startwerte und werden durch Simulation und Playtests angepasst.

## 15. MVP-Rollenpool – eigene Bezeichnungen und Texte

> **Die folgenden Beschreibungen sind keine final balancierten Mechaniken.** Wirkung, Nutzungszahl, Häufigkeit und Aktivierung jeder Sonderrolle sind konfigurierbar (Startwerte in `rules.ts`) und werden gemeinsam entschieden. Offene Fähigkeiten werden nicht eigenmächtig als Produktregel festgeschrieben.

### Dorfbewohner
Keine Sonderfähigkeit.

### Wolf
Teil des Rudels, kennt andere Wölfe, beteiligt sich an Opferwahl.

### Späher
Informationsrolle. Darf begrenzt die Zugehörigkeit eines Spielers prüfen.  
Starke Rolle; selten und nicht zusammen mit zu vielen weiteren Informationsrollen.

### Fährtenleser
Wählt eine kleine Gruppe lebender Spieler. Erfährt nur, ob sich mindestens ein Wolf darunter befindet.  
Keine direkte Identifikation.

### Alchemistin
Besitzt zwei begrenzte Einmal-Aktionen: einmal Schutz vor einem nächtlichen Angriff und einmal eine offensive Aktion.  
Details und Timing müssen im Balancing finalisiert werden.

### Wächter
Kann nachts einen Spieler schützen. Dieselbe Person darf nicht dauerhaft geschützt werden.

### Grenzgänger
**Nur beim Spielstart.** Entscheidet geheim, ob er dem Dorf oder dem Rudel angehören möchte.  
Entscheidet er sich für das Rudel, ist er anschließend **vollständig Mitglied des Rudels**: Er erhält dessen Berechtigungen (Kenntnis der Wölfe, Rudelkanal, Rudelziel) und zählt für die Siegbedingung als Wolf.  
Mechanik bewusst eigenständig formulieren und gestalten.

### Jäger
Wenn er ausscheidet, kann eine begrenzte letzte Aktion ausgelöst werden.  
Nur in größeren Gruppen einsetzen; genaue Stärke im Playtest bestimmen.

### Wolf-Sonderrolle: Schattenwolf
Seltene Rudelrolle. Kann einmal eine Informationswirkung des Dorfes stören oder verschleiern.  
Keine dauerhafte Immunität.

## 16. Spätere Rollenideen
Nicht MVP, nur Pool für spätere Erweiterung:
- gekoppelte Vertrauensrollen
- Rollen mit einmaliger öffentlicher Aussage
- Ermittler mit indirekten Hinweisen
- Rollen mit Schutz-/Täuschungswirkung
- neutrale Einzelziele
- besondere Wolf-Varianten

Keine bestehenden Brettspiel-Rollentexte oder -Namen 1:1 übernehmen.

## 17. Dorfimpulse
Wenn eine geheime Information oder Rolle verteilt wird:
- alle lebenden Geräte reagieren gleichzeitig
- alle sehen denselben allgemeinen Impuls
- nur berechtigte Spieler sehen zusätzlich geheimen Inhalt
- möglichst gleiche Verweildauer

Allgemeine Impulse sind echte kurze Hinweise zu Beobachtung, Gruppendynamik oder Täuschung, keine offensichtlichen Fake-Texte.

## 18. Quests
Quests laufen innerhalb des Tages und sind klar vom Dorfrat/Nacht getrennt.

Ziele:
- Unterhaltung
- reale Interaktion
- Gesprächsstoff
- Verdachtsmomente

Geeignete Kategorien:
- **Einschätzen:** „Wer von euch …?“
- **Tabu:** Begriffe erklären, verbotene Wörter
- **Koordination:** ohne ausführliche Absprache dieselbe Antwort finden
- **Gemeinsames Wissen**
- **Sortieren**
- **Gedächtnis**
- **kleine Geschicklichkeitsaufgaben**

Wölfe spielen normal mit und können subtil sabotieren.

**Belohnungen:** Das bloße Abschließen einer Quest erzeugt keine automatische Belohnung. Die meisten Quests haben gar keine spielmechanische Belohnung. Nur ausdrücklich dafür konfigurierte Quests können bei **erfolgreicher Erfüllung** einen Hinweis, ein Ereignis oder eine neue Sonderrolle auslösen. Was als „erfolgreich" gilt, ist je Quest definiert (aktueller Startwert: alle Lebenden bestätigen die Erfüllung vor Ablauf der Zeit).

## 19. Überschneidungen
Nie zwei verbindliche Aktionen gleichzeitig.

Wenn eine Quest läuft und ein Dorfrat/Nacht ansteht:
1. laufende Quest sauber abschließen
2. Phasenwechsel
3. erst danach neue Aktion

## 20. Rollenoffenlegung
Default für den MVP: Rolle eines ausgeschiedenen Spielers wird nicht sofort offengelegt.  
Alle Rollen werden spätestens am Spielende aufgedeckt.

Diese Regel muss im Playtest gezielt validiert werden, darf aber nicht stillschweigend geändert werden.

## 21. Werbung / Werbefrei
Kostenlose App vollständig spielbar.

Werbung:
- nur Lobby, ruhige Dashboard-Momente oder nach Spielende
- nie vor/während Abstimmung, Quest, Nachtaktion oder Rollenaktion
- keine Rewarded Ads für Vorteile
- keine Werbung auf der iPad-Dorfanzeige während der Partie

Werbefrei gilt für die ganze vom Käufer gehostete Partie:
- 0,99 € / 1 Monat
- 2,99 € / 1 Jahr
- 4,99 € / Lifetime

Keine Paywall für Rollen, Modi oder Multiplayer.

## 22. Technische Kernanforderungen
- Server ist Source of Truth.
- Client erhält nur Daten, die dieser Nutzer wirklich sehen darf.
- Rollen-Geheimhaltung darf nicht nur UI-seitig erfolgen.
- Realtime-Zustände müssen gegen Race Conditions abgesichert sein.
- Reconnect mit Raum/Identität muss funktionieren.
- Ein offline/defektes Gerät darf die komplette Partie nicht blockieren.
- Game Engine so bauen, dass Zustände automatisiert simuliert und getestet werden können.

## 23. Rechtliche Designregel
Eigenständige Social-Deduction-Umsetzung.

Nicht übernehmen:
- fremde Logos / Marken
- ARD-Design oder Sendungsanimationen
- Asmodee-/Düsterwald-Karten, Texte, Claims oder konkrete Quest-Inhalte
- fremde Sounds/Musik
- 1:1-Rollenbeschreibungen

Eigene Marke, eigene Texte, eigene Rollenbezeichnungen, eigene Quests und eigene Gestaltung.
