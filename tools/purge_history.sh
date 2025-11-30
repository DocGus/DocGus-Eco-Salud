#!/usr/bin/env bash
set -euo pipefail

# Script de ayuda para purgar rutas específicas del historial git usando git-filter-repo.
# Requiere `git-filter-repo` (https://github.com/newren/git-filter-repo) instalado.
# Este script NO empuja por ti; revisa la rama resultante y coordina con el equipo antes de forzar push.

if ! command -v git >/dev/null 2>&1; then
  echo "git no encontrado" >&2
  exit 1
fi

if ! command -v git-filter-repo >/dev/null 2>&1; then
  echo "git-filter-repo no instalado. Instalación sugerida:" >&2
  echo "  pip install git-filter-repo" >&2
  exit 1
fi

if [ "$#" -lt 1 ]; then
  echo "Uso: $0 <ruta1> [ruta2 ...]" >&2
  echo "Ejemplo: $0 uploads/ dev.db" >&2
  exit 1
fi

echo "==> Este script purgará las rutas: $*  del historial en la rama actual" >&2
read -p "¿Continuar? (type 'yes' to proceed): " answer
if [ "$answer" != "yes" ]; then
  echo "Abortado por el usuario" >&2
  exit 2
fi

TMPDIR=$(mktemp -d)
echo "Creando espejo en: $TMPDIR" >&2
git clone --mirror . "$TMPDIR/repo.git"
pushd "$TMPDIR/repo.git" >/dev/null

echo "Ejecutando git-filter-repo..." >&2
git-filter-repo --invert-paths --path "$@"

echo "Revisión local completa. Para publicar los cambios en el remoto (FORZANDO HISTORIAL), sigue estos pasos:" >&2
echo "  1. Revisa el repositorio en: $TMPDIR/repo.git" >&2
echo "  2. Si todo está bien, empuja con: git push --force --all && git push --force --tags" >&2
echo "  3. NOTA: Forzar push reescribe el historial y requiere coordinar con colaboradores." >&2

popd >/dev/null
echo "Hecho. Mirror en: $TMPDIR (no se borró automáticamente)" >&2
