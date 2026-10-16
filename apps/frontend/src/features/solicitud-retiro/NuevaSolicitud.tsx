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
import { PriceTag, ScreenHeader } from '../../components/ui';
import { useSession } from '../../auth/SessionContext';
import {
  obtenerPerfilVecino,
  tieneCorreoValido,
} from '../../utils/perfilStorage';
import { VerificarCorreoModal } from './VerificarCorreoModal';

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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mostrarModalCorreo, setMostrarModalCorreo] = useState(false);

  useEffect(() => {
    fetchCatalogo()
      .then(setCatalogo)
      .catch((e: Error) => setError(e.message));
  }, []);

  const seleccionado = catalogo.find((r) => r.id === residuoId);

  const ejecutarCreacion = async (emailContacto?: string) => {
    if (!seleccionado) return;
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
    if (!seleccionado) return;

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
          disabled={submitting || !seleccionado}
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
