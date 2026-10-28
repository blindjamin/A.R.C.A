/**
 * Plantillas HTML visuales premium para envíos de correo en A.R.C.A.
 * Diseñadas según la guía UX/UI oficial:
 * - Primario Verde Bosque: #0F6B45 y #0A4A30
 * - Dorado Circular Credits: #EF9D24 y #D97706
 * - Canvas claro suave: #F4F7F4
 * - Texto Ink: #0E1B13 / Slate: #4A5568 / Muted: #718096
 */

const LOGO_HEADER_HTML = `
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center" style="padding-bottom: 12px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="width: 64px; height: 64px; background: #FFFFFF; border-radius: 18px; box-shadow: 0 8px 24px rgba(0,0,0,0.2); vertical-align: middle;">
              <img src="cid:arcalogo" alt="Logo A.R.C.A." width="52" height="52" style="display: block; margin: 0 auto; border: 0; outline: none; text-decoration: none; border-radius: 12px;" />
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td align="center">
        <h1 style="margin: 0; font-size: 28px; font-weight: 800; color: #FFFFFF; letter-spacing: 1.5px; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;">
          A.R.C.A.
        </h1>
        <p style="margin: 4px 0 0; font-size: 11px; font-weight: 700; color: #86EFAC; text-transform: uppercase; letter-spacing: 2px; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;">
          Municipalidad de Santo Domingo · DIMAO
        </p>
      </td>
    </tr>
  </table>
`;

const FOOTER_HTML = `
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 24px;">
    <tr>
      <td align="center" style="font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif; font-size: 13px; color: #64748B; line-height: 1.6;">
        <strong style="color: #0F6B45;">A.R.C.A. — Plataforma de Gestión de Residuos y Economía Circular</strong><br>
        Dirección de Medio Ambiente, Aseo y Ornato (DIMAO)<br>
        Ilustre Municipalidad de Santo Domingo · Plaza Las Dalias s/n, Santo Domingo
      </td>
    </tr>
    <tr>
      <td align="center" style="padding-top: 12px; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif; font-size: 11px; color: #94A3B8;">
        Este es un mensaje institucional automático generado por la plataforma A.R.C.A.<br>
        Por favor no respondas directamente a este correo. Para dudas comunícate a soporte.arcaa@gmail.com
      </td>
    </tr>
  </table>
`;

export function generarHtmlCodigo(codigo: string): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Código de verificación — A.R.C.A.</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F4F7F4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0E1B13;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F4F7F4; padding: 36px 12px;">
    <tr>
      <td align="center">
        <!-- Tarjeta principal -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #FFFFFF; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(15, 107, 69, 0.1); border: 1px solid #E2E8F0;">
          
          <!-- Encabezado con degradado y logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #073B25 0%, #0F6B45 60%, #15803D 100%); padding: 36px 24px; text-align: center;">
              ${LOGO_HEADER_HTML}
            </td>
          </tr>

          <!-- Contenido central -->
          <tr>
            <td style="padding: 36px 32px 28px;">
              
              <!-- Insignia de seguridad -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin-bottom: 20px;">
                <tr>
                  <td style="background-color: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 9999px; padding: 6px 16px; font-size: 12px; font-weight: 700; color: #047857; text-transform: uppercase; letter-spacing: 0.5px;">
                    🛡️ Verificación de Cuenta
                  </td>
                </tr>
              </table>

              <h2 style="margin: 0 0 12px; font-size: 24px; font-weight: 800; color: #0E1B13; text-align: center; font-family: 'Segoe UI', sans-serif;">
                Confirma tu correo electrónico
              </h2>
              
              <p style="margin: 0 0 28px; font-size: 15px; color: #4A5568; line-height: 1.6; text-align: center;">
                Estás registrando tu correo para recibir las notificaciones oficiales sobre tus solicitudes de retiro municipal. Ingresa el siguiente código de 6 dígitos en la aplicación:
              </p>

              <!-- Caja destacada del código -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="background: linear-gradient(180deg, #F0FDF4 0%, #DCFCE7 100%); border: 2px dashed #0F6B45; border-radius: 20px; padding: 18px 36px; box-shadow: inset 0 2px 6px rgba(15, 107, 69, 0.06);">
                      <tr>
                        <td align="center">
                          <span style="font-size: 42px; font-weight: 900; letter-spacing: 12px; color: #0F6B45; font-family: 'Courier New', Courier, monospace; margin-left: 12px;">
                            ${codigo}
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Aviso de expiración -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FFFBEB; border: 1px solid #FDE68A; border-radius: 12px; padding: 12px 16px; margin-bottom: 28px;">
                <tr>
                  <td align="center" style="font-size: 13px; color: #92400E; font-weight: 500;">
                    ⏱️ Este código es de uso único y expirará en <strong>10 minutos</strong>.
                  </td>
                </tr>
              </table>

              <!-- Beneficios de registrar el correo -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-top: 1px solid #EDF2F7; padding-top: 24px;">
                <tr>
                  <td style="font-size: 13px; font-weight: 700; color: #0E1B13; padding-bottom: 12px;">
                    ¿Por qué es necesario este correo?
                  </td>
                </tr>
                <tr>
                  <td style="font-size: 13px; color: #64748B; line-height: 1.6;">
                    • <strong>Aviso de aprobación:</strong> Te notificamos cuando el funcionario municipal apruebe tu retiro.<br>
                    • <strong>Coordinación en ruta:</strong> Sabrás el momento en que se derive a la empresa de recolección.<br>
                    • <strong>Privacidad protegida:</strong> Tus datos son confidenciales y se usan únicamente para la gestión comunal.
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Pie de página institucional -->
          <tr>
            <td>
              ${FOOTER_HTML}
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

interface EstadoVisualInfo {
  titulo: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  mensaje: string;
  icono: string;
  pasoActivo: number; // 1 a 4
}

const ESTADOS_MAP: Record<string, EstadoVisualInfo> = {
  aprobada: {
    titulo: 'Solicitud Aprobada por la Municipalidad',
    badgeBg: '#DCFCE7',
    badgeText: '#15803D',
    badgeBorder: '#86EFAC',
    icono: '✅',
    pasoActivo: 2,
    mensaje:
      'Tu solicitud de retiro fue aprobada con éxito por el equipo de revisión municipal. En los próximos días será programada y asignada a la empresa de recolección para su retiro.',
  },
  requiere_modificacion: {
    titulo: 'Se Requiere Información Adicional',
    badgeBg: '#FEF3C7',
    badgeText: '#B45309',
    badgeBorder: '#FCD34D',
    icono: '⚠️',
    pasoActivo: 2,
    mensaje:
      'El funcionario municipal revisó tu solicitud y requiere que complementes los datos o fotografía para autorizar el retiro.',
  },
  rechazada: {
    titulo: 'Solicitud No Admitida',
    badgeBg: '#FFE4E6',
    badgeText: '#BE123C',
    badgeBorder: '#FDA4AF',
    icono: '❌',
    pasoActivo: 2,
    mensaje:
      'Tu solicitud no pudo ser aceptada debido a las ordenanzas municipales sobre tipos o condiciones de residuos admisibles.',
  },
  derivada: {
    titulo: 'Derivada a Ruta de Retiro Externa',
    badgeBg: '#DBEAFE',
    badgeText: '#1D4ED8',
    badgeBorder: '#93C5FD',
    icono: '🚚',
    pasoActivo: 3,
    mensaje:
      'Tu solicitud ha sido incluida en la nómina de la empresa operadora externa. El camión recolector pasará por tu domicilio en el próximo ciclo programado.',
  },
  retirada: {
    titulo: '¡Retiro Completado Exitosamente!',
    badgeBg: '#ECFDF5',
    badgeText: '#047857',
    badgeBorder: '#6EE7B7',
    icono: '🎉',
    pasoActivo: 4,
    mensaje:
      'El residuo voluminoso ha sido retirado satisfactoriamente de tu domicilio. ¡Muchas gracias por contribuir al reciclaje y aseo de Santo Domingo!',
  },
  no_realizada: {
    titulo: 'Retiro No Realizado',
    badgeBg: '#F1F5F9',
    badgeText: '#475569',
    badgeBorder: '#CBD5E1',
    icono: 'ℹ️',
    pasoActivo: 3,
    mensaje:
      'El camión operó en el sector pero el residuo no se encontraba accesible en el domicilio o no pudo ser completada la entrega.',
  },
  cancelada: {
    titulo: 'Solicitud Cancelada',
    badgeBg: '#F3F4F6',
    badgeText: '#6B7280',
    badgeBorder: '#E5E7EB',
    icono: '⚪',
    pasoActivo: 1,
    mensaje: 'La solicitud de retiro ha sido cancelada en el sistema.',
  },
};

export function generarHtmlCambioEstado(
  solicitud: {
    id: number;
    residuoNombre?: string;
    categoria?: string;
    direccion?: string | null;
    fechaSolicitud?: Date | string;
  },
  nuevoEstado: string,
  comentario?: string | null,
): string {
  const info = ESTADOS_MAP[nuevoEstado] || {
    titulo: 'Actualización de Solicitud',
    badgeBg: '#E2E8F0',
    badgeText: '#334155',
    badgeBorder: '#CBD5E1',
    icono: '📌',
    pasoActivo: 2,
    mensaje: `Tu solicitud #${solicitud.id} ha cambiado al estado: ${nuevoEstado}.`,
  };

  const fechaFormateada = solicitud.fechaSolicitud
    ? new Date(solicitud.fechaSolicitud).toLocaleDateString('es-CL', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : 'Reciente';

  // Barra de progreso visual de 4 pasos
  const renderPaso = (numero: number, label: string) => {
    const alcanzado = info.pasoActivo >= numero;
    const actual = info.pasoActivo === numero;
    const bgCirculo = actual ? '#0F6B45' : alcanzado ? '#10B981' : '#E2E8F0';
    const textCirculo = alcanzado ? '#FFFFFF' : '#94A3B8';
    const fontLabel = actual ? 'bold' : 'normal';
    const colorLabel = actual ? '#0F6B45' : alcanzado ? '#1E293B' : '#94A3B8';

    return `
      <td align="center" style="width: 25%;">
        <div style="width: 28px; height: 28px; border-radius: 50%; background-color: ${bgCirculo}; color: ${textCirculo}; font-size: 12px; font-weight: bold; line-height: 28px; margin: 0 auto 6px; text-align: center;">
          ${alcanzado && !actual ? '✓' : numero}
        </div>
        <div style="font-size: 11px; font-weight: ${fontLabel}; color: ${colorLabel}; font-family: 'Segoe UI', sans-serif;">
          ${label}
        </div>
      </td>
    `;
  };

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${info.titulo} — A.R.C.A.</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F4F7F4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0E1B13;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F4F7F4; padding: 36px 12px;">
    <tr>
      <td align="center">
        <!-- Tarjeta principal -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #FFFFFF; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(15, 107, 69, 0.1); border: 1px solid #E2E8F0;">
          
          <!-- Encabezado con degradado y logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #073B25 0%, #0F6B45 60%, #15803D 100%); padding: 36px 24px; text-align: center;">
              ${LOGO_HEADER_HTML}
            </td>
          </tr>

          <!-- Contenido central -->
          <tr>
            <td style="padding: 36px 32px 28px;">
              
              <!-- Insignia del nuevo estado -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin-bottom: 20px;">
                <tr>
                  <td style="background-color: ${info.badgeBg}; border: 1px solid ${info.badgeBorder}; border-radius: 9999px; padding: 8px 20px; font-size: 13px; font-weight: 800; color: ${info.badgeText}; text-transform: uppercase; letter-spacing: 0.5px;">
                    ${info.icono} ${info.titulo}
                  </td>
                </tr>
              </table>

              <h2 style="margin: 0 0 10px; font-size: 24px; font-weight: 800; color: #0E1B13; text-align: center; font-family: 'Segoe UI', sans-serif;">
                Solicitud de Retiro #${solicitud.id}
              </h2>

              <p style="margin: 0 0 28px; font-size: 15px; color: #4A5568; line-height: 1.6; text-align: center;">
                ${info.mensaje}
              </p>

              <!-- Barra de progreso del ciclo -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 16px; padding: 18px 8px; margin-bottom: 28px;">
                <tr>
                  ${renderPaso(1, 'Solicitud')}
                  ${renderPaso(2, 'Revisión')}
                  ${renderPaso(3, 'En Ruta')}
                  ${renderPaso(4, 'Completada')}
                </tr>
              </table>

              <!-- Ficha detallada de la solicitud -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; margin-bottom: 28px; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
                <tr style="background-color: #F1F5F9;">
                  <td colspan="2" style="padding: 12px 18px; font-size: 12px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #E2E8F0;">
                    📋 Resumen del retiro
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 18px; font-size: 14px; color: #64748B; border-bottom: 1px solid #F1F5F9; font-weight: 500;">Número de seguimiento</td>
                  <td align="right" style="padding: 12px 18px; font-size: 14px; color: #0F6B45; font-weight: 800; border-bottom: 1px solid #F1F5F9;">#${solicitud.id}</td>
                </tr>
                ${
                  solicitud.residuoNombre
                    ? `
                <tr>
                  <td style="padding: 12px 18px; font-size: 14px; color: #64748B; border-bottom: 1px solid #F1F5F9; font-weight: 500;">Residuo voluminoso</td>
                  <td align="right" style="padding: 12px 18px; font-size: 14px; color: #1E293B; font-weight: 700; border-bottom: 1px solid #F1F5F9;">${solicitud.residuoNombre}</td>
                </tr>`
                    : ''
                }
                ${
                  solicitud.categoria
                    ? `
                <tr>
                  <td style="padding: 12px 18px; font-size: 14px; color: #64748B; border-bottom: 1px solid #F1F5F9; font-weight: 500;">Categoría</td>
                  <td align="right" style="padding: 12px 18px; font-size: 14px; color: #1E293B; font-weight: 600; border-bottom: 1px solid #F1F5F9;">${solicitud.categoria}</td>
                </tr>`
                    : ''
                }
                ${
                  solicitud.direccion
                    ? `
                <tr>
                  <td style="padding: 12px 18px; font-size: 14px; color: #64748B; border-bottom: 1px solid #F1F5F9; font-weight: 500;">Sector / Dirección</td>
                  <td align="right" style="padding: 12px 18px; font-size: 14px; color: #1E293B; font-weight: 600; border-bottom: 1px solid #F1F5F9;">${solicitud.direccion}</td>
                </tr>`
                    : ''
                }
                <tr>
                  <td style="padding: 12px 18px; font-size: 14px; color: #64748B; font-weight: 500;">Fecha de registro</td>
                  <td align="right" style="padding: 12px 18px; font-size: 14px; color: #1E293B; font-weight: 600;">${fechaFormateada}</td>
                </tr>
              </table>

              <!-- Observaciones del funcionario si existen -->
              ${
                comentario
                  ? `
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FFFBEB; border-left: 4px solid #F59E0B; border-radius: 0 12px 12px 0; margin-bottom: 28px; padding: 16px 20px;">
                <tr>
                  <td>
                    <div style="font-size: 13px; font-weight: 800; color: #92400E; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">
                      💬 Observaciones del Funcionario Municipal:
                    </div>
                    <div style="font-size: 14px; color: #78350F; line-height: 1.6; font-style: italic;">
                      "${comentario}"
                    </div>
                  </td>
                </tr>
              </table>`
                  : ''
              }

              <!-- Botón CTA a la PWA -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 12px;">
                <tr>
                  <td align="center">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="border-radius: 14px; background: linear-gradient(135deg, #0F6B45 0%, #15803D 100%); box-shadow: 0 4px 14px rgba(15, 107, 69, 0.35);">
                          <a href="http://localhost:5173/solicitudes" target="_blank" style="font-size: 15px; font-family: 'Segoe UI', sans-serif; font-weight: 800; color: #FFFFFF; text-decoration: none; padding: 15px 32px; display: inline-block; border-radius: 14px;">
                            Consultar mis retiros en A.R.C.A. ➔
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Pie de página institucional -->
          <tr>
            <td>
              ${FOOTER_HTML}
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}
