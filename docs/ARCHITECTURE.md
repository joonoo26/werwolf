# Architektur

```
packages/engine      reine TypeScript-Spiellogik (Zustandsmaschine, Rollen-Direktor, Zeitplan, Views)
packages/server      Server-Kern: Befehl → Engine → Persistenz (Store-Interface, CAS-Retry, Parser, Push-Texte)
packages/db-tests    Postgres-/RLS-/Integrationstests gegen ein echtes Postgres
supabase/migrations  Schema, RLS, Funktionen
supabase/functions   Edge Function `game` (dünner Deno-Wrapper; Bundle aus engine+server in _shared/dorf.js)
apps/mobile          Expo (React Native, expo-router) – iPhone/iPad zuerst, Android möglich
```

## Geheimhaltung (serverseitig)
- Voller Zustand (alle Rollen) nur in `game_secret`; für Clients komplett gesperrt.
- Clients lesen Projektionen: `public_state` (Raummitglieder) und `player_private` (nur Eigentümer, **nur PIN-entsperrt**, `unlocked_until`).
- PIN: bcrypt, Fehlversuch-Sperre (ab 5, verdoppelnd), Entsperrung läuft nach 2 min ab; App sperrt zusätzlich nach 45 s Inaktivität und im Hintergrund.
- Chats: nur aktive Kanalmitglieder, lebend, entsperrt. Rudelkanal-Mitgliedschaft folgt der Engine; Tote verlieren sofort alles; neue Mitglieder sehen keinen Verlauf.
- Schreiben: nie direkt auf Tabellen; nur SECURITY-DEFINER-Funktionen bzw. Edge Function. Server-RPCs nur `service_role`.
- Push: immer neutral und für alle identisch (`neutralPush`, `MESSAGE_PUSH`). Keine Rolle in Text, Ton, Haptik oder Navigation.
- Timing: feste Nachtlänge, feste Fenster für letzte Schüsse, identische Haptik/Overlays.

## Nebenläufigkeit & Ausfälle
- Jeder Schritt = Laden → Engine → Commit mit Versionsprüfung (CAS) → Retry mit Jitter. Alle 14 Spieler können gleichzeitig stimmen.
- Fristen: jedes Gerät sendet `tick` nach Ablauf (Server prüft, idempotent); zusätzlich Cron-`sweep` (`rooms.next_deadline_at`). Ein ausgefallenes Gerät blockiert nie.
- Reconnect: anonyme Sitzung bleibt auf dem Gerät; neues Gerät: `reclaim_player` mit Name + PIN.
- Gemeinsamer Countdown: Server schreibt `revealAt`; Clients gleichen die Uhr per `server_now` ab.

## Einrichtung
1. Supabase-Projekt anlegen; **Anonymous Sign-Ins** aktivieren.
2. `supabase db push` (Migrationen), `supabase functions deploy game`, Secret `SWEEP_SECRET` setzen.
3. pg_cron: minütlich `POST /functions/v1/game {"action":"sweep"}` mit Header `x-sweep-secret`; täglich `select public.server_cleanup()`.
4. `apps/mobile/.env` aus `.env.example`; `eas build` (Development Build, da Kamera/Push nativ).
5. Nach Änderungen an engine/server: `npm run build:functions` (CI prüft per `check:functions`).

## Tests
`npm test` – Engine (Invarianten, Zufallspartien, Leak-Tests), Server, App-Logik, DB/RLS (temporäres Postgres via `scripts/test-db.sh`).
Lokale Vorschau ohne Backend: `npm run preview:web -w @dorf/mobile` → `/preview?scene=day|voting|showdown|night|morning|ended` (`&display=1` für die Dorfanzeige).
