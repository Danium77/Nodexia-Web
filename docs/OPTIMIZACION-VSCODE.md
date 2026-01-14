# 🚀 Guía de Optimización de VS Code

**Fecha**: 6 de enero de 2026
**Fuente**: Documentación oficial de Microsoft

## 📊 Diagnóstico de Problemas

### Comandos para Identificar Problemas

```bash
# Ver estado de VS Code y procesos
code --status

# Iniciar sin extensiones
code --disable-extensions

# Modo verbose para debugging
code --verbose

# Crear perfil de inicio (para diagnosticar startup lento)
code --prof-startup
```

### Herramientas Integradas en VS Code

1. **Process Explorer**: `Help > Open Process Explorer`
   - Muestra consumo de CPU por proceso
   - Identifica extensiones problemáticas

2. **Startup Performance**: `F1 > Startup Performance`
   - Muestra tiempos de inicio
   - Identifica qué ralentiza el arranque

3. **Extension Bisect**: `F1 > Help: Start Extension Bisect`
   - Búsqueda binaria automática para encontrar extensión problemática

4. **Developer Tools**: `Help > Toggle Developer Tools`
   - Performance profiling del renderer process

5. **Running Extensions**: `F1 > Developer: Show Running Extensions`
   - Ver extensiones activas y su uso de recursos

## ⚡ Soluciones Principales

### 1. Gestión de Extensiones

**Problema #1 de rendimiento**: Extensiones que consumen mucha CPU/memoria

**Soluciones**:
- Deshabilitar extensiones que no uses frecuentemente
- Usar workspaces para habilitar solo extensiones necesarias por proyecto
- Actualizar extensiones regularmente

**Extensiones comúnmente problemáticas**:
- Linters pesados (ESLint con reglas muy complejas)
- Formatters con configuraciones agresivas
- Extensiones de AI/Copilot (si no las usas, desactiva)
- Extensiones de themes/iconos muy elaboradas

### 2. Configuraciones Críticas

He creado un archivo `settings-optimization.json` con las configuraciones óptimas.

**Aplicar configuraciones**:
1. Abre `Ctrl+,` (Settings)
2. Copia el contenido de `settings-optimization.json`
3. Pega en tu `settings.json` (User o Workspace)

**Configuraciones más impactantes**:

```json
{
  // Excluir carpetas del file watcher (↓ CPU/memoria)
  "files.watcherExclude": {
    "**/node_modules/**": true,
    "**/.next/**": true,
    "**/dist/**": true
  },
  
  // Limitar tokenización en archivos grandes (↓ lag en scroll)
  "editor.maxTokenizationLineLength": 20000,
  
  // Reducir búsquedas (↓ I/O)
  "search.followSymlinks": false,
  "search.exclude": {
    "**/node_modules": true,
    "**/.git": true
  },
  
  // Memoria TypeScript Server (ajustar según RAM)
  "typescript.tsserver.maxTsServerMemory": 4096,
  
  // Deshabilitar telemetría (mejora menor)
  "telemetry.telemetryLevel": "off"
}
```

### 3. Optimizaciones Específicas por Tipo de Problema

#### A. VS Code arranca lento

**Diagnóstico**:
```bash
code --prof-startup
# Luego revisar archivos .cpuprofile generados
```

**Soluciones**:
- Reducir número de extensiones activas al inicio
- Revisar `F1 > Startup Performance` para ver qué tarda más
- No abrir workspaces muy grandes al inicio

#### B. Alto consumo de CPU

**Diagnóstico**:
1. `Help > Open Process Explorer`
2. Identificar proceso problemático (Extension Host, Renderer, Shared Process)

**Si es Extension Host**:
- Usar Extension Bisect
- Deshabilitar extensiones pesadas

**Si es Renderer Process**:
- Reducir archivos abiertos
- Simplificar configuración de UI
- Deshabilitar minimap si tienes archivos grandes

**Si es TypeScript Server**:
```json
{
  "typescript.tsserver.maxTsServerMemory": 4096,
  "typescript.tsserver.watchOptions": {
    "excludeDirectories": ["**/node_modules", "**/.git", "**/dist"]
  }
}
```

#### C. Lag al escribir/scrollear

**Diagnóstico**:
1. `Help > Toggle Developer Tools`
2. Tab "Performance" > Record
3. Escribir/scrollear durante el lag
4. Analizar perfil

**Soluciones**:
```json
{
  "editor.renderWhitespace": "selection",
  "editor.renderControlCharacters": false,
  "editor.maxTokenizationLineLength": 20000,
  "editor.bracketPairColorization.enabled": false, // Si usas muchos niveles
  "editor.guides.bracketPairs": false
}
```

#### D. Muchos archivos en el workspace

**Para proyectos grandes (como Nodexia-Web)**:

```json
{
  "files.watcherExclude": {
    "**/.git/objects/**": true,
    "**/node_modules/**": true,
    "**/dist/**": true,
    "**/.next/**": true,
    "**/build/**": true,
    "**/coverage/**": true,
    "**/.cache/**": true
  },
  
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.next": true,
    "**/pnpm-lock.yaml": true
  },
  
  "files.exclude": {
    "**/.git": true,
    "**/.next": true,
    "**/dist": true
  }
}
```

### 4. Deshabilitar Features que no uses

```json
{
  // Si no usas AI features
  "chat.disableAIFeatures": true,
  
  // Si no usas Git desde VS Code
  "git.enabled": false,
  
  // Si no necesitas auto-fetch
  "git.autofetch": false,
  
  // Si no necesitas experimentales
  "workbench.enableExperiments": false
}
```

## 🔧 Optimizaciones Avanzadas

### Limpiar Cache de VS Code

**Windows**:
```powershell
# Cerrar VS Code primero
Remove-Item -Recurse -Force "$env:APPDATA\Code\Cache"
Remove-Item -Recurse -Force "$env:APPDATA\Code\CachedData"
Remove-Item -Recurse -Force "$env:APPDATA\Code\GPUCache"
```

### Reinstalar VS Code (limpio)

Si nada funciona:
```powershell
# 1. Desinstalar VS Code
# 2. Eliminar carpetas de datos:
Remove-Item -Recurse -Force "$env:APPDATA\Code"
Remove-Item -Recurse -Force "$env:USERPROFILE\.vscode"
# 3. Reinstalar
```

### Configuración GPU

Si tienes problemas de renderizado:
```bash
# Deshabilitar aceleración GPU
code --disable-gpu
```

Agregar a settings:
```json
{
  "disable-hardware-acceleration": true
}
```

## 📈 Monitoreo Continuo

### Comandos para Performance Profiling

**Extension Host Profile**:
1. `F1 > Developer: Show Running Extensions`
2. Click en botón de grabación
3. Realizar acciones que causan lag
4. Detener y guardar perfil

**Renderer Process Profile**:
1. `Help > Toggle Developer Tools`
2. Pestaña "Performance"
3. Record > Realizar acciones > Stop
4. Analizar flame chart

**Startup Profile**:
```bash
code --prof-startup
```

## ✅ Checklist de Optimización

- [ ] Revisar extensiones instaladas y deshabilitar las innecesarias
- [ ] Aplicar configuraciones de `settings-optimization.json`
- [ ] Excluir `node_modules`, `.next`, `dist` del file watcher
- [ ] Ajustar `typescript.tsserver.maxTsServerMemory` según RAM
- [ ] Deshabilitar telemetría
- [ ] Reducir `search.maxResults` si haces muchas búsquedas
- [ ] Configurar `files.watcherExclude` para carpetas grandes
- [ ] Deshabilitar características que no uses (AI, Git, etc.)
- [ ] Limpiar cache si VS Code tiene mucho tiempo instalado
- [ ] Verificar Process Explorer regularmente

## 🎯 Para Nodexia-Web Específicamente

Considerando tu proyecto:

```json
{
  // Excluir carpetas pesadas de Nodexia
  "files.watcherExclude": {
    "**/node_modules/**": true,
    "**/.next/**": true,
    "**/dist/**": true,
    "**/build/**": true,
    "**/pnpm-lock.yaml": true,
    "**/.git/objects/**": true,
    "**/coverage/**": true
  },
  
  // Optimizar para TypeScript/React
  "typescript.tsserver.maxTsServerMemory": 8192, // Si tienes 16GB+ RAM
  "typescript.tsserver.watchOptions": {
    "excludeDirectories": [
      "**/node_modules",
      "**/.git",
      "**/dist",
      "**/.next"
    ]
  },
  
  // ESLint optimizado
  "eslint.workingDirectories": [
    { "mode": "auto" }
  ],
  
  // Reducir archivos en búsqueda
  "search.exclude": {
    "**/node_modules": true,
    "**/pnpm-lock.yaml": true,
    "**/.next": true,
    "**/dist": true
  }
}
```

## 📚 Referencias

- [Performance Issues - Official Wiki](https://github.com/microsoft/vscode/wiki/Performance-Issues)
- [VS Code FAQ - Performance](https://code.visualstudio.com/docs/supporting/faq)
- [Settings Documentation](https://code.visualstudio.com/docs/configure/settings)

## 🆘 Si nada funciona

1. Reportar issue: `Help > Report Issue` (tipo: Performance Issue)
2. Incluir output de `code --status`
3. Adjuntar CPU profiles
4. Describir cuándo ocurre el problema

---

**Siguiente paso**: Aplica las configuraciones de `settings-optimization.json` a tu workspace y reinicia VS Code.
