import { useLocation, useNavigate } from 'react-router-dom';
import { useSolicitudFlow } from './SolicitudFlowContext';
import {
  IconCheck,
  IconRecycle,
  IconBuilding,
} from '../../components/ui';

interface SolicitudReciente {
  id?: number;
  residuoId: number;
  nombreResiduo: string;
  descripcion?: string;
  direccionRetiro?: string;
  foto?: File | null;
  fotoPreview?: string | null;
}

export default function SolicitudCreada() {
  const navigate = useNavigate();
  const location = useLocation();
  const { reset } = useSolicitudFlow();

  const solicitudReciente = (
    location.state as { solicitud?: SolicitudReciente } | null
  )?.solicitud;

  // Salir del flujo limpia la foto efímera.
  const irA = (ruta: string) => {
    reset();
    navigate(ruta);
  };

  const irMarketplace = () => {
    reset();
    navigate('/marketplace/subir', {
      state: {
        importarSolicitud: solicitudReciente
          ? {
              solicitudId: solicitudReciente.id,
              titulo: solicitudReciente.nombreResiduo,
              descripcion: solicitudReciente.descripcion,
              residuoCatalogoId: solicitudReciente.residuoId,
              fotoArchivo: solicitudReciente.foto,
              fotoUrl: solicitudReciente.fotoPreview,
            }
          : undefined,
      },
    });
  };

  const fechaHoy = new Date().toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="mx-auto flex w-full max-w-md flex-col justify-between space-y-4 py-1">
      {/* Membrete institucional compacto */}
      <div className="flex items-center justify-between text-[11px] text-slate border-b border-line pb-2">
        <span className="flex items-center gap-1.5 font-medium">
          <IconBuilding className="h-3.5 w-3.5 text-forest-700" />
          <span>I. Municipalidad de Santo Domingo</span>
        </span>
        <span className="font-semibold text-forest-700">A.R.C.A.</span>
      </div>

      {/* Encabezado minimalista horizontal: icono + título en una sola fila */}
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 ring-2 ring-emerald-50">
          <IconCheck className="h-6 w-6 stroke-[2.5]" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-extrabold text-ink leading-tight">
              Solicitud ingresada
            </h1>
            <span className="pill bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold py-0.5 px-2">
              Folio #{solicitudReciente?.id ?? 'REG'}
            </span>
          </div>
          <p className="text-xs text-slate truncate">
            Tu solicitud quedó radicada para inspección técnica municipal.
          </p>
        </div>
      </div>

      {/* Ticket digital compacto (Grid 2x2: toda la info en mínimo espacio vertical) */}
      <section className="card p-4 space-y-3 border border-line bg-white shadow-xs">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate">
              Residuo
            </span>
            <p className="font-bold text-ink truncate mt-0.5">
              {solicitudReciente?.nombreResiduo ?? 'Residuo voluminoso'}
            </p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate">
              Fecha ingreso
            </span>
            <p className="font-medium text-ink mt-0.5">{fechaHoy}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate">
              Dirección de retiro
            </span>
            <p className="font-medium text-ink truncate mt-0.5">
              {solicitudReciente?.direccionRetiro || 'Dirección registrada'}
            </p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate">
              Estado inicial
            </span>
            <p className="font-semibold text-sky-800 mt-0.5">
              En revisión (24-48h)
            </p>
          </div>
        </div>

        {/* Mini barra de etapas en 1 sola fila */}
        <div className="flex items-center justify-between rounded-md bg-canvas px-3 py-2 text-[11px] border border-line/60">
          <span className="font-bold text-emerald-800 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 inline-block" />
            1. Ingreso ✓
          </span>
          <span className="text-slate">→</span>
          <span className="font-semibold text-sky-900 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-600 inline-block animate-pulse" />
            2. Revisión técnica
          </span>
          <span className="text-slate">→</span>
          <span className="text-slate-2">3. Retiro</span>
        </div>
      </section>

      {/* Opción circular minimalista de 1 sola fila */}
      <div className="rounded-lg border border-gold-300 bg-gold-50/60 px-3.5 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <IconRecycle className="h-4 w-4 text-gold-700 shrink-0" />
          <p className="text-xs text-ink truncate">
            ¿Quieres ofrecerlo a un vecino?
          </p>
        </div>
        <button
          type="button"
          onClick={irMarketplace}
          className="btn-gold py-1 px-2.5 text-[11px] font-bold shrink-0 shadow-2xs"
        >
          Ir al Marketplace
        </button>
      </div>

      {/* Botón principal siempre visible sin scroll */}
      <div className="space-y-1.5 pt-1">
        <button
          type="button"
          onClick={() => irA('/mis-solicitudes')}
          className="btn-primary w-full py-3 text-sm font-bold shadow-sm"
        >
          Ver seguimiento en Mis solicitudes
        </button>
        <button
          type="button"
          onClick={() => irA('/inicio')}
          className="w-full text-center py-1.5 text-xs text-slate hover:text-ink transition-colors font-medium"
        >
          Volver al inicio
        </button>
      </div>
    </div>
  );
}
