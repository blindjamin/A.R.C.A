import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  apiFetch,
  crearSolicitudRetiro,
  fetchCatalogo,
  formatearPrecio,
  type ObjetoNuevo,
  type ResiduoCatalogo,
} from '../../api/arca';
import { publicarArticulo } from '../../api/marketplace';
import { ComboboxResiduo, ScreenHeader } from '../../components/ui';
import { useSession } from '../../auth/SessionContext';
import {
  obtenerPerfilVecino,
  tieneCorreoValido,
} from '../../utils/perfilStorage';
import { VerificarCorreoModal } from './VerificarCorreoModal';
import { CampoFoto } from './CampoFoto';
import { useSolicitudFlow } from './SolicitudFlowContext';
import { validarFoto } from './fotoSolicitud';

const LARGO_MAXIMO_DIRECCION = 500;
// Mismos topes que `objetos-solicitud.ts` en el backend.
const MAXIMO_OBJETOS = 50;
const CANTIDAD_MAXIMA = 10;

/** Una fila del formulario: un objeto del catálogo o uno escrito por el vecino. */
interface FilaObjeto {
  clave: number;
  residuoId: number | null;
  nombreOtro: string;
  cantidad: number;
}

let siguienteClave = 1;
const filaVacia = (
  residuoId: number | null = null,
  nombreOtro = '',
): FilaObjeto => ({ clave: siguienteClave++, residuoId, nombreOtro, cantidad: 1 });

export default function NuevaSolicitud() {
  const navigate = useNavigate();
  const { sesion } = useSession();
  const usuarioCiudadanoId = sesion?.ciudadanoId ?? null;
  const [searchParams] = useSearchParams();
  const flujo = useSolicitudFlow();

  const [catalogo, setCatalogo] = useState<ResiduoCatalogo[]>([]);
  // Varios objetos por solicitud (HU-01); el primero viene del paso anterior.
  const [filas, setFilas] = useState<FilaObjeto[]>(() => [
    filaVacia(
      searchParams.get('residuo') ? Number(searchParams.get('residuo')) : null,
      searchParams.get('otro') ?? '',
    ),
  ]);
  const [publicarEnMarketplace, setPublicarEnMarketplace] = useState(false);
  const [descripcion, setDescripcion] = useState('');
  // Por defecto, la dirección del perfil; el vecino puede cambiarla (por
  // ejemplo, si pide el retiro para un familiar que vive en otra casa).
  const [direccionRetiro, setDireccionRetiro] = useState(
    () => obtenerPerfilVecino(usuarioCiudadanoId).direccion ?? '',
  );
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mostrarModalCorreo, setMostrarModalCorreo] = useState(false);

  useEffect(() => {
    fetchCatalogo()
      .then(setCatalogo)
      .catch((e: Error) => setError(e.message));
  }, []);

  const residuoDe = (fila: FilaObjeto) =>
    catalogo.find((r) => r.id === fila.residuoId);
  const filaDefinida = (fila: FilaObjeto) =>
    Boolean(residuoDe(fila) || fila.nombreOtro.trim());
  const residuoDefinido = filas.every(filaDefinida);
  const direccionLimpia = direccionRetiro.trim();
  const listoParaEnviar = Boolean(residuoDefinido && foto && direccionLimpia);

  const primera = filas[0];
  const seleccionado = residuoDe(primera);
  const nombreResiduoOtro = primera.nombreOtro;
  const variosObjetos = filas.length > 1;

  // Con todo del catálogo se muestra la suma; con algo fuera, la fija el funcionario.
  const precioEstimado = filas.every((f) => residuoDe(f))
    ? filas.reduce((total, f) => total + (residuoDe(f)?.precio ?? 0) * f.cantidad, 0)
    : null;

  const cambiarFila = (clave: number, cambios: Partial<FilaObjeto>) =>
    setFilas((actuales) =>
      actuales.map((f) => (f.clave === clave ? { ...f, ...cambios } : f)),
    );
  const quitarFila = (clave: number) =>
    setFilas((actuales) => actuales.filter((f) => f.clave !== clave));
  const agregarFila = () => {
    setFilas((actuales) =>
      actuales.length >= MAXIMO_OBJETOS ? actuales : [...actuales, filaVacia()],
    );
    // Publicar en el Marketplace es para un solo objeto.
    setPublicarEnMarketplace(false);
  };

  const objetosParaEnviar = (): ObjetoNuevo[] =>
    filas.map((f) => {
      const residuo = residuoDe(f);
      return residuo
        ? { residuoCatalogoId: residuo.id, cantidad: f.cantidad }
        : { nombreOtro: f.nombreOtro.trim(), cantidad: f.cantidad };
    });
  const resumen = filas
    .map((f) => {
      const nombre = residuoDe(f)?.nombre ?? f.nombreOtro.trim();
      return f.cantidad > 1 ? `${nombre} ×${f.cantidad}` : nombre;
    })
    .join(', ');

  const ejecutarCreacion = async (emailContacto?: string) => {
    if (!residuoDefinido || !foto || !direccionLimpia) return;
    setSubmitting(true);
    setError(null);
    try {
      // Sincronizar con la sesión activa actual para evitar desfasajes si se cambiaron cuentas o pestañas
      const resSesion = await apiFetch('/api/sesion');
      const sesionFresca = resSesion.ok
        ? ((await resSesion.json()) as { ciudadanoId?: string })
        : null;
      const ciudadanoIdValido = sesionFresca?.ciudadanoId || usuarioCiudadanoId;

      if (!ciudadanoIdValido) {
        throw new Error('Tu sesión ha expirado. Por favor inicia sesión nuevamente.');
      }

      const nombreFinal = seleccionado?.nombre ?? nombreResiduoOtro.trim();

      const creada = await crearSolicitudRetiro({
        usuarioCiudadanoId: ciudadanoIdValido,
        residuoCatalogoId: seleccionado ? seleccionado.id : null,
        nombreResiduoOtro: seleccionado ? undefined : nombreResiduoOtro.trim(),
        objetos: objetosParaEnviar(),
        direccionRetiro: direccionLimpia,
        foto,
        descripcion: descripcion.trim() || undefined,
        emailContacto,
      });

      let publicadoEnMarket = false;
      let errorMarketplace: string | null = null;
      if (publicarEnMarketplace && !variosObjetos) {
        try {
          await publicarArticulo({
            tipo: 'regalo',
            titulo: nombreFinal,
            descripcion: descripcion.trim() || undefined,
            residuoCatalogoId: seleccionado ? seleccionado.id : null,
            nombreResiduoOtro: seleccionado ? undefined : nombreResiduoOtro.trim(),
            foto,
          });
          publicadoEnMarket = true;
        } catch (errMarket) {
          console.error('Error publicando paralelamente en Marketplace:', errMarket);
          errorMarketplace =
            (errMarket as Error).message ||
            'No se pudo generar la publicación comunitaria';
        }
      }

      flujo.reset();
      navigate('/solicitud/creada', {
        state: {
          solicitud: {
            id: creada.id,
            residuoId: seleccionado?.id ?? 0,
            nombreResiduo: resumen,
            descripcion: descripcion.trim(),
            direccionRetiro: direccionLimpia,
            foto,
            fotoPreview,
          },
          publicadoMarketplace: publicadoEnMarket,
          errorMarketplace,
        },
      });
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!residuoDefinido) {
      setError(
        variosObjetos
          ? 'A cada objeto le falta elegirlo del catálogo o escribir qué es.'
          : 'Escribe o selecciona el tipo de residuo para tu solicitud.',
      );
      return;
    }
    if (!foto) {
      setError('Agrega una foto del objeto para que el municipio pueda revisarlo.');
      return;
    }
    // La foto pudo venir del paso de captura, que no la valida.
    const errorFoto = validarFoto(foto);
    if (errorFoto) {
      setError(errorFoto);
      return;
    }
    if (!direccionLimpia) {
      setError('Indica la dirección donde se hará el retiro.');
      return;
    }

    // Verificar identidad activa desde la sesión actual
    const resSesion = await apiFetch('/api/sesion');
    const sesionFresca = resSesion.ok
      ? ((await resSesion.json()) as { ciudadanoId?: string })
      : null;
    const ciudadanoIdActivo = sesionFresca?.ciudadanoId || usuarioCiudadanoId;

    if (!ciudadanoIdActivo) {
      setError('Debes iniciar sesión para crear una solicitud.');
      return;
    }

    // Si el vecino aún no tiene correo verificado, se le solicita obligatoriamente
    if (!tieneCorreoValido(ciudadanoIdActivo)) {
      setMostrarModalCorreo(true);
      return;
    }

    const perfil = obtenerPerfilVecino(ciudadanoIdActivo);
    await ejecutarCreacion(perfil.email);
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <ScreenHeader
        title="Nueva solicitud de retiro"
        subtitle="Confirma los objetos, su foto y la dirección para el retiro municipal."
      />

      {error && <p className="pill w-full bg-rose-100 text-rose-600">{error}</p>}

      <form onSubmit={handleSubmit} className="card space-y-5 p-5">
        <fieldset className="space-y-3">
          <legend className="mb-1.5 block text-sm font-semibold text-ink">
            {variosObjetos ? 'Objetos a retirar' : 'Tipo de residuo'}
          </legend>
          {filas.map((fila, i) => (
            <div
              key={fila.clave}
              className={variosObjetos ? 'space-y-2 rounded-lg border border-line p-3' : 'space-y-2'}
            >
              {variosObjetos && (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate">
                    Objeto {i + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => quitarFila(fila.clave)}
                    className="text-xs font-semibold text-rose-600 hover:underline"
                    aria-label={`Quitar el objeto ${i + 1}`}
                  >
                    Quitar
                  </button>
                </div>
              )}
              <ComboboxResiduo
                catalogo={catalogo}
                residuoSeleccionado={residuoDe(fila) ?? null}
                nombreOtro={fila.nombreOtro}
                onSeleccionar={(item, textoOtro) =>
                  cambiarFila(fila.clave, {
                    residuoId: item ? item.id : null,
                    nombreOtro: item ? '' : textoOtro,
                  })
                }
              />
              <div className="flex items-center gap-3">
                <span id={`cantidad-${fila.clave}`} className="text-xs font-semibold text-slate">
                  Cantidad
                </span>
                <div
                  role="group"
                  aria-labelledby={`cantidad-${fila.clave}`}
                  className="inline-flex items-center rounded-pill border border-line"
                >
                  <button
                    type="button"
                    onClick={() =>
                      cambiarFila(fila.clave, { cantidad: Math.max(1, fila.cantidad - 1) })
                    }
                    disabled={fila.cantidad <= 1}
                    className="px-3 py-1 text-lg font-bold text-ink disabled:text-slate-2"
                    aria-label="Uno menos"
                  >
                    −
                  </button>
                  <span className="min-w-[2ch] text-center text-sm font-bold" aria-live="polite">
                    {fila.cantidad}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      cambiarFila(fila.clave, {
                        cantidad: Math.min(CANTIDAD_MAXIMA, fila.cantidad + 1),
                      })
                    }
                    disabled={fila.cantidad >= CANTIDAD_MAXIMA}
                    className="px-3 py-1 text-lg font-bold text-ink disabled:text-slate-2"
                    aria-label="Uno más"
                  >
                    +
                  </button>
                </div>
                {residuoDe(fila) && (
                  <span className="text-xs text-slate">
                    {formatearPrecio((residuoDe(fila)?.precio ?? 0) * fila.cantidad)}
                  </span>
                )}
              </div>
            </div>
          ))}

          {filas.length < MAXIMO_OBJETOS && (
            <button
              type="button"
              onClick={agregarFila}
              className="btn-outline w-full py-2 text-sm font-semibold"
            >
              + Agregar otro objeto
            </button>
          )}

          {/* Solo con todos los objetos elegidos: antes no hay nada que estimar. */}
          {residuoDefinido && (
            <p className="text-xs text-slate" aria-live="polite">
              {precioEstimado !== null
                ? `Valor estimado: ${formatearPrecio(precioEstimado)}. El funcionario lo confirma al revisar.`
                : 'Hay objetos fuera del catálogo: el funcionario te indicará el valor al revisar.'}
            </p>
          )}
        </fieldset>

        <div>
          <label className="mb-1.5 block text-sm font-semibold">
            {variosObjetos ? 'Foto de los objetos' : 'Foto del objeto'}
          </label>
          {variosObjetos && (
            <p className="mb-2 text-xs text-slate">
              Junta los objetos y sácales una sola foto donde se vean todos.
            </p>
          )}
          <CampoFoto
            preview={fotoPreview}
            onElegir={(archivo, preview) => {
              setError(null);
              setFoto(archivo);
              setFotoPreview(preview);
            }}
            onError={setError}
          />
        </div>

        <div>
          <label
            htmlFor="direccion-retiro"
            className="mb-1.5 block text-sm font-semibold"
          >
            Dirección de retiro
          </label>
          <input
            id="direccion-retiro"
            type="text"
            value={direccionRetiro}
            onChange={(e) => setDireccionRetiro(e.target.value)}
            maxLength={LARGO_MAXIMO_DIRECCION}
            required
            autoComplete="street-address"
            placeholder="Ej: Av. del Mar 123, Santo Domingo"
            className="field"
          />
          <p className="mt-1 text-xs text-slate">
            Donde la empresa retirará el objeto. Puede ser distinta a la tuya.
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold">
            Descripción <span className="font-normal text-slate-2">(opcional)</span>
          </label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={3}
            placeholder="Ej: Sofá usado en buen estado"
            className="field resize-none"
          />
        </div>

        {/* Opción de publicar en paralelo en Marketplace: solo con un objeto */}
        {!variosObjetos && (
        <div className="rounded-xl border border-gold-300 bg-gold-50/70 p-4 space-y-2">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={publicarEnMarketplace}
              onChange={(e) => setPublicarEnMarketplace(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gold-400 text-forest-700 focus:ring-forest-600"
            />
            <div className="space-y-0.5">
              <span className="text-sm font-bold text-ink flex items-center gap-1.5">
                <span>🛍️</span>
                <span>Ofrecer también en el Marketplace comunitario</span>
                <span className="pill bg-gold-200 text-gold-900 text-[10px] font-bold py-0.2 px-1.5">
                  Gratis
                </span>
              </span>
              <p className="text-xs text-slate-700 leading-relaxed">
                Reutilizamos la misma foto y datos para crear una publicación comunitaria. Si a un vecino le sirve, podrá solicitarlo y retirarlo antes de que pase el camión municipal.
              </p>
            </div>
          </label>
        </div>
        )}

        <button
          type="submit"
          disabled={submitting || !listoParaEnviar}
          className="btn-primary w-full py-3.5"
        >
          {submitting ? 'Enviando…' : 'Crear solicitud de retiro'}
        </button>
      </form>

      {mostrarModalCorreo && (
        <VerificarCorreoModal
          ciudadanoId={usuarioCiudadanoId}
          onVerificado={(emailVerificado) => {
            setMostrarModalCorreo(false);
            void ejecutarCreacion(emailVerificado);
          }}
          onCerrar={() => setMostrarModalCorreo(false)}
        />
      )}
    </div>
  );
}
