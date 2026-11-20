import { useState } from 'react';
import { enviarMensaje } from '../../../api/chat';
import { entregar, liberar, type ArticuloMarketplace } from '../../../api/marketplace';
import { IconBell } from '../../../components/ui';
import { mensajeDeError } from '../formato';

const MENSAJE_PEDIR_CODIGO =
  'Ya estoy con el artículo para la entrega. ¿Me dictas el código de 6 dígitos?';

interface PanelEntregaProps {
  articulo: ArticuloMarketplace;
  /** Conversación con quien recibió; sin ella no se puede pedir el código por chat. */
  conversacionId?: number;
  /** Refresca el artículo después de entregar o liberar. */
  onCambio: () => void;
}

/**
 * Entrega de un artículo reservado (HU-15), lado de quien publica.
 *
 * El código lo tiene quien recibe y solo se borra al entregar o liberar: acá
 * se escribe y se confirma en dos pasos, con el nombre de quien recibe a la
 * vista para no cerrar el artículo equivocado.
 */
export default function PanelEntrega({
  articulo,
  conversacionId,
  onCambio,
}: PanelEntregaProps) {
  const [codigo, setCodigo] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [pidiendo, setPidiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const completo = codigo.length === 6;
  const receptor = articulo.reservadoPara ?? 'un vecino';

  const pedirCodigo = async () => {
    if (conversacionId === undefined) return;
    setPidiendo(true);
    setError(null);
    setAviso(null);
    try {
      await enviarMensaje(articulo.id, MENSAJE_PEDIR_CODIGO, conversacionId);
      setAviso('Mensaje enviado. Cuando te dicte el código, escríbelo acá.');
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setPidiendo(false);
    }
  };

  const cerrar = async () => {
    setEnviando(true);
    setError(null);
    try {
      await entregar(articulo.id, codigo);
      onCambio();
    } catch (e) {
      // Un código equivocado deja la entrega abierta: se vuelve al campo para
      // corregirlo, sin salir del panel.
      setError(mensajeDeError(e));
      setConfirmando(false);
      setEnviando(false);
    }
  };

  const liberarReserva = async () => {
    setEnviando(true);
    setError(null);
    setAviso(null);
    try {
      await liberar(articulo.id);
      onCambio();
    } catch (e) {
      setError(mensajeDeError(e));
      setEnviando(false);
    }
  };

  return (
    <section className="card space-y-4 p-4 text-left">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate">
          Entrega pendiente
        </h2>
        <p className="font-bold text-ink">Reservado para {receptor}</p>
        {articulo.sector && (
          <p className="text-sm text-ink-2">Sector: {articulo.sector}</p>
        )}
        <p className="text-xs text-slate">
          El código lo tiene {receptor}: pídeselo cuando estén juntos y escríbelo
          acá. Con eso queda registrado que el artículo cambió de manos.
        </p>
      </div>

      {conversacionId !== undefined && (
        <button
          type="button"
          onClick={() => void pedirCodigo()}
          disabled={pidiendo || enviando}
          className="btn-outline flex w-full items-center justify-center gap-2"
        >
          <IconBell className="h-4 w-4" />
          {pidiendo ? 'Enviando…' : 'Pedir el código por chat'}
        </button>
      )}
      {aviso && <p className="text-xs text-green-700">{aviso}</p>}
      {error && <p className="text-xs text-rose-600">{error}</p>}

      {confirmando ? (
        <div className="space-y-2 rounded-md border border-green-200 bg-green-50 p-3">
          <p className="text-sm font-semibold text-green-800">
            ¿Le entregaste «{articulo.titulo}» a {receptor}?
          </p>
          <p className="text-xs text-green-800">
            Se cierra el intercambio, se acreditan los créditos y no se puede deshacer.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmando(false)}
              disabled={enviando}
              className="btn-ghost flex-1"
            >
              Volver
            </button>
            <button
              type="button"
              onClick={() => void cerrar()}
              disabled={enviando}
              className="btn-primary flex-1"
            >
              {enviando ? 'Cerrando…' : 'Sí, cerrar el intercambio'}
            </button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (completo) setConfirmando(true);
          }}
          className="space-y-2"
        >
          <label htmlFor="codigo-entrega" className="text-sm font-semibold">
            Código de entrega
          </label>
          <input
            id="codigo-entrega"
            inputMode="numeric"
            autoComplete="off"
            maxLength={6}
            value={codigo}
            onChange={(e) => {
              setCodigo(e.target.value.replace(/\D/g, ''));
              setError(null);
            }}
            placeholder="000000"
            className="field text-center text-2xl font-bold tracking-[0.35em]"
          />
          <button
            type="submit"
            disabled={!completo || enviando}
            className="btn-primary w-full"
          >
            Confirmar entrega
          </button>
        </form>
      )}

      {!confirmando && (
        <button
          type="button"
          onClick={() => void liberarReserva()}
          disabled={enviando}
          className="btn-outline w-full"
        >
          Liberar reserva
        </button>
      )}
    </section>
  );
}
