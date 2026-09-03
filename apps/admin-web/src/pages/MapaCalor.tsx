import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import { fetchMapaCalor } from '../api/admin';
import type { SectorMapaCalor } from '../api/admin';
import { EmptyState } from '../components/ui';

export default function MapaCalor() {
  const navigate = useNavigate();
  const [metrica, setMetrica] = useState<'volumen' | 'pendientes'>('volumen');
  const [data, setData] = useState<SectorMapaCalor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await fetchMapaCalor(metrica);
        if (!ignore) setData(res);
      } catch (e) {
        if (!ignore) setError(e instanceof Error ? e.message : 'Error desconocido');
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    fetch();
    return () => { ignore = true; };
  }, [metrica]);

  const totalComuna = useMemo(() => {
    return data.reduce((acc, curr) => acc + curr.total, 0);
  }, [data]);

  const pendientesComuna = useMemo(() => {
    return data.reduce((acc, curr) => acc + curr.pendientes, 0);
  }, [data]);

  const ranking = useMemo(() => {
    return [...data]
      .filter(s => s.sector !== 'Sin Ubicación')
      .sort((a, b) => {
        const valA = metrica === 'volumen' ? a.total : a.pendientes;
        const valB = metrica === 'volumen' ? b.total : b.pendientes;
        return valB - valA;
      });
  }, [data, metrica]);

  const mapCenter: [number, number] = [-33.6366, -71.6264];
  
  const getColor = (intensidad: string) => {
    if (intensidad === 'alta') return '#c4452f';
    if (intensidad === 'media') return '#ef9d24';
    return '#1bb46f';
  };

  const mapData = data.filter(s => s.sector !== 'Sin Ubicación');
  const hasData = mapData.some(s => s.total > 0);

  return (
    <div className="flex h-full flex-col gap-6">
      <header>
        <h1 className="text-3xl font-extrabold text-green-900">Mapa de calor</h1>
        <p className="mt-1 text-slate">Distribución georreferenciada de solicitudes</p>
      </header>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Mapa */}
        <div className="flex flex-1 flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-ink">Comuna de Santo Domingo</h2>
              <p className="text-sm text-slate">Intensidad por sector · datos del mes</p>
            </div>
            <div className="flex bg-line rounded-lg p-1">
              <button
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${metrica === 'volumen' ? 'bg-white text-ink shadow-sm' : 'text-slate'}`}
                onClick={() => setMetrica('volumen')}
              >
                Volumen
              </button>
              <button
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${metrica === 'pendientes' ? 'bg-white text-ink shadow-sm' : 'text-slate'}`}
                onClick={() => setMetrica('pendientes')}
              >
                Pendientes
              </button>
            </div>
          </div>

          <div className="card relative flex-1 overflow-hidden min-h-[500px]">
            {loading ? (
              <div className="flex h-full items-center justify-center p-8">
                <span className="text-slate">Cargando datos...</span>
              </div>
            ) : error ? (
              <div className="flex h-full items-center justify-center p-8">
                <span className="text-rose-600">{error}</span>
              </div>
            ) : (
              <MapContainer center={mapCenter} zoom={13} zoomControl={false} scrollWheelZoom={false}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {hasData ? (
                  mapData.map(sector => {
                    const val = metrica === 'volumen' ? sector.total : sector.pendientes;
                    if (val === 0) return null;
                    return (
                      <CircleMarker
                        key={sector.sector}
                        center={[sector.lat, sector.lng]}
                        pathOptions={{
                          color: getColor(sector.intensidad),
                          fillColor: getColor(sector.intensidad),
                          fillOpacity: 0.6,
                          weight: 2
                        }}
                        radius={15 + Math.sqrt(val) * 3}
                      >
                        <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent>
                          <div className="font-semibold text-center leading-tight">
                            {sector.sector}<br/>
                            <span className="text-lg">{val}</span>
                          </div>
                        </Tooltip>
                      </CircleMarker>
                    );
                  })
                ) : (
                  <CircleMarker
                    center={mapCenter}
                    pathOptions={{
                      color: '#8a988f', // slate-2
                      fillColor: '#8a988f',
                      fillOpacity: 0.4,
                      weight: 2
                    }}
                    radius={15}
                  >
                    <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent>
                      <div className="font-semibold text-center leading-tight text-slate">
                        Santo Domingo<br/>
                        <span className="text-sm">Sin ubicaciones registradas</span>
                      </div>
                    </Tooltip>
                  </CircleMarker>
                )}
              </MapContainer>
            )}

            <div className="absolute bottom-4 left-4 z-[400] bg-white/90 backdrop-blur rounded-lg shadow-sm border border-line p-3 text-sm">
              <p className="font-bold text-xs text-slate mb-2">INTENSIDAD</p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-rose-600"></span> Alta demanda</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-gold-500"></span> Demanda media</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500"></span> Demanda baja</div>
              </div>
            </div>
          </div>
        </div>

        {/* Panel lateral */}
        <div className="flex w-full flex-col gap-4 lg:w-80">
          <div className="card p-5">
            <h3 className="font-bold text-slate mb-1">Total comuna</h3>
            <div className="text-4xl font-display font-extrabold text-green-700">{totalComuna}</div>
            <p className="text-sm mt-1 text-ink-2">
              <span className="font-semibold text-rose-600">{pendientesComuna}</span> solicitudes pendientes
            </p>
            {data.find(s => s.sector === 'Sin Ubicación')?.total ? (
              <p className="text-xs text-slate mt-3 p-2 bg-slate/10 rounded-md">
                Incluye {data.find(s => s.sector === 'Sin Ubicación')?.total} solicitud(es) sin ubicación válida.
              </p>
            ) : null}
          </div>

          <div className="card p-5 flex-1">
            <h3 className="font-bold text-slate mb-4">Ranking de sectores</h3>
            <div className="flex flex-col gap-3">
              {ranking.map((s, idx) => {
                const val = metrica === 'volumen' ? s.total : s.pendientes;
                return (
                  <div key={s.sector} className="flex items-center justify-between border-b border-line pb-2 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <span className="text-slate font-bold text-xs w-4 text-right">{idx + 1}.</span>
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getColor(s.intensidad) }}></span>
                      <div>
                        <p className="text-sm font-semibold">{s.sector}</p>
                        <p className="text-xs text-slate">{s.pendientes} pendientes</p>
                      </div>
                    </div>
                    <div className="font-bold text-ink">{val}</div>
                  </div>
                );
              })}
              {ranking.length === 0 && !loading && (
                <p className="text-sm text-slate text-center mt-4">Sin datos de sectores</p>
              )}
            </div>
          </div>

          <button onClick={() => navigate('/')} className="btn-primary w-full">
            Gestionar solicitudes
          </button>
        </div>
      </div>
    </div>
  );
}
