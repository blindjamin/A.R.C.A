import { useState } from 'react';
import {
  solicitarCodigoCorreo,
  verificarCodigoCorreo,
} from '../../api/arca';

interface VerificarCorreoModalProps {
  ciudadanoId: string | null;
  onVerificado: (email: string) => void;
  onCerrar: () => void;
}

export function VerificarCorreoModal({
  ciudadanoId,
  onVerificado,
  onCerrar,
}: VerificarCorreoModalProps) {
  const [paso, setPaso] = useState<'correo' | 'codigo'>('correo');
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codigoDev, setCodigoDev] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const handleEnviarCodigo = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailLimpio = email.trim();
    if (!emailLimpio || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpio)) {
      setError('Ingresa un correo electrónico válido');
      return;
    }

    setCargando(true);
    setError(null);

    try {
      const res = await solicitarCodigoCorreo(emailLimpio, ciudadanoId || undefined);
      if (res.codigoDev) {
        setCodigoDev(res.codigoDev);
      }
      setMensajeExito(`Código enviado a ${emailLimpio}`);
      setPaso('codigo');
    } catch (err) {
      setError((err as Error).message || 'No se pudo enviar el código. Intenta nuevamente.');
    } finally {
      setCargando(false);
    }
  };

  const handleVerificarCodigo = async (e: React.FormEvent) => {
    e.preventDefault();
    const codigoLimpio = codigo.trim();
    if (codigoLimpio.length !== 6) {
      setError('El código debe tener exactamente 6 dígitos');
      return;
    }

    setCargando(true);
    setError(null);

    try {
      const res = await verificarCodigoCorreo(
        email.trim(),
        codigoLimpio,
        ciudadanoId || undefined,
      );

      if (res.verificado) {
        // El servidor ya guardó el correo verificado: el perfil lo lee de ahí.
        onVerificado(email.trim());
      } else {
        setError(res.mensaje || 'El código ingresado no es válido');
      }
    } catch (err) {
      setError((err as Error).message || 'Error al validar el código');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="card w-full max-w-md space-y-5 bg-white p-6 shadow-2xl">
        {/* Cabecera del modal */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-green-100 text-2xl text-green-800">
              📬
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-ink">
                Correo para avisos
              </h2>
              <p className="text-xs text-slate-2">
                Requerido para el seguimiento de tu retiro
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="text-slate-400 hover:text-slate-600 p-1 text-lg leading-none"
            title="Cerrar"
          >
            ✕
          </button>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed">
          Para que el municipio pueda notificarte por correo cuando tu solicitud sea{' '}
          <strong className="text-green-800 font-semibold">aprobada</strong>,{' '}
          <strong className="text-amber-800 font-semibold">programada en ruta</strong> o si requiere alguna modificación, por favor confirma tu correo electrónico:
        </p>

        {error && (
          <div className="pill w-full bg-rose-50 border border-rose-200 text-rose-700 text-xs py-2 px-3">
            ⚠️ {error}
          </div>
        )}

        {mensajeExito && paso === 'codigo' && (
          <div className="pill w-full bg-green-50 border border-green-200 text-green-700 text-xs py-2 px-3">
            ✉️ {mensajeExito}
          </div>
        )}

        {paso === 'correo' ? (
          <form onSubmit={handleEnviarCodigo} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-ink">
                Tu correo electrónico
              </label>
              <input
                type="email"
                required
                autoFocus
                placeholder="ejemplo@correo.cl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="field text-sm"
                disabled={cargando}
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={cargando || !email.trim()}
                className="btn-primary w-full py-3 text-sm font-semibold shadow-sm"
              >
                {cargando ? 'Enviando código…' : 'Enviar código de verificación'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerificarCodigo} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-ink">
                  Código de 6 dígitos
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setPaso('correo');
                    setError(null);
                  }}
                  className="text-xs text-green-700 hover:underline font-medium"
                >
                  Cambiar correo
                </button>
              </div>
              <input
                type="text"
                required
                autoFocus
                maxLength={6}
                placeholder="000000"
                value={codigo}
                onChange={(e) =>
                  setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))
                }
                className="field text-center font-mono text-2xl font-bold tracking-widest text-green-800"
                disabled={cargando}
              />
            </div>

            {/* Ayuda visual en modo desarrollo local si no hay SMTP configurado */}
            {codigoDev && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-800 flex items-center justify-between">
                <span>
                  💡 Modo local: código generado es <strong>{codigoDev}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setCodigo(codigoDev)}
                  className="font-semibold text-amber-900 underline ml-2"
                >
                  Autocompletar
                </button>
              </div>
            )}

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="submit"
                disabled={cargando || codigo.trim().length !== 6}
                className="btn-primary w-full py-3 text-sm font-semibold shadow-sm"
              >
                {cargando ? 'Verificando…' : 'Verificar y continuar solicitud'}
              </button>

              <button
                type="button"
                onClick={handleEnviarCodigo}
                disabled={cargando}
                className="text-xs text-slate-500 hover:text-slate-800 py-1"
              >
                ¿No recibiste el correo? Reenviar código
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
