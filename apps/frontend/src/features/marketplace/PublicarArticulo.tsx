import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  apiFetch,
  fetchCatalogo,
  fetchMisSolicitudes,
  type ResiduoCatalogo,
  type SolicitudRetiro,
} from '../../api/arca';
import { publicarArticulo, type TipoArticulo } from '../../api/marketplace';
import {
  BackButton,
  ComboboxResiduo,
  ScreenHeader,
  IconCamera,
  IconRecycle,
} from '../../components/ui';
import { useSession } from '../../auth/SessionContext';

const TITULO_MIN = 3;
const TITULO_MAX = 80;
const DESCRIPCION_MAX = 500;
const FOTO_MAX_MB = 5;

interface Foto {
  archivo: File;
  url: string;
}

interface Errores {
  tipo?: string;
  titulo?: string;
  descripcion?: string;
  residuo?: string;
}

function validar(
  tipo: TipoArticulo | null,
  titulo: string,
  descripcion: string,
  residuoId: string,
  nombreResiduoOtro: string,
): Errores {
  const errores: Errores = {};
  if (!tipo) errores.tipo = 'Elige si lo regalas o lo intercambias.';
  const t = titulo.trim();
  if (t.length < TITULO_MIN) errores.titulo = `El título debe tener al menos ${TITULO_MIN} letras.`;
  else if (t.length > TITULO_MAX) errores.titulo = `Máximo ${TITULO_MAX} caracteres.`;
  if (descripcion.length > DESCRIPCION_MAX)
    errores.descripcion = `Máximo ${DESCRIPCION_MAX} caracteres.`;
  if (!residuoId && !nombreResiduoOtro.trim())
    errores.residuo = 'Elige o escribe qué tipo de objeto es.';
  return errores;
}

const MensajeError = ({ mensaje }: { mensaje?: string }) =>
  mensaje ? <p className="mt-1 text-xs text-rose-600">{mensaje}</p> : null;

export default function PublicarArticulo() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sesion } = useSession();
  const usuarioCiudadanoId = sesion?.ciudadanoId;

  const importarParam = (
    location.state as {
      importarSolicitud?: {
        solicitudId?: number;
        titulo?: string;
        descripcion?: string;
        residuoCatalogoId?: number | null;
        nombreResiduoOtro?: string;
        fotoArchivo?: File | null;
        fotoUrl?: string | null;
      };
    } | null
  )?.importarSolicitud;

  const [tipo, setTipo] = useState<TipoArticulo | null>(null);
  const [titulo, setTitulo] = useState(() => importarParam?.titulo ?? '');
  const [descripcion, setDescripcion] = useState(
    () => importarParam?.descripcion ?? '',
  );
  const [residuoId, setResiduoId] = useState(
    () =>
      importarParam?.residuoCatalogoId
        ? String(importarParam.residuoCatalogoId)
        : '',
  );
  const [nombreResiduoOtro, setNombreResiduoOtro] = useState(
    () => importarParam?.nombreResiduoOtro ?? '',
  );
  const [foto, setFoto] = useState<Foto | null>(() => {
    if (importarParam?.fotoArchivo) {
      return {
        archivo: importarParam.fotoArchivo,
        url:
          importarParam.fotoUrl ||
          URL.createObjectURL(importarParam.fotoArchivo),
      };
    }
    return null;
  });
  const [errorFoto, setErrorFoto] = useState<string | null>(null);

  const [catalogo, setCatalogo] = useState<ResiduoCatalogo[] | null>(null);
  const [errorCatalogo, setErrorCatalogo] = useState<string | null>(null);

  const [solicitudesVecino, setSolicitudesVecino] = useState<SolicitudRetiro[]>([]);
  const [solicitudOrigenId, setSolicitudOrigenId] = useState<number | null>(
    () => importarParam?.solicitudId ?? null,
  );
  const [cargandoFotoRemota, setCargandoFotoRemota] = useState(false);

  const [intentado, setIntentado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  useEffect(() => {
    fetchCatalogo()
      .then(setCatalogo)
      .catch(() =>
        setErrorCatalogo('No pudimos cargar el catálogo. Intenta de nuevo en un momento.'),
      );
  }, []);

  // La vista previa es una URL local del navegador: hay que liberarla al
  // cambiar de foto (ver elegirFoto) y al salir de la pantalla.
  const urlFotoRef = useRef<string | null>(null);
  useEffect(
    () => () => {
      if (urlFotoRef.current) URL.revokeObjectURL(urlFotoRef.current);
    },
    [],
  );

  const reemplazarFoto = (nueva: Foto | null) => {
    if (urlFotoRef.current) URL.revokeObjectURL(urlFotoRef.current);
    urlFotoRef.current = nueva?.url ?? null;
    setFoto(nueva);
  };

  const cargarFotoRemota = async (url: string, nombre: string) => {
    setCargandoFotoRemota(true);
    setErrorFoto(null);
    try {
      const res = await apiFetch(url);
      if (res.ok) {
        const blob = await res.blob();
        const file = new File(
          [blob],
          `${nombre.toLowerCase().replace(/[^a-z0-9]/gi, '-') || 'foto'}.jpg`,
          { type: blob.type || 'image/jpeg' },
        );
        reemplazarFoto({ archivo: file, url: URL.createObjectURL(file) });
      }
    } catch (err) {
      console.error('Error cargando foto de la solicitud:', err);
    } finally {
      setCargandoFotoRemota(false);
    }
  };

  const fotoUrlParam = importarParam?.fotoUrl;
  const tituloParam = importarParam?.titulo;
  const tieneFotoArchivo = Boolean(importarParam?.fotoArchivo);

  useEffect(() => {
    if (!fotoUrlParam || tieneFotoArchivo) return;
    let cancelado = false;
    (async () => {
      setCargandoFotoRemota(true);
      setErrorFoto(null);
      try {
        const res = await apiFetch(fotoUrlParam);
        if (res.ok && !cancelado) {
          const blob = await res.blob();
          const file = new File(
            [blob],
            `${(tituloParam || 'foto').toLowerCase().replace(/[^a-z0-9]/gi, '-')}.jpg`,
            { type: blob.type || 'image/jpeg' },
          );
          if (!cancelado) {
            reemplazarFoto({ archivo: file, url: URL.createObjectURL(file) });
          }
        }
      } catch (err) {
        if (!cancelado) {
          console.error('Error cargando foto de la solicitud:', err);
        }
      } finally {
        if (!cancelado) {
          setCargandoFotoRemota(false);
        }
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [fotoUrlParam, tieneFotoArchivo, tituloParam]);

  useEffect(() => {
    if (!usuarioCiudadanoId) return;
    fetchMisSolicitudes(usuarioCiudadanoId)
      .then((res) => {
        setSolicitudesVecino(res.filter((s) => s.estado !== 'cancelada'));
      })
      .catch(() => {});
  }, [usuarioCiudadanoId]);

  const aplicarSolicitud = (s: SolicitudRetiro) => {
    setSolicitudOrigenId(s.id);
    const nombre = s.nombreResiduoOtro || s.residuoCatalogo?.nombre;
    if (nombre) {
      setTitulo(nombre);
    }
    if (s.nombreResiduoOtro) {
      setNombreResiduoOtro(s.nombreResiduoOtro);
      setResiduoId('');
    } else {
      setNombreResiduoOtro('');
      setResiduoId(s.residuoCatalogoId ? String(s.residuoCatalogoId) : '');
    }
    setDescripcion(s.descripcion ?? '');
    if (s.fotoUrl) {
      cargarFotoRemota(
        s.fotoUrl,
        nombre || `solicitud-${s.id}`,
      );
    } else {
      reemplazarFoto(null);
    }
  };

  const limpiarImportacion = () => {
    setSolicitudOrigenId(null);
    setTitulo('');
    setResiduoId('');
    setNombreResiduoOtro('');
    setDescripcion('');
    reemplazarFoto(null);
  };

  const elegirFoto = (archivo: File | undefined) => {
    setErrorFoto(null);
    if (!archivo) return;
    if (!archivo.type.startsWith('image/')) {
      setErrorFoto('El archivo debe ser una imagen.');
      return;
    }
    if (archivo.size > FOTO_MAX_MB * 1024 * 1024) {
      setErrorFoto(`La foto no puede pesar más de ${FOTO_MAX_MB} MB.`);
      return;
    }
    reemplazarFoto({ archivo, url: URL.createObjectURL(archivo) });
  };

  const errores = validar(tipo, titulo, descripcion, residuoId, nombreResiduoOtro);
  const hayErrores = Object.keys(errores).length > 0;
  const visibles: Errores = intentado ? errores : {};

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setIntentado(true);
    if (hayErrores || !tipo) return;

    setEnviando(true);
    setErrorEnvio(null);
    try {
      const nuevo = await publicarArticulo({
        tipo,
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || undefined,
        residuoCatalogoId: residuoId ? Number(residuoId) : null,
        nombreResiduoOtro: residuoId ? undefined : nombreResiduoOtro.trim(),
        foto: foto?.archivo,
      });
      navigate(`/marketplace/${nuevo.id}`, { state: { recienPublicado: true } });
    } catch (err) {
      setErrorEnvio((err as Error).message);
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={enviar} className="mx-auto w-full max-w-xl space-y-5" noValidate>
      <BackButton onClick={() => navigate('/marketplace')} />
      <ScreenHeader
        title="Publicar artículo"
        subtitle="Dale una segunda vida: regálalo o intercámbialo con un vecino."
      />

      {/* Opción de importar desde solicitudes de retiro municipal */}
      {solicitudesVecino.length > 0 && (
        <section className="card border-gold-300 bg-gold-50/60 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold-200 text-gold-800">
              <IconRecycle className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-bold text-ink">
                ¿Deseas publicar un residuo ya solicitado?
              </p>
              <p className="text-xs text-slate">
                Selecciona una de tus solicitudes para completar los datos y la foto:
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {solicitudesVecino.map((s) => {
              const activa = solicitudOrigenId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => aplicarSolicitud(s)}
                  className={`pill text-xs font-semibold transition-colors flex items-center gap-1.5 py-1.5 px-3 border ${
                    activa
                      ? 'bg-gold-500 text-white border-gold-600 shadow-sm'
                      : 'bg-white hover:bg-gold-100 text-ink border-gold-300'
                  }`}
                >
                  <IconRecycle className="h-3 w-3" />
                  <span>{s.residuoCatalogo?.nombre ?? `Solicitud #${s.id}`}</span>
                </button>
              );
            })}
          </div>

          {solicitudOrigenId && (
            <div className="flex items-center justify-between border-t border-gold-200 pt-2 text-xs text-gold-950">
              <span>
                Datos cargados. Puedes usarlos tal cual o modificarlos según necesites.
              </span>
              <button
                type="button"
                onClick={limpiarImportacion}
                className="font-bold underline hover:text-black ml-2"
              >
                Escribir desde cero
              </button>
            </div>
          )}
        </section>
      )}

      {solicitudOrigenId && solicitudesVecino.length === 0 && (
        <div className="flex items-center justify-between rounded-md bg-gold-50 border border-gold-300 px-4 py-3 text-xs text-gold-950">
          <span>
            Datos cargados desde tu solicitud de retiro. Puedes mantenerlos o modificarlos.
          </span>
          <button
            type="button"
            onClick={limpiarImportacion}
            className="font-bold underline hover:text-black ml-2"
          >
            Escribir desde cero
          </button>
        </div>
      )}

      {/* Foto */}
      <section className="space-y-2">
        <p className="text-sm font-semibold">Foto (opcional)</p>
        {cargandoFotoRemota ? (
          <div className="card flex items-center justify-center p-8 text-xs text-slate">
            Cargando foto de la solicitud…
          </div>
        ) : foto ? (
          <div className="card overflow-hidden">
            <img
              src={foto.url}
              alt="Vista previa del artículo"
              className="aspect-[4/3] w-full object-cover"
            />
            <div className="flex items-center justify-between gap-2 p-3">
              <span className="truncate text-xs text-slate">{foto.archivo.name}</span>
              <button
                type="button"
                onClick={() => reemplazarFoto(null)}
                className="btn-ghost px-3 py-1.5 text-xs"
              >
                Quitar foto
              </button>
            </div>
          </div>
        ) : (
          <label className="card flex cursor-pointer flex-col items-center gap-2 border-dashed p-8 text-center transition-colors hover:border-green-300">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-700" aria-hidden="true">
              <IconCamera className="h-6 w-6" />
            </span>
            <span className="text-sm font-semibold text-green-700">Tomar o elegir foto</span>
            <span className="text-xs text-slate-2">JPG o PNG, hasta {FOTO_MAX_MB} MB</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(e) => {
                elegirFoto(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </label>
        )}
        {errorFoto && <p className="text-xs text-rose-600">{errorFoto}</p>}
        <p className="text-xs text-slate-2">
          {foto
            ? 'Puedes conservar esta foto o cambiarla por una nueva.'
            : 'Sube una foto clara para que tus vecinos puedan ver el estado del artículo.'}
        </p>
      </section>

      {/* Tipo */}
      <section>
        <p className="mb-2 text-sm font-semibold">¿Qué quieres hacer?</p>
        <div className="flex gap-2">
          {(['regalo', 'intercambio'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTipo(t)}
              aria-pressed={tipo === t}
              className={`chip ${tipo === t ? 'chip-active' : ''}`}
            >
              {t === 'regalo' ? 'Regalarlo' : 'Intercambiarlo'}
            </button>
          ))}
        </div>
        <MensajeError mensaje={visibles.tipo} />
      </section>

      {/* Título */}
      <section>
        <label htmlFor="titulo" className="mb-2 block text-sm font-semibold">
          Título
        </label>
        <input
          id="titulo"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          maxLength={TITULO_MAX}
          placeholder="Ej: Sofá de 3 cuerpos"
          className="field"
        />
        <MensajeError mensaje={visibles.titulo} />
      </section>

      {/* Residuo del catálogo */}
      <section>
        <label htmlFor="residuo" className="mb-2 block text-sm font-semibold">
          ¿Qué tipo de objeto es?
        </label>
        {errorCatalogo ? (
          <p className="text-sm text-rose-600">{errorCatalogo}</p>
        ) : (
          <ComboboxResiduo
            catalogo={catalogo ?? []}
            residuoSeleccionado={
              catalogo?.find((c) => String(c.id) === residuoId) ?? null
            }
            nombreOtro={nombreResiduoOtro}
            disabled={!catalogo}
            onSeleccionar={(item, textoOtro) => {
              if (item) {
                setResiduoId(String(item.id));
                setNombreResiduoOtro('');
                if (!titulo) setTitulo(item.nombre);
              } else {
                setResiduoId('');
                setNombreResiduoOtro(textoOtro);
                if (!titulo) setTitulo(textoOtro);
              }
            }}
          />
        )}
        <MensajeError mensaje={visibles.residuo} />
      </section>

      {/* Descripción */}
      <section>
        <label htmlFor="descripcion" className="mb-2 block text-sm font-semibold">
          Descripción (opcional)
        </label>
        <textarea
          id="descripcion"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          maxLength={DESCRIPCION_MAX}
          rows={4}
          placeholder="Estado, medidas, si hay que desarmarlo…"
          className="field resize-none"
        />
        <p className="mt-1 text-right text-xs text-slate-2">
          {descripcion.length}/{DESCRIPCION_MAX}
        </p>
        <MensajeError mensaje={visibles.descripcion} />
      </section>

      {errorEnvio && (
        <p className="rounded-md bg-rose-100 px-4 py-3 text-sm text-rose-600">{errorEnvio}</p>
      )}

      <button
        type="submit"
        disabled={enviando || !!errorCatalogo || (intentado && hayErrores)}
        className="btn-primary w-full py-3.5"
      >
        {enviando ? 'Publicando…' : 'Publicar'}
      </button>
    </form>
  );
}
