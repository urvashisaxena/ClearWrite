import { describe, expect, it } from 'vitest';
import { checkText, computeScore, issueKey } from './checker';
import { computeStats, countSyllables } from './readability';
import { matchCase, runRules } from './rules';
import type { Issue } from './types';

const noOptions = { personalWords: new Set<string>(), dismissed: new Set<string>() };

function rulesFor(text: string, ruleId: string): Issue[] {
  return runRules(text).filter((i) => i.ruleId === ruleId);
}

describe('correctness rules', () => {
  it('flags repeated words and suggests a single copy', () => {
    const issues = rulesFor('Fix the the mistake.', 'repeated-word');
    expect(issues).toHaveLength(1);
    expect(issues[0].text).toBe('the the');
    expect(issues[0].suggestions).toEqual(['the']);
  });

  it('allows intentional doubles like "had had"', () => {
    expect(rulesFor('She had had enough.', 'repeated-word')).toHaveLength(0);
  });

  it('corrects "a" vs "an", including exceptions', () => {
    expect(rulesFor('I ate a apple.', 'article-agreement')[0].suggestions).toEqual(['an']);
    expect(rulesFor('She has an dog.', 'article-agreement')[0].suggestions).toEqual(['a']);
    expect(rulesFor('He attends a university.', 'article-agreement')).toHaveLength(0);
    expect(rulesFor('Wait an hour.', 'article-agreement')).toHaveLength(0);
  });

  it('fixes "could of" to "could have"', () => {
    const issues = rulesFor('You could of told me.', 'common-error');
    expect(issues[0].suggestions).toEqual(['could have']);
  });

  it('suggests missing apostrophes', () => {
    const issues = rulesFor('i dont know', 'missing-apostrophe');
    expect(issues[0].suggestions).toEqual(["don't"]);
  });

  it('does not flag capitalized "Im" lookalikes inside words', () => {
    expect(rulesFor('The important image', 'missing-apostrophe')).toHaveLength(0);
  });

  it('flags double comparatives like "more better"', () => {
    const issues = rulesFor('You write more better now.', 'double-comparative');
    expect(issues[0].suggestions).toEqual(['better']);
  });

  it('fixes "its" before an article and "you\'re own"', () => {
    expect(rulesFor('Its a great day.', 'its-confusion')[0].suggestions).toEqual(["It's"]);
    expect(rulesFor('Bring you\'re own lunch.', 'its-confusion')[0].suggestions).toEqual(['your']);
    expect(rulesFor('The dog wagged its tail.', 'its-confusion')).toHaveLength(0);
  });

  it('flags subject–verb disagreement', () => {
    expect(rulesFor("He don't care.", 'subject-verb')[0].suggestions).toEqual(["He doesn't"]);
    expect(rulesFor('They was late.', 'subject-verb')[0].suggestions).toEqual(['They were']);
  });

  it('fixes "then" vs "than" in comparisons', () => {
    const issues = rulesFor('It is better then before.', 'then-than');
    expect(issues[0].text).toBe('then');
    expect(issues[0].suggestions).toEqual(['than']);
  });

  it('flags double spaces with correct offsets', () => {
    const text = 'Hello  world';
    const issues = rulesFor(text, 'double-space');
    expect(issues).toHaveLength(1);
    expect(text.slice(issues[0].start, issues[0].end)).toBe('  ');
  });

  it('flags a missing space after a comma but not in numbers', () => {
    expect(rulesFor('Hi,there', 'comma-space')).toHaveLength(1);
    expect(rulesFor('It costs 1,000 dollars', 'comma-space')).toHaveLength(0);
  });

  it('capitalizes sentence starts but not after abbreviations', () => {
    const issues = rulesFor('This is it. next one.', 'sentence-case');
    expect(issues).toHaveLength(1);
    expect(issues[0].suggestions).toEqual(['N']);
    expect(rulesFor('Use tools, e.g. hammers, daily.', 'sentence-case')).toHaveLength(0);
  });

  it('capitalizes the standalone pronoun "i"', () => {
    const issues = rulesFor('yesterday i went home', 'lowercase-i');
    expect(issues).toHaveLength(1);
    expect(rulesFor('i.e. this thing', 'lowercase-i')).toHaveLength(0);
  });
});

describe('clarity rules', () => {
  it('simplifies wordy phrases', () => {
    const issues = rulesFor('In order to win, train.', 'wordy-phrase');
    expect(issues[0].suggestions).toEqual(['To']);
  });

  it('flags redundancies', () => {
    const issues = rulesFor('The end result was fine.', 'redundancy');
    expect(issues[0].suggestions).toEqual(['result']);
  });

  it('detects passive voice but skips adjectival participles', () => {
    expect(rulesFor('The ball was thrown by Sam.', 'passive-voice')).toHaveLength(1);
    expect(rulesFor('She was excited about it.', 'passive-voice')).toHaveLength(0);
  });

  it('flags sentences longer than 30 words', () => {
    const long = Array(35).fill('word').join(' ') + '.';
    expect(rulesFor(long, 'long-sentence')).toHaveLength(1);
    expect(rulesFor('Short sentence.', 'long-sentence')).toHaveLength(0);
  });
});

describe('engagement and delivery rules', () => {
  it('upgrades weak intensifiers', () => {
    const issues = rulesFor('It was very good.', 'weak-intensifier');
    expect(issues[0].suggestions).toEqual(['excellent']);
  });

  it('flags informal words with formal replacements', () => {
    const issues = rulesFor('im gonna go', 'informal');
    expect(issues[0].suggestions).toEqual(['going to']);
  });

  it('flags hedging once even when hedges nest', () => {
    const issues = rulesFor('I think that we should go.', 'hedging');
    expect(issues).toHaveLength(1);
  });

  it('flags multiple exclamation marks', () => {
    const issues = rulesFor('Wow!!', 'exclamation');
    expect(issues[0].suggestions).toEqual(['!']);
  });

  it('flags all-caps shouting but not known acronyms', () => {
    expect(rulesFor('this is URGENT', 'all-caps')).toHaveLength(1);
    expect(rulesFor('read the FAQ and PDF', 'all-caps')).toHaveLength(0);
  });
});

describe('checkText', () => {
  it('returns issues sorted by position without overlaps', () => {
    const issues = checkText('you could of  told me,ok', noOptions);
    for (let i = 1; i < issues.length; i++) {
      expect(issues[i].start).toBeGreaterThanOrEqual(issues[i - 1].start);
    }
    const marks = issues.filter((i) => i.ruleId !== 'long-sentence');
    for (let i = 1; i < marks.length; i++) {
      expect(marks[i].start).toBeGreaterThanOrEqual(marks[i - 1].end);
    }
  });

  it('respects dismissed issues', () => {
    const first = checkText('fix the the thing', noOptions);
    const target = first.find((i) => i.ruleId === 'repeated-word')!;
    const issues = checkText('fix the the thing', {
      personalWords: new Set(),
      dismissed: new Set([issueKey(target)]),
    });
    expect(issues.find((i) => i.ruleId === 'repeated-word')).toBeUndefined();
  });
});

describe('score and stats', () => {
  it('gives clean text a score of 100', () => {
    expect(computeScore([], 50)).toBe(100);
  });

  it('lowers the score as issues accumulate', () => {
    const issues = checkText('you could of told me and it was very good', noOptions);
    const score = computeScore(issues, 10);
    expect(score).toBeLessThan(100);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it('counts words, sentences, and syllables sensibly', () => {
    const stats = computeStats('Hello world. This is a test.');
    expect(stats.words).toBe(6);
    expect(stats.sentences).toBe(2);
    expect(countSyllables('hello')).toBe(2);
    expect(countSyllables('cat')).toBe(1);
    expect(countSyllables('banana')).toBe(3);
  });
});

describe('matchCase', () => {
  it('preserves leading capitalization and all-caps', () => {
    expect(matchCase('Alot', 'a lot')).toBe('A lot');
    expect(matchCase('ALOT', 'a lot')).toBe('A LOT');
    expect(matchCase('alot', 'a lot')).toBe('a lot');
  });
});
