// Registro de módulos de la app — única fuente de verdad del menú de Inicio.
// Para agregar una sección nueva: añade un objeto aquí. La página Inicio.tsx no se toca.
// Cuando el backend exponga el endpoint, cambia `activo` a true y completa `ruta`.

export type ModuloIconKey =
  | 'camara'
  | 'solicitudes'
  | 'marketplace'
  | 'creditos'
  | 'admin';

export interface Modulo {
  id: string;
  titulo: string;
  descripcion: string;
  icono: ModuloIconKey;
  ruta?: string; // solo requerido cuando activo === true
  activo: boolean;
  epica: string; // trazabilidad con el backlog (EP-0x)
}

export const MODULOS: Modulo[] = [
  {
    id: 'solicitar-retiro',
    titulo: 'Solicitar retiro',
    descripcion: 'Pide el retiro de tu residuo voluminoso e ingresa sus datos.',
    icono: 'camara',
    ruta: '/nueva-solicitud',
    activo: true,
    epica: 'EP-01',
  },
  {
    id: 'mis-solicitudes',
    titulo: 'Mis solicitudes',
    descripcion: 'Sigue el estado de tus retiros solicitados.',
    icono: 'solicitudes',
    ruta: '/mis-solicitudes',
    activo: true,
    epica: 'EP-01',
  },
  {
    id: 'marketplace',
    titulo: 'Marketplace',
    descripcion: 'Reutiliza: publica e intercambia artículos con tus vecinos.',
    icono: 'marketplace',
    ruta: '/marketplace',
    activo: true,
    epica: 'EP-02',
  },
  {
    id: 'creditos',
    titulo: 'Circular Credits',
    descripcion: 'Canjea premios municipales, consulta tu saldo y beneficios.',
    icono: 'creditos',
    ruta: '/circular-credits',
    activo: true,
    epica: 'EP-04',
  },
];
