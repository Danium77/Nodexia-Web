# Reorganización de Estructura - 27 Enero 2026

## 🎯 Objetivo
Mejorar el rendimiento de VS Code y Copilot reduciendo la cantidad de archivos en la raíz del proyecto.

## ✅ Cambios Realizados

### 1. Archivos de Documentación Movidos a `docs/`
Los siguientes archivos fueron movidos de la raíz a la carpeta `docs/`:
- `ACCESO-CELULAR.md`
- `ANALISIS-VS-CODE-PERFORMANCE.md`
- `COMO-INICIAR-SESION-USUARIO.md`
- `CONTRIBUTING.md`
- `CREDENCIALES-DEV.md`
- `INDICE-DOCUMENTACION.md`
- `INICIO-RAPIDO.md`
- `INSTRUCCIONES-DEV-EXTERNO.md`
- `PLAN-DE-ACCION.md`
- `PROTOCOLO-CIERRE-26-ENERO-2026.md`
- `PROXIMA-SESION.md`
- `SETUP.md`
- `SMOKE-TEST-PROD.md`
- `SOLUCION-RAM-INSUFICIENTE.md`
- `SOLUCION-VS-CODE-TRABADO.md`
- `WORKSPACE-GUIDE.md`

**Nota:** El archivo `README.md` permanece en la raíz.

### 2. Scripts Movidos a `scripts/`
Los siguientes scripts fueron movidos de la raíz a la carpeta `scripts/`:
- `fix-congelamiento-vscode.ps1`
- `fix-windows-defender.ps1`
- `gpu-permanente.ps1`
- `optimizar-vscode.ps1`
- `reorganizar-proyecto.ps1`
- `check_relaciones_temp.js`
- `qr-chofer-access.html`

### 3. Configuraciones Actualizadas

#### `.vscodeignore`
Agregadas exclusiones para:
- `docs/`
- `detalles-tecnicos/`
- `roadmap/`
- `scripts/`

#### `.vscode/settings.json`
**`files.exclude`**: Agregadas carpetas para ocultar del explorador (pero permitir acceso):
```json
"docs/**": false,
"scripts/**": false,
"detalles-tecnicos/**": false,
"roadmap/**": false
```

**`search.exclude`**: Agregadas carpetas para excluir de búsquedas globales:
```json
"docs/**": true,
"scripts/**": true,
"detalles-tecnicos/**": true,
"roadmap/**": true
```

### 4. Referencias Actualizadas
- `README.md` - Actualizado el link a `INDICE-DOCUMENTACION.md` → `docs/INDICE-DOCUMENTACION.md`

## 📊 Impacto Esperado

### Rendimiento VS Code
- ✅ Menos archivos en raíz → indexación más rápida
- ✅ Exclusiones configuradas → búsquedas más rápidas
- ✅ Explorador más limpio → navegación más simple

### Rendimiento Copilot
- ✅ Menos contexto innecesario → análisis más rápido
- ✅ Documentación excluida de indexación → respuestas más precisas
- ✅ Reducción de tokens procesados → mejor rendimiento

## 🔧 Uso de Archivos Movidos

### Acceder a Documentación
```
docs/INDICE-DOCUMENTACION.md
docs/SETUP.md
docs/INICIO-RAPIDO.md
```

### Ejecutar Scripts
```powershell
# Desde la raíz del proyecto
.\scripts\optimizar-vscode.ps1
.\scripts\fix-congelamiento-vscode.ps1
```

## 🔄 Próximos Pasos Opcionales

1. **Considerar mover más archivos de configuración** a subcarpetas si el problema persiste
2. **Revisar carpetas grandes** como `components/` para posibles subcarpetas
3. **Monitorear rendimiento** durante las próximas semanas

## 📝 Notas

- Las referencias en archivos de `.session/` no fueron actualizadas intencionalmente (son archivos de historial)
- Los archivos siguen siendo accesibles a través de búsquedas específicas
- La configuración `files.exclude: false` permite acceder manualmente cuando sea necesario
