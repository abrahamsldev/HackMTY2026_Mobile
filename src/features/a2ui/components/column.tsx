import type { ReactNode } from 'react';

import { Stack } from '@/components/layout/stack';

import type { A2UIColumnComponent } from '../types';

const justifyMap = {
  start: 'start',
  center: 'center',
  end: 'end',
  spaceBetween: 'between',
  spaceAround: 'center',
  spaceEvenly: 'between',
  stretch: 'start',
} as const;

export function A2UIColumn({
  children,
  justify = 'start',
  align = 'stretch',
}: {
  children: ReactNode;
  justify?: A2UIColumnComponent['justify'];
  align?: A2UIColumnComponent['align'];
}) {
  return (
    <Stack direction="column" spacing="md" justify={justifyMap[justify]} align={align}>
      {children}
    </Stack>
  );
}
