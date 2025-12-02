# API Contract - Multiselect Fields

Este documento describe el contrato API relativo a campos de selección múltiple que
anteriormente se almacenaban como CSV y ahora se exponen/almacenan como arrays JSON.

Campos afectadas

- `languages` (user profile / background): array de strings
- `cohabitants` (background): array de strings
- `dependents` (background): array de strings

Formato esperado

- En peticiones JSON hacia la API (por ejemplo POST/PUT a endpoints de backgrounds),
  estos campos deben enviarse como arrays JSON:

```json
{
  "languages": ["es", "en"],
  "cohabitants": ["spouse", "child"],
  "dependents": ["elder_parent"]
}
```

- En respuestas JSON de la API, estos campos serán devueltos como arrays (no como CSV).

Notas de migración

- Se agregó una migración Alembic que convierte datos legacy en formato CSV a arrays JSON
  en las columnas correspondientes. Antes de desplegar la migración en producción,
  revisar y respaldar la base de datos.

Testing

- Los tests locales usan un helper que redirige llamadas HTTP a un `Flask` test client
  para evitar depender de servicios externos (Cloudinary, backend en otros puertos).

# API Contract — Non Pathological Backgrounds

Este documento define el contrato recomendado entre frontend y backend para el objeto
`non_pathological_background` manejado por `/api/backgrounds/save` y retornado por
`/api/medical_file/<id>`.

Objetivo: estandarizar tipos, formatos y ejemplos para evitar ambigüedades (CSV vs arrays,
booleanos vs enums, campos legacy) y facilitar la persistencia local (SQLite) en desarrollo
y `JSONB`/`JSON` en producción.

---

## Principios generales

- Multiselecciones: enviar siempre como `array[string]` desde el frontend. El backend acepta
  arrays y convierte/normaliza para persistir (CSV si la columna es `String`, o `JSON` si la
  columna es `JSON`). La API devuelve listas (`array`) en la serialización.
- Booleanos: enviar `true`/`false`. El backend guardará booleans explícitos (p. ej. `tattoos_bool`)
  y mantendrá valores legacy `has_tattoos` (`"yes"`/`"no"`) cuando sea necesario.
- Campos libres: enviar strings para campos de texto (`hobbies`, `other_origin_info`, etc.).
- Listas estructuradas: enviar arrays/objetos JSON para campos como `exercise_activities`.

---

## Campos principales (`non_pathological_background`)

- `languages` (array[string])

  - Descripción: idiomas que domina/usa el paciente.
  - Request (frontend): `"languages": ["Español","Inglés"]`
  - Persistencia: en DB puede ser `String` (CSV) o `JSON`. Backend convierte a CSV si corresponde.
  - Response: `"languages": ["Español","Inglés"]`

- `cohabitants` (array[string])

  - Opciones típicas: `Padres`, `Hermanos`, `Hijos`, `Cónyuge`, `Abuelos`.
  - Request: `"cohabitants": ["Padres","Hijos"]`
  - Response: lista similar.

- `dependents` (array[string])

  - Request: `"dependents": ["Cónyuge"]`

- `civil_status` (string / enum)

  - Valores permitidos: `"married"`, `"single"`, `"divorced"`, `"widowed"`.
  - Request: `"civil_status": "single"`

- `housing_type` (string / enum)

  - Valores permitidos: `"owned"`, `"rented"`, `"none"`.

- `tattoos` / `tattoos_bool` (boolean)

  - Frontend: `"tattoos": true` o `"tattoos_bool": true`.
  - Backend: guarda `tattoos_bool = true` y `has_tattoos = "yes"` para compatibilidad.
  - Detalles: si se envía `tattoos_details` se guarda en `other_recreational_info` (o crear
    campo dedicado si se desea).

- `piercings` / `piercings_bool` (boolean)

  - Similar a tatuajes. `piercings_details` se concatena en `other_recreational_info`.

- `consume_tobacco`, `consume_alcohol`, `consume_recreational_drugs` (boolean)

  - Envío: `true` / `false`.

- `exercise_activities` (array[object])

  - Descripción: lista estructurada con actividades y metadatos.
  - Request: `"exercise_activities": [{"type":"correr","freq":"3x/semana"}]`
  - Persistencia: backend guarda en `exercise_activities_json`.

- `other_origin_info`, `residence_other_info`, `other_living_info` (string)
  - Campos libres para notas abiertas.
  - Para limpiar legacy consolidated strings, enviar `"": ""` (string vacío) para reemplazar.

---

## Comportamiento del backend al recibir payload

1. Validar `medical_file_id` y estado del expediente (solo `progress` es editable).
2. Normalizar campos:
   - Si `languages`, `cohabitants`, `dependents` vienen como arrays, convertir a CSV para
     persistir en columnas `String`, o guardar como JSON si la columna es `JSON`.
   - Mapear `religions` → `spiritual_practices` si el modelo no tiene `religions`.
   - Convertir booleanos a enums legacy (`yes`/`no`) cuando sea necesario para compatibilidad.
   - Concatenar `tattoos_details`/`piercings_details` en `other_recreational_info` si se proporcionan.
3. Asignar campo-a-campo con seguridad (intentar conversiones antes del `setattr`).
4. Commit y devolver mensaje de éxito; la serialización del `medical_file` devuelve listas para
   multiselecciones.

---

## Ejemplos completos

### Ejemplo 1 — Envío estándar (multiselect como array)

Request POST `/api/backgrounds/save`:

```json
{
  "medical_file_id": 123,
  "non_pathological_background": {
    "languages": ["Español", "Inglés"],
    "cohabitants": ["Padres", "Hijos"],
    "civil_status": "single",
    "tattoos": true,
    "tattoos_details": "Brazo derecho, pequeño"
  }
}
```

Response GET `/api/medical_file/123` (parcial):

```json
{
  "medical_file": {
    "id": 123,
    "non_pathological_background": {
      "languages": ["Español", "Inglés"],
      "cohabitants": ["Padres", "Hijos"],
      "civil_status": "single",
      "tattoos_bool": true,
      "has_tattoos": "yes",
      "other_recreational_info": "Brazo derecho, pequeño"
    }
  }
}
```

---

## Recomendaciones de migración

- Largo plazo: migrar `languages`, `cohabitants`, `dependents` a `JSON` (Postgres `JSONB`) y
  actualizar serialización/queries para trabajar con arrays directamente.
- Corto plazo: normalizar en backend (ya implementado) y ajustar frontend para enviar arrays siempre.

---

Si quieres, genero ahora un `API_CONTRACT.yml` (OpenAPI) o añado ejemplos adicionales por campo.
