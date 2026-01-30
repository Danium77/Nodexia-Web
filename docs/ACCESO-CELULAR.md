# 📱 ACCESO DESDE CELULAR - Nodexia

## 🌐 Tu Configuración

**IP de tu PC:** `192.168.0.110`  
**Puerto:** `3000`  
**URL completa:** `http://192.168.0.110:3000/chofer-mobile`

---

## ✅ Pasos para Acceder

### 1. Verificar que Ambos Dispositivos Están en la Misma Red WiFi

**En tu PC:**
- Ya verificado ✅: Conectado a la red

**En tu celular:**
- Ve a Configuración → WiFi
- Verifica que estás conectado a la **MISMA red WiFi** que tu PC
- Nombre de red debe coincidir

### 2. Abrir en el Celular

**Android (Chrome/Edge/Samsung Internet):**
1. Abre el navegador
2. Escribe en la barra de dirección:
   ```
   http://192.168.0.110:3000/chofer-mobile
   ```
3. Presiona Enter

**iOS (Safari):**
1. Abre Safari
2. Escribe en la barra de dirección:
   ```
   http://192.168.0.110:3000/chofer-mobile
   ```
3. Presiona Ir

---

## 🐛 Si No Carga - Troubleshooting

### Problema 1: "No se puede acceder al sitio"

**Soluciones:**
1. Verifica que AMBOS dispositivos están en la misma WiFi
2. Verifica que el servidor está corriendo en tu PC (debe decir "Ready")
3. Desactiva temporalmente el firewall de Windows:
   ```powershell
   # Ejecutar en PowerShell como Administrador
   New-NetFirewallRule -DisplayName "Next.js Dev Server" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
   ```

### Problema 2: "Tiempo de espera agotado"

**Soluciones:**
1. Verifica que no hay VPN activa en ningún dispositivo
2. Reinicia el router WiFi
3. Reinicia el servidor:
   - En la terminal donde está corriendo, presiona `Ctrl+C`
   - Ejecuta nuevamente: `pnpm dev`

### Problema 3: "Conexión rechazada"

**Soluciones:**
1. Verifica que el servidor está escuchando en todas las interfaces:
   - En la terminal debe decir: `Network: http://192.168.0.110:3000`
2. Si no aparece "Network", agrega esto a `next.config.ts`:
   ```typescript
   const nextConfig = {
     // ... configuración existente
     experimental: {
       externalDir: true,
     },
   };
   ```

### Problema 4: Página carga pero no funciona correctamente

**Soluciones:**
1. Limpia la caché del navegador móvil
2. Abre en modo incógnito/privado
3. Verifica la consola de errores (si tienes herramientas de desarrollo)

---

## 🔥 Firewall de Windows (Configuración Recomendada)

Si el celular no puede conectarse, es probable que el firewall de Windows esté bloqueando:

### Opción 1: Agregar Regla Temporal
```powershell
# Ejecutar en PowerShell como Administrador
New-NetFirewallRule -DisplayName "Next.js Dev" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

### Opción 2: Manual
1. Panel de Control → Firewall de Windows
2. Configuración avanzada
3. Reglas de entrada → Nueva regla
4. Tipo: Puerto
5. Puerto local específico: `3000`
6. Permitir la conexión
7. Aplicar a todas las redes
8. Nombre: "Next.js Dev Server"

---

## ✅ Verificación Rápida

### Desde tu PC, prueba estas URLs:

**Local (debe funcionar):**
```
http://localhost:3000/chofer-mobile
```

**Red (debe funcionar):**
```
http://192.168.0.110:3000/chofer-mobile
```

### Desde tu celular, prueba:

**URL completa:**
```
http://192.168.0.110:3000/chofer-mobile
```

**Ping a la IP (opcional - requiere app de terminal):**
```
ping 192.168.0.110
```

---

## 🎯 URLs Alternativas para Probar

Si `192.168.0.110` no funciona, intenta con:

1. **IPv4 completa:**
   ```
   http://192.168.0.110:3000/chofer-mobile
   ```

2. **Dirección local sin ruta:**
   ```
   http://192.168.0.110:3000
   ```

3. **Con login directo:**
   ```
   http://192.168.0.110:3000/login
   ```

---

## 📊 Estado del Servidor

El servidor está corriendo y dice:
```
✓ Ready in 5.1s
- Local:        http://localhost:3000
- Network:      http://192.168.0.110:3000
```

Esto significa que **ESTÁ ACCESIBLE** desde la red local.

---

## 💡 Tips Adicionales

### Para Mayor Comodidad:

1. **Agregar a Favoritos** en el navegador móvil
2. **Usar QR Code** para no escribir la URL:
   - Ve a: https://www.qr-code-generator.com/
   - Pega: `http://192.168.0.110:3000/chofer-mobile`
   - Genera QR
   - Escanea desde tu celular

3. **Instalar como PWA** (una vez que cargue):
   - Android: Banner automático o Menú → "Instalar aplicación"
   - iOS: Botón Compartir → "Añadir a Inicio"

---

## 🔒 Credenciales para Login

Una vez que cargue la página:

```
Email: walter@logisticaexpres.com
Password: WalterZayas2025!
```

---

## 📞 Comandos Útiles

### Ver tu IP actual:
```powershell
ipconfig | Select-String "IPv4"
```

### Ver si el puerto 3000 está abierto:
```powershell
netstat -an | findstr ":3000"
```

### Reiniciar servidor:
```powershell
# En la terminal donde está corriendo
Ctrl+C
pnpm dev
```

---

**Fecha:** 24 de Noviembre 2025  
**Tu IP:** 192.168.0.110  
**Puerto:** 3000  
**Estado Servidor:** ✅ Corriendo

---

## 🎯 Acción Inmediata

**Abre en tu celular:**
```
http://192.168.0.110:3000/chofer-mobile
```

Si no funciona, avísame qué error ves en el celular y te ayudo a resolverlo.
