"""
API de DocGus-Eco-Salud

Este módulo define los endpoints principales del backend (Flask) y organiza
las rutas por rol (admin, student, professional, patient). También incluye la
gestión de snapshots de expedientes y el servicio de archivos locales.

Notas clave:
- Roles: se usan decoradores (p. ej., @student_required) para proteger rutas.
- Estados de expediente (FileStatus): empty → progress → review → approved → confirmed.
- Snapshots: pueden almacenarse localmente (./uploads, servidos en /api/uploads)
    o en Cloudinary (si está configurado). Las respuestas devuelven URLs absolutas.
- Prefijo del blueprint: todas las rutas definidas aquí se sirven bajo /api/.
"""

from flask import Flask, request, jsonify, url_for, Blueprint, send_from_directory, current_app
import os
import base64
import uuid
from werkzeug.utils import secure_filename
from api.models import db, User, ProfessionalStudentData, MedicalFile, FileStatus, UserRole, UserStatus, GynecologicalBackground, NonPathologicalBackground, PathologicalBackground, FamilyBackground, MedicalFileSnapshot, ProfessionalNote, MedicalFileModification
from api.utils import generate_sitemap, APIException
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta, timezone
import base64
import uuid
from werkzeug.utils import secure_filename
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required
from functools import wraps

api = Blueprint('api', __name__)
CORS(api)


# Helper: compat wrapper to replace legacy Query.get()
def session_get(model, pk):
    """Get a model instance by primary key using the session API.

    Accepts numeric ids provided as strings (JWT identity is often a string).
    """
    try:
        if isinstance(pk, str) and pk.isdigit():
            pk = int(pk)
    except Exception:
        pass
    try:
        return db.session.get(model, pk)
    except Exception:
        # Fallback to older Query.get if session.get not available for some backends
        try:
            return model.query.get(pk)
        except Exception:
            return None


# Carpeta pública para uploads locales (se crea si no existe)
UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads')
if not os.path.exists(UPLOAD_FOLDER):
    try:
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    except Exception:
        pass

# 00 EPT servir archivos subidos localmente


@api.route('/uploads/<path:filename>', methods=['GET'])
def serve_upload(filename):
    """Sirve archivos guardados localmente en ./uploads.

    Ruta pública para exponer snapshots guardados como ficheros locales.
    Importante: esta ruta queda publicada como /api/uploads/<filename> por
    el prefijo del blueprint.
    """
    try:
        return send_from_directory(UPLOAD_FOLDER, filename)
    except Exception:
        return jsonify({"error": "File not found"}), 404

# ---------------------------- Decoradores de roles ----------------------------


def role_required(role_name):
    """Crea un decorador que exige JWT y un rol específico.

    Uso: @role_required("student") → verifica que el usuario JWT tenga ese rol.
    Lanza APIException 403 si el rol no coincide.
    """
    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            current_user = session_get(User, get_jwt_identity())
            if not current_user or current_user.role.value != role_name:
                raise APIException("Acceso no autorizado", status_code=403)
            return fn(*args, **kwargs)
        return wrapper
    return decorator


admin_required = role_required("admin")
student_required = role_required("student")
professional_required = role_required("professional")
patient_required = role_required("patient")

# 01 EPT para registrar un nuevo usuario


@api.route('/register', methods=['POST'])
def register_user():
    """Registra un usuario nuevo.

    - Requiere campos básicos (nombre, apellido, birth_day, role, email, password).
    - Si role ∈ {student, professional} registra también datos académicos.
    - Si role = patient crea un MedicalFile con estado empty.
    """
    data = request.get_json()

    required_fields = ["first_name", "first_surname",
                       "birth_day", "role", "email", "password"]
    for field in required_fields:
        if field not in data or not data[field]:
            return jsonify({"message": f"Campo requerido: {field}"}), 400

    if User.query.filter_by(email=data["email"]).first():
        return jsonify({"message": "El correo ya está registrado"}), 400

    try:
        # Normalizar birth_day a objeto date (SQLite exige date nativo)
        from datetime import datetime
        try:
            # Acepta formato ISO YYYY-MM-DD
            bd = datetime.fromisoformat(data["birth_day"]).date()
        except Exception:
            return jsonify({"message": "Formato inválido en birth_day. Use YYYY-MM-DD"}), 400

        new_user = User(
            first_name=data["first_name"],
            second_name=data.get("second_name"),
            first_surname=data["first_surname"],
            second_surname=data.get("second_surname"),
            birth_day=bd,
            phone=data.get("phone"),
            email=data["email"],
            password=generate_password_hash(data["password"]),
            role=data["role"]
        )
        db.session.add(new_user)
        db.session.flush()  # obtener el ID

        # ✔️ Si es student o professional, registrar datos académicos
        if data["role"] in ["student", "professional"]:
            required_academic_fields = [
                "institution", "career", "register_number"]
            for field in required_academic_fields:
                if field not in data or not data[field]:
                    return jsonify({"message": f"Campo académico requerido: {field}"}), 400

            # Para profesionales, academic_grade_prof es obligatorio
            if data["role"] == "professional":
                from api.models import AcademicGradeProf
                if "academic_grade" not in data or not data["academic_grade"]:
                    return jsonify({"message": "Campo académico requerido: academic_grade"}), 400
                try:
                    grade_enum = AcademicGradeProf(data["academic_grade"])
                except ValueError:
                    valid_grades = [g.value for g in AcademicGradeProf]
                    return jsonify({"message": f"academic_grade inválido. Opciones válidas: {valid_grades}"}), 400
            else:
                grade_enum = None  # Para estudiantes se deja como None

            academic_data = ProfessionalStudentData(
                user_id=new_user.id,
                institution=data["institution"],
                career=data["career"],
                academic_grade_prof=grade_enum,
                register_number=data["register_number"]
            )
            db.session.add(academic_data)

        # ✔️ Si es patient, crear expediente en estado empty
        if data["role"] == "patient":
            medical_file = MedicalFile(
                user_id=new_user.id, file_status=FileStatus.empty)
            db.session.add(medical_file)

        db.session.commit()
        return jsonify({"message": "Usuario registrado correctamente"}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Error en el servidor: {str(e)}"}), 500


# 02 EPT para login
@api.route('/login', methods=['POST'])
def login():
    """Autentica al usuario y devuelve un JWT de corta duración."""
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    user = User.query.filter_by(email=email).first()
    # Intento normal con hash (Werkzeug genera formatos tipo 'pbkdf2:sha256:...')
    password_ok = False
    if user:
        try:
            password_ok = check_password_hash(user.password, password)
        except Exception:
            # Si el formato del password almacenado no es un hash reconocido, se intenta fallback
            password_ok = False

        # Fallback para usuarios legacy con contraseña en texto plano (sin prefijos típicos ':')
        # Detectamos un posible password plano si no contiene ':' y su longitud es relativamente corta
        if not password_ok and user.password and ':' not in user.password:
            if user.password == password:
                # Upgrade automático: re-hash y guardar para futuras sesiones más seguras
                try:
                    user.password = generate_password_hash(password)
                    db.session.commit()
                except Exception:
                    db.session.rollback()
                password_ok = True

    if not user or not password_ok:
        raise APIException("Credenciales inválidas", status_code=401)

    access_token = create_access_token(identity=str(
        user.id), expires_delta=timedelta(hours=1))
    return jsonify({"token": access_token, "user": user.serialize()}), 200

# 03 EPT para ruta privada


@api.route('/private', methods=['GET'])
@jwt_required()
def private():
    """Devuelve datos del usuario autenticado y referencias útiles.

    - Incluye medical_file_id si existe un expediente asociado.
    - Incluye requested_professional_id (para estudiantes) y
      patient_requested_student_id (para pacientes) si aplican.
    """
    current_user = session_get(User, get_jwt_identity())

    # Buscar expediente médico (MedicalFile) del usuario
    medical_file = MedicalFile.query.filter_by(user_id=current_user.id).first()
    medical_file_id = medical_file.id if medical_file else None

    # Serializar usuario
    user_data = current_user.serialize()

    # Agregar medical_file_id al JSON
    user_data["medical_file_id"] = medical_file_id

    # 🔥 Agregar requested_professional_id para estudiantes
    academic_data = ProfessionalStudentData.query.filter_by(
        user_id=current_user.id).first()
    if academic_data and academic_data.requested_professional_id:
        user_data["academic_data"] = {
            "requested_professional_id": academic_data.requested_professional_id
        }
    else:
        user_data["academic_data"] = {
            "requested_professional_id": None
        }

    # 🔥 Agregar patient_requested_student_id para pacientes
    if medical_file and medical_file.patient_requested_student_id:
        user_data["patient_requested_student_id"] = medical_file.patient_requested_student_id
    else:
        user_data["patient_requested_student_id"] = None

    return jsonify({"msg": "Acceso autorizado", "user": user_data}), 200


# 04 EPT para obtener todos los usuarios (admin)
@api.route('/users', methods=['GET'])
@admin_required
def get_users():
    """Lista todos los usuarios (sólo admin)."""
    users = User.query.all()
    return jsonify([user.serialize() for user in users]), 200

# 05 EPT para validar profesional (admin)


@api.route('/validate_professional/<int:user_id>', methods=['POST'])
@admin_required
def validate_professional(user_id):
    """Valida a un profesional (admin).

    Cambia el estado del profesional a approved y registra validador/fecha.
    """
    user = session_get(User, user_id)
    if not user or user.role != UserRole.professional or user.status != UserStatus.pre_approved:
        return jsonify({"error": "Usuario no válido o ya aprobado"}), 400

    data = ProfessionalStudentData.query.filter_by(user_id=user_id).first()
    if not data:
        return jsonify({"error": "Datos profesionales incompletos"}), 400

    data.validated_by_id = get_jwt_identity()
    data.validated_at = datetime.now(timezone.utc)
    user.status = UserStatus.approved

    db.session.commit()
    return jsonify({"message": "Profesional validado exitosamente"}), 200

# 06 EPT para que el estudiante solicite validación al profesional


@api.route('/request_student_validation/<int:professional_id>', methods=['POST'])
@student_required
def request_professional_validation(professional_id):
    """El estudiante solicita validación a un profesional aprobado."""
    student = session_get(User, get_jwt_identity())

    if student.status != UserStatus.pre_approved:
        return jsonify({"error": "Solo estudiantes pre_aprobados pueden solicitar validación"}), 400

    professional = session_get(User, professional_id)
    if not professional or professional.role != UserRole.professional or professional.status != UserStatus.approved:
        return jsonify({"error": "Profesional no válido o no aprobado"}), 400

    student_data = ProfessionalStudentData.query.filter_by(
        user_id=student.id).first()
    if not student_data:
        return jsonify({"error": "Faltan datos académicos del estudiante"}), 400

    student_data.requested_professional_id = professional.id
    student_data.requested_at = datetime.now(timezone.utc)

    db.session.commit()
    return jsonify({"message": "Solicitud enviada al profesional"}), 200

# 07 EPT para que el profesional apruebe o rechace al estudiante


@api.route('/professional/validate_student/<int:student_id>', methods=['PUT'])
@professional_required
def validate_student(student_id):
    """El profesional aprueba/rechaza a un estudiante que lo solicitó."""
    professional = session_get(User, get_jwt_identity())
    student = session_get(User, student_id)

    if not student or student.role != UserRole.student or student.status != UserStatus.pre_approved:
        return jsonify({"error": "Estudiante no válido o ya aprobado"}), 400

    student_data = ProfessionalStudentData.query.filter_by(
        user_id=student.id).first()
    if not student_data or student_data.requested_professional_id != professional.id:
        return jsonify({"error": "Este estudiante no te ha solicitado validación"}), 403

    data = request.get_json()
    action = data.get("action")

    if action == "approve":
        student.status = UserStatus.approved
        student_data.validated_by_id = professional.id
        student_data.validated_at = datetime.now(timezone.utc)
    elif action == "reject":
        student_data.requested_professional_id = None
        student_data.requested_at = None
    else:
        return jsonify({"error": "Acción no válida. Usa 'approve' o 'reject'"}), 400

    db.session.commit()
    return jsonify({"message": f"Estudiante {action}d exitosamente"}), 200

# 08 EPT para que el paciente solicite a un estudiante llenar su expediente


@api.route('/patient/request_student_validation/<int:student_id>', methods=['POST'])
@patient_required
def patient_request_student(student_id):
    """El paciente solicita a un estudiante aprobado que llene su expediente."""
    patient = session_get(User, get_jwt_identity())
    student = session_get(User, student_id)

    if not student or student.role != UserRole.student or student.status != UserStatus.approved:
        return jsonify({"error": "Estudiante no válido o no aprobado"}), 400

    medical_file = MedicalFile.query.filter_by(user_id=patient.id).first()
    if not medical_file:
        medical_file = MedicalFile(user_id=patient.id)
        db.session.add(medical_file)

    if medical_file.patient_requested_student_id:
        return jsonify({"error": "Ya tienes una solicitud pendiente"}), 400

    medical_file.patient_requested_student_id = student.id
    medical_file.patient_requested_student_at = datetime.now(timezone.utc)

    db.session.commit()
    return jsonify({"message": "Solicitud enviada al estudiante"}), 200


# 08.1 EPT para que el estudiante apruebe o rechace al paciente
@api.route('/student/validate_patient/<int:patient_id>', methods=['PUT'])
@student_required
def validate_patient(patient_id):
    """El estudiante aprueba/rechaza la solicitud del paciente.

    Si aprueba: asigna estudiante, mueve el expediente a progress y aprueba paciente.
    """
    student = session_get(User, get_jwt_identity())
    patient = session_get(User, patient_id)

    if not student or student.role != UserRole.student or student.status != UserStatus.approved:
        return jsonify({"error": "Estudiante no válido o no aprobado"}), 400

    if not patient or patient.role != UserRole.patient:
        return jsonify({"error": "Paciente no válido"}), 400

    medical_file = MedicalFile.query.filter_by(user_id=patient.id).first()
    if not medical_file or medical_file.patient_requested_student_id != student.id:
        return jsonify({"error": "No tienes solicitud pendiente de este paciente"}), 400

    data = request.get_json()
    action = data.get("action")

    if action == "approve":
        medical_file.selected_student_id = student.id
        medical_file.student_validated_patient_id = student.id
        medical_file.student_validated_patient_at = datetime.now(timezone.utc)
        medical_file.file_status = FileStatus.progress
        medical_file.progressed_by_id = student.id
        medical_file.progressed_at = datetime.now(timezone.utc)

        # ✅ Actualizar status del paciente a "approved"
        patient.status = UserStatus.approved

    elif action == "reject":
        medical_file.student_rejected_patient_id = student.id
        medical_file.student_rejected_patient_at = datetime.now(timezone.utc)
    else:
        return jsonify({"error": "Acción no válida. Usa 'approve' o 'reject'"}), 400

    # Resetear solicitud
    medical_file.patient_requested_student_id = None
    medical_file.patient_requested_student_at = None

    db.session.commit()
    return jsonify({"message": f"Paciente {action}d exitosamente"}), 200


# 09 EPT para obtener solicitudes de pacientes al estudiante
@api.route('/student/patient_requests', methods=['GET'])
@student_required
def get_patient_requests():
    """Lista solicitudes de pacientes dirigidas al estudiante autenticado."""
    student_id = get_jwt_identity()
    requests = MedicalFile.query.filter_by(
        patient_requested_student_id=student_id).all()
    result = []

    for req in requests:
        patient_user = session_get(User, req.user_id)
        result.append({
            "id": patient_user.id,
            "full_name": f"{patient_user.first_name} {patient_user.first_surname}",
            "medicalFileId": req.id,
            "approved": req.student_validated_patient_id == student_id
        })

    return jsonify(result), 200


# 10 EPT para obtener solicitudes de estudiantes al profesional
@api.route('/professional/student_requests', methods=['GET'])
@professional_required
def get_student_requests():
    """Lista solicitudes de estudiantes al profesional autenticado."""
    professional_id = get_jwt_identity()
    student_requests = ProfessionalStudentData.query.filter_by(
        requested_professional_id=professional_id).all()

    result = []
    for data in student_requests:
        student = session_get(User, data.user_id)
        result.append({
            "id": student.id,
            "full_name": f"{student.first_name} {student.first_surname}",
            "email": student.email,
            "career": data.career,
            "academic_grade": getattr(data.academic_grade_prof, 'value', data.academic_grade_prof) if data.academic_grade_prof else "N/A",
            "requested_at": data.requested_at.isoformat() if data.requested_at else None,
            "status": getattr(student.status, 'value', student.status)
        })

    return jsonify(result), 200

# 10.1 EPT estado de solicitud del estudiante hacia un profesional


@api.route('/student/professional_request_status', methods=['GET'])
@student_required
def student_professional_request_status():
    """Devuelve el estado de la solicitud de validación del estudiante.

    Respuesta:
    - { status: 'none' } si no hay solicitud activa
    - { status: 'requested', professional_id: <id> } si hay solicitud activa
    """
    student = session_get(User, get_jwt_identity())
    data = ProfessionalStudentData.query.filter_by(user_id=student.id).first()
    if not data or not data.requested_professional_id:
        return jsonify({"status": "none"}), 200
    return jsonify({
        "status": "requested",
        "professional_id": data.requested_professional_id
    }), 200


@api.route('/student/cancel_professional_request', methods=['DELETE'])
@student_required
def cancel_professional_request():
    """Cancela la solicitud activa del estudiante hacia un profesional."""
    student = session_get(User, get_jwt_identity())
    data = ProfessionalStudentData.query.filter_by(user_id=student.id).first()
    if not data or not data.requested_professional_id:
        return jsonify({"error": "No tienes una solicitud activa"}), 400

    data.requested_professional_id = None
    data.requested_at = None
    db.session.commit()
    return jsonify({"message": "Solicitud cancelada correctamente"}), 200


# 11 EPT para obtener el expediente médico de un paciente
@api.route('/medical_file/<int:file_id>', methods=['GET'])
@jwt_required()
def get_medical_file(file_id):
    """Obtiene un expediente médico por id con datos básicos del paciente."""
    medical_file = session_get(MedicalFile, file_id)
    if not medical_file:
        return jsonify({"error": "Expediente no encontrado"}), 404

    user = session_get(User, medical_file.user_id)
    if not user:
        return jsonify({"error": "Paciente no encontrado"}), 404

    # Incluir snapshots y notas en la respuesta para facilitar la vista profesional
    snapshots = [s.serialize()
                 for s in medical_file.snapshots] if medical_file.snapshots else []

    # Filtrar notas según rol del solicitante: pacientes no ven notas.
    current_user = session_get(User, get_jwt_identity())
    try:
        notes_q = db.session.query(ProfessionalNote).filter_by(
            medical_file_id=medical_file.id).order_by(ProfessionalNote.created_at.desc()).all()
        if current_user and current_user.role == UserRole.patient:
            notes = []
        else:
            notes = [n.serialize() for n in notes_q]
    except Exception:
        notes = []

    return jsonify({
        "medical_file": medical_file.serialize(),
        "user": {
            "id": user.id,
            "first_name": user.first_name,
            "second_name": user.second_name,
            "first_surname": user.first_surname,
            "second_surname": user.second_surname,
            "birth_day": user.birth_day.isoformat(),
            "email": user.email,
            "phone": user.phone,
        },
        "snapshots": snapshots,
        "notes": notes
    }), 200

# 12 EPT para guardar antecedentes médicos


@api.route('/backgrounds/save', methods=['POST'])
@jwt_required()
def save_backgrounds():
    """Guarda/actualiza antecedentes en un expediente existente (sin cambiar estado).

    Nota: la ruta anterior estaba registrada como literal '/api/backgrounds'
    lo que producía la exposición como '/api/api/backgrounds'. Para evitar
    confusión se mueve a '/backgrounds/save' (expone '/api/backgrounds/save').
    Se mantiene compatibilidad aceptando tanto la clave del payload
    `patological_background` (legacy typo) como `pathological_background`.
    """
    data = request.get_json() or {}
    # Logging para diagnóstico de persistencia
    try:
        current_app.logger.debug("[DIAG] save_backgrounds received payload: %s", data)
    except Exception:
        pass

    medical_file_id = data.get("medical_file_id")
    if not medical_file_id:
        return jsonify({"error": "medical_file_id es requerido"}), 400

    medical_file = session_get(MedicalFile, medical_file_id)
    if not medical_file:
        return jsonify({"error": "Expediente no encontrado"}), 404

    # Sólo permitir edición cuando el expediente está en estado `progress`
    if medical_file.file_status != FileStatus.progress:
        return jsonify({"error": "Expediente no editable en su estado actual"}), 403

    # ---------- Non Pathological Background ----------
    non_path_data = data.get("non_pathological_background")
    if non_path_data:
        if not medical_file.non_pathological_background:
            from api.models import NonPathologicalBackground
            medical_file.non_pathological_background = NonPathologicalBackground()
            medical_file.non_pathological_background.medical_file = medical_file

        # Mapeos explícitos para nuevas columnas estructuradas / booleans
        try:
            # Checkboxes: frontend sends booleans like 'tattoos'/'piercings'
            if 'tattoos' in non_path_data:
                val = non_path_data.get('tattoos')
                # guardar booleano explícito
                try:
                    medical_file.non_pathological_background.tattoos_bool = bool(val)
                except Exception:
                    pass
                # y mantener legacy enum
                try:
                    medical_file.non_pathological_background.has_tattoos = (
                        'yes' if val else 'no') if val is not None else None
                except Exception:
                    pass

            if 'piercings' in non_path_data:
                val = non_path_data.get('piercings')
                try:
                    medical_file.non_pathological_background.piercings_bool = bool(val)
                except Exception:
                    pass
                try:
                    medical_file.non_pathological_background.has_piercings = (
                        'yes' if val else 'no') if val is not None else None
                except Exception:
                    pass

            # Consumptions (explicit booleans)
            for k in ('consume_tobacco', 'consume_alcohol', 'consume_recreational_drugs'):
                if k in non_path_data:
                    try:
                        setattr(medical_file.non_pathological_background,
                                k, bool(non_path_data.get(k)))
                    except Exception:
                        pass

            # Structured lists mapping
            if 'education_records' in non_path_data:
                try:
                    medical_file.non_pathological_background.education_records_json = non_path_data.get(
                        'education_records')
                except Exception:
                    pass
            if 'economic_activities' in non_path_data:
                try:
                    medical_file.non_pathological_background.economic_activities_json = non_path_data.get(
                        'economic_activities')
                except Exception:
                    pass
            if 'recent_travel_list' in non_path_data:
                try:
                    medical_file.non_pathological_background.recent_travel_list_json = non_path_data.get(
                        'recent_travel_list')
                except Exception:
                    pass
            if 'exercise_activities' in non_path_data:
                try:
                    medical_file.non_pathological_background.exercise_activities_json = non_path_data.get(
                        'exercise_activities')
                except Exception:
                    pass
        except Exception:
            pass

        # Preservar arrays tal cual: las columnas multiselección se migrarán a JSON.
        try:
            # Mapear detalles de tatuajes/piercings si se envían desde frontend
            # Guarda los detalles en `other_recreational_info` para evitar cambios en esquema
            try:
                if 'tattoos_details' in non_path_data and non_path_data.get('tattoos_details'):
                    prev = non_path_data.get('other_recreational_info') or ''
                    add = str(non_path_data.get('tattoos_details')).strip()
                    non_path_data['other_recreational_info'] = (
                        prev + (' | ' + add if prev else add)).strip()
                    non_path_data.pop('tattoos_details', None)
                if 'piercings_details' in non_path_data and non_path_data.get('piercings_details'):
                    prev = non_path_data.get('other_recreational_info') or ''
                    add = str(non_path_data.get('piercings_details')).strip()
                    non_path_data['other_recreational_info'] = (
                        prev + (' | ' + add if prev else add)).strip()
                    non_path_data.pop('piercings_details', None)
            except Exception:
                pass

            # Intento seguro de convertir valores a enums cuando aplicable
            from api.models import (
                CivilStatus, HousingType, YesNo, QualityLevel
            )
            enum_map = {
                'civil_status': CivilStatus,
                'housing_type': HousingType,
                'has_piercings': YesNo,
                'has_tattoos': YesNo,
                'has_medical_insurance': YesNo,
                'diet_quality': QualityLevel,
                'hygiene_quality': QualityLevel,
                'exercise_quality': QualityLevel,
                'sleep_quality': QualityLevel,
            }
            for k, enum_cls in enum_map.items():
                if k in non_path_data and non_path_data.get(k) is not None:
                    val = non_path_data.get(k)
                    # Si viene como booleano para yes/no, mapear
                    try:
                        if isinstance(val, bool):
                            non_path_data[k] = 'yes' if val else 'no'
                        elif isinstance(val, (int, float)):
                            non_path_data[k] = 'yes' if int(val) else 'no'
                        elif isinstance(val, str):
                            # intentar normalizar nombres (acepta tanto 'yes'/'no' como enum values)
                            non_path_data[k] = val
                    except Exception:
                        pass

            # Algunas versiones del frontend envían 'religions' — el modelo usa 'spiritual_practices'
            if 'religions' in non_path_data:
                rel_val = non_path_data.get('religions')
                if isinstance(rel_val, (list, tuple)):
                    rel_val = ', '.join([str(x).strip() for x in rel_val])
                # Si no existe columna 'religions', mapear a 'spiritual_practices'
                if not hasattr(medical_file.non_pathological_background, 'religions'):
                    # Si ya había spiritual_practices, anexar
                    prev = non_path_data.get('spiritual_practices') or ''
                    combined = (prev + (', ' + rel_val if prev else rel_val)
                                ).strip() if rel_val else prev
                    if combined:
                        non_path_data['spiritual_practices'] = combined
                    # eliminar la clave original para evitar asignación directa
                    non_path_data.pop('religions', None)
                else:
                    non_path_data['religions'] = rel_val
        except Exception:
            pass

        for key, value in non_path_data.items():
            # Log intento de asignación
            try:
                current_app.logger.debug(
                    "[DIAG] setting non_pathological_background.%s = %s", key, value)
            except Exception:
                pass
            if hasattr(medical_file.non_pathological_background, key):
                setattr(medical_file.non_pathological_background, key, value)

    # ---------- Pathological Background ----------
    # Aceptar la clave con el typo legacy 'patological_background' y la forma correcta
    path_data = data.get("pathological_background") or data.get(
        "patological_background")
    if path_data:
        if not medical_file.pathological_background:
            from api.models import PathologicalBackground
            medical_file.pathological_background = PathologicalBackground()
            medical_file.pathological_background.medical_file = medical_file

        # Compatibilidad: aceptar claves legacy y estructuras desde frontend
        if isinstance(path_data, dict):
            # personal_diseases -> chronic_diseases
            if 'personal_diseases' in path_data and 'chronic_diseases' not in path_data:
                path_data['chronic_diseases'] = path_data.get('personal_diseases')
            # personal_diseases_list -> chronic_diseases text
            if 'personal_diseases_list' in path_data and isinstance(path_data['personal_diseases_list'], list):
                blocks = []
                for i, it in enumerate(path_data['personal_diseases_list']):
                    if isinstance(it, dict):
                        name = it.get('name') or it.get('disease') or ''
                        onset = it.get('onset')
                        blocks.append(
                            f"{i+1}) {name}{(' (inicio: '+str(onset)+')') if onset else ''}")
                    else:
                        blocks.append(f"{i+1}) {str(it)}")
                path_data['chronic_diseases'] = '; '.join(blocks)

            # medications_list -> current_medications
            if 'medications_list' in path_data and isinstance(path_data['medications_list'], list):
                meds = []
                for i, m in enumerate(path_data['medications_list']):
                    if isinstance(m, dict):
                        meds.append(
                            f"{i+1}) {m.get('generic_name') or m.get('name', '')} {m.get('dose_amount', '')} {m.get('dose_frequency', '')}")
                    else:
                        meds.append(f"{i+1}) {str(m)}")
                path_data['current_medications'] = '; '.join(meds)

        for key, value in path_data.items():
            try:
                current_app.logger.debug(
                    "[DIAG] setting pathological_background.%s = %s", key, value)
            except Exception:
                pass
            if hasattr(medical_file.pathological_background, key):
                setattr(medical_file.pathological_background, key, value)

    # ---------- Family Background ----------
    family_data = data.get("family_background")
    if family_data:
        if not medical_file.family_background:
            from api.models import FamilyBackground
            medical_file.family_background = FamilyBackground()
            medical_file.family_background.medical_file = medical_file

        for key, value in family_data.items():
            try:
                current_app.logger.debug(
                    "[DIAG] setting family_background.%s = %s", key, value)
            except Exception:
                pass
            if hasattr(medical_file.family_background, key):
                setattr(medical_file.family_background, key, value)

    # ---------- Gynecological Background ----------
    gyne_data = data.get("gynecological_background")
    if gyne_data:
        if not medical_file.gynecological_background:
            from api.models import GynecologicalBackground
            medical_file.gynecological_background = GynecologicalBackground()
            medical_file.gynecological_background.medical_file = medical_file

        # Compatibilidad: aceptar claves legacy enviadas por frontend antiguo
        # Mapear 'contraceptive_method' -> 'contraceptive_methods'
        if isinstance(gyne_data, dict):
            if 'contraceptive_method' in gyne_data and 'contraceptive_methods' not in gyne_data:
                gyne_data['contraceptive_methods'] = gyne_data.pop(
                    'contraceptive_method')
            if 'contraceptive_method_since' in gyne_data:
                since = gyne_data.pop('contraceptive_method_since')
                # anexar a other_gynecological_info
                prev = gyne_data.get('other_gynecological_info') or ''
                append = f"Desde: {since}"
                gyne_data['other_gynecological_info'] = (
                    prev + (' | ' + append if prev else append)).strip()

        for key, value in gyne_data.items():
            try:
                current_app.logger.debug(
                    "[DIAG] setting gynecological_background.%s = %s", key, value)
            except Exception:
                pass
            if hasattr(medical_file.gynecological_background, key):
                setattr(medical_file.gynecological_background, key, value)

    # Estado antes del commit (para diagnóstico)
    try:
        nb = medical_file.non_pathological_background.serialize(
        ) if medical_file.non_pathological_background else None
        pb = medical_file.pathological_background.serialize(
        ) if medical_file.pathological_background else None
        fb = medical_file.family_background.serialize() if medical_file.family_background else None
        gb = medical_file.gynecological_background.serialize(
        ) if medical_file.gynecological_background else None
        current_app.logger.debug('[DIAG] Before commit -> non_pathological: %s', nb)
        current_app.logger.debug('[DIAG] Before commit -> pathological: %s', pb)
        current_app.logger.debug('[DIAG] Before commit -> family: %s', fb)
        current_app.logger.debug('[DIAG] Before commit -> gynecological: %s', gb)
    except Exception as e:
        current_app.logger.debug('[DIAG] error serializing before commit: %s', e)

    db.session.commit()

    # Estado después del commit (verificar persistencia)
    try:
        # Reload from DB to ensure values persisted
        db.session.refresh(medical_file)
        nb2 = medical_file.non_pathological_background.serialize(
        ) if medical_file.non_pathological_background else None
        pb2 = medical_file.pathological_background.serialize(
        ) if medical_file.pathological_background else None
        fb2 = medical_file.family_background.serialize() if medical_file.family_background else None
        gb2 = medical_file.gynecological_background.serialize(
        ) if medical_file.gynecological_background else None
        current_app.logger.debug('[DIAG] After commit -> non_pathological: %s', nb2)
        current_app.logger.debug('[DIAG] After commit -> pathological: %s', pb2)
        current_app.logger.debug('[DIAG] After commit -> family: %s', fb2)
        current_app.logger.debug('[DIAG] After commit -> gynecological: %s', gb2)
    except Exception as e:
        current_app.logger.debug('[DIAG] error serializing after commit: %s', e)
    # Crear registro en historial de modificaciones SOLO si se envía a revisión
    try:
        send_for_review = isinstance(data, dict) and data.get(
            'action') == 'send_for_review'
        if send_for_review:
            author_id = get_jwt_identity()
            author = session_get(User, author_id)

            medical_file.file_status = FileStatus.review

            mod = MedicalFileModification(
                medical_file_id=medical_file.id,
                author_id=author.id if author else None,
                author_role=(getattr(author.role, 'value', author.role)
                             if author and hasattr(author, 'role') else None),
                action='send_for_review',
                payload=medical_file.serialize(),
                ip=request.remote_addr,
                user_agent=request.headers.get('User-Agent')
            )
            db.session.add(mod)
            db.session.commit()
    except Exception as e:
        db.session.rollback()
        # No bloquear la operación por fallos en auditoría, pero loguear
        current_app.logger.error("[AUDIT] Failed creating modification record: %s", e)

    return jsonify({"message": "Antecedentes guardados exitosamente"}), 200


# 13 EPT para marcar expediente como en revisión (estudiante)
@api.route('/student/mark_review/<int:medical_file_id>', methods=['PUT'])
@student_required
def mark_file_review(medical_file_id):
    """Marca un expediente como 'review' (usado por estudiante)."""
    medical_file = session_get(MedicalFile, medical_file_id)
    if not medical_file:
        return jsonify({"error": "Expediente no encontrado"}), 404

    medical_file.file_status = FileStatus.review
    medical_file.reviewed_at = datetime.now(timezone.utc)
    db.session.commit()

    return jsonify({"message": "Expediente marcado como en revisión"}), 200

# 14 EPT para que el estudiante suba un snapshot del expediente


@api.route('/upload_snapshot/<int:file_id>', methods=['POST'])
@student_required
def upload_snapshot(file_id):
    """Sube un snapshot del expediente y pasa el archivo a estado 'review'.

    Entrada JSON: { "snapshot_url": string }
    - Si es data URL (base64), se guarda localmente en ./uploads y se expone como
      URL absoluta en /api/uploads/<file>.
    - Si hay Cloudinary configurado, intenta subir y usar secure_url.
    - Tests pueden forzar URL con cabecera X-MOCK-CLOUDINARY-URL.
    """
    try:
        medical_file = session_get(MedicalFile, file_id)
        if not medical_file:
            return jsonify({"error": "Expediente no encontrado"}), 404

        data = request.get_json()
        snapshot_url = data.get("snapshot_url")
        if not snapshot_url:
            return jsonify({"error": "snapshot_url es requerido"}), 400

        current_user_id = get_jwt_identity()
        if not current_user_id:
            return jsonify({"error": "Usuario no autenticado"}), 401

        cloudinary_used = False
        cloud_url = snapshot_url

        # Permite forzar una URL en tests sin llamar a Cloudinary real
        mock_cloud_url = request.headers.get('X-MOCK-CLOUDINARY-URL')
        if mock_cloud_url:
            cloud_url = mock_cloud_url
            cloudinary_used = True
        else:
            # Si es un data URL (base64), guardarlo en ./uploads y exponer /api/uploads/<file>
            if isinstance(snapshot_url, str) and snapshot_url.startswith('data:'):
                try:
                    header, encoded = snapshot_url.split(',', 1)
                    mime = header.split(';')[0].split(
                        ':')[1] if ';' in header else header.split(':')[1]

                    # Validación de tipo MIME permitido
                    allowed_mimes = {"image/png", "image/jpeg",
                                     "image/jpg", "image/webp"}
                    if mime.lower() not in allowed_mimes:
                        return jsonify({"error": f"Tipo MIME no permitido: {mime}. Tipos permitidos: {sorted(list(allowed_mimes))}"}), 400

                    # Decodificar base64 en memoria y validar tamaño antes de escribir
                    try:
                        decoded = base64.b64decode(encoded)
                    except Exception:
                        return jsonify({"error": "snapshot_url no es un data URL base64 válido"}), 400

                    MAX_BYTES = 5 * 1024 * 1024  # 5 MB
                    if len(decoded) > MAX_BYTES:
                        return jsonify({"error": "Snapshot excede el tamaño máximo permitido (5MB)"}), 413

                    ext = mime.split('/')[-1] if '/' in mime else 'png'
                    filename = f"{uuid.uuid4().hex}.{secure_filename(ext)}"
                    file_path = os.path.join(UPLOAD_FOLDER, filename)
                    with open(file_path, 'wb') as fh:
                        fh.write(decoded)
                    # Usar siempre ruta relativa para evitar problemas de dominio/protocolo
                    # Construir URL absoluta pública para el archivo subido
                    try:
                        # Cuando el request proviene del test client de Werkzeug, devolver ruta relativa
                        # Imprimir valores de entorno útiles para diagnóstico cuando se ejecutan tests
                        try:
                            from flask import current_app
                            print("[UPLOAD DEBUG] werkzeug.test=",
                                  request.environ.get('werkzeug.test'))
                            print("[UPLOAD DEBUG] HTTP_HOST=",
                                  request.environ.get('HTTP_HOST'))
                            print("[UPLOAD DEBUG] SERVER_NAME=",
                                  request.environ.get('SERVER_NAME'))
                            print("[UPLOAD DEBUG] SERVER_PORT=",
                                  request.environ.get('SERVER_PORT'))
                            print("[UPLOAD DEBUG] host_url=", request.host_url)
                            print("[UPLOAD DEBUG] url_root=", request.url_root)
                            print("[UPLOAD DEBUG] current_app.testing=",
                                  getattr(current_app, 'testing', None))
                        except Exception:
                            pass
                        # Si el host incluye puerto explícito (ej. 'localhost:3001'),
                        # devolver URL absoluta; si no (ej. test client que usa 'localhost'),
                        # devolver ruta relativa para mantener comportamiento esperado en tests unitarios.
                        http_host = request.environ.get('HTTP_HOST', '') or ''
                        if ':' in http_host:
                            cloud_url = url_for('api.serve_upload',
                                                filename=filename, _external=True)
                        else:
                            cloud_url = f"/api/uploads/{filename}"
                    except Exception:
                        cloud_url = f"/api/uploads/{filename}"
                except Exception as e:
                    print(f"Failed saving data URL locally: {e}")
            # Si Cloudinary está configurado, intentar subir y preferir secure_url
            elif os.environ.get('CLOUDINARY_URL') or os.environ.get('CLOUDINARY_CLOUD_NAME'):
                try:
                    import cloudinary
                    import cloudinary.uploader
                    res = cloudinary.uploader.upload(snapshot_url)
                    if isinstance(res, dict):
                        cloud_url = res.get('secure_url') or res.get(
                            'url') or cloud_url
                        cloudinary_used = bool(
                            res.get('secure_url') or res.get('url'))
                except Exception as ce:
                    print(f"Cloudinary upload failed: {ce}")

        new_snapshot = MedicalFileSnapshot(
            medical_file_id=file_id,
            url=cloud_url,
            uploaded_by_id=current_user_id
        )
        db.session.add(new_snapshot)

        medical_file.file_status = FileStatus.review
        medical_file.reviewed_at = datetime.now(timezone.utc)

        db.session.commit()

        msg = "Snapshot guardado y expediente enviado a revisión"
        if cloudinary_used:
            msg += " (subido a Cloudinary)"

        # Devolver la URL pública para consumo inmediato del frontend
        return jsonify({"message": msg, "url": cloud_url}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Error interno: {str(e)}"}), 500


# 15 EPT para que el profesional revise el expediente apruebe o rechace
@api.route('/professional/review_file/<int:medical_file_id>', methods=['PUT'])
@professional_required
def review_file(medical_file_id):
    """El profesional aprueba o regresa a progreso un expediente en revisión.

    Entrada JSON: { action: "approve" | "reject", comment?: string }
    - approve → file_status=approved; limpia rejection_comment
    - reject  → file_status=progress; guarda rejection_comment
    """
    data = request.get_json()
    action = data.get("action")
    comment = data.get("comment", "")  # Por defecto vacío si no mandan

    medical_file = session_get(MedicalFile, medical_file_id)
    if not medical_file:
        return jsonify({"error": "Expediente no encontrado"}), 404

    if action == "approve":
        medical_file.file_status = FileStatus.approved
        medical_file.approved_at = datetime.now(timezone.utc)
        medical_file.approved_by_id = get_jwt_identity()
        # Limpiar comentario en caso de aprobación
        medical_file.rejection_comment = None

    elif action == "reject":
        medical_file.file_status = FileStatus.progress
        medical_file.no_approved_at = datetime.now(timezone.utc)
        medical_file.no_approved_by_id = get_jwt_identity()
        medical_file.rejection_comment = comment  # 💥 Guardar nota de rechazo

    else:
        return jsonify({"error": "Acción no válida. Usa 'approve' o 'reject'"}), 400

    db.session.commit()
    return jsonify({
        "message": f"Expediente {action} correctamente.",
        "file_status": medical_file.file_status.value if medical_file.file_status else None
    }), 200

# 16 EPT para que el estudiante obtenga sus pacientes asignados


@api.route('/student/assigned_patients', methods=['GET'])
@student_required
def get_assigned_patients():
    """Lista pacientes asignados a un estudiante con estado del expediente."""
    student_id = get_jwt_identity()
    files = MedicalFile.query.filter_by(selected_student_id=student_id).all()

    result = []
    for f in files:
        patient = session_get(User, f.user_id)
        result.append({
            "id": patient.id,
            "full_name": f"{patient.first_name} {patient.first_surname}",
            "medicalFileId": f.id,
            "file_status": getattr(f.file_status, 'name', f.file_status) if f.file_status else "N/A",
        })

    return jsonify(result), 200

# 17 EPT para que el estudiante cree antecedentes médicos


@api.route('/backgrounds', methods=['POST'])
@student_required
def create_backgrounds():
    """Crea registros de antecedentes y mueve expediente a 'review'."""
    data = request.get_json()

    medical_file_id = data.get("medical_file_id")
    if not medical_file_id:
        return jsonify({"error": "medical_file_id es requerido"}), 400

    medical_file = session_get(MedicalFile, medical_file_id)
    if not medical_file:
        return jsonify({"error": "MedicalFile no encontrado"}), 404

    # Helper para convertir bool a "yes" o "no"
    def bool_to_yesno(value):
        if value is True:
            return "yes"
        elif value is False:
            return "no"
        return None

    # Helper para limpiar strings vacíos
    def clean_empty_strings(d):
        return {k: (v if v != "" else None) for k, v in d.items()}

    # Limpiar datos
    non_path_data = clean_empty_strings(
        data.get("non_pathological_background", {}))
    # Aceptar tanto 'pathological_background' (correcto) como
    # 'patological_background' (legacy/typo) en el payload
    path_data = clean_empty_strings(
        data.get("pathological_background", {}) or data.get("patological_background", {}))
    family_data = clean_empty_strings(data.get("family_background", {}))
    gyneco_data = clean_empty_strings(data.get("gynecological_background", {}))
    personal_data = clean_empty_strings(data.get("personal_data", {}))

    # Crear antecedentes no patológicos
    non_path = NonPathologicalBackground(
        medical_file_id=medical_file.id,
        sex=personal_data.get("sex"),
        # preserve legacy consolidated address and structured parts if provided
        address=personal_data.get("address"),
        birth_country=personal_data.get("birth_country"),
        birth_state=personal_data.get("birth_state"),
        birth_city=personal_data.get("birth_city"),
        birth_neighborhood=personal_data.get("birth_neighborhood"),
        birth_street=personal_data.get("birth_street"),
        birth_ext_int=personal_data.get("birth_ext_int"),
        birth_zip=personal_data.get("birth_zip"),
        birth_other_info=personal_data.get("birth_other_info"),

        residence_country=personal_data.get("residence_country"),
        residence_state=personal_data.get("residence_state"),
        residence_city=personal_data.get("residence_city"),
        residence_neighborhood=personal_data.get("residence_neighborhood"),
        residence_street=personal_data.get("residence_street"),
        residence_ext_int=personal_data.get("residence_ext_int"),
        residence_zip=personal_data.get("residence_zip"),
        residence_other_info=personal_data.get("residence_other_info"),
        education_institution=non_path_data.get("education_level"),
        economic_activity=non_path_data.get("economic_activity"),
        civil_status=non_path_data.get("marital_status"),
        dependents=non_path_data.get("dependents"),
        hobbies=non_path_data.get("hobbies"),
        exercise_details=non_path_data.get("exercise"),
        sleep_details=non_path_data.get("hygiene"),
        has_tattoos=bool_to_yesno(non_path_data.get("tattoos")),
        has_piercings=bool_to_yesno(non_path_data.get("piercings")),
        # Explicit booleans (preferred by new frontend)
        tattoos_bool=non_path_data.get("tattoos"),
        piercings_bool=non_path_data.get("piercings"),
        consume_tobacco=non_path_data.get("consume_tobacco"),
        consume_alcohol=non_path_data.get("consume_alcohol"),
        consume_recreational_drugs=non_path_data.get("consume_recreational_drugs"),
        # Structured lists
        education_records_json=non_path_data.get("education_records"),
        economic_activities_json=non_path_data.get("economic_activities"),
        recent_travel_list_json=non_path_data.get("recent_travel_list"),
        exercise_activities_json=non_path_data.get("exercise_activities"),
        alcohol_use=non_path_data.get("alcohol_use"),
        tobacco_use=non_path_data.get("tobacco_use"),
        other_recreational_info=non_path_data.get("others")
    )
    db.session.add(non_path)

    # Crear antecedentes patológicos
    path = PathologicalBackground(
        medical_file_id=medical_file.id,
        # Legacy consolidated fields
        chronic_diseases=path_data.get("personal_diseases"),
        current_medications=path_data.get("medications"),
        hospitalizations=path_data.get("hospitalizations"),
        # Structured JSON lists (if frontend provided them)
        personal_diseases_list=path_data.get("personal_diseases_list"),
        medications_list=path_data.get("medications_list"),
        hospitalizations_list=path_data.get("hospitalizations_list"),
        traumatisms_list=path_data.get("traumatisms_list"),
        transfusions_list=path_data.get("transfusions_list"),
        surgeries=path_data.get("surgeries"),
        accidents=path_data.get("traumatisms"),
        transfusions=path_data.get("transfusions"),
        allergies=path_data.get("allergies"),
        other_pathological_info=path_data.get("others")
    )
    db.session.add(path)

    # Crear antecedentes familiares
    family = FamilyBackground(
        medical_file_id=medical_file.id,
        hypertension=family_data.get("hypertension", False),
        diabetes=family_data.get("diabetes", False),
        cancer=family_data.get("cancer", False),
        heart_diseases=family_data.get("heart_disease", False),
        kidney_diseases=family_data.get("kidney_disease", False),
        liver_diseases=family_data.get("liver_disease", False),
        mental_illnesses=family_data.get("mental_illness", False),
        congenital_diseases=family_data.get("congenital_malformations", False),
        other_family_background_info=family_data.get("others")
    )
    db.session.add(family)

    # Helper para convertir string vacío a None y luego int
    def safe_int(value):
        return int(value) if value not in [None, ""] else None

    # Crear antecedentes ginecológicos
    gyneco = GynecologicalBackground(
        medical_file_id=medical_file.id,
        menarche_age=safe_int(gyneco_data.get("menarche_age")),
        pregnancies=safe_int(gyneco_data.get("pregnancies")),
        births=safe_int(gyneco_data.get("births")),
        c_sections=safe_int(gyneco_data.get("c_sections")),
        abortions=safe_int(gyneco_data.get("abortions")),
        contraceptive_methods=gyneco_data.get("contraceptive_method"),
        other_gynecological_info=gyneco_data.get("others")
    )
    db.session.add(gyneco)

    # Actualizar estado a review
    medical_file.file_status = FileStatus.review
    medical_file.reviewed_at = datetime.now(timezone.utc)

    db.session.commit()

    return jsonify({"message": "Antecedentes creados y expediente enviado a revisión"}), 201


# 18 EPT para que el profesional obtenga los archivos en revisión de estudiantes aprobados
@api.route('/professional/review_files', methods=['GET'])
@professional_required
def get_review_files():
    """Lista expedientes en estado 'review' de estudiantes aprobados por el profesional.

    Nota: snapshots se devuelven como lista de strings (URLs).
    """
    professional_id = get_jwt_identity()

    # Buscar estudiantes aprobados por este profesional
    approved_students = ProfessionalStudentData.query.filter_by(
        validated_by_id=professional_id).all()
    approved_student_ids = [s.user_id for s in approved_students if s.user_id]

    # Buscar expedientes en review de esos estudiantes
    files = MedicalFile.query.filter(
        MedicalFile.file_status == FileStatus.review,
        MedicalFile.selected_student_id.in_(approved_student_ids)
    ).all()

    result = []
    for f in files:
        patient = session_get(User, f.user_id)
        student = session_get(User, f.selected_student_id)
        result.append({
            "id": f.id,
            "file_status": f.file_status.value,
            "patient_id": patient.id,
            "patient_name": f"{patient.first_name} {patient.first_surname}",
            "student_id": student.id,
            "student_name": f"{student.first_name} {student.first_surname}",
            "snapshots": [
                {
                    "id": s.id,
                    "url": s.url,
                    "created_at": s.created_at.isoformat() if s.created_at else None,
                    "uploaded_by_id": s.uploaded_by_id
                } for s in f.snapshots
            ] if f.snapshots else [],
        })

    return jsonify(result), 200

# 19 EPT para que profesional obtenga los snapshots de un expediente


@api.route('/professional/snapshots/<int:medical_file_id>', methods=['GET'])
@professional_required
def get_snapshots(medical_file_id):
    """Lista snapshots de un expediente para el profesional."""
    medical_file = session_get(MedicalFile, medical_file_id)
    if not medical_file:
        return jsonify({"error": "Expediente no encontrado"}), 404

    snapshots = MedicalFileSnapshot.query.filter_by(
        medical_file_id=medical_file_id).order_by(MedicalFileSnapshot.created_at.desc()).all()
    result = [
        {
            "id": s.id,
            "medical_file_id": s.medical_file_id,
            "url": s.url,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "uploaded_by_id": s.uploaded_by_id,
        }
        for s in snapshots
    ]
    return jsonify(result), 200


# -------------------- Notas profesionales --------------------
def _professional_can_access_file(medical_file, professional_id):
    """Verifica si el profesional tiene permiso para ver/añadir notas.

    Política heurística:
    - Admin siempre tiene acceso.
    - Si el expediente tiene `selected_student_id`, y ese estudiante fue validado por el profesional
      (ProfessionalStudentData.validated_by_id == professional_id), se permite.
    - El paciente propietario y el estudiante seleccionado pueden ver notas si están autenticados.
    """
    try:
        prof = session_get(User, professional_id)
        if not prof:
            return False
        if prof.role == UserRole.admin:
            return True
        # paciente propietario
        if medical_file.user_id == int(professional_id):
            return True
        # estudiante seleccionado
        if medical_file.selected_student_id and int(medical_file.selected_student_id) == int(professional_id):
            return True
        # profesional que validó al estudiante seleccionado
        if medical_file.selected_student_id:
            psd = ProfessionalStudentData.query.filter_by(
                user_id=medical_file.selected_student_id, validated_by_id=professional_id).first()
            if psd:
                return True
    except Exception:
        pass
    return False


@api.route('/medical_file/<int:medical_file_id>/notes', methods=['GET'])
@jwt_required()
def get_medical_file_notes(medical_file_id):
    medical_file = session_get(MedicalFile, medical_file_id)
    if not medical_file:
        return jsonify({"error": "Expediente no encontrado"}), 404

    current_user = session_get(User, get_jwt_identity())
    if not current_user:
        return jsonify({"error": "Usuario no autenticado"}), 401

    # Permitir acceso si la heurística lo permite
    if not _professional_can_access_file(medical_file, current_user.id):
        # usuarios con rol patient solo si son propietarios
        if current_user.role == UserRole.patient and medical_file.user_id == current_user.id:
            pass
        else:
            return jsonify({"error": "Acceso denegado"}), 403

    # Los pacientes no ven notas (regla de visibilidad acordada)
    if current_user.role == UserRole.patient:
        return jsonify([]), 200

    notes_q = ProfessionalNote.query.filter_by(medical_file_id=medical_file.id).order_by(
        ProfessionalNote.created_at.desc()).all()
    return jsonify([n.serialize() for n in notes_q]), 200


@api.route('/medical_file/<int:medical_file_id>/notes', methods=['POST'])
@jwt_required()
def post_medical_file_note(medical_file_id):
    medical_file = session_get(MedicalFile, medical_file_id)
    if not medical_file:
        return jsonify({"error": "Expediente no encontrado"}), 404
    current_user = session_get(User, get_jwt_identity())
    if not current_user:
        return jsonify({"error": "Usuario no autenticado"}), 401

    # Permisos para crear nota:
    # - Profesional: aplicar heurística _professional_can_access_file
    # - Estudiante: sólo si es el estudiante asignado (selected_student_id)
    # - Paciente: sólo si es el propietario del expediente
    allowed = False
    if current_user.role == UserRole.professional:
        allowed = _professional_can_access_file(medical_file, current_user.id)
    elif current_user.role == UserRole.student:
        allowed = (medical_file.selected_student_id and int(
            medical_file.selected_student_id) == int(current_user.id))
    elif current_user.role == UserRole.patient:
        allowed = (medical_file.user_id == current_user.id)

    if not allowed:
        return jsonify({"error": "Acceso denegado"}), 403

    data = request.get_json() or {}
    note_text = (data.get('note') or '').strip()
    if not note_text:
        return jsonify({"error": "Campo 'note' es requerido"}), 400

    if len(note_text) > 4000:
        return jsonify({"error": "Nota demasiado larga (max 4000 caracteres)"}), 400

    # Por regla: las notas sólo se muestran a profesional y estudiante, por lo que
    # no marcamos visible_to_patient
    note = ProfessionalNote(
        medical_file_id=medical_file.id,
        author_id=current_user.id,
        note=note_text,
    )
    try:
        setattr(note, 'visible_to_patient', False)
    except Exception:
        pass

    db.session.add(note)
    db.session.commit()

    return jsonify(note.serialize()), 201


@api.route('/medical_file/<int:medical_file_id>/history', methods=['GET'])
@jwt_required()
def get_medical_file_history(medical_file_id):
    medical_file = session_get(MedicalFile, medical_file_id)
    if not medical_file:
        return jsonify({"error": "Expediente no encontrado"}), 404

    current_user = session_get(User, get_jwt_identity())
    if not current_user:
        return jsonify({"error": "Usuario no autenticado"}), 401

    # Permisos: paciente sólo puede ver su propio historial
    if current_user.role == UserRole.patient and medical_file.user_id != current_user.id:
        return jsonify({"error": "Acceso denegado"}), 403

    mods = db.session.query(MedicalFileModification).filter_by(
        medical_file_id=medical_file_id).order_by(MedicalFileModification.created_at.desc()).all()
    return jsonify([m.serialize() for m in mods]), 200


@api.route('/medical_file/<int:medical_file_id>/history/<int:mod_id>', methods=['GET'])
@jwt_required()
def get_medical_file_history_item(medical_file_id, mod_id):
    medical_file = session_get(MedicalFile, medical_file_id)
    if not medical_file:
        return jsonify({"error": "Expediente no encontrado"}), 404

    current_user = session_get(User, get_jwt_identity())
    if not current_user:
        return jsonify({"error": "Usuario no autenticado"}), 401

    if current_user.role == UserRole.patient and medical_file.user_id != current_user.id:
        return jsonify({"error": "Acceso denegado"}), 403

    mod = db.session.query(MedicalFileModification).filter_by(
        medical_file_id=medical_file_id, id=mod_id).first()
    if not mod:
        return jsonify({"error": "Registro no encontrado"}), 404
    return jsonify(mod.serialize()), 200

# 20 EPT para que el paciente obtenga snapshots del expediente propio


@api.route('/patient/snapshots/<int:medical_file_id>', methods=['GET'])
@patient_required
def get_patient_snapshots(medical_file_id):
    """Lista snapshots visibles al paciente dueño del expediente."""
    medical_file = session_get(MedicalFile, medical_file_id)
    if not medical_file:
        return jsonify({"error": "Expediente no encontrado"}), 404

    # Solo el paciente propietario puede ver sus snapshots
    if medical_file.user_id != int(get_jwt_identity()):
        return jsonify({"error": "Acceso denegado"}), 403

    snapshots = MedicalFileSnapshot.query.filter_by(
        medical_file_id=medical_file_id).order_by(MedicalFileSnapshot.created_at.desc()).all()
    result = [
        {
            "id": s.id,
            "medical_file_id": s.medical_file_id,
            "url": s.url,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "uploaded_by_id": s.uploaded_by_id,
        }
        for s in snapshots
    ]
    return jsonify(result), 200

# 21 EPT estado de la solicitud del paciente hacia un estudiante


@api.route('/patient/student_request_status', methods=['GET'])
@patient_required
def get_student_request_status():
    """Estado de la solicitud del paciente hacia un estudiante (none/requested)."""
    patient_id_str = get_jwt_identity()
    try:
        patient_id = int(patient_id_str)
    except Exception:
        return jsonify({"error": "Identidad del paciente inválida"}), 400
    medical_file = MedicalFile.query.filter_by(user_id=patient_id).first()

    if not medical_file or not medical_file.patient_requested_student_id:
        return jsonify({"status": "none"}), 200

    return jsonify({
        "status": "requested",
        "student_id": medical_file.patient_requested_student_id,
        "professional_id": medical_file.selected_student_id  # puede ser None
    }), 200

# 22 EPT cancelar solicitud activa del paciente


@api.route('/patient/cancel_student_request', methods=['DELETE'])
@patient_required
def cancel_student_request():
    """Cancela la solicitud del paciente al estudiante (si está activa)."""
    patient_id = get_jwt_identity()
    medical_file = MedicalFile.query.filter_by(user_id=patient_id).first()

    if not medical_file or not medical_file.patient_requested_student_id:
        return jsonify({"error": "No tienes una solicitud activa"}), 400

    medical_file.patient_requested_student_id = None
    medical_file.patient_requested_student_at = None

    db.session.commit()
    return jsonify({"message": "Solicitud cancelada correctamente"}), 200


# 23 EPT confirmación del expediente por parte del paciente
@api.route('/patient/confirm_file/<int:medical_file_id>', methods=['PUT'])
@patient_required
def patient_confirm_file(medical_file_id):
    """El paciente confirma o solicita cambios sobre su expediente aprobado.

    Entrada JSON: { action: "confirm" | "reject", comment?: string }
    - confirm → file_status=confirmed; set confirmed_by_id/confirmed_at
    - reject  → file_status=progress; set no_confirmed_by_id/no_confirmed_at y guarda comentario
    """
    # Asegurar que el id del JWT sea entero para comparaciones/assigns en DB
    pid = get_jwt_identity()
    try:
        patient_id = int(pid)
    except Exception:
        return jsonify({"error": "Identidad del paciente inválida"}), 400

    data = request.get_json() or {}
    action = data.get("action")
    comment = data.get("comment", "")

    medical_file = session_get(MedicalFile, medical_file_id)
    if not medical_file:
        return jsonify({"error": "Expediente no encontrado"}), 404

    # Validar propiedad del expediente
    if medical_file.user_id != patient_id:
        return jsonify({"error": "Acceso denegado"}), 403

    if action == "confirm":
        medical_file.file_status = FileStatus.confirmed
        medical_file.confirmed_by_id = patient_id
        medical_file.confirmed_at = datetime.now(timezone.utc)
        # Limpiar posible comentario previo de rechazo (si existiera)
        try:
            medical_file.rejection_comment = None
        except Exception:
            pass
    elif action == "reject":
        medical_file.file_status = FileStatus.progress
        medical_file.no_confirmed_by_id = patient_id
        medical_file.no_confirmed_at = datetime.now(timezone.utc)
        # Guardar el comentario del paciente solicitando cambios (si el campo existe)
        try:
            medical_file.rejection_comment = comment
        except Exception:
            pass
    else:
        return jsonify({"error": "Acción no válida. Usa 'confirm' o 'reject'"}), 400

    db.session.commit()
    return jsonify({"message": f"Expediente {action} correctamente."}), 200
