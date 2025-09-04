#!/usr/bin/env python3
"""
Smoke test script que recorre el flujo completo:
1) Crear admin, professional, student y patient (usuarios únicos por timestamp)
2) Admin valida al professional
3) Student solicita validación al professional y profesional lo aprueba
4) Patient solicita al student realizar la entrevista
5) Student aprueba la solicitud del paciente (asigna el expediente) y completa antecedentes + sube snapshot
6) Professional revisa y aprueba el expediente
7) Patient confirma el expediente

Este script asume que la API corre en http://localhost:3001/api
"""

import urllib.request
import json
import time

BASE = "http://localhost:3001/api"


def req(method, path, data=None, token=None):
    url = BASE + path
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data_bytes = None
    if data is not None:
        data_bytes = json.dumps(data).encode()
    req = urllib.request.Request(
        url, data=data_bytes, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            body = r.read().decode()
            code = r.getcode()
            try:
                payload = json.loads(body) if body else None
            except Exception:
                payload = body
            return code, payload
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        try:
            payload = json.loads(body) if body else None
        except Exception:
            payload = body
        return e.code, payload
    except Exception as e:
        return None, str(e)


def create_and_login(user_payload):
    # Intentar registrar (ignorar si ya existe) y luego reintentar login varias veces
    code, body = req("POST", "/register", user_payload)
    print(f"  register {user_payload['email']} ->", code)

    # esperar un poco antes del login para evitar condiciones de carrera
    time.sleep(1)

    login_attempts = 5
    for i in range(login_attempts):
        code, body = req(
            "POST", "/login", {"email": user_payload['email'], "password": user_payload['password']})
        print(f"  login attempt {i+1} for {user_payload['email']} ->", code)
        if code == 200:
            return body.get('token'), body.get('user')
        time.sleep(1)

    return None, None


def main():
    ts = int(time.time())
    short_ts = ts % 10000
    pwd = "TestPass123!"

    # 1) Crear admin (usar email corto para evitar limitación varchar(30))
    admin_email = f"adm{short_ts}@t.test"
    print("1) Crear admin y obtener token")
    admin_payload = {
        "first_name": "SmokeAdmin",
        "first_surname": "Test",
        "birth_day": "1980-01-01",
        "role": "admin",
        "email": admin_email,
        "password": pwd
    }
    admin_token, admin_user = create_and_login(admin_payload)
    if not admin_token:
        print("  Error obteniendo token admin; abortando")
        return

    # 2) Crear professional
    prof_email = f"prof{short_ts}@t.test"
    print("\n2) Crear professional (pre_approved)")
    prof_payload = {
        "first_name": "SmokeProf",
        "first_surname": "Test",
        "birth_day": "1975-01-01",
        "role": "professional",
        "email": prof_email,
        "password": pwd,
        "institution": "Escuela Test",
        "career": "Medicina",
        "register_number": "PROF-123",
        "academic_grade": "licenciatura"
    }
    code, body = req("POST", "/register", prof_payload)
    print("  register professional ->", code)
    # obtener id del professional registrando un login
    code, body = req("POST", "/login", {"email": prof_email, "password": pwd})
    if code != 200:
        print("  No se pudo loguear professional; abortando")
        return
    professional_id = body['user']['id']

    # 3) Admin valida professional
    print("\n3) Admin valida professional -> /validate_professional")
    code, body = req(
        "POST", f"/validate_professional/{professional_id}", data={}, token=admin_token)
    print("  validate_professional ->", code, body)
    if code != 200:
        print("  No se pudo validar professional; abortando")
        return

    # 4) Crear student
    student_email = f"stud{short_ts}@t.test"
    print("\n4) Crear student (pre_approved)")
    stud_payload = {
        "first_name": "SmokeStudent",
        "first_surname": "Test",
        "birth_day": "1998-01-01",
        "role": "student",
        "email": student_email,
        "password": pwd,
        "institution": "Escuela Test",
        "career": "Medicina",
        "register_number": "STUD-123"
    }
    code, body = req("POST", "/register", stud_payload)
    print("  register student ->", code)
    code, body = req("POST", "/login",
                     {"email": student_email, "password": pwd})
    if code != 200:
        print("  No se pudo loguear student; abortando")
        return
    student_token = body.get('token')
    student_id = body['user']['id']

    # 5) Student solicita validación al professional
    print("\n5) Student solicita validación al professional -> /request_student_validation/<professional_id>")
    code, body = req(
        "POST", f"/request_student_validation/{professional_id}", token=student_token)
    print("  request_student_validation ->", code, body)
    if code != 200:
        print("  Error en solicitud de validación por parte del student; abortando")
        return

    # 6) Professional aprueba student
    print("\n6) Professional aprueba student -> /professional/validate_student/<student_id>")
    # login professional to get token
    code, body = req("POST", "/login", {"email": prof_email, "password": pwd})
    if code != 200:
        print("  No se pudo loguear professional; abortando")
        return
    professional_token = body.get('token')
    code, body = req("PUT", f"/professional/validate_student/{student_id}", data={
                     "action": "approve"}, token=professional_token)
    print("  validate_student ->", code, body)
    if code != 200:
        print("  Professional no pudo aprobar al student; abortando")
        return

    # 7) Crear patient
    patient_email = f"pat{short_ts}@t.test"
    print("\n7) Crear patient")
    pat_payload = {
        "first_name": "SmokePatient",
        "first_surname": "Test",
        "birth_day": "1995-01-01",
        "role": "patient",
        "email": patient_email,
        "password": pwd
    }
    code, body = req("POST", "/register", pat_payload)
    print("  register patient ->", code)
    code, body = req("POST", "/login",
                     {"email": patient_email, "password": pwd})
    if code != 200:
        print("  No se pudo loguear patient; abortando")
        return
    patient_token = body.get('token')
    patient_id = body['user']['id']

    # 8) Patient solicita al student que le haga la entrevista
    print("\n8) Patient solicita a student -> /patient/request_student_validation/<student_id>")
    code, body = req(
        "POST", f"/patient/request_student_validation/{student_id}", token=patient_token)
    print("  patient/request_student_validation ->", code, body)
    if code != 200:
        print("  Patient no pudo solicitar al student; abortando")
        return

    # 9) Student valida al patient (/student/validate_patient/<patient_id>)
    print("\n9) Student valida paciente y obtiene medical_file_id")
    code, body = req("PUT", f"/student/validate_patient/{patient_id}", data={
                     "action": "approve"}, token=student_token)
    print("  student/validate_patient ->", code, body)
    if code != 200:
        print("  Student no pudo validar paciente; abortando")
        return

    # Obtener medical_file para el paciente
    code, body = req("GET", f"/medical_file/{patient_id}", token=patient_token)
    # Note: GET /medical_file expects file_id, earlier code uses file id. We need to find the medical_file id created for patient.
    # The API returns medical_file by file id; instead, find medical_file via /private or via /medical_file/<id> after listing.
    # Simpler: use /private as patient to get user.medical_file_id from user data
    code, body = req("GET", "/private", token=patient_token)
    if code != 200:
        print("  No se pudo obtener /private; abortando")
        return
    user_data = body.get('user')
    medical_file_id = user_data.get('medical_file_id') or (
        user_data.get('medical_file') and user_data['medical_file'].get('id'))
    print("  medical_file_id ->", medical_file_id)
    if not medical_file_id:
        print("  medical_file_id no encontrado; abortando")
        return

    # 10) Student crea antecedentes (/backgrounds)
    print("\n10) Student crea antecedentes -> /backgrounds")
    bg_payload = {
        "medical_file_id": medical_file_id,
        "non_pathological_background": {"address": "Calle de prueba 123"},
        "patological_background": {"personal_diseases": "none"}
    }
    code, body = req("POST", "/backgrounds",
                     data=bg_payload, token=student_token)
    print("  POST /backgrounds ->", code, body)
    if code not in (200, 201):
        print("  Falló crear antecedentes; abortando")
        return

    # 11) Student sube snapshot
    print("\n11) Student sube snapshot -> /upload_snapshot/<file_id>")
    snap_payload = {"snapshot_url": "http://example.test/snapshot.png"}
    code, body = req(
        "POST", f"/upload_snapshot/{medical_file_id}", data=snap_payload, token=student_token)
    print("  upload_snapshot ->", code, body)
    if code != 200:
        print("  Falló upload snapshot; abortando")
        return

    # 12) Professional revisa y aprueba el expediente
    print("\n12) Professional revisa y aprueba -> /professional/review_file/<medical_file_id>")
    code, body = req("PUT", f"/professional/review_file/{medical_file_id}", data={
                     "action": "approve"}, token=professional_token)
    print("  professional/review_file ->", code, body)
    if code != 200:
        print("  Professional no pudo aprobar expediente; abortando")
        return

    # 13) Patient confirma el expediente
    print("\n13) Patient confirma expediente -> /patient/confirm_file/<medical_file_id>")
    code, body = req("PUT", f"/patient/confirm_file/{medical_file_id}", data={
                     "action": "confirm"}, token=patient_token)
    print("  patient/confirm_file ->", code, body)
    if code != 200:
        print("  Patient no pudo confirmar el expediente; revisar respuesta")
        return

    print("\nCiclo completado con éxito.")


if __name__ == '__main__':
    main()
