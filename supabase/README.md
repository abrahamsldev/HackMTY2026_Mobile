# SQL del banco de preguntas

## Ejecutar en Supabase

Abre **SQL Editor → New query**, pega el contenido completo de [`financial_question_bank.sql`](financial_question_bank.sql) y pulsa **Run**. El archivo crea el esquema y carga los datos en una sola transacción; si falla, no deja una migración parcial. El script del esquema se ejecuta **una vez**. No necesita claves de API dentro del SQL.

El usuario `f52827d7-0213-4df4-9621-14775d6228d4` debe existir en `public.users` y tener sus cuentas MXN de cheques y crédito. El script comprueba estas condiciones antes de cargar datos. La aplicación debe utilizar el mismo UUID de Supabase Auth.

Este trabajo generó y probó el SQL; **no se ejecutó en el proyecto remoto**.

## Qué agrega

| Tabla / vista | Uso |
| --- | --- |
| `account_details` | Nombre de cuenta, banco, terminación y CLABE |
| `cards` | Tarjetas, tipo, terminación y estado |
| `credit_card_terms` | Deuda, límite, mínimo, pago para no generar intereses, corte, vencimiento, tasa y CAT |
| `debts` | Deudas y condiciones de pago |
| `debt_scenarios` | Comparaciones de plazo, mensualidad e intereses |
| `budgets` / `budget_progress` | Límites y gasto calculado desde los movimientos existentes |
| `savings_goals` / `savings_goal_progress` | Objetivos y avance calculado desde aportaciones |
| `savings_contributions` | Historial de aportaciones a metas |
| `scheduled_cash_flows` | Ingresos y gastos futuros, adicionales a las suscripciones |
| `beneficiaries` | Destinatarios; el ejemplo permanece en borrador |
| `payment_orders` | Borradores de transferencias y pagos, sin ejecutar dinero |
| `transaction_disputes` | Revisión de cargos; se crea un borrador ficticio |
| `bank_statements` | Resumen del mes anterior y metadatos de documentos |
| `financial_alerts` | Configuración de avisos dentro de la app |

Se conservan los registros anteriores. Se añade una cuenta de ahorro de ejemplo con $9,000 MXN solo si el usuario no tiene una; las aportaciones de las dos metas suman $9,000. También se agrega una transferencia propia con estado `simulated`, sin modificar saldos. El conjunto agrega hasta 31 registros en las tablas nuevas. Los UUID de ejemplo son estables; repetir **solo el seed** no duplica ni sobrescribe registros. Las fechas se calculan en la primera carga usando el día de Monterrey; repetirla no modifica registros existentes.

Los nuevos registros llevan `data_origin = 'synthetic'`. Las tasas, CLABEs, tarjetas, metas y demás datos son ficticios. Las CLABEs empiezan con ceros y **no son identificadores bancarios utilizables**. No se almacenan CVV ni números completos de tarjeta.

Los estados de cuenta se crean como `metadata_only`: contienen un saldo inicial ficticio y sumas de los movimientos de cheques del mes anterior, con un saldo final coherente. No se inventa una URL de descarga ni un PDF existente. El backend debe generar el documento en Storage antes de marcarlo disponible.

Los escenarios del préstamo se calculan con $25,000 de capital, tasa mensual 2%, pagos al final del mes e intereses redondeados a centavos. Con $2,000 mensuales: 15 meses y $4,059.88 de intereses. Con $2,600: 11 meses y $3,045.70. El último pago se ajusta; son ejemplos, no condiciones reales de un banco.

## Acceso y conexión con el agente

Las 14 tablas usan RLS: un usuario autenticado puede leer sus propios registros y no los de otros. No se concede escritura financiera directa a la app; las operaciones deben validarse en un backend. Las claves foráneas compuestas impiden asociar cuentas, metas o deudas de distintos usuarios incluso desde un proceso de escritura confiable. Las vistas usan `security_invoker` y respetan esas políticas. No se modifican las políticas de las tablas anteriores.

Para que el MCP consulte estos datos se deben agregar **explícitamente** las tablas/vistas necesarias a su allowlist, su registro de ownership por `user_id` y los permisos SELECT del rol de lectura. Este SQL no amplía automáticamente los permisos del MCP ni modifica su despliegue. Nunca se debe usar la clave service-role como sustituto del rol de lectura del MCP.

El agente debe mapear los nuevos campos al [contrato BankingView](../docs/a2ui/financial-views.md). Algunas relaciones directas:

- `budget_progress.spent_amount / limit_amount` → gasto y límite del presupuesto.
- `savings_goal_progress.saved_amount / target_amount` → avance y objetivo.
- `credit_card_terms.interest_free_payment / due_date` → importe y vencimiento.
- `debt_scenarios` → comparador de escenarios, utilizando sus supuestos.
- `scheduled_cash_flows` + suscripciones → proyección, sin duplicar un pago.
- `account_details.clabe` → enmascarar antes de incluir en A2UI (`BankingView` no admite CLABE completa).
- `bank_statements.document_status = metadata_only` → mostrar resumen y que el documento aún no está disponible; no etiquetarlo como descargable.

Guardar estas filas no ejecuta transferencias, bloqueos, reportes, pagos ni notificaciones.

## Archivos separados y validación

- Migración: [`migrations/202609120001_financial_question_bank.sql`](migrations/202609120001_financial_question_bank.sql).
- Carga idempotente: [`seeds/financial_demo_f52827d7.sql`](seeds/financial_demo_f52827d7.sql).
- Archivo combinado: `node scripts/build-financial-sql.mjs`.
- Prueba: `tests/validate-financial-schema.mjs`, usando PostgreSQL embebido PGlite. No levanta servicios ni utiliza credenciales reales.

La prueba ejecuta tanto los archivos separados como el SQL final y valida relaciones, cálculos, RLS, rechazo de escrituras desde el cliente, ausencia de duplicados, conservación de saldos y rollback completo cuando falta el usuario.

## Saldos después de una transferencia

Después de las migraciones de acciones ejecuta también
[`202609130004_internal_transfer_balances.sql`](migrations/202609130004_internal_transfer_balances.sql).
La migración agrega `beneficiaries.linked_account_id` y
`payment_orders.credited_account_id`. Si la CLABE de un beneficiario coincide
con una fila de `account_details` perteneciente a otro usuario, lo vincula
automáticamente. Una transferencia confirmada descuenta la cuenta de origen,
abona esa cuenta receptora y crea los movimientos débito/crédito dentro de la
misma transacción.

Los contactos externos sin una cuenta vinculada dejan de producir un éxito
engañoso: no se ofrecen en el formulario y el dispatcher rechaza cualquier
evento antiguo que intente utilizarlos. Para vincular manualmente un contacto
interno, usa el UUID real de la cuenta receptora:

```sql
update public.beneficiaries
set linked_account_id = '<UUID-DE-LA-CUENTA-RECEPTORA>'::uuid,
    status = 'verified'
where id = '<UUID-DEL-BENEFICIARIO>'::uuid
  and user_id = '<UUID-DEL-REMITENTE>'::uuid;
```

No vincules el destinatario de ejemplo `Ana` a una cuenta arbitraria. Su CLABE
del seed es ficticia; debe reemplazarse por una relación de prueba verificable
antes de usarla como transferencia interna.
