# 🚀 Acciones Inmediatas para Optimizar VS Code

**Fecha**: 6 de enero de 2026

## ✅ Checklist de Optimización (En Orden de Prioridad)

### 🔴 URGENTE - Hacer Ahora (5 minutos)

1. **Identificar extensiones problemáticas**
   - [ ] Abrir: `Help > Open Process Explorer`
   - [ ] Buscar procesos con alto % CPU
   - [ ] Si "Extension Host" consume mucho CPU → ir al paso 2

2. **Desactivar extensiones pesadas temporalmente**
   - [ ] Presionar `Ctrl+Shift+P`
   - [ ] Escribir: `Help: Start Extension Bisect`
   - [ ] Seguir el asistente para identificar extensión problemática
   - [ ] **Alternativa rápida**: `code --disable-extensions` (iniciar sin extensiones)

3. **Aplicar configuraciones ya agregadas**
   - [ ] Las configuraciones YA están en `.vscode/settings.json`
   - [ ] Reiniciar VS Code: `Ctrl+Shift+P` → `Developer: Reload Window`

### 🟡 IMPORTANTE - Hacer Hoy (15 minutos)

4. **Limpiar cache de VS Code**
   ```powershell
   # Cerrar VS Code primero, luego ejecutar:
   .\scripts\clean-vscode-cache.ps1
   ```

5. **Verificar consumo de TypeScript Server**
   - [ ] Abrir archivo .ts o .tsx
   - [ ] Abrir Process Explorer
   - [ ] Si "tsserver" consume > 2GB RAM:
     - Editar `.vscode/settings.json`
     - Cambiar `"typescript.tsserver.maxTsServerMemory": 4096` (si tienes poca RAM)

6. **Revisar extensiones instaladas**
   - [ ] `Ctrl+Shift+X` (abrir Extensions)
   - [ ] Deshabilitar (no desinstalar) extensiones que NO uses diariamente:
     - Themes/iconos alternativos
     - Linters para lenguajes que no usas
     - Formatters no esenciales
     - Extensiones de preview/visualización

### 🟢 OPCIONAL - Hacer Esta Semana

7. **Monitorear startup performance**
   ```
   F1 → Startup Performance
   ```
   - Si tarda > 10 segundos, revisar qué extensiones se cargan al inicio

8. **Configurar workspace settings para proyectos específicos**
   - Para proyectos pequeños, habilitar más extensiones
   - Para proyectos grandes como Nodexia, mantener mínimo de extensiones

## 📊 Configuraciones Aplicadas Automáticamente

Ya he agregado a tu `.vscode/settings.json`:

```json
{
  // Optimizaciones de rendimiento críticas
  "editor.maxTokenizationLineLength": 20000,
  "telemetry.telemetryLevel": "off",
  "workbench.enableExperiments": false,
  "terminal.integrated.scrollback": 1000,
  "editor.bracketPairColorization.enabled": false,
  "editor.guides.bracketPairs": false,
  "editor.renderControlCharacters": false
}
```

## 🔍 Diagnóstico Rápido

### Si VS Code sigue lento después de todo:

**Test 1: ¿Es una extensión?**
```bash
code --disable-extensions .
```
Si funciona rápido → es una extensión problemática → usar Extension Bisect

**Test 2: ¿Es el workspace?**
```bash
code
```
Abrir VS Code vacío. Si funciona rápido → el problema está en el workspace de Nodexia

**Test 3: ¿Es la configuración?**
1. Renombrar temporalmente `.vscode/settings.json` a `.vscode/settings.json.backup`
2. Reiniciar VS Code
3. Si funciona rápido → revisar configuraciones

**Test 4: ¿Es TypeScript Server?**
```
F1 → Developer: Show Running Extensions
```
Ver si "TypeScript Language Features" consume muchos recursos

## 🎯 Soluciones Específicas por Síntoma

### Síntoma: Lag al escribir
**Solución**: Deshabilitar bracket colorization (ya hecho ✓)

### Síntoma: Alto uso de CPU constante
**Solución**: Process Explorer → identificar proceso → aplicar solución específica

### Síntoma: Inicio muy lento (> 15 segundos)
**Solución**: 
1. `F1 → Startup Performance`
2. Deshabilitar extensiones que se cargan al inicio
3. No abrir workspace automáticamente: `"window.restoreWindows": "none"` (ya hecho ✓)

### Síntoma: Lag al scrollear
**Solución**: 
- Minimap deshabilitado ✓
- Semantic highlighting deshabilitado ✓
- Bracket guides deshabilitados ✓

### Síntoma: Muchos archivos indexándose
**Solución**: Watchter exclude configurado ✓
```json
{
  "files.watcherExclude": {
    "**/node_modules/**": true,
    "**/.next/**": true
  }
}
```

## 📈 Monitoreo Continuo

### Comandos útiles para ejecutar periódicamente:

```bash
# Ver estado general
code --status

# Ver performance de inicio
code --prof-startup

# Iniciar en modo verbose (debug)
code --verbose
```

### Herramientas integradas:

- **Process Explorer**: `Help > Open Process Explorer`
- **Developer Tools**: `Help > Toggle Developer Tools`
- **Running Extensions**: `F1 > Developer: Show Running Extensions`
- **Startup Performance**: `F1 > Startup Performance`

## 🛠️ Si TODO Falla

### Opción 1: Reset completo de configuración
```powershell
# Backup de tu configuración actual
Copy-Item "$env:APPDATA\Code\User\settings.json" "$env:USERPROFILE\Desktop\vscode-settings-backup.json"

# Reset (crear nuevo archivo con solo {})
# Luego aplicar solo configuraciones esenciales
```

### Opción 2: Reinstalación limpia
```powershell
# 1. Desinstalar VS Code desde Panel de Control
# 2. Ejecutar:
Remove-Item -Recurse -Force "$env:APPDATA\Code"
Remove-Item -Recurse -Force "$env:USERPROFILE\.vscode"
# 3. Reinstalar VS Code
# 4. Instalar extensiones UNA POR UNA, probando performance después de cada una
```

## 📝 Notas Importantes

- ✅ Tu configuración YA está bastante optimizada
- ✅ File watcher excludes configurado correctamente
- ✅ TypeScript server con límites de memoria
- ✅ Git optimizado
- ✅ Minimap y features visuales deshabilitadas

**Próximo paso recomendado**: 
1. Ejecutar `.\scripts\clean-vscode-cache.ps1`
2. Reiniciar VS Code
3. Monitorear Process Explorer durante 5 minutos de uso normal

## 🔗 Referencias Rápidas

- [Guía completa](./OPTIMIZACION-VSCODE.md) - Documentación detallada
- [Configuraciones optimizadas](../.vscode/settings-optimization.json) - Archivo de referencia
- [Script de limpieza](../scripts/clean-vscode-cache.ps1) - Limpiar cache

---

**Última actualización**: 6 de enero de 2026
