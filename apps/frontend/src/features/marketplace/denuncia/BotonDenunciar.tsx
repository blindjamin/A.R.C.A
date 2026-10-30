import { useEffect, useId, useRef, useState } from "react";
import {
  DESCRIPCION_MAX,
  MOTIVOS_DENUNCIA,
  denunciar,
  type MotivoDenuncia,
  type OrigenDenuncia,
} from "../../../api/denuncias";
import { IconFlag } from "../../../components/ui/Icons";
import { mensajeDeError } from "../formato";

interface BotonDenunciarProps {
  origen: OrigenDenuncia;
  /** Nombre de la persona denunciada, solo para los textos. */
  nombre: string;
  className?: string;
  /** En pantallas chicas muestra solo la bandera (encabezados apretados). */
  soloIconoEnMovil?: boolean;
}

/**
 * Denuncia entre vecinos (HU-16). Acción discreta que abre una hoja; el
 * <dialog> nativo con showModal() atrapa el foco y cierra con Escape.
 */
export default function BotonDenunciar({
  origen,
  nombre,
  className = "",
  soloIconoEnMovil = false,
}: BotonDenunciarProps) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const idMotivo = useId();
  const idDescripcion = useId();
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState<MotivoDenuncia | "">("");
  const [descripcion, setDescripcion] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviada, setEnviada] = useState(false);

  useEffect(() => {
    const d = dialogo.current;
    if (!d) return;
    if (abierto && !d.open) d.showModal();
    if (!abierto && d.open) d.close();
  }, [abierto]);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivo) return;
    setEnviando(true);
    setError(null);
    try {
      // MAQUETA: conectar al backend (rebanada D2); hoy solo espera y resuelve.
      await denunciar(origen, {
        motivo,
        descripcion: descripcion.trim() || undefined,
      });
      setEnviada(true);
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setEnviando(false);
    }
  };

  const cerrar = () => {
    if (!enviando) setAbierto(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        disabled={enviada}
        aria-label={
          enviada ? `Denunciaste a ${nombre}` : `Denunciar a ${nombre}`
        }
        className={`btn-ghost min-h-11 min-w-11 justify-center gap-1.5 px-3 py-2 text-xs ${className}`}
      >
        <IconFlag className="h-4 w-4" aria-hidden="true" />
        <span className={soloIconoEnMovil ? "hidden sm:inline" : undefined}>
          {enviada ? "Denunciado" : "Denunciar"}
        </span>
      </button>

      <dialog
        ref={dialogo}
        onCancel={(e) => {
          e.preventDefault();
          cerrar();
        }}
        onClose={() => setAbierto(false)}
        aria-label={`Denunciar a ${nombre}`}
        className="m-0 mt-auto w-full max-w-none rounded-t-lg bg-card p-0 text-ink backdrop:bg-black/60 sm:m-auto sm:max-w-md sm:rounded-lg"
      >
        {enviada ? (
          <div className="space-y-4 p-5 text-left">
            <h2 className="font-display text-lg font-bold text-ink">
              Denuncia enviada
            </h2>
            <p className="text-sm text-ink-2">
              La Municipalidad revisará tu denuncia. Gracias por avisar.
            </p>
            <button
              type="button"
              onClick={cerrar}
              className="btn-primary min-h-11 w-full"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <form
            onSubmit={enviar}
            className="flex max-h-[90dvh] flex-col text-left"
          >
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
              <h2 className="font-display text-lg font-bold text-ink">
                Denunciar a {nombre}
              </h2>

              <fieldset disabled={enviando} className="space-y-2">
                <legend className="text-sm font-semibold">Motivo</legend>
                {MOTIVOS_DENUNCIA.map((m) => (
                  <label
                    key={m.valor}
                    className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 ${
                      motivo === m.valor
                        ? "border-green-500 bg-green-50 font-semibold text-green-800"
                        : "border-line bg-card-2 text-ink-2 hover:border-green-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name={idMotivo}
                      value={m.valor}
                      checked={motivo === m.valor}
                      onChange={() => setMotivo(m.valor)}
                      required
                      className="sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                        motivo === m.valor ? "border-green-600" : "border-line"
                      }`}
                    >
                      {motivo === m.valor && (
                        <span className="h-2 w-2 rounded-full bg-green-600" />
                      )}
                    </span>
                    {m.etiqueta}
                  </label>
                ))}
              </fieldset>

              <div>
                <label
                  htmlFor={idDescripcion}
                  className="text-sm font-semibold"
                >
                  Detalle{" "}
                  <span className="font-normal text-slate-2">(opcional)</span>
                </label>
                <textarea
                  id={idDescripcion}
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  maxLength={DESCRIPCION_MAX}
                  rows={4}
                  disabled={enviando}
                  className="field mt-1 resize-none"
                />
                <p className="mt-1 text-right text-xs text-slate-2">
                  {descripcion.length}/{DESCRIPCION_MAX}
                </p>
              </div>

              <p className="text-xs text-slate">
                Enviaremos tu denuncia a la Municipalidad para que la revise. La
                otra persona no será notificada.
                {origen.tipo === "chat" && " Se adjuntará esta conversación."}
              </p>

              {error && <p className="text-xs text-rose-600">{error}</p>}
            </div>

            <div className="flex gap-2 border-t border-line p-4">
              <button
                type="button"
                onClick={cerrar}
                disabled={enviando}
                className="btn-ghost min-h-11 flex-1"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!motivo || enviando}
                className="btn-primary min-h-11 flex-1"
              >
                {enviando ? "Enviando…" : "Enviar denuncia"}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
