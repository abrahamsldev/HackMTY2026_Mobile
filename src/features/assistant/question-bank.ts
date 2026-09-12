import entries from './question-bank.json';

export type FinancialIntent = {
  readonly id: string;
  readonly area: string;
  readonly questions: readonly string[];
  /** Product requirements, not a declaration of implemented backend capabilities. */
  readonly expectedDisplay: string;
  readonly possibleActions: readonly string[];
};

export const questionBank: readonly FinancialIntent[] = entries;
export const questionCount = questionBank.reduce((count, intent) => count + intent.questions.length, 0);

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-MX');
}

export function searchQuestions(query: string): readonly FinancialIntent[] {
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return questionBank;
  return questionBank.flatMap((intent) => {
    const questions = intent.questions.filter((question) => {
      const searchable = normalize(`${intent.area} ${question}`);
      return terms.every((term) => searchable.includes(term));
    });
    return questions.length ? [{ ...intent, questions }] : [];
  });
}
