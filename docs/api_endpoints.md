# API Endpoints (Resumen por flujo)

Este documento lista los endpoints expuestos por el backend Flask (prefijo `/api`) con su propósito, método, rol requerido y notas.

## Autenticación y Usuario

- POST `/api/register` — Crea un usuario (público).
- POST `/api/login` — Devuelve JWT + datos del usuario (público).
- GET `/api/private` — Retorna info del usuario logueado y `medical_file_id` (JWT).

## Administración (Admin)

- GET `/api/users` — Lista todos los usuarios (rol: admin).
- POST `/api/validate_professional/:user_id` — Aprueba a un profesional (rol: admin).

## Flujo Paciente → Estudiante

- POST `/api/patient/request_student_validation/:student_id` — Paciente solicita a un estudiante (rol: patient).
- GET `/api/patient/student_request_status` — Estado de la solicitud (rol: patient).
- DELETE `/api/patient/cancel_student_request` — Cancela la solicitud (rol: patient).
- PUT `/api/student/validate_patient/:patient_id` — Estudiante aprueba/rechaza la solicitud de paciente (rol: student; body `{ action: "approve"|"reject" }`).

## Validez Estudiante ↔ Profesional

- POST `/api/request_student_validation/:professional_id` — Estudiante solicita validación a un profesional (rol: student).
- PUT `/api/professional/validate_student/:student_id` — Profesional aprueba/rechaza al estudiante (rol: professional; body `{ action }`).
- GET `/api/professional/student_requests` — Solicitudes pendientes al profesional (rol: professional).

## Expediente Médico

- GET `/api/medical_file/:file_id` — Obtiene expediente + datos básicos del paciente (JWT).

### Antecedentes (Backgrounds)

- POST `/api/backgrounds` — Guarda/actualiza antecedentes en el expediente (JWT; body con secciones `non_pathological_background`, `patological_background`, `family_background`, `gynecological_background`, `medical_file_id`).
- POST `/api/backgrounds` (rol estudiante, ruta alternativa `/api/backgrounds`/`/backgrounds`) — Versión que crea registros base y marca el expediente en `review` (rol: student; body similar). Nota: en el código también existe `/backgrounds` sin el prefijo `/api` con `student_required`.

### Snapshots

- POST `/api/upload_snapshot/:file_id` — Sube un snapshot (estudiante). Acepta:
  - Data URL base64: se guarda en `./uploads` y se expone como URL absoluta `/api/uploads/<file>`.
  - URL remota: si hay Cloudinary configurado, se sube y devuelve `secure_url`.
  - Header opcional `X-MOCK-CLOUDINARY-URL` para pruebas.
  - Cambia el estado del expediente a `review`.
- GET `/api/uploads/<filename>` — Sirve archivos almacenados localmente (público tras autenticación del blueprint; prefijo `/api`).
- GET `/api/professional/snapshots/:medical_file_id` — Lista snapshots del expediente (rol: professional).
- GET `/api/patient/snapshots/:medical_file_id` — Lista snapshots del propio expediente (rol: patient, propietario).

### Revisión Profesional del Expediente

- GET `/api/professional/review_files` — Lista expedientes en `review` de estudiantes aprobados por ese profesional (rol: professional).
- PUT `/api/professional/review_file/:medical_file_id` — `approve` o `reject` con comentario opcional (rol: professional; body `{ action, comment }`).

### Confirmación del Paciente

- PUT `/api/patient/confirm_file/:medical_file_id` — Confirma (`confirm`) o solicita cambios (`reject`) del expediente aprobado (rol: patient; body `{ action, comment }`).
  - Nota: El frontend lo usa; si falta en el backend, debe implementarse o confirmarse su ruta exacta.

## Estudiante: Pacientes y Asignaciones

- GET `/api/student/assigned_patients` — Pacientes asignados al estudiante + estado del expediente (rol: student).
- GET `/api/student/patient_requests` — Solicitudes abiertas de pacientes hacia el estudiante (rol: student).

## Notas Técnicas

- Prefijo `/api`: Todas las rutas del blueprint se registran bajo `/api` (e.g., `@api.route('/uploads')` → `/api/uploads`).
- Roles y JWT: Se usan decoradores por rol (`admin_required`, `student_required`, etc.) basados en `@jwt_required()`. Enviar `Authorization: Bearer <token>`.
- Estados: `empty` → `progress` → `review` → `approved` → `confirmed`.
- URLs absolutas: El backend responde con URLs completas para snapshots (Cloudinary o `/api/uploads/...`).
