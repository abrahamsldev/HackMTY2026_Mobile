import { Fragment, useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { InputModel, serverSignature } from './a2ui_actions/model';
import { A2UIInput } from './a2ui_actions/input';
import { InfoBanner } from '@/components/ui/info-banner';
import { resolveDynamicString } from './bindings';
import { A2UIButton } from './a2ui_actions/button';
import { A2UICard } from './components/card';
import { A2UIChart } from './components/chart';
import { A2UIBankingView } from './components/banking-view';
import { A2UIColumn } from './components/column';
import { A2UIText } from './components/text';
import { A2UIUnsupported } from './components/unsupported';
import { A2UI_LIMITS, type A2UIAction, type A2UIActionOrigin, type A2UIComponent, type A2UISurfaceState } from './types';

export type A2UIRendererProps = {
  surface: A2UISurfaceState;
  disabled?: boolean;
  onAction?: (action: A2UIAction, origin?: A2UIActionOrigin) => void | Promise<void>;
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
  onError: (message?: string) => void,
  inputs: InputModel,
  onInput: () => void,
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
          {renderComponent(surface, component.child, disabled, onAction, onError, inputs, onInput, depth + 1, nextAncestors)}
        </A2UICard>
      );
      break;
    case 'Column':
      rendered = (
        <A2UIColumn justify={component.justify} align={component.align}>
          {component.children.map((childId) => (
            <Fragment key={childId}>
              {renderComponent(surface, childId, disabled, onAction, onError, inputs, onInput, depth + 1, nextAncestors)}
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
          onPress={(origin) => {
            try {
              const result = onAction?.(inputs.action(component), origin);
              if (result instanceof Promise) result.catch(() => onError?.());
            } catch (error) {
              onError(error instanceof Error ? error.message : undefined);
            }
          }}
        />
      );
      break;
    }
    case 'TextField':
    case 'DateTimeInput':
    case 'Slider':
      rendered = (
        <A2UIInput
          component={component}
          model={surface.dataModel}
          disabled={disabled}
          onChange={(input, value) => {
            try {
              inputs.write(input, value);
              onInput();
            } catch (error) {
              onError(error instanceof Error ? error.message : undefined);
            }
          }}
        />
      );
      break;
    case 'Chart':
      rendered = <A2UIChart chart={component.chart} dataModel={surface.dataModel} />;
      break;
    case 'BankingView':
      rendered = <A2UIBankingView view={component.view} dataModel={surface.dataModel} />;
      break;
  }

  if (component.weight === undefined) return rendered;
  return <View style={{ flexGrow: component.weight, flexBasis: 0 }}>{rendered}</View>;
}

function A2UIRendererDraft({ surface, disabled = false, onAction, onError }: A2UIRendererProps) {
  const [inputs] = useState(() => new InputModel(surface));
  const [renderSurface, setRenderSurface] = useState(surface);
  const [error, setError] = useState<string | null>(null);

  return (
    <View style={{ gap: 16 }}>
      {renderComponent(
        renderSurface, 'root', disabled || !onAction, onAction,
        (message) => {
          setError(message ?? 'No se pudo enviar la acción. Inténtalo de nuevo.');
          onError?.();
        },
        inputs,
        () => {
          setError(null);
          setRenderSurface(inputs.surface);
        },
        0, new Set(),
      )}
      {error && <InfoBanner tone="danger" message={error} />}
    </View>
  );
}

export function A2UIRenderer(props: A2UIRendererProps) {
  return <A2UIRendererDraft key={serverSignature(props.surface)} {...props} />;
}
