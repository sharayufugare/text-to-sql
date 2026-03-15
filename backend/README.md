# NL2SQL – MySQL Backend Guide
## Step-by-Step Setup for Beginners

This guide explains how to set up and run the **Flask + MySQL backend** that powers the NL2SQL React frontend.

---

## How It All Works (Big Picture)

```
You type a question in React
        │
        ▼
React sends  POST /api/query  { "question": "Show top 5 customers" }
        │
        ▼
Flask backend receives the question
        │
        ├─► Reads your MySQL schema (table names + column names)
        │
        ├─► Sends  question + schema  to an LLM (Mistral / GPT-4 / Claude)
        │
        ├─► LLM returns a SQL query:  SELECT c.name, COUNT(*) ...
        │
        ├─► Flask executes that SQL on your MySQL database
        │
        └─► Returns  { sql, columns, rows, count }  back to React
```

---

## Folder Structure

```
backend_mysql/
├── app.py            ← Flask API (main file)
├── seed_db.py        ← Python script to create DB + insert sample data
├── setup_db.sql      ← Raw SQL schema + sample data
├── requirements.txt  ← Python packages
├── Dockerfile        ← Container config
└── .env.example      ← Copy this to .env and fill in your values
```

---

## Prerequisites

Before starting, install these on your computer:

| Tool | Why | Install |
|---|---|---|
| Python 3.10+ | Runs Flask | https://python.org/downloads |
| MySQL 8.0 | Your database | https://dev.mysql.com/downloads/mysql |
| Node.js 18+ | Runs React frontend | https://nodejs.org |
| Git | Version control | https://git-scm.com |

Check they're installed by opening a terminal and running:
```bash
python --version    # should print Python 3.10 or higher
mysql --version     # should print mysql  Ver 8.0...
node --version      # should print v18... or higher
```

---

## STEP 1 — Get an API Key (for the LLM)

The backend needs an LLM to convert your questions into SQL.
**OpenRouter is recommended** — it's free to start.

1. Go to **https://openrouter.ai**
2. Click **Sign Up** (free)
3. Go to **Dashboard → API Keys → Create Key**
4. Copy the key — it looks like `sk-or-v1-abc123...`

> **Alternatives:**  
> - OpenAI: https://platform.openai.com (needs credit card for GPT-4)  
> - Anthropic Claude: https://console.anthropic.com

---

## STEP 2 — Set Up MySQL

### 2a. Start MySQL

If you just installed MySQL, start the service:

**Mac:**
```bash
brew services start mysql
# or: mysql.server start
```

**Windows:**
Open Services → find "MySQL80" → click Start
(or run: `net start mysql80` in Command Prompt as Administrator)

**Linux:**
```bash
sudo systemctl start mysql
```

### 2b. Create the database and tables

Open a terminal and run:
```bash
mysql -u root -p < backend_mysql/setup_db.sql
```

It will ask for your MySQL root password. After entering it, you should see a table showing row counts for each table — that confirms the data was inserted.

**Alternative (if the above doesn't work):**
```bash
# Open MySQL shell
mysql -u root -p

# Then paste this inside MySQL:
source /full/path/to/backend_mysql/setup_db.sql
```

**Or use the Python seeder:**
```bash
cd backend_mysql
cp .env.example .env
# Fill in DB_PASSWORD in .env first, then:
python seed_db.py
```

### 2c. Verify it worked

```bash
mysql -u root -p nl2sql_db -e "SHOW TABLES;"
```

You should see:
```
+--------------------+
| Tables_in_nl2sql_db|
+--------------------+
| customers          |
| departments        |
| employees          |
| order_items        |
| orders             |
| products           |
+--------------------+
```

---

## STEP 3 — Configure Your .env File

```bash
cd backend_mysql
cp .env.example .env
```

Now open `.env` in any text editor and fill in your values:

```env
# Your MySQL password (the one you set when installing MySQL)
DB_PASSWORD=your_mysql_password_here

# Keep everything else as-is for local development
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_NAME=nl2sql_db

# LLM settings
LLM_PROVIDER=openrouter
OPENROUTER_KEY=sk-or-v1-paste-your-key-here
LLM_MODEL=mistralai/mistral-7b-instruct
```

> **Save the file.** Never share or commit this file — it contains your passwords.

---

## STEP 4 — Install Python Dependencies

```bash
cd backend_mysql

# Create a virtual environment (keeps packages isolated)
python -m venv venv

# Activate it:
# Mac / Linux:
source venv/bin/activate

# Windows (Command Prompt):
venv\Scripts\activate.bat

# Windows (PowerShell):
venv\Scripts\Activate.ps1

# Install all required packages
pip install -r requirements.txt
```

You should see packages installing. When done, run:
```bash
pip list   # should show Flask, pymysql, requests, etc.
```

---

## STEP 5 — Start the Flask Backend

```bash
# Make sure your venv is activated (you'll see (venv) in your terminal prompt)
python app.py
```

If everything is correct, you'll see:
```
═══════════════════════════════════════════════════════
  NL2SQL Flask Backend  (MySQL)
═══════════════════════════════════════════════════════
  LLM Provider : openrouter
  LLM Model    : mistralai/mistral-7b-instruct
  MySQL Host   : localhost:3306
  MySQL DB     : nl2sql_db
═══════════════════════════════════════════════════════
  ✅ MySQL connection: OK

  🚀 Starting server at http://localhost:5000
```

If you see ⚠️ MySQL connection FAILED, check your `.env` DB settings and make sure MySQL is running.

---

## STEP 6 — Test the Backend

Open a **new terminal** (keep Flask running in the first one) and run:

```bash
# Health check
curl http://localhost:5000/api/health

# Expected output:
# {"database":"connected","message":"NL2SQL MySQL backend is running!","status":"ok"}
```

```bash
# Test a query
curl -X POST http://localhost:5000/api/query \
  -H "Content-Type: application/json" \
  -d '{"question": "Show all customers from Mumbai"}'

# Expected output:
# {
#   "sql": "SELECT * FROM customers WHERE city = 'Mumbai'",
#   "columns": ["id", "name", "email", "city", "age", "joined_date"],
#   "rows": [...],
#   "count": 3
# }
```

---

## STEP 7 — Start the React Frontend

In a **new terminal**:

```bash
cd frontend
npm install      # first time only
npm start        # starts React at http://localhost:3000
```

The browser opens automatically. Type a question and press Enter!

---

## API Reference

### `GET /api/health`
Quick check that Flask + MySQL are both running.
```json
{ "status": "ok", "database": "connected", "message": "..." }
```

### `GET /api/schema`
Returns all tables and columns — used by the React sidebar.
```json
{
  "schema": "customers(id INT, name VARCHAR, ...)\nproducts(...)",
  "tables": [
    { "name": "customers", "cols": [{"name": "id", "type": "INT", "key": "PRI"}, ...] }
  ]
}
```

### `POST /api/query`
**Request:**
```json
{ "question": "What is the average salary per department?" }
```

**Success Response:**
```json
{
  "sql":     "SELECT d.name, AVG(e.salary) AS avg_salary FROM employees e JOIN departments d ON e.department_id = d.id GROUP BY d.name",
  "columns": ["name", "avg_salary"],
  "rows":    [{"name": "Engineering", "avg_salary": 86500.0}, ...],
  "count":   5
}
```

**Error Response:**
```json
{ "error": "Only SELECT queries are permitted." }
```

---

## Choosing Your LLM

Edit `.env` to switch providers and models:

| Provider | `.env` setting | Good models |
|---|---|---|
| OpenRouter (free) | `LLM_PROVIDER=openrouter` | `mistralai/mistral-7b-instruct` |
| OpenRouter (paid) | `LLM_PROVIDER=openrouter` | `openai/gpt-4o-mini`, `anthropic/claude-3-haiku` |
| OpenAI | `LLM_PROVIDER=openai` | `gpt-3.5-turbo`, `gpt-4o` |
| Claude | `LLM_PROVIDER=claude` | `claude-3-haiku-20240307` |

After changing `.env`, restart Flask (`Ctrl+C`, then `python app.py`).

---

## Sample Questions to Try

| Question | SQL concept |
|---|---|
| Show all customers from Mumbai | WHERE filter |
| Which products cost more than 500? | Comparison |
| List top 5 orders by total | ORDER BY + LIMIT |
| Average salary per department | GROUP BY + AVG |
| How many orders are pending? | COUNT + WHERE |
| Show employees hired after 2021 | Date filter |
| Which customers placed more than one order? | HAVING + COUNT |
| Show products with less than 25 in stock | Stock alert |

---

## Run with Docker (Alternative)

If you prefer Docker over manual setup:

```bash
# 1. Create .env in the project root
cp backend_mysql/.env.example .env
# Fill in DB_PASSWORD and OPENROUTER_KEY in .env

# 2. Start everything (MySQL + Flask + React)
docker-compose up --build
```

- React frontend: http://localhost:3000
- Flask API: http://localhost:5000
- MySQL: localhost:3306

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `Can't connect to MySQL` | Run `mysql -u root -p` to check MySQL is running |
| `Access denied for user 'root'` | Wrong password in `.env` — check `DB_PASSWORD` |
| `Table 'nl2sql_db.xxx' doesn't exist` | Re-run `setup_db.sql` |
| `LLM API error 401` | Your API key is wrong or expired |
| `Only SELECT queries permitted` | The LLM returned a non-SELECT query; try rephrasing |
| React can't reach backend | Make sure Flask is running on port 5000 |
| `ModuleNotFoundError: flask` | Activate venv: `source venv/bin/activate` |

---

## Security Notes

- Only `SELECT` queries are executed — all write operations are blocked
- A keyword blocklist (`DROP`, `DELETE`, `INSERT`, etc.) provides a second layer of protection
- CORS is configured to allow only `localhost:3000` — update for production
- Store secrets in `.env`, never in source code
- For production: add authentication, rate limiting, and use a read-only DB user
