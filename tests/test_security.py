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