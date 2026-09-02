/**
 * Botón oficial de ClaveÚnica (HU-12).
 *
 * El marcado y las clases vienen del botón oficial y NO deben cambiarse: la
 * certificación verifica que se use el botón tal cual. Los estilos viven en
 * `public/claveunica/cu.css`, cargado desde `index.html`.
 *
 * Es un `<a>` y no un `<button>` con `onClick` a propósito. La certificación
 * exige que el formulario de ClaveÚnica se abra a pantalla completa, con la barra
 * de direcciones visible y sin iframes ni popups, así que tiene que ser una
 * navegación real del navegador. Un `fetch` seguiría la redirección por detrás
 * sin mover a la persona y el flujo no funcionaría.
 *
 * El destino es el backend, que genera el `state` anti-CSRF y arma la URL de
 * autorización. El `client_id` nunca se expone en el frontend.
 */

/** Tamaños oficiales del botón. */
type TamanoBoton = 's' | 'm' | 'l';

interface BotonClaveUnicaProps {
  /** Tamaño oficial. Por defecto `l`, el que se usa en la pantalla de acceso. */
  tamano?: TamanoBoton;
  /**
   * Estira el botón hasta el ancho disponible (máximo 550px).
   *
   * En el CSS oficial `btn-fw` define solo el ancho: no trae alto, tipografía ni
   * el tamaño del ícono. Por eso se suma a una clase de tamaño en vez de
   * reemplazarla — usarla sola deja el botón aplastado y sin logo.
   */
  anchoCompleto?: boolean;
  /** Clases del contenedor. No usar para alterar el aspecto del botón. */
  className?: string;
}

/** Ruta del backend que inicia el flujo OpenID Connect. */
const URL_INICIO_SESION = '/api/auth/clave-unica/login';

export default function BotonClaveUnica({
  tamano = 'l',
  anchoCompleto = false,
  className,
}: BotonClaveUnicaProps) {
  const clases = [
    'btn-cu',
    `btn-${tamano}`,
    anchoCompleto && 'btn-fw',
    'btn-color-estandar',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <a
      href={URL_INICIO_SESION}
      className={clases}
      aria-label="Iniciar sesión con ClaveÚnica"
    >
      <span className="cl-claveunica" aria-hidden="true"></span>
      <span className="texto">Iniciar sesión</span>
    </a>
  );
}
