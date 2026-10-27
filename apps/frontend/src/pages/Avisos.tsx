import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  listarAvisos,
  marcarAvisosLeidos,
  type Aviso,
} from '../api/notificaciones';
import { BadgeNoLeidos, EmptyState, IconBell, ScreenHeader } from '../components/ui';
import { useNoLeidos } from '../features/marketplace/chat/NoLeidosContext';
import { haceCuanto } from '../features/marketplace/formato';

export default function Avisos() {
  const navigate = useNavigate();
  const { conversaciones, refrescarAvisos } = useNoLeidos();
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [hayMas, setHayMas] = useState(false);
  const [cargando, setCargando] = useState(true);
  // Los no leídos al abrir se siguen destacando aunque ya se marquen en el servidor.
  const [destacados, setDestacados] = useState<Set<number>>(new Set());

  useEffect(() => {
    let vigente = true;
    listarAvisos()
      .then((pagina) => {
        if (!vigente) return;
        setAvisos(pagina.avisos);
        setHayMas(pagina.hayMas);
        setDestacados(new Set(pagina.avisos.filter((a) => !a.leido).map((a) => a.id)));
        if (pagina.noLeidos > 0) marcarAvisosLeidos().then(refrescarAvisos, () => {});
      })
      .catch(() => {})
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [refrescarAvisos]);

  const verAnteriores = () => {
    const ultimo = avisos[avisos.length - 1];
    if (!ultimo) return;
    listarAvisos(ultimo.id)
      .then((pagina) => {
        setAvisos((previos) => [...previos, ...pagina.avisos]);
        setHayMas(pagina.hayMas);
      })
      .catch(() => {});
  };

  const sinLeer = conversaciones.filter((c) => c.noLeidos > 0);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      <ScreenHeader title="Avisos" />

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate">Mensajes</h2>
        {sinLeer.length === 0 ? (
          <p className="text-sm text-slate">No tienes mensajes sin leer</p>
        ) : (
          sinLeer.map((c) => (
            <Link
              key={`${c.articulo.id}-${c.conversacionId}`}
              to={
                c.soyPublicador
                  ? `/marketplace/${c.articulo.id}/chat/${c.conversacionId}`
                  : `/marketplace/${c.articulo.id}/chat`
              }
              className="card flex items-center gap-3 p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{c.articulo.titulo}</p>
                <p className="truncate text-sm text-slate">{c.ultimoMensaje.contenido}</p>
              </div>
              <BadgeNoLeidos cantidad={c.noLeidos} />
            </Link>
          ))
        )}
        <Link to="/marketplace/mensajes" className="block text-sm font-semibold text-green-700">
          Ver todos los mensajes
        </Link>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate">Novedades</h2>
        {cargando ? (
          <p className="text-sm text-slate">Cargando avisos…</p>
        ) : avisos.length === 0 ? (
          <EmptyState
            icon={<IconBell className="h-8 w-8 text-slate" />}
            message="No tienes avisos"
          />
        ) : (
          <>
            {avisos.map((a) => (
              <button
                key={a.id}
                onClick={() => navigate(a.url)}
                className={`card w-full p-3 text-left ${
                  destacados.has(a.id) ? 'border-green-300 bg-green-50' : ''
                }`}
              >
                <p className="font-bold">{a.titulo}</p>
                <p className="text-sm text-ink-2">{a.cuerpo}</p>
                <p className="mt-1 text-xs text-slate-2">{haceCuanto(a.fecha)}</p>
              </button>
            ))}
            {hayMas && (
              <button onClick={verAnteriores} className="btn-ghost mx-auto">
                Ver anteriores
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
}
