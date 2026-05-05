from flask import Flask, jsonify, request
from flask_cors import CORS
import sqlite3
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
CORS(app)

DB_NAME = "autoclient.db"


def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn


def column_exists(table_name, column_name):
    conn = get_db_connection()
    columns = conn.execute(f"PRAGMA table_info({table_name})").fetchall()
    conn.close()
    return any(column["name"] == column_name for column in columns)


def init_db():
    conn = get_db_connection()

    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            createdAt TEXT
        )
    """)

    conn.execute("""
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
            FOREIGN KEY (userId) REFERENCES users (id)
        )
    """)

    conn.commit()
    conn.close()

    if not column_exists("leads", "userId"):
        conn = get_db_connection()
        conn.execute("ALTER TABLE leads ADD COLUMN userId INTEGER")
        conn.commit()
        conn.close()


@app.route("/")
def home():
    return jsonify({
        "message": "AutoClient backend is running with users and SQLite",
        "status": "success"
    })


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
        conn = get_db_connection()
        cursor = conn.execute("""
            INSERT INTO users (name, email, password, createdAt)
            VALUES (?, ?, ?, ?)
        """, (name, email, hashed_password, created_at))

        conn.commit()
        user_id = cursor.lastrowid
        conn.close()

        return jsonify({
            "message": "User registered successfully",
            "user": {
                "id": user_id,
                "name": name,
                "email": email
            }
        }), 201

    except sqlite3.IntegrityError:
        return jsonify({"error": "Email already exists"}), 409


@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()

    email = data.get("email", "").strip().lower()
    password = data.get("password", "").strip()

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    conn = get_db_connection()
    user = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    conn.close()

    if user is None:
        return jsonify({"error": "Invalid email or password"}), 401

    if not check_password_hash(user["password"], password):
        return jsonify({"error": "Invalid email or password"}), 401

    return jsonify({
        "message": "Login successful",
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"]
        }
    })


@app.route("/api/leads", methods=["GET"])
def get_leads():
    user_id = request.args.get("userId")

    if not user_id:
        return jsonify({"error": "userId is required"}), 400

    conn = get_db_connection()
    leads = conn.execute(
        "SELECT * FROM leads WHERE userId = ? ORDER BY id DESC",
        (user_id,)
    ).fetchall()
    conn.close()

    return jsonify([dict(lead) for lead in leads])


@app.route("/api/leads", methods=["POST"])
def add_lead():
    data = request.get_json()

    if not data or not data.get("businessName"):
        return jsonify({"error": "Business name is required"}), 400

    if not data.get("userId"):
        return jsonify({"error": "userId is required"}), 400

    created_at = data.get("createdAt") or datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    conn = get_db_connection()
    cursor = conn.execute("""
        INSERT INTO leads (userId, businessName, link, contact, priority, notes, status, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        data.get("userId"),
        data.get("businessName"),
        data.get("link", ""),
        data.get("contact", ""),
        data.get("priority", "Cold"),
        data.get("notes", ""),
        data.get("status", "New"),
        created_at
    ))

    conn.commit()
    lead_id = cursor.lastrowid
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
        "createdAt": created_at
    }), 201


@app.route("/api/leads/<int:lead_id>", methods=["PUT"])
def update_lead(lead_id):
    data = request.get_json()

    conn = get_db_connection()
    lead = conn.execute("SELECT * FROM leads WHERE id = ?", (lead_id,)).fetchone()

    if lead is None:
        conn.close()
        return jsonify({"error": "Lead not found"}), 404

    conn.execute("""
        UPDATE leads
        SET businessName = ?, link = ?, contact = ?, priority = ?, notes = ?, status = ?, createdAt = ?
        WHERE id = ?
    """, (
        data.get("businessName", lead["businessName"]),
        data.get("link", lead["link"]),
        data.get("contact", lead["contact"]),
        data.get("priority", lead["priority"]),
        data.get("notes", lead["notes"]),
        data.get("status", lead["status"]),
        data.get("createdAt", lead["createdAt"]),
        lead_id
    ))

    conn.commit()
    updated_lead = conn.execute("SELECT * FROM leads WHERE id = ?", (lead_id,)).fetchone()
    conn.close()

    return jsonify(dict(updated_lead))


@app.route("/api/leads/<int:lead_id>", methods=["DELETE"])
def delete_lead(lead_id):
    conn = get_db_connection()
    conn.execute("DELETE FROM leads WHERE id = ?", (lead_id,))
    conn.commit()
    conn.close()

    return jsonify({"message": "Lead deleted"})


if __name__ == "__main__":
    init_db()
    app.run(debug=True)