import { useState, useId } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../auth/SessionContext';
import {
  IconCircularCredits,
  IconGift,
  IconTag,
  IconCoffee,
  IconLeaf,
  IconBuilding,
  IconCheck,
  IconX,
  IconUser,
  IconShield,
} from '../components/ui/Icons';

export type CategoriaPremio =
  | 'todos'
  | 'cafeteria'
  | 'municipal'
  | 'vivero'
  | 'cultura';

export interface PremioCanjeable {
  id: string;
  titulo: string;
  categoria: 'cafeteria' | 'municipal' | 'vivero' | 'cultura';
  entidad: string;
  costoCC: number;
  descripcion: string;
  terminos: string;
  descuento: string;
  nivelRequerido: number;
  stockDisponible: number;
}

export interface ValeCanjeado {
  id: string;
  premioId: string;
  titulo: string;
  entidad: string;
  costoCC: number;
  codigo: string;
  fechaCanje: string;
  fechaExpiracion: string;
}

const PREMIOS_MUNICIPALES: PremioCanjeable[] = [
  {
    id: 'p1',
    titulo: '15% de Descuento en Cafetería del Parque',
    categoria: 'cafeteria',
    entidad: 'Cafetería del Parque Santo Domingo',
    costoCC: 40,
    descuento: '15% OFF',
    descripcion:
      'Válido en todo consumo presencial de cafetería de especialidad, bebidas calientes y repostería artesanal.',
    terminos: 'Presentar código de cupón al pedir la cuenta. No acumulable con otras promociones.',
    nivelRequerido: 1,
    stockDisponible: 38,
  },
  {
    id: 'p2',
    titulo: '20% en Plantas Nativas en Vivero Municipal',
    categoria: 'vivero',
    entidad: 'Vivero Municipal Santo Domingo',
    costoCC: 50,
    descuento: '20% OFF',
    descripcion:
      'Descuento en árboles nativos (quillay, peumo, maitén) y plantas xerófitas de bajo consumo hídrico.',
    terminos: 'Válido en compras presenciales en el Vivero Municipal de Lunes a Viernes.',
    nivelRequerido: 1,
    stockDisponible: 25,
  },
  {
    id: 'p3',
    titulo: 'Kit Domiciliario de Reciclaje y Compostaje',
    categoria: 'municipal',
    entidad: 'Dirección de Medio Ambiente (DIMAO)',
    costoCC: 70,
    descuento: 'Gratuito 100%',
    descripcion:
      'Set de 3 contenedores apilables clasificados + bolsa reutilizable de lona oficial + manual de compostaje.',
    terminos: 'Retiro en la oficina de DIMAO presentando tu cédula de identidad y código de vale.',
    nivelRequerido: 2,
    stockDisponible: 14,
  },
  {
    id: 'p4',
    titulo: 'Entrada Doble al Centro Cultural Santo Domingo',
    categoria: 'cultura',
    entidad: 'Corporación Cultural Santo Domingo',
    costoCC: 60,
    descuento: '2x1 / Libre',
    descripcion:
      'Pase preferente para dos personas a funciones de teatro, cine comunal o conciertos de temporada.',
    terminos: 'Reserva previa sujeta a cartelera mensual del Centro Cultural.',
    nivelRequerido: 1,
    stockDisponible: 19,
  },
  {
    id: 'p5',
    titulo: 'Rebaja en Derechos de Aseo Domiciliario',
    categoria: 'municipal',
    entidad: 'Tesorería Municipal Santo Domingo',
    costoCC: 100,
    descuento: 'Descuento $5.000',
    descripcion:
      'Abono directo aplicable al pago de derechos de extracción de aseo municipal para la vivienda inscrita.',
    terminos: 'Se aplica al ROL habitacional declarado en el perfil del vecino.',
    nivelRequerido: 2,
    stockDisponible: 50,
  },
  {
    id: 'p6',
    titulo: 'Taller Práctico de Huerto Urbano y Lombrices',
    categoria: 'vivero',
    entidad: 'DIMAO · Programa Huertos Comunitarios',
    costoCC: 30,
    descuento: 'Acceso Total',
    descripcion:
      'Capacitación presencial de 3 horas en cultivo ecológico con entrega de sustrato y núcleo de lombrices.',
    terminos: 'Sábados de 10:00 a 13:00 en vivero municipal. Cupos confirmados.',
    nivelRequerido: 1,
    stockDisponible: 12,
  },
  {
    id: 'p7',
    titulo: '10% de Descuento en Panadería Las Rocas',
    categoria: 'cafeteria',
    entidad: 'Panadería Artesanal Las Rocas',
    costoCC: 35,
    descuento: '10% OFF',
    descripcion:
      'Válido en panes rústicos de masa madre y pastelería en local de Av. El Golf.',
    terminos: 'Válido todos los días presentando el cupón ARCA.',
    nivelRequerido: 1,
    stockDisponible: 45,
  },
  {
    id: 'p8',
    titulo: 'Bolsa Reutilizable Oficial + Pack Semillas',
    categoria: 'municipal',
    entidad: 'Municipalidad de Santo Domingo',
    costoCC: 20,
    descuento: 'Gratuito',
    descripcion:
      'Bolsa ecológica de tela reciclada de alta resistencia y sobre de semillas de flores melíferas para polinización.',
    terminos: 'Entrega en el mesón de atención ciudadana municipal.',
    nivelRequerido: 1,
    stockDisponible: 60,
  },
];

const CATEGORIAS_FILTRO: { key: CategoriaPremio; label: string }[] = [
  { key: 'todos', label: 'Todos los premios' },
  { key: 'cafeteria', label: 'Cafeterías y Comercio' },
  { key: 'municipal', label: 'Beneficios Municipales' },
  { key: 'vivero', label: 'Vivero y Huertos' },
  { key: 'cultura', label: 'Cultura y Eventos' },
];

export default function CircularCredits() {
  const { sesion } = useSession();
  const modalTitleId = useId();

  const storageSaldoKey = `arca_cc_saldo_${sesion?.ciudadanoId || 'default'}`;
  const storageValesKey = `arca_vales_canjeados_${sesion?.ciudadanoId || 'default'}`;

  // Saldo de créditos en tiempo real con persistencia
  const [saldo, setSaldo] = useState<number>(() => {
    try {
      const guardado = localStorage.getItem(storageSaldoKey);
      if (guardado !== null) {
        return Number(guardado);
      }
    } catch {
      // Ignorar fallback
    }
    return 120;
  });

  // Lista de vales canjeados
  const [vales, setVales] = useState<ValeCanjeado[]>(() => {
    try {
      const guardados = localStorage.getItem(storageValesKey);
      if (guardados) {
        return JSON.parse(guardados) as ValeCanjeado[];
      }
    } catch {
      // Ignorar fallback
    }
    return [];
  });

  // Pestaña activa (catálogo vs mis vales)
  const [vista, setVista] = useState<'catalogo' | 'vales'>('catalogo');
  const [categoriaSeleccionada, setCategoriaSeleccionada] =
    useState<CategoriaPremio>('todos');

  // Estado del modal de canje
  const [premioParaCanjear, setPremioParaCanjear] =
    useState<PremioCanjeable | null>(null);
  const [valeGenerado, setValeGenerado] = useState<ValeCanjeado | null>(null);

  // Filtrado de premios
  const premiosFiltrados = PREMIOS_MUNICIPALES.filter((p) => {
    if (categoriaSeleccionada === 'todos') return true;
    return p.categoria === categoriaSeleccionada;
  });

  const abrirCanje = (premio: PremioCanjeable) => {
    setPremioParaCanjear(premio);
    setValeGenerado(null);
  };

  const confirmarCanje = () => {
    if (!premioParaCanjear || saldo < premioParaCanjear.costoCC) return;

    const nuevoSaldo = saldo - premioParaCanjear.costoCC;
    const codigoAleatorio = `SD-CC-${Math.floor(100000 + Math.random() * 900000)}`;
    const fechaHoy = new Date().toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const fechaVencimiento = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const nuevoVale: ValeCanjeado = {
      id: `v-${Date.now()}`,
      premioId: premioParaCanjear.id,
      titulo: premioParaCanjear.titulo,
      entidad: premioParaCanjear.entidad,
      costoCC: premioParaCanjear.costoCC,
      codigo: codigoAleatorio,
      fechaCanje: fechaHoy,
      fechaExpiracion: fechaVencimiento,
    };

    const nuevosVales = [nuevoVale, ...vales];

    setSaldo(nuevoSaldo);
    setVales(nuevosVales);
    setValeGenerado(nuevoVale);

    try {
      localStorage.setItem(storageSaldoKey, String(nuevoSaldo));
      localStorage.setItem(storageValesKey, JSON.stringify(nuevosVales));
    } catch {
      // Ignorar fallback
    }
  };

  const cerrarModal = () => {
    setPremioParaCanjear(null);
    setValeGenerado(null);
  };

  const renderIconoCategoria = (cat: PremioCanjeable['categoria']) => {
    switch (cat) {
      case 'cafeteria':
        return <IconCoffee className="h-4 w-4" />;
      case 'vivero':
        return <IconLeaf className="h-4 w-4" />;
      case 'municipal':
        return <IconBuilding className="h-4 w-4" />;
      case 'cultura':
        return <IconGift className="h-4 w-4" />;
      default:
        return <IconTag className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Cabecera */}
      <div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-gold-50 text-gold-600 border border-gold-200">
                <IconCircularCredits className="h-5 w-5" />
              </span>
              <h1 className="text-2xl font-extrabold text-ink sm:text-3xl">
                Circular Credits
              </h1>
            </div>
            <p className="mt-1 text-sm text-slate">
              Canjea tus créditos por premios, descuentos en cafeterías y beneficios de Santo Domingo.
            </p>
          </div>

          <Link
            to="/perfil"
            className="btn-outline flex items-center gap-2 self-start py-1.5 px-3.5 text-xs font-semibold text-ink-2 hover:border-green-400 sm:self-auto"
          >
            <IconUser className="h-3.5 w-3.5 text-green-700" />
            <span>Ver mi perfil</span>
          </Link>
        </div>
      </div>

      {/* Tarjeta de Saldo y Nivel */}
      <section
        className="card relative overflow-hidden rounded-lg p-6 text-white shadow-green"
        style={{
          backgroundImage:
            'linear-gradient(140deg, #156f4a 0%, #0f6b45 55%, #0a4f37 100%)',
        }}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white">
                <IconCircularCredits className="h-4 w-4 text-gold-400" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-green-100">
                Saldo Disponible para Canjes
              </span>
            </div>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-display text-5xl font-extrabold tracking-tight">
                {saldo}
              </span>
              <span className="text-sm font-semibold uppercase text-gold-300">
                CC (Circular Credits)
              </span>
            </div>
            <p className="mt-1 text-xs text-green-100/90">
              Acumulados por reutilización y entrega de residuos voluminosos en Santo Domingo.
            </p>
          </div>

          <div className="rounded-lg bg-black/20 p-4 border border-white/10 sm:max-w-xs space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-green-100">Rango Actual:</span>
              <span className="font-bold text-gold-300">Nivel 2 · Vecino Activo</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-black/30">
              <div
                className="h-full rounded-full bg-gold-400 transition-all duration-500"
                style={{ width: `${Math.min(100, (saldo / 200) * 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-green-100/80">
              Desbloquea beneficios exclusivos de Nivel 3 al alcanzar los 200 CC.
            </p>
          </div>
        </div>
      </section>

      {/* Selector de Vista (Catálogo vs Vales Canjeados) */}
      <div className="flex items-center justify-between border-b border-line pb-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setVista('catalogo')}
            className={`rounded-md px-3.5 py-1.5 text-xs font-bold transition-colors ${
              vista === 'catalogo'
                ? 'bg-green-700 text-white shadow-sm'
                : 'bg-canvas text-slate hover:text-ink'
            }`}
          >
            Premios Canjeables ({PREMIOS_MUNICIPALES.length})
          </button>
          <button
            type="button"
            onClick={() => setVista('vales')}
            className={`rounded-md px-3.5 py-1.5 text-xs font-bold transition-colors ${
              vista === 'vales'
                ? 'bg-green-700 text-white shadow-sm'
                : 'bg-canvas text-slate hover:text-ink'
            }`}
          >
            Mis Vales Canjeados ({vales.length})
          </button>
        </div>

        <span className="text-xs text-slate-2 hidden sm:inline">
          Convenio Municipalidad de Santo Domingo
        </span>
      </div>

      {/* VISTA 1: CATÁLOGO DE PREMIOS */}
      {vista === 'catalogo' && (
        <div className="space-y-4">
          {/* Filtros de Categoría */}
          <div className="flex flex-wrap items-center gap-1.5">
            {CATEGORIAS_FILTRO.map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setCategoriaSeleccionada(cat.key)}
                className={`chip text-xs ${
                  categoriaSeleccionada === cat.key ? 'chip-active' : ''
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Grilla de Premios */}
          <div className="grid gap-4 sm:grid-cols-2">
            {premiosFiltrados.map((premio) => {
              const alcanza = saldo >= premio.costoCC;
              const falta = premio.costoCC - saldo;

              return (
                <div
                  key={premio.id}
                  className="card flex flex-col justify-between overflow-hidden p-5 transition-all hover:border-green-300 hover:shadow-sm"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 rounded-pill bg-canvas px-2.5 py-0.5 text-[11px] font-semibold text-slate border border-line">
                        {renderIconoCategoria(premio.categoria)}
                        <span className="capitalize">{premio.categoria}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-pill bg-gold-50 px-2.5 py-1 text-xs font-bold text-gold-600 border border-gold-200">
                        <IconCircularCredits className="h-3.5 w-3.5 text-gold-500" />
                        {premio.costoCC} CC
                      </span>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-green-700">
                        {premio.entidad}
                      </div>
                      <h3 className="mt-0.5 text-base font-bold text-ink leading-tight">
                        {premio.titulo}
                      </h3>
                      <p className="mt-1.5 text-xs text-slate leading-relaxed">
                        {premio.descripcion}
                      </p>
                    </div>

                    <div className="rounded-md bg-canvas/80 p-2.5 text-[11px] text-slate-2 border border-line/60">
                      <strong className="text-ink-2">Condición:</strong> {premio.terminos}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-line flex items-center justify-between gap-3">
                    <span className="text-[11px] font-medium text-slate">
                      Cupos: <strong className="text-ink">{premio.stockDisponible}</strong>
                    </span>

                    <button
                      type="button"
                      disabled={!alcanza}
                      onClick={() => abrirCanje(premio)}
                      className={`btn py-2 px-4 text-xs font-semibold ${
                        alcanza
                          ? 'btn-primary'
                          : 'btn-outline border-line bg-canvas/50 text-slate-2 cursor-not-allowed'
                      }`}
                    >
                      {alcanza ? (
                        <span>Canjear beneficio</span>
                      ) : (
                        <span>Te faltan {falta} CC</span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VISTA 2: MIS VALES CANJEADOS */}
      {vista === 'vales' && (
        <div className="space-y-4">
          {vales.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {vales.map((vale) => (
                <div
                  key={vale.id}
                  className="card p-5 border-l-4 border-l-green-700 space-y-3 bg-white"
                >
                  <div className="flex items-center justify-between">
                    <span className="pill bg-green-100 text-green-800 text-[11px]">
                      Vale Activo · Verificado
                    </span>
                    <span className="text-xs font-mono font-bold text-ink bg-canvas px-2 py-0.5 rounded border border-line">
                      {vale.codigo}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-ink leading-tight">
                      {vale.titulo}
                    </h3>
                    <p className="text-xs font-semibold text-green-700">
                      {vale.entidad}
                    </p>
                  </div>

                  <div className="rounded-md bg-canvas p-3 border border-line text-xs space-y-1">
                    <div className="flex justify-between text-slate">
                      <span>Fecha de canje:</span>
                      <strong className="text-ink">{vale.fechaCanje}</strong>
                    </div>
                    <div className="flex justify-between text-slate">
                      <span>Válido hasta:</span>
                      <strong className="text-green-800">{vale.fechaExpiracion}</strong>
                    </div>
                    <div className="flex justify-between text-slate">
                      <span>Créditos canjeados:</span>
                      <strong className="text-gold-600">{vale.costoCC} CC</strong>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-2 italic">
                    Presenta este código al momento de tu compra o trámite en Santo Domingo.
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-8 text-center border-dashed">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gold-50 text-gold-600 border border-gold-200">
                <IconGift className="h-6 w-6" />
              </span>
              <h3 className="mt-3 text-base font-bold text-ink">
                Aún no has canjeado premios
              </h3>
              <p className="mt-1 text-xs text-slate max-w-sm mx-auto">
                Explora el catálogo municipal, elige el descuento o beneficio que prefieras y canjea con tus Circular Credits.
              </p>
              <button
                type="button"
                onClick={() => setVista('catalogo')}
                className="mt-4 btn-primary py-2 px-4 text-xs font-semibold"
              >
                Ver premios disponibles
              </button>
            </div>
          )}
        </div>
      )}

      {/* Información de Acreditación */}
      <section className="card border-green-200 bg-green-50 p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-ink">
            <IconShield className="h-4 w-4 text-green-700" />
            <span>Alianza de Comercio Circular · Municipalidad de Santo Domingo</span>
          </div>
          <p className="mt-0.5 text-xs text-slate">
            ¿Tienes un comercio local en Santo Domingo y quieres unirte a la red de beneficios?
          </p>
        </div>
        <a
          href="mailto:medioambiente@santodomingo.cl?subject=Alianza%20Comercio%20Circular%20Credits"
          className="btn-outline self-start text-xs font-semibold text-green-800 hover:border-green-400 sm:self-auto"
        >
          Postular mi comercio
        </a>
      </section>

      {/* Modal de Canje y Vale Digital */}
      {premioParaCanjear && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={modalTitleId}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fadeIn"
        >
          <div className="card w-full max-w-md bg-white p-6 shadow-xl sm:p-7">
            {!valeGenerado ? (
              /* Paso 1: Confirmación de canje */
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <h3 id={modalTitleId} className="text-base font-bold text-ink">
                    Confirmar Canje de Premio
                  </h3>
                  <button
                    type="button"
                    onClick={cerrarModal}
                    className="rounded-md p-1.5 text-slate hover:bg-canvas hover:text-ink"
                  >
                    <IconX className="h-4 w-4" />
                  </button>
                </div>

                <div className="rounded-lg bg-green-50/70 p-4 border border-green-200">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-green-800">
                    {premioParaCanjear.entidad}
                  </span>
                  <h4 className="text-lg font-extrabold text-ink mt-0.5">
                    {premioParaCanjear.titulo}
                  </h4>
                  <p className="mt-1 text-xs text-slate">
                    {premioParaCanjear.descripcion}
                  </p>
                </div>

                <div className="divide-y divide-line rounded-md border border-line bg-canvas/40 px-3.5 py-2 text-xs">
                  <div className="flex items-center justify-between py-2">
                    <span className="text-slate">Costo del beneficio:</span>
                    <strong className="text-gold-600 font-bold">
                      {premioParaCanjear.costoCC} CC
                    </strong>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-slate">Tu saldo disponible:</span>
                    <strong className="text-ink">{saldo} CC</strong>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-slate">Saldo restante tras canje:</span>
                    <strong className="text-green-800 font-bold">
                      {saldo - premioParaCanjear.costoCC} CC
                    </strong>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
                  <button
                    type="button"
                    onClick={cerrarModal}
                    className="btn-ghost py-2 px-4 text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={confirmarCanje}
                    className="btn-primary py-2 px-5 text-xs font-semibold"
                  >
                    Confirmar canje (-{premioParaCanjear.costoCC} CC)
                  </button>
                </div>
              </div>
            ) : (
              /* Paso 2: Vale Digital generado con éxito */
              <div className="space-y-4 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-700">
                  <IconCheck className="h-6 w-6" />
                </div>

                <div>
                  <h3 className="text-lg font-extrabold text-ink">
                    ¡Canje Exitoso!
                  </h3>
                  <p className="text-xs text-slate mt-1">
                    Tu vale municipal ha sido generado y tus créditos fueron descontados.
                  </p>
                </div>

                {/* Vale con estilo de ticket municipal */}
                <div className="rounded-lg border-2 border-dashed border-green-600 bg-green-50/50 p-5 text-left space-y-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-green-800">
                      Vale Oficial · Municipalidad de Santo Domingo
                    </span>
                    <h4 className="text-base font-bold text-ink">
                      {valeGenerado.titulo}
                    </h4>
                    <p className="text-xs font-semibold text-green-700">
                      {valeGenerado.entidad}
                    </p>
                  </div>

                  <div className="rounded bg-white p-3 border border-green-200 text-center space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-2">
                      Código de verificación
                    </span>
                    <div className="font-mono text-xl font-extrabold tracking-wider text-ink">
                      {valeGenerado.codigo}
                    </div>
                    <span className="text-[10px] text-green-800 font-medium">
                      Válido hasta: {valeGenerado.fechaExpiracion}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-2 leading-relaxed">
                    Muestra este código en el local o en la Dirección de Medio Ambiente al momento de hacer efectivo tu descuento.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      cerrarModal();
                      setVista('vales');
                    }}
                    className="btn-primary py-2 px-5 text-xs font-semibold"
                  >
                    Ver en Mis Vales
                  </button>
                  <button
                    type="button"
                    onClick={cerrarModal}
                    className="btn-outline py-2 px-4 text-xs font-semibold"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
