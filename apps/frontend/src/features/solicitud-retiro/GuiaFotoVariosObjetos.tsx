import { IconCamera, IconCheck } from '../../components/ui';

export function GuiaFotoVariosObjetos() {
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 text-xs text-blue-950 space-y-3">
      <div className="flex items-center gap-2 font-bold text-blue-900 text-sm">
        <IconCamera className="h-4 w-4 text-blue-700" />
        <span>Foto de referencia para varios objetos</span>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        {/* Ilustración de encuadre referencial */}
        <div className="relative flex h-28 w-44 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-blue-400 bg-white shadow-inner">
          {/* Esquinas del visor */}
          <div className="absolute top-1.5 left-1.5 h-3 w-3 border-t-2 border-l-2 border-blue-600 rounded-tl-sm" />
          <div className="absolute top-1.5 right-1.5 h-3 w-3 border-t-2 border-r-2 border-blue-600 rounded-tr-sm" />
          <div className="absolute bottom-1.5 left-1.5 h-3 w-3 border-b-2 border-l-2 border-blue-600 rounded-bl-sm" />
          <div className="absolute bottom-1.5 right-1.5 h-3 w-3 border-b-2 border-r-2 border-blue-600 rounded-br-sm" />

          {/* Gráfico representativo de objetos agrupados */}
          <div className="flex items-end gap-1.5 text-slate-400">
            <div className="flex flex-col items-center">
              <span className="text-2xl" role="img" aria-label="Mueble">🛋️</span>
              <span className="text-[9px] font-semibold text-slate-500">Mueble</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xl" role="img" aria-label="Caja">📦</span>
              <span className="text-[9px] font-semibold text-slate-500">Caja</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-lg" role="img" aria-label="Silla">🪑</span>
              <span className="text-[9px] font-semibold text-slate-500">Silla</span>
            </div>
          </div>

          <div
            className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-green-700 text-white shadow"
            title="Encuadre correcto"
          >
            <IconCheck className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* Pautas clave */}
        <div className="space-y-1.5 text-xs text-blue-900">
          <p className="font-semibold text-blue-950">
            Cómo capturar todos tus objetos en una sola foto:
          </p>
          <ul className="list-disc pl-4 space-y-1 leading-relaxed text-blue-800">
            <li>
              <strong>Agrúpalos juntos</strong> en un espacio despejado y con buena luz.
            </li>
            <li>
              <strong>Aléjate unos pasos</strong> para que todos los objetos quepan completos dentro de la foto.
            </li>
            <li>
              El funcionario municipal necesita verificar el volumen total antes de aprobar.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

