import type { QuestRewardDef } from './types';

// Eigene Inhalte (keine fremden Texte): Quests und Dorfimpulse.
// Texte sind bewusst kurz, ruhig und nicht-gewaltig (STYLE_GUIDE §19).

export type QuestCategory =
  | 'assess' // Einschätzen
  | 'taboo' // Tabu
  | 'coordination' // Koordination
  | 'shared_knowledge' // Gemeinsames Wissen
  | 'sorting' // Sortieren
  | 'memory' // Gedächtnis
  | 'dexterity'; // kleine Geschicklichkeitsaufgaben

export interface QuestDef {
  id: string;
  category: QuestCategory;
  title: string;
  goal: string;
  task: string;
  finish: string;
  /**
   * Spielmechanische Belohnung bei ERFOLGREICHER Erfüllung (alle Lebenden bestätigen vor Ablauf der Zeit).
   * Standard: keine. Nur ausdrücklich konfigurierte Quests lösen etwas aus.
   */
  reward?: QuestRewardDef;
  durationMs?: number;
}

export const QUESTS: QuestDef[] = [
  {
    id: 'q-wer-von-euch-1',
    category: 'assess',
    title: 'Wer von euch …',
    goal: 'Findet heraus, wie gut ihr einander einschätzt.',
    task: 'Jemand liest „Wer von euch würde bei Stromausfall als Erstes die Kerzen finden?“ vor. Alle zeigen gleichzeitig auf eine Person. Danach darf die gezeigte Person erklären, ob es stimmt.',
    finish: 'Fertig, sobald alle ihre Einschätzung erklärt haben.',
  },
  {
    id: 'q-wer-von-euch-2',
    category: 'assess',
    title: 'Der ruhigste Pol',
    goal: 'Tippt, wer in diesem Raum am schwersten aus der Ruhe zu bringen ist.',
    task: 'Jeder schreibt einen Namen auf einen Zettel oder merkt ihn sich. Dann nennt reihum, wen ihr gewählt habt – und warum.',
    finish: 'Fertig, wenn jede Begründung gehört wurde.',
  },
  {
    id: 'q-tabu-1',
    category: 'taboo',
    title: 'Ohne das Wort',
    goal: 'Erklärt einen Begriff, ohne ihn auszusprechen.',
    task: 'Reihum zieht jemand im Kopf einen Alltagsgegenstand und erklärt ihn der Gruppe, ohne dessen Namen oder Verwandte davon zu nennen. Wer das Wort rät, erklärt als Nächstes.',
    finish: 'Fertig nach drei erratenen Begriffen oder Ablauf der Zeit.',
  },
  {
    id: 'q-tabu-2',
    category: 'taboo',
    title: 'Verbotene Silbe',
    goal: 'Haltet ein kurzes Gespräch, ohne eine bestimmte Silbe zu benutzen.',
    task: 'Das Dorf einigt sich auf ein häufiges Wort („ja“, „nein“ oder „ich“). Zwei Minuten lang darf es niemand sagen. Wer es doch tut, sagt danach ein Geheimnis, das keines ist.',
    finish: 'Fertig nach zwei Minuten.',
    durationMs: 4 * 60_000,
  },
  {
    id: 'q-koordination-1',
    category: 'coordination',
    title: 'Gleicher Gedanke',
    goal: 'Findet ohne Absprache dieselbe Antwort.',
    task: 'Alle denken sich gleichzeitig eine Farbe, eine Zahl von 1 bis 10 und ein Tier aus. Auf „Jetzt“ sagen alle laut ihre Antworten. Wie viele Übereinstimmungen gibt es?',
    finish: 'Fertig nach drei Runden. Ihr dürft nach jeder Runde nur schweigen und nicken.',
    reward: { kind: 'role' },
  },
  {
    id: 'q-koordination-2',
    category: 'coordination',
    title: 'Im Takt',
    goal: 'Bringt das Dorf in einen gemeinsamen Rhythmus.',
    task: 'Ohne zu sprechen, versucht ihr, nacheinander von 1 bis zur Zahl der Mitspielenden zu zählen. Wenn zwei gleichzeitig sprechen, beginnt ihr von vorn.',
    finish: 'Fertig, sobald ihr einmal ohne Überschneidung durchkommt – oder die Zeit abläuft.',
  },
  {
    id: 'q-wissen-1',
    category: 'shared_knowledge',
    title: 'Was alle wissen',
    goal: 'Findet heraus, was das Dorf gemeinsam weiß.',
    task: 'Sammelt zusammen zehn Dinge, die garantiert jede Person in diesem Raum kennt, aber keine Fremde kennen würde.',
    finish: 'Fertig bei zehn Dingen, die alle bestätigen.',
    reward: { kind: 'hint' },
  },
  {
    id: 'q-wissen-2',
    category: 'shared_knowledge',
    title: 'Orte und Wege',
    goal: 'Beschreibt einen Ort, den alle schon gesehen haben.',
    task: 'Reihum nennt jemand einen Satz über einen Ort, den alle kennen müssten. Der Ort darf nicht genannt werden. Sobald alle ihn erraten, beginnt ein neuer.',
    finish: 'Fertig nach zwei Orten.',
  },
  {
    id: 'q-sortieren-1',
    category: 'sorting',
    title: 'Aufgereiht',
    goal: 'Stellt euch ohne zu sprechen in der richtigen Reihenfolge auf.',
    task: 'Ordnet euch nach Geburtstag im Jahr, ohne zu sprechen. Zeigt, was ihr könnt: Finger, Gesten, Blicke. Dann prüft laut.',
    finish: 'Fertig, wenn alle die Reihenfolge laut bestätigt haben.',
  },
  {
    id: 'q-sortieren-2',
    category: 'sorting',
    title: 'Alles in Ordnung',
    goal: 'Bringt Begriffe gemeinsam in eine Rangfolge.',
    task: 'Einigt euch auf eine Rangfolge von fünf Dingen vom Alltäglichsten zum Seltensten (z. B. Regenschirm, Fahrradschlüssel, Briefmarke, Taschenlampe, Gummiente). Jeder darf einmal umstellen.',
    finish: 'Fertig, wenn ihr eine Reihenfolge habt, mit der niemand laut widerspricht.',
  },
  {
    id: 'q-gedaechtnis-1',
    category: 'memory',
    title: 'Wer saß wo?',
    goal: 'Prüft, wie gut ihr euch den Abend gemerkt habt.',
    task: 'Alle schließen die Augen. Eine Person stellt drei Fragen zu dem, was heute im Raum zu sehen war (Kleidung, Gegenstände, Sitzplätze). Danach wird gemeinsam geprüft.',
    finish: 'Fertig nach drei Fragen.',
  },
  {
    id: 'q-gedaechtnis-2',
    category: 'memory',
    title: 'Die lange Kette',
    goal: 'Baut zusammen eine Merkkette auf.',
    task: 'Reihum wiederholt jede Person die bisherige Kette („Ich packe in meinen Korb …“) und fügt einen Gegenstand hinzu. Wer sich verhaspelt, beginnt die nächste Runde.',
    finish: 'Fertig nach zwei Runden oder wenn die Kette zehn Gegenstände hat.',
  },
  {
    id: 'q-geschick-1',
    category: 'dexterity',
    title: 'Ruhige Hand',
    goal: 'Haltet etwas stabil, während die anderen reden.',
    task: 'Alle stapeln mit dem, was zur Hand ist (Bierdeckel, Münzen, Löffel), einen möglichst hohen Turm, während sie dabei über ihren Tag erzählen. Wessen Turm fällt, erzählt eine Gegenfrage.',
    finish: 'Fertig nach Ablauf der Zeit.',
  },
  {
    id: 'q-geschick-2',
    category: 'dexterity',
    title: 'Die Kerze des Dorfes',
    goal: 'Gebt etwas gemeinsam weiter, ohne dass es herunterfällt.',
    task: 'Gebt einen Löffel mit einer Münze reihum, ohne dass die Münze fällt. Während der Weitergabe nennt jede Person eine Eigenschaft der nächsten.',
    finish: 'Fertig, wenn die Münze einmal im Kreis ist.',
  },
];

/**
 * Dorfimpulse: kurze, echte Hinweise zu Beobachtung, Gruppendynamik und Täuschung.
 * Der Text wird über textKey in der App lokalisiert; hier die deutschen Texte als
 * Referenz, damit Engine/Tests/Tools sie ebenfalls nutzen können.
 */
export const IMPULSES: Record<string, string> = {
  'impulse.timing': 'Wer zuerst schnell antwortet, hat nicht immer am meisten zu sagen.',
  'impulse.questions': 'Achtet darauf, wer Fragen beantwortet – und wer sie nur weitergibt.',
  'impulse.agree': 'Zustimmung kann Vertrauen sein. Oder Deckung.',
  'impulse.silence': 'Schweigen fällt erst auf, wenn alle anderen reden.',
  'impulse.repeat': 'Wer Sätze wiederholt, die er eben gehört hat, sucht oft Zeit.',
  'impulse.change': 'Wenn jemand plötzlich die Meinung ändert: Fragt nach dem Grund.',
  'impulse.eyes': 'Blicke verraten nicht, ob jemand lügt. Aber, wen er im Blick behält.',
  'impulse.details': 'Wahre Geschichten haben oft zu viele Details. Erfundene meist genau die richtigen.',
  'impulse.group': 'Gruppen werden schneller laut, wenn sie sich unsicher sind.',
  'impulse.accuse': 'Wer anklagt, braucht nur einen Satz. Wer sich verteidigt, braucht mehr.',
  'impulse.calm': 'Ruhe ist ein Signal – in beide Richtungen.',
  'impulse.change-village': 'Im Dorf hat sich etwas verändert. Schaut in euren privaten Bereich.',
};

export const NEUTRAL_CHANGE_IMPULSE = 'impulse.change-village';
export const HINT_IMPULSE_KEYS = Object.keys(IMPULSES).filter((k) => k !== NEUTRAL_CHANGE_IMPULSE);
