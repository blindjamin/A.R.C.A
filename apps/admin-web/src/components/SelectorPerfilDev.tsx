import {
  IDENTIDADES_DEV,
  cambiarPerfilDev,
  perfilDevActual,
  type PerfilDev,
} from '../api/admin';

/**
 * DEUDA DECLARADA — selector de identidad para desarrollo y demo.
 *
 * El panel todavía no tiene login propio (ver el bloque de identidades en
 * api/admin.ts). Mientras tanto, esto permite alternar entre el administrador y
 * el operador para comprobar el control de acceso por rol desde la interfaz:
 * ambos gestionan solicitudes, pero solo el administrador ve el registro de
 * auditoría.
 *
 * Recarga la página al cambiar en vez de propagar el cambio por estado: las
 * pantallas piden sus datos al montarse, y una recarga garantiza que todo se
 * vuelva a pedir con la identidad nueva sin agregar un contexto que después
 * habría que desarmar.
 *
 * Se elimina junto con las identidades fijas cuando HU-12 cierre el callback.
 */
export default function SelectorPerfilDev() {
  const actual = perfilDevActual();

  const seleccionar = (perfil: PerfilDev) => {
    if (perfil === actual) return;
    cambiarPerfilDev(perfil);
    window.location.reload();
  };

  return (
    <div className="border-t border-line px-3 py-3">
      <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-2">
        Sesión de prueba
      </p>

      <div
        role="group"
        aria-label="Identidad de desarrollo"
        className="flex flex-col gap-1"
      >
        {(Object.keys(IDENTIDADES_DEV) as PerfilDev[]).map((perfil) => {
          const identidad = IDENTIDADES_DEV[perfil];
          const activo = perfil === actual;

          return (
            <button
              key={perfil}
              type="button"
              onClick={() => seleccionar(perfil)}
              aria-pressed={activo}
              className={`rounded-md px-3 py-2 text-left text-xs transition-colors ${
                activo
                  ? 'bg-green-50 text-green-700'
                  : 'text-slate hover:bg-line'
              }`}
            >
              <span className="block font-semibold">{identidad.nombre}</span>
              <span className="block text-[11px] opacity-80">
                {identidad.rol}
              </span>
            </button>
          );
        })}
      </div>

      <p className="px-2 pt-2 text-[10px] leading-snug text-slate-2">
        Solo el administrador accede al registro de auditoría.
      </p>
    </div>
  );
}
