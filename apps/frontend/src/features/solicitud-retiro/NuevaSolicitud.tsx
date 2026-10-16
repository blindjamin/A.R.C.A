import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  apiFetch,
  crearSolicitudRetiro,
  fetchCatalogo,
  formatearPrecio,
  iconoPorCategoria,
  type ResiduoCatalogo,
} from '../../api/arca';
import { IconCamera, PriceTag, ScreenHeader } from '../../components/ui';
import { useSession } from '../../auth/SessionContext';
import {
  obtenerPerfilVecino,
  tieneCorreoValido,
} from '../../utils/perfilStorage';
import { useSolicitudFlow } from './SolicitudFlowContext';
import { VerificarCorreoModal } from './VerificarCorreoModal';

// Mismo límite y formatos que valida el backend (ArchivosService).
const FOTO_MAX_MB = 5;
const FOTO_TIPOS = ['image/jpeg', 'image/png', 'image/webp'];

export default function NuevaSolicitud() {
  const navigate = useNavigate();
  const { sesion } = useSession();
  const usuarioCiudadanoId = sesion?.ciudadanoId ?? null;
  const [searchParams] = useSearchParams();

  const [catalogo, setCatalogo] = useState<ResiduoCatalogo[]>([]);
  const [residuoId, setResiduoId] = useState<number | ''>(
    searchParams.get('residuo') ? Number(searchParams.get('residuo')) : '',
  );
  const [descripcion, setDescripcion] = useState('');
  const [direccion, setDireccion] = useState(
    () => obtenerPerfilVecino(usuarioCiudadanoId).direccion ?? '',
  );
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mostrarModalCorreo, setMostrarModalCorreo] = useState(false);
  const { fotoPreview } = useSolicitudFlow();

  useEffect(() => {
    fetchCatalogo()
      .then(setCatalogo)
      .catch((e: Error) => setError(e.message));
  }, []);

  const elegirFoto = (archivo?: File) => {
    if (!archivo) return;
    if (!FOTO_TIPOS.includes(archivo.type)) {
      setError('La foto debe ser JPG, PNG o WebP.');
      return;
    }
    if (archivo.size > FOTO_MAX_MB * 1024 * 1024) {
      setError(`La foto no puede pesar más de ${FOTO_MAX_MB} MB.`);
      return;
    }
    setError(null);
    setFoto(archivo);
    setFotoUrl(URL.createObjectURL(archivo));
  };

  // Si el vecino ya tomó la foto en "Captura el residuo", se usa esa.
  useEffect(() => {
    if (!fotoPreview) return;
    fetch(fotoPreview)
      .then((r) => r.blob())
      .then((blob) =>
        elegirFoto(new File([blob], 'captura', { type: blob.type })),
      )
      .catch(() => {});
  }, [fotoPreview]);

  useEffect(() => () => {
    if (fotoUrl) URL.revokeObjectURL(fotoUrl);
  }, [fotoUrl]);

  const seleccionado = catalogo.find((r) => r.id === residuoId);
  const listo = Boolean(seleccionado && foto && direccion.trim());

  const ejecutarCreacion = async (emailContacto?: string) => {
    if (!seleccionado || !foto) return;
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

      await crearSolicitudRetiro({
        usuarioCiudadanoId: ciudadanoIdValido,
        residuoCatalogoId: seleccionado.id,
        direccionRetiro: direccion.trim(),
        foto,
        descripcion: descripcion.trim() || undefined,
        emailContacto,
      });
      navigate('/solicitud/creada');
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listo) return;

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
        title="Nueva solicitud"
        subtitle="Confirma el residuo y agrega detalles."
      />

      {error && <p className="pill w-full bg-rose-100 text-rose-600">{error}</p>}

      <form onSubmit={handleSubmit} className="card space-y-5 p-5">
        <div>
          <label className="mb-1.5 block text-sm font-semibold">
            Tipo de residuo
          </label>
          <select
            value={residuoId}
            onChange={(e) =>
              setResiduoId(e.target.value ? Number(e.target.value) : '')
            }
            required
            className="field"
          >
            <option value="">Selecciona del catálogo…</option>
            {catalogo.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nombre} — {item.categoria} (
                {formatearPrecio(item.precio)})
              </option>
            ))}
          </select>
        </div>

        {/* Resumen de precio del seleccionado */}
        {seleccionado && (
          <div className="flex items-center justify-between rounded-md bg-green-50 px-4 py-3">
            <span className="flex items-center gap-2 text-sm font-medium">
              <span className="text-xl">{iconoPorCategoria(seleccionado.categoria)}</span>
              {seleccionado.nombre}
            </span>
            <PriceTag amount={seleccionado.precio} className="text-lg" />
          </div>
        )}

        <div>
          <label htmlFor="direccion" className="mb-1.5 block text-sm font-semibold">
            Dirección de retiro
          </label>
          <input
            id="direccion"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            maxLength={500}
            required
            autoComplete="street-address"
            placeholder="Ej: Av. del Mar 123, Santo Domingo"
            className="field"
          />
        </div>

        <div>
          <p className="mb-1.5 text-sm font-semibold">Foto del residuo</p>
          {foto && fotoUrl ? (
            <div className="card overflow-hidden">
              <img
                src={fotoUrl}
                alt="Vista previa del residuo"
                className="aspect-[4/3] w-full object-cover"
              />
              <div className="flex justify-end p-3">
                <button
                  type="button"
                  onClick={() => {
                    setFoto(null);
                    setFotoUrl(null);
                  }}
                  className="btn-ghost px-3 py-1.5 text-xs"
                >
                  Cambiar foto
                </button>
              </div>
            </div>
          ) : (
            <label className="card flex cursor-pointer flex-col items-center gap-2 border-dashed p-8 text-center transition-colors hover:border-green-300">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-700" aria-hidden="true">
                <IconCamera className="h-6 w-6" />
              </span>
              <span className="text-sm font-semibold text-green-700">Tomar o elegir foto</span>
              <span className="text-xs text-slate-2">JPG, PNG o WebP, hasta {FOTO_MAX_MB} MB</span>
              <input
                type="file"
                accept={FOTO_TIPOS.join(',')}
                capture="environment"
                className="sr-only"
                onChange={(e) => {
                  elegirFoto(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </label>
          )}
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

        <button
          type="submit"
          disabled={submitting || !listo}
          className="btn-primary w-full py-3.5"
        >
          {submitting ? 'Enviando…' : 'Crear solicitud'}
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
