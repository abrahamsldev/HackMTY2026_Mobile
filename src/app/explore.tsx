import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Page, Section, Stack } from '@/components/layout';
import { ThemedText } from '@/components/themed-text';
import {
  ActionButton,
  Card,
  Divider,
  EmptyState,
  InfoBanner,
  ProgressBar,
  StatusBadge,
} from '@/components/ui';
import { Spacing } from '@/constants/theme';
import {
  AccountBalanceCard,
  FinancialStatCard,
  SpendingCategoryChart,
  TransactionItem,
} from '@/features/personal-banking';

interface TestCatalogEvent {
  event: string;
  componentId: string;
  payload: {
    source: string;
  };
}

export default function ComponentCatalogScreen() {
  const [debugEvent, setDebugEvent] = useState<TestCatalogEvent | null>(null);

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
            Catálogo visual y de pruebas para los componentes del sistema generativo UI.
          </ThemedText>
        </View>

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
              <Stack direction="row" spacing="sm" align="center">
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
      </Stack>
    </Page>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingVertical: Spacing.two,
    gap: Spacing.one,
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
    marginBottom: Spacing.one,
  },
  debugTitle: {
    color: '#208AEF',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    alignItems: 'center',
  },
});
