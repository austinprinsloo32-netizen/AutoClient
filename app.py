import re
import os
import secrets
import sqlite3
from datetime import datetime

import hashlib
import hmac

from redis import event
import requests
import stripe
from flask import Flask, jsonify, request, send_from_directory, session
from flask_cors import CORS
from werkzeug.security import check_password_hash, generate_password_hash
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from dotenv import load_dotenv

load_dotenv()

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    psycopg2 = None


app = Flask(__name__, static_folder="static")
limiter = Limiter(
    key_func=get_remote_address,
    app=app,
    default_limits=[],
    storage_uri=os.environ.get("RATELIMIT_STORAGE_URI", "memory://")
)

app.config["SECRET_KEY"] = (
    os.environ.get("SECRET_KEY")
    or secrets.token_hex(32)
)

app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"

app.config["SESSION_COOKIE_SECURE"] = (
    os.environ.get("SESSION_COOKIE_SECURE", "false").lower() == "true"
)

CORS(
    app,
    resources={
        r"/api/*": {
            "origins": [
                "http://127.0.0.1:5000",
                "http://localhost:5000",
                "https://autoclient-v2.onrender.com"
            ]
        }
    },
    supports_credentials=True
)

@app.after_request
def add_security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' https://cdn.jsdelivr.net; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data:; "
        "connect-src 'self' https://cdn.jsdelivr.net; "
        "object-src 'none'; "
        "base-uri 'self'; "
        "frame-ancestors 'none'; "
        "form-action 'self'"
    )
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = (
        "camera=(), microphone=(), geolocation=()"
    )

    if request.is_secure:
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains"
        )

    return response


DB_NAME = "autoclient.db"
DATABASE_URL = os.environ.get("DATABASE_URL")
USING_POSTGRES = bool(DATABASE_URL)

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "Austinprinsloo32@gmail.com").lower()

RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
RESEND_FROM_EMAIL = os.environ.get("RESEND_FROM_EMAIL", "onboarding@resend.dev")

STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY")
STRIPE_PRO_PRICE_ID = os.environ.get("STRIPE_PRO_PRICE_ID")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET")

PAYSTACK_SECRET_KEY = os.environ.get("PAYSTACK_SECRET_KEY")
PAYSTACK_PRO_PLAN_CODE = os.environ.get("PAYSTACK_PRO_PLAN_CODE")

FRONTEND_URL = os.environ.get(
    "FRONTEND_URL",
    "https://autoclient-v2.onrender.com"
).rstrip("/")

if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY


PLAN_LIMITS = {
    "free": {
        "name": "Free",
        "max_leads": 10,
        "ai_outreach": False,
        "kanban": False,
        "analytics": False,
        "email_integration": False,
        "lead_finder": True,
        "csv_export": False
    },
    "pro": {
        "name": "Pro",
        "max_leads": 100,
        "ai_outreach": True,
        "kanban": True,
        "analytics": True,
        "email_integration": True,
        "lead_finder": True,
        "csv_export": True
    },
    "agency": {
        "name": "Agency",
        "max_leads": 1000,
        "ai_outreach": True,
        "kanban": True,
        "analytics": True,
        "email_integration": True,
        "lead_finder": True,
        "csv_export": True
    }
}


def get_db_connection():
    if USING_POSTGRES:
        if psycopg2 is None:
            raise ImportError("psycopg2-binary is not installed")

        return psycopg2.connect(
            DATABASE_URL,
            cursor_factory=RealDictCursor
        )

    conn = sqlite3.connect(
        DB_NAME,
        timeout=30
    )

    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA busy_timeout = 30000")
    conn.execute("PRAGMA journal_mode = WAL")

    return conn


def execute_query(
    query,
    params=(),
    fetchone=False,
    fetchall=False,
    commit=False
):
    conn = get_db_connection()
    cursor = None

    try:
        cursor = conn.cursor()
        cursor.execute(query, params)

        result = None

        if fetchone:
            result = cursor.fetchone()
        elif fetchall:
            result = cursor.fetchall()

        if commit:
            conn.commit()

        return result

    except Exception:
        if commit:
            conn.rollback()
        raise

    finally:
        if cursor:
            cursor.close()

        conn.close()


def row_to_dict(row):
    if not row:
        return None

    data = dict(row)

    normalized = {}

    key_map = {
        "userid": "userId",
        "businessname": "businessName",
        "createdat": "createdAt",
        "lastcontacted": "lastContacted",
        "nextfollowup": "nextFollowUp",
        "aisummary": "aiSummary",
        "aiopportunity": "aiOpportunity",
        "airecommendedapproach": "aiRecommendedApproach",
        "aibestchannel": "aiBestChannel",
        "ainextaction": "aiNextAction",
        "aiconfidence": "aiConfidence",
        "aiscore": "aiScore",
        "ailastanalyzed": "aiLastAnalyzed"
    }

    for key, value in data.items():
        normalized_key = key_map.get(
            key.lower(),
            key
        )

        normalized[normalized_key] = value

    return normalized


def placeholder():
    return "%s" if USING_POSTGRES else "?"


def normalize_plan(plan):
    plan = (plan or "free").lower().strip()
    return plan if plan in PLAN_LIMITS else "free"


def get_field(row, key, fallback=""):
    if not row:
        return fallback

    lower_key = key.lower()

    snake_key = ""
    for char in key:
        if char.isupper():
            snake_key += "_" + char.lower()
        else:
            snake_key += char

    return (
        row.get(key)
        or row.get(lower_key)
        or row.get(snake_key)
        or fallback
    )


def add_column_if_missing(table_name, column_name, column_type):
    if USING_POSTGRES:
        existing = execute_query("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = %s
            AND LOWER(column_name) = LOWER(%s)
        """, (
            table_name,
            column_name
        ), fetchone=True)

        if not existing:
            execute_query(
                f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}",
                commit=True
            )

    else:
        conn = get_db_connection()

        try:
            columns = conn.execute(
                f"PRAGMA table_info({table_name})"
            ).fetchall()

            exists = any(
                column["name"].lower() == column_name.lower()
                for column in columns
            )

            if not exists:
                conn.execute(
                    f"ALTER TABLE {table_name} "
                    f"ADD COLUMN {column_name} {column_type}"
                )
                conn.commit()

        finally:
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

    add_column_if_missing("leads", "aiSummary", "TEXT")
    add_column_if_missing("leads", "aiOpportunity", "TEXT")
    add_column_if_missing("leads", "aiRecommendedApproach", "TEXT")
    add_column_if_missing("leads", "aiBestChannel", "TEXT")
    add_column_if_missing("leads", "aiNextAction", "TEXT")
    add_column_if_missing("leads", "aiConfidence", "TEXT")
    add_column_if_missing("leads", "aiScore", "INTEGER")
    add_column_if_missing("leads", "aiLastAnalyzed", "TEXT")

    add_column_if_missing("users", "plan", "TEXT DEFAULT 'free'")
    add_column_if_missing("users", "stripe_customer_id", "TEXT")
    add_column_if_missing("users", "stripe_subscription_id", "TEXT")
    add_column_if_missing("users", "paystack_customer_code", "TEXT")
    add_column_if_missing("users", "paystack_subscription_code", "TEXT")
    add_column_if_missing("users", "subscription_status", "TEXT DEFAULT 'inactive'")
    add_column_if_missing("users", "plan_updated_at", "TEXT")

    


def get_user_by_id(user_id):
    if not user_id:
        return None

    p = placeholder()

    user = execute_query(
        f"SELECT * FROM users WHERE id = {p}",
        (user_id,),
        fetchone=True
    )

    return row_to_dict(user)

def get_paystack_customer(customer_code):
    if not customer_code or not PAYSTACK_SECRET_KEY:
        return None

    try:
        response = requests.get(
            f"https://api.paystack.co/customer/{customer_code}",
            headers={
                "Authorization": f"Bearer {PAYSTACK_SECRET_KEY}"
            },
            timeout=15
        )

        response.raise_for_status()
        result = response.json()

        return result.get("data")

    except requests.RequestException:
        print("Paystack customer lookup failed")
        return None

def get_paystack_subscription(subscription_code):
    if not subscription_code or not PAYSTACK_SECRET_KEY:
        return None

    try:
        response = requests.get(
            f"https://api.paystack.co/subscription/{subscription_code}",
            headers={
                "Authorization": f"Bearer {PAYSTACK_SECRET_KEY}"
            },
            timeout=15
        )

        response.raise_for_status()
        result = response.json()

        return result.get("data")

    except requests.RequestException:
        print("Paystack subscription lookup failed")
        return None

def get_user_by_email(email):
    if not email:
        return None

    p = placeholder()

    user = execute_query(
        f"SELECT * FROM users WHERE email = {p}",
        (email.lower(),),
        fetchone=True
    )

    return row_to_dict(user)


def get_user_plan_data(user):
    plan = normalize_plan(get_field(user, "plan", "free") if user else "free")

    return {
        "plan": plan,
        "planName": PLAN_LIMITS[plan]["name"],
        "subscriptionStatus": get_field(user, "subscription_status", "inactive") if user else "inactive",
        "stripeCustomerId": get_field(user, "stripe_customer_id", "") if user else "",
        "stripeSubscriptionId": get_field(user, "stripe_subscription_id", "") if user else "",
        "paystackCustomerCode": get_field(user, "paystack_customer_code", "") if user else "",
        "paystackSubscriptionCode": get_field(user, "paystack_subscription_code", "") if user else "",
        "features": PLAN_LIMITS[plan]
    }


def user_has_feature(user_id, feature_name):
    user = get_user_by_id(user_id)
    plan_data = get_user_plan_data(user)
    return bool(plan_data["features"].get(feature_name))


def get_user_lead_count(user_id):
    p = placeholder()

    result = execute_query(
        f"SELECT COUNT(*) AS count FROM leads WHERE userId = {p}",
        (user_id,),
        fetchone=True
    )

    result = row_to_dict(result)
    return result.get("count", 0) if result else 0


def update_user_subscription(user_id, plan, stripe_customer_id, stripe_subscription_id, subscription_status):
    plan = normalize_plan(plan)
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    if USING_POSTGRES:
        execute_query("""
            UPDATE users
            SET plan = %s,
                stripe_customer_id = %s,
                stripe_subscription_id = %s,
                subscription_status = %s,
                plan_updated_at = %s
            WHERE id = %s
        """, (
            plan,
            stripe_customer_id,
            stripe_subscription_id,
            subscription_status,
            now,
            user_id
        ), commit=True)
    else:
        execute_query("""
            UPDATE users
            SET plan = ?,
                stripe_customer_id = ?,
                stripe_subscription_id = ?,
                subscription_status = ?,
                plan_updated_at = ?
            WHERE id = ?
        """, (
            plan,
            stripe_customer_id,
            stripe_subscription_id,
            subscription_status,
            now,
            user_id
        ), commit=True)


def update_subscription_by_stripe_id(stripe_subscription_id, plan, subscription_status):
    if not stripe_subscription_id:
        return

    plan = normalize_plan(plan)
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    if USING_POSTGRES:
        execute_query("""
            UPDATE users
            SET plan = %s,
                subscription_status = %s,
                plan_updated_at = %s
            WHERE stripe_subscription_id = %s
        """, (
            plan,
            subscription_status,
            now,
            stripe_subscription_id
        ), commit=True)
    else:
        execute_query("""
            UPDATE users
            SET plan = ?,
                subscription_status = ?,
                plan_updated_at = ?
            WHERE stripe_subscription_id = ?
        """, (
            plan,
            subscription_status,
            now,
            stripe_subscription_id
        ), commit=True)

def update_user_paystack_subscription(
    user_id,
    plan,
    paystack_customer_code,
    paystack_subscription_code,
    subscription_status
):
    plan = normalize_plan(plan)
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    if USING_POSTGRES:
        execute_query("""
            UPDATE users
            SET plan = %s,
                paystack_customer_code = %s,
                paystack_subscription_code = %s,
                subscription_status = %s,
                plan_updated_at = %s
            WHERE id = %s
        """, (
            plan,
            paystack_customer_code,
            paystack_subscription_code,
            subscription_status,
            now,
            user_id
        ), commit=True)
    else:
        execute_query("""
            UPDATE users
            SET plan = ?,
                paystack_customer_code = ?,
                paystack_subscription_code = ?,
                subscription_status = ?,
                plan_updated_at = ?
            WHERE id = ?
        """, (
            plan,
            paystack_customer_code,
            paystack_subscription_code,
            subscription_status,
            now,
            user_id
        ), commit=True)

def update_subscription_by_paystack_code(
    paystack_subscription_code,
    plan,
    subscription_status
):
    if not paystack_subscription_code:
        return

    plan = normalize_plan(plan)
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    if USING_POSTGRES:
        execute_query("""
            UPDATE users
            SET plan = %s,
                subscription_status = %s,
                plan_updated_at = %s
            WHERE paystack_subscription_code = %s
        """, (
            plan,
            subscription_status,
            now,
            paystack_subscription_code
        ), commit=True)
    else:
        execute_query("""
            UPDATE users
            SET plan = ?,
                subscription_status = ?,
                plan_updated_at = ?
            WHERE paystack_subscription_code = ?
        """, (
            plan,
            subscription_status,
            now,
            paystack_subscription_code
        ), commit=True)

def is_admin_user(user_id):
    user = get_user_by_id(user_id)

    if not user:
        return False

    return user["email"].lower() == ADMIN_EMAIL

def is_trusted_origin():
    origin = request.headers.get("Origin")

    if not origin:
        return True

    allowed_origins = {
        "http://127.0.0.1:5000",
        "http://localhost:5000",
        "https://autoclient-v2.onrender.com"
    }

    return origin in allowed_origins

def get_lead_by_id(lead_id, user_id):
    if not lead_id or not user_id:
        return None

    p = placeholder()

    lead = execute_query(
        f"""
        SELECT *
        FROM leads
        WHERE id = {p}
          AND userId = {p}
        """,
        (lead_id, user_id),
        fetchone=True
    )

    return row_to_dict(lead)

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
    except Exception:
        print("Activity log failed")


@app.route("/")
def home():
    return send_from_directory(".", "landing.html")


@app.route("/app")
def app_dashboard():
    return send_from_directory(".", "index.html")


@app.route("/api/status")
def status():
    try:
        execute_query("SELECT 1", fetchone=True)

        return jsonify({
            "status": "healthy"
        }), 200

    except Exception:
        return jsonify({
            "status": "unhealthy"
        }), 503


@app.route("/api/register", methods=["POST"])
@limiter.limit("3 per minute")
def register():
    data = request.get_json() or {}

    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "").strip()

    if not name or not email or not password:
        return jsonify({
            "error": "Name, email and password are required"
        }), 400

    if len(password) < 8:
        return jsonify({
            "error": "Password must be at least 8 characters long"
        }), 400
    
    if len(email) > 254 or not re.fullmatch(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        return jsonify({
            "error": "Please enter a valid email address"
        }), 400

    existing_user = get_user_by_email(email)

    if existing_user:
        return jsonify({
            "error": "Unable to create account with these details"
        }), 409

    password_hash = generate_password_hash(password)
    created_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    if USING_POSTGRES:
        user = execute_query("""
            INSERT INTO users (
                name,
                email,
                password,
                createdAt,
                plan,
                subscription_status
            )
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING *
        """, (
            name,
            email,
            password_hash,
            created_at,
            "free",
            "inactive"
        ), fetchone=True, commit=True)

        user = row_to_dict(user)

    else:
        conn = get_db_connection()
        cursor = conn.cursor()

        try:
            cursor.execute("""
                INSERT INTO users (
                    name,
                    email,
                    password,
                    createdAt,
                    plan,
                    subscription_status
                )
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                name,
                email,
                password_hash,
                created_at,
                "free",
                "inactive"
            ))

            conn.commit()
            user_id = cursor.lastrowid

        finally:
            cursor.close()
            conn.close()

        user = get_user_by_id(user_id)

    if not user:
        return jsonify({
            "error": "Account was created but could not be loaded"
        }), 500

    # IMPORTANT:
    # Registration now creates the same Flask session as login.
    session["user_id"] = user["id"]

    log_activity(
        user["id"],
        None,
        "Account Created",
        f"{name} joined AutoClient."
    )

    return jsonify({
        "message": "Account created successfully",
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "createdAt": get_field(user, "createdAt"),
            "isAdmin": user["email"].lower() == ADMIN_EMAIL,
            "plan": get_field(user, "plan", "free"),
            "subscriptionStatus": get_field(
                user,
                "subscription_status",
                "inactive"
            )
        }
    }), 201

@app.route("/api/login", methods=["POST"])
@limiter.limit("5 per minute")
def login():
    data = request.get_json() or {}

    email = data.get("email", "").strip().lower()
    password = data.get("password", "").strip()

    user = get_user_by_email(email)

    if user is None or not check_password_hash(user["password"], password):
        return jsonify({"error": "Invalid email or password"}), 401

    session["user_id"] = user["id"]

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
            "createdAt": get_field(user, "createdAt"),
            "isAdmin": user["email"].lower() == ADMIN_EMAIL,
            "plan": get_field(user, "plan", "free"),
            "subscriptionStatus": get_field(
                user,
                "subscription_status",
                "inactive"
            )
        }
    })

@app.route("/api/change-password", methods=["POST"])
@limiter.limit("5 per hour")
def change_password():
    if not is_trusted_origin():
        return jsonify({"error": "Invalid request origin"}), 403

    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401

    data = request.get_json() or {}

    current_password = data.get("currentPassword", "")
    new_password = data.get("newPassword", "")

    if not current_password or not new_password:
        return jsonify({
            "error": "Current password and new password are required"
        }), 400

    if len(new_password) < 8:
        return jsonify({
            "error": "New password must be at least 8 characters long"
        }), 400

    user = get_user_by_id(user_id)

    if not user:
        session.clear()
        return jsonify({"error": "User not found"}), 404

    if not check_password_hash(user["password"], current_password):
        return jsonify({"error": "Current password is incorrect"}), 401

    if check_password_hash(user["password"], new_password):
        return jsonify({
            "error": "New password must be different from the current password"
        }), 400

    password_hash = generate_password_hash(new_password)

    p = placeholder()

    execute_query(
        f"UPDATE users SET password = {p} WHERE id = {p}",
        (password_hash, user_id),
        commit=True
    )

    session.clear()

    return jsonify({
        "message": "Password changed successfully. Please log in again."
    }), 200

@app.route("/api/me", methods=["GET"])
def current_user():
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401

    user = get_user_by_id(user_id)

    if not user:
        session.clear()
        return jsonify({"error": "User not found"}), 404

    return jsonify({
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "createdAt": get_field(user, "createdAt"),
            "isAdmin": user["email"].lower() == ADMIN_EMAIL,
            "plan": get_field(user, "plan", "free"),
            "subscriptionStatus": get_field(
                user,
                "subscription_status",
                "inactive"
            )
        }
    })

@app.route("/api/logout", methods=["POST"])
def logout():
    if not is_trusted_origin():
        return jsonify({"error": "Invalid request origin"}), 403

    session.clear()

    return jsonify({
        "message": "Logged out successfully"
    }), 200

@app.route("/api/my-plan", methods=["GET"])
def my_plan():
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401

    user = get_user_by_id(user_id)

    if not user:
        session.clear()
        return jsonify({"error": "User not found"}), 404

    paystack_customer_code = get_field(
        user,
        "paystack_customer_code",
        ""
    )

    paystack_subscription_code = get_field(
        user,
        "paystack_subscription_code",
        ""
    )

    # Paystack is the primary billing provider once
    # a Paystack subscription exists for the user.
    if PAYSTACK_SECRET_KEY and paystack_subscription_code:
        subscription = get_paystack_subscription(
            paystack_subscription_code
        )

        if subscription:
            paystack_status = subscription.get(
                "status",
                "inactive"
            )

            if paystack_status == "active":
                plan = "pro"
                subscription_status = "active"

            elif paystack_status == "non-renewing":
                plan = "pro"
                subscription_status = "non_renewing"

            elif paystack_status == "attention":
                plan = "pro"
                subscription_status = "attention"

            elif paystack_status == "completed":
                plan = "free"
                subscription_status = "completed"

            elif paystack_status == "cancelled":
                plan = "free"
                subscription_status = "cancelled"

            else:
                plan = "free"
                subscription_status = paystack_status

            update_user_paystack_subscription(
                user_id=user_id,
                plan=plan,
                paystack_customer_code=paystack_customer_code,
                paystack_subscription_code=paystack_subscription_code,
                subscription_status=subscription_status
            )

            user = get_user_by_id(user_id)

        return jsonify(get_user_plan_data(user))

    # Fallback for Paystack users whose subscription
    # code has not yet been stored.
    if PAYSTACK_SECRET_KEY and paystack_customer_code:
        paystack_customer = get_paystack_customer(
            paystack_customer_code
        )

        if paystack_customer:
            subscriptions = (
                paystack_customer.get(
                    "subscriptions",
                    []
                ) or []
            )

            if subscriptions:
                subscription = subscriptions[0]

                current_subscription_code = (
                    subscription.get(
                        "subscription_code"
                    )
                )

                paystack_status = subscription.get(
                    "status",
                    "inactive"
                )

                if paystack_status == "active":
                    plan = "pro"
                    subscription_status = "active"

                elif paystack_status == "non-renewing":
                    plan = "pro"
                    subscription_status = "non_renewing"

                elif paystack_status == "attention":
                    plan = "pro"
                    subscription_status = "attention"

                elif paystack_status == "completed":
                    plan = "free"
                    subscription_status = "completed"

                elif paystack_status == "cancelled":
                    plan = "free"
                    subscription_status = "cancelled"

                else:
                    plan = "free"
                    subscription_status = paystack_status

                update_user_paystack_subscription(
                    user_id=user_id,
                    plan=plan,
                    paystack_customer_code=paystack_customer_code,
                    paystack_subscription_code=(
                        current_subscription_code
                    ),
                    subscription_status=(
                        subscription_status
                    )
                )

                user = get_user_by_id(user_id)

        return jsonify(get_user_plan_data(user))

    # Stripe fallback for legacy Stripe-only users.
    stripe_subscription_id = get_field(
        user,
        "stripe_subscription_id",
        ""
    )

    if STRIPE_SECRET_KEY and stripe_subscription_id:
        try:
            subscription = stripe.Subscription.retrieve(
                stripe_subscription_id
            )

            if hasattr(subscription, "to_dict"):
                subscription = subscription.to_dict()

            stripe_status = subscription.get(
                "status",
                "inactive"
            )

            plan = (
                "pro"
                if stripe_status in ["active", "trialing"]
                else "free"
            )

            update_user_subscription(
                user_id=user_id,
                plan=plan,
                stripe_customer_id=get_field(
                    user,
                    "stripe_customer_id",
                    ""
                ),
                stripe_subscription_id=stripe_subscription_id,
                subscription_status=stripe_status
            )

            user = get_user_by_id(user_id)

        except Exception:
            print("Stripe subscription sync failed")

    return jsonify(get_user_plan_data(user))

@app.route("/api/create-paystack-checkout", methods=["POST"])
def create_paystack_checkout():
    if not is_trusted_origin():
        return jsonify({"error": "Invalid request origin"}), 403

    if not PAYSTACK_SECRET_KEY:
        return jsonify({
            "error": "Paystack billing is not configured."
        }), 500

    if not PAYSTACK_PRO_PLAN_CODE:
        return jsonify({
            "error": "Paystack Pro plan is not configured."
        }), 500

    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401

    user = get_user_by_id(user_id)

    if not user:
        session.clear()
        return jsonify({"error": "User not found"}), 404

    plan_data = get_user_plan_data(user)

    if (
        plan_data["plan"] == "pro"
        and plan_data["subscriptionStatus"]
        in ["active", "trialing", "non_renewing", "attention"]
    ):
        return jsonify({
            "error": "Your Pro subscription is already active."
        }), 400

    payload = {
        "email": user["email"],
        "plan": PAYSTACK_PRO_PLAN_CODE,
        "currency": "ZAR",
        "callback_url": f"{FRONTEND_URL}/app?billing=success",
        "metadata": {
            "userId": str(user_id),
            "plan": "pro"
        }
    }

    try:
        response = requests.post(
            "https://api.paystack.co/transaction/initialize",
            headers={
                "Authorization": f"Bearer {PAYSTACK_SECRET_KEY}",
                "Content-Type": "application/json"
            },
            json=payload,
            timeout=15
        )

        response.raise_for_status()
        result = response.json()

        authorization_url = (
            result.get("data", {})
            .get("authorization_url")
        )

        if not authorization_url:
            return jsonify({
                "error": "Paystack did not return a checkout URL."
            }), 502

        return jsonify({
            "url": authorization_url
        }), 200

    except requests.RequestException:
        print("Paystack checkout request failed")

        return jsonify({
            "error": "Could not start Paystack checkout."
        }), 500
    
@app.route("/api/create-checkout-session", methods=["POST"])
def create_checkout_session():
    if not is_trusted_origin():
        return jsonify({"error": "Invalid request origin"}), 403
    
    if not STRIPE_SECRET_KEY:
        return jsonify({
            "error": "Stripe billing is not configured."
        }), 500

    if not STRIPE_PRO_PRICE_ID:
        return jsonify({
            "error": "Stripe Pro price is not configured."
        }), 500

    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401

    user = get_user_by_id(user_id)

    if not user:
        session.clear()
        return jsonify({"error": "User not found"}), 404

    plan_data = get_user_plan_data(user)

    if (
        plan_data["plan"] == "pro"
        and plan_data["subscriptionStatus"] in ["active", "trialing"]
    ):
        return jsonify({
            "error": "Your Pro subscription is already active."
        }), 400

    try:
        checkout_session = stripe.checkout.Session.create(
            mode="subscription",
            customer_email=user["email"],
            line_items=[
                {
                    "price": STRIPE_PRO_PRICE_ID,
                    "quantity": 1
                }
            ],
            metadata={
                "userId": str(user_id),
                "plan": "pro"
            },
            subscription_data={
                "metadata": {
                    "userId": str(user_id),
                    "plan": "pro"
                }
            },
            success_url=f"{FRONTEND_URL}/app?billing=success",
            cancel_url=f"{FRONTEND_URL}/app?billing=cancelled"
        )

        return jsonify({
            "url": checkout_session.url
        })

    except Exception:
        print("Stripe checkout failed")

        return jsonify({
            "error": "Could not start Stripe checkout."
        }), 500

@app.route("/api/create-billing-portal-session", methods=["POST"])
def create_billing_portal_session():
    if not is_trusted_origin():
        return jsonify({"error": "Invalid request origin"}), 403

    if not STRIPE_SECRET_KEY:
        return jsonify({
            "error": "Stripe billing is not configured."
        }), 500

    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401

    user = get_user_by_id(user_id)

    if not user:
        session.clear()
        return jsonify({"error": "User not found"}), 404

    stripe_customer_id = get_field(
        user,
        "stripe_customer_id",
        ""
    )

    try:
        if not stripe_customer_id:
            customers = stripe.Customer.list(
                email=user["email"],
                limit=1
            )

            if not customers.data:
                return jsonify({
                    "error": (
                        "No Stripe customer found yet. "
                        "Complete checkout first."
                    )
                }), 400

            stripe_customer_id = customers.data[0].id

            subscriptions = stripe.Subscription.list(
                customer=stripe_customer_id,
                status="all",
                limit=1
            )

            stripe_subscription_id = ""
            subscription_status = "inactive"
            plan = "free"

            if subscriptions.data:
                subscription = subscriptions.data[0]

                stripe_subscription_id = subscription.id
                subscription_status = subscription.status

                if subscription_status in ["active", "trialing"]:
                    plan = "pro"

            update_user_subscription(
                user_id=user_id,
                plan=plan,
                stripe_customer_id=stripe_customer_id,
                stripe_subscription_id=stripe_subscription_id,
                subscription_status=subscription_status
            )

        portal_session = stripe.billing_portal.Session.create(
            customer=stripe_customer_id,
            return_url=f"{FRONTEND_URL}/app"
        )

        return jsonify({
            "url": portal_session.url
        })

    except Exception:
        print("Stripe billing portal request failed")

        return jsonify({
            "error": "Could not open the billing portal."
        }), 500


@app.route("/api/create-paystack-manage-link", methods=["POST"])
def create_paystack_manage_link():
    if not is_trusted_origin():
        return jsonify({"error": "Invalid request origin"}), 403

    if not PAYSTACK_SECRET_KEY:
        return jsonify({
            "error": "Paystack billing is not configured."
        }), 500

    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401

    user = get_user_by_id(user_id)

    if not user:
        session.clear()
        return jsonify({"error": "User not found"}), 404

    paystack_subscription_code = get_field(
        user,
        "paystack_subscription_code",
        ""
    )

    if not paystack_subscription_code:
        return jsonify({
            "error": "No Paystack subscription found."
        }), 400

    try:
        response = requests.get(
            (
                "https://api.paystack.co/subscription/"
                f"{paystack_subscription_code}/manage/link"
            ),
            headers={
                "Authorization": f"Bearer {PAYSTACK_SECRET_KEY}"
            },
            timeout=15
        )

        response.raise_for_status()
        result = response.json()

        manage_url = result.get(
            "data",
            {}
        ).get("link")

        if not manage_url:
            return jsonify({
                "error": "Paystack did not return a management URL."
            }), 502

        return jsonify({
            "url": manage_url
        }), 200

    except requests.RequestException:
        print("Paystack manage subscription request failed")

        return jsonify({
            "error": "Could not open subscription management."
        }), 500

@app.route("/stripe-webhook", methods=["POST"])
def stripe_webhook():
    if not STRIPE_WEBHOOK_SECRET:
        return jsonify({"error": "Billing service is temporarily unavailable"}), 500

    payload = request.data
    sig_header = request.headers.get("Stripe-Signature")

    try:
        event = stripe.Webhook.construct_event(
            payload,
            sig_header,
            STRIPE_WEBHOOK_SECRET
        )
    except Exception:
        print("Stripe webhook verification failed")
        
        return jsonify({"error": "Webhook verification failed"}), 400

    event_type = event["type"]
    data_object = event["data"]["object"]

    if hasattr(data_object, "to_dict"):
        data_object = data_object.to_dict()

    if event_type == "checkout.session.completed":
        metadata = data_object.get("metadata", {}) or {}

        user_id = metadata.get("userId")
        plan = metadata.get("plan", "pro")
        customer_id = data_object.get("customer")
        subscription_id = data_object.get("subscription")

        if user_id:
            update_user_subscription(
                user_id=user_id,
                plan=plan,
                stripe_customer_id=customer_id,
                stripe_subscription_id=subscription_id,
                subscription_status="active"
            )

            log_activity(
                user_id,
                None,
                "Subscription Activated",
                f"User upgraded to {plan.upper()} plan."
            )

            print(f"User {user_id} upgraded to {plan}")

    elif event_type == "customer.subscription.created":
        metadata = data_object.get("metadata", {}) or {}

        user_id = metadata.get("userId")
        plan = normalize_plan(metadata.get("plan", "pro"))
        subscription_id = data_object.get("id")
        customer_id = data_object.get("customer")
        status_value = data_object.get("status", "active")

        if user_id:
            update_user_subscription(
                user_id=user_id,
                plan=plan,
                stripe_customer_id=customer_id,
                stripe_subscription_id=subscription_id,
                subscription_status=status_value
            )

    elif event_type == "customer.subscription.updated":
        subscription_id = data_object.get("id")
        status_value = data_object.get("status", "inactive")

        plan = "pro" if status_value in ["active", "trialing"] else "free"

        update_subscription_by_stripe_id(
            stripe_subscription_id=subscription_id,
            plan=plan,
            subscription_status=status_value
        )

        print(f"Subscription updated: {subscription_id} -> {plan} / {status_value}")

    elif event_type == "customer.subscription.deleted":
        subscription_id = data_object.get("id")

        update_subscription_by_stripe_id(
            stripe_subscription_id=subscription_id,
            plan="free",
            subscription_status="cancelled"
        )

        print(f"Subscription cancelled: {subscription_id} -> free")

    elif event_type == "invoice.payment_succeeded":
        subscription_id = data_object.get("subscription")

        if subscription_id:
            update_subscription_by_stripe_id(
                stripe_subscription_id=subscription_id,
                plan="pro",
                subscription_status="active"
            )

    elif event_type == "invoice.payment_failed":
        subscription_id = data_object.get("subscription")

        if subscription_id:
            update_subscription_by_stripe_id(
                stripe_subscription_id=subscription_id,
                plan="free",
                subscription_status="past_due"
            )

    return jsonify({"received": True}), 200

@app.route("/paystack-webhook", methods=["POST"])
def paystack_webhook():
    if not PAYSTACK_SECRET_KEY:
        return jsonify({
            "error": "Paystack billing is not configured."
        }), 500

    payload = request.get_data()
    signature = request.headers.get(
        "x-paystack-signature",
        ""
    )

    expected_signature = hmac.new(
        PAYSTACK_SECRET_KEY.encode("utf-8"),
        payload,
        hashlib.sha512
    ).hexdigest()

    if not hmac.compare_digest(
        signature,
        expected_signature
    ):
        return jsonify({
            "error": "Webhook verification failed"
        }), 400

    event = request.get_json(silent=True) or {}
    event_type = event.get("event")
    data_object = event.get("data", {}) or {}

    print("Paystack event:", event_type)

    if event_type == "charge.success":
        metadata = data_object.get("metadata", {}) or {}
        user_id = metadata.get("userId")

        customer = data_object.get("customer", {}) or {}
        paystack_customer_code = customer.get(
            "customer_code"
        )

        paystack_customer = get_paystack_customer(
            paystack_customer_code
        )

        subscriptions = (
            (paystack_customer or {}).get(
                "subscriptions",
                []
            ) or []
        )

        active_subscription = next(
            (
                subscription
                for subscription in subscriptions
                if subscription.get("status")
                in ["active", "non-renewing", "attention"]
            ),
            None
        )

        paystack_subscription_code = None

        if active_subscription:
            paystack_subscription_code = (
                active_subscription.get(
                    "subscription_code"
                )
            )

        if user_id:
            update_user_paystack_subscription(
                user_id=user_id,
                plan="pro",
                paystack_customer_code=(
                    paystack_customer_code
                ),
                paystack_subscription_code=(
                    paystack_subscription_code
                ),
                subscription_status="active"
            )

            log_activity(
                user_id,
                None,
                "Subscription Activated",
                "User upgraded to PRO plan via Paystack."
            )

    elif event_type == "subscription.create":
        subscription_code = data_object.get(
            "subscription_code"
        )

        customer = data_object.get(
            "customer",
            {}
        ) or {}

        customer_code = customer.get(
            "customer_code"
        )

        print(
            "Paystack subscription created:",
            subscription_code,
            customer_code
        )

    elif event_type == "subscription.not_renew":
        subscription_code = data_object.get(
            "subscription_code"
        )

        if subscription_code:
            update_subscription_by_paystack_code(
                paystack_subscription_code=(
                    subscription_code
                ),
                plan="pro",
                subscription_status="non_renewing"
            )

        print(
            "Paystack subscription non-renewing:",
            subscription_code
        )

    elif event_type == "subscription.disable":
        subscription_code = data_object.get(
            "subscription_code"
        )

        status_value = data_object.get(
            "status",
            "cancelled"
        )

        if status_value in ["complete", "completed"]:
            final_status = "completed"
        else:
            final_status = "cancelled"

        if subscription_code:
            update_subscription_by_paystack_code(
                paystack_subscription_code=(
                    subscription_code
                ),
                plan="free",
                subscription_status=final_status
            )

        print(
            "Paystack subscription disabled:",
            subscription_code,
            final_status
        )

    elif event_type == "invoice.payment_failed":
        subscription = data_object.get(
            "subscription",
            {}
        ) or {}

        subscription_code = subscription.get(
            "subscription_code"
        )

        if subscription_code:
            update_subscription_by_paystack_code(
                paystack_subscription_code=(
                    subscription_code
                ),
                plan="pro",
                subscription_status="attention"
            )

        print(
            "Paystack subscription payment issue:",
            subscription_code
        )

    elif event_type == "invoice.update":
        subscription = data_object.get(
            "subscription",
            {}
        ) or {}

        subscription_code = subscription.get(
            "subscription_code"
        )

        paid = data_object.get("paid")

        if subscription_code and paid:
            update_subscription_by_paystack_code(
                paystack_subscription_code=(
                    subscription_code
                ),
                plan="pro",
                subscription_status="active"
            )

            print(
                "Paystack renewal payment succeeded:",
                subscription_code
            )

    return jsonify({"received": True}), 200

@app.route("/api/activities", methods=["GET"])
def get_activities():
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401

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
    if not is_trusted_origin():
        return jsonify({"error": "Invalid request origin"}), 403
    
    data = request.get_json() or {}

    user_id = session.get("user_id")
    lead_id = data.get("leadId")
    action = data.get("action", "").strip()
    details = data.get("details", "").strip()

    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401

    if not action:
        return jsonify({"error": "Action is required"}), 400

    log_activity(user_id, lead_id, action, details)

    return jsonify({"message": "Activity logged successfully"}), 201


@app.route("/api/leads", methods=["GET"])
def get_leads():
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401

    p = placeholder()

    leads = execute_query(
        f"SELECT * FROM leads WHERE userId = {p} ORDER BY id DESC",
        (user_id,),
        fetchall=True
    )

    return jsonify([row_to_dict(lead) for lead in leads])


@app.route("/api/analyze-lead/<int:lead_id>", methods=["POST"])
@limiter.limit("20 per hour")
def analyze_lead(lead_id):
    if not is_trusted_origin():
        return jsonify({"error": "Invalid request origin"}), 403

    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401

    if not user_has_feature(user_id, "ai_outreach"):
        return jsonify({
            "error": "AI Lead Intelligence is available on Pro plan."
        }), 403

    lead = get_lead_by_id(lead_id, user_id)

    if not lead:
        return jsonify({"error": "Lead not found"}), 404

    business_name = get_field(
        lead,
        "businessName",
        "Unknown business"
    )

    link = get_field(
        lead,
        "link",
        ""
    )

    contact = get_field(
        lead,
        "contact",
        ""
    )

    notes = get_field(
        lead,
        "notes",
        ""
    )

    priority = get_field(
        lead,
        "priority",
        "Cold"
    )

    status = get_field(
        lead,
        "status",
        "New"
    )

    last_contacted = get_field(
        lead,
        "lastContacted",
        ""
    )

    next_follow_up = get_field(
        lead,
        "nextFollowUp",
        ""
    )

    # --------------------------------------------------
    # Analysis Confidence
    # Measures how much useful information AutoClient has.
    # --------------------------------------------------

    confidence_points = 0

    if business_name and business_name != "Unknown business":
        confidence_points += 15

    if link:
        confidence_points += 20

    if contact:
        confidence_points += 20

    if notes:
        confidence_points += 30

    if last_contacted:
        confidence_points += 10

    if next_follow_up:
        confidence_points += 5

    confidence_points = min(confidence_points, 100)

    if confidence_points >= 75:
        ai_confidence = "High"
    elif confidence_points >= 45:
        ai_confidence = "Medium"
    else:
        ai_confidence = "Low"

    # --------------------------------------------------
    # Lead Quality Score
    # Measures how actionable/promising the CRM lead appears.
    # This is NOT a prediction that the customer will buy.
    # --------------------------------------------------

    lead_quality_score = 0

    # Reachability
    if contact:
        lead_quality_score += 20

    # Researchability
    if link:
        lead_quality_score += 10

    # Useful context
    if notes:
        lead_quality_score += 15

    # User-defined priority
    priority_lower = str(priority).strip().lower()

    if priority_lower in ["hot", "high"]:
        lead_quality_score += 25
    elif priority_lower in ["warm", "medium"]:
        lead_quality_score += 15
    elif priority_lower in ["cold", "low"]:
        lead_quality_score += 5

    # Pipeline progress
    status_lower = str(status).strip().lower()

    if status_lower in [
        "qualified",
        "proposal",
        "negotiation",
        "interested"
    ]:
        lead_quality_score += 20

    elif status_lower in [
        "contacted",
        "follow up",
        "follow-up"
    ]:
        lead_quality_score += 15

    elif status_lower in [
        "new"
    ]:
        lead_quality_score += 5

    elif status_lower in [
        "closed",
        "lost",
        "rejected"
    ]:
        lead_quality_score -= 20

    # Engagement / follow-up readiness
    if last_contacted:
        lead_quality_score += 5

    if next_follow_up:
        lead_quality_score += 5

    ai_score = max(
        0,
        min(lead_quality_score, 100)
    )

    # --------------------------------------------------
    # Best communication channel
    # --------------------------------------------------

    contact_text = str(contact).strip()

    if contact_text and "@" in contact_text:
        ai_best_channel = "Email"

    elif contact_text:
        ai_best_channel = "WhatsApp or Call"

    elif link:
        ai_best_channel = "Website or LinkedIn"

    else:
        ai_best_channel = "Research Required"

    # --------------------------------------------------
    # Internal intelligence summary
    # --------------------------------------------------

    if notes:
        ai_summary = (
            f"{business_name} has useful CRM context available. "
            "The lead should be approached using the stored business "
            "information while keeping internal notes private."
        )

    elif link and contact:
        ai_summary = (
            f"{business_name} has both a business/profile link and "
            "contact information available, making the lead ready "
            "for further qualification and outreach."
        )

    elif link:
        ai_summary = (
            f"{business_name} has a business/profile link available "
            "but still needs additional context or contact information "
            "before highly personalized outreach."
        )

    elif contact:
        ai_summary = (
            f"{business_name} has contact information available but "
            "limited business context. Additional research would improve "
            "personalization before outreach."
        )

    else:
        ai_summary = (
            f"{business_name} currently has limited information available. "
            "More research is recommended before personalized outreach."
        )

    # --------------------------------------------------
    # Opportunity assessment
    # --------------------------------------------------

    if notes and link:
        ai_opportunity = (
            "There is enough context to investigate a specific business "
            "need, service fit, or improvement opportunity before outreach."
        )

    elif notes:
        ai_opportunity = (
            "The stored CRM context can be used to identify a relevant "
            "business need or service opportunity."
        )

    elif link:
        ai_opportunity = (
            "Review the available business website or profile to identify "
            "a specific need or improvement opportunity."
        )

    else:
        ai_opportunity = (
            "Additional research is required before a strong business "
            "opportunity can be identified."
        )

    # --------------------------------------------------
    # Recommended outreach approach
    # --------------------------------------------------

    if ai_score >= 70:
        ai_recommended_approach = (
            "Use a direct, personalized approach focused on one clear "
            "business outcome and move toward a conversation."
        )

    elif ai_score >= 45:
        ai_recommended_approach = (
            "Use a consultative approach that highlights one relevant "
            "opportunity and invites the prospect to discuss it."
        )

    else:
        ai_recommended_approach = (
            "Use low-pressure outreach focused on relevance and research "
            "before making a stronger offer."
        )

    # --------------------------------------------------
    # Recommended next action
    # --------------------------------------------------

    if ai_best_channel == "Research Required":
        ai_next_action = (
            "Research the business and add valid contact information "
            "before starting outreach."
        )

    elif not notes and link:
        ai_next_action = (
            "Review the business website or profile and add useful CRM "
            "context before generating highly personalized outreach."
        )

    elif not notes:
        ai_next_action = (
            "Add useful business context before generating personalized outreach."
        )

    elif status_lower in [
        "closed",
        "lost",
        "rejected"
    ]:
        ai_next_action = (
            "Review whether this lead should be reopened before starting "
            "new outreach."
        )

    elif next_follow_up:
        ai_next_action = (
            f"Follow up with {business_name} using {ai_best_channel} "
            "and the existing CRM context."
        )

    else:
        ai_next_action = (
            f"Prepare personalized outreach for {business_name} "
            f"using {ai_best_channel}."
        )

    ai_last_analyzed = datetime.now().strftime(
        "%Y-%m-%d %H:%M:%S"
    )

    if USING_POSTGRES:
        updated_lead = execute_query("""
            UPDATE leads
            SET aiSummary = %s,
                aiOpportunity = %s,
                aiRecommendedApproach = %s,
                aiBestChannel = %s,
                aiNextAction = %s,
                aiConfidence = %s,
                aiScore = %s,
                aiLastAnalyzed = %s
            WHERE id = %s
              AND userId = %s
            RETURNING *
        """, (
            ai_summary,
            ai_opportunity,
            ai_recommended_approach,
            ai_best_channel,
            ai_next_action,
            ai_confidence,
            ai_score,
            ai_last_analyzed,
            lead_id,
            user_id
        ), fetchone=True, commit=True)

        updated_lead = row_to_dict(updated_lead)

    else:
        execute_query("""
            UPDATE leads
            SET aiSummary = ?,
                aiOpportunity = ?,
                aiRecommendedApproach = ?,
                aiBestChannel = ?,
                aiNextAction = ?,
                aiConfidence = ?,
                aiScore = ?,
                aiLastAnalyzed = ?
            WHERE id = ?
              AND userId = ?
        """, (
            ai_summary,
            ai_opportunity,
            ai_recommended_approach,
            ai_best_channel,
            ai_next_action,
            ai_confidence,
            ai_score,
            ai_last_analyzed,
            lead_id,
            user_id
        ), commit=True)

        updated_lead = get_lead_by_id(
            lead_id,
            user_id
        )

    log_activity(
        user_id,
        lead_id,
        "Lead Intelligence Generated",
        f"Lead intelligence generated for {business_name}."
    )

    return jsonify({
        "leadId": lead_id,
        "businessName": business_name,
        "analysis": {
            "summary": ai_summary,
            "opportunity": ai_opportunity,
            "recommendedApproach": ai_recommended_approach,
            "bestChannel": ai_best_channel,
            "nextAction": ai_next_action,
            "confidence": ai_confidence,
            "score": ai_score,
            "scoreLabel": "Lead Quality",
            "lastAnalyzed": ai_last_analyzed
        },
        "lead": updated_lead
    }), 200

@app.route("/api/leads", methods=["POST"])
def add_lead():
    if not is_trusted_origin():
        return jsonify({"error": "Invalid request origin"}), 403
    
    data = request.get_json() or {}

    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401

    user = get_user_by_id(user_id)

    if not user:
        session.clear()
        return jsonify({"error": "User not found"}), 404

    plan_data = get_user_plan_data(user)
    current_count = get_user_lead_count(user_id)
    max_leads = plan_data["features"]["max_leads"]

    if current_count >= max_leads:
        return jsonify({
            "error": f"{plan_data['planName']} plan limit reached. Upgrade to add more leads."
        }), 403

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
            user_id,
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
        business_name = get_field(
            lead_dict,
            "businessName",
            data.get("businessName")
        )

        log_activity(
            user_id,
            lead_dict["id"],
            "Lead Created",
            f"{business_name} was added to your CRM."
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
        user_id,
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
        user_id,
        lead_id,
        "Lead Created",
        f"{data.get('businessName')} was added to your CRM."
    )

    return jsonify({
        "id": lead_id,
        "userId": user_id,
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
    if not is_trusted_origin():
        return jsonify({"error": "Invalid request origin"}), 403
    
    data = request.get_json() or {}

    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401

    p = placeholder()

    old_lead = execute_query(
        f"SELECT * FROM leads WHERE id = {p} AND userId = {p}",
        (lead_id, user_id),
        fetchone=True
    )

    old_lead = row_to_dict(old_lead)

    if not old_lead:
        return jsonify({"error": "Lead not found"}), 404

    old_status = old_lead.get("status")
    new_status = data.get("status")

    if USING_POSTGRES:
        lead = execute_query("""
            UPDATE leads
            SET businessName=%s,
                link=%s,
                contact=%s,
                priority=%s,
                notes=%s,
                status=%s,
                createdAt=%s,
                lastContacted=%s,
                nextFollowUp=%s
            WHERE id=%s AND userId=%s
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
            lead_id,
            user_id
        ), fetchone=True, commit=True)

        lead_dict = row_to_dict(lead)

        if not lead_dict:
            return jsonify({"error": "Lead not found"}), 404

        business_name = get_field(
            lead_dict,
            "businessName",
            data.get("businessName") or "Lead"
        )

        if old_status and new_status and old_status != new_status:
            log_activity(
                user_id,
                lead_id,
                "Lead Status Changed",
                f"{business_name} moved from {old_status} to {new_status}."
            )
        elif data.get("nextFollowUp"):
            log_activity(
                user_id,
                lead_id,
                "Follow-up Scheduled",
                f"Next follow-up set for {data.get('nextFollowUp')}."
            )
        else:
            log_activity(
                user_id,
                lead_id,
                "Lead Updated",
                f"{business_name} was updated."
            )

        return jsonify(lead_dict)

    execute_query("""
        UPDATE leads
        SET businessName=?,
            link=?,
            contact=?,
            priority=?,
            notes=?,
            status=?,
            createdAt=?,
            lastContacted=?,
            nextFollowUp=?
        WHERE id=? AND userId=?
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
        lead_id,
        user_id
    ), commit=True)

    business_name = data.get("businessName") or "Lead"

    if old_status and new_status and old_status != new_status:
        log_activity(
            user_id,
            lead_id,
            "Lead Status Changed",
            f"{business_name} moved from {old_status} to {new_status}."
        )
    elif data.get("nextFollowUp"):
        log_activity(
            user_id,
            lead_id,
            "Follow-up Scheduled",
            f"Next follow-up set for {data.get('nextFollowUp')}."
        )
    else:
        log_activity(
            user_id,
            lead_id,
            "Lead Updated",
            f"{business_name} was updated."
        )

    return jsonify({"message": "Lead updated"})

@app.route("/api/leads/<int:lead_id>", methods=["DELETE"])
def delete_lead(lead_id):
    if not is_trusted_origin():
        return jsonify({"error": "Invalid request origin"}), 403
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401

    p = placeholder()

    lead = execute_query(
        f"SELECT * FROM leads WHERE id = {p} AND userId = {p}",
        (lead_id, user_id),
        fetchone=True
    )

    lead = row_to_dict(lead)

    if not lead:
        return jsonify({"error": "Lead not found"}), 404

    business_name = get_field(lead, "businessName", "Lead")

    log_activity(
        user_id,
        lead_id,
        "Lead Deleted",
        f"{business_name} was deleted from your CRM."
    )

    execute_query(
        f"DELETE FROM leads WHERE id = {p} AND userId = {p}",
        (lead_id, user_id),
        commit=True
    )

    return jsonify({"message": "Lead deleted"})


@app.route("/api/generate-message", methods=["POST"])
@limiter.limit("20 per hour")
def generate_message():
    if not is_trusted_origin():
        return jsonify({"error": "Invalid request origin"}), 403

    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401

    if not user_has_feature(user_id, "ai_outreach"):
        return jsonify({
            "error": "AI outreach is available on Pro plan."
        }), 403

    data = request.get_json() or {}

    business = (
        data.get("businessName")
        or "your business"
    ).strip()

    service = (
        data.get("service")
        or "my services"
    ).strip()

    style = (
        data.get("style")
        or "formal"
    ).strip().lower()

    name = (
        data.get("userName")
        or "AutoClient User"
    ).strip()

    lead_id = data.get("leadId")

    ai_summary = (
        data.get("aiSummary")
        or ""
    ).strip()

    ai_opportunity = (
        data.get("aiOpportunity")
        or ""
    ).strip()

    ai_recommended_approach = (
        data.get("aiRecommendedApproach")
        or ""
    ).strip()

    ai_best_channel = (
        data.get("aiBestChannel")
        or ""
    ).strip()

    ai_next_action = (
        data.get("aiNextAction")
        or ""
    ).strip()

    has_intelligence = any([
        ai_summary,
        ai_opportunity,
        ai_recommended_approach,
        ai_best_channel,
        ai_next_action
    ])

    # Never place raw internal CRM notes directly
    # into customer-facing outreach.
    if has_intelligence:
        personalization_line = (
            f"I came across {business} and thought there may be "
            "a worthwhile opportunity to connect."
        )
    else:
        personalization_line = (
            f"I came across {business} and wanted to reach out."
        )

    if ai_opportunity:
        opportunity_line = (
            "There may be an opportunity to strengthen an area "
            "of the business and create better results."
        )
    else:
        opportunity_line = (
            f"I believe {service} could potentially support "
            "your business goals."
        )

    if ai_recommended_approach:
        approach_lower = ai_recommended_approach.lower()

        if "direct" in approach_lower:
            value_line = (
                f"I help businesses with {service}, with a practical "
                "focus on measurable results."
            )

        elif "consultative" in approach_lower:
            value_line = (
                f"I help businesses with {service} by first understanding "
                "where the strongest opportunity is and then focusing "
                "on a solution that makes sense."
            )

        elif "low-pressure" in approach_lower:
            value_line = (
                f"I work with businesses on {service} and prefer a "
                "straightforward, no-pressure conversation to see "
                "whether there is a useful fit."
            )

        else:
            value_line = (
                f"I help businesses with {service} and would be happy "
                "to explore whether there is a useful fit."
            )

    else:
        value_line = (
            f"I help businesses with {service} and would be happy "
            "to explore whether there is a useful fit."
        )

    if style == "casual":
        if has_intelligence:
            msg = f"""Hi {business},

{personalization_line}

{opportunity_line}

{value_line}

Would you be open to a quick chat?

Thanks,
{name}"""

        else:
            msg = f"""Hi {business},

{personalization_line}

I help businesses with {service} and thought it might be worth connecting.

Would you be open to a quick chat?

Thanks,
{name}"""

    elif style == "direct":
        if has_intelligence:
            msg = f"""Hi {business},

Quick one.

{personalization_line}

{opportunity_line}

I help businesses with {service} and would be happy to discuss whether I can help.

Open to a short conversation?

{name}"""

        else:
            msg = f"""Hi {business},

Quick one.

I help businesses with {service} and thought there may be an opportunity to help.

Open to a short conversation?

{name}"""

    elif style == "followup":
        if has_intelligence:
            msg = f"""Hi {business},

Just following up on my previous message.

I still believe there may be a useful opportunity to help with {service}.

If it makes sense, I would be happy to have a quick conversation and see whether there is a fit.

Regards,
{name}"""

        else:
            msg = f"""Hi {business},

Just following up on my previous message.

I still believe I may be able to help with {service}.

Let me know if you would be open to a quick conversation.

Regards,
{name}"""

    else:
        if has_intelligence:
            msg = f"""Good day {business},

{personalization_line}

{opportunity_line}

{value_line}

Would you be open to a short conversation to see whether this could be useful for your business?

Kind regards,
{name}"""

        else:
            msg = f"""Good day {business},

{personalization_line}

I help businesses with {service}, and I believe there may be an opportunity to create stronger results.

Would you be open to a short conversation?

Kind regards,
{name}"""

    log_activity(
        user_id,
        lead_id,
        "AI Outreach Generated",
        f"Personalized outreach message generated for {business}."
    )

    return jsonify({
        "message": msg,
        "usedLeadIntelligence": has_intelligence
    }), 200

@app.route("/api/send-email", methods=["POST"])
@limiter.limit("30 per hour")
def send_email():
    if not is_trusted_origin():
        return jsonify({"error": "Invalid request origin"}), 403
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401

    if not user_has_feature(user_id, "email_integration"):
        return jsonify({"error": "Email sending is available on Pro plan."}), 403

    data = request.get_json() or {}

    lead_id = data.get("leadId")
    to_email = data.get("to", "").strip()
    subject = data.get("subject", "Message from AutoClient").strip()
    message = data.get("message", "").strip()
    business_name = data.get("businessName", "Lead")

    if not RESEND_API_KEY:
       return jsonify({"error": "Email service is temporarily unavailable"}), 500

    if not to_email:
        return jsonify({"error": "Recipient email is required"}), 400

    if "@" not in to_email:
        return jsonify({"error": "Invalid recipient email address"}), 400

    if not message:
        return jsonify({"error": "Email message is required"}), 400

    try:
        response = requests.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "from": RESEND_FROM_EMAIL,
                "to": [to_email],
                "subject": subject,
                "text": message
            },
            timeout=15
        )

        try:
            result = response.json()
        except Exception:
            result = {"raw": response.text}

        if response.status_code >= 400:
            print("Resend email request failed")
            return jsonify({
                "error": result.get("message", "Email failed to send"),
                "details": result
            }), response.status_code

        log_activity(
            user_id,
            lead_id,
            "Email Sent",
            f"Email sent to {business_name} at {to_email}."
        )

        return jsonify({
            "message": "Email sent successfully",
            "resend": result
        }), 200

    except Exception:
        print("Email send failed")
        return jsonify({"error": "Email sending failed"}), 500

@app.route("/api/find-leads", methods=["POST"])
@limiter.limit("30 per hour")
def find_leads():
    if not is_trusted_origin():
        return jsonify({"error": "Invalid request origin"}), 403
    
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401

    if not user_has_feature(user_id, "lead_finder"):
        return jsonify({"error": "Lead finder is not available on your plan."}), 403

    data = request.get_json() or {}

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

    log_activity(
        user_id,
        None,
        "Lead Ideas Generated",
        f"Generated lead ideas for {industry} in {location}."
    )

    return jsonify(leads)

@app.route("/api/admin/stats", methods=["GET"])
def admin_stats():
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401

    if not is_admin_user(user_id):
        return jsonify({"error": "Admin access required"}), 403

    total_users = execute_query(
        "SELECT COUNT(*) AS count FROM users",
        fetchone=True
    )
    total_leads = execute_query(
        "SELECT COUNT(*) AS count FROM leads",
        fetchone=True
    )
    new_leads = execute_query(
        "SELECT COUNT(*) AS count FROM leads WHERE status = 'New'",
        fetchone=True
    )
    interested = execute_query(
        "SELECT COUNT(*) AS count FROM leads WHERE status = 'Interested'",
        fetchone=True
    )
    closed = execute_query(
        "SELECT COUNT(*) AS count FROM leads WHERE status = 'Closed'",
        fetchone=True
    )
    pro_users = execute_query(
        "SELECT COUNT(*) AS count FROM users WHERE plan = 'pro'",
        fetchone=True
    )

    return jsonify({
        "totalUsers": row_to_dict(total_users)["count"],
        "totalLeads": row_to_dict(total_leads)["count"],
        "newLeads": row_to_dict(new_leads)["count"],
        "interestedLeads": row_to_dict(interested)["count"],
        "closedLeads": row_to_dict(closed)["count"],
        "proUsers": row_to_dict(pro_users)["count"]
    })


@app.route("/api/admin/users", methods=["GET"])
def admin_users():
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401

    if not is_admin_user(user_id):
        return jsonify({"error": "Admin access required"}), 403

    users = execute_query("""
        SELECT id, name, email, createdAt, plan, subscription_status
        FROM users
        ORDER BY id DESC
    """, fetchall=True)

    return jsonify([row_to_dict(user) for user in users])


@app.route("/api/admin/leads", methods=["GET"])
def admin_leads():
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401

    if not is_admin_user(user_id):
        return jsonify({"error": "Admin access required"}), 403

    leads = execute_query("""
        SELECT leads.*, users.name AS ownerName, users.email AS ownerEmail
        FROM leads
        LEFT JOIN users ON leads.userId = users.id
        ORDER BY leads.id DESC
    """, fetchall=True)

    return jsonify([row_to_dict(lead) for lead in leads])

@app.route("/<path:path>")
def serve_static(path):
    if os.path.exists(path):
        return send_from_directory(".", path)

    return send_from_directory("static", path)


init_db()

if __name__ == "__main__":
    app.run(debug=False)