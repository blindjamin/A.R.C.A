import { useNavigate } from 'react-router-dom';

interface Props {
  titulo: string;
  descripcion: string;
  icono: string;
  epica: string;
}

// Placeholder estético para módulos sin flujo de backend todavía.
export default function Proximamente({ titulo, descripcion, icono, epica }: Props) {
  const navigate = useNavigate();
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-extrabold">{titulo}</h1>
      </header>

      <div className="card flex flex-col items-center gap-4 p-8 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-50 text-4xl">
          {icono}
        </div>
        <span className="pill bg-line-2 text-slate">Próximamente · {epica}</span>
        <p className="max-w-xs text-sm text-slate">{descripcion}</p>
      </div>

      <button onClick={() => navigate('/inicio')} className="btn-outline w-full">
        Volver al inicio
      </button>
    </div>
  );
}
