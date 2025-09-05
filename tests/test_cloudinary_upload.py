import json
import types
import sys
from api.models import db, User, MedicalFile, MedicalFileSnapshot

def _inject_cloudinary_mock(monkeypatch, fake_url):
    """
    Inyecta un módulo `cloudinary.uploader` falso que devuelve un dict con secure_url.
    Esto permite que el código que hace `import cloudinary.uploader` funcione en tests.
    """
    cloudinary = types.SimpleNamespace()
    uploader = types.SimpleNamespace()
    def upload(url):
        return {'secure_url': fake_url}
    uploader.upload = upload
    cloudinary.uploader = uploader
    sys.modules['cloudinary'] = cloudinary
    sys.modules['cloudinary.uploader'] = uploader

def test_cloudinary_upload_with_mock(client, init_database):
    # Login como student
    student_token = client.post('/api/login', json={
        'email': 'e2e_student@example.com', 'password': 'Test1234!'
    }).get_json()['token']

    fake_cloud_url = 'https://res.cloudinary.com/demo/image/upload/v123456/fake.jpg'

    # Usar header X-MOCK-CLOUDINARY-URL para forzar el comportamiento sin tocar Cloudinary real
    resp = client.post('/api/upload_snapshot/37', headers={
        'Authorization': f'Bearer {student_token}',
        'X-MOCK-CLOUDINARY-URL': fake_cloud_url,
        'Content-Type': 'application/json'
    }, json={'snapshot_url': 'https://example.com/image.jpg'})

    assert resp.status_code == 200
    body = resp.get_json()
    assert 'url' in body
    assert body['url'] == fake_cloud_url

    # Ahora GET snapshots como patient para verificar persistencia
    patient_token = client.post('/api/login', json={
        'email': 'e2e_patient@example.com', 'password': 'Test1234!'
    }).get_json()['token']

    g = client.get('/api/patient/snapshots/37', headers={
        'Authorization': f'Bearer {patient_token}'
    })
    assert g.status_code == 200
    data = g.get_json()
    assert isinstance(data, list) and len(data) >= 1
    assert data[0]['url'] == fake_cloud_url
import os
import sys
import time
import types
import json
import urllib.request
import urllib.error

BASE = os.environ.get('TEST_BACKEND', 'http://localhost:3001/api')


def req(method, path, token=None, json_body=None, headers_extra=None):
    url = BASE + path
    data = None
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    if json_body is not None:
        data = json.dumps(json_body).encode('utf-8')
    if headers_extra:
        headers.update(headers_extra)

    req = urllib.request.Request(url, data=data, headers=headers, method=method)
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


def test_upload_uses_cloudinary(monkeypatch):
    ts = int(time.time()) % 10000
    pwd = 'TestPass123!'

    # crear admin y professional
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

    # registrar student
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

    # student solicita validación y professional aprueba
    code, _ = req(
        'POST', f'/request_student_validation/{professional_id}', token=student_token)
    assert code == 200
    code, _ = req('PUT', f'/professional/validate_student/{student_id}',
                  token=professional_token, json_body={'action': 'approve'})
    assert code == 200

    # registrar patient y completar flujo para crear medical_file
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

    code, _ = req(
        'POST', f'/patient/request_student_validation/{student_id}', token=patient_token)
    assert code == 200
    code, _ = req('PUT', f'/student/validate_patient/{patient_id}',
                  token=student_token, json_body={'action': 'approve'})
    assert code == 200

    # obtener medical_file_id
    code, body = req('GET', '/private', token=patient_token)
    assert code == 200
    medical_file_id = body['user'].get('medical_file_id')
    assert medical_file_id

    # preparar mock de cloudinary
    fake_url = 'https://res.cloudinary.com/demo/image/upload/v1/test.png'
    cloudinary_mod = types.ModuleType('cloudinary')
    uploader_mod = types.ModuleType('cloudinary.uploader')
    def fake_upload(data):
        return {'url': fake_url}
    uploader_mod.upload = fake_upload
    # attach submodule and register in sys.modules so `import cloudinary.uploader` works
    cloudinary_mod.uploader = uploader_mod
    monkeypatch.setitem(sys.modules, 'cloudinary', cloudinary_mod)
    monkeypatch.setitem(sys.modules, 'cloudinary.uploader', uploader_mod)
    # indicar que Cloudinary está configurado
    monkeypatch.setenv('CLOUDINARY_URL', 'cloudinary://placeholder')

    # POST snapshot (dataURL)
    data_url = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA'
    code, body = req('POST', f'/upload_snapshot/{medical_file_id}',
                     token=student_token, json_body={'snapshot_url': data_url}, headers_extra={'X-MOCK-CLOUDINARY-URL': fake_url})
    assert code == 200
    # el mensaje puede variar; comprobar que la respuesta es un dict
    assert isinstance(body, dict)
    # debug: mostrar cuerpo de la respuesta POST
    print('\nDEBUG POST response:', body)

    # GET snapshots and assert cloudinary URL stored
    code, snaps = req(
        'GET', f'/patient/snapshots/{medical_file_id}', token=patient_token)
    # debug: si falla, mostrar respuesta para investigar
    if code != 200:
        print('\nDEBUG GET /patient/snapshots returned', code, snaps)
    assert code == 200
    assert isinstance(snaps, list) and len(snaps) >= 1
    assert snaps[0]['url'] == fake_url
