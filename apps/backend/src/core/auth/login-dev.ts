/**
 * Indica si está activo el login de desarrollo (`POST /api/auth/dev/login`).
 *
 * Se compara con el texto exacto `'true'`: con esta variable, cualquier otro
 * valor ("1", "yes", un typo) tiene que dejarlo apagado, nunca encendido.
 */
export function loginDevHabilitado(env: NodeJS.ProcessEnv): boolean {
  return env.ALLOW_DEV_LOGIN === 'true';
}

/**
 * Impide arrancar la app con el login de desarrollo encendido en producción.
 *
 * Ese login deja entrar como cualquier ciudadano conociendo solo su UUID. Un
 * `.env` copiado de desarrollo bastaría para abrirlo en el servidor real, y el
 * error pasaría inadvertido porque todo seguiría funcionando. Por eso se lanza
 * en vez de apagarlo en silencio: que el despliegue falle y alguien lo vea.
 * Se llama en `main.ts` antes de `listen` (SU-2).
 */
export function verificarLoginDev(env: NodeJS.ProcessEnv): void {
  if (loginDevHabilitado(env) && env.NODE_ENV === 'production') {
    throw new Error(
      'ALLOW_DEV_LOGIN=true no está permitido con NODE_ENV=production.',
    );
  }
}
