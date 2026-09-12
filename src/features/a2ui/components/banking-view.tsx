import { BankingView } from '@/features/financial-ui/banking-view';
import { EmptyState } from '@/components/ui/empty-state';
import type { A2UIBankingViewComponent, JSONValue } from '../types';
import { resolveBankingView } from './banking-view-model';

export function A2UIBankingView({ view, dataModel }: { view: A2UIBankingViewComponent['view']; dataModel: JSONValue | undefined }) {
  const parsed = resolveBankingView(view, dataModel);
  if (!parsed.success) return <EmptyState title="Vista no disponible" description="No recibimos los datos necesarios para mostrar esta vista." />;
  return <BankingView data={parsed.data} />;
}
