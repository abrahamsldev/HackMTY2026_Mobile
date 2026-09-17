import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

export type AssistantMarkProps = {
  size?: number;
};

/**
 * The assistant's own mark: a bot whose expression is a rising trend line.
 *
 * Distinct from `BanorteLoaderIcon`, which is the bank's mark and means "a turn
 * is running". This one means "this is who you are talking to", so it appears
 * once, at rest, on the welcome screen — and never animates.
 *
 * Drawn from the palette rather than fixed brand values, so it follows the
 * selected color palette and high-contrast setting like everything else.
 */
export function AssistantMark({ size = 72 }: AssistantMarkProps) {
  const theme = useTheme();
  const stroke = theme.accent;

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      accessibilityRole="image"
      accessibilityLabel="Asistente financiero">
      {/* Antenna: the one element that reads instantly as "bot". */}
      <Path d="M32 7v7" stroke={stroke} strokeWidth={3} strokeLinecap="round" />
      <Circle cx={32} cy={5} r={3} fill={stroke} />

      <Rect
        x={9}
        y={15}
        width={46}
        height={41}
        rx={14}
        fill={theme.accentSurface}
        stroke={stroke}
        strokeWidth={3}
      />

      <Circle cx={23} cy={29} r={3.2} fill={stroke} />
      <Circle cx={41} cy={29} r={3.2} fill={stroke} />

      {/* The mouth is a climbing series — the financial half of the mark. */}
      <Path
        d="M20 46l7-6 6 4 11-9"
        stroke={stroke}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
