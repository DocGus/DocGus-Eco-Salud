"""
Backfill script: tries to populate the new structured JSON/list fields from legacy consolidated text
Use with the app context, e.g.:

FLASK_APP=src.app flask shell
>>> from scripts.backfill_structured_backgrounds import run_backfill
>>> run_backfill(dry_run=True)

Set dry_run=False to commit changes.
"""
from src.api.models import db, PathologicalBackground, NonPathologicalBackground
import re


def split_entries(text):
    if not text:
        return []
    parts = re.split(r"\s*;\s*|\r?\n", text)
    parts = [p.strip() for p in parts if p and p.strip()]
    if len(parts) == 1:
        numbered = re.split(r"\s*\d+\)\s*", text)
        numbered = [p.strip() for p in numbered if p and p.strip()]
        if len(numbered) > 1:
            return numbered
    return parts


def run_backfill(dry_run=True, limit=None):
    """Run backfill for pathological and non-pathological backgrounds.

    dry_run: if True, only print changes.
    limit: optional limit to number of records to process.
    """
    q = PathologicalBackground.query
    count = 0
    for pb in q.yield_per(50):
        changed = False
        # Try to populate medications_list
        if (not getattr(pb, 'medications_list', None)) and pb.current_medications:
            meds = split_entries(pb.current_medications)
            if meds:
                pb.medications_list = meds
                changed = True
        # personal diseases
        if (not getattr(pb, 'personal_diseases_list', None)) and pb.chronic_diseases:
            pd = split_entries(pb.chronic_diseases)
            if pd:
                pb.personal_diseases_list = pd
                changed = True
        # hospitalizations
        if (not getattr(pb, 'hospitalizations_list', None)) and pb.hospitalizations:
            hb = split_entries(pb.hospitalizations)
            if hb:
                pb.hospitalizations_list = hb
                changed = True

        # Map transfusions text -> list if possible
        if (not getattr(pb, 'transfusions_list', None)) and pb.transfusions:
            tr = split_entries(pb.transfusions)
            if tr:
                pb.transfusions_list = tr
                changed = True

        if changed:
            print(
                f"[PB] Would update id={pb.id}: medications_list={bool(pb.medications_list)}, personal_diseases_list={bool(pb.personal_diseases_list)}")
            if not dry_run:
                db.session.add(pb)
                try:
                    db.session.commit()
                except Exception as e:
                    db.session.rollback()
                    print(f"Failed to commit pb id={pb.id}: {e}")
        count += 1
        if limit and count >= limit:
            break

    # Non-pathological backgrounds: map legacy has_tattoos/has_piercings (YesNo) -> booleans
    q2 = NonPathologicalBackground.query
    count = 0
    for nb in q2.yield_per(50):
        changed = False
        try:
            if getattr(nb, 'has_tattoos', None) and getattr(nb, 'tattoos_bool', None) is None:
                nb.tattoos_bool = True if nb.has_tattoos and nb.has_tattoos.value == 'yes' else False
                changed = True
        except Exception:
            pass
        try:
            if getattr(nb, 'has_piercings', None) and getattr(nb, 'piercings_bool', None) is None:
                nb.piercings_bool = True if nb.has_piercings and nb.has_piercings.value == 'yes' else False
                changed = True
        except Exception:
            pass
        if changed:
            print(
                f"[NB] Would update id={nb.id}: tattoos_bool={nb.tattoos_bool}, piercings_bool={nb.piercings_bool}")
            if not dry_run:
                db.session.add(nb)
                try:
                    db.session.commit()
                except Exception as e:
                    db.session.rollback()
                    print(f"Failed to commit nb id={nb.id}: {e}")
        count += 1
        if limit and count >= limit:
            break

    print("Backfill finished.")


if __name__ == '__main__':
    print("Run this module from a Flask shell or import run_backfill and call it.")
