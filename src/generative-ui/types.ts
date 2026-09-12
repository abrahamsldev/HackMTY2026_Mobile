import type React from 'react';
import type { z } from 'zod';

export type ComponentStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'empty'
  | 'error'
  | 'success';

export type GenerativeAction = {
  event: string;
  tool?: string;
  payload?: Record<string, unknown>;
};

export type GenerativeNode = {
  id: string;
  type: string;
  props?: Record<string, unknown>;
  children?: GenerativeNode[];
  actions?: Record<string, GenerativeAction>;
  status?: ComponentStatus;
};

export type UIActionEvent = {
  event: string;
  componentId: string;
  tool?: string;
  payload?: Record<string, unknown>;
};

export type ActionHandler = (action: UIActionEvent) => void | Promise<void>;

export type ComponentRegistryEntry<P extends Record<string, unknown> = Record<string, unknown>> = {
  component: React.ComponentType<P>;
  propsSchema: z.ZodType<P>;
  allowsChildren: boolean;
  allowedActions: readonly string[];
  defaultProps?: Partial<P>;
};
