import os
import pytest

try:
    import psycopg2
    from urllib.parse import urlparse
except Exception:
    psycopg2 = None


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
