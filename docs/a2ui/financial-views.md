# Vistas del banco de preguntas

Las 13 categorías tienen una composición implementada en `src/features/financial-ui/banking-view.tsx`, validación en `model.ts` y ejemplos ficticios en `examples.json`. Se pueden explorar desde **drawer → Componentes → Una vista para cada pregunta**. La galería usa el mismo procesador y renderer A2UI que las respuestas reales.

## Relación entre preguntas y componentes

| Categoría | Pregunta representativa | Vista implementada | Componentes reutilizados |
| --- | --- | --- | --- |
| Resumen financiero | ¿Cuánto dinero tengo? | Saldo propio protagonista, cuentas agrupadas por tipo, crédito separado, métricas del periodo y ocultación de importes | Card, Divider, FinancialStatCard, StatusBadge, ActionButton |
| Movimientos | ¿En qué gasté ayer? | Periodo explícito, gasto total filtrado, buscador, filtros y detalle expandible | TransactionList, TransactionItem, FinancialStatCard, EmptyState |
| Análisis de gastos | ¿En qué se me fue el dinero? | Comparación de totales, distribución, evolución y actividad diaria con zoom | SpendingCategoryChart, AreaChart, HeatmapChart |
| Flujo de efectivo | ¿Me alcanzará para la renta? | Proyección de saldo, supuestos y agenda de ingresos/pagos | AreaChart, FinancialStatCard, InfoBanner; nueva ScheduleList |
| Presupuestos | Ponme un límite semanal | Progreso de gasto, restante/excedente, periodo y estado | Card, ProgressBar, StatusBadge, TextBlock |
| Pagos recurrentes | ¿Qué pagos vienen? | Agenda ordenada; totales independientes por frecuencia | FinancialStatCard; nueva ScheduleList |
| Tarjeta de crédito | ¿Cuándo debo pagar? | Fecha límite, pago para no generar intereses, mínimo, deuda y crédito disponible | Card, FinancialStatCard, StatusBadge, InfoBanner |
| Deudas | ¿Cómo puedo terminar de pagar más rápido? | Saldo y escenarios con mensualidad, plazo e intereses | FinancialStatCard, Card; nuevo ScenarioComparison |
| Transferencias | Transfiere $500 a Ana | Borrador con origen, destinatario, monto, comisión y total | Card, TextBlock, Divider, StatusBadge, InfoBanner |
| Seguridad de tarjeta | No reconozco este cargo | Estado de tarjeta, cargo seleccionado y siguiente paso | Card, StatusBadge, TransactionItem, InfoBanner |
| Metas de ahorro | Quiero ahorrar para una laptop | Meta, avance, restante, fecha y aportación mensual | Card, ProgressBar, TextBlock, StatusBadge |
| Información bancaria | Muéstrame mi estado de cuenta | Titular, banco, CLABE enmascarada y documentos por periodo | Card, TextBlock, StatusBadge, EmptyState |
| Educación financiera | ¿Qué pasa si pago solamente el mínimo? | Concepto, explicación, ideas clave y escenarios opcionales | Card, TextBlock; nuevo ScenarioComparison |

`src/features/financial-ui/catalog.ts` y `banking-view.catalog.json` especifican, para cada categoría, los datos necesarios, las interacciones locales y las operaciones dependientes del agente. El banco de preguntas conserva sus solicitudes y muestra el nombre de la vista asociada.

## Contrato para el agente

Extensión del cliente sobre A2UI **v0.9.1**; no es un componente del catálogo Basic. El catálogo nuevo es `https://fluidbank.app/a2ui/catalogs/finance/v2`. Es un identificador de protocolo, no implica que esta URL esté publicada. Basic y Finance v1 (Chart) siguen funcionando.

La vista semántica tiene esta forma dentro de la composición canónica:

```json
{"id":"banking_view","component":"BankingView","view":{"path":"/view"}}
```

El agente envía, en orden:

1. `createSurface`, con el catálogo Finance v2.
2. `updateComponents`, con el grafo estable `root` (`Column`), `banking_view`, `request_financial_view_label` y `request_financial_view_button` definido por MCP.
3. `updateDataModel`, con `path: "/"` y `value: {"view": ..., "actionLabel": ..., "requestIntent": ...}`.

Todas las respuestas Finance v2 usan `resource_uri: "a2ui://finance/view"` y `surfaceId: "financial-view"`. El texto del botón se enlaza a `/actionLabel` y su `context.intent` a `/requestIntent`; los IDs, referencias y bindings no cambian entre intenciones.

El objeto `view` incluye `intent` (el mismo ID del banco), `title`, `currency` (`MXN` o `USD`), `subtitle` opcional y los campos específicos de su categoría. También se admite un valor literal en `view`. `financial-summary` recibe `totalOwnedBalance` ya calculado y validado por el backend; `spending-analysis` recibe `totalSpent` y puede incluir `insight`. El renderer no deriva estos importes desde las cuentas o categorías.

- **Esquema exportado:** `banking-view.schema.json`.
- **13 respuestas completas de ejemplo:** `banking-view.examples.json`.
- **Mapa de intenciones y componentes:** `banking-view.catalog.json`.
- **Constructor TypeScript:** `bankingViewMessages` en `src/features/financial-ui/a2ui.ts`.

La validación Zod añade controles semánticos al JSON Schema: identificadores únicos, coherencia de periodos, dimensiones de series y datos resueltos. Las vistas inválidas se rechazan antes de confirmar el lote A2UI. Los componentes BankingView se deben enviar completos en el mismo lote; posteriores `updateDataModel` pueden actualizar parte de una vista válida.

Para regenerar los artefactos, sin red:

```bash
node --experimental-strip-types scripts/export-banking-contract.mjs
```

## Reglas al preparar datos

- Elegir `intent` según la solicitud y obtener los datos con el UUID autenticado a través del agente/MCP. No extraer importes de un párrafo ni usar los ejemplos como respuesta al usuario.
- No agrupar crédito disponible con dinero propio. El backend envía `totalOwnedBalance` con únicamente cheques/débito y ahorro; el crédito se presenta en una sección explícitamente separada. Todas las cantidades de una vista deben estar en la moneda declarada, sin conversiones implícitas.
- Para movimientos, enviar `amount` negativo para gastos y positivo para ingresos. Mapear las categorías de la base al enum visual; por ejemplo, `salary → income`, `groceries/dining → food`, `rent → other`, sin cambiar la descripción original del movimiento.
- Resolver “ayer” en `America/Monterrey`, tomando la fecha actual de la solicitud. Enviar `startDate`, `endDate` y timestamps con offset. La app comprueba que los movimientos pertenezcan al periodo; no infiere la fecha desde el texto del LLM.
- Las tarjetas muestran datos faltantes como ausencia, no como saldo cero inventado. No inventar terminaciones de cuentas, mínimos, fechas límite, tasas, metas ni presupuestos.
- Para una categoría sin datos, enviar `intent`, `title`, `state: "empty"` y `description`. No son necesarios los campos de una vista lista. Las listas vacías también tienen presentación propia.
- En el historial, la búsqueda y los filtros se aplican a los movimientos recibidos (máximo 100), no consultan por sí solos todo el histórico. El backend debe proporcionar el periodo adecuado o botones para ampliar la consulta.
- Las suscripciones se totalizan por ciclo. No sumar pagos semanales y anuales como si fueran importes mensuales.
- Proyecciones y comparaciones son estimaciones: enviar supuestos y resultados calculados por el backend. Seleccionar un escenario no modifica deuda ni programa pagos.
- `banking-information` admite solo CLABE enmascarada (14 marcas y 4 dígitos). No admite CLABE completa, CVV ni URLs de documentos dentro de la vista.

## Acciones y límites actuales

Las interacciones locales implementadas son ocultar saldos, buscar/filtrar/expandir movimientos, inspeccionar gráficos, ampliar el mapa por mes/semana y seleccionar escenarios. Se componen con los botones estándar A2UI para las consultas adicionales; estos conservan exactamente `name`, `surfaceId`, `sourceComponentId`, `timestamp` y `context`. El CTA del resumen usa `request_financial_view`; el binding resuelve `context: { "intent": "transactions" }` desde `/requestIntent` y nunca añade identidad al contexto.

El transporte preferido envía `{ "action": <acción A2UI>, "user_id": <UUID autenticado> }` al endpoint del agente. Mientras se despliega esa rama, el cliente reintenta la serialización heredada dentro de `query` únicamente cuando un agente anterior rechaza el cuerpo estructurado con HTTP 422.

Crear presupuestos, registrar metas, pagar, transferir, bloquear tarjetas y descargar documentos requieren endpoints y datos del backend. La galería no los ejecuta ni muestra éxito ficticio. El borrador de transferencia siempre está por confirmar. El MCP de lectura no debe convertirse en una API de escritura para resolver estas acciones.

La biblioteca anterior contenía más componentes financieros que los expuestos al agente: Basic solo admitía Text/Button/Card/Column y Finance v1 añadía Chart. BankingView conecta ahora esos componentes existentes con las 13 intenciones mediante un contrato validado.

**Este cambio prepara y conecta el renderer del móvil. No modifica ni despliega el agente remoto.** Si el agente sigue enviando `Card + Text` en `a2ui://chat/message`, se seguirá mostrando esa tarjeta; debe adoptar Finance v2 y los payloads de este directorio para usar estas vistas con datos reales.

## Presentación y accesibilidad

Se usan colores del tema, incluyendo la paleta Banorte y las alternativas de contraste; no se fuerza rojo sobre las preferencias del usuario. Las métricas se apilan según el espacio disponible. Los textos y controles heredan escalado y objetivos táctiles accesibles. Los gráficos reutilizan sus tablas de datos accesibles y reducción de movimiento. El progreso se acompaña de cifras y etiquetas, y los estados no dependen solo del color. Ocultar saldos retira los importes del árbol visual y accesible.
