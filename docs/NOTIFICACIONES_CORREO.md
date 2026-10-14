# Notificaciones por Correo y Verificación de Contacto — A.R.C.A.

> **Fecha:** 2026-10-13  
> **Autor:** Maximiliano Osorio (Front) con asistencia de IA  
> **Área principal:** Frontend ciudadano (`apps/frontend/`) y soporte aditivo en Backend (`apps/backend/src/mail/`)  
> **Historias de usuario relacionadas:** HU-01 (Solicitud de retiro), HU-23 (Notificaciones de cambio de estado)

---

## 1. Resumen y Propósito

En la plataforma **A.R.C.A.**, el seguimiento de las solicitudes de retiro de residuos voluminosos requiere que los vecinos estén informados sobre las revisiones del municipio (aprobación, solicitudes de modificación, derivación al operador o rechazo).

Para asegurar la recepción de avisos sin fricción innecesaria:
1. **Flujo de verificación en la solicitud:** Cuando un vecino está por enviar una solicitud de retiro en `NuevaSolicitud` y aún no tiene un correo electrónico verificado en su perfil, el sistema abre obligatoriamente un modal para ingresar su correo y validarlo con un código de 6 dígitos (OTP).
2. **Registro único:** Una vez verificado el código, el correo queda guardado en el perfil del vecino (`localStorage` y sesión). En solicitudes posteriores, el flujo continúa directamente sin volver a pedir confirmación.
3. **Notificación por cambio de estado:** Cada vez que un funcionario municipal revisa o cambia el estado de una solicitud (`aprobada`, `requiere_modificacion`, `rechazada`, etc.) desde el panel, el backend despacha un correo informativo con diseño visual responsivo alineado a la guía UX/UI de A.R.C.A.
4. **Remitente:** Diseñado para operar con la cuenta oficial institucional de Gmail (ej. `soporte.arcaa@gmail.com`).

---

## 2. Frontend (`apps/frontend/`)

### Archivos creados y modificados

| Archivo | Acción | Descripción |
|---|---|---|
| `src/features/solicitud-retiro/VerificarCorreoModal.tsx` | **Creado** | Modal accesible con diseño UI Kit (`card`, `field`, `btn-primary`, `pill`) para ingresar correo y verificar el código de 6 dígitos. Cuenta con ayuda visual en modo desarrollo local. |
| `src/utils/perfilStorage.ts` | **Creado** | Utilidades centralizadas para consultar (`obtenerPerfilVecino`), actualizar (`guardarPerfilVecino`) y validar (`tieneCorreoValido`) los datos del vecino. |
| `src/features/solicitud-retiro/NuevaSolicitud.tsx` | **Modificado** | Intercepta el envío de la solicitud si falta correo válido, abriendo el modal de verificación. Al confirmar, guarda el correo y concreta la solicitud. |
| `src/api/arca.ts` | **Modificado** | Se agregaron `solicitarCodigoCorreo` y `verificarCodigoCorreo`, y se extendió `CrearSolicitudInput` con `emailContacto?: string`. |
| `src/pages/Perfil.tsx` | **Modificado** | Sincronizado con `perfilStorage` para mantener coherencia en el estado y en la edición de datos personales. |

---

## 3. Backend (`apps/backend/`)

> **Regla de cambio aditivo:** No se eliminó ni alteró ninguna funcionalidad previa del backend; todos los cambios son aditivos y compatibles hacia atrás.

### Componentes agregados

1. **Módulo `MailModule` (`src/mail/`):**
   - **`MailService`:**
     - Maneja el transporte SMTP con `nodemailer`.
     - Genera códigos OTP numéricos de 6 dígitos válidos por 10 minutos.
     - Valida el código y asocia el correo al ciudadano en la sesión (`sesiones_ciudadano`).
     - Envía notificaciones de cambio de estado.
     - **Modo simulación (fallback):** Si no hay credenciales configuradas en el entorno local (`MAIL_PASS`), no lanza errores ni interrumpe la aplicación; registra el correo en consola (`[MAIL DEV]`) y expone el código en el payload para facilitar el testing.
   - **`MailController` (`/api/mail`):**
     - `POST /api/mail/enviar-codigo`: Recibe `{ email, usuarioCiudadanoId? }`.
     - `POST /api/mail/verificar-codigo`: Recibe `{ email, codigo, usuarioCiudadanoId? }`.
   - **`mail-templates.ts`:**
     - Plantilla HTML para verificación de código con número destacado.
     - Plantilla HTML para cambio de estado con badges de color por estado (`#0F6B45` aprobada, `#D97706` requiere modificación, `#BE123C` rechazada, `#1D4ED8` derivada, `#047857` retirada), tabla de detalles y observaciones del funcionario.

2. **Disparo en `RevisionAdminService`:**
   - Al ejecutar `revisar(...)`, si el servicio de correo está disponible y el ciudadano tiene correo registrado, se envía la notificación de forma asíncrona sin bloquear la transacción administrativa.

3. **Parámetro opcional en `CreateSolicitudRetiroDto`:**
   - Se añadió `emailContacto?: string` opcional para permitir que la creación de la solicitud sincronice inmediatamente el correo verificado del vecino.

---

## 4. Configuración de Variables de Entorno

En `apps/backend/.env.local`:

```bash
# Configuración del servicio de correos A.R.C.A. (Gmail / SMTP)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=465
MAIL_USER=soporte.arcaa@gmail.com
MAIL_PASS=xxxx-xxxx-xxxx-xxxx # Contraseña de aplicación de Google de 16 caracteres
MAIL_FROM="A.R.C.A. Santo Domingo <soporte.arcaa@gmail.com>"
```

> **Nota:** Si `MAIL_PASS` no está definido, el backend opera de forma automática en modo simulación (útil para pruebas locales sin conexión a internet).

---

## 5. Pruebas y Validación

- **Backend:**
  - `npm run lint`: 0 errores.
  - `npm run test`: 30 suites pasadas, 395 tests pasados (incluyendo `mail.service.spec.ts`).
  - `npm run build`: Compilación NestJS exitosa.
- **Frontend:**
  - `npm run lint`: 0 errores.
  - `npm run build`: Compilación Vite + TypeScript exitosa.
