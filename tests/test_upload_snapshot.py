import base64
import os
import uuid
import pytest
from app import app
from api.models import db, User, MedicalFile, MedicalFileSnapshot


def make_small_png_daturl():
    # 1x1 PNG
    b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII="
    return f"data:image/png;base64,{b64}"


def make_large_daturl(bytes_size=5 * 1024 * 1024 + 10):
    data = b"\xff" * bytes_size
    enc = base64.b64encode(data).decode()
    return f"data:image/png;base64,{enc}"


def test_upload_snapshot_small_and_large():
    # Usamos el test client de Flask para registrar usuarios y probar endpoints
    with app.test_client() as client:
        # Registrar paciente (crea MedicalFile)
        ts = uuid.uuid4().hex[:8]
        patient_email = f"pat{ts}@example.test"
        patient_payload = {
            "first_name": "Paciente",
            "first_surname": "Upload",
            "birth_day": "1990-01-01",
            "role": "patient",
            "email": patient_email,
            "password": "secret123"
        }
        rv = client.post('/api/register', json=patient_payload)
        assert rv.status_code == 201

        # Registrar estudiante (necesita campos académicos)
        student_email = f"stud{ts}@example.test"
        student_payload = {
            "first_name": "Estudiante",
            "first_surname": "Upload",
            "birth_day": "1995-01-01",
            "role": "student",
            "email": student_email,
            "password": "secret123",
            "institution": "Uni Test",
            "career": "Medicina",
            "register_number": "ST-123"
        }
        rv = client.post('/api/register', json=student_payload)
        assert rv.status_code == 201

        # Loguear estudiante y obtener token
        rv = client.post(
            '/api/login', json={"email": student_email, "password": "secret123"})
        assert rv.status_code == 200
        token = rv.get_json().get('token')
        assert token
        headers = {"Authorization": f"Bearer {token}"}

        # Recuperar medical_file del paciente desde el contexto de la app
        with app.app_context():
            patient = User.query.filter_by(email=patient_email).first()
            assert patient is not None
            mf = MedicalFile.query.filter_by(user_id=patient.id).first()
            assert mf is not None
            file_id = mf.id

        # 1) Subir snapshot pequeño (data URL válido)
        small = make_small_png_daturl()
        rv = client.post(
            f'/api/upload_snapshot/{file_id}', json={"snapshot_url": small}, headers=headers)
        assert rv.status_code == 200, rv.get_data(as_text=True)
        body = rv.get_json()
        assert "url" in body and body["url"].startswith("/api/uploads/")

        # Verificar que se creó un registro en DB
        with app.app_context():
            snaps = MedicalFileSnapshot.query.filter_by(medical_file_id=file_id).all()
            assert len(snaps) >= 1

        # 2) Subir snapshot grande (debe rechazar por tamaño)
        large = make_large_daturl()
        rv = client.post(
            f'/api/upload_snapshot/{file_id}', json={"snapshot_url": large}, headers=headers)
        assert rv.status_code == 413 or rv.status_code == 400, rv.get_data(as_text=True)
        # Si es 413, mensaje de tamaño; si 400, puede fallar por decode pero aceptamos ambas como fallo defendido
        if rv.status_code == 413:
            assert "tamaño" in rv.get_json().get('error', '').lower()
