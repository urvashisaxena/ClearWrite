import nspell from 'nspell';
import type { Issue } from './types';

type Speller = ReturnType<typeof nspell>;

let speller: Speller | null = null;
let loadPromise: Promise<Speller> | null = null;

/**
 * Build the Hunspell speller from the bundled dictionary. The dictionary is
 * compiled into the app itself (no network), so this works offline and from
 * a file:// URL. Parsing ~50k dictionary entries takes a moment, so it runs
 * once, deferred behind a promise.
 */
export function loadSpeller(): Promise<Speller> {
  if (loadPromise) return loadPromise;
  loadPromise = Promise.all([
    import('../dict/en.aff?raw'),
    import('../dict/en.dic?raw'),
  ]).then(([aff, dic]) => {
    speller = nspell(aff.default, dic.default);
    return speller;
  });
  return loadPromise;
}

export function isSpellerReady(): boolean {
  return speller !== null;
}

/** Frequent typos whose best fix Hunspell doesn't always rank first. */
const COMMON_TYPOS: Record<string, string> = {
  teh: 'the', adn: 'and', nad: 'and', waht: 'what', taht: 'that',
  thier: 'their', recieve: 'receive', seperate: 'separate',
  definately: 'definitely', occured: 'occurred', untill: 'until',
  wich: 'which', becuase: 'because', freind: 'friend', wierd: 'weird',
  beleive: 'believe', acheive: 'achieve', tommorow: 'tomorrow',
  accross: 'across', occurence: 'occurrence', neccessary: 'necessary',
};

const suggestionCache = new Map<string, string[]>();
const knownCache = new Map<string, boolean>();

function isKnown(word: string): boolean {
  let known = knownCache.get(word);
  if (known === undefined) {
    known = speller!.correct(word);
    knownCache.set(word, known);
  }
  return known;
}

function suggestionsFor(word: string): string[] {
  let s = suggestionCache.get(word);
  if (s === undefined) {
    s = speller!.suggest(word).slice(0, 4);
    const known = COMMON_TYPOS[word.toLowerCase()];
    if (known) s = [known, ...s.filter((x) => x.toLowerCase() !== known)].slice(0, 4);
    suggestionCache.set(word, s);
  }
  return s;
}

let issueCounter = 0;

/**
 * Spell-check plain text. Words in `personalWords` are treated as correct.
 * Returns an empty list until the dictionary has loaded.
 */
export function checkSpelling(text: string, personalWords: Set<string>): Issue[] {
  if (!speller) return [];
  const issues: Issue[] = [];
  const wordRe = /[A-Za-z]+(?:['’][A-Za-z]+)*/g;
  let m: RegExpExecArray | null;
  while ((m = wordRe.exec(text)) !== null) {
    const word = m[0];
    if (word.length < 2) continue;
    // Skip acronyms and mixed-case identifiers like "iPhone" or "localStorage".
    if (word === word.toUpperCase()) continue;
    if (/[a-z][A-Z]/.test(word)) continue;
    if (personalWords.has(word.toLowerCase())) continue;
    const normalized = word.replace(/’/g, "'");
    if (isKnown(normalized)) continue;
    issues.push({
      id: `spelling-${m.index}-${issueCounter++}`,
      ruleId: 'spelling',
      category: 'correctness',
      title: 'Possible misspelling',
      message: `"${word}" is not in the dictionary.`,
      start: m.index,
      end: m.index + word.length,
      text: word,
      suggestions: suggestionsFor(normalized),
    });
  }
  return issues;
}
