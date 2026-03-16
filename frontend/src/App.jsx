import React, { useState } from "react";
import axios from "axios";
import "./App.css";
import CSVUpload from "./components/CSVUpload";
import ResultsTable from "./components/ResultsTable";

function App() {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const askQuestion = async () => {
    if (!question.trim()) return;
    
    setLoading(true);
    setError("");
    setResponse(null);

    try {
      const res = await axios.post("http://localhost:5000/api/query", {
        question: question,
      });
      setResponse(res.data);
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.error || "Error connecting to backend.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      askQuestion();
    }
  };

  return (
    <div className="app-container">
      <div className="main-content">
        {/* Hero Section */}
        <div className="hero-section">
          <div className="hero-badge">? QueryPilot AI</div>
          <h1 className="hero-title">From conversation to conversion in seconds</h1>
          <p className="hero-subtitle">
            Empower everyone on your team to explore data. Accurate SQL generation powered by AI.
          </p>
        </div>

        {/* CSV Upload Section */}
        <section className="app-section">
          <div className="section-header">
            <h3>Step 1: Prepare Your Data</h3>
          </div>
          <CSVUpload />
        </section>

        {/* Query Input Section */}
        <section className="app-section">
          <div className="section-header">
            <h3>Step 2: Ask Anything</h3>
          </div>
          <div className="query-card">
            <div className="input-group">
              <input
                className="query-input"
                type="text"
                placeholder="e.g., Show all products with price > 100"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={loading}
              />
              <button
                className="ask-btn"
                onClick={askQuestion}
                disabled={loading || !question.trim()}
              >
                {loading ? <div className="loader" /> : "Generate SQL"}
              </button>
            </div>
          </div>
        </section>

        {/* Error Alert */}
        {error && (
          <div className="alert alert-error">
            <div className="alert-icon">??</div>
            <div>
              <div className="alert-title">Execution Error</div>
              <div className="alert-description">{error}</div>
            </div>
          </div>
        )}

        {/* Results Section */}
        {response && (
          <section className="app-section results-section">
            <div className="section-header">
              <h3>Step 3: Insights & SQL</h3>
            </div>
            
            <div className="results-grid">
              <div className="sql-card">
                <div className="sql-card-header">
                  <span className="sparkle-icon">?</span>
                  Generated MySQL Query
                </div>
                <pre className="sql-display">
                  {response.sql}
                </pre>
              </div>

              <div className="data-results-card">
                <div className="card-header">
                  <h4>Query Results</h4>
                  <span className="row-count">{response.count} rows found</span>
                </div>
                <ResultsTable 
                  columns={response.columns} 
                  rows={response.rows} 
                />
              </div>
            </div>
          </section>
        )}

        {/* Empty State */}
        {!response && !error && !loading && (
          <div className="empty-state-container">
             <div className="empty-icon">??</div>
             <p>Try: "Get top 5 customers by order volume"</p>
          </div>
        )}

        {/* Footer */}
        <footer className="app-footer">
          <p><strong>No coding required. No limits imposed.</strong></p>
          <div className="footer-line"></div>
          <p className="copyright-text">Copyright © 2026 QueryPilot AI</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
