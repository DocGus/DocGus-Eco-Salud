import os
import subprocess
import sys
import tempfile

# Pequeño smoke test de rutas frontend: asegura que el build contiene la nueva ruta.
# Estrategia: compilar vite en modo build (si no existe dist) y verificar que el bundle
# referencia la cadena "/ecosistema/paciente" (nueva) y NO la vieja "/ecosistema/academico".


def test_frontend_route_renamed():
    project_root = os.path.dirname(os.path.dirname(__file__))
    dist_dir = os.path.join(project_root, 'dist')

    if not os.path.isdir(dist_dir):
        # Ejecutar build sólo una vez si dist no existe
        try:
            subprocess.run(['npm', 'run', 'build'], cwd=project_root,
                           check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        except FileNotFoundError:
            pytest.skip('npm no disponible en entorno de test')
        except subprocess.CalledProcessError as e:
            # Si falla el build, fallar test con salida de error capturada
            raise AssertionError(
                f"Fallo build frontend: {e.stderr.decode('utf-8', errors='ignore')}")

    # Recorremos archivos generados buscando las cadenas
    found_new = False
    found_old = False
    for root, _dirs, files in os.walk(dist_dir):
        for f in files:
            if not (f.endswith('.js') or f.endswith('.html') or f.endswith('.css')):
                continue
            path = os.path.join(root, f)
            try:
                with open(path, 'r', encoding='utf-8', errors='ignore') as fh:
                    content = fh.read()
                    if '/ecosistema/paciente' in content:
                        found_new = True
                    if '/ecosistema/academico' in content:
                        found_old = True
            except Exception:
                pass

    assert found_new, 'No se encontró la nueva ruta /ecosistema/paciente en el build'
    assert not found_old, 'Aún existe referencia a la ruta antigua /ecosistema/academico en el build'
