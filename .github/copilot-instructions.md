<!-- Instrucciones para agentes Copilot / IA que contribuyen código en este repo -->

# Guía rápida para agentes IA

Este repositorio contiene una API en Flask (Python) y una SPA en React (Vite). Aquí van las piezas clave, comandos reproducibles y patrones específicos que te permiten ser productivo rápidamente.

1. Arquitectura (big picture)

- Backend: `src/app.py` es el arranque principal de la API (Flask). Los recursos REST están en `src/api/routes.py` y la lógica de datos en `src/api/models.py`.
- Frontend: código React en `src/front/` (Vite). El build del frontend se coloca en `dist/` y Flask sirve los archivos estáticos desde `src/../dist/` (ver `static_file_dir` en `src/app.py`).
- DB y migraciones: Alembic + Flask-Migrate; migrations en `migrations/` y `alembic.ini` están presentes.
- Deploys: hay artefactos para Render (`render.yaml`, `Dockerfile.render`) y para deployment genérico (`Procfile`, `Dockerfile.test`).

2. Comandos de desarrollo y build

- Instalar dependencias Python: `python3 -m pip install -r requirements.txt`
- Instalar dependencias de desarrollo/test: `python3 -m pip install -r requirements-test.txt`
- Frontend (desarrollo): `npm run dev` (usa `vite`).
- Frontend (build para producción): `npm run build` → salida que Flask sirve debe estar en `dist/` raíz del repo.
- Ejecutar backend en desarrollo: `FLASK_DEBUG=1 python3 -m src.wsgi` (o `python3 -m src.wsgi`).
- Ejecutar con Gunicorn (producción): `gunicorn -b 0.0.0.0:$PORT wsgi:application`.
- CLI Flask (migrations, comandos personalizados): exportar app para Flask CLI `export FLASK_APP=src.app` y luego usar por ejemplo `flask db upgrade` o comandos definidos en `src/api/commands.py`.

3. Tests y fixture DB

- Ejecutar tests: `pytest` desde la raíz del repo.
- Tests con DB: `tests/conftest.py` busca `DATABASE_URL` o `TEST_DB_URL` y solo intentará conectar si la URL comienza con `postgres` y `psycopg2` está instalado.
- Si no hay Postgres disponible, el fixture `db_conn` devuelve `{'available': False}` y muchos tests están preparados para saltarse o adaptarse.
- Nota importante: los tests limpian entradas de prueba usando prefijos de email (`adm%`, `prof%`, `stud%`, `pat%`). Evita colisiones con datos reales.

4. Integraciones externas y variables de entorno relevantes

- Cloudinary: la app usa `cloudinary` (ver tests `test_cloudinary_upload.py`). Conf de Cloudinary se gestiona vía variables de entorno (API keys) — no está hardcodeada en repo.
- Postgres: controla con `DATABASE_URL` / `TEST_DB_URL`. `src/app.py` normaliza `postgres://` → `postgresql://` y compatibiliza con SQLite si `FORCE_SQLITE=1` o si `psycopg2` no está disponible.
- Variables útiles:
  - `DATABASE_URL`, `TEST_DB_URL` — conexión a Postgres
  - `FORCE_SQLITE=1` — forzar SQLite local
  - `AUTO_CREATE_SCHEMA` — si `1`, el app crea tablas automáticamente en SQLite
  - `MIGRATE_ON_START` / `MIGRATE_FROM_URL` — migración opcional desde BD legacy al arrancar

5. Convenciones y patrones del código (específicos del repo)

- Comentarios y textos están mayormente en español; mantén mensajes y documentación en español cuando añadas texto visible.
- Backend:
  - `src/api/*` contiene `routes.py`, `models.py`, `utils.py` y `admin.py` (admin UI). Cambios en modelos deben acompañarse de migrations en `migrations/versions/`.
  - `src/app.py` crea la app y aplica lógica de fallback a SQLite cuando Postgres no es viable.
- Frontend:
  - React + Vite con rutas en `src/front/routes.jsx` y páginas en `src/front/pages/` (ej. `Home.jsx`). Usa `react-router-dom` v6 APIs.
  - Componentes reutilizables en `src/front/components/` y hooks en `src/front/hooks/` (ej. `useGlobalReducer.jsx`).
  - Estilos usan variables CSS (ej. `var(--brand-bg)`) y clases Bootstrap utilitarias.

6. Pistas prácticas y ejemplos concretos

- Para verificar un endpoint de snapshot: tests en `tests/test_snapshot_api.py` y la limpieza en `tests/conftest.py`.
- Para reproducir flujo front→back local:
  1. `npm run dev` (frontend en `localhost:5173` por defecto)
  2. `FLASK_DEBUG=1 python3 -m src.wsgi` (backend en `localhost:5000`)
  3. Ajusta CORS/URLs en `src/app.py` si necesitas restringir orígenes (CORS ya está configurado con `*`).

7. Qué buscar antes de modificar algo crítico

- Cambios en modelos → actualizar `migrations/` y correr `flask db upgrade` en entornos con Postgres.
- Si introduces dependencias nativas (psycopg2), documenta requisitos del sistema y preferiblemente usa `psycopg2-binary` en entornos CI donde compilar no sea viable.
- Evita tocar la variable `JWT_SECRET_KEY` en `src/app.py` sin proponer una configuración via env var o secreto en el entorno de despliegue.

8. Preguntas que hacer al autor

- ¿Dónde esperan que se publique el frontend build (`dist/` o `public/`)? `src/app.py` sirve desde `../dist/` — confirma si `npm run build` ya apunta ahí.

Si algo de esto está incompleto o quieres que añada snippets de comandos CI/CD (GitHub Actions, Render, Docker-compose), dime qué flujo quieres priorizar y lo incorporo.

---

Archivo generado automáticamente por un agente IA. Por favor revisa y ajusta secretos/valores por seguridad antes de aceptar PRs que expongan configuraciones.
