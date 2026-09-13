# Formularios y acciones A2UI

Expo renderiza los controles; el agente autentica al usuario y solicita los formularios al MCP. El MCP valida presupuestos, metas, transferencias y pagos de tarjeta mediante operaciones fijas. La aplicación no conecta directamente con el MCP ni recibe credenciales de escritura.

## Contrato y componentes

La fuente del contrato está en `hackmty2026-mcp/src/supabase_mcp/a2ui_actions/`:

- `inputs.json`: TextField, DateTimeInput, Slider y Button, implementados en Expo bajo `src/features/a2ui/a2ui_actions/`.
- `actions.json`: nombres permitidos, tipos y cantidad de inputs, etiquetas, límites y campos del contexto.

`node scripts/sync-a2ui-actions.mjs` sincroniza las copias de Expo y del agente y genera las ocho plantillas MCP. `node scripts/sync-a2ui-actions.mjs --check` comprueba que no difieran.

| Acción | Inputs | Resultado |
| --- | --- | --- |
| `budget.create` | Nombre, categoría, límite, fecha inicial y final | Crear presupuesto |
| `budget.load` | Nombre exacto | Cargar un presupuesto propio para editar |
| `budget.update` | Los cinco campos del presupuesto | Actualizar el registro cargado |
| `savings_goal.create` | Nombre, importe objetivo, fecha y aportación mensual sugerida | Crear meta |
| `savings_goal.load` | Nombre exacto | Cargar una meta propia para editar |
| `savings_goal.update` | Los cuatro campos de la meta | Actualizar el registro cargado |
| `transfer.execute` | Cuenta origen, destinatario o cuenta propia, importe y concepto | Transferir y registrar el movimiento |
| `credit_card.pay` | Cuenta origen, tarjeta e importe | Aplicar un pago y actualizar deuda y crédito disponible |

Las actualizaciones incluyen el ID cargado como binding del contexto, sin pedir al usuario que escriba UUIDs. Las cuentas, tarjetas y destinatarios se eligen por nombre visible o terminación enmascarada y exigen una coincidencia única. Esta primera versión admite MXN. La aportación mensual de una meta sigue siendo un plan; las dos acciones de pago sí actualizan el ledger del MVP. El pago de tarjeta usa Finance v2 para mostrar el componente visual `PaymentCard` y las condiciones vigentes antes del botón de confirmación.

## Flujo conforme a A2UI

Se verificó el flujo con la [documentación oficial de acciones](https://a2ui.org/concepts/actions/#2-events-agent) y el SDK oficial 0.9.1:

1. El MCP devuelve `createSurface`, `updateComponents` y `updateDataModel` con un catálogo permitido.
2. Cada input escribe de forma síncrona en el modelo local de la superficie. Pulsar Guardar inmediatamente después de escribir utiliza el último valor.
3. `Button.action.event` resuelve los bindings de `context` y produce los cinco campos A2UI: `name`, `surfaceId`, `sourceComponentId`, `timestamp` y `context`.
4. Expo envía `{ action, user_id }` al agente con la sesión Supabase. El agente obtiene la identidad del token verificado; sobrescribe cualquier identidad suministrada por el cliente.
5. El agente llama a `a2ui_action`. El MCP comprueba la acción, superficie, botón, tipos, límites, fechas, identidad y firma antes de ejecutar el guardado.
6. Tras confirmar la transacción, devuelve `data.actionResult` con `status`, `message` y un `code` opcional. Expo muestra el estado y la causa de los fallos. HTTP 200 por sí solo no significa que se guardó.

`actions.json`, `inputs.json`, la firma y `data.actionResult` son extensiones de esta aplicación; no son nuevos mensajes del protocolo. El formulario utiliza `event.context` explícito y no envía todo el modelo. No implementamos el catálogo Basic completo: DateTimeInput admite fechas ISO `YYYY-MM-DD`, sin horas; tampoco se implementan funciones locales ni el sistema completo de `checks`. Los controles usan la configuración visual y de accesibilidad de Expo.

Ante un error se conserva el formulario. Reintentar sin cambiar valores reutiliza el mismo evento; un recibo transaccional evita duplicar escrituras. La identidad del evento se conserva durante la vida del formulario, no después de cerrar o recargar la aplicación. Tras perder una respuesta y recargar, consultar los registros antes de crear otro.

## Habilitar el guardado

Este cambio no aplica SQL ni despliega servicios. Para activarlo:

1. Aplicar el esquema del banco de preguntas, `supabase/migrations/202609130001_a2ui_actions.sql` y después `supabase/migrations/202609130002_transfer_and_card_payment_actions.sql` en Supabase.
2. Asignar una contraseña al login PostgreSQL `fluidbank_actions`. Configurar `MCP_ACTIONS_DATABASE_URL` en el MCP con TLS. Para conexión directa, el usuario es `fluidbank_actions`; para el pooler compartido de sesión es `fluidbank_actions.PROJECT_REF`. Copiar el host exacto desde **Connect → Session pooler** en Supabase. La validación no acepta `postgres` ni `service_role`.
3. Mantener en `MCP_ALLOWED_TABLES` `public.accounts`, `public.account_details`, `public.cards`, `public.credit_card_terms`, `public.transactions`, `public.beneficiaries`, `public.payment_orders`, `public.budgets` y `public.savings_goals`. Conservar la conexión original de lectura.
4. Configurar el mismo secreto aleatorio de al menos 32 caracteres como `MCP_ACTIONS_SECRET` en agente y MCP. Nunca usar una variable `EXPO_PUBLIC_*` para este secreto. La firma HMAC incluye el evento completo y el usuario autenticado; funciona con el transporte remoto Horizon existente.
5. Desplegar el código actualizado de agente y MCP y reconstruir Expo con DateTimePicker.

Las migraciones crean permisos limitados, políticas RLS por usuario, recibos idempotentes y una función SQL fija con derechos del invocador. El MCP conserva su pool de lectura y usa un pool separado para las seis operaciones de escritura. Transferir o pagar bloquea las cuentas involucradas, valida saldo y propiedad, actualiza los importes y crea `payment_orders` y `transactions` en una sola transacción. El modelo no recibe la herramienta de guardar; la confirmación es el botón del formulario. Sin configuración válida, el cliente muestra un fallo explícito y no un éxito simulado.

## Comprobar el flujo

Pedir «Crea un presupuesto» o «Crea una meta de ahorro», completar campos y pulsar Guardar. Pedir «Edita un presupuesto» o «Edita mi meta de ahorro», escribir el nombre exacto, cargarlo, modificarlo y guardar. Para movimientos, probar «Transfiere $500 a Ana», «Mueve $500 a mi cuenta de ahorro» y «Quiero pagar mi tarjeta de crédito». Consultar después el saldo, los movimientos o la tarjeta para comprobar el resultado.

Las pruebas automáticas verifican plantillas con el SDK oficial y el procesador Expo, paridad de contratos, último valor escrito, reintentos, identidad verificada, firmas, rechazo de datos inválidos y resultados explícitos. `supabase/tests/validate-a2ui-actions.mjs` ejecuta ambas migraciones de acciones en PostgreSQL aislado con PGlite y verifica altas, cambios, transferencias externas e internas, pago de tarjeta, RLS, rollback, permisos e idempotencia. No sustituye una prueba contra Supabase desplegado.

En esta revisión pasaron TypeScript, ESLint de los archivos modificados, Ruff y mypy de los módulos MCP modificados, las 184 pruebas del MCP, las 16 pruebas de formularios del agente y las pruebas A2UI de Expo. La migración también pasó en PostgreSQL aislado con PGlite. No se realizó inspección visual en dispositivos ni guardado en Supabase real.

Las suites generales conservan fallos anteriores ajenos a este cambio: tres pruebas móviles de onboarding y estilo, y nueve pruebas del agente relativas a rutas de repositorios, configuración MCP y una expectativa antigua del grafo. La suite completa del MCP no tiene fallos.
