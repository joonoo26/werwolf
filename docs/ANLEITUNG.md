# Schritt-für-Schritt: DAS DORF zum Laufen bringen

Voraussetzungen: Mac mit aktuellem **Xcode** (inkl. iOS-Simulator), **Node 20+**, Git, ein kostenloses **Supabase**- und ein **Expo**-Konto.
Für Tests auf echten iPhones/Push zusätzlich ein Apple-Developer-Konto.

## 1. Projekt holen und prüfen
```bash
git clone <dein-repo> && cd werwolf
git checkout claude/adoring-turing-2h3spm
npm install
npm test          # Engine, Server, App-Logik, DB/RLS (braucht lokal installiertes Postgres 15+)
```
Ohne lokales Postgres: `npm run test:engine` genügt für einen ersten Check.

## 2. Oberfläche ohne Backend ansehen (optional, 2 Minuten)
```bash
npm run preview:web -w @dorf/mobile
```
Im Browser: `/preview?scene=day`, `voting`, `showdown`, `night`, `morning`, `ended` (`&display=1` = iPad-Dorfanzeige).

## 3. Supabase-Projekt anlegen
1. Auf supabase.com → **New project** (Region EU wählen). Merke dir die **Project Ref** (Teil der URL) und das Datenbank-Passwort.
2. **Authentication → Sign In / Providers → Anonymous sign-ins: aktivieren.**
3. Unter **Project Settings → API** notieren: `Project URL` und `anon public key`.

## 4. Datenbank und Edge Function einspielen
```bash
npx supabase login
npx supabase link --project-ref <PROJECT_REF>
npx supabase db push                                   # spielt alle Migrationen ein
npm run build:functions                                # Bundle aus Engine + Server erzeugen
npx supabase secrets set SWEEP_SECRET=$(openssl rand -hex 24)
npx supabase functions deploy game --no-verify-jwt     # Auth erfolgt in der Funktion selbst
```
Merke dir den Wert von `SWEEP_SECRET` (für Schritt 5).

## 5. Zeitgeber einrichten (damit kein ausgefallenes Gerät das Spiel blockiert)
Im Supabase-**SQL Editor** einmalig ausführen (Extensions `pg_cron` und `pg_net` vorher unter *Database → Extensions* aktivieren):
```sql
select cron.schedule('dorf-sweep', '* * * * *', $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/game',
    headers := '{"Content-Type":"application/json","x-sweep-secret":"<SWEEP_SECRET>"}'::jsonb,
    body := '{"action":"sweep"}'::jsonb) $$);
select cron.schedule('dorf-cleanup', '17 4 * * *', $$select public.server_cleanup()$$);
```

## 6. App konfigurieren
```bash
cd apps/mobile
cp .env.example .env
```
In `.env` eintragen: `EXPO_PUBLIC_SUPABASE_URL` und `EXPO_PUBLIC_SUPABASE_ANON_KEY` (aus Schritt 3).
Optional vor dem Release: in `app.json` die `bundleIdentifier` (`app.dasdorf.game`) auf deine eigene ändern.

## 7. App auf dem iOS-Simulator starten
Kamera und Push sind nativ, daher **Development Build** statt Expo Go:
```bash
npx expo run:ios            # baut lokal mit Xcode und startet den Simulator
```
Alternativ in der Cloud: `npx eas login`, `npx eas init`, `npx eas build --profile development --platform ios`, danach `npx expo start --dev-client`.

## 8. Ersten Testlauf spielen
Mindestens **4 Spieler** nötig (4–14 unterstützt). Möglichkeiten:
- Mehrere Simulatoren (iPhone + iPad) plus echte Geräte/Freunde, jeweils mit demselben Development Build.
- Gerät 1: **Neues Spiel** → Name, PIN, Modus → Raumcode/QR erscheint.
- Weitere Geräte: **Spiel beitreten** → Code eingeben oder QR scannen → Name + PIN → **Bereit**.
- iPad: Startscreen → **Dorfanzeige** → Code eingeben (kein Spielerplatz, nur öffentliche Anzeige).
- Host: **Spiel starten**, sobald alle bereit sind.
- Privates (Rolle, Aktionen, Chats) liegt hinter dem PIN: Button **Privat 🔒** oben rechts.
- Notfall (Gerät ausgefallen): Host → *Mehr* → „Fortsetzen erzwingen".

## 9. Push-Mitteilungen (nur echte Geräte)
`npx eas init` setzt die Projekt-ID; in Apple Developer einen Push-Key über EAS anlegen lassen (`eas credentials`). Texte sind immer neutral („Im Dorf gibt es eine neue Nachricht.").

## 10. Release vorbereiten
1. Eigene finale Artwork/Sounds erstellen oder lizenzieren, Markenprüfung für „DAS DORF" abschließen.
2. Balance mit Playtests anpassen: alle Zahlen in `packages/engine/src/rules.ts`; Interpretationen in `docs/OPEN_DECISIONS.md` bestätigen.
3. Werbung/Käufe anbinden (RevenueCat o. Ä.) – dabei immer `mayShowAd` in `apps/mobile/src/logic/ads.ts` verwenden.
4. `npx eas build --profile production --platform ios`, dann `npx eas submit --platform ios` (TestFlight/App Store).
5. Nach jeder Änderung an `packages/engine` oder `packages/server`: `npm run build:functions` und Function neu deployen.

## Fehlerbehebung
- **„Backend nicht konfiguriert"** auf dem Startscreen → `.env` fehlt/falsch, Metro mit `npx expo start -c` neu starten.
- **Beitreten schlägt fehl** → Anonymous Sign-ins aktiviert? Migrationen eingespielt?
- **Phasen laufen nicht weiter** → Function deployt? Cron-Job aus Schritt 5 aktiv? (`select * from cron.job_run_details order by start_time desc limit 5;`)
- **Function-Logs**: Supabase Dashboard → Edge Functions → `game` → Logs.
