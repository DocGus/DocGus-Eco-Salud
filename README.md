# DocGus — Plataforma de Gestión de Solicitudes (visión técnica)

> Versión técnica del README. Documento creado como vista previa profesional; se añadió a la raíz del repositorio tras tu aprobación.

## Índice

- Descripción general
- Estructura del proyecto
- Tecnologías y versiones clave
- Arquitectura y prácticas de diseño
- Instrucciones de instalación y configuración
  - Backend
  - Frontend
  - Base de datos (PostgreSQL vía Docker)
  - Suite de pruebas (propuesta: Cypress)
- Modo agente: sugerencias operativas
- Visualización y comprobación
- Tiempo estimado de trabajo y próximos pasos

---

## Descripción general

**Propósito**
DocGus es una plataforma full‑stack para gestionar solicitudes, validaciones y flujos entre distintos roles (pacientes, estudiantes, profesionales y administradores). Permite crear y revisar solicitudes, subir archivos, seguir el progreso de pacientes/estudiantes y administrar usuarios desde dashboards por rol.

**Contexto del autor**
Como autor técnico, diseñé la aplicación para facilitar despliegues en PaaS (Render/Heroku) y para un ciclo de desarrollo claro: frontend React (Vite) y backend Flask (Python) con SQLAlchemy y migraciones mediante Alembic.

---

## Estructura del proyecto (árbol adaptado al repo)

Ejemplo del árbol de carpetas con los ficheros clave (recortado a lo relevante):

```
/
├─ 4geeks.ico
├─ Dockerfile.render
├─ Procfile
├─ Pipfile
├─ Pipfile.lock
├─ package.json
├─ requirements.txt
├─ render.yaml
├─ render_build.sh
├─ public/
│  ├─ index.html
│  └─ bundle.js
├─ docs/
│  ├─ CHANGE_LOG.md
│  └─ HELP.md
├─ src/
│  ├─ app.py
│  ├─ wsgi.py
│  ├─ api/
│  │  ├─ __init__.py
│  │  ├─ admin.py
│  │  ├─ commands.py
│  │  ├─ models.py
│  │  ├─ routes.py
│  │  └─ utils.py
│  └─ front/
│     ├─ main.jsx
│     ├─ index.css
│     ├─ routes.jsx
│     ├─ store.js
│     ├─ components/
│     │  ├─ BackendURL.jsx
│     │  ├─ Login.jsx
│     │  └─ Register.jsx
│     ├─ hooks/
│     │  └─ useGlobalReducer.jsx
│     └─ pages/
│        ├─ Home.jsx
│        ├─ AdminDash.jsx
│        ├─ StudentDash.jsx
│        ├─ ProfessionalDash.jsx
│        └─ StudentRequestProfessional.jsx
└─ README.md (este fichero)
```

**Nota:** no existe `validator.ts` en este repositorio: el frontend está implementado en JavaScript/JSX. Si deseas centralizar validaciones puedo proponer `src/front/utils/validator.js` o introducir TypeScript (`validator.ts`) como paso adicional.

---

## Tecnologías y versiones (extraídas del repositorio)

**Frontend**

- Node: >= 20.0.0 (declarado en `package.json`)
- React: 18.2.0
- react-dom: 18.2.0
- react-router-dom: 6.18.0
- Vite: 4.4.8
- DevDependencies relevantes:
  - @vitejs/plugin-react: ^4.0.4
  - eslint: ^8.46.0
  - @types/react: ^18.2.18 (dev)

**Backend (Python)**

- Python: recomendado 3.10.x (Pipfile indica 3.13; revisar y alinear)
- Flask: 1.1.2
- Flask‑SQLAlchemy: 2.4.4
- SQLAlchemy: 1.3.23
- Alembic: 1.5.4
- Gunicorn: 20.0.4
- psycopg2-binary: 2.8.6
- flask-migrate: 2.6.0
- flask-cors: 3.0.10

**Otras dependencias**

- cloudinary: 1.24.0
- html2canvas: ^1.4.1

**Observación:** Cypress no está presente en el repo; propongo integrar Cypress 12.x si quieres E2E.

---

## Arquitectura y prácticas de diseño

**Visión general**

- Monorepo con separación lógica entre `src/front` (frontend) y `src/api` (backend).
- Backend RESTful con Flask, autenticación JWT (`flask_jwt_extended`) y CORS en desarrollo.
- ORM: SQLAlchemy con migraciones gestionadas por Alembic/Flask‑Migrate.
- Frontend SPA: React + Vite (HMR para desarrollo).
- Despliegue orientado a PaaS (Render/Gunicorn) con assets servidos por Flask en producción.

**Patrones y buenas prácticas aplicadas**

- Separación de responsabilidades: modelos, rutas y utilidades en módulos distintos.
- Configuration 12‑factor: variables de entorno (`DATABASE_URL`, `FLASK_DEBUG`, `PORT`).
- Migrations‑first: utilizar Alembic para versionado de esquema.
- Uso de Cloudinary para almacenamiento de assets y evitar BLOBs en la BD.

**Seguridad y recomendaciones para producción**

- Rotar `JWT_SECRET_KEY` y no comitear secretos.
- Restringir CORS en producción a orígenes permitidos.
- Gestionar credenciales con un secret manager o variables de entorno seguras.

---

## Instrucciones de instalación y configuración

### Requisitos previos

- Git
- Node >= 20, npm o Yarn
- Python 3.10+ (recomendado)
- Docker (si usarás Postgres en contenedor)

### Clonar el repositorio

```bash
git clone <repo-url>
cd DocGus-Eco-Salud
```

### Frontend (desarrollo)

```bash
npm install
npm run dev
# abrir http://localhost:3000
```

Build producción

```bash
npm run build
# salida -> dist/
```

### Backend (entorno virtual)

Opción A — venv + pip (recomendado)

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export FLASK_APP=src/app.py
export FLASK_ENV=development
# Si no exportas DATABASE_URL, el app usa SQLite temporal
flask run -p 3001 -h 0.0.0.0
# backend en http://localhost:3001
```

Opción B — Pipenv (usa `Pipfile`)

```bash
pipenv install --dev
pipenv shell
pipenv run start
```

### PostgreSQL con Docker (recomendado para dev local)

```bash
docker run -d --name docgus-postgres \
  -e POSTGRES_USER=gitpod \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=example \
  -p 5432:5432 \
  postgres:13

export DATABASE_URL="postgres://gitpod:postgres@localhost:5432/example"
# ejecutar migraciones si es necesario:
flask db upgrade
```

### Suite de pruebas (propuesta: Cypress)

Instalación propuesta

```bash
npm install --save-dev cypress@^12.0.0
```

Scripts sugeridos en `package.json`

```json
"scripts": {
  "cypress:open": "cypress open",
  "cypress:run": "cypress run"
}
```

Estructura sugerida de tests

```
cypress/
  e2e/
    auth.spec.js
    flows.spec.js
```

Nota: los tests E2E requieren datos de prueba estables; usar fixtures o BD temporal orquestada con `docker-compose`.

---

## Modo agente — sugerencias operativas (acciones propuestas)

Acciones que puedo ejecutar cuando autorizas:

1. Crear `README.md` en la rama `docs/add-readme` y abrir un PR (hecho: este fichero se añadió tras tu aprobación).
2. (Opcional) Añadir `docker-compose.yml` para orquestar `app` + `postgres` en desarrollo.
3. (Opcional) Scaffold de `cypress/` con 2 tests E2E de ejemplo y añadir scripts en `package.json`.
4. (Opcional) Crear `src/front/utils/validator.js` para centralizar validaciones del frontend (sin migrar a TS).
5. (Opcional) Añadir `docs/DEVELOPER_GUIDE.md` con comandos y flujos comunes.

Comandos que usaría para aplicar cambios

```bash
git checkout -b docs/add-readme
# crear README.md con el contenido aprobado
git add README.md
git commit -m "docs: add project README (technical overview)"
git push --set-upstream origin docs/add-readme
# abrir PR
```

---

## Visualización y comprobación

Puedes pegar el contenido de este `README.md` en https://dillinger.io/ para verificar el render. Si quieres ajustes de estilo, idioma o mayor nivel técnico (diagramas, secuencias), indícalo y lo adapto.

## Tiempo estimado

# DocGus — Plataforma de Gestión de Solicitudes (visión técnica)

Plataforma full-stack para gestionar solicitudes, validaciones y flujos entre roles (pacientes, estudiantes, profesionales y administradores). Permite crear y revisar solicitudes, subir archivos, dar seguimiento de progreso y administrar usuarios desde dashboards por rol.

---

## Índice

- [Descripción general](#descripción-general)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Tecnologías y versiones clave](#tecnologías-y-versiones-clave)
- [Arquitectura y prácticas de diseño](#arquitectura-y-prácticas-de-diseño)
- [Instalación y configuración](#instalación-y-configuración)
  - [Backend](#backend)
  - [Frontend](#frontend)
  - [Base de datos (PostgreSQL vía Docker)](#base-de-datos-postgresql-vía-docker)
  - [Pruebas end-to-end (opcional: Cypress)](#pruebas-end-to-end-opcional-cypress)
- [Sugerencias operativas](#sugerencias-operativas)
- [Visualización y comprobación](#visualización-y-comprobación)
- [Próximos pasos](#próximos-pasos)

---

## Descripción general

- **Frontend:** React (Vite) como SPA para desarrollo rápido (HMR).
- **Backend:** Flask (Python) con API REST, SQLAlchemy y migraciones con Alembic.
- **Despliegue:** orientado a PaaS (Render/Heroku) con Gunicorn.
- **Almacenamiento de archivos:** Cloudinary (evita BLOBs en BD).

---

## Estructura del proyecto

```
/
├─ 4geeks.ico
├─ Dockerfile.render
├─ Procfile
├─ Pipfile
├─ Pipfile.lock
├─ package.json
├─ requirements.txt
├─ render.yaml
├─ render_build.sh
├─ public/
│  ├─ index.html
  │  └─ bundle.js
├─ docs/
│  ├─ CHANGE_LOG.md
│  └─ HELP.md
├─ src/
│  ├─ app.py
│  ├─ wsgi.py
│  ├─ api/
│  │  ├─ __init__.py
│  │  ├─ admin.py
│  │  ├─ commands.py
│  │  ├─ models.py
│  │  ├─ routes.py
│  │  └─ utils.py
│  └─ front/
│     ├─ main.jsx
│     ├─ index.css
│     ├─ routes.jsx
│     ├─ store.js
│     ├─ components/
│     │  ├─ BackendURL.jsx
│     │  ├─ Login.jsx
│     │  └─ Register.jsx
│     ├─ hooks/
│     │  └─ useGlobalReducer.jsx
│     └─ pages/
│        ├─ Home.jsx
│        ├─ AdminDash.jsx
│        ├─ StudentDash.jsx
│        ├─ ProfessionalDash.jsx
│        └─ StudentRequestProfessional.jsx
└─ README.md
```

---

## Tecnologías y versiones clave

**Frontend**

- Node >= 20.0.0
- React 18.2.0, react-dom 18.2.0
- react-router-dom 6.18.0
- Vite 4.4.8
- Dev: @vitejs/plugin-react ^4.0.4, eslint ^8.46.0, @types/react ^18.2.18

**Backend**

- Python recomendado 3.10.x (el `Pipfile` indica 3.13 → revisar y alinear)
- Flask 1.1.2
- Flask-SQLAlchemy 2.4.4, SQLAlchemy 1.3.23
- Alembic 1.5.4, flask-migrate 2.6.0
- Gunicorn 20.0.4, flask-cors 3.0.10
- psycopg2-binary 2.8.6

**Extras**

- cloudinary 1.24.0
- html2canvas ^1.4.1

---

## Arquitectura y prácticas de diseño

- **Separación lógica:** `src/front` (SPA) y `src/api` (API REST).
- **Autenticación y seguridad:** JWT, CORS restringido en prod, secretos vía variables de entorno.
- **12-Factor:** configuración por entorno (`DATABASE_URL`, `FLASK_ENV`, `PORT`, `JWT_SECRET_KEY`, etc.).
- **Migraciones:** Alembic/Flask-Migrate como fuente de verdad del esquema.
- **Observabilidad (recomendado):** logs estructurados, métricas y trazas.

---

## Instalación y configuración

### Requisitos previos

- Git, Node >= 20, Python 3.10+, Docker (para Postgres en contenedor)

### Backend

```bash
# Opción A — venv + pip
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export FLASK_APP=src/app.py
export FLASK_ENV=development
# Si no hay DATABASE_URL, se usará SQLite temporal
flask run -p 3001 -h 0.0.0.0
```

```bash
# Opción B — Pipenv
pipenv install --dev
pipenv shell
pipenv run start
```

### Frontend

```bash
npm install
npm run dev
# http://localhost:3000
```

### Base de datos (PostgreSQL vía Docker)

```bash
docker run -d --name docgus-postgres \
  -e POSTGRES_USER=gitpod \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=example \
  -p 5432:5432 \
  postgres:13

export DATABASE_URL="postgres://gitpod:postgres@localhost:5432/example"
flask db upgrade
```

### Pruebas end-to-end (opcional: Cypress)

```bash
npm install --save-dev cypress@^12.0.0
```

Scripts sugeridos en `package.json`:

```json
{
  "scripts": {
    "cypress:open": "cypress open",
    "cypress:run": "cypress run"
  }
}
```

Estructura sugerida:

```
cypress/
  e2e/
    auth.spec.js
    flows.spec.js
```

---

## Sugerencias operativas

- Añadir `docker-compose.yml` para orquestar app + Postgres en desarrollo.
- Crear `src/front/utils/validator.js` para centralizar validaciones (si se desea, migrar a TypeScript más adelante).
- Añadir `docs/DEVELOPER_GUIDE.md` con comandos y flujos comunes.
- Integrar CI (GitHub Actions): lint + test + build + e2e en PRs.

---

## Visualización y comprobación

Puedes verificar el render en https://dillinger.io/.

## Próximos pasos

Indica ajustes al README o solicita crear en una rama separada:

- `docker-compose.yml`
- Scaffold de Cypress (e2e)
- `validator.js` en frontend

---

## Descripción general

DocGus es una aplicación full‑stack para gestionar solicitudes, validaciones y flujos entre roles (pacientes, estudiantes, profesionales y administradores). Permite crear/validar solicitudes, gestionar archivos y controlar el progreso en un entorno educativo/clinico.

## Estructura del proyecto (árbol resumido)

```
/
├─ Dockerfile.render
├─ Procfile
├─ Pipfile
├─ package.json
├─ requirements.txt
├─ render.yaml
├─ public/
├─ docs/
└─ src/
   ├─ app.py
   ├─ wsgi.py
   ├─ api/
   │  ├─ admin.py
   │  ├─ commands.py
   │  ├─ models.py
   │  └─ routes.py
   └─ front/
      ├─ main.jsx
      ├─ components/
      └─ pages/
```

> Nota: el frontend está implementado en JavaScript (JSX). No hay archivos TypeScript presentes actualmente.

---

## Tecnologías y versiones clave

**Frontend**

- Node: >=20.0.0
- React: 18.2.0
- Vite: 4.4.8

**Backend (Python)**

- Python: recomendado 3.10.x
- Flask: 1.1.2
- SQLAlchemy: 1.3.23
- Alembic: 1.5.4
- Gunicorn: 20.0.4

**Dependencias adicionales**

- psycopg2-binary: 2.8.6
- cloudinary: 1.24.0

---

## Arquitectura y prácticas de diseño

- Monorepo con `src/front` (frontend) y `src/api` (backend).
- Backend RESTful con Flask y SQLAlchemy; migraciones con Alembic.
- Frontend SPA con React y Vite para desarrollo local.
- Configuración a través de variables de entorno (`DATABASE_URL`, `FLASK_DEBUG`, `PORT`).

Recomendaciones para producción:

- Rotar secretos (JWT) y almacenar credenciales en un gestor de secretos.
- Restringir CORS en producción.

---

## Instrucciones de instalación y configuración

### Requisitos previos

- Git
- Node >=20, npm
- Python 3.10+ (recomendado)
- Docker (opcional para Postgres)

### Clonar

```bash
git clone <repo-url>
cd DocGus-Eco-Salud
```

### Frontend

```bash
npm install
npm run dev
# abrir http://localhost:3000
```

### Backend (venv)

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export FLASK_APP=src/app.py
flask run -p 3001 -h 0.0.0.0
```

### PostgreSQL con Docker

```bash
docker run -d --name docgus-postgres \
  -e POSTGRES_USER=gitpod \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=example \
  -p 5432:5432 \
  postgres:13

export DATABASE_URL="postgres://gitpod:postgres@localhost:5432/example"
flask db upgrade
```

### Suite de pruebas (opcional: Cypress)

Instalar y configurar Cypress es opcional; si se integra, recomiendo **Cypress 12.x** y añadir scripts en `package.json`.

---

## Sugerencias operativas

- Crear `docker-compose.yml` para orquestar la app y Postgres en desarrollo.
- Añadir `docs/DEVELOPER_GUIDE.md` con comandos comunes.
- Centralizar validaciones front en `src/front/utils/validator.js` o migrar a TypeScript si se desea.

---

## Visualización y comprobación

Puedes revisar el formato pegando este archivo en https://dillinger.io/.

## Próximos pasos

- Si quieres, incorporo `docker-compose.yml` y scaffolding para Cypress o `validator.js`; dime cuál prefieres y lo añado en una rama separada.
