# Guía rápida del Frontend (Inventario + Flujos)

Esta guía resume la estructura del frontend, el propósito de cada archivo clave y los endpoints que consume. Útil para demos o entrevistas.

## Núcleo

- `src/front/routes.jsx`: Enrutado con React Router.
  - `"/dashboard/patient/confirm_file"` → `ConfirmFile`
  - `"/dashboard/professional/review_files"` → `StudentFilesReview`
  - `"/dashboard/student/interview/:medicalFileId"` → `BackGroundInterview`
- `src/front/store.js`: Estado global mínimo (`message`, `todos`) + reducer con `set_hello` y `add_task`.
- `src/front/hooks/useGlobalReducer.jsx`: Proveedor `StoreProvider` y hook `useGlobalReducer()`.
- `src/front/pages/Layout.jsx`: Layout base con `Navbar`, `Footer` y `ScrollToTop` + `<Outlet/>`.

## Components

- `BackendURL.jsx`: Mensaje de ayuda si falta `VITE_BACKEND_URL`.
- `BackgroundForm.jsx`: Crea/actualiza antecedentes y genera snapshot con `html2canvas`.
  - POST ` /api/backgrounds`
  - POST ` /api/upload_snapshot/:medicalFileId`
- `Footer.jsx`, `Navbar.jsx`, `Login.jsx`, `Register.jsx`, `ScrollToTop.jsx`, `UserInfoCard.jsx`.

## Pages

- `Home.jsx`: Landing con enlaces a registro y login.
- `DashLayout.jsx`: Menu lateral por rol y `<Outlet/>`.
- `PatientDash.jsx`: Carga usuario con `GET /api/private`.
- `StudentDash.jsx` / `ProfessionalDash.jsx`: Lee usuario desde `localStorage`.
- `BackGroundInterview.jsx`: Idéntico a `BackgroundForm`, pero como página. Envía a revisión.
- `StudentFilesReview.jsx`: Profesional revisa expedientes.
  - GET ` /api/professional/review_files`
  - PUT ` /api/professional/review_file/:fileId`
- `ConfirmFile.jsx`: Paciente confirma o solicita cambios.
  - GET ` /api/private`
  - GET ` /api/medical_file/:id`
  - GET ` /api/patient/snapshots/:id`
  - PUT ` /api/patient/confirm_file/:id`
- `PatientRequestStudent.jsx`: Paciente solicita estudiante por ID.
  - GET ` /api/patient/student_request_status`
  - POST ` /api/patient/request_student_validation/:studentId`
  - DELETE ` /api/patient/cancel_student_request`

## Flujo de Snapshots

1. Estudiante completa antecedentes en `BackGroundInterview.jsx` o `BackgroundForm.jsx`.
2. Se envía `POST /api/backgrounds` y luego se genera un PNG del `form` con `html2canvas`.
3. Se sube con `POST /api/upload_snapshot/:fileId`.
4. Profesional ve thumbnail en `StudentFilesReview.jsx`; Paciente lo ve en `ConfirmFile.jsx`.

## Notas

- Las imágenes usan `loading="lazy"` y un `onError` que cae a `${VITE_BACKEND_URL}/assets/preview.png`.
- El backend devuelve URLs absolutas de snapshots (Cloudinary o `/uploads/...`).

## Puertos y Entorno (rápido)

- `Backend` dev: expone por defecto el puerto `3001` (`PORT` configurable). En local, la app se ejecuta con `python src/app.py` y toma `PORT` o `3001`.
- `docker-compose.test.yml`: mapea `3001:3001` y exporta `PORT=3001` para el contenedor `web`.
- `Render/Heroku`: `gunicorn wsgi --chdir ./src/` escucha el puerto asignado por la plataforma (`$PORT`). No hardcodear `3001` ahí.
- `Frontend` (Vite): debe apuntar a `VITE_BACKEND_URL`, por ejemplo `http://localhost:3001`. Ajusta tu `.env` local.
- Endpoints usados en frontend comienzan en `${VITE_BACKEND_URL}/api/...`.
