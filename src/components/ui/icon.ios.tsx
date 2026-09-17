import { Host, Icon } from '@expo/ui';
import type { SFSymbol } from 'sf-symbols-typescript';

import { DEFAULT_ICON_SIZE, type AppIconName, type AppIconProps } from './icon-names';

/**
 * iOS draws the system convention for each name — see `icon-names.ts`. Typing
 * the map as `SFSymbol` means a misspelled symbol fails to compile rather than
 * rendering an empty box on device.
 */
const symbols: Record<AppIconName, SFSymbol> = {
  send: 'arrow.right',
  mic: 'mic.fill',
  copy: 'doc.on.doc',
  edit: 'pencil',
  close: 'xmark',
  confirm: 'checkmark',
  retry: 'arrow.clockwise',
  menu: 'line.3.horizontal',
  back: 'arrow.left',
  expand: 'plus',
  collapse: 'minus',
  chevron: 'chevron.right',
  search: 'magnifyingglass',
  settings: 'gearshape',
  signOut: 'rectangle.portrait.and.arrow.right',
};

export function AppIcon({ name, size = DEFAULT_ICON_SIZE, color }: AppIconProps) {
  return (
    // `matchContents` keeps the native host from claiming more room than the
    // glyph, so an icon still centers inside its Pressable.
    <Host matchContents>
      <Icon name={symbols[name]} size={size} color={color} />
    </Host>
  );
}

export type { AppIconName, AppIconProps };
