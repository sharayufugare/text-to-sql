"""
app.py  –  NL-to-SQL Flask Backend  (MySQL edition)
=====================================================
API Endpoints:
  POST /api/query   – accepts natural language, returns SQL + results
  GET  /api/schema  – returns DB schema (used by React SchemaViewer)
  GET  /api/health  – simple health check

Response format (matches React frontend expectations):
  {
    "sql":     "SELECT ...",
    "columns": ["col1", "col2", ...],
    "rows":    [{"col1": val, "col2": val}, ...],
    "count":   N
  }
"""

import os
import re
import json
import requests
import pymysql
import pymysql.cursors
import pandas as pd
from sqlalchemy import create_engine
from werkzeug.utils import secure_filename

from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# ─── Load .env ────────────────────────────────────────────────────────────────
load_dotenv()

app = Flask(__name__)

# ─── CORS: allow the React dev server (port 3000) to call this API ────────────
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://127.0.0.1:3000"
        ]
    }
})

# ══════════════════════════════════════════════════════════════════════════════
#  SECTION 1 – CONFIGURATION (read from .env)
# ══════════════════════════════════════════════════════════════════════════════

DB_CONFIG = {
    "host":     os.getenv("DB_HOST",     "localhost"),
    "port":     int(os.getenv("DB_PORT", "3306")),
    "user":     os.getenv("DB_USER",     "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME",     "nl2sql_db"),
    "charset":  "utf8mb4",
    "cursorclass": pymysql.cursors.DictCursor,  # rows come back as dicts
}

# Choose your LLM provider via LLM_PROVIDER env var: "openrouter" | "openai" | "claude"
LLM_PROVIDER   = os.getenv("LLM_PROVIDER",   "openrouter")
OPENROUTER_KEY = os.getenv("OPENROUTER_KEY",  "")
OPENAI_KEY     = os.getenv("OPENAI_KEY",      "")
ANTHROPIC_KEY  = os.getenv("ANTHROPIC_KEY",   "")

# Model to use (can override in .env)
LLM_MODEL = os.getenv("LLM_MODEL", "mistralai/mistral-7b-instruct")


# ══════════════════════════════════════════════════════════════════════════════
#  SECTION 2 – DATABASE HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def get_db_connection():
    """
    Opens and returns a new MySQL connection.
    Uses DictCursor so every row is a plain Python dict.
    """
    try:
        conn = pymysql.connect(**DB_CONFIG)
        return conn
    except pymysql.err.OperationalError as e:
        raise ConnectionError(
            f"Cannot connect to MySQL: {e}\n"
            f"Check DB_HOST / DB_USER / DB_PASSWORD / DB_NAME in your .env file."
        )


def get_schema() -> str:
    """
    Introspects the MySQL database and returns the schema as a string like:
        customers(id INT, name VARCHAR, city VARCHAR, age INT)
        products(id INT, name VARCHAR, category VARCHAR, price DECIMAL, stock INT)
        ...
    This string is injected into the LLM prompt so it knows the exact schema.
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Get all tables in the current database
            cur.execute("""
                SELECT TABLE_NAME
                FROM information_schema.TABLES
                WHERE TABLE_SCHEMA = %s
                ORDER BY TABLE_NAME;
            """, (DB_CONFIG["database"],))
            tables = [row["TABLE_NAME"] for row in cur.fetchall()]

            schema_parts = []
            for table in tables:
                cur.execute("""
                    SELECT COLUMN_NAME, DATA_TYPE
                    FROM information_schema.COLUMNS
                    WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s
                    ORDER BY ORDINAL_POSITION;
                """, (DB_CONFIG["database"], table))
                cols = cur.fetchall()
                col_defs = ", ".join(
                    f"{col['COLUMN_NAME']} {col['DATA_TYPE'].upper()}"
                    for col in cols
                )
                schema_parts.append(f"{table}({col_defs})")

        return "\n".join(schema_parts)
    finally:
        conn.close()


def get_schema_detailed() -> list:
    """
    Returns a richer schema structure for the /api/schema endpoint,
    used by the React SchemaViewer sidebar.
    Returns: [{ "name": "table", "cols": [{"name": "col", "type": "INT"}, ...] }]
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT TABLE_NAME
                FROM information_schema.TABLES
                WHERE TABLE_SCHEMA = %s
                ORDER BY TABLE_NAME;
            """, (DB_CONFIG["database"],))
            tables = [row["TABLE_NAME"] for row in cur.fetchall()]

            result = []
            for table in tables:
                cur.execute("""
                    SELECT COLUMN_NAME, DATA_TYPE, COLUMN_KEY, IS_NULLABLE
                    FROM information_schema.COLUMNS
                    WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s
                    ORDER BY ORDINAL_POSITION;
                """, (DB_CONFIG["database"], table))
                cols = [
                    {
                        "name": c["COLUMN_NAME"],
                        "type": c["DATA_TYPE"].upper(),
                        "key":  c["COLUMN_KEY"],
                    }
                    for c in cur.fetchall()
                ]
                result.append({"name": table, "cols": cols})

        return result
    finally:
        conn.close()


def execute_sql(sql: str):
    """
    Executes a validated SELECT query on MySQL.
    Returns: (columns: list[str], rows: list[dict])
    Raises ValueError for blocked/non-SELECT queries.
    """
    # ── 1. Strip and basic validation ────────────────────────────────────────
    clean = sql.strip().lstrip(";").strip()

    if not clean.upper().startswith("SELECT"):
        raise ValueError("Only SELECT queries are permitted.")

    # ── 2. Blocklist dangerous keywords ──────────────────────────────────────
    BLOCKED = [
        "DROP", "DELETE", "INSERT", "UPDATE", "ALTER",
        "CREATE", "TRUNCATE", "EXEC", "CALL", "GRANT",
        "REVOKE", "LOAD", "OUTFILE", "DUMPFILE",
        "--", "/*", "*/",
    ]
    upper = clean.upper()
    for kw in BLOCKED:
        # Use word-boundary check to avoid false positives inside identifiers
        if re.search(r'\b' + re.escape(kw) + r'\b', upper):
            raise ValueError(f"Blocked keyword in query: {kw}")

    # ── 3. Run the query ─────────────────────────────────────────────────────
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(clean)
            rows = cur.fetchall()          # list of dicts (DictCursor)
            columns = [d[0] for d in cur.description] if cur.description else []

        # Sanitize: convert non-JSON-serializable types (Decimal, date, etc.)
        serializable_rows = []
        for row in rows:
            clean_row = {}
            for k, v in row.items():
                if hasattr(v, "__float__"):          # Decimal → float
                    clean_row[k] = float(v)
                elif hasattr(v, "isoformat"):         # date / datetime → str
                    clean_row[k] = v.isoformat()
                else:
                    clean_row[k] = v
            serializable_rows.append(clean_row)

        return columns, serializable_rows
    finally:
        conn.close()


# ══════════════════════════════════════════════════════════════════════════════
#  SECTION 3 – LLM INTEGRATION
# ══════════════════════════════════════════════════════════════════════════════
def build_prompt(question: str, schema: str) -> str:
    """
    Builds the prompt sent to the LLM.
    The model should return ONLY a SQL SELECT query.
    """

    return f"""
You are an expert MySQL SQL generator.

Convert the user question into a SQL SELECT query.

DATABASE SCHEMA:
{schema}

RULES:
1. Output ONLY a single SQL SELECT query.
2. Do NOT include explanations, comments, or markdown.
3. Use valid MySQL 8 syntax.
4. Do NOT generate DROP, DELETE, INSERT, UPDATE, ALTER, or CREATE statements.
5. If the user mentions a table that does NOT exist in the schema, STILL generate SQL using that table name exactly.
6. Do NOT replace unknown table names with existing ones.
7. Use SELECT * when the user asks for all details.
8. If the user asks "how many", use COUNT(*).

USER QUESTION:
{question}

SQL QUERY:
"""

def call_openrouter(prompt: str) -> str:
    """Call OpenRouter API (supports Mistral, GPT-4, Claude, Gemini, etc.)"""
    response = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {OPENROUTER_KEY}",
            "Content-Type":  "application/json",
            "HTTP-Referer":  "http://localhost:3000",
        },
        json={
            "model": LLM_MODEL,   # e.g. "mistralai/mistral-7b-instruct"
            "messages": [
                {
                    "role": "system",
                    "content": "You are a MySQL SQL expert. Output only valid MySQL SELECT queries. No explanations. No markdown. No code blocks."
                },
                {"role": "user", "content": prompt}
            ],
            "max_tokens":  400,
            "temperature": 0.1,   # low = deterministic SQL
        },
        timeout=30,
    )
    if response.status_code != 200:
        raise Exception(f"OpenRouter error {response.status_code}: {response.text[:300]}")
    
    data = response.json()
    if "choices" not in data:
        raise Exception(f"OpenRouter response missing 'choices': {json.dumps(data)[:300]}")
        
    return data["choices"][0]["message"]["content"].strip()


def call_openai(prompt: str) -> str:
    """Call OpenAI API directly (GPT-3.5 / GPT-4)."""
    response = requests.post(
        "https://api.openai.com/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {OPENAI_KEY}",
            "Content-Type":  "application/json",
        },
        json={
            "model": LLM_MODEL or "gpt-3.5-turbo",
            "messages": [
                {
                    "role": "system",
                    "content": "You are a MySQL SQL expert. Output only valid MySQL SELECT queries. No explanations. No markdown."
                },
                {"role": "user", "content": prompt}
            ],
            "max_tokens":  400,
            "temperature": 0.1,
        },
        timeout=30,
    )
    if response.status_code != 200:
        raise Exception(f"OpenAI error {response.status_code}: {response.text[:300]}")
    return response.json()["choices"][0]["message"]["content"].strip()


def call_claude(prompt: str) -> str:
    """Call Anthropic Claude API directly."""
    response = requests.post(
        "https://api.anthropic.com/v1/messages",
        headers={
            "x-api-key":         ANTHROPIC_KEY,
            "anthropic-version": "2023-06-01",
            "Content-Type":      "application/json",
        },
        json={
            "model":      LLM_MODEL or "claude-3-haiku-20240307",
            "max_tokens": 400,
            "system":     "You are a MySQL SQL expert. Output only valid MySQL SELECT queries. No explanations. No markdown. No code blocks.",
            "messages":   [{"role": "user", "content": prompt}],
        },
        timeout=30,
    )
    if response.status_code != 200:
        raise Exception(f"Claude error {response.status_code}: {response.text[:300]}")
    return response.json()["content"][0]["text"].strip()


def get_sql_from_llm(question: str, schema: str) -> str:
    """
    Orchestrates the LLM call based on LLM_PROVIDER setting.
    Returns a clean SQL string ready to execute.
    """
    prompt = build_prompt(question, schema)

    # Route to the correct provider
    if LLM_PROVIDER == "openai":
        raw = call_openai(prompt)
    elif LLM_PROVIDER == "claude":
        raw = call_claude(prompt)
    else:
        raw = call_openrouter(prompt)   # default

    # ── Strip markdown code fences if the LLM included them ──────────────────
    # Remove <think> blocks if present
    raw = re.sub(r"<think>.*?</think>", "", raw, flags=re.DOTALL)
    # Remove markdown code fences
    raw = re.sub(r"```sql\s*", "", raw, flags=re.IGNORECASE)
    raw = re.sub(r"```\s*",    "", raw)
    
    # If the response contains conversational text, try to extract just the SQL
    match = re.search(r"(SELECT\s.*)", raw, flags=re.IGNORECASE | re.DOTALL)
    if match:
        raw = match.group(1)

    raw = raw.strip().rstrip(";")      # remove trailing semicolons

    return raw


# ══════════════════════════════════════════════════════════════════════════════
#  SECTION 4 – API ROUTES
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/api/health", methods=["GET"])
def health():
    """
    Health check — lets the React frontend status dot go green.
    Also checks DB connectivity.
    """
    try:
        conn = get_db_connection()
        conn.close()
        db_ok = True
    except Exception:
        db_ok = False

    return jsonify({
        "status":   "ok" if db_ok else "degraded",
        "database": "connected" if db_ok else "unreachable",
        "message":  "NL2SQL MySQL backend is running!"
    }), 200 if db_ok else 503


@app.route("/api/schema", methods=["GET"])
def schema_endpoint():
    """
    Returns the full DB schema for the React SchemaViewer sidebar.
    Response format:
      { "schema": "table1(...)\ntable2(...)", "tables": [{name, cols}] }
    """
    try:
        schema_str    = get_schema()
        schema_tables = get_schema_detailed()
        return jsonify({
            "schema": schema_str,
            "tables": schema_tables,
        })
    except ConnectionError as e:
        return jsonify({"error": str(e)}), 503
    except Exception as e:
        return jsonify({"error": f"Schema error: {str(e)}"}), 500


@app.route("/api/query", methods=["POST"])
def query_endpoint():
    """
    Main endpoint: natural language → SQL → results.

    Request  body (JSON):
      { "question": "Show me the top 5 customers by total orders" }

    Response (JSON) — matches what the React frontend expects:
      {
        "sql":     "SELECT ...",
        "columns": ["name", "order_count"],
        "rows":    [{"name": "Alice", "order_count": 5}, ...],
        "count":   5
      }
    """
    # ── Parse and validate request ────────────────────────────────────────────
    body = request.get_json(silent=True)
    if not body:
        return jsonify({"error": "Request body must be JSON"}), 400

    question = body.get("question", "").strip()
    if not question:
        return jsonify({"error": "Missing or empty 'question' field"}), 400
    if len(question) > 600:
        return jsonify({"error": "Question too long (max 600 characters)"}), 400

    try:
        # Step 1 – Read the live schema from MySQL
        schema = get_schema()

        # Step 2 – Ask the LLM to generate SQL
        generated_sql = get_sql_from_llm(question, schema)

        # Step 3 – Execute the SQL safely
        columns, rows = execute_sql(generated_sql)

        # Step 4 – Return the response
        return jsonify({
            "sql":     generated_sql,
            "columns": columns,
            "rows":    rows,
            "count":   len(rows),
        })

    except ConnectionError as e:
        return jsonify({"error": f"Database connection failed: {str(e)}"}), 503

    except ValueError as e:
        # Our own security / validation error
        return jsonify({"error": f"Query blocked: {str(e)}"}), 400

    except pymysql.err.ProgrammingError as e:
        return jsonify({
        "sql": generated_sql,
        "columns": [],
        "rows": [],
        "count": 0,
        "note": "SQL generated but execution failed because the table may not exist."
    })

    except pymysql.err.OperationalError as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500

    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500


# ══════════════════════════════════════════════════════════════════════════════
#  SECTION 4 – CSV UPLOAD
# ══════════════════════════════════════════════════════════════════════════════

def get_sqlalchemy_engine():
    """Returns a SQLAlchemy engine for pandas to_sql()."""
    user = DB_CONFIG["user"]
    password = DB_CONFIG["password"]
    host = DB_CONFIG["host"]
    port = DB_CONFIG["port"]
    database = DB_CONFIG["database"]
    return create_engine(f"mysql+pymysql://{user}:{password}@{host}:{port}/{database}")


@app.route("/api/upload_csv", methods=["POST"])
def upload_csv():
    """
    Accepts a CSV file, creates a MySQL table with the same name,
    and inserts the data.
    """
    if "file" not in request.files:
        return jsonify({"error": "No file part in the request"}), 400
    
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400
    
    if not file.filename.endswith(".csv"):
        return jsonify({"error": "Only CSV files are allowed"}), 400
    
    try:
        # 1. Secure the filename and get table name (filename without .csv)
        filename = secure_filename(file.filename)
        table_name = os.path.splitext(filename)[0].lower()
        
        # 2. Read CSV into Pandas
        df = pd.read_csv(file)
        
        # 3. Use SQLAlchemy to write to MySQL
        engine = get_sqlalchemy_engine()
        df.to_sql(name=table_name, con=engine, if_exists="replace", index=False)
        
        return jsonify({
            "message": f"Successfully uploaded",
            "table_name": table_name,
            "rows": len(df),
            "columns": list(df.columns)
        })
        
    except Exception as e:
        print(f"Error uploading CSV: {e}")
        return jsonify({"error": f"Failed to upload CSV: {str(e)}"}), 500


# ══════════════════════════════════════════════════════════════════════════════
#  SECTION 5 – ENTRY POINT
# ══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 55)
    print("  NL2SQL Flask Backend  (MySQL)")
    print("=" * 55)
    print(f"  LLM Provider : {LLM_PROVIDER}")
    print(f"  LLM Model    : {LLM_MODEL}")
    print(f"  MySQL Host   : {DB_CONFIG['host']}:{DB_CONFIG['port']}")
    print(f"  MySQL DB     : {DB_CONFIG['database']}")
    print("=" * 55)

    # Quick connectivity check at startup
    try:
        conn = get_db_connection()
        conn.close()
        print("  ✅ MySQL connection: OK")
    except Exception as e:
        print(f"  ⚠️  MySQL connection FAILED: {e}")
        print("     → Run setup_db.sql first, then check .env settings")

    print("\n  🚀 Starting server at http://localhost:5000\n")
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
# trigger reload

# trigger reload 2
