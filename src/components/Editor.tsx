import { useCallback, useMemo, useRef } from 'react';
import type { Issue } from '../engine/types';
import { CATEGORY_META } from '../engine/types';

interface EditorProps {
  text: string;
  issues: Issue[];
  activeIssueId: string | null;
  onChange: (text: string) => void;
  onCaretMove: (offset: number) => void;
}

interface Segment {
  text: string;
  issue?: Issue;
}

function buildSegments(text: string, issues: Issue[]): Segment[] {
  // Issues are sorted and non-overlapping (except long-sentence, which we
  // don't underline — it would swallow the more specific marks inside it).
  const marks = issues.filter((i) => i.ruleId !== 'long-sentence');
  const segments: Segment[] = [];
  let pos = 0;
  for (const issue of marks) {
    if (issue.start < pos || issue.end > text.length) continue;
    if (issue.start > pos) segments.push({ text: text.slice(pos, issue.start) });
    segments.push({ text: text.slice(issue.start, issue.end), issue });
    pos = issue.end;
  }
  if (pos < text.length) segments.push({ text: text.slice(pos) });
  return segments;
}

export function Editor({ text, issues, activeIssueId, onChange, onCaretMove }: EditorProps) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const segments = useMemo(() => buildSegments(text, issues), [text, issues]);

  const syncScroll = useCallback(() => {
    const ta = textareaRef.current;
    const bd = backdropRef.current;
    if (ta && bd) {
      bd.scrollTop = ta.scrollTop;
      bd.scrollLeft = ta.scrollLeft;
    }
  }, []);

  const reportCaret = useCallback(() => {
    const ta = textareaRef.current;
    if (ta && ta.selectionStart === ta.selectionEnd) {
      onCaretMove(ta.selectionStart);
    }
  }, [onCaretMove]);

  return (
    <div className="editor">
      <div className="editor-backdrop" ref={backdropRef} aria-hidden="true">
        {segments.map((seg, i) =>
          seg.issue ? (
            <mark
              key={i}
              className={`issue-mark${seg.issue.id === activeIssueId ? ' active' : ''}`}
              style={{ '--issue-color': CATEGORY_META[seg.issue.category].color } as React.CSSProperties}
            >
              {seg.text}
            </mark>
          ) : (
            <span key={i}>{seg.text}</span>
          ),
        )}
        {/* trailing newline so the backdrop matches textarea height exactly */}
        {'\n'}
      </div>
      <textarea
        ref={textareaRef}
        className="editor-input"
        value={text}
        onChange={(e) => onChange(e.target.value)}
        onScroll={syncScroll}
        onClick={reportCaret}
        onKeyUp={reportCaret}
        placeholder="Start writing, or paste your text here…"
        spellCheck={false}
        autoFocus
      />
    </div>
  );
}
