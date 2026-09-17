import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Page, Section, Stack } from '@/components/layout';
import { ThemedText } from '@/components/themed-text';
import {
  ActionButton,
  AreaChart,
  HeatmapChart,
  Card,
  Divider,
  EmptyState,
  InfoBanner,
  ProgressBar,
  StatusBadge,
} from '@/components/ui';
import { Spacing } from '@/constants/theme';
import {
  A2UI_BASIC_CATALOG_ID,
  A2UI_FINANCE_CATALOG_ID,
  A2UIMessageProcessor,
  type A2UIAction,
} from '@/features/a2ui';
import { A2UISurface } from '@/features/assistant/components/a2ui-surface';
import { FinancialViewGallery } from '@/features/financial-ui/gallery';
import {
  AccountBalanceCard,
  CreditUtilizationGauge,
  DueDateCountdown,
  FinancialStatCard,
  PaymentCard,
  SpendingCategoryChart,
  TransactionItem,
  TrendIndicator,
} from '@/features/personal-banking';

interface TestCatalogEvent {
  event: string;
  componentId: string;
  payload: {
    source: string;
  };
}

const heatmapDemo = Array.from({ length: 365 }, (_, index) => ({
  date: new Date(Date.UTC(2026, 0, index + 1)).toISOString().slice(0, 10),
  value: index % 7 === 0 ? 0 : (index * 137 + 53) % 2400,
})).filter((_, index) => index % 19 !== 0);

const previewProcessor = new A2UIMessageProcessor();
const previewResult = previewProcessor.process([
  {
    version: 'v0.9.1',
    createSurface: { surfaceId: 'catalog-preview', catalogId: A2UI_BASIC_CATALOG_ID },
  },
  {
    version: 'v0.9.1',
    updateComponents: {
      surfaceId: 'catalog-preview',
      components: [
        { id: 'root', component: 'Card', child: 'preview_column' },
        { id: 'preview_column', component: 'Column', children: ['preview_title', 'preview_body', 'preview_button'] },
        { id: 'preview_title', component: 'Text', text: { path: '/title' }, variant: 'h2' },
        { id: 'preview_body', component: 'Text', text: { path: '/body' } },
        { id: 'preview_label', component: 'Text', text: 'Button · Probar evento' },
        { id: 'preview_button', component: 'Button', child: 'preview_label', variant: 'primary', action: { event: { name: 'preview_action', context: { source: 'component-gallery' } } } },
      ],
    },
  },
  {
    version: 'v0.9.1',
    updateDataModel: {
      surfaceId: 'catalog-preview',
      path: '/',
      value: { title: 'A2UI v0.9.1', body: 'Vista local de Card, Column, Text y Button; no hace peticiones.' },
    },
  },
]);
if (!previewResult.ok) throw new Error('Invalid local A2UI preview');
const a2uiPreview = previewResult.surfaces[0];

const financePreviewProcessor = new A2UIMessageProcessor();
const financePreviewResult = financePreviewProcessor.process([
  ...[
    {
      surfaceId: 'catalog-area-preview',
      title: 'Chart · area',
      chart: {
        kind: 'area',
        accessibleSummary: 'Tres meses de ingresos y gastos de ejemplo.',
        props: {
          currency: 'MXN',
          series: [
            { id: 'income', label: 'Ingresos', tone: 'blue' },
            { id: 'expenses', label: 'Gastos', tone: 'violet' },
          ],
          data: [
            { label: 'Ene', values: [12000, 8500] },
            { label: 'Feb', values: [15800, 9200] },
            { label: 'Mar', values: [14200, 8100] },
          ],
        },
      },
    },
    {
      surfaceId: 'catalog-heatmap-preview',
      title: 'Chart · heatmap',
      chart: {
        kind: 'heatmap',
        accessibleSummary: 'Tres valores diarios de ejemplo.',
        props: {
          currency: 'MXN',
          initialDate: '2026-09-12',
          initialView: 'week',
          data: [
            { date: '2026-09-10', value: 240 },
            { date: '2026-09-11', value: 0 },
            { date: '2026-09-12', value: 420 },
          ],
        },
      },
    },
  ].flatMap(({ surfaceId, title, chart }) => [
    {
      version: 'v0.9.1',
      createSurface: { surfaceId, catalogId: A2UI_FINANCE_CATALOG_ID },
    },
    {
      version: 'v0.9.1',
      updateComponents: {
        surfaceId,
        components: [
          { id: 'root', component: 'Card', child: 'preview_column' },
          { id: 'preview_column', component: 'Column', children: ['preview_title', 'preview_chart'] },
          { id: 'preview_title', component: 'Text', text: title },
          { id: 'preview_chart', component: 'Chart', chart: { path: '/chart' } },
        ],
      },
    },
    {
      version: 'v0.9.1',
      updateDataModel: { surfaceId, path: '/', value: { chart } },
    },
  ]),
]);
if (!financePreviewResult.ok) throw new Error('Invalid local finance A2UI previews');
const financePreviews = financePreviewResult.surfaces;

export default function ComponentCatalogScreen() {
  const [debugEvent, setDebugEvent] = useState<TestCatalogEvent | A2UIAction | null>(null);

  const handlePrimaryAction = () => {
    setDebugEvent({
      event: 'catalog_primary_action',
      componentId: 'catalog-primary-button',
      payload: {
        source: 'component-catalog',
      },
    });
  };

  return (
    <Page scrollable safeArea padding="md">
      <Stack direction="column" spacing="lg">
        {/* Encabezado */}
        <View style={styles.header}>
          <ThemedText type="subtitle">Biblioteca de componentes</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Catálogo visual de la biblioteca. Datos de ejemplo e interacciones locales, sin peticiones al agente.
          </ThemedText>
        </View>

        <FinancialViewGallery />

        {/* Banner de depuración de eventos */}
        {debugEvent && (
          <Card variant="highlighted" padding="sm">
            <View style={styles.debugHeader}>
              <ThemedText type="smallBold" style={styles.debugTitle}>
                Evento de prueba capturado:
              </ThemedText>
              <ActionButton
                label="Limpiar"
                variant="outline"
                size="sm"
                onPress={() => setDebugEvent(null)}
              />
            </View>
            <ThemedText type="code">
              {JSON.stringify(debugEvent, null, 2)}
            </ThemedText>
          </Card>
        )}

        <Section spacing="md">
          <ThemedText type="smallBold" style={styles.sectionTitle}>Gráfico de áreas</ThemedText>
          <AreaChart
            title="Ingresos y gastos"
            subtitle="Evolución mensual · datos de ejemplo"
            currency="MXN"
            series={[{ id: 'income', label: 'Ingresos', tone: 'blue' }, { id: 'expenses', label: 'Gastos', tone: 'violet' }]}
            data={[
              { label: 'Ene', values: [12000, 8500] }, { label: 'Feb', values: [15800, 9200] },
              { label: 'Mar', values: [14200, 8100] }, { label: 'Abr', values: [19500, 11800] },
              { label: 'May', values: [17800, 10400] }, { label: 'Jun', values: [23800, 14200] },
              { label: 'Jul', values: [21600, 12600] }, { label: 'Ago', values: [28500, 16100] },
            ]}
            onPointSelect={(point) => setDebugEvent({ event: 'area_point_selected', componentId: 'catalog-area-chart', payload: { source: point.label } })}
          />
          <AreaChart title="Flujo neto" series={[{ id: 'net', label: 'Saldo neto', tone: 'green' }]} data={[
            { label: 'Lun', values: [1200] }, { label: 'Mar', values: [-600] },
            { label: 'Mié', values: [400] }, { label: 'Jue', values: [0] }, { label: 'Vie', values: [2100] },
          ]} />
        </Section>

        <Section spacing="md">
          <ThemedText type="smallBold" style={styles.sectionTitle}>Mapa de calor</ThemedText>
          <HeatmapChart
            title="Actividad de gastos"
            subtitle="Datos de ejemplo · amplía por mes o semana"
            data={heatmapDemo}
            initialDate="2026-09-12"
            currency="MXN"
            onDaySelect={(day) => setDebugEvent({ event: 'heatmap_day_selected', componentId: 'catalog-heatmap', payload: { source: JSON.stringify(day) } })}
            onPeriodChange={(period) => setDebugEvent({ event: 'heatmap_period_changed', componentId: 'catalog-heatmap', payload: { source: JSON.stringify(period) } })}
          />
        </Section>

        {/* 1. Botones */}
        <Section spacing="md">
          <ThemedText type="smallBold" style={styles.sectionTitle}>
            Botones
          </ThemedText>

          <Card variant="default" padding="md">
            <Stack direction="column" spacing="md">
              <ThemedText type="small" themeColor="textSecondary">
                Variantes principales (Presiona el botón Primario para probar la acción):
              </ThemedText>
              <Stack direction="column" spacing="sm">
                <ActionButton
                  label="Botón Primario (Dispara evento)"
                  variant="primary"
                  onPress={handlePrimaryAction}
                />
                <ActionButton
                  label="Botón Secundario"
                  variant="secondary"
                  onPress={() => {}}
                />
                <ActionButton
                  label="Botón Contorno"
                  variant="outline"
                  onPress={() => {}}
                />
                <ActionButton
                  label="Botón Peligro"
                  variant="danger"
                  onPress={() => {}}
                />
              </Stack>

              <Divider inset="none" tone="muted" />

              <ThemedText type="small" themeColor="textSecondary">
                Estados especiales:
              </ThemedText>
              <Stack direction="column" spacing="sm">
                <ActionButton
                  label="Botón Cargando"
                  variant="primary"
                  loading
                  onPress={() => {}}
                />
                <ActionButton
                  label="Botón Deshabilitado"
                  variant="secondary"
                  disabled
                  onPress={() => {}}
                />
              </Stack>

              <Divider inset="none" tone="muted" />

              <ThemedText type="small" themeColor="textSecondary">
                Tamaños:
              </ThemedText>
              <Stack direction="row" spacing="sm" align="center" wrap>
                <ActionButton label="Pequeño" size="sm" variant="outline" onPress={() => {}} />
                <ActionButton label="Mediano" size="md" variant="outline" onPress={() => {}} />
                <ActionButton label="Grande" size="lg" variant="outline" onPress={() => {}} />
              </Stack>
            </Stack>
          </Card>
        </Section>

        {/* 2. Estados */}
        <Section spacing="md">
          <ThemedText type="smallBold" style={styles.sectionTitle}>
            Estados
          </ThemedText>

          <Card variant="default" padding="md">
            <Stack direction="column" spacing="md">
              <ThemedText type="small" themeColor="textSecondary">
                Todos los tonos disponibles:
              </ThemedText>
              <View style={styles.badgeRow}>
                <StatusBadge label="Neutral" tone="neutral" />
                <StatusBadge label="Información" tone="info" />
                <StatusBadge label="Aprobado" tone="success" />
                <StatusBadge label="Pendiente" tone="warning" />
                <StatusBadge label="Rechazado" tone="danger" />
              </View>

              <Divider inset="none" tone="muted" />

              <ThemedText type="small" themeColor="textSecondary">
                Tamaño pequeño vs mediano:
              </ThemedText>
              <View style={styles.badgeRow}>
                <StatusBadge label="Pequeño (sm)" tone="info" size="sm" />
                <StatusBadge label="Mediano (md)" tone="info" size="md" />
              </View>
            </Stack>
          </Card>
        </Section>

        {/* 3. Progreso */}
        <Section spacing="md">
          <ThemedText type="smallBold" style={styles.sectionTitle}>
            Progreso
          </ThemedText>

          <Card variant="default" padding="md">
            <Stack direction="column" spacing="md">
              <ProgressBar
                value={25}
                label="Inicio del período"
                showValue
                tone="default"
              />
              <ProgressBar
                value={60}
                label="Meta de ahorro mensual"
                showValue
                tone="default"
              />
              <ProgressBar
                value={85}
                label="Presupuesto consumido"
                showValue
                tone="warning"
              />
              <ProgressBar
                value={100}
                label="Meta alcanzada"
                showValue
                tone="success"
              />
            </Stack>
          </Card>
        </Section>

        {/* 4. Avisos */}
        <Section spacing="md">
          <ThemedText type="smallBold" style={styles.sectionTitle}>
            Avisos
          </ThemedText>

          <Stack direction="column" spacing="sm">
            <InfoBanner
              tone="info"
              title="Estado de cuenta disponible"
              message="Tu estado de cuenta de marzo de 2026 ya está listo para ser consultado y descargado."
            />
            <InfoBanner
              tone="success"
              title="Transferencia realizada"
              message="El envío de fondos por SPEI ha sido liquidado correctamente por Banxico."
            />
            <InfoBanner
              tone="warning"
              title="Límite de crédito próximo"
              message="Has utilizado más del 80% del límite asignado para tu tarjeta Oro."
            />
            <InfoBanner
              tone="danger"
              title="Acceso no reconocido"
              message="Detectamos un inicio de sesión desde un nuevo dispositivo. Revisa tu actividad."
            />
            <InfoBanner
              tone="info"
              message="Aviso rápido informativo sin encabezado adicional."
            />
          </Stack>
        </Section>

        {/* 5. Separadores */}
        <Section spacing="md">
          <ThemedText type="smallBold" style={styles.sectionTitle}>
            Separadores
          </ThemedText>

          <Card variant="default" padding="md">
            <Stack direction="column" spacing="md">
              <ThemedText type="small">Separador estándar sin sangría (inset: none):</ThemedText>
              <Divider inset="none" tone="default" />

              <ThemedText type="small">Separador con sangría pequeña (inset: sm):</ThemedText>
              <Divider inset="sm" tone="muted" />

              <ThemedText type="small">Separador con sangría media (inset: md):</ThemedText>
              <Divider inset="md" tone="default" />

              <ThemedText type="small">Separador con sangría grande (inset: lg):</ThemedText>
              <Divider inset="lg" tone="muted" />
            </Stack>
          </Card>
        </Section>

        {/* 6. Estados vacíos */}
        <Section spacing="md">
          <ThemedText type="smallBold" style={styles.sectionTitle}>
            Estados vacíos
          </ThemedText>

          <Card variant="default" padding="none">
            <EmptyState
              title="Sin transacciones recientes"
              description="No encontramos movimientos registrados en el período seleccionado. Utiliza tu tarjeta para comenzar a ver historial."
              tone="muted"
            />
          </Card>
        </Section>

        {/* 7. Componentes financieros existentes */}
        <Section spacing="md">
          <ThemedText type="smallBold" style={styles.sectionTitle}>
            Componentes financieros existentes
          </ThemedText>

          <Stack direction="column" spacing="md">
            {/* AccountBalanceCard */}
            <AccountBalanceCard
              accountId="acc-cat-01"
              accountName="Cuenta Enlace Digital Banorte"
              accountType="checking"
              accountLastFour="7892"
              availableBalance={48350.5}
              currency="MXN"
              status="active"
              variant="highlighted"
              onPress={() => {}}
            />

            {/* FinancialStatCard */}
            <FinancialStatCard
              label="Ahorro Acumulado"
              value={15400}
              format="currency"
              currency="MXN"
              tone="positive"
              comparison={{
                value: 8.4,
                label: 'vs mes anterior',
              }}
              onPress={() => {}}
            />

            {/* TransactionItem */}
            <Card variant="default" padding="none">
              <TransactionItem
                transactionId="tx-cat-01"
                title="Supermercado HEB"
                description="Compra de despensa quincenal"
                amount={-1840.5}
                currency="MXN"
                occurredAt="2026-03-12T17:30:00Z"
                category="food"
                status="completed"
                onPress={() => {}}
              />
            </Card>

            {/* PaymentCard */}
            <PaymentCard
              cardName="Tarjeta Oro"
              cardType="credit"
              network="mastercard"
              lastFour="9012"
              status="active"
              expires="2028-11"
              holder="Titular de ejemplo"
            />
            <PaymentCard
              cardName="Débito Enlace"
              cardType="debit"
              network="visa"
              lastFour="1234"
              status="blocked"
              expires="2029-04"
              caption="Saldo disponible"
              amount={48350.5}
              currency="MXN"
            />

            {/* CreditUtilizationGauge */}
            <CreditUtilizationGauge used={8500} limit={10000} available={1500} currency="MXN" />

            {/* DueDateCountdown */}
            <DueDateCountdown dueDate="2026-09-25" cutoffDate="2026-09-10" now={new Date('2026-09-12T12:00:00Z')} />

            {/* TrendIndicator */}
            <TrendIndicator current={15000} previous={14000} currency="MXN" inverse />

            {/* SpendingCategoryChart */}
            <SpendingCategoryChart
              title="Distribución de Gastos"
              subtitle="Marzo 2026"
              categories={[
                { category: 'food', amount: 4800 },
                { category: 'transport', amount: 1650 },
                { category: 'shopping', amount: 2300 },
                { category: 'utilities', amount: 950 },
                { category: 'entertainment', amount: 720 },
              ]}
              currency="MXN"
              showPercentages
              onCategoryPress={() => {}}
            />
          </Stack>
        </Section>
        <Section spacing="md">
          <ThemedText type="smallBold" style={styles.sectionTitle}>
            Componentes A2UI del agente
          </ThemedText>
          <A2UISurface surface={a2uiPreview} disabled={false} onDispatch={setDebugEvent} />
        </Section>
        <Section spacing="md">
          <ThemedText type="smallBold" style={styles.sectionTitle}>
            Catálogo A2UI financiero v1
          </ThemedText>
          {financePreviews.map((surface) => (
            <A2UISurface
              key={surface.surfaceId}
              surface={surface}
              disabled
              onDispatch={setDebugEvent}
            />
          ))}
        </Section>
      </Stack>
    </Page>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 24,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.8,
  },
  debugHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  debugTitle: {
    color: '#208AEF',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    alignItems: 'center',
  },
});
