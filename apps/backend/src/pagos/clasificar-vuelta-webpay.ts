/**
 * Cómo vuelve el navegador desde Webpay Plus.
 *
 * Tabla de Transbank (no se confirma en los otros casos):
 * - solo `token_ws`: el tarjetahabiente terminó; hay que confirmar;
 * - `TBK_TOKEN` + orden + sesión, sin `token_ws`: anuló en el formulario;
 * - `token_ws` y `TBK_TOKEN` juntos: se agotó el tiempo en el formulario;
 * - solo orden + sesión: se agotó el tiempo antes de llegar al formulario.
 */
export type VueltaWebpay =
  | { tipo: 'confirmar'; token: string }
  | { tipo: 'anulado'; orden: string; sesion: string }
  | { tipo: 'agotado'; orden: string; sesion: string }
  | { tipo: 'invalida' };

export function clasificarVueltaWebpay(
  params: Readonly<Record<string, string>>,
): VueltaWebpay {
  const token = params.token_ws;
  const tbk = params.TBK_TOKEN;
  const orden = params.TBK_ORDEN_COMPRA;
  const sesion = params.TBK_ID_SESION;

  if (token && tbk) {
    if (!orden || !sesion) return { tipo: 'invalida' };
    return { tipo: 'agotado', orden, sesion };
  }

  if (token) {
    return { tipo: 'confirmar', token };
  }

  if (tbk && orden && sesion) {
    return { tipo: 'anulado', orden, sesion };
  }

  if (!tbk && orden && sesion) {
    return { tipo: 'agotado', orden, sesion };
  }

  return { tipo: 'invalida' };
}
