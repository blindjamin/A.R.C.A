import { useEffect, useState } from 'react';
import { fetchMiBloqueo, type MiBloqueo } from '../../api/bloqueo';

/**
 * Un fetch por pantalla; si falla, no avisa (el backend igual rechaza la acción).
 * `version` distinto vuelve a pedir el estado (p. ej. tras un 403 al enviar).
 * También se vuelve a pedir al volver a la pestaña y, mientras dure el bloqueo,
 * cada 15 s: así un desbloqueo se nota sin recargar la pantalla.
 */
export function useMiBloqueo(version = 0): MiBloqueo | null {
  const [bloqueo, setBloqueo] = useState<MiBloqueo | null>(null);
  const bloqueado = !!bloqueo?.bloqueado;
  useEffect(() => {
    let cancelado = false;
    const pedir = () =>
      fetchMiBloqueo()
        .then((r) => !cancelado && setBloqueo(r))
        .catch(() => {});
    void pedir();
    const alVolver = () => {
      if (document.visibilityState === 'visible') void pedir();
    };
    document.addEventListener('visibilitychange', alVolver);
    window.addEventListener('focus', alVolver);
    const temporizador = bloqueado ? window.setInterval(alVolver, 15_000) : undefined;
    return () => {
      cancelado = true;
      document.removeEventListener('visibilitychange', alVolver);
      window.removeEventListener('focus', alVolver);
      if (temporizador) window.clearInterval(temporizador);
    };
  }, [version, bloqueado]);
  return bloqueo;
}
