"""add structured background fields and JSON lists

Revision ID: 20251130_structured_bgs
Revises: 9999addmodhist
Create Date: 2025-11-30 12:45:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = '20251130_structured_bgs'
down_revision = '9999addmodhist'
branch_labels = None
depends_on = None


def upgrade():
    # NonPathologicalBackground additions
    with op.batch_alter_table('non_pathological_background', schema=None) as batch_op:
        batch_op.add_column(sa.Column('birth_country', sa.String(length=80), nullable=True))
        batch_op.add_column(sa.Column('birth_state', sa.String(length=80), nullable=True))
        batch_op.add_column(sa.Column('birth_city', sa.String(length=80), nullable=True))
        batch_op.add_column(sa.Column('birth_neighborhood', sa.String(length=120), nullable=True))
        batch_op.add_column(sa.Column('birth_street', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('birth_ext_int', sa.String(length=80), nullable=True))
        batch_op.add_column(sa.Column('birth_zip', sa.String(length=30), nullable=True))
        batch_op.add_column(sa.Column('birth_other_info', sa.Text(), nullable=True))

        batch_op.add_column(sa.Column('residence_country', sa.String(length=80), nullable=True))
        batch_op.add_column(sa.Column('residence_state', sa.String(length=80), nullable=True))
        batch_op.add_column(sa.Column('residence_city', sa.String(length=80), nullable=True))
        batch_op.add_column(sa.Column('residence_neighborhood', sa.String(length=120), nullable=True))
        batch_op.add_column(sa.Column('residence_street', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('residence_ext_int', sa.String(length=80), nullable=True))
        batch_op.add_column(sa.Column('residence_zip', sa.String(length=30), nullable=True))
        batch_op.add_column(sa.Column('residence_other_info', sa.Text(), nullable=True))

        batch_op.add_column(sa.Column('piercings_bool', sa.Boolean(), nullable=True))
        batch_op.add_column(sa.Column('tattoos_bool', sa.Boolean(), nullable=True))

        batch_op.add_column(sa.Column('consume_tobacco', sa.Boolean(), nullable=True))
        batch_op.add_column(sa.Column('consume_alcohol', sa.Boolean(), nullable=True))
        batch_op.add_column(sa.Column('consume_recreational_drugs', sa.Boolean(), nullable=True))

        # JSON fields (Postgres) - Alembic/SQLAlchemy will handle on SQLite as TEXT if needed
        try:
            batch_op.add_column(sa.Column('education_records_json', sa.JSON(), nullable=True))
            batch_op.add_column(sa.Column('economic_activities_json', sa.JSON(), nullable=True))
            batch_op.add_column(sa.Column('recent_travel_list_json', sa.JSON(), nullable=True))
            batch_op.add_column(sa.Column('exercise_activities_json', sa.JSON(), nullable=True))
        except Exception:
            # Fallback: create TEXT columns if JSON unsupported at runtime
            batch_op.add_column(sa.Column('education_records_json', sa.Text(), nullable=True))
            batch_op.add_column(sa.Column('economic_activities_json', sa.Text(), nullable=True))
            batch_op.add_column(sa.Column('recent_travel_list_json', sa.Text(), nullable=True))
            batch_op.add_column(sa.Column('exercise_activities_json', sa.Text(), nullable=True))

    # PathologicalBackground additions
    with op.batch_alter_table('pathological_background', schema=None) as batch_op:
        try:
            batch_op.add_column(sa.Column('personal_diseases_list', sa.JSON(), nullable=True))
            batch_op.add_column(sa.Column('medications_list', sa.JSON(), nullable=True))
            batch_op.add_column(sa.Column('hospitalizations_list', sa.JSON(), nullable=True))
            batch_op.add_column(sa.Column('traumatisms_list', sa.JSON(), nullable=True))
            batch_op.add_column(sa.Column('transfusions_list', sa.JSON(), nullable=True))
        except Exception:
            batch_op.add_column(sa.Column('personal_diseases_list', sa.Text(), nullable=True))
            batch_op.add_column(sa.Column('medications_list', sa.Text(), nullable=True))
            batch_op.add_column(sa.Column('hospitalizations_list', sa.Text(), nullable=True))
            batch_op.add_column(sa.Column('traumatisms_list', sa.Text(), nullable=True))
            batch_op.add_column(sa.Column('transfusions_list', sa.Text(), nullable=True))


def downgrade():
    with op.batch_alter_table('pathological_background', schema=None) as batch_op:
        batch_op.drop_column('transfusions_list')
        batch_op.drop_column('traumatisms_list')
        batch_op.drop_column('hospitalizations_list')
        batch_op.drop_column('medications_list')
        batch_op.drop_column('personal_diseases_list')

    with op.batch_alter_table('non_pathological_background', schema=None) as batch_op:
        batch_op.drop_column('exercise_activities_json')
        batch_op.drop_column('recent_travel_list_json')
        batch_op.drop_column('economic_activities_json')
        batch_op.drop_column('education_records_json')

        batch_op.drop_column('consume_recreational_drugs')
        batch_op.drop_column('consume_alcohol')
        batch_op.drop_column('consume_tobacco')

        batch_op.drop_column('tattoos_bool')
        batch_op.drop_column('piercings_bool')

        batch_op.drop_column('residence_other_info')
        batch_op.drop_column('residence_zip')
        batch_op.drop_column('residence_ext_int')
        batch_op.drop_column('residence_street')
        batch_op.drop_column('residence_neighborhood')
        batch_op.drop_column('residence_city')
        batch_op.drop_column('residence_state')
        batch_op.drop_column('residence_country')

        batch_op.drop_column('birth_other_info')
        batch_op.drop_column('birth_zip')
        batch_op.drop_column('birth_ext_int')
        batch_op.drop_column('birth_street')
        batch_op.drop_column('birth_neighborhood')
        batch_op.drop_column('birth_city')
        batch_op.drop_column('birth_state')
        batch_op.drop_column('birth_country')
