import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { TextInput } from '@/components/accessible-primitives';
import { ThemedText } from '@/components/themed-text';
import { ActionButton, AreaChart, Card, Divider, EmptyState, HeatmapChart, InfoBanner, ProgressBar, StatusBadge, TextBlock } from '@/components/ui';
import { AccountBalanceCard, CreditUtilizationGauge, DueDateCountdown, FinancialStatCard, PaymentCard, SpendingCategoryChart, TransactionItem, TransactionList, TrendIndicator } from '@/features/personal-banking';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { budgetProgress, filterTransactions, type BankingViewData, type PaymentCardData, type ReadyBankingView, type ScenarioData } from './model';

const money = (value: number, currency: string) => new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(value);
const date = (value: string) => new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`));
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const percent = (value: number) => `${new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 }).format(value)}%`;
const group = (children: ReactNode) => <View style={styles.stack}>{children}</View>;
function Metric({ label, value, currency, tone = 'default' }: { label: string; value: number; currency: 'MXN' | 'USD'; tone?: 'default' | 'positive' | 'negative' }) {
  return <FinancialStatCard label={label} value={value} currency={currency} tone={tone} />;
}
function Detail({ label, value }: { label: string; value: string }) {
  return <View style={styles.detail}><ThemedText type="small" themeColor="textSecondary">{label}</ThemedText><ThemedText type="smallBold" selectable>{value}</ThemedText></View>;
}
function Hero({ label, value, note }: { label: string; value: string; note?: string }) {
  const theme = useTheme();
  return <View style={[styles.hero, { backgroundColor: theme.backgroundElement, borderColor: theme.accent }]}>
    <ThemedText themeColor="textSecondary">{label}</ThemedText>
    <ThemedText style={styles.heroAmount} selectable>{value}</ThemedText>
    {note && <ThemedText type="small" themeColor="textSecondary">{note}</ThemedText>}
  </View>;
}
function Missing({ description = 'Todavía no hay datos para esta consulta.' }: { description?: string }) {
  return <EmptyState title="Sin información disponible" description={description} />;
}
// The adapter enumerates every prop it delegates: wire identifiers such as
// `cardId` and `accountId` are routing data and never reach the component.
function CardFace({ card, caption, amount, currency }: { card: PaymentCardData; caption?: string; amount?: number; currency?: 'MXN' | 'USD' }) {
  return <PaymentCard
    cardName={card.cardName} cardType={card.cardType} network={card.network} lastFour={card.lastFour}
    status={card.status} expires={card.expires} caption={caption} amount={amount} currency={currency} />;
}
function Wallet({ cards }: { cards: PaymentCardData[] }) {
  return <View style={styles.metrics}>{cards.map(card => (
    <View key={card.cardId} style={styles.metric}><CardFace card={card} /></View>
  ))}</View>;
}

function Summary({ data }: { data: Extract<ReadyBankingView, { intent: 'financial-summary' }> }) {
  const [hidden, setHidden] = useState(false);
  if (!data.accounts.length) return <Missing description="No hay cuentas vinculadas para mostrar un saldo." />;
  return group(<>
    <ActionButton label={hidden ? 'Mostrar saldos' : 'Ocultar saldos'} variant="outline" onPress={() => setHidden(v => !v)} />
    {hidden ? <InfoBanner message="Tus saldos están ocultos." /> : <>
      <Hero label="Tu dinero disponible" value={money(data.totalOwnedBalance, data.currency)} note="Suma de cheques y ahorro. El crédito disponible se muestra en su propia cuenta." />
      {data.cards?.length ? <Wallet cards={data.cards} /> : null}
      <View style={styles.metrics}>{data.income !== undefined && <View style={styles.metric}><Metric label="Ingresos del periodo" value={data.income} currency={data.currency} tone="positive" /></View>}{data.expenses !== undefined && <View style={styles.metric}><Metric label="Gastos del periodo" value={data.expenses} currency={data.currency} /></View>}</View>
      {data.accounts.map(account => account.accountLastFour ? <AccountBalanceCard key={account.accountId} {...account} accountLastFour={account.accountLastFour} currency={data.currency} /> : <Card key={account.accountId}>{group(<><ThemedText type="smallBold">{account.accountName}</ThemedText><Detail label={account.accountType === 'credit' ? 'Crédito disponible' : 'Saldo disponible'} value={money(account.availableBalance, data.currency)} /></>)}</Card>)}
    </>}
  </>);
}

function Movements({ data }: { data: Extract<ReadyBankingView, { intent: 'transactions' }> }) {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [direction, setDirection] = useState<'all' | 'expense' | 'income'>('all');
  const [selected, setSelected] = useState<string | null>(null);
  const rows = filterTransactions(data.transactions, query, direction).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  const expenses = sum(rows.filter(row => row.amount < 0 && row.status !== 'declined').map(row => -row.amount));
  return group(<>
    <StatusBadge label={`${date(data.startDate)} — ${date(data.endDate)}`} tone="info" />
    <ThemedText type="small" themeColor="textSecondary">Horario de Monterrey · {rows.length} movimientos</ThemedText>
    <Metric label="Gastos en los resultados" value={expenses} currency={data.currency} />
    <TextInput accessibilityLabel="Buscar comercio o movimiento" placeholder="Buscar comercio o movimiento" placeholderTextColor={theme.textSecondary} value={query} onChangeText={setQuery} style={[styles.search, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]} />
    <View style={styles.filters}>{([['all', 'Todos'], ['expense', 'Gastos'], ['income', 'Ingresos']] as const).map(([value, label]) => <ActionButton key={value} label={`${direction === value ? '✓ ' : ''}${label}`} variant={direction === value ? 'primary' : 'outline'} onPress={() => setDirection(value)} />)}</View>
    <TransactionList emptyMessage="No hay movimientos que coincidan con estos filtros.">{rows.map(row => <View key={row.transactionId}><TransactionItem {...row} currency={data.currency} timeZone={data.timeZone} onPress={() => setSelected(selected === row.transactionId ? null : row.transactionId)} />{selected === row.transactionId && <View style={styles.expanded}><Detail label="Referencia" value={row.transactionId} /><Detail label="Estado" value={row.status === 'completed' ? 'Completado' : row.status === 'pending' ? 'Pendiente' : 'Rechazado'} /><Detail label="Fecha y hora · Monterrey" value={new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone: data.timeZone }).format(new Date(row.occurredAt))} /></View>}</View>)}</TransactionList>
  </>);
}

export function ScenarioComparison({ scenarios, currency }: { scenarios: ScenarioData[]; currency: 'MXN' | 'USD' }) {
  const [selected, setSelected] = useState<string | null>(null);
  return <View style={styles.metrics}>{scenarios.map(item => <View key={item.id} style={styles.metric}><Card variant={selected === item.id ? 'highlighted' : 'default'}>{group(<>
    <ThemedText accessibilityRole="header" type="smallBold">{item.name}</ThemedText>
    <TextBlock variant="amount" value={money(item.monthlyPayment, currency)} />
    <ThemedText type="small" themeColor="textSecondary">por mes</ThemedText>
    <Detail label="Plazo estimado" value={`${item.months} meses`} />
    <Detail label="Intereses estimados" value={money(item.totalInterest, currency)} />
    <ActionButton label={selected === item.id ? '✓ Escenario seleccionado' : 'Comparar este escenario'} variant={selected === item.id ? 'primary' : 'outline'} onPress={() => setSelected(item.id)} />
  </>)}</Card></View>)}</View>;
}

export function ScheduleList({ items, currency }: { items: { id: string; name: string; date: string; amount: number; detail: string; income?: boolean }[]; currency: string }) {
  const theme = useTheme();
  if (!items.length) return <Missing description="No hay pagos ni ingresos próximos registrados." />;
  return <View style={styles.stack}>{[...items].sort((a, b) => a.date.localeCompare(b.date)).map(item => <Card key={item.id}><View style={styles.schedule}>
    <View style={[styles.dateTile, { backgroundColor: theme.backgroundSelected }]}><ThemedText type="smallBold">{date(item.date)}</ThemedText></View>
    <View style={styles.scheduleBody}><ThemedText type="smallBold">{item.name}</ThemedText><ThemedText type="small" themeColor="textSecondary">{item.detail}</ThemedText><ThemedText style={{ color: item.income ? theme.success : theme.text }} type="smallBold">{item.income ? '+' : ''}{money(item.amount, currency)}</ThemedText></View>
  </View></Card>)}</View>;
}

function Content({ data }: { data: ReadyBankingView }) {
  const currency = data.currency;
  switch (data.intent) {
    case 'financial-summary': return <Summary data={data} />;
    case 'transactions': return <Movements data={data} />;
    case 'spending-analysis': {
      return group(<>
        <Metric label="Gasto del periodo" value={data.totalSpent} currency={currency} />
        {data.previousTotal !== undefined && <TrendIndicator current={data.totalSpent} previous={data.previousTotal} currency={currency} inverse />}
        {data.insight && <InfoBanner title="Lo que vemos" message={data.insight} />}
        {data.categories.length ? <SpendingCategoryChart categories={data.categories} currency={currency} title="¿Dónde se fue tu dinero?" showPercentages /> : <Missing description="No hay gastos categorizados en este periodo." />}
        {data.trend && <AreaChart {...data.trend} currency={currency} />}
        {data.activity && <HeatmapChart {...data.activity} currency={currency} />}
      </>);
    }
    case 'cash-flow': return group(<>
      <Hero label={`Saldo estimado al ${date(data.targetDate)}`} value={money(data.projectedBalance, currency)} />
      <InfoBanner tone={data.projectedBalance < 0 ? 'warning' : 'info'} title="Proyección" message={data.assumptions} />
      <AreaChart {...data.projection} currency={currency} />
      <ThemedText type="smallBold">Lo que viene</ThemedText>
      <ScheduleList currency={currency} items={data.upcoming.map(item => ({ ...item, income: item.direction === 'income', detail: item.direction === 'income' ? 'Ingreso previsto' : 'Pago previsto' }))} />
    </>);
    case 'budgets': return data.budgets.length ? group(<>{data.budgets.map(item => {
      const { percentage, remaining } = budgetProgress(item.spent, item.limit);
      return <Card key={item.id}>{group(<>
        <StatusBadge label={item.status === 'paused' ? 'Pausado' : remaining < 0 ? 'Límite superado' : 'En seguimiento'} tone={item.status === 'paused' ? 'neutral' : remaining < 0 ? 'danger' : 'info'} />
        <ThemedText type="smallBold">{item.name}</ThemedText><ThemedText type="small" themeColor="textSecondary">{item.period}</ThemedText>
        <TextBlock variant="amount" value={`${money(item.spent, currency)} / ${money(item.limit, currency)}`} />
        <ProgressBar value={percentage} label="Presupuesto utilizado" showValue tone={remaining < 0 ? 'danger' : percentage >= 80 ? 'warning' : 'default'} size="lg" />
        <Detail label={remaining < 0 ? 'Excedente' : 'Disponible para gastar'} value={money(Math.abs(remaining), currency)} />
      </>)}</Card>;
    })}</>) : <Missing description="No hay presupuestos creados para este periodo." />;
    case 'recurring-payments': return group(<>
      <View style={styles.metrics}>{(['weekly', 'monthly', 'yearly'] as const).filter(cycle => data.payments.some(p => p.cycle === cycle && p.status === 'active')).map(cycle => <View style={styles.metric} key={cycle}><Metric label={cycle === 'weekly' ? 'Cargos semanales activos' : cycle === 'monthly' ? 'Cargos mensuales activos' : 'Cargos anuales activos'} value={sum(data.payments.filter(p => p.cycle === cycle && p.status === 'active').map(p => p.amount))} currency={currency} /></View>)}</View>
      <ScheduleList currency={currency} items={data.payments.map(p => ({ id: p.id, name: p.name, date: p.nextDate, amount: p.amount, detail: `${p.cycle === 'monthly' ? 'Mensual' : p.cycle === 'weekly' ? 'Semanal' : 'Anual'} · ${p.status === 'active' ? 'Activo' : 'Pausado, sin cobro programado'}` }))} />
    </>);
    case 'credit-card': return group(<>
      {data.card && <CardFace card={data.card} />}
      <DueDateCountdown dueDate={data.dueDate} cutoffDate={data.cutoffDate} />
      <Hero label="Pago para no generar intereses" value={money(data.interestFreePayment, currency)} note={`${data.cardName}${data.lastFour ? ` · •••• ${data.lastFour}` : ''}`} />
      <View style={styles.metrics}><View style={styles.metric}><Metric label="Pago mínimo" value={data.minimumPayment} currency={currency} /></View><View style={styles.metric}><Metric label="Saldo deudor" value={data.debt} currency={currency} /></View></View>
      {data.creditLimit === undefined
        ? <Detail label="Crédito disponible" value={money(data.availableCredit, currency)} />
        : <CreditUtilizationGauge used={data.debt} limit={data.creditLimit} available={data.availableCredit} currency={currency} />}
      {(data.statementBalance !== undefined || data.annualInterestRate !== undefined || data.catPercentage !== undefined) && <Card>{group(<>
        {data.statementBalance !== undefined && <Detail label="Saldo del último corte" value={money(data.statementBalance, currency)} />}
        {data.annualInterestRate !== undefined && <Detail label="Tasa de interés anual" value={percent(data.annualInterestRate)} />}
        {data.catPercentage !== undefined && <Detail label="CAT promedio" value={percent(data.catPercentage)} />}
      </>)}</Card>}
      <InfoBanner message="El crédito disponible es una línea de financiamiento. Consulta los importes y condiciones de tu estado de cuenta antes de pagar." />
    </>);
    case 'debts': return group(<><Metric label="Deuda pendiente" value={data.outstanding} currency={currency} /><InfoBanner title="Supuestos de la simulación" message={data.assumptions} /><ScenarioComparison scenarios={data.scenarios} currency={currency} /></>);
    case 'transfers': return group(<>
      <StatusBadge label="Borrador · por confirmar" tone="warning" />
      <Hero label="Importe a transferir" value={money(data.amount, currency)} />
      <Card>{group(<><Detail label="Desde" value={data.source} /><ThemedText accessibilityLabel="Hacia">↓</ThemedText><Detail label="Destinatario" value={data.recipient} /><Divider /><Detail label="Comisión" value={money(data.fee, currency)} /><Detail label="Total a descontar" value={money(data.amount + data.fee, currency)} />{data.scheduledDate && <Detail label="Fecha solicitada" value={date(data.scheduledDate)} />}</>)}</Card>
      <InfoBanner message="Revisa el destinatario y el importe. Este resumen no ha enviado dinero." />
    </>);
    case 'card-security': return group(<>
      {data.card
        ? <><CardFace card={data.card} /><StatusBadge label={data.status === 'blocked' ? 'Tarjeta bloqueada' : data.status === 'active' ? 'Tarjeta activa' : 'Tarjeta inactiva'} tone={data.status === 'active' ? 'info' : 'warning'} /></>
        : <Card>{group(<><ThemedText type="smallBold">{data.cardName}{data.lastFour ? ` · •••• ${data.lastFour}` : ''}</ThemedText><StatusBadge label={data.status === 'blocked' ? 'Tarjeta bloqueada' : data.status === 'active' ? 'Tarjeta activa' : 'Tarjeta inactiva'} tone={data.status === 'active' ? 'info' : 'warning'} /></>)}</Card>}
      {data.reportedTransaction && <TransactionList title="Movimiento en revisión"><TransactionItem {...data.reportedTransaction} currency={currency} /></TransactionList>}
      <InfoBanner title="Siguiente paso" message={data.guidance} tone="warning" />
    </>);
    case 'savings-goals': return data.goals.length ? group(<>{data.goals.map(item => <Card key={item.id}>{group(<>
      <ThemedText accessibilityRole="header" type="smallBold">{item.name}</ThemedText><TextBlock variant="amount" value={money(item.saved, currency)} />
      <ThemedText themeColor="textSecondary">de {money(item.target, currency)} · meta al {date(item.targetDate)}</ThemedText>
      <ProgressBar value={Math.min(100, item.saved / item.target * 100)} showValue label="Avance de tu meta" size="lg" tone="success" />
      <Detail label="Por ahorrar" value={money(Math.max(0, item.target - item.saved), currency)} /><Detail label="Aportación mensual sugerida" value={money(item.monthlyContribution, currency)} />
      {item.saved >= item.target && <StatusBadge label="Meta alcanzada" tone="success" />}
    </>)}</Card>)}</>) : <Missing description="Todavía no hay metas de ahorro registradas." />;
    case 'banking-information': return group(<>
      <Card>{group(<><ThemedText type="smallBold">{data.bankName}</ThemedText><Detail label="Titular" value={data.holder} />{data.maskedClabe && <Detail label="CLABE enmascarada" value={data.maskedClabe} />}</>)}</Card>
      <ThemedText type="smallBold">Estados de cuenta</ThemedText>
      {data.documents.length ? data.documents.map(item => <Card key={item.id}>{group(<><ThemedText type="smallBold">{item.name}</ThemedText><ThemedText themeColor="textSecondary">{item.period}</ThemedText><StatusBadge label={item.status === 'available' ? 'Disponible' : 'En preparación'} tone={item.status === 'available' ? 'success' : 'neutral'} /></>)}</Card>) : <Missing description="No hay documentos disponibles para este periodo." />}
    </>);
    case 'financial-education': return group(<>
      <Hero label="Aprende sobre tus finanzas" value={data.concept} />
      <ThemedText>{data.explanation}</ThemedText>
      {data.takeaways.map((text, index) => <Card key={index}>{group(<><StatusBadge label={`Idea ${index + 1}`} tone="info" /><ThemedText>{text}</ThemedText></>)}</Card>)}
      {data.scenarios && <><ThemedText type="smallBold">Compara los ejemplos</ThemedText><ScenarioComparison scenarios={data.scenarios} currency={currency} /></>}
    </>);
  }
}

export function BankingView({ data }: { data: BankingViewData }) {
  return <View style={[styles.stack, styles.viewPadding]}>
    <View style={styles.heading}><ThemedText accessibilityRole="header" type="subtitle">{data.title}</ThemedText>{data.subtitle && <ThemedText themeColor="textSecondary">{data.subtitle}</ThemedText>}</View>
    {'state' in data ? <Missing description={data.description} /> : <Content key={data.intent} data={data} />}
  </View>;
}

const styles = StyleSheet.create({
  stack: { gap: Spacing.four, width: '100%' },
  viewPadding: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  heading: { gap: Spacing.one },
  hero: { borderLeftWidth: 4, borderRadius: 16, padding: Spacing.five, gap: Spacing.two },
  heroAmount: { fontSize: 32, fontWeight: '700', lineHeight: 40 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  metric: { flexGrow: 1, flexBasis: 240, maxWidth: '100%' },
  detail: { gap: Spacing.one },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  search: { borderWidth: 1, borderRadius: 12, minHeight: 48, padding: Spacing.three, fontSize: 16 },
  expanded: { gap: Spacing.two, padding: Spacing.three },
  schedule: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  dateTile: { padding: Spacing.three, borderRadius: 12, justifyContent: 'center', maxWidth: '100%' },
  scheduleBody: { flexGrow: 1, flexBasis: 160, gap: Spacing.one },
});
