import React from 'react';
//import styles from './QueryHistory.module.css';

export default function QueryHistory({ history, onSelect, onClear }) {
  if (history.length === 0) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <HistoryIcon /> History
        </div>
        <div className={styles.empty}>No queries yet</div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <span className={styles.title}><HistoryIcon /> History</span>
        <button className={styles.clearBtn} onClick={onClear} title="Clear history">✕</button>
      </div>
      <ul className={styles.list}>
        {history.map((item, i) => (
          <li key={i} className={styles.item} onClick={() => onSelect(item)}>
            <div className={styles.question}>{item.question}</div>
            <div className={styles.meta}>
              <span className={`${styles.status} ${item.error ? styles.statusErr : styles.statusOk}`}>
                {item.error ? '✗ error' : `✓ ${item.count} row${item.count !== 1 ? 's' : ''}`}
              </span>
              <span className={styles.time}>{formatTime(item.ts)}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const HistoryIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="12 8 12 12 14 14" />
    <path d="M3.05 11a9 9 0 1 0 .5-4.5" />
    <polyline points="3 3 3 9 9 9" />
  </svg>
);
