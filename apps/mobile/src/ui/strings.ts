// Alle sichtbaren Texte an einer Stelle (Ton: kurz, ruhig, geheimnisvoll – STYLE_GUIDE §19).
import { IMPULSES, type RoleId } from '@dorf/engine';

export const t = {
  appName: 'DAS DORF',
  claim: 'Vertraue. Verdächtige. Entscheide.',
  start: { newGame: 'Neues Spiel', join: 'Spiel beitreten', rules: 'Regeln', settings: 'Einstellungen', display: 'Dorfanzeige', resume: 'Zurück ins Dorf' },
  common: { back: 'Zurück', cancel: 'Abbrechen', ok: 'Okay', loading: 'Einen Moment …', error: 'Das hat nicht geklappt. Versuche es noch einmal.' },
  create: { title: 'Neues Spiel', name: 'Dein Name', pin: 'Dein persönlicher PIN', pinHint: '4–6 Ziffern. Er schützt deine geheimen Informationen.', classic: 'Klassisch', classicHint: 'Ohne feste Dauer. Das Dorf bestätigt die Phasenwechsel.', evening: 'Abendmodus', eveningHint: 'Feste Zieldauer. Das Dorf bekommt einen Countdown zur nächsten Nacht.', duration: 'Zieldauer', hours: (h: number) => `${h} Std.`, submit: 'Dorf gründen' },
  join: { title: 'Spiel beitreten', code: 'Raumcode', scan: 'QR-Code scannen', submit: 'Beitreten', reclaim: 'Schon dabei? Auf diesem Gerät fortsetzen' },
  lobby: { title: 'Dorfplatz', code: 'Raumcode', share: 'Zeigt diesen Code oder QR-Code', players: (n: number) => `${n} im Dorf`, need: 'Mindestens 6, höchstens 14 Spieler.', ready: 'Bereit', notReady: 'Nicht bereit', start: 'Spiel starten', waiting: 'Warten, bis alle bereit sind …', hostOnly: 'Der Host startet das Spiel.', leave: 'Verlassen', remove: 'Entfernen' },
  phase: {
    speaker_election: 'Dorfsprecher',
    day: 'Tag',
    council: 'Dorfrat',
    dusk: 'Dämmerung',
    night: 'Nacht',
    morning: 'Morgen',
    ended: 'Ende',
  },
  phaseHint: {
    speaker_election: 'Wählt eine Person, die für das Dorf spricht.',
    day: 'Diskutiert und findet Verdächtige.',
    council: 'Das Dorf entscheidet.',
    dusk: 'Das Licht wird schwächer.',
    night: 'Die Nacht beginnt.',
    morning: 'Im Dorf hat sich etwas verändert.',
    ended: 'Das Spiel ist zu Ende.',
  },
  dash: { alive: (n: number) => `${n} im Dorf`, untilNight: 'Bis zur Nacht', untilNext: 'Noch', councilReady: 'Das Dorf ist bereit für einen Dorfrat.', readyCouncil: 'Für Dorfrat bereit', readyWithdraw: 'Bereitschaft zurücknehmen', startCouncil: 'Dorfrat beginnen', questView: 'Quest ansehen', readyNight: 'Bereit für Nacht', readyDay: 'Bereit für Tag', ready: (r: number, n: number) => `${r} von ${n} bereit`, speaker: 'Dorfsprecher', quest: 'Quest', questDone: 'Aufgabe erledigt', questDoneSet: 'Erledigt' },
  tabs: { village: 'Dorf', messages: 'Nachrichten', players: 'Spieler', more: 'Mehr' },
  council: {
    voting: 'Deine Stimme', votingHint: 'Wähle eine Person. Deine Stimme ist verbindlich, sobald du sie setzt.', locked: 'Deine Stimme ist gesetzt.', waitingVotes: (c: number, n: number) => `${c} von ${n} Stimmen gesperrt`, countdown: ['3', '2', '1', 'ZEIGT!'], pointNow: 'Zeigt gleichzeitig auf eure Wahl.', tiebreak: 'Gleichstand', tiebreakSpeaker: 'Als Dorfsprecher entscheidest du.', tiebreakWait: 'Der Dorfsprecher entscheidet.', banished: 'verlässt das Dorf.', result: 'Das Ergebnis', votes: (n: number) => (n === 1 ? '1 Stimme' : `${n} Stimmen`), confirm: 'Stimme setzen', decide: 'Entscheiden',
  },
  night: { title: 'Die Nacht beginnt.', hint: 'Schließt die Augen nicht – sprecht leise. Alles Weitere geschieht im Privaten.' },
  morning: { none: 'Diese Nacht ist niemand ausgeschieden.', some: 'Diese Nacht ist ausgeschieden:', continue: 'Weiter' },
  ended: { title: 'Das Spiel ist zu Ende.', village: 'Das Dorf hat gewonnen.', pack: 'Das Rudel hat gewonnen.', roles: 'Die Rollen' },
  impulse: { change: 'Im Dorf hat sich etwas verändert.', changeHint: 'Schaut in euren privaten Bereich.' },
  private: { title: 'Privat', locked: 'Gib deinen PIN ein.', wrong: 'Der PIN stimmt nicht.', wait: (s: number) => `Bitte warte ${s} Sekunden.`, role: 'Deine Rolle', notes: 'Hinweise', action: 'Aktion', packMates: 'Dein Rudel', lock: 'Sperren', nothing: 'Heute Nacht gibt es für dich nichts zu tun.', pickTarget: 'Wähle eine Person', choose: 'Wählen', send: 'Bestätigen', chosen: 'Deine Wahl ist gespeichert.', side: 'Für wen entscheidest du dich?', sideVillage: 'Dorf', sidePack: 'Rudel', lastShot: 'Dein letzter Schuss', lastShotHint: 'Wähle eine Person.', packTarget: 'Gemeinsames Ziel' },
  chat: { title: 'Nachrichten', empty: 'Noch keine Gespräche. Schreibe jemandem im Dorf.', newChat: 'Neue Nachricht', placeholder: 'Nachricht schreiben …', send: 'Senden', unread: (n: number) => `${n} ungelesen`, group: 'Gruppe' },
  players: { title: 'Spieler im Dorf', out: 'ausgeschieden' },
  more: { title: 'Mehr', rules: 'Regeln', chronicle: 'Chronik', emergency: 'Technische Notfallfunktion', emergencyHint: 'Setzt das Spiel fort, falls ein Gerät ausgefallen ist.', emergencyDo: 'Fortsetzen erzwingen', leave: 'Zum Startbildschirm' },
  errors: { room_not_found: 'Diesen Raum gibt es nicht.', game_already_started: 'Das Spiel läuft schon.', room_full: 'Das Dorf ist voll.', name_taken: 'Dieser Name ist schon vergeben.', invalid_pin: 'Der PIN braucht 4 bis 6 Ziffern.', invalid_name: 'Bitte gib einen Namen ein.', not_all_ready: 'Noch nicht alle sind bereit.', invalid_roster: 'Es braucht 6 bis 14 Spieler.', wrong_pin: 'Der PIN stimmt nicht.' } as Record<string, string>,
};

export const roleNames: Record<RoleId, string> = {
  villager: 'Dorfbewohner', wolf: 'Wolf', scout: 'Späher', tracker: 'Fährtenleser', alchemist: 'Alchemistin', guardian: 'Wächter', borderwalker: 'Grenzgänger', hunter: 'Jäger', shadowwolf: 'Schattenwolf',
};

// Eigene Rollenbeschreibungen (keine Vorlagen aus bestehenden Spielen).
export const roleText: Record<RoleId, string> = {
  villager: 'Du hast keine besondere Fähigkeit. Beobachte, sprich und vertraue mit Bedacht.',
  wolf: 'Du gehörst zum Rudel und kennst die anderen. Gemeinsam bestimmt ihr in der Nacht ein Ziel.',
  scout: 'Du kannst nachts die Zugehörigkeit einer Person prüfen.',
  tracker: 'Du wählst nachts eine kleine Gruppe und erfährst nur, ob sich dort mindestens ein Rudelmitglied befindet.',
  alchemist: 'Du besitzt Tränke mit begrenzter Wirkung. Was du hast und wie oft, siehst du nachts in deinem privaten Bereich.',
  guardian: 'Du kannst nachts eine Person vor dem Angriff des Rudels schützen.',
  borderwalker: 'Du entscheidest dich geheim, ob du zum Dorf oder zum Rudel gehörst – vor der ersten Nacht.',
  hunter: 'Scheidest du aus, hast du noch eine letzte Aktion.',
  shadowwolf: 'Du gehörst zum Rudel und kennst die anderen. Du kannst Informationswirkungen des Dorfes stören.',
};

export const impulseText = (key: string) => IMPULSES[key] ?? '';


/** Anzeigenamen der Fähigkeiten (IDs stammen aus der Rollen-Konfiguration; unbekannte IDs fallen auf die Art zurück). */
const abilityLabels: Record<string, string> = {
  scout: 'Du kannst nachts die Zugehörigkeit einer Person prüfen.', track: 'Fährte lesen', protect: 'Schützen', potion_protect: 'Schutztrank', potion_strike: 'Offensiver Trank', veil: 'Schleier legen',
};
const kindLabels: Record<string, string> = { inspect: 'Prüfen', inspect_group: 'Gruppe prüfen', protect: 'Schützen', strike: 'Aktion', veil: 'Schleier legen' };
export const abilityName = (id: string, kind: string) => abilityLabels[id] ?? kindLabels[kind] ?? id;
