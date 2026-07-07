interface HeaderProps {
  title: string;
  onTitleChange: (title: string) => void;
  score: number;
  issueCount: number;
}

function scoreColor(score: number): string {
  if (score >= 85) return '#15c39a';
  if (score >= 60) return '#f59e0b';
  return '#e5484d';
}

export function Header({ title, onTitleChange, score, issueCount }: HeaderProps) {
  return (
    <header className="header">
      <div className="brand">
        <span className="brand-mark">✓</span>
        <span className="brand-name">ClearWrite</span>
        <span className="brand-tag">free forever · no account</span>
      </div>
      <input
        className="doc-title"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        aria-label="Document title"
        spellCheck={false}
      />
      <div className="score-badge" title={`${issueCount} suggestion${issueCount === 1 ? '' : 's'} remaining`}>
        <svg viewBox="0 0 36 36" className="score-ring" aria-hidden="true">
          <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--ring-track)" strokeWidth="3" />
          <circle
            cx="18"
            cy="18"
            r="15.5"
            fill="none"
            stroke={scoreColor(score)}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${(score / 100) * 97.4} 97.4`}
            transform="rotate(-90 18 18)"
          />
        </svg>
        <span className="score-number">{score}</span>
        <span className="score-label">Score</span>
      </div>
    </header>
  );
}
