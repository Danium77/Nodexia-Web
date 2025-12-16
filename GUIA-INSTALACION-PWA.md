# 📱 Guía de Instalación - Nodexia Chofer PWA

## ✅ Configuración Completada

Se ha configurado la aplicación web como PWA (Progressive Web App) para que funcione como una aplicación nativa en móviles.

---

## 📲 Cómo Instalar en Android

### Opción 1: Chrome (Recomendado)

1. **Abrir la aplicación en Chrome**
   ```
   http://localhost:3000/chofer-mobile
   ```
   O la URL de tu servidor (ej: `http://192.168.0.110:3000/chofer-mobile`)

2. **Buscar el banner de instalación**
   - Aparecerá automáticamente un banner en la parte inferior
   - Dice: "Agregar Nodexia a la pantalla de inicio"

3. **Opción manual desde el menú:**
   - Tap en el menú (3 puntos verticales) ⋮
   - Seleccionar **"Agregar a pantalla de inicio"** o **"Instalar aplicación"**
   - Confirmar instalación

4. **¡Listo!**
   - El ícono aparecerá en tu pantalla de inicio
   - Se abrirá sin la barra del navegador (modo standalone)
   - Funciona como una app nativa

---

## 🍎 Cómo Instalar en iOS (iPhone/iPad)

### Safari (Navegador Predeterminado)

1. **Abrir la aplicación en Safari**
   ```
   http://localhost:3000/chofer-mobile
   ```

2. **Abrir menú de compartir**
   - Tap en el botón de compartir (cuadrado con flecha hacia arriba) 
   - Está en la barra inferior de Safari

3. **Agregar a pantalla de inicio**
   - Deslizar hacia abajo en el menú
   - Tap en **"Añadir a Inicio"** o **"Add to Home Screen"**
   - Editar el nombre si quieres (ej: "Nodexia")
   - Tap en **"Añadir"**

4. **¡Listo!**
   - El ícono aparecerá en tu pantalla de inicio
   - Se abrirá sin Safari (modo standalone)

---

## 🎨 Características de la PWA

### ✅ Ya Configurado

- **Manifest.json**: Define nombre, íconos, colores
- **Service Worker**: Permite funcionamiento offline (básico)
- **Meta Tags**: Optimización para móviles
- **Íconos**: Compatible con Android e iOS
- **Tema**: Color cyan (#06b6d4) para la barra de estado

### 🚀 Beneficios

- ✅ **Acceso rápido**: Ícono en pantalla de inicio
- ✅ **Sin navegador**: Se abre en ventana independiente
- ✅ **Pantalla completa**: Sin barra de dirección
- ✅ **Más nativo**: Parece una app real
- ✅ **Sin Play Store**: No necesitas publicarla

---

## 🔧 Verificar Instalación

### En Chrome Developer Tools (Desktop)

1. Abrir DevTools (F12)
2. Ir a pestaña **"Application"**
3. Sección **"Manifest"**: Ver configuración
4. Sección **"Service Workers"**: Ver si está registrado
5. En **"Lighthouse"** → Run audit → PWA

### Checklist PWA

- ✅ Manifest válido
- ✅ Service Worker registrado
- ✅ HTTPS o localhost
- ✅ Íconos configurados
- ✅ Viewport optimizado
- ✅ Tema configurado

---

## 📱 URLs de Acceso

### Desarrollo Local
```
http://localhost:3000/chofer-mobile
```

### Red Local (desde el celular)
```
http://192.168.0.110:3000/chofer-mobile
```
(Reemplazar con la IP de tu PC)

### Producción
```
https://tu-dominio.com/chofer-mobile
```

---

## 🐛 Troubleshooting

### Problema: No aparece el banner de instalación

**Soluciones:**
1. Verifica que estés en HTTPS o localhost
2. Recarga la página (Ctrl + Shift + R)
3. Verifica que el manifest.json esté accesible: `/manifest.json`
4. Usa la opción manual del menú Chrome

### Problema: Service Worker no se registra

**Soluciones:**
1. Abre DevTools → Console
2. Busca errores relacionados con SW
3. Verifica que `/sw.js` sea accesible
4. Limpia caché del navegador

### Problema: Los íconos no se ven bien

**Soluciones:**
1. Asegúrate que `/logo X gruesa.png` exista
2. Idealmente crear íconos en múltiples tamaños:
   - 72x72, 96x96, 128x128, 144x144, 192x192, 384x384, 512x512
3. Usar herramientas como: https://realfavicongenerator.net

---

## 🎯 Próximas Mejoras (Opcionales)

### Para Producción

1. **Íconos Dedicados**
   - Crear íconos específicos para cada tamaño
   - Usar diseño "maskable" para Android 13+

2. **Splash Screens**
   - Agregar pantallas de carga para iOS

3. **Notificaciones Push**
   - Ya está preparado en el Service Worker
   - Necesitas configurar Firebase Cloud Messaging

4. **Modo Offline Completo**
   - Cachear más recursos
   - Implementar estrategias de sincronización

5. **Actualización Automática**
   - Ya implementado: prompt al usuario cuando hay nueva versión

---

## 📚 Recursos Útiles

- [PWA Builder](https://www.pwabuilder.com/) - Validar PWA
- [Lighthouse](https://developers.google.com/web/tools/lighthouse) - Auditar PWA
- [Manifest Generator](https://www.simicart.com/manifest-generator.html/) - Generar manifest
- [Icon Generator](https://realfavicongenerator.net/) - Generar íconos

---

## 💡 Tips para el Usuario Final

### Android
```
1. Abrir Chrome
2. Ir a http://IP:3000/chofer-mobile
3. Tap en "Agregar a pantalla de inicio"
4. ¡Listo! Usar el ícono de tu home screen
```

### iOS
```
1. Abrir Safari
2. Ir a http://IP:3000/chofer-mobile
3. Tap en botón compartir
4. Tap en "Añadir a Inicio"
5. ¡Listo! Usar el ícono de tu home screen
```

---

**Fecha de configuración:** 24 de Noviembre 2025  
**Versión:** 1.0.0  
**Estado:** ✅ Listo para usar
