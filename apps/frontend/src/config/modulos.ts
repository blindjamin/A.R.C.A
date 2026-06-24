// Registro de módulos de la app — única fuente de verdad del menú de Inicio.
// Para agregar una sección nueva: añade un objeto aquí. La página Inicio.tsx no se toca.
// Cuando el backend exponga el endpoint, cambia `activo` a true y completa `ruta`.

export interface Modulo {
  id: string;
  titulo: string;
  descripcion: string;
  icono: string; // emoji por ahora; migrar a lucide-react con el UI Kit oficial
  ruta?: string; // solo requerido cuando activo === true
  activo: boolean;
  epica: string; // trazabilidad con el backlog (EP-0x)
}

export const MODULOS: Modulo[] = [
  {
    id: 'solicitar-retiro',
    titulo: 'Solicitar retiro',
    descripcion: 'Toma una foto y la IA identificará el residuo voluminoso.',
    icono: '📷',
    ruta: '/solicitar',
    activo: true,
    epica: 'EP-01',
  },
  {
    id: 'mis-solicitudes',
    titulo: 'Mis solicitudes',
    descripcion: 'Sigue el estado de tus retiros solicitados.',
    icono: '📋',
    ruta: '/mis-solicitudes',
    activo: true,
    epica: 'EP-01',
  },
  {
    id: 'marketplace',
    titulo: 'Marketplace',
    descripcion: 'Reutiliza: publica e intercambia artículos con tus vecinos.',
    icono: '♻️',
    activo: false,
    epica: 'EP-02',
  },
  {
    id: 'creditos',
    titulo: 'Mis créditos',
    descripcion: 'Consulta tu saldo e historial de Circular Credits.',
    icono: '🪙',
    activo: false,
    epica: 'EP-04',
  },
  {
    id: 'panel-municipal',
    titulo: 'Panel municipal',
    descripcion: 'Métricas, mapa de calor y gestión de retiros (funcionarios).',
    icono: '📊',
    activo: false,
    epica: 'EP-03',
  },
];
