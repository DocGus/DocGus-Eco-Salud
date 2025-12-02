from src.app import app as flask_app
import os
import sys
import json
import importlib
from pathlib import Path
import pytest

# Make `src` importable for tests
ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))


@pytest.fixture(scope="session")
def client():
    """Flask test client with explicit base_url so URL generation yields absolute URLs."""
    flask_app.testing = True
    return flask_app.test_client(base_url="http://localhost:3001")


def _make_local_req(client):
    def local_req(method, path, token=None, json_body=None, headers_extra=None):
        url_path = path if path.startswith("/api") else f"/api{path}"
        full = f"http://localhost:3001{url_path}"
        headers = {}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        if headers_extra:
            headers.update(headers_extra)
        data = None
        kwargs = {}
        if json_body is not None:
            kwargs["json"] = json_body
        resp = client.open(full, method=method, headers=headers, **kwargs)
        try:
            body = resp.get_json()
        except Exception:
            body = None
        return resp.status_code, body

    return local_req


@pytest.fixture(autouse=True)
def _patch_network_helpers(client, monkeypatch):
    """Patch common network helpers used by tests to use the Flask test client.

    - Adds a `req` helper to selected test modules so they don't perform real HTTP.
    - Patches `requests.request` and `urllib.request.urlopen` to route through the test client.
    """
    local_req = _make_local_req(client)

    # Set module-level `req` in modules that expect it
    modules_to_patch = [
        "tests.test_cloudinary_upload",
        "tests.test_integration",
        "tests.test_snapshot_api",
    ]
    for mod_name in modules_to_patch:
        try:
            m = sys.modules.get(mod_name) or importlib.import_module(mod_name)
            setattr(m, "req", local_req)
        except Exception:
            # best-effort: tests that are not yet imported will still import `req` if present
            pass

    # Patch requests.request -> client.open
    try:
        import requests as _requests
        from urllib.parse import urlparse as _urlparse

        def _requests_request(method, url, headers=None, json=None, timeout=None, data=None, **kwargs):
            p = _urlparse(url)
            path = p.path
            if p.query:
                path = f"{path}?{p.query}"
            full = f"http://localhost:3001{path}"
            resp = client.open(full, method=method,
                               headers=headers or {}, json=json, data=data)

            class SimpleResp:
                def __init__(self, r):
                    self.status_code = r.status_code
                    self._r = r

                @property
                def text(self):
                    return self._r.get_data(as_text=True)

                def json(self):
                    return self._r.get_json()

            return SimpleResp(resp)

        monkeypatch.setattr(_requests, "request", _requests_request)
    except Exception:
        pass

    # Patch urllib.request.urlopen -> client.open
    try:
        import urllib.request as _urr
        from urllib.parse import urlparse as _urlparse
        from io import BytesIO as _BytesIO

        def _urlopen(req, timeout=None):
            if hasattr(req, "full_url"):
                url = req.full_url
                method = req.get_method()
                data = getattr(req, "data", None)
                headers = {}
            else:
                url = req
                method = "GET"
                data = None
                headers = {}
            p = _urlparse(url)
            path = p.path
            if p.query:
                path = f"{path}?{p.query}"
            full = f"http://localhost:3001{path}"
            resp = client.open(full, method=method, headers=headers, data=data)

            class FakeResp(_BytesIO):
                def __init__(self, r):
                    super().__init__(r.get_data())
                    self.status = r.status_code
                    self._headers = r.headers

                def getcode(self):
                    return self.status

                def info(self):
                    return self._headers

            return FakeResp(resp)

        monkeypatch.setattr(_urr, "urlopen", _urlopen)
    except Exception:
        pass

    yield


@pytest.fixture(scope='session')
def db_conn():
    """Provide a Postgres test connection only if DATABASE_URL points to Postgres.

    Returns `{'available': bool, 'conn': connection_or_None}`.
    """
    try:
        import psycopg2
        from urllib.parse import urlparse
    except Exception:
        psycopg2 = None

    db_url = os.environ.get('DATABASE_URL') or os.environ.get('TEST_DB_URL')
    if not db_url or not db_url.startswith('postgres') or psycopg2 is None:
        yield {'available': False, 'conn': None}
        return

    parts = urlparse(db_url)
    dbname = parts.path.lstrip('/')
    user = parts.username
    password = parts.password
    host = parts.hostname
    port = parts.port or 5432

    conn = psycopg2.connect(dbname=dbname, user=user,
                            password=password, host=host, port=port)
    conn.autocommit = True

    yield {'available': True, 'conn': conn}

    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM medical_file_snapshot WHERE medical_file_id IN (SELECT id FROM medical_file WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'pat%'));")
        for t in ['non_pathological_background', 'pathological_background', 'family_background', 'gynecological_background']:
            cur.execute(
                f"DELETE FROM {t} WHERE medical_file_id IN (SELECT id FROM medical_file WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'pat%'));")
        cur.execute(
            "DELETE FROM medical_file WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'pat%');")
        cur.execute(
            "DELETE FROM professional_student_data WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'prof%' OR email LIKE 'stud%');")
        cur.execute(
            "DELETE FROM users WHERE email LIKE 'adm%' OR email LIKE 'prof%' OR email LIKE 'stud%' OR email LIKE 'pat%';")
        conn.commit()
    except Exception:
        pass
    finally:
        conn.close()


# Ensure src is importable
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'src'))


def _make_local_req(client):
    def local_req(method, path, token=None, json_body=None, headers_extra=None):
        # path is like '/register' or '/api/register' depending on tests; prefer using path as-is
        # If path starts with '/api', use it directly; otherwise prefix with '/api'
        url_path = path if path.startswith('/api') else f'/api{path}'
        headers = {}
        if token:
            headers['Authorization'] = f'Bearer {token}'
        if headers_extra:
            headers.update(headers_extra)
        data = None
        if json_body is not None:
            data = json.dumps(json_body)
            headers['Content-Type'] = 'application/json'

        full_url = f'http://localhost:3001{url_path}'
        resp = client.open(full_url, method=method, headers=headers, data=data)
        try:
            body = resp.get_json()
        except Exception:
            body = None
        return resp.status_code, body

    return local_req


def pytest_configure(config):
    # During local test runs, replace network `req` helpers in tests that call external HTTP
    # Ensure Flask runs in testing mode so helpers that build absolute URLs
    # produce expected results (host_url, url_root, etc.).
    flask_app.testing = True
    # Use a base_url with explicit host:port so URL generation with _external=True
    # yields absolute URLs (tests expect http(s) or data URLs).
    client = flask_app.test_client(base_url='http://localhost:3001')
    local_req = _make_local_req(client)

    modules_to_patch = [
        'tests.test_cloudinary_upload',
        'tests.test_integration',
        'tests.test_snapshot_api'
    ]
    for mod_name in modules_to_patch:
        try:
            if mod_name in sys.modules:
                m = sys.modules[mod_name]
            else:
                m = importlib.import_module(mod_name)
            setattr(m, 'req', local_req)
        except Exception:
            # best-effort patching; tests that aren't imported yet will be patched
            pass


# Asegurar que el paquete `api` (ubicado en `src/`) sea importable en los tests
ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))


try:
    import psycopg2
    from urllib.parse import urlparse
except Exception:
    psycopg2 = None


# Ensure src is importable
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'src'))


def _make_local_req(client):
    def local_req(method, path, token=None, json_body=None, headers_extra=None):
        # path is like '/register' or '/api/register' depending on tests; prefer using path as-is
        # If path starts with '/api', use it directly; otherwise prefix with '/api'
        url_path = path if path.startswith('/api') else f'/api{path}'
        headers = {}
        if token:
            headers['Authorization'] = f'Bearer {token}'
        if headers_extra:
            headers.update(headers_extra)
        data = None
        if json_body is not None:
            data = json.dumps(json_body)
            headers['Content-Type'] = 'application/json'

        resp = client.open(url_path, method=method, headers=headers, data=data)
        try:
            body = resp.get_json()
        except Exception:
            body = None
        return resp.status_code, body

    return local_req


def pytest_configure(config):
    # During local test runs, replace network `req` helpers in tests that call external HTTP
    client = flask_app.test_client()
    local_req = _make_local_req(client)

    modules_to_patch = [
        'tests.test_cloudinary_upload',
        'tests.test_integration',
        'tests.test_snapshot_api'
    ]
    for mod_name in modules_to_patch:
        try:
            if mod_name in sys.modules:
                m = sys.modules[mod_name]
            else:
                m = importlib.import_module(mod_name)
            setattr(m, 'req', local_req)
        except Exception:
            # best-effort patching; tests that aren't imported yet will be patched
            pass


try:
    import psycopg2
    from urllib.parse import urlparse
except Exception:
    psycopg2 = None


@pytest.fixture(autouse=True)
def _patch_network_helpers():
    """Autouse fixture that ensures network helpers in tests use the Flask test client.

    Runs before each test and sets module-level `req` helpers in known test modules
    and monkeypatches `requests.request` and `urllib.request.urlopen` to route
    through the `flask_app.test_client()`.
    """
    client = flask_app.test_client()

    def local_req(method, path, token=None, json_body=None, headers_extra=None):
        url_path = path if path.startswith('/api') else f'/api{path}'
        headers = {}
        if token:
            headers['Authorization'] = f'Bearer {token}'
        if headers_extra:
            headers.update(headers_extra)
        data = None
        if json_body is not None:
            data = json.dumps(json_body)
            headers['Content-Type'] = 'application/json'

        resp = client.open(url_path, method=method, headers=headers, data=data)
        try:
            body = resp.get_json()
        except Exception:
            body = None
        return resp.status_code, body

    # Patch module-level `req` in target test modules
    modules_to_patch = [
        'tests.test_cloudinary_upload',
        'tests.test_integration',
        'tests.test_snapshot_api'
    ]
    for mod_name in modules_to_patch:
        try:
            if mod_name in sys.modules:
                m = sys.modules[mod_name]
            else:
                m = importlib.import_module(mod_name)
            setattr(m, 'req', local_req)
        except Exception:
            pass

    # Monkeypatch requests.request to route through test client
    try:
        import requests as _requests
        from urllib.parse import urlparse as _urlparse

        _orig_requests_request = _requests.request

        def _requests_request(method, url, headers=None, json=None, timeout=None, data=None, **kwargs):
            p = _urlparse(url)
            path = p.path
            if p.query:
                path = f"{path}?{p.query}"
            hdrs = headers or {}
            # prefer json if provided
            full = f'http://localhost:3001{path}'
            resp = client.open(full, method=method, headers=hdrs, json=json, data=data)

            class SimpleResp:
                def __init__(self, r):
                    self.status_code = r.status_code
                    self._r = r

                @property
                def text(self):
                    return self._r.get_data(as_text=True)

                def json(self):
                    return self._r.get_json()

            return SimpleResp(resp)

        _requests.request = _requests_request
    except Exception:
        pass

    # Monkeypatch urllib.request.urlopen similarly
    try:
        import urllib.request as _urr
        from urllib.parse import urlparse as _urlparse
        from io import BytesIO as _BytesIO

        _orig_urlopen = _urr.urlopen

        def _urlopen(req, timeout=None):
            if hasattr(req, 'full_url'):
                url = req.full_url
                method = req.get_method()
                data = getattr(req, 'data', None)
                headers = dict(getattr(req, 'header_items', lambda: [])())
            else:
                url = req
                method = 'GET'
                data = None
                headers = {}
            p = _urlparse(url)
            path = p.path
            if p.query:
                path = f"{path}?{p.query}"
            full = f'http://localhost:3001{path}'
            resp = client.open(full, method=method, headers=headers, data=data)

            class FakeResp(_BytesIO):
                def __init__(self, r):
                    super().__init__(r.get_data())
                    self.status = r.status_code
                    self._headers = r.headers

                def getcode(self):
                    return self.status

                def info(self):
                    return self._headers

            return FakeResp(resp)

        _urr.urlopen = _urlopen
    except Exception:
        pass

    yield

    # Teardown: restore patched functions if possible
    try:
        import requests as _requests
        if '_orig_requests_request' in locals():
            _requests.request = _orig_requests_request
    except Exception:
        pass
    try:
        import urllib.request as _urr
        if '_orig_urlopen' in locals():
            _urr.urlopen = _orig_urlopen
    except Exception:
        pass


@pytest.fixture(scope='session')
def db_conn():
    """Provee una conexión a la DB de pruebas si DATABASE_URL apunta a Postgres.

    Devuelve dict: {'available': bool, 'conn': connection or None}
    """
    db_url = os.environ.get('DATABASE_URL') or os.environ.get('TEST_DB_URL')
    if not db_url or not db_url.startswith('postgres') or psycopg2 is None:
        yield {'available': False, 'conn': None}
        return

    # Parsear URL
    parts = urlparse(db_url)
    dbname = parts.path.lstrip('/')
    user = parts.username
    password = parts.password
    host = parts.hostname
    port = parts.port or 5432

    conn = psycopg2.connect(dbname=dbname, user=user,
                            password=password, host=host, port=port)
    conn.autocommit = True

    yield {'available': True, 'conn': conn}

    # teardown: eliminar filas creadas por los tests (usuarios con prefijos adm/prof/stud/pat)
    try:
        cur = conn.cursor()
        # eliminar snapshots
        cur.execute("""
            DELETE FROM medical_file_snapshot WHERE medical_file_id IN (
                SELECT id FROM medical_file WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'pat%')
            );
        """)
        # eliminar backgrounds asociados
        for t in ['non_pathological_background', 'pathological_background', 'family_background', 'gynecological_background']:
            cur.execute(
                f"DELETE FROM {t} WHERE medical_file_id IN (SELECT id FROM medical_file WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'pat%'));")
        # eliminar medical_file
        cur.execute(
            "DELETE FROM medical_file WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'pat%');")
        # eliminar professional_student_data for stud/prof
        cur.execute(
            "DELETE FROM professional_student_data WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'prof%' OR email LIKE 'stud%');")
        # eliminar users
        cur.execute(
            "DELETE FROM users WHERE email LIKE 'adm%' OR email LIKE 'prof%' OR email LIKE 'stud%' OR email LIKE 'pat%';")
        conn.commit()
    except Exception:
        pass
    finally:
        conn.close()
