import pytest

import app as autoclient


@pytest.fixture
def authenticated_pro_client(monkeypatch):
    """
    Create a Flask test client that behaves like an
    authenticated Pro user without touching the real database.
    """

    autoclient.app.config["TESTING"] = True

    monkeypatch.setattr(
        autoclient,
        "is_trusted_origin",
        lambda: True
    )

    monkeypatch.setattr(
        autoclient,
        "user_has_feature",
        lambda user_id, feature_name: True
    )

    with autoclient.app.test_client() as client:
        with client.session_transaction() as session:
            session["user_id"] = 999999

        yield client


def test_generate_message_requires_login(monkeypatch):
    """
    Unauthenticated users must not be able to
    generate outreach messages.
    """

    autoclient.app.config["TESTING"] = True

    monkeypatch.setattr(
        autoclient,
        "is_trusted_origin",
        lambda: True
    )

    with autoclient.app.test_client() as client:
        response = client.post(
            "/api/generate-message",
            json={
                "businessName": "Security Test Lead",
                "service": "web development",
                "status": "new"
            }
        )

    assert response.status_code == 401

    data = response.get_json()

    assert data is not None
    assert data["error"] == "Not authenticated"


@pytest.mark.parametrize(
    "status",
    [
        "closed",
        "lost",
        "rejected"
    ]
)
def test_closed_status_blocks_outreach(
    authenticated_pro_client,
    status
):
    """
    Closed, lost and rejected CRM statuses must
    never generate active outreach.
    """

    response = authenticated_pro_client.post(
        "/api/generate-message",
        json={
            "businessName": "Security Test Lead",
            "service": "web development",
            "style": "formal",
            "userName": "Test User",
            "status": status,
            "followUpState": ""
        }
    )

    assert response.status_code == 400

    data = response.get_json()

    assert data is not None
    assert "error" in data

    assert (
        "closed or rejected"
        in data["error"].lower()
    )

    assert "message" not in data


def test_closed_follow_up_state_blocks_outreach(
    authenticated_pro_client
):
    """
    Follow-Up Intelligence must also be able to
    block outreach even if the lead status itself
    does not say Closed.
    """

    response = authenticated_pro_client.post(
        "/api/generate-message",
        json={
            "businessName": "Security Test Lead",
            "service": "web development",
            "style": "formal",
            "userName": "Test User",
            "status": "new",
            "followUpState": "closed_or_rejected"
        }
    )

    assert response.status_code == 400

    data = response.get_json()

    assert data is not None
    assert "error" in data

    assert (
        "closed or rejected"
        in data["error"].lower()
    )

    assert "message" not in data


def test_user_cannot_update_another_users_lead(
    authenticated_pro_client,
    monkeypatch
):
    """
    A logged-in user must not be able to update
    a lead that does not belong to them.
    """

    database_calls = []

    def fake_execute_query(
        query,
        params=(),
        fetchone=False,
        fetchall=False,
        commit=False
    ):
        database_calls.append({
            "query": query,
            "params": params,
            "fetchone": fetchone,
            "fetchall": fetchall,
            "commit": commit
        })

        # Simulate the ownership lookup finding no lead
        # belonging to the logged-in user.
        return None

    monkeypatch.setattr(
        autoclient,
        "execute_query",
        fake_execute_query
    )

    response = authenticated_pro_client.put(
        "/api/leads/12345",
        json={
            "businessName": "Another User Lead",
            "link": "",
            "contact": "test@example.com",
            "priority": "Hot",
            "notes": "Should never be changed",
            "status": "Interested",
            "createdAt": "2026-09-06",
            "lastContacted": "",
            "nextFollowUp": ""
        }
    )

    assert response.status_code == 404

    data = response.get_json()

    assert data is not None
    assert data["error"] == "Lead not found"

    # The route should stop after the ownership lookup.
    assert len(database_calls) == 1

    lookup = database_calls[0]

    assert lookup["fetchone"] is True
    assert lookup["commit"] is False

    # The ownership query must include both the
    # lead ID and logged-in user ID.
    assert lookup["params"] == (
        12345,
        999999
    )

    # No UPDATE query should ever have been executed.
    assert not any(
        "UPDATE leads" in call["query"]
        for call in database_calls
    )


def test_user_cannot_delete_another_users_lead(
    authenticated_pro_client,
    monkeypatch
):
    """
    A logged-in user must not be able to delete
    a lead that does not belong to them.
    """

    database_calls = []

    def fake_execute_query(
        query,
        params=(),
        fetchone=False,
        fetchall=False,
        commit=False
    ):
        database_calls.append({
            "query": query,
            "params": params,
            "fetchone": fetchone,
            "fetchall": fetchall,
            "commit": commit
        })

        # Simulate the ownership lookup finding no lead
        # belonging to the logged-in user.
        return None

    monkeypatch.setattr(
        autoclient,
        "execute_query",
        fake_execute_query
    )

    response = authenticated_pro_client.delete(
        "/api/leads/12345"
    )

    assert response.status_code == 404

    data = response.get_json()

    assert data is not None
    assert data["error"] == "Lead not found"

    # The route should stop after the ownership lookup.
    assert len(database_calls) == 1

    lookup = database_calls[0]

    assert lookup["fetchone"] is True
    assert lookup["commit"] is False

    assert lookup["params"] == (
        12345,
        999999
    )

    # No DELETE query should ever have been executed.
    assert not any(
        "DELETE FROM leads" in call["query"]
        for call in database_calls
    )

def test_user_can_update_own_lead(
    authenticated_pro_client,
    monkeypatch
):
    """
    A logged-in user must be able to update
    a lead that belongs to them.
    """

    database_calls = []

    owned_lead = {
        "id": 12345,
        "userId": 999999,
        "businessName": "My Test Lead",
        "status": "New"
    }

    def fake_execute_query(
        query,
        params=(),
        fetchone=False,
        fetchall=False,
        commit=False
    ):
        database_calls.append({
            "query": query,
            "params": params,
            "fetchone": fetchone,
            "fetchall": fetchall,
            "commit": commit
        })

        if (
            "SELECT * FROM leads" in query
            and fetchone
        ):
            return owned_lead

        return None

    monkeypatch.setattr(
        autoclient,
        "execute_query",
        fake_execute_query
    )

    response = authenticated_pro_client.put(
        "/api/leads/12345",
        json={
            "businessName": "Updated Test Lead",
            "link": "",
            "contact": "test@example.com",
            "priority": "Hot",
            "notes": "Safe test data",
            "status": "Interested",
            "createdAt": "2026-09-06",
            "lastContacted": "",
            "nextFollowUp": ""
        }
    )

    assert response.status_code == 200

    assert any(
        "UPDATE leads" in call["query"]
        and call["commit"] is True
        for call in database_calls
    )

    update_calls = [
        call
        for call in database_calls
        if "UPDATE leads" in call["query"]
    ]

    assert len(update_calls) == 1

    update_call = update_calls[0]

    # The final parameters must scope the update
    # to this lead AND the logged-in owner.
    assert update_call["params"][-2:] == (
        12345,
        999999
    )


def test_user_can_delete_own_lead(
    authenticated_pro_client,
    monkeypatch
):
    """
    A logged-in user must be able to delete
    a lead that belongs to them.
    """

    database_calls = []

    owned_lead = {
        "id": 12345,
        "userId": 999999,
        "businessName": "My Test Lead",
        "status": "New"
    }

    def fake_execute_query(
        query,
        params=(),
        fetchone=False,
        fetchall=False,
        commit=False
    ):
        database_calls.append({
            "query": query,
            "params": params,
            "fetchone": fetchone,
            "fetchall": fetchall,
            "commit": commit
        })

        if (
            "SELECT * FROM leads" in query
            and fetchone
        ):
            return owned_lead

        return None

    monkeypatch.setattr(
        autoclient,
        "execute_query",
        fake_execute_query
    )

    response = authenticated_pro_client.delete(
        "/api/leads/12345"
    )

    assert response.status_code == 200

    data = response.get_json()

    assert data is not None
    assert data["message"] == "Lead deleted"

    delete_calls = [
        call
        for call in database_calls
        if "DELETE FROM leads" in call["query"]
    ]

    assert len(delete_calls) == 1

    delete_call = delete_calls[0]

    assert delete_call["commit"] is True

    assert delete_call["params"] == (
        12345,
        999999
    )


def test_free_user_cannot_generate_smart_outreach(
    monkeypatch
):
    """
    An authenticated Free user must not be able
    to access the Pro Smart Outreach feature.
    """

    autoclient.app.config["TESTING"] = True

    monkeypatch.setattr(
        autoclient,
        "is_trusted_origin",
        lambda: True
    )

    monkeypatch.setattr(
        autoclient,
        "user_has_feature",
        lambda user_id, feature_name: False
    )

    with autoclient.app.test_client() as client:
        with client.session_transaction() as session:
            session["user_id"] = 999999

        response = client.post(
            "/api/generate-message",
            json={
                "businessName": "Free Plan Test",
                "service": "web development",
                "style": "formal",
                "userName": "Test User",
                "status": "new",
                "followUpState": "not_contacted"
            }
        )

    assert response.status_code == 403

    data = response.get_json()

    assert data is not None
    assert "error" in data

    assert (
        "pro plan"
        in data["error"].lower()
    )

    assert "message" not in data


def test_pro_user_can_generate_smart_outreach(
    authenticated_pro_client,
    monkeypatch
):
    """
    An authenticated Pro user must be able to
    generate outreach for an active lead.
    """

    activity_calls = []

    def fake_log_activity(
        user_id,
        lead_id,
        action,
        details=""
    ):
        activity_calls.append({
            "user_id": user_id,
            "lead_id": lead_id,
            "action": action,
            "details": details
        })

    monkeypatch.setattr(
        autoclient,
        "log_activity",
        fake_log_activity
    )

    response = authenticated_pro_client.post(
        "/api/generate-message",
        json={
            "businessName": "Pro Plan Test",
            "service": "web development",
            "style": "formal",
            "userName": "Test User",
            "leadId": 12345,
            "status": "new",
            "followUpState": "not_contacted"
        }
    )

    assert response.status_code == 200

    data = response.get_json()

    assert data is not None

    assert "message" in data
    assert data["message"].strip() != ""

    assert (
        data["smartFollowUpType"]
        == "first_contact"
    )

    assert len(activity_calls) == 1

    assert (
        activity_calls[0]["action"]
        == "Smart Outreach Generated"
    )

    assert activity_calls[0]["user_id"] == 999999
    assert activity_calls[0]["lead_id"] == 12345

@pytest.fixture
def authenticated_email_client(monkeypatch):
    """
    Create an authenticated Pro test client for
    testing the email endpoint without using the
    real database.
    """

    autoclient.app.config["TESTING"] = True

    monkeypatch.setattr(
        autoclient,
        "is_trusted_origin",
        lambda: True
    )

    monkeypatch.setattr(
        autoclient,
        "user_has_feature",
        lambda user_id, feature_name: True
    )

    monkeypatch.setattr(
        autoclient,
        "RESEND_API_KEY",
        "test-resend-key"
    )

    with autoclient.app.test_client() as client:
        with client.session_transaction() as session:
            session["user_id"] = 999999

        yield client


def test_user_cannot_email_another_users_lead(
    authenticated_email_client,
    monkeypatch
):
    """
    A user must not be able to send email using
    a lead that does not belong to them.
    """

    monkeypatch.setattr(
        autoclient,
        "get_lead_by_id",
        lambda lead_id, user_id: None
    )

    email_request_called = False

    def fake_post(*args, **kwargs):
        nonlocal email_request_called
        email_request_called = True

        raise AssertionError(
            "External email request should not occur"
        )

    monkeypatch.setattr(
        autoclient.requests,
        "post",
        fake_post
    )

    response = authenticated_email_client.post(
        "/api/send-email",
        json={
            "leadId": 12345,
            "to": "lead@example.com",
            "subject": "Test",
            "message": "Test message"
        }
    )

    assert response.status_code == 404

    data = response.get_json()

    assert data is not None
    assert data["error"] == "Lead not found"

    assert email_request_called is False


@pytest.mark.parametrize(
    "status",
    [
        "Closed",
        "Lost",
        "Rejected"
    ]
)
def test_closed_lead_cannot_be_emailed(
    authenticated_email_client,
    monkeypatch,
    status
):
    """
    Closed, Lost and Rejected leads must not
    be allowed through the email endpoint.
    """

    lead = {
        "id": 12345,
        "userId": 999999,
        "businessName": "Closed Lead Test",
        "status": status
    }

    monkeypatch.setattr(
        autoclient,
        "get_lead_by_id",
        lambda lead_id, user_id: lead
    )

    email_request_called = False

    def fake_post(*args, **kwargs):
        nonlocal email_request_called
        email_request_called = True

        raise AssertionError(
            "External email request should not occur"
        )

    monkeypatch.setattr(
        autoclient.requests,
        "post",
        fake_post
    )

    response = authenticated_email_client.post(
        "/api/send-email",
        json={
            "leadId": 12345,
            "to": "lead@example.com",
            "subject": "Test",
            "message": "Test message"
        }
    )

    assert response.status_code == 400

    data = response.get_json()

    assert data is not None

    assert (
        "closed or rejected"
        in data["error"].lower()
    )

    assert email_request_called is False


def test_active_owned_lead_can_reach_email_service(
    authenticated_email_client,
    monkeypatch
):
    """
    A valid active lead owned by the logged-in
    user should be allowed to reach the email
    provider.
    """

    lead = {
        "id": 12345,
        "userId": 999999,
        "businessName": "Active Lead Test",
        "status": "New"
    }

    monkeypatch.setattr(
        autoclient,
        "get_lead_by_id",
        lambda lead_id, user_id: lead
    )

    activity_calls = []

    def fake_log_activity(
        user_id,
        lead_id,
        action,
        details=""
    ):
        activity_calls.append({
            "user_id": user_id,
            "lead_id": lead_id,
            "action": action,
            "details": details
        })

    monkeypatch.setattr(
        autoclient,
        "log_activity",
        fake_log_activity
    )

    email_requests = []

    class FakeEmailResponse:
        status_code = 200
        text = ""

        def json(self):
            return {
                "id": "test-email-id"
            }

    def fake_post(
        url,
        headers=None,
        json=None,
        timeout=None
    ):
        email_requests.append({
            "url": url,
            "headers": headers,
            "json": json,
            "timeout": timeout
        })

        return FakeEmailResponse()

    monkeypatch.setattr(
        autoclient.requests,
        "post",
        fake_post
    )

    response = authenticated_email_client.post(
        "/api/send-email",
        json={
            "leadId": 12345,
            "to": "lead@example.com",
            "subject": "AutoClient Test",
            "message": "This is a safe automated test."
        }
    )

    assert response.status_code == 200

    data = response.get_json()

    assert data is not None
    assert data["message"] == "Email sent successfully"

    assert len(email_requests) == 1

    email_request = email_requests[0]

    assert (
        email_request["url"]
        == "https://api.resend.com/emails"
    )

    assert email_request["json"]["to"] == [
        "lead@example.com"
    ]

    assert (
        email_request["json"]["subject"]
        == "AutoClient Test"
    )

    assert (
        email_request["json"]["text"]
        == "This is a safe automated test."
    )

    assert len(activity_calls) == 1

    assert (
        activity_calls[0]["action"]
        == "Email Sent"
    )

    assert activity_calls[0]["user_id"] == 999999
    assert activity_calls[0]["lead_id"] == 12345

def test_user_cannot_log_activity_for_another_users_lead(
    authenticated_pro_client,
    monkeypatch
):
    """
    A user must not be able to create an activity
    linked to a lead that does not belong to them.
    """

    lookup_calls = []
    activity_calls = []

    def fake_get_lead_by_id(
        lead_id,
        user_id
    ):
        lookup_calls.append(
            (lead_id, user_id)
        )

        return None

    def fake_log_activity(
        user_id,
        lead_id,
        action,
        details=""
    ):
        activity_calls.append({
            "user_id": user_id,
            "lead_id": lead_id,
            "action": action,
            "details": details
        })

    monkeypatch.setattr(
        autoclient,
        "get_lead_by_id",
        fake_get_lead_by_id
    )

    monkeypatch.setattr(
        autoclient,
        "log_activity",
        fake_log_activity
    )

    response = authenticated_pro_client.post(
        "/api/activities/log",
        json={
            "leadId": 12345,
            "action": "Manual Note",
            "details": "Security test"
        }
    )

    assert response.status_code == 404

    data = response.get_json()

    assert data is not None
    assert data["error"] == "Lead not found"

    assert lookup_calls == [
        (12345, 999999)
    ]

    assert activity_calls == []


def test_user_can_log_activity_for_own_lead(
    authenticated_pro_client,
    monkeypatch
):
    """
    A user should still be able to create an
    activity for a lead they own.
    """

    activity_calls = []

    monkeypatch.setattr(
        autoclient,
        "get_lead_by_id",
        lambda lead_id, user_id: {
            "id": lead_id,
            "userId": user_id,
            "businessName": "Owned Lead",
            "status": "New"
        }
    )

    def fake_log_activity(
        user_id,
        lead_id,
        action,
        details=""
    ):
        activity_calls.append({
            "user_id": user_id,
            "lead_id": lead_id,
            "action": action,
            "details": details
        })

    monkeypatch.setattr(
        autoclient,
        "log_activity",
        fake_log_activity
    )

    response = authenticated_pro_client.post(
        "/api/activities/log",
        json={
            "leadId": 12345,
            "action": "Manual Note",
            "details": "Owned lead test"
        }
    )

    assert response.status_code == 201

    data = response.get_json()

    assert data is not None

    assert (
        data["message"]
        == "Activity logged successfully"
    )

    assert len(activity_calls) == 1

    assert (
        activity_calls[0]["user_id"]
        == 999999
    )

    assert (
        activity_calls[0]["lead_id"]
        == 12345
    )

    assert (
        activity_calls[0]["action"]
        == "Manual Note"
    )


def test_user_can_log_activity_without_lead(
    authenticated_pro_client,
    monkeypatch
):
    """
    General activities that are not linked to a
    lead should continue to work.
    """

    activity_calls = []

    def fake_get_lead_by_id(
        lead_id,
        user_id
    ):
        raise AssertionError(
            "Lead lookup should not occur"
        )

    def fake_log_activity(
        user_id,
        lead_id,
        action,
        details=""
    ):
        activity_calls.append({
            "user_id": user_id,
            "lead_id": lead_id,
            "action": action,
            "details": details
        })

    monkeypatch.setattr(
        autoclient,
        "get_lead_by_id",
        fake_get_lead_by_id
    )

    monkeypatch.setattr(
        autoclient,
        "log_activity",
        fake_log_activity
    )

    response = authenticated_pro_client.post(
        "/api/activities/log",
        json={
            "action": "General Activity",
            "details": "No lead attached"
        }
    )

    assert response.status_code == 201

    data = response.get_json()

    assert data is not None

    assert (
        data["message"]
        == "Activity logged successfully"
    )

    assert len(activity_calls) == 1
    assert activity_calls[0]["lead_id"] is None

@pytest.fixture
def registration_client(monkeypatch):
    """
    Create a test client for registration validation
    without touching the real user database.
    """

    autoclient.app.config["TESTING"] = True

    monkeypatch.setattr(
        autoclient,
        "get_user_by_email",
        lambda email: None
    )

    with autoclient.app.test_client() as client:
        yield client


def test_registration_rejects_name_over_100_characters(
    registration_client
):
    response = registration_client.post(
        "/api/register",
        json={
            "name": "A" * 101,
            "email": "test@example.com",
            "password": "password123"
        },
        environ_overrides={
            "REMOTE_ADDR": "127.0.0.101"
        }
    )

    assert response.status_code == 400

    data = response.get_json()

    assert data is not None
    assert (
        data["error"]
        == "Name must be 100 characters or fewer"
    )


def test_registration_rejects_password_under_8_characters(
    registration_client
):
    response = registration_client.post(
        "/api/register",
        json={
            "name": "Test User",
            "email": "test@example.com",
            "password": "short"
        },
        environ_overrides={
            "REMOTE_ADDR": "127.0.0.102"
        }
    )

    assert response.status_code == 400

    data = response.get_json()

    assert data is not None
    assert (
        data["error"]
        == "Password must be at least 8 characters long"
    )


def test_registration_rejects_password_over_128_characters(
    registration_client
):
    response = registration_client.post(
        "/api/register",
        json={
            "name": "Test User",
            "email": "test@example.com",
            "password": "A" * 129
        },
        environ_overrides={
            "REMOTE_ADDR": "127.0.0.103"
        }
    )

    assert response.status_code == 400

    data = response.get_json()

    assert data is not None
    assert (
        data["error"]
        == "Password must be 128 characters or fewer"
    )


def test_registration_rejects_email_over_254_characters(
    registration_client
):
    response = registration_client.post(
        "/api/register",
        json={
            "name": "Test User",
            "email": (
                ("a" * 246)
                + "@example.com"
            ),
            "password": "password123"
        },
        environ_overrides={
            "REMOTE_ADDR": "127.0.0.104"
        }
    )

    assert response.status_code == 400

    data = response.get_json()

    assert data is not None
    assert (
        data["error"]
        == "Please enter a valid email address"
    )


def test_registration_rejects_invalid_email_format(
    registration_client
):
    response = registration_client.post(
        "/api/register",
        json={
            "name": "Test User",
            "email": "not-an-email",
            "password": "password123"
        },
        environ_overrides={
            "REMOTE_ADDR": "127.0.0.105"
        }
    )

    assert response.status_code == 400

    data = response.get_json()

    assert data is not None
    assert (
        data["error"]
        == "Please enter a valid email address"
    )


@pytest.fixture
def lead_creation_client(monkeypatch):
    """
    Create an authenticated test client for
    lead creation validation without touching
    the real database.
    """

    autoclient.app.config["TESTING"] = True

    monkeypatch.setattr(
        autoclient,
        "is_trusted_origin",
        lambda: True
    )

    monkeypatch.setattr(
        autoclient,
        "get_user_by_id",
        lambda user_id: {
            "id": user_id,
            "email": "test@example.com",
            "plan": "pro",
            "subscription_status": "active"
        }
    )

    monkeypatch.setattr(
        autoclient,
        "get_user_plan_data",
        lambda user: {
            "planName": "Pro",
            "features": {
                "max_leads": 1000
            }
        }
    )

    monkeypatch.setattr(
        autoclient,
        "get_user_lead_count",
        lambda user_id: 0
    )

    with autoclient.app.test_client() as client:
        with client.session_transaction() as session:
            session["user_id"] = 999999

        yield client


def test_lead_creation_requires_business_name(
    lead_creation_client
):
    response = lead_creation_client.post(
        "/api/leads",
        json={
            "businessName": "",
            "contact": "lead@example.com"
        }
    )

    assert response.status_code == 400

    data = response.get_json()

    assert data is not None
    assert (
        data["error"]
        == "Business name is required"
    )


def test_lead_creation_rejects_business_name_over_150_characters(
    lead_creation_client
):
    response = lead_creation_client.post(
        "/api/leads",
        json={
            "businessName": "A" * 151
        }
    )

    assert response.status_code == 400

    data = response.get_json()

    assert data is not None
    assert (
        data["error"]
        == "Business name must be 150 characters or fewer"
    )


def test_lead_creation_rejects_link_over_2048_characters(
    lead_creation_client
):
    response = lead_creation_client.post(
        "/api/leads",
        json={
            "businessName": "Test Lead",
            "link": "https://example.com/" + ("a" * 2030)
        }
    )

    assert response.status_code == 400

    data = response.get_json()

    assert data is not None
    assert (
        data["error"]
        == "Link must be 2048 characters or fewer"
    )


def test_lead_creation_rejects_contact_over_254_characters(
    lead_creation_client
):
    response = lead_creation_client.post(
        "/api/leads",
        json={
            "businessName": "Test Lead",
            "contact": "a" * 255
        }
    )

    assert response.status_code == 400

    data = response.get_json()

    assert data is not None
    assert (
        data["error"]
        == "Contact must be 254 characters or fewer"
    )


def test_lead_creation_rejects_priority_over_30_characters(
    lead_creation_client
):
    response = lead_creation_client.post(
        "/api/leads",
        json={
            "businessName": "Test Lead",
            "priority": "A" * 31
        }
    )

    assert response.status_code == 400

    data = response.get_json()

    assert data is not None
    assert (
        data["error"]
        == "Priority must be 30 characters or fewer"
    )


def test_lead_creation_rejects_notes_over_5000_characters(
    lead_creation_client
):
    response = lead_creation_client.post(
        "/api/leads",
        json={
            "businessName": "Test Lead",
            "notes": "A" * 5001
        }
    )

    assert response.status_code == 400

    data = response.get_json()

    assert data is not None
    assert (
        data["error"]
        == "Notes must be 5000 characters or fewer"
    )


def test_lead_creation_rejects_status_over_50_characters(
    lead_creation_client
):
    response = lead_creation_client.post(
        "/api/leads",
        json={
            "businessName": "Test Lead",
            "status": "A" * 51
        }
    )

    assert response.status_code == 400

    data = response.get_json()

    assert data is not None
    assert (
        data["error"]
        == "Status must be 50 characters or fewer"
    )


def test_lead_creation_rejects_created_date_over_50_characters(
    lead_creation_client
):
    response = lead_creation_client.post(
        "/api/leads",
        json={
            "businessName": "Test Lead",
            "createdAt": "A" * 51
        }
    )

    assert response.status_code == 400

    data = response.get_json()

    assert data is not None
    assert (
        data["error"]
        == "Invalid created date"
    )


def test_lead_creation_rejects_last_contacted_over_50_characters(
    lead_creation_client
):
    response = lead_creation_client.post(
        "/api/leads",
        json={
            "businessName": "Test Lead",
            "lastContacted": "A" * 51
        }
    )

    assert response.status_code == 400

    data = response.get_json()

    assert data is not None
    assert (
        data["error"]
        == "Invalid last contacted date"
    )


def test_lead_creation_rejects_follow_up_over_50_characters(
    lead_creation_client
):
    response = lead_creation_client.post(
        "/api/leads",
        json={
            "businessName": "Test Lead",
            "nextFollowUp": "A" * 51
        }
    )

    assert response.status_code == 400

    data = response.get_json()

    assert data is not None
    assert (
        data["error"]
        == "Invalid follow-up date"
    )
@pytest.fixture
def lead_update_validation_client(monkeypatch):
    """
    Create an authenticated client for testing
    lead update validation without modifying
    the real database.
    """

    autoclient.app.config["TESTING"] = True

    monkeypatch.setattr(
        autoclient,
        "is_trusted_origin",
        lambda: True
    )

    existing_lead = {
        "id": 123,
        "userId": 999999,
        "businessName": "Existing Lead",
        "link": "",
        "contact": "",
        "priority": "Cold",
        "notes": "",
        "status": "New",
        "createdAt": "2026-09-06 12:00:00",
        "lastContacted": "",
        "nextFollowUp": ""
    }

    def fake_execute_query(
        query,
        params=None,
        fetchone=False,
        fetchall=False,
        commit=False
    ):
        if "SELECT * FROM leads" in query:
            return existing_lead

        raise AssertionError(
            "Validation test unexpectedly reached database update"
        )

    monkeypatch.setattr(
        autoclient,
        "execute_query",
        fake_execute_query
    )

    with autoclient.app.test_client() as client:
        with client.session_transaction() as session:
            session["user_id"] = 999999

        yield client


def test_lead_update_requires_business_name(
    lead_update_validation_client
):
    response = lead_update_validation_client.put(
        "/api/leads/123",
        json={
            "businessName": "",
            "status": "New"
        }
    )

    assert response.status_code == 400

    data = response.get_json()

    assert data is not None
    assert (
        data["error"]
        == "Business name is required"
    )


def test_lead_update_rejects_business_name_over_150_characters(
    lead_update_validation_client
):
    response = lead_update_validation_client.put(
        "/api/leads/123",
        json={
            "businessName": "A" * 151
        }
    )

    assert response.status_code == 400

    data = response.get_json()

    assert data is not None
    assert (
        data["error"]
        == "Business name must be 150 characters or fewer"
    )


def test_lead_update_rejects_link_over_2048_characters(
    lead_update_validation_client
):
    response = lead_update_validation_client.put(
        "/api/leads/123",
        json={
            "businessName": "Existing Lead",
            "link": "https://example.com/" + ("a" * 2030)
        }
    )

    assert response.status_code == 400

    data = response.get_json()

    assert data is not None
    assert (
        data["error"]
        == "Link must be 2048 characters or fewer"
    )


def test_lead_update_rejects_contact_over_254_characters(
    lead_update_validation_client
):
    response = lead_update_validation_client.put(
        "/api/leads/123",
        json={
            "businessName": "Existing Lead",
            "contact": "A" * 255
        }
    )

    assert response.status_code == 400

    data = response.get_json()

    assert data is not None
    assert (
        data["error"]
        == "Contact must be 254 characters or fewer"
    )


def test_lead_update_rejects_priority_over_30_characters(
    lead_update_validation_client
):
    response = lead_update_validation_client.put(
        "/api/leads/123",
        json={
            "businessName": "Existing Lead",
            "priority": "A" * 31
        }
    )

    assert response.status_code == 400

    data = response.get_json()

    assert data is not None
    assert (
        data["error"]
        == "Priority must be 30 characters or fewer"
    )


def test_lead_update_rejects_notes_over_5000_characters(
    lead_update_validation_client
):
    response = lead_update_validation_client.put(
        "/api/leads/123",
        json={
            "businessName": "Existing Lead",
            "notes": "A" * 5001
        }
    )

    assert response.status_code == 400

    data = response.get_json()

    assert data is not None
    assert (
        data["error"]
        == "Notes must be 5000 characters or fewer"
    )


def test_lead_update_rejects_status_over_50_characters(
    lead_update_validation_client
):
    response = lead_update_validation_client.put(
        "/api/leads/123",
        json={
            "businessName": "Existing Lead",
            "status": "A" * 51
        }
    )

    assert response.status_code == 400

    data = response.get_json()

    assert data is not None
    assert (
        data["error"]
        == "Status must be 50 characters or fewer"
    )


def test_lead_update_rejects_created_date_over_50_characters(
    lead_update_validation_client
):
    response = lead_update_validation_client.put(
        "/api/leads/123",
        json={
            "businessName": "Existing Lead",
            "createdAt": "A" * 51
        }
    )

    assert response.status_code == 400

    data = response.get_json()

    assert data is not None
    assert (
        data["error"]
        == "Invalid created date"
    )


def test_lead_update_rejects_last_contacted_over_50_characters(
    lead_update_validation_client
):
    response = lead_update_validation_client.put(
        "/api/leads/123",
        json={
            "businessName": "Existing Lead",
            "lastContacted": "A" * 51
        }
    )

    assert response.status_code == 400

    data = response.get_json()

    assert data is not None
    assert (
        data["error"]
        == "Invalid last contacted date"
    )


def test_lead_update_rejects_follow_up_over_50_characters(
    lead_update_validation_client
):
    response = lead_update_validation_client.put(
        "/api/leads/123",
        json={
            "businessName": "Existing Lead",
            "nextFollowUp": "A" * 51
        }
    )

    assert response.status_code == 400

    data = response.get_json()

    assert data is not None
    assert (
        data["error"]
        == "Invalid follow-up date"
    )