"""empty message

Revision ID: 10816d547412
Revises: 272b0b22cf4a
Create Date: 2025-07-10 18:38:31.512019

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '10816d547412'
down_revision = '272b0b22cf4a'
branch_labels = None
depends_on = None


def upgrade():
    # Crear explícitamente el nuevo ENUM
    academicgradeprof = postgresql.ENUM(
        'licenciatura', 'especialidad', 'maestria', 'doctorado', 'pos_doctorado',
        name='academicgradeprof'
    )
    academicgradeprof.create(op.get_bind())

    old_enum = postgresql.ENUM(
        'no_formal_education', 'elementary_school', 'middle_school', 'high_school',
        'technical', 'bachelor', 'postgraduate_studies', name='academicgrade'
    )

    with op.batch_alter_table('professional_student_data', schema=None) as batch_op:
        batch_op.alter_column(
            'academic_grade',
            existing_type=old_enum,
            type_=academicgradeprof,
            existing_nullable=False,
            postgresql_using="academic_grade::text::academicgradeprof"
        )


def downgrade():
    # Volver al enum anterior
    old_enum = postgresql.ENUM(
        'no_formal_education', 'elementary_school', 'middle_school', 'high_school',
        'technical', 'bachelor', 'postgraduate_studies', name='academicgrade'
    )

    with op.batch_alter_table('professional_student_data', schema=None) as batch_op:
        batch_op.alter_column(
            'academic_grade',
            existing_type=postgresql.ENUM(
                'licenciatura', 'especialidad', 'maestria', 'doctorado', 'pos_doctorado',
                name='academicgradeprof'
            ),
            type_=old_enum,
            existing_nullable=False,
            postgresql_using="academic_grade::text::academicgrade"
        )

    # Eliminar enum nuevo
    academicgradeprof = postgresql.ENUM(
        'licenciatura', 'especialidad', 'maestria', 'doctorado', 'pos_doctorado',
        name='academicgradeprof'
    )
    academicgradeprof.drop(op.get_bind())
