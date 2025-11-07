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

🩺 DocGus — Plataforma de Gestión de Solicitudes

Propósito
DocGus es una plataforma full-stack para gestionar solicitudes, validaciones y flujos entre distintos roles (pacientes, estudiantes, profesionales y administradores).
Permite crear y subir archivos con la información de los antecedentes médicos de cada paciente, así como revisar y validar su contenido de forma estructurada y segura mediante el flujo entre usuarios.

🚀 Vista general

<!-- Opcional: agrega una imagen o GIF en esta ruta -->

DocGus simplifica los procesos de validación médica y educativa mediante flujos automatizados.
Cada usuario accede a un dashboard personalizado, donde puede:

Crear o revisar solicitudes.

Subir documentos clínicos.

Consultar el estado de validaciones.

Confirmar o rechazar expedientes.

⚙️ Tecnologías utilizadas
Área	Tecnologías
Frontend	React 18.2 + Vite 4.4, React Router DOM
Backend	Flask 1.1.2, SQLAlchemy, Alembic
Base de datos	PostgreSQL (via Docker)
Autenticación	JWT (flask_jwt_extended)
Despliegue	Render / Heroku con Gunicorn
Almacenamiento	Cloudinary
Pruebas (opcional)	Cypress 12.x
🧩 Estructura del proyecto
/
├─ Dockerfile.render
├─ Procfile
├─ Pipfile / Pipfile.lock
├─ package.json / requirements.txt
├─ render.yaml
├─ public/
│  └─ index.html
├─ docs/
│  ├─ CHANGE_LOG.md
│  └─ HELP.md
└─ src/
   ├─ app.py / wsgi.py
   ├─ api/
   │  ├─ models.py / routes.py / utils.py
   └─ front/
      ├─ main.jsx / routes.jsx / store.js
      ├─ components/
      └─ pages/


💡 Nota: El frontend está implementado en JavaScript (JSX).
Si se desea agregar validaciones tipadas, puede añadirse src/front/utils/validator.js o migrar gradualmente a TypeScript en el futuro.

🛠️ Instalación y configuración
Requisitos previos

Git

Node.js ≥ 20

Python ≥ 3.10

Docker (opcional para la base de datos local)

1️⃣ Clonar el repositorio
git clone <repo-url>
cd DocGus-Eco-Salud

2️⃣ Configurar el frontend
npm install
npm run dev
# Abre http://localhost:3000

3️⃣ Configurar el backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export FLASK_APP=src/app.py
flask run -p 3001 -h 0.0.0.0


Si no se define DATABASE_URL, el backend usará SQLite de forma temporal.

4️⃣ Base de datos con Docker
docker run -d --name docgus-postgres \
  -e POSTGRES_USER=gitpod \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=example \
  -p 5432:5432 postgres:13

export DATABASE_URL="postgres://gitpod:postgres@localhost:5432/example"
flask db upgrade

🧪 Pruebas (opcional)

Instalar y configurar Cypress para pruebas end-to-end (E2E):

npm install --save-dev cypress@^12.0.0


Agregar scripts en package.json:

"scripts": {
  "cypress:open": "cypress open",
  "cypress:run": "cypress run"
}


Estructura sugerida:

cypress/
  e2e/
    login.spec.js
    register.spec.js


🔎 Observación: Cypress no está presente en el repositorio.
Se recomienda integrarlo (versión 12.x o superior) si deseas automatizar pruebas E2E y verificar el funcionamiento completo de la aplicación.

💼 Próximos pasos

Añadir docker-compose.yml para levantar app y Postgres juntos.

Crear docs/DEVELOPER_GUIDE.md con comandos y flujos comunes.

Integrar CI/CD (GitHub Actions) para pruebas y despliegues automáticos.

Centralizar validaciones del frontend en src/front/utils/validator.js.

👨‍💻 Autor

Gustavo Andrés Santoyo Benavides (DocGus)
Desarrollador Full-Stack con formación médica.
📍 México
🔗 LinkedIn
 | GitHub

DocGus combina el conocimiento médico y tecnológico para construir herramientas que mejoran la gestión educativa y clínica.

✅ Archivo listo para uso profesional en GitHub.
Puedes pegarlo directamente en la raíz del repositorio (README.md).
