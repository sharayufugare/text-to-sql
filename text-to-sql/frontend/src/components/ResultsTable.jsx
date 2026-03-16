import React, { useState, useMemo } from "react";

const ResultsTable = ({ columns, rows }) => {
  const [sortConfig, setSortConfig] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Sorting Logic
  const sortedRows = useMemo(() => {
    let sortableItems = [...rows];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === "ascending" ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === "ascending" ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [rows, sortConfig]);

  const requestSort = (key) => {
    let direction = "ascending";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  // Pagination Logic
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = sortedRows.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(sortedRows.length / rowsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div className="paginated-table-container">
      <div className="horizontal-scroll-hint">
        ? Swipe to view more columns ?
      </div>

      <div className="table-responsive">
        <table className="results-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th 
                  key={col} 
                  onClick={() => requestSort(col)}
                  className={`sortable ${sortConfig?.key === col ? sortConfig.direction : ""}`}
                >
                  <div className="header-cell">
                    {col}
                    <span className="sort-icon">
                      {sortConfig?.key === col ? (sortConfig.direction === "ascending" ? "?" : "?") : "?"}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentRows.map((row, idx) => (
              <tr key={idx}>
                {columns.map((col) => (
                  <td key={col}>
                    {row[col] !== null ? String(row[col]) : <span className="null-val">NULL</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-controls">
        <div className="row-summary">
Showing {Math.min(indexOfFirstRow + 1, sortedRows.length)} - {Math.min(indexOfLastRow, sortedRows.length)} of {sortedRows.length} rows        </div>

        <div className="pagination-group">
          <div className="rows-per-page">
            <label>Rows:</label>
            <select 
              value={rowsPerPage} 
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              {[10, 25, 50, 100].map(val => (
                <option key={val} value={val}>{val}</option>
              ))}
            </select>
          </div>

          <div className="pagination-buttons">
            <button 
              onClick={() => paginate(currentPage - 1)} 
              disabled={currentPage === 1}
              className="page-btn"
            >
              Prev
            </button>
            <span className="page-info">
              {currentPage} / {totalPages || 1}
            </span>
            <button 
              onClick={() => paginate(currentPage + 1)} 
              disabled={currentPage === totalPages || totalPages === 0}
              className="page-btn"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .paginated-table-container { display: flex; flex-direction: column; width: 100%; }
        .horizontal-scroll-hint { font-size: 11px; color: #94a3b8; text-align: right; margin-bottom: 4px; display: block; }
        .table-responsive { width: 100%; overflow-x: auto; max-height: 500px; border-radius: 8px; border: 1px solid #e2e8f0; }
        .results-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 14px; }
        .results-table thead { position: sticky; top: 0; z-index: 10; background: #f8fafc; }
        .results-table th { padding: 12px 16px; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0; white-space: nowrap; cursor: pointer; user-select: none; }
        .results-table th:hover { background-color: #f1f5f9; }
        .header-cell { display: flex; align-items: center; gap: 8px; }
        .sort-icon { font-size: 12px; color: #cbd5e1; }
        .results-table th.ascending .sort-icon, .results-table th.descending .sort-icon { color: #4f46e5; }
        .results-table td { padding: 12px 16px; border-bottom: 1px solid #f1f5f9; color: #1e293b; white-space: nowrap; }
        .results-table tr:hover td { background-color: #f8fafc; }
        .null-val { color: #cbd5e1; font-style: italic; font-size: 12px; }
        .table-controls { display: flex; justify-content: space-between; align-items: center; padding: 16px 4px; flex-wrap: wrap; gap: 16px; }
        .row-summary { font-size: 13px; color: #64748b; }
        .pagination-group { display: flex; align-items: center; gap: 20px; }
        .rows-per-page { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #64748b; }
        .rows-per-page select { padding: 4px 8px; border-radius: 4px; border: 1px solid #e2e8f0; outline: none; }
        .pagination-buttons { display: flex; align-items: center; gap: 10px; }
        .page-btn { padding: 6px 12px; border: 1px solid #e2e8f0; background: white; border-radius: 6px; font-size: 13px; cursor: pointer; color: #475569; }
        .page-btn:hover:not(:disabled) { border-color: #4f46e5; color: #4f46e5; }
        .page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .page-info { font-size: 13px; color: #1e293b; font-weight: 500; }
      `}</style>
    </div>
  );
};

export default ResultsTable;
