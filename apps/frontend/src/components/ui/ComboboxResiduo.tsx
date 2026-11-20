import { useEffect, useRef, useState } from 'react';
import { formatearPrecio, iconoPorCategoria, type ResiduoCatalogo } from '../../api/arca';

export interface ComboboxResiduoProps {
  catalogo: ResiduoCatalogo[];
  residuoSeleccionado: ResiduoCatalogo | null;
  nombreOtro: string;
  onSeleccionar: (item: ResiduoCatalogo | null, nombrePersonalizado: string) => void;
  disabled?: boolean;
}

export default function ComboboxResiduo({
  catalogo,
  residuoSeleccionado,
  nombreOtro,
  onSeleccionar,
  disabled = false,
}: ComboboxResiduoProps) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState(() => {
    if (residuoSeleccionado) return residuoSeleccionado.nombre;
    if (nombreOtro) return nombreOtro;
    return '';
  });
  const [indiceFoco, setIndiceFoco] = useState(-1);
  const [prevSeleccionado, setPrevSeleccionado] = useState(residuoSeleccionado);
  const [prevOtro, setPrevOtro] = useState(nombreOtro);

  // Sincronizar si cambia desde afuera (ej. importación de datos o reset)
  if (residuoSeleccionado !== prevSeleccionado || nombreOtro !== prevOtro) {
    setPrevSeleccionado(residuoSeleccionado);
    setPrevOtro(nombreOtro);
    setBusqueda(residuoSeleccionado ? residuoSeleccionado.nombre : (nombreOtro || ''));
  }

  const contenedorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cerrar al hacer clic afuera
  useEffect(() => {
    const clickAfuera = (e: MouseEvent) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    };
    document.addEventListener('mousedown', clickAfuera);
    return () => document.removeEventListener('mousedown', clickAfuera);
  }, []);

  const normalizar = (s: string) =>
    s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

  const textoLimpio = normalizar(busqueda);

  // Filtrar catálogo por nombre o categoría normalizada
  const coincidencias = catalogo.filter((item) => {
    if (!textoLimpio) return true;
    const n = normalizar(item.nombre);
    const c = normalizar(item.categoria);
    return n.includes(textoLimpio) || c.includes(textoLimpio);
  });

  // Opciones visibles en el menú: máximo 15
  const coincidenciasVisibles = coincidencias.slice(0, 15);

  // Coincidencia exacta de catálogo (normalizada)
  const coincidenciaExacta = catalogo.find(
    (item) => normalizar(item.nombre) === textoLimpio,
  );

  const elegirCatalogo = (item: ResiduoCatalogo) => {
    setBusqueda(item.nombre);
    onSeleccionar(item, '');
    setAbierto(false);
    setIndiceFoco(-1);
  };

  const elegirPersonalizado = (texto: string) => {
    const t = texto.trim();
    if (!t) return;
    setBusqueda(t);
    onSeleccionar(null, t);
    setAbierto(false);
    setIndiceFoco(-1);
  };

  const limpiar = () => {
    setBusqueda('');
    onSeleccionar(null, '');
    setAbierto(false);
    setIndiceFoco(-1);
    inputRef.current?.focus();
  };

  const tieneOpcionPersonalizada = Boolean(textoLimpio && !coincidenciaExacta);
  const totalOpciones =
    coincidenciasVisibles.length + (tieneOpcionPersonalizada ? 1 : 0);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!abierto) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setAbierto(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndiceFoco((prev) => (prev + 1 < totalOpciones ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndiceFoco((prev) => (prev - 1 >= 0 ? prev - 1 : totalOpciones - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (indiceFoco >= 0 && indiceFoco < coincidenciasVisibles.length) {
        elegirCatalogo(coincidenciasVisibles[indiceFoco]);
      } else if (
        tieneOpcionPersonalizada &&
        (indiceFoco === coincidenciasVisibles.length || indiceFoco === -1)
      ) {
        elegirPersonalizado(busqueda);
      } else if (coincidenciaExacta && indiceFoco === -1) {
        elegirCatalogo(coincidenciaExacta);
      }
    } else if (e.key === 'Escape') {
      setAbierto(false);
      setIndiceFoco(-1);
    }
  };

  return (
    <div ref={contenedorRef} className="relative space-y-2.5">
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={abierto}
          aria-autocomplete="list"
          aria-controls="combobox-residuos-opciones"
          aria-activedescendant={
            indiceFoco >= 0 ? `combobox-opcion-${indiceFoco}` : undefined
          }
          disabled={disabled}
          value={busqueda}
          placeholder="Escribe o busca el tipo de residuo (ej: Colchón, Sillón, Lavadora…)"
          autoComplete="off"
          className="field pr-10 w-full"
          onChange={(e) => {
            const val = e.target.value;
            setBusqueda(val);
            setAbierto(true);
            setIndiceFoco(-1);
            if (!val.trim()) {
              onSeleccionar(null, '');
            }
          }}
          onFocus={() => setAbierto(true)}
          onKeyDown={handleKeyDown}
        />

        {busqueda ? (
          <button
            type="button"
            onClick={limpiar}
            disabled={disabled}
            className="absolute right-3 text-slate hover:text-ink text-sm font-bold"
            title="Borrar texto"
          >
            ✕
          </button>
        ) : (
          <span className="absolute right-3 text-slate text-sm pointer-events-none">
            🔍
          </span>
        )}
      </div>

      {/* Menú desplegable predictivo */}
      {abierto && !disabled && (
        <div
          id="combobox-residuos-opciones"
          role="listbox"
          aria-label="Sugerencias del catálogo municipal"
          className="absolute z-30 left-0 right-0 mt-1 max-h-64 overflow-y-auto rounded-xl border border-line bg-white shadow-lg py-1.5 text-sm"
        >
          {coincidenciasVisibles.length > 0 ? (
            <div>
              <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate bg-slate-50">
                Sugerencias del catálogo municipal
              </div>
              {coincidenciasVisibles.map((item, idx) => {
                const activo = idx === indiceFoco;
                return (
                  <button
                    key={item.id}
                    id={`combobox-opcion-${idx}`}
                    role="option"
                    aria-selected={activo}
                    type="button"
                    onClick={() => elegirCatalogo(item)}
                    className={`flex w-full items-center justify-between px-3.5 py-2.5 text-left transition-colors ${
                      activo ? 'bg-forest-50 text-forest-900 font-semibold' : 'hover:bg-slate-50 text-ink'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span className="text-base">{iconoPorCategoria(item.categoria)}</span>
                      <span className="truncate">{item.nombre}</span>
                      <span className="text-xs text-slate font-normal">
                        ({item.categoria})
                      </span>
                    </span>
                    <span className="pill bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold shrink-0 ml-2">
                      {formatearPrecio(item.precio)}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}

          {/* Opción de usar texto libre si no coincide exactamente */}
          {tieneOpcionPersonalizada && (
            <div className="border-t border-line/60 pt-1">
              <button
                id={`combobox-opcion-${coincidenciasVisibles.length}`}
                role="option"
                aria-selected={indiceFoco === coincidenciasVisibles.length}
                type="button"
                onClick={() => elegirPersonalizado(busqueda)}
                className={`flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left text-xs transition-colors ${
                  indiceFoco === coincidenciasVisibles.length
                    ? 'bg-amber-100 text-amber-950 font-semibold'
                    : 'bg-amber-50/70 hover:bg-amber-100/80 text-amber-900'
                }`}
              >
                <span className="text-base leading-none">➕</span>
                <div>
                  <p className="font-bold">
                    Ingresar «{busqueda.trim()}» como residuo personalizado
                  </p>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    (Fuera de catálogo estándar · el valor final será fijado por el municipio tras revisar la foto)
                  </p>
                </div>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Feedback informativo según selección */}
      {residuoSeleccionado ? (
        <div className="flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50/70 p-3.5 text-emerald-950 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">
              {iconoPorCategoria(residuoSeleccionado.categoria)}
            </span>
            <div>
              <p className="text-sm font-bold">{residuoSeleccionado.nombre}</p>
              <p className="text-xs text-emerald-800">
                Categoría: {residuoSeleccionado.categoria}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-semibold text-emerald-800 block">
              Tarifa referencial
            </span>
            <span className="text-base font-extrabold text-emerald-900">
              {formatearPrecio(residuoSeleccionado.precio)}
            </span>
          </div>
        </div>
      ) : nombreOtro ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-3.5 text-amber-950 shadow-2xs space-y-1">
          <div className="flex items-center gap-2 font-bold text-xs text-amber-900">
            <span className="text-sm">⚠️</span>
            <span>Residuo no catalogado: «{nombreOtro}»</span>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            Este ítem no figura en el catálogo estándar. Quedará <strong>a la espera del presupuesto fijado por el equipo municipal</strong> tras la inspección de la foto.
          </p>
        </div>
      ) : null}
    </div>
  );
}
