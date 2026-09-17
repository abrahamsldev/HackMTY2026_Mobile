import { Host, Icon } from '@expo/ui';
import type { ImageSourcePropType } from 'react-native';

import { DEFAULT_ICON_SIZE, type AppIconName, type AppIconProps } from './icon-names';

/**
 * Android draws Material Symbols. These are XML vector drawables required
 * straight from `@expo/material-symbols`; Metro only has to resolve `.xml` in
 * this file, which is why the platform maps live in separate files instead of
 * one `Icon.select` module.
 */
const symbols: Record<AppIconName, ImageSourcePropType> = {
  send: require('@expo/material-symbols/arrow_forward.xml'),
  mic: require('@expo/material-symbols/mic.xml'),
  copy: require('@expo/material-symbols/content_copy.xml'),
  edit: require('@expo/material-symbols/edit.xml'),
  close: require('@expo/material-symbols/close.xml'),
  confirm: require('@expo/material-symbols/check.xml'),
  retry: require('@expo/material-symbols/refresh.xml'),
  menu: require('@expo/material-symbols/menu.xml'),
  back: require('@expo/material-symbols/arrow_back.xml'),
  expand: require('@expo/material-symbols/add.xml'),
  collapse: require('@expo/material-symbols/remove.xml'),
  chevron: require('@expo/material-symbols/chevron_right.xml'),
  search: require('@expo/material-symbols/search.xml'),
  settings: require('@expo/material-symbols/settings.xml'),
  signOut: require('@expo/material-symbols/logout.xml'),
};

export function AppIcon({ name, size = DEFAULT_ICON_SIZE, color, accessibilityLabel }: AppIconProps) {
  return (
    <Host matchContents>
      <Icon
        name={symbols[name]}
        size={size}
        color={color}
        accessibilityLabel={accessibilityLabel}
      />
    </Host>
  );
}

export type { AppIconName, AppIconProps };
