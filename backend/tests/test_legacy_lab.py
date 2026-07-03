"""Backend tests for The Legacy Lab MVP."""
import os
import uuid
import io
import struct
import pytest
import requests

BASE = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/")
API = f"{BASE}/api"


def _make_dummy_mp4():
    # minimal fake bytes with mp4 signature (ftyp box)
    ftyp = b"\x00\x00\x00\x20ftypisom\x00\x00\x02\x00isomiso2avc1mp41" + b"\x00" * 128
    return ftyp


@pytest.fixture(scope="module")
def registered_user():
    email = f"test_{uuid.uuid4().hex[:8]}@test.it"
    payload = {"name": "TEST User", "email": email, "password": "password123"}
    r = requests.post(f"{API}/auth/register", json=payload, timeout=30)
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    data = r.json()
    assert "access_token" in data and "user" in data
    return {"email": email, "password": "password123", "token": data["access_token"], "user": data["user"]}


@pytest.fixture(scope="module")
def auth_headers(registered_user):
    return {"Authorization": f"Bearer {registered_user['token']}"}


# ---------- AUTH ----------
class TestAuth:
    def test_register_duplicate(self, registered_user):
        r = requests.post(f"{API}/auth/register", json={
            "name": "x", "email": registered_user["email"], "password": "password123"
        }, timeout=30)
        assert r.status_code == 400

    def test_login_success(self, registered_user):
        r = requests.post(f"{API}/auth/login", json={
            "email": registered_user["email"], "password": registered_user["password"]
        }, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert "access_token" in d
        assert d["user"]["email"] == registered_user["email"]

    def test_login_wrong_pw(self, registered_user):
        r = requests.post(f"{API}/auth/login", json={
            "email": registered_user["email"], "password": "wrong"
        }, timeout=30)
        assert r.status_code == 401

    def test_me(self, auth_headers, registered_user):
        r = requests.get(f"{API}/auth/me", headers=auth_headers, timeout=30)
        assert r.status_code == 200
        assert r.json()["email"] == registered_user["email"]

    def test_me_without_token(self):
        r = requests.get(f"{API}/auth/me", timeout=30)
        assert r.status_code == 401


# ---------- CATEGORIES / HOME ----------
class TestContent:
    def test_categories(self):
        r = requests.get(f"{API}/categories", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) == 5
        ids = {c["id"] for c in data}
        assert ids == {"saper-fare", "gusto", "creativita", "commercio", "identita"}

    def test_home(self):
        r = requests.get(f"{API}/home", timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert "featured" in d and "stats" in d and "pillars" in d
        assert len(d["pillars"]) == 5


# ---------- TOUR ----------
class TestTour:
    def test_tour_list(self):
        r = requests.get(f"{API}/tour", timeout=30)
        assert r.status_code == 200
        stops = r.json()
        assert isinstance(stops, list)
        assert len(stops) >= 8
        first = stops[0]
        for k in ("id", "city", "region", "date", "registered"):
            assert k in first

    def test_tour_register_toggle(self, auth_headers):
        stops = requests.get(f"{API}/tour", timeout=30).json()
        sid = stops[0]["id"]
        r = requests.post(f"{API}/tour/{sid}/register", headers=auth_headers, timeout=30)
        assert r.status_code == 200
        first = r.json()
        r2 = requests.post(f"{API}/tour/{sid}/register", headers=auth_headers, timeout=30)
        assert r2.status_code == 200
        # toggle should invert
        assert r2.json()["registered"] != first["registered"]

    def test_tour_register_unauth(self):
        r = requests.post(f"{API}/tour/anything/register", timeout=30)
        assert r.status_code == 401


# ---------- VIDEOS + APPLICATIONS ----------
class TestApplications:
    @pytest.fixture(scope="class")
    def uploaded_video(self, registered_user):
        headers = {"Authorization": f"Bearer {registered_user['token']}"}
        files = {"video": ("test.mp4", _make_dummy_mp4(), "video/mp4")}
        r = requests.post(f"{API}/videos/upload", headers=headers, files=files, timeout=60)
        assert r.status_code == 200, f"upload failed: {r.status_code} {r.text}"
        return r.json()["video_id"]

    def test_upload_requires_auth(self):
        files = {"video": ("test.mp4", _make_dummy_mp4(), "video/mp4")}
        r = requests.post(f"{API}/videos/upload", files=files, timeout=30)
        assert r.status_code == 401

    def test_upload_rejects_non_video(self, auth_headers):
        files = {"video": ("test.txt", b"hello", "text/plain")}
        r = requests.post(f"{API}/videos/upload", headers=auth_headers, files=files, timeout=30)
        assert r.status_code == 400

    def test_video_stream(self, uploaded_video):
        r = requests.get(f"{API}/videos/{uploaded_video}/file", timeout=30)
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("video/")

    def test_create_application_and_leaderboard(self, uploaded_video, auth_headers, registered_user):
        payload = {
            "business_name": "TEST_Bottega Rossi",
            "description": "Descrizione della nostra eccellenza italiana.",
            "category": "saper-fare",
            "video_id": uploaded_video,
            "location": "Firenze",
        }
        r = requests.post(f"{API}/applications", json=payload, headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text
        app = r.json()
        assert app["business_name"] == payload["business_name"]
        assert app["category"] == "saper-fare"
        assert app["votes"] == 0
        assert app["category_name"]
        app_id = app["id"]

        # invalid category
        bad = requests.post(f"{API}/applications", json={**payload, "category": "bogus"},
                            headers=auth_headers, timeout=30)
        assert bad.status_code == 400

        # list
        r2 = requests.get(f"{API}/applications", timeout=30)
        assert r2.status_code == 200
        assert any(a["id"] == app_id for a in r2.json())

        # filter by category
        r3 = requests.get(f"{API}/applications", params={"category": "saper-fare"}, timeout=30)
        assert r3.status_code == 200
        assert all(a["category"] == "saper-fare" for a in r3.json())

        # leaderboard
        r4 = requests.get(f"{API}/applications/leaderboard", timeout=30)
        assert r4.status_code == 200
        assert any(a["id"] == app_id for a in r4.json())

        # my apps
        r5 = requests.get(f"{API}/applications/me", headers=auth_headers, timeout=30)
        assert r5.status_code == 200
        assert any(a["id"] == app_id for a in r5.json())

        # vote toggle
        v1 = requests.post(f"{API}/applications/{app_id}/vote", headers=auth_headers, timeout=30)
        assert v1.status_code == 200
        assert v1.json() == {"votes": 1, "voted": True}
        v2 = requests.post(f"{API}/applications/{app_id}/vote", headers=auth_headers, timeout=30)
        assert v2.json() == {"votes": 0, "voted": False}

    def test_vote_unauth(self):
        r = requests.post(f"{API}/applications/nonexistent/vote", timeout=30)
        assert r.status_code == 401

    def test_vote_not_found(self, auth_headers):
        r = requests.post(f"{API}/applications/nonexistent/vote", headers=auth_headers, timeout=30)
        assert r.status_code == 404
