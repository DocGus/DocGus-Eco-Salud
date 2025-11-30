**Propuesta: actualizar Flask-Admin**

- **Motivo**: Warnings deprecatorios observados durante `pytest` provienen en parte de `Flask-Admin` empaquetado en el entorno. Actualizar a la última 1.x puede resolver algunos warnings.
- **Cambio propuesto**: `Flask-Admin==1.6.1` → `Flask-Admin==1.6.2` (archivo `requirements.txt` en rama `chore/update-flask-admin`).
- **Pasos Sugeridos**:
  1. Crear PR con el cambio en `requirements.txt` y agregar nota en el PR describiendo por qué se actualiza.
  2. Ejecutar `pip install -r requirements.txt` en CI y correr la suite `pytest`.
  3. Revisar warnings/fallos y, si es necesario, actualizar código de compatibilidad (p. ej. cambios de API en Flask-Admin).
  4. Merge cuando CI pase y revisiones aprobadas.

- **Notas**: Si la actualización mayor es necesaria (p. ej. cambios a 2.x), abrir PR separado y revisar breaking changes.
