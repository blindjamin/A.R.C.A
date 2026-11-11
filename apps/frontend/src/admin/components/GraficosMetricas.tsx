import { useId, useMemo, useState, type MouseEvent } from 'react';

// Gráficos del panel de Métricas hechos en SVG: no se agrega una librería
// de gráficos para cinco figuras. Colores de la marca (tailwind.config.js),
// validados para daltonismo; siempre van con etiqueta y número al lado.

export const VERDE = '#0F6B45';
export const VERDE_OSCURO = '#0A3D29';
export const DORADO = '#ef9d24';
export const AZUL = '#1f7fb8';
export const VERDE_CLARO = '#1bb46f';
export const ROJO = '#c4452f';
export const GRIS = '#cfd8d2';
export const PISTA = '#eef2ef';

const porcentaje = (parte: number, total: number): number =>
  total > 0 ? Math.round((parte / total) * 100) : 0;

const formatoDia = (fecha: string): string => {
  const [, mes, dia] = fecha.split('-');
  return `${dia}/${mes}`;
};

interface Punto {
  x: number;
  y: number;
}

/** Curva suave que pasa por cada punto sin salirse del rango vertical. */
function curva(puntos: Punto[], minY: number, maxY: number): string {
  if (puntos.length === 0) return '';
  if (puntos.length === 1) return `M${puntos[0].x},${puntos[0].y}`;
  const limitar = (y: number) => Math.min(maxY, Math.max(minY, y));
  let d = `M${puntos[0].x},${puntos[0].y}`;
  for (let i = 0; i < puntos.length - 1; i++) {
    const p0 = puntos[i - 1] ?? puntos[i];
    const p1 = puntos[i];
    const p2 = puntos[i + 1];
    const p3 = puntos[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: limitar(p1.y + (p2.y - p0.y) / 6) };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: limitar(p2.y - (p3.y - p1.y) / 6) };
    d += ` C${c1.x},${c1.y} ${c2.x},${c2.y} ${p2.x},${p2.y}`;
  }
  return d;
}

/** Tope del eje en 4 pasos enteros: 12 → 0, 3, 6, 9, 12. */
function pasoEje(maximo: number): number {
  const paso = Math.max(1, Math.ceil(maximo / 4));
  return paso <= 5 ? paso : Math.ceil(paso / 5) * 5;
}

// --- Minigráfico de tendencia (tarjetas) -------------------------------------

export function Sparkline({ valores }: { valores: number[] }) {
  const id = useId();
  if (valores.length < 2) return null;
  const max = Math.max(1, ...valores);
  const puntos = valores.map((v, i) => ({
    x: (i / (valores.length - 1)) * 100,
    y: 30 - (v / max) * 26,
  }));
  const linea = curva(puntos, 2, 30);

  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true" className="h-9 w-full">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={VERDE} stopOpacity="0.25" />
          <stop offset="100%" stopColor={VERDE} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${linea} L100,32 L0,32 Z`} fill={`url(#${id})`} />
      <path
        d={linea}
        fill="none"
        stroke={VERDE}
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
      />
    </svg>
  );
}

// --- Área diaria con cursor de seguimiento -----------------------------------

const ALTO = 200;
const ANCHO = 1000;

export function AreaDiaria({ serie }: { serie: { fecha: string; total: number }[] }) {
  const id = useId();
  const [activo, setActivo] = useState<number | null>(null);

  const { paso, tope, puntos, linea, promedio, idxMax } = useMemo(() => {
    const maximo = Math.max(0, ...serie.map((p) => p.total));
    const paso = pasoEje(maximo);
    const tope = paso * 4;
    const n = Math.max(1, serie.length - 1);
    const puntos = serie.map((p, i) => ({
      x: (i / n) * ANCHO,
      y: ALTO - (p.total / tope) * ALTO,
    }));
    const promedio =
      serie.length > 0 ? serie.reduce((a, p) => a + p.total, 0) / serie.length : 0;
    const idxMax = serie.findIndex((p) => p.total === maximo);
    return { paso, tope, puntos, linea: curva(puntos, 0, ALTO), promedio, idxMax };
  }, [serie]);

  if (serie.length === 0) {
    return <p className="text-sm text-slate">Sin datos en el rango.</p>;
  }

  const seguir = (e: MouseEvent<HTMLDivElement>) => {
    const caja = e.currentTarget.getBoundingClientRect();
    const fraccion = (e.clientX - caja.left) / caja.width;
    setActivo(Math.round(Math.min(1, Math.max(0, fraccion)) * (serie.length - 1)));
  };

  const marcas = [4, 3, 2, 1, 0].map((k) => k * paso);
  const izquierda = (i: number) => `${(puntos[i].x / ANCHO) * 100}%`;
  const arriba = (i: number) => `${(puntos[i].y / ALTO) * 100}%`;
  const punto = activo === null ? null : serie[activo];
  const maximo = serie[idxMax];

  return (
    <div className="flex gap-3">
      <div className="relative h-52 w-6 shrink-0 text-right text-[11px] tabular-nums text-slate-2">
        {marcas.map((m) => (
          <span
            key={m}
            className="absolute right-0 -translate-y-1/2"
            style={{ top: `${100 - (m / tope) * 100}%` }}
          >
            {m}
          </span>
        ))}
      </div>

      <div className="min-w-0 flex-1">
        <div
          role="img"
          aria-label={`Solicitudes por día. Máximo ${maximo?.total ?? 0} el ${formatoDia(
            maximo?.fecha ?? '',
          )}; promedio ${promedio.toFixed(1)} por día.`}
          className="relative h-52 cursor-crosshair"
          onMouseMove={seguir}
          onMouseLeave={() => setActivo(null)}
        >
          {marcas.map((m) => (
            <div
              key={m}
              className={`absolute inset-x-0 border-t ${m === 0 ? 'border-line' : 'border-dashed border-line-2'}`}
              style={{ top: `${100 - (m / tope) * 100}%` }}
            />
          ))}

          <svg
            viewBox={`0 0 ${ANCHO} ${ALTO}`}
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full overflow-visible"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={VERDE} stopOpacity="0.28" />
                <stop offset="100%" stopColor={VERDE} stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <path d={`${linea} L${ANCHO},${ALTO} L0,${ALTO} Z`} fill={`url(#${id})`} />
            {promedio > 0 && (
              <line
                x1="0"
                x2={ANCHO}
                y1={ALTO - (promedio / tope) * ALTO}
                y2={ALTO - (promedio / tope) * ALTO}
                stroke="#59665d"
                strokeWidth="1"
                strokeDasharray="4 4"
                vectorEffect="non-scaling-stroke"
              />
            )}
            <path
              d={linea}
              fill="none"
              stroke={VERDE}
              strokeWidth="2.5"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {promedio > 0 && (
            <span
              className="pointer-events-none absolute right-0 -translate-y-full rounded-sm bg-card/90 px-1 text-[11px] text-slate-2"
              style={{ top: `${100 - (promedio / tope) * 100}%` }}
            >
              promedio {promedio.toLocaleString('es-CL', { maximumFractionDigits: 1 })}
            </span>
          )}

          {/* Marca del día con más solicitudes, rotulada sin pasar el cursor. */}
          {activo === null && maximo && maximo.total > 0 && (
            <>
              <span
                className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-green-700 ring-2 ring-green-700/20"
                style={{ left: izquierda(idxMax), top: arriba(idxMax) }}
              />
              <span
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-[calc(100%+10px)] whitespace-nowrap text-[11px] font-semibold text-ink"
                style={{ left: izquierda(idxMax), top: arriba(idxMax) }}
              >
                máx. {maximo.total} · {formatoDia(maximo.fecha)}
              </span>
            </>
          )}

          {punto && activo !== null && (
            <>
              <div
                className="pointer-events-none absolute inset-y-0 border-l border-green-700/40"
                style={{ left: izquierda(activo) }}
              />
              <span
                className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-green-700 shadow"
                style={{ left: izquierda(activo), top: arriba(activo) }}
              />
              <div
                className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+12px)] whitespace-nowrap rounded-md bg-ink px-2.5 py-1.5 text-xs text-white shadow-lg"
                style={{
                  left: `${Math.min(90, Math.max(10, (puntos[activo].x / ANCHO) * 100))}%`,
                  // Sobre el punto, pero sin salirse por arriba del gráfico.
                  top: `max(3.25rem, ${arriba(activo)})`,
                }}
              >
                <p className="text-[11px] text-white/70">{formatoDia(punto.fecha)}</p>
                <p className="font-semibold">
                  {punto.total} {punto.total === 1 ? 'solicitud' : 'solicitudes'}
                </p>
              </div>
            </>
          )}
        </div>

        <div className="mt-2 flex justify-between text-[11px] text-slate-2">
          <span>{formatoDia(serie[0].fecha)}</span>
          {serie.length > 2 && (
            <span>{formatoDia(serie[Math.floor(serie.length / 2)].fecha)}</span>
          )}
          <span>{formatoDia(serie[serie.length - 1].fecha)}</span>
        </div>
      </div>
    </div>
  );
}

// --- Dona ---------------------------------------------------------------------

export interface Porcion {
  clave: string;
  label: string;
  total: number;
  color: string;
}

const RADIO = 42;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;
const SEPARACION = 1.5; // espacio entre porciones, en unidades del trazo

export function Dona({
  porciones,
  centro,
  subtitulo,
}: {
  porciones: Porcion[];
  centro: string;
  subtitulo: string;
}) {
  const [activa, setActiva] = useState<string | null>(null);
  const total = porciones.reduce((a, p) => a + p.total, 0);
  const visibles = porciones.filter((p) => p.total > 0);
  const resaltada = visibles.find((p) => p.clave === activa);

  const largos = visibles.map((p) => (p.total / total) * CIRCUNFERENCIA);
  const arcos = visibles.map((p, i) => ({
    ...p,
    largo: Math.max(0, largos[i] - (visibles.length > 1 ? SEPARACION : 0)),
    desfase: -largos.slice(0, i).reduce((a, l) => a + l, 0),
  }));

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row lg:flex-col 2xl:flex-row">
      <div className="relative h-36 w-36 shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
          <circle cx="50" cy="50" r={RADIO} fill="none" stroke={PISTA} strokeWidth="12" />
          {arcos.map((a) => (
            <circle
              key={a.clave}
              cx="50"
              cy="50"
              r={RADIO}
              fill="none"
              stroke={a.color}
              strokeWidth={activa === a.clave ? 15 : 12}
              strokeDasharray={`${a.largo} ${CIRCUNFERENCIA}`}
              strokeDashoffset={a.desfase}
              opacity={activa && activa !== a.clave ? 0.35 : 1}
              className="transition-all duration-200"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-display text-2xl font-extrabold tabular-nums text-ink">
            {resaltada ? `${porcentaje(resaltada.total, total)}%` : centro}
          </span>
          <span className="max-w-[5.5rem] text-[11px] leading-tight text-slate">
            {resaltada ? resaltada.label : subtitulo}
          </span>
        </div>
      </div>

      <ul className="w-full flex-1 space-y-1 text-sm">
        {porciones.map((p) => (
          <li
            key={p.clave}
            onMouseEnter={() => setActiva(p.clave)}
            onMouseLeave={() => setActiva(null)}
            className={`flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors ${
              activa === p.clave ? 'bg-canvas' : ''
            }`}
          >
            <span
              aria-hidden="true"
              className="h-3 w-3 shrink-0 rounded-[4px]"
              style={{ background: p.color }}
            />
            <span className="flex-1 text-ink">{p.label}</span>
            <span className="font-semibold tabular-nums text-ink">{p.total}</span>
            <span className="w-9 text-right text-xs tabular-nums text-slate-2">
              {porcentaje(p.total, total)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// --- Gráfico de cuadritos (10 × 10) -------------------------------------------

/** Reparte 100 cuadritos por el método del mayor resto: siempre suman 100. */
function repartirCien(totales: number[]): number[] {
  const suma = totales.reduce((a, t) => a + t, 0);
  if (suma === 0) return totales.map(() => 0);
  const exactos = totales.map((t) => (t / suma) * 100);
  const base = exactos.map(Math.floor);
  let faltan = 100 - base.reduce((a, b) => a + b, 0);
  const orden = exactos
    .map((e, i) => ({ i, resto: e - Math.floor(e) }))
    .sort((a, b) => b.resto - a.resto);
  for (const { i } of orden) {
    if (faltan-- <= 0) break;
    base[i] += 1;
  }
  return base;
}

export function Cuadritos({ grupos }: { grupos: Porcion[] }) {
  const [activa, setActiva] = useState<string | null>(null);
  const total = grupos.reduce((a, g) => a + g.total, 0);
  const celdas = repartirCien(grupos.map((g) => g.total)).flatMap((n, i) =>
    Array.from({ length: n }, () => grupos[i]),
  );

  if (total === 0) {
    return <p className="text-sm text-slate">Sin solicitudes en el rango.</p>;
  }

  return (
    <div className="flex flex-col gap-5 sm:flex-row lg:flex-col 2xl:flex-row">
      <div
        role="img"
        aria-label={grupos
          .map((g) => `${g.label}: ${porcentaje(g.total, total)}%`)
          .join(', ')}
        className="grid aspect-square w-full max-w-[9.5rem] shrink-0 grid-cols-10 gap-[3px] self-center"
      >
        {celdas.map((g, i) => (
          <span
            key={i}
            className="rounded-[3px] transition-opacity duration-200"
            style={{
              background: g.color,
              opacity: activa && activa !== g.clave ? 0.2 : 1,
            }}
          />
        ))}
      </div>

      <ul className="w-full flex-1 space-y-1 text-sm">
        {grupos.map((g) => (
          <li
            key={g.clave}
            onMouseEnter={() => setActiva(g.clave)}
            onMouseLeave={() => setActiva(null)}
            className={`flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors ${
              activa === g.clave ? 'bg-canvas' : ''
            }`}
          >
            <span
              aria-hidden="true"
              className="h-3 w-3 shrink-0 rounded-[3px]"
              style={{ background: g.color }}
            />
            <span className="flex-1 truncate text-ink">{g.label}</span>
            <span className="font-semibold tabular-nums text-ink">{g.total}</span>
            <span className="w-9 text-right text-xs tabular-nums text-slate-2">
              {porcentaje(g.total, total)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// --- Anillo de progreso -------------------------------------------------------

export function Anillo({
  valor,
  total,
  etiqueta,
}: {
  valor: number;
  total: number;
  etiqueta: string;
}) {
  const fraccion = total > 0 ? valor / total : 0;

  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r={RADIO} fill="none" stroke={PISTA} strokeWidth="10" />
        <circle
          cx="50"
          cy="50"
          r={RADIO}
          fill="none"
          stroke={VERDE}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${fraccion * CIRCUNFERENCIA} ${CIRCUNFERENCIA}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-xl font-extrabold tabular-nums text-ink">
          {porcentaje(valor, total)}%
        </span>
        <span className="text-[11px] text-slate">{etiqueta}</span>
      </div>
    </div>
  );
}
