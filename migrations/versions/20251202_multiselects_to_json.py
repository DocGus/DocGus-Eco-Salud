"""migrate multiselect columns to JSON arrays (data migration)

Revision ID: 20251202_multiselects_to_json
Revises: 20251130_structured_bgs
Create Date: 2025-12-02 10:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
import json


# revision identifiers, used by Alembic.
revision = '20251202_multiselects_to_json'
down_revision = '20251130_structured_bgs'
branch_labels = None
depends_on = None


def _normalize(val):
    if val is None:
        return []
    if isinstance(val, (list, tuple)):
        return list(val)
    try:
        if isinstance(val, bytes):
            val = val.decode('utf-8')
    except Exception:
        pass
    s = str(val).strip()
    if not s:
        return []
    if s.startswith('['):
        try:
            parsed = json.loads(s)
            if isinstance(parsed, list):
                return parsed
        except Exception:
            pass
    parts = [p.strip() for p in s.split(',') if p.strip()]
    return parts


def upgrade():
    conn = op.get_bind()
    # fetch all rows
    rows = conn.execute(
        sa.text('SELECT id, languages, cohabitants, dependents FROM non_pathological_background')
    ).fetchall()

    for r in rows:
        nid = r['id']
        updates = {}
        for col in ('languages', 'cohabitants', 'dependents'):
            v = r[col]
            norm = _normalize(v)
            # Compare current representation to normalized
            should_update = False
            if v is None:
                if norm:
                    should_update = True
            elif isinstance(v, (list, tuple)):
                if list(v) != norm:
                    should_update = True
            else:
                s = str(v).strip()
                if s.startswith('['):
                    try:
                        parsed = json.loads(s)
                        if parsed != norm:
                            should_update = True
                    except Exception:
                        should_update = True
                else:
                    csv_parts = [p.strip() for p in s.split(',') if p.strip()]
                    if csv_parts != norm:
                        should_update = True

            if should_update:
                updates[col] = json.dumps(norm, ensure_ascii=False)

        if updates:
            # build update statement
            stmt = sa.text(
                'UPDATE non_pathological_background SET ' + ', '.join([f"{k} = :{k}" for k in updates.keys()]) + ' WHERE id = :id'
            )
            params = {**updates, 'id': nid}
            conn.execute(stmt, **params)


def downgrade():
    # Data migrations are not easily reversible; leave as no-op.
    pass
