import os
import sqlite3
from datetime import datetime

import requests
import stripe
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from werkzeug.security import check_password_hash, generate_password_hash

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

RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
RESEND_FROM_EMAIL = os.environ.get("RESEND_FROM_EMAIL", "onboarding@resend.dev")

STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY")
STRIPE_PRO_PRICE_ID = os.environ.get("STRIPE_PRO_PRICE_ID")
STRIPE_AGENCY_PRICE_ID = os.environ.get("STRIPE_AGENCY_PRICE_ID")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET")

FRONTEND_URL = os.environ.get(
    "FRONTEND_URL",
    "https://austinprinsloo32-netizen.github.io/AutoClient"
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

    add_column_if_missing("users", "plan", "TEXT DEFAULT 'free'")
    add_column_if_missing("users", "stripe_customer_id", "TEXT")
    add_column_if_missing("users", "stripe_subscription_id", "TEXT")
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


def plan_from_price_id(price_id):
    if STRIPE_AGENCY_PRICE_ID and price_id == STRIPE_AGENCY_PRICE_ID:
        return "agency"

    if STRIPE_PRO_PRICE_ID and price_id == STRIPE_PRO_PRICE_ID:
        return "pro"

    return "free"


def is_admin_user(user_id):
    user = get_user_by_id(user_id)

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
    return send_from_directory(".", "landing.html")


@app.route("/app")
def app_dashboard():
    return send_from_directory(".", "index.html")


@app.route("/api/status")
def status():
    return jsonify({
        "message": "AutoClient V2 backend is running",
        "database": "PostgreSQL" if USING_POSTGRES else "SQLite",
        "status": "success",
        "stripeConfigured": bool(STRIPE_SECRET_KEY),
        "billing": "enabled"
    })


# ================= AUTH =================

@app.route("/api/register", methods=["POST"])
def register():
    data = request.get_json() or {}

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
                INSERT INTO users (
                    name, email, password, createdAt,
                    plan, subscription_status
                )
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id, name, email, createdAt, plan, subscription_status
            """, (
                name,
                email,
                hashed_password,
                created_at,
                "free",
                "inactive"
            ), fetchone=True, commit=True)

            user = row_to_dict(user)

        else:
            conn = get_db_connection()
            cursor = conn.cursor()

            cursor.execute("""
                INSERT INTO users (
                    name, email, password, createdAt,
                    plan, subscription_status
                )
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                name,
                email,
                hashed_password,
                created_at,
                "free",
                "inactive"
            ))

            conn.commit()
            user_id = cursor.lastrowid
            cursor.close()
            conn.close()

            user = {
                "id": user_id,
                "name": name,
                "email": email,
                "createdAt": created_at,
                "plan": "free",
                "subscription_status": "inactive"
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
            "user": {
                "id": user["id"],
                "name": user["name"],
                "email": user["email"],
                "createdAt": get_field(user, "createdAt"),
                "isAdmin": user["isAdmin"],
                "plan": get_field(user, "plan", "free"),
                "subscriptionStatus": get_field(user, "subscription_status", "inactive")
            }
        }), 201

    except Exception as e:
        error_text = str(e).lower()

        if "unique" in error_text or "duplicate" in error_text:
            return jsonify({"error": "Email already exists"}), 409

        print("Register error:", e)
        return jsonify({"error": "Registration failed"}), 500


@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json() or {}

    email = data.get("email", "").strip().lower()
    password = data.get("password", "").strip()

    user = get_user_by_email(email)

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
            "createdAt": get_field(user, "createdAt"),
            "isAdmin": user["email"].lower() == ADMIN_EMAIL,
            "plan": get_field(user, "plan", "free"),
            "subscriptionStatus": get_field(user, "subscription_status", "inactive")
        }
    })


# ================= BILLING =================

@app.route("/api/my-plan", methods=["GET"])
def my_plan():
    user_id = request.args.get("userId")

    if not user_id:
        return jsonify({"error": "userId is required"}), 400

    user = get_user_by_id(user_id)

    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify(get_user_plan_data(user))


@app.route("/api/create-checkout-session", methods=["POST"])
def create_checkout_session():
    if not STRIPE_SECRET_KEY:
        return jsonify({"error": "STRIPE_SECRET_KEY is not configured in Render"}), 500

    data = request.get_json() or {}

    user_id = data.get("userId")
    selected_plan = normalize_plan(data.get("plan", "pro"))

    if selected_plan == "free":
        selected_plan = "pro"

    if not user_id:
        return jsonify({"error": "userId is required"}), 400

    user = get_user_by_id(user_id)

    if not user:
        return jsonify({"error": "User not found"}), 404

    if selected_plan == "agency":
        price_id = STRIPE_AGENCY_PRICE_ID
    else:
        selected_plan = "pro"
        price_id = STRIPE_PRO_PRICE_ID

    if not price_id:
        return jsonify({"error": f"Stripe price ID for {selected_plan} is not configured in Render"}), 500

    try:
        stripe_customer_id = get_field(user, "stripe_customer_id", "")

        customer_data = None

        if not stripe_customer_id:
            customer_data = {
                "email": user["email"],
                "name": user["name"],
                "metadata": {
                    "userId": str(user_id)
                }
            }

        checkout_session = stripe.checkout.Session.create(
            mode="subscription",
            customer=stripe_customer_id if stripe_customer_id else None,
            customer_email=None if stripe_customer_id else user["email"],
            customer_creation="always" if not stripe_customer_id else None,
            customer_update={
                "name": "auto",
                "address": "auto"
            } if stripe_customer_id else None,
            line_items=[
                {
                    "price": price_id,
                    "quantity": 1
                }
            ],
            metadata={
                "userId": str(user_id),
                "plan": selected_plan
            },
            subscription_data={
                "metadata": {
                    "userId": str(user_id),
                    "plan": selected_plan
                }
            },
            success_url=f"{FRONTEND_URL}/index.html?billing=success",
            cancel_url=f"{FRONTEND_URL}/index.html?billing=cancelled"
        )

        return jsonify({"url": checkout_session.url})

    except Exception as e:
        print("Stripe checkout error:", e)
        return jsonify({"error": "Could not create checkout session"}), 500


@app.route("/api/create-billing-portal-session", methods=["POST"])
def create_billing_portal_session():
    if not STRIPE_SECRET_KEY:
        return jsonify({"error": "STRIPE_SECRET_KEY is not configured"}), 500

    data = request.get_json() or {}
    user_id = data.get("userId")

    if not user_id:
        return jsonify({"error": "userId is required"}), 400

    user = get_user_by_id(user_id)

    if not user:
        return jsonify({"error": "User not found"}), 404

    stripe_customer_id = get_field(user, "stripe_customer_id", "")

    if not stripe_customer_id:
        return jsonify({
            "error": "No Stripe customer found yet. Upgrade first, then billing management will become available."
        }), 400

    try:
        portal_session = stripe.billing_portal.Session.create(
            customer=stripe_customer_id,
            return_url=f"{FRONTEND_URL}/index.html"
        )

        return jsonify({"url": portal_session.url})

    except Exception as e:
        print("Stripe portal error:", e)
        return jsonify({"error": "Could not create billing portal session"}), 500


@app.route("/stripe-webhook", methods=["POST"])
def stripe_webhook():
    payload = request.data
    sig_header = request.headers.get("Stripe-Signature")

    if not STRIPE_WEBHOOK_SECRET:
        return jsonify({"error": "STRIPE_WEBHOOK_SECRET is not configured"}), 500

    try:
        event = stripe.Webhook.construct_event(
            payload,
            sig_header,
            STRIPE_WEBHOOK_SECRET
        )
    except Exception as e:
        print("Stripe webhook verification failed:", e)
        return jsonify({"error": "Webhook verification failed"}), 400

    event_type = event["type"]
    data_object = event["data"]["object"]

    if event_type == "checkout.session.completed":
        user_id = data_object.get("metadata", {}).get("userId")
        plan = data_object.get("metadata", {}).get("plan", "pro")
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

    elif event_type == "customer.subscription.created":
        subscription_id = data_object.get("id")
        customer_id = data_object.get("customer")
        status = data_object.get("status", "active")
        metadata = data_object.get("metadata", {})
        user_id = metadata.get("userId")
        plan = normalize_plan(metadata.get("plan", "pro"))

        if user_id:
            update_user_subscription(
                user_id=user_id,
                plan=plan,
                stripe_customer_id=customer_id,
                stripe_subscription_id=subscription_id,
                subscription_status=status
            )

    elif event_type == "customer.subscription.updated":
        subscription_id = data_object.get("id")
        status = data_object.get("status")
        items = data_object.get("items", {}).get("data", [])

        plan = "free"

        if status in ["active", "trialing"] and items:
            price_id = items[0].get("price", {}).get("id")
            plan = plan_from_price_id(price_id)

        update_subscription_by_stripe_id(
            stripe_subscription_id=subscription_id,
            plan=plan,
            subscription_status=status
        )

    elif event_type == "customer.subscription.deleted":
        subscription_id = data_object.get("id")

        update_subscription_by_stripe_id(
            stripe_subscription_id=subscription_id,
            plan="free",
            subscription_status="cancelled"
        )

    elif event_type == "invoice.payment_succeeded":
        subscription_id = data_object.get("subscription")

        if subscription_id:
            try:
                subscription = stripe.Subscription.retrieve(subscription_id)
                items = subscription.get("items", {}).get("data", [])
                status = subscription.get("status", "active")

                plan = "pro"

                if items:
                    price_id = items[0].get("price", {}).get("id")
                    plan = plan_from_price_id(price_id)

                update_subscription_by_stripe_id(
                    stripe_subscription_id=subscription_id,
                    plan=plan,
                    subscription_status=status
                )
            except Exception as e:
                print("Invoice success subscription lookup error:", e)

    elif event_type == "invoice.payment_failed":
        subscription_id = data_object.get("subscription")

        if subscription_id:
            update_subscription_by_stripe_id(
                stripe_subscription_id=subscription_id,
                plan="free",
                subscription_status="past_due"
            )

    return jsonify({"received": True})


@app.route("/billing-success")
def billing_success():
    return """
    <html>
      <head>
        <title>Payment Successful</title>
      </head>
      <body style="font-family:Arial;display:grid;place-items:center;min-height:100vh;background:#f8fafc;">
        <div style="background:white;padding:40px;border-radius:24px;text-align:center;box-shadow:0 20px 50px rgba(15,23,42,.12);">
          <h1>✅ Payment Successful</h1>
          <p>Your AutoClient subscription was created successfully.</p>
          <a href="/app" style="display:inline-block;margin-top:20px;background:#2563eb;color:white;padding:14px 22px;border-radius:999px;text-decoration:none;font-weight:800;">Open AutoClient</a>
        </div>
      </body>
    </html>
    """


@app.route("/billing-cancelled")
def billing_cancelled():
    return """
    <html>
      <head>
        <title>Payment Cancelled</title>
      </head>
      <body style="font-family:Arial;display:grid;place-items:center;min-height:100vh;background:#f8fafc;">
        <div style="background:white;padding:40px;border-radius:24px;text-align:center;box-shadow:0 20px 50px rgba(15,23,42,.12);">
          <h1>Payment Cancelled</h1>
          <p>No payment was made.</p>
          <a href="/" style="display:inline-block;margin-top:20px;background:#2563eb;color:white;padding:14px 22px;border-radius:999px;text-decoration:none;font-weight:800;">Back to Landing Page</a>
        </div>
      </body>
    </html>
    """


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
    data = request.get_json() or {}

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
    data = request.get_json() or {}

    user_id = data.get("userId")

    if not user_id:
        return jsonify({"error": "userId is required"}), 400

    user = get_user_by_id(user_id)

    if not user:
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
        business_name = get_field(lead_dict, "businessName", data.get("businessName"))

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

    return jsonify({"id": lead_id, **data}), 201


@app.route("/api/leads/<int:lead_id>", methods=["PUT"])
def update_lead(lead_id):
    data = request.get_json() or {}

    p = placeholder()

    old_lead = execute_query(
        f"SELECT * FROM leads WHERE id = {p}",
        (lead_id,),
        fetchone=True
    )

    old_lead = row_to_dict(old_lead)
    old_status = old_lead.get("status") if old_lead else None
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
            business_name = get_field(
                lead_dict,
                "businessName",
                data.get("businessName") or "Lead"
            )

            if old_status and new_status and old_status != new_status:
                log_activity(
                    data.get("userId"),
                    lead_id,
                    "Lead Status Changed",
                    f"{business_name} moved from {old_status} to {new_status}."
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

    business_name = data.get("businessName") or "Lead"

    if old_status and new_status and old_status != new_status:
        log_activity(
            data.get("userId"),
            lead_id,
            "Lead Status Changed",
            f"{business_name} moved from {old_status} to {new_status}."
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
            f"{business_name} was updated."
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
        user_id = get_field(lead, "userId")
        business_name = get_field(lead, "businessName", "Lead")

        log_activity(
            user_id,
            lead_id,
            "Lead Deleted",
            f"{business_name} was deleted from your CRM."
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
    data = request.get_json() or {}

    user_id = data.get("userId")

    if user_id and not user_has_feature(user_id, "ai_outreach"):
        return jsonify({"error": "AI outreach is available on Pro or Agency plans."}), 403

    business = data.get("businessName")
    service = data.get("service", "my services")
    notes = data.get("notes", "")
    style = data.get("style", "formal")
    name = data.get("userName", "AutoClient User")
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


@app.route("/api/send-email", methods=["POST"])
def send_email():
    data = request.get_json() or {}

    user_id = data.get("userId")

    if user_id and not user_has_feature(user_id, "email_integration"):
        return jsonify({"error": "Email sending is available on Pro or Agency plans."}), 403

    lead_id = data.get("leadId")
    to_email = data.get("to", "").strip()
    subject = data.get("subject", "Message from AutoClient").strip()
    message = data.get("message", "").strip()
    business_name = data.get("businessName", "Lead")

    if not RESEND_API_KEY:
        return jsonify({"error": "RESEND_API_KEY is not configured in Render"}), 500

    if not user_id:
        return jsonify({"error": "userId is required"}), 400

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
            print("Resend error:", result)
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

    except Exception as e:
        print("Email send error:", e)
        return jsonify({"error": "Email sending failed"}), 500


@app.route("/api/find-leads", methods=["POST"])
def find_leads():
    data = request.get_json() or {}

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
    pro_users = execute_query("SELECT COUNT(*) AS count FROM users WHERE plan = 'pro'", fetchone=True)
    agency_users = execute_query("SELECT COUNT(*) AS count FROM users WHERE plan = 'agency'", fetchone=True)

    return jsonify({
        "totalUsers": row_to_dict(total_users)["count"],
        "totalLeads": row_to_dict(total_leads)["count"],
        "newLeads": row_to_dict(new_leads)["count"],
        "interestedLeads": row_to_dict(interested)["count"],
        "closedLeads": row_to_dict(closed)["count"],
        "proUsers": row_to_dict(pro_users)["count"],
        "agencyUsers": row_to_dict(agency_users)["count"]
    })


@app.route("/api/admin/users", methods=["GET"])
def admin_users():
    user_id = request.args.get("userId")

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


@app.route("/<path:path>")
def serve_static(path):
    if os.path.exists(path):
        return send_from_directory(".", path)

    return send_from_directory("static", path)


init_db()

if __name__ == "__main__":
    app.run(debug=True)