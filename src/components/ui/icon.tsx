import Svg, { Path } from 'react-native-svg';

import { DEFAULT_ICON_SIZE, type AppIconName, type AppIconProps } from './icon-names';

/**
 * Web implementation, and the module TypeScript resolves against.
 *
 * `@expo/ui`'s `Icon` renders nothing on web, so web keeps a hand-drawn set.
 * Metro picks `icon.ios.tsx` / `icon.android.tsx` on native; every
 * implementation takes the same props, so call sites never branch.
 *
 * All paths are stroked on a 24×24 grid at weight 2, which is what keeps a row
 * of mixed icons optically even.
 */
const paths: Record<AppIconName, readonly string[]> = {
  send: ['M5 12h13M13 6l6 6-6 6'],
  mic: [
    'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z',
    'M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8',
  ],
  copy: [
    'M9 8h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Zm-2 8H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1',
  ],
  edit: ['M4 20h4l11-11-4-4L4 16v4ZM13.5 6.5l4 4'],
  close: ['m7 7 10 10M17 7 7 17'],
  confirm: ['m6 12 4 4 8-9'],
  retry: ['M20 6v5h-5M19.1 11a7.5 7.5 0 1 0 .2 5'],
  menu: ['M4 7h16M4 12h16M4 17h16'],
  back: ['M19 12H5M11 6l-6 6 6 6'],
  expand: ['M12 5v14M5 12h14'],
  collapse: ['M5 12h14'],
  chevron: ['m9 6 6 6-6 6'],
  search: ['M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM20 20l-4-4'],
  settings: [
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
    'M4.5 12a7.5 7.5 0 0 1 .1-1.2l-1.8-1.4 2-3.4 2.1.8a7.5 7.5 0 0 1 2-1.2L9.3 3h4l.4 2.6a7.5 7.5 0 0 1 2 1.2l2.1-.8 2 3.4-1.8 1.4a7.5 7.5 0 0 1 0 2.4l1.8 1.4-2 3.4-2.1-.8a7.5 7.5 0 0 1-2 1.2l-.4 2.6h-4l-.4-2.6a7.5 7.5 0 0 1-2-1.2l-2.1.8-2-3.4 1.8-1.4A7.5 7.5 0 0 1 4.5 12Z',
  ],
  signOut: ['M15 12H4M11 8l-4 4 4 4', 'M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4'],
};

export function AppIcon({ name, size = DEFAULT_ICON_SIZE, color, accessibilityLabel }: AppIconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityLabel ? 'image' : 'none'}>
      {paths[name].map((d) => (
        <Path
          key={d}
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}

export type { AppIconName, AppIconProps };
