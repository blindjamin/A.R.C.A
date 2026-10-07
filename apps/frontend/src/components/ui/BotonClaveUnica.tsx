/**
 * Botón oficial de ClaveÚnica (HU-12), según la Guía Botón ClaveÚnica v2.0.
 *
 * El marcado y las clases vienen del ejemplo oficial y NO deben cambiarse: la
 * certificación verifica que se use el botón tal cual, y la guía prohíbe
 * alterar color, alto, tipografía o espaciado. Los estilos viven en
 * `public/claveunica/cu.css`, cargado desde `index.html`.
 *
 * El texto es "Iniciar sesión" porque ClaveÚnica es el único método de acceso
 * del sitio; la guía reserva "ClaveÚnica" para sitios con más de un método.
 * La v2.0 tiene un solo tamaño (`btn-m`, 48px de alto).
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

interface BotonClaveUnicaProps {
  /**
   * Estira el botón hasta el ancho disponible (máximo 550px). La guía lo admite
   * como "relleno definido con el container superior".
   */
  anchoCompleto?: boolean;
  /** Clases del contenedor. No usar para alterar el aspecto del botón. */
  className?: string;
}

/** Ruta del backend que inicia el flujo OpenID Connect. */
const URL_INICIO_SESION = '/api/auth/clave-unica/login';

export default function BotonClaveUnica({
  anchoCompleto = false,
  className,
}: BotonClaveUnicaProps) {
  const clases = [
    'btn-cu',
    'btn-m',
    anchoCompleto && 'btn-fw',
    'btn-color-estandar',
    'rounded-middle',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  // `texto` y no `text`: así viene en el index.html oficial, y es la variante
  // que deja los 4px entre ícono y texto que pide la guía (`text` suma otros 4).
  return (
    <a
      href={URL_INICIO_SESION}
      className={clases}
      aria-label="Iniciar sesión con ClaveÚnica"
    >
      <span className="cl-claveunica" aria-hidden="true"></span>
      <span className="texto" aria-hidden="true">
        Iniciar sesión
      </span>
    </a>
  );
}
