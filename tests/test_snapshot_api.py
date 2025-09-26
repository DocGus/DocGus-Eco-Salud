import os
import time
import json
import urllib.request
import urllib.error

BASE = os.environ.get('TEST_BACKEND', 'http://localhost:3001/api')


def req(method, path, token=None, json_body=None):
    url = BASE + path
    data = None
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    if json_body is not None:
        data = json.dumps(json_body).encode('utf-8')

    req = urllib.request.Request(
        url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            resp = r.read().decode('utf-8')
            return r.getcode(), json.loads(resp) if resp else None
    except urllib.error.HTTPError as e:
        try:
            resp = e.read().decode('utf-8')
            return e.getcode(), json.loads(resp) if resp else None
        except Exception:
            return e.code, None
    except Exception:
        raise


def test_snapshot_persistence(db_conn):
    ts = int(time.time()) % 10000
    ts = int(time.time()) % 10000

    # Preparar credenciales y crear admin + professional necesarios para el flujo
    pwd = 'TestPass123!'
    admin_email = f'adm{ts}@t.test'
    code, _ = req('POST', '/register', json_body={
        'first_name': 'SmokeAdmin',
        'first_surname': 'Test',
        'birth_day': '1980-01-01',
        'role': 'admin',
        'email': admin_email,
        'password': pwd
    })
    assert code in (200, 201)
    code, body = req('POST', '/login',
                     json_body={'email': admin_email, 'password': pwd})
    assert code == 200
    admin_token = body['token']

    prof_email = f'prof{ts}@t.test'
    code, _ = req('POST', '/register', json_body={
        'first_name': 'SmokeProf',
        'first_surname': 'Test',
        'birth_day': '1975-01-01',
        'role': 'professional',
        'email': prof_email,
        'password': pwd,
        'institution': 'Escuela Test',
        'career': 'Medicina',
        'register_number': 'PROF-123',
        'academic_grade': 'licenciatura'
    })
    assert code in (200, 201)
    code, body = req('POST', '/login',
                     json_body={'email': prof_email, 'password': pwd})
    assert code == 200
    professional_id = body['user']['id']
    professional_token = body['token']

    # admin valida professional
    code, _ = req(
        'POST', f'/validate_professional/{professional_id}', token=admin_token)
    assert code == 200

    # Registrar student
    stud_email = f'snapstud{ts}@t.test'
    code, _ = req('POST', '/register', json_body={
        'first_name': 'SnapStudent',
        'first_surname': 'Test',
        'birth_day': '1998-01-01',
        'role': 'student',
        'email': stud_email,
        'password': pwd,
        'institution': 'Escuela Test',
        'career': 'Medicina',
        'register_number': 'STUD-123'
    })
    assert code in (200, 201)

    code, body = req('POST', '/login',
                     json_body={'email': stud_email, 'password': pwd})
    assert code == 200
    student_token = body['token']
    student_id = body['user']['id']
    # student solicita validación al professional; professional aprueba
    code, _ = req(
        'POST', f'/request_student_validation/{professional_id}', token=student_token)
    assert code == 200
    code, _ = req('PUT', f'/professional/validate_student/{student_id}',
                  token=professional_token, json_body={'action': 'approve'})
    assert code == 200

    # Crear patient y seguir flujo para que se genere medical_file
    pat_email = f'snappat{ts}@t.test'
    code, _ = req('POST', '/register', json_body={
        'first_name': 'SnapPatient',
        'first_surname': 'Test',
        'birth_day': '1995-01-01',
        'role': 'patient',
        'email': pat_email,
        'password': pwd
    })
    assert code in (200, 201)

    code, body = req('POST', '/login',
                     json_body={'email': pat_email, 'password': pwd})
    assert code == 200
    patient_token = body['token']
    patient_id = body['user']['id']

    # patient requests student and student approves
    code, _ = req(
        'POST', f'/patient/request_student_validation/{student_id}', token=patient_token)
    assert code == 200
    code, _ = req('PUT', f'/student/validate_patient/{patient_id}',
                  token=student_token, json_body={'action': 'approve'})
    assert code == 200

    # Obtener medical_file_id via /private (hacemos login como patient)
    code, body = req('GET', '/private', token=patient_token)
    assert code == 200
    medical_file_id = body['user'].get('medical_file_id')
    assert medical_file_id

    # POST snapshot (dataURL simulado)
    data_url = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA'
    code, body = req('POST', f'/upload_snapshot/{medical_file_id}',
                     token=student_token, json_body={'snapshot_url': data_url})
    assert code == 200

    # GET snapshots via patient endpoint
    code, snaps = req(
        'GET', f'/patient/snapshots/{medical_file_id}', token=patient_token)
    assert code == 200
    assert isinstance(snaps, list)
    assert len(snaps) >= 1
    assert 'url' in snaps[0]
    assert snaps[0]['url'].startswith('data:image/png')

    # Si hay Postgres, comprobar fila en la BD
    if db_conn.get('available'):
        conn = db_conn['conn']
        cur = conn.cursor()
        cur.execute(
            "SELECT url FROM medical_file_snapshot WHERE medical_file_id = %s", (medical_file_id,))
        row = cur.fetchone()
        assert row is not None and row[0].startswith('data:image/png')
