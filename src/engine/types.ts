export type Category = 'correctness' | 'clarity' | 'engagement' | 'delivery';

export interface Issue {
  id: string;
  ruleId: string;
  category: Category;
  /** Short label shown on the suggestion card, e.g. "Repeated word". */
  title: string;
  /** Longer explanation of why this was flagged. */
  message: string;
  /** Start offset in the plain text. */
  start: number;
  /** End offset (exclusive) in the plain text. */
  end: number;
  /** The flagged text. */
  text: string;
  /** Replacement candidates. An empty string means "remove". */
  suggestions: string[];
}

export const CATEGORY_META: Record<
  Category,
  { label: string; color: string; description: string }
> = {
  correctness: {
    label: 'Correctness',
    color: '#e5484d',
    description: 'Spelling, grammar, and punctuation',
  },
  clarity: {
    label: 'Clarity',
    color: '#3b82f6',
    description: 'Conciseness and readability',
  },
  engagement: {
    label: 'Engagement',
    color: '#10b981',
    description: 'Word variety and vividness',
  },
  delivery: {
    label: 'Delivery',
    color: '#8b5cf6',
    description: 'Tone and politeness',
  },
};

export const CATEGORY_ORDER: Category[] = [
  'correctness',
  'clarity',
  'engagement',
  'delivery',
];
