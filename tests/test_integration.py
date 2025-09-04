import os
import time
import requests

BASE = os.environ.get('TEST_BACKEND', 'http://localhost:3001/api')


def req(method, path, token=None, json=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    url = BASE + path
    r = requests.request(method, url, headers=headers, json=json, timeout=10)
    return r.status_code, r.json() if r.text else None


def test_full_cycle(db_conn):
    ts = int(time.time()) % 10000
    pwd = 'TestPass123!'

    # 1 admin
    admin_email = f'adm{ts}@t.test'
    code, body = req('POST', '/register', json={
        'first_name': 'SmokeAdmin',
        'first_surname': 'Test',
        'birth_day': '1980-01-01',
        'role': 'admin',
        'email': admin_email,
        'password': pwd
    })
    assert code in (200, 201)

    code, body = req('POST', '/login',
                     json={'email': admin_email, 'password': pwd})
    assert code == 200
    admin_token = body['token']

    # professional
    prof_email = f'prof{ts}@t.test'
    code, _ = req('POST', '/register', json={
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
                     json={'email': prof_email, 'password': pwd})
    assert code == 200
    professional_id = body['user']['id']
    professional_token = body['token']

    # validate professional by admin
    code, body = req(
        'POST', f'/validate_professional/{professional_id}', token=admin_token)
    assert code == 200

    # student
    stud_email = f'stud{ts}@t.test'
    code, _ = req('POST', '/register', json={
        'first_name': 'SmokeStudent',
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
                     json={'email': stud_email, 'password': pwd})
    assert code == 200
    student_token = body['token']
    student_id = body['user']['id']

    # student requests professional
    code, body = req(
        'POST', f'/request_student_validation/{professional_id}', token=student_token)
    assert code == 200

    # professional approves student
    code, body = req(
        'PUT', f'/professional/validate_student/{student_id}', token=professional_token, json={'action': 'approve'})
    assert code == 200

    # patient
    pat_email = f'pat{ts}@t.test'
    code, _ = req('POST', '/register', json={
        'first_name': 'SmokePatient',
        'first_surname': 'Test',
        'birth_day': '1995-01-01',
        'role': 'patient',
        'email': pat_email,
        'password': pwd
    })
    assert code in (200, 201)

    code, body = req('POST', '/login',
                     json={'email': pat_email, 'password': pwd})
    assert code == 200
    patient_token = body['token']
    patient_id = body['user']['id']

    # patient requests student
    code, body = req(
        'POST', f'/patient/request_student_validation/{student_id}', token=patient_token)
    assert code == 200

    # student validates patient
    code, body = req(
        'PUT', f'/student/validate_patient/{patient_id}', token=student_token, json={'action': 'approve'})
    assert code == 200

    # get medical_file_id via /private
    code, body = req('GET', '/private', token=patient_token)
    assert code == 200
    medical_file_id = body['user'].get('medical_file_id')
    assert medical_file_id

    # student creates backgrounds
    code, body = req('POST', '/backgrounds', token=student_token, json={'medical_file_id': medical_file_id, 'non_pathological_background': {
                     'address': 'Calle test'}, 'patological_background': {'personal_diseases': 'none'}})
    assert code in (200, 201)

    # student uploads snapshot
    code, body = req('POST', f'/upload_snapshot/{medical_file_id}', token=student_token, json={
                     'snapshot_url': 'http://example.test/snap.png'})
    assert code == 200

    # professional reviews and approves
    code, body = req(
        'PUT', f'/professional/review_file/{medical_file_id}', token=professional_token, json={'action': 'approve'})
    assert code == 200

    # patient confirms
    code, body = req(
        'PUT', f'/patient/confirm_file/{medical_file_id}', token=patient_token, json={'action': 'confirm'})
    assert code == 200

    # final check: get medical_file and status
    code, body = req(
        'GET', f'/medical_file/{medical_file_id}', token=patient_token)
    assert code == 200
    assert body['medical_file']['file_status'] == 'confirmed'

    # Si hay conexión a Postgres, verificar filas en la BD
    if db_conn.get('available'):
        conn = db_conn['conn']
        cur = conn.cursor()
        # comprobar non_pathological_background existe para este medical_file
        cur.execute("SELECT address FROM non_pathological_background WHERE medical_file_id = %s", (medical_file_id,))
        row = cur.fetchone()
        assert row is not None and 'Calle test' in row[0]

        # comprobar snapshot existe
        cur.execute("SELECT url FROM medical_file_snapshot WHERE medical_file_id = %s", (medical_file_id,))
        row = cur.fetchone()
        assert row is not None and 'snap.png' in row[0]
