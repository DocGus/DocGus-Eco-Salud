# -------------------- INICIALIZACIÓN DE LA BASE DE DATOS --------------------

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey, Enum, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime, date, timezone
import enum

db = SQLAlchemy()


# Helper to safely extract enum name/value for serialization
def enum_name(val):
    """Return enum.name if value is an Enum instance, otherwise return the value or None."""
    try:
        if val is None:
            return None
        # Enum instances have attribute 'name'
        return val.name if hasattr(val, 'name') else val
    except Exception:
        return val


# -------------------- SERIALIZACIÓN DE DATETIME --------------------
# Función para serializar objetos datetime a formato ISO 8601
def serialize_datetime(value):
    if value is None:
        return None
    return value.isoformat()

# -------------------- ENUMS PERSONALIZADOS --------------------


class UserRole(str, enum.Enum):
    admin = "admin"
    professional = "professional"
    student = "student"
    patient = "patient"


class SexType(str, enum.Enum):
    female = "female"
    male = "male"
    other = "other"


class UserStatus(str, enum.Enum):
    pre_approved = "pre_approved"
    approved = "approved"
    inactive = "inactive"


class FileStatus(str, enum.Enum):
    empty = "empty"
    progress = "progress"
    review = "review"
    approved = "approved"
    confirmed = "confirmed"


class AcademicGradeProf(str, enum.Enum):
    licenciatura = "licenciatura"
    especialidad = "especialidad"
    maestria = "maestría"
    doctorado = "doctorado"
    pos_doctorado = "pos-doctorado"


class AcademicGrade(str, enum.Enum):
    no_formal_education = "no_formal_education"
    elementary_school = "elementary_school"
    middle_school = "middle_school"
    high_school = "high_school"
    technical = "technical"
    bachelor = "bachelor"
    postgraduate_studies = "postgraduate_studies"


class QualityLevel(str, enum.Enum):
    good = "good"
    regular = "regular"
    bad = "bad"


class YesNo(str, enum.Enum):
    yes = "yes"
    no = "no"


class CivilStatus(str, enum.Enum):
    married = "married"
    single = "single"
    divorced = "divorced"
    widowed = "widowed"


class HousingType(str, enum.Enum):
    owned = "owned"
    rented = "rented"
    none = "none"


class FamilyBackgroundLine(str, enum.Enum):
    fathers = "fathers"
    brothers_or_sisters = "brothers_or_sisters"
    uncles_or_aunts = "uncles_or_aunts"
    grandparents = "grandparents"

# -------------------- MODELO: USER --------------------


class User(db.Model):
    """
    Modelo User que almacena información principal de cada usuario.
    Soporta roles, estado y relaciones con expedientes y datos académicos.
    """
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    second_name: Mapped[str] = mapped_column(String(100), nullable=True)
    first_surname: Mapped[str] = mapped_column(String(100), nullable=False)
    second_surname: Mapped[str] = mapped_column(String(100), nullable=True)
    birth_day: Mapped[date] = mapped_column(nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=True)
    email: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    password: Mapped[str] = mapped_column(String(200), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False)
    status: Mapped[UserStatus] = mapped_column(
        Enum(UserStatus), nullable=False, default=UserStatus.pre_approved)

    # Relaciones
    professional_student_data: Mapped["ProfessionalStudentData"] = relationship(
        "ProfessionalStudentData",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
        foreign_keys="[ProfessionalStudentData.user_id]"
    )
    medical_file: Mapped["MedicalFile"] = relationship(
        "MedicalFile",
        back_populates="user",
        foreign_keys="[MedicalFile.user_id]",
        uselist=False,
        cascade="all, delete-orphan"
    )

    def serialize(self):
        return {
            "id": self.id,
            "first_name": self.first_name,
            "second_name": self.second_name,
            "first_surname": self.first_surname,
            "second_surname": self.second_surname,
            "birth_day": self.birth_day.isoformat(),
            "phone": self.phone,
            "email": self.email,
            "role": self.role.value,
            "status": self.status.value,
            "medical_file": self.medical_file.serialize() if self.medical_file else None,
            "professional_student_data": self.professional_student_data.serialize() if self.professional_student_data else None
        }

    def __repr__(self):
        return f"<User {self.id} - {self.email}>"

# -------------------- MODELO: ProfesionalStudent DATA --------------------


class ProfessionalStudentData(db.Model):
    __tablename__ = "professional_student_data"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), nullable=False, unique=True)

    institution: Mapped[str] = mapped_column(String(100), nullable=False)
    career: Mapped[str] = mapped_column(String(100), nullable=False)
    academic_grade_prof: Mapped[AcademicGradeProf] = mapped_column(
        Enum(AcademicGradeProf), nullable=True)
    register_number: Mapped[str] = mapped_column(String(30), nullable=False)

    # -------- VALIDACIÓN DEL ADMIN AL PROFESSIONAL --------
    validated_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=True)
    validated_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    validated_by: Mapped["User"] = relationship(
        "User",
        foreign_keys=[validated_by_id]
    )

    # -------- VALIDACIÓN DEL PROFESSIONAL AL STUDENT --------
    requested_professional_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), nullable=True)
    requested_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    approved_by_professional_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), nullable=True)
    approved_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    rejected_by_professional_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), nullable=True)
    rejected_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    requested_professional: Mapped["User"] = relationship(
        "User",
        foreign_keys=[requested_professional_id]
    )

    approved_by_professional: Mapped["User"] = relationship(
        "User",
        foreign_keys=[approved_by_professional_id]
    )

    rejected_by_professional: Mapped["User"] = relationship(
        "User",
        foreign_keys=[rejected_by_professional_id]
    )

    # -------- RELACIÓN CON EL USUARIO --------
    user: Mapped["User"] = relationship(
        "User",
        back_populates="professional_student_data",
        uselist=False,
        foreign_keys=[user_id]
    )

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "institution": self.institution,
            "career": self.career,
            "academic_grade_prof": self.academic_grade_prof.value if self.academic_grade_prof else None,
            "register_number": self.register_number,

            # Admin que valida Professional
            "validated_by_id": self.validated_by_id,
            "validated_at": serialize_datetime(self.validated_at),

            # Student solicitando validación
            "requested_professional_id": self.requested_professional_id,
            "requested_at": serialize_datetime(self.requested_at),

            # Professional que aprueba/rechaza al Student
            "approved_by_professional_id": self.approved_by_professional_id,
            "approved_at": serialize_datetime(self.approved_at),
            "rejected_by_professional_id": self.rejected_by_professional_id,
            "rejected_at": serialize_datetime(self.rejected_at),
        }


# -------------------- MODELO: MEDICAL FILE --------------------
class MedicalFile(db.Model):
    __tablename__ = "medical_file"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    user = relationship("User", back_populates="medical_file", foreign_keys=[user_id])

    file_status = db.Column(Enum(FileStatus), default=FileStatus.empty, nullable=False)

    selected_student_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    selected_student = relationship("User", foreign_keys=[selected_student_id])

    patient_requested_student_id = db.Column(
        db.Integer, db.ForeignKey('users.id'), nullable=True)
    patient_requested_student_at = db.Column(db.DateTime, nullable=True)
    patient_requested_student = relationship(
        "User", foreign_keys=[patient_requested_student_id])

    student_validated_patient_id = db.Column(
        db.Integer, db.ForeignKey('users.id'), nullable=True)
    student_validated_patient_at = db.Column(db.DateTime, nullable=True)
    student_validated_patient = relationship(
        "User", foreign_keys=[student_validated_patient_id])

    student_rejected_patient_id = db.Column(
        db.Integer, db.ForeignKey('users.id'), nullable=True)
    student_rejected_patient_at = db.Column(db.DateTime, nullable=True)
    student_rejected_patient = relationship(
        "User", foreign_keys=[student_rejected_patient_id])

    progressed_by_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    progressed_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    reviewed_by_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    reviewed_at = db.Column(db.DateTime)

    approved_by_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    approved_at = db.Column(db.DateTime)

    no_approved_by_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    no_approved_at = db.Column(db.DateTime)

    confirmed_by_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    confirmed_at = db.Column(db.DateTime)

    no_confirmed_by_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    no_confirmed_at = db.Column(db.DateTime)

    progressed_by = relationship("User", foreign_keys=[progressed_by_id])
    reviewed_by = relationship("User", foreign_keys=[reviewed_by_id])
    approved_by = relationship("User", foreign_keys=[approved_by_id])
    no_approved_by = relationship("User", foreign_keys=[no_approved_by_id])
    confirmed_by = relationship("User", foreign_keys=[confirmed_by_id])
    no_confirmed_by = relationship("User", foreign_keys=[no_confirmed_by_id])

    non_pathological_background = relationship(
        "NonPathologicalBackground", uselist=False, back_populates="medical_file")
    pathological_background = relationship(
        "PathologicalBackground", uselist=False, back_populates="medical_file")
    family_background = relationship(
        "FamilyBackground", uselist=False, back_populates="medical_file")
    gynecological_background = relationship(
        "GynecologicalBackground", uselist=False, back_populates="medical_file")

    snapshots = relationship(
        "MedicalFileSnapshot",
        back_populates="medical_file",
        cascade="all, delete-orphan"
    )

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "file_status": enum_name(self.file_status),
            "selected_student_id": self.selected_student_id,
            "patient_requested_student_id": self.patient_requested_student_id,
            "patient_requested_student_at": serialize_datetime(self.patient_requested_student_at),
            "student_validated_patient_id": self.student_validated_patient_id,
            "student_validated_patient_at": serialize_datetime(self.student_validated_patient_at),
            "student_rejected_patient_id": self.student_rejected_patient_id,
            "student_rejected_patient_at": serialize_datetime(self.student_rejected_patient_at),
            "progressed_by_id": self.progressed_by_id,
            "progressed_at": serialize_datetime(self.progressed_at),
            "reviewed_by_id": self.reviewed_by_id,
            "reviewed_at": serialize_datetime(self.reviewed_at),
            "approved_by_id": self.approved_by_id,
            "approved_at": serialize_datetime(self.approved_at),
            "no_approved_by_id": self.no_approved_by_id,
            "no_approved_at": serialize_datetime(self.no_approved_at),
            "confirmed_by_id": self.confirmed_by_id,
            "confirmed_at": serialize_datetime(self.confirmed_at),
            "no_confirmed_by_id": self.no_confirmed_by_id,
            "no_confirmed_at": serialize_datetime(self.no_confirmed_at),
            "non_pathological_background": self.non_pathological_background.serialize() if self.non_pathological_background else None,
            "pathological_background": self.pathological_background.serialize() if self.pathological_background else None,
            "family_background": self.family_background.serialize() if self.family_background else None,
            "gynecological_background": self.gynecological_background.serialize() if self.gynecological_background else None,
        }


# -------------------- MODELO: MedicalFileSnapshot --------------------


class MedicalFileSnapshot(db.Model):
    __tablename__ = "medical_file_snapshot"

    id = db.Column(db.Integer, primary_key=True)
    medical_file_id = db.Column(db.Integer, db.ForeignKey(
        'medical_file.id', ondelete="CASCADE"), nullable=False)
    url = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    uploaded_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    # Relaciones
    medical_file = relationship(
        "MedicalFile",
        back_populates="snapshots",
        passive_deletes=True
    )
    uploaded_by = relationship(
        "User",
        primaryjoin="User.id == foreign(MedicalFileSnapshot.uploaded_by_id)",
        foreign_keys="[MedicalFileSnapshot.uploaded_by_id]"
    )

    def serialize(self):
        return {
            "id": self.id,
            "medical_file_id": self.medical_file_id,
            "url": self.url,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "uploaded_by_id": self.uploaded_by_id
        }


# -------------------- MODELO: ProfessionalNote --------------------
class ProfessionalNote(db.Model):
    __tablename__ = "professional_note"

    id = db.Column(db.Integer, primary_key=True)
    medical_file_id = db.Column(db.Integer, db.ForeignKey(
        'medical_file.id', ondelete="CASCADE"), nullable=False)
    author_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    note = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    visible_to_patient = db.Column(db.Boolean, nullable=False, default=False)

    medical_file = relationship("MedicalFile", backref="professional_notes")
    author = relationship(
        "User",
        primaryjoin="User.id == foreign(ProfessionalNote.author_id)",
        foreign_keys="[ProfessionalNote.author_id]"
    )

    def serialize(self):
        return {
            "id": self.id,
            "medical_file_id": self.medical_file_id,
            "author_id": self.author_id,
            "note": self.note,
            "visible_to_patient": bool(self.visible_to_patient) if hasattr(self, 'visible_to_patient') else False,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


# -------------------- MODELO: MedicalFileModification --------------------
class MedicalFileModification(db.Model):
    __tablename__ = "medical_file_modification"

    id = db.Column(db.Integer, primary_key=True)
    medical_file_id = db.Column(db.Integer, db.ForeignKey(
        'medical_file.id', ondelete='CASCADE'), nullable=False)
    author_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    author_role = db.Column(db.String(30), nullable=True)
    # e.g. save_draft, send_for_review, professional_return, professional_approve, patient_confirm, patient_reject
    action = db.Column(db.String(50), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    payload = db.Column(db.JSON)
    snapshot_id = db.Column(db.Integer, db.ForeignKey(
        'medical_file_snapshot.id'), nullable=True)
    comment = db.Column(db.Text, nullable=True)

    # Metadata for audit
    ip = db.Column(db.String(100), nullable=True)
    user_agent = db.Column(db.String(512), nullable=True)

    medical_file = relationship("MedicalFile", foreign_keys=[medical_file_id])
    author = relationship("User", foreign_keys=[author_id])

    def serialize(self):
        return {
            "id": self.id,
            "medical_file_id": self.medical_file_id,
            "author_id": self.author_id,
            "author_role": self.author_role,
            "action": self.action,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "payload": self.payload,
            "snapshot_id": self.snapshot_id,
            "comment": self.comment,
            "ip": self.ip,
            "user_agent": self.user_agent
        }


# -------------------- MODELO: NonPathologicalBackground --------------------
class NonPathologicalBackground(db.Model):
    __tablename__ = "non_pathological_background"

    id = db.Column(db.Integer, primary_key=True)
    medical_file_id = db.Column(db.Integer, db.ForeignKey(
        'medical_file.id'), nullable=False)
    medical_file = relationship(
        "MedicalFile", back_populates="non_pathological_background")

    sex = db.Column(db.String(20))
    nationality = db.Column(db.String(80))
    ethnic_group = db.Column(db.String(80))
    languages = db.Column(db.JSON)
    blood_type = db.Column(db.String(5))
    spiritual_practices = db.Column(db.Text)
    other_origin_info = db.Column(db.Text)

    # Legacy consolidated address (kept for compatibility)
    address = db.Column(db.String(255))
    # Structured address fields (frontend provides by-parts)
    birth_country = db.Column(db.String(80))
    birth_state = db.Column(db.String(80))
    birth_city = db.Column(db.String(80))
    birth_neighborhood = db.Column(db.String(120))
    birth_street = db.Column(db.String(255))
    birth_ext_int = db.Column(db.String(80))
    birth_zip = db.Column(db.String(30))
    birth_other_info = db.Column(db.Text)

    residence_country = db.Column(db.String(80))
    residence_state = db.Column(db.String(80))
    residence_city = db.Column(db.String(80))
    residence_neighborhood = db.Column(db.String(120))
    residence_street = db.Column(db.String(255))
    residence_ext_int = db.Column(db.String(80))
    residence_zip = db.Column(db.String(30))
    residence_other_info = db.Column(db.Text)
    housing_type = db.Column(Enum(HousingType))
    civil_status = db.Column(Enum(CivilStatus))
    cohabitants = db.Column(db.JSON)
    dependents = db.Column(db.JSON)
    other_living_info = db.Column(db.Text)

    education_institution = db.Column(db.String(255))
    academic_degree = db.Column(db.String(100))
    career = db.Column(db.String(100))
    institute_registration_number = db.Column(db.String(50))
    other_education_info = db.Column(db.Text)

    economic_activity = db.Column(db.String(100))
    is_employer = db.Column(db.Boolean)
    other_occupation_info = db.Column(db.Text)

    has_medical_insurance = db.Column(Enum(YesNo))
    insurance_institution = db.Column(db.String(100))
    insurance_number = db.Column(db.String(50))
    other_insurance_info = db.Column(db.Text)

    diet_quality = db.Column(Enum(QualityLevel))
    meals_per_day = db.Column(db.Integer)
    daily_liquid_intake_liters = db.Column(db.Float)
    supplements = db.Column(db.Text)
    other_diet_info = db.Column(db.Text)

    hygiene_quality = db.Column(Enum(QualityLevel))
    other_hygiene_info = db.Column(db.Text)

    exercise_quality = db.Column(Enum(QualityLevel))
    exercise_details = db.Column(db.Text)
    sleep_quality = db.Column(Enum(QualityLevel))
    sleep_details = db.Column(db.Text)

    hobbies = db.Column(db.Text)
    recent_travel = db.Column(db.Text)
    # Legacy enum flags (yes/no) kept for compatibility
    has_piercings = db.Column(Enum(YesNo))
    has_tattoos = db.Column(Enum(YesNo))
    # Explicit booleans for checkbox state (preferred)
    piercings_bool = db.Column(db.Boolean)
    tattoos_bool = db.Column(db.Boolean)
    alcohol_use = db.Column(db.Text)
    tobacco_use = db.Column(db.Text)
    other_drug_use = db.Column(db.Text)
    # Explicit booleans for consumptions
    consume_tobacco = db.Column(db.Boolean)
    consume_alcohol = db.Column(db.Boolean)
    consume_recreational_drugs = db.Column(db.Boolean)
    addictions = db.Column(db.Text)
    other_recreational_info = db.Column(db.Text)

    # Structured lists / JSON fields (Postgres JSON/JSONB or TEXT fallback)
    education_records_json = db.Column(db.JSON)
    economic_activities_json = db.Column(db.JSON)
    recent_travel_list_json = db.Column(db.JSON)
    exercise_activities_json = db.Column(db.JSON)

    def serialize(self):
        return {
            "id": self.id,
            "medical_file_id": self.medical_file_id,
            "sex": self.sex,
            "nationality": self.nationality,
            "ethnic_group": self.ethnic_group,
            # Exponer multiselecciones como listas cuando sea posible
            "languages": ([s.strip() for s in self.languages.split(',')] if isinstance(self.languages, str) and self.languages.strip() else (self.languages or [])),
            "blood_type": self.blood_type,
            "spiritual_practices": self.spiritual_practices,
            "other_origin_info": self.other_origin_info,
            # Structured birth address parts
            "birth_country": self.birth_country,
            "birth_state": self.birth_state,
            "birth_city": self.birth_city,
            "birth_neighborhood": self.birth_neighborhood,
            "birth_street": self.birth_street,
            "birth_ext_int": self.birth_ext_int,
            "birth_zip": self.birth_zip,
            "birth_other_info": self.birth_other_info,
            # Structured residence address parts
            "residence_country": self.residence_country,
            "residence_state": self.residence_state,
            "residence_city": self.residence_city,
            "residence_neighborhood": self.residence_neighborhood,
            "residence_street": self.residence_street,
            "residence_ext_int": self.residence_ext_int,
            "residence_zip": self.residence_zip,
            "residence_other_info": self.residence_other_info,
            "civil_status": enum_name(self.civil_status),
            "address": self.address,
            "housing_type": enum_name(self.housing_type),
            "cohabitants": ([s.strip() for s in self.cohabitants.split(',')] if isinstance(self.cohabitants, str) and self.cohabitants.strip() else (self.cohabitants or [])),
            "dependents": ([s.strip() for s in self.dependents.split(',')] if isinstance(self.dependents, str) and self.dependents.strip() else (self.dependents or [])),
            "other_living_info": self.other_living_info,
            "education_institution": self.education_institution,
            "academic_degree": self.academic_degree,
            "career": self.career,
            "institute_registration_number": self.institute_registration_number,
            "other_education_info": self.other_education_info,
            "economic_activity": self.economic_activity,
            "is_employer": self.is_employer,
            "other_occupation_info": self.other_occupation_info,
            "has_medical_insurance": enum_name(self.has_medical_insurance),
            "insurance_institution": self.insurance_institution,
            "insurance_number": self.insurance_number,
            "other_insurance_info": self.other_insurance_info,
            "diet_quality": enum_name(self.diet_quality),
            "meals_per_day": self.meals_per_day,
            "daily_liquid_intake_liters": self.daily_liquid_intake_liters,
            "supplements": self.supplements,
            "other_diet_info": self.other_diet_info,
            "hygiene_quality": enum_name(self.hygiene_quality),
            "other_hygiene_info": self.other_hygiene_info,
            "exercise_quality": enum_name(self.exercise_quality),
            "exercise_details": self.exercise_details,
            "sleep_quality": enum_name(self.sleep_quality),
            "sleep_details": self.sleep_details,
            "hobbies": self.hobbies,
            "recent_travel": self.recent_travel,
            "has_piercings": enum_name(self.has_piercings),
            "piercings_bool": bool(self.piercings_bool) if hasattr(self, 'piercings_bool') else None,
            "has_tattoos": enum_name(self.has_tattoos),
            "tattoos_bool": bool(self.tattoos_bool) if hasattr(self, 'tattoos_bool') else None,
            "alcohol_use": self.alcohol_use,
            "tobacco_use": self.tobacco_use,
            "other_drug_use": self.other_drug_use,
            "addictions": self.addictions,
            "other_recreational_info": self.other_recreational_info,
            # Explicit booleans for consumptions
            "consume_tobacco": bool(self.consume_tobacco) if hasattr(self, 'consume_tobacco') else None,
            "consume_alcohol": bool(self.consume_alcohol) if hasattr(self, 'consume_alcohol') else None,
            "consume_recreational_drugs": bool(self.consume_recreational_drugs) if hasattr(self, 'consume_recreational_drugs') else None,
            # Structured lists
            "education_records_json": self.education_records_json,
            "economic_activities_json": self.economic_activities_json,
            "recent_travel_list_json": self.recent_travel_list_json,
            "exercise_activities_json": self.exercise_activities_json
        }

# -------------------- MODELO: PathologicalBackground --------------------


class PathologicalBackground(db.Model):
    __tablename__ = "pathological_background"

    id = db.Column(db.Integer, primary_key=True)
    medical_file_id = db.Column(db.Integer, db.ForeignKey(
        'medical_file.id'), nullable=False)
    medical_file = relationship("MedicalFile", back_populates="pathological_background")

    disability_description = db.Column(db.Text)
    visual_disability = db.Column(db.Boolean, default=False)
    hearing_disability = db.Column(db.Boolean, default=False)
    motor_disability = db.Column(db.Boolean, default=False)
    intellectual_disability = db.Column(db.Boolean, default=False)

    chronic_diseases = db.Column(db.Text)
    current_medications = db.Column(db.Text)
    hospitalizations = db.Column(db.Text)
    surgeries = db.Column(db.Text)
    accidents = db.Column(db.Text)
    transfusions = db.Column(db.Text)
    allergies = db.Column(db.Text)
    other_pathological_info = db.Column(db.Text)

    # Structured JSON/List fields to store frontend-provided lists verbatim
    personal_diseases_list = db.Column(db.JSON)
    medications_list = db.Column(db.JSON)
    hospitalizations_list = db.Column(db.JSON)
    traumatisms_list = db.Column(db.JSON)
    transfusions_list = db.Column(db.JSON)

    def serialize(self):
        return {
            "id": self.id,
            "medical_file_id": self.medical_file_id,
            "disability_description": self.disability_description,
            "visual_disability": self.visual_disability,
            "hearing_disability": self.hearing_disability,
            "motor_disability": self.motor_disability,
            "intellectual_disability": self.intellectual_disability,
            "chronic_diseases": self.chronic_diseases,
            "personal_diseases_list": self.personal_diseases_list,
            "current_medications": self.current_medications,
            "medications_list": self.medications_list,
            "hospitalizations": self.hospitalizations,
            "hospitalizations_list": self.hospitalizations_list,
            "surgeries": self.surgeries,
            "accidents": self.accidents,
            "transfusions": self.transfusions,
            "transfusions_list": self.transfusions_list,
            "allergies": self.allergies,
            "other_pathological_info": self.other_pathological_info
        }

# -------------------- MODELO: FamilyBackground --------------------


class FamilyBackground(db.Model):
    __tablename__ = "family_background"

    id = db.Column(db.Integer, primary_key=True)
    medical_file_id = db.Column(db.Integer, db.ForeignKey(
        'medical_file.id'), nullable=False)
    medical_file = relationship("MedicalFile", back_populates="family_background")

    hypertension = db.Column(db.Boolean, default=False)
    diabetes = db.Column(db.Boolean, default=False)
    cancer = db.Column(db.Boolean, default=False)
    mental_illnesses = db.Column(db.Boolean, default=False)
    congenital_diseases = db.Column(db.Boolean, default=False)
    heart_diseases = db.Column(db.Boolean, default=False)
    liver_diseases = db.Column(db.Boolean, default=False)
    kidney_diseases = db.Column(db.Boolean, default=False)
    other_family_background_info = db.Column(db.Text)

    def serialize(self):
        return {
            "id": self.id,
            "medical_file_id": self.medical_file_id,
            "hypertension": self.hypertension,
            "diabetes": self.diabetes,
            "cancer": self.cancer,
            "mental_illnesses": self.mental_illnesses,
            "congenital_diseases": self.congenital_diseases,
            "heart_diseases": self.heart_diseases,
            "liver_diseases": self.liver_diseases,
            "kidney_diseases": self.kidney_diseases,
            "other_family_background_info": self.other_family_background_info
        }

# -------------------- MODELO: GynecologicalBackground --------------------


class GynecologicalBackground(db.Model):
    __tablename__ = "gynecological_background"

    id = db.Column(db.Integer, primary_key=True)
    medical_file_id = db.Column(db.Integer, db.ForeignKey(
        'medical_file.id'), nullable=False)
    medical_file = relationship(
        "MedicalFile", back_populates="gynecological_background")

    menarche_age = db.Column(db.Integer)
    pregnancies = db.Column(db.Integer)
    births = db.Column(db.Integer)
    c_sections = db.Column(db.Integer)
    abortions = db.Column(db.Integer)
    contraceptive_methods = db.Column(db.String(255))
    other_gynecological_info = db.Column(db.Text)

    def serialize(self):
        return {
            "id": self.id,
            "medical_file_id": self.medical_file_id,
            "menarche_age": self.menarche_age,
            "pregnancies": self.pregnancies,
            "births": self.births,
            "c_sections": self.c_sections,
            "abortions": self.abortions,
            "contraceptive_methods": self.contraceptive_methods,
            "other_gynecological_info": self.other_gynecological_info
        }
