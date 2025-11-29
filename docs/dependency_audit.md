# Auditoría rápida de dependencias

Generado automáticamente por el agente local. Contiene hallazgos y recomendaciones iniciales.

## Resumen (Python)
- Se encontraron 7 vulnerabilidades conocidas en 4 paquetes (vía `pip-audit`).
- Paquetes afectados:
  - `flask-cors` 5.0.1 — varias GHSA; recomendación: actualizar a `>=6.0.0`.
  - `idna` 2.10 — recomendación: actualizar a `>=3.7`.
  - `urllib3` 2.3.0 — recomendación: actualizar a `>=2.5.0`.
  - `pip` 25.2 — actualizar pip a 25.3 en runners (no suele aparecer en requirements).

## Resumen (Node)
- `npm audit` reportó 4 vulnerabilidades (1 low, 3 moderate) en dependencias indirectas.
- Paquetes afectados (ejemplos): `vite` (moderate), `esbuild` (moderate), `js-yaml` (moderate), `brace-expansion` (low).

## Recomendaciones
1. Actualizar dependencias directas cuando sea posible (p. ej. `vite`, `esbuild`).
2. Para Python: revisar `requirements.txt` y actualizar versiones de `flask-cors`, `idna`, `urllib3` cuando sea compatible.
3. Ejecutar tests completos después de cada actualización mayor para detectar rupturas.
4. Añadir job de auditoría en CI (ya incluido) y configurar alertas/Dependabot para PRs automáticos.
5. Priorizar actualizaciones de `vite` y `esbuild` en el frontend debido a la naturaleza de los hallazgos.

## Notas
- Algunas vulnerabilidades son en paquetes transitorios; puede requerir actualización de los paquetes directos que los referencian.
- Para cambios en producción, probar en staging y correr `pytest` + `npm run build`.
