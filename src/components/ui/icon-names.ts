/**
 * The app's icon vocabulary.
 *
 * Names are semantic — what the control does, not what the glyph looks like —
 * so each platform can draw its own convention for it. `icon.ios.tsx` maps them
 * to SF Symbols, `icon.android.tsx` to Material Symbols, and `icon.tsx` (web)
 * to inline SVG, because `@expo/ui`'s `Icon` does not render on web.
 *
 * Add a name here first, then to all three maps; the maps are typed against this
 * union, so a missing one is a type error rather than a blank square.
 */
export type AppIconName =
  | 'send'
  | 'mic'
  | 'copy'
  | 'edit'
  | 'close'
  | 'confirm'
  | 'retry'
  | 'menu'
  | 'back'
  | 'expand'
  | 'collapse'
  | 'chevron'
  | 'search'
  | 'settings'
  | 'signOut';

export type AppIconProps = {
  name: AppIconName;
  /** Points on iOS, dp on Android, px on web. */
  size?: number;
  color: string;
  /**
   * Only for an icon that is the sole content of a control and has no adjacent
   * label. Icons inside a `Pressable` that already carries a label stay
   * decorative — two labels read as two controls to a screen reader.
   */
  accessibilityLabel?: string;
};

export const DEFAULT_ICON_SIZE = 20;
