// Alle sichtbaren Texte an einer Stelle (Ton: kurz, ruhig, geheimnisvoll – STYLE_GUIDE §19).
import { IMPULSES, type EyeColor, type Gender, type HairColor, type RoleId, type TraitStatement } from '@dorf/engine';

export const t = {
  appName: 'DAS DORF',
  claim: 'Vertraue. Verdächtige. Entscheide.',
  start: { newGame: 'Neues Spiel', join: 'Spiel beitreten', rules: 'Regeln', settings: 'Einstellungen', display: 'Dorfanzeige', resume: 'Zurück ins Dorf' },
  common: { back: 'Zurück', cancel: 'Abbrechen', ok: 'Okay', loading: 'Einen Moment …', error: 'Das hat nicht geklappt. Versuche es noch einmal.' },
  create: { title: 'Neues Spiel', name: 'Dein Name', pin: 'Dein persönlicher PIN', pinHint: '4–6 Ziffern. Er schützt deine geheimen Informationen.', classic: 'Klassisch', classicHint: 'Ohne feste Dauer. Das Dorf bestätigt die Phasenwechsel.', evening: 'Abendmodus', eveningHint: 'Feste Zieldauer. Das Dorf bekommt einen Countdown zur nächsten Nacht.', duration: 'Zieldauer', hours: (h: number) => `${h} Std.`, submit: 'Dorf gründen' },
  join: { title: 'Spiel beitreten', code: 'Raumcode', scan: 'QR-Code scannen', submit: 'Beitreten', reclaim: 'Schon dabei? Auf diesem Gerät fortsetzen' },
  lobby: { title: 'Dorfplatz', code: 'Raumcode', share: 'Zeigt diesen Code oder QR-Code', players: (n: number) => `${n} im Dorf`, need: 'Mindestens 4, höchstens 14 Spieler.', ready: 'Bereit', notReady: 'Nicht bereit', start: 'Spiel starten', waiting: 'Warten, bis alle bereit sind …', hostOnly: 'Der Host startet das Spiel.', leave: 'Verlassen', remove: 'Entfernen' },
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
    discussion: 'Diskutiert', discussionHint: 'Sprecht miteinander – im Raum, nicht auf dem Display. Wenn das Dorf bereit ist, eröffnet ihr die Abstimmung.', readyVote: 'Bereit zur Abstimmung', openVote: 'Abstimmung eröffnen', voteReady: 'Das Dorf ist bereit für die Abstimmung.', timeToVote: 'Es ist Zeit, abzustimmen.', voteSoon: 'Die Abstimmung beginnt in Kürze.',
    voting: 'Deine Stimme', votingHint: 'Wähle eine Person. Deine Stimme ist verbindlich, sobald du sie setzt.', locked: 'Deine Stimme ist gesetzt.', waitingVotes: (c: number, n: number) => `${c} von ${n} Stimmen gesperrt`, countdown: ['3', '2', '1', 'ZEIGT!'], pointNow: 'Zeigt gleichzeitig auf eure Wahl.', tiebreak: 'Gleichstand', tiebreakSpeaker: 'Als Dorfsprecher entscheidest du.', tiebreakWait: 'Der Dorfsprecher entscheidet.', banished: 'verlässt das Dorf.', result: 'Das Ergebnis', votes: (n: number) => (n === 1 ? '1 Stimme' : `${n} Stimmen`), confirm: 'Stimme setzen', decide: 'Entscheiden',
  },
  night: {
    title: 'DIE NACHT RÜCKT NÄHER', question: 'Wem traust du nicht?', pick: (n: number) => (n === 1 ? 'Markiere 1 Person.' : `Markiere ${n} Personen.`), send: 'Verdacht festhalten', saved: 'Dein Verdacht ist festgehalten.',
    healTitle: 'DIE NACHT HÄLT DEN ATEM AN', healHint: 'Etwas ist entschieden. Öffne deinen privaten Bereich.', privateOpen: 'Privater Bereich', privateHint: 'Öffne ihn mit deinem PIN – so wie alle anderen auch.',
    quiet: 'Diese Nacht gibt es für dich nichts zu tun. Bleib wach und beobachte.',
  },
  morning: { none: 'Diese Nacht ist niemand ausgeschieden.', some: 'In der Nacht gefunden:', continue: 'Weiter' },
  reveal: {
    banished: (name: string) => `${name} wurde verbannt.`,
    found: (name: string) => `${name} wurde gefunden.`,
    faction: { village: 'DORF', pack: 'RUDEL' } as Record<string, string>,
  },
  village: {
    title: 'Das Dorf',
    residents: (n: number) => `${n} Bewohner`,
    seats: (n: number) => (n === 1 ? '1 bekannter Rudelplatz' : `${n} bekannte Rudelplätze`),
    alive: (n: number) => `${n} leben`,
    out: (n: number) => `${n} ausgeschieden`,
    seatsHint: 'So viele Plätze hat das Rudel von Beginn an.',
  },
  moment: {
    privateTitle: 'Dein privater Bereich',
    privateHint: 'Öffne ihn mit deinem PIN.',
    close: 'Schließen',
    start: { title: 'DAS DORF ERWACHT', body: 'Jeder von euch trägt ein Geheimnis. Öffne deinen privaten Bereich.' },
    borderwalkerAnnounced: { title: 'DER GRENZGÄNGER IST UNTER EUCH', body: 'Zwischen Dorf und Dunkelheit steht eine einzige Entscheidung.\nNoch ist nicht klar, wohin seine Loyalität führen wird.' },
    questUnlock: { title: 'QUEST ERFOLGREICH', body: 'Das Dorf hat eine neue Fähigkeit freigeschaltet.', who: (role: string) => `Einer von euch wird zum ${role}.` },
    neutral: { title: 'IM DORF HAT SICH ETWAS VERÄNDERT', body: 'Manches bleibt im Verborgenen. Öffne deinen privaten Bereich.' },
    borderwalkerDecided: { title: 'DIE ENTSCHEIDUNG IST GEFALLEN', body: 'Der Grenzgänger hat seinen Weg gewählt.\nAuf welcher Seite er nun steht, weiß nur die Nacht.' },
    packDecided: { title: 'DAS RUDEL HAT ENTSCHIEDEN', body: 'In der Dunkelheit ist eine Wahl gefallen.' },
    youAre: (role: string) => `DU BIST ${role.toUpperCase()}`,
    youAreArticle: { scout: 'DER SPÄHER', tracker: 'DER FÄHRTENLESER', alchemist: 'DIE ALCHEMISTIN', guardian: 'DER WÄCHTER', borderwalker: 'DER GRENZGÄNGER', hunter: 'DER JÄGER', shadowwolf: 'DER SCHATTENWOLF', observer: 'DER BEOBACHTER', villager: 'EIN DORFBEWOHNER', wolf: 'EIN WOLF' } as Record<string, string>,
    chose: (faction: string) => `Du hast dich für ${faction === 'pack' ? 'das Rudel' : 'das Dorf'} entschieden. Behalte es für dich.`,
    healQuestion: (name: string) => `Das Rudel hat ${name} gewählt.\nWillst du deinen Heiltrank einsetzen?`,
    heal: 'RETTEN',
    noHeal: 'NICHT EINGREIFEN',
    healSaved: 'Deine Entscheidung ist gefallen.',
    sideQuestion: 'Für welche Seite entscheidest du dich?',
  },
  observer: { title: 'EIN BLICK IN DIE DUNKELHEIT', hold: 'Halte gedrückt, solange du dich traust.', holdButton: 'HALTEN', used: 'Dein Blick in die Dunkelheit ist für diese Nacht vorbei.', releasing: 'Lass los, wenn du genug gesehen hast.' },
  lookout: { button: 'Ausschau halten', used: 'Das Rudel hat in dieser Nacht bereits Ausschau gehalten.', hint: 'Nur ein Versuch pro Nacht – für das ganze Rudel.', missTitle: 'NUR SCHATTEN', miss: 'Niemand ließ sich erkennen.', hitTitle: 'ETWAS HAT SICH IM DUNKELN BEWEGT', hit: (name: string) => `${name} hat jemanden bemerkt, der das Rudel beobachtet.` },
  profile: {
    title: 'Profil', age: (n: number) => `${n} Jahre`, ageLabel: 'Alter', gender: 'Geschlecht', hair: 'Haarfarbe', eyes: 'Augenfarbe', photo: 'Foto (optional)', addPhoto: 'Foto wählen', removePhoto: 'Foto entfernen', status: 'Status', alive: 'lebt', out: 'ausgeschieden', notes: 'Meine Notizen', notesHint: 'Nur für dich sichtbar. Niemand sonst sieht sie – auch nicht der Host.', notesLocked: 'Öffne deinen privaten Bereich, um Notizen zu sehen.', noteSave: 'Notiz speichern', noteSaved: 'Gespeichert.',
    genders: { female: 'Frau', male: 'Mann', diverse: 'Divers' } as Record<Gender, string>,
    hairs: { black: 'Schwarz', brown: 'Braun', blonde: 'Blond', red: 'Rot', gray: 'Grau' } as Record<HairColor, string>,
    eyesOpts: { brown: 'Braun', blue: 'Blau', green: 'Grün', gray: 'Grau' } as Record<EyeColor, string>,
    guestHint: 'Deine Angaben gelten nur für diese Partie und werden danach gelöscht.',
    invalidAge: 'Bitte gib dein Alter an (5–120).',
  },
  ended: { title: 'Das Spiel ist zu Ende.', village: 'Das Dorf hat gewonnen.', pack: 'Das Rudel hat gewonnen.', roles: 'Die Rollen', retro: 'Rückblick', never: (n: string) => `Niemand verdächtigte ${n}.`, streak: (a: string, b: string, day: number) => `${a} hatte ${b} seit Tag ${day} im Verdacht.`, noWolf: (n: string) => `${n} verdächtigte während der gesamten Partie kein einziges Rudelmitglied.` },
  private: { title: 'Privat', locked: 'Gib deinen PIN ein.', wrong: 'Der PIN stimmt nicht.', wait: (s: number) => `Bitte warte ${s} Sekunden.`, role: 'Deine Rolle', notes: 'Hinweise', action: 'Aktion', packMates: 'Dein Rudel', lock: 'Sperren', nothing: 'Heute Nacht gibt es für dich nichts zu tun.', pickTarget: 'Wähle eine Person', choose: 'Wählen', send: 'Bestätigen', chosen: 'Deine Wahl ist gespeichert.', side: 'Für wen entscheidest du dich?', sideVillage: 'Dorf', sidePack: 'Rudel', lastShot: 'Dein letzter Schuss', lastShotHint: 'Wähle eine Person.', packTarget: 'Gemeinsames Ziel' },
  chat: { title: 'Nachrichten', empty: 'Noch keine Gespräche. Schreibe jemandem im Dorf.', newChat: 'Neue Nachricht', placeholder: 'Nachricht schreiben …', send: 'Senden', unread: (n: number) => `${n} ungelesen`, group: 'Gruppe' },
  players: { title: 'Spieler im Dorf', out: 'ausgeschieden' },
  more: { title: 'Mehr', rules: 'Regeln', chronicle: 'Chronik', emergency: 'Technische Notfallfunktion', emergencyHint: 'Setzt das Spiel fort, falls ein Gerät ausgefallen ist.', emergencyDo: 'Fortsetzen erzwingen', leave: 'Zum Startbildschirm' },
  errors: { room_not_found: 'Diesen Raum gibt es nicht.', game_already_started: 'Das Spiel läuft schon.', room_full: 'Das Dorf ist voll.', name_taken: 'Dieser Name ist schon vergeben.', invalid_pin: 'Der PIN braucht 4 bis 6 Ziffern.', invalid_name: 'Bitte gib einen Namen ein.', not_all_ready: 'Noch nicht alle sind bereit.', invalid_roster: 'Es braucht 4 bis 14 Spieler.', wrong_pin: 'Der PIN stimmt nicht.', invalid_profile: 'Bitte prüfe deine Angaben zum Profil.' } as Record<string, string>,
};

export const roleNames: Record<RoleId, string> = {
  villager: 'Dorfbewohner', wolf: 'Wolf', scout: 'Späher', tracker: 'Fährtenleser', alchemist: 'Alchemistin', guardian: 'Wächter', borderwalker: 'Grenzgänger', hunter: 'Jäger', shadowwolf: 'Schattenwolf', observer: 'Beobachter',
};

// Eigene Rollenbeschreibungen (keine Vorlagen aus bestehenden Spielen). Zahlen stehen bewusst nicht im Text:
// Nutzungen u. Ä. sind Konfiguration und werden im privaten Bereich aus dem Spielzustand gezeigt.
export const roleText: Record<RoleId, string> = {
  villager: 'Du hast keine besondere Fähigkeit. Beobachte, sprich und vertraue mit Bedacht.',
  wolf: 'Du gehörst zum Rudel und kennst die anderen. Gemeinsam bestimmt ihr in der Nacht ein Ziel.',
  scout: 'Du kannst nachts einen lebenden Spieler prüfen. Du erfährst nur: Dorf oder Rudel.',
  tracker: 'Du wählst nachts drei Personen und erfährst nur, ob sich unter ihnen mindestens ein Mitglied des Rudels befindet.',
  alchemist: 'Du besitzt einen einzigen Heiltrank. Wählt das Rudel sein Opfer, erfährst du es und entscheidest, ob du eingreifst.',
  guardian: 'Du kannst nachts eine Person schützen – auch dich selbst. Dieselbe Person nicht in zwei Nächten hintereinander.',
  borderwalker: 'Du entscheidest dich geheim, ob du zum Dorf oder zum Rudel gehörst. Das Dorf weiß nur, dass es dich gibt.',
  hunter: 'Scheidest du aus, hast du eine letzte Aktion: Du kannst einen lebenden Spieler mitnehmen.',
  shadowwolf: 'Du gehörst zum Rudel und kennst die anderen. Du kannst Informationswirkungen des Dorfes stören.',
  observer: 'Jede Nacht darfst du einen Blick in die Dunkelheit werfen: Halte gedrückt, und du erhältst einen wahren Hinweis auf ein Mitglied des Rudels – ohne Namen.',
};

export const impulseText = (key: string) => IMPULSES[key] ?? '';

/** Anzeigenamen der Fähigkeiten (IDs stammen aus der Rollen-Konfiguration; unbekannte IDs fallen auf die Art zurück). */
const abilityLabels: Record<string, string> = {
  scout: 'Zugehörigkeit prüfen', track: 'Fährte lesen', protect: 'Schützen', veil: 'Schleier legen',
};
const kindLabels: Record<string, string> = { inspect: 'Prüfen', inspect_group: 'Gruppe prüfen', protect: 'Schützen', veil: 'Schleier legen' };
export const abilityName = (id: string, kind: string) => abilityLabels[id] ?? kindLabels[kind] ?? id;

const HAIR_ADJ: Record<string, string> = { black: 'schwarze', brown: 'braune', blonde: 'blonde', red: 'rote', gray: 'graue', dark: 'dunkle', light: 'helle' };
const EYE_ADJ: Record<string, string> = { brown: 'braune', blue: 'blaue', green: 'grüne', gray: 'graue', light: 'helle' };

/** Beobachter-Hinweis: ein wahres Merkmal, knapp und atmosphärisch. */
export function observerHintText(st: TraitStatement): string {
  switch (st.trait) {
    case 'gender':
      return st.value === 'female' ? 'Du glaubst, eine Frau gesehen zu haben.' : st.value === 'male' ? 'Du glaubst, einen Mann gesehen zu haben.' : 'Die Gestalt wirkte weder eindeutig männlich noch weiblich.';
    case 'hair':
      return `Du erkennst ${HAIR_ADJ[st.value]} Haare.`;
    case 'eyes':
      return `Die Gestalt hat ${EYE_ADJ[st.value]} Augen.`;
    case 'age_over':
      return `Die Person ist über ${st.value}.`;
    case 'age_under':
      return `Die Person ist unter ${st.value}.`;
  }
}

/** „Ausschau halten": dieselbe Aussage, aus Sicht des Rudels formuliert. */
export function lookoutStatementText(st: TraitStatement): string {
  switch (st.trait) {
    case 'gender':
      return st.value === 'female' ? 'Die Person ist eine Frau.' : st.value === 'male' ? 'Die Person ist ein Mann.' : 'Die Person ist weder eindeutig Frau noch Mann.';
    case 'hair':
      return `Die Person hat ${HAIR_ADJ[st.value]} Haare.`;
    case 'eyes':
      return `Die Person hat ${EYE_ADJ[st.value]} Augen.`;
    case 'age_over':
      return `Die Person ist über ${st.value}.`;
    case 'age_under':
      return `Die Person ist unter ${st.value}.`;
  }
}

/** Neutrale atmosphärische Inhalte für alle, die vom Moment nicht betroffen sind (Index kommt deterministisch aus der Engine). */
export const neutralTexts: Record<string, string[]> = {
  default: [
    'Der Wind trägt heute nichts zu dir.',
    'Niemand flüstert deinen Namen. Noch nicht.',
    'Das Dorf schweigt – und du mit ihm.',
    'Die Schatten ziehen an dir vorüber.',
  ],
  borderwalker_decided: [
    'Hinter einer Tür fällt ein Entschluss. Nicht deiner.',
    'Eine Entscheidung ist gefallen – nicht in deinen Händen.',
    'Die Nacht hat ein Geheimnis mehr. Es gehört einem anderen.',
    'Jemand hat gewählt. Du bleibst, wo du bist.',
  ],
  pack_decided: [
    'In der Dunkelheit ist eine Wahl gefallen. Sie betrifft dich nicht.',
    'Etwas wurde entschieden. Du kannst nur warten.',
    'Die Nacht atmet ruhig. Für dich bleibt alles still.',
    'Was heute geschieht, geschieht ohne dein Zutun.',
  ],
};
export const neutralText = (kind: string, variant: number) => {
  const pool = neutralTexts[kind] ?? neutralTexts.default!;
  return pool[variant % pool.length]!;
};
