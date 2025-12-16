# Solución GPS en Desarrollo - HTTP Local

## Problema
El navegador móvil bloquea acceso al GPS desde HTTP (solo permite HTTPS o localhost).

## Solución Rápida: Chrome Flags (SOLO PARA DESARROLLO)

### En Android Chrome:

1. Abrir Chrome en el celular
2. Ir a: `chrome://flags`
3. Buscar: **"Insecure origins treated as secure"**
4. Agregar: `http://192.168.0.110:3000`
5. Reiniciar Chrome
6. Volver a acceder a `http://192.168.0.110:3000/chofer/tracking-gps`
7. Aceptar permisos de ubicación

### En iOS Safari:

Safari no permite override de seguridad. Necesitas HTTPS.

---

## Solución Profesional: HTTPS Local con mkcert

### 1. Instalar mkcert (Windows)

```powershell
# Con Chocolatey
choco install mkcert

# O descargar de: https://github.com/FiloSottile/mkcert/releases
```

### 2. Crear Certificados SSL

```powershell
cd C:\Users\nodex\Nodexia-Web

# Instalar CA local
mkcert -install

# Crear certificado para localhost y IP local
mkcert localhost 192.168.0.110 127.0.0.1 ::1

# Esto genera:
# - localhost+3.pem (certificado)
# - localhost+3-key.pem (clave privada)
```

### 3. Configurar Next.js para HTTPS

Crear archivo `server.js`:

```javascript
const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0'; // Permitir acceso desde red local
const port = 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, 'localhost+3-key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'localhost+3.pem')),
};

app.prepare().then(() => {
  createServer(httpsOptions, async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  })
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on https://${hostname}:${port}`);
      console.log(`> Acceder desde celular: https://192.168.0.110:${port}`);
    });
});
```

### 4. Actualizar package.json

```json
{
  "scripts": {
    "dev": "node server.js",
    "dev:http": "next dev",
    "build": "next build",
    "start": "next start"
  }
}
```

### 5. Instalar CA en el Celular (Android)

1. Ejecutar en PC: `mkcert -CAROOT`
2. Copiar archivo `rootCA.pem` al celular
3. En Android:
   - Configuración → Seguridad → Cifrado y credenciales → Instalar desde almacenamiento
   - Seleccionar `rootCA.pem`
   - Nombre: "mkcert local CA"

### 6. Iniciar Servidor HTTPS

```powershell
pnpm dev
```

Acceder desde celular: `https://192.168.0.110:3000/chofer/tracking-gps`

---

## Solución en Producción

En producción con dominio real, el HTTPS viene configurado automáticamente por:
- Vercel (automático)
- Nginx con Let's Encrypt
- Cloudflare

No necesitas configuración adicional.

---

## Comparación de Soluciones

| Solución | Facilidad | Seguridad | Tiempo |
|----------|-----------|-----------|--------|
| Chrome Flags | ⭐⭐⭐⭐⭐ Muy fácil | ⚠️ Solo desarrollo | 2 min |
| mkcert HTTPS | ⭐⭐⭐ Moderado | ✅ Seguro en local | 15 min |
| Ngrok/Tunnel | ⭐⭐⭐⭐ Fácil | ✅ HTTPS público | 5 min |

## Recomendación

**Para desarrollo rápido:** Usar Chrome Flags
**Para equipo de desarrollo:** Configurar mkcert HTTPS
**Para demos a clientes:** Usar Ngrok o deploy a Vercel
