**Purgar artefactos del historial (guía segura)**

- **Resumen**: Esta guía describe cómo eliminar rutas específicas (por ejemplo `uploads/`, `dev.db`) del historial git usando `git-filter-repo`. Esto reescribe el historial y requiere coordinación con el equipo.

- **Recomendado**: crear una rama dedicada (por ejemplo `chore/purge-artifacts`), correr el proceso en un clone espejo, revisar resultados y abrir un PR con instrucciones para forzar push si todo está correcto.

- **Pasos (resumido)**:
  1. Instala `git-filter-repo` (si no está disponible): `pip install git-filter-repo`.
  2. Desde la raíz del repo, ejecuta el script seguro incluido: `./tools/purge_history.sh uploads/ dev.db`.
  3. Revisa el resultado en el mirror generado (la ruta se mostrará al final del script).
  4. Si todo está correcto, coordina con el equipo y empuja forzando el mirror: `git push --force --all` y `git push --force --tags`.

- **Advertencias**:
  - Forzar push reescribe el historial y romperá clones de otros colaboradores hasta que sincronicen.
  - NOTA: Asegúrate de comunicar y coordinar; preferiblemente crear un backup del repositorio antes.
