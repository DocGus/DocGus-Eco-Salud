from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '5755ee81f8c9'
down_revision = '10816d547412'
branch_labels = None
depends_on = None

def upgrade():
    with op.batch_alter_table('professional_student_data', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                'academic_grade_prof',
                sa.Enum('licenciatura', 'especialidad', 'maestria', 'doctorado', 'pos_doctorado', name='academicgradeprof'),
                nullable=False,
                server_default='licenciatura'  # Valor por defecto temporal
            )
        )
    # Quitar el valor por defecto si quieres dejarlo sin default después:
    op.alter_column('professional_student_data', 'academic_grade_prof', server_default=None)

def downgrade():
    with op.batch_alter_table('professional_student_data', schema=None) as batch_op:
        batch_op.drop_column('academic_grade_prof')
