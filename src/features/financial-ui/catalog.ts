import type { FinancialViewIntent } from './model';

export type FinancialViewDefinition = {
  name: string;
  composition: string;
  components: readonly string[];
  requiredData: string;
  localActions: string;
  agentActions: string;
};

export const financialViewCatalog = {
  'financial-summary': {
    name: 'Panorama de cuentas', composition: 'Saldo propio destacado, ingresos y gastos, y tarjetas por cuenta. El crédito se presenta por separado.',
    components: ['AccountBalanceCard', 'FinancialStatCard', 'Card', 'ActionButton'],
    requiredData: 'Cuentas, tipo, saldo, moneda; ingresos y gastos del periodo si están disponibles.',
    localActions: 'Ocultar o mostrar saldos.', agentActions: 'Elegir cuenta y cambiar periodo.',
  },
  transactions: {
    name: 'Historial de movimientos', composition: 'Periodo explícito, total de gastos filtrados, buscador, filtros de entradas/salidas y lista con detalle.',
    components: ['TransactionList', 'TransactionItem', 'FinancialStatCard', 'EmptyState'],
    requiredData: 'Movimientos individuales con identificador, monto con signo, fecha con zona horaria, comercio y categoría.',
    localActions: 'Buscar, filtrar y expandir un movimiento.', agentActions: 'Consultar otro periodo; categorizar o reportar exige soporte del backend.',
  },
  'spending-analysis': {
    name: 'Radiografía de gastos', composition: 'Total y comparación, distribución por categoría, evolución de áreas y calendario de intensidad.',
    components: ['SpendingCategoryChart', 'AreaChart', 'HeatmapChart', 'FinancialStatCard'],
    requiredData: 'Gastos agrupados; total anterior opcional; series temporales y agregados diarios opcionales.',
    localActions: 'Inspeccionar puntos; ampliar el mapa por mes o semana.', agentActions: 'Crear límite o alerta requiere persistencia.',
  },
  'cash-flow': {
    name: 'Proyección y próximos pagos', composition: 'Saldo proyectado, fecha objetivo, curva de saldo y agenda de ingresos/pagos con supuestos visibles.',
    components: ['AreaChart', 'FinancialStatCard', 'InfoBanner', 'ScheduleList'],
    requiredData: 'Saldo proyectado, fecha objetivo, supuestos, serie y próximos movimientos.',
    localActions: 'Inspeccionar la curva.', agentActions: 'Recalcular fecha o excluir movimientos; crear alertas requiere persistencia.',
  },
  budgets: {
    name: 'Límites de gasto', composition: 'Tarjetas con gasto/límite, progreso, restante o excedente, periodo y estado.',
    components: ['Card', 'ProgressBar', 'StatusBadge', 'TextBlock'],
    requiredData: 'Presupuestos con límite positivo, gasto, periodo y estado.',
    localActions: 'Consultar progreso.', agentActions: 'Crear, modificar, pausar o eliminar requiere una API de presupuestos.',
  },
  'recurring-payments': {
    name: 'Agenda de suscripciones', composition: 'Totales separados por frecuencia y una agenda ordenada por próxima fecha de cobro.',
    components: ['ScheduleList', 'FinancialStatCard', 'StatusBadge'],
    requiredData: 'Nombre, importe, ciclo, próxima fecha y estado de cada suscripción.',
    localActions: 'Consultar fechas y frecuencias.', agentActions: 'Recordatorios o reconocimiento necesitan persistencia; consultar comercio es lectura.',
  },
  'credit-card': {
    name: 'Plan de pago de tarjeta', composition: 'Vencimiento destacado, pago para no generar intereses, mínimo, deuda y crédito disponible.',
    components: ['Card', 'FinancialStatCard', 'StatusBadge', 'InfoBanner'],
    requiredData: 'Deuda, crédito disponible, fecha límite, pago mínimo y pago para no generar intereses calculados por el backend.',
    localActions: 'Consultar importes y fecha.', agentActions: 'Simular; pagar o programar requiere confirmación y ejecución en backend.',
  },
  debts: {
    name: 'Comparador de estrategias', composition: 'Deuda pendiente y escenarios seleccionables con mensualidad, plazo e intereses.',
    components: ['ScenarioComparison', 'FinancialStatCard', 'Card', 'StatusBadge'],
    requiredData: 'Saldo y escenarios calculados con sus supuestos.',
    localActions: 'Comparar escenarios y resaltar una opción.', agentActions: 'Recalcular aportaciones o programar pago; seleccionar no contrata ni paga.',
  },
  transfers: {
    name: 'Revisión de transferencia', composition: 'Origen → destinatario, importe protagonista, comisión, total y estado por confirmar.',
    components: ['Card', 'TextBlock', 'Divider', 'StatusBadge', 'InfoBanner'],
    requiredData: 'Origen, destinatario, monto, comisión y fecha opcional.',
    localActions: 'Revisar el borrador.', agentActions: 'Confirmar, transferir o guardar destinatario requiere validación y ejecución en backend.',
  },
  'card-security': {
    name: 'Centro de revisión de tarjeta', composition: 'Estado de tarjeta, terminación, cargo seleccionado e instrucciones contextuales.',
    components: ['Card', 'StatusBadge', 'TransactionItem', 'InfoBanner'],
    requiredData: 'Estado actual de la tarjeta y movimiento sospechoso opcional.',
    localActions: 'Consultar el estado y cargo.', agentActions: 'Bloquear, desbloquear o reportar requiere backend; nunca simular éxito.',
  },
  'savings-goals': {
    name: 'Ruta de ahorro', composition: 'Meta, progreso, monto restante, fecha objetivo y aportación mensual sugerida.',
    components: ['Card', 'ProgressBar', 'FinancialStatCard', 'StatusBadge'],
    requiredData: 'Meta, acumulado, objetivo, fecha y aportación calculada.',
    localActions: 'Consultar avance.', agentActions: 'Crear meta, aportar o cambiar fecha requiere persistencia y validación.',
  },
  'banking-information': {
    name: 'Datos y documentos', composition: 'Titular y banco, CLABE enmascarada, y documentos organizados por periodo y disponibilidad.',
    components: ['Card', 'TextBlock', 'StatusBadge', 'EmptyState'],
    requiredData: 'Titular, banco, identificador enmascarado y metadatos de documentos.',
    localActions: 'Consultar metadatos.', agentActions: 'Copiar CLABE completa o compartir/descargar necesita autorización y entrega segura del dato/documento.',
  },
  'financial-education': {
    name: 'Guía con ejemplos', composition: 'Concepto destacado, explicación breve, ideas clave y comparación opcional de escenarios.',
    components: ['Card', 'TextBlock', 'ScenarioComparison', 'InfoBanner'],
    requiredData: 'Explicación y puntos clave; escenarios con datos y supuestos si se comparan pagos.',
    localActions: 'Comparar ejemplos.', agentActions: 'Abrir una simulación contextualizada con datos del usuario.',
  },
} as const satisfies Record<FinancialViewIntent, FinancialViewDefinition>;
