import { useState, useId } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../auth/SessionContext';
import {
  IconCircularCredits,
  IconMarketplace,
  IconGift,
  IconLeaf,
  IconShield,
  IconClipboard,
  IconLogout,
  IconChevronRight,
  IconMail,
  IconPhone,
  IconMapPin,
  IconBuilding,
  IconPencil,
  IconX,
  IconCheck,
} from '../components/ui/Icons';

export interface PerfilCiudadano {
  nombre: string;
  email?: string;
  telefono?: string;
  rut?: string;
  direccion?: string;
  sector?: string;
  canalPreferido?: string;
}

interface MovimientoCredito {
  id: string;
  concepto: string;
  monto: number;
  tipo: 'ingreso' | 'canje';
  origen: string;
  fecha: string;
}

const MOVIMIENTOS_DEMO: MovimientoCredito[] = [
  {
    id: 'm1',
    concepto: 'Entrega confirmada en Marketplace (Sillón 2 cuerpos)',
    monto: 50,
    tipo: 'ingreso',
    origen: 'Marketplace P2P',
    fecha: '28 Sep 2026',
  },
  {
    id: 'm2',
    concepto: 'Calificación vecinal 5 estrellas ★',
    monto: 20,
    tipo: 'ingreso',
    origen: 'Evaluación vecinal',
    fecha: '28 Sep 2026',
  },
  {
    id: 'm3',
    concepto: 'Retiro domiciliario clasificado correctamente',
    monto: 30,
    tipo: 'ingreso',
    origen: 'Recolección municipal',
    fecha: '15 Sep 2026',
  },
  {
    id: 'm4',
    concepto: 'Acreditación vecinal inicial Santo Domingo',
    monto: 20,
    tipo: 'ingreso',
    origen: 'Bono municipal',
    fecha: '01 Sep 2026',
  },
];

const SECTORES_SANTO_DOMINGO = [
  'Rocas de Santo Domingo',
  'Santa María del Mar',
  'Santo Domingo Urbano',
  'El Convento',
  'Bucalemu',
  'Las Brisas de Santo Domingo',
  'San Enrique',
  'El Yali',
  'Mostazal',
];

/**
 * Validador estricto: devuelve true solo si el campo existe y tiene texto no vacío.
 * Si es null, undefined o solo espacios en blanco, devuelve false (para NO mostrar en pantalla).
 */
function tieneValor(valor?: string | null): valor is string {
  return typeof valor === 'string' && valor.trim().length > 0;
}

export default function Perfil() {
  const { sesion, salir } = useSession();

  const modalTitleId = useId();
  const storageKey = `arca_perfil_vecino_${sesion?.ciudadanoId || 'default'}`;
  const storageSaldoKey = `arca_cc_saldo_${sesion?.ciudadanoId || 'default'}`;

  const [saldoCC] = useState<number>(() => {
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

  // Inicializar estado del perfil desde localStorage o valores por defecto
  const [perfil, setPerfil] = useState<PerfilCiudadano>(() => {
    try {
      const guardado = localStorage.getItem(storageKey);
      if (guardado) {
        return JSON.parse(guardado) as PerfilCiudadano;
      }
    } catch {
      // Ignorar error de parsing
    }

    return {
      nombre: sesion?.nombre || 'Maximiliano Osorio',
      email: 'maximiliano.vecino@santodomingo.cl',
      telefono: '+56 9 8765 4321',
      rut: '18.943.201-4',
      direccion: 'Calle Las Torcazas 420',
      sector: 'Rocas de Santo Domingo',
      canalPreferido: 'WhatsApp / SMS',
    };
  });

  // Estado del modal de edición
  const [editando, setEditando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // Formulario temporal de edición
  const [formNombre, setFormNombre] = useState(perfil.nombre);
  const [formEmail, setFormEmail] = useState(perfil.email ?? '');
  const [formTelefono, setFormTelefono] = useState(perfil.telefono ?? '');
  const [formRut, setFormRut] = useState(perfil.rut ?? '');
  const [formDireccion, setFormDireccion] = useState(perfil.direccion ?? '');
  const [formSector, setFormSector] = useState(perfil.sector ?? '');
  const [formCanalPreferido, setFormCanalPreferido] = useState(
    perfil.canalPreferido ?? '',
  );

  const abrirEditor = () => {
    setFormNombre(perfil.nombre);
    setFormEmail(perfil.email ?? '');
    setFormTelefono(perfil.telefono ?? '');
    setFormRut(perfil.rut ?? '');
    setFormDireccion(perfil.direccion ?? '');
    setFormSector(perfil.sector ?? '');
    setFormCanalPreferido(perfil.canalPreferido ?? '');
    setEditando(true);
  };

  const guardarCambios = (e: React.FormEvent) => {
    e.preventDefault();
    const nuevoPerfil: PerfilCiudadano = {
      nombre: formNombre.trim() || sesion?.nombre || 'Vecino de Santo Domingo',
      email: formEmail.trim() ? formEmail.trim() : undefined,
      telefono: formTelefono.trim() ? formTelefono.trim() : undefined,
      rut: formRut.trim() ? formRut.trim() : undefined,
      direccion: formDireccion.trim() ? formDireccion.trim() : undefined,
      sector: formSector.trim() ? formSector.trim() : undefined,
      canalPreferido: formCanalPreferido.trim()
        ? formCanalPreferido.trim()
        : undefined,
    };

    setPerfil(nuevoPerfil);
    try {
      localStorage.setItem(storageKey, JSON.stringify(nuevoPerfil));
    } catch {
      // Ignorar fallback
    }

    setEditando(false);
    setMensajeExito('Datos de perfil actualizados correctamente.');
    setTimeout(() => setMensajeExito(null), 3500);
  };

  const limpiarCamposOpcionales = () => {
    setFormEmail('');
    setFormTelefono('');
    setFormRut('');
    setFormDireccion('');
    setFormSector('');
    setFormCanalPreferido('');
  };

  const cargarDatosEjemplo = () => {
    setFormNombre(sesion?.nombre || 'Maximiliano Osorio');
    setFormEmail('maximiliano.vecino@santodomingo.cl');
    setFormTelefono('+56 9 8765 4321');
    setFormRut('18.943.201-4');
    setFormDireccion('Calle Las Torcazas 420');
    setFormSector('Rocas de Santo Domingo');
    setFormCanalPreferido('WhatsApp / SMS');
  };

  const iniciales = perfil.nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('');

  // Identificador acotado y seguro para visualización
  const idMostrable = sesion?.ciudadanoId
    ? `${sesion.ciudadanoId.slice(0, 8)}...${sesion.ciudadanoId.slice(-4)}`
    : 'ARCA-SD-2026';

  // Verificar si hay algún dato de contacto opcional con contenido real
  const hayDatosContacto =
    tieneValor(perfil.email) ||
    tieneValor(perfil.telefono) ||
    tieneValor(perfil.rut) ||
    tieneValor(perfil.direccion) ||
    tieneValor(perfil.sector) ||
    tieneValor(perfil.canalPreferido);

  return (
    <div className="page-text-contrast space-y-6 max-w-4xl mx-auto pb-10">
      <div>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-ink sm:text-3xl">
              Perfil del Vecino
            </h1>
            <p className="text-sm text-slate">
              Identificación ciudadana y registro de impacto circular en Santo Domingo.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 self-start rounded-pill border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-800 sm:self-auto">
            <IconShield className="h-3.5 w-3.5 text-green-700" />
            Identidad Verificada
          </span>
        </div>
      </div>

      {mensajeExito && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800 animate-fadeIn">
          <IconCheck className="h-4 w-4 text-green-700 shrink-0" />
          <span>{mensajeExito}</span>
        </div>
      )}

      {/* Tarjeta de Identificación Principal */}
      <section className="card overflow-hidden p-6 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-green-700 text-xl font-display font-bold text-white shadow-sm sm:h-20 sm:w-20 sm:text-2xl">
              {iniciales || 'VS'}
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-ink sm:text-2xl">
                {perfil.nombre}
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate">
                <span className="font-medium text-ink-2">Vecino Acreditado</span>
                <span>•</span>
                <span>Comuna de Santo Domingo</span>
                {tieneValor(perfil.sector) && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-green-700">
                      <IconBuilding className="h-3 w-3" />
                      {perfil.sector}
                    </span>
                  </>
                )}
              </div>
              <p className="text-xs font-mono text-slate-2">
                ID Vecino: <span className="text-ink-2">{idMostrable}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
            <button
              type="button"
              onClick={abrirEditor}
              className="btn-outline flex items-center gap-1.5 py-1.5 px-3 text-xs font-semibold text-ink-2 hover:border-green-400 hover:text-green-800"
            >
              <IconPencil className="h-3.5 w-3.5 text-green-700" />
              <span>Editar datos</span>
            </button>
            <span className="pill bg-green-100 text-green-800 text-xs">
              Cuenta Activa
            </span>
          </div>
        </div>
      </section>

      {/* 1. SECCIÓN CIRCULAR CREDITS (Sale primero como sección principal) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconCircularCredits className="h-4 w-4 text-green-700" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-ink">
              Circular Credits
            </h2>
          </div>
          <Link
            to="/circular-credits"
            className="text-xs font-semibold text-green-700 hover:underline inline-flex items-center gap-1"
          >
            <span>Canjear premios y beneficios</span>
            <IconChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {/* Tarjeta principal de créditos */}
          <div
            className="card relative overflow-hidden rounded-lg p-6 text-white shadow-green md:col-span-2"
            style={{
              backgroundImage:
                'linear-gradient(140deg, #156f4a 0%, #0f6b45 55%, #0a4f37 100%)',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white">
                  <IconCircularCredits className="h-4 w-4 text-gold-400" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-green-100">
                  Saldo de Circular Credits
                </span>
              </div>
              <span className="rounded-pill bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                Nivel 2 · Vecino Activo
              </span>
            </div>

            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-display text-5xl font-extrabold tracking-tight">
                {saldoCC}
              </span>
              <span className="text-sm font-semibold uppercase text-gold-300">
                CC (Circular Credits)
              </span>
            </div>

            <p className="mt-2 text-xs text-green-100/90 leading-relaxed max-w-lg">
              Los Circular Credits son reconocimientos por reducir y reutilizar residuos voluminosos en la comuna. Acumulas entregando objetos en el Marketplace o disponiendo adecuadamente tus retiros.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Link
                to="/circular-credits"
                className="btn-gold py-1.5 px-3.5 text-xs font-bold inline-flex items-center gap-1.5 text-ink shadow-sm hover:opacity-95"
              >
                <IconGift className="h-3.5 w-3.5" />
                <span>Canjear premios en Santo Domingo</span>
              </Link>
            </div>

            <div className="mt-5 border-t border-white/20 pt-4">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-green-100/90 font-medium">Progreso a Nivel 3 (Vecino Embajador)</span>
                <span className="font-bold text-white">{saldoCC} / 200 CC</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-black/20">
                <div
                  className="h-full rounded-full bg-gold-400 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.round((saldoCC / 200) * 100))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Métricas de Impacto */}
          <div className="card flex flex-col justify-between p-6 space-y-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-green-700">
                <IconLeaf className="h-3.5 w-3.5" />
                <span>Impacto en la Comuna</span>
              </div>
              <h3 className="mt-1 text-base font-bold text-ink">
                Aporte Ecológico
              </h3>
            </div>

            <div className="space-y-3.5">
              <div className="flex items-center justify-between border-b border-line pb-2.5">
                <span className="text-xs text-slate">CO₂ Evitado Estimado</span>
                <span className="font-display text-base font-extrabold text-green-700">
                  312 kg
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-line pb-2.5">
                <span className="text-xs text-slate">Objetos Reutilizados</span>
                <span className="font-display text-base font-extrabold text-ink">
                  8 unidades
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate">Reputación Vecinal</span>
                <span className="font-display text-base font-extrabold text-gold-500 flex items-center gap-1">
                  4.9 ★
                </span>
              </div>
            </div>

            <div className="rounded-md bg-canvas p-2.5 text-[11px] text-slate leading-tight">
              Cálculo estimado en base a la caracterización municipal de residuos Santo Domingo.
            </div>
          </div>
        </div>
      </section>

      {/* 2. DATOS MUNICIPALES Y DE CONTACTO */}
      {/* REGLA ESTRICTA: Solo se renderizan los campos que tengan contenido. Si están vacíos, no se muestran */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate">
              Datos Municipales y de Contacto
            </h2>
            <p className="text-xs text-slate-2">
              Información para coordinación de retiros y marketplace. Los campos no registrados se omiten.
            </p>
          </div>
          <button
            type="button"
            onClick={abrirEditor}
            className="text-xs font-semibold text-green-700 hover:underline"
          >
            Modificar
          </button>
        </div>

        {hayDatosContacto ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {/* Correo Electrónico (opcional: solo si está relleno) */}
            {tieneValor(perfil.email) && (
              <div className="card flex items-start gap-3 p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-green-50 text-green-700">
                  <IconMail className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate">
                    Correo Electrónico
                  </span>
                  <p className="truncate text-sm font-semibold text-ink">
                    <a
                      href={`mailto:${perfil.email}`}
                      className="hover:text-green-700 hover:underline"
                    >
                      {perfil.email}
                    </a>
                  </p>
                </div>
              </div>
            )}

            {/* Teléfono de Contacto (opcional: solo si está relleno) */}
            {tieneValor(perfil.telefono) && (
              <div className="card flex items-start gap-3 p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-green-50 text-green-700">
                  <IconPhone className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate">
                    Teléfono de Contacto
                  </span>
                  <p className="truncate text-sm font-semibold text-ink">
                    <a
                      href={`tel:${perfil.telefono}`}
                      className="hover:text-green-700 hover:underline"
                    >
                      {perfil.telefono}
                    </a>
                  </p>
                </div>
              </div>
            )}

            {/* RUT Ciudadano (opcional: solo si está relleno) */}
            {tieneValor(perfil.rut) && (
              <div className="card flex items-start gap-3 p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-green-50 text-green-700">
                  <IconShield className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate">
                    RUT de Identidad
                  </span>
                  <p className="truncate text-sm font-mono font-semibold text-ink">
                    {perfil.rut}
                  </p>
                </div>
              </div>
            )}

            {/* Dirección de Retiro (opcional: solo si está relleno) */}
            {tieneValor(perfil.direccion) && (
              <div className="card flex items-start gap-3 p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-green-50 text-green-700">
                  <IconMapPin className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate">
                    Dirección Domiciliaria
                  </span>
                  <p className="truncate text-sm font-semibold text-ink">
                    {perfil.direccion}
                  </p>
                </div>
              </div>
            )}

            {/* Sector / Cuadrante Municipal (opcional: solo si está relleno) */}
            {tieneValor(perfil.sector) && (
              <div className="card flex items-start gap-3 p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-green-50 text-green-700">
                  <IconBuilding className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate">
                    Sector / Cuadrante Municipal
                  </span>
                  <p className="truncate text-sm font-semibold text-ink">
                    {perfil.sector}
                  </p>
                </div>
              </div>
            )}

            {/* Canal Preferente de Notificación (opcional: solo si está relleno) */}
            {tieneValor(perfil.canalPreferido) && (
              <div className="card flex items-start gap-3 p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-green-50 text-green-700">
                  <IconClipboard className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate">
                    Canal Preferente de Notificación
                  </span>
                  <p className="truncate text-sm font-semibold text-ink">
                    {perfil.canalPreferido}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="card p-6 text-center border-dashed">
            <p className="text-sm font-medium text-slate">
              No tienes datos de contacto opcionales registrados.
            </p>
            <p className="mt-1 text-xs text-slate-2">
              Los campos no completados no se muestran en pantalla para mantener tu ficha limpia.
            </p>
            <button
              type="button"
              onClick={abrirEditor}
              className="mt-3 inline-flex items-center gap-1.5 rounded-pill bg-green-50 px-4 py-2 text-xs font-semibold text-green-800 hover:bg-green-100 transition-colors"
            >
              <IconPencil className="h-3.5 w-3.5" />
              <span>Registrar datos opcionales</span>
            </button>
          </div>
        )}
      </section>

      {/* 3. HISTORIAL DE TRANSACCIONES DE CIRCULAR CREDITS */}
      <section className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <IconCircularCredits className="h-4 w-4 text-green-700" />
            <h3 className="text-base font-bold text-ink">
              Historial de Circular Credits
            </h3>
          </div>
          <span className="text-xs text-slate">{MOVIMIENTOS_DEMO.length} registros</span>
        </div>

        <div className="divide-y divide-line">
          {MOVIMIENTOS_DEMO.map((mov) => (
            <div
              key={mov.id}
              className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0"
            >
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-ink leading-tight">
                  {mov.concepto}
                </p>
                <div className="flex items-center gap-2 text-xs text-slate">
                  <span>{mov.origen}</span>
                  <span>•</span>
                  <span>{mov.fecha}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1 rounded-pill bg-gold-50 px-2.5 py-1 text-xs font-bold text-gold-600 border border-gold-100">
                  <IconCircularCredits className="h-3 w-3 text-gold-500" />
                  +{mov.monto} CC
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. ACCIONES Y ENLACES DE ACTIVIDAD */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate">
          Gestión y Enlaces de Actividad
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            to="/mis-solicitudes"
            className="card flex items-center justify-between p-4 transition-all hover:border-green-300 hover:shadow-sm"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-green-50 text-green-700">
                <IconClipboard className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-ink">Mis Solicitudes de Retiro</p>
                <p className="text-xs text-slate">Revisa el estado de tus solicitudes</p>
              </div>
            </div>
            <IconChevronRight className="h-4 w-4 text-slate-2" />
          </Link>

          <Link
            to="/marketplace"
            className="card flex items-center justify-between p-4 transition-all hover:border-green-300 hover:shadow-sm"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-green-50 text-green-700">
                <IconMarketplace className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-ink">Marketplace P2P</p>
                <p className="text-xs text-slate">Intercambia o regala con tus vecinos</p>
              </div>
            </div>
            <IconChevronRight className="h-4 w-4 text-slate-2" />
          </Link>
        </div>
      </section>

      {/* 5. CIERRE DE SESIÓN Y SOPORTE */}
      <section className="card border-green-200 bg-green-50 p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-ink">
            Municipalidad de Santo Domingo · Plataforma A.R.C.A.
          </p>
          <p className="text-xs text-slate">
            ¿Dudas sobre tus solicitudes o Circular Credits? Contacta a la Dirección de Medio Ambiente.
          </p>
        </div>
        <button
          onClick={() => void salir()}
          type="button"
          className="btn-outline flex items-center justify-center gap-2 border-line text-slate hover:text-rose-600 hover:border-rose-300"
        >
          <IconLogout className="h-4 w-4" />
          <span>Cerrar sesión segura</span>
        </button>
      </section>

      {/* Modal / Formulario de Edición de Datos */}
      {editando && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={modalTitleId}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fadeIn"
        >
          <div className="card w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white p-6 shadow-xl sm:p-7">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div>
                <h3 id={modalTitleId} className="text-lg font-bold text-ink">
                  Editar Datos del Vecino
                </h3>
                <p className="text-xs text-slate">
                  Los campos vacíos no se mostrarán en la ficha ciudadana.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditando(false)}
                className="rounded-md p-1.5 text-slate hover:bg-canvas hover:text-ink transition-colors"
                aria-label="Cerrar modal"
              >
                <IconX className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={guardarCambios} className="mt-5 space-y-4">
              {/* Nombre (obligatorio para identificar) */}
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate">
                  Nombre Completo <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  placeholder="Tu nombre completo"
                  className="field"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Correo (opcional) */}
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate">
                    Correo Electrónico <span className="font-normal text-slate-2">(opcional)</span>
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="ejemplo@correo.cl"
                    className="field"
                  />
                  <p className="mt-1 text-[11px] text-slate-2">
                    Si lo dejas vacío, no se mostrará en pantalla.
                  </p>
                </div>

                {/* Teléfono (opcional) */}
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate">
                    Teléfono de Contacto <span className="font-normal text-slate-2">(opcional)</span>
                  </label>
                  <input
                    type="tel"
                    value={formTelefono}
                    onChange={(e) => setFormTelefono(e.target.value)}
                    placeholder="+56 9 1234 5678"
                    className="field"
                  />
                  <p className="mt-1 text-[11px] text-slate-2">
                    Si lo dejas vacío, no se mostrará en pantalla.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* RUT (opcional) */}
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate">
                    RUT de Identidad <span className="font-normal text-slate-2">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={formRut}
                    onChange={(e) => setFormRut(e.target.value)}
                    placeholder="12.345.678-9"
                    className="field font-mono"
                  />
                  <p className="mt-1 text-[11px] text-slate-2">
                    Opcional. Se oculta si no se ingresa.
                  </p>
                </div>

                {/* Sector Municipal (opcional) */}
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate">
                    Sector / Cuadrante <span className="font-normal text-slate-2">(opcional)</span>
                  </label>
                  <select
                    value={formSector}
                    onChange={(e) => setFormSector(e.target.value)}
                    className="field"
                  >
                    <option value="">(Sin sector especificado - se ocultará)</option>
                    {SECTORES_SANTO_DOMINGO.map((sec) => (
                      <option key={sec} value={sec}>
                        {sec}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[11px] text-slate-2">
                    Sector de retiro en Santo Domingo.
                  </p>
                </div>
              </div>

              {/* Dirección Domiciliaria (opcional) */}
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate">
                  Dirección Domiciliaria <span className="font-normal text-slate-2">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={formDireccion}
                  onChange={(e) => setFormDireccion(e.target.value)}
                  placeholder="Calle, pasaje o avenida y número"
                  className="field"
                />
                <p className="mt-1 text-[11px] text-slate-2">
                  Si se deja vacío, no se mostrará en pantalla.
                </p>
              </div>

              {/* Canal de Notificación Preferente (opcional) */}
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate">
                  Canal de Notificación Preferente <span className="font-normal text-slate-2">(opcional)</span>
                </label>
                <select
                  value={formCanalPreferido}
                  onChange={(e) => setFormCanalPreferido(e.target.value)}
                  className="field"
                >
                  <option value="">(Sin preferencia - se ocultará)</option>
                  <option value="WhatsApp / SMS">WhatsApp / SMS</option>
                  <option value="Correo Electrónico">Correo Electrónico</option>
                  <option value="Llamada Telefónica">Llamada Telefónica</option>
                </select>
              </div>

              {/* Botones de acción rápida para pruebas */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-canvas/70 p-3 text-xs border border-line">
                <span className="text-slate font-medium">Herramientas de prueba:</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={limpiarCamposOpcionales}
                    className="text-rose-600 hover:underline font-semibold"
                  >
                    Limpiar opcionales
                  </button>
                  <span className="text-line">•</span>
                  <button
                    type="button"
                    onClick={cargarDatosEjemplo}
                    className="text-green-700 hover:underline font-semibold"
                  >
                    Cargar datos demo
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setEditando(false)}
                  className="btn-ghost py-2 px-4 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary py-2 px-5 text-xs font-semibold"
                >
                  Guardar cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
