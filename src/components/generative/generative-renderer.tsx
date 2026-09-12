import React from 'react';

import { createComponentActionHandlers } from '@/generative-ui/action-dispatcher';
import { generativeNodeSchema } from '@/generative-ui/component-schemas';
import { getComponentDefinition } from '@/generative-ui/component-registry';
import type { ActionHandler, GenerativeNode } from '@/generative-ui/types';

import { GenerativeError } from './generative-error';

export type GenerativeRendererProps = {
  node: GenerativeNode;
  onAction?: ActionHandler;
};

export function GenerativeRenderer({ node, onAction }: GenerativeRendererProps) {
  // 1. Validate top-level node structure
  const nodeValidation = generativeNodeSchema.safeParse(node);
  if (!nodeValidation.success) {
    const errorMsg = nodeValidation.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    return (
      <GenerativeError
        nodeId={node?.id ?? 'unknown'}
        type={node?.type ?? 'unknown'}
        error={`Invalid node structure: ${errorMsg}`}
      />
    );
  }

  const validNode = nodeValidation.data;

  // 2. Lookup component definition in registry
  const definition = getComponentDefinition(validNode.type);
  if (!definition) {
    return (
      <GenerativeError
        nodeId={validNode.id}
        type={validNode.type}
        error={`Component "${validNode.type}" is not registered in the system registry.`}
      />
    );
  }

  // 3. Validate component props against registry schema
  const rawProps = validNode.props ?? {};
  const propsValidation = definition.propsSchema.safeParse(rawProps);
  if (!propsValidation.success) {
    const errorMsg = propsValidation.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    return (
      <GenerativeError
        nodeId={validNode.id}
        type={validNode.type}
        error={`Props validation failed: ${errorMsg}`}
      />
    );
  }

  const validatedProps = propsValidation.data;

  // 4. Attach allowed actions transformed into native callbacks
  const actionHandlers = createComponentActionHandlers(
    validNode,
    definition.allowedActions,
    onAction,
  );

  // 5. Recursively render children if permitted
  let renderedChildren: React.ReactNode = null;
  if (definition.allowsChildren && validNode.children && validNode.children.length > 0) {
    renderedChildren = validNode.children.map((childNode) => (
      <GenerativeRenderer
        key={childNode.id}
        node={childNode}
        onAction={onAction}
      />
    ));
  }

  // 6. Instantiate component dynamically without switch-case
  const Component = definition.component;
  return (
    <Component {...validatedProps} {...actionHandlers}>
      {renderedChildren}
    </Component>
  );
}
