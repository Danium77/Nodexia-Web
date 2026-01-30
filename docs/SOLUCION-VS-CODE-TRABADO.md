# 🚨 INSTRUCCIONES CRÍTICAS - VS CODE TRABADO

## PROBLEMA IDENTIFICADO:
**Windows Defender está escaneando constantemente tus 693 carpetas de node_modules**

## SOLUCIÓN INMEDIATA:

### 1. Agregar exclusión de Windows Defender (CRÍTICO)

**Ejecuta PowerShell COMO ADMINISTRADOR:**
1. Click derecho en el ícono de Windows
2. Selecciona "Windows PowerShell (Admin)" o "Terminal (Admin)"
3. Ejecuta:
```powershell
Add-MpPreference -ExclusionPath "c:\Users\nodex\Nodexia-Web"
Add-MpPreference -ExclusionPath "c:\Users\nodex\Nodexia-Web\node_modules"
```

### 2. O manualmente desde Windows Security:
1. Abre "Windows Security" (Seguridad de Windows)
2. Ve a "Virus & threat protection" → "Manage settings"
3. Scroll down a "Exclusions" → "Add or remove exclusions"
4. Click "Add an exclusion" → "Folder"
5. Selecciona `c:\Users\nodex\Nodexia-Web`

### 3. Después de agregar la exclusión:
```powershell
# Recargar VS Code
code c:\Users\nodex\Nodexia-Web\Nodexia.code-workspace
```

## CAMBIOS YA REALIZADOS:
- ✅ TypeScript IntelliSense DESHABILITADO completamente
- ✅ JavaScript validation DESHABILITADA
- ✅ node_modules OCULTO del explorador
- ✅ Memoria reducida a 4GB
- ✅ File watchers minimizados

## SI SIGUE LENTO DESPUÉS DE LA EXCLUSIÓN:
Avísame y probaremos con un editor alternativo más ligero.
