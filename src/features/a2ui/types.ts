export const A2UI_VERSION = 'v0.9.1' as const;
export const A2UI_BASIC_CATALOG_ID =
  'https://a2ui.org/specification/v0_9_1/catalogs/basic/catalog.json' as const;
export const A2UI_FINANCE_CATALOG_ID =
  'https://fluidbank.app/a2ui/catalogs/finance/v1' as const;
export const A2UI_BANKING_CATALOG_ID =
  'https://fluidbank.app/a2ui/catalogs/finance/v2' as const;

export const A2UI_LIMITS = {
  actionContextBytes: 16_384,
  componentsPerSurface: 500,
  dataModelBytes: 262_144,
  maxRenderDepth: 32,
  messagesPerResponse: 100,
  stringLength: 4_000,
} as const;

export type JSONPrimitive = string | number | boolean | null;
export type JSONValue = JSONPrimitive | JSONValue[] | { [key: string]: JSONValue };

export type A2UIBinding = { path: string };
export type A2UIDynamicString = string | A2UIBinding;
export type A2UIDynamicValue = string | number | boolean | JSONValue[] | A2UIBinding;

export type A2UIAccessibility = {
  label?: A2UIDynamicString;
  description?: A2UIDynamicString;
};

export type A2UIServerActionDefinition = {
  event: {
    name: string;
    context?: Record<string, A2UIDynamicValue>;
  };
};

type A2UIComponentCommon = {
  id: string;
  weight?: number;
  accessibility?: A2UIAccessibility;
};

export type A2UIAreaChartValue = {
  kind: 'area';
  accessibleSummary?: string;
  props: import('@/components/charts/area-chart-model').AreaChartData;
};

export type A2UIHeatmapChartValue = {
  kind: 'heatmap';
  accessibleSummary?: string;
  props: import('@/components/charts/heatmap-chart-model').HeatmapChartData;
};

export type A2UIChartValue = A2UIAreaChartValue | A2UIHeatmapChartValue;

export type A2UITextComponent = A2UIComponentCommon & {
  component: 'Text';
  text: A2UIDynamicString;
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'caption' | 'body';
};

export type A2UIButtonComponent = A2UIComponentCommon & {
  component: 'Button';
  child: string;
  variant?: 'default' | 'primary' | 'borderless';
  action: A2UIServerActionDefinition;
};

export type A2UICardComponent = A2UIComponentCommon & {
  component: 'Card';
  child: string;
};

export type A2UIColumnComponent = A2UIComponentCommon & {
  component: 'Column';
  children: string[];
  justify?: 'start' | 'center' | 'end' | 'spaceBetween' | 'spaceAround' | 'spaceEvenly' | 'stretch';
  align?: 'start' | 'center' | 'end' | 'stretch';
};

export type A2UIChartComponent = A2UIComponentCommon & {
  component: 'Chart';
  chart: A2UIChartValue | A2UIBinding;
};

export type A2UIBankingViewComponent = A2UIComponentCommon & {
  component: 'BankingView';
  view: import('../financial-ui/model').BankingViewData | A2UIBinding;
};

export type A2UIInputComponent = A2UIComponentCommon & (
  | { component: 'TextField'; label: A2UIDynamicString; value: A2UIBinding; variant?: 'shortText' | 'longText' | 'number' | 'obscured' }
  | { component: 'DateTimeInput'; label?: A2UIDynamicString; value: A2UIBinding; enableDate: true; enableTime?: false }
  | { component: 'Slider'; label?: A2UIDynamicString; value: A2UIBinding; min?: number; max: number }
);

export type A2UIComponent =
  | A2UIInputComponent
  | A2UITextComponent
  | A2UIButtonComponent
  | A2UICardComponent
  | A2UIColumnComponent
  | A2UIChartComponent
  | A2UIBankingViewComponent;

export type A2UICatalogId =
  | typeof A2UI_BASIC_CATALOG_ID
  | typeof A2UI_FINANCE_CATALOG_ID
  | typeof A2UI_BANKING_CATALOG_ID;

export type A2UITheme = {
  primaryColor?: string;
  iconUrl?: string;
  agentDisplayName?: string;
};

export type A2UICreateSurfaceMessage = {
  version: typeof A2UI_VERSION;
  createSurface: {
    surfaceId: string;
    catalogId: A2UICatalogId;
    theme?: A2UITheme;
    sendDataModel?: boolean;
  };
};

export type A2UIUpdateComponentsMessage = {
  version: typeof A2UI_VERSION;
  updateComponents: { surfaceId: string; components: A2UIComponent[] };
};

export type A2UIUpdateDataModelMessage = {
  version: typeof A2UI_VERSION;
  updateDataModel: { surfaceId: string; path?: string; value?: JSONValue };
};

export type A2UIDeleteSurfaceMessage = {
  version: typeof A2UI_VERSION;
  deleteSurface: { surfaceId: string };
};

export type A2UIMessage =
  | A2UICreateSurfaceMessage
  | A2UIUpdateComponentsMessage
  | A2UIUpdateDataModelMessage
  | A2UIDeleteSurfaceMessage;

export type A2UISurfaceState = {
  surfaceId: string;
  catalogId: A2UICatalogId;
  theme: A2UITheme;
  sendDataModel: boolean;
  components: ReadonlyMap<string, A2UIComponent>;
  dataModel: JSONValue | undefined;
  creationOrder: number;
};

export type A2UIAction = {
  name: string;
  surfaceId: string;
  sourceComponentId: string;
  timestamp: string;
  context: Record<string, JSONValue>;
};
