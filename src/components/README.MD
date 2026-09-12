# HackMTY2026 Mobile - Generative Financial UI

Aplicacion movil de banca personal construida para el reto de UI generativa de Banorte x Tecnologico de Monterrey en HackMTY 2026.

El proyecto explora una experiencia financiera en la que un agente de inteligencia artificial no se limita a responder con texto. El agente interpreta la intencion del usuario, consulta datos y herramientas financieras, selecciona componentes registrados y produce una descripcion estructurada de la interfaz que la aplicacion renderiza en tiempo real.

> Estado actual: la infraestructura local de UI generativa y la primera biblioteca de componentes ya funcionan con datos sinteticos. La conexion real con un agente LLM y un servidor MCP todavia no esta implementada.

## Objetivo del reto

Construir al menos un flujo financiero completo en el que:

1. El usuario expresa una necesidad financiera.
2. Un LLM interpreta la intencion y el contexto.
3. MCP proporciona datos, herramientas y acciones.
4. El LLM selecciona componentes y genera un arbol A2UI, o un JSON equivalente.
5. La aplicacion valida y renderiza ese arbol.
6. El usuario interactua con la interfaz generada.
7. La interaccion vuelve al agente como un evento estructurado.
8. El agente ejecuta una accion o genera una nueva interfaz.

El reto prioriza utilidad, adaptabilidad, calidad de IA y arquitectura. Un flujo pequeno y terminado tiene mas valor que muchas pantallas incompletas.

## Arquitectura

```mermaid
flowchart TD
    U["Usuario"] --> L["Agente / LLM"]
    L --> M["MCP: datos y herramientas"]
    M --> L
    L --> A["Arbol A2UI JSON"]
    A --> R["Registry + Zod + Renderer"]
    R --> UI["Interfaz React Native"]
    UI --> E["UIActionEvent"]
    E --> L
```

### Responsabilidad de cada capa

| Capa | Responsabilidad |
|---|---|
| LLM | Interpreta la intencion, decide que componentes utilizar y construye el arbol de UI. |
| MCP | Expone datos, consultas y acciones financieras al agente. |
| A2UI | Transporta una descripcion declarativa y serializable de la interfaz. |
| Registry | Define la lista blanca de componentes que el agente puede utilizar. |
| Zod | Valida nodos, propiedades y acciones antes del renderizado. |
| GenerativeRenderer | Resuelve componentes registrados y renderiza el arbol recursivamente. |
| React Native | Presenta la interfaz y captura las interacciones del usuario. |
| Action dispatcher | Convierte callbacks internos en eventos estructurados para el agente. |

### Aclaracion importante

MCP no selecciona, importa ni modifica componentes React Native. El LLM selecciona componentes; A2UI describe la interfaz; MCP proporciona datos y ejecuta herramientas; el frontend valida y renderiza los componentes registrados.

## Stack tecnico

Las versiones reportadas durante la implementacion actual son:

| Tecnologia | Version aproximada |
|---|---:|
| Expo | `~57.0.22` |
| React Native | `0.86.3` |
| React | `19.2.3` |
| Expo Router | `~57.0.21` |
| TypeScript | `~6.0.3` |
| Zod | `^3.24.2` |
| react-native-safe-area-context | `~5.7.0` |

El proyecto no utiliza NativeWind. Los componentes actuales usan primitivas de React Native, `StyleSheet`, los tokens de `src/constants/theme.ts` y `useTheme()`.

## Estructura relevante

```text
HackMTY2026_Mobile/
├── assets/
├── src/
│   ├── app/
│   │   ├── _layout.tsx
│   │   ├── index.tsx
│   │   └── settings.tsx
│   ├── components/
│   │   ├── generative/
│   │   │   ├── generative-error.tsx
│   │   │   ├── generative-renderer.tsx
│   │   │   └── index.ts
│   │   ├── layout/
│   │   │   ├── page.tsx
│   │   │   ├── section.tsx
│   │   │   ├── grid.tsx
│   │   │   ├── stack.tsx
│   │   │   └── index.ts
│   │   └── ui/
│   │       ├── action-button.tsx
│   │       ├── card.tsx
│   │       ├── divider.tsx
│   │       ├── empty-state.tsx
│   │       ├── info-banner.tsx
│   │       ├── progress-bar.tsx
│   │       ├── status-badge.tsx
│   │       ├── text-block.tsx
│   │       └── index.ts
│   ├── constants/
│   │   └── theme.ts
│   ├── features/
│   │   └── personal-banking/
│   │       ├── components/
│   │       │   ├── account-balance-card.tsx
│   │       │   ├── financial-stat-card.tsx
│   │       │   ├── spending-category-chart.tsx
│   │       │   ├── transaction-item.tsx
│   │       │   ├── transaction-list.tsx
│   │       │   └── index.ts
│   │       └── index.ts
│   ├── generative-ui/
│   │   ├── action-dispatcher.ts
│   │   ├── component-registry.ts
│   │   ├── component-schemas.ts
│   │   ├── example-interface.ts
│   │   ├── types.ts
│   │   └── index.ts
│   └── hooks/
│       └── use-theme.ts
├── AGENTS.md
├── CLAUDE.md
├── app.json
├── package.json
└── tsconfig.json
```

## Estado actual

### Infraestructura terminada

- Tipos base para nodos generativos, acciones, estados y eventos.
- Registro explicito de componentes permitidos.
- Esquemas Zod estrictos para propiedades serializables.
- Renderer recursivo sin un `switch` especifico por componente.
- Fallback visual para nodos invalidos.
- Dispatcher de acciones estaticas y payload dinamico explicito.
- Interfaz financiera sintetica en `src/app/index.tsx`.
- Drawer de cuenta con Configuración y Cerrar sesión; sin tabs ni ruta Explore.
- Soporte de tema claro y oscuro mediante tokens existentes.

### Componentes de layout

| Componente | Proposito |
|---|---|
| `Page` | Contenedor principal, area segura y scroll opcional. |
| `Section` | Agrupacion de contenido con espaciado controlado. |
| `Grid` | Distribucion responsiva basada en Flexbox. |
| `Stack` | Acomodo vertical u horizontal mediante Flexbox. |

### Componentes genericos de UI

| Componente | Proposito |
|---|---|
| `Card` | Superficie de contenido, opcionalmente interactiva. |
| `TextBlock` | Texto seguro con variantes tipograficas controladas. |
| `ActionButton` | Boton con variantes, carga, bloqueo y evento `onPress`. |
| `StatusBadge` | Estado textual con tono semantico. |
| `ProgressBar` | Progreso validado entre 0 y 100. |
| `InfoBanner` | Aviso informativo, exitoso, preventivo o de error. |
| `Divider` | Separador horizontal con sangria controlada. |
| `EmptyState` | Estado vacio con titulo y descripcion. |

### Componentes de banca personal

| Componente | Proposito |
|---|---|
| `AccountBalanceCard` | Cuenta enmascarada, saldo disponible y estado. |
| `FinancialStatCard` | Metrica de ingresos, gastos, ahorro o porcentaje. |
| `TransactionList` | Contenedor de movimientos recientes. |
| `TransactionItem` | Movimiento individual con monto, fecha, categoria y estado. |
| `SpendingCategoryChart` | Gastos agregados por categoria mediante barras horizontales. |

## Contrato de UI generativa

La unidad principal es un nodo serializable:

```ts
type ComponentStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'empty'
  | 'error'
  | 'success';

type GenerativeAction = {
  event: string;
  tool?: string;
  payload?: Record<string, unknown>;
};

type GenerativeNode = {
  id: string;
  type: string;
  props?: Record<string, unknown>;
  children?: GenerativeNode[];
  actions?: Record<string, GenerativeAction>;
  status?: ComponentStatus;
};
```

### Ejemplo

```json
{
  "id": "main-account",
  "type": "AccountBalanceCard",
  "props": {
    "accountId": "account-001",
    "accountName": "Cuenta Enlace Personal",
    "accountType": "checking",
    "accountLastFour": "4821",
    "availableBalance": 128450,
    "currency": "MXN",
    "status": "active",
    "variant": "highlighted"
  },
  "actions": {
    "onPress": {
      "event": "view_account_details",
      "tool": "banorte_get_account_details",
      "payload": {
        "accountId": "account-001"
      }
    }
  }
}
```

## Registro de componentes

Un componente solo puede ser generado por el agente si aparece en `src/generative-ui/component-registry.ts`.

Cada entrada contiene:

- Componente React Native.
- Esquema Zod de propiedades.
- Permiso para recibir hijos.
- Lista blanca de acciones.

Ejemplo conceptual:

```ts
AccountBalanceCard: {
  component: AccountBalanceCard,
  propsSchema: accountBalanceCardPropsSchema,
  allowsChildren: false,
  allowedActions: ['onPress'],
}
```

El renderer no debe modificarse cada vez que se agrega un componente. Un componente nuevo se integra mediante su implementacion, esquema, exportacion y entrada de registro.

## Eventos y payload dinamico

Los componentes no reciben funciones desde JSON. El dispatcher transforma acciones declarativas en callbacks internos y emite un `UIActionEvent`:

```ts
type UIActionEvent = {
  event: string;
  componentId: string;
  tool?: string;
  payload?: Record<string, unknown>;
};
```

Los callbacks que necesitan informacion de la interaccion deben enviar un objeto plano explicito:

```ts
onCategoryPress?.({ category: item.category });
```

No se infieren propiedades a partir de nombres como `onCategoryPress` o `onDateChange`.

El dispatcher combina el payload dinamico con el payload declarado en A2UI. Los datos declarados por A2UI tienen prioridad:

```ts
const mergedPayload = {
  ...runtimePayload,
  ...(actionConfig.payload ?? {}),
};
```

Ejemplo resultante:

```json
{
  "event": "spending_category_selected",
  "componentId": "monthly-spending-chart",
  "tool": "banorte_get_transactions_by_category",
  "payload": {
    "category": "food",
    "accountId": "account-001",
    "period": "2026-09"
  }
}
```

## Convenciones financieras

### Montos

- Los montos viajan como numeros, nunca como cadenas preformateadas.
- Los cargos y gastos utilizan numeros negativos.
- Los abonos e ingresos utilizan numeros positivos.
- El signo depende del valor numerico, no de `tone`, categoria o color.
- Cada componente formatea la moneda mediante `Intl.NumberFormat('es-MX')`.
- Las monedas permitidas actualmente son `MXN` y `USD`.

### Cuentas

- Nunca se envia ni muestra el numero completo de una cuenta.
- `AccountBalanceCard` acepta unicamente los ultimos cuatro digitos.
- Los datos de ejemplo son sinteticos y no representan clientes reales.

### Fechas

- Las fechas viajan como cadenas ISO 8601.
- Los esquemas deben validarlas estrictamente.
- La presentacion utiliza formato regional mexicano.

### Categorias actuales

```text
food
transport
entertainment
utilities
health
shopping
income
transfer
other
```

## Seguridad del renderer

El arbol generado se considera entrada no confiable.

Reglas obligatorias:

- Rechazar componentes no registrados.
- Validar todas las propiedades con esquemas `.strict()`.
- No aceptar funciones dentro del JSON.
- No aceptar objetos `style` arbitrarios.
- No aceptar colores o clases arbitrarias.
- No ejecutar codigo recibido como texto.
- No utilizar `eval`, `Function` o imports dinamicos definidos por el modelo.
- No aceptar HTML arbitrario ni `dangerouslySetInnerHTML`.
- No permitir que un componente visual llame MCP directamente.
- Rechazar payloads dinamicos que no sean objetos planos.
- No permitir que un payload dinamico reemplace parametros protegidos declarados en A2UI.
- Mostrar un error controlado sin derribar toda la pantalla.

## Navegación y sesión

La ruta temporal `explore.tsx` y los tabs fueron eliminados. Inicio es la única superficie financiera; Configuración edita datos de cuenta y se abre desde el drawer. Consulta el [README principal](../../README.md) para configurar Supabase, revisar el modo sin sesión y conocer las diferencias pendientes entre el árbol local y el contrato `a2ui/v1` del agente.

## Ejecucion local

### Requisitos

- Node.js compatible con la version de Expo del proyecto.
- npm.
- Expo Go, emulador Android o navegador web.

### Instalacion

```bash
npm install
```

### Desarrollo

```bash
npx expo start -c
```

Desde la consola de Expo:

- Presionar `a` para Android.
- Presionar `w` para web.
- Presionar `i` para iOS cuando el entorno lo permita.
- Escanear el codigo QR para utilizar Expo Go.

### Verificacion estatica

```bash
npx tsc --noEmit
npx eslint src/components src/features src/generative-ui src/app
```

Existe una advertencia preexistente del template en `src/hooks/use-color-scheme.web.ts` relacionada con `react-hooks/set-state-in-effect`. No debe ocultarse ni mezclarse con errores introducidos por componentes nuevos.

## Prueba manual minima

Antes de integrar cambios:

1. Abrir la pantalla principal y confirmar que el arbol financiero se renderiza.
2. Presionar la cuenta y verificar `view_account_details`.
3. Presionar un movimiento y verificar `view_transaction_details`.
4. Seleccionar una categoria y verificar `spending_category_selected`.
5. Abrir la pestana Explorar y revisar el catalogo completo.
6. Confirmar que botones bloqueados o cargando no ejecutan acciones.
7. Revisar modo claro y oscuro.
8. Revisar telefono vertical, horizontal y Expo Web.
9. Confirmar que no exista scroll horizontal ni contenido tapado por las pestanas.
10. Ejecutar TypeScript y ESLint.

## Como agregar un componente generativo

Seguir siempre este orden:

1. Definir el problema y las propiedades serializables.
2. Crear el componente React Native.
3. Separar callbacks internos de propiedades A2UI.
4. Crear un esquema Zod estricto.
5. Exportar el componente y sus tipos.
6. Agregarlo a `componentRegistry`.
7. Definir `allowsChildren` y `allowedActions`.
8. Agregar un ejemplo JSON.
9. Mostrarlo en el catalogo cuando tenga variantes visuales.
10. Probar propiedades validas, invalidas, estado vacio y eventos.
11. Ejecutar TypeScript y ESLint.

Ejemplo de registro:

```ts
NewComponent: {
  component: NewComponent,
  propsSchema: newComponentPropsSchema,
  allowsChildren: false,
  allowedActions: ['onPress'],
}
```

### Criterio para crear un componente nuevo

Crear un componente cuando represente una pieza visual o financiera reutilizable con un contrato estable. No crear un componente diferente para cada pantalla, texto o respuesta del agente.

## Referencia visual

BKLit se utiliza como referencia para composicion, jerarquia visual e interacciones de graficas. Sus componentes web no deben importarse directamente dentro de React Native.

La implementacion movil debe utilizar primitivas compatibles con Expo. Para graficas SVG futuras se puede evaluar `react-native-svg` usando `npx expo install react-native-svg`, despues de revisar la compatibilidad con la version actual de Expo.

## Proximo flujo por definir

Antes de construir mas componentes se debe seleccionar un solo flujo de banca personal. Ejemplos:

- Comprender y controlar gastos.
- Crear un presupuesto por categoria.
- Ahorrar para una meta.
- Simular pagos para reducir intereses.
- Consultar movimientos inusuales.

Para definirlo se necesita responder:

1. Que intencion inicia el flujo.
2. Que datos debe consultar el agente.
3. Que componentes debe mostrar.
4. Que puede tocar o modificar el usuario.
5. Que herramienta MCP ejecuta la accion.
6. Que cambio visible confirma el resultado.

## Roadmap preliminar

### Completado

- Infraestructura A2UI local.
- Registro y validacion.
- Renderer recursivo.
- Eventos con payload dinamico explicito.
- Layout y primitivas visuales.
- Resumen de cuenta y metricas.
- Lista de movimientos.
- Grafica de gastos por categoria.
- Catalogo visual.

### Siguiente, despues de definir el flujo

- Selectores de cuenta y periodo.
- Filtros o chips de categoria.
- Formularios monetarios.
- `CashFlowChart` si el flujo lo necesita.
- `BudgetProgress` y `BudgetForm` para control de gasto.
- Confirmacion y resultado de acciones.
- Estados generativos `loading`, `empty`, `error` y `success`.

### Integracion posterior

- Contrato del backend del agente.
- Herramientas MCP reales o simuladas.
- Transporte HTTP, SSE o WebSocket.
- Salida estructurada del LLM.
- Actualizaciones sucesivas del arbol A2UI.
- Pruebas del ciclo completo.

## Instrucciones para asistentes de IA

Antes de modificar el proyecto:

1. Leer completamente `AGENTS.md`, `CLAUDE.md` y este README.
2. Inspeccionar el codigo real; no asumir que el reporte anterior coincide con el arbol actual.
3. Ejecutar `git status` y respetar cambios existentes.
4. Trabajar de forma incremental.
5. No reconstruir la arquitectura terminada.
6. No modificar `GenerativeRenderer` para agregar condiciones especificas de negocio.
7. No conectar MCP o red salvo que la tarea lo solicite expresamente.
8. No agregar dependencias sin justificar su necesidad y compatibilidad con Expo.
9. No presentar como terminado un componente que no aparezca en `git status` o `git diff`.
10. Ejecutar TypeScript y ESLint antes de entregar.

Cada entrega debe indicar:

- Archivos creados y modificados.
- Componentes y variantes agregadas.
- Esquemas y entradas de registro.
- Ejemplo A2UI.
- Eventos esperados.
- Pruebas ejecutadas.
- Limitaciones reales.
- Commit sugerido siguiendo Conventional Commits.

## Convencion de commits

El proyecto utiliza Conventional Commits.

Ejemplos:

```text
feat(ui): add generic component library and visual catalog
feat(personal-banking): add transaction history components
feat(personal-banking): add interactive spending category chart
fix(generative-ui): require explicit runtime action payloads
docs: document generative UI architecture and component workflow
```

No incluir archivos no relacionados dentro del mismo commit.

## Limitaciones actuales

- Los datos de la demostracion son sinteticos y locales.
- No existe conexion real con un agente LLM.
- No existe transporte HTTP, SSE o WebSocket para actualizar el arbol.
- Las herramientas nombradas en los eventos todavia no son llamadas MCP reales.
- No existe persistencia real de presupuestos o acciones.
- `ComponentStatus` esta tipado, pero todavia falta una estrategia completa de skeletons y estados remotos.
- El flujo financiero definitivo todavia debe seleccionarse y documentarse.

## Licencia

Consultar el archivo `LICENSE` del repositorio.
