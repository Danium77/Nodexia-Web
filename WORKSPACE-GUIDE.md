# Guía de Uso - Workspace Multi-Root

## 🚀 Cómo usar el nuevo workspace

### Opción 1: Abrir el workspace completo
```powershell
code Nodexia.code-workspace
```

Esto abre VS Code con 7 "proyectos" separados:
- 📦 Nodexia (Principal) - Vista completa del proyecto
- 🎨 Components - Solo componentes compartidos
- 👤 Admin & SuperAdmin - Solo módulo admin
- 🚛 Transporte - Solo módulo transporte
- 📋 Planning - Solo módulo planning
- 📄 Pages - Solo páginas
- 📚 Docs - Solo documentación

### Opción 2: Abrir carpeta específica
```powershell
# Solo trabajar en transporte
code components/Transporte

# Solo trabajar en admin
code components/Admin
```

## 💡 Ventajas

### Performance
- **TypeScript Server** solo analiza el módulo que estás editando
- **Búsquedas** más rápidas (solo en tu módulo)
- **Menos memoria** consumida

### Organización
- **Enfoque claro** en lo que estás trabajando
- **Explorador más limpio** (solo ves archivos relevantes)
- **Menos distracciones**

## 🎯 Workflows recomendados

### Desarrollo general (toda la app)
```powershell
code Nodexia.code-workspace
```

### Feature específico de un módulo
```powershell
# Trabajando en GPS tracking
code components/Transporte

# Trabajando en dashboard admin
code components/Admin
```

### Documentación
```powershell
code docs
```

## ⚙️ Configuración

Cada folder tiene sus propias exclusiones optimizadas.
Las settings globales del workspace están en `Nodexia.code-workspace`.

## 🔄 Volver al modo anterior

Si prefieres el modo tradicional:
```powershell
code .
```

Esto abre solo la carpeta raíz como antes.
