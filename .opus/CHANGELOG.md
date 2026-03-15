# CHANGELOG — NODEXIA-WEB

Registro cronológico de cambios significativos. Append-only.

---

## 15-Mar-2026 — Sesión 36: A1 roles_empresa cleanup

### Commit `77be298`
- Eliminados TODOS los `roles_empresa` references (9 archivos, -1546 líneas)
- Borrados: `pages/admin/roles.tsx`, `components/Admin/FormularioRol.tsx`
- Migrados a `ROLES_BY_TIPO`: WizardUsuario, GestionEmpresasReal, roleValidator
- Limpiados: AdminSidebar (nav link), usuarios.tsx (dead lookup), crear-despacho (comment)
- Tests reescritos para funciones migradas (getRolesForCompanyType, roleExists ahora sincrónicas)

---

## 15-Mar-2026 — Sesión 35: Fixes PROD + Auditoría + Nuevo sistema memoria

### Fixes desplegados
- `ea1de8e` — Fix RED button: eliminado join a `roles_empresa`, usar `rol_interno` directo
- `c0c86b4` — Fix "Ver Estado" button: broadened condition, `.maybeSingle()`, logging
- `5288d6d` — Fix CrearUnidadModal: queries resilientes, `unidades_operativas` no bloquea carga

### SQL ejecutado en PROD (manual)
- Creada vista `vista_disponibilidad_unidades` + GRANT + NOTIFY pgrst

### Descubrimientos
- FK `usuarios_empresa.rol_empresa_id → roles_empresa.id` roto por migración 070 (DROP CASCADE)
- `vista_disponibilidad_unidades` nunca fue creada en PROD (migración 017 no ejecutada)
- 48 archivos >400 líneas, 7 pages con queries directas, 31 `.single()`, 12 refs `roles_empresa`

### Decisiones
- No restaurar FK `rol_empresa_id` — tipos incompatibles, `rol_interno` es canónico
- Nuevo sistema memoria `.opus/` reemplaza `.copilot/` y docs redundantes
- Plan: Bloque A (refactor+enterprise) → Bloque B (admin dinámico + features)
- Opus maneja todas las áreas (front/back/BD/mobile) con sistema de memoria estructurado

### Feedback MVP (presentación 14-Mar-2026)
- Validación positiva: robusta, intuitiva, enfocada en dolores reales
- Solicitado: reportes gerenciales, turnos recepción, despachos desde transporte
- Preocupaciones: capacidad, seguridad, integraciones

---

## Pre 15-Mar-2026 — Historial resumido

### Sesiones 1-34 (08-Feb a 01-Mar-2026)
- Proyecto llevado de cero a MVP funcional en ~25 sesiones
- 074 migraciones BD, 60 API routes, 25 páginas, ~80 componentes
- Demo exitosa 28-Feb-2026
- Schema sync PROD↔DEV completado (527 diferencias → 5 irrelevantes)
- Security hardening: 55/55 API routes con withAuth
- Refactoring parcial: 15 componentes extraídos de 4 páginas grandes
- Coordinador integral PyME implementado
- Documentación equipos creada (4 guías)
- Principios de arquitectura establecidos (CERO bypass, CERO parches)
