import React, { useState, useRef, useEffect } from 'react';
//import styles from './QueryInput.module.css';

const SUGGESTIONS = [
  "Show all customers from Mumbai",
  "Which products are in the Electronics category?",
  "List the top 5 orders by total amount",
  "Show employees in Engineering with salary above 85000",
  "How many orders are pending?",
  "What is the average salary per department?",
];

export default function QueryInput({ onSubmit, loading }) {
  const [value, setValue] = useState('');
  const [suggIdx, setSuggIdx] = useState(null);
  const textareaRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }, [value]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    const q = value.trim();
    if (!q || loading) return;
    onSubmit(q);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const pickSuggestion = (s) => {
    setValue(s);
    setSuggIdx(null);
    textareaRef.current?.focus();
  };

  return (
    <div className={styles.wrapper}>
      {/* Suggestions */}
      <div className={styles.suggestions}>
        <span className={styles.suggestLabel}>Try asking →</span>
        {SUGGESTIONS.map((s, i) => (
          <button
            key={i}
            className={`${styles.chip} ${suggIdx === i ? styles.chipActive : ''}`}
            onClick={() => pickSuggestion(s)}
            onMouseEnter={() => setSuggIdx(i)}
            onMouseLeave={() => setSuggIdx(null)}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Input area */}
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.inputBox}>
          <span className={styles.prompt}>{'>'}</span>
          <textarea
            ref={textareaRef}
            className={styles.textarea}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your data…"
            rows={1}
            disabled={loading}
          />
          <button
            type="submit"
            className={styles.runBtn}
            disabled={!value.trim() || loading}
          >
            {loading ? <span className={styles.spinner} /> : <RunIcon />}
            {loading ? 'Running…' : 'Run'}
          </button>
        </div>
        <p className={styles.hint}>↵ Enter to run · Shift+↵ for new line</p>
      </form>
    </div>
  );
}

const RunIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5,3 19,12 5,21" />
  </svg>
);
