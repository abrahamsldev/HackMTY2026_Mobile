import { Fragment, type ReactNode } from 'react';
import { View } from 'react-native';

import { createA2UIAction } from './action';
import { resolveDynamicString } from './bindings';
import { A2UIButton } from './components/button';
import { A2UICard } from './components/card';
import { A2UIColumn } from './components/column';
import { A2UIText } from './components/text';
import { A2UIUnsupported } from './components/unsupported';
import { A2UI_LIMITS, type A2UIAction, type A2UIComponent, type A2UISurfaceState } from './types';

export type A2UIRendererProps = {
  surface: A2UISurfaceState;
  disabled?: boolean;
  onAction?: (action: A2UIAction) => void | Promise<void>;
  onError?: () => void;
};

function accessibilityText(
  component: A2UIComponent,
  surface: A2UISurfaceState,
): { label?: string; description?: string } | undefined {
  if (!component.accessibility) return undefined;
  return {
    label: component.accessibility.label
      ? resolveDynamicString(component.accessibility.label, surface.dataModel)
      : undefined,
    description: component.accessibility.description
      ? resolveDynamicString(component.accessibility.description, surface.dataModel)
      : undefined,
  };
}

function renderComponent(
  surface: A2UISurfaceState,
  componentId: string,
  disabled: boolean,
  onAction: A2UIRendererProps['onAction'],
  onError: A2UIRendererProps['onError'],
  depth: number,
  ancestors: ReadonlySet<string>,
): ReactNode {
  if (depth >= A2UI_LIMITS.maxRenderDepth || ancestors.has(componentId)) {
    return <A2UIUnsupported />;
  }
  const component = surface.components.get(componentId);
  if (!component) return <A2UIUnsupported />;
  const nextAncestors = new Set(ancestors).add(componentId);
  let rendered: ReactNode;

  switch (component.component) {
    case 'Text': {
      const value = resolveDynamicString(component.text, surface.dataModel);
      rendered = value === undefined
        ? <A2UIUnsupported />
        : <A2UIText value={value} variant={component.variant} accessibility={accessibilityText(component, surface)} />;
      break;
    }
    case 'Card':
      rendered = (
        <A2UICard>
          {renderComponent(surface, component.child, disabled, onAction, onError, depth + 1, nextAncestors)}
        </A2UICard>
      );
      break;
    case 'Column':
      rendered = (
        <A2UIColumn justify={component.justify} align={component.align}>
          {component.children.map((childId) => (
            <Fragment key={childId}>
              {renderComponent(surface, childId, disabled, onAction, onError, depth + 1, nextAncestors)}
            </Fragment>
          ))}
        </A2UIColumn>
      );
      break;
    case 'Button': {
      const child = surface.components.get(component.child);
      const label = child?.component === 'Text'
        ? resolveDynamicString(child.text, surface.dataModel)
        : undefined;
      if (label === undefined) {
        rendered = <A2UIUnsupported />;
        break;
      }
      rendered = (
        <A2UIButton
          label={label}
          variant={component.variant}
          disabled={disabled}
          onPress={() => {
            try {
              const result = onAction?.(createA2UIAction(surface, component));
              if (result instanceof Promise) result.catch(() => onError?.());
            } catch {
              onError?.();
            }
          }}
        />
      );
      break;
    }
  }

  if (component.weight === undefined) return rendered;
  return <View style={{ flexGrow: component.weight, flexBasis: 0 }}>{rendered}</View>;
}

export function A2UIRenderer({ surface, disabled = false, onAction, onError }: A2UIRendererProps) {
  return <>{renderComponent(surface, 'root', disabled, onAction, onError, 0, new Set())}</>;
}
