export { createA2UIAction } from './action';
export { resolveDynamicString, resolveDynamicValue } from './bindings';
export { buildRenderPlan, SUPPORTED_BASIC_COMPONENTS } from './catalog';
export { resolveDataPath, updateDataModel } from './data-model';
export { A2UIMessageProcessor, componentChildren, messageSurfaceId } from './message-processor';
export {
  a2uiActionSchema,
  a2uiComponentSchema,
  a2uiMessageSchema,
  a2uiMessageSequenceSchema,
  decodeJsonPointer,
  isSafeJsonPointer,
} from './schemas';
export { extractA2UITransportReply, serializeActionForLegacyChat } from './transport';
export { A2UIRenderer, type A2UIRendererProps } from './renderer';
export * from './types';
