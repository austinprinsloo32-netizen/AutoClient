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

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "Austinprinsloo32@gmail.com").lower()


def get_db_connection():
    if USING_POSTGRES:
        if psycopg2 is None:
            raise ImportError("psycopg2 is not installed")
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
        columns = conn.execute(f"PRAGMA table_info({table_name})").fetchall()
        exists = any(column["name"].lower() == column_name.lower() for column in columns)

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
                nextFollowUp TEXT
            )
        """, commit=True)

        execute_query("""
            CREATE TABLE IF NOT EXISTS activities (
                id SERIAL PRIMARY KEY,
                userId INTEGER,
                leadId INTEGER,
                action TEXT NOT NULL,
                details TEXT,
                createdAt TEXT
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

        execute_query("""
            CREATE TABLE IF NOT EXISTS activities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId INTEGER,
                leadId INTEGER,
                action TEXT NOT NULL,
                details TEXT,
                createdAt TEXT
            )
        """, commit=True)

    add_column_if_missing("leads", "lastContacted", "TEXT")
    add_column_if_missing("leads", "nextFollowUp", "TEXT")


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


def log_activity(user_id, lead_id, action, details=""):
    if not user_id:
        return

    created_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    try:
        if USING_POSTGRES:
            execute_query("""
                INSERT INTO activities (userId, leadId, action, details, createdAt)
                VALUES (%s, %s, %s, %s, %s)
            """, (user_id, lead_id, action, details, created_at), commit=True)
        else:
            execute_query("""
                INSERT INTO activities (userId, leadId, action, details, createdAt)
                VALUES (?, ?, ?, ?, ?)
            """, (user_id, lead_id, action, details, created_at), commit=True)
    except Exception as e:
        print("Activity log error:", e)


@app.route("/")
def home():
    return send_from_directory("static", "index.html")


@app.route("/api/status")
def status():
    return jsonify({
        "message": "AutoClient V2 backend is running",
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
                RETURNING id, name, email, createdAt
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
                "email": email,
                "createdAt": created_at
            }

        user["isAdmin"] = email == ADMIN_EMAIL

        log_activity(
            user["id"],
            None,
            "Account Created",
            f"{name} joined AutoClient."
        )

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

    log_activity(
        user["id"],
        None,
        "User Login",
        f"{user['name']} logged into AutoClient."
    )

    return jsonify({
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "createdAt": user.get("createdAt", ""),
            "isAdmin": user["email"].lower() == ADMIN_EMAIL
        }
    })


# ================= ACTIVITIES =================

@app.route("/api/activities", methods=["GET"])
def get_activities():
    user_id = request.args.get("userId")

    if not user_id:
        return jsonify({"error": "userId is required"}), 400

    p = placeholder()

    activities = execute_query(
        f"""
        SELECT *
        FROM activities
        WHERE userId = {p}
        ORDER BY id DESC
        LIMIT 20
        """,
        (user_id,),
        fetchall=True
    )

    return jsonify([row_to_dict(activity) for activity in activities])


@app.route("/api/activities/log", methods=["POST"])
def create_activity():
    data = request.get_json()

    user_id = data.get("userId")
    lead_id = data.get("leadId")
    action = data.get("action", "").strip()
    details = data.get("details", "").strip()

    if not user_id:
        return jsonify({"error": "userId is required"}), 400

    if not action:
        return jsonify({"error": "Action is required"}), 400

    log_activity(user_id, lead_id, action, details)

    return jsonify({"message": "Activity logged successfully"}), 201


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

        lead_dict = row_to_dict(lead)

        log_activity(
            data.get("userId"),
            lead_dict["id"],
            "Lead Created",
            f"{lead_dict.get('businessName') or lead_dict.get('businessname')} was added to your CRM."
        )

        return jsonify(lead_dict), 201

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

    log_activity(
        data.get("userId"),
        lead_id,
        "Lead Created",
        f"{data.get('businessName')} was added to your CRM."
    )

    return jsonify({"id": lead_id, **data}), 201


@app.route("/api/leads/<int:lead_id>", methods=["PUT"])
def update_lead(lead_id):
    data = request.get_json()

    old_lead = execute_query(
        f"SELECT * FROM leads WHERE id = {placeholder()}",
        (lead_id,),
        fetchone=True
    )
    old_lead = row_to_dict(old_lead)

    old_status = old_lead.get("status") if old_lead else None
    new_status = data.get("status")

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

        lead_dict = row_to_dict(lead)

        if lead_dict:
            if old_status and new_status and old_status != new_status:
                log_activity(
                    data.get("userId"),
                    lead_id,
                    "Lead Status Changed",
                    f"{lead_dict['businessName']} moved from {old_status} to {new_status}."
                )
            elif data.get("nextFollowUp"):
                log_activity(
                    data.get("userId"),
                    lead_id,
                    "Follow-up Scheduled",
                    f"Next follow-up set for {data.get('nextFollowUp')}."
                )
            else:
                log_activity(
                    data.get("userId"),
                    lead_id,
                    "Lead Updated",
                    f"{lead_dict['businessName']} was updated."
                )

        return jsonify(lead_dict)

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

    if old_status and new_status and old_status != new_status:
        log_activity(
            data.get("userId"),
            lead_id,
            "Lead Status Changed",
            f"{data.get('businessName')} moved from {old_status} to {new_status}."
        )
    elif data.get("nextFollowUp"):
        log_activity(
            data.get("userId"),
            lead_id,
            "Follow-up Scheduled",
            f"Next follow-up set for {data.get('nextFollowUp')}."
        )
    else:
        log_activity(
            data.get("userId"),
            lead_id,
            "Lead Updated",
            f"{data.get('businessName')} was updated."
        )

    return jsonify({"message": "Lead updated"})


@app.route("/api/leads/<int:lead_id>", methods=["DELETE"])
def delete_lead(lead_id):
    p = placeholder()

    lead = execute_query(
        f"SELECT * FROM leads WHERE id = {p}",
        (lead_id,),
        fetchone=True
    )
    lead = row_to_dict(lead)

    if lead:
        log_activity(
            lead.get("userId"),
            lead_id,
            "Lead Deleted",
            f"{lead.get('businessName')} was deleted from your CRM."
        )

    execute_query(
        f"DELETE FROM leads WHERE id = {p}",
        (lead_id,),
        commit=True
    )

    return jsonify({"message": "Lead deleted"})


# ================= OUTREACH =================

@app.route("/api/generate-message", methods=["POST"])
def generate_message():
    data = request.get_json()

    business = data.get("businessName")
    service = data.get("service", "my services")
    notes = data.get("notes", "")
    style = data.get("style", "formal")
    name = data.get("userName", "AutoClient User")
    user_id = data.get("userId")
    lead_id = data.get("leadId")

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

    if user_id:
        log_activity(
            user_id,
            lead_id,
            "AI Outreach Generated",
            f"Outreach message generated for {business}."
        )

    return jsonify({"message": msg})


@app.route("/api/find-leads", methods=["POST"])
def find_leads():
    data = request.get_json()

    industry = data.get("industry", "").strip()
    location = data.get("location", "").strip()

    if not industry or not location:
        return jsonify({"error": "Industry and location are required"}), 400

    user_id = data.get("userId")

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

    if user_id:
        log_activity(
            user_id,
            None,
            "Lead Ideas Generated",
            f"Generated lead ideas for {industry} in {location}."
        )

    return jsonify(leads)


# ================= ADMIN =================

@app.route("/api/admin/stats", methods=["GET"])
def admin_stats():
    user_id = request.args.get("userId")

    if not is_admin_user(user_id):
        return jsonify({"error": "Admin access required"}), 403

    total_users = execute_query("SELECT COUNT(*) AS count FROM users", fetchone=True)
    total_leads = execute_query("SELECT COUNT(*) AS count FROM leads", fetchone=True)
    new_leads = execute_query("SELECT COUNT(*) AS count FROM leads WHERE status = 'New'", fetchone=True)
    interested = execute_query("SELECT COUNT(*) AS count FROM leads WHERE status = 'Interested'", fetchone=True)
    closed = execute_query("SELECT COUNT(*) AS count FROM leads WHERE status = 'Closed'", fetchone=True)

    return jsonify({
        "totalUsers": row_to_dict(total_users)["count"],
        "totalLeads": row_to_dict(total_leads)["count"],
        "newLeads": row_to_dict(new_leads)["count"],
        "interestedLeads": row_to_dict(interested)["count"],
        "closedLeads": row_to_dict(closed)["count"]
    })


@app.route("/api/admin/users", methods=["GET"])
def admin_users():
    user_id = request.args.get("userId")

    if not is_admin_user(user_id):
        return jsonify({"error": "Admin access required"}), 403

    users = execute_query("""
        SELECT id, name, email, createdAt
        FROM users
        ORDER BY id DESC
    """, fetchall=True)

    return jsonify([row_to_dict(user) for user in users])


@app.route("/api/admin/leads", methods=["GET"])
def admin_leads():
    user_id = request.args.get("userId")

    if not is_admin_user(user_id):
        return jsonify({"error": "Admin access required"}), 403

    leads = execute_query("""
        SELECT leads.*, users.name AS ownerName, users.email AS ownerEmail
        FROM leads
        LEFT JOIN users ON leads.userId = users.id
        ORDER BY leads.id DESC
    """, fetchall=True)

    return jsonify([row_to_dict(lead) for lead in leads])


# This must stay LAST so it does not block API routes.
@app.route("/<path:path>")
def serve_static(path):
    return send_from_directory("static", path)


init_db()

if __name__ == "__main__":
    app.run(debug=True)