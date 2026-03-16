import os
import pymysql
from dotenv import load_dotenv

load_dotenv()

# Read credentials from .env
HOST     = os.getenv("DB_HOST", "localhost")
PORT     = int(os.getenv("DB_PORT", "3306"))
USER     = os.getenv("DB_USER", "root")
PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME  = os.getenv("DB_NAME", "nl2sql_db")


def run():
    # Step 1: Create database if not exists
    conn = pymysql.connect(host=HOST, port=PORT, user=USER, password=PASSWORD)

    with conn.cursor() as cur:
        cur.execute(
            f"CREATE DATABASE IF NOT EXISTS `{DB_NAME}` "
            f"CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
        )

    conn.close()
    print(f"Database `{DB_NAME}` ready.")

    # Step 2: Connect to database
    conn = pymysql.connect(
        host=HOST,
        port=PORT,
        user=USER,
        password=PASSWORD,
        database=DB_NAME
    )

    sql_file = os.path.join(os.path.dirname(__file__), "setup_db.sql")

    with open(sql_file, "r", encoding="utf-8") as f:
        raw = f.read()

    statements = [s.strip() for s in raw.split(";") if s.strip()]

    with conn.cursor() as cur:
        for stmt in statements:
            if stmt.upper().startswith("USE "):
                continue
            if stmt.upper().startswith("CREATE DATABASE"):
                continue
            try:
                cur.execute(stmt)
            except Exception as e:
                print("Skipped:", e)

    conn.commit()
    conn.close()

    print("Tables created and sample data inserted.")
    print("You can now start the Flask server → python app.py")


if __name__ == "__main__":
    run()
