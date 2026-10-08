import { useNavigate } from 'react-router-dom';
import { BarraAccesibilidad } from '../accesibilidad/BarraAccesibilidad';
import { IconLeaf } from '../components/ui';

// Pública: se llega desde el login, antes de iniciar sesión.
const EQUIPO: { nombre: string; rol: string; aporte: string }[] = [
  {
    nombre: 'Benjamín Paicil',
    rol: 'Scrum Master y líder técnico',
    aporte: 'Coordinación, seguridad, ClaveÚnica y panel municipal',
  },
  {
    nombre: 'Miguel Segovia',
    rol: 'Product Owner',
    aporte: 'Requisitos, prioridades, protección de datos y relación con el municipio',
  },
  {
    nombre: 'Maximiliano López',
    rol: 'Desarrollo front-end',
    aporte: 'Interfaz de la app, Marketplace y mapas',
  },
  {
    nombre: 'Javier Figueroa',
    rol: 'Desarrollo back-end',
    aporte: 'API, base de datos y Circular Credits',
  },
  {
    nombre: 'Ana Araya',
    rol: 'UX/UI y QA',
    aporte: 'Experiencia de usuario, pruebas y accesibilidad',
  },
];

export default function AcercaDe() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-canvas">
      <header className="brand-gradient px-4 py-3 text-white sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-pill px-3 py-1 text-sm hover:bg-white/15"
          >
            ← Volver
          </button>
          <BarraAccesibilidad />
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
        <section className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-green-700 text-white">
            <IconLeaf className="h-8 w-8" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold text-ink">Acerca de A.R.C.A.</h1>
            <p className="text-sm text-ink-2">
              Gestión de residuos voluminosos de la Municipalidad de Santo Domingo
            </p>
          </div>
        </section>

        <section className="card space-y-2 p-5 text-sm leading-relaxed text-ink-2">
          <p>
            A.R.C.A. permite a los vecinos de Santo Domingo pedir el retiro de sus
            residuos voluminosos, darles una segunda vida regalándolos o
            intercambiándolos en el Marketplace, y sumar Circular Credits que se
            canjean por beneficios en la comuna.
          </p>
          <p>
            El ingreso es con ClaveÚnica y la Municipalidad revisa cada solicitud
            antes de derivarla a retiro.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-ink">Equipo COM Tech</h2>
          <p className="text-sm text-ink-2">
            Desarrollado para la Feria de Software 2026, junto al Departamento de
            Informática de la Municipalidad de Santo Domingo.
          </p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {EQUIPO.map((persona) => (
              <li key={persona.nombre} className="card p-4">
                <p className="font-bold text-ink">{persona.nombre}</p>
                <p className="text-sm font-medium text-green-700">{persona.rol}</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-2">
                  {persona.aporte}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
