export interface TextStats {
  words: number;
  characters: number;
  sentences: number;
  /** Estimated reading time in seconds (at 230 wpm). */
  readingTimeSec: number;
  /** Estimated speaking time in seconds (at 130 wpm). */
  speakingTimeSec: number;
  /** Flesch Reading Ease, 0–100 (higher = easier). */
  fleschScore: number;
  fleschLabel: string;
}

export function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const stripped = w
    .replace(/(?:[^laeiouy]es|[^laeiouy]e)$/, '')
    .replace(/^y/, '');
  const groups = stripped.match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}

export function fleschLabel(score: number): string {
  if (score >= 80) return 'Very easy to read';
  if (score >= 60) return 'Easy to read';
  if (score >= 50) return 'Fairly difficult';
  if (score >= 30) return 'Difficult';
  return 'Very difficult';
}

export function computeStats(text: string): TextStats {
  const words = text.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g) ?? [];
  const sentences = (text.match(/[.!?]+(?=\s|$)/g) ?? []).length || (words.length > 0 ? 1 : 0);
  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);

  let flesch = 100;
  if (words.length > 0 && sentences > 0) {
    flesch =
      206.835 -
      1.015 * (words.length / sentences) -
      84.6 * (syllables / words.length);
    flesch = Math.max(0, Math.min(100, flesch));
  }

  return {
    words: words.length,
    characters: text.length,
    sentences,
    readingTimeSec: Math.round((words.length / 230) * 60),
    speakingTimeSec: Math.round((words.length / 130) * 60),
    fleschScore: Math.round(flesch),
    fleschLabel: fleschLabel(flesch),
  };
}

export function formatDuration(totalSec: number): string {
  if (totalSec < 60) return `${totalSec} sec`;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return sec ? `${min} min ${sec} sec` : `${min} min`;
}
