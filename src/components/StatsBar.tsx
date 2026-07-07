import type { TextStats } from '../engine/readability';
import { formatDuration } from '../engine/readability';

interface StatsBarProps {
  stats: TextStats;
  spellerReady: boolean;
}

export function StatsBar({ stats, spellerReady }: StatsBarProps) {
  return (
    <footer className="stats-bar">
      <span>{stats.words} words</span>
      <span>{stats.characters} characters</span>
      <span>{stats.sentences} sentences</span>
      <span>{formatDuration(stats.readingTimeSec)} reading time</span>
      <span title="Flesch Reading Ease">
        Readability: {stats.fleschScore} · {stats.fleschLabel}
      </span>
      {!spellerReady && <span className="loading-dict">Loading dictionary…</span>}
    </footer>
  );
}
