import { z } from 'zod';
import { bankingViewSchema, type BankingViewData } from '../../financial-ui/model.ts';
import { resolveDataPath } from '../data-model.ts';
import { isSafeJsonPointer } from '../json-pointer.ts';
import type { A2UIBinding, JSONValue } from '../types.ts';

export const a2uiBankingViewInputSchema = z.union([
  z.object({ path: z.string().max(512).refine(isSafeJsonPointer) }).strict(),
  bankingViewSchema,
]);

export function resolveBankingView(input: BankingViewData | A2UIBinding, dataModel: JSONValue | undefined) {
  return bankingViewSchema.safeParse('path' in input ? resolveDataPath(dataModel, input.path) : input);
}
