import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  apiFetch,
  crearSolicitudRetiro,
  fetchCatalogo,
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

export default function NuevaSolicitud() {
  const navigate = useNavigate();
  const { sesion } = useSession();
  const usuarioCiudadanoId = sesion?.ciudadanoId ?? null;
  const [searchParams] = useSearchParams();
  const flujo = useSolicitudFlow();

  const [catalogo, setCatalogo] = useState<ResiduoCatalogo[]>([]);
  const [residuoId, setResiduoId] = useState<number | null>(
    searchParams.get('residuo') ? Number(searchParams.get('residuo')) : null,
  );
  const [nombreResiduoOtro, setNombreResiduoOtro] = useState(
    () => searchParams.get('otro') ?? '',
  );
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

  const seleccionado = catalogo.find((r) => r.id === residuoId);
  const residuoDefinido = Boolean(seleccionado || nombreResiduoOtro.trim());
  const direccionLimpia = direccionRetiro.trim();
  const listoParaEnviar = Boolean(residuoDefinido && foto && direccionLimpia);

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
        direccionRetiro: direccionLimpia,
        foto,
        descripcion: descripcion.trim() || undefined,
        emailContacto,
      });

      let publicadoEnMarket = false;
      let errorMarketplace: string | null = null;
      if (publicarEnMarketplace) {
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
            nombreResiduo: nombreFinal,
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
      setError('Escribe o selecciona el tipo de residuo para tu solicitud.');
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
        subtitle="Confirma el residuo, su foto y dirección para el retiro municipal."
      />

      {error && <p className="pill w-full bg-rose-100 text-rose-600">{error}</p>}

      <form onSubmit={handleSubmit} className="card space-y-5 p-5">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-ink">
            Tipo de residuo
          </label>
          <ComboboxResiduo
            catalogo={catalogo}
            residuoSeleccionado={seleccionado ?? null}
            nombreOtro={nombreResiduoOtro}
            onSeleccionar={(item, textoOtro) => {
              if (item) {
                setResiduoId(item.id);
                setNombreResiduoOtro('');
              } else {
                setResiduoId(null);
                setNombreResiduoOtro(textoOtro);
              }
            }}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold">Foto del objeto</label>
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

        {/* Opción de publicar en paralelo en Marketplace */}
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
