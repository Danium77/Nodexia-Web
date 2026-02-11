# REPORTE DE AUDITORÍA DE BASE DE DATOS

**Fecha:** 2026-02-08T23:09:43.069Z  
**Proyecto:** Nodexia-Web

---

## 📊 RESUMEN

- **Total archivos SQL:** 106
- **Migraciones numeradas:** 86
- **Archivos FIX:** 4
- **Archivos DEBUG/verificar:** 11
- **Otros:** 7
- **Última migración:** 046_sistema_documentacion_recursos.sql

---

## ⚠️ PROBLEMAS DETECTADOS

### Archivos Duplicados/Versiones:
- 002_migracion_arquitectura_completa.sql <-> 002_migracion_arquitectura_completa_v2.sql
- 002_migracion_arquitectura_completa.sql <-> 002_migracion_simple_v3.sql
- 005_crear_tablas_faltantes.sql <-> 005_seed_datos_demo.sql
- 007_agregar_origen_asignacion.sql <-> 007_configurar_admin_demo.sql
- 008_agregar_tipo_administrador.sql <-> 008_crear_ubicaciones.sql
- 008_agregar_tipo_administrador.sql <-> 008_limpiar_datos_ejemplo.sql
- 011_FIX_COMPLETE_recreate_notificaciones.sql <-> 011_FIX_DEFINITIVO_cascade.sql
- 011_FIX_COMPLETE_recreate_notificaciones.sql <-> 011_FIX_FINAL_notificaciones_clean.sql
- 011_FIX_COMPLETE_recreate_notificaciones.sql <-> 011_FIX_sistema_notificaciones.sql
- 011_FIX_COMPLETE_recreate_notificaciones.sql <-> 011_FIX_ULTRA_FINAL_force_clean.sql
- 011_FIX_COMPLETE_recreate_notificaciones.sql <-> 011_FIX_user_id_column.sql
- 011_FIX_COMPLETE_recreate_notificaciones.sql <-> 011_sistema_estados_duales.sql
- 011_FIX_COMPLETE_recreate_notificaciones.sql <-> 011_sistema_notificaciones.sql
- 013_crear_usuario_walter_zayas.sql <-> 013_estado_expirado_sistema.sql
- 013_crear_usuario_walter_zayas.sql <-> 013_estado_expirado_sistema_v2.sql
- 013_crear_usuario_walter_zayas.sql <-> 013_estado_expirado_sistema_v3.sql
- 014_fecha_descarga.sql <-> 014_fix_rls_red_nodexia.sql
- 015_fix_rls_sin_recursion.sql <-> 015_sistema_estados_duales.sql
- 015_fix_rls_sin_recursion.sql <-> 015_sistema_estados_duales_v2.sql
- 016_fix_red_nodexia_assigned_visibility.sql <-> 016_fix_reprogramar_viaje.sql
- 016_fix_red_nodexia_assigned_visibility.sql <-> 016_fix_rls_relaciones_empresas.sql
- 016_fix_red_nodexia_assigned_visibility.sql <-> 016_sistema_reprogramacion.sql
- 017_fix_infinite_recursion_red_nodexia.sql <-> 017_fix_rls_final.sql
- 017_fix_infinite_recursion_red_nodexia.sql <-> 017_unidades_operativas_completo.sql
- 018_agregar_coordenadas_ubicaciones.sql <-> 018_fix_recursion_simple_policies.sql
- 018_agregar_coordenadas_ubicaciones.sql <-> 018_fix_rls_completo.sql
- 019_crear_unidades_ejemplo.sql <-> 019_update_existing_red_nodexia_despachos.sql
- 020_crear_unidades_auto.sql <-> 020_crear_unidades_correcto.sql
- 020_crear_unidades_auto.sql <-> 020_crear_unidades_definitivo.sql
- 020_crear_unidades_auto.sql <-> 020_crear_unidades_final.sql
- 020_crear_unidades_auto.sql <-> 020_crear_unidades_nodexia.sql
- 020_crear_unidades_auto.sql <-> 020_fix_visibility_assigned_viajes.sql
- 024_fix_rls.sql <-> 024_tracking_gps.sql
- 025_fix_column_name.sql <-> 025_fix_rls.sql
- 025_fix_column_name.sql <-> 025_historial_unidades_operativas.sql
- 028_auditoria_cancelaciones.sql <-> 028_fix_rls_policy.sql
- 028_auditoria_cancelaciones.sql <-> 028_v2_auditoria_cancelaciones_simplificado.sql
- 028_auditoria_cancelaciones.sql <-> 028_v3_vistas_cancelaciones.sql
- 043_rls_control_acceso.sql <-> 043_rls_control_acceso_sin_recursion.sql
- 046_sistema_documentacion_recursos.sql <-> 046_sistema_documentacion_recursos_CORREGIDO.sql

### Archivos FIX (4):
- FIX_CANCELACION_sin_campos_inexistentes.sql
- FIX_company_id_error.sql
- FIX_delete_bad_trigger.sql
- FIX_FINAL_notificaciones_correct_structure.sql

### Archivos DEBUG (11):
- 005a_verificar_tablas.sql
- 016c_verificar_y_corregir_reprogramar.sql
- check_camiones_choferes.sql
- check_schema.sql
- DEBUG_despachos_structure.sql
- DEBUG_find_triggers.sql
- DEBUG_verificar_nombre_tabla_usuarios.sql
- verificar-017.sql
- verificar_empresa.sql
- verificar_empresas.sql
- verificar_vista_unidades.sql

---

## 💡 RECOMENDACIONES

1. **Consolidación urgente:** Crear `047_consolidacion_total.sql` que incluya:
   - Schema completo actual
   - Todos los índices necesarios
   - Funciones RPC actualizadas
   - Políticas RLS correctas

2. **Eliminar archivos obsoletos:**
   - Todos los DEBUG_*
   - Todos los verificar_*
   - Todos los check_*
   - FIX_* una vez consolidados

3. **Backup antes de consolidar:**
   ```bash
   # Hacer backup completo de BD antes de consolidación
   ```

4. **Documentar schema:**
   - Crear diagrama ER actualizado
   - Documentar cada tabla y relación
   - Listar funciones y su propósito

---

## 📋 MIGRACIONES NUMERADAS

1. 001_migrar_coordinador_a_planta.sql
2. 002_migracion_arquitectura_completa.sql
3. 002_migracion_arquitectura_completa_v2.sql
4. 002_migracion_simple_v3.sql
5. 003_parche_fk_ofertas.sql
6. 004_verificacion_completa.sql
7. 005a_verificar_tablas.sql
8. 005_crear_tablas_faltantes.sql
9. 005_seed_datos_demo.sql
10. 006_recrear_tablas_forzado.sql
11. 007_agregar_origen_asignacion.sql
12. 007_configurar_admin_demo.sql
13. 008_agregar_tipo_administrador.sql
14. 008_crear_ubicaciones.sql
15. 008_limpiar_datos_ejemplo.sql
16. 009_catalogo_completo_roles.sql
17. 010_mejoras_cancelacion_viajes.sql
18. 011_FIX_COMPLETE_recreate_notificaciones.sql
19. 011_FIX_DEFINITIVO_cascade.sql
20. 011_FIX_FINAL_notificaciones_clean.sql
21. 011_FIX_sistema_notificaciones.sql
22. 011_FIX_ULTRA_FINAL_force_clean.sql
23. 011_FIX_user_id_column.sql
24. 011_sistema_estados_duales.sql
25. 011_sistema_notificaciones.sql
26. 012_fix_rls_estados_insert.sql
27. 013_crear_usuario_walter_zayas.sql
28. 013_estado_expirado_sistema.sql
29. 013_estado_expirado_sistema_v2.sql
30. 013_estado_expirado_sistema_v3.sql
31. 014_fecha_descarga.sql
32. 014_fix_rls_red_nodexia.sql
33. 015_fix_rls_sin_recursion.sql
34. 015_sistema_estados_duales.sql
35. 015_sistema_estados_duales_v2.sql
36. 016b_fix_reprogramar_viaje.sql
37. 016c_verificar_y_corregir_reprogramar.sql
38. 016d_reprogramar_viaje_FINAL.sql
39. 016e_fix_reprogramar_sin_updated_at.sql
40. 016_fix_red_nodexia_assigned_visibility.sql
41. 016_fix_reprogramar_viaje.sql
42. 016_fix_rls_relaciones_empresas.sql
43. 016_sistema_reprogramacion.sql
44. 017_fix_infinite_recursion_red_nodexia.sql
45. 017_fix_rls_final.sql
46. 017_unidades_operativas_completo.sql
47. 018_agregar_coordenadas_ubicaciones.sql
48. 018_fix_recursion_simple_policies.sql
49. 018_fix_rls_completo.sql
50. 019a_ver_recursos.sql
51. 019b_ver_recursos_correcto.sql
52. 019_crear_unidades_ejemplo.sql
53. 019_update_existing_red_nodexia_despachos.sql
54. 020_crear_unidades_auto.sql
55. 020_crear_unidades_correcto.sql
56. 020_crear_unidades_definitivo.sql
57. 020_crear_unidades_final.sql
58. 020_crear_unidades_nodexia.sql
59. 020_fix_visibility_assigned_viajes.sql
60. 021_agregar_dni_usuarios_empresa.sql
61. 022b_limpiar_roles_antiguos.sql
62. 022_simplificar_roles_sistema.sql
63. 023_agregar_destino_id_despachos.sql
64. 024_fix_rls.sql
65. 024_tracking_gps.sql
66. 025_fix_column_name.sql
67. 025_fix_rls.sql
68. 025_historial_unidades_operativas.sql
69. 026_sistema_notificaciones.sql
70. 027_migracion_masiva_ubicaciones.sql
71. 028_auditoria_cancelaciones.sql
72. 028_fix_rls_policy.sql
73. 028_v2_auditoria_cancelaciones_simplificado.sql
74. 028_v3_vistas_cancelaciones.sql
75. 029_fix_testing_issues.sql
76. 030_fix_choferes_empresa_id.sql
77. 031_crear_tabla_requisitos_viaje_red.sql
78. 040_ubicacion_usuario_control_acceso.sql
79. 041_despachos_ubicacion_ids.sql
80. 042_poblar_empresa_id_ubicaciones.sql
81. 043_rls_control_acceso.sql
82. 043_rls_control_acceso_sin_recursion.sql
83. 044_seguridad_revoke_funciones.sql
84. 045_agregar_documentacion_completa.sql
85. 046_sistema_documentacion_recursos.sql
86. 046_sistema_documentacion_recursos_CORREGIDO.sql

---

## 🔄 PRÓXIMOS PASOS

1. [ ] Backup completo de BD
2. [ ] Crear script de consolidación
3. [ ] Testear en ambiente de desarrollo
4. [ ] Ejecutar en producción
5. [ ] Eliminar archivos obsoletos
6. [ ] Actualizar documentación

---

**Generado automáticamente por:** scripts/audit-db.js
