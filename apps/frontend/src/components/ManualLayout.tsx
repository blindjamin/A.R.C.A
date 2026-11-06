import { useLocation, useNavigate } from 'react-router-dom';
import { BarraAccesibilidad } from '../accesibilidad/BarraAccesibilidad';

// HU-39: estructura común de los manuales de uso (vecinos y funcionarios).
// Cada manual es solo datos: secciones con pasos numerados y figuras.

export interface Figura {
  src: string;
  alt: string;
  caption: string;
}

export interface Bloque {
  titulo?: string;
  pasos: string[];
  figuras?: Figura[];
}

export interface SeccionManual {
  id: string;
  titulo: string;
  bloques: Bloque[];
}

interface Props {
  titulo: string;
  intro: string;
  secciones: SeccionManual[];
  /** Las capturas de celular se muestran angostas; las de escritorio, a ancho completo. */
  movil: boolean;
  /** Texto de la tarjeta final, opcional. */
  nota?: string;
}

export default function ManualLayout({ titulo, intro, secciones, movil, nota }: Props) {
  const navigate = useNavigate();
  // Si se entró directo no hay historial en la app: `-1` sacaría de ella.
  const { key } = useLocation();
  const volver = () => (key === 'default' ? navigate('/ayuda') : navigate(-1));

  return (
    <div className="min-h-screen bg-canvas">
      <header className="brand-gradient px-4 py-3 text-white print:hidden sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <button
            type="button"
            onClick={volver}
            className="flex min-h-[44px] items-center rounded-pill px-3 py-1 text-sm hover:bg-white/15"
          >
            ← Volver
          </button>
          <BarraAccesibilidad />
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-4 py-6 sm:px-6">
        <section>
          <h1 className="text-2xl font-extrabold text-ink">{titulo}</h1>
          <p className="text-sm text-ink-2">{intro}</p>
          <button
            type="button"
            onClick={() => window.print()}
            className="btn-primary mt-3 inline-flex min-h-[44px] items-center px-5 py-2 print:hidden"
          >
            Imprimir o guardar como PDF
          </button>
          <nav aria-label="Índice del manual" className="mt-4 print:hidden">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate">Contenido</h2>
            <ol className="mt-2 flex flex-wrap gap-2 text-sm">
              {secciones.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="pill inline-flex min-h-[44px] items-center bg-green-50 font-semibold text-green-800"
                  >
                    {s.titulo}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </section>

        {secciones.map((s) => (
          <section key={s.id} id={s.id} className="scroll-mt-4 space-y-4">
            <h2 className="text-lg font-bold text-ink">{s.titulo}</h2>
            {s.bloques.map((b, bi) => (
              <div key={b.titulo ?? bi} className="card space-y-3 p-5">
                {b.titulo && <h3 className="font-bold text-ink">{b.titulo}</h3>}
                <ol className="space-y-2">
                  {b.pasos.map((paso, i) => (
                    <li key={paso} className="flex gap-3 text-sm text-ink-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-700 text-xs font-bold text-white">
                        {i + 1}
                      </span>
                      <span className="pt-0.5">{paso}</span>
                    </li>
                  ))}
                </ol>
                {b.figuras?.map((f) => (
                  <figure key={f.src} className="break-inside-avoid">
                    <img
                      src={f.src}
                      alt={f.alt}
                      loading="lazy"
                      className={
                        movil
                          ? 'mx-auto w-full max-w-[320px] rounded-lg border border-line'
                          : 'w-full rounded-lg border border-line'
                      }
                    />
                    <figcaption className="mt-1 text-center text-xs text-slate">{f.caption}</figcaption>
                  </figure>
                ))}
              </div>
            ))}
          </section>
        ))}

        {nota && (
          <section className="card border-green-200 bg-green-50 p-5">
            <p className="text-sm text-ink-2">{nota}</p>
          </section>
        )}
      </main>
    </div>
  );
}
