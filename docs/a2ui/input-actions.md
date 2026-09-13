# Formularios y acciones A2UI

Expo renderiza los controles; el agente autentica al usuario y solicita los formularios al MCP. El MCP valida y guarda presupuestos y metas de ahorro mediante operaciones fijas. La aplicación no conecta directamente con el MCP ni recibe credenciales de escritura.

## Contrato y componentes

La fuente del contrato está en `hackmty2026-mcp/src/supabase_mcp/a2ui_actions/`:

- `inputs.json`: TextField, DateTimeInput, Slider y Button, implementados en Expo bajo `src/features/a2ui/a2ui_actions/`.
- `actions.json`: nombres permitidos, tipos y cantidad de inputs, etiquetas, límites y campos del contexto.

`node scripts/sync-a2ui-actions.mjs` sincroniza las copias de Expo y del agente y genera las seis plantillas MCP. `node scripts/sync-a2ui-actions.mjs --check` comprueba que no difieran.

| Acción | Inputs | Resultado |
| --- | --- | --- |
| `budget.create` | Nombre, categoría, límite, fecha inicial y final | Crear presupuesto |
| `budget.load` | Nombre exacto | Cargar un presupuesto propio para editar |
| `budget.update` | Los cinco campos del presupuesto | Actualizar el registro cargado |
| `savings_goal.create` | Nombre, importe objetivo, fecha y aportación mensual sugerida | Crear meta |
| `savings_goal.load` | Nombre exacto | Cargar una meta propia para editar |
| `savings_goal.update` | Los cuatro campos de la meta | Actualizar el registro cargado |

Las actualizaciones incluyen el ID cargado como binding del contexto, sin pedir al usuario que escriba UUIDs. La selección por nombre exige una coincidencia única; se muestran hasta 50 nombres disponibles. Esta primera versión admite MXN. La aportación mensual es un plan: guardar una meta no transfiere dinero.

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

1. Aplicar el esquema del banco de preguntas y después `supabase/migrations/202609130001_a2ui_actions.sql` en Supabase.
2. Asignar una contraseña al login PostgreSQL `fluidbank_actions`. Configurar `MCP_ACTIONS_DATABASE_URL` en el MCP con TLS. Para conexión directa, el usuario es `fluidbank_actions`; para el pooler compartido de sesión es `fluidbank_actions.PROJECT_REF`. Copiar el host exacto desde **Connect → Session pooler** en Supabase. La validación no acepta `postgres` ni `service_role`.
3. Mantener `public.budgets` y `public.savings_goals` en `MCP_ALLOWED_TABLES`. Conservar la conexión original de lectura.
4. Configurar el mismo secreto aleatorio de al menos 32 caracteres como `MCP_ACTIONS_SECRET` en agente y MCP. Nunca usar una variable `EXPO_PUBLIC_*` para este secreto. La firma HMAC incluye el evento completo y el usuario autenticado; funciona con el transporte remoto Horizon existente.
5. Desplegar el código actualizado de agente y MCP y reconstruir Expo con DateTimePicker.

La migración crea permisos limitados, políticas RLS por usuario, recibos idempotentes y una función SQL fija con derechos del invocador. El MCP conserva su pool de lectura y usa un pool separado para estas cuatro operaciones de escritura. El modelo no recibe la herramienta de guardar; la confirmación es el botón del formulario. Sin configuración válida, el cliente muestra un fallo explícito y no un éxito simulado.

## Comprobar el flujo

Pedir «Crea un presupuesto» o «Crea una meta de ahorro», completar campos y pulsar Guardar. Pedir «Edita un presupuesto» o «Edita mi meta de ahorro», escribir el nombre exacto, cargarlo, modificarlo y guardar. Consultar después presupuestos o metas para comprobar los nuevos datos.

Las pruebas automáticas verifican plantillas con el SDK oficial y el procesador Expo, paridad de contratos, último valor escrito, reintentos, identidad verificada, firmas, rechazo de datos inválidos y resultados explícitos. `supabase/tests/validate-a2ui-actions.mjs` ejecuta la migración en PostgreSQL aislado con PGlite y verifica altas, cambios, RLS, rollback, permisos e idempotencia. No sustituye una prueba contra Supabase desplegado.

`npx tsc --noEmit` y `npm run lint` pasan sin errores. No se realizó inspección visual en dispositivos ni guardado en Supabase real.

`node scripts/sync-a2ui-actions.mjs --check` pasa: las rutas a los repositorios hermanos resuelven a `../../hackmty2026-mcp/` y `../../hackmty2026/` tanto en el script como en `tests/a2ui-inputs.test.mjs`. La suite móvil (`npm test`) pasa completa, incluidas las pruebas de accesibilidad. En los dos repositorios Python, un `.venv` creado antes de mover los repositorios conserva un editable install con la ruta anterior; se repara con `uv sync` o se usa `PYTHONPATH=src ./.venv/bin/python -m pytest`. El chequeo global de mypy conserva errores en los modelos y servicios financieros existentes.
