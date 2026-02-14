# 📧 Instrucciones para Desarrollador Externo

Hola! Te comparto el acceso al proyecto Nodexia para tu revisión.

## 🔗 Paso 1: Acceder al Código

1. **Ir al repositorio en GitHub**:  
   https://github.com/Danium77/Nodexia-Web

2. **Hacer Fork** del repositorio:
   - Click en el botón "Fork" (arriba derecha)
   - Esto creará una copia en tu cuenta de GitHub

3. **Clonar tu fork localmente**:
   ```bash
   git clone https://github.com/TU-USUARIO/Nodexia-Web.git
   cd Nodexia-Web
   ```

## 📦 Paso 2: Instalar Dependencias

```bash
pnpm install
```

(Si no tenés pnpm: `npm install -g pnpm`)

## 🔐 Paso 3: Configurar Acceso a Base de Datos

Te voy a enviar por **mensaje privado/email** el archivo `CREDENCIALES-DEV.md` que contiene:

- Variables de entorno para conectar a la base de datos de desarrollo
- Usuarios demo para probar cada rol del sistema
- Contraseñas de acceso

**Importante**: Las credenciales son de SOLO LECTURA para desarrollo. No compartir públicamente.

## 🚀 Paso 4: Iniciar el Proyecto

1. Crear archivo `.env.local` en la raíz con las credenciales que te envié

2. Ejecutar servidor de desarrollo:
   ```bash
   pnpm dev
   ```

3. Abrir en navegador:  
   http://localhost:3000

4. **Probar con usuarios demo** (credenciales en el archivo `CREDENCIALES-DEV.md` que te enviamos por mensaje privado)

## 📚 Paso 5: Explorar Documentación

- **SETUP.md**: Instalación completa y estructura del proyecto
- **CONTRIBUTING.md**: Overview y estado actual
- **/docs/INDICE-DOCUMENTACION.md**: Arquitectura detallada

## 🎯 Qué Revisar

Me interesa tu opinión sobre:

1. **Arquitectura general** - ¿Tiene sentido la estructura?
2. **Código TypeScript** - ¿Ves mejoras o code smells?
3. **UX/UI** - ¿La navegación es intuitiva?
4. **Performance** - ¿Algún bottleneck evidente?
5. **Seguridad** - ¿Alguna vulnerabilidad que veas?

## 💬 Feedback

Podés dejarme feedback de estas formas:

- **Issues en GitHub**: Abrí issues en mi repo original
- **Comentarios en el código**: Hacé comentarios en tu fork
- **Documento**: Creá un archivo FEEDBACK.md en tu fork
- **Contacto directo**: [Tu método de contacto preferido]

---

**Timeframe esperado**: Sin apuro, revisá cuando puedas. Si tenés dudas técnicas, no dudes en consultar.

¡Gracias por tomarte el tiempo de revisar el proyecto! 🙌
