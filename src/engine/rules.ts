import type { Category, Issue } from './types';

let issueCounter = 0;
function makeIssue(
  ruleId: string,
  category: Category,
  title: string,
  message: string,
  start: number,
  end: number,
  text: string,
  suggestions: string[],
): Issue {
  return {
    id: `${ruleId}-${start}-${issueCounter++}`,
    ruleId,
    category,
    title,
    message,
    start,
    end,
    text,
    suggestions,
  };
}

/** Preserve the capitalization pattern of the original when suggesting a replacement. */
export function matchCase(original: string, replacement: string): string {
  if (!replacement) return replacement;
  if (original === original.toUpperCase() && original.length > 1) {
    return replacement.toUpperCase();
  }
  if (original[0] === original[0].toUpperCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

function findAll(
  text: string,
  regex: RegExp,
  onMatch: (m: RegExpExecArray) => void,
): void {
  const re = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index === re.lastIndex) re.lastIndex++;
    onMatch(m);
  }
}

// ---------------------------------------------------------------------------
// Correctness
// ---------------------------------------------------------------------------

function repeatedWords(text: string): Issue[] {
  const issues: Issue[] = [];
  // "had had" and "that that" are usually intentional.
  const allowed = new Set(['had', 'that']);
  findAll(text, /\b([A-Za-z]+)(\s+)\1\b/gi, (m) => {
    if (allowed.has(m[1].toLowerCase())) return;
    issues.push(
      makeIssue(
        'repeated-word',
        'correctness',
        'Repeated word',
        `The word "${m[1]}" appears twice in a row.`,
        m.index,
        m.index + m[0].length,
        m[0],
        [m[1]],
      ),
    );
  });
  return issues;
}

const AN_EXCEPTIONS = new Set([
  // words starting with a vowel letter but a consonant sound → "a"
  'university', 'universal', 'unique', 'union', 'unit', 'united', 'user',
  'useful', 'usual', 'usage', 'utility', 'uniform', 'unicorn', 'eulogy',
  'european', 'one', 'once', 'ubiquitous', 'utopia', 'ukulele', 'uranium',
]);
const A_EXCEPTIONS = new Set([
  // words starting with a consonant letter but a vowel sound → "an"
  'hour', 'honest', 'honor', 'honour', 'heir', 'heirloom', 'hourly', 'honorable',
  'mba', 'mri', 'fbi', 'sos', 'html', 'http', 'x-ray', 'xml', 'nda', 'rsvp',
]);

function articleAgreement(text: string): Issue[] {
  const issues: Issue[] = [];
  findAll(text, /\b(a|an)\s+([A-Za-z][A-Za-z-]*)/gi, (m) => {
    const article = m[1].toLowerCase();
    const word = m[2].toLowerCase();
    const startsWithVowel = /^[aeiou]/.test(word);
    let needsAn = startsWithVowel;
    if (startsWithVowel && AN_EXCEPTIONS.has(word)) needsAn = false;
    if (!startsWithVowel && A_EXCEPTIONS.has(word)) needsAn = true;
    const correct = needsAn ? 'an' : 'a';
    if (article !== correct) {
      issues.push(
        makeIssue(
          'article-agreement',
          'correctness',
          'Incorrect article',
          `Use "${correct}" before "${m[2]}".`,
          m.index,
          m.index + m[1].length,
          m[1],
          [matchCase(m[1], correct)],
        ),
      );
    }
  });
  return issues;
}

const COMMON_ERRORS: Array<[string, string, string]> = [
  ['could of', 'could have', '"Could of" is a misspelling of "could have".'],
  ['would of', 'would have', '"Would of" is a misspelling of "would have".'],
  ['should of', 'should have', '"Should of" is a misspelling of "should have".'],
  ['must of', 'must have', '"Must of" is a misspelling of "must have".'],
  ['might of', 'might have', '"Might of" is a misspelling of "might have".'],
  ['alot', 'a lot', '"Alot" should be written as two words.'],
  ['irregardless', 'regardless', '"Irregardless" is nonstandard; use "regardless".'],
  ['your welcome', "you're welcome", 'Use the contraction of "you are".'],
  ['for all intensive purposes', 'for all intents and purposes', 'The correct idiom is "for all intents and purposes".'],
  ['supposably', 'supposedly', '"Supposably" is likely a mistake for "supposedly".'],
];

function commonErrors(text: string): Issue[] {
  const issues: Issue[] = [];
  for (const [wrong, right, message] of COMMON_ERRORS) {
    const pattern = new RegExp(`\\b${wrong.replace(/\s+/g, '\\s+')}\\b`, 'gi');
    findAll(text, pattern, (m) => {
      issues.push(
        makeIssue(
          'common-error',
          'correctness',
          'Commonly confused',
          message,
          m.index,
          m.index + m[0].length,
          m[0],
          [matchCase(m[0], right)],
        ),
      );
    });
  }
  return issues;
}

const MISSING_APOSTROPHE: Record<string, string> = {
  cant: "can't", dont: "don't", wont: "won't", isnt: "isn't", didnt: "didn't",
  doesnt: "doesn't", im: "I'm", ive: "I've", youre: "you're", theyre: "they're",
  wasnt: "wasn't", werent: "weren't", hasnt: "hasn't", havent: "haven't",
  couldnt: "couldn't", shouldnt: "shouldn't", wouldnt: "wouldn't",
  arent: "aren't", aint: "ain't", whos: "who's", thats: "that's",
  theres: "there's", lets: "let's", youll: "you'll", youve: "you've",
  weve: "we've", theyve: "they've", shes: "she's", hes: "he's", whats: "what's",
};

function missingApostrophes(text: string): Issue[] {
  const issues: Issue[] = [];
  // Only match these when they appear as standalone lowercase words. Words
  // like "wont", "cant", and "lets" are valid English words, so we keep to
  // lowercase forms where the contraction reading is overwhelmingly likely.
  findAll(text, /\b[a-z]+\b/g, (m) => {
    const fix = MISSING_APOSTROPHE[m[0]];
    if (!fix) return;
    issues.push(
      makeIssue(
        'missing-apostrophe',
        'correctness',
        'Missing apostrophe',
        `Did you mean "${fix}"?`,
        m.index,
        m.index + m[0].length,
        m[0],
        [fix],
      ),
    );
  });
  return issues;
}

function doubleComparative(text: string): Issue[] {
  const issues: Issue[] = [];
  findAll(
    text,
    /\b(more|most)\s+(better|worse|best|worst|easier|harder|bigger|smaller|faster|slower|stronger|weaker|greater|lesser|higher|lower)\b/gi,
    (m) => {
      issues.push(
        makeIssue(
          'double-comparative',
          'correctness',
          'Double comparative',
          `"${m[2]}" is already comparative; "${m[1].toLowerCase()} ${m[2].toLowerCase()}" doubles it up.`,
          m.index,
          m.index + m[0].length,
          m[0],
          [matchCase(m[0], m[2].toLowerCase())],
        ),
      );
    },
  );
  return issues;
}

function itsConfusion(text: string): Issue[] {
  const issues: Issue[] = [];
  // Only the unambiguous pattern: "its" directly before an article can't be
  // the possessive, so it must be the contraction of "it is".
  findAll(text, /\b(its)\s+(?:a|an|the)\b/gi, (m) => {
    issues.push(
      makeIssue(
        'its-confusion',
        'correctness',
        '"Its" vs. "it\'s"',
        'Use "it\'s" (short for "it is") here; "its" shows possession.',
        m.index,
        m.index + m[1].length,
        m[1],
        [matchCase(m[1], "it's")],
      ),
    );
  });
  // "you're" directly before "own" must be the possessive "your".
  findAll(text, /\b(you're)\s+own\b/gi, (m) => {
    issues.push(
      makeIssue(
        'its-confusion',
        'correctness',
        '"You\'re" vs. "your"',
        'Use the possessive "your" here; "you\'re" means "you are".',
        m.index,
        m.index + m[1].length,
        m[1],
        [matchCase(m[1], 'your')],
      ),
    );
  });
  return issues;
}

function subjectVerbAgreement(text: string): Issue[] {
  const issues: Issue[] = [];
  findAll(text, /\b(he|she|it)\s+(don't|dont)\b/gi, (m) => {
    issues.push(
      makeIssue(
        'subject-verb',
        'correctness',
        'Subject–verb agreement',
        `Use "doesn't" with "${m[1].toLowerCase()}".`,
        m.index,
        m.index + m[0].length,
        m[0],
        [`${m[1]} doesn't`],
      ),
    );
  });
  findAll(text, /\b(they|you|we)\s+was\b/gi, (m) => {
    issues.push(
      makeIssue(
        'subject-verb',
        'correctness',
        'Subject–verb agreement',
        `Use "were" with "${m[1].toLowerCase()}".`,
        m.index,
        m.index + m[0].length,
        m[0],
        [`${m[1]} were`],
      ),
    );
  });
  return issues;
}

function thenVsThan(text: string): Issue[] {
  const issues: Issue[] = [];
  findAll(
    text,
    /\b(more|less|better|worse|rather|higher|lower|greater|fewer|larger|smaller|faster|slower|other)\s+(then)\b/gi,
    (m) => {
      const start = m.index + m[0].length - m[2].length;
      issues.push(
        makeIssue(
          'then-than',
          'correctness',
          '"Then" vs. "than"',
          `Use "than" for comparisons after "${m[1].toLowerCase()}".`,
          start,
          start + m[2].length,
          m[2],
          [matchCase(m[2], 'than')],
        ),
      );
    },
  );
  return issues;
}

function doubleSpaces(text: string): Issue[] {
  const issues: Issue[] = [];
  findAll(text, /(\S)( {2,})(\S)/g, (m) => {
    const start = m.index + 1;
    issues.push(
      makeIssue(
        'double-space',
        'correctness',
        'Extra space',
        'There is more than one space between words.',
        start,
        start + m[2].length,
        m[2],
        [' '],
      ),
    );
  });
  return issues;
}

function missingSpaceAfterComma(text: string): Issue[] {
  const issues: Issue[] = [];
  findAll(text, /,([A-Za-z])/g, (m) => {
    // skip numbers like 1,000 (handled by requiring a letter) — nothing else to skip
    issues.push(
      makeIssue(
        'comma-space',
        'correctness',
        'Missing space',
        'Add a space after the comma.',
        m.index,
        m.index + 1,
        ',',
        [', '],
      ),
    );
  });
  return issues;
}

function doublePunctuation(text: string): Issue[] {
  const issues: Issue[] = [];
  findAll(text, /,{2,}|;{2,}/g, (m) => {
    issues.push(
      makeIssue(
        'double-punct',
        'correctness',
        'Repeated punctuation',
        'This punctuation mark is repeated.',
        m.index,
        m.index + m[0].length,
        m[0],
        [m[0][0]],
      ),
    );
  });
  return issues;
}

const ABBREVIATIONS = new Set(['e.g', 'i.e', 'etc', 'vs', 'dr', 'mr', 'mrs', 'ms', 'st', 'jr', 'sr', 'prof', 'inc', 'ltd', 'no', 'approx']);

function sentenceCapitalization(text: string): Issue[] {
  const issues: Issue[] = [];
  findAll(text, /(^|[.!?]["')\]]?\s+)([a-z])/g, (m) => {
    if (m[1]) {
      // Ignore if the "sentence end" is actually an abbreviation like "e.g."
      const before = text.slice(Math.max(0, m.index - 12), m.index + 1);
      const tail = before.match(/([A-Za-z][A-Za-z.]*)\.$/);
      if (tail && ABBREVIATIONS.has(tail[1].toLowerCase().replace(/\.$/, ''))) return;
      // Ignore decimals / version numbers like "3.x"
      if (/\d\.$/.test(before)) return;
    }
    const start = m.index + m[1].length;
    issues.push(
      makeIssue(
        'sentence-case',
        'correctness',
        'Capitalization',
        'Sentences should start with a capital letter.',
        start,
        start + 1,
        m[2],
        [m[2].toUpperCase()],
      ),
    );
  });
  return issues;
}

function lowercaseI(text: string): Issue[] {
  const issues: Issue[] = [];
  findAll(text, /(^|[^A-Za-z0-9.'-])i(?=[^A-Za-z0-9.'-]|$)/g, (m) => {
    const start = m.index + m[1].length;
    issues.push(
      makeIssue(
        'lowercase-i',
        'correctness',
        'Capitalization',
        'The pronoun "I" should always be capitalized.',
        start,
        start + 1,
        'i',
        ['I'],
      ),
    );
  });
  return issues;
}

// ---------------------------------------------------------------------------
// Clarity
// ---------------------------------------------------------------------------

const WORDY_PHRASES: Array<[string, string]> = [
  ['in order to', 'to'],
  ['due to the fact that', 'because'],
  ['owing to the fact that', 'because'],
  ['in spite of the fact that', 'although'],
  ['at this point in time', 'now'],
  ['at the present time', 'now'],
  ['in the event that', 'if'],
  ['for the purpose of', 'for'],
  ['with regard to', 'regarding'],
  ['in regards to', 'regarding'],
  ['as a matter of fact', 'in fact'],
  ['each and every', 'every'],
  ['a large number of', 'many'],
  ['the majority of', 'most of'],
  ['prior to', 'before'],
  ['subsequent to', 'after'],
  ['in close proximity to', 'near'],
  ['on a daily basis', 'daily'],
  ['in the near future', 'soon'],
  ['make a decision', 'decide'],
  ['take into consideration', 'consider'],
  ['in the process of', ''],
  ['it is important to note that', ''],
  ['needless to say', ''],
  ['first and foremost', 'first'],
  ['at all times', 'always'],
  ['in the amount of', 'of'],
  ['has the ability to', 'can'],
  ['is able to', 'can'],
  ['in a timely manner', 'promptly'],
];

function wordyPhrases(text: string): Issue[] {
  const issues: Issue[] = [];
  for (const [phrase, replacement] of WORDY_PHRASES) {
    const pattern = new RegExp(`\\b${phrase.replace(/\s+/g, '\\s+')}\\b`, 'gi');
    findAll(text, pattern, (m) => {
      issues.push(
        makeIssue(
          'wordy-phrase',
          'clarity',
          'Wordy phrase',
          replacement
            ? `"${m[0]}" can be simplified to "${matchCase(m[0], replacement)}".`
            : `"${m[0]}" adds little meaning; consider removing it.`,
          m.index,
          m.index + m[0].length,
          m[0],
          [replacement ? matchCase(m[0], replacement) : ''],
        ),
      );
    });
  }
  return issues;
}

const REDUNDANCIES: Array<[string, string]> = [
  ['absolutely essential', 'essential'],
  ['advance planning', 'planning'],
  ['end result', 'result'],
  ['final outcome', 'outcome'],
  ['past history', 'history'],
  ['free gift', 'gift'],
  ['unexpected surprise', 'surprise'],
  ['close proximity', 'proximity'],
  ['future plans', 'plans'],
  ['join together', 'join'],
  ['revert back', 'revert'],
  ['repeat again', 'repeat'],
  ['true fact', 'fact'],
  ['completely finished', 'finished'],
  ['basic fundamentals', 'fundamentals'],
  ['added bonus', 'bonus'],
  ['collaborate together', 'collaborate'],
  ['exact same', 'same'],
];

function redundancies(text: string): Issue[] {
  const issues: Issue[] = [];
  for (const [phrase, replacement] of REDUNDANCIES) {
    const pattern = new RegExp(`\\b${phrase.replace(/\s+/g, '\\s+')}\\b`, 'gi');
    findAll(text, pattern, (m) => {
      issues.push(
        makeIssue(
          'redundancy',
          'clarity',
          'Redundant phrase',
          `"${m[0]}" is redundant; "${matchCase(m[0], replacement)}" says the same thing.`,
          m.index,
          m.index + m[0].length,
          m[0],
          [matchCase(m[0], replacement)],
        ),
      );
    });
  }
  return issues;
}

const IRREGULAR_PARTICIPLES =
  'written|done|made|given|taken|seen|known|found|held|kept|left|lost|paid|sent|told|thought|bought|brought|built|caught|chosen|drawn|driven|eaten|felt|forgotten|frozen|grown|heard|hidden|hit|hurt|laid|led|meant|met|put|read|said|sold|shown|shut|spent|spoken|stolen|taught|thrown|understood|worn|won|broken|beaten';

function passiveVoice(text: string): Issue[] {
  const issues: Issue[] = [];
  const pattern = new RegExp(
    `\\b(am|is|are|was|were|been|being|be)\\s+(\\w+ed|${IRREGULAR_PARTICIPLES})\\b`,
    'gi',
  );
  findAll(text, pattern, (m) => {
    // "was excited", "is interested" etc. are usually adjectival; skip common ones.
    const adjectival = new Set(['excited', 'interested', 'tired', 'bored', 'worried', 'married', 'scared', 'surprised', 'pleased', 'satisfied', 'confused', 'concerned', 'supposed', 'used', 'located', 'based', 'named', 'called', 'related']);
    if (adjectival.has(m[2].toLowerCase())) return;
    issues.push(
      makeIssue(
        'passive-voice',
        'clarity',
        'Passive voice',
        `"${m[0]}" may be passive voice. Active voice is usually more direct: say who does the action.`,
        m.index,
        m.index + m[0].length,
        m[0],
        [],
      ),
    );
  });
  return issues;
}

const LONG_SENTENCE_WORDS = 30;

function longSentences(text: string): Issue[] {
  const issues: Issue[] = [];
  const sentenceRe = /[^.!?\n]+[.!?]*/g;
  findAll(text, sentenceRe, (m) => {
    const words = m[0].trim().split(/\s+/).filter(Boolean);
    if (words.length > LONG_SENTENCE_WORDS) {
      const start = m.index + (m[0].length - m[0].trimStart().length);
      issues.push(
        makeIssue(
          'long-sentence',
          'clarity',
          'Hard-to-read sentence',
          `This sentence has ${words.length} words. Consider splitting it into shorter sentences.`,
          start,
          m.index + m[0].trimEnd().length,
          m[0].trim(),
          [],
        ),
      );
    }
  });
  return issues;
}

// ---------------------------------------------------------------------------
// Engagement
// ---------------------------------------------------------------------------

const VERY_UPGRADES: Record<string, string> = {
  good: 'excellent', bad: 'terrible', big: 'huge', small: 'tiny',
  happy: 'delighted', sad: 'miserable', tired: 'exhausted', important: 'crucial',
  easy: 'effortless', hard: 'difficult', fast: 'rapid', slow: 'sluggish',
  beautiful: 'gorgeous', angry: 'furious', scared: 'terrified', cold: 'freezing',
  hot: 'scorching', clean: 'spotless', dirty: 'filthy', funny: 'hilarious',
  interesting: 'fascinating', smart: 'brilliant', strong: 'powerful',
  weak: 'feeble', old: 'ancient', quiet: 'silent', loud: 'deafening',
  hungry: 'ravenous', clear: 'obvious', sure: 'certain', likely: 'probable',
};

function weakIntensifiers(text: string): Issue[] {
  const issues: Issue[] = [];
  findAll(text, /\b(very|really|extremely|incredibly)\s+([a-z]+)\b/gi, (m) => {
    const upgrade = VERY_UPGRADES[m[2].toLowerCase()];
    if (upgrade) {
      issues.push(
        makeIssue(
          'weak-intensifier',
          'engagement',
          'Weak intensifier',
          `"${m[0]}" can be replaced with a stronger word.`,
          m.index,
          m.index + m[0].length,
          m[0],
          [matchCase(m[0], upgrade)],
        ),
      );
    }
  });
  return issues;
}

const OVERUSED_WORDS = ['very', 'really', 'actually', 'basically', 'literally', 'stuff', 'things'];

function overusedWords(text: string): Issue[] {
  const issues: Issue[] = [];
  for (const word of OVERUSED_WORDS) {
    findAll(text, new RegExp(`\\b${word}\\b`, 'gi'), (m) => {
      issues.push(
        makeIssue(
          'overused-word',
          'engagement',
          'Overused word',
          `"${m[0]}" is vague or overused. Consider a more specific word, or remove it.`,
          m.index,
          m.index + m[0].length,
          m[0],
          [''],
        ),
      );
    });
  }
  return issues;
}

const CLICHES = [
  'at the end of the day',
  'think outside the box',
  'low-hanging fruit',
  'the ball is in your court',
  'hit the ground running',
  'a win-win situation',
  'par for the course',
  'back to the drawing board',
  'the tip of the iceberg',
  'easier said than done',
];

function cliches(text: string): Issue[] {
  const issues: Issue[] = [];
  for (const phrase of CLICHES) {
    const pattern = new RegExp(`\\b${phrase.replace(/\s+/g, '\\s+')}\\b`, 'gi');
    findAll(text, pattern, (m) => {
      issues.push(
        makeIssue(
          'cliche',
          'engagement',
          'Cliché',
          `"${m[0]}" is a cliché. Fresh wording will hold your reader's attention better.`,
          m.index,
          m.index + m[0].length,
          m[0],
          [],
        ),
      );
    });
  }
  return issues;
}

// ---------------------------------------------------------------------------
// Delivery
// ---------------------------------------------------------------------------

const INFORMALISMS: Array<[string, string]> = [
  ['gonna', 'going to'],
  ['wanna', 'want to'],
  ['gotta', 'have to'],
  ['kinda', 'kind of'],
  ['sorta', 'sort of'],
  ['dunno', "don't know"],
  ['btw', 'by the way'],
  ['asap', 'as soon as possible'],
  ['thx', 'thanks'],
  ['pls', 'please'],
  ['plz', 'please'],
  ['u r', 'you are'],
];

function informalisms(text: string): Issue[] {
  const issues: Issue[] = [];
  for (const [informal, formal] of INFORMALISMS) {
    const pattern = new RegExp(`\\b${informal.replace(/\s+/g, '\\s+')}\\b`, 'gi');
    findAll(text, pattern, (m) => {
      issues.push(
        makeIssue(
          'informal',
          'delivery',
          'Informal language',
          `"${m[0]}" is informal. Consider "${matchCase(m[0], formal)}" in professional writing.`,
          m.index,
          m.index + m[0].length,
          m[0],
          [matchCase(m[0], formal)],
        ),
      );
    });
  }
  return issues;
}

const HEDGES: Array<[string, string]> = [
  ['i think that', ''],
  ['i think', ''],
  ['i believe that', ''],
  ['i believe', ''],
  ['i feel like', ''],
  ['sort of', ''],
  ['kind of', ''],
  ['in my opinion', ''],
  ['it seems like', ''],
  ['perhaps', ''],
];

function hedging(text: string): Issue[] {
  const issues: Issue[] = [];
  const seen = new Set<number>();
  for (const [hedge] of HEDGES) {
    const pattern = new RegExp(`\\b${hedge.replace(/\s+/g, '\\s+')}\\b`, 'gi');
    findAll(text, pattern, (m) => {
      if (seen.has(m.index)) return; // "i think" inside "i think that"
      seen.add(m.index);
      issues.push(
        makeIssue(
          'hedging',
          'delivery',
          'Hedging language',
          `"${m[0]}" may make you sound unsure. Removing it makes the statement more confident.`,
          m.index,
          m.index + m[0].length,
          m[0],
          [''],
        ),
      );
    });
  }
  return issues;
}

function exclamationOveruse(text: string): Issue[] {
  const issues: Issue[] = [];
  findAll(text, /!{2,}/g, (m) => {
    issues.push(
      makeIssue(
        'exclamation',
        'delivery',
        'Multiple exclamation marks',
        'More than one exclamation mark can come across as unprofessional.',
        m.index,
        m.index + m[0].length,
        m[0],
        ['!'],
      ),
    );
  });
  return issues;
}

function allCapsShouting(text: string): Issue[] {
  const issues: Issue[] = [];
  const allowed = new Set(['OK', 'USA', 'UK', 'EU', 'US', 'CEO', 'CTO', 'CFO', 'FAQ', 'PDF', 'URL', 'API', 'HTML', 'CSS', 'ID', 'TV', 'AM', 'PM', 'GPS', 'DIY', 'ASAP', 'RSVP', 'NASA', 'FBI', 'PS', 'AI', 'IT', 'HR', 'PR', 'VP', 'GDP', 'ETA', 'DNA', 'LOL']);
  findAll(text, /\b[A-Z]{3,}\b/g, (m) => {
    if (allowed.has(m[0])) return;
    issues.push(
      makeIssue(
        'all-caps',
        'delivery',
        'All caps',
        `"${m[0]}" in all caps can read as shouting.`,
        m.index,
        m.index + m[0].length,
        m[0],
        [m[0][0] + m[0].slice(1).toLowerCase(), m[0].toLowerCase()],
      ),
    );
  });
  return issues;
}

// ---------------------------------------------------------------------------

export type Rule = (text: string) => Issue[];

export const ALL_RULES: Rule[] = [
  repeatedWords,
  articleAgreement,
  commonErrors,
  missingApostrophes,
  doubleComparative,
  itsConfusion,
  subjectVerbAgreement,
  thenVsThan,
  doubleSpaces,
  missingSpaceAfterComma,
  doublePunctuation,
  sentenceCapitalization,
  lowercaseI,
  wordyPhrases,
  redundancies,
  passiveVoice,
  longSentences,
  weakIntensifiers,
  overusedWords,
  cliches,
  informalisms,
  hedging,
  exclamationOveruse,
  allCapsShouting,
];

export function runRules(text: string): Issue[] {
  const issues: Issue[] = [];
  for (const rule of ALL_RULES) {
    issues.push(...rule(text));
  }
  return issues;
}
