import {
  type OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import {
  COOKIE_SESION,
  leerCookie,
  origenesPermitidos,
  SesionService,
} from '../core';

/** Sala de socket.io de un vecino: todas sus pestañas y dispositivos. */
export const salaDe = (ciudadanoId: string): string => `usuario:${ciudadanoId}`;

/**
 * Tiempo real (chat HU-06 y avisos HU-23): solo empuja del servidor al
 * cliente. Enviar y marcar leídos van por REST, que ya tiene sesión, CSRF,
 * validación y límite.
 * Sin @SubscribeMessage a propósito: los guards globales son HTTP.
 * Bajo /api para que viaje la cookie (Path=/api) y pase por la regla de cPanel.
 */
@WebSocketGateway({ path: '/api/socket.io', serveClient: false })
export class TiempoRealGateway implements OnGatewayConnection {
  @WebSocketServer() private readonly server: Server;
  // Se lee al instanciar (ConfigModule ya cargó .env.local), no en el decorador.
  private readonly origenes = origenesPermitidos();

  constructor(private readonly sesionService: SesionService) {}

  // ponytail: el socket sigue en la sala aunque la sesión venza o se cierre en otra pestaña; revalidar periódicamente si importa (hoy solo recibe avisos del mismo vecino).
  async handleConnection(cliente: Socket): Promise<void> {
    // Misma regla que verificarOrigen: sin Origin no es un navegador.
    const { origin } = cliente.handshake.headers;
    if (origin !== undefined && !this.origenes.includes(origin)) {
      cliente.disconnect(true);
      return;
    }
    // Nest no espera esta promesa: un rechazo sin manejar tumbaría el proceso.
    // Sin loguear el error, para no filtrar nada de la cookie.
    try {
      const usuario = await this.sesionService.validar(
        leerCookie(cliente.handshake, COOKIE_SESION),
      );
      if (!usuario) {
        cliente.disconnect(true);
        return;
      }
      await cliente.join(salaDe(usuario.ciudadanoId));
    } catch {
      cliente.disconnect(true);
    }
  }

  /** Empuja un evento a todas las pestañas y dispositivos del vecino. */
  emitir(ciudadanoId: string, evento: string, datos: unknown): void {
    this.server.to(salaDe(ciudadanoId)).emit(evento, datos);
  }

  estaConectado(ciudadanoId: string): boolean {
    return (
      (this.server.sockets.adapter.rooms.get(salaDe(ciudadanoId))?.size ?? 0) >
      0
    );
  }
}
