# ⚡ OPTIMIZACIÓN VS CODE - NODEXIA

## 🚨 VS Code está lento? Sigue estos pasos

### PASO 1: Limpieza Profunda (1 minuto)
```powershell
# Ejecuta en PowerShell dentro del proyecto:
.\limpiar-cache-vscode.ps1
```

**O limpieza rápida:**
```powershell
.\optimizar-vscode.ps1
Remove-Item .next -Recurse -Force
```

### PASO 2: Reinicia TypeScript Server
1. `Ctrl+Shift+P`
2. Escribe: `TypeScript: Restart TS Server`
3. Enter

### PASO 3: Cierra archivos innecesarios
1. `Ctrl+K W` (cierra todos los editores)
2. Abre solo los archivos que estés editando ahora
3. **Máximo 5 archivos abiertos simultáneamente**

### PASO 4: Verifica performance
```powershell
# Ejecuta para ver diagnóstico:
.\check-performance.ps1
```

---

## 🎯 Configuraciones ya aplicadas

✅ **TypeScript Server:**
- Memoria máxima: 8GB
- Diagnósticos de proyecto desactivados
- Auto-imports optimizados
- Watch optimizado con useFsEvents

✅ **Exclusiones de vigilancia:**
- `node_modules/` (1.23 GB)
- `.next/`
- `dist/`, `build/`
- `e2e/`, `__tests__/`
- `.session/`

✅ **Editor optimizado:**
- CodeLens desactivado
- Inlay Hints desactivado
- Hover delay: 300ms
- Lightbulb desactivado
- Minimap desactivado
- Breadcrumbs desactivados
- Límite de 5 editores
- Semantic highlighting desactivado
- Bracket matching desactivado
- Selection highlight desactivado
- Color decorators desactivado
- Links desactivados
- Git decorations desactivadas

✅ **Git optimizado:**
- Auto-fetch desactivado
- Auto-refresh desactivado

✅ **Linters:**
- ESLint solo al guardar
- Formateo desactivado
- Task runners desactivados

---

## 🔧 Si aún está lento

### Opción A: Reinicia VS Code
1. Cierra **TODAS** las ventanas de VS Code
2. Espera 10 segundos
3. Abre **SOLO** este proyecto
4. No abres otros proyectos simultáneamente

### Opción B: Desactiva extensiones temporalmente
Desactiva estas extensiones (temporalmente):
- Prettier (si no lo usas)
- ESLint (solo si es muy lento)
- Otras extensiones de linting/formateo
- Extensiones de preview (PDF, Markdown, etc.)

### Opción C: Limpiar workspace storage de VS Code
```powershell
# Usa el script de limpieza profunda:
.\limpiar-cache-vscode.ps1

# O manual (ADVERTENCIA: Esto borrará configuraciones):
Remove-Item "$env:APPDATA\Code\User\workspaceStorage" -Recurse -Force
```

### Opción D: Verificar procesos de VS Code
```powershell
# Ver procesos activos de VS Code:
Get-Process | Where-Object { $_.ProcessName -like "*code*" -or $_.ProcessName -like "*electron*" }

# Si ves muchos procesos, cierra VS Code completamente y reabre
```

---

## 📊 Métricas normales

**Uso de memoria esperado:**
- VS Code total: < 1.5 GB
- TypeScript Server: < 500 MB
- Procesos auxiliares: < 300 MB

**Si excede estos valores:** Reinicia VS Code

---

## 🚀 Atajos útiles

| Atajo | Acción |
|-------|--------|
| `Ctrl+K W` | Cerrar todos los editores |
| `Ctrl+W` | Cerrar editor actual |
| `Ctrl+Shift+P` | Command Palette |
| `Ctrl+P` | Buscar archivo (más rápido que explorador) |
| `Ctrl+,` | Configuración |

---

## 📁 Archivos de optimización

- `optimizar-vscode.ps1` - Script de limpieza
- `check-performance.ps1` - Diagnóstico de performance
- `.vscode/settings.json` - Configuración optimizada del proyecto

---

**Última actualización:** 22-Dic-2025  
**Configurado por:** GitHub Copilot  
**Estado:** ✅ Optimizado para 254 archivos TypeScript
