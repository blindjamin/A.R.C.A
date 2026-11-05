import { useEffect, useState } from 'react';
import { fetchMiBloqueo, type MiBloqueo } from '../../api/bloqueo';

/** Un fetch por pantalla; si falla, no avisa (el backend igual rechaza la acción). */
/** `version` distinto vuelve a pedir el estado (p. ej. tras un 403 al enviar). */
export function useMiBloqueo(version = 0): MiBloqueo | null {
  const [bloqueo, setBloqueo] = useState<MiBloqueo | null>(null);
  useEffect(() => {
    let cancelado = false;
    fetchMiBloqueo()
      .then((r) => !cancelado && setBloqueo(r))
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [version]);
  return bloqueo;
}
