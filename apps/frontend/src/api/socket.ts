import { io, type Socket } from 'socket.io-client';

// Cliente socket.io único de la app. Solo recibe avisos del chat; enviar va
// por REST (api/chat.ts). Mismo origen: la cookie de sesión viaja sola.
let socket: Socket | null = null;

export function conectarSocket(): Socket {
  socket ??= io({ path: '/api/socket.io' });
  return socket;
}

export function desconectarSocket(): void {
  socket?.disconnect();
  socket = null;
}
