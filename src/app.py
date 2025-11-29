"""
This module takes care of starting the API Server, Loading the DB and Adding the endpoints
"""
import os
from flask import Flask, request, jsonify, send_from_directory
from flask_migrate import Migrate
from api.utils import APIException, generate_sitemap
from api.models import db
from api.routes import api
from api.admin import setup_admin
from api.commands import setup_commands
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from werkzeug.security import generate_password_hash
from sqlalchemy import create_engine, text, bindparam

app = Flask(__name__)

# Ambiente (evaluado temprano para decidir comportamiento en dev/prod)
ENV = "development" if os.getenv("FLASK_DEBUG") == "1" else "production"

# Configuración JWT: preferir variable de entorno. En production es obligatoria.
jwt_secret = os.getenv("JWT_SECRET_KEY") or os.getenv("FLASK_APP_KEY")
if ENV == "production" and not jwt_secret:
    raise RuntimeError("JWT_SECRET_KEY environment variable is required in production")
app.config["JWT_SECRET_KEY"] = jwt_secret or "ZkV-hpLWLgVXEXmPu4I0gJY8NdW0cn4UK-ZOjQgoMR4"
jwt = JWTManager(app)

# Secret key para sesiones/firmas de Flask
# Preferir variable de entorno `FLASK_SECRET_KEY` o `APP_SECRET_KEY`. En producción es obligatoria.
flask_secret = os.getenv('FLASK_SECRET_KEY') or os.getenv('APP_SECRET_KEY')
if ENV == 'production' and not flask_secret:
    raise RuntimeError('FLASK_SECRET_KEY (or APP_SECRET_KEY) is required in production')
app.secret_key = flask_secret or os.getenv('FLASK_DEV_SECRET', 'dev-secret-for-local')

# ✅ Configuración CORS correcta (sola, no duplicada)
CORS(
    app,
    # Puedes reemplazar "*" por tu dominio exacto si quieres restringir
    resources={r"/*": {"origins": "*"}},
    supports_credentials=True
)

# Ambiente (ya evaluado arriba)
# ENV variable ya fue establecida en la sección de configuración JWT

# Directorio de archivos estáticos (build)
static_file_dir = os.path.join(os.path.dirname(
    os.path.realpath(__file__)), '../dist/')
app.url_map.strict_slashes = False


def _sqlite_uri_default() -> str:
    """Devuelve una URI SQLite persistente dentro del repo (o la provista por SQLITE_PATH)."""
    base_dir = os.path.dirname(os.path.realpath(__file__))
    # Permite sobreescribir vía env var
    sqlite_path = os.environ.get('SQLITE_PATH')
    if not sqlite_path:
        # Guardar en la raíz del proyecto: ../dev.db
        sqlite_path = os.path.join(base_dir, '..', 'dev.db')
    # Asegurar ruta absoluta
    sqlite_path = os.path.abspath(sqlite_path)
    # Formato para ruta absoluta: sqlite:////abs/path
    return f"sqlite:///{sqlite_path}"


# Config DB
db_url = os.getenv("DATABASE_URL")
if db_url is not None:
    normalized = db_url.replace("postgres://", "postgresql://")
    # Forzar SQLite si la variable FORCE_SQLITE=1 está presente (útil en entornos locales/CI)
    force_sqlite = os.getenv("FORCE_SQLITE") == "1"
    if force_sqlite:
        app.config['SQLALCHEMY_DATABASE_URI'] = _sqlite_uri_default()
    elif normalized.startswith("postgresql://"):
        # Verificar disponibilidad de psycopg2 antes de configurar PostgreSQL (py3.13 puede fallar)
        try:
            import psycopg2  # noqa: F401
            app.config['SQLALCHEMY_DATABASE_URI'] = normalized
        except Exception as e:
            # Fallback seguro a SQLite si psycopg2 no está disponible/compatible
            print(
                f"[WARN] psycopg2 no disponible ({e}). Usando SQLite persistente.")
            app.config['SQLALCHEMY_DATABASE_URI'] = _sqlite_uri_default()
    else:
        app.config['SQLALCHEMY_DATABASE_URI'] = normalized
else:
    # Sin DATABASE_URL → usar SQLite persistente por defecto
    app.config['SQLALCHEMY_DATABASE_URI'] = _sqlite_uri_default()

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
MIGRATE = Migrate(app, db, compare_type=True)
db.init_app(app)

# En entornos de desarrollo con SQLite, crear el esquema automáticamente si no existen tablas
try:
    with app.app_context():
        uri = app.config.get('SQLALCHEMY_DATABASE_URI', '')
        auto = os.getenv('AUTO_CREATE_SCHEMA', '1') == '1'
        if auto and uri.startswith('sqlite:'):
            # Crea tablas definidas por los modelos si no existen
            db.create_all()

        # Migración automática opcional de usuarios desde una BD legada
        # Usar sólo si defines MIGRATE_ON_START=1 y MIGRATE_FROM_URL=<uri>
        def _migrate_legacy_users():
            migrate_on = os.getenv('MIGRATE_ON_START') == '1'
            from_url = os.getenv('MIGRATE_FROM_URL')
            if not migrate_on or not from_url:
                return

            try:
                # Evitar migrar desde el mismo origen
                target_uri = app.config.get('SQLALCHEMY_DATABASE_URI', '')
                if (from_url == target_uri):
                    print(
                        '[MIGRATE] Origen y destino son iguales; se omite migración.')
                    return

                # Contar usuarios existentes para duplicados
                from api.models import (
                    User,
                    ProfessionalStudentData,
                    MedicalFile,
                    FileStatus,
                    NonPathologicalBackground,
                    PathologicalBackground,
                    FamilyBackground,
                    GynecologicalBackground,
                    MedicalFileSnapshot,
                    AcademicGradeProf,
                )
                existing_count = db.session.execute(
                    text('SELECT COUNT(1) FROM users')).scalar() or 0

                src_engine = create_engine(from_url)
                with src_engine.connect() as conn:
                    # Seleccionar campos básicos; si faltan columnas opcionales, usar COALESCE/DEFAULTS
                    try:
                        rows = conn.execute(text(
                            'SELECT id, first_name, second_name, first_surname, second_surname, birth_day, phone, email, password, role, status FROM users'
                        )).mappings().all()
                    except Exception:
                        # Esquema más antiguo sin status
                        rows = conn.execute(text(
                            'SELECT id, first_name, second_name, first_surname, second_surname, birth_day, phone, email, password, role FROM users'
                        )).mappings().all()

                inserted = 0
                updated = 0
                legacy_id_to_email = {}
                for r in rows:
                    email = r.get('email')
                    if not email:
                        continue
                    legacy_id = r.get('id')
                    if legacy_id is not None:
                        legacy_id_to_email[int(legacy_id)] = email
                    # ¿Existe ya?
                    user = User.query.filter_by(email=email).first()
                    if user:
                        continue  # evitar duplicados por email

                    # Normalizar birth_day
                    bd_val = r.get('birth_day')
                    from datetime import datetime, date
                    bd = None
                    if isinstance(bd_val, date):
                        bd = bd_val
                    elif isinstance(bd_val, str) and bd_val:
                        try:
                            bd = datetime.fromisoformat(bd_val).date()
                        except Exception:
                            try:
                                bd = datetime.strptime(
                                    bd_val, '%Y-%m-%d').date()
                            except Exception:
                                bd = date(2000, 1, 1)
                    else:
                        bd = date(2000, 1, 1)

                    # Contraseña: si parece texto plano (sin ':') la re-hasheamos
                    pwd = r.get('password') or ''
                    if isinstance(pwd, str) and ':' not in pwd:
                        pwd = generate_password_hash(pwd)

                    # Role/Status: usar strings si vienen como texto; defaults razonables
                    role = r.get('role') or 'patient'
                    status = r.get('status') or 'pre_approved'

                    user = User(
                        first_name=r.get('first_name') or '',
                        second_name=r.get('second_name'),
                        first_surname=r.get('first_surname') or '',
                        second_surname=r.get('second_surname'),
                        birth_day=bd,
                        phone=r.get('phone'),
                        email=email,
                        password=pwd,
                        role=role,
                        status=status,
                    )
                    db.session.add(user)
                    db.session.flush()

                    # Crear MedicalFile para pacientes si no existe
                    try:
                        if str(role) == 'patient':
                            mf_exists = MedicalFile.query.filter_by(
                                user_id=user.id).first()
                            if not mf_exists:
                                db.session.add(MedicalFile(
                                    user_id=user.id, file_status=FileStatus.empty))
                    except Exception:
                        pass
                    inserted += 1

                if inserted > 0 or updated > 0:
                    db.session.commit()
                print(
                    f"[MIGRATE] Usuarios insertados: {inserted} (existentes previos: {existing_count})")

                # Construir mapa email -> id destino
                email_list = list(legacy_id_to_email.values())
                dest_users = (
                    db.session.execute(text('SELECT id, email FROM users WHERE email IN (:emails)')
                                       .bindparams(bindparam('emails', expanding=True)),
                                       {'emails': email_list}).mappings().all()
                    if email_list else []
                )
                email_to_dest_id = {u['email']: int(
                    u['id']) for u in dest_users}

                # Helper para mapear legacy user_id -> dest user_id vía email
                def map_user_id(legacy_user_id):
                    if legacy_user_id is None:
                        return None
                    try:
                        legacy_user_id = int(legacy_user_id)
                    except Exception:
                        return None
                    email = legacy_id_to_email.get(legacy_user_id)
                    if not email:
                        return None
                    return email_to_dest_id.get(email)

                # ---------------- Migrar ProfessionalStudentData ----------------
                with src_engine.connect() as conn:
                    try:
                        psd_rows = conn.execute(text(
                            'SELECT id, user_id, institution, career, academic_grade_prof, register_number, '
                            'validated_by_id, validated_at, requested_professional_id, requested_at, '
                            'approved_by_professional_id, approved_at, rejected_by_professional_id, rejected_at '
                            'FROM professional_student_data'
                        )).mappings().all()
                    except Exception:
                        psd_rows = []

                psd_inserted = 0
                for r in psd_rows:
                    dest_uid = map_user_id(r.get('user_id'))
                    if not dest_uid:
                        continue
                    existing = ProfessionalStudentData.query.filter_by(
                        user_id=dest_uid).first()
                    if existing:
                        # completar sólo campos vacíos
                        if not existing.institution and r.get('institution'):
                            existing.institution = r.get('institution')
                        if not existing.career and r.get('career'):
                            existing.career = r.get('career')
                        if not existing.register_number and r.get('register_number'):
                            existing.register_number = r.get('register_number')
                        # estados
                        existing.validated_by_id = map_user_id(
                            r.get('validated_by_id')) or existing.validated_by_id
                        existing.requested_professional_id = map_user_id(
                            r.get('requested_professional_id')) or existing.requested_professional_id
                        existing.approved_by_professional_id = map_user_id(
                            r.get('approved_by_professional_id')) or existing.approved_by_professional_id
                        existing.rejected_by_professional_id = map_user_id(
                            r.get('rejected_by_professional_id')) or existing.rejected_by_professional_id
                        # fechas
                        for fname in ['validated_at', 'requested_at', 'approved_at', 'rejected_at']:
                            v = r.get(fname)
                            if isinstance(v, str):
                                try:
                                    from datetime import datetime
                                    v = datetime.fromisoformat(v)
                                except Exception:
                                    v = None
                            if v is not None:
                                setattr(existing, fname, v)
                        continue

                    # crear nuevo
                    grade_val = r.get('academic_grade_prof')
                    try:
                        grade_enum = AcademicGradeProf(
                            grade_val) if grade_val else None
                    except Exception:
                        grade_enum = None
                    new_psd = ProfessionalStudentData(
                        user_id=dest_uid,
                        institution=r.get('institution') or '',
                        career=r.get('career') or '',
                        academic_grade_prof=grade_enum,
                        register_number=r.get('register_number') or ''
                    )
                    new_psd.validated_by_id = map_user_id(
                        r.get('validated_by_id'))
                    new_psd.requested_professional_id = map_user_id(
                        r.get('requested_professional_id'))
                    new_psd.approved_by_professional_id = map_user_id(
                        r.get('approved_by_professional_id'))
                    new_psd.rejected_by_professional_id = map_user_id(
                        r.get('rejected_by_professional_id'))
                    for fname in ['validated_at', 'requested_at', 'approved_at', 'rejected_at']:
                        v = r.get(fname)
                        if isinstance(v, str):
                            try:
                                from datetime import datetime
                                v = datetime.fromisoformat(v)
                            except Exception:
                                v = None
                        setattr(new_psd, fname, v)
                    db.session.add(new_psd)
                    psd_inserted += 1

                if psd_inserted:
                    db.session.commit()
                print(
                    f"[MIGRATE] ProfessionalStudentData insertados: {psd_inserted}")

                # ---------------- Migrar MedicalFile ----------------
                with src_engine.connect() as conn:
                    try:
                        mf_rows = conn.execute(
                            text('SELECT * FROM medical_file')).mappings().all()
                    except Exception:
                        mf_rows = []

                legacy_mf_to_dest = {}
                mf_inserted = 0
                for r in mf_rows:
                    legacy_mf_id = r.get('id')
                    dest_user_id = map_user_id(r.get('user_id'))
                    if not dest_user_id:
                        continue
                    mf = MedicalFile.query.filter_by(
                        user_id=dest_user_id).first()
                    created = False
                    if not mf:
                        mf = MedicalFile(user_id=dest_user_id)
                        db.session.add(mf)
                        db.session.flush()
                        created = True
                    # Mapear enum de estado
                    fs_val = r.get('file_status')
                    try:
                        mf.file_status = FileStatus(
                            fs_val) if fs_val else mf.file_status
                    except Exception:
                        pass
                    # Mapear referencias a usuarios
                    for ufield in [
                        'selected_student_id', 'patient_requested_student_id', 'student_validated_patient_id',
                        'student_rejected_patient_id', 'progressed_by_id', 'reviewed_by_id', 'approved_by_id',
                            'no_approved_by_id', 'confirmed_by_id', 'no_confirmed_by_id']:
                        val = r.get(ufield)
                        mapped = map_user_id(val)
                        if mapped:
                            setattr(mf, ufield, mapped)
                    # Fechas
                    for dfield in [
                        'patient_requested_student_at', 'student_validated_patient_at', 'student_rejected_patient_at',
                            'progressed_at', 'reviewed_at', 'approved_at', 'no_approved_at', 'confirmed_at', 'no_confirmed_at']:
                        v = r.get(dfield)
                        if isinstance(v, str):
                            try:
                                from datetime import datetime
                                v = datetime.fromisoformat(v)
                            except Exception:
                                v = None
                        if v is not None:
                            setattr(mf, dfield, v)
                    db.session.flush()
                    if legacy_mf_id is not None:
                        legacy_mf_to_dest[int(legacy_mf_id)] = mf.id
                    if created:
                        mf_inserted += 1

                if mf_inserted:
                    db.session.commit()
                print(f"[MIGRATE] MedicalFile creados: {mf_inserted}")

                # Helper para parsear filas y setear sólo atributos existentes en modelos
                def copy_row_to_model(model_obj, row_mapping, ignore_keys):
                    for k, v in row_mapping.items():
                        if k in ignore_keys:
                            continue
                        if not hasattr(model_obj, k):
                            continue
                        setattr(model_obj, k, v)

                # ---------------- Migrar Backgrounds ----------------
                def migrate_background(table_name, model_cls):
                    with src_engine.connect() as conn:
                        try:
                            rows = conn.execute(
                                text(f'SELECT * FROM {table_name}')).mappings().all()
                        except Exception:
                            rows = []
                    count = 0
                    for r in rows:
                        legacy_mid = r.get('medical_file_id')
                        dest_mid = legacy_mf_to_dest.get(
                            int(legacy_mid)) if legacy_mid is not None else None
                        if not dest_mid:
                            continue
                        existing = model_cls.query.filter_by(
                            medical_file_id=dest_mid).first()
                        if existing:
                            continue
                        obj = model_cls(medical_file_id=dest_mid)
                        copy_row_to_model(obj, r, ignore_keys={
                                          'id', 'medical_file_id'})
                        db.session.add(obj)
                        count += 1
                    if count:
                        db.session.commit()
                    print(f"[MIGRATE] {table_name} insertados: {count}")

                migrate_background(
                    'non_pathological_background', NonPathologicalBackground)
                migrate_background('pathological_background',
                                   PathologicalBackground)
                migrate_background('family_background', FamilyBackground)
                migrate_background('gynecological_background',
                                   GynecologicalBackground)

                # ---------------- Migrar Snapshots ----------------
                with src_engine.connect() as conn:
                    try:
                        snap_rows = conn.execute(
                            text('SELECT * FROM medical_file_snapshot')).mappings().all()
                    except Exception:
                        snap_rows = []
                snap_inserted = 0
                for r in snap_rows:
                    legacy_mid = r.get('medical_file_id')
                    dest_mid = legacy_mf_to_dest.get(
                        int(legacy_mid)) if legacy_mid is not None else None
                    if not dest_mid:
                        continue
                    dest_uploaded_by = map_user_id(r.get('uploaded_by_id'))
                    if not dest_uploaded_by:
                        continue
                    url = r.get('url')
                    exists = MedicalFileSnapshot.query.filter_by(
                        medical_file_id=dest_mid, url=url).first()
                    if exists:
                        continue
                    s = MedicalFileSnapshot(
                        medical_file_id=dest_mid,
                        url=url,
                        uploaded_by_id=dest_uploaded_by
                    )
                    v = r.get('created_at')
                    if isinstance(v, str):
                        try:
                            from datetime import datetime
                            v = datetime.fromisoformat(v)
                        except Exception:
                            v = None
                    if v is not None:
                        s.created_at = v
                    db.session.add(s)
                    snap_inserted += 1
                if snap_inserted:
                    db.session.commit()
                print(f"[MIGRATE] Snapshots insertados: {snap_inserted}")
            except Exception as me:
                db.session.rollback()
                print(f"[MIGRATE] Falló migración de usuarios: {me}")

        _migrate_legacy_users()
except Exception as _e:
    # Evitar que un fallo aquí detenga la app; se puede seguir usando migraciones
    pass

setup_admin(app)
setup_commands(app)

app.register_blueprint(api, url_prefix='/api')

# Errores


@app.errorhandler(APIException)
def handle_invalid_usage(error):
    return jsonify(error.to_dict()), error.status_code


@app.route('/')
def sitemap():
    if ENV == "development":
        return generate_sitemap(app)
    return send_from_directory(static_file_dir, 'index.html')


@app.route('/<path:path>', methods=['GET'])
def serve_any_other_file(path):
    if path.startswith("api"):
        return jsonify({"error": "API endpoint not found"}), 404

    file_path = os.path.join(static_file_dir, path)
    if os.path.isfile(file_path):
        response = send_from_directory(static_file_dir, path)
    else:
        response = send_from_directory(static_file_dir, 'index.html')

    response.cache_control.max_age = 0
    return response


if __name__ == '__main__':
    PORT = int(os.environ.get('PORT', 3001))
    app.run(host='0.0.0.0', port=PORT, debug=True)
