import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { checkText, computeScore, countByCategory, issueKey } from './engine/checker';
import { computeStats } from './engine/readability';
import { loadSpeller } from './engine/spelling';
import type { Category, Issue } from './engine/types';
import { Editor } from './components/Editor';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { StatsBar } from './components/StatsBar';
import './App.css';

const SAMPLE_TEXT = `Welcome to ClearWrite!!  Its a free writing assistant that helps you write more better.

Type or paste you're own text here, or fix the the mistakes in this sample. In order to get started, take a look at teh suggestions on the right — i think youll find them very useful. Due to the fact that everything runs in your browser, your words never leave your computer.

The report was written by the team in a timely manner. At the end of the day, we dont want no subscription fees.`;

function loadPersistedSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function persistSet(key: string, value: Set<string>) {
  localStorage.setItem(key, JSON.stringify([...value]));
}

export default function App() {
  const [title, setTitle] = useState(() => localStorage.getItem('clearwrite:title') ?? 'Untitled document');
  const [text, setText] = useState(() => localStorage.getItem('clearwrite:text') ?? SAMPLE_TEXT);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [activeIssueId, setActiveIssueId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Category | 'all'>('all');
  const [spellerReady, setSpellerReady] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(() => loadPersistedSet('clearwrite:dismissed'));
  const [personalWords, setPersonalWords] = useState<Set<string>>(() => loadPersistedSet('clearwrite:dictionary'));

  const textRef = useRef(text);
  textRef.current = text;

  useEffect(() => {
    loadSpeller().then(() => setSpellerReady(true)).catch(() => {
      // Dictionary failed to load — grammar/style rules still work.
    });
  }, []);

  // Re-check (debounced) whenever inputs change.
  useEffect(() => {
    const handle = setTimeout(() => {
      setIssues(checkText(text, { personalWords, dismissed }));
    }, 350);
    return () => clearTimeout(handle);
  }, [text, personalWords, dismissed, spellerReady]);

  useEffect(() => {
    const handle = setTimeout(() => {
      localStorage.setItem('clearwrite:text', text);
      localStorage.setItem('clearwrite:title', title);
    }, 500);
    return () => clearTimeout(handle);
  }, [text, title]);

  const stats = useMemo(() => computeStats(text), [text]);
  const score = useMemo(() => computeScore(issues, stats.words), [issues, stats.words]);
  const counts = useMemo(() => countByCategory(issues), [issues]);

  const visibleIssues = useMemo(
    () => (filter === 'all' ? issues : issues.filter((i) => i.category === filter)),
    [issues, filter],
  );

  const applySuggestion = useCallback((issue: Issue, replacement: string) => {
    const current = textRef.current;
    // Guard against stale offsets: only apply if the flagged text is still there.
    if (current.slice(issue.start, issue.end) !== issue.text) return;
    let next: string;
    if (replacement === '') {
      // Removing a phrase: also collapse the space it leaves behind.
      const after = current.slice(issue.end).replace(/^ +/, issue.start === 0 ? '' : '');
      const before = current.slice(0, issue.start);
      next = (before + after).replace(/ +([.,;:!?])/g, '$1');
    } else {
      next = current.slice(0, issue.start) + replacement + current.slice(issue.end);
    }
    setText(next);
    setIssues((prev) => prev.filter((i) => i.id !== issue.id));
    setActiveIssueId(null);
  }, []);

  const dismissIssue = useCallback((issue: Issue) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(issueKey(issue));
      persistSet('clearwrite:dismissed', next);
      return next;
    });
    setIssues((prev) => prev.filter((i) => i.id !== issue.id));
    setActiveIssueId(null);
  }, []);

  const addToDictionary = useCallback((word: string) => {
    setPersonalWords((prev) => {
      const next = new Set(prev);
      next.add(word.toLowerCase());
      persistSet('clearwrite:dictionary', next);
      return next;
    });
  }, []);

  const handleCaretMove = useCallback(
    (offset: number) => {
      const hit = issues.find((i) => offset >= i.start && offset <= i.end);
      setActiveIssueId(hit ? hit.id : null);
    },
    [issues],
  );

  return (
    <div className="app">
      <Header title={title} onTitleChange={setTitle} score={score} issueCount={issues.length} />
      <div className="app-body">
        <main className="editor-pane">
          <Editor
            text={text}
            issues={issues}
            activeIssueId={activeIssueId}
            onChange={setText}
            onCaretMove={handleCaretMove}
          />
          <StatsBar stats={stats} spellerReady={spellerReady} />
        </main>
        <Sidebar
          issues={visibleIssues}
          counts={counts}
          totalIssues={issues.length}
          filter={filter}
          onFilterChange={setFilter}
          activeIssueId={activeIssueId}
          onSelectIssue={setActiveIssueId}
          onApply={applySuggestion}
          onDismiss={dismissIssue}
          onAddToDictionary={addToDictionary}
        />
      </div>
    </div>
  );
}
