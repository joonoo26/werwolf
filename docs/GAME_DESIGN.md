# DAS DORF – GAME DESIGN
**Version 0.7 – kompakte Source of Truth** (v0.7: Reward Director für Quest-Rollen (§25), synchrone geheime Momente (Variante A), eine Sonderrolle pro Person, Verdachtsabgabe vor der Nacht, Beobachter/Ausschau, Alchemistin nur Heilung, öffentliche Aufdeckung, Profile; Details §24. v0.6: 4–14 Spieler, Kleingruppen 4–6 mit offener Balance, Grenzgänger standardmäßig deaktiviert, Kill-Frequenz konfigurierbar)

**Version 0.5** (Änderungen ggü. 0.3: Dorfrat ohne Nominierung/Verteidigung und ohne hartes Zeitlimit, Quest-Belohnungen, Grenzgänger inkl. Rudelstärke, konfigurierbare Sonderrollen, Rollen-Direktor ohne Ausgleichslogik, einfache Rollen-Momente, Nacht-Timing, Startwerte für Rudelgröße und Rollen)

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
1. **Freie reale Diskussion** im Raum – keine Nominierungs- und keine separate Verteidigungsphase, **kein hartes Zeitlimit**. Die Gruppe eröffnet die digitale Abstimmung bewusst (Bereitschaft der Mehrheit).
2. Jeder lebende Spieler wählt verbindlich in der App direkt jeden anderen wählbaren lebenden Spieler (nicht sich selbst). Auch die Abstimmung hat kein hartes Zeitlimit; ein ausgefallenes Gerät blockiert sie nie (Mehrheit gesperrt + Karenzzeit oder Host-Notfall).
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
**Zeitliche Führung ohne abruptes Abbrechen:** Die Engine nennt einen Richtwert, ab wann abgestimmt werden sollte, und eröffnet die Abstimmung erst nach einer Gnadenfrist automatisch, falls die Gruppe es nicht selbst tut. Die Diskussion wird nie abrupt beendet.

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

### Verdacht vor der Nacht
Jeder Lebende markiert vor der Nacht geheim genau so viele Personen, wie das Rudel Plätze hat (begrenzt durch die Zahl der übrigen Lebenden). Die Abgaben wirken nie auf das Spiel; sie dienen ausschließlich dem Rückblick am Ende (§24).

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

**Der Impuls verrät nie, ob tatsächlich eine Rolle vergeben wurde:** Er erscheint bei jedem vorab definierten Rollen-Moment, unabhängig davon, ob dabei eine Rolle vergeben wird Pro Moment gibt es genau eine verständliche Wahrscheinlichkeit `noRoleChance`: mit dieser Wahrscheinlichkeit wird keine Rolle vergeben, sonst wird (falls der Pool etwas erlaubt) eine erlaubte Rolle gewichtet gezogen. Momente: nach erfolgreicher Erfüllung einer dafür konfigurierten Quest, nach dem ersten Dorfrat, an konfigurierten Tagen (Startwert: Tag 3).

## 14. Rollen-Direktor / Balance
Zufall ja – aber **gewichteter Zufall innerhalb vorab erlaubter Rollen-Pools, Kombinationen und Freischaltzeitpunkte**.

**Kein verstecktes Dynamic Difficulty Balancing:** Die Engine vergibt nie spontan eine starke Gegenrolle, nur um eine Partie auszugleichen. Die aktuelle Stärke einer Partei (Zahl lebender Wölfe/Dorfbewohner, Informationsvorteil, Partieverlauf) fließt in keine Rollenentscheidung ein. Spieler sollen nicht das Gefühl bekommen, dass das System das Ergebnis korrigiert.

Vorab konfiguriert werden (alles datengetrieben, siehe `packages/engine/src/rules.ts`):
- welche Rollen aktiviert sind, ihr Gewicht (Häufigkeit) und die Mindestspielerzahl
- ob eine Rolle nur Startrolle ist bzw. zu welchen Auslösern/ab welchem Tag sie freigeschaltet werden darf
- erlaubte Kombinationen (z. B. höchstens eine Rolle aus einer Gruppe starker Informationsrollen)
- Anzahl Sonderrollen beim Start und Obergrenze für spätere Vergabe je Gruppengröße
- die Rudelgröße je Spielerzahl
- die **Rollen-Momente** (siehe §17): Zeitpunkt + eine einzige Wahrscheinlichkeit „keine Rolle"

Regeln (entschieden):
- jede Sonderrolle höchstens einmal pro Partie
- in kleinen Gruppen weniger Sonderrollen
- **Bei höchstens 5 lebenden Spielern werden keine neuen Sonderrollen mehr vergeben.**
- **Späher + Fährtenleser dürfen bei 6–10 Spielern nicht gemeinsam auftreten; ab 11 Spielern ist das erlaubt.** (Gezählt wird je Partie, nicht nur lebende Träger.)
- **4–6 Spieler sind Kleingruppen (Balance offen):** 1 Wolf, höchstens 1 Sonderrolle beim Start und 1 später, keine starken Informationskombinationen (Startwerte).
- Rollen mit Fraktionswahl nur zu Spielbeginn
- **Grenzgänger und Rudelstärke:** Ist ein Grenzgänger im Spiel, ersetzt er einen Wolf-Platz. Die Rudelgröße der Tabelle ist das Maximum (Grenzgänger im Rudel); wählt er das Dorf, ist das Rudel einen kleiner. So entsteht kein unkontrolliert zusätzlicher Wolf. (Konfigurierbar, Wirkung wird per Simulation geprüft.)

**Unterstützte Spielerzahl: 4–14.**

Rudelgröße (Basiskonfiguration, Startwerte, nicht final): 4→1, 5→1, 6→1, 7→2, 8→2, 9→2, 10→3, 11→3, 12→3, 13→4, 14→4.

**Kleingruppen (4–6 Spieler)** sind ausdrücklich ein eigener Fall; ihre Balance ist **noch offen**. Kill-Frequenz des Rudels, Rollenpool und Informationsmechaniken sind je Spielerzahl konfigurierbar und dürfen später von größeren Gruppen abweichen. Dafür wurde bewusst noch keine neue Sonderregel erfunden (Standard: Rudel tötet jede Nacht, Rollenpool wie in den allgemeinen Regeln; bei 4–5 Spielern sind aktuell keine Sonderrollen erlaubt).

**Grenzgänger: vollständig implementiert und konfigurierbar, standardmäßig deaktiviert** (seine Wirkung ist für eine Standardpartie zu groß und wird später separat getestet).

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
Wählt eine kleine Gruppe lebender Spieler. Erfährt nur, ob sich mindestens ein Wolf darunter befindet. Startwert: 2 Nutzungen.  
Keine direkte Identifikation.

### Alchemistin
Besitzt zwei begrenzte Einmal-Aktionen: einmal Schutz vor einem nächtlichen Angriff und einmal eine offensive Aktion. **Beide dürfen nicht in derselben Nacht eingesetzt werden.**  
Details und Timing müssen im Balancing finalisiert werden.

### Wächter
Kann nachts einen Spieler schützen. Dieselbe Person darf nicht dauerhaft geschützt werden.

### Grenzgänger
**Nur beim Spielstart.** Entscheidet geheim, ob er dem Dorf oder dem Rudel angehören möchte.  
Entscheidet er sich für das Rudel, ist er anschließend **vollständig Mitglied des Rudels**: Er erhält dessen Berechtigungen (Kenntnis der Wölfe, Rudelkanal, Rudelziel) und zählt für die Siegbedingung als Wolf.  
Mechanik bewusst eigenständig formulieren und gestalten.

### Jäger
**Technisch vorhanden, standardmäßig deaktiviert** (Konfiguration `enabled: false`).  
Wenn er ausscheidet, kann eine begrenzte letzte Aktion ausgelöst werden.  
Nur in größeren Gruppen einsetzen; genaue Stärke im Playtest bestimmen.

### Wolf-Sonderrolle: Schattenwolf
Seltene Rudelrolle, **erst ab 9 Spielern**. Kann einmal eine Informationswirkung des Dorfes stören oder verschleiern.  
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

**Belohnungen:** Das bloße Abschließen einer Quest erzeugt keine automatische Belohnung, außer durch den Reward Director (§25: erste erfolgreiche Quest). Die meisten Quests haben sonst gar keine spielmechanische Belohnung. Nur ausdrücklich dafür konfigurierte Quests können bei **erfolgreicher Erfüllung** einen Hinweis, ein Ereignis oder eine neue Sonderrolle auslösen. Was als „erfolgreich" gilt, ist je Quest definiert (aktueller Startwert: alle Lebenden bestätigen die Erfüllung vor Ablauf der Zeit).

## 19. Überschneidungen
Nie zwei verbindliche Aktionen gleichzeitig.

Wenn eine Quest läuft und ein Dorfrat/Nacht ansteht:
1. laufende Quest sauber abschließen
2. Phasenwechsel
3. erst danach neue Aktion

## 20. Rollenoffenlegung
**Ab v0.7:** Beim Ausscheiden (Verbannung, Nacht, letzter Schuss) werden für alle gleichzeitig Fraktion und Rolle (Sonderrolle bzw. Grundrolle) öffentlich aufgedeckt. Dies ersetzt den früheren MVP-Default „keine sofortige Offenlegung"; im Playtest zu validieren. Alle übrigen Rollen werden am Spielende aufgedeckt.

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

## 24. Entscheidungen v0.7 (Phase 6)

### Synchroner geheimer Moment (Variante A)
Bei jedem geheimen Moment (Spielstart, Quest-Freischaltung, neutrale Rollen-Momente, Grenzgänger-Entscheidung, „DAS RUDEL HAT ENTSCHIEDEN") passiert auf **allen** Geräten dasselbe: gleicher öffentlicher Text, gleiche Dauer, gleiche Haptik, gleicher Klang-Cue (nur Hook, keine Audiodateien), identischer Push-Text („Im Dorf hat sich etwas verändert.") und **frische PIN-Eingabe** im selben Overlay. Danach zeigt der private Bereich dem Betroffenen den echten Inhalt, allen anderen einen neutralen atmosphärischen Text. Texte sind zentral in `apps/mobile/src/ui/strings.ts`.

### Rollen
- Jede Person hat eine Fraktion (Dorf/Rudel) und höchstens **eine** Sonderrolle. Neue Rollen gehen nur an Personen mit reiner Grundrolle (Dorfbewohner/Wolf). Stirbt der Träger, darf die Rolle (konfigurierbar `maxLivingHolders`, `maxGrants`) erneut vergeben werden.
- Neutrale Rollen-Momente bleiben (`after_first_council`, `day_start`, je `noRoleChance`). Eine **Quest-Freischaltung ist öffentlich benannt** („Einer von euch wird zum …"); gibt es keinen Empfänger, entfällt sie.
- Host-Rollenmodi je Rolle: aus / möglich / garantiert (`rooms.role_modes`); `validateRoleConfig` liefert Warnungen (kein Siegquoten-Urteil).
- **Späher**: 2 Nutzungen. **Fährtenleser**: genau 1 Nutzung. **Alchemistin**: nur ein Heiltrank (kein Angriff). **Wächter**: unbegrenzt, nie dieselbe Person zweimal in Folge, sich selbst erlaubt. **Jäger**: ab 8 Spielern verfügbar, standardmäßig deaktiviert. **Schattenwolf**: nicht im Standardpool (deaktiviert). **Grenzgänger**: nur Startrolle, öffentlich angekündigt („DER GRENZGÄNGER IST UNTER EUCH"), Entscheidung geheim, danach Moment „DIE ENTSCHEIDUNG IST GEFALLEN" (standardmäßig deaktiviert).
- **Beobachter** (neu, Dorf): einmal pro Nacht ein 10-Sekunden-Fenster; solange die Taste gehalten wird (Lebenszeichen alle Sekunde, Hintergrund/Loslassen beendet es), erscheint ein wahrer Merkmals-Hinweis auf ein Rudelmitglied (ohne Namen). Nur ein Fenster pro Nacht.
- **Rudel „Ausschau halten"**: ein gemeinsamer Versuch pro Nacht. Treffen die Beobachter-Fenster, erhält das gesamte lebende Rudel eine Notiz mit einer wahren Aussage; sonst „NUR SCHATTEN".

### Alchemistin-Ablauf
Nach der Rudelsperre folgt für **jede** Nacht ein Heil-Fenster fester Länge (auch ohne Alchemistin – Timing-Schutz). Moment „DAS RUDEL HAT ENTSCHIEDEN"; nur die Alchemistin sieht das Opfer und entscheidet (RETTEN / NICHT EINGREIFEN, einmalig, verpflichtend bestätigen). Ohne Entscheidung gilt „nicht eingreifen"; der Trank wird nur bei tatsächlichem Einsatz verbraucht.

### Öffentliche Rudelplätze
Die Zahl der Rudelplätze und der Spieler ist öffentlich und konstant (auch wenn ein Grenzgänger einen Wolf-Platz ersetzt). Das Dashboard zeigt atmosphärisch: Bewohner · bekannte Rudelplätze · leben · ausgeschieden.

### Profil, Datenschutz, Notizen
- Pflichtangaben für Mitspieler sichtbar: Alter (exakt), Geschlecht (Frau/Mann/Divers), Haarfarbe, Augenfarbe; optional Foto, sonst Auto-Avatar. Der Beobachter-Hinweis stützt sich auf diese Angaben (wahre Aussage, die mindestens zwei, aber nicht alle Lebenden trifft).
- **Gäste** (anonym): Angaben und Foto gelten nur für die Partie und werden nach Ende gelöscht (`server_cleanup`). **Optionales dauerhaftes Profil** nur für registrierte Konten (Datenmodell/RPC vorbereitet; Konto-/E-Mail-UI offen).
- Private Notizen je Mitspieler: nur für den Verfasser, nur nach PIN-Entsperrung, nie für Host oder Engine.

### Rückblick am Ende
Aus den geheimen Verdachtsabgaben: „A hatte B seit Tag X im Verdacht", „Niemand verdächtigte C", „D verdächtigte nie ein Rudelmitglied" – nur nach Spielende veröffentlicht.

### Jenseits-Nachrichten
Nur als Quest-/Ereignis-Belohnung vorgesehen, **nicht umgesetzt**; Moderationsmethode offen (siehe OPEN_DECISIONS).

## 25. Reward Director: Rollenfreischaltung durch Quests (v0.7)
Alle Werte stehen in `Rules.roleRewards` bzw. `RoleDef` (`rules.ts`); nichts davon ist eine Stärke-/Difficulty-Logik, die Fraktionsführung fließt nirgends ein.

1. **Erste erfolgreiche Quest:** schaltet – sofern eine zulässige Sonderrolle verfügbar und das Budget nicht ausgeschöpft ist – **garantiert genau eine** Sonderrolle frei (bewusste Dramaturgie: früh zusätzliche Unsicherheit). Gilt auch für Quests ohne konfigurierte Belohnung; ist für die Quest eine feste Rolle konfiguriert, wird diese bevorzugt. Das Tageslimit und die bestehenden Verteilungsregeln (Kombinationen, `maxLaterSpecials`) gelten weiter. Eine gescheiterte Quest zählt nicht.
2. **Fallback:** Kann/darf keine Rolle vergeben werden (Pool leer, Budget, Tageslimit, kein Empfänger, Spielerzahl), greift die konfigurierte Nicht-Rollen-Belohnung (`roleRewards.fallback`, Startwert: Hinweis).
3. **Nach der ersten Freischaltung** gemischtes System: Die direkt folgende erfolgreiche Quest vergibt keine Rolle (Fallback bzw. ihre sonstige Belohnung); jede andere Belohnungsart (Hinweis, Ereignis, Jenseits-Nachricht (später), keine Mechanik) unterbricht die Rollenserie. **Höchstens eine neue Sonderrolle pro Spieltag** (auch Rollen-Momente zählen; Startrollen nicht).
4. **Gesamtbudget:** `floor(Startspieler / 2)` Sonderrollen je Partie (4→2, 5→2, 6→3, 8→4, 10→5, 14→7). Startrollen zählen mit, der Dorfsprecher nicht. **Obergrenze, kein Zielwert** – die Partie schöpft das Budget nicht zwanghaft aus.
5. **Jede Rollenart höchstens einmal pro Partie** (`maxPerGame`, auch ausgeschiedene Träger zählen), höchstens eine Sonderrolle pro Person. Das ersetzt die frühere Wiedervergabe nach dem Tod des Trägers (per `maxPerGame: null` konfigurierbar).
6. **Zeit-/Phasenpräferenzen:** Je Rolle ein Gewichtungsfaktor für früh/mittel/spät (`RoleDef.timing`; Phasengrenzen `roleRewards.phases`, tagesbasiert). Startwerte: Späher, Fährtenleser, Beobachter früh bevorzugt; Alchemistin und Wächter früh bis mittel; Jäger indifferent (später möglich, standardmäßig deaktiviert); Grenzgänger ausschließlich Startrolle.
7. **Kleingruppen (4–6 Startspieler):** Die Freischaltung (erste Quest und weitere Vergaben) ist möglich, solange mindestens 4 Spieler leben (`roleRewards.smallGroup`); das hat Vorrang vor der ≤5‑Regel. Ab 7 Startspielern gilt weiter: bei ≤5 Lebenden keine neuen Sonderrollen. Budget und Verteilungsregeln gelten auch in Kleingruppen.
