import { runRules } from './rules';
import { checkSpelling } from './spelling';
import type { Category, Issue } from './types';

export interface CheckOptions {
  /** Words the user added to their personal dictionary (lowercase). */
  personalWords: Set<string>;
  /** Dismissed issue keys — see `issueKey`. */
  dismissed: Set<string>;
}

/**
 * A stable key for "this kind of issue on this text", so dismissing an issue
 * survives re-checks even as offsets shift while the user types.
 */
export function issueKey(issue: Issue): string {
  return `${issue.ruleId}:${issue.text.toLowerCase()}`;
}

export function checkText(text: string, options: CheckOptions): Issue[] {
  const issues = [...runRules(text), ...checkSpelling(text, options.personalWords)];

  const filtered = issues.filter((i) => !options.dismissed.has(issueKey(i)));
  filtered.sort((a, b) => a.start - b.start || a.end - b.end);

  // Drop issues fully contained in an earlier overlapping issue, except that
  // long-sentence flags span whole sentences and may coexist with anything.
  const result: Issue[] = [];
  let lastEnd = -1;
  for (const issue of filtered) {
    if (issue.ruleId === 'long-sentence') {
      result.push(issue);
      continue;
    }
    if (issue.start < lastEnd) continue;
    result.push(issue);
    lastEnd = issue.end;
  }
  return result;
}

const CATEGORY_WEIGHT: Record<Category, number> = {
  correctness: 3,
  clarity: 1.5,
  engagement: 1,
  delivery: 1,
};

/** Overall document score, 0–100, in the spirit of Grammarly's score. */
export function computeScore(issues: Issue[], wordCount: number): number {
  if (wordCount === 0) return 100;
  const penalty = issues.reduce((sum, i) => sum + CATEGORY_WEIGHT[i.category], 0);
  const per100Words = (penalty / Math.max(wordCount, 25)) * 100;
  return Math.max(0, Math.round(100 - per100Words * 1.5));
}

export function countByCategory(issues: Issue[]): Record<Category, number> {
  const counts: Record<Category, number> = {
    correctness: 0,
    clarity: 0,
    engagement: 0,
    delivery: 0,
  };
  for (const issue of issues) counts[issue.category]++;
  return counts;
}
