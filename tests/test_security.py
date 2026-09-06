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