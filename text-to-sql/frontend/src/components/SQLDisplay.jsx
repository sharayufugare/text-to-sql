import React, { useState } from 'react';
//import styles from './SQLDisplay.module.css';

export default function SQLDisplay({ sql }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  if (!sql) return null;

  // Simple keyword highlighter for SQLite
  const highlighted = sql
    .replace(
      /\b(SELECT|FROM|WHERE|JOIN|LEFT|INNER|ON|GROUP BY|ORDER BY|HAVING|LIMIT|DISTINCT|AS|AND|OR|NOT|IN|LIKE|BETWEEN|IS|NULL|COUNT|SUM|AVG|MAX|MIN|COALESCE|CASE|WHEN|THEN|ELSE|END|BY|DESC|ASC)\b/gi,
      '<span class="kw">$1</span>'
    )
    .replace(/('[^']*')/g, '<span class="str">$1</span>')
    .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="num">$1</span>');

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div className={styles.label}>
          <span className={styles.dot} />
          Generated SQL
        </div>
        <button className={styles.copyBtn} onClick={copy}>
          {copied ? <CheckIcon /> : <CopyIcon />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre
        className={styles.code}
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />
    </div>
  );
}

const CopyIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
  </svg>
);

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
