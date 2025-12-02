#!/usr/bin/env python3
"""
Script para normalizar columnas multiselección en la tabla
`non_pathological_background` convirtiendo valores legacy
(CSV o JSON-strings) a arrays JSON.

Uso:
  DATABASE_URL=sqlite:///dev.db python3 scripts/convert_multiselects.py

Si no se provee `DATABASE_URL`, usará `sqlite:///dev.db`.
"""
import os
import json
import sys
from sqlalchemy import create_engine, MetaData, Table, select


def normalize(val):
    if val is None:
        return []
    if isinstance(val, (list, tuple)):
        return list(val)
    if isinstance(val, bytes):
        val = val.decode('utf-8')
    s = str(val).strip()
    if not s:
        return []
    # If looks like a JSON array, try to parse
    if s.startswith('['):
        try:
            parsed = json.loads(s)
            if isinstance(parsed, list):
                return parsed
        except Exception:
            pass
    # Fallback: split by comma
    parts = [p.strip() for p in s.split(',') if p.strip()]
    return parts


def main():
    url = os.getenv('DATABASE_URL') or os.getenv('TEST_DB_URL') or 'sqlite:///dev.db'
    engine = create_engine(url)
    metadata = MetaData()
    # reflect only the table we need
    metadata.reflect(bind=engine, only=['non_pathological_background'])
    if 'non_pathological_background' not in metadata.tables:
        print('Tabla `non_pathological_background` no encontrada en la base de datos.')
        sys.exit(1)
    table = Table('non_pathological_background', metadata, autoload_with=engine)

    conn = engine.connect()
    sel = select(table.c.id, table.c.languages, table.c.cohabitants, table.c.dependents)
    result = conn.execute(sel)
    # use mappings() so rows can be accessed by column name
    try:
        rows = result.mappings().all()
    except Exception:
        # fallback for older SQLAlchemy
        rows = [dict(zip(result.keys(), r)) for r in result.fetchall()]
    print(f'Filas comprobadas: {len(rows)}')
    updated = 0
    for r in rows:
        nid = r['id']
        updates = {}
        for col in ('languages', 'cohabitants', 'dependents'):
            v = r[col]
            norm = normalize(v)
            # Determine if update is necessary
            needs_update = False
            if v is None:
                if norm:
                    needs_update = True
            elif isinstance(v, (list, tuple)):
                if list(v) != norm:
                    needs_update = True
            else:
                s = str(v).strip()
                if s.startswith('['):
                    try:
                        parsed = json.loads(s)
                        if parsed != norm:
                            needs_update = True
                    except Exception:
                        needs_update = True
                else:
                    # compare CSV normalized
                    csv_parts = [p.strip() for p in s.split(',') if p.strip()]
                    if csv_parts != norm:
                        needs_update = True

            if needs_update:
                updates[col] = json.dumps(norm, ensure_ascii=False)

        if updates:
            upd = table.update().where(table.c.id == nid).values(**updates)
            conn.execute(upd)
            updated += 1

    print(f'Filas actualizadas: {updated}')
    conn.close()


if __name__ == '__main__':
    main()
