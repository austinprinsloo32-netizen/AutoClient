from flask import Flask, jsonify, request
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

app = Flask(__name__)
CORS(app)

DB_NAME = "autoclient.db"
DATABASE_URL = os.environ.get("DATABASE_URL")
USING_POSTGRES = bool(DATABASE_URL)


def get_db_connection():
    if USING_POSTGRES:
        return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)

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
            WHERE table_name = %s AND column_name = %s
        """, (table_name, column_name), fetchone=True)

        if not existing:
            execute_query(
                f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}",
                commit=True
            )
    else:
        conn = get_db_connection()
        columns = conn.execute(f"PRAGMA table_info({table_name})").fetchall()
        exists = any(column["name"] == column_name for column in columns)

        if not exists:
            conn.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}")
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
                nextFollowUp TEXT,
                FOREIGN KEY (userId) REFERENCES users (id)
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
                nextFollowUp TEXT,
                FOREIGN KEY (userId) REFERENCES users (id)
            )
        """, commit=True)

    add_column_if_missing("leads", "lastContacted", "TEXT")
    add_column_if_missing("leads", "nextFollowUp", "TEXT")


@app.route("/")
def home():
    return jsonify({
        "message": "AutoClient backend is running",
        "database": "PostgreSQL" if USING_POSTGRES else "SQLite",
        "status": "success"
    })


# ================= AUTH =================

@app.route("/api/register", methods=["POST"])
def register():
    data = request.get_json()

    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "").strip()

    if not name or not email or not password:
        return jsonify({"error": "Name, email, and password are required"}), 400

    hashed_password = generate_password_hash(password)
    created_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    try:
        if USING_POSTGRES:
            user = execute_query("""
                INSERT INTO users (name, email, password, createdAt)
                VALUES (%s, %s, %s, %s)
                RETURNING id, name, email
            """, (name, email, hashed_password, created_at), fetchone=True, commit=True)

            user = row_to_dict(user)

        else:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO users (name, email, password, createdAt)
                VALUES (?, ?, ?, ?)
            """, (name, email, hashed_password, created_at))

            conn.commit()
            user_id = cursor.lastrowid
            cursor.close()
            conn.close()

            user = {
                "id": user_id,
                "name": name,
                "email": email
            }

        return jsonify({
            "message": "User registered successfully",
            "user": user
        }), 201

    except Exception as e:
        error_text = str(e).lower()

        if "unique" in error_text or "duplicate" in error_text:
            return jsonify({"error": "Email already exists"}), 409

        print("Register error:", e)
        return jsonify({"error": "Registration failed"}), 500


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

    if user is None or not check_password_hash(user["password"], password):
        return jsonify({"error": "Invalid email or password"}), 401

    return jsonify({
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"]
        }
    })


# ================= LEADS =================

@app.route("/api/leads", methods=["GET"])
def get_leads():
    user_id = request.args.get("userId")

    if not user_id:
        return jsonify({"error": "userId is required"}), 400

    p = placeholder()

    leads = execute_query(
        f"SELECT * FROM leads WHERE userId = {p} ORDER BY id DESC",
        (user_id,),
        fetchall=True
    )

    return jsonify([row_to_dict(lead) for lead in leads])


@app.route("/api/leads", methods=["POST"])
def add_lead():
    data = request.get_json()

    if not data.get("userId"):
        return jsonify({"error": "userId is required"}), 400

    if not data.get("businessName"):
        return jsonify({"error": "Business name is required"}), 400

    created_at = data.get("createdAt") or datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    last_contacted = data.get("lastContacted", "")
    next_follow_up = data.get("nextFollowUp", "")

    if USING_POSTGRES:
        lead = execute_query("""
            INSERT INTO leads (
                userId, businessName, link, contact, priority, notes,
                status, createdAt, lastContacted, nextFollowUp
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """, (
            data.get("userId"),
            data.get("businessName"),
            data.get("link", ""),
            data.get("contact", ""),
            data.get("priority", "Cold"),
            data.get("notes", ""),
            data.get("status", "New"),
            created_at,
            last_contacted,
            next_follow_up
        ), fetchone=True, commit=True)

        return jsonify(row_to_dict(lead)), 201

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO leads (
            userId, businessName, link, contact, priority, notes,
            status, createdAt, lastContacted, nextFollowUp
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        data.get("userId"),
        data.get("businessName"),
        data.get("link", ""),
        data.get("contact", ""),
        data.get("priority", "Cold"),
        data.get("notes", ""),
        data.get("status", "New"),
        created_at,
        last_contacted,
        next_follow_up
    ))

    conn.commit()
    lead_id = cursor.lastrowid
    cursor.close()
    conn.close()

    return jsonify({
        "id": lead_id,
        "userId": data.get("userId"),
        "businessName": data.get("businessName"),
        "link": data.get("link", ""),
        "contact": data.get("contact", ""),
        "priority": data.get("priority", "Cold"),
        "notes": data.get("notes", ""),
        "status": data.get("status", "New"),
        "createdAt": created_at,
        "lastContacted": last_contacted,
        "nextFollowUp": next_follow_up
    }), 201


@app.route("/api/leads/<int:lead_id>", methods=["PUT"])
def update_lead(lead_id):
    data = request.get_json()

    if USING_POSTGRES:
        lead = execute_query("""
            UPDATE leads
            SET businessName=%s, link=%s, contact=%s, priority=%s, notes=%s,
                status=%s, createdAt=%s, lastContacted=%s, nextFollowUp=%s
            WHERE id=%s
            RETURNING *
        """, (
            data.get("businessName"),
            data.get("link"),
            data.get("contact"),
            data.get("priority"),
            data.get("notes"),
            data.get("status"),
            data.get("createdAt"),
            data.get("lastContacted", ""),
            data.get("nextFollowUp", ""),
            lead_id
        ), fetchone=True, commit=True)

        return jsonify(row_to_dict(lead))

    execute_query("""
        UPDATE leads
        SET businessName=?, link=?, contact=?, priority=?, notes=?,
            status=?, createdAt=?, lastContacted=?, nextFollowUp=?
        WHERE id=?
    """, (
        data.get("businessName"),
        data.get("link"),
        data.get("contact"),
        data.get("priority"),
        data.get("notes"),
        data.get("status"),
        data.get("createdAt"),
        data.get("lastContacted", ""),
        data.get("nextFollowUp", ""),
        lead_id
    ), commit=True)

    return jsonify({"message": "Lead updated"})


@app.route("/api/leads/<int:lead_id>", methods=["DELETE"])
def delete_lead(lead_id):
    p = placeholder()

    execute_query(
        f"DELETE FROM leads WHERE id = {p}",
        (lead_id,),
        commit=True
    )

    return jsonify({"message": "Lead deleted"})


# ================= FREE AI MESSAGE =================

@app.route("/api/generate-message", methods=["POST"])
def generate_message():
    data = request.get_json()

    business = data.get("businessName")
    service = data.get("service", "my services")
    notes = data.get("notes", "")
    style = data.get("style", "formal")
    name = data.get("userName", "AutoClient User")

    note_line = (
        f"I noticed that {notes}."
        if notes else
        "I came across your business and saw potential to improve results."
    )

    if style == "casual":
        msg = f"""Hi {business},

{note_line}

I help businesses with {service} and thought this might be useful for you.

Open to a quick chat?

Thanks,
{name}"""

    elif style == "direct":
        msg = f"""Hi {business},

Quick one.

I help businesses with {service}. If you want better results or more clients, I can help.

Interested in a quick discussion?

{name}"""

    elif style == "followup":
        msg = f"""Hi {business},

Just following up.

I still believe I can help your business with {service}.

Let me know if you're open to chatting.

{name}"""

    else:
        msg = f"""Good day {business},

{note_line}

I help businesses with {service}. I believe there may be a strong opportunity to improve performance and results.

Would you be open to a short conversation?

Kind regards,
{name}"""

    return jsonify({"message": msg})


# ================= AUTO LEAD FINDER =================

@app.route("/api/find-leads", methods=["POST"])
def find_leads():
    data = request.get_json()

    industry = data.get("industry", "").strip()
    location = data.get("location", "").strip()

    if not industry or not location:
        return jsonify({"error": "Industry and location are required"}), 400

    lead_templates = [
        f"{industry.title()} in {location}",
        f"Local {industry} company in {location}",
        f"Independent {industry} business in {location}",
        f"Top-rated {industry} near {location}",
        f"Small {industry} business in {location}",
        f"{location} {industry} service provider",
        f"Family-owned {industry} in {location}",
        f"New {industry} business in {location}"
    ]

    leads = []

    for lead in lead_templates:
        google_link = f"https://www.google.com/search?q={lead.replace(' ', '+')}"

        leads.append({
            "businessName": lead,
            "link": google_link,
            "contact": "",
            "priority": "Warm",
            "notes": f"Potential {industry} lead in {location}. Check Google, Facebook, or website before contacting.",
            "status": "New"
        })

    return jsonify(leads)


init_db()

if __name__ == "__main__":
    app.run(debug=True)