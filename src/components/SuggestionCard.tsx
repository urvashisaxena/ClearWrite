import type { Issue } from '../engine/types';
import { CATEGORY_META } from '../engine/types';

interface SuggestionCardProps {
  issue: Issue;
  active: boolean;
  onSelect: () => void;
  onApply: (replacement: string) => void;
  onDismiss: () => void;
  onAddToDictionary?: () => void;
}

function excerpt(text: string, max = 60): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export function SuggestionCard({
  issue,
  active,
  onSelect,
  onApply,
  onDismiss,
  onAddToDictionary,
}: SuggestionCardProps) {
  const meta = CATEGORY_META[issue.category];
  const hasReplacements = issue.suggestions.some((s) => s !== '');
  const canRemove = issue.suggestions.includes('');

  return (
    <div
      className={`card${active ? ' active' : ''}`}
      data-issue-id={issue.id}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
    >
      <div className="card-top">
        <span className="card-dot" style={{ background: meta.color }} />
        <span className="card-category">{meta.label}</span>
        <span className="card-title">· {issue.title}</span>
      </div>
      <div className="card-body">
        <span className="card-flagged">{excerpt(issue.text)}</span>
        {hasReplacements && (
          <div className="card-suggestions">
            {issue.suggestions
              .filter((s) => s !== '')
              .map((s) => (
                <button
                  key={s}
                  className="suggestion-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onApply(s);
                  }}
                >
                  {s}
                </button>
              ))}
          </div>
        )}
      </div>
      <p className="card-message">{issue.message}</p>
      <div className="card-actions">
        {canRemove && (
          <button
            className="link-btn"
            onClick={(e) => {
              e.stopPropagation();
              onApply('');
            }}
          >
            Remove it
          </button>
        )}
        {onAddToDictionary && (
          <button
            className="link-btn"
            onClick={(e) => {
              e.stopPropagation();
              onAddToDictionary();
            }}
          >
            Add to dictionary
          </button>
        )}
        <button
          className="link-btn dismiss"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
