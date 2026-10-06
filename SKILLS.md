# DAS DORF – EMPFOHLENE CLAUDE-CODE-SKILLS

Nur die Skills installieren, die wirklich Mehrwert bringen.  
`GAME_DESIGN.md` und `STYLE_GUIDE.md` bleiben immer Source of Truth.

## Pflicht

### 1. Expo – offizielles Plugin
Für React Native / Expo / iOS / iPad / EAS / Navigation / Design System / Animation / Native UI.

```bash
claude plugin install expo@claude-plugins-official
```

Wichtige enthaltene Skills werden bei Bedarf automatisch geladen, insbesondere:
- `expo-overview`
- `expo-project-structure`
- `expo-router`
- `expo-design-system`
- `expo-native-ui`
- `expo-animation`
- `expo-data-fetching`
- `expo-dev-client`
- `eas-app-stores`

## 2. Supabase – offizielle Agent Skills
Für Auth, Realtime, RLS, Datenmodell und Postgres.

```bash
npx skills add supabase/agent-skills --skill supabase
npx skills add supabase/agent-skills --skill supabase-postgres-best-practices
```

Besonders wichtig:
- RLS
- serverseitige Rollen-Geheimhaltung
- Realtime-Berechtigungen
- Migrationen

## 3. Frontend Design – Anthropic
Für hochwertige UI statt generischer AI-Oberflächen.

```bash
claude plugin install frontend-design@claude-plugins-official
```

Wichtig:
Der Skill darf die Designrichtung **nicht neu erfinden**.  
`docs/STYLE_GUIDE.md` ist verbindlich.

## Sehr empfehlenswert

### Addy Osmani Agent Skills
Nicht alle 25 installieren. Für dieses Projekt reichen zunächst:

```bash
npx skills add addyosmani/agent-skills --skill test-driven-development
npx skills add addyosmani/agent-skills --skill code-review-and-quality
npx skills add addyosmani/agent-skills --skill security-and-hardening
```

Einsatz:
- `test-driven-development`: Game Engine / Zustandslogik
- `code-review-and-quality`: größere Features vor Abschluss prüfen
- `security-and-hardening`: Auth, RLS, private Rollen/Chats, Secrets

## Optional
Nur falls bereits vorhanden oder später benötigt:
- UI/UX Pro Max
- GitHub Integration
- weitere Test-/Release-Skills

Nicht mehrere überlappende Design-Skills gleichzeitig die visuelle Richtung bestimmen lassen.
