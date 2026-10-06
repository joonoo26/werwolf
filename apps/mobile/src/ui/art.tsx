// Eigene, reduzierte Illustrationen (keine fremden Assets): Mond, Wald, Dorf, Glut.
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';
import { colors } from './theme';

/** Markenzeichen: heller Mond, schwarze Dachsilhouette, ein schmaler Glut-Akzent (Türspalt). */
export function Mark({ size = 96, framed = false }: { size?: number; framed?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel="DAS DORF" accessible>
      {framed && <Rect x="0" y="0" width="100" height="100" rx="22" fill={colors.night900} />}
      <Circle cx="50" cy="42" r="26" fill={colors.ivory100} />
      <Path d="M18 80 L18 62 L50 44 L82 62 L82 80 Z" fill="#050709" />
      <Rect x="46.5" y="64" width="7" height="16" fill={colors.ember500} />
    </Svg>
  );
}

/** Atmosphärische Dorfszene für Startbildschirm. */
export function VillageScene({ width, height }: { width: number; height: number }) {
  const w = 400;
  const h = 520;
  const trees = Array.from({ length: 16 }, (_, i) => ({ x: i * 27 - 8, s: 0.8 + ((i * 37) % 5) / 8 }));
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid slice" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Defs>
        <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#070B0D" />
          <Stop offset="1" stopColor="#16201F" />
        </LinearGradient>
        <RadialGradient id="moonGlow" cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor={colors.ivory100} stopOpacity="0.35" />
          <Stop offset="1" stopColor={colors.ivory100} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="fire" cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor={colors.fire400} stopOpacity="0.85" />
          <Stop offset="0.5" stopColor={colors.ember500} stopOpacity="0.35" />
          <Stop offset="1" stopColor={colors.ember500} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect width={w} height={h} fill="url(#sky)" />
      <Circle cx="290" cy="110" r="120" fill="url(#moonGlow)" />
      <Circle cx="290" cy="110" r="38" fill={colors.ivory100} />
      <Circle cx="276" cy="100" r="6" fill="#D9CFBD" opacity="0.6" />
      <Circle cx="303" cy="122" r="4" fill="#D9CFBD" opacity="0.5" />
      <Path d={`M0 330 L60 250 L110 300 L170 230 L240 310 L300 250 L360 300 L400 270 L400 ${h} L0 ${h} Z`} fill="#0D1417" />
      <Ellipse cx="200" cy="430" rx="190" ry="60" fill="url(#fire)" />
      <G>
        {[[70, 395], [150, 370], [260, 372], [335, 398]].map(([x, y], i) => (
          <G key={i}>
            <Polygon points={`${x! - 26},${y} ${x},${y! - 24} ${x! + 26},${y}`} fill="#06090B" />
            <Rect x={x! - 20} y={y} width="40" height="30" fill="#06090B" />
            <Rect x={x! - 5} y={y! + 8} width="9" height="11" fill={colors.fire400} opacity="0.9" />
          </G>
        ))}
      </G>
      {trees.map((t, i) => (
        <G key={i} transform={`translate(${t.x} ${h - 120 - (i % 3) * 8}) scale(${t.s})`}>
          <Polygon points="20,0 38,50 2,50" fill="#050709" />
          <Polygon points="20,28 44,88 -4,88" fill="#050709" />
          <Rect x="17" y="86" width="6" height="26" fill="#050709" />
        </G>
      ))}
      <Rect y={h - 50} width={w} height="50" fill="#050709" />
      <Ellipse cx="200" cy="440" rx="14" ry="6" fill="#0A0D0F" />
      <Path d="M192 438 C196 418 200 424 200 404 C206 420 210 428 208 438 Z" fill={colors.fire400} />
      <Path d="M196 438 C198 426 201 428 201 416 C205 426 206 432 205 438 Z" fill={colors.ember500} />
    </Svg>
  );
}

/** Kreisförmige Dorfplatz-Anordnung für Dorfrat und iPad-Anzeige: Feuer in der Mitte. */
export function Hearth({ size, flame = true }: { size: number; flame?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Defs>
        <RadialGradient id="h" cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor={colors.fire400} stopOpacity="0.7" />
          <Stop offset="0.6" stopColor={colors.ember500} stopOpacity="0.2" />
          <Stop offset="1" stopColor={colors.ember500} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx="50" cy="50" r="50" fill="url(#h)" />
      <Circle cx="50" cy="50" r="46" fill="none" stroke={colors.ivory300} strokeOpacity="0.15" strokeWidth="0.5" />
      {flame && <Path d="M44 58 C46 46 50 50 50 38 C55 48 57 52 56 58 Z" fill={colors.fire400} />}
      {flame && <Path d="M47 58 C48 51 50 52 50 45 C53 51 54 54 53 58 Z" fill={colors.ember500} />}
    </Svg>
  );
}
