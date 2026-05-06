from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import sqlite3
import os
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    psycopg2 = None

app = Flask(__name__, static_folder="static")
CORS(app)

DB_NAME = "autoclient.db"
DATABASE_URL = os.environ.get("DATABASE_URL")
USING_POSTGRES = bool(DATABASE_URL)

ADMIN_EMAIL = os.environ.get(
    "ADMIN_EMAIL",
    "Austinprinsloo32@gmail.com"
).lower()


# ================= DATABASE =================

def get_db_connection():
    if USING_POSTGRES:
        if psycopg2 is None:
            raise ImportError("psycopg2 is not installed")

        return psycopg2.connect(
            DATABASE_URL,
            cursor_factory=RealDictCursor
        )

    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn


def execute_query(query, params=(), fetchone=False, fetchall=False, commit=False):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(query, params)

    result = None

    if fetchone:
        result = cursor.fetchone()

    elif fetchall:
        result = cursor.fetchall()

    if commit:
        conn.commit()

    cursor.close()
    conn.close()

    return result


def row_to_dict(row):
    return dict(row) if row else None


def placeholder():
    return "%s" if USING_POSTGRES else "?"


def add_column_if_missing(table_name, column_name, column_type):

    if USING_POSTGRES:

        existing = execute_query("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = %s
            AND LOWER(column_name) = LOWER(%s)
        """, (table_name, column_name), fetchone=True)

        if not existing:
            execute_query(
                f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}",
                commit=True
            )

    else:

        conn = get_db_connection()

        columns = conn.execute(
            f"PRAGMA table_info({table_name})"
        ).fetchall()

        exists = any(
            column["name"].lower() == column_name.lower()
            for column in columns
        )

        if not exists:
            conn.execute(
                f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}"
            )

            conn.commit()

        conn.close()


def init_db():

    if USING_POSTGRES:

        execute_query("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                createdAt TEXT
            )
        """, commit=True)

        execute_query("""
            CREATE TABLE IF NOT EXISTS leads (
                id SERIAL PRIMARY KEY,
                userId INTEGER,
                businessName TEXT NOT NULL,
                link TEXT,
                contact TEXT,
                priority TEXT DEFAULT 'Cold',
                notes TEXT,
                status TEXT DEFAULT 'New',
                createdAt TEXT,
                lastContacted TEXT,
                nextFollowUp TEXT
            )
        """, commit=True)

    else:

        execute_query("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                createdAt TEXT
            )
        """, commit=True)

        execute_query("""
            CREATE TABLE IF NOT EXISTS leads (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId INTEGER,
                businessName TEXT NOT NULL,
                link TEXT,
                contact TEXT,
                priority TEXT DEFAULT 'Cold',
                notes TEXT,
                status TEXT DEFAULT 'New',
                createdAt TEXT,
                lastContacted TEXT,
                nextFollowUp TEXT
            )
        """, commit=True)

    add_column_if_missing("leads", "lastContacted", "TEXT")
    add_column_if_missing("leads", "nextFollowUp", "TEXT")


# ================= FRONTEND =================

@app.route("/")
def serve_frontend():
    return send_from_directory("static", "index.html")


@app.route("/<path:path>")
def serve_static(path):
    return send_from_directory("static", path)


@app.route("/api/status")
def api_status():
    return jsonify({
        "database": "PostgreSQL" if USING_POSTGRES else "SQLite",
        "message": "AutoClient V2 backend is running",
        "status": "success"
    })


# ================= ADMIN =================

def is_admin_user(user_id):

    if not user_id:
        return False

    p = placeholder()

    user = execute_query(
        f"SELECT email FROM users WHERE id = {p}",
        (user_id,),
        fetchone=True
    )

    user = row_to_dict(user)

    if not user:
        return False

    return user["email"].lower() == ADMIN_EMAIL


# ================= AUTH =================

@app.route("/api/register", methods=["POST"])
def register():

    data = request.get_json()

    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "").strip()

    if not name or not email or not password:
        return jsonify({
            "error": "Name, email and password required"
        }), 400

    hashed_password = generate_password_hash(password)

    created_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    try:

        if USING_POSTGRES:

            user = execute_query("""
                INSERT INTO users (name, email, password, createdAt)
                VALUES (%s, %s, %s, %s)
                RETURNING id, name, email, createdAt
            """, (
                name,
                email,
                hashed_password,
                created_at
            ), fetchone=True, commit=True)

            user = row_to_dict(user)

        else:

            conn = get_db_connection()
            cursor = conn.cursor()

            cursor.execute("""
                INSERT INTO users (name, email, password, createdAt)
                VALUES (?, ?, ?, ?)
            """, (
                name,
                email,
                hashed_password,
                created_at
            ))

            conn.commit()

            user_id = cursor.lastrowid

            cursor.close()
            conn.close()

            user = {
                "id": user_id,
                "name": name,
                "email": email,
                "createdAt": created_at
            }

        user["isAdmin"] = (
            email.lower() == ADMIN_EMAIL
        )

        return jsonify({
            "message": "User registered successfully",
            "user": user
        }), 201

    except Exception as e:

        error_text = str(e).lower()

        if "unique" in error_text or "duplicate" in error_text:
            return jsonify({
                "error": "Email already exists"
            }), 409

        print("Register error:", e)

        return jsonify({
            "error": "Registration failed"
        }), 500


@app.route("/api/login", methods=["POST"])
def login():

    data = request.get_json()

    email = data.get("email", "").strip().lower()
    password = data.get("password", "").strip()

    p = placeholder()

    user = execute_query(
        f"SELECT * FROM users WHERE email = {p}",
        (email,),
        fetchone=True
    )

    user = row_to_dict(user)

    if user is None:
        return jsonify({
            "error": "Invalid email or password"
        }), 401

    if not check_password_hash(user["password"], password):
        return jsonify({
            "error": "Invalid email or password"
        }), 401

    return jsonify({
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "createdAt": user.get("createdAt", ""),
            "isAdmin": (
                user["email"].lower() == ADMIN_EMAIL
            )
        }
    })


# ================= START =================

init_db()

if __name__ == "__main__":
    app.run(debug=True)