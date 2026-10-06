import { View } from 'react-native';
import { Text } from './primitives';
import { space } from './theme';

const sections: [string, string][] = [
  ['Worum es geht', 'DAS DORF ist ein Spiel unter Menschen. Die App verteilt geheime Rollen, führt private Nachrichten, stoppt die Zeit und zählt Stimmen. Reden, Bluffen, Zeigen und Verdächtigen passiert im Raum.'],
  ['Zwei Seiten', 'Das Dorf gewinnt sofort, wenn kein Mitglied des Rudels mehr lebt. Das Rudel gewinnt sofort, wenn es mindestens so viele Lebende zählt wie alle übrigen zusammen.'],
  ['Der Tag', 'Ihr wählt zuerst eine Person, die für das Dorf spricht. Dann diskutiert ihr, löst Quests und entscheidet, wann das Dorf bereit für den Dorfrat ist.'],
  ['Der Dorfrat', 'Ein begonnener Dorfrat endet immer mit genau einer Verbannung. Ihr nennt Personen, hört Verteidigungen und setzt dann verbindlich eure Stimme. Sind alle Stimmen gesperrt, zeigt ihr gleichzeitig im Raum auf eure Wahl: 3 – 2 – 1 – ZEIGT! Bei Gleichstand entscheidet die Person, die für das Dorf spricht.'],
  ['Die Nacht', 'Das Rudel bestimmt ein Ziel. Wer eine besondere Fähigkeit hat, nutzt sie im privaten Bereich. Alles Geheime liegt hinter eurem persönlichen PIN.'],
  ['Wer ausscheidet', 'Ausgeschiedene Spieler sind aus dem aktiven Spiel raus: Sie stimmen nicht mehr ab und schreiben nicht mehr. Rollen werden erst am Spielende aufgedeckt.'],
  ['Überraschende Rollen', 'Nicht jede Partie hat dieselben Sonderrollen. Manche tauchen erst später auf. Wenn sich im Dorf etwas verändert, sehen alle denselben Hinweis – nur die betroffene Person erfährt mehr.'],
];

export function RulesText() {
  return (
    <View style={{ gap: space.lg }}>
      <Text v="display">Regeln</Text>
      {sections.map(([h, b]) => (
        <View key={h} style={{ gap: space.xs }}>
          <Text v="title">{h}</Text>
          <Text>{b}</Text>
        </View>
      ))}
    </View>
  );
}
