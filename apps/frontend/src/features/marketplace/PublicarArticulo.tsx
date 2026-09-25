import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCatalogo, type ResiduoCatalogo } from '../../api/arca';
import { publicarArticulo, type TipoArticulo } from '../../api/marketplace';
import { BackButton, ScreenHeader } from '../../components/ui';

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
): Errores {
  const errores: Errores = {};
  if (!tipo) errores.tipo = 'Elige si lo regalas o lo intercambias.';
  const t = titulo.trim();
  if (t.length < TITULO_MIN) errores.titulo = `El título debe tener al menos ${TITULO_MIN} letras.`;
  else if (t.length > TITULO_MAX) errores.titulo = `Máximo ${TITULO_MAX} caracteres.`;
  if (descripcion.length > DESCRIPCION_MAX)
    errores.descripcion = `Máximo ${DESCRIPCION_MAX} caracteres.`;
  if (!residuoId) errores.residuo = 'Elige qué tipo de objeto es.';
  return errores;
}

const MensajeError = ({ mensaje }: { mensaje?: string }) =>
  mensaje ? <p className="mt-1 text-xs text-rose-600">{mensaje}</p> : null;

export default function PublicarArticulo() {
  const navigate = useNavigate();

  const [tipo, setTipo] = useState<TipoArticulo | null>(null);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [residuoId, setResiduoId] = useState('');
  const [foto, setFoto] = useState<Foto | null>(null);
  const [errorFoto, setErrorFoto] = useState<string | null>(null);

  const [catalogo, setCatalogo] = useState<ResiduoCatalogo[] | null>(null);
  const [errorCatalogo, setErrorCatalogo] = useState<string | null>(null);

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

  const porCategoria = useMemo(() => {
    const grupos = new Map<string, ResiduoCatalogo[]>();
    for (const item of catalogo ?? []) {
      grupos.set(item.categoria, [...(grupos.get(item.categoria) ?? []), item]);
    }
    return [...grupos.entries()];
  }, [catalogo]);

  const errores = validar(tipo, titulo, descripcion, residuoId);
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
        residuoCatalogoId: Number(residuoId),
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

      {/* Foto */}
      <section className="space-y-2">
        <p className="text-sm font-semibold">Foto (opcional)</p>
        {foto ? (
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
            <span className="text-4xl" aria-hidden="true">📷</span>
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
          Por ahora la foto solo se ve en tu teléfono; se subirá cuando el servidor esté conectado.
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
              {t === 'regalo' ? '🎁 Regalarlo' : '🔄 Intercambiarlo'}
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
          <select
            id="residuo"
            value={residuoId}
            onChange={(e) => setResiduoId(e.target.value)}
            disabled={!catalogo}
            className="field"
          >
            <option value="">{catalogo ? 'Elige una opción' : 'Cargando catálogo…'}</option>
            {porCategoria.map(([categoria, items]) => (
              <optgroup key={categoria} label={categoria}>
                {items.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.nombre}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
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
