import type { ReactNode } from 'react';

import { Card } from '@/components/ui/card';

export function A2UICard({ children }: { children: ReactNode }) {
  return <Card padding="md">{children}</Card>;
}
