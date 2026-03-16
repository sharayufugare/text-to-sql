import React, { useState, useEffect } from 'react';
import axios from 'axios';
//import styles from './SchemaViewer.module.css';

export default function SchemaViewer() {
  const [schema, setSchema] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && !schema) {
      setLoading(true);
      axios.get('/api/schema')
        .then(r => setSchema(r.data.schema))
        .catch(() => setSchema('Error loading schema'))
        .finally(() => setLoading(false));
    }
  }, [open, schema]);

  const tables = schema
    ? schema.split('\n').map(line => {
        const match = line.match(/^(\w+)\((.+)\)$/);
        if (!match) return null;
        const [, name, colStr] = match;
        const cols = colStr.split(', ').map(c => {
          const parts = c.split(' ');
          return { name: parts[0], type: parts.slice(1).join(' ') };
        });
        return { name, cols };
      }).filter(Boolean)
    : [];

  return (
    <div className={styles.wrapper}>
      <button className={styles.toggle} onClick={() => setOpen(o => !o)}>
        <DatabaseIcon />
        Schema
        <span className={`${styles.arrow} ${open ? styles.arrowOpen : ''}`}>▾</span>
      </button>

      {open && (
        <div className={styles.panel}>
          {loading && <div className={styles.loading}>Loading schema…</div>}
          {!loading && tables.map(t => (
            <div key={t.name} className={styles.table}>
              <div className={styles.tableName}>
                <TableIcon />
                {t.name}
              </div>
              <ul className={styles.cols}>
                {t.cols.map(c => (
                  <li key={c.name} className={styles.col}>
                    <span className={styles.colName}>{c.name}</span>
                    <span className={styles.colType}>{c.type}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const DatabaseIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
);

const TableIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="9" y1="9" x2="9" y2="21" />
  </svg>
);
