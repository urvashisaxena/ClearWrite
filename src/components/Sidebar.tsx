import { useEffect, useRef } from 'react';
import type { Category, Issue } from '../engine/types';
import { CATEGORY_META, CATEGORY_ORDER } from '../engine/types';
import { SuggestionCard } from './SuggestionCard';

interface SidebarProps {
  issues: Issue[];
  counts: Record<Category, number>;
  totalIssues: number;
  filter: Category | 'all';
  onFilterChange: (filter: Category | 'all') => void;
  activeIssueId: string | null;
  onSelectIssue: (id: string | null) => void;
  onApply: (issue: Issue, replacement: string) => void;
  onDismiss: (issue: Issue) => void;
  onAddToDictionary: (word: string) => void;
}

export function Sidebar({
  issues,
  counts,
  totalIssues,
  filter,
  onFilterChange,
  activeIssueId,
  onSelectIssue,
  onApply,
  onDismiss,
  onAddToDictionary,
}: SidebarProps) {
  const listRef = useRef<HTMLDivElement>(null);

  // Keep the active card in view when the user clicks an underline in the editor.
  useEffect(() => {
    if (!activeIssueId || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-issue-id="${activeIssueId}"]`);
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeIssueId]);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>Suggestions</h2>
        <span className="issue-total">{totalIssues}</span>
      </div>
      <div className="filter-chips" role="tablist">
        <button
          role="tab"
          aria-selected={filter === 'all'}
          className={`chip${filter === 'all' ? ' selected' : ''}`}
          onClick={() => onFilterChange('all')}
        >
          All
        </button>
        {CATEGORY_ORDER.map((cat) => (
          <button
            key={cat}
            role="tab"
            aria-selected={filter === cat}
            className={`chip${filter === cat ? ' selected' : ''}`}
            onClick={() => onFilterChange(cat)}
            title={CATEGORY_META[cat].description}
          >
            <span className="chip-dot" style={{ background: CATEGORY_META[cat].color }} />
            {CATEGORY_META[cat].label}
            {counts[cat] > 0 && <span className="chip-count">{counts[cat]}</span>}
          </button>
        ))}
      </div>
      <div className="card-list" ref={listRef}>
        {issues.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎉</div>
            <p className="empty-title">Nothing to fix</p>
            <p className="empty-sub">
              {filter === 'all'
                ? 'Your writing looks clear and polished.'
                : `No ${CATEGORY_META[filter as Category].label.toLowerCase()} suggestions.`}
            </p>
          </div>
        ) : (
          issues.map((issue) => (
            <SuggestionCard
              key={issue.id}
              issue={issue}
              active={issue.id === activeIssueId}
              onSelect={() => onSelectIssue(issue.id)}
              onApply={(replacement) => onApply(issue, replacement)}
              onDismiss={() => onDismiss(issue)}
              onAddToDictionary={
                issue.ruleId === 'spelling' ? () => onAddToDictionary(issue.text) : undefined
              }
            />
          ))
        )}
      </div>
    </aside>
  );
}
