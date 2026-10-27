import { useNavigate } from 'react-router-dom';
import { BadgeNoLeidos, EmptyState, IconMarketplace, ScreenHeader } from '../../../components/ui';
import { useNoLeidos } from './NoLeidosContext';

const horaOFecha = (iso: string): string => {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('es-CL');
};

export default function Bandeja() {
  const navigate = useNavigate();
  const { conversaciones } = useNoLeidos();

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <ScreenHeader title="Mensajes" />

      {conversaciones.length === 0 ? (
        <EmptyState
          icon={<IconMarketplace className="h-8 w-8 text-slate" />}
          message="Aún no tienes conversaciones."
          action={
            <button onClick={() => navigate('/marketplace')} className="btn-primary">
              Ir al Marketplace
            </button>
          }
        />
      ) : (
        <ul className="space-y-2">
          {conversaciones.map(
            ({ conversacionId, articulo, soyPublicador, ultimoMensaje, noLeidos }) => (
              <li key={`${articulo.id}-${conversacionId}`}>
                <button
                  onClick={() =>
                    navigate(
                      soyPublicador
                        ? `/marketplace/${articulo.id}/chat/${conversacionId}`
                        : `/marketplace/${articulo.id}/chat`,
                    )
                  }
                  className="card flex w-full items-center gap-3 p-3 text-left"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-green-50">
                    {articulo.fotoUrl ? (
                      <img src={articulo.fotoUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <IconMarketplace className="h-6 w-6 text-green-700" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{articulo.titulo}</p>
                    <p className="text-xs text-slate-2">
                      {soyPublicador ? 'Vecino interesado' : 'Vecino de Santo Domingo'}
                    </p>
                    <p className="truncate text-sm text-slate">
                      {ultimoMensaje.esMio && 'Tú: '}
                      {ultimoMensaje.contenido}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-xs text-slate-2">
                      {horaOFecha(ultimoMensaje.fecha)}
                    </span>
                    <BadgeNoLeidos cantidad={noLeidos} />
                  </div>
                </button>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}
