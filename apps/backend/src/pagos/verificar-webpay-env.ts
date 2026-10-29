/**
 * En producción `WEBPAY_ENV` tiene que estar declarado (`integration` o
 * `production`). Sin eso, un despliegue sin la variable caería en las
 * credenciales públicas de prueba y marcaría solicitudes como pagadas.
 * Misma idea que `verificarLoginDev`: fallar al arrancar, no en silencio.
 */
export function verificarWebpayEnv(env: NodeJS.ProcessEnv): void {
  if (env.NODE_ENV !== 'production') return;

  const entorno = env.WEBPAY_ENV?.trim();
  if (!entorno) {
    throw new Error(
      'WEBPAY_ENV es obligatorio con NODE_ENV=production (integration o production).',
    );
  }
  if (entorno !== 'integration' && entorno !== 'production') {
    throw new Error(
      'WEBPAY_ENV debe ser integration o production cuando NODE_ENV=production.',
    );
  }
}
